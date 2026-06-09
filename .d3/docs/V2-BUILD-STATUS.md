# D3 v2 — build status

What was implemented from `D3-ARCHITECTURE-V2.md`, where it lives, and how to run it.

## Runnable (real, tested code)

**Node-graph data engine** — the data foundation (§1.4–1.5).

| File | Purpose |
|---|---|
| `src/scripts/lib/frontmatter.js` | Dependency-free YAML-frontmatter read/write for node files. |
| `src/scripts/lib/nodes.js` | Load nodes from `.d3/{objectives,directives,options,sketches,evidence}/`. |
| `src/scripts/lib/graph.js` | Tree + typed-edge graph; integrity checks; subtree traversal. |
| `src/scripts/d3-index.js` | `d3 index` — builds `.d3/index.json` (always) + `.d3/index.db` (SQLite, best-effort) and runs the integrity gate. |
| `src/scripts/d3-tree.js` | `d3 tree [OBJ-NNN]` — ASCII tree with status rollups. |
| `bin/d3.js` | Wired `d3 index` and `d3 tree` into the CLI. |
| `tests/engine.test.js` | 12 tests — all green (`npm test`). |

**Integrity checks enforced (the gate):** the law (every directive has one objective parent), parent-id is a tree (no cycles), `blocks`/`blocked_by` is a DAG, no dangling refs, status rollups consistent, ≤1 approved sketch per thread.

**Loop runner** — both the single pass and the continuous daemon from `D3-RUN-CLI-PROPOSAL.md` (§2/§3/§6/§9).

| File | Purpose |
|---|---|
| `src/scripts/lib/select.js` | Pure directive selection shared by both forms: `isReady`/`isDone`/`branchFor`/`selectBuildable` (ready + unblocked + not-gated graph query). |
| `src/scripts/lib/runner.js` | Daemon core (pure / fs-only): config + defaults, idle backoff, single-instance lock (crash- and synced-mount-safe via a release tombstone), objective rollup, `computeBoard`, `actionForKey` (number→slash-command), and `renderBoard` (the §6 dashboard). |
| `src/scripts/d3-run.js` | `d3 run` (daemon: three tickers + live dashboard), `d3 run --once` (single pass), `d3 run --print` (render once, headless). Loads nodes, runs the integrity gate as admission control, builds READY+UNBLOCKED directives in worktrees with the v2 brief (vision + parent objective + principle files + approved sketch + lessons + body), writes status back to node frontmatter, appends the changelog, saves lessons, reindexes. |
| `bin/d3.js` | Wired `d3 run` into the CLI. |
| `tests/run.test.js`, `tests/runner.test.js` | 21 tests: selection, backoff, lock lifecycle (take/release/reclaim-dead/reclaim-tombstone/block-live), config, board lanes, rollup, key→action, render. |

The dashboard surfaces every pending decision as a numbered, selectable action (press the number → the runner runs the slash command); the inner loop is the only autonomous ticker, the middle (objective rollup → LEARN verdict) and outer (git-push → `/learn git`) tickers only sense and surface. Status is kept clean for rollups; branch/PR live in their own fields. One-way doors with a `gated_by` ref are never auto-built — they surface for human sign-off.

**Run it:**
```bash
npm test            # engine + runner tests (all green)
d3 index            # build index + run gate (exit 1 on error)
d3 tree             # whole tree;  d3 tree OBJ-001 for a subtree
d3 run --print            # render the dashboard once (headless / CI)
d3 run --once --dry-run   # preview the single pass: plan + a brief; touches nothing
d3 run                    # continuous runner + live dashboard (real build needs claude + gh)
```

> Note: on iCloud/Dropbox/FUSE-style synced folders, live SQLite I/O can fail; the
> engine detects this and falls back to `index.json` (the guaranteed artifact). On a
> normal local disk the SQLite index builds fine (proven by the test suite).

**Outer loop, telemetry, rollout, migration (OBJ-005/006/007 + DIR-021).**

| File | Purpose |
|---|---|
| `src/scripts/lib/git-forensics.js` + `d3-learn-git.js` | `d3 learn git` — DORA proxies, churn hotspots, co-change coupling, change-failure-rate from `git log`; report to `.d3/reports/`. (DIR-030/031) |
| `.d3/docs/adr/adr-008-telemetry-event-schema.md` + `src/scripts/lib/telemetry.js` | One-way-door ADR + the event schema/validator/emitter (objective-linked, JSONL sink, infra-agnostic). (DIR-040) |
| `src/scripts/lib/rollout.js` | Staged-rollout planner for `/build --release`: tests → canary 1%→100% with telemetry/error-budget gates per stage. (DIR-041) |
| `src/scripts/lib/migrate-tasks.js` | `TASKS.md` → per-node migration (split blocks, quarantine orphans under `OBJ-000`), wired into `d3 update`. (DIR-051) |
| `.claude/commands/d3/*` | 19 deprecation alias stubs forwarding old commands → new verbs (DIR-021); `learn.md`/`build.md` fleshed out. |
| `src/WORKFLOW.md` | Rewritten around the v2 spine: ontology → five-phase loop → commands as scopes. (DIR-050) |
| `tests/forensics.test.js`, `telemetry.test.js`, `rollout.test.js`, `migrate-tasks.test.js` | Unit coverage for all of the above. |

## Scaffolded (distributable content)

- **Principle library** — `src/principles/` (9 domains + README): product, ux-ui, accessibility, architecture, code, security, data-privacy, delivery-ops, saas-business. Copied to `.d3/principles/`.
- **Node templates** — `templates/objective.md`, `templates/directive.md` (YAML frontmatter, the law, done-when rows).
- **v2 commands** — `.claude/commands/d3/`: `d3`, `define`, `shape`, `build`, `prove`, `learn`, `sketch`, `tree` + 19 deprecation stubs.
- **Diagrams** — `.d3/docs/diagrams/`: `d3-v2-loop.svg`, `d3-v2-node-model.svg`, `d3-v2-shape-flow.svg`.

## Dogfood — complete

`.d3/` holds D3 v2's own build as a real node graph. `d3 tree OBJ-001` now shows **21/21 done** — every objective met:

```
[x] OBJ-001  Ship D3 v2   (21/21 done)   <met>
    OBJ-002 node engine · OBJ-003 principles · OBJ-004 commands ·
    OBJ-005 /learn git · OBJ-006 telemetry+rollout · OBJ-007 docs+migration   — all <met>
```

## Remaining (per §7.4)

Nothing — the §7.4 implementation order is complete. Test suite: **57/57 green** (`npm test`).

The only items that can't be fully exercised in a headless sandbox are the live-agent paths that need `claude` + `gh` + a TTY (the daemon's interactive number-key actions and the BUILD inner tick that spawns agents). Their surrounding logic — selection, scheduling, lock, board, rendering, forensics, telemetry, rollout planning, migration — is all unit-tested; the agent-spawning itself is the same machinery `orchestrate.js` already proves in a real environment.
