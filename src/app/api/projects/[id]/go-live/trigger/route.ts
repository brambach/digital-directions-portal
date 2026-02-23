import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  projects,
  goLiveChecklist,
  goLiveEvents,
  users,
  userNotifications,
} from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { sendGoLiveEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

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
  await notifyGoLiveTriggered(projectId, project.clientId, project.name);

  return NextResponse.json(event, { status: 201 });
}

async function notifyGoLiveTriggered(
  projectId: string,
  clientId: string,
  projectName: string
) {
  try {
    const clerk = await clerkClient();

    // Notify client users
    const clientUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.clientId, clientId), isNull(users.deletedAt)));

    for (const clientUser of clientUsers) {
      await db.insert(userNotifications).values({
        userId: clientUser.id,
        type: "go_live_triggered",
        title: "Your Integration Is Live!",
        message: `Congratulations! The integration for "${projectName}" is now live.`,
        linkUrl: `/dashboard/client/projects/${projectId}/go-live`,
      });

      try {
        const clerkUser = await clerk.users.getUser(clientUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name = `${clerkUser.firstName || ""}`.trim() || "there";
        if (email) {
          await sendGoLiveEmail({
            to: email,
            recipientName: name,
            projectName,
            projectId,
            event: "go_live_triggered",
          });
        }
      } catch {
        // Non-fatal
      }
    }

    // Notify admin users
    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    for (const admin of adminUsers) {
      await db.insert(userNotifications).values({
        userId: admin.id,
        type: "go_live_triggered",
        title: "Go-Live Triggered",
        message: `The integration for "${projectName}" has been switched to production.`,
        linkUrl: `/dashboard/admin/projects/${projectId}/go-live`,
      });

      try {
        const clerkUser = await clerk.users.getUser(admin.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name = `${clerkUser.firstName || ""}`.trim() || "there";
        if (email) {
          await sendGoLiveEmail({
            to: email,
            recipientName: name,
            projectName,
            projectId,
            event: "go_live_triggered",
            isAdmin: true,
          });
        }
      } catch {
        // Non-fatal
      }
    }
  } catch (err) {
    console.error("Failed to notify go-live triggered:", err);
  }
}
