'use strict';
/**
 * Daemon core for `d3 run` — the continuous, three-ticker runner from
 * D3-RUN-CLI-PROPOSAL.md §2/§3/§6. Everything here is pure or near-pure
 * (config, backoff math, lock files, board computation, rendering, key→action
 * mapping) so the scheduler can be unit-tested without a TTY, claude, or gh.
 *
 * The interactive loop that drives these (raw-mode keys, screen clears, agent
 * spawning) lives in d3-run.js; this module is the brain, that one is the body.
 */
const fs = require('fs');
const path = require('path');
const { isDone, isReady, isInProgress, selectBuildable } = require('./select');

// ── config ────────────────────────────────────────────────────────────────────
const DEFAULTS = {
  concurrency: 4,
  autonomy: 'inner-only',                       // inner-only | inner-middle | full
  idleBackoff: { startMs: 2000, maxMs: 60000 }, // exponential between empty inner ticks
  middleTickMs: 300000,                         // objective rollup cadence
  outerLoop: { onGitPush: '/learn git', nightly: ['/learn code', '/learn docs'] },
  park: { onCritical: true, saveLesson: true },
};

function loadConfig(d3Dir) {
  const p = path.join(d3Dir, 'run.config.json');
  let user = {};
  try { if (fs.existsSync(p)) user = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { /* defaults */ }
  return {
    ...DEFAULTS, ...user,
    idleBackoff: { ...DEFAULTS.idleBackoff, ...(user.idleBackoff || {}) },
    outerLoop: { ...DEFAULTS.outerLoop, ...(user.outerLoop || {}) },
    park: { ...DEFAULTS.park, ...(user.park || {}) },
  };
}

// Persist a single setting (e.g. the autonomy toggle writes the config for you —
// the user never edits JSON by hand, per proposal §0/§8).
function saveConfigKey(d3Dir, key, value) {
  const p = path.join(d3Dir, 'run.config.json');
  let cfg = {};
  try { if (fs.existsSync(p)) cfg = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { cfg = {}; }
  cfg[key] = value;
  fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + '\n');
  return cfg;
}

// ── idle backoff (pure) ─────────────────────────────────────────────────────────
function nextBackoff(currentMs, cfg) {
  const { startMs, maxMs } = cfg.idleBackoff;
  if (!currentMs) return startMs;
  return Math.min(currentMs * 2, maxMs);
}

// ── single-instance lock ─────────────────────────────────────────────────────────
function lockPath(d3Dir) { return path.join(d3Dir, 'run', 'run.lock'); }

function isAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; }
}

function readLock(d3Dir) {
  const p = lockPath(d3Dir);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return { corrupt: true }; }
}

// A lock is reclaimable when it is corrupt, released (tombstone), has no pid, or
// its pid is dead. Only a *live foreign* pid blocks. This keeps the runner safe
// after a crash and on synced/FUSE mounts where the lock file can't be unlinked.
function isReclaimable(existing) {
  if (!existing || existing.corrupt || existing.released || !existing.pid) return true;
  if (existing.pid === process.pid) return true;
  return !isAlive(existing.pid);
}

// Returns { ok, held } — held is the live lock that blocked us (caller offers
// attach / take-over).
function acquireLock(d3Dir, info = {}) {
  fs.mkdirSync(path.join(d3Dir, 'run'), { recursive: true });
  const existing = readLock(d3Dir);
  if (!isReclaimable(existing)) return { ok: false, held: existing };
  const lock = { pid: process.pid, host: require('os').hostname(), started: new Date().toISOString(), ...info };
  fs.writeFileSync(lockPath(d3Dir), JSON.stringify(lock, null, 2));
  return { ok: true, lock };
}

// Release by unlinking; if the filesystem forbids unlink (some synced mounts),
// fall back to writing a tombstone so the next runner reclaims it cleanly.
function releaseLock(d3Dir) {
  const existing = readLock(d3Dir);
  if (!existing || existing.pid !== process.pid) return false;
  try { fs.rmSync(lockPath(d3Dir)); return true; }
  catch { try { fs.writeFileSync(lockPath(d3Dir), JSON.stringify({ pid: null, released: true })); } catch {} return true; }
}

// ── objective rollup (the middle ticker's job) ──────────────────────────────────
// Objectives that are still open but whose every child node is done → a human
// LEARN verdict is owed (met / pivot / kill). Surfaced, never auto-decided.
function objectivesAwaitingVerdict(nodes) {
  const childrenOf = new Map();
  for (const n of nodes) {
    if (!n.parent_id) continue;
    if (!childrenOf.has(n.parent_id)) childrenOf.set(n.parent_id, []);
    childrenOf.get(n.parent_id).push(n);
  }
  return nodes.filter((n) => {
    if (n.type !== 'objective' || isDone(n.status)) return false;
    const kids = childrenOf.get(n.id) || [];
    return kids.length > 0 && kids.every((k) => isDone(k.status));
  }).sort((a, b) => a.id.localeCompare(b.id));
}

// Active objectives with no directives and no approved sketch → need SHAPE.
function objectivesNeedingShape(nodes) {
  const childrenOf = new Map();
  for (const n of nodes) {
    if (!n.parent_id) continue;
    if (!childrenOf.has(n.parent_id)) childrenOf.set(n.parent_id, []);
    childrenOf.get(n.parent_id).push(n);
  }
  return nodes.filter((n) => {
    if (n.type !== 'objective' || !/^active/i.test((n.status || '').trim())) return false;
    const kids = childrenOf.get(n.id) || [];
    const hasDirective = kids.some((k) => k.type === 'directive');
    const hasObjective = kids.some((k) => k.type === 'objective');
    return !hasDirective && !hasObjective;
  }).sort((a, b) => a.id.localeCompare(b.id));
}

// ── board model (pure) ──────────────────────────────────────────────────────────
function computeBoard(nodes, state = {}) {
  const directives = nodes.filter((n) => n.type === 'directive');
  const { buildable, blocked, gated } = selectBuildable(nodes);

  const building = directives.filter((d) => isInProgress(d.status));
  const parked = directives.filter((d) => /^(needs-review|ci-failed)/i.test((d.status || '').trim()));
  const merged = directives.filter((d) => /^complete/i.test((d.status || '').trim()));
  const verdicts = objectivesAwaitingVerdict(nodes);
  const toShape = objectivesNeedingShape(nodes);

  // NEEDS YOU — the only column the human must act on, each with a prebuilt action
  const needsYou = [];
  for (const d of parked) needsYou.push({
    kind: 'prove', id: d.id, label: `review ${d.id} — ${reasonFor(d)}`, command: `/prove ${d.id}`,
  });
  for (const o of verdicts) needsYou.push({
    kind: 'learn', id: o.id, label: `verdict ${o.id} — all children complete (met / pivot / kill)`, command: `/learn ${o.id}`,
  });
  for (const o of toShape) needsYou.push({
    kind: 'shape', id: o.id, label: `shape ${o.id} — no directives yet`, command: `/shape ${o.id}`,
  });

  return {
    autonomy: state.autonomy || 'inner-only',
    paused: !!state.paused,
    uptimeMs: state.startedAt ? Date.now() - state.startedAt : 0,
    healthy: (state.integrityErrors || 0) === 0,
    integrityErrors: state.integrityErrors || 0,
    building, merged, parked,
    queue: { ready: buildable, blocked, gated },
    needsYou,
    outer: state.outer || null,
  };
}

function reasonFor(d) {
  return /^ci-failed/i.test(d.status) ? 'CI failed' : 'critical finding';
}

// ── key → action mapping (fool-proof selection: press a number, never recall) ────
// The dashboard numbers the NEEDS YOU items; this maps a pressed key to the exact
// slash command to run. Pure, so the mapping is testable without a terminal.
function actionForKey(board, key) {
  const n = parseInt(key, 10);
  if (!Number.isInteger(n) || n < 1 || n > board.needsYou.length) return null;
  const item = board.needsYou[n - 1];
  return { item, command: item.command };
}

// ── rendering (pure: model → string, the §6 dashboard) ───────────────────────────
function fmtUptime(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60), h = Math.floor(m / 60);
  return h ? `${h}h${String(m % 60).padStart(2, '0')}m` : `${m}m${String(s % 60).padStart(2, '0')}s`;
}

function renderBoard(board, opts = {}) {
  const L = [];
  const dot = board.healthy ? '● healthy' : `✗ ${board.integrityErrors} integrity error(s)`;
  const paused = board.paused ? ' · PAUSED' : '';
  L.push(`D3 RUNNER · ${board.autonomy}${paused} · uptime ${fmtUptime(board.uptimeMs)} · ${dot}`);
  L.push('═'.repeat(74));
  L.push('');
  L.push('INNER LOOP  (autonomous)');
  L.push(`  building  ${board.building.length}` + (board.building.length ? '   ' + board.building.map((d) => d.id).join(', ') : ''));
  L.push(`  merged ▲  ${board.merged.length}` + (board.merged.length ? '   ' + board.merged.slice(-6).map((d) => d.id).join(', ') : ''));
  L.push(`  parked ⚠  ${board.parked.length}` + (board.parked.length ? '   ' + board.parked.map((d) => d.id).join(', ') : ''));
  L.push('');
  L.push('NEEDS YOU            ← press the number to act (the runner runs the command)');
  if (!board.needsYou.length) L.push('  (nothing — you are clear)');
  board.needsYou.forEach((it, i) => L.push(`  [${i + 1}] ${it.label}   → ${it.command}`));
  L.push('');
  L.push('QUEUE');
  L.push(`  ready    ${board.queue.ready.length}` + (board.queue.ready.length ? '   ' + board.queue.ready.map((d) => d.id).join(', ') : '   (all claimed)'));
  L.push(`  blocked  ${board.queue.blocked.length}` + (board.queue.blocked.length ? '   ' + board.queue.blocked.map((d) => `${d.id}⟵${d.reason.replace('blocked_by ', '')}`).join(' · ') : ''));
  L.push(`  gated    ${board.queue.gated.length}` + (board.queue.gated.length ? '   ' + board.queue.gated.map((d) => `${d.id}⟵${d.reason.replace('gated_by ', '')}`).join(' · ') : ''));
  L.push('');
  L.push('OUTER LOOP  (advisory)');
  L.push('  ' + (board.outer || 'no git-forensics run yet this session'));
  L.push('');
  L.push(`Autonomy: ${board.autonomy} ▸   (press a to change · trade-offs shown first)`);
  L.push('═'.repeat(74));
  if (opts.interactive !== false) {
    L.push(' [1-9] act   [a] autonomy   [p] ' + (board.paused ? 'resume' : 'pause') + '   [r] refresh   [q] quit');
  }
  return L.join('\n');
}

module.exports = {
  DEFAULTS, loadConfig, saveConfigKey, nextBackoff,
  lockPath, isAlive, readLock, acquireLock, releaseLock,
  objectivesAwaitingVerdict, objectivesNeedingShape,
  computeBoard, actionForKey, renderBoard,
};
