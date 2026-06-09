# ADR-008: Telemetry event schema for success-metric instrumentation

**Status:** Accepted
**Date:** 2026-06-09
**Door:** one-way (a data model — once events are emitted and stored, the shape is expensive to change)
**Gates:** DIR-040 (`gated_by: ADR-008`)
**Serves:** OBJ-006 — "telemetry events live; /build --release ships canary 1%→100%"

---

## Context

v2's done-when requires every directive to emit "the signal the objective's success metric needs" (`D3-ARCHITECTURE-V2.md §1.2`), and PROVE asks "did it move the objective's metric?" (`§2.1`). That only works if there is one agreed event shape that instrumentation writes and LEARN reads. Because emitted events accumulate in storage downstream, the schema is a **one-way door** — it earns this ADR and sign-off before any emitter code (`§0` decision-reversibility).

Three things must be true:

1. **Infra-agnostic.** D3 ships to solo devs and small teams with no analytics stack. The default must work with zero setup; richer sinks are opt-in.
2. **Objective-linked.** Every event must trace to the objective whose success metric it serves — otherwise LEARN can't compare predicted vs actual.
3. **Stable + extensible.** A small fixed core (so queries are reliable) plus a free-form `props` bag (so teams add what they need without a schema change).

## Decision

A single normalized event with a fixed core and an open `props` object:

```json
{
  "v": 1,
  "ts": "2026-06-09T21:40:00.000Z",   // ISO-8601, UTC
  "event": "metric.observed",          // dotted name; see taxonomy below
  "objective_id": "OBJ-035",           // REQUIRED — the metric's owner (the link)
  "metric": "activation_rate",          // success-metric key from the objective
  "value": 0.41,                        // number | null (null for non-metric events)
  "unit": "ratio",                      // ratio | count | ms | currency | null
  "props": { "cohort": "first-run" },  // open bag — never queried by the core
  "session": "abc123",                 // opaque run/session id
  "source": "client|api|build|manual"  // where it was emitted
}
```

**Event taxonomy (the dotted `event` name), v1:**

- `metric.observed` — a success-metric reading (the LEARN signal). `objective_id` + `metric` + `value` required.
- `rollout.stage` — a staged-rollout transition (DIR-041): `props.stage`, `props.percent`.
- `directive.shipped` — a directive merged (links BUILD evidence to its objective).

**Storage (default sink):** newline-delimited JSON at `.d3/telemetry/events.jsonl` — append-only, git-diffable, greppable, zero dependencies. The path/sink is configurable in `.d3/run.config.json` under `telemetry` (a future HTTP/stdout sink slots in without a schema change).

**Validation:** an event is rejected (not written) unless it has `v`, `ts`, `event`, `objective_id`, and — for `metric.observed` — a numeric `value` and a `metric`. This keeps the LEARN side honest.

## Consequences

- **Good:** works with no infra; every metric event is objective-linked, so PROVE/LEARN can compare to the objective's target; the open `props` bag absorbs team-specific needs without migrating the core; JSONL is reviewable like every other D3 artifact.
- **Cost / reversibility:** the core fields are now a contract. The `v` field is the escape hatch — a future `v: 2` can change the core while readers branch on version. That makes an otherwise one-way decision *recoverable*, which is why the door is acceptable to walk through now.
- **Out of scope:** transport/aggregation to a third-party analytics product (a later, two-way integration on top of the JSONL sink).
