import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  dataMappingConfigs,
  projects,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

// PUT /api/projects/[id]/mapping/values — Admin edits HiBob/payroll values after init
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: projectId } = await params;
    const body = await request.json();
    const { hibobValues, payrollValues } = body;

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

    // Admin can edit values while status is active or approved (but not in_review)
    if (config.status === "in_review") {
      return NextResponse.json(
        { error: "Cannot edit values while mapping is in review" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (hibobValues && typeof hibobValues === "object") {
      updateData.hibobValues = JSON.stringify(hibobValues);
    }

    if (payrollValues && typeof payrollValues === "object") {
      updateData.payrollValues = JSON.stringify(payrollValues);
    }

    const [updated] = await db
      .update(dataMappingConfigs)
      .set(updateData)
      .where(eq(dataMappingConfigs.id, config.id))
      .returning();

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
    console.error("Error updating mapping values:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
