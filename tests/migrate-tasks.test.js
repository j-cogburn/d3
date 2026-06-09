'use strict';
/** Tests for lib/migrate-tasks — TASKS.md → directive nodes + OBJ-000 quarantine. */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const M = require('../src/scripts/lib/migrate-tasks');
const { parse } = require('../src/scripts/lib/frontmatter');

const SAMPLE = `# Tasks

## DIRECTIVES

### DIRECTIVE-055: Add SSO with SAML
**Status:** ready
**Objective:** OBJ-042

Build SAML SSO.
**Done when:**
- [ ] works

---

### TASK-001: Multi-repo support
**Status:** in-progress (branch: feature/x)

D3 assumes one repo.

## PHASE 2

### TASK-009: Old shipped thing
**Status:** complete (PR #12)

Already done.
`;

function tmpD3WithTasks(content) {
  const d3 = fs.mkdtempSync(path.join(os.tmpdir(), 'd3mig-'));
  fs.writeFileSync(path.join(d3, 'TASKS.md'), content);
  return d3;
}

test('parseTasks extracts blocks, status, objective; ignores ## section breaks', () => {
  const t = M.parseTasks(SAMPLE);
  assert.deepEqual(t.map((x) => x.id), ['DIRECTIVE-055', 'TASK-001', 'TASK-009']);
  assert.equal(t[0].objective, 'OBJ-042');
  assert.equal(t[0].status, 'ready');
  assert.equal(t[1].status, 'in-progress');
  assert.equal(t[2].status, 'complete');
  assert.ok(t[0].body.includes('Build SAML SSO'));
});

test('migrate writes a node per block and quarantines orphans under OBJ-000', () => {
  const d3 = tmpD3WithTasks(SAMPLE);
  const r = M.migrateTasksToNodes(d3, { reindex: false });
  assert.equal(r.found, 3);
  assert.equal(r.migrated, 3);
  assert.equal(r.quarantined, 3, 'all 3 quarantine (OBJ-042 referenced but absent)');
  assert.ok(r.orphanObjectiveCreated);

  const dirs = fs.readdirSync(path.join(d3, 'directives'));
  assert.equal(dirs.length, 3);
  assert.ok(fs.existsSync(path.join(d3, 'objectives', 'obj-000-legacy-unclassified.md')));

  // every migrated directive is parented (the law holds)
  for (const f of dirs) {
    const { data } = parse(fs.readFileSync(path.join(d3, 'directives', f), 'utf8'));
    assert.equal(data.type, 'directive');
    assert.equal(data.parent_id, 'OBJ-000');
  }
});

test('migration is idempotent — a second run migrates nothing new', () => {
  const d3 = tmpD3WithTasks(SAMPLE);
  M.migrateTasksToNodes(d3, { reindex: false });
  const second = M.migrateTasksToNodes(d3, { reindex: false });
  assert.equal(second.migrated, 0);
  assert.equal(second.skipped, 3);
});

test('no TASKS.md → no-op', () => {
  const d3 = fs.mkdtempSync(path.join(os.tmpdir(), 'd3mig-'));
  assert.equal(M.migrateTasksToNodes(d3).found, 0);
});

test('migrated nodes pass the integrity gate (the law + parent exists)', () => {
  const d3 = tmpD3WithTasks(SAMPLE);
  M.migrateTasksToNodes(d3, { reindex: false });
  const { loadNodes } = require('../src/scripts/lib/nodes');
  const graph = require('../src/scripts/lib/graph');
  const errors = graph.check(loadNodes(d3)).filter((f) => f.level === 'error');
  assert.deepEqual(errors, [], 'no integrity errors after migration');
});
