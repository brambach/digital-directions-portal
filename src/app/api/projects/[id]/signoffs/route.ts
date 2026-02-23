import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, signoffs, users, userNotifications } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { sendBuildSpecPublishedEmail, sendBuildSpecSignedEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// GET /api/projects/[id]/signoffs?type=build_spec
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;
  const { searchParams } = new URL(req.url);
  const type = (searchParams.get("type") as "build_spec" | "uat" | "go_live") || "build_spec";

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === "client" && project.clientId !== user.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [signoff] = await db
    .select()
    .from(signoffs)
    .where(and(eq(signoffs.projectId, projectId), eq(signoffs.type, type)))
    .limit(1);

  return NextResponse.json(signoff ?? null);
}

// POST /api/projects/[id]/signoffs
// Admin creates/publishes a build spec for the client to sign
export async function POST(
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

  const body = await req.json();
  const { type = "build_spec", documentSnapshot } = body;

  if (!documentSnapshot?.trim()) {
    return NextResponse.json({ error: "Document content is required" }, { status: 400 });
  }

  // Check if one already exists — update it if so
  const [existing] = await db
    .select()
    .from(signoffs)
    .where(and(eq(signoffs.projectId, projectId), eq(signoffs.type, type)))
    .limit(1);

  let signoff;
  if (existing) {
    // Only allow updating if not yet signed
    if (existing.signedAt) {
      return NextResponse.json(
        { error: "Cannot update a signoff that has already been signed" },
        { status: 409 }
      );
    }
    [signoff] = await db
      .update(signoffs)
      .set({ documentSnapshot: documentSnapshot.trim() })
      .where(eq(signoffs.id, existing.id))
      .returning();
  } else {
    [signoff] = await db
      .insert(signoffs)
      .values({
        projectId,
        type,
        documentSnapshot: documentSnapshot.trim(),
      })
      .returning();
  }

  // Notify client users that the build spec is ready
  await notifyClientsOfBuildSpec(projectId, project.clientId, project.name);

  return NextResponse.json(signoff, { status: existing ? 200 : 201 });
}

async function notifyClientsOfBuildSpec(
  projectId: string,
  clientId: string,
  projectName: string
) {
  try {
    const clientUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.clientId, clientId), isNull(users.deletedAt)));

    const clerk = await clerkClient();

    for (const clientUser of clientUsers) {
      await db.insert(userNotifications).values({
        userId: clientUser.id,
        type: "build_spec_ready",
        title: "Build Spec Ready for Sign-Off",
        message: `Your build specification for "${projectName}" is ready for your review and sign-off.`,
        linkUrl: `/dashboard/client/projects/${projectId}/build`,
      });

      try {
        const clerkUser = await clerk.users.getUser(clientUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name = `${clerkUser.firstName || ""}`.trim() || "there";
        if (email) {
          await sendBuildSpecPublishedEmail({
            to: email,
            recipientName: name,
            projectName,
            projectId,
          });
        }
      } catch {
        // Non-fatal
      }
    }
  } catch (err) {
    console.error("Failed to notify clients of build spec:", err);
  }
}
