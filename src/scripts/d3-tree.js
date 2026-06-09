'use strict';
/**
 * `d3 tree [id]` — render an objective/directive subtree (ASCII) with a
 * status rollup per objective. Reads node files directly (the source of
 * truth); no index required.
 */
const fs = require('fs');
const path = require('path');
const { loadNodes } = require('./lib/nodes');
const graph = require('./lib/graph');

const MARK = { done: '[x]', open: '[ ]' };

function render(d3Dir, rootId) {
  const nodes = loadNodes(d3Dir);
  const { byId, childrenOf } = graph.index(nodes);
  const lines = [];

  function rollup(n) {
    let done = 0, total = 0;
    (function walk(x) {
      for (const k of childrenOf.get(x.id) || []) {
        total++;
        if (graph.statusClass(k.status) === 'done') done++;
        walk(k);
      }
    })(n);
    return { done, total };
  }

  function line(n, prefix, isLast, isRoot) {
    const connector = isRoot ? '' : (isLast ? '\\- ' : '|- ');
    const mark = MARK[graph.statusClass(n.status)];
    let label = `${mark} ${n.id}  ${n.title || ''}`.trimEnd();
    if (n.type === 'objective') {
      const r = rollup(n);
      if (r.total) label += `   (${r.done}/${r.total} done)`;
      if (n.level) label += `  [${n.level}]`;
    }
    if (n.door === 'one-way') label += '  {one-way}';
    if (n.status) label += `   <${n.status}>`;
    lines.push(prefix + connector + label);
  }

  function walk(n, prefix, isLast, isRoot) {
    line(n, prefix, isLast, isRoot);
    const kids = (childrenOf.get(n.id) || []).slice().sort((a, b) => typeRank(a) - typeRank(b) || a.id.localeCompare(b.id));
    const childPrefix = isRoot ? prefix : prefix + (isLast ? '   ' : '|  ');
    kids.forEach((k, i) => walk(k, childPrefix, i === kids.length - 1, false));
  }

  const startRoots = rootId ? [byId.get(rootId)].filter(Boolean) : graph.roots(nodes);
  if (!startRoots.length) { return rootId ? `No node ${rootId}` : '(no objectives yet)'; }
  startRoots.forEach((r) => { walk(r, '', true, true); lines.push(''); });
  return lines.join('\n').trimEnd();
}

function typeRank(n) {
  return { objective: 0, option: 1, sketch: 2, directive: 3, evidence: 4 }[n.type] ?? 9;
}

function main(argv) {
  const args = argv.filter((a) => !a.startsWith('-'));
  // allow:  d3 tree            (cwd)
  //         d3 tree OBJ-001    (cwd, root)
  //         d3 tree <dir> OBJ-001
  let d3Dir = process.cwd(), rootId = null;
  for (const a of args) {
    if (/^(OBJ|DIR|OPT|SKETCH|EVD)-/.test(a)) rootId = a; else d3Dir = a;
  }
  if (path.basename(d3Dir) !== '.d3') d3Dir = path.join(d3Dir, '.d3');
  if (!fs.existsSync(d3Dir)) { console.error(`No .d3 directory at ${d3Dir}`); process.exit(2); }
  console.log(render(d3Dir, rootId));
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { render };
