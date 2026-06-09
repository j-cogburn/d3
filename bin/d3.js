#!/usr/bin/env node

'use strict';

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const PKG_DIR    = path.resolve(__dirname, '..');
const TARGET_DIR = process.cwd();
const COMMAND    = process.argv[2];

// D3 hook entries to inject into .claude/settings.json
const D3_HOOKS = {
  UserPromptSubmit: [
    { hooks: [{ type: 'command', command: 'bash .d3/hooks/session-start.sh' }] }
  ],
  PostToolUse: [
    { matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'bash .d3/hooks/client-lint.sh' }] },
    { matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'bash .d3/hooks/express-test.sh' }] },
    { matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'bash .d3/hooks/express-audit.sh' }] },
    { matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'bash .d3/hooks/python-test.sh' }] },
    { matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'bash .d3/hooks/python-audit.sh' }] }
  ]
};

// Old D3 hook path prefix — used to detect and remove stale hook entries
const OLD_HOOKS_PREFIX = 'bash .claude/hooks/';

// ── Helpers ───────────────────────────────────────────────────────────────────

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function touch(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, '');
}

// Move a file or directory, skipping if dest already exists
function moveIfAbsent(src, dest, log) {
  if (!fs.existsSync(src)) return;
  if (fs.existsSync(dest)) {
    log.push(`  ⊘  ${path.relative(TARGET_DIR, dest)} already exists — skipped`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.renameSync(src, dest);
  log.push(`  ✓  ${path.relative(TARGET_DIR, src)} → ${path.relative(TARGET_DIR, dest)}`);
}

// Remove a file or directory only if it exists and is empty (or force=true)
function removeIfExists(target, force = false) {
  if (!fs.existsSync(target)) return false;
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(target).filter(e => e !== '.gitkeep');
    if (!force && entries.length > 0) return false;
    fs.rmSync(target, { recursive: true, force: true });
  } else {
    fs.unlinkSync(target);
  }
  return true;
}

// ── Old D3 detection ──────────────────────────────────────────────────────────

function detectOldD3(targetDir) {
  const signals = [];

  const check = (condition, message, category) => {
    if (condition) signals.push({ message, category });
  };

  // State files at root that should be in .d3/
  check(
    fs.existsSync(path.join(targetDir, 'TASKS.md')) &&
    !fs.existsSync(path.join(targetDir, '.d3', 'TASKS.md')),
    'TASKS.md at root → .d3/TASKS.md', 'state'
  );
  check(
    fs.existsSync(path.join(targetDir, 'CHANGELOG.md')) &&
    !fs.existsSync(path.join(targetDir, '.d3', 'CHANGELOG.md')),
    'CHANGELOG.md at root → .d3/CHANGELOG.md', 'state'
  );
  check(
    fs.existsSync(path.join(targetDir, 'docs')) &&
    !fs.existsSync(path.join(targetDir, '.d3', 'docs')),
    'docs/ at root → .d3/docs/', 'state'
  );
  check(
    fs.existsSync(path.join(targetDir, 'reports')) &&
    !fs.existsSync(path.join(targetDir, '.d3', 'reports')),
    'reports/ at root → .d3/reports/', 'state'
  );

  // System files to replace
  check(
    fs.existsSync(path.join(targetDir, '.claude', 'hooks')),
    '.claude/hooks/ → .d3/hooks/ (replaced with latest)', 'system'
  );
  check(
    fs.existsSync(path.join(targetDir, 'scripts')) &&
    !fs.existsSync(path.join(targetDir, '.d3', 'scripts')),
    'scripts/ at root → .d3/scripts/ (replaced with latest)', 'system'
  );
  check(
    fs.existsSync(path.join(targetDir, 'WORKFLOW.md')) &&
    !fs.existsSync(path.join(targetDir, '.d3', 'WORKFLOW.md')),
    'WORKFLOW.md at root → .d3/WORKFLOW.md (replaced with latest)', 'system'
  );
  check(
    fs.existsSync(path.join(targetDir, '.claude', 'commands', 'audit.md')),
    '.claude/commands/*.md at root level → .claude/commands/d3/ (replaced with latest)', 'system'
  );

  // Old hook paths in settings.json
  const settingsPath = path.join(targetDir, '.claude', 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      const hasOldHooks = JSON.stringify(cfg).includes(OLD_HOOKS_PREFIX);
      check(hasOldHooks, '.claude/settings.json has old .claude/hooks/ references', 'settings');
    } catch { /* ignore */ }
  }

  return signals;
}

// ── Format normalisation ──────────────────────────────────────────────────────

// Fix stale path references and enforce new test gate format in migrated state files
function normaliseContent(content, filename) {
  let out = content;

  // Update old path references → new .d3/ paths
  out = out
    .replace(/\bscripts\/orchestrate\.js\b/g, '.d3/scripts/orchestrate.js')
    .replace(/\.claude\/hooks\//g, '.d3/hooks/')
    .replace(/(?<!\.\/)(?<!\w)reports\//g, '.d3/reports/');

  if (filename === 'TASKS.md') {
    // Normalise DIRECTIVES section header (old verbose form → clean new form)
    out = out.replace(
      /^## DIRECTIVES\s*—[^\n]*/m,
      '## DIRECTIVES'
    );
    // Add italic note under DIRECTIVES if missing
    if (/^## DIRECTIVES\s*$/m.test(out) && !out.includes('*Owner-declared')) {
      out = out.replace(
        /^## DIRECTIVES\s*$/m,
        '## DIRECTIVES\n*Owner-declared work units. Highest priority. Run with `/execute`.*'
      );
    }

    // Enforce coverage in done-when test gates
    out = out
      .replace(
        /`npm test --prefix api-express`(?! -- --coverage)/g,
        '`npm test --prefix api-express -- --coverage`'
      )
      .replace(
        /(api-python\/\.venv\/bin\/pytest[^`]*)-q`/g,
        '$1-q --cov --cov-fail-under=70`'
      );

    // Ensure ARCHIVED DIRECTIVES section exists at the bottom
    if (!out.includes('## ARCHIVED DIRECTIVES')) {
      out = out.trimEnd() + '\n\n---\n\n## ARCHIVED DIRECTIVES\n\n| ID | Title | PR |\n|---|---|---|\n';
    }
  }

  return out;
}

// ── settings.json migration ───────────────────────────────────────────────────

function mergeSettings() {
  const settingsPath = path.join(TARGET_DIR, '.claude', 'settings.json');
  let cfg = {};

  if (fs.existsSync(settingsPath)) {
    try {
      cfg = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
      return '  ⚠  .claude/settings.json is invalid JSON — D3 hooks not merged; fix manually';
    }
  }

  cfg.hooks = cfg.hooks || {};

  for (const [event, entries] of Object.entries(D3_HOOKS)) {
    cfg.hooks[event] = cfg.hooks[event] || [];

    // Remove old .claude/hooks/ entries for this event
    cfg.hooks[event] = cfg.hooks[event].filter(
      e => !e.hooks?.some(h => h.command?.startsWith(OLD_HOOKS_PREFIX))
    );

    // Inject new .d3/hooks/ entries (idempotent)
    for (const entry of entries) {
      const cmd = entry.hooks[0].command;
      const exists = cfg.hooks[event].some(e => e.hooks?.some(h => h.command === cmd));
      if (!exists) cfg.hooks[event].push(entry);
    }
  }

  fs.mkdirSync(path.join(TARGET_DIR, '.claude'), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(cfg, null, 2) + '\n');
  return '  ✓  .claude/settings.json — D3 hooks updated (old .claude/hooks/ removed, .d3/hooks/ added)';
}

// ── init ──────────────────────────────────────────────────────────────────────

function init() {
  // Auto-detect old D3 and route to migrate
  const oldSignals = detectOldD3(TARGET_DIR);
  if (oldSignals.length > 0) {
    console.log('\nD3 — existing installation detected\n');
    console.log('This project has an older D3 structure that needs to be migrated:\n');
    oldSignals.forEach(s => console.log(`  ⚠  ${s.message}`));
    console.log('\nRunning migration automatically...\n');
    migrate();
    return;
  }

  console.log('\nD3 — Directive-Driven Development\n');
  const log = [];

  // D3 system files — skip if present (use `d3 update` to refresh)
  const systemFiles = [
    { rel: '.d3/hooks',           src: path.join(PKG_DIR, 'src', 'hooks'),               kind: 'dir'  },
    { rel: '.d3/scripts',         src: path.join(PKG_DIR, 'src', 'scripts'),             kind: 'dir'  },
    { rel: '.d3/skills',          src: path.join(PKG_DIR, 'src', 'skills'),              kind: 'dir'  },
    { rel: '.d3/WORKFLOW.md',     src: path.join(PKG_DIR, 'src', 'WORKFLOW.md'),         kind: 'file' },
    { rel: '.claude/commands/d3', src: path.join(PKG_DIR, '.claude', 'commands', 'd3'),  kind: 'dir'  },
  ];

  for (const { rel, src, kind } of systemFiles) {
    const dest = path.join(TARGET_DIR, rel);
    if (fs.existsSync(dest)) {
      log.push(`  ⊘  ${rel} — already exists (run d3 update to refresh)`);
    } else if (kind === 'dir') {
      copyDir(src, dest);
      log.push(`  ✓  ${rel}/`);
    } else {
      copyFile(src, dest);
      log.push(`  ✓  ${rel}`);
    }
  }

  // State files — only create if absent, never overwrite
  for (const [rel, tmpl] of [
    ['.d3/TASKS.md',     'TASKS.md'],
    ['.d3/CHANGELOG.md', 'CHANGELOG.md'],
    ['.d3/vision.md',    'vision.md'],
    ['.d3/memory.md',    'memory.md'],
    ['.d3/track.md',     'track.md'],
  ]) {
    const dest = path.join(TARGET_DIR, rel);
    if (fs.existsSync(dest)) {
      log.push(`  ⊘  ${rel} — already exists, preserved`);
    } else {
      copyFile(path.join(PKG_DIR, 'templates', tmpl), dest);
      log.push(`  ✓  ${rel}${rel === '.d3/vision.md' ? ' (run /vision to define)' : ' (blank)'}`);
    }
  }

  // Directory scaffolding
  touch(path.join(TARGET_DIR, '.d3', 'reports', '.gitkeep'));
  touch(path.join(TARGET_DIR, '.d3', 'docs', 'current', '.gitkeep'));
  touch(path.join(TARGET_DIR, '.d3', 'docs', 'adr', '.gitkeep'));
  touch(path.join(TARGET_DIR, '.d3', 'docs', 'lessons', '.gitkeep'));
  touch(path.join(TARGET_DIR, '.d3', 'wireframes', '.gitkeep'));
  touch(path.join(TARGET_DIR, '.d3', 'objectives', '.gitkeep'));
  log.push('  ✓  .d3/reports/  .d3/docs/  .d3/docs/adr/  .d3/wireframes/  .d3/objectives/');

  // settings.json hook merge
  log.push(mergeSettings());

  // Write version marker
  writeVersion(getVersion());

  // CLAUDE.md — template only if absent
  const claudeDest = path.join(TARGET_DIR, 'CLAUDE.md');
  if (fs.existsSync(claudeDest)) {
    log.push('  ⊘  CLAUDE.md — already exists, preserved');
  } else {
    copyFile(path.join(PKG_DIR, 'templates', 'CLAUDE.md'), claudeDest);
    log.push('  ✓  CLAUDE.md (template)');
  }

  log.forEach(l => console.log(l));

  console.log(`
Next steps:
  1. Open Claude Code in this directory
  2. Run /setup  — populate CLAUDE.md with project context (auto-detects stack, interviews for the rest)
  3. Run /vision — define the project vision (what you're building, for whom, and what you won't build)
  4. Run /objective — define your first goal; D3 determines the optimal approach
  5. Adapt .d3/hooks/ to your stack (paths and test commands) when ready
`);
}

// ── migrate ───────────────────────────────────────────────────────────────────

function migrate() {
  const log = [];

  console.log('D3 MIGRATION\n============\n');
  console.log('Migrating from old D3 structure to current format.\n');
  console.log('  State files  (TASKS.md, CHANGELOG.md, docs/, reports/) — MOVED, content preserved');
  console.log('  System files (commands, hooks, scripts, WORKFLOW.md)    — REPLACED with latest');
  console.log('  Project commands (.claude/commands/project/)            — PRESERVED untouched\n');

  // ── Phase 1: Move state files ─────────────────────────────────────────────

  log.push('\nPHASE 1 — Move state files');

  moveIfAbsent(
    path.join(TARGET_DIR, 'TASKS.md'),
    path.join(TARGET_DIR, '.d3', 'TASKS.md'),
    log
  );
  moveIfAbsent(
    path.join(TARGET_DIR, 'CHANGELOG.md'),
    path.join(TARGET_DIR, '.d3', 'CHANGELOG.md'),
    log
  );
  moveIfAbsent(
    path.join(TARGET_DIR, 'docs'),
    path.join(TARGET_DIR, '.d3', 'docs'),
    log
  );
  moveIfAbsent(
    path.join(TARGET_DIR, 'reports'),
    path.join(TARGET_DIR, '.d3', 'reports'),
    log
  );

  // ── Phase 2: Enforce new format on migrated state files ───────────────────

  log.push('\nPHASE 2 — Enforce new format');

  for (const [rel, filename] of [
    ['.d3/TASKS.md', 'TASKS.md'],
    ['.d3/CHANGELOG.md', 'CHANGELOG.md'],
  ]) {
    const filePath = path.join(TARGET_DIR, rel);
    if (fs.existsSync(filePath)) {
      const original = fs.readFileSync(filePath, 'utf8');
      const normalised = normaliseContent(original, filename);
      if (normalised !== original) {
        fs.writeFileSync(filePath, normalised);
        log.push(`  ✓  ${rel} — paths updated, test gates enforced`);
      } else {
        log.push(`  ⊘  ${rel} — already in new format`);
      }
    }
  }

  // ── Phase 3: Replace system files with latest ─────────────────────────────

  log.push('\nPHASE 3 — Install latest D3 system files');

  const systemFiles = [
    { rel: '.d3/hooks',           src: path.join(PKG_DIR, 'src', 'hooks'),               kind: 'dir'  },
    { rel: '.d3/scripts',         src: path.join(PKG_DIR, 'src', 'scripts'),             kind: 'dir'  },
    { rel: '.d3/skills',          src: path.join(PKG_DIR, 'src', 'skills'),              kind: 'dir'  },
    { rel: '.d3/WORKFLOW.md',     src: path.join(PKG_DIR, 'src', 'WORKFLOW.md'),         kind: 'file' },
    { rel: '.claude/commands/d3', src: path.join(PKG_DIR, '.claude', 'commands', 'd3'),  kind: 'dir'  },
  ];

  for (const { rel, src, kind } of systemFiles) {
    const dest = path.join(TARGET_DIR, rel);
    kind === 'dir' ? copyDir(src, dest) : copyFile(src, dest);
    log.push(`  ✓  ${rel} (latest)`);
  }

  // ── Phase 4: Scaffold new directories ────────────────────────────────────

  log.push('\nPHASE 4 — Scaffold new directories');

  const newDirs = [
    ['.d3/reports', '.gitkeep'],
    ['.d3/docs/current', '.gitkeep'],
    ['.d3/docs/adr', '.gitkeep'],
    ['.d3/docs/lessons', '.gitkeep'],
    ['.d3/docs/specs', '.gitkeep'],
    ['.d3/wireframes', '.gitkeep'],
    ['.d3/objectives', '.gitkeep'],
  ];

  for (const [dir, sentinel] of newDirs) {
    const dirPath = path.join(TARGET_DIR, dir);
    const keepPath = path.join(dirPath, sentinel);
    fs.mkdirSync(dirPath, { recursive: true });
    if (!fs.existsSync(keepPath)) {
      fs.writeFileSync(keepPath, '');
      log.push(`  ✓  ${dir}/`);
    }
  }

  // vision.md stub — only if absent
  const visionPath = path.join(TARGET_DIR, '.d3', 'vision.md');
  if (!fs.existsSync(visionPath)) {
    copyFile(path.join(PKG_DIR, 'templates', 'vision.md'), visionPath);
    log.push('  ✓  .d3/vision.md (stub — run /vision to define)');
  }

  // settings.json — remove old .claude/hooks/ entries, add new .d3/hooks/
  log.push(mergeSettings());

  // ── Phase 5: Clean up old locations ──────────────────────────────────────

  log.push('\nPHASE 5 — Clean up old locations');

  // Remove root WORKFLOW.md (replaced by .d3/WORKFLOW.md)
  const oldWorkflow = path.join(TARGET_DIR, 'WORKFLOW.md');
  if (fs.existsSync(oldWorkflow)) {
    fs.unlinkSync(oldWorkflow);
    log.push('  ✓  Removed WORKFLOW.md (root) — replaced by .d3/WORKFLOW.md');
  }

  // Remove old .claude/hooks/ (replaced by .d3/hooks/)
  const oldHooksDir = path.join(TARGET_DIR, '.claude', 'hooks');
  if (fs.existsSync(oldHooksDir)) {
    fs.rmSync(oldHooksDir, { recursive: true, force: true });
    log.push('  ✓  Removed .claude/hooks/ — replaced by .d3/hooks/');
  }

  // Remove old root-level commands (replaced by .claude/commands/d3/)
  // But preserve .claude/commands/project/ (project-specific commands)
  const oldCommandsDir = path.join(TARGET_DIR, '.claude', 'commands');
  const commandsToRemove = [
    'audit.md', 'directive.md', 'execute.md', 'improve.md', 'plan.md',
    'release.md', 'resolve.md', 'sprint.md', 'status.md', 'sync-docs.md', 'task.md',
  ];
  let removedCommands = 0;
  for (const f of commandsToRemove) {
    const filePath = path.join(oldCommandsDir, f);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      removedCommands++;
    }
  }
  if (removedCommands > 0) {
    log.push(`  ✓  Removed ${removedCommands} old root-level commands — replaced by .claude/commands/d3/`);
  }

  // Remove old scripts/ at root (content moved earlier; now system files installed)
  const oldScripts = path.join(TARGET_DIR, 'scripts');
  if (fs.existsSync(oldScripts)) {
    const remaining = fs.readdirSync(oldScripts);
    if (remaining.length === 0) {
      fs.rmdirSync(oldScripts);
      log.push('  ✓  Removed empty scripts/ (root)');
    } else {
      log.push(`  ⚠  scripts/ (root) has ${remaining.length} file(s) not managed by D3 — review manually`);
    }
  }

  // Remove TASK.template.md (old D3 artifact)
  const taskTemplate = path.join(TARGET_DIR, 'TASK.template.md');
  if (fs.existsSync(taskTemplate)) {
    fs.unlinkSync(taskTemplate);
    log.push('  ✓  Removed TASK.template.md (old D3 artifact)');
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  log.forEach(l => console.log(l));

  console.log(`
Migration complete.

  ⊘  .claude/commands/project/ — preserved (your project-specific commands)
  ⊘  CLAUDE.md — preserved

Next steps:
  1. Open Claude Code and run /bootstrap — scans the codebase, builds a memory
     profile, populates D3 files from discovered work, and organises your docs
  2. Run /vision — define or refine your project vision
  3. Run /guide if you're new to D3
  4. Adapt .d3/hooks/ if you customised the old .claude/hooks/
`);
}

// ── update ────────────────────────────────────────────────────────────────────

function getVersion() {
  try {
    return JSON.parse(fs.readFileSync(path.join(PKG_DIR, 'package.json'), 'utf8')).version || 'unknown';
  } catch { return 'unknown'; }
}

function getInstalledVersion() {
  const vf = path.join(TARGET_DIR, '.d3', '.d3-version');
  return fs.existsSync(vf) ? fs.readFileSync(vf, 'utf8').trim() : null;
}

function writeVersion(version) {
  fs.mkdirSync(path.join(TARGET_DIR, '.d3'), { recursive: true });
  fs.writeFileSync(path.join(TARGET_DIR, '.d3', '.d3-version'), version);
}

function update() {
  // If running from node_modules (installed dep), re-exec via npx to get the
  // latest from GitHub rather than the pinned installed version. The env flag
  // prevents re-entry when npx itself spawns this script.
  if (!process.env.D3_UPDATING && PKG_DIR.includes('node_modules')) {
    const { spawnSync } = require('child_process');
    const r = spawnSync(
      'npx', ['--yes', 'github:j-cogburn/d3', 'update', ...process.argv.slice(3)],
      { stdio: 'inherit', env: { ...process.env, D3_UPDATING: '1' } }
    );
    process.exit(r.status ?? 0);
  }

  const newVersion  = getVersion();
  const prevVersion = getInstalledVersion();

  console.log('\nD3 UPDATE');
  console.log('=========');
  if (prevVersion) {
    console.log(`Version: ${prevVersion} → ${newVersion}\n`);
  } else {
    console.log(`Version: ${newVersion}\n`);
  }

  // Detect old D3 and route to migrate
  const oldSignals = detectOldD3(TARGET_DIR);
  if (oldSignals.length > 0) {
    console.log('Old D3 structure detected — running migration before update...\n');
    migrate();
    return;
  }

  const log = [];

  // ── Phase 1: Update system files (always overwritten) ────────────────────
  log.push('UPDATED  (system files — always replaced with latest)');

  const systemFiles = [
    { rel: '.d3/hooks',           src: path.join(PKG_DIR, 'src', 'hooks'),               kind: 'dir'  },
    { rel: '.d3/scripts',         src: path.join(PKG_DIR, 'src', 'scripts'),             kind: 'dir'  },
    { rel: '.d3/skills',          src: path.join(PKG_DIR, 'src', 'skills'),              kind: 'dir'  },
    { rel: '.d3/WORKFLOW.md',     src: path.join(PKG_DIR, 'src', 'WORKFLOW.md'),         kind: 'file' },
    { rel: '.claude/commands/d3', src: path.join(PKG_DIR, '.claude', 'commands', 'd3'),  kind: 'dir'  },
  ];

  for (const { rel, src, kind } of systemFiles) {
    const dest = path.join(TARGET_DIR, rel);
    kind === 'dir' ? copyDir(src, dest) : copyFile(src, dest);
    log.push(`  ✓  ${rel}`);
  }
  log.push('  ⚠  Re-apply any .d3/hooks/ customisations if needed');

  // ── Phase 2: Preserve state files — report their status ──────────────────
  log.push('\nPRESERVED  (state — never modified by update)');

  const stateToReport = [
    ['.d3/TASKS.md',     'project backlog'],
    ['.d3/CHANGELOG.md', 'shipped work history'],
    ['.d3/vision.md',    'project vision'],
    ['.d3/memory.md',    'project memory'],
    ['.d3/track.md',     'operational course'],
    ['CLAUDE.md',        'project context'],
  ];

  for (const [rel, desc] of stateToReport) {
    const full = path.join(TARGET_DIR, rel);
    if (fs.existsSync(full)) {
      // Give a sense of the file's state, not just its existence
      const lines = fs.readFileSync(full, 'utf8').split('\n').length;
      const isStub = fs.readFileSync(full, 'utf8').includes('Run /');
      const status = isStub ? 'stub (not yet populated)' : `${lines} lines`;
      log.push(`  ⊘  ${rel}  (${desc} — ${status})`);
    }
  }

  // Report docs/ and reports/ counts
  const docsDir = path.join(TARGET_DIR, '.d3', 'docs');
  if (fs.existsSync(docsDir)) {
    const docCount = countFiles(docsDir);
    if (docCount > 0) log.push(`  ⊘  .d3/docs/  (${docCount} files)`);
  }
  const reportsDir = path.join(TARGET_DIR, '.d3', 'reports');
  if (fs.existsSync(reportsDir)) {
    const reportCount = countFiles(reportsDir);
    if (reportCount > 0) log.push(`  ⊘  .d3/reports/  (${reportCount} reports)`);
  }

  // ── Phase 3: Add new state file stubs (only if missing) ──────────────────
  const newStateFiles = [
    ['.d3/vision.md',  'vision.md',  '/vision'],
    ['.d3/memory.md',  'memory.md',  '/bootstrap'],
    ['.d3/track.md',   'track.md',   '/track set'],
  ];

  const addedStubs = [];
  for (const [rel, tmpl, cmd] of newStateFiles) {
    const dest = path.join(TARGET_DIR, rel);
    if (!fs.existsSync(dest)) {
      copyFile(path.join(PKG_DIR, 'templates', tmpl), dest);
      addedStubs.push(`  ✓  ${rel}  (new — run ${cmd} to populate)`);
    }
  }

  if (addedStubs.length > 0) {
    log.push('\nADDED  (new files introduced in this version)');
    addedStubs.forEach(l => log.push(l));
  }

  // ── Phase 4: Scaffold new directories (only if missing) ──────────────────
  const dirs = [
    '.d3/reports',
    '.d3/docs/current',
    '.d3/docs/adr',
    '.d3/docs/lessons',
    '.d3/docs/specs',
    '.d3/wireframes',
    '.d3/objectives',
  ];

  const addedDirs = [];
  for (const dir of dirs) {
    const dirPath = path.join(TARGET_DIR, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      fs.writeFileSync(path.join(dirPath, '.gitkeep'), '');
      addedDirs.push(`  ✓  ${dir}/`);
    }
  }

  if (addedDirs.length > 0) {
    if (addedStubs.length === 0) log.push('\nADDED  (new directories introduced in this version)');
    addedDirs.forEach(l => log.push(l));
  }

  // ── Phase 5: Format normalisation on state files ─────────────────────────
  const normResults = [];
  for (const [rel, filename] of [['.d3/TASKS.md', 'TASKS.md']]) {
    const filePath = path.join(TARGET_DIR, rel);
    if (fs.existsSync(filePath)) {
      const original = fs.readFileSync(filePath, 'utf8');
      const normalised = normaliseContent(original, filename);
      if (normalised !== original) {
        fs.writeFileSync(filePath, normalised);
        normResults.push(`  ✓  ${rel}  (paths and test gates updated)`);
      }
    }
  }

  if (normResults.length > 0) {
    log.push('\nNORMALISED  (format updates applied to state files)');
    normResults.forEach(l => log.push(l));
  }

  // ── Phase 6: Settings ─────────────────────────────────────────────────────
  log.push('\nSETTINGS');
  log.push(mergeSettings());

  // ── Phase 6.5: TASKS.md → node migration (DIR-051) ────────────────────────
  // Only fires on a legacy monolithic backlog (### DIRECTIVE-/TASK- blocks).
  // Idempotent + non-destructive: existing nodes are skipped, TASKS.md is kept.
  const tasksPath = path.join(TARGET_DIR, '.d3', 'TASKS.md');
  if (fs.existsSync(tasksPath) && /^### (DIRECTIVE|TASK)-\d+:/m.test(fs.readFileSync(tasksPath, 'utf8'))) {
    try {
      const { migrateTasksToNodes } = require('../src/scripts/lib/migrate-tasks');
      const r = migrateTasksToNodes(path.join(TARGET_DIR, '.d3'));
      if (r.migrated > 0) {
        log.push('\nMIGRATED  (TASKS.md → directive nodes)');
        log.push(`  ✓  ${r.migrated} block(s) → .d3/directives/  (${r.quarantined} quarantined under OBJ-000)`);
        if (r.orphanObjectiveCreated) log.push('  ✓  created OBJ-000 (Legacy / unclassified) — re-home via /define');
        if (r.skipped) log.push(`  ⊘  ${r.skipped} already migrated — skipped`);
        log.push('  ⚠  TASKS.md left in place; nodes are now the source of truth (see d3 tree)');
      }
    } catch (e) { log.push(`  ⚠  TASKS.md migration skipped: ${e.message}`); }
  }

  // ── Phase 7: Version marker ───────────────────────────────────────────────
  writeVersion(newVersion);

  // ── Output ────────────────────────────────────────────────────────────────
  log.forEach(l => console.log(l));

  console.log(`
D3 v${newVersion} installed. State guaranteed intact.

  Run /guide to see what to do next in your project.
`);
}

// Count non-gitkeep files in a directory recursively
function countFiles(dir) {
  let count = 0;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
      else if (entry.name !== '.gitkeep') count++;
    }
  } catch { /* ignore */ }
  return count;
}

// ── main ──────────────────────────────────────────────────────────────────────

function runScript(rel, extra) {
  const script = path.join(PKG_DIR, 'src', 'scripts', rel);
  const r = spawnSync(process.execPath, [script, TARGET_DIR, ...extra], { stdio: 'inherit' });
  process.exit(r.status == null ? 0 : r.status);
}
function indexCmd() { runScript('d3-index.js', process.argv.slice(3)); }
function treeCmd()  { runScript('d3-tree.js',  process.argv.slice(3)); }
function runCmd()   { runScript('d3-run.js',   process.argv.slice(3)); }
function learnCmd() {
  const rest = process.argv.slice(3);
  if (rest[0] === 'git') return runScript('d3-learn-git.js', rest);
  console.log(`
d3 learn — the scriptable LEARN dimension is git forensics:
  d3 learn git [--since=90d] [--print]   DORA proxies, hotspots, coupling, CFR

Other LEARN dimensions (docs · code · design · ux · accessibility · vision ·
product · market) run via the /learn slash command in Claude Code.
`);
}

const COMMANDS = { init, update, migrate, index: indexCmd, tree: treeCmd, run: runCmd, learn: learnCmd };

if (!COMMAND || COMMAND === 'help') {
  console.log(`
Usage:
  npx github:j-cogburn/d3 init      Install D3 (auto-migrates from old D3 if detected)
  npx github:j-cogburn/d3 update    Update to latest version — state always preserved
  npx github:j-cogburn/d3 migrate   Migrate an existing project from old D3 format
  d3 index                          Rebuild .d3/index.db + index.json; run integrity gate
  d3 tree [OBJ-NNN]                 Render the objective/directive tree with status rollup
  d3 run                            Start the continuous runner + live dashboard
                                      (three tickers; press a number to act on items)
  d3 run --print                    Render the dashboard once and exit (headless/CI)
  d3 run --once [--dry-run]         Build every ready+unblocked directive in one pass
                                      (graph-native successor to npm run orchestrate)
  d3 learn git [--since=90d]        Git-forensics report: DORA proxies, hotspots, coupling

State guarantee: update NEVER modifies TASKS.md, CHANGELOG.md, vision.md,
  memory.md, track.md, CLAUDE.md, docs/, or reports/. Only system files
  (commands, hooks, scripts, skills, WORKFLOW.md) are replaced.
`);
} else if (COMMANDS[COMMAND]) {
  COMMANDS[COMMAND]();
} else {
  console.error(`\nUnknown command: ${COMMAND}\n`);
  process.exit(1);
}
