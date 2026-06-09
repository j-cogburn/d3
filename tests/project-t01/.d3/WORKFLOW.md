# D3 — Directive-Driven Development (v2 operating manual)

This is the operating manual for D3 v2. It leads with the **artifact spine** (what things are), then the **five-phase loop** (how work moves), then the **commands** (which are just scopes over the loop). If you only remember one thing: **definition precedes action** — a directive cannot exist without a parent objective, and the system enforces it.

The system is **repeatable** (same loop every cycle), **grounded** (every consequential decision cites a proven standard, not taste), and **self-correcting** (an outer loop lets reality, not D3's own opinion, judge the work).

---

## 1. The spine — four artifacts, one law

Everything D3 tracks is one of four node types in a single hierarchy:

```
Vision        durable strategic truth — what we're building, for whom, what we won't do
  └─ Objective    the unit of WHY — a measurable problem/outcome (may nest: outcome → atomic)
       └─ Directive   the unit of WHAT/HOW — always a child of an objective
            └─ Evidence   the unit of REALITY — flows back up (git, metrics, audits)
```

| Artifact | Answers | Lives in |
|---|---|---|
| **Vision** | What are we ultimately building, and what must we never do? | `.d3/vision.md` |
| **Objective** | What problem are we solving next, and how will we know it's solved? | `.d3/objectives/obj-NNN-*.md` |
| **Directive** | What do we build to serve this objective? | `.d3/directives/dir-NNN-*.md` |
| **Evidence** | What does reality say happened? | `.d3/reports/`, git, telemetry |

Each node is **one markdown file with YAML frontmatter** (id, parent_id, status, typed refs) plus a human body. The files are the source of truth; `.d3/index.db` (+ `index.json`) is a **derived index**, rebuilt by `d3 index`, never hand-edited.

**The law:** every directive has exactly one objective parent. The system refuses to create an orphan. Objectives may nest (an outcome decomposes into sharper child objectives — an Opportunity Solution Tree), so depth flexes while the law holds.

**The graph:** `parent_id` is the tree edge; typed `refs` overlay a graph for what a tree can't say — `blocks`/`blocked_by` (a DAG; BUILD runs only unblocked directives), `derived_from`, `gated_by` (a one-way directive gated by an ADR), `supersedes`, `relates_to`. `d3 index` enforces the integrity gate: the law, no parent cycles, the blocks-DAG is acyclic, no dangling refs, consistent status rollups, ≤1 approved sketch per thread. A failed check blocks like any other gate.

---

## 2. The loop — DEFINE → SHAPE → BUILD → PROVE → LEARN

Five phases. Each consumes the previous artifact and produces the next; the loop closes when LEARN feeds the next DEFINE.

```
  ┌──▶ DEFINE ──▶ SHAPE ──▶ BUILD ──▶ PROVE ──▶ LEARN ──┐
  │                                                      │
  └──────────────────────────────────────────────────────┘
     greenfield enters at DEFINE · an existing project enters at LEARN (sense first)
```

| Phase | Consumes | Produces | Gate to advance |
|---|---|---|---|
| **DEFINE** | Vision; an idea/issue; or LEARN evidence | an **Objective** (problem, success metric, ≥1 non-goal, door, appetite) | has a measurable success metric and ≥1 non-goal; one-way doors have a working-backwards brief |
| **SHAPE** | one Objective | **Options** (scored) → **Sketches** (low-fi, approved) → **Directives** (problem-first; done-when w/ test + state-coverage + instrumentation) | an option is selected; low-fi sketches approved; every directive links to the objective; one-way directives have a design doc + sign-off |
| **BUILD** | ready Directives | code in worktrees, PRs, synced docs | lint/test hooks green; done-when test rows pass; docs updated |
| **PROVE** | PRs / merged work | verification evidence (adversarial review, screenshots, live telemetry) | review passes; no regressions; the objective's metric is now *measurable* |
| **LEARN** | merged work + Evidence (git, metrics, audits) | calibration → objective verdict; lessons; updated vision/backlog | every active objective gets a verdict (met / pivot / kill) against its metric |

**What makes each phase elite, not just renamed:** DEFINE is mandatory and problem-first. SHAPE prices reversibility (one-/two-way doors) and moves critique to the front — competing options, a principle-grounded recommendation, then low-fi sketches you approve before any directive is written, so mistakes are caught on paper. BUILD is the parallel orchestrator; state-coverage and instrumentation are part of "done." PROVE asks "did it move the objective's metric?", not just "is it green?". LEARN is the outer loop — git forensics, product metrics, audit drift — that calibrates predicted vs actual.

### Three nested loops at different clock speeds

```
Inner   BUILD ↔ PROVE       every session, parallel     ship + validate fast
Middle  DEFINE → … → LEARN  per initiative (weekly-ish)  an objective lives until met or dead
Outer   LEARN → Vision      continuous                   reality corrects strategy
```

*Be wrong cheaply and often* works because the fast inner loop is made safe by the slow outer loop catching it. `d3 run` turns these continuously (see §5).

---

## 3. Grounding — principles, not taste

Decisions are not invented per project; they apply standards elite teams already validated. The library lives in `.d3/principles/` (one file per domain: product, ux-ui, accessibility, architecture, code, security, data-privacy, delivery-ops, saas-business) and is injected into agent briefs **at the phase where it bites** — the same mechanism that injects skills. Every consequential decision must cite the principle it rests on, so reviews check conformance to a known-good pattern. The default set is tuned for SaaS; any project may override a domain file.

Above it all sits the **prime directive**: the simplest design that fully solves the problem and not one part more (KISS · YAGNI · Occam · Gall's Law).

---

## 4. Commands — scopes over the loop

The mental model is six things: `/d3` + the five phase verbs. Everything else is a scope, flag, or dimension.

| Command | Role |
|---|---|
| `/d3 <anything>` | Universal front door — natural language → classify intent → route to a phase. |
| `/define` | Create/refine an Objective from the problem. (absorbs `/objective`, `/spec`, `/setup --project`) |
| `/shape` | Options → recommendation → selection → low-fi sketches → directives. (absorbs `/plan`, `/wireframe`→`/sketch ui`) |
| `/sketch <ui\|arch\|data\|behavior>` | The low-fi cycle, standalone: `list`, `approve <id>`, `prune`. |
| `/build` | Execute ready directives in parallel; `--quality <scope>` (was `/improve`); `--release` staged rollout (was `/release`). |
| `/prove` | Verify against the objective; adversarial review; `--tests` (was `/test`). |
| `/learn [dimension]` | Sense reality + calibrate + verdict. Dimensions: `git`, `docs`, `code`, `design`, `ux`, `accessibility`, `vision`, `product`, `market`; `--retro`. (absorbs `/audit`, `/evaluate`, `/research`, `/venture`, `/gap`, `/retro`) |
| `/sprint` | Run the whole loop for one objective; `--quick "<desc>"` is the fast path (was `/resolve`). |

**Primitives kept:** `/status`, `/directive` (now requires a parent objective), `/task`, `/track`, `/guide`, `/vision`, `/bootstrap`. **Deprecated names** still work for one release — they print a one-line notice and forward to the new verb (`/audit`→`/learn`, `/plan`→`/shape`, `/execute`→`/build`, `/verify`→`/prove`, `/ask`→`/d3`, …).

---

## 5. The CLI — what runs in your terminal

```
d3 init | update              install / upgrade (state-safe; update never touches your nodes)
d3 index                      rebuild .d3/index.db + index.json and run the integrity gate
d3 tree [OBJ-NNN]             render an objective/directive subtree with status rollup
d3 run                        continuous runner + live dashboard (the three tickers; §2)
d3 run --once [--dry-run]     build every ready+unblocked directive in one pass
d3 run --print                render the dashboard once (headless / CI)
d3 learn git [--since=90d]    git-forensics report: DORA proxies, hotspots, coupling, CFR
```

`d3 run` is the always-on complement to `/sprint`: it turns the inner loop autonomously while you do the human work (DEFINE, option-selection, sketch-approval) in an interactive Claude Code session beside it. Both coordinate only through the node graph. Hooks keep the index fresh on SessionStart and gate commits.

---

## 6. How a cycle actually goes

1. **`/learn`** (existing project) or **`/define`** (greenfield) — frame the next objective with a measurable success metric.
2. **`/shape OBJ-NNN`** — pick an option, approve a low-fi sketch, emit problem-first directives whose done-when includes a test gate, state coverage, and instrumentation.
3. **`/build`** (or leave `d3 run` turning) — ready, unblocked directives build in parallel worktrees with principle-injected briefs; PRs open.
4. **`/prove`** — adversarial review + confirm the objective's metric is now measurable via telemetry.
5. **`/learn`** — `d3 learn git` + product metrics calibrate predicted vs actual; verdict each active objective (met / pivot / kill); feed findings into the next `/define`.

Tasks live as nodes; `d3 tree` shows the rollup; `.d3/CHANGELOG.md` records what shipped. The loop closes, and reality — not D3's own grade — decides what's next.
