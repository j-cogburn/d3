---
name: information-architecture
description: Guides agents through structuring navigation, content hierarchy, and labeling systems. Covers sitemaps, navigation patterns, taxonomy design, and IA anti-patterns. Use when designing or auditing navigation, building a new section of the app, or any time users report not being able to find things.
---

# Information Architecture

## Overview

Information architecture is the structure that makes content findable and understandable. Bad IA means users can't find what they need — not because the feature is missing, but because it's buried or mislabeled. Good IA is invisible: users just find things.

IA operates at four levels:
1. **Organisation** — how content is grouped
2. **Labeling** — what each group is called
3. **Navigation** — how users move between groups
4. **Search** — how users find specific items when browsing fails

---

## When to Use

- Designing navigation for a new product or feature area
- Auditing why users report "I can't find X"
- Adding a new section that needs to fit the existing structure
- Renaming navigation items (labeling audit)
- Any time a sitemap needs to be created or reviewed

---

## Process

### 1. Inventory what exists

List every page, section, and feature in the product. Group by current location.

```
/
├── Dashboard
├── Portfolio
│   ├── Overview
│   ├── Holdings
│   └── History
├── Research
│   ├── Screener
│   └── Analysis
└── Settings
    ├── Account
    └── Notifications
```

### 2. Understand the user's mental model

Users organise information the way they think about it, not the way the product team built it. Before designing IA:

- What tasks do users come to do? List the top 5 by frequency.
- What do users call things? Use their vocabulary, not internal jargon.
- What do users expect to find together? Related items should be co-located.

If no user research exists, conduct a **closed card sort**: give users the existing navigation labels and ask them to group pages the way they'd expect. This reveals mismatches between your structure and theirs.

### 3. Apply organisation principles

Choose the dominant organisation scheme for each section:

| Scheme | Use when |
|---|---|
| **Task-based** | Users come with specific jobs to do (e.g., "pay a bill", "run a report") |
| **Topic-based** | Content naturally clusters by subject area |
| **Audience-based** | Different user types need different content (e.g., admin vs. end user) |
| **Sequential** | The content has a natural order (onboarding steps, checkout flow) |
| **Alphabetical** | Reference content with known-item lookup (glossaries, settings lists) |

Most products mix schemes. Keep each section internally consistent.

### 4. Design the hierarchy

Rules:
- **Maximum 3 levels deep** for primary navigation. Deeper than 3 requires users to hold too much structure in memory.
- **5–9 items per level** (Miller's Law). Fewer is better — split or merge rather than crowding.
- **Balance breadth and depth.** Wide and shallow (many top-level items) vs. narrow and deep (few categories, many sub-items). Most products benefit from wider at the top.

```
✓ Good: 6 top-level items, 4–5 sub-items each
✗ Bad:  3 top-level items, 20 sub-items each (users must dig)
✗ Bad:  15 top-level items, 2 sub-items each (cognitive overload at top level)
```

### 5. Write the labels

Label quality determines findability. Rules:
- **Concrete over abstract**: "Orders" not "Transactions", "Analytics" not "Insights"
- **User vocabulary over internal jargon**: what do users call this feature?
- **Action verbs for task sections**: "Create report" not "Reports" if the primary use is creation
- **Parallel construction**: if three items are nouns, all should be nouns — don't mix "Account", "Notifications", and "Change Password"
- **Length**: navigation labels should be 1–3 words; 4+ words will get truncated

Test labels by asking: "If a new user saw this label, would they know what's behind it?"

### 6. Design navigation patterns

Choose the right pattern for the product type:

```
TOP NAV BAR
┌──────────────────────────────────────────────────────────────┐
│ Logo   [Nav 1]  [Nav 2]  [Nav 3]  [Nav 4]        [User ▼]   │
└──────────────────────────────────────────────────────────────┘
Best for: shallow hierarchies, marketing/content sites, 4–7 top-level items

SIDEBAR NAV
┌──────────┬───────────────────────────────────────────────────┐
│ [Nav 1]  │  Content area                                     │
│ [Nav 2]  │                                                   │
│ [Nav 3]  │                                                   │
│   Nav 4  │                                                   │
│   ├ Sub1 │                                                   │
│   └ Sub2 │                                                   │
└──────────┴───────────────────────────────────────────────────┘
Best for: apps with deep hierarchies, frequent context-switching, power users

BOTTOM NAV (mobile)
┌────────────────────────────────────┐
│  Content area                      │
└────────────────────────────────────┘
│ [Home]  [Search]  [Create]  [Me]   │
└────────────────────────────────────┘
Best for: mobile, 3–5 primary destinations, frequent switching

TAB BAR (within a section)
┌──────────────────────────────────────────────┐
│ [Overview] [Holdings] [History] [Analysis]   │
├──────────────────────────────────────────────┤
│  Section content                             │
└──────────────────────────────────────────────┘
Best for: parallel content at the same level, 2–5 items
```

### 7. Produce the sitemap

Document the final IA as a sitemap:

```markdown
# Sitemap: <Product Name>
**Date:** YYYY-MM-DD
**Version:** N

## Structure

/ (Home / Dashboard)
├── /portfolio
│   ├── /portfolio/overview
│   ├── /portfolio/holdings
│   └── /portfolio/history
├── /research
│   ├── /research/screener
│   └── /research/analysis
├── /settings
│   ├── /settings/account
│   └── /settings/notifications
└── /help

## Navigation pattern: sidebar (desktop) / bottom nav (mobile)

## Label decisions
| Label | Alternatives considered | Why chosen |
|---|---|---|
| Portfolio | Investments, Holdings | Broader — covers cash + positions |
```

Save to `.d3/docs/` as `ia-sitemap-TIMESTAMP.md`.

---

## Common Rationalizations

| Excuse | Counter-argument |
|---|---|
| "Users will figure it out" | Users don't read navigation — they scan for information scent. If a label doesn't immediately signal what's behind it, users won't click it. |
| "We'll fix the labels in a later sprint" | Label changes are cheap to make and expensive to delay. Every session with a misleading label is a support ticket or a churned user. |
| "3 levels deep is fine for our use case" | It's never fine. 3 levels means users must make 3 correct decisions before seeing content. Each decision introduces a drop-off point. |
| "Our users are power users — they'll learn the navigation" | Even power users rely on IA when returning to infrequent tasks. Learnability degrades when users return after a break. |

---

## Red Flags

- Navigation items named after internal teams or databases
- More than 3 levels of nesting in primary navigation
- "Other" or "Misc" categories (content that doesn't fit is an IA failure)
- Navigation that differs between desktop and mobile without justification
- Settings containing navigation items that belong in primary nav
- Page titles that don't match the navigation label that led to them

---

## Verification

- [ ] Every page is reachable in ≤3 clicks from the homepage
- [ ] Navigation labels tested against user vocabulary (at minimum, reviewed by someone outside the team)
- [ ] Hierarchy depth ≤3 levels for primary navigation
- [ ] No "Other" or "Misc" categories
- [ ] Sitemap document saved to `.d3/docs/`
- [ ] Mobile navigation pattern specified separately from desktop
