# The Insight Round-Trip — from a consuming project back into D3

**Status:** Proposal · **Date:** 2026-06-09
**Companion to:** `continuous-improvement-design.md`
**Question answered:** When I run D3 inside a project (e.g. `j-cogburn/alphalab`), how do the insights generated there get back into the `j-cogburn/d3` repo, improve `src/`, and then return to the project via `d3 update`?

---

## 1. The one fact that determines the whole design

`bin/d3.js` makes the channel unambiguous. `d3 update` is **pull-only** and touches exactly five surfaces, copied from the package's `src/` (and `.claude/commands/d3`) into the project:

```
.d3/hooks/              ← src/hooks/
.d3/scripts/            ← src/scripts/
.d3/skills/             ← src/skills/
.d3/WORKFLOW.md         ← src/WORKFLOW.md
.claude/commands/d3/    ← .claude/commands/d3/
   (+ .d3/principles/   ← src/principles/   under v2)
```

Everything else is protected by the **state guarantee** (verbatim from the CLI): *update NEVER modifies TASKS.md, CHANGELOG.md, vision.md, memory.md, track.md, CLAUDE.md, docs/, or reports/.*

Two consequences follow directly, and they frame everything below:

1. **A D3 improvement only reaches projects if it lives in one of those five surfaces.** A better check, a hardened rule, a new gate — to propagate via `d3 update`, it must land in `src/skills/`, `src/principles/`, `src/hooks/`, `src/scripts/`, `src/WORKFLOW.md`, or `.claude/commands/d3/`. A fix written anywhere else is invisible to the fleet. **Every intake must terminate in an edit to one of these files.**
2. **Insights never flow upward on their own.** They are generated *into* the project's state (`reports/`, `docs/lessons/`, objective verdicts, calibration misses) — precisely the files `update` refuses to read. The pipe runs one way, package → project. To "receive them back," you must build a *separate* return path. `update` is the propagation half of the loop; it was never the capture half.

So the round-trip is two independent channels, not one:

```
  ┌─────────────────────────────────────────────────────────────┐
  │  d3 repo (j-cogburn/d3)        src/skills, src/principles,    │
  │                                src/hooks, commands ...         │
  └───────────────┬───────────────────────────▲──────────────────┘
                  │ (B) d3 update              │ (A) contribute
                  │     PULL — built in        │     PUSH — to build
                  ▼                            │
  ┌──────────────────────────────────────────────────────────────┐
  │  alphalab project        .d3/reports, docs/lessons,           │
  │                          objective verdicts, calibration       │
  └──────────────────────────────────────────────────────────────┘
```

Channel **B** already exists (`d3 update`). This document specifies channel **A** and the integration step in the middle.

---

## 2. The round-trip in four stages

```
[alphalab]                       [j-cogburn/d3]                     [alphalab]
 1. CAPTURE        2. CONTRIBUTE      3. INTEGRATE        4. PROPAGATE
 harvest +         transport the      cluster across      d3 update pulls
 generalize   →    bundle upstream →  projects, patch  →  the improved src/
 insights          (gh issue/PR)      src/ via D3 itself   into the project
```

The elegance: stages 1 and 3 are *the same `/learn d3` loop* from the design doc, run in two places. Stage 1 is `/learn d3 --export` in the consuming project (produce a bundle). Stage 3 is `/learn d3` in the d3 repo (consume bundles, emit directives against `src/`). Stage 4 is the existing `d3 update`. Only stage 2 — transport — is genuinely new, and it's a few lines of `gh`.

---

## 3. Stage 1 — Capture (in alphalab)

A command, `/learn d3 --export`, that harvests the project's improvement signal and **generalizes it** into a portable, anonymized bundle. The generalization is the important part: the d3 repo must learn *"the `frontend-ui-engineering` skill repeatedly ships components with no error state"* — not *"alphalab's billing page broke."* Project specifics are stripped; only the system-level pattern and the surface it implicates survive.

What it reads (all already present in a D3 project):

- `.d3/docs/lessons/*.md` — recurring agent mistakes
- `.d3/reports/*-audit-*.md`, `assessment-*.md`, `retro-*.md`, `learn-*.md` — finding patterns, calibration misses
- objective verdicts + directive lifecycle (`met` / `killed` / `--quick`-fix rate) — from the index under v2
- gate / integrity telemetry (`.d3/metrics/`) once that exists

What it writes — `.d3/feedback/d3-feedback-<project>-<timestamp>.json`, one record per cluster:

```json
{
  "d3_version": "1.4.0",
  "project_fingerprint": "alphalab",      // or a hash, if anonymizing
  "pattern": "UI directives ship without error/empty states",
  "signal_class": "recurring_mistake",     // mistake | friction | coverage_gap | outcome
  "frequency": 6,                          // occurrences in this project
  "severity": "high",                      // graded by where reality caught it
  "implicates": {
     "surface": "skill",                   // skill | principle | command | hook | done-when
     "target": "frontend-ui-engineering"   // the file in src/ that should change
  },
  "evidence_refs": ["lesson-2026-05-21", "ux-audit-2026-06-02"],
  "proposed_change": "Add a mandatory state-coverage checklist to the skill"
}
```

Tagging each record with the **`src/` surface it implicates** is what lets stage 3 route a fix straight to the file `d3 update` will later carry. No record is actionable upstream unless it names a propagatable surface (§1, consequence 1).

---

## 4. Stage 2 — Contribute (transport to the d3 repo)

Both repos are yours, so the cleanest transport is **git-native, no infrastructure**: push the bundle to the d3 repo as a labeled GitHub issue.

A thin new CLI verb, `d3 contribute` (sits beside `init` / `update` / `index` in `bin/d3.js`):

```bash
# in alphalab, after /learn d3 --export
d3 contribute
# → gh issue create --repo j-cogburn/d3 \
#       --title "feedback: UI directives ship without error states (alphalab)" \
#       --label d3-feedback \
#       --body-file .d3/feedback/d3-feedback-alphalab-<ts>.json
```

Why issues (recommended) over the alternatives:

| Transport | Pros | Cons | Verdict |
|---|---|---|---|
| **GitHub issues, `d3-feedback` label** | Zero infra; queryable (`gh issue list --label d3-feedback --json`); full audit trail; no merge conflicts; one inbox across all your projects | Manual-ish; needs `gh` auth | **Recommended** |
| PR dropping a file into `feedback/inbox/` in d3 repo | Bundles live in-repo | Merge overhead; conflicts as volume grows | Fine, heavier |
| Central telemetry endpoint | Fully automatic; scales to others' projects | Real infra + opt-in privacy regime | Only at true fleet scale (design-doc §8) |

Because it's a single owner with a handful of repos, issues are the whole answer — this is the "own-fleet, no privacy concern" path from the design doc. The `d3-feedback` label turns the d3 repo's issue list into the aggregation inbox.

`d3 contribute` should run the same anonymization the export step did, and refuse to send a record that doesn't name a propagatable surface.

---

## 5. Stage 3 — Integrate (in the d3 repo, D3 improving D3)

In `j-cogburn/d3`, run `/learn d3` (no `--export`). It:

1. **Collects** every open `d3-feedback` issue: `gh issue list --repo j-cogburn/d3 --label d3-feedback --json title,body`.
2. **Clusters across projects.** The same pattern from three projects is one high-frequency cluster — this cross-project count is the signal you can't get from any single repo (design-doc §5).
3. **Ranks** by `frequency × severity × blast radius ÷ effort`.
4. **Shapes the top clusters into directives against `src/`** — and *only* `src/` surfaces, because of §1. The d3 repo dogfoods its own loop: `/shape` (v2) turns clusters into objective+directives, `/build` edits `src/skills/frontend-ui-engineering/SKILL.md` (or the relevant principle / hook / command), adversarial review + gates run, PR merges.
5. **Closes the issues** it addressed, linking the PR.
6. **Bumps the version** and tags a release.

This is where the "improvement" becomes real and, crucially, lands in a file `d3 update` will carry. Anything that can't be expressed as a change to skills/principles/hooks/scripts/commands/WORKFLOW isn't shippable through this channel and should be reconsidered or routed to a structural change in the CLI itself.

---

## 6. Stage 4 — Propagate (back into alphalab)

The existing mechanism, unchanged:

```bash
# in alphalab
npx github:j-cogburn/d3 update
```

`update` overwrites the five system surfaces with the improved `src/`, bumps `.d3/.d3-version`, and leaves all your project state intact. The hardened skill, new gate, or corrected principle is now active in alphalab. The next `/learn d3 --export` measures whether the patched pattern's frequency dropped — which is the empirical proof the loop closed (design-doc §9).

Optional nicety: `update` already writes a version marker, so a one-line note in its output — *"this release addressed feedback #N (UI error-state coverage)"* — would let you trace a fix from the issue you filed in alphalab to the update that brought it home.

---

## 7. Minimal build to make this real

In dependency order, smallest useful increment first:

1. **`/learn d3 --export`** (consuming-project command) — harvest + generalize + write the JSON bundle. Reuses the design-doc loop; the only new logic is anonymization and surface-tagging.
2. **`d3 contribute`** (CLI verb in `bin/d3.js`) — `gh issue create` wrapper with the `d3-feedback` label. ~30 lines.
3. **`/learn d3`** intake mode (d3-repo command) — `gh issue list` → cluster → rank → propose `src/` directives. Reuses the loop again.
4. **Version-note in `update` output** — trace fixes back to the feedback that drove them.

Steps 1 and 3 are the same loop in two contexts; step 2 is the only true addition. Channel B (step 4 / `update`) already works. You can ship step 1+2 first and review bundles by hand in the d3 repo before automating step 3.

---

## 8. The constraint to keep front of mind

`d3 update` carries improvements *only* in `src/skills`, `src/principles`, `src/hooks`, `src/scripts`, `src/WORKFLOW.md`, and `.claude/commands/d3`. Therefore every insight worth capturing must ultimately name *which of those files should change*. Capture tags the surface, contribute refuses records that don't, and integrate lands the patch there. Get that right and the round-trip is closed: insight born in alphalab → issue on the d3 repo → patch to `src/` → `d3 update` → back in alphalab, measurably better.
