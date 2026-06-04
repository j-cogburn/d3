Comprehensive project assessment across 10 dimensions — 8 technical/product + Product Completeness + Business. Produces a unified scored report with letter grades, trajectory tracking, and prioritised improvement actions.

**Usage:**
- `/evaluate` — full assessment, all 10 dimensions
- `/evaluate code` — score a single dimension
- `/evaluate --compare` — compare against the previous assessment (show trajectory)

Different from `/audit`: `/audit` finds specific problems. `/evaluate` produces a unified quality score across every domain — technical, product, and business — with letter grades on a consistent 0–100 scale.

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

# Audit recency and findings severity
for dim in code-audit ux-audit design-audit docs-audit product-audit \
           accessibility-audit vision-audit; do
  f=$(ls -t .d3/reports/${dim}-*.md 2>/dev/null | head -1)
  if [ -n "$f" ]; then
    # Recency
    echo "$dim: $f"
    # Count Critical and High severity markers in the report
    CRIT=$(grep -c -i 'Critical\b' "$f" 2>/dev/null || echo 0)
    HIGH=$(grep -c -i '\bHigh\b' "$f" 2>/dev/null || echo 0)
    echo "  critical=$CRIT high=$HIGH"
  else
    echo "$dim: never"
  fi
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

# Hooks and CI
grep -c 'express-audit\|python-audit\|session-start' .claude/settings.json 2>/dev/null || echo 0
ls .github/workflows/*.yml 2>/dev/null | wc -l

# Process
grep -c 'complete' .d3/TASKS.md 2>/dev/null || echo 0
ls -t .d3/reports/retro-*.md 2>/dev/null | head -1
ls .d3/docs/lessons/*.md 2>/dev/null | grep -v .gitkeep | wc -l

# Product Completeness — from most recent gap report
GAP_REPORT=$(ls -t .d3/reports/gap-*.md 2>/dev/null | head -1)
[ -n "$GAP_REPORT" ] && grep 'PRODUCT COMPLETENESS\|Core gaps\|Experience gaps' \
  "$GAP_REPORT" | head -5

# Business — from most recent venture report
VENTURE_REPORT=$(ls -t .d3/reports/venture-*.md 2>/dev/null | head -1)
[ -n "$VENTURE_REPORT" ] && grep 'Market score\|PRIMARY VECTOR\|Revenue projection\|12 months' \
  "$VENTURE_REPORT" | head -5
```

---

## Step 2 — Score each dimension

Each dimension is max **100 points**. Scale proportionally if a service doesn't exist.

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
| All tests pass | 20 | Test command exit code 0 |
| Line coverage ≥ 70% on all services | 20 | Coverage report output |
| ≤ 5 TODO/FIXME/HACK markers in production paths | 15 | grep count |
| Last `/audit code` within 30 days | 10 | Recency of `code-audit-*.md` |
| 0 Critical findings in most recent code audit | 20 | Critical count from report |
| 0 High findings in most recent code audit | 10 | High count from report (deduct 2 per finding, min 0) |
| Mutation score ≥ 70% (if baseline exists) | 5 | `.d3/reports/mutation-*.json` or skip/scale |

*If no code audit has been run: omit the findings criteria and scale the 30 available points proportionally across the remaining criteria.*

---

### SECURITY (max 100)

| Criterion | Points | How to check |
|---|---|---|
| `npm audit` shows 0 high/critical vulnerabilities | 35 | audit JSON output |
| `pip-audit` shows 0 vulnerabilities | 25 | pip-audit JSON output |
| Security hooks configured (express-audit + python-audit) | 20 | grep .claude/settings.json |
| No hardcoded secrets pattern in codebase | 20 | `grep -rn "api_key\|password\|secret"` (exclude test/config) |

---

### PERFORMANCE (max 100)

| Criterion | Points | How to check |
|---|---|---|
| Performance baseline exists | 25 | `.d3/reports/performance-baseline.json` |
| Lighthouse performance score ≥ 90 | 30 | Score field in baseline JSON |
| LCP ≤ 2.5s | 25 | `lcp` field in baseline |
| CLS ≤ 0.1 | 20 | `cls` field in baseline |

If no baseline exists: 0/100 — "Run `/test react` to establish a performance baseline."

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
| Last `/audit ux` within 60 days | 10 | Recency of `ux-audit-*.md` |
| 0 Critical findings in most recent UX audit | 20 | Critical count from ux-audit report |
| ≤ 3 High findings in most recent UX audit | 10 | High count (deduct 2 per finding above 3, min 0) |
| Last `/audit design` within 60 days | 10 | Recency of `design-audit-*.md` |
| 0 Critical findings in most recent design audit | 15 | Critical count from design-audit report |
| Last `/audit product` within 60 days | 10 | Recency of `product-audit-*.md` |
| Wireframes exist in `.d3/wireframes/` | 10 | ≥ 1 .md file besides .gitkeep |
| Design documentation exists (`docs/design/`) | 15 | ≥ 1 .md file |

*If audits have never been run: omit findings criteria and scale proportionally. A 0-finding report earns full finding points.*

---

### ACCESSIBILITY (max 100)

| Criterion | Points | How to check |
|---|---|---|
| `/audit accessibility` has ever been run | 40 | Any `accessibility-audit-*.md` exists |
| Most recent audit shows overall Pass | 40 | `Result` or `Pass/Fail` line in report |
| Last accessibility audit within 30 days | 20 | Recency check |

If never audited: 0/100 — "Run `/audit accessibility` — this is the biggest gap."

---

### PRODUCT COMPLETENESS (max 100)

Reads from the most recent `.d3/reports/gap-*.md`. If the report contains a `PRODUCT COMPLETENESS: N/100` line, use that directly. Otherwise, estimate from gap counts.

| Criterion | Points | How to check |
|---|---|---|
| `/gap` has ever been run | 10 | Any `gap-*.md` exists |
| Product Completeness score from gap report | 75 | Read `PRODUCT COMPLETENESS: N/100` → scale to 75 pts |
| Completeness score improving vs. previous gap report | 15 | Compare two most recent gap reports |

**Estimating if no explicit score:** deduct from 100:
- Each Core gap (Missing): −10 pts (cap at −40)
- Each Core gap (Partial/Weak): −5 pts (cap at −20)
- Each Experience gap: −3 pts (cap at −15)
- Each Defensive gap: −2 pts (cap at −10)
- Gaps already tracked in TASKS.md: half deduction

If no gap report exists: 0/100 — "Run `/gap` — product completeness not yet assessed."

---

### PROCESS (max 100)

| Criterion | Points | How to check |
|---|---|---|
| Vision is defined | 15 | `.d3/vision.md` is non-stub |
| ≥ 1 directive has been completed | 20 | CHANGELOG has entries |
| CI review workflow configured | 15 | `.github/workflows/*.yml` exists |
| D3 hooks configured (≥ 3 hooks in settings.json) | 20 | grep count |
| Last retro within 90 days | 15 | Recency of `retro-*.md` |
| Lessons exist (learning from failures) | 15 | Any `lessons/*.md` besides .gitkeep |

---

### BUSINESS (max 100)

Reads from the most recent `.d3/reports/venture-*.md`.

| Criterion | Points | How to check |
|---|---|---|
| `/venture` has ever been run | 10 | Any `venture-*.md` exists |
| Market score × 7 (converts 0–10 → 0–70 pts) | 70 | Read `**Market score:** N.N/10` from report |
| Primary monetization vector identified | 10 | `PRIMARY VECTOR:` line present in report |
| Revenue projections with explicit assumptions | 10 | Revenue projection table present in report |

If no venture report exists: 0/100 — "Run `/venture` — business quality not yet assessed."

---

## Step 3 — Compute overall score

```
Overall = average of all 10 dimension scores (rounded to nearest integer)
```

Letter grade:
- **A** (90–100) — Exemplary across all domains
- **B** (75–89) — Strong, minor gaps
- **C** (60–74) — Functional, notable improvement areas
- **D** (45–59) — Significant gaps
- **F** (< 45) — Critical gaps, substantial work needed

---

## Step 4 — Render the report

```
PROJECT ASSESSMENT — YYYY-MM-DD
================================
OVERALL: NN/100  [GRADE]

TECHNICAL & PRODUCT                        PRODUCT & BUSINESS
──────────────────────────────────────     ─────────────────────────────────────
Vision              [bar]  NN/100  X        Product Completeness  [bar]  NN/100  X
Code                [bar]  NN/100  X  ⚠?    Business              [bar]  NN/100  X  ⚠?
Security            [bar]  NN/100  X
Performance         [bar]  NN/100  X  ⚠?
Documentation       [bar]  NN/100  X
UX & Design         [bar]  NN/100  X  ⚠?
Accessibility       [bar]  NN/100  X  ⚠?
Process             [bar]  NN/100  X
──────────────────────────────────────────────────────────────────────────────

CRITICAL (score < 45)
  [dimension]: N — [specific reason and fix]

WEAK (45–59)
  [dimension]: N — [specific reason]

[COMPARISON vs previous — if --compare flag]
  [dimension]: N → N  ↑/↓ ±N  ([what changed])

TOP 3 RECOMMENDED ACTIONS
  1. /[command]  — [why: gap + potential score impact]
  2. /[command]  — ...
  3. /[command]  — ...
```

Progress bar: each █ = 5 points (20 chars = 100 points).
⚠ flags dimensions below 60.
Two-column layout separates technical/product from product/business visually.

---

## Step 5 — Save the report

Write to `.d3/reports/assessment-TIMESTAMP.md`:

```markdown
# Project Assessment
**Date:** YYYY-MM-DD HH:MM
**Overall:** NN/100 [GRADE]

## Scores
| Dimension | Score | Grade | Key finding |
|---|---|---|---|
| Vision | N/100 | X | <one-line> |
| Code | N/100 | X | <one-line> |
| Security | N/100 | X | |
| Performance | N/100 | X | |
| Documentation | N/100 | X | |
| UX & Design | N/100 | X | |
| Accessibility | N/100 | X | |
| Product Completeness | N/100 | X | |
| Process | N/100 | X | |
| Business | N/100 | X | |

## Dimension detail
[criterion-by-criterion breakdown for each]

## Historical
| Date | Overall | Vision | Code | Security | Perf | Docs | UX | A11y | Completeness | Process | Business |
|---|---|---|---|---|---|---|---|---|---|---|---|
| YYYY-MM-DD | NN | NN | NN | NN | NN | NN | NN | NN | NN | NN | NN |
```

---

## Step 6 — Offer next actions

```
Assessment saved: .d3/reports/assessment-TIMESTAMP.md
10 dimensions scored. Overall: NN/100 [GRADE]

Top improvements:
  /[command]  — [reason + score impact]
  /[command]  — ...

Run /evaluate --compare after next sprint to track trajectory.
```

**Track integration:** If `.d3/track.md` exists and `--compare` mode shows dimension changes:
- Any dimension that dropped > 10 points since last assessment: flag as drift signal
  ```
  ⚠ Quality drift: [Dimension] dropped from N → N (-N pts)
    This is off-course. Consider:
    /track correct — if this was unintentional drift
    /track sprint plan — to add a quality recovery sprint
  ```
- If Code or Security dropped: always surface regardless of threshold (quality regressions are never acceptable drift)
- Print alongside the standard recommendations so the developer can act immediately
