---
name: user-research-synthesis
description: Guides agents through synthesising user research — interviews, support tickets, analytics, usability sessions — into actionable design insights. Use when turning raw research data into design decisions, building personas, or prioritising which problems to solve.
---

# User Research Synthesis

## Overview

Research synthesis turns observations into insights, and insights into design decisions. The failure mode is skipping steps: jumping from "users complained about the onboarding" to "we should redesign the onboarding" without understanding what specifically is wrong and why.

The synthesis ladder:

```
DATA         → raw observations, quotes, metrics, recordings
PATTERNS     → observations that appear repeatedly
INSIGHTS     → what the pattern means (why it's happening)
IMPLICATIONS → what design should do about it
```

Move up the ladder deliberately. Don't skip from data to implications.

---

## When to Use

- After user interviews, usability testing, or contextual inquiry
- When support tickets or NPS responses reveal user problems
- When analytics show unexpected drop-off or behaviour
- When `/spec` is based on research, not assumption
- Before making significant design decisions that affect user flows

---

## Research input types

| Source | Strengths | Limitations |
|---|---|---|
| User interviews | Rich context, unexpected findings | Small sample, recall bias |
| Usability testing | Direct behaviour observation | Artificial environment |
| Support tickets | Real problems, at scale | Problem already occurred |
| Analytics | Large sample, behavioural | No context for why |
| NPS/surveys | Quantitative sentiment | Surface-level responses |
| Session recordings | Real behaviour | Time-intensive to review |

State clearly which sources the synthesis draws from. Mixed-source synthesis is stronger than single-source.

---

## Process

### 1. Collect observations

List every raw observation — one per note. Each note should be:
- A specific, observed behaviour (not an interpretation)
- Grounded in a source (who said it, where it happened)
- In concrete language (not "users were confused" but "User 3 clicked the wrong button twice then asked 'where does this go?'")

```
OBSERVATION TEMPLATE
Source:     User 3, interview, 2026-06-01
Context:    Trying to add a position to their portfolio
Verbatim:   "I clicked that button but nothing happened. Oh wait, it opened
             over here — I didn't see it."
Behaviour:  User triggered a slide-in panel but didn't notice it had opened
```

### 2. Cluster into patterns

Group observations that describe the same underlying behaviour. A pattern requires at least 3 independent observations (unless a single observation is from a high-stakes source like a power user or churned customer).

```
PATTERN: Users don't notice the slide-in panel opening
Evidence:
  - User 3: "I didn't see it"
  - User 7: Clicked the button three times in succession (expected same-page change)
  - Analytics: 34% of users who click "Add position" close the session without
               completing the action
  - Support ticket #1847: "The add button doesn't work"
```

### 3. Derive insights

An insight is an explanation for a pattern. It answers "why is this happening?"

```
INSIGHT QUALITY SPECTRUM

Weak:    "Users have trouble with the slide-in panel"
         (restates the problem, no explanation)

Better:  "Users expect the action to happen in-context (on the same page),
          not in a panel that opens off-screen"
         (explains the mental model mismatch)

Strong:  "Users are anchored to the content they're viewing and don't track
          peripheral movement. The slide-in panel opens at the edge of the
          viewport, outside the user's focus zone. Combined with no visual
          feedback on the triggering button (no loading state, no colour change),
          users receive no signal that anything happened."
         (specific, mechanistic, actionable)
```

### 4. Frame implications

An implication is a design direction derived from an insight. It is not a solution — it is a constraint or requirement.

```
INSIGHT:    Users don't track peripheral movement and need in-context feedback
IMPLICATION: The UI must provide immediate, proximate feedback when a panel opens
             — either via the trigger button's state or via animation that draws
             the eye to the new content

NOT an implication: "Add animation to the panel slide-in"
   (This is a solution. Implications describe the requirement; solutions are explored later)
```

### 5. Build jobs-to-be-done statements

For the most important insights, write a JTBD statement:

```
FORMULA: "When [situation], I want to [motivation], so I can [outcome]."

Example: "When I spot an opportunity in the market, I want to add a position
          quickly without losing my place in what I was reviewing, so I can
          act while the context is fresh."

This reframes the problem from "the panel doesn't work well" to the user's
actual job — revealing that the panel might be the wrong solution entirely
(maybe inline input or a quick-add drawer would serve the job better).
```

### 6. Write the synthesis document

```markdown
# Research Synthesis: [Topic]
**Date:** YYYY-MM-DD
**Sources:** [list]
**Sessions/observations:** N

## Key Insights

### [Insight 1 title — most important first]
**Pattern:** [What you observed, N instances]
**Insight:** [Why it's happening]
**Implication:** [What design must address]
**JTBD:** When [situation], I want to [motivation], so I can [outcome]

### [Insight 2]
...

## Prioritisation
| Insight | Frequency | Severity | Design effort | Priority |
|---------|-----------|----------|---------------|----------|
| ...     | High/Med/Low | High/Med/Low | S/M/L | 1/2/3 |

## What we don't know yet
- [Open questions that require further research before committing to a solution]

## Recommended next steps
- [Specific design explorations, informed by the insights]
```

Save to `.d3/docs/` as `research-synthesis-TIMESTAMP.md`.

---

## Personas (when needed)

Build personas only after synthesis — not before. A persona built before synthesis is a stereotype.

```markdown
## Persona: [Name]
**Archetype:** [1-sentence description]
**Represents:** [% or segment of your user base]

### Goals
1. [Primary goal — what they're trying to achieve]
2. [Secondary goal]

### Frustrations (from research)
1. [Specific frustration, grounded in observations]
2. [...]

### Behaviours
- [Observable pattern from research]
- [...]

### Quote
"[Representative verbatim from a real interview that captures their perspective]"
```

---

## Common Rationalizations

| Excuse | Counter-argument |
|---|---|
| "We know our users — we don't need to research" | The product team's mental model diverges from users' over time. Research recalibrates. The longer since last research, the larger the gap. |
| "We only have 5 interviews — that's not enough data" | 5 interviews identify ~85% of major usability issues. You're looking for patterns, not statistical significance. |
| "The analytics tell us what's happening" | Analytics tell you what. Research tells you why. You need both to make good design decisions. |
| "We'll do research after we ship to validate" | Post-ship validation is expensive to act on. Research before design commits costs less. |

---

## Red Flags

- Synthesis that skips directly from observations to solutions
- Insights that restate the problem rather than explain it
- Personas built from assumption, not research
- JTBD statements that describe a feature ("I want to click the add button") rather than a goal
- Recommendations that haven't been traced back to specific insights
- All research is from the same source type (e.g., all interviews, no analytics)

---

## Verification

- [ ] Every insight is traced to at least 3 observations (or 1 high-signal observation with justification)
- [ ] Insights explain why, not what
- [ ] Implications are requirements, not solutions
- [ ] JTBD statements describe user goals, not feature usage
- [ ] Synthesis document saved to `.d3/docs/`
- [ ] Open questions documented — don't pretend certainty where none exists
