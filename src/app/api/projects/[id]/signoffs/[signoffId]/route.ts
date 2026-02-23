import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signoffs, users, userNotifications, projects } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { sendBuildSpecSignedEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/signoffs/[signoffId]
// Client signs off on the build spec
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; signoffId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId, signoffId } = await params;

  const [signoff] = await db
    .select()
    .from(signoffs)
    .where(and(eq(signoffs.id, signoffId), eq(signoffs.projectId, projectId)))
    .limit(1);

  if (!signoff) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only clients can sign; admins counter-sign separately
  if (user.role === "client") {
    if (signoff.signedAt) {
      return NextResponse.json({ error: "Already signed" }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const { clientConfirmText } = body;

    const [updated] = await db
      .update(signoffs)
      .set({
        signedByClient: user.id,
        signedAt: new Date(),
        clientConfirmText: clientConfirmText?.trim() || null,
      })
      .where(eq(signoffs.id, signoffId))
      .returning();

    // Notify all admins
    await notifyAdminsOfSignoff(projectId, user.id);

    return NextResponse.json(updated);
  }

  // Admin counter-sign
  if (user.role === "admin") {
    if (!signoff.signedAt) {
      return NextResponse.json({ error: "Client must sign before admin counter-signs" }, { status: 400 });
    }
    if (signoff.ddCounterSignedAt) {
      return NextResponse.json({ error: "Already counter-signed" }, { status: 409 });
    }

    const [updated] = await db
      .update(signoffs)
      .set({
        ddCounterSignedBy: user.id,
        ddCounterSignedAt: new Date(),
      })
      .where(eq(signoffs.id, signoffId))
      .returning();

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

async function notifyAdminsOfSignoff(projectId: string, clientUserId: string) {
  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) return;

    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    const clerk = await clerkClient();

    // Get the client's name for the notification
    let clientName = "The client";
    try {
      const clientUser = await db
        .select()
        .from(users)
        .where(eq(users.id, clientUserId))
        .limit(1);
      if (clientUser[0]) {
        const clerkUser = await clerk.users.getUser(clientUser[0].clerkId);
        clientName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "The client";
      }
    } catch {
      // Non-fatal
    }

    for (const adminUser of adminUsers) {
      await db.insert(userNotifications).values({
        userId: adminUser.id,
        type: "build_spec_signed",
        title: "Build Spec Signed",
        message: `${clientName} has signed off on the build spec for "${project.name}".`,
        linkUrl: `/dashboard/admin/projects/${projectId}/build`,
      });

      try {
        const clerkAdmin = await clerk.users.getUser(adminUser.clerkId);
        const email = clerkAdmin.emailAddresses[0]?.emailAddress;
        const name = `${clerkAdmin.firstName || ""}`.trim() || "Team";
        if (email) {
          await sendBuildSpecSignedEmail({
            to: email,
            recipientName: name,
            projectName: project.name,
            projectId,
            clientName,
          });
        }
      } catch {
        // Non-fatal
      }
    }
  } catch (err) {
    console.error("Failed to notify admins of signoff:", err);
  }
}
