'use strict';
/**
 * Git forensics — the cheapest outer-loop signal (D3 v2 §2.1, OBJ-005).
 * Pure analysis over a parsed commit list so it is unit-testable without a repo:
 * the I/O wrapper (d3-learn-git.js) runs `git log` and feeds these functions.
 *
 * A commit is: { hash, author, date: 'YYYY-MM-DD', subject, files: [paths] }.
 *
 * Metrics are honest proxies, labelled as such — without deploy/PR markers, true
 * DORA lead-time/MTTR aren't knowable from `git log` alone, so we approximate and
 * say so. This is the "measure honestly" principle applied to our own evidence.
 */

const FIX_RE = /\b(fix(e[sd])?|hotfix|revert|reverts|bug(fix)?|regression|patch)\b/i;
const REVERT_RE = /\brevert(s|ed)?\b/i;

function isFix(subject) { return FIX_RE.test(subject || ''); }
function isRevert(subject) { return REVERT_RE.test(subject || ''); }

function daysBetween(a, b) { return Math.abs((new Date(a) - new Date(b)) / 86400000); }
function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// commits/week over the observed range — a deployment-frequency proxy.
function deploymentFrequency(commits) {
  if (commits.length < 2) return { perWeek: commits.length, spanDays: 0 };
  const dates = commits.map((c) => new Date(c.date)).sort((a, b) => a - b);
  const spanDays = Math.max(1, (dates[dates.length - 1] - dates[0]) / 86400000);
  return { perWeek: +(commits.length / (spanDays / 7)).toFixed(2), spanDays: Math.round(spanDays) };
}

// fraction of commits that are fixes/reverts — change-failure-rate proxy.
function changeFailureRate(commits) {
  if (!commits.length) return { rate: 0, fixes: 0, total: 0 };
  const fixes = commits.filter((c) => isFix(c.subject)).length;
  return { rate: +(fixes / commits.length).toFixed(3), fixes, total: commits.length, band: cfrBand(fixes / commits.length) };
}
function cfrBand(r) { return r <= 0.15 ? 'elite (0–15%)' : r <= 0.30 ? 'high' : r <= 0.45 ? 'medium' : 'low'; }

// time-to-restore proxy: median days from a fix commit back to the previous commit.
function restoreTimeProxy(commits) {
  const chron = [...commits].sort((a, b) => new Date(a.date) - new Date(b.date));
  const gaps = [];
  for (let i = 1; i < chron.length; i++) if (isFix(chron[i].subject)) gaps.push(daysBetween(chron[i].date, chron[i - 1].date));
  return { medianDays: +median(gaps).toFixed(2), samples: gaps.length };
}

// files ranked by how many commits touched them (churn hotspots).
function hotspots(commits, topN = 10) {
  const count = new Map();
  for (const c of commits) for (const f of c.files || []) count.set(f, (count.get(f) || 0) + 1);
  return [...count.entries()].map(([file, commitsTouching]) => ({ file, commitsTouching }))
    .sort((a, b) => b.commitsTouching - a.commitsTouching).slice(0, topN);
}

// files that appear most often in FIX commits (where bugs concentrate).
function bugFixHotspots(commits, topN = 10) {
  const count = new Map();
  for (const c of commits) if (isFix(c.subject)) for (const f of c.files || []) count.set(f, (count.get(f) || 0) + 1);
  return [...count.entries()].map(([file, fixes]) => ({ file, fixes }))
    .sort((a, b) => b.fixes - a.fixes).slice(0, topN);
}

// pairs of files changed together — co-change coupling (support + confidence).
function coupling(commits, { topN = 10, minSupport = 2, maxFilesPerCommit = 50 } = {}) {
  const pair = new Map();      // "a\0b" -> co-change count
  const single = new Map();    // file -> commits touching
  for (const c of commits) {
    const files = [...new Set(c.files || [])];
    if (files.length < 2 || files.length > maxFilesPerCommit) {
      for (const f of files) single.set(f, (single.get(f) || 0) + 1);
      continue;
    }
    for (const f of files) single.set(f, (single.get(f) || 0) + 1);
    files.sort();
    for (let i = 0; i < files.length; i++)
      for (let j = i + 1; j < files.length; j++) {
        const k = files[i] + '\0' + files[j];
        pair.set(k, (pair.get(k) || 0) + 1);
      }
  }
  return [...pair.entries()]
    .filter(([, n]) => n >= minSupport)
    .map(([k, support]) => {
      const [a, b] = k.split('\0');
      const conf = Math.min(support / (single.get(a) || 1), support / (single.get(b) || 1));
      return { a, b, support, confidence: +conf.toFixed(2) };
    })
    .sort((x, y) => y.support - x.support || y.confidence - x.confidence)
    .slice(0, topN);
}

function analyze(commits, opts = {}) {
  const dates = commits.map((c) => c.date).filter(Boolean).sort();
  return {
    range: { from: dates[0] || null, to: dates[dates.length - 1] || null, commits: commits.length },
    dora: {
      deploymentFrequency: deploymentFrequency(commits),
      changeFailureRate: changeFailureRate(commits),
      restoreTimeProxy: restoreTimeProxy(commits),
      reverts: commits.filter((c) => isRevert(c.subject)).length,
    },
    hotspots: hotspots(commits, opts.topN),
    bugFixHotspots: bugFixHotspots(commits, opts.topN),
    coupling: coupling(commits, opts),
  };
}

// render the analysis to a markdown report body (pure string).
function renderReport(a, meta = {}) {
  const L = [];
  L.push('# Git forensics report');
  L.push(`**Generated:** ${meta.generated || new Date().toISOString()}`);
  if (meta.window) L.push(`**Window:** ${meta.window}`);
  L.push(`**Range:** ${a.range.from || '—'} → ${a.range.to || '—'} · ${a.range.commits} commits`);
  L.push('');
  L.push('> Proxies, not instrumented DORA: without deploy/PR markers, `git log` alone');
  L.push('> can only approximate lead-time/MTTR. Treat as directional signal.');
  L.push('');
  L.push('## DORA (proxies)');
  L.push(`- **Deployment frequency:** ${a.dora.deploymentFrequency.perWeek}/week over ${a.dora.deploymentFrequency.spanDays} days`);
  L.push(`- **Change-failure-rate:** ${(a.dora.changeFailureRate.rate * 100).toFixed(1)}% (${a.dora.changeFailureRate.fixes}/${a.dora.changeFailureRate.total}) — ${a.dora.changeFailureRate.band}`);
  L.push(`- **Time-to-restore (proxy):** ${a.dora.restoreTimeProxy.medianDays} days median across ${a.dora.restoreTimeProxy.samples} fixes`);
  L.push(`- **Reverts:** ${a.dora.reverts}`);
  L.push('');
  L.push('## Churn hotspots (most-changed files)');
  if (!a.hotspots.length) L.push('_none_');
  for (const h of a.hotspots) L.push(`- \`${h.file}\` — ${h.commitsTouching} commits`);
  L.push('');
  L.push('## Bug-fix concentration (where fixes land)');
  if (!a.bugFixHotspots.length) L.push('_none_');
  for (const h of a.bugFixHotspots) L.push(`- \`${h.file}\` — ${h.fixes} fix commits`);
  L.push('');
  L.push('## Co-change coupling (files that change together)');
  if (!a.coupling.length) L.push('_none above support threshold_');
  for (const c of a.coupling) L.push(`- \`${c.a}\` ⇄ \`${c.b}\` — ${c.support}× (confidence ${c.confidence})`);
  L.push('');
  L.push('## Calibration prompt (feed LEAR­N)');
  L.push('- Did areas D3 rated low-risk show up as hotspots / fix-magnets above?');
  L.push('- Any coupled pair that should be one module (or decoupled)?');
  return L.join('\n');
}

module.exports = {
  isFix, isRevert, deploymentFrequency, changeFailureRate, restoreTimeProxy,
  hotspots, bugFixHotspots, coupling, analyze, renderReport,
};
