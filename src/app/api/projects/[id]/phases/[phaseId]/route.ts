import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { projectPhases, projects, users, userNotifications } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { sendPhaseCompletedEmail } from "@/lib/email";
import { clerkClient } from "@clerk/nextjs/server";

// PUT /api/projects/[id]/phases/[phaseId] - Update a phase (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, phaseId } = await params;

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, status, startedAt, completedAt, notes } = body;

    // Validate status if provided
    const validStatuses = ["pending", "in_progress", "completed", "skipped"];
    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid phase status" },
        { status: 400 }
      );
    }

    // Validate name length if provided
    if (name !== undefined && (typeof name !== "string" || name.length > 255)) {
      return NextResponse.json(
        { error: "Phase name must be a string with max 255 characters" },
        { status: 400 }
      );
    }

    // Validate notes length if provided
    if (notes !== undefined && notes !== null && typeof notes === "string" && notes.length > 2000) {
      return NextResponse.json(
        { error: "Phase notes must be less than 2000 characters" },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify phase exists
    const phase = await db
      .select()
      .from(projectPhases)
      .where(and(eq(projectPhases.id, phaseId), eq(projectPhases.projectId, id)))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      // Auto-set timestamps based on status
      if (status === "in_progress" && !phase.startedAt) {
        updateData.startedAt = new Date();
      }
      if (status === "completed" && !phase.completedAt) {
        updateData.completedAt = new Date();
      }
    }
    if (startedAt !== undefined)
      updateData.startedAt = startedAt ? new Date(startedAt) : null;
    if (completedAt !== undefined)
      updateData.completedAt = completedAt ? new Date(completedAt) : null;
    if (notes !== undefined) updateData.notes = notes;

    // Update phase
    await db
      .update(projectPhases)
      .set(updateData)
      .where(eq(projectPhases.id, phaseId));

    // If this phase is now in_progress or completed, update project's currentPhaseId
    if (status === "in_progress") {
      await db
        .update(projects)
        .set({ currentPhaseId: phaseId, updatedAt: new Date() })
        .where(eq(projects.id, id));
    }

    // Fetch updated phase
    const updatedPhase = await db
      .select()
      .from(projectPhases)
      .where(eq(projectPhases.id, phaseId))
      .limit(1)
      .then((rows) => rows[0]);

    // Notify clients when a phase is newly completed
    const wasAlreadyCompleted = phase.status === "completed";
    if (status === "completed" && !wasAlreadyCompleted) {
      notifyClientsPhaseCompleted(id, project.clientId, project.name, phase.name).catch(
        (err) => console.error("Phase notification failed:", err)
      );
    }

    return NextResponse.json(updatedPhase);
  } catch (error: any) {
    console.error("Error updating phase:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper: notify client users when a phase is marked complete
async function notifyClientsPhaseCompleted(
  projectId: string,
  clientId: string,
  projectName: string,
  phaseName: string
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
        type: "phase_completed",
        title: "Build Phase Completed",
        message: `"${phaseName}" phase has been completed on ${projectName}.`,
        linkUrl: `/dashboard/client/projects/${projectId}/build`,
      });

      // Email notification
      try {
        const clerkUser = await clerk.users.getUser(clientUser.clerkId);
        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name = `${clerkUser.firstName || ""}`.trim() || "there";
        if (email) {
          await sendPhaseCompletedEmail({
            to: email,
            recipientName: name,
            projectName,
            projectId,
            phaseName,
          });
        }
      } catch {
        // Non-fatal
      }
    }
  } catch (err) {
    console.error("Failed to notify clients of phase completion:", err);
  }
}

// DELETE /api/projects/[id]/phases/[phaseId] - Delete a phase (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; phaseId: string }> }
) {
  try {
    const user = await requireAuth();
    const { id, phaseId } = await params;

    if (user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Verify project exists
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify phase exists
    const phase = await db
      .select()
      .from(projectPhases)
      .where(and(eq(projectPhases.id, phaseId), eq(projectPhases.projectId, id)))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!phase) {
      return NextResponse.json({ error: "Phase not found" }, { status: 404 });
    }

    // Delete phase
    await db.delete(projectPhases).where(eq(projectPhases.id, phaseId));

    // If this was the current phase, clear it
    if (project.currentPhaseId === phaseId) {
      await db
        .update(projects)
        .set({ currentPhaseId: null, updatedAt: new Date() })
        .where(eq(projects.id, id));
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting phase:", error);

    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
