import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { provisioningSteps, projects } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { notifyEvent } from "@/lib/notify";

// POST /api/projects/[id]/provisioning/[stepId]/complete — Client marks step as complete
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId, stepId } = await params;

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

    const [step] = await db
      .select()
      .from(provisioningSteps)
      .where(
        and(
          eq(provisioningSteps.id, stepId),
          eq(provisioningSteps.projectId, projectId)
        )
      )
      .limit(1);

    if (!step) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    if (step.completedAt) {
      return NextResponse.json(
        { error: "Step is already marked as complete" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(provisioningSteps)
      .set({
        completedAt: new Date(),
        completedBy: user.id,
      })
      .where(eq(provisioningSteps.id, stepId))
      .returning();

    // Check if ALL steps are now completed by the client
    const allSteps = await db
      .select()
      .from(provisioningSteps)
      .where(eq(provisioningSteps.projectId, projectId));

    const allClientDone = allSteps.every((s) => s.completedAt || s.id === stepId);

    notifyEvent({
      event: "provisioning_step_completed",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
      stepName: step.title,
      allComplete: allClientDone,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
