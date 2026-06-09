'use strict';
/**
 * Minimal, dependency-free YAML-frontmatter reader/writer for D3 node files.
 * Supports the small subset D3 needs: scalars, and a `refs:` list of
 * `{ rel: ..., target: ... }` flow-maps. Not a general YAML engine.
 *
 * A node file looks like:
 *   ---
 *   id: DIR-140
 *   type: directive
 *   parent_id: OBJ-031
 *   refs:
 *     - { rel: blocks, target: DIR-141 }
 *   ---
 *   <human-readable body...>
 */

function parse(text) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) return { data: {}, body: text };
  const data = parseBlock(m[1]);
  return { data, body: m[2] || '' };
}

function parseBlock(yaml) {
  const data = {};
  const lines = yaml.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const kv = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!kv) { i++; continue; }
    const key = kv[1];
    let val = kv[2];
    if (val === '' || val === '|') {
      // could be a list on following indented lines
      const list = [];
      let j = i + 1;
      while (j < lines.length && /^\s*-\s+/.test(lines[j])) {
        list.push(parseScalarOrMap(lines[j].replace(/^\s*-\s+/, '')));
        j++;
      }
      data[key] = list.length ? list : '';
      i = list.length ? j : i + 1;
    } else {
      data[key] = parseScalar(val);
      i++;
    }
  }
  return data;
}

function parseScalarOrMap(s) {
  s = s.trim();
  const fm = /^\{(.*)\}$/.exec(s);
  if (fm) {
    const obj = {};
    for (const pair of splitTop(fm[1])) {
      const idx = pair.indexOf(':');
      if (idx === -1) continue;
      obj[pair.slice(0, idx).trim()] = parseScalar(pair.slice(idx + 1).trim());
    }
    return obj;
  }
  return parseScalar(s);
}

function splitTop(s) {
  // split on commas not inside braces (one level is enough here)
  const out = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

function parseScalar(v) {
  v = v.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  return v;
}

function stringify(data) {
  const lines = [];
  for (const [k, val] of Object.entries(data)) {
    if (Array.isArray(val)) {
      lines.push(`${k}:`);
      for (const item of val) {
        if (item && typeof item === 'object') {
          const inner = Object.entries(item).map(([ik, iv]) => `${ik}: ${iv}`).join(', ');
          lines.push(`  - { ${inner} }`);
        } else {
          lines.push(`  - ${item}`);
        }
      }
    } else {
      lines.push(`${k}: ${val}`);
    }
  }
  return lines.join('\n');
}

function compose(data, body) {
  return `---\n${stringify(data)}\n---\n${body || ''}`;
}

module.exports = { parse, stringify, compose };
