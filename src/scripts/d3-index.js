'use strict';
/**
 * `d3 index` — rebuild the derived index from the node files and run the
 * integrity gate. The markdown node files are the source of truth; this
 * index is disposable (delete + rebuild any time).
 *
 * Outputs:
 *   .d3/index.db    SQLite (nodes, edges)   — if node:sqlite is available
 *   .d3/index.json  always — human-inspectable derived index
 *
 * Exit code 1 if any integrity ERROR is found (so it can gate hooks/CI),
 * unless --no-gate is passed.
 */
const fs = require('fs');
const path = require('path');
const { loadNodes } = require('./lib/nodes');
const graph = require('./lib/graph');

function buildIndex(d3Dir, opts = {}) {
  const nodes = loadNodes(d3Dir);
  const findings = graph.check(nodes);
  const errors = findings.filter((f) => f.level === 'error');
  const warns = findings.filter((f) => f.level === 'warn');

  const edges = graph.edges(nodes);

  // JSON index (always)
  const json = {
    generated: new Date().toISOString(),
    counts: countByType(nodes),
    nodes: nodes.map((n) => ({
      id: n.id, type: n.type, title: n.title, status: n.status,
      parent_id: n.parent_id, level: n.level, door: n.door,
      appetite: n.appetite, domain: n.domain, version: n.version, file: n.file,
    })),
    edges,
    findings,
  };
  fs.writeFileSync(path.join(d3Dir, 'index.json'), JSON.stringify(json, null, 2));

  // SQLite index (best-effort; the JSON is the guaranteed artifact)
  let sqliteOk = false;
  const dbPath = path.join(d3Dir, 'index.db');
  try {
    sqliteOk = buildSqlite(dbPath, nodes, edges);
  } catch (e) {
    if (!opts.quiet) console.warn('  (sqlite index unavailable on this filesystem: ' + (e.code || e.message) + '; using index.json)');
  }
  // never leave a partial/empty db behind (some synced mounts reject SQLite I/O)
  if (!sqliteOk && fs.existsSync(dbPath)) { try { fs.rmSync(dbPath); } catch {} }

  return { nodes, edges, findings, errors, warns, sqliteOk };
}

function buildSqlite(dbPath, nodes, edges) {
  let DatabaseSync;
  try { ({ DatabaseSync } = require('node:sqlite')); }
  catch { return false; }
  // Build in local temp first, then copy the finished file to the destination.
  // Live SQLite I/O (locking/journal) fails on some synced/network mounts
  // (iCloud, Dropbox, FUSE); a single copy of the completed file survives them.
  const os = require('os');
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'd3idx-')), 'index.db');
  const db = new DatabaseSync(tmp);
  db.exec(`
    CREATE TABLE nodes (
      id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT, status TEXT,
      parent_id TEXT, level TEXT, door TEXT, appetite TEXT, domain TEXT,
      version TEXT, file TEXT, attrs TEXT
    );
    CREATE TABLE edges (
      src_id TEXT NOT NULL, dst_id TEXT NOT NULL, rel TEXT NOT NULL,
      PRIMARY KEY (src_id, dst_id, rel)
    );
    CREATE INDEX idx_nodes_parent ON nodes(parent_id);
    CREATE INDEX idx_nodes_type ON nodes(type);
  `);
  const ins = db.prepare(`INSERT INTO nodes (id,type,title,status,parent_id,level,door,appetite,domain,version,file,attrs)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const n of nodes) {
    ins.run(n.id, n.type, n.title, n.status, n.parent_id, n.level, n.door,
      n.appetite, n.domain, n.version == null ? null : String(n.version),
      n.file, JSON.stringify(n.attrs));
  }
  const ie = db.prepare(`INSERT OR IGNORE INTO edges (src_id,dst_id,rel) VALUES (?,?,?)`);
  for (const e of edges) ie.run(e.src, e.dst, e.rel);
  db.close();
  if (fs.existsSync(dbPath)) fs.rmSync(dbPath);
  fs.copyFileSync(tmp, dbPath);
  fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  return true;
}

function countByType(nodes) {
  const c = {};
  for (const n of nodes) c[n.type] = (c[n.type] || 0) + 1;
  return c;
}

function main(argv) {
  const d3Dir = resolveD3(argv.find((a) => !a.startsWith('-')) || process.cwd());
  const gate = !argv.includes('--no-gate');
  if (!fs.existsSync(d3Dir)) { console.error(`No .d3 directory at ${d3Dir}`); process.exit(2); }

  const { nodes, findings, errors, warns, sqliteOk } = buildIndex(d3Dir);
  const c = countByType(nodes);
  console.log(`d3 index — ${nodes.length} nodes (` +
    Object.entries(c).map(([t, n]) => `${n} ${t}`).join(', ') + ')');
  console.log(`  index.json written${sqliteOk ? ' · index.db (SQLite) written' : ''}`);

  if (!findings.length) console.log('  integrity: OK (no findings)');
  else {
    for (const f of findings) {
      const tag = f.level === 'error' ? 'ERROR' : 'warn ';
      console.log(`  [${tag}] ${f.code}: ${f.message}`);
    }
    console.log(`  integrity: ${errors.length} error(s), ${warns.length} warning(s)`);
  }
  if (gate && errors.length) process.exit(1);
}

function resolveD3(p) {
  if (path.basename(p) === '.d3') return p;
  return path.join(p, '.d3');
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { buildIndex };
