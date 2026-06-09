---
name: user-journey-mapping
description: Guides agents through mapping end-to-end user journeys across touchpoints, sessions, and channels. Surfaces friction, delight moments, and design opportunities. Use when planning a new feature, evaluating an existing flow, or identifying where users drop off.
---

# User Journey Mapping

## Overview

A user journey map visualises the full experience of a user achieving a goal — across time, touchpoints, and emotional state. It reveals gaps between intent and reality that page-level audits miss. A journey map asks: what is the user trying to accomplish, and what does it actually feel like to try?

Maps are most powerful when grounded in observation (research, analytics, support logs), not assumption. State clearly what the map is based on.

---

## When to Use

- Planning a new feature or flow that spans more than one screen
- Investigating where users drop off or contact support
- Aligning the team on the current experience before redesigning it
- After user research synthesis — turning findings into a shared artefact

---

## Journey anatomy

Every journey map has five layers:

```
PHASE        → The stage of the journey (Awareness / Onboarding / Core use / Return / Advocacy)
ACTIONS      → What the user does at each step
THOUGHTS     → What the user is thinking (use real quotes from research when available)
FEELINGS     → Emotional state: 😣 frustrated / 😐 neutral / 🙂 satisfied / 😊 delighted
TOUCHPOINTS  → Where the interaction happens (email, app, web, push, support)
OPPORTUNITIES→ Design interventions that would reduce friction or amplify delight
```

---

## Process

### 1. Define the scope

State:
- **Who** — which user type or persona is this map for?
- **Goal** — what is the user trying to achieve? (one specific goal per map)
- **Start** — where does the journey begin? (first awareness, first visit, first login?)
- **End** — where does it end? (goal achieved, churned, became an advocate?)
- **Data source** — research interviews / analytics / support tickets / assumption (flag clearly)

### 2. Identify phases

Break the journey into 4–6 phases. Common patterns:

```
Discovery → Sign-up → Activation → Core loop → Retention → Advocacy
Awareness → Research → Decision → Purchase → Onboarding → Ongoing use
Trigger   → Search   → Evaluate  → Act      → Confirm    → Follow-up
```

Choose phases that reflect the real shape of this journey, not a generic template.

### 3. Map each phase

For each phase, fill in all five layers. Use this ASCII format:

```
═══════════════════════════════════════════════════════════════════════════════
JOURNEY: <Goal>   |   USER: <Persona>   |   SOURCE: <research / assumption>
═══════════════════════════════════════════════════════════════════════════════

PHASE         │ Discovery        │ Sign-up          │ Activation       │
──────────────┼──────────────────┼──────────────────┼──────────────────┤
ACTIONS       │ Googles problem  │ Clicks sign up   │ Completes setup  │
              │ Lands on homepage│ Fills form       │ Invites teammate │
──────────────┼──────────────────┼──────────────────┼──────────────────┤
THOUGHTS      │ "Does this solve │ "How long will   │ "I don't know    │
              │  my problem?"    │  this take?"     │  what to do now" │
──────────────┼──────────────────┼──────────────────┼──────────────────┤
FEELINGS      │       😐         │        🙂         │        😕        │
──────────────┼──────────────────┼──────────────────┼──────────────────┤
TOUCHPOINTS   │ Web / SEO        │ Sign-up page     │ Dashboard        │
              │ Marketing site   │ Email verify     │ Onboarding flow  │
──────────────┼──────────────────┼──────────────────┼──────────────────┤
OPPORTUNITIES │ Clearer value    │ Reduce fields    │ ← Empty state    │
              │ prop above fold  │ Social auth      │   needs strong   │
              │                  │                  │   first action   │
═══════════════════════════════════════════════════════════════════════════════
```

### 4. Mark the emotional arc

After filling all phases, draw the emotional arc:

```
EMOTIONAL ARC
😊 │              ●
🙂 │    ●       ●   ●
😐 │  ●   ●   ●
😕 │          ●
😣 │
    Discovery  Sign-up  Activate  Core use  Return
```

Identify:
- **Lowest point** — the biggest friction moment. This is the highest-priority design opportunity.
- **Highest point** — the delight moment. Understand what caused it and protect it.
- **Cliff drops** — sudden drops in sentiment are where users churn.

### 5. Extract opportunities

For each pain point or drop, write a specific opportunity statement:

```
OPPORTUNITY: At [phase], [user type] experiences [pain] because [root cause].
             Fixing this by [intervention] would [expected outcome].
```

Example:
```
OPPORTUNITY: At Activation, new users feel lost because the dashboard is empty
             with no guidance. Adding a contextual empty state with a clear
             first action would increase activation rate.
```

### 6. Save the map

Write to `.d3/docs/` as `journey-<persona>-<goal-slug>-TIMESTAMP.md`.

---

## Common Rationalizations

| Excuse | Counter-argument |
|---|---|
| "We know our users well enough" | Journey maps reveal gaps between what we think users do and what they actually do. Assumption-based maps are still useful — label them clearly and validate later. |
| "We don't have research data" | Map from analytics + support logs + your own experience using the product. Label as assumption-based. An imperfect map surfaces more than no map. |
| "This is just one user type" | One map per persona per goal is the right scope. Multiple maps for different user types reveal divergent journeys that a single flow can't serve. |
| "We'll do this after we build it" | Journey maps built after implementation describe the current state. Build them before to identify where to invest, after to validate you succeeded. |

---

## Red Flags

- Map covers only the happy path — no friction, all 😊 feelings
- Phases are named after internal teams rather than user activities
- Actions describe UI elements ("clicks button") rather than user intent ("submits application")
- Opportunities are vague ("improve UX") rather than specific ("reduce sign-up form to 3 fields")
- Only one touchpoint covered (the app) when the real journey spans email, mobile, and desktop

---

## Verification

- [ ] Every phase has a real user action (not a UI description)
- [ ] Thoughts are in first-person user voice
- [ ] Emotional arc shows variation — a flat line means the map isn't honest
- [ ] At least one low-sentiment moment is identified with a specific opportunity
- [ ] Data source is stated (research / analytics / assumption)
- [ ] Map saved to `.d3/docs/` with standard naming
