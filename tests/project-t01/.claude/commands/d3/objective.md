Define, refine, and execute a goal. Interviews the user to understand the objective, determines the optimal D3 workflow, and executes it in auto or guided mode.

**Usage:**
- `/objective` — define a new objective (full interview)
- `/objective "build user notifications"` — quick-start with a title
- `/objective refine` — refine the most recent active objective
- `/objective refine OBJ-NNN` — refine a specific objective
- `/objective list` — show all active objectives and their progress

---

## Step 0 — Resolve mode

Parse `$ARGUMENTS`:
- Empty → new objective, interview mode
- A string (not starting with `refine` or `list`) → new objective, use as starting context
- `refine` → load the most recent active objective from `.d3/objectives/`, re-interview with context
- `refine OBJ-NNN` → load that specific objective file, re-interview
- `list` → print all objectives and stop (skip to Step 7)

Get next ID: count files in `.d3/objectives/` matching `obj-*.md`, increment. Start at `OBJ-001`.
Get timestamp: `date '+%Y-%m-%d-%H%M'`

---

## Step 1 — Interview

Invoke `interview-me` from `.d3/skills/interview-me/SKILL.md`.

Ask **one question at a time**. Wait for the answer before asking the next. Extract answers to these four signals — stop asking once you have sufficient confidence on each:

**Signal 1 — Goal:** What are you trying to achieve? What does success look like?

**Signal 2 — Clarity:** How well-defined is this? Choose the right follow-up:
- If the answer to Signal 1 was vague → "What specifically needs to change or be built?"
- If clear → skip to Signal 3

**Signal 3 — Type:** Classify the work from the answers so far. If unclear, ask directly:
- "Is this building something new, fixing something broken, improving something existing, or planning a phase of work?"

**Signal 4 — Scale:** Estimate from what's been said. If genuinely unclear, ask:
- "Is this a few hours of work, a few days, or something larger?"

**Refinement mode:** read the existing objective file first. Begin with: "Your current objective is: [goal]. What's changed or what would you like to refine?" Then adapt.

**Stop the interview when you have:** goal, type, scale, and enough clarity to determine the approach. Minimum 2 questions, maximum 5. Don't over-interview.

---

## Step 2 — Classify and route

From the interview, classify the objective:

**Type:**
- `build-new` — creating something that doesn't exist
- `fix` — resolving a bug, error, or broken behaviour
- `improve` — making something that works better (quality, UX, performance)
- `plan` — defining a phase, sprint, or set of work

**Scale:**
- `small` — a few hours (single fix, one component, one endpoint)
- `medium` — a few days (a feature, a page, a workflow)
- `large` — a week or more (a system, a phase, multiple features)
- `epic` — multiple weeks (break into sub-objectives first)

**Involves UI:** yes / no / both

**Clarity:** clear (requirements well-understood) / fuzzy (needs definition work)

---

## Step 3 — Determine optimal approach

Select the approach from this routing matrix:

| Type | Scale | UI | Clarity | Approach |
|---|---|---|---|---|
| build-new | small | no | clear | `/directive` → `/execute` |
| build-new | small | yes | clear | `/wireframe` → `/directive` → `/execute` → `/verify` |
| build-new | medium | no | clear | `/plan` (inline) → `/execute` → `/test` |
| build-new | medium | yes | clear | `/wireframe` → `/plan` → `/execute` → `/audit ux` → `/verify` |
| build-new | medium | any | fuzzy | `/spec` → `/wireframe`? → `/plan` → `/execute` → `/verify` |
| build-new | large | any | any | `/spec` → `/wireframe` → `/plan` → `/execute` → `/audit ux` → `/test` |
| build-new | epic | any | any | Break into sub-objectives first → treat each as `large` |
| fix | small | any | clear | `/resolve` |
| fix | small | any | fuzzy | `/audit code` → `/resolve` |
| fix | medium | any | any | `/audit code` → `/plan` → `/execute` → `/test` |
| improve | any | yes | any | `/improve ux` or `/improve design` or `/improve [scope]` |
| improve | any | no | any | `/improve code` or `/improve [scope]` |
| plan | medium | any | any | `/spec` (one per feature) → `/plan` → review directives |
| plan | large | any | any | `/audit [scope]` → `/plan` → batch `/execute` |

**Adjust based on specifics:**
- Accessibility objective → add `/audit accessibility` + `/improve accessibility`
- Performance objective → add `/audit product` before planning
- Copy/IA objective → use `/improve copy` or `/improve ia`
- Bug with unclear root cause → always start with `/audit code`
- Epic → always break down first; confirm sub-objectives before proceeding

**Track sprint check:** If `.d3/track.md` exists with an active sprint:
- Determine whether this objective fits within the current sprint's stated goal
- If it clearly falls outside the sprint:
  ```
  ⚠ Sprint boundary: This objective is outside Sprint [N.N] — [Goal].
    Current sprint focuses on: [sprint goal]
    Options:
    - Fold into current sprint (if the sprint can absorb it)
    - Queue for Sprint [N+1] — define it now, execute later
    - Execute as an off-sprint maneuver (logged, counts toward drift)
  ```
  Ask which option to proceed with before routing to the optimal approach.
- If it fits within the sprint: proceed normally.

**Vision check:** If `.d3/vision.md` exists, check the objective against it:
- Does this objective advance the vision or serve a stated user type?
- Does it conflict with any anti-goal? If yes, flag it explicitly:
  ```
  ⚠ Vision conflict: this objective touches anti-goal — "<anti-goal text>"
  Proceed anyway? (The anti-goal may need to be revised, or this objective reconsidered.)
  ```
- Does the recommended approach align with the decision principles (X over Y)?

---

## Step 4 — Present approach and confirm mode

Print the objective summary and recommended approach:

```
OBJECTIVE DEFINED
=================
ID:     OBJ-NNN
Goal:   <one-sentence goal>
Type:   <build-new / fix / improve / plan>
Scale:  <small / medium / large / epic>

Recommended approach:
  Phase 1 → /<command>    <why>
  Phase 2 → /<command>    <why>
  Phase 3 → /<command>    <why>
  ...

Rationale: <2-3 sentences explaining why this path fits this objective>
```

If scale is `epic`: stop here and say — "This objective is large enough that it should be broken into smaller sub-objectives. Here's a suggested breakdown: [list]. Create these as separate objectives?"

Otherwise ask (single-select):
- "**Auto** — run all phases, pause only at selections and merges (recommended for small/medium)"
- "**Guided** — I approve each phase before it runs (recommended for large/fuzzy)"
- "**Plan only** — save the approach, I'll run phases manually"

---

## Step 5 — Save the objective

Before executing anything, write the objective to `.d3/objectives/obj-NNN-<slug>-TIMESTAMP.md`:

```markdown
# Objective: <title>
**ID:** OBJ-NNN
**Scale:** small / medium / large / epic
**Type:** build-new / fix / improve / plan
**Mode:** auto / guided / plan-only
**Status:** active
**Created:** YYYY-MM-DD
**Last refined:** YYYY-MM-DD

## Goal
<What does success look like — one sentence>

## Context
<Why this matters, what problem it solves — from the interview>

## Approach
Phase 1 → /<command>
Phase 2 → /<command>
...

## Rationale
<Why this workflow fits this objective>

## Progress
- [ ] Phase 1: /<command>
- [ ] Phase 2: /<command>
...

## Directives spawned
<!-- Updated as directives are created -->

## Open questions
<!-- Anything unresolved from the interview -->
```

---

## Step 6 — Execute

### Auto mode

Run each phase in sequence. Between phases, update the objective file's progress checklist.

Pause only for:
- **User selections** — multiselect prompts (which proposals to add, which directives to run)
- **Merge confirmation** — always confirm before merging PRs
- **Critical findings** — if an audit or code review finds critical issues, surface them and ask how to proceed
- **Phase failures** — if a phase fails or produces no output, stop and report

After each phase completes, print a brief status:
```
✓ Phase N complete — <what was produced>
→ Next: Phase N+1 — /<command>
```

### Guided mode

After each phase completes, print what was produced and ask:
```
Phase N complete: /<command>
Output: <brief description of what was produced>

Proceed to Phase N+1 (/<command>)? [Continue / Stop here / Skip this phase]
```

Wait for confirmation before running the next phase.

### Plan-only mode

Skip execution. Print:
```
Objective saved: .d3/objectives/obj-NNN-<slug>-TIMESTAMP.md

Run /objective to start executing when ready.
```

---

## Step 7 — Objective list (`/objective list`)

```bash
ls .d3/objectives/obj-*.md 2>/dev/null
```

Print:
```
ACTIVE OBJECTIVES
=================
OBJ-NNN  <title>  [<type> · <scale>]
  Status: Phase N/M complete — next: /<command>
  Directives: DIRECTIVE-NNN, DIRECTIVE-NNN

OBJ-NNN  <title>  [<type> · <scale>]
  Status: plan-only — not started
```

---

## Step 8 — Completion

When all phases are complete, update the objective file:

```
**Status:** complete
**Completed:** YYYY-MM-DD
```

Print:
```
OBJECTIVE COMPLETE
==================
OBJ-NNN: <title>
Phases:  N completed
Directives spawned: DIRECTIVE-NNN, ...

Run /retro to review what shipped.
```
