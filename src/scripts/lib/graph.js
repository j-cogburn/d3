'use strict';
/**
 * Build the node graph (tree via parent_id + typed-edge overlay via refs)
 * and run the integrity checks that gate D3 v2 (the "law", acyclicity,
 * no dangling refs, consistent status rollups, one approved sketch per thread).
 */

const OPEN_STATUSES = new Set(['open', 'active', 'ready', 'in-progress', 'draft', 'superseded']);
const DONE_STATUSES = new Set(['met', 'complete', 'approved', 'killed', 'pivoted', 'archived']);

function index(nodes) {
  const byId = new Map();
  for (const n of nodes) byId.set(n.id, n);
  const childrenOf = new Map();
  for (const n of nodes) {
    if (n.parent_id) {
      if (!childrenOf.has(n.parent_id)) childrenOf.set(n.parent_id, []);
      childrenOf.get(n.parent_id).push(n);
    }
  }
  return { byId, childrenOf };
}

function edges(nodes) {
  const out = [];
  for (const n of nodes) {
    if (n.parent_id) out.push({ src: n.id, dst: n.parent_id, rel: 'child_of' });
    for (const r of n.refs) out.push({ src: n.id, dst: r.target, rel: r.rel });
  }
  return out;
}

function statusClass(s) {
  s = (s || '').toLowerCase();
  for (const d of DONE_STATUSES) if (s.startsWith(d)) return 'done';
  for (const o of OPEN_STATUSES) if (s.startsWith(o)) return 'open';
  return 'open';
}

// --- integrity checks ---------------------------------------------------
function check(nodes) {
  const { byId, childrenOf } = index(nodes);
  const findings = [];
  const err = (code, msg, id) => findings.push({ level: 'error', code, message: msg, id });
  const warn = (code, msg, id) => findings.push({ level: 'warn', code, message: msg, id });

  // 1. unique ids
  const seen = new Set();
  for (const n of nodes) {
    if (seen.has(n.id)) err('DUP_ID', `duplicate id ${n.id} (${n.file})`, n.id);
    seen.add(n.id);
  }

  // 2. the law: every directive has exactly one existing objective parent
  for (const n of nodes) {
    if (n.type !== 'directive') continue;
    if (!n.parent_id) { err('ORPHAN_DIRECTIVE', `directive ${n.id} has no parent objective (the law)`, n.id); continue; }
    const p = byId.get(n.parent_id);
    if (!p) err('DANGLING_PARENT', `directive ${n.id} parent ${n.parent_id} does not exist`, n.id);
    else if (p.type !== 'objective') err('BAD_PARENT_TYPE', `directive ${n.id} parent ${n.parent_id} is a ${p.type}, must be an objective`, n.id);
  }

  // 3. objectives may parent under Vision or another objective
  for (const n of nodes) {
    if (n.type !== 'objective' || !n.parent_id) continue;
    if (n.parent_id === 'Vision' || n.parent_id === 'VISION') continue;
    const p = byId.get(n.parent_id);
    if (!p) err('DANGLING_PARENT', `objective ${n.id} parent ${n.parent_id} does not exist`, n.id);
    else if (p.type !== 'objective') err('BAD_PARENT_TYPE', `objective ${n.id} parent ${n.parent_id} is a ${p.type}`, n.id);
  }

  // 4. parent_id forms a tree (no cycles)
  for (const n of nodes) {
    const path = new Set();
    let cur = n;
    while (cur && cur.parent_id && cur.parent_id !== 'Vision' && cur.parent_id !== 'VISION') {
      if (path.has(cur.id)) { err('PARENT_CYCLE', `parent_id cycle through ${cur.id}`, cur.id); break; }
      path.add(cur.id);
      cur = byId.get(cur.parent_id);
    }
  }

  // 5. no dangling references; collect blocks edges for DAG check
  const blockEdges = [];
  for (const n of nodes) {
    for (const r of n.refs) {
      // ADR targets and Vision are allowed external references
      if (/^ADR-/.test(r.target) || r.target === 'Vision') continue;
      if (!byId.has(r.target)) warn('DANGLING_REF', `${n.id} ref ${r.rel} -> ${r.target} does not exist`, n.id);
      if (r.rel === 'blocks') blockEdges.push([n.id, r.target]);
      if (r.rel === 'blocked_by') blockEdges.push([r.target, n.id]);
    }
  }

  // 6. blocks/blocked_by form a DAG (no cycles)
  if (hasCycle(blockEdges)) err('BLOCK_CYCLE', 'blocks/blocked_by edges contain a cycle', null);

  // 7. status rollup: an objective cannot be "met" with open children
  for (const n of nodes) {
    if (n.type !== 'objective' || statusClass(n.status) !== 'done') continue;
    if ((n.status || '').toLowerCase().startsWith('killed')) continue;
    const kids = childrenOf.get(n.id) || [];
    const open = kids.filter((k) => statusClass(k.status) === 'open');
    if (open.length) err('ROLLUP', `objective ${n.id} is '${n.status}' but has ${open.length} open child node(s): ${open.map((k) => k.id).join(', ')}`, n.id);
  }

  // 8. at most one APPROVED sketch per (parent objective, domain, slug) thread
  const threads = new Map();
  for (const n of nodes) {
    if (n.type !== 'sketch') continue;
    const slug = n.attrs.slug || slugFromFile(n.file);
    const key = `${n.parent_id}|${n.domain}|${slug}`;
    if ((n.status || '').toLowerCase().startsWith('approved')) {
      if (!threads.has(key)) threads.set(key, []);
      threads.get(key).push(n.id);
    }
  }
  for (const [key, ids] of threads) {
    if (ids.length > 1) err('MULTI_APPROVED_SKETCH', `more than one APPROVED sketch in thread ${key}: ${ids.join(', ')}`, ids[0]);
  }

  return findings;
}

function slugFromFile(file) {
  const base = file.split('/').pop().replace(/\.md$/, '');
  const parts = base.split('--'); // OBJ--domain--slug--vN--ts
  return parts.length >= 3 ? parts[2] : base;
}

function hasCycle(edgeList) {
  const adj = new Map();
  for (const [a, b] of edgeList) {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a).push(b);
  }
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map();
  const nodes = new Set();
  for (const [a, b] of edgeList) { nodes.add(a); nodes.add(b); }
  for (const n of nodes) color.set(n, WHITE);
  let cyc = false;
  function dfs(u) {
    color.set(u, GREY);
    for (const v of adj.get(u) || []) {
      if (color.get(v) === GREY) { cyc = true; return; }
      if (color.get(v) === WHITE) dfs(v);
    }
    color.set(u, BLACK);
  }
  for (const n of nodes) if (color.get(n) === WHITE) dfs(n);
  return cyc;
}

// subtree (inclusive) by parent_id
function subtree(nodes, rootId) {
  const { byId, childrenOf } = index(nodes);
  const root = byId.get(rootId);
  if (!root) return [];
  const out = [];
  (function walk(n, depth) {
    out.push({ node: n, depth });
    const kids = (childrenOf.get(n.id) || []).slice().sort((a, b) => a.id.localeCompare(b.id));
    for (const k of kids) walk(k, depth + 1);
  })(root, 0);
  return out;
}

// roots = objectives whose parent is Vision/none
function roots(nodes) {
  return nodes.filter((n) => n.type === 'objective' && (!n.parent_id || /^vision$/i.test(n.parent_id)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

module.exports = { index, edges, check, subtree, roots, statusClass };
