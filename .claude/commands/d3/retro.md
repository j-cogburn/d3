Post-sprint retrospective. Reviews what shipped, what stalled, and quality trends since the last release. Produces a report and seeds the next sprint's focus.

**Usage:**
- `/retro` — retrospective since the last git tag
- `/retro "Phase 1"` — scope retrospective to a specific phase

---

## Step 1 — Determine scope

```bash
git describe --tags --abbrev=0 2>/dev/null || echo "(no previous tag)"
git log $(git describe --tags --abbrev=0 2>/dev/null)..HEAD --oneline 2>/dev/null
```

If `$ARGUMENTS` names a phase or scope, filter CHANGELOG and TASKS.md entries accordingly.

Get timestamp: `date '+%Y-%m-%d-%H%M'`

---

## Step 2 — Gather data (run in parallel)

```bash
# Commits in scope
git log $(git describe --tags --abbrev=0 2>/dev/null)..HEAD --oneline 2>/dev/null

# Audit coverage
ls -t .d3/reports/*.md 2>/dev/null | head -10

# Open and blocked work
grep -c '\*\*Status:\*\* ready' .d3/TASKS.md 2>/dev/null || echo 0
grep -c 'blocked' .d3/TASKS.md 2>/dev/null || echo 0
```

Also read:
- `.d3/CHANGELOG.md` — last 20 entries
- `.d3/TASKS.md` — ARCHIVED DIRECTIVES section (completed in scope)

---

## Step 3 — Analyze

**Velocity:**
- How many directives completed this period?
- Any that were blocked — how long and why?
- Batch sizes: were directives run together or one at a time?

**Quality:**
- How many `/resolve` or "Quality fix:" directives appeared? (These are regressions or bugs that slipped through.)
- Did adversarial review catch critical issues before merge?
- Which audit dimensions ran — and which didn't?

**Scope:**
- Were directives added mid-sprint that weren't in the original plan?
- Did any directives expand significantly from their original description?

**Gaps:**
- What's still open in TASKS.md that was expected to be done?
- Any recurring themes in blocked or stalled work?

---

## Step 3b — Bearing review (if track.md exists)

Read `.d3/track.md`. Add a bearing review section to the retrospective:

- Was the sprint goal achieved? Were exit criteria met?
- What % of work was on-sprint vs. off-sprint (tactical maneuvers)?
- Did the course remain on track, or was a pivot/correction needed? Why?
- Should the next sprint be re-planned based on what was learned?
- Does the phase exit criteria still make sense, or needs updating?

---

## Step 4 — Write retrospective

Save to `.d3/reports/retro-TIMESTAMP.md`:

```markdown
# Retrospective
**Date:** YYYY-MM-DD
**Scope:** Since vX.Y.Z / [Phase N] / [date range]

## What Shipped
| Directive | Title | PR |
|---|---|---|
| DIRECTIVE-NNN | <title> | #N |

## Velocity
- Directives completed: N
- Regressions / quality fixes: N
- Blocked (unresolved): N

## What Worked
- <observation>

## What Stalled
- <observation — include root cause if identifiable>

## Quality Signal
- Audit dimensions run: docs / product / design / vision / code
- Issues caught by hooks: N
- Issues caught by adversarial review: N
- Issues caught post-deploy: N

## Recommended Focus — Next Sprint
1. <highest-leverage next action based on open work and findings>
2. <second>
3. <third>
```

---

## Step 5 — Surface next actions

Print the recommended focus, then ask (single-select):
- "Run /plan to create directives from these recommendations"
- "Run /sprint to start the next cycle now"
- "Done — I'll review later"
