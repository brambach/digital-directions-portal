import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { nextStage, prevStage, stageIndex } from "@/lib/lifecycle";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { action, targetStage } = body as {
      action: "advance" | "lock";
      targetStage?: string;
    };

    if (!action || !["advance", "lock"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'advance' or 'lock'." },
        { status: 400 }
      );
    }

    // Get current project
    const [project] = await db
      .select({ id: projects.id, currentStage: projects.currentStage })
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    let newStage: string | null = null;

    if (action === "advance") {
      newStage = nextStage(project.currentStage);
      if (!newStage) {
        return NextResponse.json(
          { error: "Project is already at the final stage." },
          { status: 400 }
        );
      }
    } else {
      // lock — go back one stage, or to a specific targetStage
      if (targetStage) {
        const targetIdx = stageIndex(targetStage);
        const currentIdx = stageIndex(project.currentStage);
        if (targetIdx < 0) {
          return NextResponse.json(
            { error: "Invalid target stage." },
            { status: 400 }
          );
        }
        if (targetIdx >= currentIdx) {
          return NextResponse.json(
            { error: "Target stage must be before the current stage." },
            { status: 400 }
          );
        }
        newStage = targetStage;
      } else {
        newStage = prevStage(project.currentStage);
        if (!newStage) {
          return NextResponse.json(
            { error: "Project is already at the first stage." },
            { status: 400 }
          );
        }
      }
    }

    const [updated] = await db
      .update(projects)
      .set({
        currentStage: newStage as any,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    return NextResponse.json({ project: updated });
  } catch (error: any) {
    console.error("Error updating project stage:", error);
    if (error.message?.includes("Unauthorized") || error.message?.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Failed to update project stage" },
      { status: 500 }
    );
  }
}
