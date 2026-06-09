# D3 Continuous Improvement Loop — Strategy & Design

**Status:** Proposal · **Date:** 2026-06-09 (rev. for v2 architecture) · **Author:** Joshua (with Claude)
**Builds on:** `D3-ARCHITECTURE-V2.md` (Objective-First Architecture). This design assumes v2's node store, derived index, principle library, and LEARN phase exist, and extends them.
**Scope:** A repeatable mechanism for D3 to learn from the projects it runs and improve **itself** — the distributable in `src/`.

---

## 1. The problem, stated against v2

v2's founding critique #2 is exact and correct: *"It grades its own homework. Every quality signal is Claude judging Claude. Nothing outside the system ever talks back. A closed loop always concludes it is doing great."* v2 fixes this with the **LEARN** phase and the outer loop — calibration against git forensics, DORA, and real product metrics, with objective verdicts (met / pivot / killed) decided by reality rather than opinion.

But v2 fixes it **one level down.** LEARN calibrates *a project* against *its* reality. It closes the loop on the work D3 produces inside a repo. It does **not** close the loop on **D3 itself** — the commands, hooks, skills, principle files, brief-injection logic, and orchestrator that ship via `d3 update` to every other project. The distributable still grades its own homework: nothing aggregates what happened across the projects D3 ran and feeds it back into `src/`.

This is the recursion v2 stops one step short of. v2 says "definition precedes action" and "reality recalibrates strategy" — and then applies both laws to projects but not to the system that enforces them. The same principle, applied once more:

> **The system that calibrates projects must itself be calibrated by the aggregate reality of those projects.**

That outermost loop is what this design adds. It is the natural completion of v2's own logic, not a bolt-on.

---

## 2. The insight: v2 makes the exhaust structured and queryable

The expensive part of any improvement loop is instrumentation. v2 does most of it for free. Where the old model left signal as prose to scrape, v2 emits **typed nodes with frontmatter, a SQLite index, and first-class Evidence** — so "harvest" is largely a set of SQL queries, not text mining.

| Signal source | v2 location | What it reveals | Harvest cost under v2 |
|---|---|---|---|
| **Calibration misses** | LEARN reports; Evidence nodes (`source: git\|metric`) | Where D3's *predictions* were wrong — low-risk areas that broke, two-way doors that proved one-way | The richest source; structured by design |
| **Objective verdicts** | objective frontmatter (`status: met\|killed\|pivoted`) + success metric | Did the work actually solve the problem, or churn? | SQL over the index |
| **Directive lifecycle** | directive nodes (`status`, `created`), `blocks`/`blocked_by` edges | Velocity, time-in-progress, rework, abandonment, blocked-chain depth | SQL over the index |
| **Option scores** | `.d3/options/` (scored on the SHAPE rubric) | Whether the recommended option won, and whether it paid off | Index + outcome join |
| **Lessons** | LEARN output (`lessons`) | Recurring agent mistakes | File scan; cluster by theme |
| **Adversarial-review findings** | PROVE; CI comments | What slipped past the implementing agent | Per-run; needs logging |
| **Integrity-check failures** | `d3 index` (the law / DAG / dangling-ref gates) | How often agents try to create illegal structure | **Blind spot — log it** |
| **Gate exit codes** | lint/test hooks | How often the cheap gates actually catch something | **Blind spot — log it** |
| **Principle citations** | decisions cite `.d3/principles/` (§0 of v2) | Which principles are load-bearing vs. never cited | Index + grep |
| **Git forensics** | `/learn git` (DORA, churn, coupling, change-failure-rate) | Hotspots, coupling, where change keeps failing | Already computed by `/learn git` |

The single highest-value source is new in v2: **calibration misses.** Every time `/learn` records "D3 rated this low-risk and it broke," that is the system being told by reality where its judgment is wrong. Per-project, v2 uses it to verdict an objective. Aggregated across projects, the *same* record tells you which **principle or scoring rubric in `src/` is systematically mis-calibrated** — which is the purest possible fix for the homework-grading problem, now applied to D3 itself.

---

## 3. Signal taxonomy (your four signals, mapped to v2 sources)

**(a) Recurring agent mistakes.** Sources: lessons, adversarial findings, integrity-check failures, `/resolve` (now `/sprint --quick`) directives. High-impact when the *same class* recurs across ≥3 directives or ≥2 projects — that's a weak **skill**, a missing **principle**, or a gap in **done-when**. v2 adds a sharper variant: a mistake in an area D3 had rated low-risk is a *calibration* failure, not just a bug — weight it higher.

**(b) Process friction / rework.** Sources: directive lifecycle + `blocks` DAG in the index. High-impact: directives far over median time-in-progress (brief/scoping problem), directives that spawn a `--quick` fix within N days (a PROVE gap), abandoned objectives (DEFINE noise), deep blocked-chains (sequencing problem). Under v2 these are index queries, not regex over `TASKS.md`.

**(c) Coverage gaps.** Sources: `/learn <dimension>` recency, skill-reference frequency, **principle-citation frequency**. High-impact: dimensions that never run (accessibility remains the canonical example), skills in `src/skills/` never referenced in any `**Skills:**` field, and — new in v2 — **principle files in `.d3/principles/` that are never cited by any decision**, meaning a whole body of "proven standard" is dead weight or undiscoverable.

**(d) What actually shipped.** Sources: objective verdicts + CHANGELOG + option scores + success-metric outcomes. High-impact: objectives marked `met` whose success metric never actually moved (false positive in PROVE), directives that shipped then got superseded (wasted cycles), and recommended options that lost in reality (the SHAPE rubric is mis-weighted). v2's verdict + metric fields make this a real outcome signal instead of a guess from the changelog.

---

## 4. The loop — fold it into LEARN, don't add a command

v2's prime directive (§0: elegant, simple, effective; KISS/YAGNI; no new mental model) and its grammar ("everything becomes a scope, flag, or dimension — no capability is lost") both point to the same answer: this is **not a new command.** It is a new **dimension of LEARN that points at D3 instead of the project.**

```
/learn d3      # sense D3's own reality across the projects it ran, then improve src/
```

This sits beside `/learn git`, `/learn docs`, `/learn market`. Same verb, same phase, same lifecycle — the self-improvement loop *is* LEARN turned on the system. The meta-cycle mirrors v2's five phases applied to the distributable:

```
Harvest → Cluster → Diagnose → Rank → Shape → Build → Prove → Feed back
```

1. **Harvest.** Query the index + Evidence nodes + calibration reports from one or more `.d3/` stores. Cheap, because v2 normalized the data.
2. **Cluster.** Group raw observations into patterns. Three error-handling findings and one related lesson are *one* cluster.
3. **Diagnose.** Map each cluster to the v2 layer that owns the fix: a **principle file**, a **skill**, the **brief-injection** logic, a **gate** (hook or integrity check), a **phase-contract** rule, or the **SHAPE scoring rubric**. Every problem lands on a fixable surface in `src/`.
4. **Rank.** Score by §5 and emit a ranked report.
5. **Shape → Build → Prove.** Turn top clusters into **objectives + directives against `src/`** — D3 improving D3 is just a normal v2 loop scoped to the distributable, subject to the same orphan law, gates, and adversarial review.
6. **Feed back.** Ship via `d3 update`; the next `/learn d3` measures whether the pattern's frequency and calibration error dropped. The loop closes empirically.

Because v2 makes `/learn` schedulable, the whole thing runs on a cadence: `/schedule weekly /learn d3`.

---

## 5. Prioritization — finding the high-impact areas, v2-enriched

Rank each cluster explicitly. v2 supplies two new inputs that sharpen the formula:

```
Impact = (Frequency × Severity × Blast radius) ÷ Effort
```

- **Frequency** — count of directives/projects exhibiting the pattern. Cross-project count is the multiplier that separates "a bug" from "a system flaw."
- **Severity** — now graded by *where reality caught it*, with v2's door model on top: a **calibration miss on a one-way door** (D3 said reversible/low-risk, it wasn't, and undoing was expensive) is the top of the severity scale; a problem caught by a lint hook is the bottom. The later and more irreversible the failure, the higher the score.
- **Blast radius** — **now computable** from the node graph. A fix to a core principle or the brief builder propagates to every project on `d3 update`; the index can literally count downstream dependents. High blast radius is what makes a lever worth pulling.
- **Effort** — size of the `src/` change: principle-file edit < skill edit < new gate < phase-contract change < orchestrator/index change.

Rank descending. The top of the list **is** the answer to "where is the high-impact potential," recomputed every cycle so it tracks reality instead of going stale.

---

## 6. Where it plugs into v2

- **`/learn d3` dimension** (§4) — the operational entry point. No new mental model.
- **Calibration-drift aggregation** — the marquee capability. Collect calibration misses across projects; where D3's risk/effort/door predictions are *systematically* wrong for a class of work (e.g. consistently under-rating auth or migration changes), emit a directive to correct the responsible **principle file** or the **SHAPE option-scoring rubric**. This is the homework-grading fix applied to the system.
- **Reuse the node store + index** — harvest is SQL, not scraping. No new persistence; add at most a few `evidence` rows tagged `target: d3-system`.
- **New feedback target: `.d3/principles/`** — v2 introduces the principle library as the seat of "proven standards." Recurring mistakes now harden a *principle* (propagates to every future brief in that phase) as readily as a *skill*. This is a higher-leverage target than skills alone.
- **Close two telemetry blind spots** — append one JSONL line per gate fire (lint/test) and per integrity-check failure to `.d3/metrics/`. Near-zero cost; converts the gates from invisible enforcers into a measurable, index-joinable stream. Prerequisite for signals (a) and (b) being complete.

---

## 7. Highest-impact levers (re-ranked for v2)

Applying §5 to D3 as v2 will ship it:

1. **Cross-project calibration-drift → principle/rubric correction.** Highest blast radius and the purest fix for v2's own founding critique, applied at the system level. When aggregated calibration misses show D3 mis-judges a class of work, correct the principle or scoring rubric in `src/` and every future project inherits better judgment. **Pull this first** — it is the completion of v2's logic.
2. **Lessons + calibration misses → principle/skill hardening.** v2 keeps lessons and adds principles as targets. When a mistake recurs, propose an edit to the owning `.d3/principles/*` or `src/skills/*` so the fix is global, not per-project. (In v1 this was lessons→skills; v2 makes principles the stronger lever.)
3. **Gate + integrity telemetry (§6).** Cheap, unblocks two signal classes, and immediately answers whether the lint/test/law/DAG gates earn their keep.
4. **Principle- and skill-coverage report.** Cross-reference `.d3/principles/` and `src/skills/` against actual citations/references. Never-cited principles and never-referenced skills are dead weight or undiscoverable — both fixable, both currently invisible. Directly serves the coverage-gap signal v2 widened.
5. **`--quick`-rate as a PROVE-quality metric.** Every fast-path fix is, by definition, something the loop should have caught. Tracked as a rate per ship (not a raw count), it tells you whether PROVE and adversarial review actually work.

The Express test-hook gap from the v1 backlog is still real but lower leverage than #1–3: it affects one service, not the system's ability to learn.

---

## 8. Fleet vs. single-project — even cleaner under v2

Build single-project first; architect for fleet. v2 makes both easier.

- **Single-project (today, zero privacy concern).** `/learn d3` runs against the local `.d3/` store. The dogfooding repo is itself a project; D3 improving from its own usage needs no new infrastructure beyond the index v2 already builds.
- **Fleet (later, opt-in only).** The high-frequency signal — patterns and calibration drift across many installed projects — needs anonymized records off users' machines. v2 helps: **Evidence and node frontmatter are already a flat, redactable schema**, so fleet work is *transport + aggregation*, not a re-model. Collect only structural signal (pattern fingerprints, calibration error by work-class, gate pass/fail counts, anonymized finding categories) and **never** source, prompts, sketches, or business metrics. Strictly opt-in; one leak ends the feature.

Anti-goal: do not build telemetry transport before the single-project loop has proven it produces useful `src/` directives.

---

## 9. How we know the loop works — and that it isn't grading *its own* homework

The meta-loop must clear the very bar v2 set. Two things matter:

**It must rest on reality, not re-judgment.** `/learn d3` must rank by *outcomes* — objective verdicts, calibration error, git forensics, real metric movement — **not** by Claude re-reviewing its own audits. If the self-improvement loop scored itself on Claude's opinion of Claude's findings, it would reintroduce the exact closed loop v2 exists to break. Reality (did the predicted-safe change actually break? did the shipped objective actually move its metric?) is the only admissible judge.

**Metrics for the loop itself:**

- **Calibration error trend (the real measure).** After a principle/rubric patch ships, does aggregated predicted-vs-actual error fall for that work-class? This is the only proof the loop closed.
- **Pattern recurrence rate.** Does a patched cluster's frequency drop in the next harvest?
- **Time-to-patch.** Cycles between a pattern first appearing and a `src/` directive shipping. "React quickly" is this number going down.
- **Gate catch rate.** Share of problems caught by the cheapest gate vs. escaping to PROVE/CI/production. Rising = detection shifting left.
- **Coverage utilization.** Share of principles and skills actually cited/referenced. Rising = capability is discoverable and earning its place.

---

## 10. Phased rollout — sequenced behind v2's own order

This loop depends on v2 primitives, so it slots into v2's implementation order (its §7.4) rather than racing it:

- **Depends on (must exist first):** node store + `d3 index` (v2 step 1), principle library + per-phase injection (v2 step 2), and `/learn git` (v2 step 4). The self-loop reads all three.
- **Phase A — Instrument (days, can land with v2 step 4).** Add gate + integrity-check telemetry (§6). No behavior change; starts accumulating.
- **Phase B — Harvest + report (1 cycle).** Build `/learn d3` through Harvest→Rank→report against the local store. Output a ranked `learn-d3-*.md`. Manual review, no auto-patching.
- **Phase C — Calibration-drift → principle/skill correction (1 cycle).** Implement lever #1–2: aggregated calibration misses and recurring lessons propose `.d3/principles/` and `src/skills/` edits as objectives+directives. This is where the system first corrects itself.
- **Phase D — Operationalize (ongoing).** `/learn d3` offers Shape integration; schedule weekly; track §9 metrics across runs to prove calibration error and recurrence fall.
- **Phase E — Fleet (only after D shows value).** Opt-in anonymized aggregation across installed projects, piggybacking on the Evidence/node schema.

---

## 11. Risks & anti-goals

- **Re-grading its own homework** (the headline risk). `/learn d3` must score by reality (outcomes, calibration error, git), never by Claude re-reviewing Claude's audits — see §9.
- **Over-collecting.** Each signal must map to a §5 decision or it's noise. v2's structure makes collection cheap, which makes over-collection tempting; resist.
- **Auto-patching too early.** `/learn d3` *proposes* objectives/directives; it never silently edits `src/`. Keep the owner sign-off the v2 SHAPE/SELECT flow already requires — improving the system that ships to others demands *more* scrutiny, not less. (One-way-door changes to `src/` need the working-backwards brief, per v2.)
- **Privacy debt.** Fleet collection never precedes explicit opt-in and a published, narrow schema.
- **Meta-work crowding out product work.** The loop earns its keep only if patches measurably reduce calibration error and recurrence. If §9 metrics don't move after a few cycles, cut scope — don't add instrumentation.
- **Calibration cold start.** Predicted-vs-actual only gets useful after several recorded cycles; the system-level version inherits v2's own warm-up window and compounds it. Expect Phase C to produce weak signal until the calibration corpus fills.

---

## 12. The one-sentence version

v2 closes the outer loop *within a project* — LEARN lets reality recalibrate strategy; this design adds the **one recursion v2 stops short of**: a `/learn d3` dimension that harvests the now-structured exhaust across the projects D3 runs, ranks patterns by `frequency × severity × blast radius ÷ effort` (with calibration misses on one-way doors at the top), and feeds the highest-leverage ones back into `src/` principles, skills, and gates — so the system that calibrates projects is itself calibrated by the aggregate reality of those projects, judged by outcomes rather than its own opinion.
