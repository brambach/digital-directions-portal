import { WebClient } from "@slack/web-api";

// Initialize Slack client
const slack = process.env.SLACK_BOT_TOKEN
  ? new WebClient(process.env.SLACK_BOT_TOKEN)
  : null;

const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

interface SlackNotificationBase {
  clientName: string;
  projectName?: string;
  link: string;
}

interface TicketCreatedNotification extends SlackNotificationBase {
  type: "ticket_created";
  ticketTitle: string;
  priority: "low" | "medium" | "high" | "urgent";
  ticketType: string;
}

interface TicketAssignedNotification extends SlackNotificationBase {
  type: "ticket_assigned";
  ticketTitle: string;
  assigneeName: string;
}

interface TicketResolvedNotification extends SlackNotificationBase {
  type: "ticket_resolved";
  ticketTitle: string;
  resolverName: string;
}

interface MessageReceivedNotification extends SlackNotificationBase {
  type: "message_received";
  senderName: string;
  messagePreview: string;
}

interface FileUploadedNotification extends SlackNotificationBase {
  type: "file_uploaded";
  fileName: string;
  uploaderName: string;
}

interface StatusChangedNotification extends SlackNotificationBase {
  type: "status_changed";
  oldStatus: string;
  newStatus: string;
}

type SlackNotification =
  | TicketCreatedNotification
  | TicketAssignedNotification
  | TicketResolvedNotification
  | MessageReceivedNotification
  | FileUploadedNotification
  | StatusChangedNotification;

function getPriorityEmoji(priority: string): string {
  switch (priority) {
    case "urgent":
      return ":rotating_light:";
    case "high":
      return ":exclamation:";
    case "medium":
      return ":warning:";
    case "low":
      return ":information_source:";
    default:
      return ":ticket:";
  }
}

function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function sendSlackNotification(notification: SlackNotification): Promise<boolean> {
  if (!slack || !SLACK_CHANNEL_ID) {
    console.log("Slack not configured, skipping notification:", notification.type);
    return false;
  }

  try {
    let blocks: Array<{
      type: string;
      text?: { type: string; text: string; emoji?: boolean };
      elements?: Array<{ type: string; text?: string; url?: string; action_id?: string }>;
    }> = [];

    switch (notification.type) {
      case "ticket_created":
        blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `${getPriorityEmoji(notification.priority)} *New Ticket from ${notification.clientName}*\n*${notification.ticketTitle}*`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Type: ${notification.ticketType} | Priority: ${notification.priority.toUpperCase()}${notification.projectName ? ` | Project: ${notification.projectName}` : ""}`,
              },
            ],
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: "View Ticket",
                url: notification.link,
                action_id: "view_ticket",
              },
            ],
          },
        ];
        break;

      case "ticket_assigned":
        blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:point_right: *${notification.assigneeName}* claimed ticket\n*${notification.ticketTitle}*`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Client: ${notification.clientName}${notification.projectName ? ` | Project: ${notification.projectName}` : ""}`,
              },
            ],
          },
        ];
        break;

      case "ticket_resolved":
        blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:white_check_mark: *Ticket Resolved* by ${notification.resolverName}\n*${notification.ticketTitle}*`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Client: ${notification.clientName}`,
              },
            ],
          },
        ];
        break;

      case "message_received":
        blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:speech_balloon: *New Message from ${notification.senderName}*\n_${notification.clientName}_ on ${notification.projectName || "General"}`,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `>${notification.messagePreview.substring(0, 200)}${notification.messagePreview.length > 200 ? "..." : ""}`,
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: "View Message",
                url: notification.link,
                action_id: "view_message",
              },
            ],
          },
        ];
        break;

      case "file_uploaded":
        blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:file_folder: *File Uploaded* by ${notification.uploaderName}\n*${notification.fileName}*`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Client: ${notification.clientName}${notification.projectName ? ` | Project: ${notification.projectName}` : ""}`,
              },
            ],
          },
        ];
        break;

      case "status_changed":
        blocks = [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `:chart_with_upwards_trend: *Project Status Updated*\n${notification.projectName || "Project"}: ${formatStatusLabel(notification.oldStatus)} :arrow_right: ${formatStatusLabel(notification.newStatus)}`,
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Client: ${notification.clientName}`,
              },
            ],
          },
        ];
        break;
    }

    await slack.chat.postMessage({
      channel: SLACK_CHANNEL_ID,
      blocks: blocks as any,
      text: getPlainTextFallback(notification),
    });

    return true;
  } catch (error) {
    console.error("Error sending Slack notification:", error);
    return false;
  }
}

function getPlainTextFallback(notification: SlackNotification): string {
  switch (notification.type) {
    case "ticket_created":
      return `New ticket from ${notification.clientName}: ${notification.ticketTitle}`;
    case "ticket_assigned":
      return `${notification.assigneeName} claimed ticket: ${notification.ticketTitle}`;
    case "ticket_resolved":
      return `Ticket resolved: ${notification.ticketTitle}`;
    case "message_received":
      return `New message from ${notification.senderName} (${notification.clientName})`;
    case "file_uploaded":
      return `File uploaded: ${notification.fileName} by ${notification.uploaderName}`;
    case "status_changed":
      return `Project status changed: ${notification.projectName} - ${notification.oldStatus} → ${notification.newStatus}`;
  }
}

// Helper functions for common notification scenarios
export async function notifyTicketCreated(params: {
  ticketTitle: string;
  ticketId: string;
  clientName: string;
  projectName?: string;
  priority: "low" | "medium" | "high" | "urgent";
  ticketType: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return sendSlackNotification({
    type: "ticket_created",
    ticketTitle: params.ticketTitle,
    clientName: params.clientName,
    projectName: params.projectName,
    priority: params.priority,
    ticketType: params.ticketType,
    link: `${baseUrl}/dashboard/admin/tickets/${params.ticketId}`,
  });
}

export async function notifyTicketAssigned(params: {
  ticketTitle: string;
  ticketId: string;
  clientName: string;
  projectName?: string;
  assigneeName: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return sendSlackNotification({
    type: "ticket_assigned",
    ticketTitle: params.ticketTitle,
    clientName: params.clientName,
    projectName: params.projectName,
    assigneeName: params.assigneeName,
    link: `${baseUrl}/dashboard/admin/tickets/${params.ticketId}`,
  });
}

export async function notifyTicketResolved(params: {
  ticketTitle: string;
  ticketId: string;
  clientName: string;
  resolverName: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return sendSlackNotification({
    type: "ticket_resolved",
    ticketTitle: params.ticketTitle,
    clientName: params.clientName,
    resolverName: params.resolverName,
    link: `${baseUrl}/dashboard/admin/tickets/${params.ticketId}`,
  });
}

export async function notifyMessageReceived(params: {
  senderName: string;
  clientName: string;
  projectId: string;
  projectName: string;
  messagePreview: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return sendSlackNotification({
    type: "message_received",
    senderName: params.senderName,
    clientName: params.clientName,
    projectName: params.projectName,
    messagePreview: params.messagePreview,
    link: `${baseUrl}/dashboard/admin/projects/${params.projectId}`,
  });
}

export async function notifyFileUploaded(params: {
  fileName: string;
  uploaderName: string;
  clientName: string;
  projectId: string;
  projectName: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return sendSlackNotification({
    type: "file_uploaded",
    fileName: params.fileName,
    uploaderName: params.uploaderName,
    clientName: params.clientName,
    projectName: params.projectName,
    link: `${baseUrl}/dashboard/admin/projects/${params.projectId}`,
  });
}

export async function notifyStatusChanged(params: {
  projectId: string;
  projectName: string;
  clientName: string;
  oldStatus: string;
  newStatus: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return sendSlackNotification({
    type: "status_changed",
    projectName: params.projectName,
    clientName: params.clientName,
    oldStatus: params.oldStatus,
    newStatus: params.newStatus,
    link: `${baseUrl}/dashboard/admin/projects/${params.projectId}`,
  });
}
