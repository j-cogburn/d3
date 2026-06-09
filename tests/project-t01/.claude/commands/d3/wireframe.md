Generate low-fidelity ASCII wireframes for pages, components, or user flows. Saves to `.d3/wireframes/` with a consistent naming convention.

**Usage:**
- `/wireframe login` — wireframe the login page at desktop
- `/wireframe "checkout flow"` — wireframe a multi-step flow (one file per step)
- `/wireframe dashboard mobile` — wireframe at mobile viewport
- `/wireframe dashboard tablet` — wireframe at tablet viewport
- `/wireframe .d3/docs/specs/spec-2026-06-01-1000-auth.md` — wireframe all pages described in a spec

---

## Step 0 — Resolve scope and viewport

Parse `$ARGUMENTS`:
- Last token is `mobile`, `tablet`, or `desktop` → set viewport accordingly. Default: `desktop`
- Remaining tokens: the page, component, or flow name
- If a file path matching `.d3/docs/specs/*.md` → read the spec, extract all pages/screens described

**Viewport widths:**
- Desktop: 100 characters
- Tablet: 64 characters
- Mobile: 40 characters

Get timestamp: `date '+%Y-%m-%d-%H%M'`

---

## Step 1 — Load context and skills

Read:
1. `CLAUDE.md` — services, tech stack, existing routes
2. `docs/design/design-system.md` if present — existing components and patterns to reference
3. Source material: the spec file, or use `$ARGUMENTS` as the description

Invoke these skills before proceeding:
- `information-architecture` from `.d3/skills/information-architecture/SKILL.md` — for navigation structure and content hierarchy decisions
- `ux-writing` from `.d3/skills/ux-writing/SKILL.md` — for placeholder copy quality and content hierarchy
- `wireframe` from `.d3/skills/wireframe/SKILL.md` — the core pattern library and conventions

---

## Step 2 — Plan navigation and IA first

Using `information-architecture`, before drawing any screen:
- Map where this page/flow sits in the overall navigation hierarchy
- Confirm navigation labels match user vocabulary
- Identify the page's position in the user journey (entry → action → exit)
- List related pages that need navigation links or back-paths

For flows: list each step in order. Identify what the user must carry between steps (context, data, decisions).

For each screen, identify:
- Primary action (the one thing users must be able to do)
- Secondary content and actions
- Empty states and error states needed
- Content that needs placeholder copy (use `ux-writing` principles: concrete, action-oriented, no generic "Lorem ipsum")

---

## Step 3 — Draw and self-critique

Invoke `wireframe` from `.d3/skills/wireframe/SKILL.md`. Follow the process and use the pattern library defined there.

After drawing each wireframe, apply a `design-critique` pass (`.d3/skills/design-critique/SKILL.md`):
- Is there one clearly dominant element (primary action)?
- Are related elements grouped by proximity (Gestalt)?
- Does visual weight match functional importance?
- Is the reading order (1st, 2nd, 3rd most important) unambiguous?

If any critique issue is found, revise the wireframe before saving.

Produce one wireframe per screen. Each wireframe must include:
- The ASCII layout at the chosen viewport width
- An `## Annotations` section for non-obvious interactions
- A `## Components` section noting which are existing vs. `⚠ new component needed`

---

## Step 4 — Save files

```bash
mkdir -p .d3/wireframes
```

**Naming convention:** `.d3/wireframes/<slug>-<TIMESTAMP>.md`

- `slug` = page or flow name, lowercased, spaces → hyphens, max 5 words
- `TIMESTAMP` = `YYYY-MM-DD-HHMM` from Step 0

**Multi-screen flows:** each screen gets its own file with a sequence prefix:
```
.d3/wireframes/checkout-01-cart-TIMESTAMP.md
.d3/wireframes/checkout-02-shipping-TIMESTAMP.md
.d3/wireframes/checkout-03-payment-TIMESTAMP.md
.d3/wireframes/checkout-04-confirm-TIMESTAMP.md
```

**Multiple viewports:** append the viewport to the slug:
```
.d3/wireframes/dashboard-desktop-TIMESTAMP.md
.d3/wireframes/dashboard-mobile-TIMESTAMP.md
```

Each file uses this structure:

```markdown
# Wireframe: <Page Name>
**Viewport:** desktop / tablet / mobile
**Date:** YYYY-MM-DD
**Source:** <spec path | description>

## Layout

\`\`\`
<ASCII wireframe here>
\`\`\`

## Annotations
[1] <interaction note>

## Components
- [x] <existing component from design system>
- ⚠ <new component needed: description>

## Open questions
- <anything that needs a decision before implementing>
```

---

## Step 5 — Report

```
WIREFRAMES SAVED
================
<slug>-TIMESTAMP.md    <page name>  (<viewport>)
...

Next steps:
  /plan .d3/wireframes/<slug>-TIMESTAMP.md  — create implementation directives
  /audit ux                                  — evaluate against usability heuristics once built
```
