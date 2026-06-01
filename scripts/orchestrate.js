#!/usr/bin/env node
/**
 * D3 Orchestrator — batch directive executor.
 *
 * Runs ready directives outside Claude's context window, eliminating context
 * accumulation for large sprints. Each directive gets an isolated git worktree
 * and a dedicated `claude --print` process. Results are written to TASKS.md
 * and CHANGELOG.md incrementally as each agent completes.
 *
 * Usage:
 *   node scripts/orchestrate.js                  # all ready directives
 *   node scripts/orchestrate.js DIRECTIVE-055    # single directive
 *   node scripts/orchestrate.js --dry-run        # preview without executing
 *   D3_CONCURRENCY=6 node scripts/orchestrate.js # override concurrency
 *
 * Requirements:
 *   - `claude` CLI in PATH, authenticated
 *   - `gh` CLI in PATH, authenticated (for PR creation by agents)
 *   - Git repo with a clean main branch
 */

'use strict';

const { spawn, spawnSync, execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT          = path.resolve(__dirname, '..');
const TASKS_PATH    = path.join(ROOT, 'TASKS.md');
const CHANGELOG_PATH = path.join(ROOT, 'CHANGELOG.md');
const WORKTREES_DIR = path.join(ROOT, '.claude', 'worktrees');
const MAX_CONCURRENT = parseInt(process.env.D3_CONCURRENCY || '4', 10);
const TIMEOUT_MS     = parseInt(process.env.D3_TIMEOUT_MS  || String(15 * 60 * 1000), 10);

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const TARGET  = args.find(a => /^DIRECTIVE-\d+$/i.test(a));

// ── Helpers ───────────────────────────────────────────────────────────────────

function die(msg) { console.error(`\nERROR: ${msg}`); process.exit(1); }

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', ...opts }).trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function branchFor(directive) {
  const slug = directive.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-').slice(0, 5).join('-');
  return `feature/${directive.id.toLowerCase()}-${slug}`;
}

// ── TASKS.md parser ───────────────────────────────────────────────────────────

function parseReadyDirectives(content) {
  const out = [];
  const re  = /### (DIRECTIVE-(\d+)):\s+(.+?)\n([\s\S]*?)(?=\n### DIRECTIVE-|\n## |$)/g;
  let m;

  while ((m = re.exec(content)) !== null) {
    const [, id, , title, body] = m;
    const status = (body.match(/\*\*Status:\*\*\s*(.+)/) || [])[1]?.trim() ?? '';
    if (!status.startsWith('ready')) continue;
    if (TARGET && id.toLowerCase() !== TARGET.toLowerCase()) continue;

    out.push({
      id,
      title:       title.trim(),
      agent:       (body.match(/\*\*Agent:\*\*\s*(.+)/)   || [])[1]?.trim() ?? 'general-purpose',
      services:    (body.match(/\*\*Services:\*\*\s*(.+)/) || [])[1]?.trim() ?? '',
      description: (body.match(/\*\*Added:\*\*[^\n]*\n\n([\s\S]*?)\n\*\*Done when/)  || [])[1]?.trim() ?? '',
      doneWhen:    (body.match(/\*\*Done when:\*\*\n([\s\S]*?)(?:\n---|$)/) || [])[1]?.trim() ?? '',
    });
  }

  return out;
}

// ── Brief construction ────────────────────────────────────────────────────────

function readServiceContext(services) {
  const map = {
    Express: 'api-express/CLAUDE.md',
    Python:  'api-python/CLAUDE.md',
    React:   'client/CLAUDE.md',
  };

  return Object.entries(map)
    .filter(([name]) => services.includes(name))
    .map(([name, rel]) => {
      const full = path.join(ROOT, rel);
      if (!fs.existsSync(full)) return null;
      return `### ${name} reference (${rel})\n${fs.readFileSync(full, 'utf8')}`;
    })
    .filter(Boolean)
    .join('\n\n---\n\n');
}

function buildBrief(directive) {
  const branch         = branchFor(directive);
  const rootContext    = fs.existsSync(path.join(ROOT, 'CLAUDE.md'))
                          ? fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8') : '';
  const serviceContext = readServiceContext(directive.services);

  return [
    '## Identity',
    '| Field         | Value |',
    '|---------------|-------|',
    `| Task ID       | ${directive.id} |`,
    `| Title         | ${directive.title} |`,
    `| Branch        | ${branch} |`,
    `| Services      | ${directive.services} |`,
    '| Parallel-safe | yes |',
    '',
    '## What to build',
    directive.description,
    '',
    '## Checklist',
    directive.doneWhen,
    '',
    '## Out of scope',
    '- Do not edit TASKS.md, TASK.template.md, or any .claude/ file',
    '- Do not modify other directives or tasks',
    '',
    '## Reference patterns',
    serviceContext || '(No service context — infer from project CLAUDE.md below.)',
    '',
    '## Project context',
    rootContext,
    '',
    '## Definition of done',
    '- All checklist items complete',
    '- No console.log / print debug statements in production paths',
    '- No hardcoded secrets, URLs, or credentials',
    `- Open a PR against main — title must be: ${directive.id}: ${directive.title}`,
  ].join('\n');
}

// ── Worktree management ───────────────────────────────────────────────────────

function createWorktree(branch) {
  fs.mkdirSync(WORKTREES_DIR, { recursive: true });
  const dest = path.join(WORKTREES_DIR, branch.replace(/\//g, '_'));
  try {
    run(`git worktree add "${dest}" -b "${branch}"`);
  } catch {
    // Branch already exists — attach to it
    run(`git worktree add "${dest}" "${branch}"`);
  }
  return dest;
}

function removeWorktree(dest) {
  try { run(`git worktree remove --force "${dest}"`); } catch {}
  try { run('git worktree prune'); } catch {}
}

// ── Agent runner ──────────────────────────────────────────────────────────────

function reviewPR(pr, worktreePath) {
  const result = spawnSync(
    'claude',
    ['-p', '/code-review medium --comment', '--dangerously-skip-permissions'],
    { cwd: worktreePath, encoding: 'utf8', timeout: 5 * 60 * 1000, env: { ...process.env } }
  );
  return (result.stdout || '').trim() || (result.stderr ? `(stderr: ${result.stderr.slice(0, 300)})` : '(no output)');
}

function runAgent(directive, worktreePath) {
  return new Promise(resolve => {
    const brief  = buildBrief(directive);
    const stdout = [];
    const stderr = [];

    // Pass brief as -p argument — avoids stdin piping uncertainty for long prompts
    const proc = spawn('claude', ['-p', brief, '--dangerously-skip-permissions'], {
      cwd:   worktreePath,
      env:   { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.stdout.on('data', d => stdout.push(d.toString()));
    proc.stderr.on('data', d => stderr.push(d.toString()));

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      resolve({ directive, ok: false, reason: 'timeout', out: stdout.join(''), pr: null });
    }, TIMEOUT_MS);

    proc.on('close', code => {
      clearTimeout(timer);
      const out = stdout.join('');
      const prMatch = out.match(/(?:PR|pull request)[# ]+(\d+)|\/pull\/(\d+)|Created[^#]*#(\d+)/i);
      const pr = prMatch ? (prMatch[1] ?? prMatch[2] ?? prMatch[3]) : null;
      resolve({ directive, ok: code === 0, reason: code === 0 ? 'ok' : `exit ${code}`, out, pr });
    });
  });
}

// ── Record-keeping ────────────────────────────────────────────────────────────

function updateTasksStatus(id, replacement) {
  const content = fs.readFileSync(TASKS_PATH, 'utf8');
  fs.writeFileSync(TASKS_PATH,
    content.replace(
      new RegExp(`(### ${id}:[\\s\\S]*?\\*\\*Status:\\*\\*)\\s*\\S[^\\n]*`),
      `$1 ${replacement}`
    )
  );
}

function appendChangelog(directive, pr) {
  let content = fs.readFileSync(CHANGELOG_PATH, 'utf8');
  const entry  = `- ${directive.id}: ${directive.title}. (PR #${pr})\n`;
  const header = `## ${today()}`;

  if (content.includes(header)) {
    content = content.replace(header + '\n', header + '\n' + entry);
  } else {
    const idx = content.indexOf('\n## ');
    content = idx !== -1
      ? content.slice(0, idx + 1) + header + '\n' + entry + '\n' + content.slice(idx + 1)
      : content + '\n' + header + '\n' + entry;
  }

  fs.writeFileSync(CHANGELOG_PATH, content);
}

// ── Concurrency pool ──────────────────────────────────────────────────────────

async function pool(fns, limit) {
  const results = new Array(fns.length);
  let next = 0;

  async function worker() {
    while (next < fns.length) {
      const i = next++;
      results[i] = await fns[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, fns.length) }, worker));
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Preflight checks
  try { run('which claude'); } catch { die('`claude` not found in PATH — install with: npm install -g @anthropic-ai/claude-code'); }
  try { run('which gh');     } catch { die('`gh` not found in PATH — install GitHub CLI'); }

  const directives = parseReadyDirectives(fs.readFileSync(TASKS_PATH, 'utf8'));

  if (directives.length === 0) {
    console.log('No ready directives found. Nothing to execute.');
    process.exit(0);
  }

  // Header
  console.log('\nD3 ORCHESTRATOR');
  console.log('================');
  console.log(`Directives: ${directives.length}  |  Concurrency: ${MAX_CONCURRENT}  |  Timeout: ${TIMEOUT_MS / 60000}m  |  Dry-run: ${DRY_RUN}`);
  console.log('');
  for (const d of directives) {
    console.log(`  ${d.id}  ${d.title}`);
    console.log(`    Agent: ${d.agent}  |  Services: ${d.services || 'unspecified'}`);
    console.log(`    Branch: ${branchFor(d)}`);
  }

  if (DRY_RUN) { console.log('\nDry run — nothing executed.'); process.exit(0); }

  // Mark all in-progress upfront
  for (const d of directives) {
    updateTasksStatus(d.id, `in-progress — branch: ${branchFor(d)}`);
  }

  console.log('\nSpawning agents...\n');

  const tasks = directives.map(directive => async () => {
    const branch = branchFor(directive);
    let worktree;

    try {
      console.log(`[${directive.id}] Creating worktree on ${branch}...`);
      worktree = createWorktree(branch);

      console.log(`[${directive.id}] Agent running (timeout ${TIMEOUT_MS / 60000}m)...`);
      const result = await runAgent(directive, worktree);

      if (result.ok && result.pr) {
        console.log(`[${directive.id}] ✓  PR #${result.pr}`);
        updateTasksStatus(directive.id, `complete — PR #${result.pr} · ${today()}`);
        appendChangelog(directive, result.pr);
        return { ...result, worktree }; // Keep worktree alive for adversarial review
      } else {
        console.log(`[${directive.id}] ✗  ${result.reason}${result.pr ? '' : ' (no PR detected)'}`);
        updateTasksStatus(directive.id, 'ready'); // Revert so it can be re-run
        removeWorktree(worktree);
        return { ...result, worktree: null };
      }
    } catch (err) {
      if (worktree) removeWorktree(worktree);
      updateTasksStatus(directive.id, 'ready');
      return { directive, ok: false, reason: err.message, pr: null, worktree: null };
    }
  });

  const results = await pool(tasks, MAX_CONCURRENT);

  // ── Adversarial review ──────────────────────────────────────────────────────
  const reviewable = results.filter(r => r.ok && r.pr && r.worktree);
  if (reviewable.length > 0) {
    console.log(`\nADVERSARIAL REVIEW — ${reviewable.length} PR${reviewable.length > 1 ? 's' : ''}`);
    console.log('='.repeat(40));
    for (const r of reviewable) {
      console.log(`\n[${r.directive.id}] Reviewing PR #${r.pr}...`);
      console.log(reviewPR(r.pr, r.worktree));
    }
  }

  // ── Clean up remaining worktrees ────────────────────────────────────────────
  for (const r of results) {
    if (r.worktree) removeWorktree(r.worktree);
  }

  const passed = results.filter(r => r.ok && r.pr);
  const failed = results.filter(r => !r.ok || !r.pr);

  console.log('\nORCHESTRATION COMPLETE');
  console.log('======================');
  console.log(`Directives run:   ${results.length}`);
  console.log(`PRs opened:       ${passed.length}`);
  console.log(`PRs reviewed:     ${reviewable.length}`);
  console.log(`Failed / no PR:   ${failed.length}`);

  if (passed.length > 0) {
    console.log('\nSucceeded:');
    for (const r of passed) console.log(`  ${r.directive.id} — ${r.directive.title}  (PR #${r.pr})`);
  }
  if (failed.length > 0) {
    console.log('\nFailed (review manually):');
    for (const r of failed) console.log(`  ${r.directive.id} — ${r.directive.title}  (${r.reason})`);
  }

  console.log('\nNext: merge PRs with /execute, then /sync-docs');
}

main().catch(err => { console.error('Orchestrator error:', err.message); process.exit(1); });
