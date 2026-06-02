Evaluate the project's market opportunity and monetization potential. Produces a scored market assessment and a ranked monetization analysis with revenue projections.

**Usage:**
- `/venture` — full assessment: market analysis + monetization vectors
- `/venture market` — market opportunity only
- `/venture monetize` — monetization vectors and revenue projections only
- `/venture --compare` — trajectory vs previous venture assessment

Different from `/evaluate`: `/evaluate` measures technical quality. `/venture` measures business quality — is this a real market opportunity, what's the ceiling, and how do you get paid?

**Important:** This analysis is grounded in available project context but is inherently forward-looking. Ranges are given rather than point estimates. Assumptions are stated explicitly. The more detail in `.d3/vision.md` and `CLAUDE.md`, the more accurate the analysis.

---

## Step 0 — Load all available context

Read in full:
1. `.d3/vision.md` — vision, users, JTBD, strategic bets, anti-goals
2. `CLAUDE.md` — product description, services, implementation status, user types
3. `docs/roadmap/product-vision.md` — extended vision if present
4. `docs/roadmap/economics.md` — any financial thinking already documented
5. `docs/roadmap/obstacles.md` — known risks and blockers
6. `.d3/CHANGELOG.md` — what has actually shipped (execution evidence)
7. `.d3/TASKS.md` — what's in progress (directional evidence)

If `.d3/vision.md` is missing or a stub template: stop and say "Run `/vision` to define the project vision before a venture assessment can be meaningful."

Get timestamp: `date '+%Y-%m-%d-%H%M'`

---

## DIMENSION: market

### Framework

Evaluate across six factors. State your reasoning for each score — don't just produce a number.

---

**Factor 1 — Problem severity (max 10)**

Ask: How painful is the problem this product solves? For whom? How often do they encounter it? What do they do today instead?

| Score | Interpretation |
|---|---|
| 9–10 | Acute pain, daily occurrence, no good solution exists today |
| 7–8 | Significant pain, frequent, existing solutions are poor |
| 5–6 | Real but tolerable pain, workarounds exist and people use them |
| 3–4 | Nice-to-have, no urgency |
| 1–2 | Problem exists but users don't actively seek solutions |

Cite specific evidence from the vision and user JTBD statements.

---

**Factor 2 — Market size (max 10)**

Estimate TAM → SAM → SOM using explicit methodology:

```
TAM (Total Addressable Market):
  [Who globally has this problem?]
  [N users × avg willingness to pay = $TAM/year]

SAM (Serviceable Addressable Market):
  [Which segment can this product realistically serve in 3 years?]
  [N users × realistic price = $SAM/year]

SOM (Serviceable Obtainable Market — Year 1-2):
  [Conservative first-mover capture]
  [Assumption: capturing X% of SAM = $SOM/year]
```

| Score | Market Size (SAM) |
|---|---|
| 9–10 | > $1B |
| 7–8 | $100M – $1B |
| 5–6 | $10M – $100M |
| 3–4 | $1M – $10M |
| 1–2 | < $1M |

State the assumptions behind the estimate. Flag if data is speculative.

---

**Factor 3 — Differentiation and moat (max 10)**

Identify the product's competitive advantages. Use this taxonomy:

- **Network effects** — does the product get better as more people use it?
- **Data advantage** — does usage generate proprietary data competitors can't replicate?
- **Switching costs** — once adopted, how hard is it to leave?
- **Proprietary technology** — is there a technical capability that's hard to copy?
- **Distribution** — is there a channel or community advantage?
- **Brand / trust** — is there a trust dynamic that matters in this market?

| Score | Moat strength |
|---|---|
| 9–10 | Multiple strong moats, difficult to replicate in 2+ years |
| 7–8 | One strong moat or two moderate ones |
| 5–6 | Competitive advantage exists but replicable |
| 3–4 | Minimal differentiation, primarily execution-dependent |
| 1–2 | No clear moat, commodity territory |

---

**Factor 4 — Market timing (max 10)**

Ask: Why is now the right time for this product? What tailwinds exist? What would make this the wrong time?

Tailwinds to look for:
- Regulatory changes (new mandates, compliance requirements)
- Technology shifts (AI, cloud, mobile, new platforms)
- Demographic shifts (new generation entering the market)
- Macro events (remote work, economic pressures)
- Infrastructure maturation (APIs, tools that now make this possible)

| Score | Timing signal |
|---|---|
| 9–10 | Clear tailwinds, market is forming now, early entrants win |
| 7–8 | Strong tailwinds, good timing |
| 5–6 | Neutral timing — neither early nor late |
| 3–4 | Headwinds or too early for mainstream adoption |
| 1–2 | Market is declining or too crowded to enter profitably |

---

**Factor 5 — Competitive landscape (max 10)**

Map the competitive landscape:

```
Direct competitors: [products solving the same problem for the same users]
  - [Name]: [positioning, pricing, key weakness]
  
Indirect competitors: [different approach to same problem]
  - [Name]: [how they differ]

Substitutes: [what users do today instead]
  - [Approach]: [why users might stick with this]

White space: [what no competitor is doing well]
```

| Score | Competitive position |
|---|---|
| 9–10 | No direct competitors, clear white space |
| 7–8 | Some competitors but clear differentiation |
| 5–6 | Competitive market, differentiation exists but not obvious |
| 3–4 | Crowded market, must fight for position |
| 1–2 | Dominated market, very difficult to gain share |

---

**Factor 6 — Execution evidence (max 10)**

How much has been built and shipped? Assess from CHANGELOG and implementation status.

| Score | Evidence |
|---|---|
| 9–10 | Paying customers, strong retention, referrals |
| 7–8 | Live product, users engaged, iterating based on feedback |
| 5–6 | MVP shipped, early users, validation in progress |
| 3–4 | Prototype or partial build, pre-launch |
| 1–2 | Concept stage, nothing shipped |

---

### Market score and output

```
MARKET OPPORTUNITY SCORE: X.X / 10  [Grade]

FACTOR BREAKDOWN
──────────────────────────────────────────────────────
Problem Severity:    [bar]  N.N/10  — [one-line rationale]
Market Size:         [bar]  N.N/10  — [TAM/SAM/SOM summary]
Differentiation:     [bar]  N.N/10  — [key moat]
Market Timing:       [bar]  N.N/10  — [key tailwind or headwind]
Competitive Space:   [bar]  N.N/10  — [positioning summary]
Execution Evidence:  [bar]  N.N/10  — [what's shipped]
──────────────────────────────────────────────────────
OVERALL MARKET:      [bar]  N.N/10

COMPETITIVE LANDSCAPE
[3-5 sentence competitive analysis]

KEY RISKS
1. [Biggest market risk]
2. [Second biggest]
3. [Third]

WHAT WOULD CHANGE THIS SCORE
+ [What positive development would raise the market score]
- [What threat would lower it]
```

Market grade scale:
- **A** (8.5–10): Exceptional opportunity — move fast
- **B** (7.0–8.4): Strong market, clear path
- **C** (5.5–6.9): Real opportunity but significant challenges
- **D** (4.0–5.4): Difficult market, needs pivoting or focus
- **F** (< 4.0): Market conditions not favourable — reconsider

Progress bar scale: each █ = 1 point (10 chars = 10 points).

---

## DIMENSION: monetize

### Monetization model taxonomy

Evaluate each model's fit given the product, user types, and market. Rank all models that apply, discard those that clearly don't fit.

---

**Model 1 — SaaS Subscription**
Monthly/annual per-seat or per-workspace pricing.

Evaluate:
- Do users return regularly? (subscription needs recurring value)
- What's the natural pricing unit? (per user, per project, per workspace)
- What do comparable tools charge? (benchmark against 3 comps)
- What tiers make sense? (solo, team, enterprise)

Estimate:
```
Solo tier:       $X/mo — [who this serves, what's included]
Team tier:       $X/mo — [team size, features that justify upgrade]
Enterprise tier: $X/mo — [what enterprise needs: SSO, SLA, support]

Year 1 estimate (SOM basis):
  Conservative: N customers × avg $X/mo = $X MRR
  Realistic:    N customers × avg $X/mo = $X MRR
  Optimistic:   N customers × avg $X/mo = $X MRR
```

---

**Model 2 — Usage-based / Consumption pricing**
Charge per API call, per token, per task, per execution.

Evaluate:
- Is there a natural unit of value? (API call, report, directive executed)
- Does usage correlate with customer success?
- Does it lower the barrier to trial? (pay as you go vs. upfront commitment)

---

**Model 3 — Freemium → Paid**
Free tier for individuals/small teams; paid for teams/power users.

Evaluate:
- Is there a natural free tier that creates value without cannibalising paid?
- What's the conversion trigger? (team size, usage limit, feature gate)
- Can free users become advocates who bring in paying teams?

---

**Model 4 — Marketplace / Platform**
Take a percentage of transactions or partner revenue on the platform.

Evaluate:
- Are there two-sided network effects? (buyers and sellers, creators and users)
- Can the product become infrastructure that others build on?

---

**Model 5 — Enterprise Licensing / Managed**
Annual contracts with customisation, support, and SLA.

Evaluate:
- Do enterprise buyers exist in the target market?
- What would enterprise need beyond the standard product? (SSO, audit logs, on-prem, SLA)
- What's the likely ACV? (compare to similar enterprise tools)

---

**Model 6 — Services / Professional Services**
Consulting, implementation, training, customisation.

Evaluate:
- Is there a complexity in adoption that creates services demand?
- Does services revenue fund product development, or does it distract from it?
- Is this a bridge to scale or a trap?

---

### Monetization output

Rank all applicable models by revenue potential × feasibility:

```
MONETIZATION ASSESSMENT

PRIMARY VECTOR: [Model name] — [one-sentence rationale for why this is the lead]

RANKED MONETIZATION VECTORS
──────────────────────────────────────────────────────────────
Rank  Model              Potential   Feasibility  Time to Revenue
──────────────────────────────────────────────────────────────
  1   SaaS Subscription  ████████░░  ████████░░   1–2 months
  2   Usage-based        ██████░░░░  ██████░░░░   2–3 months
  3   Enterprise         ████░░░░░░  ████░░░░░░   6–12 months
  4   Freemium           ████████░░  ████████░░   3–4 months
──────────────────────────────────────────────────────────────

PRIMARY VECTOR DETAIL — [Model]
Pricing:
  [Tier 1]: $X/mo — [who, what included]
  [Tier 2]: $X/mo — [who, what included]
  [Tier 3]: $X/mo — [enterprise, what included]

Comps:
  [Competitor A]: $X/mo  [what they include]
  [Competitor B]: $X/mo  [what they include]
  Positioning: [how to price relative to comps and why]

REVENUE PROJECTIONS — [Model]
Methodology: [explicit assumptions about growth rate, conversion, churn]

              Conservative     Realistic       Optimistic
Month 3:      $X/mo            $X/mo           $X/mo
Month 6:      $X/mo            $X/mo           $X/mo
Month 12:     $X/mo (ARR: $X)  $X/mo (ARR: $X) $X/mo (ARR: $X)
Month 24:     $X/mo            $X/mo           $X/mo

Path to $1K MRR:   [specific milestone — N customers at $X/mo]
Path to $10K MRR:  [specific milestone]
Path to $100K MRR: [specific milestone — may require expansion to enterprise tier]

UNIT ECONOMICS (estimated)
  LTV (12-month):    $X  (avg revenue × avg retention months)
  CAC target:        $X  (LTV ÷ 3 rule of thumb)
  Payback period:    N months

KEY ASSUMPTIONS
1. [Most important assumption the projections rest on]
2. [Second]
3. [Third — flag which assumptions have the highest uncertainty]

MONETIZATION RISKS
1. [What could prevent achieving these projections]
2. [...]
```

---

## Step 3 — Combined summary (full /venture run)

```
VENTURE ASSESSMENT — YYYY-MM-DD
================================

MARKET:       N.N/10  [Grade]   [one-line verdict]
MONETIZATION: [Primary model] → $X–$X MRR at 12 months

COMBINED VERDICT
[3–5 sentences: what does this project have going for it as a business?
What's the hardest thing to get right? What should the founder do first?]

STRATEGIC PRIORITIES
1. [The single most leverage action to increase market score or revenue]
2. [Second]
3. [Third]

Run /venture --compare to track trajectory.
Run /vision refine to update strategic direction based on these findings.
```

---

## Step 4 — Save report

Write full report to `.d3/reports/venture-TIMESTAMP.md`:

```markdown
# Venture Assessment
**Date:** YYYY-MM-DD HH:MM
**Market score:** N.N/10 [Grade]
**Primary monetization:** [model] — $X–$X MRR at 12 months

## Market analysis
[full factor breakdown with rationale]

## Competitive landscape
[detailed competitive map]

## Monetization vectors
[all ranked models with estimates]

## Revenue projections
[table with methodology]

## Strategic priorities
[top 3 actions]

## Assumptions log
[explicit list of all assumptions made — update on next run]

## Historical
| Date | Market | Primary model | 12-mo MRR estimate |
|---|---|---|---|
| YYYY-MM-DD | N.N/10 | [model] | $X–$X |
```
