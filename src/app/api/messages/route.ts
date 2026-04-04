import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { messages, users, projects } from "@/lib/db/schema";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { notifyEvent } from "@/lib/notify";

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
    const projectId = searchParams.get("projectId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!projectId) {
      return NextResponse.json(
        { error: "Missing required parameter: projectId" },
        { status: 400 }
      );
    }

    // Verify user has access to this project
    const project = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // For clients, verify they belong to the project's client
    if (user.role === "client" && user.clientId !== project.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch messages with sender info
    const projectMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        read: messages.read,
        createdAt: messages.createdAt,
        senderId: messages.senderId,
        senderClerkId: users.clerkId,
        senderRole: users.role,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(and(eq(messages.projectId, projectId), isNull(messages.deletedAt)))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.projectId, projectId), isNull(messages.deletedAt)));
    const total = totalResult[0]?.count || 0;

    // Fetch Clerk user info for all senders
    const clerkIds = [...new Set(projectMessages.map((m) => m.senderClerkId).filter(Boolean))] as string[];
    const clerk = await clerkClient();

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

    // Enrich messages with sender names
    const enrichedMessages = projectMessages.map((message) => {
      const clerkUser = message.senderClerkId ? clerkUserMap.get(message.senderClerkId) : null;
      const senderName = clerkUser
        ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User"
        : "User";
      const senderAvatar = clerkUser?.imageUrl || null;

      return {
        id: message.id,
        content: message.content,
        read: message.read,
        createdAt: message.createdAt,
        senderId: message.senderId,
        senderName,
        senderAvatar,
        senderRole: message.senderRole,
      };
    });

    return NextResponse.json({
      messages: enrichedMessages,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
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
    const { content, projectId } = body;

    // Validate required fields
    if (!content || !projectId) {
      return NextResponse.json(
        { error: "Missing required fields: content, projectId" },
        { status: 400 }
      );
    }

    // Create new message
    const newMessage = await db
      .insert(messages)
      .values({
        content,
        projectId,
        senderId: user.id,
        read: false,
      })
      .returning();

    // Get project and client info for notifications
    const project = await db
      .select({
        name: projects.name,
        clientId: projects.clientId,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)
      .then((rows) => rows[0]);

    if (project) {
      // Get sender name from Clerk
      let senderName = user.role === "client" ? "Client" : "Digital Directions";
      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(userId);
        senderName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || senderName;
      } catch {
        // Keep default name
      }

      if (user.role === "client") {
        notifyEvent({
          event: "client_message_sent",
          projectId,
          projectName: project.name,
          clientId: project.clientId,
          senderName,
          messagePreview: content,
        });
      } else {
        notifyEvent({
          event: "admin_message_sent",
          projectId,
          projectName: project.name,
          clientId: project.clientId,
          senderName,
          messagePreview: content,
        });
      }
    }

    return NextResponse.json(newMessage[0], { status: 201 });
  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
