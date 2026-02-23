import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projects, releaseNotes, users, clients, userNotifications } from "@/lib/db/schema";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { sendBuildReleaseNoteEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// GET /api/projects/[id]/release-notes
// Returns published notes for clients, all notes for admins
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;

  // Verify access
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .limit(1);

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (user.role === "client" && project.clientId !== user.clientId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Admins see all notes; clients see only published
  const whereClause =
    user.role === "admin"
      ? eq(releaseNotes.projectId, projectId)
      : and(eq(releaseNotes.projectId, projectId), isNotNull(releaseNotes.publishedAt));

  const notes = await db
    .select()
    .from(releaseNotes)
    .where(whereClause)
    .orderBy(desc(releaseNotes.createdAt));

  return NextResponse.json(notes);
}

// POST /api/projects/[id]/release-notes
// Admin creates a release note (optionally linked to a phase)
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
  const { title, content, phaseId, publish } = body;

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  const now = new Date();
  const [note] = await db
    .insert(releaseNotes)
    .values({
      projectId,
      phaseId: phaseId || null,
      title: title.trim(),
      content: content.trim(),
      publishedAt: publish ? now : null,
      publishedBy: publish ? user.id : null,
    })
    .returning();

  // If publishing immediately, notify client users
  if (publish) {
    await notifyClientsOfReleaseNote(projectId, project.clientId, note.id, note.title, user.id);
  }

  return NextResponse.json(note, { status: 201 });
}

// Helper: notify all client users of a new published release note
async function notifyClientsOfReleaseNote(
  projectId: string,
  clientId: string,
  noteId: string,
  noteTitle: string,
  adminUserId: string
) {
  try {
    const clientUsers = await db
      .select()
      .from(users)
      .where(and(eq(users.clientId, clientId), isNull(users.deletedAt)));

    const clerk = await clerkClient();

    for (const clientUser of clientUsers) {
      // In-app notification
      await db.insert(userNotifications).values({
        userId: clientUser.id,
        type: "release_note",
        title: "New Release Note",
        message: noteTitle,
        linkUrl: `/dashboard/client/projects/${projectId}/build`,
      });

      // Email notification
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
