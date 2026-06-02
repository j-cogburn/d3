---
name: design-critique
description: Guides agents through structured design critique using visual hierarchy principles, Gestalt laws, reading patterns, colour theory, and spacing analysis. Use when evaluating a wireframe, reviewing a UI implementation, auditing design quality, or before finalising any visual design.
---

# Design Critique

## Overview

Design critique is structured observation — not subjective preference. Every finding must reference a principle. "I don't like it" is not critique. "The primary action is visually indistinct from secondary actions because they share the same size, weight, and colour" is critique.

The critique format:
1. **Observation** — what you see
2. **Principle** — which design principle it relates to
3. **Impact** — what effect this has on the user
4. **Recommendation** — a specific, actionable fix

---

## When to Use

- Reviewing a wireframe before moving to implementation
- Auditing a built screen for visual quality issues
- Self-reviewing a design before presenting it
- As part of `/audit design` or `/audit ux`

---

## Visual hierarchy

Visual hierarchy tells users what to look at first, second, third. It's established through:

```
SIZE      → Larger elements claim more attention
CONTRAST  → High contrast elements dominate low contrast ones
WEIGHT    → Bold draws the eye; light recedes
COLOUR    → Saturated or distinct colours attract before neutral ones
POSITION  → Top-left captures first in Western reading patterns; F/Z patterns apply
WHITESPACE→ Isolated elements receive more attention than crowded ones
```

Evaluate each screen with this checklist:

```
[ ] Is there exactly ONE element that is clearly the most important?
[ ] Is the reading order (1st, 2nd, 3rd) obvious from visual weight alone?
[ ] Does visual prominence match functional importance?
    (The most used action should be the most prominent — not just the most colourful)
[ ] Are secondary elements clearly subordinate to primary ones?
[ ] Is there enough whitespace around the primary action to give it breathing room?
```

### Common hierarchy failures

```
COMPETING PRIMARIES
Every button is the same size, weight, and colour → no single action dominates
Fix: Give the primary action a filled, prominent style. Make secondary actions ghost or outlined.

VISUAL NOISE
Too many elements at the same visual weight → eye doesn't know where to start
Fix: Reduce to one dominant element per screen section. Decrease contrast on supporting content.

HIERARCHY INVERSION
Small text for important information, large text for decorative elements
Fix: Align text size/weight with information importance.
```

---

## Gestalt principles in UI

### Proximity
Elements close together are perceived as related.

```
✓ Group form labels with their inputs
✓ Group action buttons together
✗ Related items separated by unrelated items (user perceives them as unrelated)
```

### Similarity
Elements that look the same are perceived as the same type.

```
✓ All primary buttons look the same
✓ All secondary actions look the same
✗ Two buttons with different styles — user assumes different function
   When buttons have the same function, make them look the same.
```

### Closure
Users complete incomplete shapes mentally.

```
✓ Cards don't need borders if background colour creates the boundary
✓ Icons work even when not pixel-perfect — the brain fills in
✗ Ambiguous containers where the boundary is unclear
```

### Continuity
The eye follows lines and paths.

```
✓ Align elements on a consistent grid — the eye flows through them
✗ Elements at random positions — the eye stumbles
```

### Figure-Ground
Users distinguish between foreground (figure) and background.

```
✓ Content sits clearly above background
✓ Modals use an overlay to separate from page content
✗ Content and background are too close in value — nothing "pops"
```

---

## Reading patterns

### F-pattern (text-heavy pages)

Users scan the top horizontal band first, then a shorter second horizontal scan, then a vertical movement down the left side.

```
[████████████████████████████]   ← First scan (full width)
[████████████████]               ← Second scan (shorter)
[██]                             ← Vertical scan (left column only)
[██]
[██]
```

Implication: critical information in the left column. Anything in the right column of a text-heavy page gets little attention.

### Z-pattern (marketing/landing pages)

Users move top-left → top-right → diagonal → bottom-left → bottom-right.

```
[Top left] ──────────────── [Top right]
                  ↗
[Bottom left] ──────────── [Bottom right]
```

Implication: place your logo top-left, key value prop top-right, CTA bottom-right.

### Gutenberg diagram (clean, sparse layouts)

Attention is highest at top-left (primary optical area) and bottom-right (terminal area). Low attention in the other two corners.

Place the most important CTA at the bottom-right of a page section.

---

## Colour critique

### The 60-30-10 rule

```
60% — Dominant colour (neutral: white, light gray, dark background)
30% — Secondary colour (primary brand or structural elements)
10% — Accent colour (CTAs, highlights, alerts)
```

Deviation from this ratio creates visual instability. Too much accent colour exhausts the eye.

### Colour contrast (WCAG minimum)

```
Normal text (<24px):   4.5:1 contrast ratio
Large text (≥24px):    3:1 contrast ratio
Interactive elements:  3:1 against adjacent colours
Focus indicators:      3:1

Quick checks:
✗ Light gray text (#999) on white (#FFF): 2.85:1 → FAIL
✓ Dark gray text (#555) on white (#FFF):  7.46:1 → PASS
✓ White text on brand blue (#3B82F6):     3.14:1 → PASS for large text, FAIL for small
```

### Semantic colour consistency

```
✓ Error states always use the same red
✓ Success states always use the same green
✗ Multiple shades of red used for different non-error purposes — users will read them as errors
✗ Green used for destructive confirmations — users associate green with "safe"
```

---

## Spacing and density critique

```
CROWDED (spacing too tight)
  → Elements compete for space
  → User can't visually separate related from unrelated
  → Feels overwhelming
  Fix: Increase padding inside components; increase gap between component groups

SPARSE (spacing too loose)
  → Elements feel disconnected
  → Page feels unfinished
  → Scroll distance too long
  Fix: Tighten related element groups; reduce section padding

INCONSISTENT (spacing not on grid)
  → Misaligned elements signal lack of craft
  → Users feel something is "off" even if they can't articulate why
  Fix: All spacing values must be multiples of the base unit (4px or 8px)
```

---

## Critique format

When producing a design critique, use this structure for each finding:

```
## [Screen / Component Name]

### [Finding Title] — Severity: Critical / High / Medium / Low

**Observation:** [What is visible]
**Principle:** [Which principle is violated]
**Impact:** [Effect on the user]
**Recommendation:** [Specific change]

Example:
### Primary and secondary buttons are visually equivalent — High

Observation: The "Save" and "Discard changes" buttons are the same size,
             weight, and colour, differentiated only by label.
Principle:   Visual hierarchy — prominence must match importance. A destructive
             action should not compete visually with the primary action.
Impact:      Users scan buttons by appearance before reading labels. Equal
             visual weight means equal perceived importance — users will
             accidentally choose Discard.
Recommendation: Make "Save" a filled primary button. Make "Discard changes"
                a ghost button or text link, optionally in the danger colour.
```

---

## Common Rationalizations

| Excuse | Counter-argument |
|---|---|
| "It looks clean and minimal" | Minimal is a result of good hierarchy, not the absence of elements. A screen can be minimal and still have clear visual priority. |
| "Users will read the labels" | Users scan before they read. Hierarchy guides the scan. If visual hierarchy is broken, users never reach the labels. |
| "The contrast is fine — it's readable" | WCAG 4.5:1 is the minimum for normal text. Aim for 7:1 where possible. "Readable" and "comfortable to read" are different standards. |
| "This is just a style preference" | Visual hierarchy, Gestalt laws, and reading patterns are observable behaviours, not preferences. They can be measured. |

---

## Red Flags

- Two or more elements at equal visual prominence on the same screen (competing primaries)
- Text contrast below 4.5:1 for body copy
- Buttons differentiated only by label text, not visual style
- Related items separated by unrelated visual elements
- Inconsistent spacing (values not on the grid)
- Error/success/warning states using non-standard semantic colours

---

## Verification

- [ ] One dominant element per screen section — visual hierarchy is unambiguous
- [ ] All text passes WCAG 4.5:1 (normal) or 3:1 (large) contrast
- [ ] Related elements are grouped by proximity
- [ ] Button variants visually communicate their hierarchy (primary > secondary > ghost)
- [ ] Spacing values are consistent and on-grid
- [ ] No competing semantic colour uses (red = error only, green = success only)
