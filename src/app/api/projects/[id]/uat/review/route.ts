import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, uatResults, signoffs } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { notifyEvent } from "@/lib/notify";

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

    // Notify client users (fire-and-forget)
    notifyEvent({
      event: "uat_reviewed",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
      action: "approve",
      reviewNotes: reviewNotes || undefined,
    });

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

  // Notify client users (fire-and-forget)
  notifyEvent({
    event: "uat_reviewed",
    projectId,
    projectName: project.name,
    clientId: project.clientId,
    action: "request_changes",
    reviewNotes: reviewNotes || undefined,
  });

  return NextResponse.json(updated);
}
