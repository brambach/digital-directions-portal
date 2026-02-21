import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bobConfigChecklist, projects } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";

interface BobConfigItem {
  id: string;
  title: string;
  description: string;
  loomUrl: string | null;
  faqItems: { question: string; answer: string }[];
  completedAt: string | null;
}

// PATCH /api/projects/[id]/bob-config/item — Toggle an item's completion status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;
    const body = await request.json();
    const { itemId, completed } = body;

    if (!itemId || typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: itemId and completed" },
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

    if (user.role === "client" && project.clientId !== user.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [checklist] = await db
      .select()
      .from(bobConfigChecklist)
      .where(eq(bobConfigChecklist.projectId, projectId))
      .limit(1);

    if (!checklist) {
      return NextResponse.json({ error: "Bob Config checklist not found" }, { status: 404 });
    }

    if (checklist.status === "in_review" || checklist.status === "approved") {
      return NextResponse.json(
        { error: "Cannot modify items — checklist has been submitted" },
        { status: 400 }
      );
    }

    const items: BobConfigItem[] = JSON.parse(checklist.items || "[]");
    const itemIndex = items.findIndex((i) => i.id === itemId);

    if (itemIndex === -1) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    items[itemIndex].completedAt = completed ? new Date().toISOString() : null;

    const [updated] = await db
      .update(bobConfigChecklist)
      .set({
        items: JSON.stringify(items),
        updatedAt: new Date(),
      })
      .where(eq(bobConfigChecklist.id, checklist.id))
      .returning();

    return NextResponse.json({
      checklist: { ...updated, items: JSON.parse(updated.items) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
