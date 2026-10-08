---
name: frontend-ui-design
description: >-
  Comprehensive guide and design system for crafting modern, accessible, and
  production-grade interfaces using React, Tailwind CSS, shadcn/ui principles,
  and Framer Motion. Use when designing, building, or refactoring UI components,
  dashboards, Bento layouts, typography, spacing, interactive states, animations,
  and responsive web applications.
---

# Modern Frontend UI Design System & Engineering Guide

A production-grade blueprint for engineering React applications that feel cohesive, tactile, and performant. This guide balances aesthetic craft with software engineering rigor, accessibility (a11y), and performance.

---

## 1. Design Variation Rule: Avoid Aesthetic Monoculture

**Do NOT force every project or page into the same dark glassmorphism template.**

A world-class engineer selects the visual language that best serves the product's domain, target audience, and mental model. Establish **one coherent visual language** per project and execute it consistently.

### Visual Archetypes Matrix

| Visual Archetype | Best Suited For | Key Aesthetic Identifiers |
|---|---|---|
| **Premium SaaS** | B2B, DevTools, Cloud platforms | Refined dark/light themes, subtle borders (`slate-800`), crisp typography, restrained 1px divider lines, high contrast. |
| **Data-Dense Dashboard** | Analytics, Trading, Admin consoles | Tight padding (`p-2.5` to `p-4`), monospaced numbers, compact tables, muted zebra stripes, minimal decorative fluff. |
| **Minimal Editorial** | Documentation, Publishing, Blogs | Generous line heights, high-contrast serif/sans pairings, stark black/white contrast, zero gradients, whitespace as rhythm. |
| **Modern Bento** | Portfolios, Product landing pages, Feature tours | Asymmetric rounded tiles (`rounded-2xl`), mixed column/row spans, distinct card personalities, hero focal points. |
| **Soft UI / Modern Clean** | Consumer apps, Lifestyle, Productivity | Light backgrounds (`zinc-50`), soft diffused shadows (`shadow-sm` / `shadow-md`), pastel accents, clean borders. |
| **Finance & Ledger** | Expense trackers, Invoicing, Banking | High numeral legibility (`font-mono` / tabular nums), clear status colors (credits vs debits), explicit balance invariants. |
| **Healthcare & Wellness** | Patient portals, Clinical records | High-contrast readability, calming blues/greens, large touch targets, zero chaotic motion, accessible WCAG AAA focus. |
| **Neo-Brutalism** | Web3, Creative agencies, Youth brands | High-contrast solid borders (`border-2 border-black`), hard drop-shadows (`shadow-[4px_4px_0px_0px_#000]`), bold primary colors. |

> **Rule**: When beginning work on an interface, identify the archetype first. Ensure typography, borders, shadows, and spacing align strictly with that archetype.

---

## 2. The Anti-Pattern Checklist: Do NOT Over-Design

Excessive decoration is the hallmark of amateur AI-generated interfaces. The interface must feel **intentional, clear, and functional**.

### What to Strictly Avoid
* ❌ **Excessive Glassmorphism**: Blurring every single container makes text unreadable and harms GPU scrolling performance. Use backdrop blur sparingly (e.g., sticky headers and floating bottom sheets only).
* ❌ **Gratuitous Gradients**: Do not wrap every heading or button in a rainbow gradient. Reserve gradients for subtle hero highlights or progress meters.
* ❌ **Card-Everywhere Syndrome**: Not every group of text needs a bordered card with a drop shadow. Use whitespace, typography hierarchy, and subtle dividing lines before reaching for a card container.
* ❌ **Emoji as UI Icons**: Do not use raw emoji (🔥, 💸, 🚀) as replacement for production iconography. Use dedicated SVG icons from libraries like `lucide-react`.
* ❌ **Arbitrary Empty Space**: Do not add `py-32` or massive gaps without functional justification.
* ❌ **Chaotic Color Palettes**: Stick strictly to a semantic color system. Do not introduce one-off hex colors when Tailwind design tokens exist.
* ❌ **Over-Animation**: Never animate standard page text arrivals, stat readings, or form labels. Motion should only accompany state transitions, dismissals, and direct user gestures.

---

## 3. Color Tokens & The 60-30-10 System

Apply structured color discipline to guide the user's eye naturally toward interactive elements.

```text
┌────────────────────────────────────────────────────────┐
│ 60% Dominant Base: Canvas background & primary panels  │
│     (Light: zinc-50 / white | Dark: slate-950 / 900)   │
├────────────────────────────────────────────────────────┤
│ 30% Structural Hierarchy: Cards, borders, muted text   │
│     (Light: zinc-200 / 600 | Dark: slate-800 / 400)    │
├────────────────────────────────────────────────────────┤
│ 10% Intent & Accent: CTAs, active pills, status alerts │
│     (Brand color, Success emerald, Warning amber)      │
└────────────────────────────────────────────────────────┘
```

### Semantic Status Palette
Never use generic bright red or green. Use accessible, calibrated semantic sets:

* **Success**: `emerald-500` / `teal-400` on dark (`bg-emerald-950/40 text-emerald-300 border-emerald-500/30`)
* **Warning / Pending**: `amber-500` / `amber-400` on dark (`bg-amber-950/40 text-amber-300 border-amber-500/30`)
* **Destructive / Error**: `rose-500` / `rose-400` on dark (`bg-rose-950/40 text-rose-300 border-rose-500/30`)
* **Information**: `sky-500` / `sky-400` on dark (`bg-sky-950/40 text-sky-300 border-sky-500/30`)

---

## 4. Typography Ramp & 4px/8px Spatial Scale

### Typography Ramp
Hierarchy is created through contrast in **scale, weight, and tracking**, not by adding colors:

* **Display / Page Title**: `text-2xl sm:text-3xl font-black tracking-tight text-white`
* **Section / Card Header**: `text-base sm:text-lg font-bold tracking-tight text-slate-100`
* **Section Overline / Stat Label**: `text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400`
* **Primary Metric / Value**: `text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono`
* **Body / Form Labels**: `text-xs sm:text-sm font-medium text-slate-300 leading-relaxed`
* **Supporting Caption / Timestamp**: `text-[11px] text-slate-500`

### Spatial Scale (8-Point Rhythm)
Align margins, paddings, and gaps to multiples of 4px/8px:

* Compact widgets / table cells: `p-2.5` to `p-3` (10px - 12px)
* Standard cards & modal bodies: `p-4 sm:p-6` (16px - 24px)
* Layout section spacing: `space-y-6 sm:space-y-8` (24px - 32px)
* Grid gutters: `gap-3 sm:gap-4 lg:gap-6`
* Minimum mobile touch target: `44px x 44px` (`min-h-[44px] min-w-[44px]`)

---

## 5. Modern Bento UI Architecture

Bento UI arranges information into an asymmetric, scannable grid.

### Rules of Bento Composition
1. **Never use Bento everywhere**: Reserve Bento layouts for dashboards, feature showcases, or summary sections where multi-dimensional information needs simultaneous visibility. Avoid Bento on long linear forms or narrative text.
2. **Desktop 12-Column Base**: Use an underlying 12-column grid (`grid-cols-12` or `md:grid-cols-3 lg:grid-cols-4`) for granular column spanning (`col-span-12 md:col-span-6 lg:col-span-8`).
3. **Card Types & Roles**:
   * **Hero / Anchor Card** (`col-span-2` or `row-span-2`): Contains the primary visualization, biggest balance, or urgent workflow.
   * **Metric Satellite Cards** (`col-span-1`): Compact, scannable KPI indicators with a label, big number, and trend badge.
   * **Activity / Timeline Card**: Feed of recent mutations with date, status, and actor.
   * **Interactive / Action Card**: Dedicated tool, calculator, or quick-entry buttons.
4. **Mobile Responsive Conversion**:
   * On mobile screens (`< 640px`), collapse multi-column spans to `col-span-1`.
   * Order tiles so the Hero Anchor appears first, followed by key metrics, then secondary activity.

---

## 6. Motion & Micro-Interactions

Animation should be invisible until it provides feedback, guides spatial orientation, or clarifies state changes.

### Motion Principles
* **Spring Physics over Linear Easing**: Use spring physics (`stiffness: 350, damping: 28`) instead of rigid CSS `ease-in-out` transitions.
* **Micro-Interactions**:
  * Buttons: Scale down on active press (`active:scale-95 duration-100`).
  * Cards: Elevate borders on hover (`hover:border-slate-700/80 transition-colors`).
  * Tabs: Animated background pill with Framer Motion `layoutId="activeTabPill"`.
* **Reduced Motion Compliance**: Always respect user system preferences:
  ```jsx
  // In Tailwind
  className="transition-transform motion-reduce:transition-none"
  
  // In Framer Motion
  import { useReducedMotion } from 'framer-motion';
  const shouldReduceMotion = useReducedMotion();
  ```

---

## 7. State Mastery: Loading, Empty, Error & Success

Every asynchronous UI flow must handle all five canonical states without content flashes or layout shifts:

```text
[Idle] ──> [Loading / Skeleton] ──┬──> [Success / Data Display]
                                  ├──> [Empty / Zero State]
                                  └──> [Error / Retry Banner]
```

1. **Loading / Skeleton**:
   * Skeletons must mirror the exact shape and layout of the incoming data card.
   * Use `animate-pulse` on muted backgrounds (`bg-slate-800/60`). Never use generic spinning wheels for entire pages.
2. **Empty State**:
   * Must include an icon in a container, a clear title, friendly explanation, and a primary CTA button.
3. **Error State**:
   * Display contextual inline error banners with error code, message, and a "Retry" button.
   * Use toast notifications for transient failures (e.g. network disconnect during button click).
4. **Success State**:
   * Immediate optimistic UI update or clear feedback confirmation (badge transition, toast, or settlement celebration banner).

---

## 8. Accessibility (a11y) & UX Discipline

Accessibility is an engineering requirement, not an optional bonus:

1. **Semantic HTML**: Use native `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<button>`, and `<table>`. Never use `<div onClick={...}>`.
2. **Keyboard Navigation & Escape Handling**:
   * Modals and dropdowns must close on `Escape`.
   * Modals must trap focus while open and restore focus upon dismissal.
   * Dropdowns must support Arrow key navigation.
3. **Visible Focus Rings**:
   * Never set `outline-none` without providing an accessible replacement:
   * Standard: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`.
4. **Color Contrast (WCAG AA)**:
   * Minimum contrast ratio of 4.5:1 for normal text and 3:1 for large text and UI boundaries.
5. **Form Labels & Error Associations**:
   * Every `<input>` must have a descriptive `<label>`.
   * Error messages must be linked via `aria-invalid="true"` and `aria-errormessage="error-id"`.

---

## 9. Reusable Component Architecture

Organize UI code into reusable, composable primitives inspired by `shadcn/ui`:

* **Separation of Concerns**: Pure presentational primitives (e.g., `Button`, `Modal`, `BentoCard`, `Badge`) must contain **zero API fetching or business domain logic**.
* **Prop Composability**:
  * Always accept `className` and merge using the project's class-merging utility (`cn(...)`).
  * Spread remaining standard HTML attributes (`...props`) to underlying DOM nodes.
  * Support polymorphic slots (`asChild`) or clean composition when wrapping anchors vs buttons.
* **Standard Component Registry**:
  * `BentoGrid` / `BentoCard`
  * `StatCard` / `MetricTile`
  * `Button` (with `variant`, `size`, `loading` states)
  * `Modal` / `Sheet` (bottom-sheet responsive adapter)
  * `EmptyState` / `ErrorState`
  * `Tabs` (with accessible keyboard controls)
  * `Badge` / `Toast`

---

## 10. UI Quality Verification Checklist

Before considering any UI component, page, or dashboard implementation complete, verify every item on this checklist:

```text
□ Visual Hierarchy: Primary focal point is immediately obvious within 3 seconds.
□ Coherent Archetype: Follows one unified visual language; does not randomly mix styles.
□ Spacing Rhythm: All margins, paddings, and gaps adhere to the 4px/8px scale.
□ Typography Hierarchy: Strong contrast between titles, labels, numbers, and captions.
□ Tabular Numerals: All financial values and metric counters use monospace or tabular numbers.
□ Responsive Layout: Tested and functional on mobile (360px), tablet (768px), and desktop (1280px).
□ Touch Target Compliance: All interactive mobile buttons and links are at least 44px x 44px.
□ Loading State: Includes layout-accurate skeleton loaders (no full-page jarring layout shifts).
□ Empty State: Has an icon, reassuring copy, and an actionable CTA when zero records exist.
□ Error State: Handles API errors with inline banners or toasts, with retry options.
□ Success Feedback: Confirms mutations with clear visual indicators or toasts.
□ Interactive States: Every button/link has distinct hover, active (scale-95), and disabled states.
□ Visible Focus Rings: Clear focus-visible ring on keyboard navigation without breaking mouse focus.
□ Keyboard Operability: Modals close on Escape; forms submit on Enter; tabs switch via keyboard.
□ Screen Reader Accessibility: Proper ARIA labels, semantic tags, and descriptive form labels.
□ Purposeful Animation: Motion is subtle and functional; respects prefers-reduced-motion.
□ No Visual Bloat: No gratuitous gradients, excessive glassmorphism, or emoji icon replacements.
□ Component Decoupling: Presentational components are reusable and free of hardcoded API calls.
□ Design Token Consistency: Reuses project Tailwind theme colors instead of hardcoded hex values.
□ No Generic AI Aesthetic: Feels like a custom, human-crafted product tailored to the domain.
```

---

## Component Reference Library

Ready-to-use production component implementations are available in:
* **[Component Templates Library](./references/components.md)**: Production code for `BentoCard`, `StatCard`, `SheetModal`, `Button`, `EmptyState`, `ErrorState`, `Skeleton`, `Tabs`, and `Toast`.
