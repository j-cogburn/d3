'use strict';
/**
 * Telemetry event schema + emitter (DIR-040, OBJ-006) — implements ADR-008.
 * Infra-agnostic: the default sink is append-only JSONL at .d3/telemetry/events.jsonl,
 * so it works with zero setup and stays git-diffable. The schema is objective-linked
 * so LEARN/PROVE can compare an objective's actual metric to its target.
 *
 * Pure validation/normalization is separated from the file write so it is testable.
 */
const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = 1;
const EVENT_TYPES = new Set(['metric.observed', 'rollout.stage', 'directive.shipped']);
const UNITS = new Set(['ratio', 'count', 'ms', 'currency', null]);

// Validate + normalize a raw event into the ADR-008 shape. Returns { ok, event?, errors? }.
function normalizeEvent(raw = {}) {
  const errors = [];
  const event = raw.event;
  if (!event) errors.push('event (name) is required');
  else if (!EVENT_TYPES.has(event)) errors.push(`unknown event type '${event}' (v1: ${[...EVENT_TYPES].join(', ')})`);

  if (!raw.objective_id) errors.push('objective_id is required (events must link to an objective — the law)');

  let value = raw.value === undefined ? null : raw.value;
  let metric = raw.metric || null;
  if (event === 'metric.observed') {
    if (typeof value !== 'number' || Number.isNaN(value)) errors.push("metric.observed requires a numeric 'value'");
    if (!metric) errors.push("metric.observed requires a 'metric' key");
  }

  const unit = raw.unit === undefined ? null : raw.unit;
  if (!UNITS.has(unit)) errors.push(`unit must be one of ${[...UNITS].map(String).join(', ')}`);

  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    event: {
      v: SCHEMA_VERSION,
      ts: raw.ts || new Date().toISOString(),
      event,
      objective_id: String(raw.objective_id),
      metric,
      value,
      unit,
      props: raw.props && typeof raw.props === 'object' ? raw.props : {},
      session: raw.session || null,
      source: raw.source || 'manual',
    },
  };
}

function sinkPath(d3Dir, cfg = {}) {
  const rel = (cfg.telemetry && cfg.telemetry.file) || path.join('telemetry', 'events.jsonl');
  return path.isAbsolute(rel) ? rel : path.join(d3Dir, rel);
}

// Emit one event to the JSONL sink. Returns { ok, event } or { ok:false, errors }.
function emit(d3Dir, raw, cfg = {}) {
  const norm = normalizeEvent(raw);
  if (!norm.ok) return norm;
  const file = sinkPath(d3Dir, cfg);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(norm.event) + '\n');
  return { ok: true, event: norm.event, file };
}

// Read events back (for LEARN / PROVE). Optional filter by objective_id / metric.
function readEvents(d3Dir, { objective_id, metric, cfg = {} } = {}) {
  const file = sinkPath(d3Dir, cfg);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
    .filter((e) => (!objective_id || e.objective_id === objective_id) && (!metric || e.metric === metric));
}

// Latest metric reading for an objective — what PROVE compares to the target.
function latestMetric(d3Dir, objective_id, metric, cfg = {}) {
  const evs = readEvents(d3Dir, { objective_id, metric, cfg })
    .filter((e) => e.event === 'metric.observed')
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));
  return evs.length ? evs[evs.length - 1] : null;
}

module.exports = { SCHEMA_VERSION, EVENT_TYPES, normalizeEvent, emit, readEvents, latestMetric, sinkPath };
