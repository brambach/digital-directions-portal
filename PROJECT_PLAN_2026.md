# DD Portal 2026 — What We're Building

> Draft — Feb 2026. Jack, Bryon, team: read through, add your thoughts anywhere, answer the questions at the bottom.

---

## The Big Idea

We're turning the client portal into a **full lifecycle platform**. Right now it handles projects and support tickets. We want it to cover everything from the first sales conversation all the way through to ongoing support.

**Bryce's idea:** The client experience should feel like **app onboarding** — progress bar at the top, guided steps, Loom videos explaining each stage. The team hasn't agreed on this yet, so this is open for discussion.

```
  ████████████░░░░░░░░░░░░░░░░░░░░  35% Complete
  Pre-Sales ✓  Discovery ✓  Mapping ●  Build ○  UAT ○  Go-Live ○  Support ○
```

Both the client and DD staff see this progress bar. Everyone always knows where things stand.

---

## What Changes

| Today | What We Want |
|-------|-------------|
| Deals tracked in Google Sheets + Slack | Deals submitted and tracked in the portal |
| Discovery happens in a spreadsheet workbook | Guided questionnaire with Loom videos in the portal |
| Data mapping happens in a spreadsheet workbook | Visual mapping tool in the portal, exports CSV to Workato |
| Build progress is a status badge | Real milestone tracking with release notifications to the client |
| UAT is coordinated over email | Scenario checklists in the portal with formal sign-off |
| Go-live is informal | Structured go-live with a "champagne moment" celebration |
| Support is just tickets | Help centre, ROI calculator, connector library (Freshdesk TBD) |

---

## The 7 Stages

### 1. Pre-Sales / CRM

**Replaces:** Google Sheets + Slack templates

HiBob AEs currently submit leads to us via Slack. In the new portal, **HiBob AEs would log into the portal directly and submit leads through a form**. This means HiBob needs its own role in the portal's authentication system (see Roles section below).

The form captures the key info: HiBob AE name, employee headcount, payroll system, number of business entities, scope notes. When a lead is submitted, Slack still gets notified automatically so nothing changes for our team's workflow.

Deals move through a pipeline: **Lead → Qualified → Proposal → Won → Lost**

When a deal is won, hit "Convert to Project" and it creates the client + project automatically and kicks off the discovery stage.

---

### 2. Discovery / Requirements

**Replaces:** Workbook discovery tab

Instead of sending a spreadsheet, the client logs into the portal and goes through a **guided questionnaire**. Before each section, there's a short Loom video explaining what we're asking and why.

Sections might look like:
- Company overview (entities, employee count, HiBob instance)
- Payroll system details
- Data requirements (which fields need to sync)
- Business rules (pay frequencies, exceptions)
- Technical environment (API access, security)
- Timeline and priorities

The client can save and come back. When they're done, they submit it for review. Our integration specialist reviews the answers, can flag anything that needs clarification, and approves it. Approved answers feed into the next stage.

---

### 3. Data Mapping

**Replaces:** Workbook mapping tab

A visual experience where the client sees their payroll fields on one side and HiBob fields on the other. They map them together with Loom videos guiding each section.

When mapping is done, the client submits it. Our specialist reviews and approves. Then we export a CSV that goes straight into Workato's mapping table.

**Note:** To pull HiBob fields into the mapping tool, we'll need a HiBob API key for the client's instance. This should be collected during the discovery phase.

**Workato format:** Bryce knows the format. Will sort this out when the build starts.

---

### 4. Integration Build

**Mostly exists already** — we have project phases and a stepper. We enhance it with:

- Build-specific phase templates (Environment Setup → Core Config → Field Mapping → Calculations → Testing → MVP Ready)
- Release notes per phase that the client can see ("Here's what we built this week")
- Richer notifications when milestones are hit
- Ability to flag when we need something from the client mid-build

The client sees build progress in their dashboard (read-only). They can message us through the existing project chat.

---

### 5. UAT & Sign-Off

**Replaces:** Email coordination

The client gets a checklist of test scenarios (New Hire flow, Termination flow, Pay Changes, Leave Sync, etc.). Each scenario has a Loom video showing what to test.

The client runs the test, then comes back and marks it: Passed, Failed, or N/A. If something fails, they can create a support ticket right there.

When all scenarios are done:
1. Client submits for review
2. Our specialist validates the results
3. Both sides formally sign off (client signs → DD counter-signs)
4. UAT is complete, we move to go-live

**How test scenarios work:** The scenarios depend on the payroll software, but the general approach is creating a few test employees in HiBob and filling them out a certain way based on the payroll system's minimum info requirements. The exact scenarios are for Bryon and Bryce to define — open to collaboration.

---

### 6. Go-Live

Three sub-phases:

**Pre-Go-Live** — Admin cleanup: credential updates, API key refresh, final employee mapping, test run. Both DD and client have items on this checklist.

**Go-Live** — Switch to production, first sync, data validation. When it's confirmed working: 🎉 **champagne moment** — the portal shows a celebration (confetti, success stats, congrats).

**Post-Go-Live** — 24-hour monitoring, health check, then the client gets a guided tour of the support portal. Support hours activate, project is marked complete.

---

### 7. Ongoing Support

**Builds on what we already have** (tickets, support hours, integration monitoring). New additions:

- **Freshdesk integration (decision needed)** — Do we need this? If we build good enough ticketing into the portal (with image uploads, etc.), we might not need Freshdesk at all. But if we do need it, tickets would sync both ways — our team works in Freshdesk, clients see updates in the portal. The question is: **can we build everything we need directly into the portal, or does our team need Freshdesk's workflow tools?** Jack and Bryon to weigh in.
- **Help centre** — Knowledge base articles, Loom video library, searchable FAQ
- **Reporting dashboards** — Ticket analytics, support hours trends, integration uptime
- **ROI calculator** — Show clients the time/cost savings from their integration
- **Connector library** — Browse what other integrations DD offers. "Interested" button creates a new deal.
- **Digi AI chatbot** (future) — AI assistant powered by our help articles + project context

---

## Roles

Right now we have two roles: **admin** (DD staff) and **client** (client users). We need to expand this.

| Role | Who | What They See |
|------|-----|--------------|
| Admin | Jack, leadership | Everything — deals, projects, settings, user management |
| Integration Specialist | DD integration team (Bryce, Bryon for now) | Projects, builds, tickets, phases — the day-to-day work |
| HiBob AE | HiBob account executives | Can log in and submit leads only — limited portal access |
| Client Admin | Primary client contact (e.g., HR Director) | Client dashboard, can sign off on UAT, can invite other client users |
| Client User | Additional client people (e.g., Payroll Manager) | Client dashboard, read-heavy, can submit tickets |

**Note:** HiBob AEs currently submit leads to us via Slack. With the portal, they'd log in via Clerk and submit leads directly through a form. They don't need access to anything else — just the lead submission page.

**Question:** Do we need a separate pre-sales role for Jack/Bryon, or is that just a section within the admin dashboard?

---

## Look & Feel

This section is important — the design direction we set here drives the entire build. We want to get this right before writing code.

### Brand Assets Needed from Jack
- The **official DD logo** (SVG or high-res PNG) — we need this in the portal, emails, and login page
- The **official DD hex codes** — we're using purple as the primary brand color, but what's the exact hex? Is there a secondary color? Any official brand guidelines?
- The **DD bear mascot** — Jack's AI-generated bear could be a great branding element throughout the portal (login page, empty states, loading screens, the "Under Construction" banner)

### Design Direction

What vibe should the portal have? Some reference points for the team to react to:

- **Modern & clean** — Minimal UI, lots of white space, feels like a premium SaaS product (think Linear, Notion)
- **Friendly & approachable** — Rounded corners, warm tones, the DD bear popping up as a guide (think Slack, Loom)
- **Enterprise & professional** — Structured layouts, data-dense dashboards, feels serious and trustworthy (think Salesforce, HubSpot)

We can blend these — for example, modern and clean overall but friendly during the guided onboarding experience, and more professional on the admin dashboards.

**Jack and Bryon:** What feels right for DD? Any websites, apps, or portals you've seen that you want ours to feel like? Drop screenshots or links here.

### What We Know So Far
- Primary brand color is **purple** (exact hex TBD from Jack)
- The DD bear mascot exists and should be used
- The portal should feel **premium** — this is client-facing, it represents DD's quality
- Guided experiences (discovery, mapping, UAT) should feel **warm and helpful**, not corporate

---

## Under Construction

Jack created a cool AI-generated image of the DD bear with an "Under Construction" banner. Once we start building, we should use that as the landing page / placeholder for sections that aren't ready yet. Good branding touch.

---

## Build Order

We ship this in phases. Each phase delivers something usable.

| Phase | What Ships | Depends On |
|-------|-----------|-----------|
| **1. Foundation + Pre-Sales** | New roles, deal submission form, pipeline view, lifecycle progress bar | Nothing |
| **2. Discovery** | Guided questionnaire with Loom videos, admin review/approval | Phase 1 + discovery question content from team |
| **3. Data Mapping** | Visual mapping tool, CSV export to Workato | Phase 2 + Workato CSV format spec from Bryon |
| **4. UAT & Sign-Off** | Scenario checklists, testing flow, formal sign-off | Phase 3 + UAT scenario content from team |
| **5. Go-Live** | Go-live checklists, champagne moment, support transition | Phase 4 |
| **6. Support Upgrades** | Help centre, dashboards, ROI calculator (Freshdesk TBD) | Can start alongside Phase 4-5 |
| **7. AI & Automation** | Digi AI chatbot, recipe library, AI-assisted builds | Phases 2-3 complete, future work |

---

## Crazy Ideas (Future / Workshop Brainstorming)

These came out of the Innovation Workshop. Not in initial scope, but worth tracking.

**AI Integration Builder** — Once discovery and mapping are done, feed everything to Claude along with our recipe library. Claude suggests the initial integration config. Specialist reviews and uses it as a starting point. Could cut build time from weeks to days.

**Workato Manifest Export (Bryon's idea)** — Export a client's Workato environment as a manifest, import into the portal for documentation and troubleshooting.

**Recipe Library Browser** — Catalog all our Workato recipes in the portal. Specialists can search, filter, and pick a starting recipe for new builds.

**Digi AI Chatbot** — Context-aware AI that knows the client's project, integrations, and our help articles. Answers questions, escalates to tickets when stuck.

---

## Questions for the Team

Comment directly in this doc with your answers or thoughts.

### For Jack
- Would you want to consolidate other software into the portal? You currently use Trello (we could build that functionality directly into the portal) and HubSpot (we could potentially integrate it). Are there any other tools you'd want pulled in?
- What Freshdesk plan are we on? Do we even need Freshdesk if we build solid ticketing into the portal? (See Stage 7 above)
- Do you want a separate pre-sales role, or is deals just a section in the admin dashboard?

### For Bryon and Bryce
- Auto-provisioning client Workato environments via API — how feasible is this with the MSP API?
- Standard UAT test scenarios — Bryon and Bryce to define these together
- Should the mapping tool support multiple payroll systems per project (multi-entity clients)? Probably not needed but worth discussing.
- How many discovery templates do we need? One generic, or one per payroll system (KeyPay, ADP, NetSuite)?

### For Bryon
- Can you export the current workbook discovery tab? We need the actual questions to build the questionnaire so Bryce can feed them into the build.

### Already Answered
- **Recipe library format:** It's purely JSON. The whole project is in JSON, so we can ingest it.
- **Teams notifications:** Not needed. Slack only.
- **Mobile app:** Not needed. Responsive web is fine.

### For Everyone
- Do integration specialists need restricted access (can't see deal values, financials), or is full admin fine?
- Should client admins be able to invite their own users, or does that stay admin-only?
- Does the UAT sign-off need to be legally binding (e-signature) or is a simple "I approve" button enough?

---

## What Already Exists (Quick Reference)

The portal already has a solid foundation. We're not starting from scratch.

- **Client management** — Create, edit, delete clients. Status tracking. Multi-user per client. Invite system.
- **Project management** — 5 statuses, phase templates, visual stepper, messaging, file uploads.
- **Tickets** — Full lifecycle with assignment, comments, internal notes, time tracking, resolution.
- **Integration monitoring** — HiBob, KeyPay, Workato, ADP, NetSuite. 5-min cron checks, alerts, uptime tracking.
- **Support hours** — Monthly allocation, usage tracking, auto-deduction when logging time to tickets.
- **Notifications** — In-app bell, email via Resend, Slack notifications.
- **Auth** — Clerk SSO, role-based access, webhook sync, invite-only access.

---

*From the Integration 2026 Innovation Workshops. Add your thoughts and send back to Bryce.*
