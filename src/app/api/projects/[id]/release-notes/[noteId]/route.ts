import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, releaseNotes, users, userNotifications } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { sendBuildReleaseNoteEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// PUT /api/projects/[id]/release-notes/[noteId]
// Admin edits or publishes a release note
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId, noteId } = await params;

  const [existing] = await db
    .select()
    .from(releaseNotes)
    .where(and(eq(releaseNotes.id, noteId), eq(releaseNotes.projectId, projectId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { title, content, phaseId, publish } = body;

  if (title !== undefined && !title?.trim()) {
    return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
  }

  const wasPublished = !!existing.publishedAt;
  const now = new Date();

  const [updated] = await db
    .update(releaseNotes)
    .set({
      ...(title !== undefined && { title: title.trim() }),
      ...(content !== undefined && { content: content.trim() }),
      ...(phaseId !== undefined && { phaseId: phaseId || null }),
      // Only set publishedAt if publishing for the first time
      ...(!wasPublished && publish && { publishedAt: now, publishedBy: user.id }),
      updatedAt: now,
    })
    .where(eq(releaseNotes.id, noteId))
    .returning();

  // If newly published, notify clients
  if (!wasPublished && publish) {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (project) {
      await notifyClientsOfReleaseNote(
        projectId,
        project.clientId,
        updated.id,
        updated.title
      );
    }
  }

  return NextResponse.json(updated);
}

// DELETE /api/projects/[id]/release-notes/[noteId]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: projectId, noteId } = await params;

  const [existing] = await db
    .select()
    .from(releaseNotes)
    .where(and(eq(releaseNotes.id, noteId), eq(releaseNotes.projectId, projectId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(releaseNotes).where(eq(releaseNotes.id, noteId));

  return NextResponse.json({ success: true });
}

async function notifyClientsOfReleaseNote(
  projectId: string,
  clientId: string,
  noteId: string,
  noteTitle: string
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
        type: "release_note",
        title: "New Release Note",
        message: noteTitle,
        linkUrl: `/dashboard/client/projects/${projectId}/build`,
      });

      try {
        const clerkUser = await clerk.users.getUser(clientUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name = `${clerkUser.firstName || ""}`.trim() || "there";
        if (email) {
          const [proj] = await db
            .select({ name: projects.name })
            .from(projects)
            .where(eq(projects.id, projectId))
            .limit(1);
          await sendBuildReleaseNoteEmail({
            to: email,
            recipientName: name,
            projectName: proj?.name ?? "your project",
            projectId,
            noteTitle,
          });
        }
      } catch {
        // Non-fatal
      }
    }
  } catch (err) {
    console.error("Failed to notify clients of release note:", err);
  }
}
