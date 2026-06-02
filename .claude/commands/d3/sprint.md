Run a full D3 (Directive-Driven Development) cycle: audit → plan → execute → verify → sync-docs. Each phase completes before the next begins. Approval gates between phases.

**Usage:**
- `/sprint` — full cycle, all dimensions, all ready directives
- `/sprint product` — product audit only, then execute all ready directives
- `/sprint "Phase 2"` — audit scoped to Phase 2, plan Phase 2 items, execute
- `/sprint docs` — docs audit only + apply fixes, then sync-docs

This command orchestrates existing commands in sequence. Run each phase as instructed below — do not skip phases or combine steps across phases.

---

## Phase 0 — Status check

Before anything else, read `.d3/TASKS.md` and `.d3/CHANGELOG.md`. Print a brief orientation:

```
SPRINT START
=============
Active directives:  N (IDs)
Ready directives:   N (IDs)
Last merge:         <date and PR from .d3/CHANGELOG.md>
Last audit:         <date from most recent .d3/reports/*.md or "never">
```

If there are zero ready directives AND no recent audit, ask:
- "Run /spec to capture requirements before auditing"
- "Run /audit to find what needs fixing"
- "Continue anyway"

---

## Phase 1 — Audit

Run `/audit [scope from $ARGUMENTS or "all"]`.

Wait for the audit to complete and the report(s) to be written before proceeding.

If the audit produces no findings (everything is clean), print that and ask:
- "Proceed to execute ready directives"
- "Stop — nothing to do"

---

## Phase 2 — Plan

Run `/plan [most recent audit report]`.

Present proposals, wait for user selection, write chosen directives to `.d3/TASKS.md`.

If no proposals are selected or no audit findings existed, skip to Phase 3.

---

## Phase 3 — Execute

Run `/execute`.

This includes: spawn agents in parallel → collect results → confirm merge strategy → merge → sync main → archive → prompt for next steps.

Wait for all agents to complete and PRs to merge before proceeding.

If no ready directives exist (none were added in Phase 2 and none were already ready), skip to Phase 4.

---

## Phase 4 — Verify

After merges complete, run `/verify` scoped to the surfaces touched by the merged PRs.

Specifically: look at the merged PR titles and descriptions to determine which routes/pages/services changed, then screenshot those surfaces and confirm they render correctly.

If verify finds regressions:
1. Report the regression with screenshots
2. Ask: "Create a directive to fix this regression and re-execute?" or "Skip and continue"

---

## Phase 5 — Sync docs

Run `/sync-docs`.

This updates all documentation to reflect what shipped in this sprint.

---

## Phase 6 — Sprint summary

Print the sprint summary:

```
SPRINT COMPLETE
================
Date:               YYYY-MM-DD
Directives merged:  N (IDs and PR numbers)
Audit report:       .d3/reports/<type>-TIMESTAMP.md
Docs updated:       yes/no

What shipped:
  DIRECTIVE-NNN — <Title>  (PR #N)
  ...

Recommended next sprint:
  <1-2 sentence suggestion based on what's still open in .d3/TASKS.md and what the audit flagged>
```

---

## Notes for portability

This command works on any project that follows the D3 conventions:
- `CLAUDE.md` — project context
- `.d3/TASKS.md` — directives and tasks backlog
- `.d3/CHANGELOG.md` — shipped work log
- `.d3/docs/` — project documentation
- `.d3/reports/` — audit output directory

---

## Scheduled sprints

To run a docs audit + fix cycle automatically every week, set up a recurring routine with `/schedule`:

```
/schedule weekly /audit docs
```

Or for a full sprint on a weekly cadence:

```
/schedule weekly /sprint docs
```

Once scheduled, the routine runs `/audit docs` (or `/sprint docs`) every 7 days. Documentation is never more than 7 days stale without manual intervention. To view or cancel active schedules, use `/schedule list`.

For one-off scheduled runs (e.g. "run /audit product tomorrow at 9am"), `/schedule` accepts natural-language time expressions.
