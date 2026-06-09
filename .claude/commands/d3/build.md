BUILD — execute ready directives in parallel and enforce the gates. The inner loop.

**Usage:**
- `/build` — run all ready directives with no open `blocked_by`
- `/build DIR-140` — run one directive
- `/build ux --quality` — scoped quality pass (replaces /improve)
- `/build --release [version]` — staged rollout: tests → canary 1%→100% (replaces /release)

---

## Step 1 — Select work
Run `d3 index`. From `.d3/index.json`, take directives with `status: ready` and no unsatisfied `blocked_by` edge. Respect `blocks` ordering. For one-way doors, refuse to run unless an ADR + sign-off exists.

## Step 2 — Build live briefs
For each directive, construct the brief from CURRENT service `CLAUDE.md` files + the injected `.d3/principles/` for its domains + the approved sketch (`sketch_id`). Never hardcode patterns.

## Step 3 — Execute
Run in isolated worktrees (delegate to `.d3/scripts/orchestrate.js`, or `d3 run --once` for the node-native runner, at scale). Hooks enforce lint/test on every edit (exit 2 blocks). Update each directive node `status` as it progresses; sync docs as part of done.

## Step 4 — Index
Run `d3 index` after the batch (rebuilds the index, re-checks the law/DAG/rollups). Hand off to `/prove`.

---

## Release path — `/build --release`

Progressive delivery, backed by `src/scripts/lib/rollout.js` (the deterministic stage plan) and `src/scripts/lib/telemetry.js` (the gate signal). Replaces `/release`.

1. **Plan.** `rollout.plan({ objective_id, metric })` yields ordered stages: ship behind a feature flag at 0% (tests + PROVE must be green), then canary **1% → 10% → 50% → 100%**, each with a bake window.
2. **Gate each stage.** When the objective has a success `metric`, advancing is gated on telemetry: read the baseline `metric.observed` and the current reading, and call `rollout.evaluateMetricGate(baseline, current, maxRegression)`. A regression beyond tolerance **halts and rolls the flag back** to the last passing percent. With no metric, the gate is a manual error-rate/latency confirmation.
3. **Emit.** At each transition, emit a `rollout.stage` event (`telemetry.emit`) with `props.percent` so LEARN can see the rollout in the outer loop.
4. **Finish.** At 100%, remove the flag in a follow-up directive; record the release in `.d3/CHANGELOG.md`.

This makes "be wrong cheaply" literal at ship time: the smallest blast radius first, reality (telemetry) gating every widening step.
