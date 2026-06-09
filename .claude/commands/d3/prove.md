PROVE — confirm the work satisfies the objective, not just that it is green. Adversarial review + tests + the metric.

**Usage:**
- `/prove` — verify the last build batch
- `/prove --tests` — dedicated test pass (replaces /test)

---

## Step 1 — Adversarial review
Run an independent review (`/code-review medium`) on each merged PR. Surface critical findings for owner action; record minor ones as lessons (`.d3/docs/lessons/`).

## Step 2 — Verify against the objective
For each directive, check its done-when rows. Then ask the objective's question: is the **success metric** now measurable (instrumentation live) and moving the right way? Screenshot changed UI surfaces; run the a11y pass (`.d3/principles/accessibility.md`).

## Step 3 — Record evidence
Write `.d3/evidence/evd-NNN-*.md` nodes (source: audit/test/screenshot; target_id: the directive/objective; verdict). Run `d3 index`.

## Step 4 — Verdict
If the objective's metric is met -> recommend marking it `met` (rollup check will enforce children are done). Otherwise hand to `/learn` for calibration.
