# Sprint 2 Brief — Database & Schema

## Context

**Project:** DD Portal — HiBob integration lifecycle management portal for Digital Directions consulting.
**Stack:** Next.js 15 App Router, TypeScript, Drizzle ORM, Vercel Postgres.
**Schema file:** `src/lib/db/schema.ts`
**Seed file:** `src/lib/db/seed.ts`

**Full plan:** See `DD-PORTAL-2026-IMPLEMENTATION-PLAN.md` for the complete revamp spec.

---

## First Step — Create the Branch

```bash
git checkout -b sprint/2-database-schema
```

---

## What This Sprint Does

**Schema changes only.** No UI changes, no API route changes, no component changes.

The portal is undergoing a full lifecycle revamp. This sprint prepares the database for that revamp by:
1. Removing the support hours system entirely
2. Adding new columns to existing tables
3. Adding 13 new tables for the lifecycle features (discovery, mapping, UAT, sign-offs, etc.)
4. Updating the seed data to reflect the new schema

After this sprint, `npm run db:push` should apply all changes cleanly and `npm run db:seed` should populate realistic data.

---

## Part 1 — Remove Support Hours System

### From `clients` table — remove these 3 columns:
```
supportHoursPerMonth   (integer)
hoursUsedThisMonth     (integer)
supportBillingCycleStart (timestamp)
```

### Drop entire `supportHourLogs` table
Remove the table definition AND its relations (`supportHourLogsRelations`).

### Drop entire `ticketTimeEntries` table
Remove the table definition AND its relations (`ticketTimeEntriesRelations`).

Also remove:
- `ticketTimeEntries` import from wherever it's used
- The `timeEntries: many(ticketTimeEntries)` line from `ticketsRelations`

### From `tickets` table — remove:
```
estimatedMinutes    (integer)
timeSpentMinutes    (integer)
```

### From `agencies` table — update default color:
```
primaryColor: default("#8B5CF6")  →  default("#7C1CFF")
```

---

## Part 2 — Add Columns to Existing Tables

### `projects` table — add these columns:

```typescript
// Lifecycle stage
currentStage: varchar("current_stage", { length: 50 }).default("pre_sales").notNull(),
// Values: 'pre_sales' | 'discovery' | 'provisioning' | 'bob_config' | 'mapping' | 'build' | 'uat' | 'go_live' | 'support'

// Payroll system for this project
payrollSystem: varchar("payroll_system", { length: 50 }),
// Values: 'keypay' | 'myob' | 'deputy' | 'generic'

// API credentials (encrypted, same pattern as workatoCredentials in integrationMonitors)
hibobApiKey: text("hibob_api_key"),       // Encrypted
payrollApiKey: text("payroll_api_key"),   // Encrypted

// Go-live tracking
goLiveDate: timestamp("go_live_date"),
supportActivatedAt: timestamp("support_activated_at"),
```

### `clients` table — add:

```typescript
freshdeskId: varchar("freshdesk_id", { length: 255 }),
```

### `tickets` table — add:

```typescript
freshdeskId: varchar("freshdesk_id", { length: 255 }),
freshdeskUrl: text("freshdesk_url"),
```

---

## Part 3 — Add New Enums

Add these enums before the table definitions:

```typescript
export const lifecycleStageEnum = pgEnum("lifecycle_stage", [
  "pre_sales",
  "discovery",
  "provisioning",
  "bob_config",
  "mapping",
  "build",
  "uat",
  "go_live",
  "support",
]);

export const stageStatusEnum = pgEnum("stage_status", [
  "locked",
  "active",
  "in_review",
  "approved",
  "complete",
]);

export const payrollSystemEnum = pgEnum("payroll_system", [
  "keypay",
  "myob",
  "deputy",
  "generic",
]);

export const signoffTypeEnum = pgEnum("signoff_type", [
  "build_spec",
  "uat",
  "go_live",
]);
```

Then update the `projects` table `currentStage` column to use `lifecycleStageEnum` instead of `varchar`.
And update `projects.payrollSystem` to use `payrollSystemEnum`.

---

## Part 4 — Add New Tables

Add all 13 tables below. Place them after the existing tables but before the Relations section.

### `discoveryTemplates`
```typescript
export const discoveryTemplates = pgTable("discovery_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  payrollSystem: payrollSystemEnum("payroll_system").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  // JSON: array of { id, title, description, loomUrl, questions: [{ id, label, type, required, options? }] }
  sections: text("sections").notNull(),
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});
```

### `discoveryResponses`
```typescript
export const discoveryResponses = pgTable("discovery_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  templateId: uuid("template_id").references(() => discoveryTemplates.id, { onDelete: "restrict" }).notNull(),
  // JSON: { [questionId]: answer }
  responses: text("responses").notNull().default("{}"),
  status: stageStatusEnum("status").notNull().default("active"),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdx: index("discovery_responses_project_idx").on(table.projectId),
}));
```

### `provisioningSteps`
```typescript
export const provisioningSteps = pgTable("provisioning_steps", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  stepKey: varchar("step_key", { length: 100 }).notNull(), // e.g. 'workato', 'hibob', 'keypay'
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  loomUrl: text("loom_url"),
  orderIndex: integer("order_index").notNull(),
  completedAt: timestamp("completed_at"),
  completedBy: uuid("completed_by").references(() => users.id, { onDelete: "set null" }),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: uuid("verified_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  projectIdx: index("provisioning_steps_project_idx").on(table.projectId),
}));
```

### `bobConfigChecklist`
```typescript
export const bobConfigChecklist = pgTable("bob_config_checklist", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  // JSON: array of { id, title, description, loomUrl, faqItems, completedAt }
  items: text("items").notNull().default("[]"),
  status: stageStatusEnum("status").notNull().default("active"),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdx: index("bob_config_checklist_project_idx").on(table.projectId),
}));
```

### `dataMappingConfigs`
```typescript
export const dataMappingConfigs = pgTable("data_mapping_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  payrollSystem: payrollSystemEnum("payroll_system").notNull().default("keypay"),
  status: stageStatusEnum("status").notNull().default("active"),
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  exportedAt: timestamp("exported_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdx: index("data_mapping_configs_project_idx").on(table.projectId),
}));
```

### `dataMappingEntries`
```typescript
export const dataMappingEntries = pgTable("data_mapping_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  configId: uuid("config_id").references(() => dataMappingConfigs.id, { onDelete: "cascade" }).notNull(),
  // Values: 'leave_types' | 'locations' | 'pay_periods' | 'pay_frequencies' | 'employment_contracts' | 'pay_categories' | 'termination_reasons'
  category: varchar("category", { length: 100 }).notNull(),
  hibobValue: text("hibob_value").notNull(),
  payrollValue: text("payroll_value").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  configIdx: index("data_mapping_entries_config_idx").on(table.configId),
}));
```

### `uatTemplates`
```typescript
export const uatTemplates = pgTable("uat_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  payrollSystem: payrollSystemEnum("payroll_system").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  // JSON: array of { id, title, description, loomUrl, steps: string[] }
  scenarios: text("scenarios").notNull().default("[]"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});
```

### `uatResults`
```typescript
export const uatResults = pgTable("uat_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  templateId: uuid("template_id").references(() => uatTemplates.id, { onDelete: "restrict" }).notNull(),
  // JSON: { [scenarioId]: { result: 'passed' | 'failed' | 'na', notes: string, ticketId?: string } }
  results: text("results").notNull().default("{}"),
  status: stageStatusEnum("status").notNull().default("active"),
  submittedAt: timestamp("submitted_at"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdx: index("uat_results_project_idx").on(table.projectId),
}));
```

### `signoffs`
```typescript
export const signoffs = pgTable("signoffs", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  type: signoffTypeEnum("type").notNull(),
  // Client sign-off
  signedByClient: uuid("signed_by_client").references(() => users.id, { onDelete: "set null" }),
  signedAt: timestamp("signed_at"),
  clientConfirmText: text("client_confirm_text"), // What they typed to confirm
  // DD counter-sign
  ddCounterSignedBy: uuid("dd_counter_signed_by").references(() => users.id, { onDelete: "set null" }),
  ddCounterSignedAt: timestamp("dd_counter_signed_at"),
  // Snapshot of what was signed
  documentSnapshot: text("document_snapshot"), // JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  projectIdx: index("signoffs_project_idx").on(table.projectId),
}));
```

### `releaseNotes`
```typescript
export const releaseNotes = pgTable("release_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  phaseId: uuid("phase_id").references(() => projectPhases.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  publishedAt: timestamp("published_at"),
  publishedBy: uuid("published_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIdx: index("release_notes_project_idx").on(table.projectId),
}));
```

### `clientFlags`
```typescript
export const clientFlags = pgTable("client_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  raisedBy: uuid("raised_by").references(() => users.id, { onDelete: "set null" }).notNull(),
  // 'client_input_needed' = admin flagging client | 'client_blocker' = client flagging DD
  type: varchar("type", { length: 50 }).notNull(),
  message: text("message").notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  projectIdx: index("client_flags_project_idx").on(table.projectId),
}));
```

### `helpArticles`
```typescript
export const helpArticles = pgTable("help_articles", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  content: text("content").notNull(), // Markdown
  category: varchar("category", { length: 100 }),
  loomUrl: text("loom_url"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});
```

### `goLiveEvents`
```typescript
export const goLiveEvents = pgTable("go_live_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  celebratedAt: timestamp("celebrated_at").defaultNow().notNull(),
  // JSON: { employeesSynced, recordsCreated, etc. }
  syncStats: text("sync_stats"),
  // JSON: array of userIds who have seen the celebration
  celebrationShownTo: text("celebration_shown_to").default("[]"),
}, (table) => ({
  projectIdx: index("go_live_events_project_idx").on(table.projectId),
}));
```

---

## Part 5 — Add Relations for New Tables

Add relations for all new tables in the Relations section:

```typescript
export const discoveryTemplatesRelations = relations(discoveryTemplates, ({ many }) => ({
  responses: many(discoveryResponses),
}));

export const discoveryResponsesRelations = relations(discoveryResponses, ({ one }) => ({
  project: one(projects, { fields: [discoveryResponses.projectId], references: [projects.id] }),
  template: one(discoveryTemplates, { fields: [discoveryResponses.templateId], references: [discoveryTemplates.id] }),
  reviewer: one(users, { fields: [discoveryResponses.reviewedBy], references: [users.id] }),
}));

export const dataMappingConfigsRelations = relations(dataMappingConfigs, ({ one, many }) => ({
  project: one(projects, { fields: [dataMappingConfigs.projectId], references: [projects.id] }),
  entries: many(dataMappingEntries),
}));

export const dataMappingEntriesRelations = relations(dataMappingEntries, ({ one }) => ({
  config: one(dataMappingConfigs, { fields: [dataMappingEntries.configId], references: [dataMappingConfigs.id] }),
}));

export const uatTemplatesRelations = relations(uatTemplates, ({ many }) => ({
  results: many(uatResults),
}));

export const uatResultsRelations = relations(uatResults, ({ one }) => ({
  project: one(projects, { fields: [uatResults.projectId], references: [projects.id] }),
  template: one(uatTemplates, { fields: [uatResults.templateId], references: [uatTemplates.id] }),
}));

export const signoffsRelations = relations(signoffs, ({ one }) => ({
  project: one(projects, { fields: [signoffs.projectId], references: [projects.id] }),
}));

export const releaseNotesRelations = relations(releaseNotes, ({ one }) => ({
  project: one(projects, { fields: [releaseNotes.projectId], references: [projects.id] }),
  phase: one(projectPhases, { fields: [releaseNotes.phaseId], references: [projectPhases.id] }),
}));

export const clientFlagsRelations = relations(clientFlags, ({ one }) => ({
  project: one(projects, { fields: [clientFlags.projectId], references: [projects.id] }),
}));

export const helpArticlesRelations = relations(helpArticles, ({ }) => ({}));

export const goLiveEventsRelations = relations(goLiveEvents, ({ one }) => ({
  project: one(projects, { fields: [goLiveEvents.projectId], references: [projects.id] }),
}));
```

Also update `projectsRelations` to include the new relationships:
```typescript
// Add to existing projectsRelations:
discoveryResponses: many(discoveryResponses),
mappingConfigs: many(dataMappingConfigs),
uatResults: many(uatResults),
signoffs: many(signoffs),
releaseNotes: many(releaseNotes),
flags: many(clientFlags),
```

---

## Part 6 — Update Seed Data

File: `src/lib/db/seed.ts`

Read the existing seed file first. Then make these changes:

1. **Remove** any seed data that references `supportHoursPerMonth`, `hoursUsedThisMonth`, `supportBillingCycleStart`, `supportHourLogs`, or `ticketTimeEntries`

2. **Update** the `agencies` seed to use `primaryColor: "#7C1CFF"` instead of the old value

3. **Update** all seeded projects to include `currentStage` — use realistic values:
   - Active/in-progress projects: `'build'` or `'mapping'`
   - Completed projects: `'support'`
   - New/planning projects: `'discovery'`

4. **Add** `payrollSystem: 'keypay'` to seeded projects (default for existing ones)

5. **Do NOT** add seed data for the new tables (discoveryTemplates, uatTemplates, etc.) — those will be populated manually via the UI

---

## Part 7 — Apply to Database

After schema changes are complete and TypeScript compiles cleanly:

```bash
npm run db:push    # Push schema changes to the database
npm run db:seed    # Re-seed with updated data
npm run build      # Verify no TypeScript errors
```

---

## Definition of Done

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `npm run db:push` applies without errors
- [ ] `npm run db:seed` runs without errors
- [ ] `npm run build` passes
- [ ] `supportHourLogs` table no longer exists in schema
- [ ] `ticketTimeEntries` table no longer exists in schema
- [ ] `clients` no longer has `supportHoursPerMonth`, `hoursUsedThisMonth`, `supportBillingCycleStart`
- [ ] `tickets` no longer has `estimatedMinutes`, `timeSpentMinutes`
- [ ] All 13 new tables exist in schema with correct columns and relations
- [ ] `projects.currentStage` exists and defaults to `'pre_sales'`
- [ ] `projects.payrollSystem` exists
- [ ] `clients.freshdeskId` exists
- [ ] `tickets.freshdeskId` and `tickets.freshdeskUrl` exist
- [ ] No UI files were touched

---

## Important Notes

- **Do not change any UI files, API routes, or components.** This sprint is schema only.
- If any existing API routes import `supportHourLogs` or `ticketTimeEntries` from the schema, those imports will break. Do not fix the routes — just note them as broken in a comment and leave them for Sprint 3's cleanup pass.
- The `json` columns (sections, responses, etc.) use `text` type rather than `jsonb` to stay compatible with Drizzle's pattern used elsewhere in this codebase. Store and parse as JSON strings.
- All new encrypted columns (`hibobApiKey`, `payrollApiKey`) are plain `text` — encryption happens at the application layer using the existing `src/lib/crypto.ts` pattern, not at the DB level.

---

*Branch: `sprint/2-database-schema` — merge to main when build passes.*
