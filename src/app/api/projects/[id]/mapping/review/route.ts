import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  dataMappingConfigs,
  projects,
  users,
  userNotifications,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendMappingEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/mapping/review — Admin reviews (approve or request changes)
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

    if (config.status !== "in_review") {
      return NextResponse.json(
        { error: "Mapping is not in review state" },
        { status: 400 }
      );
    }

    let updateData: Record<string, unknown>;

    if (action === "approve") {
      updateData = {
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: admin.id,
        approvedAt: new Date(),
        approvedBy: admin.id,
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
      .update(dataMappingConfigs)
      .set(updateData)
      .where(eq(dataMappingConfigs.id, config.id))
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
        ? "Data mapping approved"
        : "Changes requested on data mapping";

    const notifMessage =
      action === "approve"
        ? `The data mapping for "${project.name}" has been approved.`
        : `Changes have been requested on the data mapping for "${project.name}".${reviewNotes ? ` Notes: ${reviewNotes}` : ""}`;

    const emailEvent = action === "approve" ? "approved" : "changes_requested";

    for (const clientUser of clientUsers) {
      await db.insert(userNotifications).values({
        userId: clientUser.id,
        type: "mapping",
        title: notifTitle,
        message: notifMessage,
        linkUrl: `/dashboard/client/projects/${projectId}/mapping`,
      });

      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(clientUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          "there";
        if (email) {
          await sendMappingEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: emailEvent as "approved" | "changes_requested",
            reviewNotes: reviewNotes || undefined,
          });
        }
      } catch (emailErr) {
        console.error("Error sending mapping email:", emailErr);
      }
    }

    return NextResponse.json({
      ...updated,
      hibobValues: updated.hibobValues ? JSON.parse(updated.hibobValues) : {},
      payrollValues: updated.payrollValues ? JSON.parse(updated.payrollValues) : {},
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error reviewing mapping:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
