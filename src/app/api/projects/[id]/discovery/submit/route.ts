import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  discoveryResponses,
  projects,
  users,
  userNotifications,
} from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendDiscoveryEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/discovery/submit — Client submits questionnaire
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

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

    if (existing.status !== "active") {
      return NextResponse.json(
        { error: "Discovery is not in a submittable state" },
        { status: 400 }
      );
    }

    // Update status to in_review
    const [updated] = await db
      .update(discoveryResponses)
      .set({
        status: "in_review",
        submittedAt: new Date(),
        reviewNotes: null,
        updatedAt: new Date(),
      })
      .where(eq(discoveryResponses.id, existing.id))
      .returning();

    // Notify all admin users
    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    for (const admin of adminUsers) {
      await db.insert(userNotifications).values({
        userId: admin.id,
        type: "discovery",
        title: "Discovery questionnaire submitted",
        message: `The discovery questionnaire for "${project.name}" has been submitted for review.`,
        linkUrl: `/dashboard/admin/projects/${projectId}/discovery`,
      });

      // Send email
      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(admin.clerkId);
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
            event: "submitted",
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
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
