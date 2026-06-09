#!/usr/bin/env node
'use strict';
/**
 * `d3 run` — the v2 loop runner (step 1: the single inner-loop pass).
 *
 * This is the node-store-native successor to orchestrate.js. Instead of
 * scraping .d3/TASKS.md, it reads the v2 node graph, runs the integrity gate
 * as admission control, then BUILDs → PROVEs every directive that is READY and
 * UNBLOCKED — exactly the inner loop from D3-RUN-CLI-PROPOSAL.md §2/§9.
 *
 * What makes it "v2-native":
 *   • selection is a graph query (ready AND no open blocker AND not gated), not regex
 *   • the v2 integrity gate (the law · DAG · dangling refs · rollup) gates the batch
 *   • the agent brief is assembled from the node graph: parent objective + vision +
 *     the relevant principle files + the approved sketch + service lessons + the body
 *   • status is written back to each node's YAML frontmatter (ready → in-progress →
 *     complete | ci-failed | needs-review), never to a monolithic TASKS.md
 *
 * Usage:
 *   d3 run --once                 build every ready+unblocked directive, once
 *   d3 run --once --dry-run       show the plan + a brief preview; touch nothing
 *   d3 run --once DIR-030         scope to a single directive
 *   d3 run --once --no-gate       proceed even if integrity has errors (NOT advised)
 *   D3_CONCURRENCY=6 d3 run --once
 *
 * Exit codes: 0 ok · 1 integrity gate failed / fatal · 2 no .d3 directory.
 */

const { spawn, spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { buildIndex } = require('./d3-index');
const { isDone, isReady, branchFor, selectBuildable } = require('./lib/select');
const runner = require('./lib/runner');

// Arrow key escape sequences in raw mode
const KEY_UP    = '\x1b[A';
const KEY_DOWN  = '\x1b[B';
const KEY_ENTER = '\r';

// ── config ──────────────────────────────────────────────────────────────────
const MAX_CONCURRENT = parseInt(process.env.D3_CONCURRENCY || '4', 10);
const TIMEOUT_MS     = parseInt(process.env.D3_TIMEOUT_MS || String(15 * 60 * 1000), 10);
const CI_TIMEOUT_MS  = parseInt(process.env.D3_CI_TIMEOUT_MS || String(20 * 60 * 1000), 10);
const CI_POLL_MS     = 30 * 1000;
const BRIEF_PRINCIPLES = ['code', 'architecture', 'security', 'data-privacy', 'delivery-ops'];
const PRINCIPLE_CAP = 2000; // chars per principle file injected into a brief

const CRITICAL_PATTERNS = [
  /\bCritical\b/i, /\bsecurity\s+(?:vulnerability|issue|bug|flaw)\b/i,
  /\bSQL\s+injection\b/i, /\bXSS\b/, /\bbreaking\s+change\b/i,
  /\bremote\s+code\s+execution\b/i, /🚨/,
];

// ── small helpers ─────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().slice(0, 10); }
function readIf(p) { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null; }
function cap(s, n) { return s && s.length > n ? s.slice(0, n) + '\n…(truncated)' : (s || ''); }
// isDone / isReady / branchFor / selectBuildable now live in ./lib/select (shared
// with the continuous daemon); imported above and re-exported below for back-compat.

// ── brief assembly from the node graph (the v2 leverage point) ─────────────────
function buildBrief(directive, nodes, projectDir) {
  const d3Dir = path.join(projectDir, '.d3');
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const objective = byId.get(directive.parent_id);

  const sections = [];
  sections.push(
    '## Identity',
    '| Field | Value |', '|---|---|',
    `| Directive | ${directive.id} |`,
    `| Title | ${directive.title} |`,
    `| Objective | ${directive.parent_id}${objective ? ` — ${objective.title}` : ''} |`,
    `| Branch | ${branchFor(directive)} |`,
    `| Door | ${directive.door || 'two-way'} |`,
    `| Appetite | ${directive.appetite || 'unspecified'} |`, '',
  );

  // Project vision
  const vision = readIf(path.join(d3Dir, 'vision.md'));
  if (vision) sections.push('## Project vision', cap(vision.trim(), 1500), '');

  // Parent objective — the WHY this directive serves (the law made useful)
  if (objective) {
    sections.push('## Objective this serves', `**${objective.id}: ${objective.title}**`,
      cap((objective.body || '').trim(), 1800), '');
  }

  // Lessons from prior critical reviews for the same services
  const lessons = readLessons(d3Dir, directive.attrs && directive.attrs.services);
  if (lessons) sections.push('## Lessons from previous reviews',
    '*(critical findings caught before — do not repeat)*', '', lessons, '');

  // The directive itself (Problem / Build / Done-when live in the body)
  sections.push('## What to build', (directive.body || '').trim(), '');

  // Approved sketch (the agreed design), if the directive references one
  const sketchId = directive.attrs && directive.attrs.sketch_id;
  if (sketchId) {
    const sketch = nodes.find((n) => n.type === 'sketch' && n.id === sketchId);
    if (sketch) sections.push('## Approved design (sketch)', `**${sketch.id}**`,
      cap((sketch.body || '').trim(), 2000), '');
  }

  // Principle library — proven standards injected for the BUILD phase (§6)
  const principles = [];
  for (const name of BRIEF_PRINCIPLES) {
    const p = readIf(path.join(d3Dir, 'principles', `${name}.md`));
    if (p) principles.push(`### ${name}\n${cap(p.trim(), PRINCIPLE_CAP)}`);
  }
  if (principles.length) sections.push('## Principles to apply (cite the one each decision rests on)',
    principles.join('\n\n---\n\n'), '');

  // Declared skills
  const skills = toList(directive.attrs && directive.attrs.skills);
  for (const skill of skills) {
    const sp = readIf(path.join(d3Dir, 'skills', skill, 'SKILL.md'));
    if (sp) sections.push(`## Skill: ${skill}`, cap(sp.trim(), PRINCIPLE_CAP), '');
  }

  // Project context
  const rootClaude = readIf(path.join(projectDir, 'CLAUDE.md'));
  if (rootClaude) sections.push('## Project context', cap(rootClaude.trim(), 2500), '');

  sections.push('## Out of scope',
    '- Do not edit any node file under .d3/ except the code/docs this directive names',
    '- Do not modify other directives or objectives', '',
    '## Definition of done',
    '- All Done-when checklist items complete',
    '- No debug print/console statements in production paths; no hardcoded secrets',
    '- Architectural decisions recorded as an ADR in .d3/docs/adr/',
    `- Open a PR against main titled exactly: ${directive.id}: ${directive.title}`);

  return sections.join('\n');
}

function toList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return String(v).split(',').map((x) => x.trim()).filter(Boolean);
}

function readLessons(d3Dir, services) {
  const dir = path.join(d3Dir, 'docs', 'lessons');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== '.gitkeep');
  if (!files.length) return null;
  const want = toList(services);
  const picked = files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
    .filter((c) => !want.length || want.some((s) => c.includes(s))).slice(-3);
  return picked.length ? picked.join('\n\n---\n\n') : null;
}

// ── status writeback (targeted: touch only the frontmatter status line) ────────
function setNodeStatus(projectDir, node, newStatus, extra = {}) {
  const abs = path.join(projectDir, '.d3', node.file);
  let text = fs.readFileSync(abs, 'utf8');
  const m = /^(---\n)([\s\S]*?)(\n---\n?)/.exec(text);
  if (!m) return false;
  let fm = m[2];
  fm = /^status:.*$/m.test(fm)
    ? fm.replace(/^status:.*$/m, `status: ${newStatus}`)
    : `${fm}\nstatus: ${newStatus}`;
  for (const [k, v] of Object.entries(extra)) {
    if (v == null) continue;
    const re = new RegExp(`^${k}:.*$`, 'm');
    fm = re.test(fm) ? fm.replace(re, `${k}: ${v}`) : `${fm}\n${k}: ${v}`;
  }
  fs.writeFileSync(abs, m[1] + fm + m[3] + text.slice(m[0].length));
  return true;
}

function appendChangelog(projectDir, directive, pr) {
  const p = path.join(projectDir, '.d3', 'CHANGELOG.md');
  let content = readIf(p) || '# Changelog\n';
  const entry = `- ${directive.id}: ${directive.title}. (PR #${pr})\n`;
  const header = `## ${today()}`;
  if (content.includes(header)) content = content.replace(header + '\n', header + '\n' + entry);
  else {
    const idx = content.indexOf('\n## ');
    content = idx !== -1
      ? content.slice(0, idx + 1) + header + '\n' + entry + '\n' + content.slice(idx + 1)
      : content + '\n' + header + '\n' + entry;
  }
  fs.writeFileSync(p, content);
}

function saveLesson(projectDir, directive, pr, reviewOutput) {
  const dir = path.join(projectDir, '.d3', 'docs', 'lessons');
  fs.mkdirSync(dir, { recursive: true });
  const slug = directive.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const ts = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
  const file = path.join(dir, `lesson-${ts}-${slug}.md`);
  const finding = (reviewOutput.match(/Critical[:\s]+([^\n]+)/i) || [])[1] || reviewOutput.slice(0, 300);
  fs.writeFileSync(file, [
    `# Lesson: ${directive.title}`, `**Date:** ${today()}`, `**Directive:** ${directive.id}`,
    `**PR:** #${pr}`, '', '## Critical finding', finding.trim(), '',
    '## Full review output', reviewOutput.slice(0, 1500), '',
    '## Prevention', '*(add notes after manual review — what should future agents do differently?)*',
  ].join('\n'));
  return path.relative(projectDir, file);
}

// ── git worktree + agent + review (the proven BUILD/PROVE machinery) ───────────
function git(cmd, cwd) { return execSync(cmd, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim(); }

function createWorktree(projectDir, branch) {
  const wt = path.join(projectDir, '.d3', 'worktrees');
  fs.mkdirSync(wt, { recursive: true });
  const dest = path.join(wt, branch.replace(/\//g, '_'));
  try { git(`git worktree add "${dest}" -b "${branch}"`, projectDir); }
  catch { git(`git worktree add "${dest}" "${branch}"`, projectDir); }
  return dest;
}
function removeWorktree(projectDir, dest) {
  try { git(`git worktree remove --force "${dest}"`, projectDir); } catch {}
  try { git('git worktree prune', projectDir); } catch {}
}

function runAgent(brief, cwd) {
  return new Promise((resolve) => {
    const out = [];
    const proc = spawn('claude', ['-p', brief, '--dangerously-skip-permissions'],
      { cwd, env: { ...process.env }, stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stdout.on('data', (d) => out.push(d.toString()));
    proc.stderr.on('data', (d) => out.push(d.toString()));
    const timer = setTimeout(() => { proc.kill('SIGTERM'); resolve({ ok: false, reason: 'timeout', out: out.join(''), pr: null }); }, TIMEOUT_MS);
    proc.on('close', (code) => {
      clearTimeout(timer);
      const text = out.join('');
      const m = text.match(/(?:PR|pull request)[# ]+(\d+)|\/pull\/(\d+)|#(\d+)/i);
      resolve({ ok: code === 0, reason: code === 0 ? 'ok' : `exit ${code}`, out: text, pr: m ? (m[1] || m[2] || m[3]) : null });
    });
  });
}

async function waitForCI(prNumber, cwd) {
  const deadline = Date.now() + CI_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const r = spawnSync('gh', ['pr', 'checks', String(prNumber), '--json', 'name,state,conclusion'],
      { cwd, encoding: 'utf8', timeout: 30000 });
    if (r.status !== 0) return { passed: true, reason: 'no checks / gh error — proceeding' };
    let checks; try { checks = JSON.parse(r.stdout || '[]'); } catch { checks = []; }
    if (!checks.length) return { passed: true, reason: 'no CI checks configured' };
    const pending = checks.some((c) => c.state === 'pending' || c.state === 'in_progress' || !c.conclusion);
    if (!pending) {
      const failed = checks.filter((c) => ['failure', 'cancelled', 'timed_out'].includes(c.conclusion));
      return { passed: !failed.length, reason: failed.length ? `CI failed: ${failed.map((c) => c.name).join(', ')}` : 'all checks passed' };
    }
    await new Promise((res) => setTimeout(res, CI_POLL_MS));
  }
  return { passed: false, reason: `CI timeout after ${CI_TIMEOUT_MS / 60000}m` };
}

function reviewPR(cwd) {
  const r = spawnSync('claude', ['-p', '/code-review medium --comment', '--dangerously-skip-permissions'],
    { cwd, encoding: 'utf8', timeout: 5 * 60 * 1000, env: { ...process.env } });
  const output = (r.stdout || '').trim() || '(no output)';
  return { output, critical: CRITICAL_PATTERNS.some((p) => p.test(output)) };
}

async function pool(fns, limit) {
  const results = new Array(fns.length); let next = 0;
  async function worker() { while (next < fns.length) { const i = next++; results[i] = await fns[i](); } }
  await Promise.all(Array.from({ length: Math.min(limit, fns.length) }, worker));
  return results;
}

// ── one inner-loop pass ────────────────────────────────────────────────────────
async function runOnce(projectDir, opts = {}) {
  const d3Dir = path.join(projectDir, '.d3');
  if (!fs.existsSync(d3Dir)) { console.error(`No .d3 directory at ${projectDir}`); process.exit(2); }

  // 1) Admission gate — load nodes + run the v2 integrity checks
  const { nodes, errors, warns } = buildIndex(d3Dir, { quiet: true });
  console.log('\nD3 RUN — single inner-loop pass (BUILD ↔ PROVE)');
  console.log('================================================');
  console.log(`graph: ${nodes.length} nodes · integrity: ${errors.length} error(s), ${warns.length} warning(s)`);
  if (errors.length && !opts.noGate) {
    for (const e of errors) console.log(`  [ERROR] ${e.code}: ${e.message}`);
    console.log('\nAdmission gate FAILED — a broken graph never spawns agents. Fix the above (or pass --no-gate).');
    process.exit(1);
  }

  // 2) Select ready + unblocked + not-gated directives
  const { buildable, blocked, gated } = selectBuildable(nodes, opts.target);
  console.log(`\nready & buildable: ${buildable.length}  ·  blocked: ${blocked.length}  ·  gated (need sign-off): ${gated.length}`);
  for (const d of buildable) console.log(`  ▸ ${d.id}  ${d.title}  [${branchFor(d)}]`);
  for (const d of blocked)   console.log(`  ⏸ ${d.id}  ${d.title}  (${d.reason})`);
  for (const d of gated)     console.log(`  🔒 ${d.id}  ${d.title}  (${d.reason})`);

  if (!buildable.length) { console.log('\nNothing ready to build. Done.'); return; }

  // 3) Dry run — show the plan + a brief preview, touch nothing
  if (opts.dryRun) {
    const sample = buildable[0];
    const brief = buildBrief(sample, nodes, projectDir);
    console.log(`\n--dry-run: nothing executed. Brief preview for ${sample.id} (${brief.length} chars):`);
    console.log('────────────────────────────────────────────────────────');
    console.log(cap(brief, 1600));
    console.log('────────────────────────────────────────────────────────');
    return;
  }

  // 4) Real pass — build them
  const results = await executeBuild(projectDir, nodes, buildable, opts, (m) => console.log(m));
  const merged = results.filter((r) => r.ok && r.pr && !r.critical && r.ci?.passed !== false);
  console.log('\nPASS COMPLETE');
  console.log('=============');
  console.log(`built: ${results.length} · merged-clean: ${merged.length} · needs-review: ${results.filter((r) => r.critical).length} · failed: ${results.filter((r) => !r.ok || !r.pr).length}`);
  console.log('Re-run `d3 index` to refresh the derived index, then `d3 tree` to see rollups.');
}

// Claim → BUILD → PROVE → status, in parallel. Shared by the single pass and the
// daemon's inner tick. `log` is a sink so the daemon can stay quiet / buffer.
function toolsPresent(projectDir) {
  for (const bin of ['claude', 'gh']) { try { git(`which ${bin}`, projectDir); } catch { return bin; } }
  return null;
}

async function executeBuild(projectDir, nodes, buildable, opts = {}, log = () => {}) {
  const d3Dir = path.join(projectDir, '.d3');
  const missing = toolsPresent(projectDir);
  if (missing) {
    log(`\n'${missing}' not found in PATH — required to build (use --dry-run to preview).`);
    if (!opts.daemon) process.exit(1);
    return [];
  }

  for (const d of buildable) setNodeStatus(projectDir, d, 'in-progress', { branch: branchFor(d) });

  const tasks = buildable.map((directive) => async () => {
    const branch = branchFor(directive);
    let worktree;
    try {
      worktree = createWorktree(projectDir, branch);
      log(`[${directive.id}] agent running (≤${TIMEOUT_MS / 60000}m)…`);
      const res = await runAgent(buildBrief(directive, nodes, projectDir), worktree);
      if (!(res.ok && res.pr)) {
        log(`[${directive.id}] ✗ ${res.reason}${res.pr ? '' : ' (no PR detected)'} — back to ready`);
        setNodeStatus(projectDir, directive, 'ready', { branch: null });
        removeWorktree(projectDir, worktree);
        return { directive, ...res };
      }
      log(`[${directive.id}] PR #${res.pr} — waiting for CI…`);
      const ci = await waitForCI(res.pr, worktree);
      if (!ci.passed) {
        log(`[${directive.id}] ✗ ${ci.reason}`);
        setNodeStatus(projectDir, directive, 'ci-failed', { pr: res.pr });
        removeWorktree(projectDir, worktree);
        return { directive, ...res, ci };
      }
      log(`[${directive.id}] CI ✓ — adversarial review…`);
      const { output, critical } = reviewPR(worktree);
      if (critical) {
        const lesson = saveLesson(projectDir, directive, res.pr, output);
        log(`[${directive.id}] ⚠ CRITICAL → needs-review · lesson: ${lesson}`);
        setNodeStatus(projectDir, directive, 'needs-review', { pr: res.pr });
      } else {
        log(`[${directive.id}] ✓ clean → complete (PR #${res.pr})`);
        setNodeStatus(projectDir, directive, 'complete', { pr: res.pr });
        appendChangelog(projectDir, directive, res.pr);
      }
      removeWorktree(projectDir, worktree);
      return { directive, ...res, ci, critical };
    } catch (err) {
      if (worktree) removeWorktree(projectDir, worktree);
      setNodeStatus(projectDir, directive, 'ready', { branch: null });
      return { directive, ok: false, reason: err.message, pr: null };
    }
  });

  const results = await pool(tasks, opts.concurrency || MAX_CONCURRENT);
  buildIndex(d3Dir, { quiet: true }); // keep the derived index current after status writes
  return results;
}

// ── the continuous daemon (three tickers + dashboard) ─────────────────────────
// Loads the graph, runs the integrity gate, and returns { nodes, board, errors }.
function snapshot(projectDir, state) {
  const d3Dir = path.join(projectDir, '.d3');
  const { nodes, errors } = buildIndex(d3Dir, { quiet: true });
  const board = runner.computeBoard(nodes, { ...state, integrityErrors: errors.length });
  return { nodes, board, errors };
}

async function startDaemon(projectDir, opts = {}) {
  const d3Dir = path.join(projectDir, '.d3');
  if (!fs.existsSync(d3Dir)) { console.error(`No .d3 directory at ${projectDir}`); process.exit(2); }
  const cfg = runner.loadConfig(d3Dir);
  const state = {
    startedAt: Date.now(),
    autonomy: opts.autonomy || cfg.autonomy,
    paused: false,
    outer: null,
    lastGitHead: gitHead(projectDir),
    nextMiddleAt: 0,
    selectedIndex: 0,
  };

  // ── --print: render the dashboard once and exit (headless / CI / piping) ──────
  if (opts.print) {
    const { board } = snapshot(projectDir, state);
    console.log(runner.renderBoard(board, { interactive: false }));
    return;
  }

  // ── single-instance lock ──────────────────────────────────────────────────────
  const lk = runner.acquireLock(d3Dir, { autonomy: state.autonomy });
  if (!lk.ok) {
    console.log(`\n⚠  Another d3 runner is already live (pid ${lk.held.pid}, started ${lk.held.started}).`);
    console.log('   Stop it there, or `kill ' + lk.held.pid + '` to take over. (Single instance keeps the graph safe.)');
    process.exit(1);
  }

  let stopping = false;
  const shutdown = (signal) => {
    if (stopping) return; stopping = true;
    if (process.stdout.isTTY) process.stdout.write('\x1b[?25h'); // show cursor
    process.stdout.write('\n');
    console.log(`\nShutting down (${signal})… releasing lock, leaving in-flight PRs intact.`);
    runner.releaseLock(d3Dir);
    if (process.stdin.isTTY) { try { process.stdin.setRawMode(false); } catch {} process.stdin.pause(); }
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // ── interactive keys (fool-proof: numbers act, never recall a command) ────────
  const tty = process.stdin.isTTY && !opts.noTty;
  if (tty) {
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
    process.stdin.on('data', async (key) => {
      if (key === '' || key === 'q') return shutdown('quit');
      const { board } = snapshot(projectDir, state);
      if (key === 'p') { state.paused = !state.paused; draw(projectDir, state); return; }
      if (key === 'r') { draw(projectDir, state); return; }
      if (key === 'a') { cycleAutonomy(d3Dir, state); draw(projectDir, state); return; }

      // Arrow key navigation
      if (key === KEY_UP) {
        state.selectedIndex = Math.max(0, state.selectedIndex - 1);
        draw(projectDir, state); return;
      }
      if (key === KEY_DOWN) {
        state.selectedIndex = Math.min(Math.max(0, board.needsYou.length - 1), state.selectedIndex + 1);
        draw(projectDir, state); return;
      }

      // Enter — run the currently selected action
      if (key === KEY_ENTER) {
        const action = runner.actionForIndex(board, state.selectedIndex);
        if (action) {
          if (toolsPresent(projectDir)) { state.outer = `cannot run ${action.command}: claude not in PATH`; draw(projectDir, state); return; }
          console.log(`\n▸ running ${action.command} …`);
          spawnSync('claude', ['-p', action.command, '--dangerously-skip-permissions'],
            { cwd: projectDir, stdio: 'inherit', env: { ...process.env } });
          draw(projectDir, state);
        }
        return;
      }

      // Number key fallback
      const action = runner.actionForKey(board, key);
      if (action) {
        if (toolsPresent(projectDir)) { state.outer = `cannot run ${action.command}: claude not in PATH`; draw(projectDir, state); return; }
        console.log(`\n▸ running ${action.command} …`);
        spawnSync('claude', ['-p', action.command, '--dangerously-skip-permissions'],
          { cwd: projectDir, stdio: 'inherit', env: { ...process.env } });
        draw(projectDir, state);
      }
    });
  }

  if (process.stdout.isTTY) process.stdout.write('\x1b[?25l'); // hide cursor for clean TUI
  draw(projectDir, state);

  // ── the three tickers ──────────────────────────────────────────────────────────
  let backoff = 0;
  while (!stopping) {
    // OUTER (event): a new commit since last look → suggest /learn git
    const head = gitHead(projectDir);
    if (head && head !== state.lastGitHead) {
      state.lastGitHead = head;
      state.outer = `new commit detected → suggest: ${cfg.outerLoop.onGitPush}  (advisory)`;
    }

    // INNER (fast): build ready+unblocked work unless paused
    let built = 0;
    if (!state.paused) {
      const { nodes, board, errors } = snapshot(projectDir, state);
      if (errors.length) {
        state.outer = `admission gate: ${errors.length} integrity error(s) — building held until fixed`;
      } else if (board.queue.ready.length && state.autonomy !== 'off') {
        if (opts.dryRun) {
          state.outer = `--dry-run: would build ${board.queue.ready.map((d) => d.id).join(', ')}`;
        } else {
          const results = await executeBuild(projectDir, nodes, board.queue.ready, { ...opts, daemon: true }, () => {});
          built = results.length;
        }
      }
    }

    // MIDDLE (slow): rollup happens implicitly in computeBoard; redraw shows it.
    draw(projectDir, state);

    // idle backoff when nothing was built; reset to fast when work flowed
    backoff = built ? 0 : runner.nextBackoff(backoff, cfg);
    const wait = built ? cfg.idleBackoff.startMs : backoff;
    if (opts.maxTicks && (state._ticks = (state._ticks || 0) + 1) >= opts.maxTicks) break;
    await new Promise((r) => setTimeout(r, wait));
  }
  runner.releaseLock(d3Dir);
}

function gitHead(projectDir) {
  try { return git('git rev-parse HEAD', projectDir); } catch { return null; }
}

function cycleAutonomy(d3Dir, state) {
  const order = ['inner-only', 'inner-middle', 'full'];
  state.autonomy = order[(order.indexOf(state.autonomy) + 1) % order.length];
  runner.saveConfigKey(d3Dir, 'autonomy', state.autonomy);
}

function draw(projectDir, state) {
  const { board } = snapshot(projectDir, state);
  if (process.stdout.isTTY) process.stdout.write('\x1b[2J\x1b[H'); // clear + home
  const selectedIndex = board.needsYou.length ? (state.selectedIndex ?? 0) : -1;
  process.stdout.write(runner.renderBoard(board, { interactive: !!process.stdin.isTTY, selectedIndex }) + '\n');
}

// ── read-only monitor (pure observer — no autonomous build) ─────────────────────
async function startMonitor(projectDir, opts = {}) {
  const d3Dir = path.join(projectDir, '.d3');
  if (!fs.existsSync(d3Dir)) { console.error(`No .d3 directory at ${projectDir}`); process.exit(2); }

  // --print: single headless render then exit
  if (opts.print) {
    const { board } = snapshot(projectDir, { autonomy: 'off', startedAt: Date.now() });
    const cliBoard = translateToCli(board);
    console.log(runner.renderBoard(cliBoard, { interactive: false }));
    return;
  }

  const state = { startedAt: Date.now(), autonomy: 'monitor', paused: false, outer: null,
    lastGitHead: gitHead(projectDir), selectedIndex: 0 };

  let stopping = false;
  const shutdown = (signal) => {
    if (stopping) return; stopping = true;
    if (process.stdout.isTTY) process.stdout.write('\x1b[?25h');
    process.stdout.write('\n');
    runner.releaseLock(d3Dir);
    if (process.stdin.isTTY) { try { process.stdin.setRawMode(false); } catch {} process.stdin.pause(); }
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  const tty = process.stdin.isTTY && !opts.noTty;
  if (tty) {
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
    process.stdin.on('data', (key) => {
      if (key === '\x03' || key === 'q') return shutdown('quit');
      if (key === 'r') drawMonitor(projectDir, state);
    });
  }

  if (process.stdout.isTTY) process.stdout.write('\x1b[?25l');
  drawMonitor(projectDir, state);

  while (!stopping) {
    const head = gitHead(projectDir);
    if (head && head !== state.lastGitHead) {
      state.lastGitHead = head;
      state.outer = 'new commit detected — run `d3 learn git` to analyse';
      drawMonitor(projectDir, state);
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
}

// Translate slash commands to CLI commands for the monitor display
function translateToCli(board) {
  return {
    ...board,
    needsYou: board.needsYou.map(item => ({
      ...item,
      command: item.command.replace(/^\/d3:/, 'd3 '),
    })),
  };
}

function drawMonitor(projectDir, state) {
  const { board } = snapshot(projectDir, state);
  const cliBoard = translateToCli(board);
  if (process.stdout.isTTY) process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write(runner.renderBoard(cliBoard, {
    interactive: !!process.stdin.isTTY,
    monitorMode: true,
  }) + '\n');
}


// ── main ────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { once: false, monitor: false, dryRun: false, noGate: false, print: false, noTty: false,
    target: null, concurrency: null, autonomy: null, maxTicks: null, projectDir: process.cwd() };
  for (const a of argv) {
    if (a === '--monitor') opts.monitor = true;
    else if (a === '--once') opts.once = true;
    else if (a === '--dry-run' || a === '--plan') opts.dryRun = true;
    else if (a === '--no-gate') opts.noGate = true;
    else if (a === '--print' || a === '--status') opts.print = true;
    else if (a === '--no-tty') opts.noTty = true;
    else if (a.startsWith('--concurrency=')) opts.concurrency = parseInt(a.split('=')[1], 10);
    else if (a.startsWith('--autonomy=')) opts.autonomy = a.split('=')[1];
    else if (a.startsWith('--max-ticks=')) opts.maxTicks = parseInt(a.split('=')[1], 10);
    else if (/^(DIR|DIRECTIVE)-\d+$/i.test(a)) opts.target = a;
    else if (!a.startsWith('-')) opts.projectDir = a; // first bare arg = project dir (from bin/d3.js)
  }
  return opts;
}

async function main(argv) {
  const opts = parseArgs(argv);
  if (opts.once)    return runOnce(opts.projectDir, opts);    // single build pass
  if (opts.monitor) return startMonitor(opts.projectDir, opts); // read-only dashboard
  return startDaemon(opts.projectDir, opts);                  // full daemon (legacy)
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((e) => { console.error('d3 run error:', e.message); process.exit(1); });
}

module.exports = { selectBuildable, buildBrief, branchFor, setNodeStatus, parseArgs, snapshot, executeBuild };
