import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  dataMappingConfigs,
  dataMappingEntries,
  projects,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { getCategoryLabel, type MappingCategory } from "@/lib/mapping-defaults";

// GET /api/projects/[id]/mapping/export — Export approved mappings as CSV
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id: projectId } = await params;

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

    if (config.status !== "approved") {
      return NextResponse.json(
        { error: "Mapping must be approved before exporting" },
        { status: 400 }
      );
    }

    // Get all entries
    const entries = await db
      .select()
      .from(dataMappingEntries)
      .where(eq(dataMappingEntries.configId, config.id));

    // Build CSV — format matching Workato lookup table import
    const csvHeaders = ["category", "category_label", "hibob_value", "payroll_value"];
    const csvRows = entries.map((entry) => [
      entry.category,
      getCategoryLabel(entry.category as MappingCategory),
      escapeCsvField(entry.hibobValue),
      escapeCsvField(entry.payrollValue),
    ]);

    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    // Record export timestamp
    await db
      .update(dataMappingConfigs)
      .set({ exportedAt: new Date(), updatedAt: new Date() })
      .where(eq(dataMappingConfigs.id, config.id));

    // Build filename
    const projectSlug = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const date = new Date().toISOString().split("T")[0];
    const filename = `${projectSlug}-data-mapping-${date}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error exporting mapping:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
