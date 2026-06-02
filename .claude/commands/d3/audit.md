Comprehensive audit across one or more dimensions. Writes a timestamped report to `.d3/reports/`. The report feeds directly into `/plan`.

**Usage:**
- `/audit` — full audit (all dimensions)
- `/audit docs` — documentation accuracy vs. codebase
- `/audit product` — product surfaces vs. vision (requires docs audit within 7 days)
- `/audit design` — design system adherence across all surfaces
- `/audit ux` — usability heuristics, task flows, cognitive load, responsive quality
- `/audit accessibility` — WCAG 2.1 AA, keyboard nav, ARIA, contrast ratios
- `/audit vision` — strategic alignment with product vision and economics
- `/audit code` — code quality, known bugs, correctness gaps
- `/audit [feature area]` — scope any audit to a specific area (e.g. "onboarding", "admin")

---

## Step 0 — Resolve scope

Parse `$ARGUMENTS`:
- Empty → run all dimensions in order: docs → product → design → ux → accessibility → vision → code
- A dimension keyword → run only that dimension
- A feature area → run product + design scoped to that area

Get timestamp: `date '+%Y-%m-%d-%H%M'`

---

## Step 1 — Load context (all scopes)

Read these before any audit dimension:
1. `CLAUDE.md` — project overview, implementation status, architecture
2. `.d3/docs/roadmap/product-vision.md` — the north star: vision, user types, value proposition
3. `.d3/docs/roadmap/execution-plan.md` — phased roadmap, current phase priorities
4. `.d3/TASKS.md` — what's in-progress, what's blocked, what's ready
5. `.d3/CHANGELOG.md` — what has actually shipped

---

## DIMENSION: docs

### What it checks
Documentation accuracy, completeness, consistency, and vision alignment. Every doc is evaluated against reality (code) and direction (vision).

### Steps

1. Read every file in `.d3/docs/current/`, `.d3/docs/roadmap/`, `.d3/docs/design/`, all service-level `CLAUDE.md` files.

2. Cross-reference against the codebase:
   ```bash
   ls api-express/src/models/
   ls api-express/src/controllers/
   ls api-express/src/routes/
   ls api-python/src/alphalab/engine/
   ls client/src/pages/
   grep -n "Route path" client/src/App.jsx 2>/dev/null | head -40
   ```

3. Evaluate each doc against six lenses:
   - **Accuracy** — file paths, endpoints, port numbers, status flags reflect reality?
   - **Completeness** — any new routes, models, or components not yet documented?
   - **Consistency** — do docs contradict each other?
   - **Clarity** — ambiguous or confusing sections?
   - **Optimization** — could any doc be restructured to better serve its reader?
   - **Vision alignment** — does this doc actively help the team build the right thing?

4. Compile findings into a numbered proposal list:
   ```
   [N] [File] [Small/Medium/Large] — what to change and why
   ```

5. Ask which proposals to apply (multiSelect). Apply only selected ones — no extra cleanup.

6. Write receipt: `.d3/reports/docs-audit-TIMESTAMP.md`
   ```markdown
   # Docs Audit Receipt
   **Date:** YYYY-MM-DD HH:MM
   **Proposals generated:** N
   **Changes applied:** N
   ## Applied changes
   - [list]
   ## Skipped proposals
   - [list]
   ```

Report: `Docs audit complete — .d3/reports/docs-audit-TIMESTAMP.md`

---

## DIMENSION: product

### Prerequisite
Check for a recent docs audit:
```bash
ls -t .d3/reports/docs-audit-*.md 2>/dev/null | head -1
```
If none exists, stop: "Run `/audit docs` first." If older than 7 days, warn and ask to continue.

### What it checks
Product surfaces against vision, roadmap fidelity, UX quality, design adherence, IA, business model alignment, and technical gaps.

### Steps

1. Read all design docs: `.d3/docs/design/design-system.md`, `.d3/docs/design/design-system-v2.md`, `.d3/docs/design/information-architecture.md`, `.d3/docs/design/workflows.md`, `.d3/docs/design/components.md`.

2. Read as-built docs: `.d3/docs/current/frontend.md`, `.d3/docs/current/system-architecture.md`.

3. Verify services are running:
   ```bash
   curl -sf http://localhost:5001/api/health || echo "EXPRESS DOWN"
   curl -sf http://localhost:3001 || echo "CLIENT DOWN"
   ```
   If Express or React is down, stop and tell the user. Do not fabricate findings.

4. Set up Playwright:
   ```bash
   [ -d /tmp/pw-runner/node_modules/playwright ] || \
     (mkdir -p /tmp/pw-runner && cd /tmp/pw-runner && npm init -y && npm install playwright && npx playwright install chromium)
   ```

5. Screenshot all product surfaces. Save to `/tmp/product-audit/`. Cover:
   - Public: `/`, `/login`, `/signup`
   - All authenticated routes (inject JWT via localStorage if needed)
   - All role contexts: quant, trader, admin

   For each surface capture **two viewports**: desktop (1440 × 900) and mobile (375 × 812).

6. Read every screenshot before writing any findings.

7. Evaluate across eight dimensions (for each, be specific — reference screenshots and code):
   - **Vision alignment** — does each surface serve a stated goal from product-vision.md?
   - **Roadmap fidelity** — what was planned for the current phase that isn't shipped? What's mock that should be real?
   - **UX quality** — primary action visible? Loading/empty/error states handled? Dead ends?
   - **Design system** — color tokens, spacing, component patterns correct?
   - **Information architecture** — nav matches intended IA? Page names user-friendly?
   - **Business model** — can a user complete the monetization path today?
   - **Technical gaps** — mock data users would mistake for real? Built but not surfaced?
   - **Cross-role consistency** — does switching roles feel like the same product?

8. Write report to `.d3/reports/product-audit-TIMESTAMP.md` using this structure:
   ```markdown
   # Product Audit
   **Date:** YYYY-MM-DD HH:MM
   **Scope:** Full / [specific scope]
   **Services:** Express ✓/✗  Python ✓/✗  React ✓/✗
   **Surfaces reviewed:** N pages

   ## Executive Summary
   ## Vision Alignment Score [table]
   ## Critical Issues [C1, C2...]
   ## Phase 1 — Current Sprint Priorities [P1-1...]
   ## Phase 2 — Pre-[Next Milestone] [P2-1...]
   ## Phase 3 — Post-Launch Polish [P3-1...]
   ## Low Priority / Nice to Have
   ## Strategic Observations
   ## Appendix — Roadmap Fidelity Checklist
   ```

9. Print: `Report written: .d3/reports/product-audit-TIMESTAMP.md`
   Then offer: `Run /plan .d3/reports/product-audit-TIMESTAMP.md to create directives from findings.`

---

## DIMENSION: design

### What it checks
Design system adherence, visual consistency, component correctness, and accessibility baseline.

### Steps

1. Read `.d3/docs/design/design-system.md` and `.d3/docs/design/design-system-v2.md` — these define the current standards.
2. Read `.d3/docs/design/components.md` for component specs.
3. Screenshot all surfaces at **desktop (1440 × 900) and mobile (375 × 812)** viewports (reuse Playwright setup from product dimension if running together).
4. Evaluate each surface against:
   - Color tokens applied correctly (semantic vs decorative)?
   - Typography: correct font, size, weight per role?
   - Spacing consistent with the 4px base scale?
   - Buttons, inputs, modals, empty states follow component specs?
   - Accessibility: focus rings visible? Contrast passing?
   - Any pages that look like they belong to a different product?
5. Write findings to `.d3/reports/design-audit-TIMESTAMP.md`.

---

## DIMENSION: ux

### What it checks
User experience quality against established usability principles. Evaluates task completion paths, information architecture, cognitive load, and responsive quality across breakpoints.

### Steps

1. Invoke `frontend-ui-engineering` from `.d3/skills/frontend-ui-engineering/SKILL.md`.

2. Verify services are running:
   ```bash
   curl -sf http://localhost:5001/api/health || echo "EXPRESS DOWN"
   curl -sf http://localhost:3001 || echo "CLIENT DOWN"
   ```
   If either is down, stop and tell the user. Do not fabricate findings.

3. Screenshot all surfaces at **three viewports**: desktop (1440 × 900), tablet (768 × 1024), mobile (375 × 812).

4. Evaluate each surface against Nielsen's 10 Usability Heuristics:
   1. **Visibility of system status** — does the user always know what's happening?
   2. **Match with real world** — does language and metaphor match user expectations?
   3. **User control and freedom** — can users undo, back out, or escape?
   4. **Consistency and standards** — same words and actions mean the same thing throughout?
   5. **Error prevention** — are dangerous or irreversible actions hard to trigger accidentally?
   6. **Recognition over recall** — are options visible rather than requiring memorisation?
   7. **Flexibility and efficiency** — do power users have accelerators?
   8. **Aesthetic and minimalist design** — no irrelevant information competing for attention?
   9. **Error recovery** — are error messages plain-language and actionable?
   10. **Help and documentation** — is help available without leaving the current task?

5. Also evaluate:
   - **Information scent** — do navigation labels and CTAs clearly signal their destination?
   - **Task completion paths** — can users achieve primary goals without dead ends?
   - **Cognitive load** — does any screen demand too much working memory?
   - **Responsive degradation** — do layouts hold at tablet and mobile, or break?

6. Write report to `.d3/reports/ux-audit-TIMESTAMP.md`:
   ```markdown
   # UX Audit
   **Date:** YYYY-MM-DD HH:MM
   **Viewports:** desktop · tablet · mobile
   **Surfaces reviewed:** N

   ## Executive Summary
   ## Heuristic Violations [Critical / High / Medium / Low]
   ## Responsive Issues [by breakpoint]
   ## Task Flow Issues
   ## Information Architecture Issues
   ## Recommended Fixes [prioritised]
   ```

7. Print: `Report written: .d3/reports/ux-audit-TIMESTAMP.md`
   Then offer: `Run /plan .d3/reports/ux-audit-TIMESTAMP.md to create directives from findings.`

---

## DIMENSION: accessibility

### What it checks
WCAG 2.1 AA compliance across all surfaces: keyboard navigation, screen reader compatibility, colour contrast, ARIA correctness, and focus management.

### Steps

1. Read `.d3/skills/references/accessibility-checklist.md` — this is the evaluation checklist. Follow it.

2. Verify services are running:
   ```bash
   curl -sf http://localhost:5001/api/health || echo "EXPRESS DOWN"
   curl -sf http://localhost:3001 || echo "CLIENT DOWN"
   ```
   If either is down, stop. Do not fabricate findings.

3. Set up Playwright. For each surface, evaluate:

   **Keyboard navigation:**
   - Tab through the entire page — every interactive element must be reachable
   - Focus indicators must be visible (not suppressed without a replacement)
   - Modals and dialogs must trap focus
   - Skip-to-main-content link must exist

   **Colour and visual:**
   - Screenshot at 200% zoom — does layout hold without overlap or truncation?
   - Check text contrast ratios: WCAG AA requires 4.5:1 for normal text, 3:1 for large text
   - No information conveyed by colour alone

   **Structure:**
   ```javascript
   // Heading hierarchy: h1 → h2 → h3, no skipped levels
   // Landmark regions: <main>, <nav>, <header>, <footer> present
   // Images: all non-decorative images have descriptive alt text
   // Links: no "click here" or "read more" without context
   // Forms: every input has an associated <label> or aria-label
   ```

   **Interactive elements:**
   - All buttons have accessible names
   - Error messages are programmatically associated with their fields (aria-describedby)
   - Dynamic content updates announced via ARIA live regions where appropriate

4. Write report to `.d3/reports/accessibility-audit-TIMESTAMP.md`:
   ```markdown
   # Accessibility Audit
   **Date:** YYYY-MM-DD HH:MM
   **Standard:** WCAG 2.1 AA
   **Surfaces reviewed:** N

   ## Result [Pass / Fail — N critical issues]
   ## Critical Issues (block release)
   ## High Issues
   ## Medium Issues
   ## Per-Surface Checklist [table: surface × criterion × pass/fail]
   ```

5. Print: `Report written: .d3/reports/accessibility-audit-TIMESTAMP.md`

---

## DIMENSION: vision

### What it checks
Strategic alignment with product vision, economics model, and execution plan sequencing.

### Steps

1. This is a founding-team-level briefing. Read `.d3/docs/roadmap/economics.md` and `.d3/docs/roadmap/obstacles.md` in addition to the Step 1 context.

2. Evaluate across five dimensions:
   - **Product–vision fit** — does the implementation reflect the one-sentence vision?
   - **Sequencing** — is work ordered to start the revenue flywheel as fast as possible?
   - **User alignment** — does the quant experience match quant sophistication? Does the trader experience communicate trust?
   - **Business model integrity** — are the load-bearing Year 1–2 revenue streams being built?
   - **Risk exposure** — which obstacles are being actively mitigated? Which are being ignored?

3. Write briefing to `.d3/reports/vision-audit-TIMESTAMP.md`:
   ```markdown
   # Vision Alignment Briefing
   ## North Star Verdict [Aligned/Drifting/At Risk/Misaligned + biggest risk]
   ## What Is Working [3–5 bullets]
   ## What Is Drifting [per area: what, from what, consequence]
   ## Silent Risks
   ## Prioritization Recommendations [top 3–5 highest-leverage moves]
   ## The Question You Should Be Asking
   ```

---

## DIMENSION: code

### What it checks
Known bugs, import errors, correctness issues, and code quality gaps referenced in hardening-plan.md.

### Steps

1. Read `.d3/docs/roadmap/hardening-plan.md` for the audit findings and phase priorities.
2. Cross-reference TASKS.md for which items are already tracked.
3. Spot-check the highest-severity items:
   ```bash
   grep -rn "TODO\|FIXME\|HACK\|XXX\|raise NotImplementedError" api-python/src/ api-express/src/ client/src/ 2>/dev/null | grep -v ".venv" | head -30
   ```
4. Write findings to `.d3/reports/code-audit-TIMESTAMP.md`.

---

## Final output (when running multiple dimensions)

After all requested dimensions complete, print a single summary:
```
AUDIT COMPLETE
==============
Docs:          .d3/reports/docs-audit-TIMESTAMP.md          [N proposals, N applied]
Product:       .d3/reports/product-audit-TIMESTAMP.md       [N critical, N P1, N P2]
Design:        .d3/reports/design-audit-TIMESTAMP.md        [N findings]
UX:            .d3/reports/ux-audit-TIMESTAMP.md            [N heuristic violations]
Accessibility: .d3/reports/accessibility-audit-TIMESTAMP.md [Pass/Fail, N issues]
Vision:        .d3/reports/vision-audit-TIMESTAMP.md        [verdict: Aligned/Drifting]
Code:          .d3/reports/code-audit-TIMESTAMP.md          [N findings]

Run /plan <report-path> to convert findings into directives.
```
