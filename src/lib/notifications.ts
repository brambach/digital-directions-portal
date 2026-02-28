import { db } from "@/lib/db";
import { userNotifications, users } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";

// Notification types
export type NotificationType =
  | "message"
  | "project_update"
  | "ticket"
  | "ticket_response"
  | "client_added";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
}

/**
 * Create a notification for a single user
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  linkUrl,
}: CreateNotificationParams): Promise<void> {
  try {
    await db.insert(userNotifications).values({
      userId,
      type,
      title,
      message,
      linkUrl: linkUrl || null,
      isRead: false,
    });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationsForUsers({
  userIds,
  type,
  title,
  message,
  linkUrl,
}: Omit<CreateNotificationParams, "userId"> & {
  userIds: string[];
}): Promise<void> {
  if (userIds.length === 0) return;

  try {
    await db.insert(userNotifications).values(
      userIds.map((userId) => ({
        userId,
        type,
        title,
        message,
        linkUrl: linkUrl || null,
        isRead: false,
      }))
    );
  } catch (error) {
    console.error("Failed to create notifications:", error);
  }
}

/**
 * Get all admin user IDs
 */
export async function getAllAdminUserIds(): Promise<string[]> {
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));

  return admins.map((a) => a.id);
}

/**
 * Get all user IDs for a client company
 */
export async function getClientUserIds(clientId: string): Promise<string[]> {
  const clientUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.clientId, clientId), isNull(users.deletedAt)));

  return clientUsers.map((u) => u.id);
}

// ============================================
// Notification Helper Functions for Specific Events
// ============================================

/**
 * Notify when a new message is received on a project
 * - Admin sends message → Notify all client users
 * - Client sends message → Notify all admins
 */
export async function notifyNewMessage({
  senderRole,
  senderName,
  projectId,
  projectName,
  clientId,
  messagePreview,
}: {
  senderRole: "admin" | "client";
  senderName: string;
  projectId: string;
  projectName: string;
  clientId: string;
  messagePreview: string;
}): Promise<void> {
  const truncatedMessage =
    messagePreview.length > 100
      ? messagePreview.substring(0, 100) + "..."
      : messagePreview;

  if (senderRole === "admin") {
    // Admin sent message - notify all client users
    const clientUserIds = await getClientUserIds(clientId);
    await createNotificationsForUsers({
      userIds: clientUserIds,
      type: "message",
      title: "New message from Digital Directions",
      message: `${senderName} sent a message about ${projectName}: "${truncatedMessage}"`,
      linkUrl: `/dashboard/client/projects/${projectId}`,
    });
  } else {
    // Client sent message - notify all admins
    const adminUserIds = await getAllAdminUserIds();
    await createNotificationsForUsers({
      userIds: adminUserIds,
      type: "message",
      title: "New client message",
      message: `${senderName} sent a message about ${projectName}: "${truncatedMessage}"`,
      linkUrl: `/dashboard/admin/projects/${projectId}`,
    });
  }
}

/**
 * Notify when a new ticket is created
 * - Notify all admins
 */
export async function notifyNewTicket({
  ticketId,
  ticketTitle,
  clientName,
  creatorName,
  priority,
}: {
  ticketId: string;
  ticketTitle: string;
  clientName: string;
  creatorName: string;
  priority: string;
}): Promise<void> {
  const adminUserIds = await getAllAdminUserIds();
  await createNotificationsForUsers({
    userIds: adminUserIds,
    type: "ticket",
    title: `New ${priority} priority ticket`,
    message: `${creatorName} from ${clientName} submitted: "${ticketTitle}"`,
    linkUrl: `/dashboard/admin/tickets/${ticketId}`,
  });
}

/**
 * Notify when an admin responds to a ticket (non-internal)
 * - Notify all users of the client
 */
export async function notifyTicketResponse({
  ticketId,
  ticketTitle,
  clientId,
  responderName,
  responsePreview,
}: {
  ticketId: string;
  ticketTitle: string;
  clientId: string;
  responderName: string;
  responsePreview: string;
}): Promise<void> {
  const truncatedResponse =
    responsePreview.length > 100
      ? responsePreview.substring(0, 100) + "..."
      : responsePreview;

  const clientUserIds = await getClientUserIds(clientId);
  await createNotificationsForUsers({
    userIds: clientUserIds,
    type: "ticket_response",
    title: "New response on your ticket",
    message: `${responderName} responded to "${ticketTitle}": "${truncatedResponse}"`,
    linkUrl: `/dashboard/client/tickets/${ticketId}`,
  });
}

/**
 * Notify when a new client is added
 * - Notify all admins
 */
export async function notifyNewClient({
  clientId,
  clientName,
  addedByName,
}: {
  clientId: string;
  clientName: string;
  addedByName: string;
}): Promise<void> {
  const adminUserIds = await getAllAdminUserIds();
  await createNotificationsForUsers({
    userIds: adminUserIds,
    type: "client_added",
    title: "New client added",
    message: `${addedByName} added a new client: ${clientName}`,
    linkUrl: `/dashboard/admin/clients/${clientId}`,
  });
}
