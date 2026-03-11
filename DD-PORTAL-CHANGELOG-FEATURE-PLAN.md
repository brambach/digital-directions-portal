# DD Portal — Changelog Feature Implementation Plan

## Overview

A developer-maintained changelog visible to admins and clients inside the portal. No database, no admin UI — Claude edits a static TypeScript file when features ship. A "What's New" badge in the sidebar indicates unread entries, tracked via localStorage.

---

## Architecture Decisions

### Static data file (no DB)
Since Bryce develops via Claude Code, the changelog is maintained as a TypeScript file in the codebase. Claude edits it directly after shipping features. Version-controlled, zero maintenance overhead.

### Two separate pages
Following the existing `/dashboard/admin/*` and `/dashboard/client/*` pattern:
- Admin page renders **all** entries (including `audience: "admin"` ones)
- Client page filters to `audience: "all"` entries only
- Both read from the same data file — no role checks needed in components

### "What's New" badge via localStorage
- No DB needed
- Stores the date of the last-seen entry
- Clears when the user visits the changelog page
- Two separate "latest" date exports prevent clients seeing a badge for admin-only entries

---

## Files to Create

| File | Purpose |
|---|---|
| `src/lib/changelog.ts` | Data file — array of entries Claude edits ✅ done |
| `src/components/changelog-entry.tsx` | Timeline card component for one entry |
| `src/components/changelog-whats-new-badge.tsx` | localStorage-aware NEW badge for sidebar |
| `src/components/changelog-page-client.tsx` | Shared `"use client"` wrapper (extracted, not duplicated) |
| `src/app/(dashboard)/dashboard/admin/changelog/page.tsx` | Admin changelog page |
| `src/app/(dashboard)/dashboard/client/changelog/page.tsx` | Client changelog page |

## Files to Modify

| File | Change |
|---|---|
| `src/components/layout/admin-sidebar.tsx` | Add Changelog nav item + `badgeComponent` support |
| `src/components/layout/client-sidebar.tsx` | Same |

---

## Data Model

**`src/lib/changelog.ts`**

```typescript
export type ChangelogTag = "feature" | "fix" | "improvement" | "internal";
export type ChangelogAudience = "admin" | "all";

export interface ChangelogEntry {
  id: string;              // slug: "2026-03-10-connector-health"
  date: string;            // ISO date: "2026-03-10"
  version?: string;        // optional semver: "1.4.0"
  title: string;
  description: string;     // one-sentence summary shown in timeline
  tags: ChangelogTag[];
  audience: ChangelogAudience;
  items: string[];         // bullet-point detail lines
}

export const CHANGELOG: ChangelogEntry[] = [
  // Entries go here, newest first
];

// Separate "latest" dates — prevents clients seeing badge for admin-only entries
export const LATEST_ADMIN_ENTRY_DATE = CHANGELOG[0]?.date ?? "";
export const LATEST_CLIENT_ENTRY_DATE = CHANGELOG.find(e => e.audience === "all")?.date ?? "";
export const CHANGELOG_LS_KEY = "dd_portal_changelog_seen";
```

---

## Component Breakdown

### `changelog-entry.tsx`
Presentational component. Renders one `ChangelogEntry` as a timeline card.

**Props:** `entry: ChangelogEntry`, `isNew?: boolean`

**Visual structure:**
- Left column: vertical timeline stem, date label, optional version chip
- Right column: white card with thin left accent border in `#7C1CFF`
- Title: `font-bold text-slate-900`
- Description: `text-sm text-slate-500`
- Tag badges (pill style):
  - `feature` → `bg-violet-50 text-violet-700`
  - `fix` → `bg-red-50 text-red-600`
  - `improvement` → `bg-sky-50 text-sky-700`
  - `internal` → `bg-slate-100 text-slate-500` (never shown to clients)
- Bullet items: `<ul>` with `text-sm text-slate-600` and violet dot markers
- `isNew` flag: renders a subtle "NEW" pill on entries newer than last-seen date

### `changelog-whats-new-badge.tsx`
`"use client"` component. Reads localStorage on mount and shows/hides a badge.

**Props:** `latestDate: string`

**Logic:**
- Initialises as `null` (no badge during SSR — hydration safe)
- `useEffect` reads `localStorage.getItem(CHANGELOG_LS_KEY)`
- Shows badge if stored value is absent or older than `latestDate`
- Badge style matches existing BETA badge in sidebars: `text-[10px] px-1.5 py-0.5 rounded-full font-bold`
- Badge color: `bg-violet-100 text-violet-600`, text: `NEW`

### Admin changelog page
Server component. Calls `requireAdmin()`, imports full `CHANGELOG`, passes all entries to a thin client wrapper.

### Client changelog page
Server component. Calls `requireAuth()`, imports `CHANGELOG`, filters to `audience === "all"` entries, passes to client wrapper.

### Shared `ChangelogPageClient` — extract to `src/components/changelog-page-client.tsx`
`"use client"` wrapper that:
1. Runs `useEffect` on mount to write `localStorage.setItem(CHANGELOG_LS_KEY, latestDate)` — clears the badge
2. Determines which entries are "new" (date > stored last-seen) for the `isNew` prop
3. Renders `<ChangelogEntry />` cards
4. Shows Diji mascot empty state if no entries

---

## Route Plan

| Route | Auth | Shows |
|---|---|---|
| `/dashboard/admin/changelog` | `requireAdmin()` | All entries |
| `/dashboard/client/changelog` | `requireAuth()` | `audience: "all"` entries only |

No new middleware rules needed — both fall under existing route matchers.

---

## Sidebar Integration

Add `badgeComponent` field to the nav item type (alongside existing string `badge` field). In `renderNavItem`, render `badgeComponent` instead of the string badge when present. This keeps the existing BETA badge logic untouched.

```typescript
// Nav item for changelog (admin sidebar)
{
  label: "Changelog",
  href: "/dashboard/admin/changelog",
  icon: History,
  badgeComponent: <ChangelogNavBadge latestDate={LATEST_ADMIN_ENTRY_DATE} />,
}

// Nav item for changelog (client sidebar)
{
  label: "Changelog",
  href: "/dashboard/client/changelog",
  icon: History,
  badgeComponent: <ChangelogNavBadge latestDate={LATEST_CLIENT_ENTRY_DATE} />,
}
```

Both sidebars are already `"use client"` so importing `ChangelogNavBadge` has no boundary issues.

---

## "What's New" Badge — Full Logic

| Scenario | Badge shown? |
|---|---|
| User has never visited changelog | Yes |
| User visited before, no new entries since | No |
| New entry added (any audience), user hasn't visited | Yes (admin) |
| New entry added (`audience: "admin"`), client user hasn't visited | No (uses `LATEST_CLIENT_ENTRY_DATE`) |
| User visits changelog page | Badge cleared |

---

## Visual Design Reference

- Card accent border pattern: follow `src/components/release-note-card.tsx`
- Page header pattern: follow existing admin pages (eyebrow text + `text-2xl font-bold`)
- Empty state: Digi mascot (`sleeping` variant) — "Nothing here yet — check back after the next release"
- Timeline stem: thin vertical `border-l-2 border-slate-200` line in the left column

---

## Claude's Update Workflow

When Bryce says "update the changelog" after shipping a feature, Claude will:

1. Read `src/lib/changelog.ts`
2. Prepend a new `ChangelogEntry` to the `CHANGELOG` array (newest first)
3. Set `audience: "all"` for client-facing features, `audience: "admin"` for internal tooling
4. Use today's date, a descriptive `id` slug, appropriate `tags`, and clear `items` bullet points

> **Note:** `LATEST_ADMIN_ENTRY_DATE` and `LATEST_CLIENT_ENTRY_DATE` are computed expressions — they auto-update when entries are prepended. No manual edit needed.

Example entry:
```typescript
{
  id: "2026-03-10-integration-health-monitoring",
  date: "2026-03-10",
  title: "Integration Health Monitoring",
  description: "Global health monitoring for HiBob, Workato, KeyPay and other connected systems.",
  tags: ["feature"],
  audience: "all",
  items: [
    "Real-time status for HiBob, Workato, KeyPay, NetSuite, Deputy, and MYOB",
    "Flow diagram showing connection health per project",
    "Manual check link for MYOB (no public status API)",
    "Global monitors always checked on every cron run",
  ],
},
```

---

## Edge Cases

| Case | Handling |
|---|---|
| Empty `CHANGELOG` array | Show `<DigiMascot variant="sleeping" />` empty state |
| `internal` tag on `audience: "all"` entry | Client page omits rendering the `internal` tag pill |
| Admin-only entry on admin page | Show subtle "Admin only" pill alongside title |
| Badge hydration mismatch | `ChangelogNavBadge` initialises as `null`, sets state in `useEffect` |
| Future: anchor links | `id` field is already a slug — add `id={entry.id}` to card div for free |
| Future: pagination | Not needed initially; add year filter tabs if list exceeds ~50 entries |

---

## Implementation Order

1. ~~`src/lib/changelog.ts`~~ ✅ Done — data file with types + first real entry
2. `src/components/changelog-entry.tsx` — timeline card
3. `src/components/changelog-whats-new-badge.tsx` — localStorage badge
4. `src/components/changelog-page-client.tsx` — shared client wrapper
5. Admin and client page files
6. Sidebar modifications (nav item + `badgeComponent` support)

## Codebase Notes for Implementer

- Mascot component: `DigiMascot` from `src/components/digi-mascot.tsx` (not "Diji") — use `variant="sleeping"` for empty state
- Sidebars use `item: any` for nav items — just add `badgeComponent?: React.ReactNode` inline, no need for a full type refactor
- Client sidebar has no existing badge rendering in `renderNavItem` — add it fresh
- Admin sidebar badge colors: `item.badge === "BETA"` → blue, else → violet. `badgeComponent` bypasses this entirely — render it directly
- Changelog nav item goes in the **TOOLS** group for both sidebars (informational, not primary workflow)
- `isNew` logic: `lastSeen !== null && lastSeen < entry.date` — works correctly because `"" < "2026-03-10"` is `true` in JS string comparison
