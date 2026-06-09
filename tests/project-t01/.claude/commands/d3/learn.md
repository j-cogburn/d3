LEARN — let reality talk back. Audits + git forensics + product metrics, then calibrate and verdict objectives. The outer loop; the only phase allowed to change the Vision.

**Usage:**
- `/learn` — unified quality dashboard (replaces /evaluate)
- `/learn git` — git-forensics report: DORA, hotspots, coupling, change-failure-rate (NEW)
- `/learn <docs|product|design|ux|accessibility|vision|code>` — a sensing dimension (replaces /audit)
- `/learn market` — competitive/opportunity sensing (replaces /research, /venture)
- `/learn --retro` — retrospective (replaces /retro)

**Scheduling:** `git` is fully scriptable and zero-integration — put the outer loop on a cadence with `/schedule weekly d3 learn git` (or `d3 learn git --since=7d`) so reality talks back without anyone remembering to look.

---

## Step 1 — Sense
Gather evidence for the requested dimension. For `git`: run **`d3 learn git`** (backed by `src/scripts/lib/git-forensics.js`) — it computes DORA proxies + churn hotspots + co-change coupling + bug-fix concentration from `git log` and writes `.d3/reports/git-forensics-TIMESTAMP.md`. For audits: write `.d3/reports/<dim>-audit-TIMESTAMP.md`.

## Step 2 — Calibrate (escape the closed loop)
Compare D3's own predictions to reality: did areas rated low-risk actually churn/break? Did directives that passed review get hotfixed? Note miscalibrations in `.d3/docs/lessons/`.

## Step 3 — Verdict objectives
For each active objective, compare to its success metric: confirm (`met`), `pivoted`, or `killed`. Write evidence nodes. Run `d3 index` (rollup check enforces consistency).

## Step 4 — Feed forward
Turn findings into objective candidates for the next `/define` (grounded in fact, not opinion). Update `.d3/vision.md` only if the evidence warrants it.
