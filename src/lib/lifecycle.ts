/**
 * Lifecycle stage constants and utilities.
 * Stage keys match the lifecycleStageEnum in schema.ts.
 */

export const LIFECYCLE_STAGES = [
  { key: "pre_sales", label: "Pre-Sales", slug: null },
  { key: "discovery", label: "Discovery", slug: "discovery" },
  { key: "provisioning", label: "Provisioning", slug: "provisioning" },
  { key: "bob_config", label: "HiBob Config", slug: "bob-config" },
  { key: "mapping", label: "Data Mapping", slug: "mapping" },
  { key: "build", label: "Integration Build", slug: "build" },
  { key: "uat", label: "UAT", slug: "uat" },
  { key: "go_live", label: "Go-Live", slug: "go-live" },
  { key: "support", label: "Support", slug: null },
] as const;

export type LifecycleStageKey = (typeof LIFECYCLE_STAGES)[number]["key"];

/** Stages that have sub-pages (exclude pre_sales and support) */
export const ROUTABLE_STAGES = LIFECYCLE_STAGES.filter(
  (s): s is typeof LIFECYCLE_STAGES[number] & { slug: string } => s.slug !== null
);

/** Map stage key → URL slug */
export function stageSlug(key: string): string | null {
  return LIFECYCLE_STAGES.find((s) => s.key === key)?.slug ?? null;
}

/** Map URL slug → stage key */
export function slugToStageKey(slug: string): string | null {
  return LIFECYCLE_STAGES.find((s) => s.slug === slug)?.key ?? null;
}

/** Get stage label by key */
export function stageLabel(key: string): string {
  return LIFECYCLE_STAGES.find((s) => s.key === key)?.label ?? key;
}

/** Get ordered array index for a stage key */
export function stageIndex(key: string): number {
  return LIFECYCLE_STAGES.findIndex((s) => s.key === key);
}

/** Get next stage key, or null if at the end */
export function nextStage(key: string): string | null {
  const idx = stageIndex(key);
  if (idx < 0 || idx >= LIFECYCLE_STAGES.length - 1) return null;
  return LIFECYCLE_STAGES[idx + 1].key;
}

/** Get previous stage key, or null if at the beginning */
export function prevStage(key: string): string | null {
  const idx = stageIndex(key);
  if (idx <= 0) return null;
  return LIFECYCLE_STAGES[idx - 1].key;
}

/** Derive stage status from currentStage */
export function deriveStageStatus(
  stageKey: string,
  currentStage: string
): "locked" | "active" | "complete" {
  const current = stageIndex(currentStage);
  const target = stageIndex(stageKey);
  if (target < current) return "complete";
  if (target === current) return "active";
  return "locked";
}

/** Client-facing "what's next" guidance per stage */
export function stageGuidance(key: string): { title: string; description: string } {
  const guidance: Record<string, { title: string; description: string }> = {
    pre_sales: {
      title: "Getting Started",
      description: "Your project is being set up. You'll be notified when discovery begins.",
    },
    discovery: {
      title: "Complete the Discovery Questionnaire",
      description: "Tell us about your organisation, payroll setup, and integration requirements so we can plan your build.",
    },
    provisioning: {
      title: "Set Up Your Systems",
      description: "Follow the step-by-step guide to provision access to HiBob, your payroll system, and Workato.",
    },
    bob_config: {
      title: "Configure HiBob",
      description: "Complete the HiBob configuration checklist to ensure your HR data is ready for integration.",
    },
    mapping: {
      title: "Map Your Data",
      description: "Match your HiBob fields to your payroll system fields so we know exactly how to sync your data.",
    },
    build: {
      title: "Integration Build In Progress",
      description: "Our team is building your integration. You'll see progress updates and release notes here.",
    },
    uat: {
      title: "Test Your Integration",
      description: "Work through the test scenarios to verify everything is working correctly before go-live.",
    },
    go_live: {
      title: "Preparing for Go-Live",
      description: "Complete the final checklist items and get ready to switch your integration to production.",
    },
    support: {
      title: "You're Live!",
      description: "Your integration is running. Use the support portal for any questions or issues.",
    },
  };
  return guidance[key] ?? { title: "Unknown Stage", description: "" };
}
