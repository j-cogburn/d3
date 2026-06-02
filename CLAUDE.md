# D3 — Directive-Driven Development

A Claude Code workflow system that gives any project a repeatable `audit → plan → execute → verify → sync-docs` cycle with enforced quality gates, adversarial review, and session-aware context.

---

## What it does

D3 installs into any existing project via `npx github:j-cogburn/d3 init` and wires up slash commands, session hooks, and an orchestrator without touching any existing project files. The system is fully operational: solo developers and small teams use it to ship software with AI agents at consistent quality. This repo both produces the D3 package and uses D3 for its own development.

---

## Where things live

```
[project-root]/
├── src/                  Distributable source — everything that lands in user projects
│   ├── commands/         Slash commands → .claude/commands/d3/ in target
│   ├── hooks/            Hook scripts → .d3/hooks/ in target
│   ├── scripts/          Orchestrator → .d3/scripts/ in target
│   ├── skills/           23 agent-skills + wireframe skill → .d3/skills/ in target
│   └── WORKFLOW.md       D3 operating manual → .d3/WORKFLOW.md in target
├── templates/            Blank starters copied on d3 init
│   ├── TASKS.md
│   ├── CHANGELOG.md
│   └── CLAUDE.md
├── bin/
│   └── d3.js             CLI: d3 init, d3 update
├── .d3/                  This project's D3 state (uses D3 for its own development)
│   ├── TASKS.md
│   ├── CHANGELOG.md
│   ├── docs/
│   └── reports/
├── .claude/
│   ├── commands/d3/      Slash commands — source of truth, also distributed directly
│   └── settings.json     References src/hooks/ (dev env differs from installed env)
├── package.json
└── CLAUDE.md
```

---

## Dev commands

```sh
# Test the CLI locally
node bin/d3.js init        # run against current dir
node bin/d3.js update

# Verify what would be published
npm pack --dry-run

# Run the orchestrator against this project's own directives
npm run orchestrate
npm run orchestrate:dry
```

---

## Key architectural decisions

| Decision | Choice | Reason |
|---|---|---|
| `src/` for distributable source | Separate from `.d3/` dev state | Clear ownership: `src/` is what ships, `.d3/` is what this project tracks |
| `.d3/` for dev state only | Same structure installed projects get | Dogfooding — this project uses D3 for its own development |
| `.claude/commands/d3/` as source of truth | No symlinks | Commands live where Claude Code reads them and are distributed directly from that path |
| `settings.json` references `src/hooks/` | Source paths for dev env | Acceptable tradeoff — dev env differs from installed env; `src/` is the source |
| `package.json` `files: ["bin/", "templates/", "src/", ".claude/commands/d3/"]` | Explicit allowlist | `.d3/` dev state is excluded automatically; no `.npmignore` needed |

---

## How work gets done

See [WORKFLOW.md](src/WORKFLOW.md) for the full D3 operating manual.

Tasks live in `.d3/TASKS.md` with statuses: `ready` → `in-progress (branch: ...)` → `complete (PR #N · date)`.
