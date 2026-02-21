import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { discoveryTemplates } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

// GET /api/discovery-templates/[id] - Get single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const [template] = await db
      .select()
      .from(discoveryTemplates)
      .where(and(eq(discoveryTemplates.id, id), isNull(discoveryTemplates.deletedAt)))
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...template,
      sections: JSON.parse(template.sections || "[]"),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/discovery-templates/[id] - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { name, payrollSystem, sections, isActive } = body;

    // Verify template exists
    const [existing] = await db
      .select()
      .from(discoveryTemplates)
      .where(and(eq(discoveryTemplates.id, id), isNull(discoveryTemplates.deletedAt)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (payrollSystem !== undefined) updateData.payrollSystem = payrollSystem;
    if (sections !== undefined) updateData.sections = JSON.stringify(sections);
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updated] = await db
      .update(discoveryTemplates)
      .set(updateData)
      .where(eq(discoveryTemplates.id, id))
      .returning();

    return NextResponse.json({
      ...updated,
      sections: JSON.parse(updated.sections || "[]"),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/discovery-templates/[id] - Soft delete
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const [existing] = await db
      .select()
      .from(discoveryTemplates)
      .where(and(eq(discoveryTemplates.id, id), isNull(discoveryTemplates.deletedAt)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await db
      .update(discoveryTemplates)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(discoveryTemplates.id, id));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
