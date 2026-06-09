'use strict';
/**
 * Staged rollout planner for `/build --release` (DIR-041, OBJ-006).
 * Implements progressive delivery (D3 v2 §6 Delivery & ops: flags, canary 1%→100%,
 * error-budget gates). Pure planning — given an objective + appetite + config, it
 * produces the ordered stages, each with a feature-flag name and the telemetry gate
 * that must hold before advancing. Execution (flipping flags, checking events) is
 * the caller's job; this is the deterministic, testable plan it follows.
 *
 * It is deliberately blocked_by DIR-040: each stage's gate reads telemetry events
 * (lib/telemetry) — you can't gate a rollout on a metric you don't emit.
 */

const DEFAULT_STAGES = [1, 10, 50, 100]; // canary percentages

// Build the rollout plan. opts: { percents?, flag?, objective_id?, metric?,
// maxRegression? (allowed relative drop, default 0), bakeMinutes? }
function plan(opts = {}) {
  const percents = (opts.percents && opts.percents.length ? opts.percents : DEFAULT_STAGES)
    .filter((p) => p > 0 && p <= 100)
    .sort((a, b) => a - b);
  if (percents[percents.length - 1] !== 100) percents.push(100); // always finish at 100
  const flag = opts.flag || (opts.objective_id ? `rollout_${opts.objective_id.toLowerCase().replace(/[^a-z0-9]+/g, '_')}` : 'rollout_feature');
  const bake = opts.bakeMinutes != null ? opts.bakeMinutes : 30;

  const stages = [];
  // stage 0 is always: ship behind a flag at 0% + tests must be green
  stages.push({
    n: 0, percent: 0, flag,
    action: `merge behind feature flag '${flag}' (off)`,
    gate: { type: 'tests', criterion: 'all test gates green; PROVE adversarial review clean' },
  });
  percents.forEach((percent, i) => {
    stages.push({
      n: i + 1, percent, flag,
      action: `set '${flag}' to ${percent}% of traffic`,
      bakeMinutes: percent < 100 ? bake : 0,
      gate: gateFor(opts, percent),
    });
  });
  return { flag, objective_id: opts.objective_id || null, metric: opts.metric || null, stages };
}

function gateFor(opts, percent) {
  if (!opts.metric) {
    return { type: 'manual', criterion: `no error-rate/latency regression after bake; operator confirms before ${percent}%→next` };
  }
  return {
    type: 'metric',
    metric: opts.metric,
    objective_id: opts.objective_id || null,
    criterion: `telemetry '${opts.metric}' for ${opts.objective_id || 'objective'} not regressed beyond ${(opts.maxRegression || 0) * 100}% vs baseline; emit rollout.stage at ${percent}%`,
  };
}

// Evaluate a metric gate against telemetry readings (baseline vs current).
// Returns { pass, reason }. Used by the release executor between stages.
function evaluateMetricGate(baselineValue, currentValue, maxRegression = 0) {
  if (baselineValue == null || currentValue == null) return { pass: false, reason: 'missing baseline or current metric reading' };
  if (baselineValue === 0) return { pass: currentValue >= 0, reason: 'baseline is zero — any non-negative reading passes' };
  const drop = (baselineValue - currentValue) / Math.abs(baselineValue);
  return drop <= maxRegression
    ? { pass: true, reason: `within tolerance (drop ${(drop * 100).toFixed(1)}% ≤ ${(maxRegression * 100).toFixed(1)}%)` }
    : { pass: false, reason: `regressed ${(drop * 100).toFixed(1)}% > allowed ${(maxRegression * 100).toFixed(1)}% — HALT & roll back` };
}

function renderPlan(p) {
  const L = [`# Release plan — flag \`${p.flag}\``];
  if (p.objective_id) L.push(`**Objective:** ${p.objective_id}${p.metric ? ` · gated on metric \`${p.metric}\`` : ''}`);
  L.push('');
  for (const s of p.stages) {
    const bake = s.bakeMinutes ? ` · bake ${s.bakeMinutes}m` : '';
    L.push(`- **Stage ${s.n} (${s.percent}%)** — ${s.action}${bake}`);
    L.push(`    gate: ${s.gate.criterion}`);
  }
  L.push('');
  L.push('_Any gate failure halts the rollout and rolls the flag back to the last passing percent._');
  return L.join('\n');
}

module.exports = { DEFAULT_STAGES, plan, gateFor, evaluateMetricGate, renderPlan };
