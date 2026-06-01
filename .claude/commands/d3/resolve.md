Targeted one-shot fix. Given a description of a problem, creates a single directive and executes it immediately. No audit phase, no planning phase — just diagnose, implement, verify.

**Usage:**
- `/resolve the signup page shows a broken layout on mobile`
- `/resolve DIRECTIVE-055` — re-execute a specific directive that was previously paused or failed
- `/resolve the Admin health panel still shows Unknown for TimescaleDB`

---

## Step 1 — Understand the problem

Parse `$ARGUMENTS`. If it's a DIRECTIVE-NNN ID, read that directive from TASKS.md and proceed directly to Step 3.

Otherwise, read `CLAUDE.md` and any relevant service-level CLAUDE.md for context. Then:

1. Restate the problem in one clear sentence: what is broken, where it is, and what the correct behavior should be.
2. Identify which services are involved (Express / Python / React).
3. Confirm this is an S or M effort fix — if it's L, warn the user and recommend `/directive` to add it to the backlog instead.

---

## Step 2 — Create the directive

Assign the next available DIRECTIVE-NNN ID from TASKS.md.

Insert a directive block at the top of the active DIRECTIVES section:

```markdown
### DIRECTIVE-NNN: <Concise fix title>
**Status:** ready
**Agent:** general-purpose
**Services:** <services>
**Added:** YYYY-MM-DD

<Problem restatement + what the fix should do + any constraints the agent needs.>

**Done when:**
- [ ] <primary criterion — testable, specific>
- [ ] <test gate per service in scope>
  - Express: `npm test --prefix api-express` passes
  - Python: `api-python/.venv/bin/pytest api-python/tests/ -q` passes
  - React: `npm run build --prefix client` succeeds

---
```

---

## Step 3 — Execute immediately

Mark the directive in-progress, build the agent brief (reading reference patterns live from service CLAUDE.md files per `/execute` Step 5), and spawn the agent.

Run the agent in the **foreground** (not background) — wait for it to complete.

---

## Step 4 — Merge

Find the PR, check CI, then merge without asking for strategy preference (use squash by default). If CI fails, report and ask the user what to do before merging.

```bash
gh pr merge <N> --squash --delete-branch
git fetch origin && git checkout main && git pull origin main --ff-only
```

---

## Step 5 — Verify

Screenshot the affected surface(s) and confirm the problem is resolved. If the fix introduced a regression, run `/resolve` again with the regression as the new problem description. If the regression is lower priority, add it to the backlog with `/directive`.

---

## Step 6 — Update records

1. Update TASKS.md: `**Status:** complete — PR #N · YYYY-MM-DD`
2. Add CHANGELOG.md entry.
3. Archive the directive (move to ARCHIVED DIRECTIVES section).

---

## Step 7 — Report

```
RESOLVED
=========
Problem:  <one-line problem statement>
Fix:      DIRECTIVE-NNN — <Title>  (PR #N)
Verified: yes / no (screenshots)
```
