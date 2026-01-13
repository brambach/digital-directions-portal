import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { tickets, users, clients, projects, ticketComments } from "@/lib/db/schema";
import { eq, and, isNull, desc, or } from "drizzle-orm";

export async function GET(
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

    // Fetch ticket with related data
    const ticket = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        description: tickets.description,
        type: tickets.type,
        status: tickets.status,
        priority: tickets.priority,
        clientId: tickets.clientId,
        projectId: tickets.projectId,
        createdBy: tickets.createdBy,
        assignedTo: tickets.assignedTo,
        assignedAt: tickets.assignedAt,
        resolvedAt: tickets.resolvedAt,
        resolvedBy: tickets.resolvedBy,
        resolution: tickets.resolution,
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        clientName: clients.companyName,
        projectName: projects.name,
      })
      .from(tickets)
      .leftJoin(clients, eq(tickets.clientId, clients.id))
      .leftJoin(projects, eq(tickets.projectId, projects.id))
      .where(and(eq(tickets.id, id), isNull(tickets.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // For clients, verify they own this ticket
    if (user.role === "client" && ticket.clientId !== user.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch ticket comments
    const commentsQuery = db
      .select({
        id: ticketComments.id,
        content: ticketComments.content,
        isInternal: ticketComments.isInternal,
        authorId: ticketComments.authorId,
        createdAt: ticketComments.createdAt,
      })
      .from(ticketComments)
      .where(and(eq(ticketComments.ticketId, id), isNull(ticketComments.deletedAt)))
      .orderBy(desc(ticketComments.createdAt));

    // For clients, exclude internal comments
    const comments = user.role === "client"
      ? await commentsQuery.where(
          and(
            eq(ticketComments.ticketId, id),
            isNull(ticketComments.deletedAt),
            eq(ticketComments.isInternal, false)
          )
        )
      : await commentsQuery;

    // Fetch Clerk user info for all related users
    const userIds = [
      ticket.createdBy,
      ticket.assignedTo,
      ticket.resolvedBy,
      ...comments.map((c) => c.authorId),
    ].filter(Boolean) as string[];

    const uniqueUserIds = [...new Set(userIds)];

    // Get DB user clerkIds
    const dbUsers = uniqueUserIds.length > 0
      ? await db
          .select({ id: users.id, clerkId: users.clerkId, role: users.role })
          .from(users)
          .where(or(...uniqueUserIds.map((uid) => eq(users.id, uid))))
      : [];

    const dbUserMap = new Map(dbUsers.map((u) => [u.id, { clerkId: u.clerkId, role: u.role }]));

    // Fetch Clerk users
    const clerk = await clerkClient();
    const clerkIds = [...new Set(dbUsers.map((u) => u.clerkId).filter(Boolean))];
    const clerkUsers = clerkIds.length > 0
      ? await Promise.all(clerkIds.map(async (cid) => {
          try {
            return await clerk.users.getUser(cid);
          } catch {
            return null;
          }
        }))
      : [];

    const clerkUserMap = new Map(
      clerkUsers
        .filter((u): u is NonNullable<typeof u> => u !== null)
        .map((u) => [u.id, u])
    );

    const getUserInfo = (userId: string | null) => {
      if (!userId) return null;
      const dbUser = dbUserMap.get(userId);
      if (!dbUser) return { name: "User", avatar: null, role: null };
      const clerkUser = dbUser.clerkId ? clerkUserMap.get(dbUser.clerkId) : null;
      return {
        name: clerkUser
          ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User"
          : "User",
        avatar: clerkUser?.imageUrl || null,
        role: dbUser.role,
      };
    };

    // Enrich ticket data
    const enrichedTicket = {
      ...ticket,
      creator: getUserInfo(ticket.createdBy),
      assignee: getUserInfo(ticket.assignedTo),
      resolver: getUserInfo(ticket.resolvedBy),
      comments: comments.map((comment) => ({
        ...comment,
        author: getUserInfo(comment.authorId),
      })),
    };

    return NextResponse.json(enrichedTicket);
  } catch (error) {
    console.error("Error fetching ticket:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
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

    // Only admins can update tickets (clients can only add comments)
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, type, priority, status } = body;

    // Update the ticket
    const updatedTicket = await db
      .update(tickets)
      .set({
        ...(title && { title }),
        ...(description && { description }),
        ...(type && { type }),
        ...(priority && { priority }),
        ...(status && { status }),
        updatedAt: new Date(),
      })
      .where(and(eq(tickets.id, id), isNull(tickets.deletedAt)))
      .returning();

    if (updatedTicket.length === 0) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json(updatedTicket[0]);
  } catch (error) {
    console.error("Error updating ticket:", error);
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

    // Only admins can delete tickets
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Soft delete the ticket
    const deletedTicket = await db
      .update(tickets)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(tickets.id, id), isNull(tickets.deletedAt)))
      .returning();

    if (deletedTicket.length === 0) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ticket:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
