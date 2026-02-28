# Sprint Prompt: Portal Animations

---

## Context

You are working on the **Digital Directions Portal** — a Next.js 15 (App Router) portal with TypeScript, Tailwind CSS, and Shadcn UI. It has two user types: **admin** (DD staff) and **client** (client companies). The portal is functional-first but needs a premium motion layer — subtle, purposeful animations that make the product feel alive without slowing anyone down.

**Before starting:**
1. Read `src/app/globals.css` — note the existing `animate-enter`, `animate-dashboard-reveal`, `--ease-premium` CSS variable, and existing keyframes.
2. Read `src/components/lifecycle-stepper.tsx` — it already has `transition-all duration-700` on the progress connector. You will upgrade this.
3. Read `src/components/digi-mascot.tsx` — it's a pure server component (just `<img>`). You'll need a client wrapper for animations.
4. Read `src/components/layout/admin-sidebar.tsx` and `client-sidebar.tsx` — you'll add a `layoutId` shared layout animation.

---

## Setup — Install Framer Motion

```bash
npm install framer-motion
```

Framer Motion works in Next.js App Router. Rules:
- `motion.*` components and `AnimatePresence` require `"use client"` in the file they're used.
- Server components cannot directly use Framer Motion. Wrap them in a thin `"use client"` shell component.
- Never convert a data-fetching server page to a client component. Instead, pass data down to a client animation wrapper.

---

## Motion Design System

All animations in this sprint follow these rules. Do not deviate.

### Timing
| Use | Duration |
|---|---|
| Micro (icon, badge, hover) | 150–200ms |
| Standard entrance | 300ms |
| Emphasis (celebration, large card) | 450ms |
| Count-up numbers | 800ms |
| Continuous loops (idle float) | 3000ms |

### Spring Configs
```typescript
// Standard entrance — snappy
const SPRING_STANDARD = { type: "spring", stiffness: 300, damping: 30 };

// Bouncy — for badges, nodes, celebrations
const SPRING_BOUNCY = { type: "spring", stiffness: 400, damping: 22 };

// Precise — for layout/navigation animations
const SPRING_PRECISE = { type: "spring", stiffness: 350, damping: 35 };
```

### Stagger
- Between list items: `staggerChildren: 0.05` (50ms)
- Between grid cards: `staggerChildren: 0.06`
- Max visible delay for last item: never exceed 400ms total. Cap with `delayChildren` offset if list is long.

### Enter Defaults
```typescript
// Standard enter
initial={{ opacity: 0, y: 12 }}
animate={{ opacity: 1, y: 0 }}

// Scale enter (badges, nodes, pills)
initial={{ opacity: 0, scale: 0.85 }}
animate={{ opacity: 1, scale: 1 }}

// Slide from right (detail panels, drawers)
initial={{ opacity: 0, x: 16 }}
animate={{ opacity: 1, x: 0 }}
```

### Rules
- **Never animate on every hover** — only on mount, state change, or AnimatePresence transitions.
- **Never block content** — animations run in parallel with rendering, not after.
- **Respect `prefers-reduced-motion`** — wrap all Framer Motion components with this check:
```typescript
import { useReducedMotion } from "framer-motion";
// In any component that uses motion:
const prefersReduced = useReducedMotion();
// Pass to variants: duration: prefersReduced ? 0 : normalDuration
```
- **Stagger caps** — if a list has > 8 items, only stagger the first 8. Items beyond index 7 appear with the same delay as item 7.

---

## Reusable Primitives to Create

Create these files first. Everything else depends on them.

### 1. `src/components/motion/fade-in.tsx`
A simple wrapper that fades+slides children in on mount. Used as a drop-in for any section.

```typescript
"use client";
import { motion } from "framer-motion";

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

### 2. `src/components/motion/stagger-list.tsx`
Wraps a list container and staggers children on mount.

```typescript
"use client";
import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 30 } },
};

export const StaggerList = motion.div;  // use variants directly
export const staggerContainer = container;
export const staggerItem = item;
```

### 3. `src/components/motion/count-up.tsx`
Animates a number from 0 to its target value on mount.

```typescript
"use client";
import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useTransform, animate } from "framer-motion";

interface CountUpProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export function CountUp({ value, duration = 0.8, className, prefix = "", suffix = "" }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString()),
    });
    return controls.stop;
  }, [inView, value, duration, motionValue]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}
```

### 4. `src/components/motion/digi-float.tsx`
A client wrapper that adds a floating idle animation to any DigiMascot instance.

```typescript
"use client";
import { motion } from "framer-motion";
import { DigiMascot } from "@/components/digi-mascot";
import type { ComponentProps } from "react";

type DigiFloatProps = ComponentProps<typeof DigiMascot>;

export function DigiFloat(props: DigiFloatProps) {
  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
    >
      <DigiMascot {...props} />
    </motion.div>
  );
}
```

**After creating `DigiFloat`:** Replace every `<DigiMascot>` used in empty states and the Digi hero card with `<DigiFloat>`. Do NOT replace DigiMascot in places where it's decorative/inline text (help centre article steps, etc.) — only in standalone empty-state or hero contexts.

Files to update: admin/page.tsx, admin/clients/page.tsx, admin/tickets/page.tsx, client/page.tsx, client/projects/page.tsx, client/tickets/page.tsx, client/help/page.tsx (the hero card in HelpClientBrowser), and any component with a standalone empty state using DigiMascot.

---

## Page-by-Page Animations

### SHARED: Both Sidebars
**File:** `src/components/layout/admin-sidebar.tsx` and `src/components/layout/client-sidebar.tsx`

**Animation:** Active nav indicator uses `layoutId` for a smooth slide between items.

Currently the active item has `bg-violet-50 ... shadow-[inset_...]` applied directly to the `<Link>`. Replace with a relative wrapper + absolutely positioned background that uses `layoutId`:

```typescript
// Inside renderNavItem:
const active = isActive(item.href);
return (
  <Link key={item.href} href={item.href} className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors duration-150 group">
    {active && (
      <motion.div
        layoutId="active-nav-bg"
        className="absolute inset-0 bg-violet-50 rounded-xl shadow-[inset_0_0_0_1px_rgba(139,92,246,0.15)]"
        transition={{ type: "spring", stiffness: 350, damping: 35 }}
      />
    )}
    <span className="relative z-10 flex items-center gap-3 w-full">
      <item.icon strokeWidth={active ? 2 : 1.75} className={...} />
      <span className="flex-1">{item.label}</span>
      {item.badge && ...}
    </span>
  </Link>
);
```

The `layoutId="active-nav-bg"` will be shared within each sidebar instance. When the user navigates, the violet background smoothly slides from the old active item to the new one.

Use `"active-nav-bg-admin"` in the admin sidebar and `"active-nav-bg-client"` in the client sidebar to prevent conflicts.

---

### Admin Dashboard
**File:** `src/app/(dashboard)/dashboard/admin/page.tsx`

This page already has `animate-dashboard-reveal` + stagger classes. **Replace the entire CSS stagger system with Framer Motion** for consistency with the rest of the sprint.

1. **Remove** all `animate-dashboard-reveal stagger-N` class names.
2. Wrap the page content (everything inside the padding div, below the header) in a `motion.div` with `variants={staggerContainer}` from `stagger-list.tsx`.
3. Wrap each major section (stat cards grid, main grid div, actions grid div) in `motion.div` with `variants={staggerItem}`.
4. **Stat cards:** Each of the 4 `<Link>` stat cards — replace the static number `<p>` with `<CountUp value={numericValue} />`. Parse the string values to numbers first.
5. **Unassigned ticket claim button:** Add `whileTap={{ scale: 0.96 }}` to the Claim button.

---

### Admin Clients List
**File:** `src/app/(dashboard)/dashboard/admin/clients/page.tsx`

1. Replace existing `animate-enter delay-100/200` with `<FadeIn delay={0.05}>` wrapping the header and `<FadeIn delay={0.1}>` wrapping the table card.
2. **Table rows:** The `<tbody>` is server-rendered. Wrap it in a client component `<AnimatedTableBody>` that uses `staggerContainer` / `staggerItem` on the rows. The rows should enter with `opacity: 0, y: 8` → `opacity: 1, y: 0`.
3. Keep the existing `group-hover:scale-110` on the avatar — it's already good.

Create `src/components/motion/animated-table-body.tsx`:
```typescript
"use client";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "./stagger-list";

export function AnimatedTableBody({ children }: { children: React.ReactNode }) {
  return (
    <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
      {children}
    </motion.tbody>
  );
}

export { staggerItem }; // re-export for use in row wrapper
```

Then in the clients page, wrap `<tbody>` with `<AnimatedTableBody>` and each `<tr>` with `<motion.tr variants={staggerItem}>`.

---

### Admin Projects (Kanban)
**File:** `src/app/(dashboard)/dashboard/admin/projects/page.tsx`

1. Remove existing `animate-enter` with inline delay on columns. Replace with `<FadeIn delay={colIdx * 0.08}>` wrapping each column.
2. **Within each column**, wrap the cards list in a `motion.div variants={staggerContainer}` and each `<ProjectCard>` wrapper in `motion.div variants={staggerItem}`.
3. Keep the existing `hover:-translate-y-1` on the card — it's good. Change `rounded-[20px]` → `rounded-2xl` (already in unification sprint, confirm it's done).

---

### Admin Project Detail
**File:** `src/app/(dashboard)/dashboard/admin/projects/[id]/page.tsx`

1. Wrap the page header section in `<FadeIn>`.
2. Wrap the stats row (4 stat cards) in a `motion.div variants={staggerContainer}` with `initial="hidden" animate="show"`, and each stat card in `motion.div variants={staggerItem}`.
3. The lifecycle stepper upgrade is handled separately (see LifecycleStepper section below).

---

### Admin Tickets List
**File:** `src/app/(dashboard)/dashboard/admin/tickets/page.tsx`

1. Wrap the 3 stat cards in a `motion.div variants={staggerContainer}` and each card in `motion.div variants={staggerItem}`.
2. **Priority queue rows:** Create a client component `<AnimatedTicketList children rows />` that staggers the ticket rows on mount. Same pattern as `AnimatedTableBody` but for `<div>` rows.
3. **Standard queue rows:** Same stagger.
4. Keep the existing `opacity-60 group-hover:opacity-100` on resolved rows — CSS is fine here.

---

### Admin Ticket Detail
**File:** `src/app/(dashboard)/dashboard/admin/tickets/[id]/page.tsx`

1. Replace `animate-enter delay-200` on main column with `<FadeIn delay={0.1}>`.
2. Replace `animate-enter delay-300` on sidebar with `<FadeIn delay={0.15}>`.
3. **Comment thread:** The comments already have inline `animationDelay: ${idx * 0.05}s` CSS. Replace this with a `motion.div` stagger — wrap the comments container in `staggerContainer` and each comment in `motion.div variants={staggerItem}`.
4. **New comment appearing:** When `TicketCommentForm` submits successfully and a new comment is added to the list, the new comment should animate in with `AnimatePresence`. This requires `TicketCommentForm` to trigger a re-render of the parent list — check how the component currently refreshes and use `AnimatePresence` on the comment list.

---

### Admin Reports
**File:** `src/app/(dashboard)/dashboard/admin/reports/page.tsx`

1. Wrap stat cards in stagger container — same pattern as tickets list.
2. **`<CountUp>`** on all 4 stat numbers.
3. **Progress bars (Project Pipeline):** These bars have `transition-all duration-500` but no trigger. Currently they render at full width immediately. Wrap the entire Reports content in a client component `ReportsContent` that receives the data as props, and use `useInView` to trigger the bars to grow from 0 to their actual `width` value. On mount (or when in view), animate `width: "0%" → "X%"` using `motion.div`.
4. **Segmented status bar:** Animate each segment width from 0 to its percentage value on mount using the same `useInView` approach.

---

### Admin Settings
**File:** `src/app/(dashboard)/dashboard/admin/settings/page.tsx`

1. Replace `animate-enter delay-200/300` with `<FadeIn delay={0.05}>` and `<FadeIn delay={0.1}>`.
2. No other changes needed — this page is minimal.

---

### Client Dashboard
**File:** `src/app/(dashboard)/dashboard/client/page.tsx`

Currently has **zero** entrance animation (unlike admin dashboard). Add full stagger system matching admin.

1. Wrap page content below the header in `motion.div variants={staggerContainer} initial="hidden" animate="show"`.
2. Wrap stat cards grid in `motion.div variants={staggerItem}`.
3. Wrap main grid in `motion.div variants={staggerItem}`.
4. **`<CountUp>`** on all 4 stat numbers.
5. **Action Required tickets:** If there are pending tickets, add a subtle `motion.div` with `animate={{ boxShadow: ["0 0 0 0px rgba(251,191,36,0)", "0 0 0 4px rgba(251,191,36,0.15)", "0 0 0 0px rgba(251,191,36,0)"] }} transition={{ duration: 2, repeat: 2, delay: 0.8 }}` on the "Action Required" card header — a soft amber pulse that draws attention to it if items exist. Only apply this pulse if `pendingTickets.length > 0`.

---

### Client Projects List
**File:** `src/app/(dashboard)/dashboard/client/projects/page.tsx`

1. Wrap the projects grid in `motion.div variants={staggerContainer}` and each `<ProjectCard>` wrapper in `motion.div variants={staggerItem}`.
2. The existing `hover:border-violet-200 hover:shadow-md` on cards is CSS — leave it.

---

### Client Project Detail
**File:** `src/app/(dashboard)/dashboard/client/projects/[id]/page.tsx`

1. Wrap the page header in `<FadeIn delay={0}>`.
2. Wrap the lifecycle stepper in `<FadeIn delay={0.05}>`.
3. Wrap the main grid in `<FadeIn delay={0.1}>`.
4. **Current Step card:** `<FadeIn delay={0.15}>`.
5. **Stage Overview grid:** Stagger the stage link cards with `staggerContainer` / `staggerItem`.
6. Lifecycle stepper upgrade handled separately below.

---

### Client Support (Tickets)
**File:** `src/app/(dashboard)/dashboard/client/tickets/page.tsx`

1. Wrap the Digi hero card in `<FadeIn delay={0.05}>`.
2. Wrap the email support card in `<FadeIn delay={0.1}>`.
3. The `<DigiFloat>` replacement on the mascot in the hero card is handled by the DigiFloat section above.

---

### Client Help Centre
**File:** `src/components/help-client-browser.tsx`

Two animations here:

**1. Article list → article detail transition:**
Currently a state toggle with no transition. Use `AnimatePresence mode="wait"`:

```typescript
<AnimatePresence mode="wait">
  {selectedArticle ? (
    <motion.div
      key="article"
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* article detail content */}
    </motion.div>
  ) : (
    <motion.div
      key="list"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* article list content */}
    </motion.div>
  )}
</AnimatePresence>
```

**2. Article cards grid:**
When the category filter changes, the articles grid should re-animate. Use `AnimatePresence` on the grid and stagger the cards as they appear. Key the grid on the active category so `AnimatePresence` triggers an exit/enter cycle when the category changes.

---

### Client ROI Calculator
**File:** `src/app/(dashboard)/dashboard/client/roi/page.tsx`

1. **Hero savings card:** `<FadeIn delay={0}>` wrapping the entire violet card. The large dollar number should use `<CountUp value={numericSavings} prefix="$" duration={1.2} />` — this is the most impactful animation on this page.
2. **Breakdown cards:** Stagger the 4 stat cards.
3. `<CountUp>` on each breakdown number.

---

### Client Connectors
**File:** `src/app/(dashboard)/dashboard/client/connectors/page.tsx`

1. `<FadeIn delay={0.05}>` on the intro violet hero card.
2. Stagger the connector cards grid — wrap in `staggerContainer`, each card in `staggerItem`.
3. `coming_soon` cards keep their `opacity-80` — they still enter with stagger but stay dimmed.

---

## Component-Specific Upgrades

### LifecycleStepper — Major Upgrade
**File:** `src/components/lifecycle-stepper.tsx`

The stepper is already a client component. Upgrade three things:

**1. Connector line — SVG draw animation**

Replace the current absolute `<div>` progress connector line with an SVG approach for a more satisfying draw effect:

```typescript
// Replace the existing progress line div with:
<svg className="absolute top-4 left-0 w-full h-0.5" style={{ overflow: "visible" }}>
  {/* Background track */}
  <line x1="0" y1="0" x2="100%" y2="0" stroke="#e2e8f0" strokeWidth="2" />
  {/* Animated progress */}
  <motion.line
    x1="0" y1="0"
    x2="100%" y2="0"
    stroke="#7C1CFF"
    strokeWidth="2"
    initial={{ pathLength: 0, opacity: 0 }}
    animate={{ pathLength: progressFraction, opacity: progressFraction > 0 ? 1 : 0 }}
    transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
  />
</svg>
```

Where `progressFraction` = `completedStages / (totalStages - 1)`.

**2. Stage nodes — spring entrance**

Wrap each stage node circle in:
```typescript
<motion.div
  initial={{ scale: 0.6, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: "spring", stiffness: 400, damping: 22, delay: index * 0.06 }}
>
  {/* existing circle */}
</motion.div>
```

**3. Stage advance celebration**

When the `currentStage` prop changes to a new (higher) stage, trigger a brief celebration on the newly completed node:
```typescript
// Track previous stage with useRef
const prevStageRef = useRef(currentStageIdx);
const [celebratingIdx, setCelebratingIdx] = useState<number | null>(null);

useEffect(() => {
  if (currentStageIdx > prevStageRef.current) {
    setCelebratingIdx(currentStageIdx - 1); // the just-completed stage
    setTimeout(() => setCelebratingIdx(null), 600);
  }
  prevStageRef.current = currentStageIdx;
}, [currentStageIdx]);

// On the celebrating node's circle:
<motion.div
  animate={celebratingIdx === index ? { scale: [1, 1.3, 1] } : {}}
  transition={{ type: "spring", stiffness: 400, damping: 15 }}
>
```

---

### GlobalSearch Dropdown
**File:** `src/components/global-search.tsx`

The dropdown currently appears/disappears instantly. Add `AnimatePresence`:

```typescript
<AnimatePresence>
  {open && query.length >= 2 && (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute top-full mt-1.5 left-0 w-[380px] bg-white rounded-xl border border-slate-200 shadow-lg z-[9999] overflow-hidden"
    >
      {/* existing content */}
    </motion.div>
  )}
</AnimatePresence>
```

Stagger the result rows within each section using `staggerContainer` / `staggerItem`.

---

### NotificationBell
**File:** `src/components/notification-bell.tsx`

**Bell shake on new notification:**

Track the unread count with `useRef`. When it increases, trigger a shake animation on the bell icon:

```typescript
const prevUnreadRef = useRef(unreadCount);
const bellControls = useAnimationControls();

useEffect(() => {
  if (unreadCount > prevUnreadRef.current) {
    bellControls.start({
      rotate: [-12, 12, -8, 8, -4, 4, 0],
      transition: { duration: 0.5, ease: "easeInOut" },
    });
  }
  prevUnreadRef.current = unreadCount;
}, [unreadCount, bellControls]);

// Replace the static <Bell> with:
<motion.div animate={bellControls}>
  <Bell className="h-5 w-5 text-slate-600" />
</motion.div>
```

**Badge pop:**

Wrap the unread count badge in `AnimatePresence` so it animates in/out:

```typescript
<AnimatePresence>
  {unreadCount > 0 && (
    <motion.span
      key={unreadCount}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 ..."
    >
      {unreadCount > 9 ? "9+" : unreadCount}
    </motion.span>
  )}
</AnimatePresence>
```

---

## What NOT to Do

- **No page/route transitions** — do not add `AnimatePresence` at the layout level for route changes. It causes layout shift and is unreliable in App Router.
- **No scroll parallax** — do not use `useScroll` + `useTransform` to move elements as the user scrolls. This is a data portal, not a marketing page.
- **No hover-triggered motion.div animations** — CSS hover transitions (`hover:scale-105`, `hover:shadow-md`, `hover:border-violet-200`) are already in place. Do not replace them with `whileHover` Framer Motion — it adds unnecessary JS overhead for basic hover effects.
- **No loading spinners** — do not add animated loading skeletons unless they already exist (the help centre skeleton is fine as-is).
- **No text animations** — do not animate heading text, split text, or typewriter effects.
- **Do not animate server components directly** — always use a client wrapper. Never add `"use client"` to a page that fetches data just to animate it. Pass data as props to a client shell component.
- **Do not change any layout, content, or functionality** — this sprint is motion only.

---

## Suggested Work Order

1. **Install framer-motion** and confirm it builds
2. **Create the 4 primitive components** (`fade-in.tsx`, `stagger-list.tsx`, `count-up.tsx`, `digi-float.tsx`) — everything depends on these
3. **Replace DigiMascot with DigiFloat** in all empty-state/hero contexts — quick wins across every page
4. **Both sidebars** — `layoutId` active indicator (high impact, small change)
5. **GlobalSearch dropdown** — `AnimatePresence` + stagger (high visual impact)
6. **NotificationBell** — shake + badge pop
7. **LifecycleStepper** — SVG connector draw + node entrance + celebrate (most complex, do when fresh)
8. **Admin Dashboard** — replace CSS stagger with Framer Motion + CountUp
9. **Client Dashboard** — stagger + CountUp + amber pulse on Action Required
10. **Admin Reports** — CountUp + useInView progress bars
11. **ROI Calculator** — CountUp on hero number
12. **Remaining pages** — apply FadeIn / stagger patterns (clients list, tickets list, projects, etc.)

---

## Files You Will Create

- `src/components/motion/fade-in.tsx`
- `src/components/motion/stagger-list.tsx`
- `src/components/motion/count-up.tsx`
- `src/components/motion/digi-float.tsx`
- `src/components/motion/animated-table-body.tsx`

## Files You Will Modify

- `src/components/layout/admin-sidebar.tsx`
- `src/components/layout/client-sidebar.tsx`
- `src/components/lifecycle-stepper.tsx`
- `src/components/global-search.tsx`
- `src/components/notification-bell.tsx`
- `src/components/help-client-browser.tsx`
- `src/app/(dashboard)/dashboard/admin/page.tsx`
- `src/app/(dashboard)/dashboard/admin/clients/page.tsx`
- `src/app/(dashboard)/dashboard/admin/projects/page.tsx`
- `src/app/(dashboard)/dashboard/admin/projects/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/admin/tickets/page.tsx`
- `src/app/(dashboard)/dashboard/admin/tickets/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/admin/reports/page.tsx`
- `src/app/(dashboard)/dashboard/admin/settings/page.tsx`
- `src/app/(dashboard)/dashboard/client/page.tsx`
- `src/app/(dashboard)/dashboard/client/projects/page.tsx`
- `src/app/(dashboard)/dashboard/client/projects/[id]/page.tsx`
- `src/app/(dashboard)/dashboard/client/tickets/page.tsx`
- `src/app/(dashboard)/dashboard/client/roi/page.tsx`
- `src/app/(dashboard)/dashboard/client/connectors/page.tsx`
