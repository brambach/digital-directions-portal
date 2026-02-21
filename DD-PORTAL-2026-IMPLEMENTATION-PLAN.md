# DD Portal 2026 — Implementation Plan

> **Status:** Draft — February 2026
> **Author:** Bryce (Digital Directions Integration Team)
> **Scope:** Full revamp of the DD Client Portal into a complete HiBob integration lifecycle platform

---

## Table of Contents

1. [Vision Summary](#1-vision-summary)
2. [Key Decisions](#2-key-decisions)
3. [Current State Assessment](#3-current-state-assessment)
4. [What Gets Deleted](#4-what-gets-deleted)
5. [What Gets Kept](#5-what-gets-kept)
6. [Database Schema Changes](#6-database-schema-changes)
7. [Design System](#7-design-system)
8. [The 9 Lifecycle Stages — Feature Specs](#8-the-9-lifecycle-stages--feature-specs)
9. [New Shared Components](#9-new-shared-components)
10. [Freshdesk Integration](#10-freshdesk-integration)
11. [Post-Revamp Cleanup](#11-post-revamp-cleanup)
11. [The Diji Mascot](#11-the-diji-mascot)
12. [Route Map](#12-route-map)
13. [Build Sequence](#13-build-sequence)
14. [Open Questions](#14-open-questions)

---

## 1. Vision Summary

The portal becomes a **full lifecycle platform** — guiding both Digital Directions staff and clients through every stage of a HiBob integration project, from deal close to ongoing support.

**The core UX promise:** A client logs in and immediately knows exactly where they are, what they need to do next, and what happens after that. No spreadsheets. No email threads. No confusion.

**The admin UX promise:** A DD specialist can manage multiple client lifecycles simultaneously, see what needs attention, action their queue, and push clients forward — all from one place.

---

## 2. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Roles | Keep 2: `admin` + `client` | Simpler to build and maintain. Integration Specialists get full admin access. |
| MVP scope | All 9 stages at once | Build the complete lifecycle; design and functionality in one pass. |
| Ticket system | Replace with Freshdesk backend | Portal UI remains, Freshdesk handles the data/workflows for DD team. |
| UAT sign-off | Formal in-app (no third-party e-signature) | Multi-step confirmation with written acknowledgement. Feels legally significant without DocuSign cost/complexity. |
| Data mapping MVP | KeyPay only | 1 discovery template per payroll system; expand to MYOB, Deputy etc. later. |
| Support hours | Remove entirely | Every client gets "standard support" — no monthly allocation system needed. |
| Primary purple | `#7C1CFF` (Violet 5) ✅ | Official DD Violet scale confirmed. Replaces current `#8B5CF6` everywhere. |
| SOW sign-off | External — not in portal | SOW + Integration Limitation handled outside the portal (email/PDF). Stage 1 does not need a sign-off step. ✅ |
| HiBob API keys | Encrypted on project record ✅ | Same pattern as existing Workato credentials (`crypto.ts`). Admin enters per project. |
| Discovery questions | Port from existing workbook ✅ | Use current workbook discovery tab as the base; restructure for guided portal UX. |
| UAT scenarios | Port from existing workbook ✅ | Use "6.1 UAT Checklist & Signoff" as the base. Bryon's reference. |

---

## 3. Current State Assessment

### What works well (keep the approach)
- Auth: Clerk SSO + invite-only access — solid foundation
- DB: Drizzle ORM + Vercel Postgres — keep, just evolve the schema
- File uploads: UploadThing — keep as-is
- Notifications: In-app bell + Resend + Slack — keep all three channels
- Integration monitoring: The cron-based health checker is good; minor client-side change needed (only show relevant systems per project)
- Admin dashboard: New light mode design (Feb 2026) — keep this as the baseline aesthetic

### What's functionally incomplete / needs heavy rework
- Project phases: The stepper exists but isn't wired to the 7-stage lifecycle model
- Client dashboard: Currently very sparse — needs to become the guided onboarding hub
- Tickets: Solid UI but needs to become a thin wrapper over Freshdesk
- Project detail pages: Need to surface stage-specific content (questionnaire, mapping tool, UAT checklist)

### What exists but should be removed
- Support hours system — entire feature (monthly allocation, tracking, deduction)
- All dark mode styling remnants across the codebase
- The `ticketTimeEntries` table (time tracking moves to Freshdesk)

---

## 4. What Gets Deleted

### Database Tables (full removal)
- `supportHourLogs` — monthly billing history
- `ticketTimeEntries` — time logging per ticket (Freshdesk handles this)

### Database Columns (partial removal)
```
clients:
  - supportHoursPerMonth
  - hoursUsedThisMonth
  - supportBillingCycleStart

tickets:
  - timeSpentMinutes
  - countTowardsSupportHours (via ticketTimeEntries)
```

### UI Components
- `SupportHoursCard`
- `EditSupportHoursDialog`
- `LogTimeDialog` (time tracking variant)
- `TimeEntriesList`

### API Routes
- `GET/PATCH /api/clients/[id]/support-hours`
- `GET /api/clients/[id]/support-hours/logs`
- `GET/POST/PUT/DELETE /api/tickets/[id]/time`

### Styling
- All `bg-[#0B0E14]`, `bg-[#0F1219]`, `text-white` dark mode classes across the codebase (replace as each page is migrated to light mode)

---

## 5. What Gets Kept

### Infrastructure (unchanged)
- Clerk auth, webhook, middleware
- Drizzle ORM + Vercel Postgres
- UploadThing file handling
- Resend email
- Slack notifications
- Vercel cron for integration monitoring

### Database Tables (kept, some modified)
- `users`, `agencies`, `clients`, `projects`
- `files`, `messages`
- `invites`
- `clientActivity`
- `integrationMonitors`, `integrationMetrics`, `integrationAlerts`
- `userNotifications`
- `phaseTemplates`, `templatePhases`, `projectPhases` (repurposed for 9-stage lifecycle)
- `tickets` (modified, becomes thin wrapper over Freshdesk)
- `ticketComments` (keep, sync with Freshdesk)

### UI Components (keep as-is or minor updates)
- All Shadcn UI base components (`/components/ui/`)
- `NotificationBell`
- `ProjectPhaseStepper` (will enhance significantly)
- `TicketStatusBadge`, `TicketCard`, `TicketActions`
- `FileUploader`
- `InviteUserDialog`, `CreateTicketDialog`

---

## 6. Database Schema Changes

### New Tables

#### `discoveryTemplates`
```sql
id              uuid PK
payrollSystem   text  -- 'keypay' | 'myob' | 'deputy' | 'generic'
name            text
sections        jsonb -- array of { title, description, loomUrl, questions[] }
version         int
isActive        bool
createdAt       timestamp
updatedAt       timestamp
deletedAt       timestamp
```

#### `discoveryResponses`
```sql
id              uuid PK
projectId       uuid FK projects.id
templateId      uuid FK discoveryTemplates.id
responses       jsonb -- { questionId: answer }
status          text  -- 'draft' | 'submitted' | 'in_review' | 'approved' | 'changes_requested'
submittedAt     timestamp
reviewedAt      timestamp
reviewedBy      uuid FK users.id
reviewNotes     text
createdAt       timestamp
updatedAt       timestamp
```

#### `provisioningSteps`
```sql
id              uuid PK
projectId       uuid FK projects.id
stepKey         text  -- 'workato' | 'hibob' | 'keypay' | etc.
title           text
description     text
loomUrl         text
completedAt     timestamp
completedBy     uuid FK users.id  -- client user
verifiedAt      timestamp
verifiedBy      uuid FK users.id  -- admin
orderIndex      int
createdAt       timestamp
```

#### `bobConfigChecklist`
```sql
id              uuid PK
projectId       uuid FK projects.id
items           jsonb -- array of checklist items with loomUrl, faqItems, completedAt
status          text  -- 'pending' | 'in_progress' | 'submitted' | 'approved'
submittedAt     timestamp
approvedAt      timestamp
approvedBy      uuid FK users.id
createdAt       timestamp
```

#### `dataMappingConfigs`
```sql
id              uuid PK
projectId       uuid FK projects.id
payrollSystem   text  -- 'keypay' for MVP
status          text  -- 'draft' | 'submitted' | 'in_review' | 'approved'
submittedAt     timestamp
approvedAt      timestamp
approvedBy      uuid FK users.id
exportedAt      timestamp  -- when CSV was exported
createdAt       timestamp
updatedAt       timestamp
```

#### `dataMappingEntries`
```sql
id              uuid PK
configId        uuid FK dataMappingConfigs.id
category        text  -- 'leave_types' | 'locations' | 'pay_periods' | 'pay_frequencies' | 'employment_contracts' | 'pay_categories' | 'termination_reasons'
hibobValue      text  -- value from HiBob
payrollValue    text  -- target value in payroll system
orderIndex      int
createdAt       timestamp
updatedAt       timestamp
```

#### `uatTemplates`
```sql
id              uuid PK
payrollSystem   text
name            text
scenarios       jsonb -- array of { id, title, description, loomUrl, steps[] }
isActive        bool
createdAt       timestamp
```

#### `uatResults`
```sql
id              uuid PK
projectId       uuid FK projects.id
templateId      uuid FK uatTemplates.id
results         jsonb -- { scenarioId: 'passed' | 'failed' | 'na', notes, ticketId }
status          text  -- 'in_progress' | 'submitted' | 'in_review' | 'approved'
submittedAt     timestamp
reviewedAt      timestamp
reviewedBy      uuid FK users.id
createdAt       timestamp
updatedAt       timestamp
```

#### `signoffs`
```sql
id              uuid PK
projectId       uuid FK projects.id
type            text  -- 'build_spec' | 'uat' | 'go_live'
signedByClient  uuid FK users.id
signedAt        timestamp
clientConfirmText text  -- what they typed to confirm
ddCounterSignedBy uuid FK users.id
ddCounterSignedAt timestamp
documentSnapshot  jsonb  -- snapshot of what they signed off on
createdAt       timestamp
```

#### `releaseNotes`
```sql
id              uuid PK
projectId       uuid FK projects.id
phaseId         uuid FK projectPhases.id
title           text
content         text
publishedAt     timestamp
publishedBy     uuid FK users.id
createdAt       timestamp
updatedAt       timestamp
```

#### `clientFlags`
```sql
id              uuid PK
projectId       uuid FK projects.id
raisedBy        uuid FK users.id
type            text  -- 'client_input_needed' | 'client_blocker'
message         text
resolvedAt      timestamp
resolvedBy      uuid FK users.id
createdAt       timestamp
```

#### `helpArticles`
```sql
id              uuid PK
title           text
slug            text UNIQUE
content         text  -- markdown
category        text
loomUrl         text
publishedAt     timestamp
createdAt       timestamp
updatedAt       timestamp
deletedAt       timestamp
```

#### `goLiveEvents`
```sql
id              uuid PK
projectId       uuid FK projects.id
celebratedAt    timestamp
syncStats       jsonb  -- { employeesSync'd, recordsCreated, etc. }
celebrationShownTo jsonb -- array of userIds who saw the confetti
```

### Modified Tables

#### `projects` — add columns
```sql
currentStage    text  -- 'pre_sales' | 'discovery' | 'provisioning' | 'bob_config' | 'mapping' | 'build' | 'uat' | 'go_live' | 'support'
payrollSystem   text  -- 'keypay' | 'myob' | 'deputy' | 'generic'
hibobApiKey     text  -- encrypted
payrollApiKey   text  -- encrypted
goLiveDate      date
supportActivatedAt timestamp
```

#### `clients` — remove support hours columns
```sql
-- REMOVE:
supportHoursPerMonth
hoursUsedThisMonth
supportBillingCycleStart

-- ADD:
freshdeskId     text  -- Freshdesk company ID
```

#### `tickets` — add Freshdesk columns
```sql
freshdeskId     text  -- Freshdesk ticket ID
freshdeskUrl    text  -- link to Freshdesk ticket
```

---

## 7. Design System

### Colors (Official DD Violet Scale)
```css
--dd-violet-1:   #E5D2FF;  /* Very light tints */
--dd-violet-3:   #B077FF;  /* Hover states, light backgrounds */
--dd-violet-4:   #9649FF;  /* Icons, secondary accent */
--dd-violet-5:   #7C1CFF;  /* PRIMARY — buttons, links, active states */
--dd-violet-6:   #6316CC;  /* Pressed states, darker accent */
--dd-violet-7:   #4A1199;  /* Deep emphasis, headings */
--dd-plum-4:     #C979FF;  /* Complementary accent */
```

### Tailwind mapping
Update `globals.css` CSS variables to align with official DD palette:
- `--primary` → Violet 5 (`#7C1CFF`)
- `--ring` → Violet 5
- Active sidebar states → Violet 1 bg + Violet 6 text

### Layout principles
- Page background: `#F4F5F9` (already set on admin shell)
- Cards: `bg-white` + `border border-slate-100` + subtle `shadow-sm`
- Round edges: `rounded-2xl` for cards, `rounded-xl` for inner elements, `rounded-lg` for buttons
- Font: Geist (already set) — no change needed

### Pages still needing light mode migration
After admin dashboard is done (Feb 2026), the following need migrating:

| Page | Current State | Action |
|------|--------------|--------|
| `client-shell.tsx` | Dark | Migrate to light |
| `client-sidebar.tsx` | Dark | Migrate to light |
| `client-header.tsx` | Dark | Migrate to light |
| `/admin/clients` | Dark-tinted | Migrate |
| `/admin/clients/[id]` | Dark-tinted | Migrate |
| `/admin/projects` | Dark-tinted | Migrate |
| `/admin/projects/[id]` | Dark-tinted | Migrate |
| `/admin/tickets` | Dark-tinted | Migrate |
| `/admin/tickets/[id]` | Dark-tinted | Migrate |
| `/admin/settings` | Dark-tinted | Migrate |
| `/client/*` | Dark | Migrate all |

### Global progress bar component
A new shared component for the top of every project view:

```
[ Pre-Sales ✓ ] [ Discovery ✓ ] [ Mapping ● ] [ Build ○ ] [ UAT ○ ] [ Go-Live ○ ] [ Support ○ ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━▓░░░░░░░░░░░░░░░░░░░░  35% Complete
```

Both admin and client see this on the project detail page. Stages link to their respective sections.

---

## 8. The 9 Lifecycle Stages — Feature Specs

### Stage 1 — Pre-Sales / CRM

**Admin actions:**
- Create new client (existing)
- Create new project, select payroll system, assign to client
- Set initial `currentStage = 'pre_sales'`
- Invite client users (existing)

**Client actions:**
- None (they're not in the portal yet at this stage)

**Unlock criteria:** Admin manually advances to Stage 2 (Discovery)

---

### Stage 2 — Discovery / Requirements

**Admin actions:**
- Select discovery template for the project's payroll system
- Review submitted responses, leave review notes
- Request changes or approve → advance to Stage 3

**Client actions:**
- Guided questionnaire with section headers, descriptions, and embedded Loom videos
- Save progress and return later
- Submit completed questionnaire for admin review

**UI:**
- Sections presented one at a time (wizard-style) or as a scrollable form with section anchors
- Progress tracker: "4 of 6 sections complete"
- Loom video expander before each section
- Admin review view shows responses side-by-side with the original questions
- Review notes shown to client as inline comments

**Unlock criteria:** Admin approves discovery responses

---

### Stage 3 — System Provisioning

**Admin actions:**
- Configure provisioning checklist for this project (which systems need provisioning)
- Verify each step is correctly completed

**Client actions:**
- Watch embedded Loom for each step
- Mark each step as complete
- Can ask questions (creates a message or ticket)

**UI:**
- Checklist with Loom video accordion per item
- Status: "Pending → Client Done → Admin Verified"
- Overall status badge

**Unlock criteria:** All steps admin-verified

---

### Stage 4 — HiBob Configuration

**Admin actions:**
- Review and approve HiBob config

**Client actions:**
- Go through checklist of HiBob configuration requirements
- Embedded FAQ, info panels, Loom videos for each item
- Mark as complete and submit

**Unlock criteria:** Admin approves

---

### Stage 5 — Data Mapping

**Admin actions:**
- Review submitted mappings, flag issues, approve
- Export CSV (Workato format) when approved

**Client actions:**
- See HiBob values on left, payroll values on right
- Drag/select to create mappings
- Guided by Loom videos per category
- Submit for admin review

**Mapping categories (MVP — KeyPay):**
1. Leave Types
2. Locations
3. Pay Periods
4. Pay Frequencies
5. Employment Contracts
6. Pay Categories
7. Termination Reasons

**Data source:** HiBob values pulled via HiBob API (requires API key stored on project). Payroll values pulled via KeyPay API or entered manually for MVP.

**Rules:**
- Many HiBob values → one payroll value ✓
- One HiBob value → many payroll values ✗

**CSV export format:** Matches Workato lookup table import format (Bryce to define exact columns when building)

**Unlock criteria:** Admin approves and exports CSV

---

### Stage 6 — Integration Build

**Admin actions:**
- Manage project phases (existing, enhanced)
- Write release notes per phase (published to client)
- Flag when client input is needed → triggers notification
- Resolve client flags
- Advance phases manually

**Client actions:**
- View build progress (read-only phase stepper)
- See release notes as phases complete ("Here's what we built this week")
- Raise a flag / "big red button" if something is wrong
- Message via project chat (existing)

**Sign-off:** After build is complete, admin shares a "Build Spec" summary. Client reviews and signs off (formal in-app confirmation). This prevents scope creep on minor user profile / mapping changes.

**Unlock criteria:** Admin marks build complete + client Build Spec sign-off

---

### Stage 7 — UAT & Sign-Off

**Admin actions:**
- Assign UAT template to project
- Review submitted results
- Validate and counter-sign

**Client actions:**
- Work through scenario checklist (watch Loom, test, mark result)
- Mark each scenario: ✅ Passed / ❌ Failed / ⬜ N/A
- Failed scenarios: create ticket inline (goes to Freshdesk)
- When complete: submit for review
- Final sign-off: multi-step confirmation
  1. "I confirm all test scenarios have been completed"
  2. Show summary of what's agreed (results, any open issues)
  3. Require typed confirmation: type "I approve"
  4. Button: "Submit Sign-Off"

**DD counter-sign:** Admin reviews and counter-signs within the portal

**Additional sign-off points:**
1. **SOW + Integration Limitation** — at project kickoff (may already exist outside portal)
2. **Build Spec Sheet** — end of Stage 6
3. **UAT Sign-off** — end of Stage 7

**Unlock criteria:** Both client sign-off + DD counter-sign complete

---

### Stage 8 — Go-Live

**Three sub-stages:** `pre_go_live` → `going_live` → `post_go_live`

#### Pre-Go-Live
- Dual checklist: DD items + client items
- Items include: credential updates, API key refresh, final employee mapping, test run
- Both sides must complete their items before Go-Live

#### Go-Live
- Admin triggers "Switch to production"
- First sync runs, data validated
- When confirmed working → **Champagne Moment**:
  - Full-screen celebration overlay (confetti animation)
  - Success stats: "X employees synced, Y records created"
  - Congratulations message with Diji (happy variant)
  - "Your integration is now live!"
  - Both admin and client see this

#### Post-Go-Live
- Monitoring period begins (integration health monitoring already exists)
- Extended health check (suggest 48-72 hours, not just 24)
- Guided tour of the support portal for client
- Support package activates
- Project formally marked as `status = 'completed'`, `currentStage = 'support'`

---

### Stage 9 — Ongoing Support

**New additions to existing foundation:**

#### Freshdesk Integration (see Section 10)
Portal tickets are a thin UI over Freshdesk

#### Help Centre
- Route: `/dashboard/client/help` and `/dashboard/admin/help`
- Knowledge base articles (markdown content)
- Loom video library organized by topic
- Searchable FAQ
- Admin can create/edit articles

#### Reporting Dashboards (admin)
- Ticket analytics: volume, resolution time, client trends
- Integration uptime: historical charts per project
- Support trends over time
- Note: opportunity for creative, non-standard dashboard UI per Jack's direction

#### ROI Calculator
- Conservative, project-level calculation
- Show: hours saved per pay cycle, cost per integration vs manual effort
- Quarterly distribution to clients
- Admin configures values; clients see read-only output

#### Connector Library
- Browse integrations DD offers
- Each integration card: name, description, status (available / coming soon)
- "Interested" button → creates a new deal/enquiry (could ping Slack or create a form submission)

---

## 9. New Shared Components

### `<LifecycleStepper />` (Server component)
Shows the current stage and all 9 stages. Used at the top of every project detail page (both admin and client). Clicking a stage navigates to that section of the project.

```tsx
// Props
{
  projectId: string
  currentStage: string
  stages: { key: string; label: string; status: 'locked' | 'active' | 'review' | 'complete' }[]
}
```

### `<StageCard />` (Client component)
Wrapper for each stage's content in the project detail view. Shows stage header, status badge, lock/unlock state, and action buttons.

### `<LoomEmbed />` (Client component)
Lazy-loading Loom video embed. Shows thumbnail with play button until user clicks. Takes a Loom URL, extracts the video ID, and renders `<iframe>`.

### `<DiscoveryForm />` (Client component)
Multi-section wizard form for client discovery. Saves to `discoveryResponses` via API. Section-by-section navigation, progress indicator, save & resume.

### `<MappingTool />` (Client component)
Visual data mapping interface. Left column: HiBob values. Right column: payroll dropdown select. Category tabs at top. Real-time validation.

### `<UatChecklist />` (Client component)
Scenario-by-scenario checklist. Loom video accordion per scenario. Result selector (Passed/Failed/N/A). Failed → inline ticket creation.

### `<SignoffModal />` (Client component)
Multi-step sign-off flow:
1. Show summary of what's being signed off on
2. Checkbox: "I have read and understand the above"
3. Text input: type "I CONFIRM" to proceed
4. Submit button → creates `signoffs` record

### `<CelebrationOverlay />` (Client component)
Full-screen go-live celebration. Canvas confetti (use `canvas-confetti` package). Diji happy image. Stats display. Dismissible.

### `<ReleaseNote />`
Admin writes, client reads. Shows per-phase. Timestamp + author.

### `<ClientFlagButton />` (Client component)
The "big red button" for clients to raise a flag mid-build. Creates a `clientFlags` record and sends Slack notification to admin.

### `<DdFlagBanner />` (Admin/Client)
When admin flags client input needed, shows a prominent banner at the top of the project for the client.

---

## 10. Freshdesk Integration

### Architecture
- Freshdesk is the **backend** for all ticket data
- Portal DB stores a thin `tickets` record with `freshdeskId` reference
- Creating a ticket in the portal → creates in Freshdesk, stores the ID
- Comments sync bidirectionally (portal comment → Freshdesk note, Freshdesk agent reply → portal)
- Portal UI remains the client interface; DD team works in Freshdesk

### API routes to update
- `POST /api/tickets` → create in Freshdesk, store `freshdeskId` in DB
- `GET /api/tickets` → pull from Freshdesk by contact/company, cache in DB
- `POST /api/tickets/[id]/comments` → add note in Freshdesk, sync to DB
- `PUT /api/tickets/[id]` → update status/priority in Freshdesk + DB

### Webhook
- Freshdesk → our portal webhook when ticket is updated by DD agent
- Update DB record, trigger in-app notification to client

### Environment variables needed
```env
FRESHDESK_DOMAIN=digitaldirections.freshdesk.com
FRESHDESK_API_KEY=your-api-key
FRESHDESK_WEBHOOK_SECRET=your-webhook-secret
```

### What to tell clients
Clients never see the word "Freshdesk". They submit and view tickets in the portal as normal.

---

## 11. The Diji Mascot

### Usage guide
| Context | Variant |
|---------|---------|
| Stages not yet active (locked) | Under Construction / Sleeping |
| Welcome / loading states | Neutral |
| Discovery / guided sections | Working / Thinking |
| Error states | Confused |
| Go-live celebration | Happy / Celebrating |
| Empty states (no tickets, all clear) | Happy |
| Something needs attention | Slightly worried |

### Implementation
- Store variants in `/public/images/mascot/diji-[variant].png`
- Create `<DijiMascot variant="happy" size="sm|md|lg" />` component
- Use in: empty states, locked stages, go-live celebration, help centre landing

### How to create the transparent PNG
1. Generate the image via Midjourney, DALL-E, or similar — ask for the character **on a plain white background**
2. Run it through **remove.bg** (free, one-click background removal) — works extremely well for illustration-style characters
3. Save as PNG with transparency
4. Export multiple variants (happy, working, confused, sleeping, celebrating) using the same base character for consistency

### Placement ideas
| Placement | How it works | Best variant |
|-----------|--------------|-------------|
| **Peeking over a card edge** | Position Diji absolutely below the card with `overflow: hidden` clipping — only the top of the head/ears peeks above the card border. Very charming. | Neutral / curious |
| **Empty state companion** | Diji standing beside the empty state message ("No tickets! You're all caught up") | Happy |
| **Go-live celebration** | Full character centred on the overlay, confetti raining around it | Celebrating |
| **Locked stage cards** | Small Diji in the corner of the locked content area | Sleeping / waiting |
| **Sidebar footer** | Tiny Diji waving at the very bottom of the sidebar | Neutral / waving |
| **Help centre landing** | Diji in a "thinking" pose next to the search bar | Working / thinking |

### Current status
Assets done ✅ — all 7 variants processed and saved to `/public/images/digi/`. Component built at `src/components/diji-mascot.tsx`.

### TODO — Wire Diji into the UI
These placements are ready to implement now that assets exist:

- [ ] **Admin sidebar footer** — replace the `© 2025 Digital Directions` text with a small Diji (`neutral`, `xs` size) sitting above it. First visible placement, shows on every page.
- [ ] **Empty states** — anywhere a "no results" message exists (no tickets, no projects, no clients), add Diji (`neutral` or `celebrating`) beside the message.
- [ ] **Locked lifecycle stage cards** — when a stage is locked/not yet active, show Diji (`sleeping`, `sm` size) in the corner.
- [ ] **Go-live celebration overlay** — Diji (`celebrating`, `xl` size) centred with confetti around it.
- [ ] **Help centre landing page** — Diji (`thinking`, `md` size) beside the search bar.

---

## 12. Route Map

### Admin routes (new / updated)
```
/dashboard/admin                    # Dashboard (done ✓)
/dashboard/admin/clients            # Client list
/dashboard/admin/clients/[id]       # Client detail
/dashboard/admin/projects           # All projects
/dashboard/admin/projects/[id]      # Project detail → lifecycle stages
  /dashboard/admin/projects/[id]/discovery
  /dashboard/admin/projects/[id]/provisioning
  /dashboard/admin/projects/[id]/bob-config
  /dashboard/admin/projects/[id]/mapping
  /dashboard/admin/projects/[id]/build
  /dashboard/admin/projects/[id]/uat
  /dashboard/admin/projects/[id]/go-live
/dashboard/admin/tickets            # Ticket queue (Freshdesk-backed)
/dashboard/admin/tickets/[id]       # Ticket detail
/dashboard/admin/help               # Help centre admin (create/edit articles)
/dashboard/admin/settings           # Settings, phase templates, etc.
```

### Client routes (new / updated)
```
/dashboard/client                   # Client overview dashboard (major revamp)
/dashboard/client/projects          # Projects for this client
/dashboard/client/projects/[id]     # Project detail → guided lifecycle view
  /dashboard/client/projects/[id]/discovery
  /dashboard/client/projects/[id]/provisioning
  /dashboard/client/projects/[id]/bob-config
  /dashboard/client/projects/[id]/mapping
  /dashboard/client/projects/[id]/build
  /dashboard/client/projects/[id]/uat
  /dashboard/client/projects/[id]/go-live
/dashboard/client/tickets           # Support tickets
/dashboard/client/tickets/new       # Submit ticket
/dashboard/client/tickets/[id]      # Ticket detail
/dashboard/client/help              # Help centre (read-only)
/dashboard/client/help/[slug]       # Help article
```

---

## 13. Build Sequence

Since we're building everything at once, here's the recommended order to minimise rework. Each sprint should leave the portal in a shippable state.

**Model guide:**
- **Opus** — Use for sprints requiring high design judgment, novel architecture, or complex multi-file coordination. Worth the cost.
- **Sonnet** — Use for well-defined, mechanical work (schema changes, CRUD routes, page migrations following an established pattern). Faster and cheaper.

**Standing requirement for all sprints (Sprint 4+):**
- **Notifications:** Every state change that affects the other role (admin↔client) must trigger an in-app notification (`userNotifications` insert) AND a lightweight email via Resend driving the user back to the portal. See CLAUDE.md "Notification Pattern" for implementation details.
- **NotificationBell:** Must be visible in both admin and client UI. If missing, re-wire it.

---

### Sprint 1 — Foundation & Design System
> **Model: Opus** — Sets the visual language for the entire portal. Design decisions made here cascade everywhere. Worth the extra quality.

**Goal:** Everything is light mode. The design language is consistent everywhere.
- Migrate `client-shell`, `client-sidebar`, `client-header` to light mode
- Migrate all remaining admin sub-pages to light mode (`/admin/clients`, `/admin/projects`, `/admin/tickets`, `/admin/settings`)
- Migrate all client pages to light mode
- Update CSS variables to official DD Violet palette (`#7C1CFF` primary)
- Wire Diji into sidebar footer + any existing empty states
- Create `<LifecycleStepper />` component (visual only, static)
- Create `<LoomEmbed />` component

### Sprint 2 — Database & Schema
> **Model: Sonnet** — Well-defined schema work. No ambiguity, just execution.

**Goal:** New schema in place. Old schema cleaned up.
- Remove support hours columns and tables
- Add all new tables (discoveryTemplates, discoveryResponses, provisioningSteps, etc.)
- Add `currentStage` and `payrollSystem` to projects
- Add `freshdeskId` to clients and tickets
- Remove `ticketTimeEntries` table
- Update seed data

### Sprint 3 — Project Lifecycle Shell
> **Model: Opus** — Novel architecture. The stage system, routing pattern, and admin/client permission model for lifecycle stages needs careful design.

**Goal:** Projects have stages. Admins can advance/lock them. Clients see a clear "what's next."
- Wire `<LifecycleStepper />` to real `currentStage` from DB
- Stage routing (sub-pages per stage)
- `<StageCard />` component with lock/unlock admin controls
- Client project detail page redesign (guided, stage-focused)
- `<ClientFlagButton />` + `<DdFlagBanner />`
- Admin flag: "client input needed" notification

### Sprint 4 — Discovery Module ✅ Complete (Feb 2026)
> **Model: Opus** — Multi-step wizard UI with save/resume, admin review flow, and inline comment system. High UX complexity.

**Goal:** Clients can complete discovery online. Admins can review and approve.
- Admin: create/manage discovery templates (`/admin/settings` → Templates section)
- Client: `<DiscoveryForm />` wizard
- API routes: create, save draft, submit, review, approve
- Save & resume functionality
- Review UI for admin (side-by-side questions + answers with inline notes)
- Seed default KeyPay discovery template with realistic sections
- **Notifications:** Wire in-app + email notifications for all discovery state changes (see CLAUDE.md "Notification Pattern")
- **NotificationBell:** Verify it's rendered in both admin and client headers — re-wire if missing from UI

### Sprint 5 — Provisioning & Bob Config
> **Model: Sonnet** — Checklist pattern is simple and repetitive. Follows the same structure twice.

**Goal:** Stages 3 and 4 are functional.
- Provisioning checklist UI (client marks steps, admin verifies)
- `<LoomEmbed />` integration per step
- Bob configuration checklist (similar pattern)

---

#### Provisioning Step Content (Stage 3)

Provisioning is structured as **3 sections** — one per system. Each section has a Loom video (placeholder until recorded) and detailed written instructions. The client marks each system as complete; admin verifies.

Admin applies a provisioning template when setting up a project. The specialist's email is dynamically injected using the format `firstname+clientdomain@digitaldirections.io`.

> **Multi-platform note:** HiBob and Workato steps are **universal** — identical for every project regardless of payroll system. Only the third section (payroll platform) changes per project. The template system must be designed to support this:
> - **MVP (Sprint 5):** KeyPay provisioning only
> - **Future:** Add MYOB, Deputy, and other payroll platform sections as separate templates
> - **Architecture:** A `provisioningTemplates` table (similar to `discoveryTemplates`) should store payroll-system-specific templates. When applied to a project, the universal HiBob + Workato steps are always included, and the payroll-specific section is appended based on `project.payrollSystem`.

**Overall intro shown to client:**
> The System Provisioning consists of granting administrative access to your Digital Directions Integration Specialist(s) on your HiBob, Workato, and KeyPay systems. The entire exercise should take less than 45 minutes.

---

**Section 1 — HiBob**
- `stepKey`: `hibob`
- `loomUrl`: `PLACEHOLDER — record walkthrough of HiBob admin provisioning`
- `orderIndex`: 1
- **Intro:** Your Digital Directions Integration Specialist will require administrative access to your HiBob Production environment. Once granted, they can access your Sandbox environment. This process should take 10–15 minutes.
- **Steps:**
  1. Login to your HiBob Production environment
  2. Navigate to **Org → People**, then click **New Hire** to open the "Add new hire to Bob" popup
  3. Choose your onboarding template. Enter the following details carefully:
     - **Email:** `firstname+yourclientdomain@digitaldirections.io` (use `.io` — not `.com`)
     - **First name / Last name:** as provided by your DD Integration Specialist
     - **Start date:** Set in the past so the account is accessible immediately
     - Ensure **"Invite employee"** is turned on before completing
  4. Click the grid icon (top left) → **System Settings** → expand **Account** → select **Permission Groups** → click the **Admin** row
  5. Under **Admins**, open **Group actions → Edit details** → click **Edit** under Members
  6. Search for the employee you just created, click their row to add them to Selected, then click **Select → Save → Confirm**
- **Revoking access (info only, shown after completion):** Navigate to Org → People, find the specialist, click Actions → Manage access → Delete employee profile, type DELETE to confirm.

---

**Section 2 — Employment Hero Payroll (KeyPay)**
- `stepKey`: `keypay`
- `loomUrl`: `PLACEHOLDER — record walkthrough of KeyPay admin provisioning`
- `orderIndex`: 2
- **Intro:** Your Digital Directions Integration Specialist will require administrative access to your Employment Hero (KeyPay) environment. This process should take approximately 5 minutes.
- **Steps:**
  1. Login to your KeyPay environment
  2. Hover over the briefcase icon in the left navigation → select **Payroll Settings**
  3. In **Business Settings**, select **Manage Users** → click the green **+ Add** button
  4. Enter the Integration Specialist's details and assign **Admin** permissions, then save
  5. Navigate back to **Business Settings → Manage Users** to confirm the user appears. Notify your DD Integration Specialist that they have been added — they will reset their password and complete access on their end
- **Revoking access (info only):** Go to Business Settings → Manage Users, click the red trash icon next to the specialist's name.

---

**Section 3 — Workato**
- `stepKey`: `workato`
- `loomUrl`: `PLACEHOLDER — record walkthrough of Workato admin provisioning`
- `orderIndex`: 3
- **Intro:** Your Digital Directions Integration Specialist will require administrative access to your Workato environment across all environments (Development, Testing, Production).
- **Steps:**
  1. Login to Workato using your **workato@yourcompanydomain** admin account (e.g. if your email is `jon@acmecorp.com`, use `workato@acmecorp.com`)
  2. Hover over the left side of the screen to reveal navigation → click **Workspace admin**
  3. On the Workspace admin page, click **+ Invite collaborator**
  4. Fill in the collaborator details:
     - **Full name:** as provided by your DD Integration Specialist
     - **Email:** `firstname+yourclientdomain@digitaldirections.io` (use `.io` — not `.com`)
     - **Roles:** Grant **Admin** access to all three environments — Development, Test, and Production
     - Click **Send invitation**
  5. Confirm the invitation appears in the **Pending invitations** section with all three environments listed. Notify your DD Integration Specialist.
- **Revoking access (info only):** Go to Workspace admin → Collaborators, click the specialist's name, then click the trash icon.

---

**Completion message shown to client:**
> Congratulations! You've completed the provisioning of your HiBob, KeyPay, and Workato environments. Please notify your Integration Specialist that this step has been completed.

---

#### Bob Config Step Content (Stage 4)

> ⚠️ **Content TBD** — Bryce to provide the HiBob configuration checklist items (e.g. departments, leave types, custom fields etc.) before this sprint is built. Steps will follow the same structure as provisioning: section title + Loom placeholder + written instructions + client marks complete + admin approves.

### Sprint 6 — Data Mapping Tool
> **Model: Opus** — The most complex UI in the entire portal. Two-column visual mapper, API integrations, validation rules, CSV export. Needs the best possible output.

**Goal:** Visual mapping tool works for KeyPay.
- `<MappingTool />` component
- HiBob API integration for pulling left-side values (requires project API key)
- KeyPay values (manual entry or API for MVP)
- Admin review + approve flow
- CSV export (Workato format)

### Sprint 7 — Integration Build Enhancements
> **Model: Sonnet** — Extends existing phase system. Mostly adding new fields and components to established patterns.

**Goal:** Build stage is significantly better than current.
- Release notes per phase (admin writes, client reads)
- `<ReleaseNote />` component
- Enhanced milestone notifications (Slack + in-app)
- Build Spec sign-off (`<SignoffModal />` variant 1)

### Sprint 8 — UAT Module
> **Model: Opus** — Checklist + sign-off flow + inline ticket creation + dual counter-sign. More state complexity than it looks.

**Goal:** UAT is fully managed in the portal.
- Admin: create UAT templates
- `<UatChecklist />` component
- Inline ticket creation on failure (Freshdesk-backed)
- UAT sign-off (`<SignoffModal />` variant 2)
- DD counter-sign

### Sprint 9 — Go-Live & Celebration
> **Model: Opus** — The champagne moment needs to feel special. `<CelebrationOverlay />`, confetti timing, Diji placement, and the dual pre-go-live checklist UX all benefit from creative judgment.

**Goal:** The champagne moment is real.
- Pre-go-live dual checklist
- Go-live trigger flow
- `<CelebrationOverlay />` with confetti
- `canvas-confetti` package
- Diji `celebrating` variant
- Post-go-live monitoring activation

### Sprint 10 — Freshdesk Integration
> **Model: Opus** — External API integration with bidirectional sync, webhook handling, and error states. Edge cases matter here and Opus handles them better.

**Goal:** Tickets are backed by Freshdesk.
- Freshdesk API integration
- Update all ticket API routes
- Bidirectional comment sync
- Freshdesk webhook handler
- Remove old time-tracking UI
- *Blocked until Freshdesk account confirmed — check with Jack*

### Sprint 11 — Support Features
> **Model: Sonnet** — Help centre is mostly content/CRUD. Reporting dashboards and ROI calculator are well-defined at this point. Connector library is static for MVP.

**Goal:** Ongoing support section is production-ready.
- Help centre (articles, Loom library, search)
- Reporting dashboards (basic)
- ROI calculator (admin configures, client reads)
- Connector library (static for MVP)

### Sprint 12 — Diji AI Chatbot
> **Model: Opus** — AI-powered chat with context injection, streaming responses, and ticket escalation. Needs careful prompt engineering and UX design for the conversation flow.

**Goal:** Diji becomes a real AI assistant — clients' first line of support before opening a ticket.

**Architecture:**
- Floating chat bubble in bottom-right corner (client pages only)
- Opens a chat panel with Diji's avatar and conversational UI
- Powered by Claude API (Anthropic SDK) with streaming responses
- Context-aware: knows the client's project, current stage, flags, and help articles

**What to build:**
- `<DijiChat />` — floating bubble + slide-out chat panel component
- `/api/chat` — API route that accepts messages, injects context, calls Claude API, streams response
- Context loader: pulls project data, current stage, unresolved flags, and `helpArticles` content to build the system prompt
- Conversation history: stored in-memory per session (no DB persistence for MVP)
- Escalation flow: when Diji can't answer, it offers "Would you like to open a support ticket?" → pre-fills a Freshdesk ticket with the conversation context
- Diji personality: friendly, knowledgeable about HiBob integrations, uses simple language, never guesses — admits when it doesn't know

**Dependencies:**
- Sprint 11 (help centre content populates `helpArticles` — Diji needs this to be useful)
- Sprint 10 (Freshdesk integration for ticket escalation)
- `ANTHROPIC_API_KEY` environment variable

**System prompt structure:**
```
You are Diji, Digital Directions' friendly support assistant.
You help clients with their HiBob integration projects.

Client context:
- Company: {clientName}
- Project: {projectName}
- Current stage: {currentStage}
- Unresolved flags: {flags}

Knowledge base:
{helpArticles content}

Rules:
- Be concise and helpful
- Reference specific help articles when relevant
- If you're not sure, say so and offer to create a ticket
- Never make up technical answers about HiBob or payroll APIs
```

**Future enhancements (not in Sprint 12):**
- Conversation persistence in DB
- Admin-side Diji for internal knowledge queries
- Analytics on common questions to improve help articles

---

## 14. Open Questions

| # | Question | Status | Decision |
|---|----------|--------|----------|
| 1 | **Primary purple shade** | ✅ Resolved | Use `#7C1CFF` (Official DD Violet 5). Update all CSS variables and Tailwind config. |
| 2 | **Diji mascot assets** | ⏳ Pending | Build placeholder spots now. When Jack generates the image, export on white background then use remove.bg for transparent PNG. See Diji section for placement guide. |
| 3 | **HiBob API keys for mapping** | ✅ Resolved | Encrypted on the `projects` table. Same AES-256-GCM pattern as `crypto.ts` (Workato credentials). |
| 4 | **Freshdesk plan/tier** | ⏳ Open | Need to confirm with Jack which tier. Determines API features available (custom fields, ticket forms, etc.). |
| 5 | **Freshdesk company setup** | ⏳ Open | Unknown — Bryce to check with Jack whether an account already exists or needs provisioning. Block Sprint 10 on this. |
| 6 | **SOW / Integration Limitation sign-off** | ✅ Resolved | External — handled outside the portal via email/PDF. Stage 1 does not include a sign-off step. |
| 7 | **ROI calculator inputs** | ⏳ Open | There's an equation — needs defining with Jack before Sprint 11. Likely inputs: hours saved per pay run, employee count, pay frequency, cost of manual errors. |
| 8 | **Connector library content** | ⏳ Open | Need the full list of integrations DD offers with availability status before building Sprint 11. |
| 9 | **Discovery template for KeyPay** | ✅ Resolved | Port questions from the existing workbook discovery tab. Restructure for guided portal UX with section descriptions and Loom slots. |
| 10 | **UAT scenarios for KeyPay** | ✅ Resolved | Port from "6.1 UAT Checklist & Signoff" in the existing workbook. Restructure as portal scenarios with Loom guidance. |

---

## 15. Post-Revamp Cleanup

> **When to do this:** After every sprint is complete and the revamp is fully live.
>
> **Instruction:** Do a full codebase audit and delete everything that is no longer used. No exceptions. If it's not referenced anywhere in the new codebase, it goes.

This is not a "nice to have" — leftover code creates confusion and makes future maintenance harder. The cleanup pass should be thorough and ruthless.

### What to audit and delete

**Pages & routes**
- Any page file under `/src/app/` that no longer has a route in the new route map (see Section 12)
- Any old layout files that were replaced
- Stub/placeholder pages that were never built out (e.g. `/admin/security`, `/admin/help` stubs)
- The old `/dashboard/client/` pages once the new lifecycle-aware versions replace them

**Components**
- Every file in `/src/components/` that is no longer imported anywhere
- Support hours components: `SupportHoursCard`, `EditSupportHoursDialog`
- Time tracking components: `LogTimeDialog` (time-tracking variant), `TimeEntriesList`
- Any dialog or form component that was replaced by a new equivalent
- Dark-mode-specific layout components once all pages are migrated

**API routes**
- `/api/clients/[id]/support-hours` and `/api/clients/[id]/support-hours/logs`
- `/api/tickets/[id]/time` (all methods) — time tracking moves to Freshdesk
- Any API route whose page/component was deleted and has no other callers

**Lib files**
- Any integration health checker in `/src/lib/integrations/` for systems that are no longer monitored or were removed
- Any utility functions in `/src/lib/` that have zero imports after the revamp

**DB schema**
- `supportHourLogs` table — drop it
- `ticketTimeEntries` table — drop it
- Orphaned columns removed from `clients` and `tickets` (see Section 6)

**Scripts & one-off files**
- `generate_project_plan.py` — used once, doesn't belong in the portal codebase
- Any seed data, fixtures, or migration scripts that referenced deleted tables

**Public assets**
- Any images or files in `/public/` that are no longer referenced in the codebase
- Old logo variants that aren't used (e.g. if the white-text logo is replaced by the purple-text logo everywhere)

### How to do the cleanup

When the time comes, tell Claude: **"Do a full cleanup pass — audit the entire codebase and delete everything that isn't used after the revamp. Check every import, every route reference, every API call. If it's dead, delete it."**

Claude will:
1. Map every file in `/src/` to its importers/callers
2. Cross-reference against the new route map and component tree
3. Identify anything with zero live references
4. Delete it and verify the build still passes

Don't skip this step. A clean codebase is part of the definition of "done."

---

*Last updated: February 2026*
