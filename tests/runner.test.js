'use strict';
/**
 * Tests for the daemon core (lib/runner.js): backoff, lock lifecycle, config,
 * board computation, objective rollup, key→action mapping, and rendering.
 * All pure / filesystem-only — no TTY, claude, or gh.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const R = require('../src/scripts/lib/runner');

function dir(id, status, parent_id, refs = []) {
  return { id, type: 'directive', title: id, status, parent_id, refs, attrs: {}, file: `directives/${id}.md` };
}
function obj(id, status, parent_id = 'Vision') {
  return { id, type: 'objective', title: id, status, parent_id, refs: [], attrs: {}, file: `objectives/${id}.md` };
}
function tmpD3() { return fs.mkdtempSync(path.join(os.tmpdir(), 'd3run-')); }

// ── backoff ────────────────────────────────────────────────────────────────────
test('nextBackoff starts at startMs then doubles to a cap', () => {
  const cfg = { idleBackoff: { startMs: 2000, maxMs: 16000 } };
  assert.equal(R.nextBackoff(0, cfg), 2000);
  assert.equal(R.nextBackoff(2000, cfg), 4000);
  assert.equal(R.nextBackoff(4000, cfg), 8000);
  assert.equal(R.nextBackoff(8000, cfg), 16000);
  assert.equal(R.nextBackoff(16000, cfg), 16000); // capped
});

// ── config ───────────────────────────────────────────────────────────────────
test('loadConfig returns defaults when no file, merges when present', () => {
  const d3 = tmpD3();
  const def = R.loadConfig(d3);
  assert.equal(def.autonomy, 'inner-only');
  assert.equal(def.concurrency, 4);
  fs.writeFileSync(path.join(d3, 'run.config.json'), JSON.stringify({ concurrency: 8, idleBackoff: { maxMs: 9000 } }));
  const merged = R.loadConfig(d3);
  assert.equal(merged.concurrency, 8);
  assert.equal(merged.idleBackoff.maxMs, 9000);
  assert.equal(merged.idleBackoff.startMs, 2000); // default preserved
});

test('saveConfigKey writes the toggle for the user (no hand-editing JSON)', () => {
  const d3 = tmpD3();
  R.saveConfigKey(d3, 'autonomy', 'full');
  assert.equal(R.loadConfig(d3).autonomy, 'full');
});

// ── lock lifecycle ─────────────────────────────────────────────────────────────
test('acquireLock: take, release, reclaim-dead', () => {
  const d3 = tmpD3();
  const a = R.acquireLock(d3);
  assert.equal(a.ok, true);
  assert.equal(R.readLock(d3).pid, process.pid);
  assert.equal(R.releaseLock(d3), true);
  assert.equal(R.readLock(d3), null);

  // a foreign, dead pid is stale → reclaimed
  fs.writeFileSync(R.lockPath(d3), JSON.stringify({ pid: 999999999, started: 'x' }));
  assert.equal(R.acquireLock(d3).ok, true, 'dead pid lock is stale → reclaimed');
  assert.equal(R.readLock(d3).pid, process.pid);
});

test('acquireLock reclaims a tombstone / pid-less lock (synced-mount safe)', () => {
  const d3 = tmpD3();
  fs.mkdirSync(path.dirname(R.lockPath(d3)), { recursive: true });
  fs.writeFileSync(R.lockPath(d3), JSON.stringify({ pid: null, released: true }));
  assert.equal(R.acquireLock(d3).ok, true, 'a released tombstone must be reclaimable');
  assert.equal(R.readLock(d3).pid, process.pid);
});

test('acquireLock blocks on a live foreign pid', () => {
  const d3 = tmpD3();
  const child = require('child_process').spawn('sleep', ['30'], { stdio: 'ignore' });
  try {
    fs.mkdirSync(path.dirname(R.lockPath(d3)), { recursive: true });
    fs.writeFileSync(R.lockPath(d3), JSON.stringify({ pid: child.pid, started: 'x' }));
    const blocked = R.acquireLock(d3);
    assert.equal(blocked.ok, false, 'a live foreign pid must block');
    assert.equal(blocked.held.pid, child.pid);
  } finally {
    child.kill('SIGKILL');
  }
});

// ── objective rollup ────────────────────────────────────────────────────────────
test('objectivesAwaitingVerdict: open objective whose children are all done', () => {
  const nodes = [
    obj('OBJ-1', 'active'), dir('DIR-1', 'complete', 'OBJ-1'), dir('DIR-2', 'complete', 'OBJ-1'),
    obj('OBJ-2', 'active'), dir('DIR-3', 'ready', 'OBJ-2'), // still open child
    obj('OBJ-3', 'met'),    dir('DIR-4', 'complete', 'OBJ-3'), // already met
  ];
  const ids = R.objectivesAwaitingVerdict(nodes).map((o) => o.id);
  assert.deepEqual(ids, ['OBJ-1']);
});

test('objectivesNeedingShape: active objective with no children', () => {
  const nodes = [obj('OBJ-9', 'active'), obj('OBJ-8', 'active'), dir('DIR-1', 'ready', 'OBJ-8')];
  assert.deepEqual(R.objectivesNeedingShape(nodes).map((o) => o.id), ['OBJ-9']);
});

// ── board ──────────────────────────────────────────────────────────────────────
test('computeBoard sorts directives into the right lanes + NEEDS YOU actions', () => {
  const nodes = [
    obj('OBJ-1', 'active'),
    dir('DIR-1', 'in-progress', 'OBJ-1'),
    dir('DIR-2', 'ready', 'OBJ-1'),
    dir('DIR-3', 'ready', 'OBJ-1', [{ rel: 'blocked_by', target: 'DIR-2' }]),
    dir('DIR-4', 'needs-review', 'OBJ-1'),
    dir('DIR-5', 'ready', 'OBJ-1', [{ rel: 'gated_by', target: 'ADR-1' }]),
    obj('OBJ-2', 'active'), dir('DIR-6', 'complete', 'OBJ-2'), // → awaiting verdict
  ];
  const b = R.computeBoard(nodes, { autonomy: 'inner-only', startedAt: Date.now() });
  assert.deepEqual(b.building.map((d) => d.id), ['DIR-1']);
  assert.deepEqual(b.queue.ready.map((d) => d.id), ['DIR-2']);
  assert.deepEqual(b.queue.blocked.map((d) => d.id), ['DIR-3']);
  assert.deepEqual(b.queue.gated.map((d) => d.id), ['DIR-5']);
  assert.deepEqual(b.parked.map((d) => d.id), ['DIR-4']);
  // NEEDS YOU: parked review (DIR-4) + verdict (OBJ-2)
  const kinds = b.needsYou.map((x) => x.kind);
  assert.ok(kinds.includes('prove') && kinds.includes('learn'));
  assert.ok(b.needsYou.some((x) => x.command === '/prove DIR-4'));
  assert.ok(b.needsYou.some((x) => x.command === '/learn OBJ-2'));
});

// ── key → action ─────────────────────────────────────────────────────────────────
test('actionForKey maps a pressed number to the exact command (out-of-range → null)', () => {
  const nodes = [obj('OBJ-1', 'active'), dir('DIR-4', 'needs-review', 'OBJ-1')];
  const b = R.computeBoard(nodes, {});
  assert.equal(R.actionForKey(b, '1').command, '/prove DIR-4');
  assert.equal(R.actionForKey(b, '2'), null);
  assert.equal(R.actionForKey(b, 'x'), null);
});

// ── render ──────────────────────────────────────────────────────────────────────
test('renderBoard produces the §6 sections and numbers the actions', () => {
  const nodes = [obj('OBJ-1', 'active'), dir('DIR-1', 'ready', 'OBJ-1'), dir('DIR-4', 'needs-review', 'OBJ-1')];
  const b = R.computeBoard(nodes, { autonomy: 'inner-only', startedAt: Date.now() });
  const out = R.renderBoard(b, { interactive: true });
  for (const section of ['D3 RUNNER', 'INNER LOOP', 'NEEDS YOU', 'QUEUE', 'OUTER LOOP', 'Autonomy:']) {
    assert.ok(out.includes(section), `missing section: ${section}`);
  }
  assert.ok(out.includes('[1]'), 'numbers the first NEEDS YOU item');
  assert.ok(out.includes('[q] quit'));
});
