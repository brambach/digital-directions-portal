# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Digital Directions Portal is a custom-built HiBob implementation management portal for Digital Directions consulting company. This is **not a white-label solution** - it's purpose-built and single-tenant for Digital Directions. All branding and customization happens at the code level.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Clerk auth, Vercel Postgres, Drizzle ORM, UploadThing

**Brand Colors:** Purple (`#7C1CFF` — official DD Violet 5) is the primary brand color. All accent colors, buttons, links, and interactive elements use purple, not blue. Do not use `#8B5CF6` — that was the old placeholder.

> **⚠️ Major Revamp In Progress:** This portal is undergoing a full lifecycle revamp per `DD-PORTAL-2026-IMPLEMENTATION-PLAN.md`. Read that file before making significant architectural changes. Key decisions: support hours system is being removed, Freshdesk will replace the current ticket backend, the project phase system is being expanded to a 9-stage lifecycle, and the entire UI is moving to light mode.

## Development Commands

```bash
# Development
npm run dev                 # Start dev server with Turbopack
npm run build              # Build for production
npm run start              # Start production server
npm run lint               # Run ESLint

# Database
npm run db:push            # Push schema to database (no migrations)
npm run db:generate        # Generate migrations from schema
npm run db:migrate         # Generate + push (full migration)
npm run db:seed            # Seed database with Digital Directions data
npm run db:studio          # Open Drizzle Studio GUI (localhost:4983)
npm run db:reset           # Drop all tables, recreate, and reseed (dev only)

# User Management
npm run make-admin <email> # Grant admin role to user by email
npm run cleanup-users      # Remove orphaned users (not in Clerk)
```

## Architecture Overview

### Authentication & Authorization

**Clerk Integration:**
- Clerk is the **source of truth** for user profile data (email, name, avatar)
- Database only stores: `clerkId`, `role`, `agencyId`/`clientId`
- User metadata synced via webhook at `/api/webhooks/clerk`
- Role stored in Clerk's public metadata AND database (database is source of truth for role)

**Role-Based Access:**
- Two roles: `admin` (DD staff) and `client` (client company users)
- Middleware (`src/middleware.ts`) enforces route protection:
  - `/dashboard/admin/*` → admins only
  - `/dashboard/client/*` → clients only
  - Auto-redirects based on role
- Auth helpers in `src/lib/auth.ts`:
  - `getCurrentUser()` - Get DB user record
  - `requireAuth()` - Require any authenticated user
  - `requireAdmin()` - Require admin role

### Database Architecture

**Single-Tenant Design:**
- One `agencies` record (Digital Directions)
- Multiple `clients` (client companies like "Meridian Healthcare")
- Multiple `users` per client (multi-user support)
- Projects belong to clients
- Files and messages belong to projects

**Key Tables:**
- `users` - Minimal (clerkId, role, agencyId/clientId only)
- `agencies` - Digital Directions record (name, logo, primaryColor)
- `clients` - Client companies (status: active/inactive/archived) + support hours tracking
- `projects` - HiBob integration projects (5 statuses) + phase tracking
- `files` - File metadata (actual files in UploadThing)
- `messages` - Project messaging between DD and clients
- `tickets` - Support tickets with Slack integration + time tracking
- `ticketComments` - Ticket conversation thread (internal notes supported)
- `ticketTimeEntries` - Detailed time logging per ticket
- `invites` - Email invitations for new users (7-day expiry)
- `clientActivity` - Engagement tracking
- `supportHourLogs` - Historical monthly support hours tracking
- `integrationMonitors` - Per-project integration health monitoring
- `integrationMetrics` - Historical health check data
- `integrationAlerts` - Alert history and acknowledgment
- `userNotifications` - In-app notification system
- `phaseTemplates` - Reusable project phase templates
- `templatePhases` - Phases within a template
- `projectPhases` - Actual phases on projects

**Soft Deletes:**
All tables have `deletedAt` timestamp. Use `isNull(deletedAt)` in queries. Only clients can be **permanently** deleted (with confirmation dialog).

**Cascade Deletes:**
Deleting a client cascades to: projects → files, messages, tickets

### Multi-User per Client

Clients can have multiple portal users (e.g., HR Director + Payroll Manager):
- Users link to `clientId` in database
- All users from same client see same projects/files
- Invite additional users via "Invite User" button on client detail page
- User count shown on client cards

### Route Structure

```
/                           # Public homepage
/sign-in, /sign-up          # Clerk auth pages
/invite/[token]             # Accept invite (creates account + assigns role/client)

/dashboard                  # Auto-redirects to /admin or /client based on role

/dashboard/admin/*          # Admin pages (DD staff only)
  /admin                    # Overview dashboard
  /admin/clients            # Client list with user counts
  /admin/clients/[id]       # Client detail (projects, portal users, activity, support hours)
  /admin/projects           # All projects across clients
  /admin/projects/[id]      # Project detail (files, messages, integrations, phases)
  /admin/tickets            # Support ticket queue
  /admin/tickets/[id]       # Ticket detail with comments and time entries
  /admin/settings           # Admin settings (phase templates, etc.)

/dashboard/client/*         # Client pages (client users only)
  /client                   # Client overview
  /client/projects          # Projects for this client
  /client/projects/[id]     # Project detail (files, messages, integrations - read-only)
  /client/tickets           # Tickets submitted by this client
  /client/tickets/[id]      # Ticket detail with comments
```

### API Routes

All API routes require authentication. Most require specific roles.

**Client Management:**
- `POST /api/clients` - Create client (admin only, auto-associates with DD agency)
- `PUT /api/clients/[id]` - Update client details (companyName, contactName, contactEmail, status)
- `PATCH /api/clients/[id]/status` - Update status: active/inactive/archived
- `DELETE /api/clients/[id]` - Permanent delete with cascade

**Invites:**
- `POST /api/invites` - Create invite (admin only, sends email via Resend)
- `POST /api/invites/validate` - Validate token (public)
- `POST /api/invites/accept` - Accept invite after Clerk signup (public)

**Projects:**
- `POST /api/projects` - Create project (admin only)
- `PUT /api/projects/[id]` - Update project details
- `DELETE /api/projects/[id]` - Soft delete project

**Project Phases:**
- `GET /api/projects/[id]/phases` - Get all phases for a project
- `POST /api/projects/[id]/phases` - Add custom phase (admin only)
- `PUT /api/projects/[id]/phases/[phaseId]` - Update phase
- `DELETE /api/projects/[id]/phases/[phaseId]` - Delete phase
- `POST /api/projects/[id]/phases/apply-template` - Apply phase template to project
- `POST /api/projects/[id]/phases/reorder` - Reorder phases

**Phase Templates:**
- `GET /api/phase-templates` - List all templates
- `POST /api/phase-templates` - Create template (admin only)
- `PUT /api/phase-templates/[id]` - Update template
- `DELETE /api/phase-templates/[id]` - Delete template

**Files:**
- `POST /api/files` - Upload file (via UploadThing)
- `DELETE /api/files/[id]` - Delete file

**Messages:**
- `GET /api/messages?projectId=xxx` - Get messages for project
- `POST /api/messages` - Send message

**Tickets:**
- `GET /api/tickets` - List tickets (filtered by role/client)
- `POST /api/tickets` - Create ticket
- `PUT /api/tickets/[id]` - Update ticket
- `POST /api/tickets/[id]/assign` - Assign ticket to user
- `POST /api/tickets/[id]/resolve` - Resolve ticket
- `GET /api/tickets/[id]/comments` - Get comments
- `POST /api/tickets/[id]/comments` - Add comment

**Ticket Time Tracking:**
- `GET /api/tickets/[id]/time` - Get time entries for ticket
- `POST /api/tickets/[id]/time` - Log time entry (deducts from client hours)
- `PUT /api/tickets/[id]/time/[entryId]` - Update time entry
- `DELETE /api/tickets/[id]/time/[entryId]` - Delete time entry

**Support Hours:**
- `GET /api/clients/[id]/support-hours` - Get support hours status
- `PATCH /api/clients/[id]/support-hours` - Update allocation (admin only)
- `GET /api/clients/[id]/support-hours/logs` - Get historical logs

**Integration Monitoring:**
- `GET /api/integrations` - List integration monitors (filtered by projectId/clientId)
- `POST /api/integrations` - Create integration monitor (admin only)
- `GET /api/integrations/[id]` - Get integration details
- `PUT /api/integrations/[id]` - Update integration monitor
- `DELETE /api/integrations/[id]` - Delete integration monitor
- `GET /api/integrations/[id]/metrics` - Get health check history
- `GET /api/integrations/[id]/status` - Get current status

**Notifications:**
- `GET /api/notifications` - Get user's notifications
- `POST /api/notifications/read-all` - Mark all as read
- `POST /api/notifications/[id]/read` - Mark single as read

**Cron Jobs:**
- `GET /api/cron/check-integrations` - Check all enabled integration monitors (secured with CRON_SECRET)

### Integration Monitoring System

**Architecture:**
Integration monitoring is implemented at the **project level** (not client level) since integrations vary per project. Monitors track the health of external services through status pages and optional API checks.

**Supported Integrations:**
- **HiBob** - Status page monitoring only (https://status.hibob.io)
- **KeyPay** - Status page monitoring only (https://status.keypay.com.au)
- **Workato** - Status page + basic recipe list check (requires credentials)
- **ADP** - Status page monitoring (placeholder implementation)
- **NetSuite** - Status page monitoring (https://status.netsuite.com)

**How It Works:**
1. Admins configure integration monitors on project detail pages
2. Monitors can be enabled/disabled and configured with check intervals (default: 5 minutes)
3. Vercel Cron job runs every 5 minutes checking all enabled monitors
4. Health checks fetch status pages using Atlassian Statuspage API format
5. Results stored in `integrationMetrics` table for historical tracking
6. Status changes trigger alerts (email + in-app notifications)
7. Clients can view integration health on their project pages (read-only)

**Status Page Monitoring:**
All integrations use public status pages that follow Atlassian Statuspage format:
- Fetch `https://status.{service}.com/api/v2/summary.json`
- Parse overall status indicator (none/minor/major/critical/maintenance)
- Extract active incidents (name, impact, status, timestamps)
- Map to portal statuses: healthy, degraded, down, unknown

**Workato Special Case:**
In addition to status page monitoring, Workato supports basic recipe list checking:
- Requires API token and email (stored encrypted)
- Fetches `/api/recipes` endpoint
- Counts total recipes, running recipes, stopped recipes
- If >30% of recipes are stopped, status marked as "degraded"
- No detailed RecipeOps job statistics (simplified from original design)

**Credential Encryption:**
Workato credentials are encrypted using AES-256-GCM (optional, requires `CREDENTIALS_ENCRYPTION_KEY`):
```typescript
import { encryptCredentials, decryptCredentials } from "@/lib/crypto";

// When saving
const encrypted = encryptCredentials({ apiToken, email });
await db.update(integrationMonitors).set({ workatoCredentials: encrypted });

// When reading
const credentials = decryptCredentials(monitor.workatoCredentials);
```

**Alert System:**
Monitors have configurable alerting:
- **Threshold**: Minimum downtime before alerting (default: 15 minutes)
- **Channels**: Email + in-app notifications
- **Alert Types**: Down, degraded, recovered
- **Recipients**: Client contact email + all client users + all admin users
- Anti-flapping: Won't re-alert within threshold period

**Health Check Flow:**
```typescript
// Cron job (/api/cron/check-integrations)
1. Fetch all enabled monitors
2. Check if due for check (based on checkIntervalMinutes)
3. Call appropriate health checker (hibob.ts, keypay.ts, workato.ts, etc.)
4. Update integrationMonitors with new status
5. Insert metric record in integrationMetrics
6. Check if alert should be sent (via alert-manager.ts)
7. Send email + create in-app notifications if needed
```

**UI Components:**
- `IntegrationManagementSection` - Admin interface for managing monitors
- `ConfigureIntegrationDialog` - Create/edit integration monitors
- `IntegrationHealthGrid` - Client-facing status display
- `IntegrationHealthCard` - Individual integration details
- `IntegrationStatusBadge` - Color-coded status indicator

**Key Files:**
- `src/lib/integrations/types.ts` - TypeScript types
- `src/lib/integrations/status-pages.ts` - Status page parsers
- `src/lib/integrations/hibob.ts` - HiBob health checker
- `src/lib/integrations/keypay.ts` - KeyPay health checker
- `src/lib/integrations/workato.ts` - Workato health checker
- `src/lib/integrations/adp.ts` - ADP health checker
- `src/lib/integrations/netsuite.ts` - NetSuite health checker
- `src/lib/integrations/alert-manager.ts` - Alert triggering logic
- `src/lib/crypto.ts` - Credential encryption utilities
- `src/app/api/cron/check-integrations/route.ts` - Cron job endpoint

**Environment Variables:**
```env
CRON_SECRET=your-secret-here  # Secure cron endpoint
CREDENTIALS_ENCRYPTION_KEY=64-char-hex  # Optional, for Workato credentials
```

**Vercel Cron Configuration:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-integrations",
      "schedule": "*/5 * * * *"  // Every 5 minutes
    }
  ]
}
```

### Project Phases System

**Purpose:**
Track project progress through standardized phases (e.g., Planning → Configuration → Testing → Go-Live). Phases can be managed using reusable templates or custom phases per project.

**Architecture:**
- **Phase Templates** (`phaseTemplates`) - Reusable phase definitions (e.g., "Standard HiBob Implementation")
- **Template Phases** (`templatePhases`) - Individual phases within a template
- **Project Phases** (`projectPhases`) - Actual phases applied to a project

**Phase Statuses:**
- `pending` - Not yet started
- `in_progress` - Currently active
- `completed` - Finished
- `skipped` - Bypassed

**Key Features:**
1. **Apply Templates** - Quickly set up project phases using predefined templates
2. **Custom Phases** - Add project-specific phases beyond template
3. **Reorder Phases** - Drag-and-drop reordering (via orderIndex)
4. **Phase Tracking** - Mark phases as in-progress/completed with timestamps
5. **Current Phase** - Projects track their current phase (stored in `currentPhaseId`)

**UI Components:**
- `ProjectPhaseStepper` - Visual progress indicator
- `ProjectPhaseManager` - Admin interface for managing project phases
- `ManageProjectPhasesDialog` - Edit phases dialog
- `SelectPhaseTemplateDialog` - Choose template to apply
- `PhaseTemplateList` - List of available templates (admin settings)
- `ManagePhaseTemplateDialog` - Create/edit templates
- `UpdatePhaseDialog` - Update individual phase status
- `PhaseStatusBadge` - Color-coded status indicator

**Workflow:**
1. Admin creates phase template in settings (or uses existing)
2. When creating project, admin can apply a template
3. Template phases are copied to project as project phases
4. Admin can add custom phases or edit template-generated phases
5. As project progresses, admin updates phase statuses
6. Phase stepper shows visual progress to clients

### Support Hours Tracking

**Purpose:**
Track monthly support hour allocations and usage for client retainer agreements. Integrates with ticket time tracking to automatically deduct hours.

**Architecture:**
- Stored in minutes (converted to hours for display)
- Monthly billing cycles (customizable start date)
- Historical logs for past periods
- Auto-deduction when logging ticket time

**Client Fields:**
- `supportHoursPerMonth` - Allocated minutes per month
- `hoursUsedThisMonth` - Minutes used in current billing period
- `supportBillingCycleStart` - When current billing period started

**Features:**
1. **Set Allocation** - Admin sets monthly hours (converted to minutes)
2. **Track Usage** - Auto-increments when time logged to tickets
3. **Visual Indicator** - Progress bar showing used/remaining hours
4. **Historical Logs** - Archive each billing period in `supportHourLogs`
5. **Overage Alerts** - Visual warning when exceeding allocation

**Time Entry Flow:**
```typescript
// When logging time to a ticket
1. Admin logs time entry (minutes + description)
2. If countTowardsSupportHours = true:
   - Add minutes to ticket.timeSpentMinutes
   - Add minutes to client.hoursUsedThisMonth
3. Time entry stored in ticketTimeEntries table
4. Support hours card shows updated usage
```

**UI Components:**
- `SupportHoursCard` - Display allocation and usage
- `EditSupportHoursDialog` - Set monthly allocation
- `LogTimeDialog` - Log time to ticket
- `TimeEntriesList` - Show time entry history

**Key Routes:**
- `GET /api/clients/[id]/support-hours` - Get current status
- `PATCH /api/clients/[id]/support-hours` - Update allocation
- `GET /api/clients/[id]/support-hours/logs` - Get historical logs
- `POST /api/tickets/[id]/time` - Log time entry

### In-App Notification System

**Purpose:**
Real-time notifications for users about integration alerts, ticket updates, and other events. Notifications appear in a bell icon in the top navigation.

**Features:**
- Bell icon with unread count badge
- Dropdown panel showing recent notifications
- Click notification to navigate to related content
- Mark individual or all notifications as read
- Auto-refresh every 30 seconds

**Notification Types:**
- `integration_alert` - Integration status changes
- `ticket_update` - Ticket assignments, comments, status changes
- `message` - New project messages
- `file_upload` - New files uploaded

**How It Works:**
1. System events create records in `userNotifications` table
2. Notifications created for relevant users (e.g., all admins + client users)
3. `NotificationBell` component polls `/api/notifications` endpoint
4. Unread count shown in badge
5. Clicking notification marks as read and navigates to `linkUrl`

**UI Component:**
- `NotificationBell` - Bell icon with dropdown panel (in TopNav)

**Key Routes:**
- `GET /api/notifications` - Get user's notifications
- `POST /api/notifications/read-all` - Mark all as read
- `POST /api/notifications/[id]/read` - Mark single as read

### Ticket System

**Purpose:**
Support ticket management with assignment, time tracking, commenting, and resolution workflows.

**Ticket Types:**
- `general_support` - General help requests
- `project_issue` - Project-specific problems
- `feature_request` - Enhancement requests
- `bug_report` - Bug reports

**Ticket Statuses:**
- `open` - New unassigned ticket
- `in_progress` - Assigned and being worked on
- `waiting_on_client` - Waiting for client response
- `resolved` - Fixed but not yet closed
- `closed` - Completed

**Ticket Priorities:**
- `low` - Can wait
- `medium` - Normal priority
- `high` - Important
- `urgent` - Needs immediate attention

**Key Features:**
1. **Claim/Assignment** - Admins can claim tickets (assign to themselves) or assign to other admins
2. **Unclaim** - Only the admin who claimed a ticket can unclaim it (returns to `open` status)
3. **Time Tracking** - Log time entries to tickets, optionally deducting from client support hours
4. **Comments** - Thread of comments, supports internal notes (hidden from clients)
5. **Resolution** - Mark as resolved with resolution summary
6. **Slack Integration** - Notifications sent to Slack for new tickets, assignments, etc.

**Assignment Flow:**
```typescript
// Claim ticket (POST /api/tickets/[id]/assign with no assignedTo)
- Sets assignedTo to current user
- Changes status to "in_progress"
- Sends Slack notification

// Assign to another admin (POST /api/tickets/[id]/assign with assignedTo)
- Sets assignedTo to specified admin user
- Changes status to "in_progress"
- Sends Slack notification

// Unclaim ticket (DELETE /api/tickets/[id]/assign)
- Clears assignedTo and assignedAt
- Changes status back to "open"
- Only allowed if ticket is currently assigned
```

**UI Components:**
- `TicketCard` - Individual ticket display
- `CreateTicketDialog` - New ticket form
- `TicketActions` - Claim/unclaim/assign buttons
- `TicketCommentForm` - Add comments
- `LogTimeDialog` - Log time entries
- `TimeEntriesList` - Show time history
- `TicketStatusBadge` - Color-coded status indicator

### Invite System

Invite-only portal - no public signup:
- Admins invite team members → role="admin"
- Admins invite clients → role="client" + linked to clientId
- Invites sent via email (Resend) with 7-day expiry
- Tokens are cryptographically secure (32 bytes)
- After signup, role auto-synced to Clerk metadata
- `/sign-up` shows "invitation only" page if accessed directly

### Optional Integrations

**Email (Resend):**
- Invite emails
- Ticket notifications
- Set `RESEND_API_KEY` and `EMAIL_FROM`

**Slack:**
- Real-time notifications for tickets, messages, file uploads
- Set `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID`

**Freshdesk (Sprint 10 of revamp):**
- Will REPLACE the current custom ticket system as the backend
- Portal UI remains; Freshdesk handles data/workflows for DD team
- Clients never see "Freshdesk" — they use the portal as normal
- Blocked until Freshdesk account confirmed with Jack

All integrations are optional - portal works without them.

## Key Patterns & Conventions

### Querying with Soft Deletes

Always filter out soft-deleted records:

```typescript
import { isNull } from "drizzle-orm";

const activeClients = await db
  .select()
  .from(clients)
  .where(isNull(clients.deletedAt));
```

### Getting User Data

```typescript
import { getCurrentUser } from "@/lib/auth";

// In API routes
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// In server components
const user = await requireAdmin(); // throws if not admin
const user = await requireAuth();  // throws if not authenticated
```

### Multi-User Queries

When a client has multiple users, query by `clientId`:

```typescript
const clientUsers = await db
  .select()
  .from(users)
  .where(and(eq(users.clientId, clientId), isNull(users.deletedAt)));
```

### Creating New Users

New users are created via invite system only. When invite is accepted:
1. User signs up with Clerk
2. `/api/invites/accept` creates DB user record
3. Role synced to Clerk public metadata
4. User linked to client (if client invite)

### Agency Association

All admins and clients belong to the Digital Directions agency:
- When creating clients, API auto-finds DD agency if user.agencyId is null
- Single-tenant architecture - only one agency record should exist

## Branding & Styling

**Colors:**
- Primary: `#7C1CFF` (DD Violet 5) — all buttons, links, active states. CSS var: `--primary: 265 100% 56%`
- Background: `#F4F5F9` (page), `#FFFFFF` (cards)
- Status badges: Green (active), Gray (inactive), Red (archived/overdue)
- Ticket priorities: Gray (low), Blue (medium), Orange (high), Red (urgent)

**Diji Mascot:**
- Bear mascot named Diji. 7 variants in `/public/images/digi/`: neutral, peeking, construction, celebrating, thinking, confused, sleeping
- Component: `src/components/diji-mascot.tsx` — `<DijiMascot variant="neutral" size="sm" />`
- Use in: sidebar footer, empty states, locked lifecycle stages, go-live celebration, help centre

**CSS Variables:**
Theme colors defined in `src/app/globals.css` using HSL values. Primary and accent set to purple.

**Shadcn UI:**
Components in `src/components/ui/` use CSS variables for theming. Don't hardcode colors in Shadcn components.

## UI Component Patterns

### Button Standardization

**All buttons use the Shadcn Button component** (`src/components/ui/button.tsx`):
- **Never use raw `<button>` elements** - always use `<Button>` component
- **Primary actions**: Default variant (purple background, white text, rounded-full)
- **Secondary/Cancel**: Outline variant (white background, purple border)
- **Destructive actions**: Destructive variant (red background)
- **Consistent styling**: All buttons use `rounded-full`, `font-semibold`, purple accent colors

```typescript
// Primary action button
<Button type="submit" disabled={loading}>
  {loading ? "Creating..." : "Create Client"}
</Button>

// Cancel/secondary button
<Button type="button" variant="outline" onClick={() => setOpen(false)}>
  Cancel
</Button>

// Destructive button
<Button variant="destructive" onClick={handleDelete}>
  Delete
</Button>

// Icon button
<Button variant="outline" size="sm">
  <Pencil className="w-4 h-4 mr-2" />
  Edit
</Button>
```

**Dialog pattern**: All dialogs use consistent button layout with Cancel (outline) on left, Primary action on right.

**Updated components**: All dialog components follow this pattern (add-client-dialog, create-ticket-dialog, edit-project-dialog, etc.)

### Layout Patterns

**Client Detail Page** (`/admin/clients/[id]`):
- Projects section: Full width at top
- Sidebar cards (Portal Users, Support Hours, Activity): 2-column grid below projects
- Pending Invites: Full width if present
- Pattern maximizes horizontal space usage and reduces vertical scrolling

**Project Detail Page** (`/admin/projects/[id]` and `/client/projects/[id]`):
- Three-column layout on large screens
- Sidebar (1 column): Details card + Messages section (order-2 on mobile, order-1 on desktop)
- Main content (2 columns): Files section + Integrations section (order-1 on mobile, order-2 on desktop)
- Mobile: Main content first, then sidebar
- Desktop: Sidebar left, main content right
- Reduced spacing (`space-y-5`) for tighter layout

```typescript
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Sidebar */}
  <div className="space-y-4 order-2 lg:order-1">
    {/* Details card */}
    {/* Messages Section */}
  </div>

  {/* Main Content */}
  <div className="lg:col-span-2 space-y-5 order-1 lg:order-2">
    {/* Files Section */}
    {/* Integrations Section */}
  </div>
</div>
```

**Responsive grid**:
```typescript
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Cards span 1 column each */}
  {/* Last card can span 2 columns if needed with lg:col-span-2 */}
</div>
```

### Portal User Display

When showing portal users for a client, **always fetch and display user names from Clerk**:

```typescript
// Fetch DB users
const portalUsers = await db
  .select({ id: users.id, clerkId: users.clerkId })
  .from(users)
  .where(eq(users.clientId, clientId));

// Enrich with Clerk data
const portalUsersWithDetails = await Promise.all(
  portalUsers.map(async (user) => {
    try {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(user.clerkId);
      return {
        ...user,
        name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Unknown User",
        email: clerkUser.emailAddresses[0]?.emailAddress || "No email",
      };
    } catch (error) {
      return { ...user, name: "Unknown User", email: "No email" };
    }
  })
);
```

**Don't show**: User IDs like "User ID: user_38EPM..."
**Do show**: "John Smith" with email

### File Upload Component

Custom file uploader (`src/components/file-uploader.tsx`) uses:
- Hidden file input
- Button component with `asChild` pattern wrapped in label
- `useUploadThing` hook for upload functionality
- Consistent purple button styling

```typescript
<label>
  <input type="file" multiple className="hidden" onChange={handleFileChange} />
  <Button type="button" disabled={isUploading} asChild>
    <span className="cursor-pointer">
      <Upload className="w-4 h-4" />
      {isUploading ? "Uploading..." : "Upload Files"}
    </span>
  </Button>
</label>
```

### Tooltip Z-Index

Tooltips use `z-[9999]` to ensure they appear above all content including file panels and sticky headers.

## Notification Pattern (Required for All Sprints)

**Rule:** Whenever an action changes state for the other role (admin→client or client→admin), you MUST:

1. **Create an in-app notification** — Insert a `userNotifications` record for all affected users
2. **Send an email via Resend** — Lightweight email that drives users back to the portal

**When to notify:**
- Admin advances/locks a lifecycle stage → notify client users
- Client submits a form (discovery, UAT, etc.) → notify admin users
- Admin approves or requests changes → notify client users
- Flag raised (either direction) → notify the other side
- Admin creates "Request Client Input" flag → notify client users
- Stage-specific events (provisioning step verified, mapping approved, etc.)

**Email format:**
Keep emails short — don't put sensitive project details in the email body. Just drive them to the portal:
```
Subject: New update on {Project Name}
Body: You have a new update on your project "{Project Name}" — {brief description}.
      Log in to view: {portal URL}
```

**Implementation:**
```typescript
import { db } from "@/lib/db";
import { userNotifications } from "@/lib/db/schema";
import { sendNotificationEmail } from "@/lib/email"; // use existing Resend setup

// Create in-app notification
await db.insert(userNotifications).values({
  userId: targetUser.id,
  type: "stage_update",  // or ticket_update, message, file_upload, etc.
  title: "Discovery questionnaire submitted",
  message: "Meridian Healthcare submitted their discovery responses for review.",
  linkUrl: `/dashboard/admin/projects/${projectId}/discovery`,
});

// Send email notification
await sendNotificationEmail({
  to: targetUser.email,
  projectName: project.name,
  message: "A discovery questionnaire has been submitted for your review.",
  linkUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/admin/projects/${projectId}/discovery`,
});
```

**NotificationBell component** exists at `src/components/notification-bell.tsx` and should be rendered in both admin and client headers/shells.

## Common Pitfalls

1. **Don't store user profile data in DB** - Email, name, avatar come from Clerk. Use Clerk's `clerkClient.users.getUser(clerkId)` or the user object from `useUser()` hook.

2. **Always check deletedAt** - Forgetting `isNull(deletedAt)` will show deleted records.

3. **Role is in Clerk metadata AND database** - Database is source of truth. Middleware reads from Clerk for performance. After updating role in DB, sync to Clerk metadata.

4. **Agency linking** - Don't assume user.agencyId exists. APIs should auto-find Digital Directions agency if null.

5. **Multi-user clients** - Don't link users one-to-one with clients. Multiple users can share the same clientId.

6. **Permanent vs soft delete** - Only clients support permanent delete. Everything else uses soft delete.

7. **Integration monitoring is project-level** - Don't create integration monitors at client level. Each project can have its own set of integration monitors since integrations vary per project.

8. **HiBob status page URL** - Use `https://status.hibob.io` (NOT `.com`). This is a critical detail for the status page checker.

9. **Support hours are stored in minutes** - Always convert to/from hours for display. Database stores everything in minutes for precision.

10. **Time entries auto-deduct from client balance** - When logging time with `countTowardsSupportHours: true`, it automatically updates both `ticket.timeSpentMinutes` and `client.hoursUsedThisMonth`. Don't manually update both.

11. **Cron endpoint security** - The `/api/cron/check-integrations` endpoint is public in middleware but protected by `CRON_SECRET` in the route handler. Always set this env var in production.

12. **Workato credentials encryption** - If `CREDENTIALS_ENCRYPTION_KEY` is not set, credentials are stored in plaintext. Always set this in production environments.

## File Locations Reference

**Core:**
- **Schema:** `src/lib/db/schema.ts`
- **Seed data:** `src/lib/db/seed.ts`
- **Auth helpers:** `src/lib/auth.ts`
- **Middleware:** `src/middleware.ts`
- **Types:** `src/lib/types.ts`
- **Utilities:** `src/lib/utils.ts`
- **Error handling:** `src/lib/errors.ts`

**UI Components:**
- **Shadcn UI components:** `src/components/ui/`
- **Dialogs/Forms:** `src/components/*.tsx`
- **Layout components:** `src/components/layout/`

**Pages:**
- **Admin pages:** `src/app/(dashboard)/dashboard/admin/`
- **Client pages:** `src/app/(dashboard)/dashboard/client/`
- **Public pages:** `src/app/` (homepage, invite acceptance)

**API Routes:**
- **All routes:** `src/app/api/`
- **Cron jobs:** `src/app/api/cron/`
- **Webhooks:** `src/app/api/webhooks/`

**Integration Monitoring:**
- **Types:** `src/lib/integrations/types.ts`
- **Status pages:** `src/lib/integrations/status-pages.ts`
- **Health checkers:** `src/lib/integrations/{service}.ts`
- **Alert manager:** `src/lib/integrations/alert-manager.ts`
- **Encryption:** `src/lib/crypto.ts`

**External Services:**
- **Email (Resend):** `src/lib/email.ts`
- **Slack:** `src/lib/slack.ts`
- **UploadThing:** `src/lib/uploadthing.ts`, `src/app/api/uploadthing/`

## Environment Variables

Required for development:
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Database
POSTGRES_URL=postgresql://xxx
POSTGRES_URL_NON_POOLING=postgresql://xxx

# File Upload
UPLOADTHING_SECRET=sk_live_xxx
UPLOADTHING_APP_ID=xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

Optional integrations:
```env
# Email (Resend)
RESEND_API_KEY=re_xxx
EMAIL_FROM=Digital Directions <notifications@yourdomain.com>

# Slack notifications
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_CHANNEL_ID=C0XXX

# Integration monitoring
CRON_SECRET=your-random-secret-here
CREDENTIALS_ENCRYPTION_KEY=64-char-hex-string  # Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Future integrations
LINEAR_API_KEY=lin_api_xxx
LINEAR_TEAM_ID=xxx
```
