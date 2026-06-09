#!/usr/bin/env node
'use strict';
/**
 * `d3 learn git` — run git forensics over the repo and write a report.
 * Thin I/O wrapper: runs `git log`, parses commits (with touched files), hands
 * them to lib/git-forensics, renders a report to .d3/reports/, prints a summary.
 *
 * Usage:
 *   d3 learn git                 whole history
 *   d3 learn git --since=90d     last 90 days   (any git --since value: 90d, "3 months")
 *   d3 learn git --print         print the report, don't write a file
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const forensics = require('./lib/git-forensics');

const SEP = '\x1e';   // record sep between commits
const UNIT = '\x1f';  // unit sep between fields

function parseArgs(argv) {
  const o = { projectDir: process.cwd(), since: null, print: false };
  for (const a of argv) {
    if (a.startsWith('--since=')) o.since = a.split('=')[1];
    else if (a === '--print') o.print = true;
    else if (a === 'git') continue; // allow `d3 learn git`
    else if (!a.startsWith('-')) o.projectDir = a;
  }
  return o;
}

function loadCommits(projectDir, since) {
  const sinceArg = since ? `--since="${normalizeSince(since)}"` : '';
  const fmt = `${SEP}%H${UNIT}%an${UNIT}%ad${UNIT}%s`;
  const out = execSync(`git log --no-merges --date=short --pretty=format:'${fmt}' --name-only ${sinceArg}`,
    { cwd: projectDir, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const commits = [];
  for (const block of out.split(SEP)) {
    if (!block.trim()) continue;
    const [header, ...fileLines] = block.split('\n');
    const [hash, author, date, subject] = header.split(UNIT);
    commits.push({ hash, author, date, subject: subject || '', files: fileLines.map((f) => f.trim()).filter(Boolean) });
  }
  return commits;
}

// turn "90d" / "12w" / "6m" into something git --since accepts
function normalizeSince(s) {
  const m = /^(\d+)([dwmy])$/.exec(s);
  if (!m) return s;
  const unit = { d: 'days', w: 'weeks', m: 'months', y: 'years' }[m[2]];
  return `${m[1]} ${unit} ago`;
}

function main(argv) {
  const opts = parseArgs(argv);
  try { execSync('git rev-parse --is-inside-work-tree', { cwd: opts.projectDir, stdio: 'ignore' }); }
  catch { console.error('Not a git repository — git forensics needs git history.'); process.exit(1); }

  const commits = loadCommits(opts.projectDir, opts.since);
  if (!commits.length) { console.log('No commits found for the requested window.'); return; }

  const analysis = forensics.analyze(commits, { topN: 12 });
  const report = forensics.renderReport(analysis, {
    generated: new Date().toISOString(),
    window: opts.since ? `--since ${opts.since}` : 'full history',
  });

  if (opts.print) { console.log('\n' + report); return; }

  const dir = path.join(opts.projectDir, '.d3', 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-');
  const file = path.join(dir, `git-forensics-${ts}.md`);
  fs.writeFileSync(file, report + '\n');

  const d = analysis.dora;
  console.log(`d3 learn git — ${analysis.range.commits} commits (${analysis.range.from} → ${analysis.range.to})`);
  console.log(`  deploy freq ${d.deploymentFrequency.perWeek}/wk · CFR ${(d.changeFailureRate.rate * 100).toFixed(1)}% (${d.changeFailureRate.band}) · reverts ${d.reverts}`);
  if (analysis.hotspots[0]) console.log(`  top hotspot: ${analysis.hotspots[0].file} (${analysis.hotspots[0].commitsTouching} commits)`);
  console.log(`  report: ${path.relative(opts.projectDir, file)}`);
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { parseArgs, loadCommits, normalizeSince };
