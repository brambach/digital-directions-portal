import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bobConfigChecklist, projects } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { notifyEvent } from "@/lib/notify";

// POST /api/projects/[id]/bob-config/approve — Admin approves or requests changes
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

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [checklist] = await db
      .select()
      .from(bobConfigChecklist)
      .where(eq(bobConfigChecklist.projectId, projectId))
      .limit(1);

    if (!checklist) {
      return NextResponse.json({ error: "Bob Config checklist not found" }, { status: 404 });
    }

    if (checklist.status !== "in_review") {
      return NextResponse.json(
        { error: "Checklist is not in review state" },
        { status: 400 }
      );
    }

    let updateData: Record<string, unknown>;

    if (action === "approve") {
      updateData = {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: admin.id,
        updatedAt: new Date(),
      };
    } else {
      // request_changes — reset to active so client can update items
      // Reset all item completedAt so client must re-confirm
      const items = JSON.parse(checklist.items || "[]");
      const resetItems = items.map((item: Record<string, unknown>) => ({
        ...item,
        completedAt: null,
      }));
      updateData = {
        status: "active",
        items: JSON.stringify(resetItems),
        updatedAt: new Date(),
      };
    }

    const [updated] = await db
      .update(bobConfigChecklist)
      .set(updateData)
      .where(eq(bobConfigChecklist.id, checklist.id))
      .returning();

    // Notify client users (fire-and-forget)
    if (action === "approve") {
      notifyEvent({
        event: "bob_config_approved",
        projectId,
        projectName: project.name,
        clientId: project.clientId,
        reviewNotes: reviewNotes || undefined,
      });
    } else {
      notifyEvent({
        event: "bob_config_changes_requested",
        projectId,
        projectName: project.name,
        clientId: project.clientId,
        reviewNotes: reviewNotes || undefined,
      });
    }

    return NextResponse.json({
      checklist: { ...updated, items: JSON.parse(updated.items) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
