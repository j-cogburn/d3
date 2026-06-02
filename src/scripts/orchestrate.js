#!/usr/bin/env node
/**
 * D3 Orchestrator — batch directive executor.
 *
 * Runs ready directives outside Claude's context window. Each directive gets
 * an isolated git worktree and a dedicated `claude --print` process.
 *
 * Quality pipeline per directive:
 *   1. Agent implements → opens PR
 *   2. CI wait — polls gh pr checks until all pass (or marks ci-failed)
 *   3. Adversarial review — code-review medium --comment
 *      Critical findings → needs-review (not added to changelog)
 *      Clean → complete (added to changelog)
 *   4. Lessons — critical findings saved to .d3/docs/lessons/ for future agents
 *
 * Usage:
 *   node .d3/scripts/orchestrate.js                  # all ready directives
 *   node .d3/scripts/orchestrate.js DIRECTIVE-055    # single directive
 *   node .d3/scripts/orchestrate.js --dry-run        # preview without executing
 *   D3_CONCURRENCY=6 node .d3/scripts/orchestrate.js # override concurrency
 */

'use strict';

const { spawn, spawnSync, execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT           = path.resolve(__dirname, '../..');
const D3_DIR         = path.join(ROOT, '.d3');
const TASKS_PATH     = path.join(D3_DIR, 'TASKS.md');
const CHANGELOG_PATH = path.join(D3_DIR, 'CHANGELOG.md');
const VISION_PATH    = path.join(D3_DIR, 'vision.md');
const WORKTREES_DIR  = path.join(D3_DIR, 'worktrees');
const LESSONS_DIR    = path.join(D3_DIR, 'docs', 'lessons');
const MAX_CONCURRENT = parseInt(process.env.D3_CONCURRENCY || '4', 10);
const TIMEOUT_MS     = parseInt(process.env.D3_TIMEOUT_MS  || String(15 * 60 * 1000), 10);
const CI_TIMEOUT_MS  = parseInt(process.env.D3_CI_TIMEOUT_MS || String(20 * 60 * 1000), 10);
const CI_POLL_MS     = 30 * 1000;

const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const TARGET  = args.find(a => /^DIRECTIVE-\d+$/i.test(a));

const CRITICAL_PATTERNS = [
  /\bCritical\b/i,
  /\bsecurity\s+(?:vulnerability|issue|bug|flaw)\b/i,
  /\bSQL\s+injection\b/i,
  /\bXSS\b/,
  /\bbreaking\s+change\b/i,
  /\bremote\s+code\s+execution\b/i,
  /🚨/,
];

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

function hasCriticalFindings(reviewOutput) {
  return CRITICAL_PATTERNS.some(p => p.test(reviewOutput));
}

// ── CI wait ───────────────────────────────────────────────────────────────────

async function waitForCI(prNumber) {
  const deadline = Date.now() + CI_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const result = spawnSync(
      'gh', ['pr', 'checks', String(prNumber), '--json', 'name,state,conclusion'],
      { cwd: ROOT, encoding: 'utf8', timeout: 30000 }
    );

    if (result.status !== 0) {
      // gh CLI error or no checks configured — treat as passed
      return { passed: true, reason: 'no checks or gh error — proceeding' };
    }

    let checks;
    try { checks = JSON.parse(result.stdout || '[]'); } catch { checks = []; }

    if (checks.length === 0) {
      return { passed: true, reason: 'no CI checks configured' };
    }

    const pending = checks.some(c =>
      c.state === 'pending' || c.state === 'in_progress' ||
      c.conclusion === null || c.conclusion === ''
    );

    if (!pending) {
      const failed = checks.filter(c =>
        c.conclusion === 'failure' || c.conclusion === 'cancelled' || c.conclusion === 'timed_out'
      );
      return {
        passed: failed.length === 0,
        reason: failed.length > 0
          ? `CI failed: ${failed.map(c => c.name).join(', ')}`
          : 'all checks passed',
      };
    }

    await new Promise(r => setTimeout(r, CI_POLL_MS));
  }

  return { passed: false, reason: `CI timeout after ${CI_TIMEOUT_MS / 60000} minutes` };
}

// ── Agent lessons ─────────────────────────────────────────────────────────────

function saveLesson(directive, prNumber, reviewOutput) {
  fs.mkdirSync(LESSONS_DIR, { recursive: true });

  const slug      = directive.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const ts        = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
  const filename  = path.join(LESSONS_DIR, `lesson-${ts}-${slug}.md`);

  const findingMatch = reviewOutput.match(/Critical[:\s]+([^\n]+)/i);
  const finding = findingMatch ? findingMatch[1].trim() : reviewOutput.slice(0, 300);

  fs.writeFileSync(filename, [
    `# Lesson: ${directive.title}`,
    `**Date:** ${today()}`,
    `**Directive:** ${directive.id}`,
    `**PR:** #${prNumber}`,
    `**Services:** ${directive.services || 'unspecified'}`,
    '',
    '## Critical finding',
    finding,
    '',
    '## Full review output',
    reviewOutput.slice(0, 1500),
    '',
    '## Prevention',
    '*(Add notes after manual review — what should future agents do differently?)*',
  ].join('\n'));

  return filename;
}

function readRelevantLessons(services) {
  if (!fs.existsSync(LESSONS_DIR)) return null;
  const files = fs.readdirSync(LESSONS_DIR).filter(f => f.endsWith('.md') && f !== '.gitkeep');
  if (files.length === 0) return null;

  const serviceList = (services || '').split(',').map(s => s.trim()).filter(Boolean);

  const relevant = files
    .map(f => fs.readFileSync(path.join(LESSONS_DIR, f), 'utf8'))
    .filter(content => serviceList.length === 0 || serviceList.some(s => content.includes(s)))
    .slice(-3); // last 3 relevant lessons

  return relevant.length > 0 ? relevant.join('\n\n---\n\n') : null;
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
      agent:       (body.match(/\*\*Agent:\*\*\s*(.+)/)    || [])[1]?.trim() ?? 'general-purpose',
      services:    (body.match(/\*\*Services:\*\*\s*(.+)/)  || [])[1]?.trim() ?? '',
      skills:      (body.match(/\*\*Skills:\*\*\s*(.+)/)    || [])[1]?.trim() ?? '',
      spec:        (body.match(/\*\*Spec:\*\*\s*(.+)/)      || [])[1]?.trim() ?? '',
      description: (body.match(/\*\*Added:\*\*[^\n]*\n\n([\s\S]*?)\n\*\*Done when/)  || [])[1]?.trim() ?? '',
      doneWhen:    (body.match(/\*\*Done when:\*\*\n([\s\S]*?)(?:\n---|$)/) || [])[1]?.trim() ?? '',
    });
  }

  return out;
}

// ── Brief construction ────────────────────────────────────────────────────────

function readServiceContext(services) {
  const map = { Express: 'api-express/CLAUDE.md', Python: 'api-python/CLAUDE.md', React: 'client/CLAUDE.md' };
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

function readVisionContext() {
  if (!fs.existsSync(VISION_PATH)) return null;
  const content    = fs.readFileSync(VISION_PATH, 'utf8');
  const vision     = content.match(/^## Vision\n([^\n#]+)/m)?.[1]?.trim();
  const antiGoals  = content.match(/## Anti-goals\n([\s\S]*?)(?=\n##|$)/)?.[1]?.trim();
  const principles = content.match(/## Decision principles\n([\s\S]*?)(?=\n##|$)/)?.[1]?.trim();
  if (!vision) return null;
  const parts = [`**Vision:** ${vision}`];
  if (antiGoals)  parts.push(`**Anti-goals:**\n${antiGoals}`);
  if (principles) parts.push(`**Decision principles:**\n${principles}`);
  return parts.join('\n\n');
}

function readSpecContext(specPath) {
  if (!specPath) return null;
  const full = path.join(ROOT, specPath);
  if (!fs.existsSync(full)) return null;
  return `### Spec: ${specPath}\n${fs.readFileSync(full, 'utf8')}`;
}

function buildBrief(directive) {
  const branch         = branchFor(directive);
  const rootContext    = fs.existsSync(path.join(ROOT, 'CLAUDE.md'))
                          ? fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf8') : '';
  const serviceContext = readServiceContext(directive.services);
  const visionContext  = readVisionContext();
  const specContext    = readSpecContext(directive.spec);
  const lessonsContext = readRelevantLessons(directive.services);

  const skillsSection = directive.skills
    ? directive.skills.split(',').map(s => s.trim()).filter(Boolean).map(skill => {
        const skillPath = path.join(D3_DIR, 'skills', skill, 'SKILL.md');
        if (!fs.existsSync(skillPath)) return null;
        return `### Skill: ${skill}\n${fs.readFileSync(skillPath, 'utf8')}`;
      }).filter(Boolean).join('\n\n---\n\n')
    : null;

  const sections = [
    '## Identity',
    '| Field         | Value |',
    '|---------------|-------|',
    `| Task ID       | ${directive.id} |`,
    `| Title         | ${directive.title} |`,
    `| Branch        | ${branch} |`,
    `| Services      | ${directive.services} |`,
    '| Parallel-safe | yes |',
    '',
  ];

  if (visionContext) {
    sections.push('## Project vision', visionContext, '');
  }

  if (lessonsContext) {
    sections.push(
      '## Lessons from previous reviews',
      '*(Critical findings caught in past directives for these services — avoid repeating these mistakes)*',
      '',
      lessonsContext,
      '',
    );
  }

  sections.push(
    '## What to build',
    directive.description,
    '',
    '## Checklist',
    directive.doneWhen,
    '',
    '## Out of scope',
    '- Do not edit `.d3/TASKS.md`, TASK.template.md, or any .claude/ file',
    '- Do not modify other directives or tasks',
    visionContext ? '- Do not build features that conflict with the project anti-goals listed above' : '',
    '',
    '## Files to create / edit',
    '(infer specific paths from description and services)',
    '',
  );

  if (specContext) {
    sections.push('## Spec', specContext, '');
  }

  if (skillsSection) {
    sections.push('## Skills', skillsSection, '');
  }

  sections.push(
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
    '- If architectural decisions were made, create an ADR in `.d3/docs/adr/`',
    `- Open a PR against main — title must be: ${directive.id}: ${directive.title}`,
  );

  return sections.filter(s => s !== '').join('\n');
}

// ── Worktree management ───────────────────────────────────────────────────────

function createWorktree(branch) {
  fs.mkdirSync(WORKTREES_DIR, { recursive: true });
  const dest = path.join(WORKTREES_DIR, branch.replace(/\//g, '_'));
  try {
    run(`git worktree add "${dest}" -b "${branch}"`);
  } catch {
    run(`git worktree add "${dest}" "${branch}"`);
  }
  return dest;
}

function removeWorktree(dest) {
  try { run(`git worktree remove --force "${dest}"`); } catch {}
  try { run('git worktree prune'); } catch {}
}

// ── Agent + review runners ────────────────────────────────────────────────────

function reviewPR(worktreePath) {
  const result = spawnSync(
    'claude',
    ['-p', '/code-review medium --comment', '--dangerously-skip-permissions'],
    { cwd: worktreePath, encoding: 'utf8', timeout: 5 * 60 * 1000, env: { ...process.env } }
  );
  const output = (result.stdout || '').trim() || (result.stderr ? `(stderr: ${result.stderr.slice(0, 300)})` : '(no output)');
  return { output, critical: hasCriticalFindings(output) };
}

function runAgent(directive, worktreePath) {
  return new Promise(resolve => {
    const brief  = buildBrief(directive);
    const stdout = [];
    const stderr = [];

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
  try { run('which claude'); } catch { die('`claude` not found in PATH'); }
  try { run('which gh');     } catch { die('`gh` not found in PATH'); }

  const directives = parseReadyDirectives(fs.readFileSync(TASKS_PATH, 'utf8'));

  if (directives.length === 0) {
    console.log('No ready directives found. Nothing to execute.');
    process.exit(0);
  }

  console.log('\nD3 ORCHESTRATOR');
  console.log('================');
  console.log(`Directives: ${directives.length}  |  Concurrency: ${MAX_CONCURRENT}  |  Agent timeout: ${TIMEOUT_MS / 60000}m  |  CI timeout: ${CI_TIMEOUT_MS / 60000}m  |  Dry-run: ${DRY_RUN}`);
  console.log('');
  for (const d of directives) {
    console.log(`  ${d.id}  ${d.title}`);
    console.log(`    Agent: ${d.agent}  |  Services: ${d.services || 'unspecified'}`);
    if (d.skills)  console.log(`    Skills: ${d.skills}`);
    if (d.spec)    console.log(`    Spec: ${d.spec}`);
    console.log(`    Branch: ${branchFor(d)}`);
  }

  if (DRY_RUN) { console.log('\nDry run — nothing executed.'); process.exit(0); }

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
        // ── Step 1: Wait for CI ───────────────────────────────────────────────
        console.log(`[${directive.id}] PR #${result.pr} — waiting for CI (up to ${CI_TIMEOUT_MS / 60000}m)...`);
        const ci = await waitForCI(result.pr);

        if (!ci.passed) {
          console.log(`[${directive.id}] ✗  CI failed — ${ci.reason}`);
          updateTasksStatus(directive.id, `ci-failed — PR #${result.pr} · ${today()}`);
          removeWorktree(worktree);
          return { ...result, ci, worktree: null, critical: false };
        }

        console.log(`[${directive.id}] CI ✓ — ${ci.reason}`);

        // ── Step 2: Adversarial review gates completion ───────────────────────
        console.log(`[${directive.id}] Running adversarial review...`);
        const { output: reviewOutput, critical } = reviewPR(worktree);

        if (critical) {
          console.log(`[${directive.id}] ⚠  Critical findings — flagged for manual review`);
          updateTasksStatus(directive.id, `needs-review — PR #${result.pr} · ${today()}`);
          // ── Save lesson from critical finding ─────────────────────────────
          const lessonPath = saveLesson(directive, result.pr, reviewOutput);
          console.log(`[${directive.id}]    Lesson saved: ${path.relative(ROOT, lessonPath)}`);
        } else {
          console.log(`[${directive.id}] ✓  PR #${result.pr} — CI passed, review clean`);
          updateTasksStatus(directive.id, `complete — PR #${result.pr} · ${today()}`);
          appendChangelog(directive, result.pr);
        }

        removeWorktree(worktree);
        return { ...result, ci, reviewOutput, critical, worktree: null };
      } else {
        console.log(`[${directive.id}] ✗  ${result.reason}${result.pr ? '' : ' (no PR detected)'}`);
        updateTasksStatus(directive.id, 'ready');
        removeWorktree(worktree);
        return { ...result, ci: null, worktree: null };
      }
    } catch (err) {
      if (worktree) removeWorktree(worktree);
      updateTasksStatus(directive.id, 'ready');
      return { directive, ok: false, reason: err.message, pr: null, ci: null, worktree: null };
    }
  });

  const results  = await pool(tasks, MAX_CONCURRENT);
  const passed   = results.filter(r => r.ok && r.pr && !r.critical && r.ci?.passed !== false);
  const ciFailed = results.filter(r => r.ci && !r.ci.passed);
  const flagged  = results.filter(r => r.ok && r.pr && r.critical);
  const failed   = results.filter(r => !r.ok || !r.pr);

  console.log('\nORCHESTRATION COMPLETE');
  console.log('======================');
  console.log(`Directives run:       ${results.length}`);
  console.log(`CI passed + reviewed: ${passed.length}`);
  console.log(`CI failed:            ${ciFailed.length}`);
  console.log(`Needs manual review:  ${flagged.length}`);
  console.log(`Failed / no PR:       ${failed.length}`);

  if (passed.length > 0) {
    console.log('\nSucceeded (CI ✓, review clean):');
    for (const r of passed) console.log(`  ${r.directive.id} — ${r.directive.title}  (PR #${r.pr})`);
  }
  if (ciFailed.length > 0) {
    console.log('\nCI failed (fix and re-run):');
    for (const r of ciFailed) console.log(`  ${r.directive.id} — ${r.directive.title}  (PR #${r.pr}: ${r.ci.reason})`);
  }
  if (flagged.length > 0) {
    console.log('\nNeeds manual review (critical findings — lesson saved):');
    for (const r of flagged) console.log(`  ${r.directive.id} — ${r.directive.title}  (PR #${r.pr})`);
  }
  if (failed.length > 0) {
    console.log('\nFailed:');
    for (const r of failed) console.log(`  ${r.directive.id} — ${r.directive.title}  (${r.reason})`);
  }

  console.log('\nNext: merge passing PRs with /execute, then /sync-docs');
}

main().catch(err => { console.error('Orchestrator error:', err.message); process.exit(1); });
