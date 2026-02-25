import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tickets, ticketComments, users, clients } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { fromFreshdeskStatus, fromFreshdeskPriority } from "@/lib/freshdesk";
import {
  notifyTicketResponse,
  getClientUserIds,
  createNotificationsForUsers,
} from "@/lib/notifications";
import { sendTicketResponseEmail } from "@/lib/email";

/**
 * Freshdesk webhook handler
 *
 * Receives events from Freshdesk when a DD team member acts on a ticket
 * in the Freshdesk UI. Syncs changes back to the portal DB and notifies
 * the client.
 *
 * Webhook URL: POST /api/webhooks/freshdesk
 * Security: FRESHDESK_WEBHOOK_SECRET header check
 *
 * Freshdesk webhook payload format (custom webhook rule):
 * The payload is configurable in Freshdesk. We expect:
 * {
 *   "freshdesk_webhook": {
 *     "ticket_id": number,
 *     "ticket_subject": string,
 *     "ticket_status": string (e.g. "Open", "Pending", "Resolved", "Closed"),
 *     "ticket_priority": string (e.g. "Low", "Medium", "High", "Urgent"),
 *     "triggered_event": string (e.g. "ticket_updated", "note_added", "reply_sent"),
 *     "latest_public_comment": string | null,
 *     "agent_name": string | null,
 *   }
 * }
 */

interface FreshdeskWebhookPayload {
  freshdesk_webhook: {
    ticket_id: number;
    ticket_subject?: string;
    ticket_status?: string;
    ticket_priority?: string;
    triggered_event?: string;
    latest_public_comment?: string;
    agent_name?: string;
  };
}

// Map Freshdesk status names to their numeric codes
const STATUS_NAME_MAP: Record<string, number> = {
  Open: 2,
  Pending: 3,
  Resolved: 4,
  Closed: 5,
};

const PRIORITY_NAME_MAP: Record<string, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Urgent: 4,
};

export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret
    const webhookSecret = process.env.FRESHDESK_WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = req.headers.get("authorization");
      const providedSecret =
        req.headers.get("x-freshdesk-webhook-secret") ||
        (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null);

      if (providedSecret !== webhookSecret) {
        console.error("Freshdesk webhook: invalid secret");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = (await req.json()) as FreshdeskWebhookPayload;
    const webhook = body.freshdesk_webhook;

    if (!webhook?.ticket_id) {
      return NextResponse.json({ error: "Missing ticket_id" }, { status: 400 });
    }

    const freshdeskId = String(webhook.ticket_id);

    // Find the portal ticket by freshdeskId
    const ticket = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        status: tickets.status,
        clientId: tickets.clientId,
      })
      .from(tickets)
      .where(and(eq(tickets.freshdeskId, freshdeskId), isNull(tickets.deletedAt)))
      .limit(1)
      .then((rows) => rows[0]);

    if (!ticket) {
      // Ticket not found — could be created directly in Freshdesk (not via portal)
      console.warn(`Freshdesk webhook: no portal ticket for freshdeskId=${freshdeskId}`);
      return NextResponse.json({ ok: true, skipped: true });
    }

    const event = webhook.triggered_event || "ticket_updated";
    const agentName = webhook.agent_name || "Digital Directions Team";

    // Handle status/priority changes
    if (event === "ticket_updated" || !event) {
      const updates: Record<string, unknown> = { updatedAt: new Date() };

      if (webhook.ticket_status) {
        const statusCode = STATUS_NAME_MAP[webhook.ticket_status];
        if (statusCode) {
          const portalStatus = fromFreshdeskStatus(statusCode);
          updates.status = portalStatus;
        }
      }

      if (webhook.ticket_priority) {
        const priorityCode = PRIORITY_NAME_MAP[webhook.ticket_priority];
        if (priorityCode) {
          updates.priority = fromFreshdeskPriority(priorityCode);
        }
      }

      await db.update(tickets).set(updates).where(eq(tickets.id, ticket.id));
    }

    // Handle reply/note — sync as a comment in the portal
    if (
      (event === "reply_sent" || event === "note_added") &&
      webhook.latest_public_comment
    ) {
      // Find a DD admin user to attribute the comment to (use first admin)
      const adminUser = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "admin"), isNull(users.deletedAt)))
        .limit(1)
        .then((rows) => rows[0]);

      if (adminUser) {
        // Insert the comment (strip HTML if present, store as plain text)
        const plainContent = webhook.latest_public_comment
          .replace(/<[^>]+>/g, "")
          .trim();

        if (plainContent) {
          await db.insert(ticketComments).values({
            ticketId: ticket.id,
            authorId: adminUser.id,
            content: plainContent,
            isInternal: event === "note_added" ? false : false, // Public comments from Freshdesk
          });

          // Update ticket timestamp
          await db
            .update(tickets)
            .set({ updatedAt: new Date() })
            .where(eq(tickets.id, ticket.id));

          // Notify client users about the response
          notifyTicketResponse({
            ticketId: ticket.id,
            ticketTitle: ticket.title,
            clientId: ticket.clientId,
            responderName: agentName,
            responsePreview: plainContent,
          }).catch((err) =>
            console.error("Freshdesk webhook notification failed:", err)
          );

          // Send email to client contact
          const client = await db
            .select({
              contactName: clients.contactName,
              contactEmail: clients.contactEmail,
            })
            .from(clients)
            .where(eq(clients.id, ticket.clientId))
            .limit(1)
            .then((rows) => rows[0]);

          if (client?.contactEmail) {
            sendTicketResponseEmail({
              to: client.contactEmail,
              recipientName: client.contactName,
              ticketTitle: ticket.title,
              ticketId: ticket.id,
              responderName: agentName,
              responsePreview: plainContent,
            }).catch((err) =>
              console.error("Freshdesk webhook email failed:", err)
            );
          }
        }
      }
    }

    // Handle status change notifications to client
    if (event === "ticket_updated" && webhook.ticket_status) {
      const statusCode = STATUS_NAME_MAP[webhook.ticket_status];
      if (statusCode) {
        const portalStatus = fromFreshdeskStatus(statusCode);
        // Only notify for meaningful status changes
        if (
          portalStatus !== ticket.status &&
          (portalStatus === "resolved" || portalStatus === "closed")
        ) {
          const clientUserIds = await getClientUserIds(ticket.clientId);
          await createNotificationsForUsers({
            userIds: clientUserIds,
            type: "ticket_response",
            title: `Ticket ${portalStatus}`,
            message: `Your ticket "${ticket.title}" has been ${portalStatus} by ${agentName}.`,
            linkUrl: `/dashboard/client/tickets/${ticket.id}`,
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Freshdesk webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
