Dedicated test pass across services. Runs the full test suite with coverage reporting, security audit, Lighthouse performance check, and Playwright screenshots. Use after `/execute` and before `/release`.

**Usage:**
- `/test` — test all services
- `/test express` — Express only
- `/test python` — Python only
- `/test react` — React build + lint + Playwright + Lighthouse
- `/test "checkout flow"` — browser testing scoped to a feature area

---

## Step 1 — Resolve scope

Parse `$ARGUMENTS`:
- Empty → all services
- `express`, `python`, `react` → that service only
- A feature area string → run browser tests scoped to that area

---

## Step 2 — Run service tests with coverage

For each service in scope, run its test suite with coverage and capture full output:

```bash
# Express — tests + coverage
npm test --prefix api-express -- --coverage 2>&1

# Python — tests + coverage
api-python/.venv/bin/pytest api-python/tests/ -v \
  --cov=. --cov-report=term-missing --cov-report=json 2>&1

# React — build + lint
npm run build --prefix client 2>&1
npm run lint --prefix client 2>&1
```

**Coverage thresholds:** Read `CLAUDE.md` for a `COVERAGE_THRESHOLD` setting. If not set, default to 70% lines. Report current coverage and whether it passes the threshold:
```
Express coverage:  85% lines  ✓ (threshold: 70%)
Python coverage:   62% lines  ✗ (threshold: 70%) — 8% below threshold
```

If coverage drops below threshold, treat as a failure requiring directives.

---

## Step 3 — Security audit

```bash
# Express — only if package.json changed since last audit
npm audit --audit-level=high --prefix api-express 2>&1 || echo "SECURITY ISSUES FOUND"

# Python — only if requirements changed since last audit
if [ -f "api-python/.venv/bin/pip-audit" ]; then
  api-python/.venv/bin/pip-audit -r api-python/requirements.txt 2>&1
fi
```

Report: `Security: ✓ clean` or `Security: ✗ N high/critical vulnerabilities found`.

---

## Step 4 — Browser testing (React in scope)

Invoke `browser-testing-with-devtools` from `.d3/skills/browser-testing-with-devtools/SKILL.md`.

Verify services are running:
```bash
curl -sf http://localhost:5001/api/health || echo "EXPRESS DOWN"
curl -sf http://localhost:3001 || echo "CLIENT DOWN"
```

If services are up, set up Playwright. Screenshot key surfaces at **three viewports**:
- Desktop: 1440 × 900
- Tablet: 768 × 1024
- Mobile: 375 × 812

For each screenshot check:
- No console errors or unhandled promise rejections
- No failed network requests (4xx/5xx)
- No broken layouts or missing content at any viewport
- Empty and error states render correctly

**Visual baseline:**
If `.d3/screenshots/baseline/` exists, compare current screenshots. Flag unexpected layout changes. If no baseline exists, offer:
- "Save current screenshots as baseline in `.d3/screenshots/baseline/`"
- "Skip baseline comparison"

---

## Step 5 — Performance (React in scope, services running)

Run Lighthouse on the three most important routes:

```bash
# Install if needed
[ -d /tmp/lhci/node_modules ] || \
  (mkdir -p /tmp/lhci && cd /tmp/lhci && npm init -y && npm install lighthouse 2>/dev/null)

# Run on key routes (read from CLAUDE.md or use defaults)
npx --prefix /tmp/lhci lighthouse http://localhost:3001 \
  --chrome-flags="--headless --no-sandbox" \
  --output=json --output-path=/tmp/lh-home.json 2>/dev/null
```

Extract Core Web Vitals from the JSON output:
- **LCP** (Largest Contentful Paint) — target ≤ 2.5s
- **CLS** (Cumulative Layout Shift) — target ≤ 0.1
- **INP/FID** (Interaction to Next Paint) — target ≤ 200ms
- **Performance score** — target ≥ 90

**Baseline comparison:** Read `.d3/reports/performance-baseline.json` if it exists. Compare current scores. Flag any metric that degraded by more than 10 points or crossed a threshold:
```
Performance: LCP 1.8s ✓  CLS 0.04 ✓  Score 94 ✓  (no regression)
Performance: LCP 3.2s ✗  (was 1.9s — regression, +68%)
```

If no baseline exists, save current scores as baseline and report them.

---

## Step 6 — Report

```
TEST RESULTS — YYYY-MM-DD
==========================
Express:     PASS / FAIL  (N tests, N failed, N% coverage)
Python:      PASS / FAIL  (N tests, N failed, N% coverage)
React:       PASS / FAIL  (build + lint)
Security:    ✓ clean / ✗ N vulnerabilities
Browser:     N surfaces checked, N issues found
Performance: LCP Ns · CLS N · Score N  [✓ no regression / ✗ N metrics regressed]

Failures:
  <test name> — <error summary>
Coverage gaps:
  <service> — N% (below threshold of N%)
Security issues:
  <package> — <vulnerability summary>
Performance regressions:
  <metric> — was N, now N (+N%)
```

---

## Step 7 — Handle failures

If everything passes:
```
All tests passing — ready for /release
```

If any failures, ask (single-select):
- "Create directives to fix all failures"
- "Create directives for critical failures only (skip coverage gaps)"
- "Show me the details — I'll fix manually"
- "Skip — accept known failures"

If "Create directives": for each failure category, create appropriately tagged directives:
- Test failures → `**Skills:** test-driven-development`
- Coverage gaps → `**Skills:** test-driven-development`
- Security issues → `**Skills:** security-and-hardening`
- Performance regressions → `**Skills:** performance-optimization`

---

## Step 8 — Mutation testing (opt-in)

Mutation testing verifies that your tests actually catch bugs — not just that they pass. Coverage measures lines executed; mutation score measures bugs detected.

Ask before running (it is slow — 10–30 minutes for a typical codebase):
- "Run mutation testing? (~15 min — confirms test quality, not just coverage)"
- "Skip mutation testing"

If opted in:

```bash
# Express — Stryker
npx --prefix /tmp/stryker-runner @stryker-mutator/stryker-cli run \
  --configFile api-express/stryker.config.js 2>&1 \
  || npx stryker run --rootDir api-express 2>&1

# Python — mutmut
cd api-python && .venv/bin/mutmut run --paths-to-mutate src/ 2>&1
cd api-python && .venv/bin/mutmut results 2>&1
```

Interpret mutation score:
- ≥ 85% — excellent: tests catch the vast majority of injected bugs
- 70–84% — good: acceptable for most projects
- 55–69% — low: flag specific modules for improved test coverage
- < 55% — critical: tests pass but catch little; create directives to fix

Report:
```
Mutation testing:
  Express:  N% mutation score (N killed / N survived / N timeout)
  Python:   N% mutation score
```

If < 70%, create a directive tagged `**Skills:** test-driven-development` identifying the specific modules with low mutation scores.
