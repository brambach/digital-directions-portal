import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { provisioningSteps, projects, users, userNotifications } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendProvisioningEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/provisioning/[stepId]/complete — Client marks step as complete
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId, stepId } = await params;

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

    const [step] = await db
      .select()
      .from(provisioningSteps)
      .where(
        and(
          eq(provisioningSteps.id, stepId),
          eq(provisioningSteps.projectId, projectId)
        )
      )
      .limit(1);

    if (!step) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 });
    }

    if (step.completedAt) {
      return NextResponse.json(
        { error: "Step is already marked as complete" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(provisioningSteps)
      .set({
        completedAt: new Date(),
        completedBy: user.id,
      })
      .where(eq(provisioningSteps.id, stepId))
      .returning();

    // Check if ALL steps are now completed by the client
    const allSteps = await db
      .select()
      .from(provisioningSteps)
      .where(eq(provisioningSteps.projectId, projectId));

    const allClientDone = allSteps.every((s) => s.completedAt || s.id === stepId);

    // Notify admin users about this step completion
    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    const notifTitle = allClientDone
      ? "All provisioning steps completed"
      : `Provisioning step completed: ${step.title}`;
    const notifMessage = allClientDone
      ? `All provisioning steps for "${project.name}" have been completed by the client and are ready for verification.`
      : `The "${step.title}" provisioning step for "${project.name}" has been marked complete by the client.`;

    for (const adminUser of adminUsers) {
      await db.insert(userNotifications).values({
        userId: adminUser.id,
        type: "provisioning",
        title: notifTitle,
        message: notifMessage,
        linkUrl: `/dashboard/admin/projects/${projectId}/provisioning`,
      });

      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(adminUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name =
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "there";
        if (email) {
          await sendProvisioningEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            event: "step_completed",
            stepTitle: step.title,
          });
        }
      } catch (emailErr) {
        console.error("Error sending provisioning email:", emailErr);
      }
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
