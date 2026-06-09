SHAPE — turn an Objective into ready Directives. Generate options, recommend one, let the owner select, render low-fi sketches, get approval, THEN write directives. "Be wrong cheaply" lives here.

**Usage:**
- `/shape OBJ-022` — shape one atomic objective into directives
- `/shape OBJ-022 --quick` — owner already knows the solution; skip options, light sketch

---

## Step 1 — Load context
Read the objective node + its `parent`/`refs`. Load the relevant `.d3/principles/` files for the domains in play (always architecture + code; add ux-ui/accessibility for UI, security/data-privacy for data, etc.). Run `d3 index`.

## Step 2 — Options (2-4, scored)
Propose distinct solution approaches. Score each on a fixed rubric: success-metric impact · principle conformance (cite the principle) · reversibility (door) + blast radius · effort vs the objective's appetite · key risks. Write them to `.d3/options/opt-NNN-*.md` (parent_id = the objective).

## Step 3 — Recommend
Name the option you would pick and WHY, citing principles and the metric — not taste (§0 grounding rule).

## Step 4 — Select (owner)
Use AskUserQuestion: the recommendation, an alternative, or "reshape". Record `selected_option_id` + rationale on the objective node.

## Step 5 — Sketch (low-fi cycle)
Invoke `/sketch <domain> <target>` for the selected approach. Iterate v1 -> vN until the owner APPROVES. Only an approved sketch unlocks the next step.

## Step 6 — Price reversibility
For one-way-door work: write an ADR (`.d3/docs/adr/`) and get owner sign-off BEFORE writing directives. Two-way work proceeds directly.

## Step 7 — Write directives
Now write directives as `.d3/directives/dir-NNN-*.md` using `templates/directive.md`. Each MUST set `parent_id` to the objective (the law), reference the approved `sketch_id`, set `door`/`appetite`, add `blocks`/`blocked_by` refs for ordering, and include the done-when rows (test gate · state coverage · instrumentation).

## Step 8 — Index & show
Run `d3 index` (must pass), then `/tree OBJ-NNN`. Recommend `/build`.
