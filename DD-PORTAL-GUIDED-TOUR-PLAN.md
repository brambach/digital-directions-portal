# DD Portal — Guided Tour Feature Plan

## Overview

A first-time onboarding tour for **client users** that walks them through the portal with Digi as the guide. Fires once after a new user's first login, **only on the dashboard page**. Uses a custom spotlight overlay with Digi speech bubbles — no external library.

---

## Architecture Decisions

### Custom implementation (no library)

React Joyride and Shepherd add bundle weight and generic styling that clashes with the portal's design. The tour is simple enough (5–7 steps, all on one page) that a custom overlay + spotlight mask is cleaner and lets Digi's personality shine.

### Client-only

The tour targets client users who are new to the portal. Admins built the portal — they don't need a tour. If we want an admin tour later, it's a separate step config.

### localStorage for completion state

Same pattern as the changelog badge: `dd_portal_tour_completed` key. No DB field needed. If a user clears localStorage, they see the tour again — that's fine, not harmful.

### Dashboard-only tour

All steps target elements visible on the client dashboard page (`/dashboard/client`). The `TourOverlay` lives in `client-shell.tsx` (which wraps all client pages) but **only auto-starts when `pathname === "/dashboard/client"`**. If the user lands on a different page first (e.g., from an email notification link), the tour waits until they visit the dashboard.

No page navigation during the tour — that adds complexity and breaks if the user has no projects. The tour points at sidebar items and says "click here to go to X" rather than actually navigating.

---

## Tour Steps

| # | Target | Digi says | Digi variant | Points at |
|---|---|---|---|---|
| 1 | Welcome (no target) | "Hey! I'm Digi, your guide to the Digital Directions portal. Let me show you around — it'll only take a minute." | `neutral` | Centre of screen |
| 2 | Sidebar — Projects | "This is where you'll find your integration projects. Each project tracks every step from kickoff to go-live." | `neutral` | Projects nav item |
| 3 | Sidebar — Support | "Need help? Open a support ticket here and the DD team will jump in." | `neutral` | Support nav item |
| 4 | Stat cards | "These cards give you a snapshot — active projects, system health, and any steps waiting on you." | `neutral` | Stat cards row |
| 5 | Notification bell | "You'll get a ping here whenever something needs your attention — stage updates, messages, or alerts." | `neutral` | Bell icon in header |
| 6 | Digi chat bubble | "And if you ever have a quick question, just tap my chat bubble down here. I can help with most things!" | `neutral` | Chat bubble (bottom-right) |
| 7 | Done (no target) | "That's it! You're all set. If you ever want to replay this tour, you'll find the option in the Help Centre." | `celebrating` | Centre of screen |

### Adaptive steps

- **No projects**: Step 4 (stat cards) adjusts text: "Once your project is set up, these cards will show your progress."
- **Target not found**: Any step whose `data-tour` target is missing (e.g., sidebar hidden on mobile, chat not rendered) is silently skipped.

---

## Component Breakdown

### `src/components/guided-tour/tour-overlay.tsx`

`"use client"` — the main controller component.

**State:**
- `currentStep: number` (0-indexed, starts at 0)
- `isActive: boolean` (controlled by internal logic)
- `spotlightRect: DOMRect | null` (measured from target element)

**Behaviour:**
1. On mount, check `localStorage.getItem("dd_portal_tour_completed")`
2. If tour not yet completed, **immediately** write `localStorage.setItem("digi-prompt-seen", "true")` to suppress the Digi chat prompt (must happen before chat bubble's 100ms mount delay — see Digi Prompt Suppression)
3. Check `pathname === "/dashboard/client"` — if not, do nothing (wait for dashboard visit)
4. If not completed and on dashboard, wait 1.5s (let dashboard animations finish), then start
5. Each step: find target element by `data-tour` attribute, `scrollIntoView({ block: "nearest", behavior: "smooth" })` if needed, then measure its rect, position spotlight + speech bubble
6. "Next" / right arrow / Enter advances. "Back" / left arrow goes back (steps 2+). "Skip" dismisses entirely. **Escape** dismisses.
7. Clicking the dimmed overlay area does nothing — the click-blocking layer prevents accidental interaction with elements below.
8. On final step ("Got it!") or skip: `localStorage.setItem("dd_portal_tour_completed", "true")`
9. If `pathname` changes away from `/dashboard/client` mid-tour (e.g., user found a way to navigate), dismiss the tour and mark as completed.

**Rendering:**
- Full-screen fixed container (`z-[9995]`) — below chat bubble (`z-[9998]`) but above everything else including the Digi prompt (`z-[9997]`)

> **⚠️ Z-index note:** The Digi prompt bubble sits at `z-[9997]`. The overlay must be **above** this to prevent the prompt floating over the dimmed background. Use `z-[9995]` for the overlay container. This is still below the chat button (`z-[9998]`), so the button shows through the SVG cutout during step 6.

- Inside the container, three layers (all `absolute inset-0`):
  1. **SVG mask** — visual overlay with cutout. `pointer-events: none` (visual only).
  2. **Click blocker** — invisible `<div>` with `pointer-events: auto`. Catches all clicks on the dimmed area, preventing interaction with elements below. Does nothing on click.
  3. **Speech bubble** — positioned absolutely relative to the spotlight target. `pointer-events: auto` on buttons.

### `src/components/guided-tour/tour-step-bubble.tsx`

Digi's speech bubble — positioned relative to the spotlight target.

**Props:** `step: TourStep`, `onNext`, `onBack`, `onSkip`, `onFinish`, `currentIndex`, `totalSteps`

**Visual:**
- White card with rounded-2xl, shadow-xl, max-w-sm
- `role="dialog"` and `aria-modal="true"` for accessibility
- Auto-focus the "Next" / "Got it!" button on render so keyboard users can interact immediately
- Digi mascot image (variant from step definition) — 48px, left-aligned
- Speech text: `text-sm text-slate-700`
- Bottom row: step dots (violet-200 / violet-500 active) + "Back" (ghost, steps 2+) + "Skip" (ghost) + "Next" / "Got it!" (primary)
- Pointer tail (CSS triangle) pointing toward the spotlight target
- Position: auto-calculated to stay within viewport. Prefers below-right of target, flips if needed.

**Animation:**
- `framer-motion`: fade + scale from 0.95 on enter, exit to 0.95 + fade

### `src/lib/tour-steps.ts`

Static data file defining the tour steps (same pattern as `changelog.ts`).

```typescript
import type { DigiVariant } from "@/components/digi-mascot";

export interface TourStep {
  id: string;
  target: string | null;       // data-tour attribute value, null = centred overlay
  title?: string;              // optional short heading shown above message
  message: string;             // Digi's speech text
  digiVariant: DigiVariant;    // which Digi image to show
}

export const TOUR_STEPS: TourStep[] = [ /* ... */ ];
export const TOUR_LS_KEY = "dd_portal_tour_completed";
```

---

## Data Attributes

Add `data-tour="<step-id>"` attributes to target elements. This keeps tour logic decoupled from component internals.

| Attribute | File | Element |
|---|---|---|
| `data-tour="sidebar-projects"` | `client-sidebar.tsx` | Projects nav link |
| `data-tour="sidebar-support"` | `client-sidebar.tsx` | Support nav link |
| `data-tour="stat-cards"` | `client/page.tsx` | Stat cards grid wrapper |
| `data-tour="notification-bell"` | `notification-bell.tsx` | Bell button |
| `data-tour="chat-bubble"` | `digi-chat/chat-bubble.tsx` | Chat button |

### Sidebar plumbing

The sidebar's `renderNavItem` is generic — it doesn't know which items need `data-tour`. Add a `dataTour?: string` field to the nav item objects:

```typescript
// In navGroups items:
{ label: "Projects", href: "/dashboard/client/projects", icon: FolderKanban, dataTour: "sidebar-projects" },
{ label: "Support", href: "/dashboard/client/tickets", icon: Ticket, dataTour: "sidebar-support" },

// In renderNavItem, on the <Link>:
data-tour={item.dataTour}
```

---

## Files to Create

| File | Purpose |
|---|---|
| `src/lib/tour-steps.ts` | Tour step definitions + localStorage key |
| `src/components/guided-tour/tour-overlay.tsx` | Spotlight overlay + step controller |
| `src/components/guided-tour/tour-step-bubble.tsx` | Digi speech bubble card |

## Files to Modify

| File | Change |
|---|---|
| `src/components/layout/client-shell.tsx` | Render `<TourOverlay />` **before** `<DigiChat />` in JSX tree (render order matters — see Digi Prompt Suppression) |
| `src/components/layout/client-sidebar.tsx` | Add `dataTour` field to Projects and Support nav items, render `data-tour={item.dataTour}` in `renderNavItem` |
| `src/components/notification-bell.tsx` | Add `data-tour="notification-bell"` to bell button wrapper |
| `src/components/digi-chat/chat-bubble.tsx` | Add `data-tour="chat-bubble"` to chat button |
| `src/app/(dashboard)/dashboard/client/page.tsx` | Add `data-tour="stat-cards"` to stat cards grid wrapper |

---

## Overlay Structure — Technical Detail

The overlay is a fixed container with three layers:

```tsx
<div className="fixed inset-0 z-[9995]">
  {/* Layer 1: Visual mask (pointer-events: none — visual only) */}
  <svg className="absolute inset-0 w-full h-full pointer-events-none">
    <defs>
      <mask id="spotlight-mask">
        <rect width="100%" height="100%" fill="white" />
        {rect && (
          <rect
            x={rect.x - 8} y={rect.y - 8}
            width={rect.width + 16} height={rect.height + 16}
            rx={12} fill="black"
          />
        )}
      </mask>
    </defs>
    <rect
      width="100%" height="100%"
      fill="rgba(0,0,0,0.5)"
      mask="url(#spotlight-mask)"
    />
  </svg>

  {/* Layer 2: Click blocker (catches clicks on dimmed area) */}
  <div className="absolute inset-0" />

  {/* Layer 3: Spotlight glow ring (positioned over cutout) */}
  {rect && (
    <div
      className="absolute rounded-xl pointer-events-none"
      style={{
        left: rect.x - 8, top: rect.y - 8,
        width: rect.width + 16, height: rect.height + 16,
        boxShadow: "0 0 0 4px rgba(124, 28, 255, 0.2)",
      }}
    />
  )}

  {/* Layer 4: Speech bubble */}
  <TourStepBubble ... />
</div>
```

For centred steps (welcome, done), `rect` is null — no cutout, no glow, just the dimmed overlay with the bubble centred.

---

## Digi Prompt Suppression

The chat bubble component (`chat-bubble.tsx`) shows a "Got a question? Ask Digi" prompt via its own localStorage key (`digi-prompt-seen`). The timing matters:

1. **Chat bubble mounts** → sets 100ms timer → `mounted = true`
2. **Chat bubble's mounted effect** → checks `localStorage.getItem("digi-prompt-seen")` → if absent, sets 1500ms timer for prompt
3. **Tour overlay mounts** → its effect runs

If the tour overlay writes `digi-prompt-seen` **after** the chat bubble's mounted effect (step 2), the prompt timer is already running and will fire regardless.

**Fix — two parts:**
1. **Write immediately on mount**: The tour overlay writes `digi-prompt-seen` to localStorage in its first `useEffect`, before the 1.5s tour delay. This races against the chat bubble's 100ms mount timer.
2. **Render order**: `<TourOverlay />` must appear **before** `<DigiChat />` in `client-shell.tsx`. React runs effects in tree order, so the tour's effect (writing the key) runs before the chat bubble's effect (checking the key).

This ensures the key is in localStorage before the chat bubble ever checks it. No changes needed to `chat-bubble.tsx`.

**Side effect**: The "Got a question?" prompt will never show for users who saw the tour. This is intentional — step 6 already introduces Digi, so the prompt is redundant.

---

## Replay Tour

The Help Centre page (`/dashboard/client/help`) should include a "Replay portal tour" link that:
1. Removes `dd_portal_tour_completed` from localStorage
2. Redirects to `/dashboard/client` (where the tour will auto-start)

> Note: Do NOT reset `digi-prompt-seen` — the tour itself introduces Digi, so the prompt isn't needed on replay.

---

## Keyboard Support

| Key | Action |
|---|---|
| `→` or `Enter` | Advance to next step |
| `←` | Go back (steps 2+, no-op on step 1) |
| `Escape` | Dismiss tour, mark as completed |

---

## Accessibility

- Speech bubble has `role="dialog"` and `aria-modal="true"`
- "Next" / "Got it!" button receives auto-focus on each step change
- Keyboard navigation (arrows, Enter, Escape) documented above
- Step dots have `aria-label="Step X of Y"`
- Full focus trap not implemented in v1 — the click-blocking layer prevents mouse interaction with background elements, and auto-focus on the primary button keeps keyboard users on track

---

## Edge Cases

| Case | Handling |
|---|---|
| Target element not found | Skip that step silently (defensive) |
| Window resize during tour | Recalculate spotlight rect on resize (debounced 150ms) |
| User navigates away mid-tour | `useEffect` watches `pathname` — if it changes from `/dashboard/client`, tour dismisses and marks completed |
| Mobile viewport | Sidebar targets are `hidden lg:block`, so steps 2–3 are skipped (target not found). Tour is shorter but still works. |
| Chat bubble not rendered | Step 6 skipped (target not found fallback) |
| Multiple tabs | localStorage sync means completing in one tab clears in others on next check |
| SSR hydration | `isActive` initialises as `false`, checked in `useEffect` — same pattern as changelog badge |
| User lands on non-dashboard page first | Tour waits — only starts when `pathname === "/dashboard/client"` |
| Digi prompt collision | Tour writes `digi-prompt-seen` immediately on mount + renders before DigiChat in tree (see Digi Prompt Suppression) |
| Target off-screen | `scrollIntoView({ block: "nearest", behavior: "smooth" })` before measuring rect |
| Overlay click | Click-blocking layer catches all clicks on dimmed area — no action, prevents interaction with background |
| Prompt never shows post-tour | Intentional — step 6 introduces Digi, making the prompt redundant |

---

## Implementation Order

1. `src/lib/tour-steps.ts` — step definitions
2. `src/components/guided-tour/tour-step-bubble.tsx` — speech bubble
3. `src/components/guided-tour/tour-overlay.tsx` — overlay + controller
4. Add `data-tour` attributes to target components (sidebar, bell, chat bubble, stat cards)
5. Render `<TourOverlay />` in `client-shell.tsx` (before `<DigiChat />`)
6. Add "Replay tour" link to Help Centre

---

## Visual Design Notes

- Digi images: Use existing `DigiMascot` component at `size="xs"` (48px) inside the bubble
- Available Digi variants: `neutral`, `construction`, `celebrating`, `confused`, `sleeping`
- Speech bubble follows the same card aesthetic as the rest of the portal: white bg, rounded-2xl, subtle shadow, violet accent on the progress dots
- Overlay dim: `rgba(0, 0, 0, 0.5)` — dark enough to focus attention but not jarring
- Spotlight glow: `box-shadow: 0 0 0 4px rgba(124, 28, 255, 0.2)` on the cutout border
- Step transition: 200ms crossfade between steps (bubble exits → spotlight moves → bubble enters)

## Z-Index Map

| Element | Z-Index | Notes |
|---|---|---|
| Chat button | `z-[9998]` | Highest — always clickable, shows through SVG cutout in step 6 |
| Digi prompt bubble | `z-[9997]` | Hidden during tour (localStorage suppression) |
| Tour overlay container | `z-[9995]` | Above prompt, below chat button |
| Header | `z-30` | Below tour overlay |
| Standard content | `z-0` | Below everything |
