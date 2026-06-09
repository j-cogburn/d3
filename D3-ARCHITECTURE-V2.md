# D3 v2 — Objective-First Architecture (Proposal)

**Status:** Proposal · for review
**Date:** 2026-06-08
**Supersedes:** the current command model in `src/WORKFLOW.md`
**Revision:** consolidated — incorporates the prime directive (§0), objective flexibility + OST (§1.3), the node graph + persistence/index decision (§1.4–1.5), the SHAPE options/recommendation/selection + low-fi sketch cycle (§2.2), the principle library + full-SDLC map (§6), and the data-migration/index work in rollout (§7). This is the complete agreed design.

---

## Why this exists

D3 today is excellent at *executing work correctly* — parallel agents, lint/test hooks, adversarial code review, doc sync. It is weak at two things that separate good engineering systems from market-dominating ones:

1. **It leads with solution, not problem.** The cycle starts at `audit`, which presumes code already exists, and the directive template leads with "what to build." There is no mandatory point where the *problem* is defined before action.
2. **It grades its own homework.** Every quality signal — audits, `/evaluate`, verify — is Claude judging Claude. Nothing outside the system ever talks back. A closed loop always concludes it is doing great.

v2 fixes both with one structural move: a strict artifact hierarchy where **definition always precedes action**, wrapped in a loop whose final phase is **reality recalibrating strategy**.

This is a breaking refactor. It collapses ~26 commands to six things a user must know, makes "an objective precedes every directive" a law the system enforces rather than a convention, and adds the outer feedback loop D3 has never had.

---

## 0. Prime directive — elegant, simple, effective

Every design decision in D3 — and every decision D3 makes inside a user's project — is held to one standard: **the simplest design that fully solves the problem, and not one part more.** This applies recursively: to this system's own surface, to the architecture it proposes, to the UI it ships, to the logic it writes.

Three proven formulations keep it honest:

- *"Perfection is achieved when there is nothing left to take away."* (Saint-Exupéry) — bias toward removal.
- **KISS · YAGNI · Occam** — never build what the objective doesn't demand; the fewest moving parts wins.
- **Gall's Law** — a working complex system evolves from a working simple one; never design the complex version first.

And one non-negotiable: **decisions are grounded in proven elite standards, not invented per project.** Every domain — product, UX/UI, architecture, logic, security, delivery, SaaS economics — has a canonical body of practice that elite teams already validated (§6). D3 applies those by default and requires each consequential decision to *cite the principle it rests on*. Novelty is reserved for the genuinely novel; everything else uses the known-good pattern.

---

## 1. The artifact ontology

Four artifacts, one strict hierarchy. Every command operates on exactly one of them.

```
Vision  (durable strategic truth - rarely changes)
  +- Objective   (the unit of WHY - a measurable outcome or problem)
       +- Objective   (objectives may nest: a vague outcome decomposes into
       |               sharper child objectives - an opportunity tree, §1.3)
       |    +- Directive   (the unit of WHAT/HOW - always a child of an objective)
       |         +- Evidence   (the unit of REALITY - flows back up)
       +- Directive   (a specific objective needs no children - directives directly)
```

| Artifact | Answers | Lifespan | File |
|---|---|---|---|
| **Vision** | What are we ultimately building, for whom, and what must we never do? | Quarters | `.d3/vision.md` |
| **Objective** | What problem are we solving next, and how will we know it's solved? | Days–weeks | `.d3/objectives/obj-NNN-*.md` |
| **Directive** | What do we build to serve this objective? | A work session | `.d3/directives/dir-NNN-*.md` |
| **Evidence** | What does reality say happened? | Continuous | `.d3/reports/`, git, metrics |

Every node is **one file with YAML frontmatter** (its id, parent, refs, status) plus a human body — Options in `.d3/options/`, Sketches in `.d3/sketches/`. `.d3/TASKS.md` becomes a **generated board view**, and `.d3/index.db` is the **derived SQLite index** (§1.5). Details of ids, relationships, and storage: §1.4–1.5.

**The law:** a directive cannot exist without a parent objective. The system refuses to create an orphan. This is the single change that makes "definition precedes action" real. Objectives themselves may nest — a vague outcome decomposes into sharper child objectives before any directive appears (§1.3) — so depth flexes while the law holds.

### 1.1 Objective template (new first-class artifact)

```markdown
### OBJECTIVE-NNN: <Problem framed as outcome <= 10 words>
**ID:** OBJ-NNN
**Status:** open | active | met | killed | pivoted
**Level:** outcome (decomposes into child objectives) | atomic (spawns directives directly)
**Parent:** Vision | OBJ-NNN
**Refs:** (optional) relates_to / derived_from: <ids>
**Vision link:** <which strategic bet / JTBD this serves>
**Door:** two-way (reversible) | one-way (expensive to undo)
**Appetite:** small (~1/2 day) | medium (~2 days) | large (~1 week)
**Added:** YYYY-MM-DD

**Problem.** <2-4 sentences: the job-to-be-done, who has it, what's broken today.>

**Who it's for.** <the specific user/segment.>

**Success metric.** <the one measurable signal that says this problem is solved -
e.g. "activation rate on first session >= X%", "p95 checkout latency < Y ms".>

**Non-goals.** <what we are explicitly NOT solving in this objective.>

**Working-backwards brief.** <required only for one-way doors: the press-release +
FAQ written before any directive is shaped.>
```

A `/define` session cannot close an objective without a **success metric** and at least one **non-goal**. One-way doors additionally require the working-backwards brief.

### 1.2 Directive template (revised — problem-first, objective-linked)

```markdown
### DIRECTIVE-NNN: <Imperative title <= 8 words>
**ID:** DIR-NNN
**Objective (parent_id):** OBJ-NNN    <- REQUIRED. No parent -> directive is illegal.
**Status:** ready | in-progress - branch: feature/... | complete - PR #N . YYYY-MM-DD
**Door:** two-way | one-way            <- one-way requires a design doc before BUILD
**Appetite:** small | medium | large
**Refs:** (optional) blocks / blocked_by / derived_from / gated_by: <ids>
**Agent:** general-purpose | Plan | claude
**Services:** (only those in scope)
**Skills:** (optional)
**Added:** YYYY-MM-DD

**Problem.** <1-2 sentences tracing this directive to the objective's problem.
If you can't state the problem, it isn't ready.>

**Build.** <what to build, why it matters, constraints the agent needs.>

**Done when:**
- [ ] <primary testable criterion>
- [ ] Test gate passes for each service in scope
- [ ] State coverage: empty . loading . error . offline . zero-result . long-content
- [ ] Instrumentation emits the signal the objective's success metric needs
```

Two new mandatory done-when rows encode elite practice directly: **craft at the seams** (state coverage) and **honest measurement** (instrumentation). A UI directive that handles only the happy path, or ships without telemetry, is not done.

### 1.3 Objective flexibility — start specific or start vague

D3 must accept a problem at any resolution and converge it to action without forcing false precision up front.

**Two intake modes in DEFINE:**

- *Specific* — "build SSO with SAML." One **atomic** objective, straight to SHAPE.
- *Vague* — "our activation is weak." One **outcome** objective with a measurable target, then decomposed.

**Decomposition uses the Opportunity Solution Tree** (Torres, *Continuous Discovery Habits*) — the proven structure for connecting an outcome to the bets beneath it:

```
Outcome objective       measurable: "first-session activation 25% -> 40%"
  +- Opportunity        child objective: "users never reach first value"
  |    +- Directive      solution: guided first-run checklist
  +- Opportunity        child objective: "signup friction too high"
       +- Directive      solution: defer email verification
```

Opportunities *are* child objectives — same template, `Level: atomic`, `Parent:` set to the outcome. The law holds (every directive still has a parent objective) while depth flexes from one level to many.

**Progressive elaboration.** A vague objective need not be fully decomposed before work begins. DEFINE can sharpen one branch, SHAPE+BUILD it, and let LEARN's evidence reshape the rest of the tree. Discovery and delivery run as **parallel tracks (dual-track agile)**, not sequential stages — you are never blocked waiting for the whole tree to be perfect.

### 1.4 Identity & relationships — the node graph

Every artifact is a **node** with a stable, type-prefixed id (`OBJ-021`, `DIR-140`, `OPT-031-A`, `SKETCH-031-arch-1`, `EVD-...`) that is unique and never reused. Relationships are explicit and machine-checkable:

- **Tree edge — `parent_id` (exactly one).** Objectives nest under the Vision or a parent objective (the Opportunity Solution Tree); a directive's `parent_id` is its objective — that's the law, now a foreign key. A strict single-parent hierarchy.
- **Graph edges — typed `refs`.** A list of `{rel, target}` overlays a graph on the tree for what a pure hierarchy can't express:
  - `blocks` / `blocked_by` — ordering among directives (a DAG; BUILD runs only unblocked directives)
  - `supersedes` — sketch v2 supersedes v1
  - `derived_from` — a directive from an option/sketch; an objective from evidence
  - `gated_by` — a one-way directive gated by an ADR
  - `relates_to` — a soft link

So the model is a **tree (single-parent) with a typed-edge graph overlay**: ids establish identity, reference ids establish relationships — exactly the structure you described.

Each node is **one file with YAML frontmatter** (the machine-readable fields) plus a human-readable body:

```
---
id: DIR-140
type: directive
title: Add tenant_id + FORCED RLS to all tables
status: ready
parent_id: OBJ-031          # the law, as a foreign key
door: one-way
appetite: large
sketch_id: SKETCH-031-arch-1
refs:
  - { rel: derived_from, target: OPT-031-A }
  - { rel: blocks,       target: DIR-141 }
  - { rel: gated_by,     target: ADR-007 }
created: 2026-06-08
---
Problem. ...
Build. ...
Done when: ...
```

### 1.5 Persistence — yes, a database (but a derived one)

You're right that this wants a database; the discipline is choosing *which role* it plays. Treated as a proper SHAPE decision:

| # | Approach | Query / integrity | Git-native review | Concurrency | Verdict |
|---|---|---|---|---|---|
| A | **Node files = truth, SQLite = derived index** | strong (SQL over the index) | full (diff/blame/PR every node) | per-file edits rarely collide | **recommended** |
| B | SQLite = truth, markdown = generated views | strongest (FKs, transactions) | weak (truth is a binary db) | excellent | escape hatch at extreme scale |
| C | One `TASKS.md` (status quo) | none (text scraping) | full | merge-conflict prone | rejected — won't hold a tree |

**Recommendation — A.** The markdown node files stay the single source of truth; `.d3/index.db` is a **derived SQLite index, rebuilt deterministically** by `d3 index` and never hand-edited (gitignored). This keeps D3's model intact — git stays the audit trail that PROVE/LEARN calibrate against, and every node is diffable and reviewable (§0) — while giving real relational power: subtree traversal, "what's ready vs blocked," dangling-reference detection, status rollups. Concurrency is handled by one-file-per-node (parallel BUILD agents touch different files) with the orchestrator serializing the small status writes, then a reindex after each batch. **Reversibility:** the schema below is identical whether the files or the db are authoritative, so if extreme scale ever forces it, promoting to B is a config change, not a rewrite — a deliberately two-way door on a data decision.

The node graph (tree + typed edges):

```
VISION
  |
  +-- OBJECTIVE  (id, parent_id, level, door, appetite, success_metric, selected_option_id)
  |     |   parent_id may point to another OBJECTIVE   (outcome --> atomic)
  |     |
  |     +-- OPTION     (id, objective_id, scores, recommended, selected)
  |     +-- SKETCH     (id, objective_id, domain, version, status, supersedes)
  |     +-- DIRECTIVE  (id, parent_id = objective, door, sketch_id)
  |              |
  |              +-- edge: blocks / blocked_by --> DIRECTIVE   (DAG)
  |
  +-- EVIDENCE   (id, source [git|metric|audit], target_id --> any node, verdict)
                 feeds LEARN --> next DEFINE
```

Derived index (rebuildable; illustrative):

```
CREATE TABLE nodes (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL,        -- objective|directive|option|sketch|evidence
  title      TEXT,
  status     TEXT,
  parent_id  TEXT REFERENCES nodes(id),
  attrs      JSON,                 -- type-specific fields
  updated    TEXT
);
CREATE TABLE edges (
  src_id     TEXT NOT NULL REFERENCES nodes(id),
  dst_id     TEXT NOT NULL REFERENCES nodes(id),
  rel        TEXT NOT NULL,        -- blocks|supersedes|derived_from|gated_by|relates_to
  PRIMARY KEY (src_id, dst_id, rel)
);
-- subtree via recursive CTE; add a closure table only if scale demands it.
```

**Integrity checks** (run by `d3 index`, the SessionStart hook, and pre-commit — a failed check blocks, like any other gate):

- every `directive` has exactly one `objective` parent (the law)
- `parent_id` forms a tree (no cycles); `blocks`/`blocked_by` form a DAG (no cycles)
- no dangling references (every `target` resolves to a real node)
- status rollup is consistent (an objective can't be `met` with open children)
- exactly one `APPROVED` sketch per (objective · domain · slug) thread

**Surfacing it:** `/tree [id]` renders any subtree with status rollup; `d3 index` rebuilds the index; `/status`, `/shape`, and `/build` query it (e.g. BUILD = ready directives with no open `blocked_by`).

---

## 2. The cycle — DEFINE → SHAPE → BUILD → PROVE → LEARN

Five phases. Each consumes the previous artifact and produces the next. The loop closes when LEARN feeds DEFINE.

```
  +--> DEFINE --> SHAPE --> BUILD --> PROVE --> LEARN --+
  |                                                     |
  +-----------------------------------------------------+
     (the loop closes: LEARN's evidence feeds the next DEFINE)
```

**Entry point depends on project state:** greenfield enters at **DEFINE** (nothing to sense yet); an existing project enters at **LEARN** (sense current reality, then define the next objective). Same loop, no special-casing.

### Phase contract

| Phase | Consumes | Produces | Gate to advance |
|---|---|---|---|
| **DEFINE** | Vision; an idea/issue; or LEARN evidence | **Objective** (problem, success metric, non-goals, door, appetite) | Has a measurable success metric and ≥1 non-goal. One-way doors have a working-backwards brief. |
| **SHAPE** | one Objective | **Options** (scored, recommended) → **Sketches** (low-fi, approved) → **Directives** (problem-first, done-when w/ test + seams + instrumentation) | Owner selected an option; low-fi sketches approved (§2.2); every directive links to the objective; one-way-door directives have a design doc + owner sign-off. |
| **BUILD** | ready Directives | Code in worktrees, PRs, synced docs | Hooks (lint/test) green; done-when test rows pass; docs updated. |
| **PROVE** | PRs / merged work | Verification evidence (adversarial review, screenshots, live instrumentation) | Adversarial review passes; no regressions; the success metric is now *measurable* (telemetry live). |
| **LEARN** | merged work + Evidence (git, metrics, audits) | Calibration report → objective verdict; lessons; updated Vision/backlog | Every active objective gets a verdict (met / pivot / kill) against its success metric. Calibration compares predicted vs actual. |

### 2.1 What makes each phase elite (not just renamed)

- **DEFINE** is mandatory and problem-first. This is the document's #1 lever — *problem definition over solution generation* — made unskippable.
- **SHAPE** prices reversibility (Bezos one-way/two-way doors) and moves critique to the *front*: it generates competing solution **options**, recommends one, lets you **select**, then renders **low-fidelity ASCII sketches** you approve before any directive is written — so mistakes are caught on paper, when changes are free (§2.2).
- **BUILD** is the existing parallel orchestrator; seams and instrumentation are now part of done.
- **PROVE** changes the question from *"is it green?"* to *"did it move the objective's metric?"* Verification traces to the problem.
- **LEARN** is the new outer loop. It ingests **git forensics** (DORA metrics, churn hotspots, co-change coupling, change-failure-rate), product metrics, and audit drift — then *calibrates*: did the areas D3 rated low-risk actually break? This is how D3 escapes grading its own homework.

### 2.2 Inside SHAPE — options, recommendation, and low-fi review

SHAPE is where *"be wrong cheaply"* lives. No directive is written until a solution has been chosen with eyes open and seen in low fidelity. The sub-flow:

```
Objective -> OPTIONS -> RECOMMEND -> SELECT -> SKETCH -> REVIEW -+
             (2-4)      (best + why)  (owner)   (low-fi)  (owner)  |
                                                   ^              | revise
                                                   +--------------+
                                                         | approve
                                                         v
                                                     DIRECTIVES -> BUILD
```

**1 · Options.** For an atomic objective, SHAPE proposes 2–4 distinct solution approaches, each scored on a fixed rubric so they're comparable:

| Each option scored on | Source |
|---|---|
| Success-metric impact | the objective's metric |
| Principle conformance | the relevant `.d3/principles/` domains (§6) |
| Reversibility (door) + blast radius | architecture principles |
| Effort vs appetite | the objective's appetite |
| Key risks / unknowns | adversarial pass |

**2 · Recommendation.** D3 names the option it would pick and **why** — citing the principles and the metric, not taste (the grounding rule from §0).

**3 · Select.** The owner chooses: the recommendation, an alternative, or "none — reshape." The choice and its rationale are recorded on the objective. Objectives that arrived *specific* (the owner already knows the solution) may skip options — flexibility per §1.3; `/sprint --quick` skips by default.

**4 · Sketch — the low-fi cycle.** Before committing, D3 renders the selected approach as **low-fidelity ASCII** so you see what will be built and can change it for the cost of a few tokens, not a build. Any domain you choose:

- **UI/UX** — screen wireframes, user flows, component layout, key states
- **Architecture** — C4-style context/component diagrams, service boundaries
- **Data** — pipelines / data-flow, ER & schema sketches
- **Behavior** — sequence diagrams, state machines, API request/response shapes

**5 · Review → revise → approve.** You mark up the sketch; D3 regenerates a new **version**; loop until you approve. Only an *approved* sketch unlocks directive writing — this is the early-mistake-catching gate you asked for.

#### Sketch storage, versioning, and cleanup

Sketches are work products of an objective, stored under `.d3/sketches/` with a typed, versioned, traceable name:

```
.d3/sketches/<OBJ-NNN>--<domain>--<slug>--v<N>--<YYYY-MM-DD-HHMM>.md
example:  OBJ-014--ui--billing-dashboard--v3--2026-06-08-1420.md
```

- **Versioned** — every regeneration is a new `vN`; older versions are kept for comparison or rollback. A `LATEST` and an `APPROVED` pointer per (objective · domain · slug) thread tracks the live one.
- **Traceable** — the objective id in the filename links every sketch to its problem; the approved sketch is referenced in the directives it spawns, so BUILD agents receive the agreed design as context.
- **Cleanup** — `/sketch prune` **archives** (never hard-deletes) superseded versions into `.d3/sketches/archive/`, keeping each thread's APPROVED + latest by default. Retention flags: `--keep N`, `--older-than 30d`, and `--hard` for true deletion. Approved sketches are never auto-removed.

This reuses D3's existing lifecycle pattern for audit reports and directives — generate, version, supersede, archive — so it adds a capability without adding a new mental model.

---

## 3. Three nested loops at different clock speeds

The cycle is not one loop — it is three, and the system's power is the slow truth checking the fast work.

| Loop | Phases | Cadence | Purpose |
|---|---|---|---|
| **Inner** | BUILD ↔ PROVE | Every session, parallel | Ship and validate directives fast. |
| **Middle** | DEFINE → … → LEARN | Per initiative (weekly-ish) | An objective lives until evidence says met or dead. |
| **Outer** | LEARN → Vision | Continuous | Git on every push, metrics streaming, scheduled audits. The only thing allowed to change the Vision. |

*Be wrong cheaply and often* is exactly this: the fast inner loop is only safe because the continuous outer loop catches it being wrong. D3 today has the inner loop and no outer loop.

---

## 4. Command surface — ~26 → one small core

One front door, five phase verbs, a loop runner, the SHAPE sketch tool, and the primitives. Everything else becomes a **scope, flag, or dimension** — no capability is lost. The mental model stays six: `/d3` + DEFINE · SHAPE · BUILD · PROVE · LEARN.

### The set you actually learn

| Command | Role |
|---|---|
| **`/d3 <anything>`** | Universal front door. Natural language → classify intent → route to the right phase. (Replaces `/ask`.) |
| **`/define`** | Create/refine an Objective from the problem. |
| **`/shape`** | Options → recommendation → selection → low-fi sketches → directives. |
| **`/sketch`** | The low-fi cycle, usable standalone: `/sketch <ui\|arch\|data\|behavior> <target>`, `/sketch list`, `/sketch approve <id>`, `/sketch prune`. |
| **`/build`** | Execute ready directives in parallel; enforce gates. |
| **`/prove`** | Verify against the objective; adversarial review. |
| **`/learn`** | Sense reality (audits + git + metrics); calibrate; verdict objectives. |
| **`/sprint`** | Run the full loop for an objective (DEFINE→…→LEARN), scoped. |

Primitives kept as-is: `/status`, `/directive`, `/task`, `/update-config`, `/project:start`. New utility: **`/tree [id]`** — render an objective/directive subtree with status rollup (reads the index, §1.5).

### Full migration map

| Today | v2 | Notes |
|---|---|---|
| `/ask` | **`/d3`** | Renamed front door. |
| `/setup` | `/define --project` | Project-level definition / bootstrap. |
| `/objective` | `/define` | Becomes the core of DEFINE. |
| `/spec` | `/define` | Requirements gathering is defining the objective. |
| `/research` | `/learn market` → feeds `/define` | Generative market research = a sensing dimension. |
| `/venture` | `/learn market` | Market/monetization = a sensing dimension. |
| `/gap` | `/learn gaps` → feeds `/shape` | Product gap analysis = a sensing dimension. |
| `/plan` | `/shape` | Objective → directives. |
| `/wireframe` | `/sketch ui` | Generalized: UI is now one domain of the multi-domain sketch system (§2.2). |
| `/execute` | `/build` | Unchanged engine. |
| `/improve` | `/sprint --quality <scope>` | Scoped quality loop = a flag. |
| `/resolve` | `/sprint --quick "<desc>"` | Fast path: lightweight define → build. |
| `/release` | `/build --release` | Staged rollout (flags, 1%→100%). |
| `/test` | `/prove --tests` | Dedicated test pass. |
| `/verify` | `/prove` | Unchanged role. |
| `/audit` | `/learn <dimension>` | docs · product · design · ux · accessibility · vision · code · **git** · market. |
| `/evaluate` | `/learn` (no arg) | The unified dashboard *is* the LEARN summary. |
| `/retro` | `/learn --retro` | Retrospective = calibration. |
| `/sync-docs` | folded into `/build` (done) + `/learn docs` (drift) | Docs are part of done; drift is evidence. |
| `/track` | `/track` (kept) | Strategic course state; sits at the Vision/Objective tier. |
| `/sprint` | `/sprint` | Now runs the five-phase loop. |
| `/status` `/directive` `/task` `/update-config` `/project:start` | unchanged | Primitives. `/directive` now requires a parent objective. |

**New capability introduced:** `/learn git` — git-forensics report (DORA, hotspots, coupling, change-failure-rate, D3 self-calibration). Zero new integration; every repo already has git. Schedulable: `/schedule weekly /learn git`.

**New CLI:** `d3 index` (alongside `d3 init` / `d3 update`) rebuilds `.d3/index.db` from the node files and runs the integrity checks (§1.5). Wired into the SessionStart hook and pre-commit, so the index is always current and the law/DAG/dangling-ref checks gate like any other quality gate.

---

## 5. How the elite practices map in

Every principle from the source conversation has a structural home — none is left as aspiration.

| Elite practice | Where it lives in v2 |
|---|---|
| Problem definition over solution | DEFINE is mandatory phase 0; directive `Problem:` field. |
| Tight feedback loops / be wrong cheaply | Three nested loops; appetite; staged rollout in `/build --release`. |
| Decision reversibility (one-/two-way doors) | `Door:` field on objectives + directives; one-way → design doc + sign-off. |
| Writing is the thinking | Objective brief, working-backwards doc, design docs, ADRs. |
| Craft at the seams | State-coverage row in every UI directive's done-when. |
| Measure honestly (quant + qual, North Star) | Success metric on every objective; instrumentation row in done-when; LEARN ingests real metrics. |
| Scope discipline / courage to cut | `Appetite:` field; LEARN can verdict an objective **killed**. |
| Team as the unit / critique culture | Front-loaded critique in SHAPE; adversarial review in PROVE. |
| Reality talks back (outer loop) | LEARN + `/learn git` + metrics + calibration. |
| Simplicity as the default | Prime directive (§0); modular-monolith-by-default; YAGNI applied when scoping done-when. |
| Decisions grounded in proven standards | Principle library (§6) injected per phase; every decision cites its principle. |
| Start specific or vague | Objective levels + Opportunity Solution Tree decomposition; dual-track discovery (§1.3). |
| Decision quality (options + a recommendation) | SHAPE generates 2–4 scored options and a principle-grounded recommendation you select from (§2.2). |
| Fail on paper, not in production | Low-fi ASCII sketches reviewed and approved before any directive is written (§2.2). |
| Trees you can actually query | Node graph — ids + `parent_id` + typed refs — with a derived SQLite index and integrity gates (§1.4–1.5). |

---

## 6. Principle library — proven standards by domain

Decisions are not invented per project; they apply standards elite teams already validated. The library lives in `.d3/principles/` as one file per domain, injected into agent briefs at the phase where it bites — the same mechanism that injects skills today. Every consequential decision must **cite the principle it rests on**, so reviews check *conformance to a known-good pattern*, not taste.

The default set is tuned for **SaaS products**; any project may extend or override a domain file.

| Domain | Canonical standards D3 applies | Consulted at |
|---|---|---|
| Product & discovery | Jobs-to-be-Done · Continuous Discovery + Opportunity Solution Tree (Torres) · Working Backwards (Amazon) · North Star + counter-metrics · RICE/ICE · Shape Up (appetite) | DEFINE · SHAPE · LEARN |
| UX & UI | Nielsen's 10 heuristics · Laws of UX (Fitts, Hick, Gestalt) · atomic design + design tokens · mobile-first / responsive · first-class empty/error/loading states | SHAPE · PROVE |
| Accessibility | WCAG 2.2 AA (ISO/IEC 40500:2025); 2.1 AA as legal floor · keyboard nav · ARIA · contrast ratios | SHAPE done-when · PROVE |
| Architecture | 12-Factor (+ API-first, OpenTelemetry, zero-trust) · SOLID · Domain-Driven Design · C4 model diagrams · OpenAPI-first contracts · modular-monolith-by-default, services when warranted · one-/two-way doors + ADRs | DEFINE (door) · SHAPE · BUILD |
| Logic & code | Clean code · GoF patterns · TDD · DRY/KISS/YAGNI · trunk-based development · Conventional Commits · SemVer | BUILD (hooks) · PROVE |
| Security | OWASP Top 10:2025 · OWASP ASVS 5.0 · least privilege · secrets management · secure SDLC · supply-chain integrity · SaaS tenant isolation | SHAPE · BUILD · PROVE |
| Data & privacy | Sound data modeling + safe migrations · privacy-by-design · data minimization · tenant data isolation | SHAPE · BUILD |
| Delivery & ops | DORA four-plus-one (elite change-failure-rate 0–15%) · CI/CD · progressive delivery (flags, canary 1%→100%) · SRE SLO/SLI + error budgets · observability (logs/metrics/traces) · runbooks + blameless postmortems | BUILD (--release) · PROVE · LEARN |
| SaaS business | NRR >100% · LTV:CAC >3:1 · CAC payback <12mo · gross margin 70–85% · Rule of 40 · PLG + activation within first 7 days | DEFINE (success metric) · LEARN |

### 6.1 SDLC coverage — inception to launch

The five phases span the full lifecycle; no stage is left without a home.

| SDLC stage | D3 phase | Primary domains consulted |
|---|---|---|
| Inception / discovery | DEFINE | Product & discovery · SaaS business |
| Requirements / problem framing | DEFINE | Product · UX (jobs) · architecture (door) |
| Design (product, UX, system) | SHAPE | UX/UI · accessibility · architecture · data · security |
| Implementation | BUILD | Logic & code · architecture · security · data |
| Verification / QA | PROVE | Logic (TDD) · UX · accessibility · security · delivery |
| Release / launch | BUILD --release → PROVE | Delivery & ops · security |
| Operate / learn / iterate | LEARN | Delivery (DORA) · SaaS business · all audits |

This is what "cover all SDLC domains" means concretely: each phase declares which principle files it loads, so an agent shaping a screen always has WCAG + Nielsen in its brief, and an agent in LEARN always has DORA + SaaS metrics in its brief — automatically, every time.

---

## 7. Rollout & migration

A breaking refactor of a distributed system needs a careful path.

### 7.1 Backward compatibility
- Ship **command aliases** for one minor version: old names print a one-line deprecation notice and forward to the new verb (`/audit` → `/learn`, `/plan` → `/shape`, etc.).
- Update any scheduled tasks (`/schedule`) automatically during `d3 update`.

### 7.2 Data migration (the orphan problem + the node split)
- `d3 update` runs a one-time migration:
  - **Split** the monolithic `.d3/TASKS.md` into one node file per directive (`.d3/directives/`) with YAML frontmatter (id, parent_id, status, refs); regenerate `TASKS.md` as a board view.
  - Directives with no parent objective are **quarantined** under a synthetic `OBJ-000: Legacy / unclassified` so nothing breaks; a report lists them for the owner to re-home via `/define`.
  - Build `.d3/index.db` and run the integrity checks; report any cycles or dangling refs.
- After migration, `/directive` and `/shape` refuse to emit an orphan, and `d3 index` keeps the index in sync.

### 7.3 Docs
- Rewrite `src/WORKFLOW.md` around the four-artifact spine and five-phase contract (lead with the ontology, then the loop, then commands as scopes — not a flat list of 26).
- Add the Objective + Directive node templates (with frontmatter) to templates/ alongside TASKS/CHANGELOG/CLAUDE, and document the `.d3/index.db` schema.

### 7.4 Suggested implementation order
1. **Node store + index first** — one-file-per-node with frontmatter (ids, `parent_id`, typed refs), the Objective/Directive schemas, the orphan law, and `d3 index` building `.d3/index.db` with integrity checks. Everything else depends on this; it is the data foundation.
2. **Principle library scaffolding** — create `.d3/principles/` domain files and the per-phase brief injection. This is what makes every later phase apply proven standards by default.
3. **Rename + alias** — verb commands with deprecation forwards. Pure mechanical win on the convolution problem.
4. **`/learn git`** — the outer loop's cheapest, highest-value signal. No integration cost.
5. **Door + appetite + seams/instrumentation done-when** — the elite-practice fields.
6. **Objective decomposition (Opportunity Solution Tree) in DEFINE** — unlocks the vague-objective workflow and dual-track discovery.
7. **SHAPE options + low-fi sketch system** — option scoring/recommendation/selection, the multi-domain ASCII sketch cycle, and `.d3/sketches/` versioning + prune. This is the catch-mistakes-early gate before any code is written.
8. **Product metrics + staged rollout** — the second half of the outer loop; needs user setup, so last.

### 7.5 Risks / open questions
- **Discoverability** after collapsing commands — mitigated by a strong `/d3` router and `/status` surfacing next actions.
- **Solo/young repos** produce noisy git signals until there's enough history; benchmarks need a warm-up window.
- **Signal hygiene** — git forensics needs identifiable reverts/hotfixes; this argues for enforcing a commit convention (a virtuous cycle: D3 makes its own evidence legible).
- **Objective granularity** — guard against objectives becoming a second backlog; appetite + a hard "one success metric" rule keep them sharp.
- **Calibration cold start** — predicted-vs-actual comparison only gets useful after a few cycles of recorded predictions.
- **Index drift** — the SQLite index is derived, so it can lag the files; mitigated by rebuilding on the SessionStart hook + pre-commit, and by the index never being authoritative (truth is always the files; `rm .d3/index.db && d3 index` fully restores it).
- **Concurrent status writes** — many BUILD agents updating node files at once; mitigated by one-file-per-node and the orchestrator serializing status writes. If this ever becomes a bottleneck, it's the trigger to promote to persistence Option B (§1.5).

---

## 8. The one-sentence version

D3 v2 makes *definition precede action* a structural law, accepts a problem at any resolution and converges it to action, tracks everything as a queryable node graph (files as truth, SQLite as index), collapses 26 commands into a five-phase loop you can hold in your head, grounds every decision in proven elite standards across the full SDLC, and closes the outer loop so the system is corrected by reality instead of by its own opinion of itself.
