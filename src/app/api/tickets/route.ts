import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { tickets, users, clients, projects } from "@/lib/db/schema";
import { eq, and, isNull, desc, sql, or } from "drizzle-orm";
import { notifyTicketCreated } from "@/lib/slack";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const projectId = searchParams.get("projectId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query conditions
    const conditions = [isNull(tickets.deletedAt)];

    // For clients, only show their tickets
    if (user.role === "client") {
      conditions.push(eq(tickets.clientId, user.clientId!));
    }

    if (status) {
      conditions.push(eq(tickets.status, status as typeof tickets.status.enumValues[number]));
    }

    if (priority) {
      conditions.push(eq(tickets.priority, priority as typeof tickets.priority.enumValues[number]));
    }

    if (projectId) {
      conditions.push(eq(tickets.projectId, projectId));
    }

    // Fetch tickets with related data
    const ticketList = await db
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
        createdAt: tickets.createdAt,
        updatedAt: tickets.updatedAt,
        clientName: clients.companyName,
        projectName: projects.name,
      })
      .from(tickets)
      .leftJoin(clients, eq(tickets.clientId, clients.id))
      .leftJoin(projects, eq(tickets.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(desc(tickets.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(and(...conditions));
    const total = totalResult[0]?.count || 0;

    // Fetch Clerk user info for creators and assignees
    const userIds = [
      ...new Set([
        ...ticketList.map((t) => t.createdBy),
        ...ticketList.map((t) => t.assignedTo),
      ].filter(Boolean)),
    ] as string[];

    // Get DB user clerkIds
    const dbUsers = userIds.length > 0
      ? await db
          .select({ id: users.id, clerkId: users.clerkId })
          .from(users)
          .where(or(...userIds.map((id) => eq(users.id, id))))
      : [];

    const dbUserMap = new Map(dbUsers.map((u) => [u.id, u.clerkId]));

    // Fetch Clerk users
    const clerk = await clerkClient();
    const clerkIds = [...new Set(dbUsers.map((u) => u.clerkId).filter(Boolean))];
    const clerkUsers = clerkIds.length > 0
      ? await Promise.all(clerkIds.map(async (id) => {
          try {
            return await clerk.users.getUser(id);
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

    // Enrich tickets with user names
    const enrichedTickets = ticketList.map((ticket) => {
      const creatorClerkId = ticket.createdBy ? dbUserMap.get(ticket.createdBy) : null;
      const assigneeClerkId = ticket.assignedTo ? dbUserMap.get(ticket.assignedTo) : null;

      const creatorClerk = creatorClerkId ? clerkUserMap.get(creatorClerkId) : null;
      const assigneeClerk = assigneeClerkId ? clerkUserMap.get(assigneeClerkId) : null;

      return {
        ...ticket,
        creatorName: creatorClerk
          ? `${creatorClerk.firstName || ""} ${creatorClerk.lastName || ""}`.trim() || "User"
          : "User",
        assigneeName: assigneeClerk
          ? `${assigneeClerk.firstName || ""} ${assigneeClerk.lastName || ""}`.trim() || null
          : null,
      };
    });

    return NextResponse.json({
      tickets: enrichedTickets,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const body = await req.json();
    const { title, description, type, priority, projectId } = body;

    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { error: "Missing required fields: title, description" },
        { status: 400 }
      );
    }

    // Determine clientId
    let clientId = user.clientId;

    // If admin is creating a ticket for a project, get clientId from project
    if (user.role === "admin" && projectId) {
      const project = await db
        .select({ clientId: projects.clientId })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      clientId = project.clientId;
    }

    // For admin creating standalone tickets, clientId is required in body
    if (user.role === "admin" && !projectId && body.clientId) {
      clientId = body.clientId;
    }

    if (!clientId) {
      return NextResponse.json(
        { error: "Client ID is required" },
        { status: 400 }
      );
    }

    // Create the ticket
    const newTicket = await db
      .insert(tickets)
      .values({
        title,
        description,
        type: type || "general_support",
        priority: priority || "medium",
        status: "open",
        clientId,
        projectId: projectId || null,
        createdBy: user.id,
      })
      .returning();

    // Fetch client and project names for Slack notification
    const client = await db
      .select({ companyName: clients.companyName })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1)
      .then((rows) => rows[0]);

    let projectName: string | undefined;
    if (projectId) {
      const project = await db
        .select({ name: projects.name })
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)
        .then((rows) => rows[0]);
      projectName = project?.name;
    }

    // Send Slack notification (fire and forget)
    notifyTicketCreated({
      ticketTitle: title,
      ticketId: newTicket[0].id,
      clientName: client?.companyName || "Unknown Client",
      projectName,
      priority: priority || "medium",
      ticketType: type || "general_support",
    }).catch((err) => console.error("Slack notification failed:", err));

    return NextResponse.json(newTicket[0], { status: 201 });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
