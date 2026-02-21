import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bobConfigChecklist, projects, users, userNotifications } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendBobConfigEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/bob-config/approve — Admin approves or requests changes
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: projectId } = await params;
    const body = await request.json();
    const { action, reviewNotes } = body;

    if (!action || !["approve", "request_changes"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'request_changes'" },
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

    const [checklist] = await db
      .select()
      .from(bobConfigChecklist)
      .where(eq(bobConfigChecklist.projectId, projectId))
      .limit(1);

    if (!checklist) {
      return NextResponse.json({ error: "Bob Config checklist not found" }, { status: 404 });
    }

    if (checklist.status !== "in_review") {
      return NextResponse.json(
        { error: "Checklist is not in review state" },
        { status: 400 }
      );
    }

    let updateData: Record<string, unknown>;

    if (action === "approve") {
      updateData = {
        status: "approved",
        approvedAt: new Date(),
        approvedBy: admin.id,
        updatedAt: new Date(),
      };
    } else {
      // request_changes — reset to active so client can update items
      // Reset all item completedAt so client must re-confirm
      const items = JSON.parse(checklist.items || "[]");
      const resetItems = items.map((item: Record<string, unknown>) => ({
        ...item,
        completedAt: null,
      }));
      updateData = {
        status: "active",
        items: JSON.stringify(resetItems),
        updatedAt: new Date(),
      };
    }

    const [updated] = await db
      .update(bobConfigChecklist)
      .set(updateData)
      .where(eq(bobConfigChecklist.id, checklist.id))
      .returning();

    // Notify client users
    const clientUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.clientId, project.clientId), isNull(users.deletedAt)));

    const notifTitle =
      action === "approve"
        ? "HiBob configuration approved"
        : "Changes requested on HiBob configuration";
    const notifMessage =
      action === "approve"
        ? `Your HiBob configuration for "${project.name}" has been approved.`
        : `Changes have been requested on your HiBob configuration for "${project.name}".${reviewNotes ? ` Notes: ${reviewNotes}` : ""}`;

    const emailEvent = action === "approve" ? "approved" : "changes_requested";

    for (const clientUser of clientUsers) {
      await db.insert(userNotifications).values({
        userId: clientUser.id,
        type: "bob_config",
        title: notifTitle,
        message: notifMessage,
        linkUrl: `/dashboard/client/projects/${projectId}/bob-config`,
      });

      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(clientUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "there";
        if (email) {
          await sendBobConfigEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: emailEvent as "approved" | "changes_requested",
            reviewNotes: reviewNotes || undefined,
          });
        }
      } catch (emailErr) {
        console.error("Error sending bob config review email:", emailErr);
      }
    }

    return NextResponse.json({
      checklist: { ...updated, items: JSON.parse(updated.items) },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
