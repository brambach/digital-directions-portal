import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projects,
  goLiveChecklist,
  goLiveEvents,
} from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { notifyEvent } from "@/lib/notify";

interface ChecklistItem {
  id: string;
  title: string;
  completedAt?: string;
  completedBy?: string;
}

// POST /api/projects/[id]/go-live/trigger — admin triggers go-live
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Check if already triggered
  const [existingEvent] = await db
    .select()
    .from(goLiveEvents)
    .where(eq(goLiveEvents.projectId, projectId))
    .limit(1);

  if (existingEvent) {
    return NextResponse.json(
      { error: "Go-live already triggered" },
      { status: 409 }
    );
  }

  // Verify both checklists are complete
  const [checklist] = await db
    .select()
    .from(goLiveChecklist)
    .where(eq(goLiveChecklist.projectId, projectId))
    .limit(1);

  if (!checklist) {
    return NextResponse.json(
      { error: "Checklist not initialized" },
      { status: 400 }
    );
  }

  const adminItems: ChecklistItem[] = JSON.parse(checklist.adminItems);
  const clientItems: ChecklistItem[] = JSON.parse(checklist.clientItems);

  const adminComplete = adminItems.every((i) => i.completedAt);
  const clientComplete = clientItems.every((i) => i.completedAt);

  if (!adminComplete || !clientComplete) {
    return NextResponse.json(
      { error: "Both admin and client checklists must be complete before go-live" },
      { status: 400 }
    );
  }

  // Create go-live event with mock sync stats
  const syncStats = {
    employeesSynced: Math.floor(Math.random() * 200) + 50,
    recordsCreated: Math.floor(Math.random() * 500) + 100,
    recipesActive: Math.floor(Math.random() * 15) + 5,
    integrationName: project.payrollSystem
      ? { keypay: "KeyPay", myob: "MYOB", deputy: "Deputy", generic: "Generic" }[
          project.payrollSystem
        ] || project.payrollSystem
      : "HiBob Integration",
  };

  const [event] = await db
    .insert(goLiveEvents)
    .values({
      projectId,
      syncStats: JSON.stringify(syncStats),
      celebrationShownTo: "[]",
    })
    .returning();

  // Update project: set goLiveDate and advance to support stage
  await db
    .update(projects)
    .set({
      goLiveDate: new Date(),
      currentStage: "support",
      supportActivatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId));

  // Notify everyone
  notifyEvent({
    event: "go_live_triggered",
    projectId,
    projectName: project.name,
    clientId: project.clientId,
  });

  return NextResponse.json(event, { status: 201 });
}
