import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  discoveryResponses,
  projects,
  users,
  userNotifications,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendDiscoveryEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/discovery/review — Admin reviews (approve or request changes)
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

    // Verify project exists
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Get existing response
    const [existing] = await db
      .select()
      .from(discoveryResponses)
      .where(eq(discoveryResponses.projectId, projectId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "No discovery response found" },
        { status: 404 }
      );
    }

    if (existing.status !== "in_review") {
      return NextResponse.json(
        { error: "Discovery is not in review state" },
        { status: 400 }
      );
    }

    let updateData: Record<string, unknown>;

    if (action === "approve") {
      updateData = {
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: admin.id,
        reviewNotes: reviewNotes || null,
        updatedAt: new Date(),
      };
    } else {
      // request_changes — reset to active so client can edit
      updateData = {
        status: "active",
        reviewNotes: reviewNotes || "Changes requested by the DD team.",
        reviewedAt: new Date(),
        reviewedBy: admin.id,
        updatedAt: new Date(),
      };
    }

    const [updated] = await db
      .update(discoveryResponses)
      .set(updateData)
      .where(eq(discoveryResponses.id, existing.id))
      .returning();

    // Notify client users
    const clientUsers = await db
      .select()
      .from(users)
      .where(
        and(eq(users.clientId, project.clientId), isNull(users.deletedAt))
      );

    const notifTitle =
      action === "approve"
        ? "Discovery questionnaire approved"
        : "Changes requested on discovery questionnaire";

    const notifMessage =
      action === "approve"
        ? `Your discovery questionnaire for "${project.name}" has been approved.`
        : `Changes have been requested on your discovery questionnaire for "${project.name}".${reviewNotes ? ` Notes: ${reviewNotes}` : ""}`;

    const emailEvent = action === "approve" ? "approved" : "changes_requested";

    for (const clientUser of clientUsers) {
      await db.insert(userNotifications).values({
        userId: clientUser.id,
        type: "discovery",
        title: notifTitle,
        message: notifMessage,
        linkUrl: `/dashboard/client/projects/${projectId}/discovery`,
      });

      // Send email
      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(clientUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          "there";
        if (email) {
          await sendDiscoveryEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: emailEvent as "approved" | "changes_requested",
            reviewNotes: reviewNotes || undefined,
          });
        }
      } catch (emailErr) {
        console.error("Error sending discovery email:", emailErr);
      }
    }

    return NextResponse.json({
      ...updated,
      responses: JSON.parse(updated.responses),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
