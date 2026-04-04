import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, uatResults } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { notifyEvent } from "@/lib/notify";

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

  // Count pass/fail/na from results
  const resultValues = Object.values(results) as Array<{ result: string }>;
  const passedCount = resultValues.filter((r) => r.result === "passed").length;
  const failedCount = resultValues.filter((r) => r.result === "failed").length;
  const naCount = resultValues.filter((r) => r.result === "na").length;

  // Notify admins (fire-and-forget)
  notifyEvent({
    event: "uat_submitted",
    projectId,
    projectName: project.name,
    clientId: project.clientId!,
    passed: passedCount,
    failed: failedCount,
    na: naCount,
  });

  return NextResponse.json(updated);
}
