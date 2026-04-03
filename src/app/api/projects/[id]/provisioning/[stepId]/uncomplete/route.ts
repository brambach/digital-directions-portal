import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { provisioningSteps, projects, users, userNotifications } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendProvisioningEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/provisioning/[stepId]/uncomplete — Revert a completed (but unverified) step
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

    if (!step.completedAt) {
      return NextResponse.json(
        { error: "Step has not been completed yet" },
        { status: 400 }
      );
    }

    if (step.verifiedAt) {
      return NextResponse.json(
        { error: "Step has already been verified and cannot be undone" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(provisioningSteps)
      .set({
        completedAt: null,
        completedBy: null,
      })
      .where(eq(provisioningSteps.id, stepId))
      .returning();

    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    for (const adminUser of adminUsers) {
      await db.insert(userNotifications).values({
        userId: adminUser.id,
        type: "provisioning",
        title: `Provisioning step reverted: ${step.title}`,
        message: `The "${step.title}" provisioning step for "${project.name}" has been reverted by the client.`,
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
            event: "step_uncompleted",
            stepTitle: step.title,
          });
        }
      } catch (emailErr) {
        console.error("Error sending provisioning uncomplete email:", emailErr);
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
