Interactive guide to D3. Detects where you are in the setup process and walks you through what you need to understand — step by step, with a concrete action at the end of every section.

**Usage:**
- `/guide` — auto-detect your stage and guide you from there
- `/guide start` — start from the beginning (complete introduction)
- `/guide workflow` — explain the D3 development cycle in plain terms
- `/guide concepts` — explain the core concepts: directives, vision, skills, objectives
- `/guide commands` — overview of all commands and when to use each
- `/guide "[topic]"` — explain a specific thing (e.g. `/guide "what is a directive"`)

---

## Step 0 — Detect stage

Before guiding, understand where the developer is. Run:

```bash
# Is CLAUDE.md filled in?
grep -q '\[Project Name\]' CLAUDE.md 2>/dev/null && echo "TEMPLATE" || echo "FILLED"

# Is vision defined?
[ -f .d3/vision.md ] && grep -q 'Run /vision' .d3/vision.md 2>/dev/null && echo "STUB" || \
  ([ -f .d3/vision.md ] && echo "DEFINED" || echo "MISSING")

# Has any work been done?
grep -c 'complete\|DIRECTIVE' .d3/TASKS.md 2>/dev/null || echo 0

# Are there CHANGELOG entries?
grep -c '^- ' .d3/CHANGELOG.md 2>/dev/null || echo 0

# Any audit reports?
ls .d3/reports/*.md 2>/dev/null | wc -l | tr -d ' '
```

Classify the developer's stage:

| Stage | Condition | Guide path |
|---|---|---|
| **0 — Fresh** | CLAUDE.md is template, no vision | Full introduction → foundation setup |
| **1 — Context set** | CLAUDE.md filled, no vision | Skip intro → vision definition |
| **2 — Foundation done** | Vision defined, no directives run | Skip to workflow → first cycle |
| **3 — Active** | Directives completed, audits run | Advanced features and optimisation |
| **4 — Stuck** | Has work in progress but nothing moving | Diagnose and unblock |

If `$ARGUMENTS` is a keyword or question, skip stage detection and go directly to that topic.

---

## GUIDE PATH: Fresh install (Stage 0)

### Introduction

```
Welcome to D3 — Directive-Driven Development.

D3 is a workflow system that runs on top of Claude Code. It gives your AI
agents structure, quality gates, and strategic direction — so they build
the right things, correctly, without drifting.

The problem it solves: Claude Code agents are capable but stateless.
Without a system, every session starts from scratch, quality is
inconsistent, and work doesn't add up to anything coherent.

D3 fixes that with three things:
  1. Persistent context  — CLAUDE.md and .d3/vision.md so agents always
                           know what the project is and what it isn't
  2. A repeatable cycle  — audit → plan → execute → verify → sync-docs
  3. Quality enforcement — hooks that block agents on failing tests,
                           security vulnerabilities, and coverage drops

Let's get you set up. This takes about 15 minutes.
```

Ask (single-select):
- "Walk me through each step (recommended)"
- "Show me the commands I need to run and I'll figure it out"
- "Just explain what D3 is first, then we'll set it up"

---

### Foundation setup (interactive)

**Step 1: Project context**

```
STEP 1 OF 3 — Project context (CLAUDE.md)
==========================================
Every agent that runs a directive reads CLAUDE.md before doing anything.
The quality of your CLAUDE.md directly determines the quality of every
agent brief. A well-filled CLAUDE.md means agents make better decisions
without you explaining context each time.

Run /setup to fill it in — it auto-detects your tech stack and interviews
you for what it can't infer (what your product does, who uses it, what's
live vs. roadmap, key architectural decisions).
```

Ask:
- "Run /setup now"
- "I'll fill in CLAUDE.md manually — skip to Step 2"

If they choose to run /setup: invoke it, wait for completion, then continue.

---

**Step 2: Project vision**

```
STEP 2 OF 3 — Project vision (.d3/vision.md)
=============================================
Your vision file is what keeps agents strategically aligned.
It's the difference between an agent that implements a feature
"correctly" and one that implements it correctly *for your product*.

The most important part: anti-goals. These explicitly tell agents
what you will NOT build — even if it seems related or users ask for it.
Without anti-goals, agents will "helpfully" add things that take you
in the wrong direction.

Example anti-goal: "We will NOT build a general project management UI.
D3 lives in the terminal and the repo."

Run /vision to define yours through a short interview (6 questions).
```

Ask:
- "Run /vision now"
- "Skip — I'll define vision later"

If they choose to run /vision: invoke it, wait for completion, then continue.

---

**Step 3: First cycle**

```
STEP 3 OF 3 — Your first development cycle
============================================
Now that context and vision are set, the normal D3 flow is:

  /objective    ← Start here. Describe what you want to build.
                  D3 interviews you, determines the best approach,
                  and can execute it automatically or guide you step by step.

OR if you want to find what to build first:

  /audit docs   ← Audit your documentation for gaps
  /gap          ← Find missing features in your product
  /research     ← Explore market opportunities

What would you like to do?
```

Ask (single-select):
- "Run /objective — I know what I want to build"
- "Run /audit docs — find problems first"
- "Run /gap — discover what features are missing"
- "Explain the workflow first, then I'll decide"

Execute the chosen option. Guide setup complete.

---

## GUIDE PATH: Context set, no vision (Stage 1)

```
Your CLAUDE.md is filled in — good. But you haven't defined a project vision yet.

This matters because every agent brief currently has no strategic direction.
Agents will implement things correctly but won't know what NOT to build.

Run /vision now. It takes 6 questions and 5 minutes.
```

Ask:
- "Run /vision now"
- "Explain what vision does first"

If they want an explanation, provide the vision concept explanation below, then ask again.

---

## GUIDE PATH: Foundation done, no work run (Stage 2)

```
Your foundation is set: CLAUDE.md and vision are defined.

Time to run your first development cycle. The D3 workflow is:

  Find problems → Decide what to build → Build it → Verify → Document

The simplest entry point: /objective

Describe what you want to achieve. D3 will:
  1. Interview you briefly (2–4 questions)
  2. Determine the best workflow (audit first? wireframe? spec? direct execution?)
  3. Ask whether to run automatically or guide you step-by-step
  4. Execute the plan
```

Ask:
- "Run /objective now"
- "Explain the full workflow first"
- "Show me all the commands I can use"

---

## GUIDE PATH: Active use (Stage 3)

```
You're using D3 and have shipped work. Here are the features
that give you the most leverage at this stage:
```

Present these four as topics to explore (multiSelect):

- "Vision alignment — keeping agents on track as the product evolves"
- "Skills — injecting engineering discipline into agent briefs"
- "Parallel execution and the orchestrator — shipping 20+ directives at once"
- "Business intelligence — /venture, /research, /gap, /evaluate"
- "Quality gates — how hooks, adversarial review, and CI work together"

For each selected topic, provide the explanation from the concepts section below.

---

## GUIDE PATH: Stuck (Stage 4)

Diagnose the most likely issue:

```bash
# What's in progress?
grep 'in-progress\|needs-review\|ci-failed' .d3/TASKS.md 2>/dev/null

# How long has it been stuck? (last CHANGELOG entry)
grep -m1 '^## ' .d3/CHANGELOG.md 2>/dev/null

# Are there ready directives not being run?
grep -c '\*\*Status:\*\* ready' .d3/TASKS.md 2>/dev/null || echo 0
```

Based on findings, diagnose:

| Finding | Diagnosis | Fix |
|---|---|---|
| `needs-review` entries | Adversarial review flagged critical issues | Check `.d3/docs/lessons/`, review the PR manually, resolve findings |
| `ci-failed` entries | CI checks are failing | Run `/test` to see what's breaking |
| `in-progress` with no recent CHANGELOG | Agent may have timed out | Check the branch, run `/resolve` to re-execute the directive |
| N ready directives | Work queued but not started | Run `/execute` |
| No ready directives, no recent CHANGELOG | Nothing to run | Run `/objective` or `/gap` to find what to build |

---

## CONCEPT EXPLANATIONS

Use these when `$ARGUMENTS` matches a concept keyword or when invoked from another guide path.

---

### Concept: Directive

```
A DIRECTIVE is the atomic unit of work in D3.

It's a precise task card that specifies:
  - What to build (description + done-when criteria)
  - Which services are involved (Express / Python / React)
  - Which skills to apply (api-and-interface-design, test-driven-development, etc.)
  - Which spec it came from (traceability)

Lifecycle: ready → in-progress → complete → archived

Example:
  ### DIRECTIVE-042: Add JWT refresh token endpoint
  **Status:** ready
  **Services:** Express
  **Skills:** api-and-interface-design, security-and-hardening, test-driven-development

  Implement a POST /auth/refresh endpoint that accepts a valid refresh token
  and returns a new access token. Token rotation required.

  Done when:
  - [ ] POST /auth/refresh returns 200 with new access token
  - [ ] Invalid/expired tokens return 401 with clear error
  - [ ] npm test --prefix api-express -- --coverage passes with ≥70% coverage

You create directives with: /directive, /plan, /resolve, or /objective
You execute them with: /execute (spawns agents in parallel worktrees)
```

---

### Concept: Vision

```
Your VISION (.d3/vision.md) is the strategic alignment layer.

Every agent brief includes:
  - Your one-sentence vision
  - Your anti-goals (what you won't build)
  - Your decision principles (X over Y when facing tradeoffs)

Without this: agents implement features "correctly" for a generic product.
With this: agents implement features correctly for YOUR product, with your
constraints, serving your specific users.

Anti-goals are the most important part. Example:
  "We will NOT build a general project management UI — D3 lives in the
  terminal and the repo, not in a browser dashboard."

An agent seeing this will decline to add a web dashboard feature even if
it seems helpful, because it conflicts with the anti-goal.

Create or refine with: /vision
Check directive alignment with: /vision check
```

---

### Concept: Skills

```
SKILLS are structured engineering workflows installed at .d3/skills/.

When you tag a directive with **Skills: test-driven-development**, the
agent's brief includes the full content of that skill file — the complete
TDD process, anti-patterns to avoid, and verification criteria.

It's the difference between:
  WITHOUT SKILLS: "Write tests for the auth system"
  WITH SKILLS:    The agent receives a 200-line skill file covering red-green-
                  refactor, test pyramid (80/15/5), the Beyonce Rule, and
                  verification requirements — before writing a line of code.

D3 ships 33 skills covering:
  Engineering: TDD, security, API design, incremental implementation, code review
  Design/UX: wireframe, design-critique, ux-writing, design-system, interaction-design
  Product: user-journey-mapping, information-architecture, user-research-synthesis
  Database: migration-safety
  Reference checklists: accessibility, performance, testing patterns, security

Skills are injected automatically when listed in the directive's **Skills:** field.
/directive, /plan, and /resolve suggest relevant skills based on the description.
```

---

### Concept: Objective

```
/objective is the intelligent entry point for most work.

Instead of deciding which D3 command to run, you describe what you want
to achieve. D3 interviews you (2–5 questions), classifies the work by
type and scale, and routes to the optimal workflow.

Example:
  /objective "add user notifications"

D3 asks:
  → "Is this building something new, fixing something, or improving quality?"
  → "Does it involve UI?"
  → "Is this a few hours of work or a few days?"

Routes to: /spec → /wireframe → /plan → /execute → /audit ux → /verify

Then asks:
  "Auto (runs all phases, pause at selection points) or Guided (approve each step)?"

Objectives are saved to .d3/objectives/ and track progress through each phase.
```

---

### Concept: The workflow

```
The D3 development cycle in plain English:

  FIND what needs doing
    /audit [docs|product|ux|accessibility|vision|code]  ← systematic analysis
    /gap                                                  ← product gap analysis
    /research                                             ← market intelligence
    /evaluate                                             ← project health score

  DECIDE what to build
    /plan [report|spec|issue]  ← extracts directives from findings
    /directive "description"   ← add a single known directive
    /objective "goal"          ← intelligent routing from a goal

  BUILD it
    /execute                   ← spawns parallel agents (CI wait + code review)
    /resolve "problem"         ← instant one-shot fix

  CONFIRM it works
    /verify                    ← screenshot and confirm surfaces
    /test                      ← full test suite + coverage + security + performance

  DOCUMENT and SHIP
    /sync-docs                 ← update documentation
    /release [version]         ← staging check + migration safety + tag + deploy

  REFLECT
    /retro                     ← what shipped, what stalled, what to focus on next

Everything starts at /status for a project health snapshot.
```

---

### Concept: Quality gates

```
D3 enforces quality automatically through hooks and checks:

HOOKS (run after every file edit):
  client-lint.sh    → ESLint on client/ — exit 2 blocks the agent
  express-test.sh   → Jest on api-express/ — exit 2 blocks
  express-audit.sh  → npm audit on package.json changes — blocks on vulns
  python-test.sh    → pytest on api-python/ — exit 2 blocks
  python-audit.sh   → pip-audit on requirements changes — blocks on vulns

ADVERSARIAL REVIEW (runs after each PR):
  /execute Step 8: an independent agent code-reviews every PR before merge
  Critical findings → directive marked needs-review (not completed)
  Lessons from critical findings → saved to .d3/docs/lessons/ and injected
  into future agent briefs for the same services

CI WAIT:
  The orchestrator polls gh pr checks until CI passes before marking complete
  CI failures → directive marked ci-failed, reverted to ready

COVERAGE THRESHOLD:
  /test reports coverage per service, fails below 70% (configurable)
  Done-when criteria now require --coverage flags in test commands

PERFORMANCE REGRESSION:
  /test compares Lighthouse scores against .d3/reports/performance-baseline.json
  Regressions >10% flagged before release
```

---

## Step — Guided topic response (free-form question)

If `$ARGUMENTS` is a quoted question or topic not matching a keyword:

1. Identify what concept or command the question is about
2. Provide a clear, plain-English explanation using the concept explanations above as a base
3. Give a concrete example relevant to what they're working on (read CLAUDE.md for context)
4. Offer a next action: "Want to try this now?"
