# D3 — Directive-Driven Development

This document describes the development workflow used on this project. It is the operating manual for the development system — how work gets identified, scoped, executed, and shipped.

The system is designed to be **repeatable** (same process every cycle), **consistent** (same output format every time), and **portable** (applicable to any software project that follows these conventions).

---

## The Core Cycle

Every development session follows the same loop:

```
Audit → Plan → Execute → Verify → Sync Docs
```

Each phase is a discrete command. The `/sprint` command runs all five in sequence with approval gates between phases.

```
/sprint [scope]
  │
  ├─ /audit [scope]      Find problems. Write timestamped report to .d3/reports/.
  │
  ├─ /plan [report]      Extract directives from findings. User selects which to add.
  │
  ├─ /execute            Spawn parallel agents. Merge PRs. Sync main. Archive.
  │
  ├─ /verify             Screenshot changed surfaces. Confirm no regressions.
  │
  └─ /sync-docs          Update all documentation to reflect what shipped.
```

---

## Command Reference

### Cycle Commands

| Command | Purpose |
|---|---|
| `/sprint [scope?]` | Full cycle. Scope: a feature area, phase name, or empty for full product. |
| `/audit [scope?]` | Comprehensive audit. Scope: `docs` · `product` · `design` · `ux` · `accessibility` · `vision` · `code` · empty for all. Writes timestamped report to `.d3/reports/`. |
| `/plan [source?]` | Extract directives from an audit report, section, inline description, or GitHub issue (`/plan #42`). Presents proposals; user selects before `.d3/TASKS.md` is touched. |
| `/execute [id?]` | Run all ready directives in parallel. Pass a DIRECTIVE-NNN ID to run one. Includes merge, sync, archive. |
| `/verify [scope?]` | Confirm the app works. Screenshots changed surfaces. |
| `/sync-docs` | Update `.d3/docs/current/`, service `CLAUDE.md` files, and root `CLAUDE.md` to match current code. |

### Action Commands

| Command | Purpose |
|---|---|
| `/gap [category?]` | Product gap analysis: missing features, underbuilt capabilities, table stakes, differentiators. Ranked by value × urgency ÷ effort. Feeds into `/plan` and `/spec`. |
| `/research [dimension?]` | Generative market research: competitive gaps, feature opportunities, trends, user pain points, adjacent markets. Feeds into `/spec` and `/plan`. |
| `/venture [market|monetize]` | Market opportunity score (6 factors), competitive landscape, monetization vectors ranked by potential, revenue projections with explicit assumptions. |
| `/evaluate [dimension?]` | **Unified quality dashboard** — 10 dimensions on a consistent 0–100 scale: Vision, Code, Security, Performance, Documentation, UX & Design, Accessibility, Product Completeness (from /gap), Process, Business (from /venture). | across 8 dimensions: vision, code, security, performance, docs, UX, accessibility, process. Tracks trajectory over time. |
| `/setup [refine?]` | **First step after install.** Populates or refines CLAUDE.md via interview. Auto-detects tech stack, services, and dev commands; interviews for product purpose, users, status, and architectural decisions. |
| `/objective ["title"?]` | **Recommended starting point for each goal.** Interviews you to define the goal, determines the optimal D3 workflow, executes in auto or guided mode. Supports `refine OBJ-NNN` and `list`. |
| `/spec [idea?]` | Requirements gathering. Interview mode, idea refinement, or GitHub issue → structured spec → feed into `/plan`. |
| `/wireframe <page> [mobile\|tablet]` | ASCII wireframe for a page, flow, or spec. Saved to `.d3/wireframes/` with timestamped filenames. |
| `/test [service?]` | Dedicated test pass. Runs all test suites, Playwright screenshots, reports failures. Use before `/release`. |
| `/improve [scope?]` | Quality-only cycle. Scopes: `design` · `ux` · `accessibility` · `ia` · `copy` · `interactions` · `code` · feature area. Audit → plan → execute → verify. |
| `/resolve <description>` | Instant fix. Describe the problem; a directive is created and executed immediately. |
| `/retro` | Post-sprint retrospective. Reviews velocity, quality, blockers since last tag. Seeds next sprint focus. |
| `/status` | One-screen project health snapshot. Services, git state, active directives, last audit date, recommended next action. |
| `/release [version?]` | Tests → staging check → release notes → git tag → post-deploy verification → rollback docs. |

### Primitive Commands

| Command | Purpose |
|---|---|
| `/directive <description>` | Add a single owner-declared directive to `.d3/TASKS.md`. |
| `/task <description>` | Add a task to the appropriate phase in the backlog. |
| `/project:start` | Start all local development services (project-specific). |
| `/update-config` | Modify `.claude/settings.json` (hooks, permissions, env vars). |

---

## The Directive

The directive is the atomic unit of work. Everything flows through it.

```markdown
### DIRECTIVE-NNN: <Imperative title ≤ 8 words>
**Status:** ready | in-progress — branch: feature/... | complete — PR #N · YYYY-MM-DD
**Agent:** general-purpose | Plan | claude
**Services:** Express · Python · React (only applicable)
**Skills:** api-and-interface-design, test-driven-development (optional — omit if none apply)
**Added:** YYYY-MM-DD

<2–4 sentence description: what to build, why it matters, any constraint the agent needs.>

**Done when:**
- [ ] <primary testable criterion>
- [ ] <secondary criterion if needed>
```

### Directive lifecycle

```
ready  →  in-progress (branch: feature/...)  →  complete (PR #N · date)  →  archived
```

**Owner-declared** (DIRECTIVES section of TASKS.md): Highest priority. Override everything. Set by the project owner.

**Phase tasks** (TASK-NNN in the body of TASKS.md): Normal backlog. Organized by phase. Often promoted to directives when the owner wants to run them next.

---

## How /execute builds agent briefs

The key difference from hardcoded agent prompts: `/execute` reads reference patterns **live** from the service `CLAUDE.md` files at execution time.

For each directive:
1. Reads `api-express/CLAUDE.md`, `api-python/CLAUDE.md`, and `client/CLAUDE.md` for the services in scope
2. Extracts the "How to add a feature" and reference pattern sections
3. Injects them into the agent brief alongside the directive description

This means agent briefs are always current — they reflect the actual codebase conventions, not a stale snapshot written into a command file.

---

## File conventions

| File | Purpose |
|---|---|
| `CLAUDE.md` | Project context, implementation status, architecture decisions. Read by every agent. |
| `.d3/TASKS.md` | Single source of truth for all work: active directives, phase tasks, archived work. |
| `.d3/WORKFLOW.md` | This file. The operating manual for the development system. |
| `.d3/CHANGELOG.md` | Shipped work log. One entry per merged PR, newest first. |
| `.d3/reports/` | Timestamped audit output. `docs-audit-*.md`, `product-audit-*.md`, etc. |
| `.d3/skills/` | Engineering skills (vendored from [agent-skills](https://github.com/addyosmani/agent-skills) + custom `wireframe` skill). Referenced in directive `**Skills:**` field; injected into agent briefs at execution time. |
| `.d3/wireframes/` | ASCII wireframes output by `/wireframe`. Naming: `<slug>-YYYY-MM-DD-HHMM.md`. Feed into `/plan` to create implementation directives. |
| `.d3/vision.md` | **Project vision — single source of strategic truth.** Defined by `/vision`. Read by every agent brief, `/plan`, `/audit vision`, `/objective`, and `/spec`. Contains: vision sentence, users + JTBD, success horizon, strategic bets, anti-goals, decision principles. |
| `.d3/objectives/` | Objective files output by `/objective`. Naming: `obj-NNN-<slug>-TIMESTAMP.md`. Track goal → approach → progress → directives spawned. |
| `.d3/docs/lessons/` | Agent lessons. Created when adversarial review flags critical findings. Injected into future briefs for the same services. |
| `.d3/docs/adr/` | Architecture Decision Records. Created by agents during `/execute` when significant architectural decisions are made. Naming: `adr-NNN-title.md`. |

---

## Audit dimensions

`/audit` supports five dimensions. Run individually or all at once.

| Dimension | What it checks | Output |
|---|---|---|
| `docs` | Doc accuracy vs. code; consistency; vision alignment | `.d3/reports/docs-audit-TIMESTAMP.md` — proposals applied interactively |
| `product` | Product surfaces vs. vision; UX; roadmap fidelity; mock data exposure. Desktop + mobile screenshots. | `.d3/reports/product-audit-TIMESTAMP.md` — findings by priority tier |
| `design` | Design system adherence; color tokens; component specs. Desktop + mobile screenshots. | `.d3/reports/design-audit-TIMESTAMP.md` |
| `ux` | Nielsen's 10 heuristics; task flows; cognitive load; responsive quality. Three viewports. | `.d3/reports/ux-audit-TIMESTAMP.md` — findings by severity |
| `accessibility` | WCAG 2.1 AA; keyboard nav; ARIA; contrast ratios; screen reader compatibility | `.d3/reports/accessibility-audit-TIMESTAMP.md` — Pass/Fail per surface |
| `vision` | Strategic alignment; sequencing; business model integrity; risk exposure | `.d3/reports/vision-audit-TIMESTAMP.md` — founding-team briefing format |
| `code` | Known bugs; import errors; hardening plan gaps | `.d3/reports/code-audit-TIMESTAMP.md` — findings by severity |

**Prerequisite:** `product` requires a `docs-audit-*.md` within 7 days. Docs must be current before evaluating the product against them.

---

## Repeatable cycle in practice

### Starting a new session
```
/status
```
One command to understand where things stand: services, git state, open directives, last audit, recommended next action.

### Running a development sprint
```
/sprint                    # full cycle
/sprint "Phase 2"          # scoped to Phase 2 items
/sprint product            # product audit only, then execute ready directives
```

### Targeted work
```
/execute                   # run all ready directives now
/execute DIRECTIVE-055     # run one specific directive
/resolve "broken login on mobile"   # instant fix cycle
/improve ux                # quality-only pass on UX issues
```

### Shipping a release
```
/release 1.2.0
```

---

## Portability

This system works on any project that uses these conventions:

1. **`CLAUDE.md`** at the root — project context, services, commands
2. **`.d3/TASKS.md`** — directive and task backlog in the format above
3. **`.d3/CHANGELOG.md`** — shipped work log
4. **`.d3/docs/`** — documentation with `.d3/docs/current/` for as-built state
5. **`.d3/reports/`** — audit output directory

To use D3 on a new project:
1. Copy `.claude/commands/` and `.d3/` — commands and the D3 state directory; adapt `.d3/hooks/` scripts to your stack
2. Create `CLAUDE.md` following the format in this project; `.d3/TASKS.md`, `.d3/CHANGELOG.md`, and `.d3/WORKFLOW.md` come with the copy
3. Create a `project/` subfolder in `.claude/commands/` for any commands specific to your new project's services
4. Run `/status` to verify the system is wired up
5. Run `/audit` to establish a baseline

---

## What gets archived

Completed directives move from the active DIRECTIVES section of TASKS.md to the `## ARCHIVED DIRECTIVES` section at the bottom. The summary table tracks all directives by ID, title, and PR. Full detail blocks are preserved for historical reference.

`/execute` handles archiving automatically at the end of every run.

---

## Design principles

**Directives over tasks.** The directive is the unit that gets executed. Tasks live in the backlog until promoted to directives.

**Parallel by default.** All ready directives run simultaneously in isolated worktrees. Sequential execution is the exception, not the rule.

**Agents read live context.** Agent briefs are constructed from current `CLAUDE.md` content — not from hardcoded patterns that go stale.

**Docs are part of the cycle.** `/sync-docs` runs after every execute cycle. Documentation drift is a bug.

**Verify before moving on.** `/verify` runs after every merge batch. Regressions caught immediately are free; regressions caught in production are expensive.

**Reports drive directives.** Audit reports are not documents to file and forget — they feed directly into `/plan`, which turns findings into actionable directives.

---

## Industry benchmark

### How top teams operate

Elite teams structure their Claude Code usage in five layers, each building on the last:

```
CLAUDE.md (context) → Skills (reusable procedures) → Subagents (workers)
→ Workflow scripts (scaled orchestration) → Hooks (quality gates)
```

The separator between casual and elite users is layers 4 and 5. Most developers stop at layer 2–3.

**Key patterns used by top-performing teams:**

- **Hooks** — `PostToolUse` hooks run lint and tests after every file change. Exit code 2 blocks the commit. Quality is enforced automatically, not trusted.
- **Adversarial review** — a second independent agent reviews every PR before it merges. Finds what the implementing agent missed.
- **Workflow scripts** — for 20+ agent batches, orchestration moves into a JavaScript script rather than relying on Claude's context window. Enables repeatable quality patterns (adversarial review, voting on claims) that single-pass work cannot.
- **SessionStart hooks** — project context (last audit date, open directives, git state) loads automatically at the start of every session.
- **CI integration** — Claude Code runs headlessly in GitHub Actions, providing automated code review and doc auditing on every PR.
- **Test-first done-when** — every directive's done-when includes a test criterion. Agents cannot close out work without tests passing.

---

### D3 honest assessment

**Strengths — what D3 has that most teams don't:**

- Full `audit → plan → execute → verify → sync-docs` cycle in one command — very few teams have this
- Scoped audit dimensions (docs, product, design, vision, code) with prerequisite enforcement
- Live brief construction from CLAUDE.md — most teams hardcode reference patterns that go stale
- Typed directive lifecycle with automatic archiving and CHANGELOG maintenance
- WORKFLOW.md — the system is documented as a first-class artifact, not tribal knowledge

**Gaps — what D3 is missing:**

| Gap | Severity | Status |
|---|---|---|
| ~~No hooks~~ | ~~Critical~~ | ✅ Implemented — `PostToolUse` ESLint gate (client) + pytest gate (Python) in `.claude/settings.json` |
| ~~No test gate in `/execute`~~ | ~~Critical~~ | ✅ Implemented — all directives now require test gate in done-when; hooks enforce on every edit |
| ~~No adversarial review~~ | ~~High~~ | ✅ Implemented — Step 8 in `/execute` runs `/code-review medium` before every merge |
| ~~Done-when rarely includes tests~~ | ~~Medium~~ | ✅ Implemented — `/directive`, `/plan`, `/resolve` all require test criteria |
| ~~No `SessionStart` hook~~ | ~~High~~ | ✅ Implemented — `UserPromptSubmit` hook injects session context once per session via `.d3/hooks/session-start.sh` |
| ~~No GitHub Issues → `/plan`~~ | ~~Medium~~ | ✅ Implemented — `/plan #NNN` reads the issue via `gh issue view` and proposes a directive |
| ~~No CI integration~~ | ~~Medium~~ | ✅ Implemented — `.github/workflows/claude-review.yml` runs `/code-review medium --comment` on every PR |
| ~~No workflow scripts~~ | ~~Medium~~ | ✅ Implemented — `.d3/scripts/orchestrate.js` worker-pool executor; `/execute` delegates at 20+ directives |

**Where D3 stands:** Full audit → plan → execute → verify → sync-docs cycle with enforced lint/test gates, adversarial review on every PR, session-aware context injection, GitHub issue intake, CI review on every push, and an out-of-context orchestrator for large batches. Top-tier by any measure. Remaining gaps: Express test hook (no test runner yet), adversarial review not wired into the orchestrator path, CI flag syntax unverified in production.

---

### Improvement roadmap

#### Tier 1 — ✅ Implemented (2026-05-31)

**1. Hooks for lint and test gates** ✅

`.claude/settings.json` `PostToolUse` hooks enforce:
- **ESLint** — runs `npm run lint --prefix client` after any `Edit|Write` touching `client/`. Exit 2 blocks agent turn on failure. Script: `.d3/hooks/client-lint.sh`
- **pytest** — runs `api-python/.venv/bin/pytest api-python/tests/ -q` after any `Edit|Write` touching `api-python/`. Exit 2 blocks on failure. Script: `.d3/hooks/python-test.sh`
- Express hook: add once your Node.js service has a test runner.

**2. Test criterion in every directive's done-when** ✅

`/directive`, `/plan`, and `/resolve` all require a test gate criterion per service in scope:
- Express: `npm test --prefix api-express` passes
- Python: `api-python/.venv/bin/pytest api-python/tests/ -q` passes
- React: `npm run build --prefix client` succeeds

**3. Adversarial review before merge** ✅

`/execute` Step 8 invokes `/code-review medium` on every PR before the merge prompt. Critical findings surface for user action; minor findings are shown and merge proceeds.

#### Tier 2 — ✅ Implemented (2026-06-01)

**4. SessionStart hook** ✅

`UserPromptSubmit` hook runs `.d3/hooks/session-start.sh`. Uses `session_id` to write a `/tmp` marker — fires exactly once per Claude Code session. Outputs: branch + git state, directive counts + IDs, last audit dates for all five dimensions, recommended next action.

**5. `/plan #<issue-number>`** ✅

Step 2 of `/plan` detects `#NNN` or bare-number arguments, calls `gh issue view <N> --json title,body,labels,assignees,milestone`, and uses the issue as source material. Issue number is referenced in the proposed directive title.

**6. GitHub Actions CI review** ✅

`.github/workflows/claude-review.yml` triggers on `pull_request` (opened / synchronize / reopened). Checks out with `fetch-depth: 0`, installs Claude Code, runs `claude --print "/code-review medium --comment"` with `ANTHROPIC_API_KEY` and `GH_TOKEN`. Requires `ANTHROPIC_API_KEY` secret in the repo.

#### Tier 3 — ✅ Implemented (2026-06-01)

**7. Workflow scripts for large batches** ✅

`.d3/scripts/orchestrate.js` — Node.js worker-pool executor. Reads `.d3/TASKS.md` for ready directives, builds live briefs from service `CLAUDE.md` files, spawns one `claude --print --dangerously-skip-permissions` per directive in an isolated git worktree, limits concurrency to `D3_CONCURRENCY` (default 4), and writes `.d3/TASKS.md` + `.d3/CHANGELOG.md` entries incrementally as each agent completes.

`/execute` delegates automatically when 20+ directives are ready. Also available directly:
```bash
npm run orchestrate           # all ready directives
npm run orchestrate:dry       # preview without executing
node .d3/scripts/orchestrate.js DIRECTIVE-055   # single directive
D3_CONCURRENCY=6 npm run orchestrate            # override concurrency
```

**8. Scheduled sprints** ✅

`/sprint` now documents the `/schedule` integration. To set up a weekly docs audit:
```
/schedule weekly /audit docs
```
For a full weekly sprint:
```
/schedule weekly /sprint docs
```
Manage active schedules with `/schedule list`.
