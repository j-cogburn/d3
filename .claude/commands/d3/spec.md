Structured requirements gathering. Turns a vague idea, problem description, or GitHub issue into a well-formed spec that feeds directly into /plan.

**Usage:**
- `/spec` — guided interview to extract requirements from scratch
- `/spec "add push notifications"` — refine a rough idea into a spec
- `/spec #42` — build a spec from GitHub issue #42

---

## Step 0 — Resolve mode

Parse `$ARGUMENTS`:
- Empty → **interview mode**: guided questions to extract requirements
- A string → **refine mode**: structure and expand the rough idea
- `#NNN` or bare number → **issue mode**: fetch issue, use as raw material

Get timestamp: `date '+%Y-%m-%d-%H%M'`

---

## Step 1 — Load context

Read:
1. `CLAUDE.md` — project context, services, architecture, implementation status
2. `.d3/TASKS.md` — active directives and tasks, to avoid duplicating in-progress work
3. `ls .d3/docs/specs/ 2>/dev/null` — existing specs, to avoid covering the same ground

---

## Step 2 — Gather requirements

**Interview mode:**

Invoke the `interview-me` skill from `.d3/skills/interview-me/SKILL.md`. Follow its one-question-at-a-time process. Ask only one question at a time and wait for the answer before proceeding. Continue until ~95% confidence on: what to build, who it serves, why it matters, and what success looks like.

**Refine mode:**

Invoke the `idea-refine` skill from `.d3/skills/idea-refine/SKILL.md`. Use the structured divergent/convergent process to turn the rough idea into a concrete proposal with clear boundaries.

**Issue mode:**

```bash
gh issue view <N> --json title,body,labels,comments
```

Use the issue content as source material. Reference the issue number in the spec and any derived directives.

---

## Step 3 — Structure the spec

Invoke `spec-driven-development` from `.d3/skills/spec-driven-development/SKILL.md`.

Write the spec in this format:

```markdown
# Spec: <title>
**Date:** YYYY-MM-DD
**Source:** idea | issue #N | interview
**Status:** draft

## Problem
<What problem does this solve? Who has it? How painful is it today?>

## Objectives
<What does success look like? 2–4 measurable outcomes.>

## Scope
**In:** <what this covers>
**Out:** <what this explicitly does not cover — be specific>

## User stories
- As a <user type>, I want <capability> so that <outcome>

## Technical constraints
<Known constraints: existing services, data models, APIs, auth, performance requirements>

## Success criteria
- [ ] <specific, testable criterion>

## Open questions
- <anything that needs a decision before implementation starts>
```

---

## Step 4 — Save spec

```bash
mkdir -p .d3/docs/specs
```

Write to `.d3/docs/specs/spec-TIMESTAMP-<slug>.md` where slug is the title lowercased, spaces → hyphens, max 5 words.

---

## Step 5 — Offer next step

```
Spec written: .d3/docs/specs/spec-TIMESTAMP-<slug>.md

Run /plan .d3/docs/specs/spec-TIMESTAMP-<slug>.md to convert this spec into directives.
```
