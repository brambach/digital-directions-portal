import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  dataMappingConfigs,
  dataMappingEntries,
  projects,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

// PUT /api/projects/[id]/mapping/entries — Save mapping entries (batch upsert)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;
    const body = await request.json();
    const { entries } = body;

    if (!Array.isArray(entries)) {
      return NextResponse.json(
        { error: "Missing or invalid entries array" },
        { status: 400 }
      );
    }

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

    // Get mapping config
    const [config] = await db
      .select()
      .from(dataMappingConfigs)
      .where(eq(dataMappingConfigs.projectId, projectId))
      .limit(1);

    if (!config) {
      return NextResponse.json(
        { error: "No mapping config found for this project" },
        { status: 404 }
      );
    }

    if (config.status !== "active") {
      return NextResponse.json(
        { error: "Mapping is not in an editable state" },
        { status: 400 }
      );
    }

    // Delete all existing entries for this config and replace with new ones
    await db
      .delete(dataMappingEntries)
      .where(eq(dataMappingEntries.configId, config.id));

    // Insert new entries
    if (entries.length > 0) {
      const toInsert = entries.map(
        (entry: { category: string; hibobValue: string; payrollValue: string }, idx: number) => ({
          configId: config.id,
          category: entry.category,
          hibobValue: entry.hibobValue,
          payrollValue: entry.payrollValue,
          orderIndex: idx,
        })
      );

      await db.insert(dataMappingEntries).values(toInsert);
    }

    // Update config timestamp
    await db
      .update(dataMappingConfigs)
      .set({ updatedAt: new Date() })
      .where(eq(dataMappingConfigs.id, config.id));

    // Return all entries
    const updatedEntries = await db
      .select()
      .from(dataMappingEntries)
      .where(eq(dataMappingEntries.configId, config.id));

    return NextResponse.json({ entries: updatedEntries });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error saving mapping entries:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
