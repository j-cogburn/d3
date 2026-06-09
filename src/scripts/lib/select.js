'use strict';
/**
 * Pure directive-selection helpers shared by the single pass (d3-run.js) and
 * the continuous daemon (lib/runner.js). No I/O — given a node list, decide
 * what is buildable, blocked, or gated. Kept here so both callers share one
 * implementation without a circular import.
 */

function isDone(status) { return /^(complete|met|approved|killed|pivoted|archived)/i.test((status || '').trim()); }
function isReady(status) { return /^ready/i.test((status || '').trim()); }
function isInProgress(status) { return /^in-progress/i.test((status || '').trim()); }

function branchFor(d) {
  const slug = (d.title || d.id).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').split('-').slice(0, 5).join('-');
  return `feature/${d.id.toLowerCase()}-${slug}`;
}

// ready + unblocked + not-gated directives (the graph query at the heart of BUILD)
function selectBuildable(nodes, target) {
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // blocker map: blocked_id -> [blocker_id, …]  (from blocks / blocked_by edges)
  const blockers = new Map();
  const addBlock = (blockerId, blockedId) => {
    if (!blockers.has(blockedId)) blockers.set(blockedId, []);
    blockers.get(blockedId).push(blockerId);
  };
  for (const n of nodes) {
    for (const r of n.refs || []) {
      if (r.rel === 'blocks') addBlock(n.id, r.target);
      if (r.rel === 'blocked_by') addBlock(r.target, n.id);
    }
  }

  const matchesTarget = (id) => {
    if (!target) return true;
    const t = target.toUpperCase().replace(/^DIRECTIVE-/, 'DIR-');
    return id.toUpperCase() === t;
  };

  const buildable = [], blocked = [], gated = [];
  for (const n of nodes) {
    if (n.type !== 'directive' || !isReady(n.status) || !matchesTarget(n.id)) continue;

    const gate = (n.refs || []).find((r) => r.rel === 'gated_by');
    if (gate) { gated.push({ ...n, reason: `gated_by ${gate.target}` }); continue; }

    const open = (blockers.get(n.id) || []).filter((bid) => {
      const b = byId.get(bid);
      return !b || !isDone(b.status);
    });
    if (open.length) { blocked.push({ ...n, reason: `blocked_by ${open.join(', ')}` }); continue; }

    buildable.push(n);
  }
  buildable.sort((a, b) => a.id.localeCompare(b.id));
  return { buildable, blocked, gated };
}

module.exports = { isDone, isReady, isInProgress, branchFor, selectBuildable };
