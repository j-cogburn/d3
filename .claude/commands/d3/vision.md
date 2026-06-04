Define, refine, or check the project vision. Creates `.d3/vision.md` — the single source of truth that every agent, audit, and planning command reads to stay strategically aligned.

**Usage:**
- `/vision` — define if absent, offer to refine if present
- `/vision refine` — section-by-section refinement of existing vision
- `/vision check` — evaluate current directives and objectives against the vision

---

## Step 0 — Detect mode

Check whether `.d3/vision.md` exists and is filled in (not a stub).

- No file, or file contains only the stub comment → **define mode**
- File exists and is filled in, no `$ARGUMENTS` → ask: "Your vision is already defined. Would you like to refine it?" If yes → **refine mode**. If no → stop.
- `$ARGUMENTS` is `refine` → **refine mode**
- `$ARGUMENTS` is `check` → **check mode** (skip to Step 4)

---

## Step 1 — Interview (define mode)

Read `CLAUDE.md` and any existing `docs/roadmap/` files for context before asking. Use this context to make questions specific to the project — never ask for information already captured.

Ask **one question at a time**. Maximum 6 questions. Stop when all six signals are captured.

---

**Signal 1 — Vision sentence:**
> "In one sentence: what does [project name] do, for whom, and what outcome does it create for them?"

Push for specificity. "A platform for developers" is not a vision. "A workflow system that enables solo developers to ship software with AI agents at consistent quality" is.

---

**Signal 2 — Users and jobs-to-be-done:**
> "Who are the 1–2 user types that matter most? For each: when they're using [project], what are they trying to accomplish?"

Format answers as: When [situation], they want to [motivation] so they can [outcome].

---

**Signal 3 — Success horizon:**
> "What does success look like in 12 months? What specific outcome or metric would tell you the vision is working?"

Press for a concrete, measurable answer — not "users love it" but "200 projects are using D3 in production" or "users ship 3× faster than without it."

---

**Signal 4 — Strategic bets:**
> "What are the 2–3 things that must be true for this to succeed? The assumptions the entire project depends on?"

These are the load-bearing beliefs. If any one is wrong, the product fails. They should feel slightly risky to say aloud.

---

**Signal 5 — Anti-goals:**
> "What will you deliberately NOT build — even if it seems related or users ask for it?"

This is the most important question for keeping agents on track. Push for specificity: "no Kanban boards" not "no project management." Anti-goals grant explicit permission to decline work that seems reasonable.

---

**Signal 6 — Decision principles:**
> "When facing a hard tradeoff — features vs. simplicity, speed vs. quality, breadth vs. depth — how should the project decide? Give me 2–3 'X over Y' rules."

These become the tiebreaker for agents when the answer isn't obvious.

---

## Step 2 — Write `.d3/vision.md`

```bash
mkdir -p .d3/docs/
```

Wait — write directly to `.d3/vision.md` (top-level, not in docs — this is a first-class D3 file):

```markdown
# Project Vision: <Project Name>
**Defined:** YYYY-MM-DD
**Last refined:** YYYY-MM-DD

## Vision
<One sentence — what it does, for whom, what outcome>

## Users

| User type | Job-to-be-done | Success looks like |
|---|---|---|
| <type> | When [situation], they want to [motivation] | <specific outcome> |

## Success horizon — 12 months
<Specific, measurable outcome that confirms the vision is working>

**North star metric:** <The single number or signal that captures user value>

## Strategic bets
1. <Must be true for this to work>
2. <...>
3. <...>

## Anti-goals
We deliberately will NOT:
- <Specific thing — concrete enough that an agent could act on it>
- <...>

## Decision principles
When in doubt, choose:
- <X> over <Y>
- <X> over <Y>
```

---

## Step 3 — Refinement mode

Read the existing `.d3/vision.md`. Go section by section:

> "The current vision is: '[vision line]'. Is this still accurate? What's changed?"

Only update sections the user says are out of date. Update `**Last refined:**` date. Don't re-ask for sections that are still accurate.

After refinement, print a diff summary:
```
Vision updated:
  ✓ Vision sentence refined
  ✓ Anti-goals: added 2 new items
  ⊘ Users — unchanged
  ⊘ Strategic bets — unchanged
```

---

## Step 4 — Check mode (`/vision check`)

Read `.d3/vision.md`. Read all active and ready directives from `.d3/TASKS.md`.

For each directive, assess alignment:

```
VISION ALIGNMENT CHECK
======================
Vision: <one-sentence vision>

DIRECTIVE-NNN  <Title>
  Alignment:  ✓ aligned — directly advances [strategic bet N]
            / ⚠ tangential — useful but not vision-critical
            / ✗ conflicts — touches anti-goal: "<anti-goal text>"

...

Summary:
  ✓ Aligned:    N directives
  ⚠ Tangential: N directives  (consider deferring if backlog is large)
  ✗ Conflicts:  N directives  (review before executing)
```

If any directive conflicts with an anti-goal, ask:
- "Keep it — the anti-goal no longer applies"
- "Defer it — move to a lower-priority section in TASKS.md"
- "Refine the anti-goal — it was too broad"

---

## Step 5 — Offer next steps

After defining or refining:

```
Vision saved: .d3/vision.md

Every agent brief, /plan proposal, and /objective will now reference this vision.

Next: /bootstrap — deep-scan your codebase, build a memory profile, and organise documentation.
This gives every agent a complete picture of what exists before any work begins.

Other options:
  /vision check    — evaluate current directives against the vision
  /audit vision    — deep drift analysis across the full product
  /objective       — define your next goal with vision context
```
