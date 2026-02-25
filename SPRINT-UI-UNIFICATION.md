# Sprint Prompt: UI Unification — DD Portal

---

## Context

You are working on the **Digital Directions Portal**, a custom-built client management portal for Digital Directions, an Australian integration consultancy. It is a single-tenant Next.js 15 app (App Router, TypeScript, Tailwind CSS, Shadcn UI, Clerk auth).

**Two user types:**
- **Admin** — Digital Directions staff. See: clients list, client detail, projects, tickets queue, reports, settings, messages
- **Client** — Client company users. See: their dashboard, their projects, tickets, help centre, ROI calculator, connectors

**Brand:**
- Primary colour: `#7C1CFF` (DD Violet 5). This is the only purple to use everywhere. Never use Tailwind `violet-600` (#7C3AED) or `purple-600` (#9333ea) as the primary accent.
- Background: `#F4F5F9` (page bg), `#FFFFFF` (cards)
- Font: Geist (already loaded via `next/font`)
- Design feel: clean, light, professional SaaS — not corporate/heavy

**Before you start:** Read `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, and `src/components/layout/admin-sidebar.tsx` to orient yourself on the existing system.

---

## Goal

This sprint is a **UI unification pass**. The portal was built iteratively and has accumulated inconsistencies across pages. The goal is NOT to redesign — it is to make every page feel like it belongs to the same design system: consistent card styles, typography scale, page header patterns, colour usage, button styles, spacing, animation, and empty states.

Do not add new features. Do not change layouts or content. Only fix what is listed below.

---

## Design System — Source of Truth

After this sprint, the following rules apply everywhere:

### Colour
- **Brand purple:** Always use `text-[#7C1CFF]`, `bg-[#7C1CFF]`, `border-[#7C1CFF]` for brand-specific uses — OR use Tailwind's `violet-*` scale only where a shade is needed (e.g. `violet-50` for tinted backgrounds, `violet-100` for icon backgrounds). For `bg-[#7C1CFF]` hover states use `hover:bg-[#6B0FEE]`.
- **Never use `purple-*` Tailwind classes** — remove all instances of `bg-purple-600`, `text-purple-*`, etc.
- **Text**: `slate-900` (primary), `slate-600` (secondary), `slate-400` (muted/placeholder). All body text uses `slate-*` not `gray-*`.
- **Borders**: `border-slate-100` (default cards), `border-slate-200` (inputs, dividers)
- **Page background**: `bg-[#F4F5F9]`

### Cards
Standard card: `bg-white rounded-2xl border border-slate-100 p-5` with `shadow-sm`
Hover interactive card (links/buttons styled as cards): add `hover:border-violet-200 hover:shadow-md transition-all duration-200`
**Never use `rounded-[20px]`** (one-off kanban value) — always `rounded-2xl`
**Never hardcode shadows** like `shadow-[0_20px_40px...]` on standard cards — use `shadow-sm` / `hover:shadow-md`

### Page Headers
Every page uses **Pattern A** — a white banner at the very top, above the scrollable content:

```tsx
<div className="bg-white border-b border-slate-100 px-7 py-5 flex-shrink-0">
  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Section label</p>
  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Page Title</h1>
</div>
```

For pages with a back-navigation button, put it inside the white banner using this pattern (consistent across admin AND client):

```tsx
<div className="bg-white border-b border-slate-100 px-7 py-5 flex-shrink-0">
  <button onClick={() => router.back()} className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-800 mb-3 transition-colors">
    <ArrowLeft className="w-3.5 h-3.5" />
    Back to [section]
  </button>
  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Page Title</h1>
</div>
```

No circular icon buttons for back navigation. Text links only, consistent across admin and client.

### Typography
Use these sizes only (no arbitrary px values like `text-[15px]`, `text-[13.5px]`, `text-[10.5px]`):

| Use | Class |
|---|---|
| Page title | `text-2xl font-bold text-slate-900 tracking-tight` |
| Section heading (within page) | `text-sm font-semibold text-slate-700` |
| Eyebrow / section label | `text-[11px] font-semibold text-slate-400 uppercase tracking-widest` |
| Body text | `text-sm text-slate-600` |
| Muted / meta | `text-xs text-slate-400` |
| Card stat number | `text-2xl font-bold text-slate-900` |
| Card stat label | `text-xs font-medium text-slate-500` |

For the `text-[11px]` eyebrow label — this is the only non-scale value permitted, as it matches the existing `.text-label` utility defined in globals.css.

### Buttons
**Use the Shadcn `<Button>` component for every interactive button.** No raw `<button>` or `<a>` elements styled as buttons.

- Primary action: `<Button>` (default variant) — uses `bg-[#7C1CFF]` via CSS var
- Secondary/cancel: `<Button variant="outline">`
- Destructive: `<Button variant="destructive">`
- Icon-only: `<Button variant="ghost" size="icon">`
- Ghost with colour: `<Button variant="ghost" className="text-[#7C1CFF] hover:bg-violet-50">`

The existing `src/components/ui/button.tsx` has `bg-purple-600` in the default variant. Change this to use the CSS variable: `bg-primary` (which maps to `#7C1CFF`). Confirm the CSS var is correct in globals.css before changing.

### Badges / Status Pills
All status/priority/type badges use `rounded-full`. No `rounded` or `rounded-md` variants for badge-style pills.

### Empty States
Always use the `<DijiMascot>` component for empty states — not icon-in-a-box or dashed-border patterns.

```tsx
<div className="py-16 text-center">
  <DijiMascot variant="neutral" size="sm" className="mb-3 mx-auto" />
  <p className="text-sm font-medium text-slate-700">No [items] yet</p>
  <p className="text-xs text-slate-400 mt-1">Optional supporting text</p>
</div>
```

### Animations
Use **one animation system**: `animate-enter` with `delay-100/200/300` stagger (already defined in globals.css). Remove `animate-dashboard-reveal stagger-N` from the admin dashboard and replace with `animate-enter delay-N` so both systems are unified. The `animate-enter` keyframe (opacity 0 → 1, translateY 12px → 0) is already defined.

---

## Specific Fixes — In Priority Order

### P0: Bugs / Breaking Issues

**1. Remove dark mode from root layout**
In `src/app/layout.tsx`, remove `className="dark"` and `style={{ colorScheme: 'dark' }}` from the `<html>` tag. The portal is light mode only.

**2. Remove duplicate font loading**
In `src/app/globals.css`, delete the `@import url('https://fonts.googleapis.com/css2?family=Geist...')` line at line 1. The font is already loaded optimally via `next/font` in `layout.tsx`.

**3. Fix `button.tsx` primary colour**
In `src/components/ui/button.tsx`, the default variant uses `bg-purple-600` — change to `bg-primary hover:bg-primary/90` so it uses the CSS variable `#7C1CFF`.

---

### P1: Systemic Inconsistencies

**4. Standardise `gray-*` → `slate-*` across older admin pages**
These files use `text-gray-*`, `border-gray-100`, `bg-gray-*` — replace with `slate-*` equivalents:
- `src/app/(dashboard)/dashboard/admin/clients/page.tsx`
- `src/app/(dashboard)/dashboard/admin/clients/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/admin/projects/page.tsx`
- `src/app/(dashboard)/dashboard/admin/tickets/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/admin/settings/page.tsx`
- Any component files that exclusively serve these pages

Direct mapping: `gray-50` → `slate-50`, `gray-100` → `slate-100`, `gray-200` → `slate-200`, `gray-400` → `slate-400`, `gray-500` → `slate-500`, `gray-600` → `slate-600`, `gray-700` → `slate-700`, `gray-900` → `slate-900`. Also change `border-gray-100` in `src/components/ui/card.tsx` to `border-slate-100`.

**5. Standardise page headers to Pattern A**
These pages currently use Pattern B (no white banner). Convert each to Pattern A:
- `src/app/(dashboard)/dashboard/admin/clients/page.tsx`
- `src/app/(dashboard)/dashboard/admin/clients/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/admin/projects/page.tsx`
- `src/app/(dashboard)/dashboard/admin/tickets/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/admin/settings/page.tsx`

For detail pages (client detail, ticket detail), include the back-navigation text link inside the banner per the spec above. Remove the current inline-within-scrollable-content header approach.

**6. Unify back-navigation style**
- Admin project detail (`src/app/(dashboard)/dashboard/admin/projects/[id]/page.tsx`) uses a circular `rounded-full` icon button. Replace with the text link pattern.
- Client project detail (`src/app/(dashboard)/dashboard/client/projects/[id]/page.tsx`) uses `rounded-lg` button. Replace with the text link pattern.
Both should now look identical.

**7. Fix kanban project cards (`rounded-[20px]` → `rounded-2xl`)**
In `src/app/(dashboard)/dashboard/admin/projects/page.tsx`, change `rounded-[20px]` to `rounded-2xl` and `hover:shadow-[0_20px_40px...]` to `hover:shadow-md transition-all duration-200`.

**8. Fix `TicketTypeBadge` radius**
In `src/components/ticket-status-badge.tsx`, change `TicketTypeBadge` from `rounded` to `rounded-full` to match `TicketStatusBadge` and `TicketPriorityBadge`.

**9. Replace all raw `<button>` elements in `help-client-browser.tsx`**
In `src/components/help-client-browser.tsx`, replace category tab buttons and article card buttons with the Shadcn `<Button>` component (use `variant="ghost"` for tabs, and wrap article cards in `<Button variant="ghost" className="w-full text-left h-auto p-0">` or a `<button>` styled correctly — check context).

**10. Fix admin sidebar "New" button**
In `src/components/layout/admin-header.tsx`, the "New" button is a raw `<Link>` with manual `rounded-lg bg-violet-600` classes. Replace with the `<Button>` component using `asChild`:
```tsx
<Button asChild size="sm" className="mr-2">
  <Link href="/dashboard/admin/tickets/new">
    <Plus className="w-3.5 h-3.5 mr-1.5" />
    New
  </Link>
</Button>
```

**11. Fix hardcoded "Active Project" on kanban cards**
In `src/app/(dashboard)/dashboard/admin/projects/page.tsx`, the status label is hardcoded as `"Active Project"` on all cards. Render the actual `project.status` value formatted properly instead (e.g. `"planning"` → `"Planning"`, `"in_progress"` → `"In Progress"`).

---

### P2: Polish & Minor Fixes

**12. Unify animation system**
In `src/app/(dashboard)/dashboard/admin/page.tsx`, replace `animate-dashboard-reveal stagger-1` through `stagger-8` with `animate-enter delay-[0ms]` through `delay-[700ms]` (or use the existing `delay-100/200/300` utility classes). Add corresponding `delay-400` through `delay-700` in globals.css if not present. Remove the `animate-dashboard-reveal` keyframe and stagger CSS if they exist in globals.css.

**13. Remove hardcoded `font-geist` class from pages**
Some pages manually add `font-geist` class (`clients/page.tsx`, `tickets/[id]/page.tsx`, `settings/page.tsx`). Remove these — the font is already set globally on `body`.

**14. Update copyright year**
In both `src/components/layout/admin-sidebar.tsx` and `src/components/layout/client-sidebar.tsx`, change `© 2025` to `© 2026`.

**15. Remove hardcoded `"8"` badge on sidebar Messages item**
In `src/components/layout/admin-sidebar.tsx`, the Messages nav item has a hardcoded badge `"8"`. Remove it entirely (this is stale mock data, not live data).

**16. Unify stat card implementation**
The `src/components/ui/stat-card.tsx` component (used only on admin client detail) is visually heavier than the lightweight inline stat cards used everywhere else. Replace the `<StatCard>` usages in `src/app/(dashboard)/dashboard/admin/clients/[id]/page.tsx` with the standard inline pattern:
```tsx
<div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
  <p className="text-xs font-medium text-slate-500 mb-1">Label</p>
  <p className="text-2xl font-bold text-slate-900">Value</p>
</div>
```
After this, `stat-card.tsx` can be deleted if no other usages remain.

**17. Standardise client project detail "Get Support" button**
In `src/app/(dashboard)/dashboard/client/projects/[id]/page.tsx`, the "Get Support" button uses manual Tailwind classes for a ghost-violet style. Replace with `<Button variant="outline" className="border-[#7C1CFF] text-[#7C1CFF] hover:bg-violet-50">`.

**18. Add missing page header to Messages page**
`src/app/(dashboard)/dashboard/admin/messages/page.tsx` (or wherever `<MessagesInterface />` is rendered) has no Pattern A header. Wrap the page in the standard shell and add the white banner header with title "Messages" and eyebrow "Communication".

**19. Empty state consistency in Admin Client Detail projects section**
Currently uses an icon-in-a-box pattern. Replace with the `<DijiMascot>` empty state pattern.

**20. Remove unused CSS from globals.css**
Remove the `.badge-base`, `.badge-success`, `.badge-warning`, `.badge-error`, `.badge-info` classes (defined but never used — all badges use inline Tailwind). Also remove `.skeleton` and `.skeleton-text` (never used). Keep everything else.

---

## What NOT to Change

- Do not change any layouts, grid structures, or component compositions
- Do not change any functionality or data fetching logic
- Do not modify the Shadcn `ui/` components except `button.tsx` and `card.tsx` as specified
- Do not change the lifecycle stepper, stage cards, or the Digi Chat component — these are intentionally custom
- Do not change page routing or navigation structure
- Do not touch `src/lib/`, `src/app/api/`, or any database/auth code
- Do not add new components — edit existing ones
- Do not change the sidebar structure or navigation items (only the "8" badge and copyright year)

---

## Suggested Work Order

Work in this order to catch bugs early and build on a solid foundation:

1. **P0 fixes first** (items 1–3) — these are bugs affecting the whole app
2. **button.tsx fix** (item 3) — needed before touching any button across the app
3. **gray → slate** (item 4) — do this before the header changes so you're working with clean code
4. **Page headers** (item 5) — convert all Pattern B → Pattern A in one pass
5. **Back navigation** (item 6) — quick win after headers are done
6. **Remaining P1 items** (7–11) — one at a time
7. **P2 polish** (12–20) — work top to bottom

After each group of changes, mentally verify: does the page look like it belongs to the same family as the Admin Dashboard and Client Dashboard (which are already the most polished pages)?

---

## Files You Will Definitely Touch

- `src/app/layout.tsx` — dark mode bug
- `src/app/globals.css` — font import, unused CSS
- `src/components/ui/button.tsx` — primary colour fix
- `src/components/ui/card.tsx` — border-gray → border-slate
- `src/components/layout/admin-sidebar.tsx` — copyright, hardcoded badge
- `src/components/layout/client-sidebar.tsx` — copyright
- `src/components/layout/admin-header.tsx` — "New" button
- `src/components/help-client-browser.tsx` — raw buttons
- `src/components/ticket-status-badge.tsx` — TicketTypeBadge radius
- `src/app/(dashboard)/dashboard/admin/page.tsx` — animation unification
- `src/app/(dashboard)/dashboard/admin/clients/page.tsx`
- `src/app/(dashboard)/dashboard/admin/clients/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/admin/projects/page.tsx`
- `src/app/(dashboard)/dashboard/admin/projects/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/admin/tickets/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/admin/settings/page.tsx`
- `src/app/(dashboard)/dashboard/admin/messages/page.tsx` (or messages interface component)
- `src/app/(dashboard)/dashboard/client/projects/[id]/page.tsx`
