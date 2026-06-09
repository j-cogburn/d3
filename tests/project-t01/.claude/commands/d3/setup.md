Populate or refine CLAUDE.md through an interview. Auto-detects directory structure, tech stack, services, and dev commands — then interviews you for what can't be inferred from code: product purpose, user types, implementation status, and architectural decisions.

**Usage:**
- `/setup` — auto-detects mode: creates CLAUDE.md if absent, offers to refine if present
- `/setup refine` — force refinement of an existing CLAUDE.md section by section
- `/setup services` — update only the services/ports and dev commands sections

---

## Step 0 — Detect mode

Check if `CLAUDE.md` exists and has been filled in (i.e., does not contain `[Project Name]` placeholder text).

- No `CLAUDE.md` → **create mode**
- `CLAUDE.md` exists with placeholders → **create mode** (treat as blank)
- `CLAUDE.md` exists and is filled in → **refine mode** (unless `$ARGUMENTS` is `services`)

---

## Step 1 — Auto-detect project signals

Run these before the interview to fill in what can be inferred:

```bash
# Directory structure
find . -maxdepth 2 -not -path './.git/*' -not -path './node_modules/*' \
  -not -path './.d3/*' -not -path './__pycache__/*' | sort

# Package.json (Node services)
find . -maxdepth 3 -name 'package.json' -not -path '*/node_modules/*' \
  -exec echo "=== {} ===" \; -exec cat {} \; 2>/dev/null | head -80

# Python services
find . -maxdepth 3 -name 'requirements.txt' -o -name 'pyproject.toml' \
  -o -name 'setup.py' 2>/dev/null | head -10

# Port references
grep -rn 'PORT\|port\|:3000\|:5000\|:8000\|:4000' \
  --include='*.js' --include='*.ts' --include='*.py' --include='*.env*' \
  --include='docker-compose*' . 2>/dev/null | grep -v node_modules | head -20

# Existing README
cat README.md 2>/dev/null | head -30
```

From this, infer:
- **Services** — identify each service directory, its stack (Node/Express, FastAPI, React/Vite, etc.)
- **Ports** — extract from config files, env examples, or docker-compose
- **Dev commands** — extract `scripts` from each package.json; note Makefile targets if present
- **Directory structure** — map the top-level layout

Present what was auto-detected to the user before the interview:

```
Auto-detected:
  Services: api-express (Node/Express), client (React/Vite), api-python (FastAPI)
  Ports:    api-express → 5001, client → 3001, api-python → 8000
  Dev commands: npm run dev (client), npm start (api-express)

I'll now ask a few questions about what I couldn't infer from the code.
```

---

## Step 2 — Interview

Ask **one question at a time**. Use the auto-detected context to make questions specific. Minimum 4 questions, maximum 8. Stop when all required signals are captured.

**Required signals:**

**Product identity:**
> "In one sentence — what does [project name] do and why does it exist?"

**Users:**
> "Who are the main user types? For example: 'admins and end users', or 'quantitative analysts and traders'."

**Value proposition:**
> "What's the core value each user type gets from [product]? What would they miss most if it disappeared?"

**Implementation status:**
> "What's currently live and working versus actively in development versus planned for later? Give me a rough split."
*(This is critical for agents — they need to know what's real vs. roadmap)*

**Architectural decisions** (open-ended, invite multiple):
> "What are the most important architectural decisions made on this project — the choices that would surprise a new developer or that future agents need to understand? Include the reason behind each."
*(Ask follow-ups if the answer is thin — these entries have the highest impact on agent quality)*

**Agent catch-all:**
> "Is there anything else an AI agent should know before working on this codebase? Gotchas, conventions, things that look wrong but are intentional?"
*(Often surfaces the most valuable context)*

**Refinement mode — section-by-section approach:**

Read the existing CLAUDE.md. For each section ask:
> "The current [section] says: '[existing content]'. Is this still accurate? What's changed or what would you add?"

Skip sections the user says are fine. Move efficiently — don't re-ask what's already good.

---

## Step 3 — Write CLAUDE.md

Compose the full CLAUDE.md from auto-detected data + interview answers:

```markdown
# [Project Name]

[One sentence from the interview]

---

## What it does

[2–4 sentences covering: user types, core value proposition, implementation status (what's live vs. in development vs. roadmap). Use the user's own words where possible.]

---

## Where things live

\`\`\`
[project-root]/
├── [service-1]/        [stack — auto-detected]
├── [service-2]/        [stack — auto-detected]
├── [client]/           [stack — auto-detected]
├── .d3/
│   ├── docs/
│   │   ├── current/    As-built documentation
│   │   └── roadmap/    Forward-looking plans
│   ├── skills/         Engineering skills (api-design, tdd, wireframe, ...)
│   ├── wireframes/     ASCII wireframes — output of /wireframe
│   ├── objectives/     Goals + approach + progress — output of /objective
│   ├── TASKS.md        Task backlog + directives
│   ├── CHANGELOG.md    Shipped work log
│   ├── WORKFLOW.md     D3 operating manual
│   └── reports/        Timestamped audit output
└── CLAUDE.md           Project context — this file
\`\`\`

Each service has its own \`CLAUDE.md\` with file maps and patterns. [Note if service-level CLAUDE.md files don't exist yet.]

**Services & ports**

| Service | Port | Stack |
|---|---|---|
[auto-detected rows]

---

## Dev commands

\`\`\`sh
[auto-detected commands with inline comments]
\`\`\`

---

## Key architectural decisions

| Decision | Choice | Reason |
|---|---|---|
[one row per decision from the interview — be specific about the reason]

---

## What agents need to know

[Anything from the catch-all question: gotchas, conventions, intentional oddities, things that look wrong but aren't.]
*(Omit this section if nothing was captured — don't leave a placeholder)*

---

## How work gets done

See [WORKFLOW.md](.d3/WORKFLOW.md) for the full D3 operating manual.

Tasks live in \`.d3/TASKS.md\` with statuses: \`ready\` → \`in-progress (branch: ...)\` → \`complete (PR #N · date)\`.
```

**Refinement mode:** show a diff of what changed. Ask for confirmation before writing.

---

## Step 4 — Offer next steps

```
CLAUDE.md updated — project context is ready.

Every agent brief will now include this context automatically.

Suggested next steps:
Next: /vision — define your project vision (what you're building, for whom, what you won't build).
Vision keeps every agent strategically aligned. Run it before any execution work.

Other options:
  /setup services  — update service-level CLAUDE.md files
  /audit docs      — verify documentation matches the codebase
```

If this was a fresh install with no previous directives:
```
  /objective       — start here — define your first goal
```
