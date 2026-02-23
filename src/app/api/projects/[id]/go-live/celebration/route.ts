import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, goLiveEvents } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

// POST /api/projects/[id]/go-live/celebration — mark celebration as seen by user
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === "client" && project.clientId !== user.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [event] = await db
    .select()
    .from(goLiveEvents)
    .where(eq(goLiveEvents.projectId, projectId))
    .limit(1);

  if (!event) {
    return NextResponse.json({ error: "No go-live event found" }, { status: 404 });
  }

  const shownTo: string[] = JSON.parse(event.celebrationShownTo || "[]");

  if (!shownTo.includes(user.id)) {
    shownTo.push(user.id);
    await db
      .update(goLiveEvents)
      .set({ celebrationShownTo: JSON.stringify(shownTo) })
      .where(eq(goLiveEvents.id, event.id));
  }

  return NextResponse.json({ success: true });
}
