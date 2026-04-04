// src/lib/notify.ts
// Unified notification service — dispatches in-app notifications, emails, and Slack messages
// for all portal lifecycle events.

import { WebClient } from "@slack/web-api";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clients, users } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createNotificationsForUsers } from "@/lib/notifications";
import {
  sendDiscoveryEmail,
  sendMappingEmail,
  sendUatEmail,
  sendBobConfigEmail,
  sendProvisioningEmail,
  sendGoLiveEmail,
} from "@/lib/email";
import { stageLabel } from "@/lib/lifecycle";

// --- Slack client ---

const slack = process.env.SLACK_BOT_TOKEN
  ? new WebClient(process.env.SLACK_BOT_TOKEN)
  : null;

const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

// --- Event types ---

export type PortalEvent =
  | { event: "discovery_submitted"; projectId: string; projectName: string; clientId: string }
  | { event: "discovery_withdrawn"; projectId: string; projectName: string; clientId: string }
  | { event: "discovery_reviewed"; projectId: string; projectName: string; clientId: string; action: "approve" | "request_changes"; reviewNotes?: string }
  | { event: "mapping_submitted"; projectId: string; projectName: string; clientId: string }
  | { event: "mapping_withdrawn"; projectId: string; projectName: string; clientId: string }
  | { event: "mapping_reviewed"; projectId: string; projectName: string; clientId: string; action: "approve" | "request_changes"; reviewNotes?: string }
  | { event: "uat_submitted"; projectId: string; projectName: string; clientId: string; passed: number; failed: number; na: number }
  | { event: "uat_withdrawn"; projectId: string; projectName: string; clientId: string }
  | { event: "uat_reviewed"; projectId: string; projectName: string; clientId: string; action: "approve" | "request_changes"; reviewNotes?: string }
  | { event: "bob_config_submitted"; projectId: string; projectName: string; clientId: string }
  | { event: "bob_config_withdrawn"; projectId: string; projectName: string; clientId: string }
  | { event: "bob_config_approved"; projectId: string; projectName: string; clientId: string; reviewNotes?: string }
  | { event: "bob_config_changes_requested"; projectId: string; projectName: string; clientId: string; reviewNotes?: string }
  | { event: "provisioning_step_completed"; projectId: string; projectName: string; clientId: string; stepName: string; allComplete: boolean }
  | { event: "provisioning_step_verified"; projectId: string; projectName: string; clientId: string; stepName: string; allVerified: boolean }
  | { event: "client_flag_raised"; projectId: string; projectName: string; clientId: string; flagMessage: string }
  | { event: "admin_flag_raised"; projectId: string; projectName: string; clientId: string; flagMessage: string }
  | { event: "client_message_sent"; projectId: string; projectName: string; clientId: string; senderName: string; messagePreview: string }
  | { event: "admin_message_sent"; projectId: string; projectName: string; clientId: string; senderName: string; messagePreview: string }
  | { event: "stage_advanced"; projectId: string; projectName: string; clientId: string; fromStage: string; toStage: string }
  | { event: "go_live_triggered"; projectId: string; projectName: string; clientId: string }
  | { event: "user_accepted_invite"; clientId: string; clientName: string; userName: string };

// --- Helpers ---

async function getClientName(clientId: string): Promise<string> {
  try {
    const [client] = await db
      .select({ companyName: clients.companyName })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);
    return client?.companyName || "Unknown Client";
  } catch {
    return "Unknown Client";
  }
}

interface RecipientInfo {
  userId: string;
  clerkId: string;
  email: string;
  name: string;
}

async function resolveRecipients(
  role: "admin" | "client",
  clientId?: string
): Promise<RecipientInfo[]> {
  let dbUsers: { id: string; clerkId: string }[];
  if (role === "admin") {
    dbUsers = await db
      .select({ id: users.id, clerkId: users.clerkId })
      .from(users)
      .where(and(eq(users.role, "admin"), isNull(users.deletedAt)));
  } else {
    if (!clientId) return [];
    dbUsers = await db
      .select({ id: users.id, clerkId: users.clerkId })
      .from(users)
      .where(and(eq(users.clientId, clientId), isNull(users.deletedAt)));
  }

  const recipients: RecipientInfo[] = [];
  const clerk = await clerkClient();
  for (const u of dbUsers) {
    try {
      const clerkUser = await clerk.users.getUser(u.clerkId);
      recipients.push({
        userId: u.id,
        clerkId: u.clerkId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        name:
          `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
          "there",
      });
    } catch {
      recipients.push({
        userId: u.id,
        clerkId: u.clerkId,
        email: "",
        name: "there",
      });
    }
  }
  return recipients;
}

// --- Slack formatting ---

// Color palette for the attachment bar
const COLORS = {
  brand: "#7C1CFF",    // DD Violet — standard updates, submissions
  success: "#22C55E",  // Green — approvals, completions, go-live
  warning: "#F59E0B",  // Orange — changes requested, input needed
  danger: "#EF4444",   // Red — client blockers
  info: "#6366F1",     // Indigo — messages, new users
} as const;

type SlackColor = (typeof COLORS)[keyof typeof COLORS];

interface SlackMessageConfig {
  emoji: string;
  header: string;
  body: string;
  clientName: string;
  projectName?: string;
  linkUrl: string;
  color?: SlackColor;
}

function buildSlackBlocks(config: SlackMessageConfig) {
  // Slack block types are complex unions — cast to avoid verbose typing
  const blocks: any[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${config.emoji}  *${config.header}*`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: config.body,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*${config.clientName}*${config.projectName ? `  ·  ${config.projectName}` : ""}  ·  <!date^${Math.floor(Date.now() / 1000)}^{date_short_pretty} at {time}|just now>`,
        },
      ],
    },
  ];

  // Slack requires HTTPS URLs for buttons — skip button in local dev
  if (config.linkUrl.startsWith("https://")) {
    blocks.push(
      { type: "divider" },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View in Portal  →", emoji: true },
            url: config.linkUrl,
            action_id: "view_in_portal",
          },
        ],
      }
    );
  }

  return blocks;
}

async function sendSlack(config: SlackMessageConfig): Promise<void> {
  if (!slack || !SLACK_CHANNEL_ID) return;
  try {
    await slack.chat.postMessage({
      channel: SLACK_CHANNEL_ID,
      blocks: buildSlackBlocks(config) as any,
      attachments: [
        {
          color: config.color || COLORS.brand,
          blocks: [],
        },
      ],
      text: `${config.header} — ${config.clientName}${config.projectName ? ` — ${config.projectName}` : ""}`,
    });
  } catch (error) {
    console.error("Slack notification failed:", error);
  }
}

// --- Main dispatcher ---

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function notifyEvent(payload: PortalEvent): Promise<void> {
  try {
    switch (payload.event) {
      // =====================
      // DISCOVERY
      // =====================

      case "discovery_submitted": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("admin");
        const userIds = recipients.map((r) => r.userId);

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: "Discovery Submitted",
          message: `${clientName} has submitted their discovery questionnaire for ${payload.projectName}.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/discovery`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendDiscoveryEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "submitted",
            }).catch((err) =>
              console.error("Discovery submitted email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: ":blue_book:",
          header: "Discovery Submitted",
          body: `${clientName} has submitted their discovery questionnaire.`,
          clientName,
          projectName: payload.projectName,
          color: COLORS.brand,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/discovery`,
        });
        break;
      }

      case "discovery_withdrawn": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("admin");
        const userIds = recipients.map((r) => r.userId);

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: "Discovery Withdrawn",
          message: `${clientName} has withdrawn their discovery submission for ${payload.projectName}.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/discovery`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendDiscoveryEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "withdrawn",
            }).catch((err) =>
              console.error("Discovery withdrawn email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: ":blue_book:",
          header: "Discovery Withdrawn",
          body: `${clientName} has withdrawn their discovery submission.`,
          clientName,
          projectName: payload.projectName,
          color: COLORS.brand,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/discovery`,
        });
        break;
      }

      case "discovery_reviewed": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("client", payload.clientId);
        const userIds = recipients.map((r) => r.userId);
        const approved = payload.action === "approve";

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: approved ? "Discovery Approved" : "Discovery — Changes Requested",
          message: approved
            ? `Your discovery questionnaire for ${payload.projectName} has been approved.`
            : `Changes have been requested on your discovery questionnaire for ${payload.projectName}.`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}/discovery`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendDiscoveryEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: approved ? "approved" : "changes_requested",
              reviewNotes: payload.reviewNotes,
            }).catch((err) =>
              console.error("Discovery reviewed email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: approved ? ":white_check_mark:" : ":leftwards_arrow_with_hook:",
          header: approved ? "Discovery Approved" : "Discovery — Changes Requested",
          body: approved
            ? `Discovery questionnaire has been approved.`
            : `Changes have been requested on the discovery questionnaire.${payload.reviewNotes ? ` Notes: "${payload.reviewNotes.substring(0, 300)}"` : ""}`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/discovery`,
          color: approved ? COLORS.success : COLORS.warning,
        });
        break;
      }

      // =====================
      // MAPPING
      // =====================

      case "mapping_submitted": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("admin");
        const userIds = recipients.map((r) => r.userId);

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: "Mapping Submitted",
          message: `${clientName} has submitted their data mapping for ${payload.projectName}.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/mapping`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendMappingEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "submitted",
            }).catch((err) =>
              console.error("Mapping submitted email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: ":world_map:",
          header: "Mapping Submitted",
          body: `${clientName} has submitted their data mapping.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/mapping`,
          color: COLORS.brand,
        });
        break;
      }

      case "mapping_withdrawn": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("admin");
        const userIds = recipients.map((r) => r.userId);

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: "Mapping Withdrawn",
          message: `${clientName} has withdrawn their mapping submission for ${payload.projectName}.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/mapping`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendMappingEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "withdrawn",
            }).catch((err) =>
              console.error("Mapping withdrawn email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: ":world_map:",
          header: "Mapping Withdrawn",
          body: `${clientName} has withdrawn their mapping submission.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/mapping`,
          color: COLORS.brand,
        });
        break;
      }

      case "mapping_reviewed": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("client", payload.clientId);
        const userIds = recipients.map((r) => r.userId);
        const approved = payload.action === "approve";

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: approved ? "Mapping Approved" : "Mapping — Changes Requested",
          message: approved
            ? `Your data mapping for ${payload.projectName} has been approved.`
            : `Changes have been requested on your data mapping for ${payload.projectName}.`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}/mapping`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendMappingEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: approved ? "approved" : "changes_requested",
              reviewNotes: payload.reviewNotes,
            }).catch((err) =>
              console.error("Mapping reviewed email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: approved ? ":white_check_mark:" : ":leftwards_arrow_with_hook:",
          header: approved ? "Mapping Approved" : "Mapping — Changes Requested",
          body: approved
            ? `Data mapping has been approved.`
            : `Changes have been requested on the data mapping.${payload.reviewNotes ? ` Notes: "${payload.reviewNotes.substring(0, 300)}"` : ""}`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/mapping`,
          color: approved ? COLORS.success : COLORS.warning,
        });
        break;
      }

      // =====================
      // UAT
      // =====================

      case "uat_submitted": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("admin");
        const userIds = recipients.map((r) => r.userId);

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: "UAT Results Submitted",
          message: `${clientName} has submitted UAT results for ${payload.projectName}: ${payload.passed} passed, ${payload.failed} failed, ${payload.na} N/A.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/uat`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendUatEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "submitted",
            }).catch((err) =>
              console.error("UAT submitted email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: ":test_tube:",
          header: "UAT Results Submitted",
          body: `UAT results have been submitted: ${payload.passed} passed, ${payload.failed} failed, ${payload.na} N/A.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/uat`,
          color: COLORS.brand,
        });
        break;
      }

      case "uat_withdrawn": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("admin");
        const userIds = recipients.map((r) => r.userId);

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: "UAT Withdrawn",
          message: `${clientName} has withdrawn their UAT submission for ${payload.projectName}.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/uat`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendUatEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "withdrawn",
            }).catch((err) =>
              console.error("UAT withdrawn email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: ":test_tube:",
          header: "UAT Withdrawn",
          body: `${clientName} has withdrawn their UAT submission.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/uat`,
          color: COLORS.brand,
        });
        break;
      }

      case "uat_reviewed": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("client", payload.clientId);
        const userIds = recipients.map((r) => r.userId);
        const approved = payload.action === "approve";

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: approved ? "UAT Approved" : "UAT — Changes Requested",
          message: approved
            ? `Your UAT results for ${payload.projectName} have been approved.`
            : `Changes have been requested on your UAT results for ${payload.projectName}.`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}/uat`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendUatEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: approved ? "approved" : "changes_requested",
              reviewNotes: payload.reviewNotes,
            }).catch((err) =>
              console.error("UAT reviewed email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: approved ? ":white_check_mark:" : ":leftwards_arrow_with_hook:",
          header: approved ? "UAT Approved" : "UAT — Changes Requested",
          body: approved
            ? `UAT results have been approved.`
            : `Changes have been requested on the UAT results.${payload.reviewNotes ? ` Notes: "${payload.reviewNotes.substring(0, 300)}"` : ""}`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/uat`,
          color: approved ? COLORS.success : COLORS.warning,
        });
        break;
      }

      // =====================
      // BOB CONFIG
      // =====================

      case "bob_config_submitted": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("admin");
        const userIds = recipients.map((r) => r.userId);

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: "HiBob Config Submitted",
          message: `${clientName} has submitted their HiBob configuration for ${payload.projectName}.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/bob-config`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendBobConfigEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "submitted",
            }).catch((err) =>
              console.error("Bob config submitted email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: ":gear:",
          header: "HiBob Config Submitted",
          body: `${clientName} has submitted their HiBob configuration.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/bob-config`,
          color: COLORS.brand,
        });
        break;
      }

      case "bob_config_withdrawn": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("admin");
        const userIds = recipients.map((r) => r.userId);

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: "HiBob Config Withdrawn",
          message: `${clientName} has withdrawn their HiBob configuration submission for ${payload.projectName}.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/bob-config`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendBobConfigEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "withdrawn",
            }).catch((err) =>
              console.error("Bob config withdrawn email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: ":gear:",
          header: "HiBob Config Withdrawn",
          body: `${clientName} has withdrawn their HiBob configuration submission.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/bob-config`,
          color: COLORS.brand,
        });
        break;
      }

      case "bob_config_approved": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("client", payload.clientId);
        const userIds = recipients.map((r) => r.userId);

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: "HiBob Config Approved",
          message: `Your HiBob configuration for ${payload.projectName} has been approved.`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}/bob-config`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendBobConfigEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "approved",
              reviewNotes: payload.reviewNotes,
            }).catch((err) =>
              console.error("Bob config approved email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: ":white_check_mark:",
          header: "HiBob Config Approved",
          body: `HiBob configuration has been approved.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/bob-config`,
          color: COLORS.success,
        });
        break;
      }

      case "bob_config_changes_requested": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("client", payload.clientId);
        const userIds = recipients.map((r) => r.userId);

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: "HiBob Config — Changes Requested",
          message: `Changes have been requested on your HiBob configuration for ${payload.projectName}.`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}/bob-config`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendBobConfigEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "changes_requested",
              reviewNotes: payload.reviewNotes,
            }).catch((err) =>
              console.error("Bob config changes requested email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: ":leftwards_arrow_with_hook:",
          header: "HiBob Config — Changes Requested",
          body: `Changes have been requested on the HiBob configuration.${payload.reviewNotes ? ` Notes: "${payload.reviewNotes.substring(0, 300)}"` : ""}`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/bob-config`,
          color: COLORS.warning,
        });
        break;
      }

      // =====================
      // PROVISIONING
      // =====================

      case "provisioning_step_completed": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("admin");
        const userIds = recipients.map((r) => r.userId);
        const header = payload.allComplete
          ? "All Provisioning Steps Completed"
          : "Provisioning Step Completed";

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: header,
          message: payload.allComplete
            ? `${clientName} has completed all provisioning steps for ${payload.projectName}.`
            : `${clientName} has completed the "${payload.stepName}" provisioning step for ${payload.projectName}.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/provisioning`,
        });

        for (const r of recipients) {
          if (r.email) {
            sendProvisioningEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "step_completed",
              stepTitle: payload.stepName,
            }).catch((err) =>
              console.error("Provisioning step completed email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: ":white_check_mark:",
          header,
          body: payload.allComplete
            ? `All provisioning steps have been completed by the client.`
            : `Client completed provisioning step: "${payload.stepName}".`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/provisioning`,
          color: COLORS.success,
        });
        break;
      }

      case "provisioning_step_verified": {
        const clientName = await getClientName(payload.clientId);
        const header = payload.allVerified
          ? "All Provisioning Steps Verified"
          : "Provisioning Step Verified";

        // Always post to Slack
        await sendSlack({
          emoji: ":white_check_mark:",
          header,
          body: payload.allVerified
            ? `All provisioning steps have been verified.`
            : `Admin verified provisioning step: "${payload.stepName}".`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/provisioning`,
          color: COLORS.success,
        });

        // Only notify client users + send emails when allVerified is true
        if (payload.allVerified) {
          const recipients = await resolveRecipients("client", payload.clientId);
          const userIds = recipients.map((r) => r.userId);

          await createNotificationsForUsers({
            userIds,
            type: "project_update",
            title: "All Provisioning Steps Verified",
            message: `All provisioning steps for ${payload.projectName} have been verified. Your project is ready to move forward.`,
            linkUrl: `/dashboard/client/projects/${payload.projectId}/provisioning`,
          });

          for (const r of recipients) {
            if (r.email) {
              sendProvisioningEmail({
                to: r.email,
                recipientName: r.name,
                projectName: payload.projectName,
                projectId: payload.projectId,
                event: "all_verified",
              }).catch((err) =>
                console.error("Provisioning all verified email failed:", err)
              );
            }
          }
        }
        break;
      }

      // =====================
      // FLAGS
      // =====================

      case "client_flag_raised": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("admin");
        const userIds = recipients.map((r) => r.userId);
        const truncatedMessage =
          payload.flagMessage.length > 300
            ? payload.flagMessage.substring(0, 300) + "..."
            : payload.flagMessage;

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: "Client Flag Raised",
          message: `${clientName} raised a flag on ${payload.projectName}: "${truncatedMessage}"`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}`,
        });

        // No email for flags — in-app + Slack only

        await sendSlack({
          emoji: ":triangular_flag_on_post:",
          header: "Client Flag Raised",
          body: `${clientName} raised a flag: "${truncatedMessage}"`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}`,
          color: COLORS.danger,
        });
        break;
      }

      case "admin_flag_raised": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("client", payload.clientId);
        const userIds = recipients.map((r) => r.userId);
        const truncatedMessage =
          payload.flagMessage.length > 300
            ? payload.flagMessage.substring(0, 300) + "..."
            : payload.flagMessage;

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: "Action Required",
          message: `Digital Directions raised a flag on ${payload.projectName}: "${truncatedMessage}"`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}`,
        });

        // No email for flags — in-app + Slack only

        await sendSlack({
          emoji: ":raised_hand:",
          header: "Admin Flag Raised",
          body: `Admin raised a flag: "${truncatedMessage}"`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}`,
          color: COLORS.warning,
        });
        break;
      }

      // =====================
      // MESSAGES
      // =====================

      case "client_message_sent": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("admin");
        const userIds = recipients.map((r) => r.userId);
        const truncatedPreview =
          payload.messagePreview.length > 200
            ? payload.messagePreview.substring(0, 200) + "..."
            : payload.messagePreview;

        await createNotificationsForUsers({
          userIds,
          type: "message",
          title: "New Client Message",
          message: `${payload.senderName} sent a message on ${payload.projectName}: "${truncatedPreview}"`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}`,
        });

        // No email for messages — in-app + Slack only

        await sendSlack({
          emoji: ":speech_balloon:",
          header: "New Client Message",
          body: `${payload.senderName} sent a message: "${truncatedPreview}"`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}`,
          color: COLORS.info,
        });
        break;
      }

      case "admin_message_sent": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("client", payload.clientId);
        const userIds = recipients.map((r) => r.userId);

        await createNotificationsForUsers({
          userIds,
          type: "message",
          title: "New Message from Digital Directions",
          message: `${payload.senderName} sent a message on ${payload.projectName}.`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}`,
        });

        // No email for messages — in-app + Slack only

        await sendSlack({
          emoji: ":speech_balloon:",
          header: "Admin Message Sent",
          body: `${payload.senderName} sent a message to the client.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}`,
          color: COLORS.info,
        });
        break;
      }

      // =====================
      // STAGE ADVANCED
      // =====================

      case "stage_advanced": {
        const clientName = await getClientName(payload.clientId);
        const recipients = await resolveRecipients("client", payload.clientId);
        const userIds = recipients.map((r) => r.userId);
        const fromLabel = stageLabel(payload.fromStage);
        const toLabel = stageLabel(payload.toStage);

        await createNotificationsForUsers({
          userIds,
          type: "project_update",
          title: "Project Stage Advanced",
          message: `${payload.projectName} has moved from ${fromLabel} to ${toLabel}.`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}`,
        });

        // No email for stage advances — in-app + Slack only

        await sendSlack({
          emoji: ":arrow_forward:",
          header: "Stage Advanced",
          body: `Project moved from ${fromLabel} to ${toLabel}.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}`,
          color: COLORS.success,
        });
        break;
      }

      // =====================
      // GO-LIVE
      // =====================

      case "go_live_triggered": {
        const clientName = await getClientName(payload.clientId);

        // Notify both admins and client users
        const adminRecipients = await resolveRecipients("admin");
        const clientRecipients = await resolveRecipients("client", payload.clientId);

        const adminUserIds = adminRecipients.map((r) => r.userId);
        const clientUserIds = clientRecipients.map((r) => r.userId);

        // Admin notifications — link to admin URL
        await createNotificationsForUsers({
          userIds: adminUserIds,
          type: "project_update",
          title: "Go-live triggered!",
          message: `"${payload.projectName}" has gone live!`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/go-live`,
        });

        // Client notifications — link to client URL
        await createNotificationsForUsers({
          userIds: clientUserIds,
          type: "project_update",
          title: "Your project is live!",
          message: `"${payload.projectName}" has officially gone live! Congratulations!`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}/go-live`,
        });

        // Send emails to admins
        for (const r of adminRecipients) {
          if (r.email) {
            sendGoLiveEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "go_live_triggered",
              isAdmin: true,
            }).catch((err) =>
              console.error("Go-live admin email failed:", err)
            );
          }
        }

        // Send emails to client users
        for (const r of clientRecipients) {
          if (r.email) {
            sendGoLiveEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "go_live_triggered",
              isAdmin: false,
            }).catch((err) =>
              console.error("Go-live client email failed:", err)
            );
          }
        }

        await sendSlack({
          emoji: ":rocket:",
          header: "Integration Is Live!",
          body: `${payload.projectName} has gone live!`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/go-live`,
          color: COLORS.success,
        });
        break;
      }

      // =====================
      // USER ACCEPTED INVITE
      // =====================

      case "user_accepted_invite": {
        const recipients = await resolveRecipients("admin");
        const userIds = recipients.map((r) => r.userId);

        await createNotificationsForUsers({
          userIds,
          type: "client_added",
          title: "New User Joined",
          message: `${payload.userName} from ${payload.clientName} has accepted their invite and joined the portal.`,
          linkUrl: `/dashboard/admin/clients`,
        });

        // No email for invite accepted — in-app + Slack only

        await sendSlack({
          emoji: ":wave:",
          header: "New User Joined",
          body: `${payload.userName} from ${payload.clientName} has joined the portal.`,
          clientName: payload.clientName,
          linkUrl: `${APP_URL}/dashboard/admin/clients`,
          color: COLORS.info,
        });
        break;
      }

      default: {
        const _exhaustive: never = payload;
        console.warn(`Unknown notification event: ${(_exhaustive as any).event}`);
      }
    }
  } catch (error) {
    console.error(`notifyEvent failed for event "${payload.event}":`, error);
  }
}
