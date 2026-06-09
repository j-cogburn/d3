Identify high-value product gaps — features that are missing, incomplete, or below the standard the product's own vision implies. Produces a prioritised gap inventory with quick wins, strategic investments, and a first-version suggestion for each gap.

**Usage:**
- `/gap` — full gap analysis across all categories
- `/gap core` — gaps in the product's fundamental promise (primary user workflows)
- `/gap experience` — features that exist but are rough, incomplete, or underbuilt
- `/gap ecosystem` — missing integrations, API surface, platform capabilities
- `/gap defensive` — table stakes features users will eventually demand
- `/gap differentiator` — gaps that represent genuine competitive opportunity

Different from `/research`: `/research` looks outward at the market. `/gap` looks inward at this specific product — given what the vision promises, what isn't there yet or isn't good enough?

Different from `/audit`: `/audit` finds broken or non-compliant things. `/gap` finds missing or underbuilt things.

---

## Step 0 — Load product context

Read all available context:
```bash
cat .d3/vision.md 2>/dev/null
cat CLAUDE.md 2>/dev/null
ls docs/current/*.md 2>/dev/null && cat docs/current/*.md 2>/dev/null | head -200
ls docs/roadmap/*.md 2>/dev/null && cat docs/roadmap/*.md 2>/dev/null | head -100
cat .d3/CHANGELOG.md 2>/dev/null | head -60
cat .d3/TASKS.md 2>/dev/null | head -100
ls -t .d3/reports/product-audit-*.md 2>/dev/null | head -1   # most recent product audit if exists
ls -t .d3/reports/ux-audit-*.md 2>/dev/null | head -1         # most recent UX audit if exists
ls -t .d3/reports/research-*.md 2>/dev/null | head -1         # most recent research if exists
```

Synthesise a **product brief** before analysis:
```
Product: [what it is in plain terms]
Primary users: [who they are]
Core promise: [what users should be able to do — drawn from JTBD in vision]
Currently live: [what's actually shipped — from CHANGELOG + implementation status]
Currently tracked: [what's already in TASKS.md as planned work]
Assessment basis: [what docs/audits are available to ground this analysis]
```

Get timestamp: `date '+%Y-%m-%d-%H%M'`

---

## Step 1 — Map the promise vs. reality

For each user type and their jobs-to-be-done (from vision.md), walk through the complete user journey and assess what exists vs. what's needed:

```
USER: [type]
JOB: When [situation], they want to [motivation] so they can [outcome]

Journey step 1: [what they need to do]
  Exists: ✓ / Partial / ✗
  Quality: Strong / Adequate / Weak / Missing
  Gap if any: [specific description]

Journey step 2: [...]
  ...
```

Flag each gap as:
- **Missing** — not built at all
- **Partial** — started but incomplete
- **Weak** — built but significantly below expectation
- **Friction** — works but creates unnecessary effort

---

## Step 2 — Identify gaps by category

### CORE GAPS
Features missing from the product's fundamental promise. These directly prevent users from completing their primary jobs-to-be-done.

For each core gap:
```
GAP: [Name — specific enough to build from]
Type: Missing / Partial / Weak / Friction
User impact: [who is blocked, what they can't do]
Vision reference: [which JTBD this blocks]
Currently tracked: Yes (TASK-NNN) / No
Value: N/5  (1=nice-to-have, 5=blocks core use case)
Urgency: N/5  (1=someday, 5=blocking adoption now)
Effort: S (<1 day) / M (1-3 days) / L (1-2 weeks) / XL (>2 weeks)
First version: [smallest thing that meaningfully addresses this gap]
```

### EXPERIENCE GAPS
Features that exist but are rough, incomplete, or create unnecessary friction. The product works but not well.

Look for:
- Flows that require more steps than they should
- Features with missing empty states, error states, or loading states
- Functionality that exists in one context but not where users expect it
- Settings or configuration options that are hidden or missing
- Copy/labels that are confusing or non-standard (apply `ux-writing` skill)
- Onboarding gaps that leave new users uncertain what to do first

### ECOSYSTEM GAPS
Missing integrations, API surface, or platform capabilities that connect the product to where users already work.

Look for:
- Integrations with tools in the user's existing workflow
- Webhook or API capabilities that would enable automation
- CLI or IDE extensions users would expect
- Export/import capabilities for data portability
- Notification channels (email, Slack, etc.)
- Authentication methods users expect (SSO, OAuth providers)

### DEFENSIVE GAPS
Table stakes features — things users haven't asked for yet but will expect once the product matures. Shipping these proactively prevents users from finding them missing at a critical moment.

Category standards to check against the product's domain. For each:
- Does any competitor have this as standard?
- Would its absence surprise a user who knows the category?
- Is it low-effort to implement relative to the trust it creates?

### DIFFERENTIATOR GAPS
Features that would create genuine competitive advantage — not just parity with competitors but a reason users would choose this product specifically. Cross-reference with competitive gaps from any previous `/research competitive` run.

---

## Step 3 — Score and rank all gaps

Compile every gap identified across all categories. Score each:

```
Priority = (Value × Urgency) / effort_weight
  where effort_weight: S=1, M=2, L=4, XL=8
```

Segment into four quadrants:

```
HIGH VALUE + LOW EFFORT = Quick Wins  ← Do first
HIGH VALUE + HIGH EFFORT = Strategic  ← Plan and commit
LOW VALUE + LOW EFFORT = Fill-ins     ← Do when capacity allows
LOW VALUE + HIGH EFFORT = Defer       ← Don't do unless forced
```

---

## Step 4 — Cross-reference with TASKS.md

For each gap:
- If it's already tracked as a TASK-NNN or DIRECTIVE-NNN: note it and skip (already in backlog)
- If it's not tracked: it's a new gap, include in the output
- If it's tracked but scored higher than similar tracked items: flag for re-prioritisation

---

## Step 4b — Compute Product Completeness score

Before outputting, calculate the Product Completeness score:

```
Start at 100.
For each CORE gap marked Missing:    −10 pts  (deductions capped at 40)
For each CORE gap marked Partial/Weak: −5 pts  (capped at 20)
For each EXPERIENCE gap:              −3 pts  (capped at 15)
For each DEFENSIVE gap:               −2 pts  (capped at 10)
Gaps already tracked in TASKS.md:    half the above deduction

Product Completeness = max(0, 100 − total deductions)
```

Assign a letter grade using the standard scale (A ≥90, B ≥75, C ≥60, D ≥45, F <45).

---

## Step 5 — Output

```
PRODUCT GAP ANALYSIS — YYYY-MM-DD
=====================================
Product: [name]
PRODUCT COMPLETENESS: N/100  [GRADE]  (used by /evaluate Business Completeness dimension)
Gaps found: N  (N quick wins · N strategic · N fill-ins · N deferred)
Already tracked in TASKS.md: N gaps (not duplicated below)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUICK WINS  (high value · low effort · do first)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#1  [Gap name]  [Category]  V:N/5 · U:N/5 · Effort:S
    [What's missing and why it matters]
    First version: [smallest shippable thing]

#2  [Gap name] ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRATEGIC INVESTMENTS  (high value · plan to commit)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#1  [Gap name]  [Category]  V:N/5 · U:N/5 · Effort:L/XL
    [What's missing and why it matters despite the effort]
    Why it can't stay missing: [consequence of not building it]
    First version: [smallest thing that validates the approach]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXPERIENCE IMPROVEMENTS  (existing features to polish)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#1  [Gap name]  V:N/5 · Effort:S/M
    Current state: [what exists and what's wrong with it]
    Target state: [what good looks like]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEFENSIVE (build before users ask)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[List with brief rationale for each]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FULL GAP INVENTORY  (all untracked gaps, ranked)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[N]  [Gap name]  [Category]  V:N/5 · U:N/5 · Effort: S/M/L/XL
     [One sentence description]
...
```

---

## Step 6 — Save and offer next steps

Write full report to `.d3/reports/gap-TIMESTAMP.md`.

Tag each finding: `[CORE]` `[EXPERIENCE]` `[ECOSYSTEM]` `[DEFENSIVE]` `[DIFFERENTIATOR]`

Then offer:
```
Gap analysis saved: .d3/reports/gap-TIMESTAMP.md
N gaps found, N already tracked in TASKS.md.

What next?
  /plan .d3/reports/gap-TIMESTAMP.md   — create directives for the top gaps
  /spec "[gap name]"                    — write a spec for the top quick win
  /research features                    — cross-reference with market feature data
  /venture market                       — validate which gaps most affect market score
```
