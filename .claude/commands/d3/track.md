The operational layer between vision and execution. Translates the destination (vision.md) into an ordered sequence of phases and sprints — each fully defined before starting, with exit criteria that gate progression. Maintains bearing every session and flags drift before it compounds.

**The model:**
- **Destination** — from vision.md (the why, the AO)
- **Phase** — major waypoint toward the destination
- **Sprint** — time-boxed work unit within a phase, fully defined before starting
- **Directive** — atomic execution unit within a sprint (lives in TASKS.md)

Nothing executes without definition. A sprint that hasn't had its success criteria and exit criteria written **cannot start**. A deviation from the current sprint isn't drift if it's acknowledged — it's a maneuver. Unacknowledged deviation is drift.

**Usage:**
- `/track` — bearing status: current phase, sprint, position, and heading
- `/track set` — define the course (AI-guided: phases, sprints, measurement mode)
- `/track sprint plan` — fully define the next sprint before starting
- `/track sprint start` — lock the definition, begin execution
- `/track sprint close` — verify exit criteria met, advance to next sprint
- `/track check` — explicit bearing analysis with recommendations
- `/track pivot` — mission evolved (new intel, market shift) — update course, log it
- `/track correct` — drift detected — acknowledge and return to heading

---

## /track — Bearing status (no arguments)

Read `.d3/track.md`. Print the navigation report:

```
TRACK — YYYY-MM-DD
===================
Destination:  [one-sentence vision]
Course:       Phase [N] of [N] — [Phase name]
Sprint:       [N.N] of [N] — [Sprint goal]
Bearing:      ✓ On track  /  ⚠ Drift detected  /  ✗ Off track
Position:     [N of N objectives complete — N%]  [objective mode]
              [Day N of N planned — N% elapsed]  [time mode]
              [N of N milestones met]             [milestone mode]

Exit criteria: [N of N met — list unmet criteria]
```

If `.d3/track.md` is missing or stub: "No course set. Run `/track set` to define your course."

---

## /track set — Define the course

Read `.d3/vision.md` first for context. Then interview one question at a time:

**Q1 — Destination confirmation:**
> "Your vision is: [vision sentence]. Is this still the destination we're navigating toward?"
If no → prompt to run `/vision refine` first, then return here.

**Q2 — Progress measurement:**
> "How do you want to measure progress? Choose one:
>   1. Objective-based — % of sprint directives complete
>   2. Time-based — elapsed vs. planned duration
>   3. Milestone-based — explicit checkpoints you define"

**Q3 — Phase mapping:**
> "What are the major phases between here and the destination? List them in order — name and one-sentence purpose for each. (2–5 phases typical)"

For each phase, capture:
- Name
- Success definition (what done looks like for this phase)
- Exit criteria (specific, verifiable — the course doesn't advance until these are met)
- Estimated duration (optional, used for time-based measurement)

**Q4 — Sprint 1 definition:**
> "Let's define the first sprint. What's the immediate focus? (Sprint 1.1)"

Use the sprint plan interview (see `/track sprint plan`).

**Q5 — Drift tolerance:**
> "How much off-heading work triggers a drift warning? Default is 30% (if more than 30% of recent work is outside the current sprint, you're flagged). Keep default or change?"

Write `.d3/track.md` with the full course definition. Log: "Course set — Phase 1, Sprint 1.1."

---

## /track sprint plan — Define a sprint before starting

**Nothing executes until defined.** This interview must be completed before `/track sprint start` is called.

Ask one question at a time:

1. **Goal** → "What is the goal of this sprint? (one sentence — what are we trying to accomplish?)"

2. **Success definition** → "What does success look like? How will you know this sprint is truly done?"

3. **Exit criteria** → "List 3–7 exit criteria — specific, verifiable things that must be true before this sprint closes. Start each with a verb."
   (e.g. "Users can register with email and password", "JWT refresh tokens rotate on use", "Auth endpoints pass npm test with ≥80% coverage")

4. **Directives** → "What are the tasks/directives for this sprint? List them or say 'generate from criteria' and I'll propose directives derived from your exit criteria."
   If generating: create DIRECTIVE-NNN entries in TASKS.md tagged to this sprint. Present for confirmation before writing.

5. **Duration** → "How long should this sprint take? (Used for time-based measurement and drift detection. E.g. '1 week', '5 days')"

6. **Risks** → "Any known risks or blockers going into this sprint?"

Write the sprint definition to `.d3/track.md` under the current phase. Status: `planned`.

---

## /track sprint start — Begin the sprint

Read the most recent `planned` sprint from `.d3/track.md`.

1. Confirm the sprint is fully defined (goal, success definition, exit criteria, directives, duration). If any are missing: "This sprint is not fully defined. Complete the plan with `/track sprint plan` before starting."

2. Lock the definition — mark sprint status as `active`, record start date.

3. Update TASKS.md: add a sprint context comment at the top of the DIRECTIVES section:
   ```
   *Sprint [N.N] — [Goal] · Exit criteria: [N defined — see .d3/track.md]*
   ```

4. Print:
   ```
   Sprint [N.N] started: [Goal]
   Duration: [planned duration] (closes ~YYYY-MM-DD)
   Exit criteria: [N] — run /track sprint close when all are met
   Directives ready: [list]
   ```

---

## /track sprint close — Complete the sprint

1. Read the active sprint from `.d3/track.md`. List all exit criteria with current status.

2. For each unmet criterion, ask: "Is this met? (yes / not yet / waiving with reason)"

3. If all criteria are met (or waived with documented reason):
   - Mark sprint `complete` in track.md, record close date
   - Log actual duration vs. planned in navigation log
   - Print sprint summary: goal, duration, directives completed, criteria met
   - Ask: "Ready to plan the next sprint? Run `/track sprint plan` for Sprint [N+1]."

4. If criteria are unmet without waiver:
   - Print which criteria are unmet
   - "This sprint cannot close until exit criteria are met or explicitly waived. Fix and return, or run `/track sprint close` again with a waiver reason."

---

## /track check — Explicit bearing analysis

Read `.d3/track.md` + `.d3/TASKS.md` + recent `.d3/CHANGELOG.md` entries.

**Calculate bearing:**

*Objective-based:*
```bash
# Count directives linked to current sprint
# Count completed (from CHANGELOG)
# Check if recent work (last 5-10 entries) is in current sprint
```

*Time-based:*
```bash
# Days elapsed since sprint start vs. planned duration
# % of directives completed vs. % of time elapsed
```

*Milestone-based:*
```bash
# Count exit criteria met vs. total
# Check if the rate of criteria completion is on pace
```

**Print bearing report:**
```
BEARING CHECK — YYYY-MM-DD
===========================
Sprint:    [N.N] — [Goal]  (started YYYY-MM-DD, Day N of N)
Position:  [N/N objectives · N% · mode]
Exit criteria: [N of N met]
  ✓ [met criterion]
  ○ [unmet criterion]

BEARING: ✓ On track

Recent work analysis:
  Last 5 completed: [list directive titles]
  Sprint-aligned:   [N of 5 — N%]
  Off-sprint:       [N of 5 — within/outside tolerance]
```

If drift detected:
```
BEARING: ⚠ Drift — N% of recent work outside Sprint [N.N]

Off-sprint work detected:
  - [directive] — [why it was outside sprint]

Options:
  /track correct    — acknowledge drift, return to sprint heading
  /track pivot      — if this represents a genuine direction change
  Continue as-is    — if off-sprint work was necessary (tactical maneuver)
```

---

## /track pivot — Mission evolved

Use this when new intelligence, market feedback, or changed circumstances mean the destination or route genuinely needs to change. This is NOT drift — it's an acknowledged course update.

1. Ask: "What changed? (describe the new intelligence, insight, or circumstance)"

2. Ask: "How does this affect the course?
   - New destination — the vision itself needs updating
   - Different route to the same destination — phases need restructuring
   - Current phase needs replanning — the phase goal still fits, sprints need updating"

3. Based on the answer:
   - New destination → prompt `/vision refine`, then return to recalculate phases
   - Different route → update phases in track.md, note what changed and why
   - Phase replanning → update current phase definition, replan remaining sprints

4. Log in navigation log:
   ```
   | YYYY-MM-DD | PIVOT | [what changed] → [what was updated] |
   ```

5. Print: "Course updated. Resuming navigation. Bearing check: [current status against new course]."

---

## /track correct — Return to heading

Use this when drift has been detected and you're ready to get back on the current sprint heading. The sprint definition doesn't change — you're returning to it.

1. Show current drift status (what work has been off-sprint and for how long).

2. Ask: "What caused the deviation? (tactical fix, emergency, scope creep, unclear priorities)"

3. Log the maneuver:
   ```
   | YYYY-MM-DD | CORRECTION | [cause] — returning to Sprint [N.N] |
   ```

4. Identify the highest-priority sprint directive to resume:
   "Returning to heading. Next: [directive] — [why this is the right re-entry point]."

5. Update bearing to `correcting → on track`.

---

## track.md format

```markdown
# Track
**Destination:** [one-sentence vision — linked to vision.md]
**Set:** YYYY-MM-DD
**Measurement:** objective-based | time-based | milestone-based
**Drift tolerance:** 30%
**Last bearing check:** YYYY-MM-DD
**Bearing:** on track | drift | correcting | off track

## Phases

### Phase 1 — [Name]
**Status:** active | planned | complete
**Success definition:** [what done looks like for this phase]
**Exit criteria:**
- [ ] [Specific, verifiable criterion]
- [ ] [...]

#### Sprint 1.1 — [Goal]  ✓ complete
**Success definition:** [one sentence]
**Exit criteria:** all met ✓
**Started:** YYYY-MM-DD  **Closed:** YYYY-MM-DD
**Duration:** [planned] → [actual]

#### Sprint 1.2 — [Goal]  ▶ active
**Success definition:** [one sentence]
**Exit criteria:**
- [x] [Met criterion]
- [ ] [Unmet criterion]
- [ ] [Unmet criterion]
**Started:** YYYY-MM-DD  **Planned close:** YYYY-MM-DD
**Directives:** DIRECTIVE-042, DIRECTIVE-043, DIRECTIVE-044
**Risks:** [any known blockers]

#### Sprint 1.3 — [Goal]  ○ planned
[Full definition required before starting]

### Phase 2 — [Name]  ○ planned
[Phases defined — sprints broken down when Phase 1 closes]

## Navigation log
| Date | Event | Note |
|---|---|---|
| YYYY-MM-DD | Course set | Phase 1, Sprint 1.1 |
| YYYY-MM-DD | Sprint 1.1 complete | On track · 5 days (planned 5) |
| YYYY-MM-DD | Sprint 1.2 started | |
```
