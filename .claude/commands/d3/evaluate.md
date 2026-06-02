Comprehensive project assessment across 8 dimensions. Produces a scored report that shows where the project stands, where it's drifting, and what to fix first.

**Usage:**
- `/evaluate` — full assessment, all dimensions
- `/evaluate code` — score a single dimension
- `/evaluate --compare` — compare against the previous assessment (show trajectory)

Different from `/audit`: `/audit` finds specific problems and creates directives. `/evaluate` produces a scored snapshot of overall project health — useful for understanding where you are, tracking improvement over time, and prioritising what matters most.

---

## Step 0 — Setup

Get timestamp: `date '+%Y-%m-%d-%H%M'`

If `$ARGUMENTS` contains `--compare`, load the most recent previous assessment:
```bash
ls -t .d3/reports/assessment-*.md 2>/dev/null | head -1
```

If `$ARGUMENTS` is a dimension name, score only that dimension and skip to Step 2.

---

## Step 1 — Gather signals (run all in parallel)

```bash
# Vision
cat .d3/vision.md 2>/dev/null | head -60

# Code quality
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.js" --include="*.ts" \
  --include="*.py" . 2>/dev/null | grep -v "node_modules\|.venv\|.d3" | wc -l

# Tests
npm test --prefix api-express -- --coverage --json 2>/dev/null | tail -20
api-python/.venv/bin/pytest api-python/tests/ --tb=no -q 2>/dev/null | tail -5

# Security
npm audit --audit-level=high --json --prefix api-express 2>/dev/null | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('metadata',{}).get('vulnerabilities',{}))"
ls api-python/.venv/bin/pip-audit 2>/dev/null && \
  api-python/.venv/bin/pip-audit -r api-python/requirements.txt --format=json 2>/dev/null | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('dependencies',[])))"

# Performance baseline
cat .d3/reports/performance-baseline.json 2>/dev/null | head -20

# Audit recency — last date for each dimension
for dim in docs-audit product-audit design-audit ux-audit accessibility-audit vision-audit code-audit; do
  f=$(ls -t .d3/reports/${dim}-*.md 2>/dev/null | head -1)
  echo "$dim: ${f:-never}"
done

# Documentation
grep -l '\[Project Name\]' CLAUDE.md 2>/dev/null && echo "TEMPLATE" || echo "FILLED"
ls docs/current/*.md 2>/dev/null | wc -l
ls .d3/docs/adr/*.md 2>/dev/null | grep -v .gitkeep | wc -l
ls api-express/CLAUDE.md api-python/CLAUDE.md client/CLAUDE.md 2>/dev/null | wc -l
grep -c '^- ' .d3/CHANGELOG.md 2>/dev/null || echo 0

# UX / Design
ls .d3/wireframes/*.md 2>/dev/null | grep -v .gitkeep | wc -l
ls docs/design/*.md 2>/dev/null | wc -l

# Accessibility — last report verdict
grep -m1 'Result\|Pass\|Fail' \
  $(ls -t .d3/reports/accessibility-audit-*.md 2>/dev/null | head -1) 2>/dev/null

# Hooks
grep -c 'express-audit\|python-audit\|session-start' .claude/settings.json 2>/dev/null || echo 0
ls .github/workflows/*.yml 2>/dev/null | wc -l

# Process
grep -c 'complete' .d3/TASKS.md 2>/dev/null || echo 0
ls -t .d3/reports/retro-*.md 2>/dev/null | head -1
ls .d3/docs/lessons/*.md 2>/dev/null | grep -v .gitkeep | wc -l
```

---

## Step 2 — Score each dimension

Apply the scoring rubric. Each dimension is max **100 points**. Apply only criteria relevant to this project's stack — if a service doesn't exist, skip its criteria and scale proportionally.

---

### VISION (max 100)

| Criterion | Points | How to check |
|---|---|---|
| `.d3/vision.md` exists and is not the stub template | 30 | File exists + no `Run /vision` comment |
| Strategic bets are defined (≥ 2 entries) | 20 | `## Strategic bets` section has content |
| Anti-goals are defined (≥ 2 entries) | 25 | `## Anti-goals` section has content |
| Last `/audit vision` within 60 days | 25 | Recency of `vision-audit-*.md` |

---

### CODE (max 100)

| Criterion | Points | How to check |
|---|---|---|
| All tests pass | 25 | Test command exit code 0 |
| Line coverage ≥ 70% on all services | 25 | Coverage report output |
| ≤ 5 TODO/FIXME/HACK markers in production paths | 20 | grep count |
| Last `/audit code` within 30 days | 15 | Recency of `code-audit-*.md` |
| Mutation score ≥ 70% (if baseline exists) | 15 | `.d3/reports/mutation-*.json` or skip/scale |

---

### SECURITY (max 100)

| Criterion | Points | How to check |
|---|---|---|
| `npm audit` shows 0 high/critical vulnerabilities | 35 | audit JSON output |
| `pip-audit` shows 0 vulnerabilities | 25 | pip-audit JSON output |
| Security hooks configured (express-audit + python-audit) | 20 | grep .claude/settings.json |
| No hardcoded secrets pattern in codebase | 20 | `grep -rn "api_key\|password\|secret" --include="*.js" --include="*.py"` (exclude test/config files) |

---

### PERFORMANCE (max 100)

| Criterion | Points | How to check |
|---|---|---|
| Performance baseline exists | 25 | `.d3/reports/performance-baseline.json` |
| Lighthouse performance score ≥ 90 | 30 | Score field in baseline JSON |
| LCP ≤ 2.5s | 25 | `lcp` field in baseline |
| CLS ≤ 0.1 | 20 | `cls` field in baseline |

If no baseline exists: 0/100 with note "Run `/test react` to establish a performance baseline."

---

### DOCUMENTATION (max 100)

| Criterion | Points | How to check |
|---|---|---|
| CLAUDE.md is filled in (not template) | 25 | No `[Project Name]` placeholder |
| `docs/current/` has content | 20 | ≥ 1 non-empty .md file |
| `.d3/docs/adr/` has ADR files | 15 | ≥ 1 .md file besides .gitkeep |
| Service-level CLAUDE.md files exist | 20 | Count of api-express, api-python, client CLAUDE.md |
| CHANGELOG has ≥ 5 entries | 20 | Line count of changelog entries |

---

### UX & DESIGN (max 100)

| Criterion | Points | How to check |
|---|---|---|
| Last `/audit ux` within 60 days | 25 | Recency of `ux-audit-*.md` |
| Last `/audit design` within 60 days | 25 | Recency of `design-audit-*.md` |
| Last `/audit product` within 60 days | 20 | Recency of `product-audit-*.md` |
| Wireframes exist in `.d3/wireframes/` | 15 | ≥ 1 .md file besides .gitkeep |
| Design documentation exists (`docs/design/`) | 15 | ≥ 1 .md file |

---

### ACCESSIBILITY (max 100)

| Criterion | Points | How to check |
|---|---|---|
| `/audit accessibility` has ever been run | 40 | Any `accessibility-audit-*.md` exists |
| Most recent audit shows overall Pass | 40 | `Result` or `Pass/Fail` line in report |
| Last accessibility audit within 30 days | 20 | Recency check |

If never audited: 0/100 with note "Run `/audit accessibility` — this is the biggest gap."

---

### PROCESS (max 100)

| Criterion | Points | How to check |
|---|---|---|
| Vision is defined | 15 | `.d3/vision.md` is non-stub |
| ≥ 1 directive has been completed (CHANGELOG entries) | 20 | CHANGELOG has entries |
| CI review workflow configured | 15 | `.github/workflows/*.yml` exists |
| D3 hooks configured (≥ 3 hooks in settings.json) | 20 | grep count |
| Last retro within 90 days | 15 | Recency of `retro-*.md` |
| Lessons exist (team learning from failures) | 15 | Any `lessons/*.md` besides .gitkeep |

---

## Step 3 — Compute overall score

```
Overall = average of all 8 dimension scores (rounded to nearest integer)
```

Letter grade:
- **A** (90–100) — Production-ready, exemplary
- **B** (75–89) — Strong, minor gaps
- **C** (60–74) — Functional, notable improvement areas
- **D** (45–59) — Significant gaps, not production-ready
- **F** (< 45)  — Critical gaps, substantial work needed

---

## Step 4 — Render the report

Print to console:

```
PROJECT ASSESSMENT — YYYY-MM-DD
================================
OVERALL: NN/100  [GRADE]

DIMENSION SCORES
────────────────────────────────────────────────────
Vision         ████████████████░░░░  82/100  B
Code           ████████░░░░░░░░░░░░  43/100  D  ⚠
Security       ███████████████░░░░░  77/100  B
Performance    ░░░░░░░░░░░░░░░░░░░░   0/100  F  ⚠  (no baseline)
Documentation  █████████████░░░░░░░  68/100  C
UX & Design    ████████████░░░░░░░░  62/100  C
Accessibility  ████░░░░░░░░░░░░░░░░  22/100  F  ⚠
Process        █████████████████░░░  86/100  B
────────────────────────────────────────────────────

CRITICAL (score < 45)
  Performance:    0  — No baseline. Run /test react to establish one.
  Accessibility: 22  — Never audited. Run /audit accessibility.

WEAK (45–59)
  Code: 43 — Tests passing but coverage 52% (below 70% threshold).
             14 TODO markers in production paths.

COMPARISON vs 2026-05-15 assessment (score: 58 → 61, +3)
  Vision:         72 → 82  ↑ +10  (vision defined)
  Code:           48 → 43  ↓ -5   (coverage dropped)
  Security:       75 → 77  ↑ +2
  Performance:     0 →  0  —  unchanged
  Documentation:  60 → 68  ↑ +8

TOP 3 RECOMMENDED ACTIONS
  1. /audit accessibility   — highest leverage, 0/100 → potential +22 on overall
  2. /test react            — establish performance baseline, 0/100 → potential +10
  3. /improve code          — coverage below threshold (-5 pts since last assessment)
```

Progress bar scale: each █ = 5 points (20 chars = 100 points).
⚠ flags dimensions below 60.
Omit comparison section if no previous assessment exists.

---

## Step 5 — Save the report

Write full report to `.d3/reports/assessment-TIMESTAMP.md`:

```markdown
# Project Assessment
**Date:** YYYY-MM-DD HH:MM
**Overall:** NN/100 [GRADE]

## Scores
| Dimension | Score | Grade | Key gaps |
|---|---|---|---|
| Vision | N/100 | X | <one-line summary> |
...

## Dimension detail
### Vision — N/100
[criterion-by-criterion breakdown]
...

## Historical
| Date | Overall | Vision | Code | Security | Performance | Docs | UX | Accessibility | Process |
|---|---|---|---|---|---|---|---|---|---|
| YYYY-MM-DD | NN | NN | NN | NN | NN | NN | NN | NN | NN |
[append from previous assessments if --compare]
```

---

## Step 6 — Offer next actions

```
Assessment saved: .d3/reports/assessment-TIMESTAMP.md

Improve your score:
  /audit accessibility   — critical gap, never run
  /test react            — establish performance baseline
  /improve code          — coverage below threshold
  /vision                — define strategic direction

Track progress: run /evaluate again after each sprint to see trajectory.
```
