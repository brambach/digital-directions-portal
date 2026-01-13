import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { tickets, users, clients } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notifyTicketResolved } from "@/lib/slack";
import { sendTicketResolvedEmail } from "@/lib/email";

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

    // Only admins can resolve tickets
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { resolution, closeTicket } = body;

    if (!resolution) {
      return NextResponse.json(
        { error: "Resolution summary is required" },
        { status: 400 }
      );
    }

    // Get the ticket first
    const existingTicket = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        clientId: tickets.clientId,
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
        status: closeTicket ? "closed" : "resolved",
        resolvedAt: new Date(),
        resolvedBy: user.id,
        resolution,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, id))
      .returning();

    // Get resolver name from Clerk
    let resolverName = "Team Member";
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      resolverName = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Team Member";
    } catch {
      // Keep default name
    }

    // Get client info
    const client = await db
      .select({
        companyName: clients.companyName,
        contactName: clients.contactName,
        contactEmail: clients.contactEmail,
      })
      .from(clients)
      .where(eq(clients.id, existingTicket.clientId))
      .limit(1)
      .then((rows) => rows[0]);

    // Send Slack notification
    notifyTicketResolved({
      ticketTitle: existingTicket.title,
      ticketId: existingTicket.id,
      clientName: client?.companyName || "Unknown Client",
      resolverName,
    }).catch((err) => console.error("Slack notification failed:", err));

    // Send email notification to client
    if (client?.contactEmail) {
      sendTicketResolvedEmail({
        to: client.contactEmail,
        recipientName: client.contactName,
        ticketTitle: existingTicket.title,
        ticketId: existingTicket.id,
        resolution,
      }).catch((err) => console.error("Email notification failed:", err));
    }

    return NextResponse.json(updatedTicket[0]);
  } catch (error) {
    console.error("Error resolving ticket:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
