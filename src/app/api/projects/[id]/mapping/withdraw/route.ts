import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dataMappingConfigs, projects } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { notifyEvent } from "@/lib/notify";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

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
        { error: "Mapping is not in a withdrawable state" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(dataMappingConfigs)
      .set({
        status: "active",
        submittedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(dataMappingConfigs.id, config.id))
      .returning();

    // Notify admins (fire-and-forget)
    notifyEvent({
      event: "mapping_withdrawn",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
    });

    return NextResponse.json({
      ...updated,
      hibobValues: updated.hibobValues ? JSON.parse(updated.hibobValues) : {},
      payrollValues: updated.payrollValues ? JSON.parse(updated.payrollValues) : {},
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error withdrawing mapping:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
