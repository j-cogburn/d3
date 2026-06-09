'use strict';
/**
 * Tests for the d3 run selection logic — the part unique to the v2 loop runner.
 * Pure graph queries; no agents, git, or claude involved.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { selectBuildable, branchFor, parseArgs } = require('../src/scripts/d3-run');

// minimal node factory matching the shape loadNodes() produces
function dir(id, status, parent_id, refs = []) {
  return { id, type: 'directive', title: id, status, parent_id, refs, attrs: {}, file: `directives/${id}.md` };
}
function obj(id, status = 'active') {
  return { id, type: 'objective', title: id, status, parent_id: 'Vision', refs: [], attrs: {}, file: `objectives/${id}.md` };
}

test('ready directive with no blockers is buildable', () => {
  const nodes = [obj('OBJ-1'), dir('DIR-1', 'ready', 'OBJ-1')];
  const { buildable, blocked, gated } = selectBuildable(nodes);
  assert.deepEqual(buildable.map((d) => d.id), ['DIR-1']);
  assert.equal(blocked.length, 0);
  assert.equal(gated.length, 0);
});

test('non-ready directives are excluded', () => {
  const nodes = [obj('OBJ-1'), dir('DIR-1', 'in-progress', 'OBJ-1'), dir('DIR-2', 'complete', 'OBJ-1')];
  const { buildable } = selectBuildable(nodes);
  assert.equal(buildable.length, 0);
});

test('blocked_by an OPEN directive holds it back', () => {
  const nodes = [obj('OBJ-1'),
    dir('DIR-1', 'ready', 'OBJ-1'),
    dir('DIR-2', 'ready', 'OBJ-1', [{ rel: 'blocked_by', target: 'DIR-1' }])];
  const { buildable, blocked } = selectBuildable(nodes);
  assert.deepEqual(buildable.map((d) => d.id), ['DIR-1']);
  assert.deepEqual(blocked.map((d) => d.id), ['DIR-2']);
});

test('blocked_by a COMPLETE directive is released', () => {
  const nodes = [obj('OBJ-1'),
    dir('DIR-1', 'complete', 'OBJ-1'),
    dir('DIR-2', 'ready', 'OBJ-1', [{ rel: 'blocked_by', target: 'DIR-1' }])];
  const { buildable } = selectBuildable(nodes);
  assert.deepEqual(buildable.map((d) => d.id), ['DIR-2']);
});

test('inverse `blocks` edge also holds the blocked node back', () => {
  // DIR-1 blocks DIR-2  ⇒  DIR-2 is blocked while DIR-1 is open
  const nodes = [obj('OBJ-1'),
    dir('DIR-1', 'ready', 'OBJ-1', [{ rel: 'blocks', target: 'DIR-2' }]),
    dir('DIR-2', 'ready', 'OBJ-1')];
  const { buildable, blocked } = selectBuildable(nodes);
  assert.deepEqual(buildable.map((d) => d.id), ['DIR-1']);
  assert.deepEqual(blocked.map((d) => d.id), ['DIR-2']);
});

test('gated_by (one-way door) is never auto-built — surfaced for sign-off', () => {
  const nodes = [obj('OBJ-1'),
    dir('DIR-1', 'ready', 'OBJ-1', [{ rel: 'gated_by', target: 'ADR-007' }])];
  const { buildable, gated } = selectBuildable(nodes);
  assert.equal(buildable.length, 0);
  assert.deepEqual(gated.map((d) => d.id), ['DIR-1']);
});

test('target filter scopes to one directive (DIR- or DIRECTIVE- form)', () => {
  const nodes = [obj('OBJ-1'), dir('DIR-1', 'ready', 'OBJ-1'), dir('DIR-2', 'ready', 'OBJ-1')];
  assert.deepEqual(selectBuildable(nodes, 'DIR-2').buildable.map((d) => d.id), ['DIR-2']);
  assert.deepEqual(selectBuildable(nodes, 'DIRECTIVE-1').buildable.map((d) => d.id), ['DIR-1']);
});

test('unknown blocker (dangling) is treated as still-blocking (safe default)', () => {
  const nodes = [obj('OBJ-1'),
    dir('DIR-1', 'ready', 'OBJ-1', [{ rel: 'blocked_by', target: 'DIR-999' }])];
  const { buildable, blocked } = selectBuildable(nodes);
  assert.equal(buildable.length, 0);
  assert.deepEqual(blocked.map((d) => d.id), ['DIR-1']);
});

test('branchFor builds a clean slugged branch', () => {
  assert.equal(branchFor({ id: 'DIR-30', title: 'git-forensics.js (DORA, hotspots)' }),
    'feature/dir-30-git-forensics-js-dora-hotspots');
});

test('parseArgs reads project dir, target, and flags', () => {
  const o = parseArgs(['/proj', '--once', '--dry-run', 'DIR-5']);
  assert.equal(o.projectDir, '/proj');
  assert.equal(o.once, true);
  assert.equal(o.dryRun, true);
  assert.equal(o.target, 'DIR-5');
});
