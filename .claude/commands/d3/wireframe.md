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

## Step 1 — Load context

Read:
1. `CLAUDE.md` — services, tech stack, existing routes
2. `docs/design/design-system.md` if present — existing components and patterns to reference
3. Source material: the spec file, or use `$ARGUMENTS` as the description

---

## Step 2 — Plan the screens

Before drawing, list what needs to be wireframed:
- For a single page: one wireframe
- For a flow: list each step/screen in order
- For a spec: extract every distinct screen mentioned

For each screen, identify:
- Primary action (the one thing users must be able to do)
- Secondary content and actions
- Navigation context (where does this sit in the app?)
- Empty states and error states needed

---

## Step 3 — Invoke wireframe skill

Invoke `wireframe` from `.d3/skills/wireframe/SKILL.md`. Follow the process and use the pattern library defined there.

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
