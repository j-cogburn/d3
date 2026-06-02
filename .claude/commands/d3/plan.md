Parse a source and propose directives to add to the DIRECTIVES section of `.d3/TASKS.md`. Presents proposals before writing anything.

**Usage:**
- `/plan .d3/reports/product-audit-2026-05-31-1000.md` — extract from an audit report
- `/plan .d3/reports/product-audit-*.md "Phase 2"` — focus on a specific section
- `/plan "Fix the broken checkout flow and add order confirmation emails"` — inline description
- `/plan #42` — read GitHub issue #42 and propose a directive from it
- `/plan` — read the most recent report in `.d3/reports/` and propose directives from it

---

## Step 1 — Read `.d3/TASKS.md`

Find the highest existing `DIRECTIVE-NNN` ID. New IDs start from N+1.

Also collect all active TASK-NNN and DIRECTIVE-NNN titles to avoid duplicates.

---

## Step 2 — Resolve the source

**If `$ARGUMENTS` is a GitHub issue reference** (matches `#NNN` or a bare number like `123`):
```bash
gh issue view <N> --json title,body,labels,assignees,milestone
```
Use the issue title as the directive title seed and the body as source material. Prepend the issue number to the proposed directive title (e.g. `Fix #123: <title>`). If the issue is not found, stop and report.

**If `$ARGUMENTS` is empty:**
```bash
ls -t .d3/reports/*.md 2>/dev/null | head -1
```
Read the most recent report.

**If `$ARGUMENTS` is a file path** (with optional section), resolve globs: `ls -t <glob> | head -1`. Read the file, then focus on the specified section if given.

**If `$ARGUMENTS` is inline text**, treat it directly as source material.

---

## Step 3 — Extract actionable items

Scan the source for discrete, actionable work items. Cast wide — the user will filter.

**Include:**
- Numbered/bulleted items in sections labelled Critical Issues, Phase N, TODO, Recommendations, Fix, Next steps
- Sentences beginning with imperative verbs: Build, Fix, Add, Wire, Remove, Replace, Implement, Expose, Update, Migrate

**Skip:**
- Pure observations with no action ("The page is clean")
- Items already in `.d3/TASKS.md` as an active TASK-NNN or DIRECTIVE-NNN (check by keyword match)
- Items explicitly marked deferred, out of scope, or "not now"

For each extracted item, draft:
- **Title** — ≤ 8 words, imperative, specific
- **Description** — 2–3 sentences: what to build, why it matters, any constraint the agent needs
- **Services** — Express · Python · React (list only what applies)
- **Agent** — `general-purpose` (default), `Plan` (design-first), or `claude`
- **Skills** — relevant skills from `.d3/skills/` (omit if none clearly apply). Common mappings:
  - API work → `api-and-interface-design`
  - Any implementation → `incremental-implementation`, `test-driven-development`
  - UI / frontend → `frontend-ui-engineering`, `interaction-design`
  - New components or design system → `design-system`, `design-critique`
  - Navigation / IA → `information-architecture`
  - Buttons, forms, empty states, errors → `ux-writing`
  - Flows, onboarding → `user-journey-mapping`, `ux-writing`
  - Visual redesign → `design-critique`
  - Auth / input / integrations → `security-and-hardening`
  - Performance → `performance-optimization`
- **Done when** — one primary, testable criterion plus a test gate for each service in scope:
  - Express: `npm test --prefix api-express` passes
  - Python: `api-python/.venv/bin/pytest api-python/tests/ -q` passes
  - React: `npm run build --prefix client` succeeds

---

## Step 4 — Present proposals

**Do not write to `.d3/TASKS.md` yet.**

Print each proposal:
```
[N] <Title>
    Services: <list>
    Skills:   <list or none>
    Agent:    <type>
    Description: <2-3 sentences>
    Done when:   <criterion>
```

Then: `Found N candidates. Which would you like to add?`

Use AskUserQuestion (multiSelect):
- "Add all"
- One option per proposal: "[N] <Title>"
- "Add none / cancel"

---

## Step 5 — Write selected directives

For each selected proposal, insert immediately after the DIRECTIVES section header:

```markdown
### DIRECTIVE-NNN: <Title>
**Status:** ready
**Agent:** <type>
**Services:** <services>
**Skills:** <comma-separated skill names — omit line if none apply>
**Added:** YYYY-MM-DD

<Description>

**Done when:**
- [ ] <primary criterion>
- [ ] <test gate per service in scope — Express: `npm test --prefix api-express` / Python: `api-python/.venv/bin/pytest api-python/tests/ -q` / React: `npm run build --prefix client`>

---
```

Use today's date. Do not renumber or reorder existing directives or tasks.

---

## Step 6 — Confirm

```
Added N directives: DIRECTIVE-NNN, ...
Source: <file or description>

  DIRECTIVE-NNN — <Title>
  ...

Run /execute to implement them.
```
