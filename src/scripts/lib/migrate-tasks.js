'use strict';
/**
 * TASKS.md → per-node migration (DIR-051, OBJ-007) — the data-migration half of
 * D3-ARCHITECTURE-V2.md §7.2. Splits a monolithic `.d3/TASKS.md` (legacy
 * `### DIRECTIVE-NNN` / `### TASK-NNN` blocks) into one directive node file each,
 * quarantines every parent-less directive under a synthetic `OBJ-000` so nothing
 * breaks the law, and (optionally) rebuilds the index.
 *
 * Idempotent: a block whose id already exists as a node is skipped. Non-destructive:
 * the original TASKS.md is left in place (board-view regeneration is a separate step).
 */
const fs = require('fs');
const path = require('path');
const { parse, compose } = require('./frontmatter');

const BLOCK_RE = /^### ((?:DIRECTIVE|TASK)-\d+):\s+(.+?)\s*$/;

function today() { return new Date().toISOString().slice(0, 10); }
function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 6).join('-'); }

function normStatus(raw) {
  const s = (raw || '').toLowerCase().trim();
  if (s.startsWith('complete') || s.startsWith('done')) return 'complete';
  if (s.startsWith('in-progress') || s.startsWith('in progress')) return 'in-progress';
  return 'ready';
}

// Parse a TASKS.md body into [{ id, title, status, objective, body }].
function parseTasks(content) {
  const lines = content.split('\n');
  const out = [];
  let cur = null;
  const flush = () => { if (cur) { cur.body = cur.bodyLines.join('\n').trim(); delete cur.bodyLines; out.push(cur); } };
  for (const line of lines) {
    const m = BLOCK_RE.exec(line);
    if (m) { flush(); cur = { id: m[1], title: m[2], status: 'ready', objective: null, bodyLines: [] }; continue; }
    if (!cur) continue;
    if (/^## /.test(line)) { flush(); cur = null; continue; } // a new section ends the block
    const st = /^\*\*Status:\*\*\s*(.+)$/.exec(line);
    if (st) { cur.status = normStatus(st[1]); continue; }
    const ob = /^\*\*Objective:\*\*\s*(OBJ-\d+)/.exec(line);
    if (ob) { cur.objective = ob[1]; continue; }
    cur.bodyLines.push(line);
  }
  flush();
  return out;
}

function loadExistingIds(d3Dir) {
  const ids = new Set();
  for (const sub of ['directives', 'objectives']) {
    const dir = path.join(d3Dir, sub);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.md')) continue;
      const { data } = parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (data.id) ids.add(String(data.id).trim());
    }
  }
  return ids;
}

function ensureQuarantineObjective(d3Dir, existing) {
  if (existing.has('OBJ-000')) return false;
  const dir = path.join(d3Dir, 'objectives');
  fs.mkdirSync(dir, { recursive: true });
  const body = 'Quarantine for directives migrated from a monolithic TASKS.md that have no parent objective. Re-home each via /define, then delete this objective.';
  const node = compose({
    id: 'OBJ-000', type: 'objective', title: 'Legacy / unclassified',
    status: 'open', level: 'atomic', parent_id: 'Vision', created: today(),
  }, '\n' + body + '\n');
  fs.writeFileSync(path.join(dir, 'obj-000-legacy-unclassified.md'), node);
  existing.add('OBJ-000');
  return true;
}

function migrateTasksToNodes(d3Dir, opts = {}) {
  const tasksPath = path.join(d3Dir, 'TASKS.md');
  const result = { found: 0, migrated: 0, quarantined: 0, skipped: 0, orphanObjectiveCreated: false, ids: [] };
  if (!fs.existsSync(tasksPath)) return result;

  const tasks = parseTasks(fs.readFileSync(tasksPath, 'utf8'));
  result.found = tasks.length;
  if (!tasks.length) return result;

  const existing = loadExistingIds(d3Dir);
  const dir = path.join(d3Dir, 'directives');
  fs.mkdirSync(dir, { recursive: true });

  for (const t of tasks) {
    if (existing.has(t.id)) { result.skipped++; continue; }
    let parent = t.objective;
    if (!parent || !existing.has(parent)) {
      if (parent && !existing.has(parent)) parent = null; // referenced objective doesn't exist → quarantine
      result.orphanObjectiveCreated = ensureQuarantineObjective(d3Dir, existing) || result.orphanObjectiveCreated;
      parent = 'OBJ-000';
      result.quarantined++;
    }
    const node = compose({
      id: t.id, type: 'directive', title: t.title, status: t.status,
      parent_id: parent, door: 'two-way', created: today(), migrated_from: 'TASKS.md',
    }, '\n' + (t.body || '').trim() + '\n');
    fs.writeFileSync(path.join(dir, `${slug(t.id + '-' + t.title)}.md`), node);
    existing.add(t.id);
    result.migrated++;
    result.ids.push(t.id);
  }

  if (opts.reindex !== false && result.migrated > 0) {
    try { require('../d3-index').buildIndex(d3Dir, { quiet: true }); } catch { /* index is derived; non-fatal */ }
  }
  return result;
}

module.exports = { parseTasks, migrateTasksToNodes, normStatus };
