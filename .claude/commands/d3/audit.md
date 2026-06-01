Comprehensive audit across one or more dimensions. Writes a timestamped report to `reports/`. The report feeds directly into `/plan`.

**Usage:**
- `/audit` — full audit (all dimensions)
- `/audit docs` — documentation accuracy vs. codebase
- `/audit product` — product surfaces vs. vision (requires docs audit within 7 days)
- `/audit design` — design system adherence across all surfaces
- `/audit vision` — strategic alignment with product vision and economics
- `/audit code` — code quality, known bugs, correctness gaps
- `/audit [feature area]` — scope any audit to a specific area (e.g. "onboarding", "admin")

---

## Step 0 — Resolve scope

Parse `$ARGUMENTS`:
- Empty → run all dimensions in order: docs → product → design → vision → code
- A dimension keyword → run only that dimension
- A feature area → run product + design scoped to that area

Get timestamp: `date '+%Y-%m-%d-%H%M'`

---

## Step 1 — Load context (all scopes)

Read these before any audit dimension:
1. `CLAUDE.md` — project overview, implementation status, architecture
2. `docs/roadmap/product-vision.md` — the north star: vision, user types, value proposition
3. `docs/roadmap/execution-plan.md` — phased roadmap, current phase priorities
4. `TASKS.md` — what's in-progress, what's blocked, what's ready
5. `CHANGELOG.md` — what has actually shipped

---

## DIMENSION: docs

### What it checks
Documentation accuracy, completeness, consistency, and vision alignment. Every doc is evaluated against reality (code) and direction (vision).

### Steps

1. Read every file in `docs/current/`, `docs/roadmap/`, `docs/design/`, all service-level `CLAUDE.md` files.

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

6. Write receipt: `reports/docs-audit-TIMESTAMP.md`
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

Report: `Docs audit complete — reports/docs-audit-TIMESTAMP.md`

---

## DIMENSION: product

### Prerequisite
Check for a recent docs audit:
```bash
ls -t reports/docs-audit-*.md 2>/dev/null | head -1
```
If none exists, stop: "Run `/audit docs` first." If older than 7 days, warn and ask to continue.

### What it checks
Product surfaces against vision, roadmap fidelity, UX quality, design adherence, IA, business model alignment, and technical gaps.

### Steps

1. Read all design docs: `docs/design/design-system.md`, `docs/design/design-system-v2.md`, `docs/design/information-architecture.md`, `docs/design/workflows.md`, `docs/design/components.md`.

2. Read as-built docs: `docs/current/frontend.md`, `docs/current/system-architecture.md`.

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

8. Write report to `reports/product-audit-TIMESTAMP.md` using this structure:
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

9. Print: `Report written: reports/product-audit-TIMESTAMP.md`
   Then offer: `Run /plan reports/product-audit-TIMESTAMP.md to create directives from findings.`

---

## DIMENSION: design

### What it checks
Design system adherence, visual consistency, component correctness, and accessibility baseline.

### Steps

1. Read `docs/design/design-system.md` and `docs/design/design-system-v2.md` — these define the current standards.
2. Read `docs/design/components.md` for component specs.
3. Screenshot all surfaces (reuse Playwright setup from product dimension if running together).
4. Evaluate each surface against:
   - Color tokens applied correctly (semantic vs decorative)?
   - Typography: correct font, size, weight per role?
   - Spacing consistent with the 4px base scale?
   - Buttons, inputs, modals, empty states follow component specs?
   - Accessibility: focus rings visible? Contrast passing?
   - Any pages that look like they belong to a different product?
5. Write findings to `reports/design-audit-TIMESTAMP.md`.

---

## DIMENSION: vision

### What it checks
Strategic alignment with product vision, economics model, and execution plan sequencing.

### Steps

1. This is a founding-team-level briefing. Read `docs/roadmap/economics.md` and `docs/roadmap/obstacles.md` in addition to the Step 1 context.

2. Evaluate across five dimensions:
   - **Product–vision fit** — does the implementation reflect the one-sentence vision?
   - **Sequencing** — is work ordered to start the revenue flywheel as fast as possible?
   - **User alignment** — does the quant experience match quant sophistication? Does the trader experience communicate trust?
   - **Business model integrity** — are the load-bearing Year 1–2 revenue streams being built?
   - **Risk exposure** — which obstacles are being actively mitigated? Which are being ignored?

3. Write briefing to `reports/vision-audit-TIMESTAMP.md`:
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

1. Read `docs/roadmap/hardening-plan.md` for the audit findings and phase priorities.
2. Cross-reference TASKS.md for which items are already tracked.
3. Spot-check the highest-severity items:
   ```bash
   grep -rn "TODO\|FIXME\|HACK\|XXX\|raise NotImplementedError" api-python/src/ api-express/src/ client/src/ 2>/dev/null | grep -v ".venv" | head -30
   ```
4. Write findings to `reports/code-audit-TIMESTAMP.md`.

---

## Final output (when running multiple dimensions)

After all requested dimensions complete, print a single summary:
```
AUDIT COMPLETE
==============
Docs:    reports/docs-audit-TIMESTAMP.md     [N proposals, N applied]
Product: reports/product-audit-TIMESTAMP.md  [N critical, N P1, N P2]
Design:  reports/design-audit-TIMESTAMP.md   [N findings]
Vision:  reports/vision-audit-TIMESTAMP.md   [verdict: Aligned/Drifting]
Code:    reports/code-audit-TIMESTAMP.md     [N findings]

Run /plan <report-path> to convert findings into directives.
```
