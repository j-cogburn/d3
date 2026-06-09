---
name: wireframe
description: Guides agents through creating low-fidelity ASCII wireframes for pages, components, and flows. Communicates layout and hierarchy without committing to visual details. Use when planning UI before implementation, reviewing a spec, or aligning on structure before design.
---

# Wireframe

## Overview

ASCII wireframes use plain characters to represent layout, content hierarchy, and interaction patterns. They are intentionally lo-fi — the goal is to communicate structure and flow, not aesthetics. No colours, no fonts, no visual polish.

A good wireframe answers three questions:
1. What is on this screen?
2. Where does it sit relative to everything else?
3. How does the user interact with it?

---

## ASCII conventions

### Structural characters

```
┌ ─ ┐    Top border
│   │    Side borders
└ ─ ┘    Bottom border
├ ─ ┤    Horizontal divider within a container
│        Vertical divider

+-------+   Alternative box style (for wide/complex diagrams)
|       |
+-------+
```

### Content placeholders

```
[Button Label]          Primary / secondary button
[Button Label ▼]        Dropdown trigger
[_________________]     Text input (empty)
[Search____________🔍]  Search input with icon
[✓ Checkbox label]      Checked checkbox
[○ Radio option]        Radio button
[●]                     Selected radio button
[Image: 400×300]        Image placeholder (specify dimensions)
[Avatar: 48px]          Circular avatar
[Icon: name]            Icon placeholder
```

### Typography placeholders

```
# Page Headline (H1)
## Section Title (H2)
### Subsection (H3)

{Short headline — 1 line, ~40 chars}
{Body text — 2-3 lines of placeholder copy to show line breaks
 and approximate reading length at this container width}
{Meta: date · author · category}
```

### Layout indicators

```
← back                  Navigation / breadcrumb
[Home] [About] [Docs]   Horizontal nav links
• List item             Unordered list
1. List item            Ordered list
────────────────        Horizontal rule / separator
░░░░░░░░░░░░░░░         Filled / loading / skeleton area
⬚                       Empty / placeholder cell in a grid
```

### Viewport widths

| Viewport | Width | Characters |
|---|---|---|
| Desktop | 1440px | 100 chars |
| Tablet | 768px | 64 chars |
| Mobile | 375px | 40 chars |

Match the character width to the viewport being wireframed.

---

## Layout patterns library

### Top navigation bar

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [Logo]            [Nav 1]  [Nav 2]  [Nav 3]          [Login]  [Sign Up]      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Sidebar + main content

```
┌──────────┬─────────────────────────────────────────────────────────────────┐
│ Sidebar  │  Main content area                                              │
│          │                                                                 │
│ [Nav 1]  │  # Page Title                                                   │
│ [Nav 2]  │                                                                 │
│ [Nav 3]  │  {Body content goes here}                                       │
│          │                                                                 │
└──────────┴─────────────────────────────────────────────────────────────────┘
```

### Card grid

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ [Image: 100%×120]│  │ [Image: 100%×120]│  │ [Image: 100%×120]│
│                  │  │                  │  │                  │
│ Card Title       │  │ Card Title       │  │ Card Title       │
│ {Short desc}     │  │ {Short desc}     │  │ {Short desc}     │
│            [CTA] │  │            [CTA] │  │            [CTA] │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Form

```
┌──────────────────────────────────────────────────────────────┐
│  # Form Title                                                │
│                                                              │
│  Label                                                       │
│  [_________________________________________]                 │
│                                                              │
│  Label                                                       │
│  [_________________________________________]                 │
│  {Helper text or validation message}                         │
│                                                              │
│  [✓ I agree to the terms]                                    │
│                                                              │
│                              [Cancel]  [Submit Button]       │
└──────────────────────────────────────────────────────────────┘
```

### Modal dialog

```
          ┌────────────────────────────────────┐
░░░░░░░░░░│ ## Modal Title                   ✕ │░░░░░░░░░░
░░░░░░░░░░├────────────────────────────────────┤░░░░░░░░░░
░░░░░░░░░░│                                    │░░░░░░░░░░
░░░░░░░░░░│  {Modal body content. Keep it      │░░░░░░░░░░
░░░░░░░░░░│   short — one clear action.}        │░░░░░░░░░░
░░░░░░░░░░│                                    │░░░░░░░░░░
░░░░░░░░░░│              [Cancel]  [Confirm]   │░░░░░░░░░░
░░░░░░░░░░└────────────────────────────────────┘░░░░░░░░░░
```

### Data table

```
┌──────────────────────────────────────────────────────────────┐
│  # Table Title                            [+ Add]  [Filter ▼]│
├──────────────┬──────────────┬───────────┬────────────────────┤
│  Column A    │  Column B    │  Column C │  Actions           │
├──────────────┼──────────────┼───────────┼────────────────────┤
│  Row value   │  Row value   │  value    │  [Edit]  [Delete]  │
│  Row value   │  Row value   │  value    │  [Edit]  [Delete]  │
│  Row value   │  Row value   │  value    │  [Edit]  [Delete]  │
└──────────────┴──────────────┴───────────┴────────────────────┘
│  Showing 1–10 of 47                  [← Prev]  [Next →]      │
└──────────────────────────────────────────────────────────────┘
```

### Mobile layout (40 chars)

```
┌────────────────────────────────────┐
│ ☰  [Logo]              [Avatar]    │
├────────────────────────────────────┤
│                                    │
│  # Page Title                      │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ [Image: 100%×180]            │  │
│  └──────────────────────────────┘  │
│                                    │
│  {Body content, full width}        │
│                                    │
│  [Primary Action Button]           │
│  [Secondary Action]                │
│                                    │
└────────────────────────────────────┘
│ [Home]  [Search]  [Profile]  [···] │
└────────────────────────────────────┘
```

---

## Process

1. **Understand what to wireframe.** Read the source: spec, user story, existing route, or description. Identify: what is this page's single primary action? What are the secondary elements?

2. **Choose the viewport.** Default to desktop unless the prompt specifies otherwise. If mobile, use 40-char width.

3. **Sketch the information hierarchy first** (in plain text, not ASCII yet):
   - What is the most important thing on this page?
   - What comes second? Third?
   - What is in the nav / global chrome?
   - What is optional / secondary?

4. **Lay out the structure** using the pattern library above. Start with the outer container, then fill in sections top to bottom, primary to secondary.

5. **Add content placeholders** that reflect the real content type — don't use generic "content here" labels. If it's a product name, write `{Product name — 1-3 words}`. If it's a price, write `{$0.00}`.

6. **Annotate interactions.** After the wireframe, add a short annotations block:
   ```
   ## Annotations
   [1] Clicking the card navigates to the detail page
   [2] Form validates on blur; inline error appears below the field
   [3] Destructive action — requires confirmation modal before proceeding
   ```

7. **Flag new components.** Note any UI patterns not yet in the design system with `⚠ new component needed`.

---

## Verification

Before saving, check:
- [ ] Every interactive element is labelled
- [ ] The primary action is visually distinct (larger, more prominent position)
- [ ] Empty states are shown if the page can appear empty
- [ ] Error states are shown for any form
- [ ] The wireframe reads top-to-bottom in priority order
- [ ] Viewport width matches the chosen device class
- [ ] Annotations cover all non-obvious interactions
