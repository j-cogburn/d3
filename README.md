# D3 — Directive-Driven Development

A complete Claude Code workflow system for shipping software with AI agents. Drop it into any project to get a full `audit → plan → execute → verify → sync-docs` cycle with enforced quality gates, adversarial review, and a session-aware development context.

---

## What's in here

**`src/commands/`** — the D3 cycle as slash commands (installed to `.claude/commands/d3/`):

| Command | Purpose |
|---|---|
| `/gap [core|experience|ecosystem|defensive|differentiator]` | Product gap analysis: what's missing or underbuilt in this specific product, ranked by value × urgency |
| `/research [competitive|features|trends|users|adjacent]` | Generative market research and opportunity discovery. Add `--web` for live data |
| `/venture [market|monetize]` | Market opportunity score, competitive analysis, monetization vectors, revenue projections |
| `/evaluate [dimension]` | Scored assessment across 8 dimensions with letter grades. Tracks trajectory over time. Run at start and after each sprint |
| `/track [set|sprint|check|pivot|correct]` | Operational layer. Phases → sprints with exit criteria. Maintains bearing. Flags drift. Logs pivots. |
| `/track` | Operational layer. Phases → sprints with exit criteria. Bearing every session. Flags drift. Logs pivots. |
| `/setup [refine]` | Populate or refine CLAUDE.md via interview. Auto-detects stack, interviews for context that can't be inferred |
| `/vision [refine\|check]` | Define or refine the project vision. Creates `.d3/vision.md` — read by every agent and planning command |
| `/objective ["title"]` | Define or refine a goal. Interviews you, determines optimal D3 workflow, executes in auto or guided mode |
| `/spec [idea\|#issue]` | Requirements gathering → structured spec → feeds `/plan` |
| `/wireframe <page> [mobile\|tablet]` | ASCII wireframe for a page, flow, or spec |
| `/sprint` | Full cycle: audit → plan → execute → verify → sync-docs |
| `/audit [docs\|product\|design\|ux\|accessibility\|vision\|code]` | Find problems across seven dimensions |
| `/plan [report\|#issue\|text]` | Extract directives from findings, spec, or GitHub issue |
| `/execute [DIRECTIVE-NNN]` | Spawn agents in parallel, merge PRs, archive |
| `/test [service\|area]` | Run test suites + Playwright, report failures |
| `/release [version]` | Tests → staging → tag → post-deploy verify → rollback docs |
| `/retro` | Post-sprint retrospective, seeds next sprint |
| `/status` | One-screen project health snapshot |
| `/resolve <description>` | Instant one-shot fix cycle |
| `/improve [ux\|design\|accessibility\|ia\|copy\|interactions\|code]` | Quality-only audit + fix cycle |
| `/directive`, `/task` | Add work items to `.d3/TASKS.md` |
| `/sync-docs` | Update all docs to reflect what shipped |

**`src/hooks/`** — enforcement layer (installed to `.d3/hooks/`). Includes security audit hooks that trigger on `package.json`/`requirements.txt` changes:

| Hook | Trigger | What it does |
|---|---|---|
| `session-start.sh` | First message per session | Injects vision, branch, directive counts, intent-aware recommendation |
| `client-lint.sh` | Edit/Write to `client/` | ESLint gate — exit 2 blocks the agent on failure |
| `express-test.sh` | Edit/Write to `api-express/` | Jest/Vitest gate — exit 2 blocks on failure |
| `express-audit.sh` | Edit/Write to `api-express/package.json` | `npm audit --audit-level=high` — exit 2 on vulnerabilities |
| `python-test.sh` | Edit/Write to `api-python/` | pytest gate — exit 2 blocks on failure |
| `python-audit.sh` | Edit/Write to `api-python/requirements.txt` | `pip-audit` — exit 2 on vulnerabilities |

**`src/scripts/orchestrate.js`** — context-window-safe batch execution for large sprints (installed to `.d3/scripts/`). Runs one `claude` process per directive in isolated git worktrees with configurable concurrency.

**`src/skills/`** — 23 engineering skills vendored from [agent-skills](https://github.com/addyosmani/agent-skills) by Addy Osmani (installed to `.d3/skills/`). Add a `**Skills:**` field to any directive to inject the relevant skill workflows into the agent brief at execution time.

**`src/WORKFLOW.md`** — the complete D3 operating manual (installed to `.d3/WORKFLOW.md`).

**`bin/d3.js`** — the installer CLI: `d3 init` and `d3 update`.

**`templates/`** — blank starters for `TASKS.md`, `CHANGELOG.md`, and `CLAUDE.md`.

**`.github/workflows/claude-review.yml`** — adversarial code review on every PR via Claude Code.

---

## Five-layer stack

```
CLAUDE.md (context) → Skills (commands) → Subagents (workers)
→ Workflow scripts (scaled orchestration) → Hooks (quality gates)
```

Most teams stop at layer 2–3. This repo gives you the full stack.

---

## Quick start

### 1. Requirements

- [Claude Code CLI](https://docs.anthropic.com/claude-code) — `npm install -g @anthropic-ai/claude-code`
- [GitHub CLI](https://cli.github.com/) — `gh auth login`
- Git

### 2. Install

Run this in your project root:

```bash
npx github:j-cogburn/d3 init
```

This installs D3 without touching any existing files — it creates `.d3/`, drops commands into `.claude/commands/d3/`, and merges D3 hooks into `.claude/settings.json`.

To pin a version for your team:

```bash
npm install --save-dev github:j-cogburn/d3#v1.0.0
npx d3 init
```

### 3. Configure your project

Open Claude Code in your project directory and run these three commands in order:

```
/setup    — populate CLAUDE.md (auto-detects stack, interviews for context)
/vision   — define the project vision (purpose, users, anti-goals, decision principles)
/objective — define your first goal; D3 determines the optimal approach
```

`CLAUDE.md` and `.d3/vision.md` are read by every agent before doing any work. Quality here directly impacts every agent brief — an agent with clear vision context makes better implementation decisions than one without it.

### 4. Adapt the hooks

Edit `.d3/hooks/client-lint.sh`, `express-test.sh`, and `python-test.sh` to match your service directories and test commands. Each hook follows the same pattern:

```bash
# 1. Read the edited file path from stdin
FILE=$(python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null)

# 2. Skip if not your service
[[ "$FILE" != *"your-service/"* ]] && exit 0

# 3. Run your test/lint command
OUTPUT=$(your-test-command 2>&1)
[ $? -ne 0 ] && echo "$OUTPUT" && exit 2   # exit 2 blocks the agent
```

### 5. Set the GitHub secret

Add `ANTHROPIC_API_KEY` to your repository secrets for the CI review workflow to run.

### 6. Start building

```
/objective     # define your first goal — D3 determines the approach
```

Or use individual commands:
```
/audit docs    # establish a documentation baseline
/plan          # turn findings into directives
/execute       # ship your first batch
```

### Updating

When D3 ships improvements to commands or hooks, pull them in with:

```bash
npx github:j-cogburn/d3 update
```

This overwrites only D3-owned files — your `TASKS.md`, `CHANGELOG.md`, `docs/`, and customized hooks content are never touched.

---

## Adapting for your stack

The hook scripts are named after common stacks but the paths are fully configurable. Match the directory names to your project:

| You have | Edit this file | Change this |
|---|---|---|
| React/Vite frontend | `.d3/hooks/client-lint.sh` | `client/` path and `npm run lint --prefix client` |
| Node.js API | `.d3/hooks/express-test.sh` | `api-express/` path and `npm test --prefix api-express` |
| Python API | `.d3/hooks/python-test.sh` | `api-python/` path and `.venv/bin/pytest api-python/tests/` |
| Something else | Copy any hook as a template | Adjust the path check and test command |

Hooks that don't match any files in your project are silent no-ops — safe to leave as-is.

---

## The orchestrator for large batches

When you have 20+ ready directives, `/execute` automatically delegates to the script:

```bash
npm run orchestrate           # all ready directives
npm run orchestrate:dry       # preview without executing
node .d3/scripts/orchestrate.js DIRECTIVE-055    # one directive
D3_CONCURRENCY=6 npm run orchestrate             # override concurrency (default 4)
```

Add to your `package.json`:
```json
{
  "scripts": {
    "orchestrate": "node .d3/scripts/orchestrate.js",
    "orchestrate:dry": "node .d3/scripts/orchestrate.js --dry-run"
  }
}
```

---

## Scheduling recurring sprints

```
/schedule weekly /audit docs
/schedule weekly /sprint docs
```

Docs stay fresh automatically. Manage schedules with `/schedule list`.

---

## Full reference

See [WORKFLOW.md](.d3/WORKFLOW.md) for the complete operating manual: command reference, directive lifecycle, audit dimensions, design principles, and the industry benchmark assessment.
