Interactive guide to D3. With no arguments, reads the full project state and tells you exactly where you are and what to do next — specific commands, in priority order, with a reason for each. Also explains any concept on demand.

**Usage:**
- `/guide` — auto-detect project stage and give prioritised next steps
- `/guide workflow` — explain the D3 development cycle in plain terms
- `/guide concepts` — explain the core concepts: directives, vision, skills, objectives
- `/guide commands` — overview of all commands grouped by purpose
- `/guide "[question]"` — explain anything (e.g. `/guide "what is a directive"`)

---

## Step 0 — Read all project signals

Run everything in parallel before assessing anything.

```bash
# ── Setup signals ─────────────────────────────────────────────────────────────
grep -q '\[Project Name\]' CLAUDE.md 2>/dev/null && echo "CLAUDE:template" || echo "CLAUDE:filled"
[ -f .d3/vision.md ] && \
  (grep -q 'Run /vision' .d3/vision.md 2>/dev/null && echo "VISION:stub" || echo "VISION:defined") || \
  echo "VISION:missing"
[ -f .d3/memory.md ] && grep -v '^<!--' .d3/memory.md | grep -q '\S' \
  && echo "MEMORY:populated" || echo "MEMORY:missing"

# ── Work state ────────────────────────────────────────────────────────────────
READY=$(grep -c '\*\*Status:\*\* ready' .d3/TASKS.md 2>/dev/null || echo 0)
IN_PROGRESS=$(grep -c 'in-progress' .d3/TASKS.md 2>/dev/null || echo 0)
NEEDS_REVIEW=$(grep -c 'needs-review' .d3/TASKS.md 2>/dev/null || echo 0)
CI_FAILED=$(grep -c 'ci-failed' .d3/TASKS.md 2>/dev/null || echo 0)
COMPLETED=$(grep -c '^- DIRECTIVE\|^- TASK' .d3/CHANGELOG.md 2>/dev/null || echo 0)
ACTIVE_OBJECTIVES=$(grep -l 'Status.*active' .d3/objectives/obj-*.md 2>/dev/null | wc -l | tr -d ' ')
echo "work: ready=$READY in_progress=$IN_PROGRESS needs_review=$NEEDS_REVIEW ci_failed=$CI_FAILED completed=$COMPLETED objectives=$ACTIVE_OBJECTIVES"

# ── Audit coverage ────────────────────────────────────────────────────────────
for dim in docs-audit product-audit design-audit ux-audit accessibility-audit vision-audit code-audit; do
  f=$(ls -t .d3/reports/${dim}-*.md 2>/dev/null | head -1)
  [ -n "$f" ] && echo "audit:$dim:$(basename $f | sed 's/.*-\([0-9-]*\)\..*/\1/')" || echo "audit:$dim:never"
done

# ── Track / operational layer ─────────────────────────────────────────────────
[ -f .d3/track.md ] &&   (grep -q 'Run /track set' .d3/track.md 2>/dev/null && echo "track:stub" || echo "track:active") ||   echo "track:none"
TRACK_BEARING=$(grep -m1 '^\*\*Bearing:\*\*' .d3/track.md 2>/dev/null | sed 's/\*\*Bearing:\*\* //')
[ "$TRACK_BEARING" = "drift" ] || [ "$TRACK_BEARING" = "off track" ] && echo "track:drift" || true

# ── Intelligence coverage ─────────────────────────────────────────────────────
ls -t .d3/reports/venture-*.md 2>/dev/null | head -1 | xargs -I{} echo "venture:exists" || echo "venture:none"
ls -t .d3/reports/gap-*.md 2>/dev/null | head -1 | xargs -I{} echo "gap:exists" || echo "gap:none"
ls -t .d3/reports/assessment-*.md 2>/dev/null | head -1 | xargs -I{} echo "assessment:exists" || echo "assessment:none"
ls -t .d3/reports/research-*.md 2>/dev/null | head -1 | xargs -I{} echo "research:exists" || echo "research:none"

# ── Release state ─────────────────────────────────────────────────────────────
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "none")
UNRELEASED=$(git log "${LAST_TAG}"..HEAD --oneline --merges 2>/dev/null | wc -l | tr -d ' ')
echo "release: last_tag=$LAST_TAG unreleased_merges=$UNRELEASED"

# ── Service health ────────────────────────────────────────────────────────────
curl -sf http://localhost:5001/api/health 2>/dev/null && echo "express:up" || echo "express:down"
curl -sf http://localhost:3001 >/dev/null 2>&1 && echo "client:up" || echo "client:down"
```

---

## Step 1 — Assess state

From all signals, build a state picture across five areas:

**Setup completeness:**
- CLAUDE.md: filled / template
- Vision: defined / stub / missing
- Memory profile: populated / missing (run /bootstrap)
- Hooks: configured / missing

**Work state (severity order):**
- `blocked` — needs-review or ci-failed directives exist
- `in_flight` — agents currently running
- `ready` — directives queued, nothing running
- `objective_pending` — active objective waiting for next phase
- `unreleased` — merged PRs not yet tagged
- `shipped_today` — CHANGELOG entry today, nothing else queued
- `empty` — no ready work, no recent activity

**Audit coverage:**
- Which dimensions have been run and how recently (within 30 days = fresh)
- Which have never been run

**Intelligence coverage:**
- Venture assessment: exists / missing
- Gap analysis: exists / missing
- Project assessment: exists / missing

**Release state:**
- N unreleased merges since last tag
- Last tag name

---

## Step 2 — Determine stage and print state

Print a clear "where you are" summary before any recommendations:

```
GUIDE — YYYY-MM-DD
====================

PROJECT STATE
  Setup:      CLAUDE ✓  Vision [✓/⚠/✗]  Memory [✓/✗]
  Track:      Phase [N] · Sprint [N.N]  [On track ✓ / Drift ⚠ / Not set ✗]
  Work:       [N ready · N in-progress · N completed · N needs-review · N ci-failed]
  Audits:     docs [✓/✗/date]  code [✓/✗]  ux [✓/✗]  accessibility [✓/✗]  vision [✓/✗]
  Analysis:   evaluate [✓/✗]  gap [✓/✗]  venture [✓/✗]
  Release:    [last tag] · [N unreleased merges / up to date]

STAGE: [plain English stage name]
```

Stage names (use whichever fits best):
- **"Blocked — manual review needed"** (needs-review or ci-failed)
- **"Off track — course correction needed"** (track drift detected)
- **"Agents running — in flight"** (in-progress, nothing else blocking)
- **"Ready to ship — N directives queued"** (ready directives exist)
- **"Pending release — N merges since [tag]"** (unreleased merges, no ready work)
- **"Foundation incomplete"** (CLAUDE.md, vision, or memory missing)
- **"Active development — quality coverage expanding"** (working project, gaps in audit coverage)
- **"Well-covered — strategic layer missing"** (audits done, no venture/gap analysis)
- **"Mature — next sprint starting"** (most things in place, defining next objective)

---

## Step 3 — Prioritised recommendations

Always give exactly **3 next steps**, in priority order. Each step includes:
- The command to run
- A one-sentence reason grounded in what was detected

**Priority ordering logic** (highest priority first):

1. **Unblock first** — if needs-review or ci-failed: always top priority
2. **In-flight agents** — if in-progress: check status
3. **Ready work** — if ready directives: execute them
4. **Active objective** — if objective waiting for next phase: continue it
5. **Pending release** — if unreleased merges: release
6. **Foundation gaps** — missing CLAUDE.md content, vision, or memory profile
7. **Audit gaps** — dimensions never run (accessibility and ux are highest value)
8. **Analysis gaps** — missing venture, gap, or assessment
9. **Planning** — if everything else is covered: next objective or retro

**Format:**

```
NEXT STEPS (priority order)
────────────────────────────────────────────────────
1. /[command]   [brief what]
   Why: [one sentence grounded in detected signals]

2. /[command]   [brief what]
   Why: [one sentence grounded in detected signals]

3. /[command]   [brief what]
   Why: [one sentence grounded in detected signals]
────────────────────────────────────────────────────

Run any command above, or ask: /guide "[question about anything]"
```

**Examples of well-reasoned recommendations:**

```
1. /execute          Run 3 ready directives in parallel
   Why: You have 3 directives queued and nothing blocking — this is the
   highest-leverage action right now.

1. /status           Check what's still running
   Why: DIRECTIVE-042 has been in-progress since yesterday — it may need
   attention or re-execution.

1. /audit accessibility   First-ever accessibility audit
   Why: You have active users but have never audited for WCAG compliance —
   this blocks a clean release and is the biggest unscored dimension.

2. /venture          Assess market opportunity and monetization
   Why: The project is shipping code but has no business assessment. Understanding
   the market would sharpen what to prioritise next.

3. /objective "next phase"   Define what to build in the next sprint
   Why: Nothing is queued. The retro from 3 weeks ago suggested focusing on
   the notification system — now is the time to define it.
```

---

## Step 4 — On-demand concept explanations

When `$ARGUMENTS` is a keyword or question, skip Steps 0–3 and go directly to the relevant explanation.

---

### "workflow" or "cycle"

```
THE D3 DEVELOPMENT CYCLE

  FIND what needs doing
    /audit [docs|product|ux|accessibility|vision|code]  — systematic analysis
    /gap                                                  — product gap analysis
    /research                                             — market intelligence

  DECIDE what to build
    /objective "goal"       — intelligent routing from a goal (recommended)
    /plan [source]          — extract directives from findings
    /directive "task"       — add a single known directive

  BUILD it
    /execute                — spawns parallel agents, CI wait, adversarial review
    /resolve "problem"      — instant one-shot fix

  VERIFY it works
    /test                   — tests + coverage + security + performance + Playwright
    /verify                 — screenshot and confirm surfaces

  DOCUMENT and SHIP
    /sync-docs              — update documentation
    /release [version]      — staging check, migration safety, tag, deploy

  REFLECT
    /retro                  — what shipped, what stalled, seeds next sprint
    /evaluate               — score the project across 10 dimensions
```

---

### "concepts" or "directives" or "vision" or "skills" or "objectives"

Provide the concept explanation matching the keyword. Present all as multiSelect if `/guide concepts`.

**Directive:**
```
A DIRECTIVE is the atomic unit of work. It's a precise task card:
  What to build  (description + done-when criteria with coverage gates)
  Which services  (Express / Python / React)
  Which skills    (engineering workflows injected into the agent brief)
  Which spec      (traceability to the requirement it came from)

Lifecycle: ready → in-progress → [CI wait] → [adversarial review] → complete → archived

You create directives with: /directive, /plan, /resolve, /objective
You execute them with: /execute (spawns agents in isolated git worktrees)
```

**Vision:**
```
Your VISION (.d3/vision.md) is the strategic alignment layer.
Every agent brief includes your anti-goals and decision principles.

Anti-goals are the most important part — they tell agents what NOT to build.
Without them, agents "helpfully" add features that take you off course.

Create with /vision. Check alignment with /vision check.
```

**Skills:**
```
SKILLS are structured engineering workflows at .d3/skills/ (33 total).
Tag a directive with **Skills: test-driven-development** and the agent
receives the full TDD process, anti-patterns, and verification criteria.

Think of it as: instead of "write tests", the agent gets a 200-line guide
covering red-green-refactor, test pyramid, the Beyonce Rule, and evidence
requirements — before writing a line of code.
```

**Objective:**
```
/objective is the intelligent entry point for most work.
Describe what you want to achieve; D3 interviews you (2-4 questions),
classifies by type and scale, routes to the optimal workflow, and asks:
auto (runs everything) or guided (approve each step)?

Objectives are saved to .d3/objectives/ and track progress through phases.
```

---

### "commands" overview

```
SETUP & CONTEXT
  /setup        Populate CLAUDE.md (auto-detects stack, interviews)
  /vision       Define project vision, anti-goals, decision principles
  /bootstrap    Deep first-run scan — memory profile, populate D3 files, organise docs

WORK DEFINITION
  /objective    Intelligent entry point — interviews you, determines workflow
  /spec         Requirements gathering → spec → feeds /plan
  /wireframe    ASCII lo-fi wireframes for pages or flows
  /plan         Extract directives from findings or a spec
  /directive    Add a single directive
  /task         Add a phase task

EXECUTION
  /execute      Spawn parallel agents, wait for CI, adversarial review
  /resolve      Instant one-shot fix cycle

QUALITY
  /test         Tests + coverage + security + performance + Playwright
  /audit        7 dimensions: docs/product/design/ux/accessibility/vision/code
  /improve      Quality-only cycle (8 scopes: design/ux/ia/copy/interactions/accessibility/code)
  /verify       Confirm surfaces work after merges

INTELLIGENCE
  /evaluate     10-dimension quality dashboard (0-100, letter grades)
  /gap          Product gap analysis — missing and underbuilt features
  /research     Market research: competitive gaps, features, trends, users
  /venture      Market opportunity score + monetization analysis

SHIPPING
  /release      Tests → staging → migration safety → tag → deploy
  /sync-docs    Update documentation to reflect what shipped
  /retro        Post-sprint retrospective

TRACKING
  /status       One-screen project health snapshot
  /sprint       Full cycle: audit → plan → execute → verify → sync-docs
```

---

### Free-form question

If `$ARGUMENTS` is a quoted phrase not matching a keyword:

1. Read CLAUDE.md and .d3/vision.md for project context
2. Identify what the question is about
3. Give a plain-English answer tailored to this project
4. End with: "Want to do this now? Run [specific command]."
