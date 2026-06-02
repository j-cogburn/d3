# Tasks

## DIRECTIVES
*Owner-declared work units. Highest priority. Run with `/execute`.*

---

## PHASE 1 — Future improvements

### TASK-001: Multi-repo / microservice support
**Status:** ready
**Files:** src/scripts/orchestrate.js, .claude/commands/d3/execute.md, .claude/commands/d3/status.md

D3 currently assumes a single repository. Teams building with microservices or monorepos with independent deployment units hit friction at the orchestration layer — directives can only touch the current working repo, and status/session context only scans one `.d3/` directory.

Add support for multi-repo directive execution: allow directives to specify a `**Repo:**` field pointing to a sibling repo path, have the orchestrator spawn agents in the correct directory, and have `/status` aggregate state across configured repos. Configurable via a `.d3/repos.json` manifest.

**Done when:**
- [ ] Directives with `**Repo:** ../sibling-repo` field execute agents in the correct working directory
- [ ] `/status` aggregates directive counts and last audit dates across all configured repos
- [ ] `.d3/repos.json` format documented in WORKFLOW.md

---

### TASK-002: Automated dependency update tracking
**Status:** ready
**Files:** src/hooks/, bin/d3.js, .claude/commands/d3/status.md

D3 security hooks catch vulnerabilities *after* a dependency is added but have no proactive freshness tracking. Teams that don't update dependencies regularly accumulate vulnerability surface area silently.

Add a `dependency-age.sh` hook or `/audit dependencies` dimension that checks for packages with available updates using `npm outdated` and `pip list --outdated`, reports stale dependencies with their age and severity, and creates directives tagged with `security-and-hardening` for packages with known CVEs or major versions behind.

**Done when:**
- [ ] `dependency-age.sh` script reports outdated packages with age and available version
- [ ] `/audit` gains an optional `dependencies` dimension using this data
- [ ] Critical outdated packages (known CVEs) surface in session context as a recommended action

---

### TASK-003: Visual regression automation (pixel-diff baseline)
**Status:** ready
**Files:** .claude/commands/d3/test.md, src/hooks/

The current visual baseline comparison in `/test` is agent-driven (subjective interpretation of screenshot differences). A pixel-diff approach with configurable thresholds would make regressions deterministic and catchable without Playwright or Percy.

Implement screenshot comparison using `pixelmatch` or `sharp` (both npm packages, no paid service required): capture baseline PNGs on first run, compare on subsequent runs, fail if any surface exceeds a configurable pixel-difference threshold (default 0.1%). Store baselines in `.d3/screenshots/baseline/` and diffs in `.d3/screenshots/diff/` for review.

**Done when:**
- [ ] `/test react` captures PNG screenshots and compares against `.d3/screenshots/baseline/` using pixel-diff
- [ ] Diff images saved to `.d3/screenshots/diff/` when threshold exceeded
- [ ] Threshold configurable via `SCREENSHOT_DIFF_THRESHOLD` in CLAUDE.md (default 0.1%)
- [ ] First run creates baseline automatically; subsequent runs compare

---

### TASK-004: Claude API token/cost tracking per directive
**Status:** ready
**Files:** src/scripts/orchestrate.js, .claude/commands/d3/execute.md, .claude/commands/d3/retro.md

No visibility into how much each directive costs to execute in API tokens. For teams watching API spend, large batches of complex directives can create unexpected costs with no attribution to specific work.

Track token usage per directive in the orchestrator by reading the `usage` field from Claude API responses (input tokens + output tokens). Log to `.d3/reports/cost-TIMESTAMP.json`. Surface cumulative cost in `/retro` reports. Add a `D3_COST_ALERT_USD` env var threshold that warns when a directive's estimated cost exceeds the limit.

**Done when:**
- [ ] orchestrate.js captures token counts from each agent run and writes `.d3/reports/cost-TIMESTAMP.json`
- [ ] `/retro` includes a cost summary: total tokens, estimated USD, most expensive directive
- [ ] `D3_COST_ALERT_USD` threshold warns (not blocks) when exceeded

---

## ARCHIVED DIRECTIVES

| ID | Title | PR |
|---|---|---|
