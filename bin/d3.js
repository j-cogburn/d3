#!/usr/bin/env node

'use strict';

const fs   = require('fs');
const path = require('path');

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
    { matcher: 'Edit|Write', hooks: [{ type: 'command', command: 'bash .d3/hooks/python-test.sh' }] }
  ]
};

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
    for (const entry of entries) {
      const cmd = entry.hooks[0].command;
      const exists = cfg.hooks[event].some(e => e.hooks?.some(h => h.command === cmd));
      if (!exists) cfg.hooks[event].push(entry);
    }
  }

  fs.mkdirSync(path.join(TARGET_DIR, '.claude'), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(cfg, null, 2) + '\n');
  return '  ✓  .claude/settings.json — D3 hooks merged';
}

// ── init ──────────────────────────────────────────────────────────────────────

function init() {
  console.log('\nD3 — Directive-Driven Development\n');
  const log = [];

  // D3 system files — skip if present (use `d3 update` to refresh)
  const systemFiles = [
    { rel: '.d3/hooks',           src: path.join(PKG_DIR, 'src', 'hooks'),      kind: 'dir'  },
    { rel: '.d3/scripts',         src: path.join(PKG_DIR, 'src', 'scripts'),    kind: 'dir'  },
    { rel: '.d3/WORKFLOW.md',     src: path.join(PKG_DIR, 'src', 'WORKFLOW.md'), kind: 'file' },
    { rel: '.claude/commands/d3', src: path.join(PKG_DIR, '.claude', 'commands', 'd3'), kind: 'dir' },
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
  for (const [rel, tmpl] of [['.d3/TASKS.md', 'TASKS.md'], ['.d3/CHANGELOG.md', 'CHANGELOG.md']]) {
    const dest = path.join(TARGET_DIR, rel);
    if (fs.existsSync(dest)) {
      log.push(`  ⊘  ${rel} — already exists, preserved`);
    } else {
      copyFile(path.join(PKG_DIR, 'templates', tmpl), dest);
      log.push(`  ✓  ${rel} (blank)`);
    }
  }

  // Directory scaffolding
  touch(path.join(TARGET_DIR, '.d3', 'reports', '.gitkeep'));
  touch(path.join(TARGET_DIR, '.d3', 'docs', 'current', '.gitkeep'));
  log.push('  ✓  .d3/reports/  .d3/docs/');

  // settings.json hook merge
  log.push(mergeSettings());

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
  1. Fill in CLAUDE.md — project context, services, dev commands
  2. Adapt .d3/hooks/ to your stack (paths and test commands)
  3. Open Claude Code and run /status to verify
  4. Run /audit docs to establish a baseline
`);
}

// ── update ────────────────────────────────────────────────────────────────────

function update() {
  console.log('\nD3 — updating system files\n');
  const log = [];

  const systemFiles = [
    { rel: '.d3/hooks',           src: path.join(PKG_DIR, 'src', 'hooks'),       kind: 'dir'  },
    { rel: '.d3/scripts',         src: path.join(PKG_DIR, 'src', 'scripts'),     kind: 'dir'  },
    { rel: '.d3/WORKFLOW.md',     src: path.join(PKG_DIR, 'src', 'WORKFLOW.md'), kind: 'file' },
    { rel: '.claude/commands/d3', src: path.join(PKG_DIR, '.claude', 'commands', 'd3'), kind: 'dir' },
  ];

  for (const { rel, src, kind } of systemFiles) {
    const dest = path.join(TARGET_DIR, rel);
    kind === 'dir' ? copyDir(src, dest) : copyFile(src, dest);
    log.push(`  ✓  ${rel}`);
  }

  log.push('  ⚠  If you customized .d3/hooks/, re-apply your changes');
  log.push(mergeSettings());
  log.push('  ⊘  .d3/TASKS.md, CHANGELOG.md, docs/ — preserved (project state)');

  log.forEach(l => console.log(l));
  console.log();
}

// ── main ──────────────────────────────────────────────────────────────────────

const COMMANDS = { init, update };

if (!COMMAND || COMMAND === 'help') {
  console.log(`
Usage:
  npx github:j-cogburn/d3 init     Install D3 into this project
  npx github:j-cogburn/d3 update   Update D3 system files to latest
`);
} else if (COMMANDS[COMMAND]) {
  COMMANDS[COMMAND]();
} else {
  console.error(`\nUnknown command: ${COMMAND}\n`);
  process.exit(1);
}
