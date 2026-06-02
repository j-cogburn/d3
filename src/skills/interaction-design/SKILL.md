---
name: interaction-design
description: Guides agents through designing micro-interactions, component states, transitions, loading patterns, and animation principles. Use when implementing interactive UI components, defining state machines, designing feedback systems, or specifying transitions between views.
---

# Interaction Design

## Overview

Interaction design specifies what happens between states. Every user action has a response; every transition has a direction and duration. These micro-decisions define whether a product feels polished or clunky.

Dan Saffer's micro-interaction model:

```
TRIGGER → RULES → FEEDBACK → LOOPS/MODES

Trigger:     What initiates the interaction (user action or system event)
Rules:       What happens as a result
Feedback:    How the system communicates what happened
Loops/Modes: Does it repeat? Does it have persistent modes?
```

---

## When to Use

- Implementing any interactive component (buttons, forms, toggles, modals)
- Specifying loading, error, and success states
- Designing page and component transitions
- Any feedback system (notifications, toasts, progress indicators)
- Specifying animation for new components

---

## Timing guidelines

Duration must be purposeful. Animations that are too slow feel sluggish; too fast feels glitchy.

```
INSTANT:    0–100ms    — hover states, focus rings, cursor changes
FAST:       100–200ms  — button presses, checkbox toggles, small reveals
NORMAL:     200–400ms  — dropdowns, tooltips, small modals
SLOW:       400–600ms  — full page transitions, large modals, drawer slides
VERY SLOW:  600ms+     — only for deliberate, meaningful transitions (onboarding, celebration)
```

Rule of thumb: if the user is waiting for the animation to finish before they can act, it's too slow.

---

## Easing reference

```
ease-out     (decelerate)  → Elements entering the screen. Feels natural — like catching something.
ease-in      (accelerate)  → Elements leaving the screen. Feels intentional — like throwing something.
ease-in-out  (both)        → Elements moving from A to B within the screen.
linear                     → Continuous rotation (spinners), progress bars.
spring                     → Interactive gestures that need physicality (drag, swipe, reorder).
```

Never use `linear` for discrete transitions — it feels mechanical. Never use `ease-in` for elements entering — they'll feel like they're fighting against their arrival.

---

## Component state machine

Every interactive component must have a complete state machine before implementation. Use this template:

```
COMPONENT: [Name]

States:
  idle      → default, waiting for interaction
  hover     → cursor over element
  focus     → keyboard focus (tab, click)
  active    → being pressed / in-progress interaction
  loading   → async operation in progress
  success   → operation completed successfully
  error     → operation failed
  disabled  → not interactive

Transitions:
  idle    → hover     : cursor enters     (instant)
  hover   → idle      : cursor leaves     (instant)
  hover   → active    : press down        (instant)
  active  → loading   : release (if async)(instant)
  active  → idle      : release (if sync) (fast)
  loading → success   : operation done    (fast, then 1.5s hold, then → idle)
  loading → error     : operation failed  (fast)
  error   → idle      : user dismisses    (fast)
  * → disabled        : prop change       (instant, no animation)
```

Key rules:
- **Always implement focus** — not just hover. Keyboard users rely on it.
- **Loading must block the trigger** — don't allow re-submission while loading.
- **Success states should be brief** — show for 1.5–2s then return to idle.
- **Error states must be dismissible** — never trap a user in an error state.
- **Disabled is not the same as hidden** — disabled elements stay in the DOM and are visible but inactive.

---

## Loading patterns

Choose the right loading pattern for the context:

```
SKELETON SCREEN
┌─────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░  ░░░░░░░░░░░░░               │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░         │
│ ░░░░░░░░░░░░░░░                                      │
└─────────────────────────────────────────────────────┘
Use for: initial page/section load where structure is known
Do not use: when load time is <200ms (flash of skeleton is worse than nothing)

SPINNER  (●)  or  (◌→◉)
Use for: short operations where duration is unknown (<5s expected)
Always pair with: accessible label ("Loading...") for screen readers

PROGRESS BAR  [████████░░]  68%
Use for: operations with known progress (file upload, multi-step process)
Always show: percentage or step number — don't animate a fake progress bar

INLINE LOADING  [Save ⟳]
Use for: actions where the user should stay in context (save, submit)
Behaviour: button text changes to "Saving...", spinner replaces icon

FULL-PAGE OVERLAY
Use for: blocking operations that prevent all other interaction
Avoid: almost always; prefer inline loading. Full-page blocks feel like failure.
```

---

## Transition patterns

```
PAGE TRANSITIONS
  None (instant):     For navigation within a section where context doesn't change
  Fade (200ms):       For navigation between unrelated sections
  Slide left/right:   For sequential flows (step 1 → step 2 → step 3)
  Slide up/down:      For hierarchical navigation (list → detail)

COMPONENT TRANSITIONS
  Dropdown:   Fade + translate-y (12px → 0) ease-out 200ms
  Modal:      Backdrop fade-in 200ms + content scale (0.95→1) + fade ease-out 250ms
  Toast:      Slide in from edge 250ms ease-out, auto-dismiss after 4s with fade 300ms
  Tooltip:    Fade ease-out 150ms, no delay on dismiss
  Drawer:     Slide from edge ease-out 300ms, backdrop fade 200ms

FOCUS MANAGEMENT
  Opening a modal:    Focus moves to first focusable element inside
  Closing a modal:    Focus returns to the trigger that opened it
  Completing a form:  Focus moves to success message or next action
```

---

## Feedback system

Every user action needs feedback. The right feedback depends on the severity:

| Action type | Feedback mechanism | Duration |
|---|---|---|
| Form submission success | Inline success state → redirect | 1.5s |
| Destructive action (delete) | Confirmation modal first | — |
| Non-blocking save | Toast notification | 4s |
| Critical error | Inline error on the relevant field | Until corrected |
| System error | Full error state with retry | Until dismissed |
| Long operation progress | Progress indicator | Until complete |

Rules:
- Feedback must be **immediate** — any delay >200ms needs a loading indicator
- Feedback must be **proximate** — error messages appear near the field that caused them
- Feedback must be **actionable** — "Error occurred" is not actionable; "Email already in use — log in instead" is

---

## Common Rationalizations

| Excuse | Counter-argument |
|---|---|
| "We'll add animations later as polish" | State transitions defined without animation are implemented incorrectly. Specify all states before writing code, even if the animations are minimal. |
| "Focus styles are ugly, let's remove them" | Removing focus styles makes the product inaccessible to keyboard users and fails WCAG 2.1. Style focus rings to match the design system instead. |
| "The loading state only appears for 100ms usually" | On slow networks or high load, it appears much longer. Always implement loading states. |
| "Transitions make the app feel slow" | Poorly timed transitions make it feel slow. Correctly timed transitions make it feel responsive. |

---

## Red Flags

- Interactive components with only default and active states (no hover, focus, disabled, loading)
- Animations using `linear` easing for discrete transitions
- Transitions longer than 500ms for interactive elements
- No focus management when opening or closing modals
- Loading states that don't prevent re-submission
- Error states with no path to recovery
- Skeleton screens on operations expected to complete in <200ms

---

## Verification

- [ ] Every interactive component has a complete state machine (all 8 states considered)
- [ ] All transitions use appropriate easing and timing
- [ ] Loading states block re-submission
- [ ] Focus management specified for all modal/dialog interactions
- [ ] Error states include recovery path
- [ ] Animations respect `prefers-reduced-motion` media query
