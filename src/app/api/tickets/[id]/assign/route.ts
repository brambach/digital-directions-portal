import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { tickets, users, clients, projects } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notifyTicketAssigned } from "@/lib/slack";
import {
  isFreshdeskConfigured,
  addNote as fdAddNote,
} from "@/lib/freshdesk";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the user from DB
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admins can assign tickets
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    // If assignedTo is not provided, assign to current user (claim)
    const assignedTo = body.assignedTo || user.id;

    // Verify the assignee is an admin
    if (assignedTo !== user.id) {
      const assignee = await db
        .select()
        .from(users)
        .where(eq(users.id, assignedTo))
        .limit(1)
        .then((rows) => rows[0]);

      if (!assignee || assignee.role !== "admin") {
        return NextResponse.json(
          { error: "Can only assign tickets to admin users" },
          { status: 400 }
        );
      }
    }

    // Get the ticket first to get client/project info
    const existingTicket = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        clientId: tickets.clientId,
        projectId: tickets.projectId,
        freshdeskId: tickets.freshdeskId,
      })
      .from(tickets)
      .where(and(eq(tickets.id, id), isNull(tickets.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Update the ticket
    const updatedTicket = await db
      .update(tickets)
      .set({
        assignedTo,
        assignedAt: new Date(),
        status: "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, id))
      .returning();

    // Get assignee name from Clerk
    const assigneeUser = await db
      .select({ clerkId: users.clerkId })
      .from(users)
      .where(eq(users.id, assignedTo))
      .limit(1)
      .then((rows) => rows[0]);

    let assigneeName = "Team Member";
    if (assigneeUser?.clerkId) {
      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(assigneeUser.clerkId);
        assigneeName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Team Member";
      } catch {
        // Keep default name
      }
    }

    // Get client and project names
    const client = await db
      .select({ companyName: clients.companyName })
      .from(clients)
      .where(eq(clients.id, existingTicket.clientId))
      .limit(1)
      .then((rows) => rows[0]);

    let projectName: string | undefined;
    if (existingTicket.projectId) {
      const project = await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, existingTicket.projectId))
        .limit(1)
        .then((rows) => rows[0]);
      projectName = project?.name;
    }

    // Send Slack notification
    notifyTicketAssigned({
      ticketTitle: existingTicket.title,
      ticketId: existingTicket.id,
      clientName: client?.companyName || "Unknown Client",
      projectName,
      assigneeName,
    }).catch((err) => console.error("Slack notification failed:", err));

    // Add assignment note to Freshdesk (fire and forget)
    if (isFreshdeskConfigured() && existingTicket.freshdeskId) {
      fdAddNote({
        freshdeskId: parseInt(existingTicket.freshdeskId),
        body: `<p>Ticket assigned to <strong>${assigneeName}</strong> in the DD Portal.</p>`,
        private: true,
      }).catch((err) => console.error("Failed to add assignment note to Freshdesk:", err));
    }

    return NextResponse.json(updatedTicket[0]);
  } catch (error) {
    console.error("Error assigning ticket:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get the user from DB
    const user = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Only admins can unclaim tickets
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the ticket first to verify it exists
    const existingTicket = await db
      .select({
        id: tickets.id,
        assignedTo: tickets.assignedTo,
      })
      .from(tickets)
      .where(and(eq(tickets.id, id), isNull(tickets.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingTicket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Verify ticket is currently assigned
    if (!existingTicket.assignedTo) {
      return NextResponse.json(
        { error: "Ticket is not assigned" },
        { status: 400 }
      );
    }

    // Update the ticket - reset assignment and set status back to open
    const updatedTicket = await db
      .update(tickets)
      .set({
        assignedTo: null,
        assignedAt: null,
        status: "open",
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, id))
      .returning();

    return NextResponse.json(updatedTicket[0]);
  } catch (error) {
    console.error("Error unclaiming ticket:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
