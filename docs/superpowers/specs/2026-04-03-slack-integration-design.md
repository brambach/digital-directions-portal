# Slack Integration Design — Unified Notification Service

**Date:** 2026-04-03
**Author:** Bryce + Claude
**Status:** Approved

## Problem

The DD Portal has no working Slack integration. The existing `src/lib/slack.ts` is dead code — ticket-focused notifications that were never connected to a real Slack workspace. Meanwhile, notification logic (in-app + email) is scattered across ~15 API routes as inline code blocks (manual user queries, loops, individual inserts). This makes it easy to forget notifications when adding features and hard to add new channels.

## Solution

A **Unified Notification Service** (`src/lib/notify.ts`) that replaces both the dead Slack code and consolidates the scattered inline notification logic. Each API route calls a single `notifyEvent(...)` function, which handles all three channels:

1. **In-app notifications** — `userNotifications` records (existing behavior, consolidated)
2. **Email via Resend** — lightweight emails driving users to the portal (existing behavior, consolidated)
3. **Slack messages** — new, posted to a single `#dd-portal-activity` channel for the DD team

## Architecture

### Core Function

```typescript
// src/lib/notify.ts

export async function notifyEvent(payload: PortalEvent): Promise<void>
```

Internally:
1. `switch` on `payload.event` to resolve recipients, notification content, Slack format, and email params
2. Batch-insert in-app notifications via `createNotificationsForUsers()` (from existing `notifications.ts`)
3. Post a single Slack Block Kit message via `@slack/web-api`
4. Send emails via Resend (using existing email helpers)
5. All three channels are fire-and-forget — wrapped in `try/catch` with `console.error`. A Slack failure never blocks a portal action.

### Event Type

```typescript
type PortalEvent =
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
  | { event: "provisioning_step_completed"; projectId: string; projectName: string; clientId: string; stepName: string }
  | { event: "provisioning_step_verified"; projectId: string; projectName: string; clientId: string; stepName: string }
  | { event: "client_flag_raised"; projectId: string; projectName: string; clientId: string; flagMessage: string }
  | { event: "admin_flag_raised"; projectId: string; projectName: string; clientId: string; flagMessage: string }
  | { event: "client_message_sent"; projectId: string; projectName: string; clientId: string; senderName: string; messagePreview: string }
  | { event: "admin_message_sent"; projectId: string; projectName: string; clientId: string; senderName: string; messagePreview: string }
  | { event: "stage_advanced"; projectId: string; projectName: string; clientId: string; fromStage: string; toStage: string }
  | { event: "go_live_triggered"; projectId: string; projectName: string; clientId: string }
  | { event: "user_accepted_invite"; clientId: string; clientName: string; userName: string }
```

## Event Catalog

### Client → Admin events

These fire when a client takes action. Admins get in-app notifications + email. Slack message posted to channel.

| Event | Slack Header | Emoji | Rich Detail |
|---|---|---|---|
| `discovery_submitted` | Discovery Submitted | :blue_book: | No |
| `discovery_withdrawn` | Discovery Withdrawn | :blue_book: | No |
| `mapping_submitted` | Mapping Submitted | :world_map: | No |
| `mapping_withdrawn` | Mapping Withdrawn | :world_map: | No |
| `uat_submitted` | UAT Results Submitted | :test_tube: | Pass/fail/NA counts |
| `uat_withdrawn` | UAT Withdrawn | :test_tube: | No |
| `bob_config_submitted` | Bob Config Submitted | :gear: | No |
| `bob_config_withdrawn` | Bob Config Withdrawn | :gear: | No |
| `provisioning_step_completed` | Provisioning Step Completed | :white_check_mark: | Step name |
| `client_flag_raised` | Client Flag Raised | :triangular_flag_on_post: | Flag message text |
| `client_message_sent` | New Client Message | :speech_balloon: | First 200 chars |
| `user_accepted_invite` | New Portal User | :wave: | User name + client |

### Admin → Client events

These fire when an admin takes action. Client users get in-app notifications + email. Slack message also posted for DD team visibility.

| Event | Slack Header | Emoji | Rich Detail |
|---|---|---|---|
| `discovery_reviewed` | Discovery Reviewed | :blue_book: | Approved or changes requested |
| `mapping_reviewed` | Mapping Reviewed | :world_map: | Approved or changes requested |
| `uat_reviewed` | UAT Reviewed | :test_tube: | Approved or changes requested |
| `bob_config_approved` | Bob Config Approved | :gear: | No |
| `bob_config_changes_requested` | Bob Config — Changes Requested | :gear: | Review notes if present |
| `stage_advanced` | Stage Advanced | :arrow_forward: | From → To stage names |
| `admin_flag_raised` | Input Requested | :raised_hand: | Flag message text |
| `provisioning_step_verified` | Provisioning Step Verified | :white_check_mark: | Step name |
| `go_live_triggered` | Go-Live Triggered | :rocket: | No |
| `admin_message_sent` | New Message Sent | :speech_balloon: | First 200 chars |

## Slack Message Format

All messages use Slack Block Kit with a consistent structure:

```
:blue_book: *Discovery Submitted*
Meridian Healthcare — PKF Melbourne Integration

The discovery questionnaire has been submitted for review.

[View in Portal →]
```

### Block structure:
1. **Section block** — Emoji + bold header + newline + body text
2. **Context block** — Client name + Project name (gray, smaller text)
3. **Actions block** — "View in Portal" link button (points to admin URL since only DD team is in Slack)

For rich-detail events, the body text includes the extra context:
- UAT: "8 passed, 1 failed, 2 N/A"
- Flags: the flag message text (truncated to 300 chars)
- Messages: preview text (truncated to 200 chars)
- Provisioning: the step name
- Stage advanced: "Discovery → Provisioning"
- Reviews: "Approved" or "Changes requested" + review notes if present

### Emoji mapping:

| Category | Emoji |
|---|---|
| Discovery | :blue_book: |
| Mapping | :world_map: |
| UAT | :test_tube: |
| Bob Config | :gear: |
| Provisioning | :white_check_mark: |
| Flag (client) | :triangular_flag_on_post: |
| Flag (admin) | :raised_hand: |
| Message | :speech_balloon: |
| New user | :wave: |
| Stage advanced | :arrow_forward: |
| Go-live | :rocket: |

For review events, emoji depends on action: :white_check_mark: for approved, :leftwards_arrow_with_hook: for changes requested.

## File Changes

### New files:
- `src/lib/notify.ts` — Unified notification service

### Modified files (~15 API routes):
Each route's inline notification block (user queries, notification inserts, email loops) gets replaced with a single `notifyEvent(...)` call.

Routes to refactor:
- `src/app/api/projects/[id]/discovery/submit/route.ts`
- `src/app/api/projects/[id]/discovery/review/route.ts`
- `src/app/api/projects/[id]/discovery/withdraw/route.ts`
- `src/app/api/projects/[id]/mapping/submit/route.ts`
- `src/app/api/projects/[id]/mapping/review/route.ts`
- `src/app/api/projects/[id]/mapping/withdraw/route.ts`
- `src/app/api/projects/[id]/uat/submit/route.ts`
- `src/app/api/projects/[id]/uat/review/route.ts`
- `src/app/api/projects/[id]/uat/withdraw/route.ts`
- `src/app/api/projects/[id]/bob-config/submit/route.ts`
- `src/app/api/projects/[id]/bob-config/approve/route.ts`
- `src/app/api/projects/[id]/bob-config/withdraw/route.ts`
- `src/app/api/projects/[id]/provisioning/[stepId]/complete/route.ts`
- `src/app/api/projects/[id]/provisioning/[stepId]/verify/route.ts`
- `src/app/api/projects/[id]/flags/route.ts`
- `src/app/api/messages/route.ts`
- `src/app/api/projects/[id]/go-live/trigger/route.ts`
- `src/app/api/invites/accept/route.ts` (for user_accepted_invite)
- `src/app/api/projects/[id]/stage/route.ts` (stage advancement — `stage_advanced` event)

### Deleted files:
- `src/lib/slack.ts` — replaced entirely by `notify.ts`

### Unchanged files:
- `src/lib/notifications.ts` — helper functions (`getAllAdminUserIds`, `getClientUserIds`, `createNotificationsForUsers`) are imported by `notify.ts`
- `src/lib/email.ts` and stage-specific email senders — called by `notify.ts`
- `@slack/web-api` package — already installed

## Environment Variables

No new variables needed. Existing vars just need real values:

```env
SLACK_BOT_TOKEN=xoxb-xxx    # Bot token from Slack app
SLACK_CHANNEL_ID=C0XXX       # Channel ID for #dd-portal-activity
```

## Slack App Setup

Before this works, a Slack app needs to be created in the DD workspace:
1. Create app at api.slack.com/apps
2. Add `chat:write` bot scope
3. Install to workspace
4. Invite bot to `#dd-portal-activity` channel
5. Copy bot token → `SLACK_BOT_TOKEN`
6. Copy channel ID → `SLACK_CHANNEL_ID`

## Error Handling

All notification channels are fire-and-forget:
- If Slack is not configured (`SLACK_BOT_TOKEN` missing), silently skip with a console.log
- If Slack API fails, log the error and continue — never block the portal action
- Same for email failures — log and continue
- In-app notification failures are also caught and logged

## Testing

- Manual testing: set up Slack app, trigger each event type, verify message format
- Unit: `notifyEvent` can be tested by mocking the Slack client, DB, and email sender
- Each refactored route should behave identically from the client's perspective — same API responses, same in-app notifications, now with Slack as a bonus
