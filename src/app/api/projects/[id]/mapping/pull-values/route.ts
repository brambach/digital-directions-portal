import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import {
  encryptJSON,
  decryptJSON,
  type HiBobCredentials,
  type KeyPayCredentials,
} from "@/lib/crypto";
import { pullHiBobValues } from "@/lib/integrations/hibob-mapping";
import { pullKeyPayValues } from "@/lib/integrations/keypay-mapping";

// POST /api/projects/[id]/mapping/pull-values — Fetch real values from HiBob or KeyPay APIs
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: projectId } = await params;
    const body = await request.json();
    const { side, hibobCredentials, keypayCredentials, saveCredentials } = body as {
      side: "hibob" | "payroll";
      hibobCredentials?: HiBobCredentials;
      keypayCredentials?: KeyPayCredentials;
      saveCredentials?: boolean;
    };

    if (!side || !["hibob", "payroll"].includes(side)) {
      return NextResponse.json(
        { error: 'Invalid side — must be "hibob" or "payroll"' },
        { status: 400 }
      );
    }

    // Fetch the project
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (side === "hibob") {
      // Resolve HiBob credentials: use provided, or decrypt stored
      let creds: HiBobCredentials | undefined = hibobCredentials;
      if (!creds) {
        if (project.hibobApiKey) {
          const decrypted = decryptJSON<HiBobCredentials>(project.hibobApiKey);
          if (!decrypted) {
            return NextResponse.json(
              { error: "Failed to decrypt stored HiBob credentials" },
              { status: 500 }
            );
          }
          creds = decrypted;
        } else {
          return NextResponse.json(
            { error: "No HiBob credentials provided or saved" },
            { status: 400 }
          );
        }
      }

      // Save credentials if requested
      if (saveCredentials && hibobCredentials) {
        await db
          .update(projects)
          .set({
            hibobApiKey: encryptJSON<HiBobCredentials>(hibobCredentials),
            updatedAt: new Date(),
          })
          .where(eq(projects.id, projectId));
      }

      const result = await pullHiBobValues(creds);
      return NextResponse.json(result);
    } else {
      // Resolve KeyPay credentials
      let creds: KeyPayCredentials | undefined = keypayCredentials;
      if (!creds) {
        if (project.payrollApiKey) {
          const decrypted = decryptJSON<KeyPayCredentials>(project.payrollApiKey);
          if (!decrypted) {
            return NextResponse.json(
              { error: "Failed to decrypt stored KeyPay credentials" },
              { status: 500 }
            );
          }
          creds = decrypted;
        } else {
          return NextResponse.json(
            { error: "No KeyPay credentials provided or saved" },
            { status: 400 }
          );
        }
      }

      // Save credentials if requested
      if (saveCredentials && keypayCredentials) {
        await db
          .update(projects)
          .set({
            payrollApiKey: encryptJSON<KeyPayCredentials>(keypayCredentials),
            updatedAt: new Date(),
          })
          .where(eq(projects.id, projectId));
      }

      const result = await pullKeyPayValues(creds);
      return NextResponse.json(result);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error pulling mapping values:", error);
    return NextResponse.json(
      { error: message || "Internal server error" },
      { status: 500 }
    );
  }
}
