Project health snapshot. Where we are, what's in flight, what's next. Answers the "where do I pick up?" question at the start of any session.

---

## Step 1 — Gather signals (run in parallel)

```bash
# Git state
git log --oneline -5
git status --short
git log origin/main..main --oneline 2>/dev/null || echo "(up to date)"

# Service health
curl -sf http://localhost:5001/api/health 2>/dev/null && echo "Express UP" || echo "Express DOWN"
curl -sf http://localhost:3001 > /dev/null 2>&1 && echo "React UP" || echo "React DOWN"
curl -sf http://localhost:8000/health 2>/dev/null || echo "Python DOWN"

# Recent work
ls -t .d3/reports/*.md 2>/dev/null | head -5

# Active objectives
grep -l 'Status.*active' .d3/objectives/obj-*.md 2>/dev/null
```

Also read:
- `.d3/TASKS.md` — directives (status), phase task counts
- `.d3/CHANGELOG.md` — last 10 entries
- Active objective files — current phase and spawned directives

---

## Step 2 — Print snapshot

```
PROJECT STATUS — YYYY-MM-DD
=============================

SERVICES
  Express   UP / DOWN
  React     UP / DOWN
  Python    UP / DOWN

GIT
  Branch:   main
  Local:    N commits ahead / up to date
  Dirty:    yes (N files) / clean

OBJECTIVES
  OBJ-NNN  <title>  [Phase N/M — next: /<command>]
  (omit section if no active objectives)

DIRECTIVES
  Active (in-progress): N  →  DIRECTIVE-NNN (branch), ...
  Ready to run:         N  →  DIRECTIVE-NNN, ...
  Blocked:              N  →  DIRECTIVE-NNN (waiting on ...)

RECENT WORK  (last 5 CHANGELOG entries)
  YYYY-MM-DD  DIRECTIVE-NNN  <Title>  (PR #N)
  ...

LAST AUDIT
  docs:     YYYY-MM-DD  (N days ago) — .d3/reports/docs-audit-...
  product:  YYYY-MM-DD  (N days ago) — .d3/reports/product-audit-...
  design:   YYYY-MM-DD  (N days ago) — .d3/reports/design-audit-...
  vision:   YYYY-MM-DD  (N days ago) — .d3/reports/vision-audit-...
  code:     never / YYYY-MM-DD

RECOMMENDED NEXT ACTION
  <one concrete recommendation — e.g. "/execute" if there are ready directives,
   "/audit product" if last product audit is >7 days old,
   "/sprint" if no directives are ready and no recent audit exists,
   "/sync-docs" if the last CHANGELOG entry has no corresponding docs update>
```

Keep the output to one screen. No padding, no filler sentences.
