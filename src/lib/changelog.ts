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
  {
    id: "2026-03-10-integration-health-monitoring",
    date: "2026-03-10",
    title: "Integration Health Monitoring",
    description: "Real-time health status for HiBob, Workato, KeyPay, NetSuite, Deputy, and MYOB across all projects.",
    tags: ["feature"],
    audience: "all",
    items: [
      "Status monitoring for HiBob, Workato, KeyPay, NetSuite, Deputy, and MYOB",
      "Per-project health grid showing connection status at a glance",
      "Global connector library monitors all services on every cron run",
      "Automatic alerts when a service goes down or degrades",
      "MYOB shows a manual status check link (no public status API available)",
    ],
  },
];

// Auto-computed — no need to update manually when prepending entries
export const LATEST_ADMIN_ENTRY_DATE = CHANGELOG[0]?.date ?? "";
export const LATEST_CLIENT_ENTRY_DATE = CHANGELOG.find((e) => e.audience === "all")?.date ?? "";
export const CHANGELOG_LS_KEY = "dd_portal_changelog_seen";
