Quality-focused improvement cycle. Identifies and fixes quality issues — UX, design, code, errors, performance — without adding new features. Runs a scoped audit → plan → execute → verify loop.

**Usage:**
- `/improve` — audit all quality dimensions, propose and run fixes
- `/improve design` — design system adherence only
- `/improve code` — code quality, bugs, and correctness gaps only
- `/improve ux` — UX quality: empty states, error handling, dead ends, confusing flows
- `/improve "data page"` — scope to a specific feature area

---

## Step 1 — Scoped audit

Run `/audit` with the appropriate dimension based on `$ARGUMENTS`:

| Argument | Audit dimension |
|---|---|
| `design` | design |
| `code` | code |
| `ux` | product (UX-focused) |
| feature area | product (scoped) |
| empty / `all` | design + code |

Collect the findings. Focus only on quality issues — skip roadmap gaps, missing features, or Phase N items. Quality issues are: broken states, wrong colors/spacing, misleading UI, raw error messages, unused code, known bugs, import errors, stale data displayed as live.

---

## Step 2 — Filter for quality issues only

From the audit findings, extract only items that:
- Fix something broken, confusing, or wrong — not add something missing
- Have no external dependencies (not blocked by a missing API, model, or data source)
- Are S or M effort — quality fixes should be fast; L effort belongs in a directive added to the backlog, not run inline

Discard:
- Feature gaps ("there is no subscription page")
- Phase 2+ roadmap items
- Anything that requires a new database model or new API endpoint

---

## Step 3 — Plan quality directives

Run `/plan` with the filtered quality findings. These become DIRECTIVE-NNN items.

Label each directive description with "Quality fix:" so they're identifiable in the archive.

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
Scope:      <dimension or feature area>
Issues found:   N
Directives run: N
PRs merged:     N

Fixed:
  DIRECTIVE-NNN — <Title>  (PR #N)
  ...

Deferred to backlog (L effort):
  - <description>  → added to TASKS.md
```
