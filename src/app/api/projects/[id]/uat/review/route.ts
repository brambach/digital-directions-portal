import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, uatResults, signoffs, users, userNotifications } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { sendUatEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// PUT /api/projects/[id]/uat/review — admin approves or requests changes
export async function PUT(
  req: Request,
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

  const [result] = await db
    .select()
    .from(uatResults)
    .where(eq(uatResults.projectId, projectId))
    .limit(1);

  if (!result) {
    return NextResponse.json({ error: "No UAT results found" }, { status: 404 });
  }

  if (result.status !== "in_review") {
    return NextResponse.json(
      { error: "UAT results can only be reviewed when status is in_review" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { action, reviewNotes } = body;

  if (action !== "approve" && action !== "request_changes") {
    return NextResponse.json(
      { error: "Action must be 'approve' or 'request_changes'" },
      { status: 400 }
    );
  }

  if (action === "approve") {
    // Update UAT results to approved
    const [updated] = await db
      .update(uatResults)
      .set({
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: user.id,
        updatedAt: new Date(),
      })
      .where(eq(uatResults.id, result.id))
      .returning();

    // Create a UAT signoff record so the client can sign
    await db
      .insert(signoffs)
      .values({
        projectId,
        type: "uat",
        documentSnapshot: JSON.stringify({
          results: JSON.parse(result.results),
          approvedAt: new Date().toISOString(),
          reviewNotes: reviewNotes || null,
        }),
      });

    // Notify client users
    await notifyClientsOfUatReview(projectId, project.clientId, project.name, "approved", reviewNotes);

    return NextResponse.json(updated);
  }

  // Request changes — set status back to active
  const [updated] = await db
    .update(uatResults)
    .set({
      status: "active",
      reviewedAt: new Date(),
      reviewedBy: user.id,
      updatedAt: new Date(),
    })
    .where(eq(uatResults.id, result.id))
    .returning();

  // Notify client users
  await notifyClientsOfUatReview(projectId, project.clientId, project.name, "changes_requested", reviewNotes);

  return NextResponse.json(updated);
}

async function notifyClientsOfUatReview(
  projectId: string,
  clientId: string,
  projectName: string,
  event: "approved" | "changes_requested",
  reviewNotes?: string
) {
  try {
    const clientUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.clientId, clientId), isNull(users.deletedAt)));

    const clerk = await clerkClient();

    const title = event === "approved" ? "UAT Approved" : "UAT Changes Requested";
    const message =
      event === "approved"
        ? `Your UAT results for "${projectName}" have been approved. Please sign off to proceed to Go-Live.`
        : `The Digital Directions team has requested changes to your UAT results for "${projectName}".${reviewNotes ? ` Notes: ${reviewNotes}` : ""}`;

    for (const clientUser of clientUsers) {
      await db.insert(userNotifications).values({
        userId: clientUser.id,
        type: event === "approved" ? "uat_approved" : "uat_changes_requested",
        title,
        message,
        linkUrl: `/dashboard/client/projects/${projectId}/uat`,
      });

      try {
        const clerkUser = await clerk.users.getUser(clientUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name = `${clerkUser.firstName || ""}`.trim() || "there";
        if (email) {
          await sendUatEmail({
            to: email,
            recipientName: name,
            projectName,
            projectId,
            event,
            reviewNotes,
          });
        }
      } catch {
        // Non-fatal
      }
    }
  } catch (err) {
    console.error("Failed to notify clients of UAT review:", err);
  }
}
