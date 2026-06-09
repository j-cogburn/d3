# D3 v2 — `d3 run`: The Continuous Loop Runner (Proposal)

**Status:** Proposal · for review
**Date:** 2026-06-09
**Companion to:** `D3-ARCHITECTURE-V2.md` (the objective-first architecture)
**Scope:** the terminal-side tool that *turns* the v2 loops while you work — not new phases, a new way to run the existing ones.

---

## Why this exists

v2 defines a beautiful machine: a four-artifact spine, a five-phase loop, three nested loops at different clock speeds (`§3`). But it leaves the loops **hand-cranked**. A human still types `/build`, waits, types `/prove`, waits, merges, types `/learn`. The loops only turn as fast as you remember to turn them, and you can only turn one at a time because the interactive session is single-threaded against your attention.

That is the gap `d3 run` fills. It is a **long-lived runner** you start in a terminal pane. It watches the v2 node graph and turns the **inner loop (BUILD ↔ PROVE)** continuously and in parallel, while you stay in the foreground doing the work only a human should: framing problems in DEFINE, choosing options and approving sketches in SHAPE. The slow loops (objective rollups, git-forensics) tick on their own clocks. Reality keeps arriving; the runner keeps converting *approved intent* into *proven, merged work* — without waiting on you.

It is the literal implementation of v2's promise of **dual-track agile (`§1.3`)**: discovery in your foreground, delivery in the background, at the same time.

**The one rule that shapes everything below:** the runner only ever does what a human has already authorized. It never frames a problem, selects an option, or approves a sketch. Those are the gates v2 built to *be wrong cheaply* (`§2.2`), and the runner's job is to make everything *downstream* of those gates free — not to remove them.

---

## 0. Design rule — nothing to memorize, nothing you can break

The runner is held to the same prime directive as the rest of D3 (`V2 §0`), applied to its *operator experience*: **the user should never have to recall a command, guess a flag, or fear an action.** Two laws make that real, and every section below is checked against them.

**Law 1 — zero recall.** There is exactly one thing to type: `d3`. Everything else is presented, not remembered. The tool always shows you what you can do next and lets you *choose* it; you never reconstruct syntax from memory. Flags and subcommands still exist, but only as optional shortcuts for scripts and power users — never the path a person needs.

**Law 2 — fool-proof.** No action a user can take from the interface is allowed to corrupt state or surprise them. This rests on four mechanisms, each detailed where it lives:

```
  Preview-then-confirm   anything expensive or destructive shows what will
                         happen first; you confirm a summary, never fire blind. (§3, §6)
  Actionable errors      every failure is plain language + the one key that
                         fixes it — never a stack trace or a "now what?". (§3)
  Proactive surfacing    when something needs you, the tool raises it; you
                         never have to remember to go check. (§6)
  Can't-corrupt          every action routes through the integrity gate; the
                         index is rebuildable; node files are the diffable
                         truth; autonomous work is always a revertable PR. (§5)
```

If a proposed feature would require the user to memorize something or could leave the graph broken, it is the wrong feature.

---

## 1. The mental model — one terminal, two roles

You do not share one prompt between yourself and a background loop — that fight over stdin is unwinnable. Instead you split the terminal (a tmux split, two panes, two windows — your choice) into two clearly-owned roles.

```
┌─────────────────────────────────────────┬───────────────────────────────────┐
│  PANE 1 — YOU + interactive Claude Code   │  PANE 2 — `d3` (the runner)        │
│  ----------------------------------------  │  --------------------------------- │
│  /define   frame the next objective        │  a LIVE DASHBOARD, not a prompt    │
│  /shape    pick an option, approve sketch   │  shows flow + what needs you       │
│  /sketch   revise the low-fi until right    │  every pending decision is a       │
│  /tree     inspect the graph                │    SELECTABLE action (arrow+enter) │
│                                            │  builds/proves/merges on its own   │
│  HUMAN DECISIONS (the v2 gates)            │  EVERYTHING DOWNSTREAM OF THEM     │
└─────────────────────────────────────────┴───────────────────────────────────┘
                    │                                       │
                    └──────────────┬────────────────────────┘
                                   ▼
                  shared truth: .d3/ node files + .d3/index.db + git
                  (no shared stdin — they coordinate through the graph)
```

The handoff is the whole trick, and it is governed entirely by node **status** in the graph (`§1.4`). You approve a sketch → directives go `ready` → the runner sees them on its next tick → it builds them → they go `complete` → the objective rolls up → the runner *surfaces* it for your LEARN verdict. You never tell the runner anything directly. You change the graph; the runner reacts to the graph.

```
   YOU (pane 1)                  THE GRAPH                 d3 run (pane 2)
   ────────────                  ─────────                 ───────────────
   /shape OBJ-031   ──writes──▶  DIR-140 status: ready
                                 (sketch APPROVED)   ──read─▶  claims DIR-140
                                                               ready → in-progress
                                                               (builds in worktree)
                                 DIR-140 status:     ◀─write──  PROVE clean → merged
                                 complete · PR #88
                  ◀──surfaces──  OBJ-031 all children
                                 complete → needs verdict
   (select it on the board) ───▶ runner walks you through met / pivot / kill
```

You are never blocked, and the runner is never blocked. Each waits on the graph, not on the other.

---

## 2. The three clock speeds, as three schedulers

v2 `§3` says the cycle is three loops at different cadences. `d3 run` makes that concrete: it is three tickers in one process, each turning at its natural speed. This is the part that *fully leverages* v2 — the node graph and derived index are exactly the substrate a multi-speed scheduler needs.

```
 d3 run  (single process, three tickers)
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                                                                            │
 │  INNER TICK   BUILD ↔ PROVE        ~continuous, backs off when idle        │
 │  ──────────   query index: ready directives, no open blocked_by           │
 │               → worktree → claude -p brief → CI → adversarial review       │
 │               → merge clean / park critical          [THE AUTONOMOUS LOOP] │
 │                                                                            │
 │  MIDDLE TICK  objective rollup     on graph change, else every ~5 min      │
 │  ──────────   query index: objectives whose children are all complete     │
 │               → regenerate TASKS.md board view                            │
 │               → SURFACE for human LEARN verdict   [shown, never decided]  │
 │                                                                            │
 │  OUTER TICK   reality sensing      event (git push) + scheduled (nightly)  │
 │  ──────────   on push → /learn git forensics (DORA, hotspots, coupling)   │
 │               nightly → scheduled audits → write Evidence nodes           │
 │               → SURFACE drift               [shown, never decided]        │
 │                                                                            │
 └──────────────────────────────────────────────────────────────────────────┘
            fast, autonomous  ──────────────────▶  slow, advisory
```

In the chosen **inner-loop-only** default, only the inner tick acts on its own. The middle and outer tickers *sense and surface* — they compute rollups, run forensics, write Evidence, and raise items on the board — but the decisions they tee up (verdict an objective, change strategy) land in your dashboard's "NEEDS YOU" list for you to make. This is deliberate: those are the exact judgments v2 created the outer loop to keep *honest* (`§2.1`, "escapes grading its own homework"). A daemon auto-verdicting its own objectives would re-close the loop v2 just opened.

---

## 3. The command surface — one front door, zero recall

There is one command. You type `d3` and the runner starts *and* opens its live dashboard (`§6`). That is the entire surface a person needs to learn. From inside, nothing is typed from memory:

```
   d3            ← the only thing you ever have to know

   inside, everything is shown and chosen:
   ┌────────────────────────────────────────────────────────────┐
   │  ↑ ↓     move between items on the board                     │
   │  enter   act on the selected item (it does the right thing)  │
   │  /       command palette: type plain language, pick a result │
   │  ?       help overlay (also auto-shown on first run)         │
   │  q       quit (graceful: drains, prunes, releases lock)      │
   └────────────────────────────────────────────────────────────┘
   the footer always lists the keys available right now — you never guess
```

**Selection replaces syntax.** Want to review a parked directive? You don't recall `/prove DIR-140` — you arrow to it in the "NEEDS YOU" list and press Enter; the runner opens the finding and walks the review. Want to verdict an objective? Select it; the runner asks "met / pivot / kill?" with the success metric and the evidence already on screen. The slash command is *invoked for you*; you never reconstruct it.

**The palette is plain language, not a flag list.** Press `/` and type what you want in your own words — "slow it down", "pause building", "show me the logs", "change autonomy", "build only this objective". It fuzzy-matches to an action and previews what it will do. This mirrors v2's `/d3 <anything>` natural-language front door (`V2 §4`) — same idea, on the terminal side. You search for capability instead of memorizing it.

**Preview-then-confirm on anything that costs or changes.** Selecting an action shows a one-screen summary *before* it runs — which directives, how many agents, what it will touch — and you confirm. Expensive or irreversible actions (kicking off a large batch, merging, pruning sketches, stopping with work in flight) cannot fire on a single stray keypress.

**Errors tell you the fix, not the cause.** Missing `claude` or `gh`, a dirty worktree, a held lock, an offline network — each renders as plain language plus the single key that resolves it. There is no stack trace and no dead end:

```
   ⚠  Can't start: another d3 runner is already live (pid 4821, started 08:02).
      [a] attach to it    [k] stop it and take over    [esc] cancel
```

**Power-user shortcuts still exist, but you never need them.** `d3 --once` (single inner pass, for CI), `d3 --detach` (background), `d3 --objective OBJ-035` (scope to a subtree) are documented as optional accelerators. Everything they do is reachable from the dashboard and the palette, so a person who knows only `d3` is never stuck.

The interactive `/sprint` is unchanged: it still pushes *one* objective through the loop by hand. `d3` is its always-on, whole-graph complement.

---

## 4. What a session actually feels like

Morning. You open two panes. Pane 2 — you type `d3`, and from then on you only *look and select*:

```
$ d3
D3 RUNNER · inner-loop-only · 4 agents · uptime 00:00     [?] help shown ↓
─────────────────────────────────────────────────────────────────────────
✓ graph healthy (0 integrity violations) · index fresh
building 2   DIR-140  tenant_id + FORCED RLS      ·  DIR-142  rate-limit auth
NEEDS YOU 1  ▸ nothing urgent yet
─────────────────────────────────────────────────────────────────────────
 [↑↓] move   [enter] act   [/] do anything   [?] help   [q] quit
```

A few minutes later the board updates itself — and when something needs you, it says so plainly and the count climbs (Law: proactive surfacing):

```
building 0
merged ▲ 1   DIR-142  rate-limit auth → PR #88
NEEDS YOU 1  ▸ DIR-140  review 1 CRITICAL finding (RLS policy gap)   ← selected
─────────────────────────────────────────────────────────────────────────
 enter ▸ opens the finding + adversarial review, then asks: re-queue or revise?
```

You press Enter on that line — no command recalled — and the runner walks you through the finding and the fix. Meanwhile, in pane 1, you never stopped shaping the *next* objective:

```
> /define our trial-to-paid conversion is weak
  → OBJ-034 (outcome) · success metric: trial→paid 6% → 12% · decomposing…
> /shape OBJ-035
  Options:  A in-product checklist ★recommended   B lifecycle emails
  > select A → sketch (ui) v1 → revise "CTA above the fold" → v2 → approve ✓
  → DIR-150, DIR-151 created · ready · parent OBJ-035
```

The instant you approved that sketch, pane 2 reacted on its own — no handoff command, just the graph changing:

```
+2 ready (DIR-150, DIR-151)
building 2   DIR-150  first-run checklist shell  ·  DIR-151  checklist API
```

You shaped one objective; the runner shipped from another — concurrently, in the same terminal, and at no point did you type a command you had to remember.

---

## 5. How it shares the repo with you — coordination & the can't-corrupt guarantee

The runner spawns agents that write code and statuses while you are also editing files and changing statuses. v2's one-file-per-node store makes this far safer than the old single `TASKS.md`, but it still needs explicit interlocks. These are also what makes Law 2's "can't-corrupt" promise true:

```
1. SINGLE INSTANCE      .d3/run/run.lock holds {pid, host, started}.
                        A second `d3` offers attach / take-over (never two runners).

2. ATOMIC CLAIM         before working a directive the runner flips ONE node
                        file ready → in-progress (its own writer, serialized).
                        Interactive /build respects in-progress and won't
                        double-claim. One-file-per-node ⇒ near-zero contention.

3. WORKTREE ISOLATION   agents build in .d3/worktrees/<branch>, NEVER your
                        checked-out tree. You keep coding/chatting untouched.

4. ADMISSION GATE       before every inner batch the runner runs the v2
                        integrity checks (the law · DAG acyclicity · no
                        dangling refs · status rollup). A FAILED check blocks
                        the batch and surfaces the violation — a broken graph
                        never spawns agents, and no dashboard action can push
                        the graph into an illegal state.

5. EVERYTHING REVERTS   autonomous output is always a PR (reviewable, revertable);
                        sketches archive instead of delete; the index is derived,
                        so `rm .d3/index.db && d3 index` fully restores it. There
                        is no action whose blast radius isn't undoable.

6. GRACEFUL SHUTDOWN     q / take-over: stop claiming, let in-flight PROVE finish
                        (or revert claimed-but-unbuilt to ready), prune worktrees,
                        reindex, release the lock.
```

The claim handshake, drawn out, is the safety core:

```
runner tick                                interactive /build (pane 1)
───────────                                ────────────────────────────
SELECT ready directives                    (user runs /build DIR-160)
  WHERE no open blocked_by      ┐
acquire node writer  ───────────┤  serialized single-writer for status
DIR-160 ready → in-progress  ───┘
                                           reads DIR-160: in-progress → skips it
spawn agent in worktree                    "DIR-160 is owned by the runner"
```

Because the index is **derived and rebuildable** (v2 `§1.5`), the runner treats it as a disposable read-cache: it reindexes after every batch, and if it ever looks stale it rebuilds from the files. Truth is always the node files; the runner never lets the index become authoritative.

---

## 6. The live dashboard — the whole UI

The dashboard *is* the product. It is what `d3` opens, it refreshes itself, and every line that needs a human is a selectable action. It is the LEARN dashboard's fast cousin — what's flowing, what's stuck, and crucially **what needs you**.

```
D3 RUNNER · OBJ tree health · 2026-06-09 09:34 · uptime 32m   ● healthy
══════════════════════════════════════════════════════════════════════════

INNER LOOP  (autonomous)
  building   2   DIR-150  first-run checklist shell        04:11 elapsed
                 DIR-151  checklist progress API           04:11 elapsed
  merged ▲   3   DIR-142, DIR-088, DIR-141   (today)
  parked  ⚠  1   DIR-140  CRITICAL: RLS policy gap

NEEDS YOU            ← arrow here, press enter; the runner does the rest
  ▸ DIR-140    review the critical finding, then re-queue or revise
    OBJ-031    all children complete → verdict (met / pivot / kill)
    OBJ-036    selected, no approved sketch → blocking its directives

QUEUE
  ready      0   (all ready work claimed)
  blocked    2   DIR-152 ⟵ blocked_by DIR-150 ·  DIR-161 ⟵ gated_by ADR-012

OUTER LOOP  (advisory)
  last /learn git  08:00  ·  change-failure-rate 9% (elite)  ·  hotspot: auth/

Autonomy: inner-only ▸   (enter to change · trade-offs shown before you switch)
══════════════════════════════════════════════════════════════════════════
 [↑↓] move   [enter] act   [/] do anything   [?] help   [q] quit
```

Three things make this fool-proof rather than just informative:

**The "NEEDS YOU" block is the only thing you must act on**, and each row is self-explaining — it states *what* is needed in plain language, and Enter performs it. You never translate a board state into a command.

**It surfaces proactively.** When an item enters "NEEDS YOU," the runner raises a banner (and optionally a terminal bell / desktop notification), so even heads-down in pane 1 you're told. The count is always on screen. You never have to remember to check.

**The autonomy dial is a labeled toggle, not a config file.** Selecting `Autonomy: inner-only ▸` shows the three settings with their trade-offs spelled out, and switching is one keypress (it writes the config for you — see `§8`). Nobody edits JSON to change how much the system decides on its own.

---

## 7. Where the speed actually comes from

Concrete cycle-time wins, each traceable to a v2 capability the runner exploits:

```
  Hand-cranked v2                          With d3 run
  ─────────────                            ───────────
  type /build, watch it, wait        →     runner claims the instant a sketch
  type /prove, watch it, wait              is approved; BUILD→PROVE→merge with
  merge by hand, then next directive       no human in the inner loop at all

  one directive's full cycle at a time →   N directives pipelined in parallel
  (your attention is the bottleneck)       worktrees up to the agent budget

  discovery THEN delivery (you can      →  discovery AND delivery at once
  only drive one phase at a time)          (dual-track agile, v2 §1.3, made real)

  regex-scrape TASKS.md to find work    →  SQL over .d3/index.db: "ready AND not
  (old orchestrator)                       blocked" — exact, fast, race-light

  remember to run /learn git            →  fires automatically on every push;
                                           the outer loop is never forgotten

  recall the command for each action    →  select it on the board; never recall

  a broken graph fails mid-build        →  integrity gate blocks the batch up
                                           front — fail fast, before agents spawn
```

The headline: **your judgment stops being the rate limiter on mechanical work, and your memory stops being a prerequisite for using the tool.** You spend attention only where v2 says it belongs — defining problems and being wrong cheaply on paper — and the runner spends machine time on everything those decisions unlock.

---

## 8. Configuration — written by the toggle, not by hand

Settings live in `.d3/run.config.json` so a project's choices persist, but **you never have to open it.** The dashboard's autonomy toggle and the palette ("slow it down", "more agents") write it for you; the file is just where their choices are saved. Defaults apply if it is absent, so a fresh project works with zero setup.

```json
{
  "concurrency": 4,
  "autonomy": "inner-only",          // inner-only | inner-middle | full
  "idleBackoff": { "startMs": 2000, "maxMs": 60000 },
  "middleTickMs": 300000,            // objective rollup cadence
  "outerLoop": {
    "onGitPush": "/learn git",
    "nightly":  ["/learn code", "/learn docs"]
  },
  "park": { "onCritical": true, "saveLesson": true }
}
```

`autonomy` is the one dial behind this whole proposal: `inner-only` is the recommended default; `inner-middle` lets the runner auto-verdict two-way-door objectives; `full` is available but re-closes the honesty loop and is opt-in only. Whichever you pick, you pick it from the labeled toggle with the trade-off in front of you — never by guessing a value in a file.

---

## 9. Where it slots into the v2 rollout

`d3 run` depends on the v2 data foundation and adds cleanly after it. Mapped onto `§7.4`'s implementation order:

```
  §7.4 step 1   node store + index + integrity checks   ← d3 run's substrate
  §7.4 step 1.5 (NEW) d3 --once                          ← inner loop, single pass,
                                                            usable in CI immediately
  §7.4 step 4   /learn git                               ← wire as the outer tick
  §7.4 step 7   SHAPE options + sketches                 ← defines the human gate
                                                            the runner hands off at
  AFTER 7        d3 (daemon + dashboard)                 ← the always-on form
```

Shipping `--once` first is the cheap proof: it is just the existing orchestrator, reading the index instead of scraping `TASKS.md`, gated by the integrity check. The dashboard daemon is that same pass wrapped in the three tickers, a lock, backoff, and the selectable-action UI. Nothing in the runner changes a node schema or a phase contract — it only *drives* what v2 already defines, which is exactly why it can be the last thing built and still feel like the thing that makes v2 fast.

---

## 10. The one-sentence version

`d3 run` turns v2's three nested loops at their natural clock speeds from a single terminal pane you start by typing one command — autonomously shipping every directive downstream of a human decision while presenting (never demanding you recall) every decision v2 reserves for humans as a selectable, preview-then-confirm action you can't get wrong — so your judgment stops being the rate limiter, your memory stops being a prerequisite, and discovery and delivery finally run at the same time.
