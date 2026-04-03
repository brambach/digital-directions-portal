export type ChangelogTag = "feature" | "fix" | "improvement" | "internal";
export type ChangelogAudience = "admin" | "all";

export interface ChangelogEntry {
  id: string;           // slug: "2026-03-10-connector-health"
  date: string;         // ISO date: "2026-03-10"
  version?: string;     // optional semver: "1.4.0"
  title: string;
  description: string;  // one-sentence summary shown in timeline
  tags: ChangelogTag[];
  audience: ChangelogAudience;
  items: string[];      // bullet-point detail lines
}

export const CHANGELOG: ChangelogEntry[] = [
  // ── April 2026 ──────────────────────────────────────────────
  {
    id: "2026-04-03-unified-notification-service",
    date: "2026-04-03",
    title: "Unified Notification Service",
    description: "Centralised notification dispatcher for all lifecycle events with Slack, email, and in-app support.",
    tags: ["internal"],
    audience: "admin",
    items: [
      "New notifyEvent() dispatcher handles all 22 portal event types from a single call",
      "Slack Block Kit messages with emoji headers, context lines, and 'View in Portal' buttons",
      "Automatic recipient resolution for admin and client users via Clerk",
      "Foundation for refactoring inline notification logic across all API routes",
    ],
  },
  {
    id: "2026-04-02-client-submission-withdrawal",
    date: "2026-04-02",
    title: "Withdraw Submissions & Undo",
    description: "Clients can now withdraw submitted sections for editing and undo provisioning step completions.",
    tags: ["feature"],
    audience: "all",
    items: [
      "You can now withdraw a submitted questionnaire, mapping, checklist, or UAT result before it's reviewed — edit your answers and resubmit when ready",
      "Provisioning steps can be undone before your DD specialist verifies them",
    ],
  },
  {
    id: "2026-04-02-enhanced-discovery-templates",
    date: "2026-04-02",
    title: "Enhanced Discovery Templates",
    description: "Discovery questionnaires now feature help text, conditional questions, and a new Standard KeyPay template.",
    tags: ["feature"],
    audience: "all",
    items: [
      "New Standard KeyPay Discovery template with 30 guided questions across 6 sections",
      "Questions now show helpful explanations so clients can complete discovery without a call",
      "Smart conditional logic hides irrelevant follow-up questions based on your answers",
      "Loom video guide slots available per section — videos added by the DD team",
    ],
  },
  // ── March 2026 ──────────────────────────────────────────────
  {
    id: "2026-03-10-guided-tour-polish",
    date: "2026-03-10",
    title: "Guided Tour Polish",
    description: "Multiple UX improvements to the first-time guided tour experience.",
    tags: ["improvement"],
    audience: "all",
    items: [
      "Click the spotlit element to advance the tour — feels more natural and explorable",
      "Typewriter animation pauses when you hover the speech bubble so you can read at your own pace",
      "Step counter (e.g. '2 / 7') shown alongside the progress dots",
      "Digi appears in construction mode on the Projects step for more personality",
      "Notification bell rings and chat bubble pulses during their respective tour steps",
    ],
  },
  {
    id: "2026-03-10-guided-tour",
    date: "2026-03-10",
    title: "Guided Portal Tour",
    description: "New client users now get a guided tour of the portal on first login, with Digi as the guide.",
    tags: ["feature"],
    audience: "all",
    items: [
      "First-time tour auto-starts on the dashboard after login — walks through Projects, Support, stat cards, notifications, and Digi chat",
      "Spotlight overlay highlights each element as Digi explains it",
      "Smooth animated spotlight that slides between targets",
      "Typewriter text effect as Digi speaks each step",
      "Celebration moment with confetti when you finish the tour",
      "Keyboard navigation: arrow keys to step through, Escape to dismiss",
      "Replay the tour any time from the Help Centre",
    ],
  },
  {
    id: "2026-03-10-changelog-improvements",
    date: "2026-03-10",
    title: "Changelog Improvements",
    description: "The changelog page got a serious upgrade — stats, filters, month headers, and more.",
    tags: ["improvement"],
    audience: "all",
    items: [
      "Stats banner showing total updates, features, improvements, and fixes at a glance",
      "Tag filter bar to show only features, improvements, or fixes",
      "Month group headers to make scanning the timeline easier",
      "Timeline dot connecting the date column to each entry card",
      "Stagger animations as entries load in",
      "Click the date to copy a direct link to that entry",
    ],
  },
  {
    id: "2026-03-10-changelog",
    date: "2026-03-10",
    title: "Portal Changelog",
    description: "A new changelog page so you can see what's been shipped.",
    tags: ["feature"],
    audience: "all",
    items: [
      "Timeline view of all portal updates with date and tag filters",
      "\"What's New\" badge in the sidebar when new entries are added",
      "Badge clears automatically when you visit the changelog",
    ],
  },
  {
    id: "2026-03-10-global-connector-health",
    date: "2026-03-10",
    title: "Global Connector Health Library",
    description: "Real-time health monitoring for HiBob, Workato, KeyPay, NetSuite, Deputy, and MYOB.",
    tags: ["feature"],
    audience: "all",
    items: [
      "Status monitoring for HiBob, Workato, KeyPay, NetSuite, Deputy, and MYOB",
      "Per-project health grid showing connection status at a glance",
      "Global monitors checked on every cron run — no per-project setup needed",
      "Automatic alerts when a service goes down or degrades",
      "MYOB shows a manual status check link (no public status API available)",
    ],
  },

  // ── February 2026 (late) ────────────────────────────────────
  {
    id: "2026-02-28-integration-flow-diagram",
    date: "2026-02-28",
    title: "Integration Flow Diagram",
    description: "Visual connection diagram showing how HiBob, Workato, and payroll systems link together per project.",
    tags: ["feature"],
    audience: "all",
    items: [
      "Interactive flow diagram on each project page",
      "Live status indicators pulled from connector health monitors",
      "Shows the full data path: HiBob → Workato → Payroll system",
    ],
  },
  {
    id: "2026-02-27-admin-dashboard-live-data",
    date: "2026-02-27",
    title: "Admin Dashboard — Live Data",
    description: "Admin dashboard now shows real stats, pipeline, and upcoming deadlines from the database.",
    tags: ["improvement"],
    audience: "admin",
    items: [
      "Client count, active project count, and ticket stats pulled from DB",
      "Pipeline view grouped by lifecycle stage",
      "Due Soon section showing upcoming project milestones",
      "Pending invites list with quick actions",
      "Replaced project status field with lifecycle stage throughout",
    ],
  },
  {
    id: "2026-02-24-freshdesk-integration",
    date: "2026-02-24",
    title: "Freshdesk Integration",
    description: "Support tickets now backed by Freshdesk — the DD team works in Freshdesk while clients use the portal as normal.",
    tags: ["feature", "internal"],
    audience: "admin",
    items: [
      "Admin ticket queue redirects to Freshdesk dashboard",
      "Client ticket UI unchanged — still submits through the portal",
      "Support email (support@digitaldirections.io) feeds directly into Freshdesk",
      "Digi chatbot can escalate conversations to Freshdesk tickets",
    ],
  },
  {
    id: "2026-02-24-help-centre-reports-roi",
    date: "2026-02-24",
    title: "Help Centre, Reports & ROI Calculator",
    description: "New tools section with self-serve help articles, project reports, and an integration ROI calculator.",
    tags: ["feature"],
    audience: "all",
    items: [
      "Help Centre with searchable knowledge base articles",
      "Reports page for admin project and client analytics",
      "ROI Calculator showing estimated time and cost savings from integration",
      "Connectors page listing all available integration targets",
    ],
  },
  {
    id: "2026-02-24-animations",
    date: "2026-02-24",
    title: "Motion & Animations",
    description: "Smooth transitions, stagger animations, and a polished feel throughout the portal.",
    tags: ["improvement"],
    audience: "all",
    items: [
      "Framer Motion primitives (FadeIn, DigiFloat, CountUp) used across all pages",
      "Sidebar nav indicator animates between items",
      "Dashboard cards stagger in on load",
      "Lifecycle stepper has spring-animated nodes and SVG draw progress line",
      "Notification bell and search dropdown animate open/close",
    ],
  },
  {
    id: "2026-02-23-digi-chatbot",
    date: "2026-02-23",
    title: "Digi AI Chatbot",
    description: "Meet Digi — your AI support assistant that can answer common questions before you open a ticket.",
    tags: ["feature"],
    audience: "all",
    items: [
      "Chat with Digi from any page via the floating chat bubble",
      "Context-aware — knows your project stage, flags, and configuration",
      "Powered by Claude with streaming responses",
      "Can escalate to a support ticket if Digi can't resolve your question",
    ],
  },
  {
    id: "2026-02-23-uat-go-live",
    date: "2026-02-23",
    title: "UAT & Go-Live Modules",
    description: "Structured user acceptance testing and go-live celebration stages.",
    tags: ["feature"],
    audience: "all",
    items: [
      "UAT module with test template picker and client testing interface",
      "Clients can log test results, flag issues, and sign off on UAT",
      "Go-Live stage with readiness checklist and celebration confetti",
      "Notifications sent to both sides at key milestones",
    ],
  },
  {
    id: "2026-02-23-integration-build",
    date: "2026-02-23",
    title: "Integration Build Stage",
    description: "Track Workato recipe development with sync components, release notes, and build spec sign-off.",
    tags: ["feature"],
    audience: "all",
    items: [
      "Sync component cards showing what's being built (employees, leave, pay, etc.)",
      "Phase tracking within the build stage",
      "Release notes published per phase for client visibility",
      "Build spec sign-off before moving to UAT",
      "Integration specialist assignment per project",
    ],
  },
  {
    id: "2026-02-22-data-mapping",
    date: "2026-02-22",
    title: "Data Mapping Tool",
    description: "Interactive card-based UI for mapping HiBob fields to payroll system fields.",
    tags: ["feature"],
    audience: "all",
    items: [
      "Visual connector cards linking source and target fields",
      "Searchable field selectors for large schemas",
      "Admin publishes mapping for client review and approval",
      "Mapping changes tracked with timestamps",
    ],
  },

  // ── February 2026 (mid) ─────────────────────────────────────
  {
    id: "2026-02-20-lifecycle-platform",
    date: "2026-02-20",
    title: "Project Lifecycle Platform",
    description: "A complete project management overhaul — every implementation now follows a structured 9-stage lifecycle.",
    tags: ["feature"],
    audience: "all",
    items: [
      "9 lifecycle stages: Scoping → Discovery → Provisioning → HiBob Config → Mapping → Build → UAT → Go-Live → Support",
      "Visual stepper showing current stage progress",
      "Flag system for raising issues or requesting input at any stage",
      "Discovery questionnaire module for structured client onboarding",
      "Provisioning checklist and HiBob configuration stages",
      "Full light-mode design system with Digi the bear mascot",
    ],
  },
  {
    id: "2026-02-20-design-system",
    date: "2026-02-20",
    title: "Design System & Light Mode",
    description: "Complete visual overhaul — premium light theme, new typography, and consistent component library.",
    tags: ["improvement"],
    audience: "all",
    items: [
      "Full migration from dark mode to light mode",
      "New foundation design system with consistent spacing, typography, and colour",
      "Digi the bear mascot appears in empty states, sidebars, and hero cards",
      "Purple accent colour standardised to DD Violet (#7C1CFF) everywhere",
      "Responsive layouts refined across all pages",
    ],
  },

  // ── January 2026 ────────────────────────────────────────────
  {
    id: "2026-01-21-notifications",
    date: "2026-01-21",
    title: "In-App Notifications",
    description: "Real-time notification bell so you never miss a project update, message, or alert.",
    tags: ["feature"],
    audience: "all",
    items: [
      "Bell icon in the top navigation with unread count badge",
      "Notifications for ticket updates, new messages, file uploads, and integration alerts",
      "Click a notification to jump straight to the relevant page",
      "Mark individual or all notifications as read",
    ],
  },
  {
    id: "2026-01-15-integration-monitoring",
    date: "2026-01-15",
    title: "Integration Monitoring",
    description: "Per-project health monitoring for HiBob, Workato, KeyPay, and other connected services.",
    tags: ["feature"],
    audience: "all",
    items: [
      "Admins configure integration monitors on each project",
      "Automated health checks via status page APIs (Atlassian Statuspage format)",
      "Workato recipe health checking with API token authentication",
      "Status change alerts via email and in-app notifications",
      "Historical metrics tracking for uptime reporting",
    ],
  },
  {
    id: "2026-01-12-portal-launch",
    date: "2026-01-12",
    title: "Portal Launch",
    description: "The Digital Directions client portal is live — a dedicated space for managing your HiBob integration project.",
    tags: ["feature"],
    audience: "all",
    items: [
      "Client and admin dashboards with role-based access",
      "Project management with file sharing and messaging",
      "Support ticket system with assignment, time tracking, and comments",
      "Invite-only access — admins send secure invite links to client team members",
      "Multi-user support — multiple people from your team can access the portal",
      "Digital Directions purple branding throughout",
    ],
  },
];

// Auto-computed — no need to update manually when prepending entries
export const LATEST_ADMIN_ENTRY_DATE = CHANGELOG[0]?.date ?? "";
export const LATEST_CLIENT_ENTRY_DATE = CHANGELOG.find((e) => e.audience === "all")?.date ?? "";
export const CHANGELOG_LS_KEY = "dd_portal_changelog_seen";
