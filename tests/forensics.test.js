'use strict';
/** Tests for lib/git-forensics — pure metrics over synthetic commit lists. */
const { test } = require('node:test');
const assert = require('node:assert');
const F = require('../src/scripts/lib/git-forensics');

const C = (date, subject, files) => ({ hash: date + subject, author: 'x', date, subject, files });

test('isFix / isRevert detect fix-like subjects', () => {
  assert.ok(F.isFix('Fix login crash'));
  assert.ok(F.isFix('hotfix: null deref'));
  assert.ok(F.isFix('Revert "bad change"'));
  assert.ok(!F.isFix('Add new dashboard'));
  assert.ok(F.isRevert('Revert "x"'));
  assert.ok(!F.isRevert('Fix typo'));
});

test('changeFailureRate counts fix commits and bands elite', () => {
  const commits = [C('2026-01-01', 'feat a', ['a']), C('2026-01-02', 'fix b', ['b']),
    C('2026-01-03', 'feat c', ['c']), C('2026-01-04', 'feat d', ['d'])];
  const cfr = F.changeFailureRate(commits);
  assert.equal(cfr.fixes, 1);
  assert.equal(cfr.total, 4);
  assert.equal(cfr.rate, 0.25);
  assert.equal(F.changeFailureRate([C('2026-01-01', 'feat', ['a'])]).band, 'elite (0–15%)');
});

test('deploymentFrequency computes commits/week over the span', () => {
  const commits = [C('2026-01-01', 'a', ['x']), C('2026-01-08', 'b', ['x'])]; // 7 days, 2 commits
  const df = F.deploymentFrequency(commits);
  assert.equal(df.spanDays, 7);
  assert.equal(df.perWeek, 2);
});

test('hotspots rank files by commits touching them', () => {
  const commits = [C('2026-01-01', 'a', ['hot.js', 'cold.js']), C('2026-01-02', 'b', ['hot.js']),
    C('2026-01-03', 'c', ['hot.js'])];
  const h = F.hotspots(commits, 5);
  assert.deepEqual(h[0], { file: 'hot.js', commitsTouching: 3 });
  assert.equal(h[1].file, 'cold.js');
});

test('bugFixHotspots only count files in fix commits', () => {
  const commits = [C('2026-01-01', 'feat', ['a.js']), C('2026-01-02', 'fix crash', ['a.js', 'b.js']),
    C('2026-01-03', 'fix again', ['a.js'])];
  const bh = F.bugFixHotspots(commits, 5);
  assert.deepEqual(bh[0], { file: 'a.js', fixes: 2 });
});

test('coupling finds files changed together with support + confidence', () => {
  const commits = [C('2026-01-01', 'a', ['x.js', 'y.js']), C('2026-01-02', 'b', ['x.js', 'y.js']),
    C('2026-01-03', 'c', ['x.js'])];
  const cp = F.coupling(commits, { minSupport: 2 });
  assert.equal(cp.length, 1);
  assert.equal(cp[0].support, 2);
  // x appears 3×, y appears 2×, together 2× ⇒ confidence = min(2/3, 2/2) = 0.67
  assert.equal(cp[0].confidence, 0.67);
});

test('analyze + renderReport produce a full report string', () => {
  const commits = [C('2026-01-01', 'feat', ['a.js']), C('2026-01-05', 'fix bug', ['a.js', 'b.js'])];
  const a = F.analyze(commits);
  assert.equal(a.range.commits, 2);
  const r = F.renderReport(a, { generated: 'T', window: 'full history' });
  for (const s of ['Git forensics report', 'DORA (proxies)', 'Churn hotspots', 'Co-change coupling']) {
    assert.ok(r.includes(s), `missing: ${s}`);
  }
});
