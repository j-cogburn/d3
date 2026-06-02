Dedicated test pass across services. Runs the full test suite, screenshots key surfaces, and reports failures and coverage gaps. Use after `/execute` and before `/release`.

**Usage:**
- `/test` — test all services
- `/test express` — Express only
- `/test python` — Python only
- `/test react` — React build + lint + Playwright screenshots
- `/test "checkout flow"` — browser testing scoped to a feature area

---

## Step 1 — Resolve scope

Parse `$ARGUMENTS`:
- Empty → all services
- `express`, `python`, `react` → that service only
- A feature area string → run browser tests scoped to that area

---

## Step 2 — Run service tests

For each service in scope, run its test suite and capture full output:

```bash
# Express
npm test --prefix api-express 2>&1

# Python
api-python/.venv/bin/pytest api-python/tests/ -v 2>&1

# React — build + lint
npm run build --prefix client 2>&1
npm run lint --prefix client 2>&1
```

Note pass/fail and failure details for each.

---

## Step 3 — Browser testing (React in scope)

Invoke `browser-testing-with-devtools` from `.d3/skills/browser-testing-with-devtools/SKILL.md`.
Invoke `test-driven-development` from `.d3/skills/test-driven-development/SKILL.md` for coverage analysis.

Verify services are running:
```bash
curl -sf http://localhost:5001/api/health || echo "EXPRESS DOWN"
curl -sf http://localhost:3001 || echo "CLIENT DOWN"
```

If services are up, set up Playwright and screenshot key surfaces. For each screenshot check:
- No console errors or unhandled promise rejections
- No failed network requests (4xx/5xx)
- No broken layouts or missing content
- Empty and error states render correctly

If a feature area was specified, focus screenshots on routes relevant to that area.

---

## Step 4 — Report

```
TEST RESULTS — YYYY-MM-DD
==========================
Express:  PASS / FAIL  (N tests, N failed)
Python:   PASS / FAIL  (N tests, N failed)
React:    PASS / FAIL  (build + lint)
Browser:  N surfaces checked, N issues found

Failures:
  <test name> — <error summary>
  ...

Browser issues:
  <route> — <issue description>
  ...
```

---

## Step 5 — Handle failures

If all tests pass:
```
All tests passing — ready for /release
```

If failures exist, ask (single-select):
- "Create directives to fix failures and run /execute"
- "Show me the failures — I'll fix manually"
- "Skip — accept known failures"

If "Create directives" is chosen: for each failure, create a directive tagged with `**Skills:** test-driven-development` and insert at the top of the DIRECTIVES section in `.d3/TASKS.md`.
