import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, users, clients } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notifyStatusChanged } from "@/lib/slack";
import { sendStatusUpdateEmail } from "@/lib/email";
import { notifyProjectStatusChange } from "@/lib/notifications";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user from DB to verify they're an admin
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user || user.role === "client") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, status, startDate, dueDate, assignedSpecialists } = body;

    // Get current project to track status changes
    const existingProject = await db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        clientId: projects.clientId,
      })
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const oldStatus = existingProject.status;

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignedSpecialists !== undefined) {
      updateData.assignedSpecialists = Array.isArray(assignedSpecialists) && assignedSpecialists.length > 0
        ? JSON.stringify(assignedSpecialists)
        : null;
    }

    const updatedProject = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning();

    // Send notifications if status changed
    if (status && status !== oldStatus) {
      const client = await db
        .select({
          companyName: clients.companyName,
          contactName: clients.contactName,
          contactEmail: clients.contactEmail,
        })
        .from(clients)
        .where(eq(clients.id, existingProject.clientId))
        .limit(1)
        .then((rows) => rows[0]);

      // Slack notification
      notifyStatusChanged({
        projectId: id,
        projectName: name || existingProject.name,
        clientName: client?.companyName || "Unknown Client",
        oldStatus,
        newStatus: status,
      }).catch((err) => console.error("Slack notification failed:", err));

      // Email notification to client
      if (client?.contactEmail) {
        sendStatusUpdateEmail({
          to: client.contactEmail,
          recipientName: client.contactName,
          projectName: name || existingProject.name,
          projectId: id,
          oldStatus,
          newStatus: status,
        }).catch((err) => console.error("Email notification failed:", err));
      }

      // In-app notification to client users
      notifyProjectStatusChange({
        projectId: id,
        projectName: name || existingProject.name,
        clientId: existingProject.clientId,
        oldStatus,
        newStatus: status,
      }).catch((err) => console.error("In-app notification failed:", err));
    }

    return NextResponse.json(updatedProject[0], { status: 200 });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
