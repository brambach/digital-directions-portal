# Sprint 1 Brief — Foundation & Design System

## Context

**Project:** DD Portal — a custom-built HiBob integration lifecycle management portal for Digital Directions consulting.
**Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Shadcn UI, Clerk auth, Vercel Postgres, Drizzle ORM.
**Working directory:** `src/`

**Full plan:** See `DD-PORTAL-2026-IMPLEMENTATION-PLAN.md` for the complete revamp spec.

---

## First Step — Create the Branch

Before touching any files, run:
```bash
git checkout -b sprint/1-design-system
```

---

## What's Already Done — Do NOT redo these

The following was completed before this sprint and should be left exactly as-is:

| File | Status |
|------|--------|
| `src/components/layout/admin-shell.tsx` | ✅ Light mode (`bg-[#F4F5F9]`) |
| `src/components/layout/admin-sidebar.tsx` | ✅ Full light mode — white bg, violet active states, purple logo |
| `src/components/layout/admin-header.tsx` | ✅ Full light mode — white bg, search, NotificationBell, purple New button |
| `src/app/(dashboard)/dashboard/admin/page.tsx` | ✅ Full light mode redesign — stat cards, pipeline, tickets, actions |
| `src/components/animated-progress-bar.tsx` | ✅ Built |
| `src/components/diji-mascot.tsx` | ✅ Built — `<DijiMascot variant="neutral" size="sm" />` |
| `public/images/digi/` | ✅ All 7 Diji variants present |
| `src/app/globals.css` | ✅ `--primary` updated to `265 100% 56%` (#7C1CFF) |

---

## Sprint 1 Goal

**Make the entire portal consistently light mode.** Every page, both admin and client, should match the visual language established by the admin dashboard.

---

## Design System Reference

**Page background:** `bg-[#F4F5F9]`
**Cards:** `bg-white rounded-2xl border border-slate-100` (subtle `shadow-sm` optional)
**Primary purple:** `#7C1CFF` — use `violet-600` Tailwind class for close approximation, or `text-primary`/`bg-primary` from CSS vars
**Sidebar pattern:** 240px white sidebar, `border-r border-slate-100`, active nav item = `bg-violet-50 text-violet-700`
**Header pattern:** white, `border-b border-slate-100`, 60px height
**Typography:** Geist (already set). Headings: `text-slate-900 font-bold`. Labels: `text-slate-500 text-sm`. Muted: `text-slate-400`
**No dark mode anywhere.** Remove all `bg-[#0B0E14]`, `bg-[#0F1219]`, `text-white` dark-mode classes.

---

## Tasks

### 1. Client Shell, Sidebar & Header
Migrate to light mode to match admin equivalents:
- `src/components/layout/client-shell.tsx`
- `src/components/layout/client-sidebar.tsx`
- `src/components/layout/client-header.tsx`

Follow the exact same pattern as the admin equivalents. Client sidebar should use the same purple logo (`long_form_purple_text.png`).

### 2. Admin Sub-Pages — Migrate to Light Mode
These pages still have dark-mode styling. Migrate each to match the admin dashboard aesthetic:
- `src/app/(dashboard)/dashboard/admin/clients/page.tsx`
- `src/app/(dashboard)/dashboard/admin/clients/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/admin/projects/page.tsx`
- `src/app/(dashboard)/dashboard/admin/projects/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/admin/tickets/page.tsx`
- `src/app/(dashboard)/dashboard/admin/tickets/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/admin/settings/page.tsx`

### 3. Client Pages — Migrate to Light Mode
- `src/app/(dashboard)/dashboard/client/page.tsx`
- `src/app/(dashboard)/dashboard/client/projects/page.tsx`
- `src/app/(dashboard)/dashboard/client/projects/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/client/tickets/page.tsx`
- `src/app/(dashboard)/dashboard/client/tickets/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/client/messages/page.tsx`

### 4. Wire Diji into Sidebar Footer
In `src/components/layout/admin-sidebar.tsx`, replace the `© 2025 Digital Directions` footer with Diji:

```tsx
import { DijiMascot } from "@/components/diji-mascot";

{/* Footer */}
<div className="px-4 py-3 border-t border-slate-100 flex flex-col items-center gap-2">
  <DijiMascot variant="neutral" size="xs" />
  <p className="text-[11px] text-slate-400">© 2025 Digital Directions</p>
</div>
```

Do the same for `client-sidebar.tsx`.

### 5. Wire Diji into Empty States
Find all "no results" empty state messages across all pages and add Diji beside them. Use `variant="neutral"` or `variant="celebrating"` (for positive empties like "no tickets — you're all clear"), `size="sm"`.

### 6. Create `<LifecycleStepper />` Component
**Visual only — static, not wired to DB yet.** This will be wired in Sprint 3.

File: `src/components/lifecycle-stepper.tsx`

The 9 stages (in order):
1. Pre-Sales
2. Discovery
3. Provisioning
4. HiBob Config
5. Data Mapping
6. Integration Build
7. UAT
8. Go-Live
9. Support

Props:
```tsx
interface LifecycleStepperProps {
  currentStage: string;  // key like 'discovery'
  stages?: { key: string; label: string; status: 'locked' | 'active' | 'review' | 'complete' }[];
}
```

Visual: horizontal stepper with stage names, checkmarks for complete, pulsing dot for active, lock icon for locked. Purple accent colour throughout. Should show a progress percentage. Both admin and client will see this at the top of project detail pages.

### 7. Create `<LoomEmbed />` Component
File: `src/components/loom-embed.tsx`

Client component. Lazy loads — shows a thumbnail placeholder with a purple play button until clicked, then replaces with the `<iframe>`. Takes a `url` prop (full Loom share URL), extracts the video ID, builds the embed URL.

```tsx
interface LoomEmbedProps {
  url: string;         // e.g. https://www.loom.com/share/abc123
  title?: string;      // shown in placeholder
  className?: string;
}
```

---

## Definition of Done

- [ ] `npm run build` passes with zero errors
- [ ] No page renders a dark background
- [ ] All pages use consistent card/typography patterns matching the admin dashboard
- [ ] `--primary` CSS var is `265 100% 56%` (#7C1CFF) — already done, verify it looks correct
- [ ] Diji is visible in both admin and client sidebar footers
- [ ] `<LifecycleStepper />` renders correctly with mock stage data
- [ ] `<LoomEmbed />` renders a placeholder and loads the iframe on click

---

## Key Files to Read First

Before touching any page, read the existing admin implementations to understand the patterns:
- `src/components/layout/admin-sidebar.tsx` — sidebar pattern
- `src/components/layout/admin-header.tsx` — header pattern
- `src/app/(dashboard)/dashboard/admin/page.tsx` — page/card pattern
- `src/components/diji-mascot.tsx` — how to use Diji

---

*Branch: `sprint/1-design-system` — do not push to main until sprint is complete and build passes.*
