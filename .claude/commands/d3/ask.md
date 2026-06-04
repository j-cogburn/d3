Natural language interface to the entire D3 system. Describe what you want in plain English — D3 reads your project context, classifies your intent, maps to the right capability, and executes it.

**Usage:**
```
/ask "fix the broken login flow"
/ask "what should I build next?"
/ask "the tests are failing"
/ask "I want to improve the checkout UX"
/ask "plan my Q2 work"
/ask "can this product make money?"
/ask "how is the project doing?"
/ask "I'm not sure what to do"
/ask "make the dashboard faster"
/ask "set up the project"
```

---

## Step 0 — Load project context

Before classifying intent, read everything available to ground the response in the actual project state:

```bash
# What exists
[ -f .d3/vision.md ] && grep -m3 '.' .d3/vision.md 2>/dev/null
grep -m1 '\*\*Status:\*\* ready\|in-progress\|needs-review\|ci-failed' .d3/TASKS.md 2>/dev/null | head -3
[ -f .d3/track.md ] && grep 'Bearing\|Sprint.*active' .d3/track.md 2>/dev/null

# Recent activity
git log --oneline -5 2>/dev/null
grep -m3 '^-' .d3/CHANGELOG.md 2>/dev/null

# Project health signals
ls -t .d3/reports/*.md 2>/dev/null | head -3
cat .d3/.d3-version 2>/dev/null
```

---

## Step 1 — Classify intent

Parse `$ARGUMENTS` and classify the input across three dimensions:

**INTENT TYPE:**
| Intent | Signal words | Primary capability |
|---|---|---|
| Fix / repair | fix, broken, error, bug, not working, failing, issue, crash | `/resolve` or `/audit code` |
| Build / create | build, add, create, implement, develop, make, need X | `/objective` |
| Improve / polish | improve, better, polish, optimize, enhance, clean up | `/improve [scope]` |
| Plan / organize | plan, organize, phases, sprints, roadmap, structure | `/track` |
| Analyze / assess | check, review, assess, evaluate, score, how is, audit | `/evaluate` or `/audit` |
| Status / guidance | what should, what next, where am I, stuck, help, unsure | `/guide` |
| Ship / release | ship, release, deploy, launch, go live | `/release` or `/test` |
| Design / UX | wireframe, design, UX, UI, layout, flow, look, feel | `/wireframe` or `/improve ux` |
| Research / market | market, money, revenue, competition, opportunity, potential | `/venture` or `/research` |
| Setup / onboard | set up, configure, start, new project, initialize | `/setup` → `/vision` → `/bootstrap` |
| Document | document, docs, sync docs, update docs | `/sync-docs` or `/bootstrap organise` |
| Understand | explain, what is, how does, teach me | `/guide "[question]"` |

**SCOPE** (what part of the project):
- Specific feature / area → scope the command to that area
- Whole project → run at project level
- Unclear → ask one clarifying question

**URGENCY:**
- Critical (production broken, CI failing, security issue) → skip planning, execute immediately
- Normal → present routing and confirm before executing
- Exploratory (research, planning) → show options, let user choose

---

## Step 2 — Route to D3 capability

Apply the routing matrix from the classified intent:

### FIX / REPAIR
```
/ask "fix the broken login" → /resolve "broken login flow"
/ask "the tests are failing" → /test  (then /resolve if specific failures)
/ask "something is wrong but I don't know what" → /audit code → /resolve
/ask "there's a security issue" → immediate: /audit code + /test security
```

### BUILD / CREATE
```
/ask "add user notifications" → /objective "add user notifications"
  (objective routes: spec → wireframe → plan → execute based on scale)
/ask "build a dashboard" → /objective "build dashboard"
/ask "I need [X]" → /objective "[X]"
```

### IMPROVE / POLISH
```
/ask "improve the checkout UX" → /improve ux "checkout"
/ask "the code is messy" → /improve code
/ask "make it faster" → /improve code + /test react (performance)
/ask "the copy is confusing" → /improve copy
/ask "accessibility is bad" → /audit accessibility → /improve accessibility
/ask "design looks off" → /audit design → /improve design
```

### PLAN / ORGANIZE
```
/ask "plan my Q2" → /track set  (if no course) or /track sprint plan
/ask "define the next sprint" → /track sprint plan
/ask "I need to figure out what to build" → /gap → /plan
/ask "organize the backlog" → /gap + /plan
```

### ANALYZE / ASSESS
```
/ask "how is the project doing?" → /evaluate
/ask "am I on track?" → /track  (bearing status)
/ask "audit the UX" → /audit ux
/ask "check the code quality" → /audit code
/ask "are there product gaps?" → /gap
/ask "what's my project score?" → /evaluate
```

### STATUS / GUIDANCE
```
/ask "what should I do?" → /guide  (full context-aware recommendation)
/ask "where am I?" → /status + /track
/ask "I'm stuck" → /guide
/ask "what's next?" → /guide
```

### SHIP / RELEASE
```
/ask "ship it" → /test → /release
/ask "ready to release?" → /test  (then /release if passing)
/ask "deploy v2" → /release 2.0.0
```

### BUSINESS / MARKET
```
/ask "can this make money?" → /venture
/ask "what's the market opportunity?" → /venture market
/ask "research the competition" → /research competitive
/ask "find feature opportunities" → /research features
/ask "what are users missing?" → /gap
```

### SETUP
```
/ask "set up a new project" → /setup → /vision → /bootstrap → /track set
/ask "define the vision" → /vision
/ask "scan the codebase" → /bootstrap
```

---

## Step 3 — Present routing decision

Always show the routing decision before executing so the developer understands what D3 is about to do:

```
/ask: "[original input]"

ROUTING
  Intent:    [classified intent type]
  Scope:     [what part of the project]
  Urgency:   [critical / normal / exploratory]
  → [command and args]
  Reason:    [one sentence grounding the choice in project context]
```

**For ambiguous input** (could reasonably map to 2+ commands):
```
ROUTING — multiple possibilities

  1. /improve ux "checkout"   — most likely (UX improvement, specific area)
  2. /audit ux                — if you want a full UX assessment first
  3. /wireframe "checkout"    — if you want to redesign the layout

Which direction?
```

**For critical/urgent** (tests failing, security issue, CI blocked):
Skip the confirmation and execute immediately, but announce clearly:
```
⚠ CRITICAL — executing now
→ /resolve "failing tests on auth service"
```

---

## Step 4 — Confirm and execute

**Normal urgency:**
Ask (single-select):
- "Execute → [command]"
- "Show me what [command] does first"
- "Try a different approach"

**Exploratory:**
Present options and let the user choose which direction to pursue.

**Critical:**
Execute without confirmation. Log the action clearly.

---

## Step 5 — After execution

After the command completes, check if there's a natural next step:

```
Done: /improve ux "checkout" complete

What's next?
  /test react         — verify the changes work
  /track check        — confirm you're still on course
  /ask "[next thing]" — tell me what else you want to do
```

---

## Handling unknown or unclear input

If the intent cannot be confidently classified:

1. Restate what was understood: "It sounds like you want to [X]"
2. Ask one clarifying question: "Is this about [A] or [B]?"
3. After clarification, route normally

If input is completely outside D3's scope (e.g., "write me a poem"):
"That's outside D3's capabilities. D3 helps with: building, fixing, improving, planning, assessing, shipping, and researching software projects. What would you like to do with your project?"
