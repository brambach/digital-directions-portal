import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { encryptJSON, type HiBobCredentials, type KeyPayCredentials } from "@/lib/crypto";

// GET /api/projects/[id]/credentials — Check if credentials exist (never returns actual keys)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: projectId } = await params;

    const [project] = await db
      .select({
        hibobApiKey: projects.hibobApiKey,
        payrollApiKey: projects.payrollApiKey,
        payrollSystem: projects.payrollSystem,
      })
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      hasHibobCredentials: !!project.hibobApiKey,
      hasPayrollCredentials: !!project.payrollApiKey,
      payrollSystem: project.payrollSystem || "keypay",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error checking credentials:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/projects/[id]/credentials — Save encrypted API credentials
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: projectId } = await params;
    const body = await request.json();
    const { hibobCredentials, keypayCredentials } = body as {
      hibobCredentials?: HiBobCredentials;
      keypayCredentials?: KeyPayCredentials;
    };

    if (!hibobCredentials && !keypayCredentials) {
      return NextResponse.json(
        { error: "At least one set of credentials is required" },
        { status: 400 }
      );
    }

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (hibobCredentials) {
      if (!hibobCredentials.serviceUserId || !hibobCredentials.serviceUserToken) {
        return NextResponse.json(
          { error: "HiBob credentials require serviceUserId and serviceUserToken" },
          { status: 400 }
        );
      }
      updateData.hibobApiKey = encryptJSON<HiBobCredentials>(hibobCredentials);
    }

    if (keypayCredentials) {
      if (!keypayCredentials.apiKey || !keypayCredentials.businessId) {
        return NextResponse.json(
          { error: "KeyPay credentials require apiKey and businessId" },
          { status: 400 }
        );
      }
      updateData.payrollApiKey = encryptJSON<KeyPayCredentials>(keypayCredentials);
    }

    await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, projectId));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error saving credentials:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
