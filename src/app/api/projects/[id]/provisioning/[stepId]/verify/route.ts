import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { provisioningSteps, projects, users, userNotifications } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendProvisioningEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/provisioning/[stepId]/verify — Admin verifies a step
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id: projectId, stepId } = await params;

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
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
        { error: "Step must be marked complete by the client before it can be verified" },
        { status: 400 }
      );
    }

    if (step.verifiedAt) {
      return NextResponse.json(
        { error: "Step is already verified" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(provisioningSteps)
      .set({
        verifiedAt: new Date(),
        verifiedBy: admin.id,
      })
      .where(eq(provisioningSteps.id, stepId))
      .returning();

    // Check if ALL steps are now verified
    const allSteps = await db
      .select()
      .from(provisioningSteps)
      .where(eq(provisioningSteps.projectId, projectId));

    const allVerified = allSteps.every((s) => s.verifiedAt || s.id === stepId);

    if (allVerified) {
      // Notify client users — all provisioning steps are verified!
      const clientUsers = await db
        .select()
        .from(users)
        .where(and(eq(users.clientId, project.clientId), isNull(users.deletedAt)));

      for (const clientUser of clientUsers) {
        await db.insert(userNotifications).values({
          userId: clientUser.id,
          type: "provisioning",
          title: "System provisioning complete!",
          message: `All provisioning steps for "${project.name}" have been verified. Your project is ready to move to the next stage.`,
          linkUrl: `/dashboard/client/projects/${projectId}/provisioning`,
        });

        try {
          const clerk = await clerkClient();
          const clerkUser = await clerk.users.getUser(clientUser.clerkId);
          const email = clerkUser.emailAddresses[0]?.emailAddress;
          const name =
            `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "there";
          if (email) {
            await sendProvisioningEmail({
              to: email,
              recipientName: name,
              projectName: project.name,
              projectId,
              event: "all_verified",
            });
          }
        } catch (emailErr) {
          console.error("Error sending provisioning all-verified email:", emailErr);
        }
      }
    }

    return NextResponse.json({ ...updated, allVerified });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Admin access required") || message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
