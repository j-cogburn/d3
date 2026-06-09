'use strict';
/**
 * Load D3 v2 nodes from a project's .d3 tree.
 * Source of truth = one markdown file per node, with YAML frontmatter.
 * Directories: objectives/ directives/ options/ sketches/ evidence/
 */
const fs = require('fs');
const path = require('path');
const { parse } = require('./frontmatter');

const NODE_DIRS = {
  objective: 'objectives',
  directive: 'directives',
  option: 'options',
  sketch: 'sketches',
  evidence: 'evidence',
};

const VALID_TYPES = new Set(Object.keys(NODE_DIRS));

function loadNodes(d3Dir) {
  const nodes = [];
  for (const [type, dir] of Object.entries(NODE_DIRS)) {
    const full = path.join(d3Dir, dir);
    if (!fs.existsSync(full)) continue;
    for (const f of fs.readdirSync(full)) {
      if (!f.endsWith('.md')) continue;
      // sketches keep prior versions; only index those, don't choke on them
      const text = fs.readFileSync(path.join(full, f), 'utf8');
      const { data, body } = parse(text);
      if (!data.id) continue; // skip non-node markdown (e.g. README)
      nodes.push(normalize(data, body, { type, file: path.join(dir, f) }));
    }
  }
  return nodes;
}

function normalize(data, body, ctx) {
  const refs = Array.isArray(data.refs) ? data.refs.map((r) => ({
    rel: String(r.rel || '').trim(),
    target: String(r.target || '').trim(),
  })) : [];
  return {
    id: String(data.id).trim(),
    type: data.type || ctx.type,
    title: data.title || '',
    status: (data.status || '').toString().trim(),
    parent_id: data.parent_id ? String(data.parent_id).trim() : null,
    level: data.level || null,
    door: data.door || null,
    appetite: data.appetite || null,
    domain: data.domain || null,
    version: data.version != null ? data.version : null,
    refs,
    file: ctx.file,
    attrs: data,
    body,
  };
}

module.exports = { loadNodes, NODE_DIRS, VALID_TYPES };
