'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const fm = require('../src/scripts/lib/frontmatter');
const { loadNodes } = require('../src/scripts/lib/nodes');
const graph = require('../src/scripts/lib/graph');
const { buildIndex } = require('../src/scripts/d3-index');

// --- helpers ------------------------------------------------------------
function mkProject(nodesByType) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'd3test-'));
  const d3 = path.join(root, '.d3');
  for (const [type, files] of Object.entries(nodesByType)) {
    const dir = path.join(d3, type);
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), content);
    }
  }
  return d3;
}
function obj(id, extra = '') {
  return `---\nid: ${id}\ntype: objective\ntitle: ${id} title\nstatus: active\nparent_id: Vision\n${extra}---\nbody\n`;
}
function dir(id, parent, extra = '') {
  return `---\nid: ${id}\ntype: directive\ntitle: ${id}\nstatus: ready\nparent_id: ${parent}\n${extra}---\nbody\n`;
}
function codes(d3) { return graph.check(loadNodes(d3)).map((f) => f.code); }

// --- frontmatter --------------------------------------------------------
test('frontmatter parses scalars and refs list', () => {
  const { data, body } = fm.parse(
    `---\nid: DIR-1\ntype: directive\nparent_id: OBJ-1\nrefs:\n  - { rel: blocks, target: DIR-2 }\n  - { rel: gated_by, target: ADR-007 }\n---\nhello\n`);
  assert.equal(data.id, 'DIR-1');
  assert.equal(data.parent_id, 'OBJ-1');
  assert.equal(data.refs.length, 2);
  assert.deepEqual(data.refs[0], { rel: 'blocks', target: 'DIR-2' });
  assert.match(body, /hello/);
});

// --- the law ------------------------------------------------------------
test('clean tree has no integrity errors', () => {
  const d3 = mkProject({
    objectives: { 'o1.md': obj('OBJ-1'), 'o2.md': obj('OBJ-2', 'parent_id: OBJ-1\n') },
    directives: { 'd1.md': dir('DIR-1', 'OBJ-2') },
  });
  const errs = graph.check(loadNodes(d3)).filter((f) => f.level === 'error');
  assert.equal(errs.length, 0, JSON.stringify(errs));
});

test('orphan directive (no parent) violates the law', () => {
  const d3 = mkProject({ directives: { 'd.md': `---\nid: DIR-9\ntype: directive\nstatus: ready\n---\nx\n` } });
  assert.ok(codes(d3).includes('ORPHAN_DIRECTIVE'));
});

test('directive parented to a non-objective is rejected', () => {
  const d3 = mkProject({
    objectives: { 'o.md': obj('OBJ-1') },
    directives: { 'd1.md': dir('DIR-1', 'OBJ-1'), 'd2.md': dir('DIR-2', 'DIR-1') },
  });
  assert.ok(codes(d3).includes('BAD_PARENT_TYPE'));
});

test('dangling parent is caught', () => {
  const d3 = mkProject({ objectives: { 'o.md': obj('OBJ-1') }, directives: { 'd.md': dir('DIR-1', 'OBJ-404') } });
  assert.ok(codes(d3).includes('DANGLING_PARENT'));
});

// --- cycles -------------------------------------------------------------
test('parent_id cycle is detected', () => {
  const d3 = mkProject({ objectives: {
    'a.md': obj('OBJ-A', 'parent_id: OBJ-B\n'),
    'b.md': obj('OBJ-B', 'parent_id: OBJ-A\n'),
  }});
  // overwrite parent_id (obj() already wrote Vision); re-create cleanly:
  fs.writeFileSync(path.join(d3, 'objectives', 'a.md'), `---\nid: OBJ-A\ntype: objective\nstatus: active\nparent_id: OBJ-B\n---\n`);
  fs.writeFileSync(path.join(d3, 'objectives', 'b.md'), `---\nid: OBJ-B\ntype: objective\nstatus: active\nparent_id: OBJ-A\n---\n`);
  assert.ok(codes(d3).includes('PARENT_CYCLE'));
});

test('blocks cycle is detected', () => {
  const d3 = mkProject({
    objectives: { 'o.md': obj('OBJ-1') },
    directives: {
      'd1.md': dir('DIR-1', 'OBJ-1', 'refs:\n  - { rel: blocks, target: DIR-2 }\n'),
      'd2.md': dir('DIR-2', 'OBJ-1', 'refs:\n  - { rel: blocks, target: DIR-1 }\n'),
    },
  });
  assert.ok(codes(d3).includes('BLOCK_CYCLE'));
});

// --- dangling ref + ADR allowance --------------------------------------
test('dangling ref warns, ADR target allowed', () => {
  const d3 = mkProject({
    objectives: { 'o.md': obj('OBJ-1') },
    directives: { 'd.md': dir('DIR-1', 'OBJ-1', 'refs:\n  - { rel: gated_by, target: ADR-007 }\n  - { rel: blocks, target: DIR-404 }\n') },
  });
  const c = codes(d3);
  assert.ok(c.includes('DANGLING_REF'));            // DIR-404
  assert.equal(c.filter((x) => x === 'DANGLING_REF').length, 1); // ADR-007 allowed
});

// --- status rollup ------------------------------------------------------
test('objective cannot be met with open children', () => {
  const d3 = mkProject({
    objectives: { 'o.md': `---\nid: OBJ-1\ntype: objective\nstatus: met\nparent_id: Vision\n---\n` },
    directives: { 'd.md': dir('DIR-1', 'OBJ-1') }, // ready = open
  });
  assert.ok(codes(d3).includes('ROLLUP'));
});

// --- one approved sketch per thread ------------------------------------
test('two approved sketches in one thread is an error', () => {
  const s = (v) => `---\nid: SKETCH-1-ui-${v}\ntype: sketch\nstatus: APPROVED\nparent_id: OBJ-1\ndomain: ui\nslug: panel\nversion: ${v}\n---\n`;
  const d3 = mkProject({
    objectives: { 'o.md': obj('OBJ-1') },
    sketches: { 'v1.md': s(1), 'v2.md': s(2) },
  });
  assert.ok(codes(d3).includes('MULTI_APPROVED_SKETCH'));
});

// --- subtree + index build ---------------------------------------------
test('subtree traversal returns descendants in order', () => {
  const d3 = mkProject({
    objectives: { 'o1.md': obj('OBJ-1'), 'o2.md': obj('OBJ-2', 'parent_id: OBJ-1\n') },
    directives: { 'd.md': dir('DIR-1', 'OBJ-2') },
  });
  const ids = graph.subtree(loadNodes(d3), 'OBJ-1').map((x) => x.node.id);
  assert.deepEqual(ids, ['OBJ-1', 'OBJ-2', 'DIR-1']);
});

test('buildIndex writes index.json and a SQLite db with rows', () => {
  const d3 = mkProject({
    objectives: { 'o.md': obj('OBJ-1') },
    directives: { 'd.md': dir('DIR-1', 'OBJ-1') },
  });
  const r = buildIndex(d3, { quiet: true });
  assert.equal(r.errors.length, 0);
  assert.ok(fs.existsSync(path.join(d3, 'index.json')));
  const j = JSON.parse(fs.readFileSync(path.join(d3, 'index.json'), 'utf8'));
  assert.equal(j.nodes.length, 2);
  assert.ok(j.edges.some((e) => e.rel === 'child_of'));
  if (r.sqliteOk) {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(path.join(d3, 'index.db'));
    const n = db.prepare('SELECT COUNT(*) c FROM nodes').get();
    assert.equal(n.c, 2);
    db.close();
  }
});
