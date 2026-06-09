'use strict';
/** Tests for lib/telemetry — ADR-008 schema validation + JSONL emit/read. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const T = require('../src/scripts/lib/telemetry');

function tmpD3() { return fs.mkdtempSync(path.join(os.tmpdir(), 'd3tel-')); }

test('normalizeEvent rejects events with no objective_id (the link)', () => {
  const r = T.normalizeEvent({ event: 'metric.observed', metric: 'x', value: 1 });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => /objective_id/.test(e)));
});

test('metric.observed requires numeric value + metric key', () => {
  assert.equal(T.normalizeEvent({ event: 'metric.observed', objective_id: 'OBJ-1' }).ok, false);
  assert.equal(T.normalizeEvent({ event: 'metric.observed', objective_id: 'OBJ-1', metric: 'm', value: 'nope' }).ok, false);
  const ok = T.normalizeEvent({ event: 'metric.observed', objective_id: 'OBJ-1', metric: 'm', value: 0.4 });
  assert.equal(ok.ok, true);
  assert.equal(ok.event.v, T.SCHEMA_VERSION);
  assert.equal(ok.event.value, 0.4);
  assert.ok(ok.event.ts); // auto-stamped
});

test('unknown event type is rejected', () => {
  assert.equal(T.normalizeEvent({ event: 'made.up', objective_id: 'OBJ-1' }).ok, false);
});

test('emit appends valid JSONL and readEvents round-trips with filters', () => {
  const d3 = tmpD3();
  assert.equal(T.emit(d3, { event: 'metric.observed', objective_id: 'OBJ-1', metric: 'activation', value: 0.2 }).ok, true);
  T.emit(d3, { event: 'metric.observed', objective_id: 'OBJ-1', metric: 'activation', value: 0.41 });
  T.emit(d3, { event: 'directive.shipped', objective_id: 'OBJ-2' });

  const raw = fs.readFileSync(T.sinkPath(d3), 'utf8').trim().split('\n');
  assert.equal(raw.length, 3);
  raw.forEach((l) => JSON.parse(l)); // each line is valid JSON

  assert.equal(T.readEvents(d3, { objective_id: 'OBJ-1' }).length, 2);
  assert.equal(T.readEvents(d3, { objective_id: 'OBJ-2' }).length, 1);
});

test('emit refuses to write an invalid event', () => {
  const d3 = tmpD3();
  const r = T.emit(d3, { event: 'metric.observed', objective_id: 'OBJ-1' }); // no value/metric
  assert.equal(r.ok, false);
  assert.ok(!fs.existsSync(T.sinkPath(d3)), 'nothing written on invalid event');
});

test('latestMetric returns the most recent reading PROVE compares to target', () => {
  const d3 = tmpD3();
  T.emit(d3, { event: 'metric.observed', objective_id: 'OBJ-1', metric: 'activation', value: 0.2, ts: '2026-01-01T00:00:00Z' });
  T.emit(d3, { event: 'metric.observed', objective_id: 'OBJ-1', metric: 'activation', value: 0.41, ts: '2026-02-01T00:00:00Z' });
  assert.equal(T.latestMetric(d3, 'OBJ-1', 'activation').value, 0.41);
});
