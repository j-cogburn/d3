---
name: design-system
description: Guides agents through building, auditing, and evolving a design system — covering token hierarchy, color, typography, spacing, component anatomy, states, and documentation. Use when creating a new design system, auditing implementation against spec, or adding components.
---

# Design System

## Overview

A design system is the single source of truth for a product's visual and interactive language. It has three layers:

1. **Tokens** — the raw values (colours, sizes, weights) and their semantic meaning
2. **Components** — reusable UI elements built from tokens with defined variants and states
3. **Patterns** — composed components that solve recurring design problems

A design system without implementation is a document. An implementation without a design system is a stylesheet. The system is only real when the code and the spec stay in sync.

---

## When to Use

- Building a new product's visual foundation
- Auditing whether the implementation matches the design spec
- Adding a new component — ensure it uses existing tokens before creating new ones
- Refactoring inconsistent styles into a coherent system
- Evaluating whether the design system is serving the product's needs

---

## Token hierarchy

Tokens should be defined in three layers:

```
PRIMITIVE TOKENS (raw values — never use directly in components)
  color-blue-500:     #3B82F6
  color-blue-600:     #2563EB
  font-size-14:       0.875rem
  spacing-4:          1rem

SEMANTIC TOKENS (meaningful names — use in component specs)
  color-action-primary:      → color-blue-500
  color-action-primary-hover:→ color-blue-600
  color-text-primary:        → color-gray-900
  color-text-secondary:      → color-gray-600
  color-surface-default:     → color-white
  color-border-default:      → color-gray-200
  spacing-component-gap:     → spacing-4

COMPONENT TOKENS (component-specific overrides — use sparingly)
  button-primary-background: → color-action-primary
  button-primary-text:       → color-white
  button-radius:             → border-radius-md
```

Never skip the semantic layer. Raw values in components create impossible-to-maintain codebases.

---

## Core scales

### Colour system

```markdown
## Colour tokens

### Brand
- `color-brand-primary`:    #[hex]  — primary actions, links
- `color-brand-secondary`:  #[hex]  — secondary actions

### Semantic
- `color-success`:          #[hex]  — positive states, confirmations
- `color-warning`:          #[hex]  — caution states
- `color-error`:            #[hex]  — errors, destructive actions
- `color-info`:             #[hex]  — informational states

### Neutral scale (use for text, borders, backgrounds)
- `color-gray-50`:   #[hex]  — page background
- `color-gray-100`:  #[hex]  — subtle background
- `color-gray-200`:  #[hex]  — borders
- `color-gray-400`:  #[hex]  — disabled text
- `color-gray-600`:  #[hex]  — secondary text
- `color-gray-900`:  #[hex]  — primary text, headings
```

### Typography scale

```markdown
## Typography

Font: [Primary] / [Mono for code]

Scale:
- `text-xs`:   0.75rem / 1rem      — 12px — labels, captions
- `text-sm`:   0.875rem / 1.25rem  — 14px — body small, helper text
- `text-base`: 1rem / 1.5rem       — 16px — body text
- `text-lg`:   1.125rem / 1.75rem  — 18px — subheadings
- `text-xl`:   1.25rem / 1.75rem   — 20px — section titles
- `text-2xl`:  1.5rem / 2rem       — 24px — page titles
- `text-3xl`:  1.875rem / 2.25rem  — 30px — display headings

Weights: 400 (regular) / 500 (medium) / 600 (semibold) / 700 (bold)
```

### Spacing scale

Base unit: 4px. All spacing values are multiples of 4.

```
spacing-1:  4px   — tight groupings (icon + label)
spacing-2:  8px   — internal component padding
spacing-3:  12px  — small gaps between elements
spacing-4:  16px  — standard gaps
spacing-6:  24px  — section gaps
spacing-8:  32px  — large section gaps
spacing-12: 48px  — page-level gaps
spacing-16: 64px  — hero spacing
```

---

## Component anatomy

Every component must document:

```markdown
## [Component Name]

### Anatomy
[ASCII diagram showing the component's parts with labels]

┌──────────────────────────────────┐
│ [Icon?]  [Label]          [Icon?]│
└──────────────────────────────────┘
   ①         ②                ③
① Leading icon (optional)
② Label (required)
③ Trailing icon (optional)

### Variants
| Variant   | Use when |
|-----------|----------|
| Primary   | The most important action on the page (one per view) |
| Secondary | Supporting actions |
| Ghost     | Low-emphasis actions, often in toolbars |
| Danger    | Destructive or irreversible actions |

### States
| State    | Visual | Interaction |
|----------|--------|-------------|
| Default  | [description] | Clickable |
| Hover    | Background darkens 8% | Cursor: pointer |
| Active   | Background darkens 16% | — |
| Focus    | 2px ring at `color-action-primary` | Keyboard accessible |
| Disabled | 40% opacity | Not clickable, not focusable |
| Loading  | Spinner replaces label | Not clickable |

### Dos and Don'ts
✓ Do: use Primary for the single most important action
✗ Don't: use two Primary buttons in the same view
✗ Don't: use Ghost for destructive actions — use Danger

### Tokens used
- Background: `button-primary-background` → `color-action-primary`
- Text: `button-primary-text` → `color-white`
- Border radius: `button-radius` → `border-radius-md`
- Padding: `button-padding-x: spacing-4` / `button-padding-y: spacing-2`
```

---

## Process

### Auditing implementation against design system

1. List every UI component in the codebase.
2. For each, check:
   - Are token names used or hardcoded values?
   - Does it have all required variants?
   - Are all interaction states implemented (hover, focus, disabled, loading)?
   - Does it match the documented anatomy?
3. Flag discrepancies as: **Critical** (wrong token/value) / **High** (missing state) / **Medium** (undocumented variant) / **Low** (minor deviation)

### Adding a new component

1. Check if an existing component can be extended. **Don't create a new component if you can compose from existing ones.**
2. If new, draft the anatomy and variants before writing code.
3. Choose tokens from the existing semantic layer. Create new tokens only if necessary.
4. Implement all states from the start (don't defer disabled or loading states).
5. Document it in the system before the PR merges.

### Evolving a design system

- **Add** when there's a clear unmet need across multiple surfaces
- **Modify** when an existing component has friction evidence from multiple surfaces
- **Deprecate** when a component has been superseded — add a deprecation notice, don't delete immediately
- **Never** make breaking changes without a migration path

---

## Common Rationalizations

| Excuse | Counter-argument |
|---|---|
| "I'll just hardcode this one value" | Every hardcoded value is a future inconsistency. The cost is negligible now; the debt compounds over hundreds of components. |
| "We don't have a design system yet, so I'll do it later" | Build the token layer first — it's a one-day investment that prevents months of refactoring. |
| "This component is only used in one place" | Today. Components used in one place today are copied to three places next month. Design it right once. |
| "The disabled state isn't important for this feature" | Missing states are reported as bugs. Implement all states before the component ships. |

---

## Red Flags

- Hardcoded colour values (`#3B82F6`) in component styles
- No semantic token layer (using primitive names like `blue-500` directly in components)
- Components without documented states
- Multiple near-identical components that should be variants of one component
- Design system documentation that contradicts the implementation
- New colours introduced without adding them to the token system

---

## Verification

- [ ] All colours reference semantic tokens, not primitive values
- [ ] Every interactive component documents all states: default, hover, focus, active, disabled, loading
- [ ] New tokens follow the three-layer hierarchy
- [ ] Component documentation updated before PR merges
- [ ] No hardcoded spacing values — all use spacing scale tokens
