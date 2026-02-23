import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  dataMappingConfigs,
  dataMappingEntries,
  projects,
  users,
  userNotifications,
} from "@/lib/db/schema";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendMappingEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";
import { DEFAULT_KEYPAY_VALUES, type MappingCategory } from "@/lib/mapping-defaults";

// GET /api/projects/[id]/mapping — Get mapping config + entries for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    // Verify project access
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (user.role === "client" && project.clientId !== user.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get mapping config for this project
    const [config] = await db
      .select()
      .from(dataMappingConfigs)
      .where(eq(dataMappingConfigs.projectId, projectId))
      .limit(1);

    if (!config) {
      return NextResponse.json({ config: null, entries: [] });
    }

    // Get all entries
    const entries = await db
      .select()
      .from(dataMappingEntries)
      .where(eq(dataMappingEntries.configId, config.id));

    return NextResponse.json({
      config: {
        ...config,
        hibobValues: config.hibobValues ? JSON.parse(config.hibobValues) : {},
        payrollValues: config.payrollValues ? JSON.parse(config.payrollValues) : {},
      },
      entries,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/projects/[id]/mapping — Admin initializes mapping with values
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: projectId } = await params;
    const body = await request.json();
    const { hibobValues, payrollValues } = body;

    if (!hibobValues || typeof hibobValues !== "object") {
      return NextResponse.json(
        { error: "Missing required field: hibobValues (object keyed by category)" },
        { status: 400 }
      );
    }

    // Verify project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check if config already exists
    const [existing] = await db
      .select()
      .from(dataMappingConfigs)
      .where(eq(dataMappingConfigs.projectId, projectId))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "Mapping already initialized for this project" },
        { status: 409 }
      );
    }

    // Use provided payroll values or fall back to KeyPay defaults
    const finalPayrollValues = payrollValues && typeof payrollValues === "object"
      ? payrollValues
      : DEFAULT_KEYPAY_VALUES;

    const payrollSystem = project.payrollSystem || "keypay";

    // Create mapping config
    const [config] = await db
      .insert(dataMappingConfigs)
      .values({
        projectId,
        payrollSystem: payrollSystem as "keypay" | "myob" | "deputy" | "generic",
        status: "active",
        hibobValues: JSON.stringify(hibobValues),
        payrollValues: JSON.stringify(finalPayrollValues),
      })
      .returning();

    // Notify client users
    const clientUsers = await db
      .select()
      .from(users)
      .where(
        and(eq(users.clientId, project.clientId), isNull(users.deletedAt))
      );

    for (const clientUser of clientUsers) {
      await db.insert(userNotifications).values({
        userId: clientUser.id,
        type: "mapping",
        title: "Data mapping ready",
        message: `The data mapping tool for "${project.name}" is ready for you to complete.`,
        linkUrl: `/dashboard/client/projects/${projectId}/mapping`,
      });

      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(clientUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          "there";
        if (email) {
          await sendMappingEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: "ready",
          });
        }
      } catch (emailErr) {
        console.error("Error sending mapping email:", emailErr);
      }
    }

    return NextResponse.json(
      {
        config: {
          ...config,
          hibobValues: JSON.parse(config.hibobValues || "{}"),
          payrollValues: JSON.parse(config.payrollValues || "{}"),
        },
        entries: [],
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error initializing mapping:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
