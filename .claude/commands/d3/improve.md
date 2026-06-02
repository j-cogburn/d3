Quality-focused improvement cycle. Identifies and fixes quality issues without adding new features. Runs a scoped audit → plan → execute → verify loop.

**Usage:**
- `/improve` — audit all quality dimensions, propose and run fixes
- `/improve design` — design system tokens, component states, visual consistency
- `/improve ux` — heuristic violations, task flows, cognitive load, responsive issues
- `/improve accessibility` — WCAG 2.1 AA gaps, keyboard nav, ARIA, contrast
- `/improve ia` — navigation labels, content hierarchy, findability
- `/improve copy` — microcopy: error messages, button labels, empty states, tooltips
- `/improve interactions` — micro-interactions, state machines, loading/feedback patterns
- `/improve code` — code quality, bugs, correctness gaps
- `/improve "data page"` — scope any dimension to a specific feature area

---

## Step 1 — Scoped audit

Run `/audit` with the appropriate dimension based on `$ARGUMENTS`:

| Argument | Audit dimension | Key skills invoked |
|---|---|---|
| `design` | design | `design-system`, `design-critique` |
| `ux` | ux | `design-critique`, `information-architecture`, `ux-writing`, `user-journey-mapping` |
| `accessibility` | accessibility | `accessibility-checklist` reference |
| `ia` | ux (IA-focused) | `information-architecture` |
| `copy` | ux (microcopy-focused) | `ux-writing` |
| `interactions` | design (interaction-focused) | `interaction-design` |
| `code` | code | — |
| feature area | product (scoped) | — |
| empty / `all` | ux + design + code | all above |

For `ia`, `copy`, and `interactions` — run `/audit ux` but filter findings to only that domain before planning directives.

Collect the findings. Focus only on quality issues — skip roadmap gaps, missing features, or Phase N items.

Quality issues are:
- Broken or missing component states
- Hardcoded token values deviating from the design system
- Heuristic violations (confusing flows, dead ends, missing feedback)
- Navigation labels that don't match user vocabulary
- Error messages that say only "Error" or "Something went wrong"
- Button labels that are "OK", "Submit", or "Yes"
- Empty states with no path forward
- Missing or broken micro-interactions (no loading state, no error recovery)
- Contrast failures, missing focus rings, broken keyboard navigation
- Responsive layout failures at tablet or mobile

---

## Step 2 — Filter for quality issues only

Extract only items that:
- Fix something broken, confusing, or wrong — not add something missing
- Have no external dependencies
- Are S or M effort — L effort belongs in the backlog as a directive, not run inline

Discard:
- Feature gaps ("there is no notifications page")
- Phase 2+ roadmap items
- Anything requiring a new database model or new API endpoint

---

## Step 3 — Plan quality directives

Run `/plan` with the filtered findings. These become DIRECTIVE-NNN items.

Label each directive description with "Quality fix:" so they're identifiable in the archive.

Assign relevant skills to each directive:
- Design fixes → `design-system`, `design-critique`
- UX fixes → `ux-writing`, `interaction-design`, `frontend-ui-engineering`
- IA fixes → `information-architecture`
- Copy fixes → `ux-writing`
- Interaction fixes → `interaction-design`

---

## Step 4 — Execute

Run `/execute` for the quality directives added in Step 3.

---

## Step 5 — Verify

Run `/verify` on the surfaces touched by the merged PRs. Confirm each quality issue is visually resolved. If any regression was introduced, create a follow-up directive immediately.

---

## Step 6 — Report

```
IMPROVE COMPLETE
================
Scope:          <dimension or feature area>
Issues found:   N
Directives run: N
PRs merged:     N

Fixed:
  DIRECTIVE-NNN — <Title>  (PR #N)
  ...

Deferred to backlog (L effort):
  - <description>  → added to .d3/TASKS.md
```
