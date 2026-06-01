Run all ready directives in parallel, merge the PRs, sync main, archive, and prompt for verification.

**Usage:**
- `/execute` — run all directives with `Status: ready`
- `/execute DIRECTIVE-NNN` — run a single directive by ID

---

## Step 1 — Read project context

Read `CLAUDE.md` (root) and all service-level `CLAUDE.md` files that exist:
- `api-express/CLAUDE.md` if present
- `api-python/CLAUDE.md` if present
- `client/CLAUDE.md` if present

Store the extracted content — you will use it to build live agent briefs in Step 5.

---

## Step 2 — Identify targets

Read `TASKS.md`. If `$ARGUMENTS` is a directive ID (e.g. `DIRECTIVE-055`), target only that directive. Otherwise collect every `### DIRECTIVE-NNN:` block whose `**Status:**` line is exactly `ready`.

Skip any directive whose status contains `in-progress`, `complete`, or `blocked`.

For each directive extract: ID, Title, Description, Done-when items, Agent type (default `general-purpose`), Services.

If zero targets found, report and stop.

**Large-batch delegation:** If the target count is 20 or more (and no specific ID was given), delegate to the orchestration script instead of running inline:

```bash
node scripts/orchestrate.js
```

The script manages worktrees, agent spawning, concurrency, and TASKS.md/CHANGELOG.md updates outside the context window. Report its output and skip to Step 12 (prompt for next steps) once it exits.

---

## Step 3 — Derive branch names

```
feature/<directive-id-lowercase>-<slug>
```

Slug = title lowercased, spaces → hyphens, max 5 words, strip punctuation.

---

## Step 4 — Present plan and confirm

Print:
```
DIRECTIVES TO EXECUTE
======================
DIRECTIVE-NNN  <Title>
  Branch:   feature/...
  Agent:    <type>
  Services: <list>
...
Total: N directive(s)
```

Ask to proceed or cancel (single-select). If cancelled, stop.

---

## Step 5 — Mark in-progress and build briefs

Before spawning, update every target's status in `TASKS.md`:
```
**Status:** in-progress — branch: <branch-name>
```

For each directive, construct the agent brief. Build it by composing live content — do not use hardcoded patterns:

**Brief structure:**

```
## Identity
| Field | Value |
| Task ID | DIRECTIVE-NNN |
| Title | <title> |
| Branch | <branch-name> |
| Services | <services> |
| Parallel-safe | yes |

## What to build
<directive description verbatim, expanded where terse>

## Checklist
- [ ] <done-when item 1>
- [ ] <done-when item 2>

## Out of scope
- Do not edit TASKS.md, TASK.template.md, or any .claude/ file
- Do not modify other directives or tasks

## Files to create / edit
<infer specific paths from description and services>

## Reference patterns
<INSERT LIVE CONTENT HERE — read from service CLAUDE.md files:>

For each service in scope:
- Express: include the "How to add a feature" section and auth patterns from api-express/CLAUDE.md
- Python: include the endpoint pattern and config notes from api-python/CLAUDE.md
- React: include the routing, API call, and CSS conventions from client/CLAUDE.md

Do not hardcode these patterns — read them fresh from the files read in Step 1.

## Setup
[include install commands appropriate for the services in scope]

## Definition of done
- All checklist items complete
- No console.log / print debug statements in production paths
- No hardcoded secrets, URLs, or credentials
- Open a PR against main — title must be: DIRECTIVE-NNN: <Title>
```

---

## Step 6 — Spawn all agents in parallel

Send a **single message** with one Agent tool call per directive. All in the same response.

Each call:
- `subagent_type`: agent type from the directive
- `isolation`: `"worktree"`
- `run_in_background`: `true`
- `prompt`: full brief from Step 5

---

## Step 7 — Collect results incrementally

As each agent completes, immediately:

1. Find the PR number: `gh pr list --head <branch> --json number,url --jq '.[0]'`
2. Update `TASKS.md` status: `**Status:** complete — PR #N · YYYY-MM-DD`
3. Add entry to `CHANGELOG.md` under today's date heading:
   ```
   - DIRECTIVE-NNN: <one-line summary>. (PR #N)
   ```
4. Clean up worktree: `git worktree remove --force <path> 2>/dev/null || true && git worktree prune`

---

## Step 8 — Adversarial review

Before presenting the merge prompt, run an independent code review on each PR that passed CI. This catches what the implementing agent missed.

For each passing PR:

1. Use the Skill tool to invoke `code-review` with argument `medium` (medium effort, current branch diff).
   - If reviewing a specific PR by number rather than the current branch, switch to that branch first or pass the PR number as context.
2. Print the review findings under a clear header:
   ```
   CODE REVIEW — DIRECTIVE-NNN (PR #N)
   =====================================
   <findings>
   ```
3. If the review finds **critical issues** (correctness bugs, security problems, broken contracts), ask:
   - "Fix this PR before merging (re-open the worktree agent)"
   - "Merge anyway (accept the risk)"
   - "Skip this PR"

   If the review finds only minor issues or nothing, proceed to merge without asking.

---

## Step 9 — Merge

Once all PRs have been reviewed, print:
```
ALL COMPLETE
=============
DIRECTIVE-NNN  PR #N  <title>
...
```

Check CI on each: `gh pr checks <N>`. Exclude any with failing checks.

Ask merge strategy (single-select):
- "Merge all passing PRs (squash)"
- "Merge all passing PRs (merge commit)"
- "Skip — I'll merge manually"

Merge sequentially: `gh pr merge <N> --squash --delete-branch` (or `--merge`). If a merge fails, skip and note it.

---

## Step 10 — Sync local main

```bash
git fetch origin
git checkout main
git pull origin main --ff-only
```

If `--ff-only` fails, report and do not force-reset.

---

## Step 11 — Archive completed directives

1. Re-read `TASKS.md`.
2. Find every `### DIRECTIVE-NNN:` block whose status starts with `complete`.
3. Remove those blocks from the active DIRECTIVES section.
4. Append them verbatim to `## ARCHIVED DIRECTIVES` at the end of the file (create with header if absent, ordered by ID ascending).
5. Add each to the archived directives summary table.

---

## Step 12 — Prompt for next steps

Print the execution summary, then ask:

```
What next?
  1. /verify — confirm changes work in the running app
  2. /sync-docs — update documentation to reflect what shipped
  3. Done — no further action needed
```

---

## Step 13 — Final report

```
EXECUTION COMPLETE
==================
Directives executed:  N
PRs reviewed:         N (adversarial review)
PRs merged:           N
PRs skipped:          N
Local main synced:    yes/no
Directives archived:  N

Merged:
  DIRECTIVE-NNN — <Title>  (PR #N)

Skipped:
  DIRECTIVE-NNN — <Title>  (reason)
```
