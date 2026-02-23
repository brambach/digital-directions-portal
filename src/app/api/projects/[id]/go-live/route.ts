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

// Default checklist items based on the DD go-live workbook
const DEFAULT_ADMIN_ITEMS = [
  { id: "admin_1", title: "Production recipes configured and tested" },
  { id: "admin_2", title: "API credentials refreshed for production" },
  { id: "admin_3", title: "Final employee mapping verified" },
  { id: "admin_4", title: "Error notification email addresses configured" },
  { id: "admin_5", title: "Test run passed successfully" },
];

const DEFAULT_CLIENT_ITEMS = [
  {
    id: "client_1",
    title:
      'Validate that the "Payslip" export folder in HiBob has permissions disabled for all employees',
  },
  {
    id: "client_2",
    title:
      "Designate email addresses to be used for error/warning emails, payslip export reports, etc.",
  },
  {
    id: "client_3",
    title: "Confirm employee data is accurate and up-to-date",
  },
  { id: "client_4", title: "Confirm pay categories are correct" },
  { id: "client_5", title: "Confirm leave types are correct" },
  { id: "client_6", title: "Approve final test results" },
];

// GET /api/projects/[id]/go-live — fetch checklist + go-live event
export async function GET(
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

  const [checklist] = await db
    .select()
    .from(goLiveChecklist)
    .where(eq(goLiveChecklist.projectId, projectId))
    .limit(1);

  const [event] = await db
    .select()
    .from(goLiveEvents)
    .where(eq(goLiveEvents.projectId, projectId))
    .limit(1);

  return NextResponse.json({ checklist: checklist ?? null, event: event ?? null });
}

// POST /api/projects/[id]/go-live — initialize checklist (admin only)
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

  // Check if checklist already exists
  const [existing] = await db
    .select()
    .from(goLiveChecklist)
    .where(eq(goLiveChecklist.projectId, projectId))
    .limit(1);

  if (existing) {
    return NextResponse.json(
      { error: "Checklist already initialized" },
      { status: 409 }
    );
  }

  const [checklist] = await db
    .insert(goLiveChecklist)
    .values({
      projectId,
      adminItems: JSON.stringify(DEFAULT_ADMIN_ITEMS),
      clientItems: JSON.stringify(DEFAULT_CLIENT_ITEMS),
    })
    .returning();

  // Notify client users that checklist is ready
  await notifyGoLiveChecklist(projectId, project.clientId, project.name);

  return NextResponse.json(checklist, { status: 201 });
}

// PUT /api/projects/[id]/go-live — toggle checklist item
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const body = await req.json().catch(() => ({}));
  const { itemId, completed } = body as { itemId: string; completed: boolean };

  if (!itemId || typeof completed !== "boolean") {
    return NextResponse.json({ error: "itemId and completed required" }, { status: 400 });
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === "client" && project.clientId !== user.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [checklist] = await db
    .select()
    .from(goLiveChecklist)
    .where(eq(goLiveChecklist.projectId, projectId))
    .limit(1);

  if (!checklist) {
    return NextResponse.json({ error: "Checklist not found" }, { status: 404 });
  }

  // Check if go-live already happened
  const [existingEvent] = await db
    .select()
    .from(goLiveEvents)
    .where(eq(goLiveEvents.projectId, projectId))
    .limit(1);

  if (existingEvent) {
    return NextResponse.json(
      { error: "Go-live already triggered, checklist is frozen" },
      { status: 400 }
    );
  }

  const isAdminItem = itemId.startsWith("admin_");
  const isClientItem = itemId.startsWith("client_");

  // Enforce: admins can only toggle admin items, clients can only toggle client items
  if (user.role === "admin" && !isAdminItem) {
    return NextResponse.json({ error: "Admins can only update admin checklist items" }, { status: 403 });
  }
  if (user.role === "client" && !isClientItem) {
    return NextResponse.json({ error: "Clients can only update client checklist items" }, { status: 403 });
  }

  const adminItems: ChecklistItem[] = JSON.parse(checklist.adminItems);
  const clientItems: ChecklistItem[] = JSON.parse(checklist.clientItems);
  const items = isAdminItem ? adminItems : clientItems;
  const item = items.find((i) => i.id === itemId);

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  if (completed) {
    item.completedAt = new Date().toISOString();
    item.completedBy = user.id;
  } else {
    delete item.completedAt;
    delete item.completedBy;
  }

  const updates = isAdminItem
    ? { adminItems: JSON.stringify(adminItems), updatedAt: new Date() }
    : { clientItems: JSON.stringify(clientItems), updatedAt: new Date() };

  const [updated] = await db
    .update(goLiveChecklist)
    .set(updates)
    .where(eq(goLiveChecklist.id, checklist.id))
    .returning();

  // Check if this side is now fully complete and notify the other side
  if (completed) {
    const updatedItems: ChecklistItem[] = isAdminItem
      ? JSON.parse(updated.adminItems)
      : JSON.parse(updated.clientItems);
    const allComplete = updatedItems.every((i) => i.completedAt);

    if (allComplete) {
      await notifyChecklistSideComplete(
        projectId,
        project.clientId,
        project.name,
        isAdminItem ? "admin" : "client"
      );
    }
  }

  return NextResponse.json(updated);
}

interface ChecklistItem {
  id: string;
  title: string;
  completedAt?: string;
  completedBy?: string;
}

async function notifyGoLiveChecklist(
  projectId: string,
  clientId: string,
  projectName: string
) {
  try {
    const clientUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.clientId, clientId), isNull(users.deletedAt)));

    const clerk = await clerkClient();

    for (const clientUser of clientUsers) {
      await db.insert(userNotifications).values({
        userId: clientUser.id,
        type: "go_live_checklist",
        title: "Go-Live Checklist Ready",
        message: `The pre-go-live checklist for "${projectName}" is ready for you to complete.`,
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
            event: "checklist_ready",
          });
        }
      } catch {
        // Non-fatal
      }
    }
  } catch (err) {
    console.error("Failed to notify clients of go-live checklist:", err);
  }
}

async function notifyChecklistSideComplete(
  projectId: string,
  clientId: string,
  projectName: string,
  completedSide: "admin" | "client"
) {
  try {
    const clerk = await clerkClient();

    if (completedSide === "client") {
      // Notify admins
      const adminUsers = await db
        .select()
        .from(users)
        .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

      for (const admin of adminUsers) {
        await db.insert(userNotifications).values({
          userId: admin.id,
          type: "go_live_checklist",
          title: "Client Checklist Complete",
          message: `The client has completed all their go-live checklist items for "${projectName}".`,
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
              event: "checklist_complete",
              isAdmin: true,
            });
          }
        } catch {
          // Non-fatal
        }
      }
    } else {
      // Notify client users
      const clientUsers = await db
        .select()
        .from(users)
        .where(and(eq(users.clientId, clientId), isNull(users.deletedAt)));

      for (const clientUser of clientUsers) {
        await db.insert(userNotifications).values({
          userId: clientUser.id,
          type: "go_live_checklist",
          title: "DD Checklist Complete",
          message: `Digital Directions has completed all their go-live checklist items for "${projectName}".`,
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
              event: "checklist_complete",
            });
          }
        } catch {
          // Non-fatal
        }
      }
    }
  } catch (err) {
    console.error("Failed to notify checklist completion:", err);
  }
}
