import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, uatResults, users, userNotifications } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { sendUatEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// POST /api/projects/[id]/uat/submit — client saves scenario results, sets status in_review
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "client") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId } = await params;

  const [project] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        eq(projects.clientId, user.clientId!),
        isNull(projects.deletedAt)
      )
    )
    .limit(1);

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [result] = await db
    .select()
    .from(uatResults)
    .where(eq(uatResults.projectId, projectId))
    .limit(1);

  if (!result) {
    return NextResponse.json({ error: "No UAT results found" }, { status: 404 });
  }

  if (result.status !== "active") {
    return NextResponse.json(
      { error: "UAT results can only be submitted when status is active" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { results } = body;

  if (!results || typeof results !== "object") {
    return NextResponse.json({ error: "Results object is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(uatResults)
    .set({
      results: JSON.stringify(results),
      status: "in_review",
      submittedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(uatResults.id, result.id))
    .returning();

  // Notify all admin users
  await notifyAdminsOfUatSubmission(projectId, project.name);

  return NextResponse.json(updated);
}

async function notifyAdminsOfUatSubmission(projectId: string, projectName: string) {
  try {
    const adminUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

    const clerk = await clerkClient();

    for (const adminUser of adminUsers) {
      await db.insert(userNotifications).values({
        userId: adminUser.id,
        type: "uat_submitted",
        title: "UAT Results Submitted",
        message: `UAT test results for "${projectName}" have been submitted and are ready for review.`,
        linkUrl: `/dashboard/admin/projects/${projectId}/uat`,
      });

      try {
        const clerkAdmin = await clerk.users.getUser(adminUser.clerkId);
        const email = clerkAdmin.emailAddresses[0]?.emailAddress;
        const name = `${clerkAdmin.firstName || ""}`.trim() || "Team";
        if (email) {
          await sendUatEmail({
            to: email,
            recipientName: name,
            projectName,
            projectId,
            event: "submitted",
          });
        }
      } catch {
        // Non-fatal
      }
    }
  } catch (err) {
    console.error("Failed to notify admins of UAT submission:", err);
  }
}
