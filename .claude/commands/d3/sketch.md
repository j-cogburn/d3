SKETCH — the low-fidelity ASCII design/diagram cycle. Visualize before building; catch mistakes on paper. Versioned, traceable, cleanable. Replaces `/wireframe` (UI is now one domain).

**Usage:**
- `/sketch ui <page/flow>` — screen wireframe, flow, component layout, states
- `/sketch arch <system>` — C4-style context/component diagram, service boundaries
- `/sketch data <pipeline/schema>` — data-flow, ER/schema sketch
- `/sketch behavior <flow>` — sequence diagram, state machine, API shape
- `/sketch list [OBJ-NNN]` — list sketch threads + versions
- `/sketch approve <id>` — mark a version APPROVED (sets the thread's APPROVED pointer)
- `/sketch prune [--keep N] [--older-than 30d] [--hard]` — archive superseded versions

---

## Rules
- **Pure 7-bit ASCII only.** No emoji or ambiguous-width glyphs (they break monospace alignment). Box frames with `+ - |`; arrows `-> <- v ^`. Verify every bordered block has equal-width lines.
- **One file per version**, named `OBJ-NNN--<domain>--<slug>--v<N>--<YYYY-MM-DD-HHMM>.md`, in `.d3/sketches/`.
- Frontmatter: `id, type: sketch, parent_id (the objective), domain, slug, version, status (draft|approved|superseded|archived)`.

## Step 1 — Generate
Render the selected approach in the chosen domain as ASCII. Include the key states/edges, not chrome. Save as a new `vN`.

## Step 2 — Review -> revise
Show it. Take the owner's markup. Regenerate as `v{N+1}` (mark the prior `superseded`). Loop until approved.

## Step 3 — Approve
On approval set `status: approved`; ensure exactly one APPROVED per (objective·domain·slug) thread (the index enforces this). The approved sketch is referenced by directives via `sketch_id`.

## Step 4 — Cleanup
`/sketch prune` archives superseded versions into `.d3/sketches/archive/` (never deletes APPROVED). Run `d3 index` after changes.
