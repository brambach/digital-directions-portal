# Slack Integration — Unified Notification Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace scattered inline notification code with a unified `notifyEvent()` function that handles in-app notifications, email, and Slack in one call.

**Architecture:** New `src/lib/notify.ts` module with a typed event discriminated union. Each event resolves recipients, creates in-app notifications, sends emails via existing helpers, and posts a Block Kit message to Slack. All channels are fire-and-forget. Existing routes get their 20-40 line notification blocks replaced with a single `notifyEvent(...)` call.

**Tech Stack:** Next.js 15, `@slack/web-api` (already installed), Resend (existing), Drizzle ORM (existing)

**Spec:** `docs/superpowers/specs/2026-04-03-slack-integration-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/notify.ts` | **Create** | Unified notification service — event types, Slack formatting, dispatch logic |
| `src/lib/slack.ts` | **Delete** | Dead code, replaced by notify.ts |
| `src/lib/notifications.ts` | **Keep** | Helper functions (`getAllAdminUserIds`, `getClientUserIds`, `createNotificationsForUsers`) — imported by notify.ts |
| `src/lib/email.ts` | **Keep** | Email senders — called by notify.ts |
| `src/lib/lifecycle.ts` | **Keep** | `stageLabel()` used for stage_advanced formatting |
| 19 API route files | **Modify** | Replace inline notification blocks with `notifyEvent()` calls |

---

## Task 0: Slack App Setup (Manual)

No code — this is a one-time workspace setup. Must be done before any Slack code can be tested.

- [ ] **Step 1: Create Slack App**

Go to https://api.slack.com/apps → "Create New App" → "From scratch". Name it "DD Portal", select the Digital Directions workspace.

- [ ] **Step 2: Add bot scope**

In the app settings, go to "OAuth & Permissions" → under "Bot Token Scopes", add `chat:write`.

- [ ] **Step 3: Install to workspace**

Click "Install to Workspace" at the top of the OAuth & Permissions page. Authorize.

- [ ] **Step 4: Copy bot token**

After install, copy the Bot User OAuth Token (`xoxb-...`).

- [ ] **Step 5: Create the Slack channel**

In Slack, create a channel called `#dd-portal-activity`.

- [ ] **Step 6: Get channel ID**

Right-click the channel → "View channel details" → scroll to bottom → copy Channel ID (starts with `C`).

- [ ] **Step 7: Invite the bot to the channel**

In `#dd-portal-activity`, type `/invite @DD Portal`.

- [ ] **Step 8: Set environment variables**

Add to `.env.local`:
```
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_CHANNEL_ID=C0your-channel-id
```

Add the same to Vercel environment variables for production.

- [ ] **Step 9: Verify**

Run the dev server (`npm run dev`). Check console for absence of "Slack not configured" warnings.

---

## Task 1: Create `src/lib/notify.ts` — Types and Slack Client

**Files:**
- Create: `src/lib/notify.ts`

- [ ] **Step 1: Create the file with the PortalEvent type and Slack client**

```typescript
// src/lib/notify.ts
import { WebClient } from "@slack/web-api";
import { clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getAllAdminUserIds,
  getClientUserIds,
  createNotificationsForUsers,
} from "@/lib/notifications";
import { sendDiscoveryEmail } from "@/lib/email";
import { sendMappingEmail } from "@/lib/email";
import { sendUatEmail } from "@/lib/email";
import { sendBobConfigEmail } from "@/lib/email";
import { sendProvisioningEmail } from "@/lib/email";
import { sendGoLiveEmail } from "@/lib/email";
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
  const { users } = await import("@/lib/db/schema");
  const { and, isNull } = await import("drizzle-orm");

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
  for (const u of dbUsers) {
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(u.clerkId);
      recipients.push({
        userId: u.id,
        clerkId: u.clerkId,
        email: clerkUser.emailAddresses[0]?.emailAddress || "",
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "there",
      });
    } catch {
      recipients.push({ userId: u.id, clerkId: u.clerkId, email: "", name: "there" });
    }
  }
  return recipients;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

Expected: No errors related to `notify.ts`. Warnings about unused imports are fine at this point — they'll be used in the next task.

- [ ] **Step 3: Commit**

```bash
git add src/lib/notify.ts
git commit -m "feat: add notify.ts with PortalEvent types and helpers"
```

---

## Task 2: Implement Slack Formatting and `notifyEvent` Dispatcher

**Files:**
- Modify: `src/lib/notify.ts`

- [ ] **Step 1: Add the Slack message builder to notify.ts**

Append after the `resolveRecipients` function:

```typescript
// --- Slack formatting ---

interface SlackMessageConfig {
  emoji: string;
  header: string;
  body: string;
  clientName: string;
  projectName?: string;
  linkUrl: string;
}

function buildSlackBlocks(config: SlackMessageConfig) {
  const blocks: any[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${config.emoji} *${config.header}*\n${config.body}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `${config.clientName}${config.projectName ? ` — ${config.projectName}` : ""}`,
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View in Portal" },
          url: config.linkUrl,
          action_id: "view_in_portal",
        },
      ],
    },
  ];
  return blocks;
}

async function sendSlack(config: SlackMessageConfig): Promise<void> {
  if (!slack || !SLACK_CHANNEL_ID) return;
  try {
    await slack.chat.postMessage({
      channel: SLACK_CHANNEL_ID,
      blocks: buildSlackBlocks(config),
      text: `${config.header} — ${config.clientName}${config.projectName ? ` — ${config.projectName}` : ""}`,
    });
  } catch (error) {
    console.error("Slack notification failed:", error);
  }
}
```

- [ ] **Step 2: Add the main `notifyEvent` dispatcher**

Append after `sendSlack`:

```typescript
// --- Main dispatcher ---

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function notifyEvent(payload: PortalEvent): Promise<void> {
  try {
    switch (payload.event) {

      // ============================
      // DISCOVERY
      // ============================

      case "discovery_submitted": {
        const clientName = await getClientName(payload.clientId);
        const adminRecipients = await resolveRecipients("admin");

        // In-app notifications
        await createNotificationsForUsers({
          userIds: adminRecipients.map((r) => r.userId),
          type: "project_update",
          title: "Discovery questionnaire submitted",
          message: `The discovery questionnaire for "${payload.projectName}" has been submitted for review.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/discovery`,
        });

        // Email
        for (const r of adminRecipients) {
          if (r.email) {
            sendDiscoveryEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "submitted",
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        // Slack
        await sendSlack({
          emoji: ":blue_book:",
          header: "Discovery Submitted",
          body: `The discovery questionnaire has been submitted for review.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/discovery`,
        });
        break;
      }

      case "discovery_withdrawn": {
        const clientName = await getClientName(payload.clientId);
        const adminRecipients = await resolveRecipients("admin");

        await createNotificationsForUsers({
          userIds: adminRecipients.map((r) => r.userId),
          type: "project_update",
          title: "Discovery submission withdrawn",
          message: `The discovery submission for "${payload.projectName}" has been withdrawn by the client.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/discovery`,
        });

        for (const r of adminRecipients) {
          if (r.email) {
            sendDiscoveryEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "withdrawn",
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: ":blue_book:",
          header: "Discovery Withdrawn",
          body: `The discovery submission has been withdrawn by the client.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/discovery`,
        });
        break;
      }

      case "discovery_reviewed": {
        const clientName = await getClientName(payload.clientId);
        const clientRecipients = await resolveRecipients("client", payload.clientId);
        const approved = payload.action === "approve";

        const title = approved ? "Discovery questionnaire approved" : "Changes requested on discovery";
        const message = approved
          ? `The discovery questionnaire for "${payload.projectName}" has been approved.`
          : `Changes have been requested on the discovery questionnaire for "${payload.projectName}".${payload.reviewNotes ? ` Notes: ${payload.reviewNotes}` : ""}`;

        await createNotificationsForUsers({
          userIds: clientRecipients.map((r) => r.userId),
          type: "project_update",
          title,
          message,
          linkUrl: `/dashboard/client/projects/${payload.projectId}/discovery`,
        });

        const emailEvent = approved ? "approved" : "changes_requested";
        for (const r of clientRecipients) {
          if (r.email) {
            sendDiscoveryEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: emailEvent,
              reviewNotes: payload.reviewNotes,
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: approved ? ":white_check_mark:" : ":leftwards_arrow_with_hook:",
          header: approved ? "Discovery Approved" : "Discovery — Changes Requested",
          body: approved
            ? `The discovery questionnaire has been approved.`
            : `Changes have been requested.${payload.reviewNotes ? ` Notes: "${payload.reviewNotes.substring(0, 300)}"` : ""}`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/discovery`,
        });
        break;
      }

      // ============================
      // MAPPING
      // ============================

      case "mapping_submitted": {
        const clientName = await getClientName(payload.clientId);
        const adminRecipients = await resolveRecipients("admin");

        await createNotificationsForUsers({
          userIds: adminRecipients.map((r) => r.userId),
          type: "project_update",
          title: "Data mapping submitted",
          message: `The data mapping for "${payload.projectName}" has been submitted for review.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/mapping`,
        });

        for (const r of adminRecipients) {
          if (r.email) {
            sendMappingEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "submitted",
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: ":world_map:",
          header: "Mapping Submitted",
          body: `The data mapping has been submitted for review.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/mapping`,
        });
        break;
      }

      case "mapping_withdrawn": {
        const clientName = await getClientName(payload.clientId);
        const adminRecipients = await resolveRecipients("admin");

        await createNotificationsForUsers({
          userIds: adminRecipients.map((r) => r.userId),
          type: "project_update",
          title: "Data mapping submission withdrawn",
          message: `The data mapping submission for "${payload.projectName}" has been withdrawn by the client.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/mapping`,
        });

        for (const r of adminRecipients) {
          if (r.email) {
            sendMappingEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "withdrawn",
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: ":world_map:",
          header: "Mapping Withdrawn",
          body: `The data mapping submission has been withdrawn by the client.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/mapping`,
        });
        break;
      }

      case "mapping_reviewed": {
        const clientName = await getClientName(payload.clientId);
        const clientRecipients = await resolveRecipients("client", payload.clientId);
        const approved = payload.action === "approve";

        const title = approved ? "Data mapping approved" : "Changes requested on data mapping";
        const message = approved
          ? `The data mapping for "${payload.projectName}" has been approved.`
          : `Changes have been requested on the data mapping for "${payload.projectName}".${payload.reviewNotes ? ` Notes: ${payload.reviewNotes}` : ""}`;

        await createNotificationsForUsers({
          userIds: clientRecipients.map((r) => r.userId),
          type: "project_update",
          title,
          message,
          linkUrl: `/dashboard/client/projects/${payload.projectId}/mapping`,
        });

        const emailEvent = approved ? "approved" : "changes_requested";
        for (const r of clientRecipients) {
          if (r.email) {
            sendMappingEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: emailEvent,
              reviewNotes: payload.reviewNotes,
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: approved ? ":white_check_mark:" : ":leftwards_arrow_with_hook:",
          header: approved ? "Mapping Approved" : "Mapping — Changes Requested",
          body: approved
            ? `The data mapping has been approved.`
            : `Changes have been requested.${payload.reviewNotes ? ` Notes: "${payload.reviewNotes.substring(0, 300)}"` : ""}`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/mapping`,
        });
        break;
      }

      // ============================
      // UAT
      // ============================

      case "uat_submitted": {
        const clientName = await getClientName(payload.clientId);
        const adminRecipients = await resolveRecipients("admin");
        const summary = `${payload.passed} passed, ${payload.failed} failed, ${payload.na} N/A`;

        await createNotificationsForUsers({
          userIds: adminRecipients.map((r) => r.userId),
          type: "project_update",
          title: "UAT results submitted",
          message: `UAT results for "${payload.projectName}" have been submitted: ${summary}.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/uat`,
        });

        for (const r of adminRecipients) {
          if (r.email) {
            sendUatEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "submitted",
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: ":test_tube:",
          header: "UAT Results Submitted",
          body: `UAT results have been submitted: ${summary}.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/uat`,
        });
        break;
      }

      case "uat_withdrawn": {
        const clientName = await getClientName(payload.clientId);
        const adminRecipients = await resolveRecipients("admin");

        await createNotificationsForUsers({
          userIds: adminRecipients.map((r) => r.userId),
          type: "project_update",
          title: "UAT submission withdrawn",
          message: `The UAT submission for "${payload.projectName}" has been withdrawn by the client.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/uat`,
        });

        for (const r of adminRecipients) {
          if (r.email) {
            sendUatEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "withdrawn",
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: ":test_tube:",
          header: "UAT Withdrawn",
          body: `The UAT submission has been withdrawn by the client.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/uat`,
        });
        break;
      }

      case "uat_reviewed": {
        const clientName = await getClientName(payload.clientId);
        const clientRecipients = await resolveRecipients("client", payload.clientId);
        const approved = payload.action === "approve";

        const title = approved ? "UAT results approved" : "Changes requested on UAT";
        const message = approved
          ? `The UAT results for "${payload.projectName}" have been approved.`
          : `Changes have been requested on the UAT results for "${payload.projectName}".${payload.reviewNotes ? ` Notes: ${payload.reviewNotes}` : ""}`;

        await createNotificationsForUsers({
          userIds: clientRecipients.map((r) => r.userId),
          type: "project_update",
          title,
          message,
          linkUrl: `/dashboard/client/projects/${payload.projectId}/uat`,
        });

        const emailEvent = approved ? "approved" : "changes_requested";
        for (const r of clientRecipients) {
          if (r.email) {
            sendUatEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: emailEvent,
              reviewNotes: payload.reviewNotes,
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: approved ? ":white_check_mark:" : ":leftwards_arrow_with_hook:",
          header: approved ? "UAT Approved" : "UAT — Changes Requested",
          body: approved
            ? `The UAT results have been approved.`
            : `Changes have been requested.${payload.reviewNotes ? ` Notes: "${payload.reviewNotes.substring(0, 300)}"` : ""}`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/uat`,
        });
        break;
      }

      // ============================
      // BOB CONFIG
      // ============================

      case "bob_config_submitted": {
        const clientName = await getClientName(payload.clientId);
        const adminRecipients = await resolveRecipients("admin");

        await createNotificationsForUsers({
          userIds: adminRecipients.map((r) => r.userId),
          type: "project_update",
          title: "HiBob config submitted",
          message: `The HiBob configuration for "${payload.projectName}" has been submitted for review.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/bob-config`,
        });

        for (const r of adminRecipients) {
          if (r.email) {
            sendBobConfigEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "submitted",
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: ":gear:",
          header: "Bob Config Submitted",
          body: `The HiBob configuration has been submitted for review.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/bob-config`,
        });
        break;
      }

      case "bob_config_withdrawn": {
        const clientName = await getClientName(payload.clientId);
        const adminRecipients = await resolveRecipients("admin");

        await createNotificationsForUsers({
          userIds: adminRecipients.map((r) => r.userId),
          type: "project_update",
          title: "HiBob config submission withdrawn",
          message: `The HiBob config submission for "${payload.projectName}" has been withdrawn by the client.`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/bob-config`,
        });

        for (const r of adminRecipients) {
          if (r.email) {
            sendBobConfigEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "withdrawn",
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: ":gear:",
          header: "Bob Config Withdrawn",
          body: `The HiBob config submission has been withdrawn by the client.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/bob-config`,
        });
        break;
      }

      case "bob_config_approved": {
        const clientName = await getClientName(payload.clientId);
        const clientRecipients = await resolveRecipients("client", payload.clientId);

        await createNotificationsForUsers({
          userIds: clientRecipients.map((r) => r.userId),
          type: "project_update",
          title: "HiBob config approved",
          message: `The HiBob configuration for "${payload.projectName}" has been approved.`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}/bob-config`,
        });

        for (const r of clientRecipients) {
          if (r.email) {
            sendBobConfigEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "approved",
              reviewNotes: payload.reviewNotes,
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: ":white_check_mark:",
          header: "Bob Config Approved",
          body: `The HiBob configuration has been approved.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/bob-config`,
        });
        break;
      }

      case "bob_config_changes_requested": {
        const clientName = await getClientName(payload.clientId);
        const clientRecipients = await resolveRecipients("client", payload.clientId);

        await createNotificationsForUsers({
          userIds: clientRecipients.map((r) => r.userId),
          type: "project_update",
          title: "Changes requested on HiBob config",
          message: `Changes have been requested on the HiBob configuration for "${payload.projectName}".${payload.reviewNotes ? ` Notes: ${payload.reviewNotes}` : ""}`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}/bob-config`,
        });

        for (const r of clientRecipients) {
          if (r.email) {
            sendBobConfigEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "changes_requested",
              reviewNotes: payload.reviewNotes,
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: ":leftwards_arrow_with_hook:",
          header: "Bob Config — Changes Requested",
          body: `Changes have been requested.${payload.reviewNotes ? ` Notes: "${payload.reviewNotes.substring(0, 300)}"` : ""}`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/bob-config`,
        });
        break;
      }

      // ============================
      // PROVISIONING
      // ============================

      case "provisioning_step_completed": {
        const clientName = await getClientName(payload.clientId);
        const adminRecipients = await resolveRecipients("admin");

        const title = payload.allComplete
          ? "All provisioning steps completed"
          : `Provisioning step completed: ${payload.stepName}`;
        const message = payload.allComplete
          ? `All provisioning steps for "${payload.projectName}" have been completed by the client and are ready for verification.`
          : `The "${payload.stepName}" provisioning step for "${payload.projectName}" has been marked complete by the client.`;

        await createNotificationsForUsers({
          userIds: adminRecipients.map((r) => r.userId),
          type: "project_update",
          title,
          message,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/provisioning`,
        });

        for (const r of adminRecipients) {
          if (r.email) {
            sendProvisioningEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "step_completed",
              stepTitle: payload.stepName,
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: ":white_check_mark:",
          header: payload.allComplete ? "All Provisioning Steps Completed" : "Provisioning Step Completed",
          body: payload.allComplete
            ? `All provisioning steps have been completed and are ready for verification.`
            : `Step completed: "${payload.stepName}".`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/provisioning`,
        });
        break;
      }

      case "provisioning_step_verified": {
        const clientName = await getClientName(payload.clientId);

        // Slack always
        await sendSlack({
          emoji: ":white_check_mark:",
          header: payload.allVerified ? "All Provisioning Steps Verified" : "Provisioning Step Verified",
          body: payload.allVerified
            ? `All provisioning steps have been verified.`
            : `Step verified: "${payload.stepName}".`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/provisioning`,
        });

        // Only notify clients when ALL steps are verified
        if (payload.allVerified) {
          const clientRecipients = await resolveRecipients("client", payload.clientId);

          await createNotificationsForUsers({
            userIds: clientRecipients.map((r) => r.userId),
            type: "project_update",
            title: "All provisioning steps verified",
            message: `All provisioning steps for "${payload.projectName}" have been verified by the DD team.`,
            linkUrl: `/dashboard/client/projects/${payload.projectId}/provisioning`,
          });

          for (const r of clientRecipients) {
            if (r.email) {
              sendProvisioningEmail({
                to: r.email,
                recipientName: r.name,
                projectName: payload.projectName,
                projectId: payload.projectId,
                event: "all_verified",
              }).catch((e) => console.error("Email failed:", e));
            }
          }
        }
        break;
      }

      // ============================
      // FLAGS
      // ============================

      case "client_flag_raised": {
        const clientName = await getClientName(payload.clientId);
        const adminRecipients = await resolveRecipients("admin");

        await createNotificationsForUsers({
          userIds: adminRecipients.map((r) => r.userId),
          type: "project_update",
          title: "Client flag raised",
          message: `A blocker flag has been raised on "${payload.projectName}": ${payload.flagMessage.substring(0, 200)}`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}`,
        });

        await sendSlack({
          emoji: ":triangular_flag_on_post:",
          header: "Client Flag Raised",
          body: `${payload.flagMessage.substring(0, 300)}`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}`,
        });
        break;
      }

      case "admin_flag_raised": {
        const clientName = await getClientName(payload.clientId);
        const clientRecipients = await resolveRecipients("client", payload.clientId);

        await createNotificationsForUsers({
          userIds: clientRecipients.map((r) => r.userId),
          type: "project_update",
          title: "Input requested by Digital Directions",
          message: `Your input is needed on "${payload.projectName}": ${payload.flagMessage.substring(0, 200)}`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}`,
        });

        await sendSlack({
          emoji: ":raised_hand:",
          header: "Input Requested",
          body: `${payload.flagMessage.substring(0, 300)}`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}`,
        });
        break;
      }

      // ============================
      // MESSAGES
      // ============================

      case "client_message_sent": {
        const clientName = await getClientName(payload.clientId);
        const adminRecipients = await resolveRecipients("admin");

        await createNotificationsForUsers({
          userIds: adminRecipients.map((r) => r.userId),
          type: "message",
          title: "New client message",
          message: `${payload.senderName} sent a message about ${payload.projectName}: "${payload.messagePreview.substring(0, 100)}${payload.messagePreview.length > 100 ? "..." : ""}"`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}`,
        });

        await sendSlack({
          emoji: ":speech_balloon:",
          header: "New Client Message",
          body: `From ${payload.senderName}: "${payload.messagePreview.substring(0, 200)}${payload.messagePreview.length > 200 ? "..." : ""}"`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}`,
        });
        break;
      }

      case "admin_message_sent": {
        const clientName = await getClientName(payload.clientId);
        const clientRecipients = await resolveRecipients("client", payload.clientId);

        await createNotificationsForUsers({
          userIds: clientRecipients.map((r) => r.userId),
          type: "message",
          title: "New message from Digital Directions",
          message: `${payload.senderName} sent a message about ${payload.projectName}: "${payload.messagePreview.substring(0, 100)}${payload.messagePreview.length > 100 ? "..." : ""}"`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}`,
        });

        await sendSlack({
          emoji: ":speech_balloon:",
          header: "New Message Sent",
          body: `${payload.senderName} sent a message to the client.`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}`,
        });
        break;
      }

      // ============================
      // STAGE ADVANCEMENT
      // ============================

      case "stage_advanced": {
        const clientName = await getClientName(payload.clientId);
        const clientRecipients = await resolveRecipients("client", payload.clientId);
        const fromLabel = stageLabel(payload.fromStage);
        const toLabel = stageLabel(payload.toStage);

        await createNotificationsForUsers({
          userIds: clientRecipients.map((r) => r.userId),
          type: "project_update",
          title: "Project stage updated",
          message: `"${payload.projectName}" has moved from ${fromLabel} to ${toLabel}.`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}`,
        });

        await sendSlack({
          emoji: ":arrow_forward:",
          header: "Stage Advanced",
          body: `${fromLabel} → ${toLabel}`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}`,
        });
        break;
      }

      // ============================
      // GO-LIVE
      // ============================

      case "go_live_triggered": {
        const clientName = await getClientName(payload.clientId);
        const adminRecipients = await resolveRecipients("admin");
        const clientRecipients = await resolveRecipients("client", payload.clientId);

        // Notify both admins and clients
        await createNotificationsForUsers({
          userIds: adminRecipients.map((r) => r.userId),
          type: "project_update",
          title: "Go-live triggered!",
          message: `"${payload.projectName}" has gone live!`,
          linkUrl: `/dashboard/admin/projects/${payload.projectId}/go-live`,
        });

        await createNotificationsForUsers({
          userIds: clientRecipients.map((r) => r.userId),
          type: "project_update",
          title: "Your project is live!",
          message: `"${payload.projectName}" has officially gone live! Congratulations!`,
          linkUrl: `/dashboard/client/projects/${payload.projectId}/go-live`,
        });

        for (const r of adminRecipients) {
          if (r.email) {
            sendGoLiveEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "go_live_triggered",
              isAdmin: true,
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        for (const r of clientRecipients) {
          if (r.email) {
            sendGoLiveEmail({
              to: r.email,
              recipientName: r.name,
              projectName: payload.projectName,
              projectId: payload.projectId,
              event: "go_live_triggered",
              isAdmin: false,
            }).catch((e) => console.error("Email failed:", e));
          }
        }

        await sendSlack({
          emoji: ":rocket:",
          header: "Go-Live Triggered",
          body: `The project has officially gone live!`,
          clientName,
          projectName: payload.projectName,
          linkUrl: `${APP_URL}/dashboard/admin/projects/${payload.projectId}/go-live`,
        });
        break;
      }

      // ============================
      // USER ACCEPTED INVITE
      // ============================

      case "user_accepted_invite": {
        const adminRecipients = await resolveRecipients("admin");

        await createNotificationsForUsers({
          userIds: adminRecipients.map((r) => r.userId),
          type: "project_update",
          title: "New portal user",
          message: `${payload.userName} has joined ${payload.clientName} on the portal.`,
          linkUrl: `/dashboard/admin/clients`,
        });

        await sendSlack({
          emoji: ":wave:",
          header: "New Portal User",
          body: `${payload.userName} has joined the portal.`,
          clientName: payload.clientName,
          linkUrl: `${APP_URL}/dashboard/admin/clients`,
        });
        break;
      }
    }
  } catch (error) {
    console.error(`Notification failed for event "${payload.event}":`, error);
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`

Expected: Clean compile or only pre-existing warnings. No errors from `notify.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/notify.ts
git commit -m "feat: implement notifyEvent dispatcher with Slack, in-app, and email"
```

---

## Task 3: Refactor Discovery Routes

**Files:**
- Modify: `src/app/api/projects/[id]/discovery/submit/route.ts`
- Modify: `src/app/api/projects/[id]/discovery/review/route.ts`
- Modify: `src/app/api/projects/[id]/discovery/withdraw/route.ts`

- [ ] **Step 1: Refactor discovery submit**

Replace the entire notification block (lines ~71-106 in submit/route.ts) with a single call. The file should look like:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { discoveryResponses, projects } from "@/lib/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { notifyEvent } from "@/lib/notify";

// POST /api/projects/[id]/discovery/submit — Client submits questionnaire
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: projectId } = await params;

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
      .limit(1);

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (user.role === "client" && project.clientId !== user.clientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [existing] = await db
      .select()
      .from(discoveryResponses)
      .where(eq(discoveryResponses.projectId, projectId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "No discovery response found" },
        { status: 404 }
      );
    }

    if (existing.status !== "active") {
      return NextResponse.json(
        { error: "Discovery is not in a submittable state" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(discoveryResponses)
      .set({
        status: "in_review",
        submittedAt: new Date(),
        reviewNotes: null,
        updatedAt: new Date(),
      })
      .where(eq(discoveryResponses.id, existing.id))
      .returning();

    // Notify admins
    notifyEvent({
      event: "discovery_submitted",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
    });

    return NextResponse.json({
      ...updated,
      responses: JSON.parse(updated.responses),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

Key changes:
- Removed imports: `users`, `userNotifications`, `sendDiscoveryEmail`, `clerkClient`
- Added import: `notifyEvent` from `@/lib/notify`
- Replaced 35-line notification block with single `notifyEvent()` call (fire-and-forget, no `await`)

- [ ] **Step 2: Refactor discovery review**

Same pattern. Replace the notification block in review/route.ts with:

```typescript
// At top — update imports:
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { discoveryResponses, projects } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { notifyEvent } from "@/lib/notify";
```

Replace the notification block (after the DB update, before the return) with:

```typescript
    // Notify clients
    notifyEvent({
      event: "discovery_reviewed",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
      action: action as "approve" | "request_changes",
      reviewNotes: reviewNotes || undefined,
    });
```

Remove imports: `users`, `userNotifications`, `sendDiscoveryEmail`, `clerkClient`

- [ ] **Step 3: Refactor discovery withdraw**

Same pattern. Replace notification block with:

```typescript
    notifyEvent({
      event: "discovery_withdrawn",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
    });
```

Update imports the same way (remove `users`, `userNotifications`, `sendDiscoveryEmail`, `clerkClient`; add `notifyEvent`).

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: Successful build with no errors. Check that removed imports don't leave unused import warnings.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/projects/[id]/discovery/
git commit -m "refactor: use notifyEvent in discovery routes"
```

---

## Task 4: Refactor Mapping Routes

**Files:**
- Modify: `src/app/api/projects/[id]/mapping/submit/route.ts`
- Modify: `src/app/api/projects/[id]/mapping/review/route.ts`
- Modify: `src/app/api/projects/[id]/mapping/withdraw/route.ts`

- [ ] **Step 1: Refactor mapping submit**

Update imports: remove `users`, `userNotifications`, `sendMappingEmail`, `clerkClient`. Add `notifyEvent` from `@/lib/notify`.

Replace notification block with:

```typescript
    notifyEvent({
      event: "mapping_submitted",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
    });
```

- [ ] **Step 2: Refactor mapping review**

Update imports same way. Replace notification block with:

```typescript
    notifyEvent({
      event: "mapping_reviewed",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
      action: action as "approve" | "request_changes",
      reviewNotes: reviewNotes || undefined,
    });
```

- [ ] **Step 3: Refactor mapping withdraw**

Update imports. Replace notification block with:

```typescript
    notifyEvent({
      event: "mapping_withdrawn",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
    });
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: Successful build.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/projects/[id]/mapping/
git commit -m "refactor: use notifyEvent in mapping routes"
```

---

## Task 5: Refactor UAT Routes

**Files:**
- Modify: `src/app/api/projects/[id]/uat/submit/route.ts`
- Modify: `src/app/api/projects/[id]/uat/review/route.ts`
- Modify: `src/app/api/projects/[id]/uat/withdraw/route.ts`

- [ ] **Step 1: Refactor UAT submit**

This route has a helper function `notifyAdminsOfUatSubmission()`. Remove the entire helper function. Update imports (remove `users`, `userNotifications`, `sendUatEmail`, `clerkClient`; add `notifyEvent`).

Replace the call to the helper with:

```typescript
    // Calculate UAT summary for Slack rich detail
    const results = JSON.parse(uatResult.results || "{}");
    let passed = 0, failed = 0, na = 0;
    for (const val of Object.values(results) as { result?: string }[]) {
      if (val.result === "passed") passed++;
      else if (val.result === "failed") failed++;
      else na++;
    }

    notifyEvent({
      event: "uat_submitted",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
      passed,
      failed,
      na,
    });
```

Note: The variable names `uatResult` and `project` should match what already exists in the route. Read the file to confirm the exact variable names before editing.

- [ ] **Step 2: Refactor UAT review**

This route has a helper function `notifyClientsOfUatReview()`. Remove it. Update imports. Replace with:

```typescript
    notifyEvent({
      event: "uat_reviewed",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
      action: action as "approve" | "request_changes",
      reviewNotes: reviewNotes || undefined,
    });
```

- [ ] **Step 3: Refactor UAT withdraw**

Update imports. Replace notification block with:

```typescript
    notifyEvent({
      event: "uat_withdrawn",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
    });
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: Successful build.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/projects/[id]/uat/
git commit -m "refactor: use notifyEvent in UAT routes"
```

---

## Task 6: Refactor Bob Config Routes

**Files:**
- Modify: `src/app/api/projects/[id]/bob-config/submit/route.ts`
- Modify: `src/app/api/projects/[id]/bob-config/approve/route.ts`
- Modify: `src/app/api/projects/[id]/bob-config/withdraw/route.ts`

- [ ] **Step 1: Refactor bob-config submit**

Update imports (remove `users`, `userNotifications`, `sendBobConfigEmail`, `clerkClient`; add `notifyEvent`). Replace notification block with:

```typescript
    notifyEvent({
      event: "bob_config_submitted",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
    });
```

- [ ] **Step 2: Refactor bob-config approve**

This route handles both approve and changes_requested. Update imports. Replace notification block with:

```typescript
    if (action === "approve") {
      notifyEvent({
        event: "bob_config_approved",
        projectId,
        projectName: project.name,
        clientId: project.clientId,
        reviewNotes: reviewNotes || undefined,
      });
    } else {
      notifyEvent({
        event: "bob_config_changes_requested",
        projectId,
        projectName: project.name,
        clientId: project.clientId,
        reviewNotes: reviewNotes || undefined,
      });
    }
```

- [ ] **Step 3: Refactor bob-config withdraw**

Update imports. Replace notification block with:

```typescript
    notifyEvent({
      event: "bob_config_withdrawn",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
    });
```

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: Successful build.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/projects/[id]/bob-config/
git commit -m "refactor: use notifyEvent in bob-config routes"
```

---

## Task 7: Refactor Provisioning Routes

**Files:**
- Modify: `src/app/api/projects/[id]/provisioning/[stepId]/complete/route.ts`
- Modify: `src/app/api/projects/[id]/provisioning/[stepId]/verify/route.ts`

- [ ] **Step 1: Refactor provisioning complete**

Update imports (remove `users`, `userNotifications`, `sendProvisioningEmail`, `clerkClient`; add `notifyEvent`).

The route already computes `allClientDone` (whether all steps are complete). Replace the notification block with:

```typescript
    notifyEvent({
      event: "provisioning_step_completed",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
      stepName: step.title,
      allComplete: allClientDone,
    });
```

- [ ] **Step 2: Refactor provisioning verify**

Update imports. The route already checks if all steps are verified. Replace the notification block with:

```typescript
    notifyEvent({
      event: "provisioning_step_verified",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
      stepName: step.title,
      allVerified: allVerified,
    });
```

Note: The `notifyEvent` handler for `provisioning_step_verified` already handles the conditional logic — it always posts to Slack, but only notifies client users when `allVerified` is true. So the route just needs to pass the boolean.

- [ ] **Step 3: Verify build**

Run: `npm run build`

Expected: Successful build.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/projects/[id]/provisioning/
git commit -m "refactor: use notifyEvent in provisioning routes"
```

---

## Task 8: Refactor Flags Route

**Files:**
- Modify: `src/app/api/projects/[id]/flags/route.ts`

- [ ] **Step 1: Refactor the POST handler**

Update imports: remove `sendSlackNotification` from `@/lib/slack` and `clients` from schema (no longer needed — `notifyEvent` resolves client name internally). Add `notifyEvent` from `@/lib/notify`.

Replace the Slack notification block at the end of POST with:

```typescript
    if (type === "client_blocker") {
      notifyEvent({
        event: "client_flag_raised",
        projectId: id,
        projectName: project.name,
        clientId: project.clientId,
        flagMessage: message.trim(),
      });
    } else {
      notifyEvent({
        event: "admin_flag_raised",
        projectId: id,
        projectName: project.name,
        clientId: project.clientId,
        flagMessage: message.trim(),
      });
    }
```

Also remove the client name query block that was only used for Slack:
```typescript
    // DELETE THIS BLOCK:
    const [client] = await db
      .select({ companyName: clients.companyName })
      .from(clients)
      .where(eq(clients.id, project.clientId))
      .limit(1);
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/projects/[id]/flags/route.ts
git commit -m "refactor: use notifyEvent in flags route"
```

---

## Task 9: Refactor Messages Route

**Files:**
- Modify: `src/app/api/messages/route.ts`

- [ ] **Step 1: Refactor the POST handler**

Update imports: remove `notifyMessageReceived` from `@/lib/slack` and `notifyNewMessage` from `@/lib/notifications`. Add `notifyEvent` from `@/lib/notify`.

The messages route already has the sender's role and name available. Replace both the Slack and in-app notification calls with:

```typescript
    if (user.role === "client") {
      notifyEvent({
        event: "client_message_sent",
        projectId,
        projectName: project.name,
        clientId: project.clientId,
        senderName: senderName,
        messagePreview: content,
      });
    } else {
      notifyEvent({
        event: "admin_message_sent",
        projectId,
        projectName: project.name,
        clientId: project.clientId,
        senderName: senderName,
        messagePreview: content,
      });
    }
```

Note: Read the file first to confirm the exact variable names for sender name and message content. They may be `senderName`/`content` or similar.

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/messages/route.ts
git commit -m "refactor: use notifyEvent in messages route"
```

---

## Task 10: Refactor Go-Live Trigger Route

**Files:**
- Modify: `src/app/api/projects/[id]/go-live/trigger/route.ts`

- [ ] **Step 1: Refactor the POST handler**

This route has a `notifyGoLiveTriggered()` helper function. Remove the entire helper. Update imports (remove `users`, `userNotifications`, `sendGoLiveEmail`, `clerkClient`; add `notifyEvent`).

Replace the call to the helper with:

```typescript
    notifyEvent({
      event: "go_live_triggered",
      projectId,
      projectName: project.name,
      clientId: project.clientId,
    });
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/projects/[id]/go-live/trigger/route.ts
git commit -m "refactor: use notifyEvent in go-live trigger route"
```

---

## Task 11: Add Stage Advanced Notification

**Files:**
- Modify: `src/app/api/projects/[id]/stage/route.ts`

- [ ] **Step 1: Add notifyEvent call to the stage route**

This route currently has NO notifications. Add the import and a `notifyEvent` call after the DB update.

Add import at top:
```typescript
import { notifyEvent } from "@/lib/notify";
```

After the `db.update(projects)...returning()` call and before the return statement, add:

```typescript
    // Notify about stage change
    // Need client ID — fetch it
    const [fullProject] = await db
      .select({ clientId: projects.clientId, name: projects.name })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (fullProject) {
      notifyEvent({
        event: "stage_advanced",
        projectId: id,
        projectName: fullProject.name,
        clientId: fullProject.clientId,
        fromStage: project.currentStage,
        toStage: newStage!,
      });
    }
```

Note: The route already queries the project at the start, but only selects `id` and `currentStage`. We need `clientId` and `name` too. The simpler option is to update the initial select to include them:

Change the initial query from:
```typescript
      .select({ id: projects.id, currentStage: projects.currentStage })
```
to:
```typescript
      .select({ id: projects.id, currentStage: projects.currentStage, clientId: projects.clientId, name: projects.name })
```

Then the notify call simplifies to:
```typescript
    notifyEvent({
      event: "stage_advanced",
      projectId: id,
      projectName: project.name,
      clientId: project.clientId,
      fromStage: project.currentStage,
      toStage: newStage!,
    });
```

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/projects/[id]/stage/route.ts
git commit -m "feat: add stage advancement notifications to Slack and in-app"
```

---

## Task 12: Add User Accepted Invite Notification

**Files:**
- Modify: `src/app/api/invites/accept/route.ts`

- [ ] **Step 1: Add notifyEvent call to invite accept**

This route currently has NO notifications. Read the file first to understand its structure.

Add import at top:
```typescript
import { notifyEvent } from "@/lib/notify";
```

After the user is successfully created/updated and the invite is consumed, add:

```typescript
    // Notify about new user
    notifyEvent({
      event: "user_accepted_invite",
      clientId: invite.clientId,
      clientName: clientName, // resolve this from the invite or client table
      userName: userName, // from Clerk user data
    });
```

Note: Read the file to confirm what data is available. You'll likely need to:
1. Get the client name from the invite's client record
2. Get the user's name from the Clerk auth data already available in the route

The exact variable names depend on the route's implementation. Read before editing.

- [ ] **Step 2: Verify build**

Run: `npm run build`

Expected: Successful build.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/invites/accept/route.ts
git commit -m "feat: add invite accepted notifications to Slack and in-app"
```

---

## Task 13: Delete Old slack.ts

**Files:**
- Delete: `src/lib/slack.ts`

- [ ] **Step 1: Verify no remaining imports**

Run: `grep -r "from.*@/lib/slack" src/` or use Grep tool to search for any remaining imports of the old file.

Expected: No matches. All routes should now import from `@/lib/notify` instead.

If any remaining imports are found, update them first.

- [ ] **Step 2: Delete the file**

```bash
rm src/lib/slack.ts
```

- [ ] **Step 3: Clean up notifications.ts**

Check if any functions in `src/lib/notifications.ts` are now unused (e.g., `notifyNewMessage`, `notifyNewTicket`, `notifyTicketResponse`, `notifyNewClient`). These helpers were used by the old routes. The ticket-related ones (`notifyNewTicket`, `notifyTicketResponse`) may still be used by Freshdesk webhook routes.

Run: `grep -r "notifyNewMessage\|notifyNewTicket\|notifyTicketResponse\|notifyNewClient" src/app/`

Keep any functions still imported elsewhere. Remove only those with zero imports. The core helpers (`getAllAdminUserIds`, `getClientUserIds`, `createNotificationsForUsers`) must stay — `notify.ts` uses them.

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: Successful build with no missing import errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete dead slack.ts, clean up unused notification helpers"
```

---

## Task 14: Full Build Verification and Manual Test

- [ ] **Step 1: Clean build**

```bash
rm -rf .next && npm run build
```

Expected: Successful production build.

- [ ] **Step 2: Run dev server and test**

```bash
npm run dev
```

Test at least one event end-to-end:
1. Log in as a client user
2. Send a message on a project
3. Verify: Slack message appears in `#dd-portal-activity` with the correct format
4. Verify: In-app notification appears for admin users
5. Check console for any errors

- [ ] **Step 3: Commit any fixes**

If any issues were found and fixed during testing:

```bash
git add -A
git commit -m "fix: address issues found during Slack integration testing"
```

---

## Task 15: Update Changelog

**Files:**
- Modify: `src/lib/changelog.ts`

- [ ] **Step 1: Add changelog entry**

Prepend a new entry to the `CHANGELOG` array:

```typescript
  {
    id: "slack-integration",
    date: "2026-04-03",
    title: "Slack Integration",
    description: "Live portal activity notifications now post to Slack, keeping the DD team informed of client actions in real time.",
    audience: "admin",
    tags: ["feature"],
    items: [
      "All lifecycle stage events (discovery, mapping, UAT, provisioning, go-live) now post to Slack",
      "Client messages, flags, and new user signups trigger Slack notifications",
      "Unified notification service consolidates in-app, email, and Slack into a single call",
    ],
  },
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/changelog.ts
git commit -m "docs: add changelog entry for Slack integration"
```
