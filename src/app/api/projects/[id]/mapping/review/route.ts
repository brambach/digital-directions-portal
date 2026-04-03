import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dataMappingConfigs, projects } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { notifyEvent } from "@/lib/notify";

// POST /api/projects/[id]/mapping/review — Admin reviews (approve or request changes)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: projectId } = await params;
    const body = await request.json();
    const { action, reviewNotes } = body;

    if (!action || !["approve", "request_changes"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'request_changes'" },
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

    // Get mapping config
    const [config] = await db
      .select()
      .from(dataMappingConfigs)
      .where(eq(dataMappingConfigs.projectId, projectId))
      .limit(1);

    if (!config) {
      return NextResponse.json(
        { error: "No mapping config found" },
        { status: 404 }
      );
    }

    if (config.status !== "in_review") {
      return NextResponse.json(
        { error: "Mapping is not in review state" },
        { status: 400 }
      );
    }

    let updateData: Record<string, unknown>;

    if (action === "approve") {
      updateData = {
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: admin.id,
        approvedAt: new Date(),
        approvedBy: admin.id,
        reviewNotes: reviewNotes || null,
        updatedAt: new Date(),
      };
    } else {
      // request_changes — reset to active so client can edit
      updateData = {
        status: "active",
        reviewNotes: reviewNotes || "Changes requested by the DD team.",
        reviewedAt: new Date(),
        reviewedBy: admin.id,
        updatedAt: new Date(),
      };
    }

    const [updated] = await db
      .update(dataMappingConfigs)
      .set(updateData)
      .where(eq(dataMappingConfigs.id, config.id))
      .returning();

    // Notify client users (fire-and-forget)
    notifyEvent({
      event: "mapping_reviewed",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
      action: action as "approve" | "request_changes",
      reviewNotes: reviewNotes || undefined,
    });

    return NextResponse.json({
      ...updated,
      hibobValues: updated.hibobValues ? JSON.parse(updated.hibobValues) : {},
      payrollValues: updated.payrollValues ? JSON.parse(updated.payrollValues) : {},
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error reviewing mapping:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
