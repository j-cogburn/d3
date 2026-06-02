# [Project Name]

[One sentence: what this project does and why it exists.]

---

## What it does

[2–4 sentence description. Include the main user types, the core value proposition,
and the current implementation status (what's live vs. roadmap).]

---

## Where things live

```
[project-root]/
├── [service-1]/        [stack — e.g. Node.js, Express]
├── [service-2]/        [stack — e.g. FastAPI, Python]
├── [client]/           [stack — e.g. React, Vite]
├── .d3/
│   ├── docs/
│   │   ├── current/    As-built documentation
│   │   └── roadmap/    Forward-looking plans
│   ├── skills/         23 engineering skills (api-design, tdd, security, ...)
│   ├── TASKS.md        Task backlog + directives — orchestrator-owned
│   ├── CHANGELOG.md    Shipped work log — one entry per merged PR
│   ├── WORKFLOW.md     D3 operating manual
│   └── reports/        Timestamped audit output
└── CLAUDE.md           Project context — edit this for your project
```

Each service should have its own `CLAUDE.md` with file maps, patterns, and how-to guides.

**Services & ports**

| Service | Port | Stack |
|---|---|---|
| [Service 1] | [port] | [e.g. Node.js, Express 4, MongoDB] |
| [Service 2] | [port] | [e.g. FastAPI, PostgreSQL] |
| [Client] | [port] | [e.g. React 19, Vite] |

---

## Dev commands

```sh
# Add your local development commands here
# Example:
# npm run dev:api        # Start API server
# npm run dev:client     # Start frontend
```

---

## Key architectural decisions

| Decision | Choice | Reason |
|---|---|---|
| [Add decisions as your project evolves] | | |

---

## How work gets done

See [WORKFLOW.md](.d3/WORKFLOW.md) for the full D3 operating manual.

Tasks live in `.d3/TASKS.md` with statuses: `ready` → `in-progress (branch: ...)` → `complete (PR #N · date)`.
