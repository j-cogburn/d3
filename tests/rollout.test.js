'use strict';
/** Tests for lib/rollout — the staged-rollout planner + metric gate. */
const { test } = require('node:test');
const assert = require('node:assert');
const R = require('../src/scripts/lib/rollout');

test('plan always starts behind a flag at 0% and ends at 100%', () => {
  const p = R.plan({ objective_id: 'OBJ-6' });
  assert.equal(p.stages[0].percent, 0);
  assert.equal(p.stages[0].gate.type, 'tests');
  assert.equal(p.stages[p.stages.length - 1].percent, 100);
  assert.deepEqual(p.stages.slice(1).map((s) => s.percent), [1, 10, 50, 100]);
});

test('custom percents are sorted and 100 is appended if missing', () => {
  const p = R.plan({ percents: [25, 5] });
  assert.deepEqual(p.stages.slice(1).map((s) => s.percent), [5, 25, 100]);
});

test('flag name derives from objective id when not given', () => {
  assert.equal(R.plan({ objective_id: 'OBJ-035' }).flag, 'rollout_obj_035');
  assert.equal(R.plan({ flag: 'my_flag' }).flag, 'my_flag');
});

test('metric gate is used when a metric is supplied, else manual', () => {
  assert.equal(R.plan({ metric: 'activation', objective_id: 'OBJ-1' }).stages[1].gate.type, 'metric');
  assert.equal(R.plan({}).stages[1].gate.type, 'manual');
});

test('evaluateMetricGate passes within tolerance, halts on regression', () => {
  assert.equal(R.evaluateMetricGate(0.40, 0.41, 0).pass, true);   // improved
  assert.equal(R.evaluateMetricGate(0.40, 0.40, 0).pass, true);   // flat
  assert.equal(R.evaluateMetricGate(0.40, 0.38, 0.10).pass, true); // 5% drop within 10%
  assert.equal(R.evaluateMetricGate(0.40, 0.30, 0.10).pass, false); // 25% drop > 10%
  assert.equal(R.evaluateMetricGate(null, 0.4).pass, false);       // missing baseline
});

test('renderPlan lists every stage with its gate', () => {
  const out = R.renderPlan(R.plan({ objective_id: 'OBJ-6', metric: 'activation' }));
  assert.ok(out.includes('Stage 0 (0%)'));
  assert.ok(out.includes('Stage 4 (100%)'));
  assert.ok(out.includes('gate:'));
});
