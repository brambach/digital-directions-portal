import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { tickets, ticketComments, users, clients } from "@/lib/db/schema";
import { eq, and, isNull, desc, or } from "drizzle-orm";
import { sendTicketResponseEmail } from "@/lib/email";
import { notifyTicketResponse } from "@/lib/notifications";
import {
  isFreshdeskConfigured,
  addNote as fdAddNote,
  addReply as fdAddReply,
} from "@/lib/freshdesk";

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

    // Verify ticket exists and user has access
    const ticket = await db
      .select()
      .from(tickets)
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

    // Build query conditions
    const conditions = [eq(ticketComments.ticketId, id), isNull(ticketComments.deletedAt)];

    // For clients, exclude internal comments
    if (user.role === "client") {
      conditions.push(eq(ticketComments.isInternal, false));
    }

    // Fetch comments
    const comments = await db
      .select({
        id: ticketComments.id,
        content: ticketComments.content,
        isInternal: ticketComments.isInternal,
        authorId: ticketComments.authorId,
        createdAt: ticketComments.createdAt,
      })
      .from(ticketComments)
      .where(and(...conditions))
      .orderBy(desc(ticketComments.createdAt));

    // Fetch Clerk user info for authors
    const authorIds = [...new Set(comments.map((c) => c.authorId).filter(Boolean))] as string[];

    // Get DB user clerkIds
    const dbUsers = authorIds.length > 0
      ? await db
          .select({ id: users.id, clerkId: users.clerkId, role: users.role })
          .from(users)
          .where(or(...authorIds.map((aid) => eq(users.id, aid))))
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

    // Enrich comments with author info
    const enrichedComments = comments.map((comment) => {
      const dbUser = comment.authorId ? dbUserMap.get(comment.authorId) : null;
      const clerkUser = dbUser?.clerkId ? clerkUserMap.get(dbUser.clerkId) : null;

      return {
        ...comment,
        author: {
          name: clerkUser
            ? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User"
            : "User",
          avatar: clerkUser?.imageUrl || null,
          role: dbUser?.role || null,
        },
      };
    });

    return NextResponse.json(enrichedComments);
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

    // Verify ticket exists and user has access
    const ticket = await db
      .select({
        id: tickets.id,
        clientId: tickets.clientId,
        status: tickets.status,
        title: tickets.title,
        freshdeskId: tickets.freshdeskId,
      })
      .from(tickets)
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

    const body = await req.json();
    const { content, isInternal } = body;

    if (!content) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 }
      );
    }

    // Clients can't create internal comments
    const internal = user.role === "admin" ? (isInternal || false) : false;

    // Create the comment
    const newComment = await db
      .insert(ticketComments)
      .values({
        ticketId: id,
        authorId: user.id,
        content,
        isInternal: internal,
      })
      .returning();

    // Sync comment to Freshdesk (fire and forget)
    if (isFreshdeskConfigured() && ticket.freshdeskId) {
      const fdId = parseInt(ticket.freshdeskId);
      const htmlBody = `<p>${content.replace(/\n/g, "<br/>")}</p>`;

      if (user.role === "admin") {
        if (internal) {
          // Internal note — private in Freshdesk
          fdAddNote({ freshdeskId: fdId, body: htmlBody, private: true }).catch(
            (err) => console.error("Failed to sync internal note to Freshdesk:", err)
          );
        } else {
          // Public reply from admin — use reply endpoint so requester sees it
          fdAddReply({ freshdeskId: fdId, body: htmlBody }).catch(
            (err) => console.error("Failed to sync reply to Freshdesk:", err)
          );
        }
      } else {
        // Client comment — add as public note (appears in Freshdesk conversation)
        fdAddNote({ freshdeskId: fdId, body: htmlBody, private: false }).catch(
          (err) => console.error("Failed to sync client comment to Freshdesk:", err)
        );
      }
    }

    // Update ticket status if client responded
    if (user.role === "client" && ticket.status === "waiting_on_client") {
      await db
        .update(tickets)
        .set({
          status: "in_progress",
          updatedAt: new Date(),
        })
        .where(eq(tickets.id, id));
    }

    // Update ticket updatedAt
    await db
      .update(tickets)
      .set({ updatedAt: new Date() })
      .where(eq(tickets.id, id));

    // Send email and in-app notification when admin responds (not internal notes)
    if (user.role === "admin" && !internal) {
      // Get responder name from Clerk
      let responderName = "Digital Directions Team";
      try {
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(userId);
        responderName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Digital Directions Team";
      } catch {
        // Keep default name
      }

      // Get client info for email
      const client = await db
        .select({
          contactName: clients.contactName,
          contactEmail: clients.contactEmail,
        })
        .from(clients)
        .where(eq(clients.id, ticket.clientId))
        .limit(1)
        .then((rows) => rows[0]);

      // Send email notification
      if (client?.contactEmail) {
        sendTicketResponseEmail({
          to: client.contactEmail,
          recipientName: client.contactName,
          ticketTitle: ticket.title,
          ticketId: id,
          responderName,
          responsePreview: content,
        }).catch((err) => console.error("Email notification failed:", err));
      }

      // Create in-app notification for client users
      notifyTicketResponse({
        ticketId: id,
        ticketTitle: ticket.title,
        clientId: ticket.clientId,
        responderName,
        responsePreview: content,
      }).catch((err) => console.error("In-app notification failed:", err));
    }

    return NextResponse.json(newComment[0], { status: 201 });
  } catch (error) {
    console.error("Error creating comment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
