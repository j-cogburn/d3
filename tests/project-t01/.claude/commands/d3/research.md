Generative market research for brainstorming. Explores competitive gaps, high-impact feature opportunities, emerging trends, user pain points, and adjacent market possibilities. Output feeds into `/spec`, `/plan`, or `/vision refine`.

**Usage:**
- `/research` — full exploratory session across all dimensions
- `/research competitive` — competitive intelligence: gaps, weaknesses, whitespace
- `/research features` — high-impact feature ideas ranked by impact × differentiation
- `/research trends` — emerging forces shaping this market
- `/research users` — unmet user needs, pain points, workarounds
- `/research adjacent` — adjacent markets and expansion opportunities
- `/research "question"` — free-form research on a specific question
- `/research --web` — any of the above with live web search for current data

**Note:** Without `--web`, this uses the model's knowledge base (training data). With `--web`, it pulls current competitor pages, job listings, community discussions, and pricing pages for up-to-date intelligence. `--web` mode is slower but reflects the market today.

---

## Step 0 — Load context

Read:
1. `.d3/vision.md` — vision, users, JTBD, strategic bets, anti-goals
2. `CLAUDE.md` — product description, services, user types, implementation status
3. `.d3/docs/` — any design or roadmap docs present
4. Previous research reports: `ls -t .d3/reports/research-*.md 2>/dev/null | head -3`

If `.d3/vision.md` is missing: still proceed, but note that research will be less targeted without a defined vision. Infer the product direction from CLAUDE.md.

Parse `$ARGUMENTS`:
- Dimension keywords → run only that dimension
- `--web` flag → enable live web search
- A quoted phrase → treat as a specific research question
- Empty → run all dimensions

Get timestamp: `date '+%Y-%m-%d-%H%M'`

---

## Step 1 — Ground the research

Before any dimension, synthesise a one-paragraph research brief:

```
RESEARCH CONTEXT
Product: [what this is, in plain terms]
Target users: [who they are and what they're trying to do]
Current state: [what's built, what's working]
Open questions: [what the vision doesn't yet answer]
Research focus: [dimension(s) being explored today]
```

---

## DIMENSION: competitive

**Goal:** Find what competitors do poorly, what they don't do at all, and where your product could carve a defensible position.

### Step C1 — Map the competitive landscape

Identify and categorise competitors:

```
DIRECT COMPETITORS (same solution, same user)
  [Name] — [positioning in one sentence]
  Users say: [what they love + what they hate — be specific]
  Pricing: [model and range]
  Key weakness: [the thing users complain about most]

INDIRECT COMPETITORS (different approach, same problem)
  [Name] — [how they differ]
  Why users choose them instead: [specific reason]
  Where they fall short: [specific gap]

ALTERNATIVES / SUBSTITUTES (what users do instead of any product)
  [Approach] — [why it's sticky]
  The gap this creates: [what none of these solve well]
```

For `--web` mode, search for:
- `[product category] alternatives`
- `[competitor name] reviews`
- `[competitor name] pricing`
- Reddit/HN threads: `site:reddit.com [product name] complaints`
- Job postings (proxy for what they're building next)

### Step C2 — Find the competitive gaps

After mapping competitors, identify:

1. **Things users hate about every competitor** — these are table stakes to fix, not differentiators
2. **Things one competitor does well that others don't** — opportunity to match or leapfrog
3. **Things no competitor does** — whitespace opportunities
4. **Things the market has stopped doing** — features dropped that users still want

Format each gap:
```
GAP: [Description — specific enough to build from]
Evidence: [Why you believe this gap exists]
User impact: [How painful is this for users?]
Buildability: [How hard would this be to address?]
Opportunity size: [Niche / Medium / Large]
```

### Step C3 — Positioning opportunities

Based on gaps, identify 2–3 positioning angles that are:
- Defensible (hard for competitors to copy quickly)
- Valuable to the target user
- Consistent with the project's strategic bets and anti-goals

---

## DIMENSION: features

**Goal:** Generate a ranked list of feature ideas sorted by impact × differentiation × feasibility. Not feature requests — feature opportunities: things that would materially change the product's value or market position.

### Step F1 — Feature opportunity matrix

For each feature idea, rate:
- **User impact** (1–5): How much does this change the user's experience or outcomes?
- **Differentiation** (1–5): Does any competitor do this well? 1 = everyone has it, 5 = nobody does it
- **Feasibility** (1–5): How buildable is this given the current stack and team?
- **Vision alignment** (1–3): Does this serve the stated anti-goals? Subtract 2 if it conflicts.

Score = (Impact × Differentiation × Feasibility) × Vision alignment

### Step F2 — Feature categories to explore

Generate ideas across these categories — the goal is quantity then quality:

**Power user features** — things that make the product 10× better for the most engaged users
*E.g.: keyboard shortcuts, batch operations, programmable workflows, custom integrations*

**Onboarding and activation** — things that get users to value faster
*E.g.: templates, guided setup, example data, progressive disclosure*

**Collaboration** — things that make the product work for teams, not just individuals
*E.g.: shared state, comments, review workflows, role-based access*

**Automation and intelligence** — things that reduce manual work
*E.g.: smart defaults, pattern detection, anomaly surfacing, scheduled runs*

**Integrations and ecosystem** — things that connect the product to where users already work
*E.g.: webhooks, API, IDE plugins, CI/CD integration, notification channels*

**Quality and trust** — things that make the product feel production-grade
*E.g.: audit logs, rollback, version history, compliance exports*

### Step F3 — Output format

```
FEATURE OPPORTUNITIES (ranked by opportunity score)

#1  [Feature name]  Score: N
    Category: [Power user / Onboarding / Collaboration / Automation / Integration / Quality]
    What it does: [one sentence]
    Why it's high-impact: [specific user benefit]
    Differentiation: [does any competitor do this? how would you do it differently?]
    Effort estimate: [S / M / L]
    First version: [the smallest thing you could ship to test this]

#2  [Feature name]  Score: N
    ...
```

Present at least 10 feature ideas. Flag the top 3 as "high conviction" — ideas worth writing a spec for now.

---

## DIMENSION: trends

**Goal:** Surface emerging forces that will shape this market over the next 12–36 months. Not trends for trend's sake — trends that create specific opportunities or threats.

### Trend categories to explore

**Technology shifts** — new platforms, tools, or capabilities changing what's possible
*Questions: What technical limitation that existed 2 years ago no longer exists? What new capability (AI, edge, WebAssembly, etc.) could fundamentally change how this product works?*

**Behaviour shifts** — how user expectations or workflows are changing
*Questions: What do users expect now that they didn't expect 3 years ago? What workflow is becoming standard that wasn't before?*

**Regulatory and compliance** — rules that create new requirements or opportunities
*Questions: What regulations are emerging that would make this product mandatory rather than optional? What compliance burden are users now facing that this could solve?*

**Economic forces** — budget pressures, market consolidation, hiring trends
*Questions: Is the buyer spending more or less? Are companies consolidating tools or expanding them? What does the current hiring environment mean for tool adoption?*

**Platform shifts** — changes to the distribution landscape
*Questions: Is there a new marketplace or platform where this product could be discovered? Is an existing distribution channel dying?*

### Output format

```
TREND ANALYSIS

HIGH-IMPACT TRENDS (act on in 0–12 months)
  [Trend]: [What's changing + specific opportunity or threat it creates]
  Signal strength: [Strong / Moderate / Emerging]
  Action: [What you should do now to capitalise or defend]

MEDIUM-TERM TRENDS (watch in 12–36 months)
  [Trend]: [What's changing + where it leads]
  Early signal to watch: [specific indicator that this is accelerating]

DECLINING PATTERNS (things to avoid doubling down on)
  [Pattern]: [Why it's declining + what it means for product decisions]
```

---

## DIMENSION: users

**Goal:** Discover unmet needs, active workarounds, and pain points that aren't obvious from the product vision alone.

### Step U1 — User pain landscape

For each user type defined in `.d3/vision.md`, map:

**Jobs they're trying to do** (from vision JTBD statements, expanded):
- Primary job: [the main thing they're trying to accomplish]
- Related jobs: [adjacent things they do as part of the same workflow]
- Emotional jobs: [how they want to feel, what they want to avoid feeling]
- Social jobs: [how they want to appear to others]

**Current pain points** (where friction exists today):
```
PAIN: [Specific problem — not vague, not generic]
Frequency: [How often does this happen?]
Severity: [How much does it hurt their workflow?]
Current workaround: [What do they do instead?]
Why the workaround is bad: [What does it cost them?]
```

**Unmet needs** (things users need that nothing provides well):
```
UNMET NEED: [What they want that doesn't exist or isn't good enough]
Evidence: [Why you believe this is real — user complaints, workarounds, forum posts]
Opportunity: [What you could build to address it]
```

### Step U2 — For `--web` mode

Search for real user voice:
- `[product category] subreddit` — what users complain and ask about
- `[competitor] reviews site:g2.com OR site:capterra.com` — rated pain points
- `[competitor] alternatives` — what makes users switch
- GitHub issues on competitor repos — feature requests and bugs
- Twitter/X searches for product frustrations

Present verbatim examples when found — real user language is more valuable than analysis.

---

## DIMENSION: adjacent

**Goal:** Identify where the product could expand, what other problems the same users have, and what adjacent markets could be entered with relatively low cost.

### Adjacent opportunity types

**Horizontal expansion** — same solution, different vertical
*Same product, different industry: if it works for [current users], could it work for [adjacent user type]?*

**Vertical expansion** — deeper into the same workflow
*What do users do before or after using your product? Could you own more of that workflow?*

**Platform / ecosystem play** — become infrastructure others build on
*Could other products integrate with yours? Could you offer an API or SDK that creates a network effect?*

**User base expansion** — adjacent user types with overlapping needs
*Who else has the same problem? What's different about serving them? Is the incremental cost low?*

**Geographic or language expansion**
*Are there markets where this problem is equally or more acute? What would localisation require?*

### Output format

```
ADJACENT OPPORTUNITIES (ranked by attractiveness)

#1  [Opportunity name]
    Type: [Horizontal / Vertical / Platform / User expansion / Geographic]
    What it is: [specific description]
    Why it's attractive: [market size × strategic fit × execution cost]
    What it would require: [specific capabilities or changes needed]
    Risk: [what could go wrong]
    First step: [smallest test to validate the opportunity]
```

---

## Step 2 — Free-form research question

If `$ARGUMENTS` is a quoted phrase (not a dimension keyword), treat it as an open research question.

Apply structured thinking:
1. Restate the question in precise terms
2. What's already known from project context?
3. What frameworks are relevant (market sizing, competitive analysis, user research, etc.)?
4. Generate a thorough answer with specific findings
5. What follow-up questions does this raise?
6. What would change the answer?

---

## Step 3 — Synthesis and recommendations

After all requested dimensions, produce a synthesis:

```
RESEARCH SYNTHESIS — YYYY-MM-DD
=================================

TOP OPPORTUNITIES DISCOVERED
1. [Highest-conviction finding — specific enough to act on]
2. [Second]
3. [Third]

HIGH-IMPACT FEATURE IDEAS (top 3 to spec immediately)
  [Feature] — [one sentence on why this is high-priority now]
  [Feature] — ...
  [Feature] — ...

STRATEGIC INSIGHTS
[2–3 sentences: what does this research change about how you think about the product?
What assumption should you revisit?]

QUESTIONS WORTH INVESTIGATING FURTHER
- [Research question that would unlock significant insight if answered]
- [...]

WHAT TO DO NOW
  /spec "[feature idea]"          — write a spec for the top feature idea
  /venture market                 — validate market assumptions from this research
  /vision refine                  — update strategic direction based on findings
  /plan                           — create directives from the top opportunities
```

---

## Step 4 — Save report

Write to `.d3/reports/research-TIMESTAMP.md`. Use the synthesis as the header, then full dimension detail below.

Each finding should be tagged so it's searchable:
- `[COMPETITIVE]` — competitive intelligence
- `[FEATURE]` — feature opportunity
- `[TREND]` — market trend
- `[USER]` — user pain or need
- `[ADJACENT]` — expansion opportunity

This allows future `/plan` runs to filter research reports by tag.
