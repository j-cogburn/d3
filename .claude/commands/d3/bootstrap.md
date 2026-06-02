Deep first-run scan of an existing project. Reads the entire codebase and all documentation, builds a persistent memory profile, populates D3 state files from what it discovers, and walks the developer through organising and cleaning up documentation into D3 conventions.

Run this after `d3 migrate` or `d3 init` on a project with existing content. Safe to re-run — idempotent on all phases.

**Usage:**
- `/bootstrap` — full scan: memory profile + populate + organise
- `/bootstrap scan` — scan only, build memory profile, no changes
- `/bootstrap populate` — populate D3 files from most recent scan
- `/bootstrap organise` — organise documentation into .d3/docs/ structure
- `/bootstrap cleanup` — identify and offer to remove stale/duplicate files

---

## Step 0 — Setup

Get timestamp: `date '+%Y-%m-%d-%H%M'`

Parse `$ARGUMENTS` for mode. Default: full scan (all phases).

Check what already exists to determine what to skip:
```bash
ls .d3/memory.md 2>/dev/null && echo "MEMORY_EXISTS" || echo "MEMORY_MISSING"
grep -l '\[Project Name\]' CLAUDE.md 2>/dev/null && echo "CLAUDE_TEMPLATE" || echo "CLAUDE_FILLED"
wc -l < .d3/TASKS.md 2>/dev/null || echo 0
```

---

## Phase 1 — Deep codebase scan

Run all signals in parallel. This is the discovery phase — read everything before changing anything.

```bash
# ── Project identity ──────────────────────────────────────────────────────────
cat README.md 2>/dev/null | head -60
cat CLAUDE.md 2>/dev/null
cat .d3/vision.md 2>/dev/null

# ── Source file inventory ─────────────────────────────────────────────────────
find . -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.jsx" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" -not -path "*/.venv/*" -not -path "*/.d3/*" \
  -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" | sort | head -80

# ── Service structure ─────────────────────────────────────────────────────────
for svc in api-express api-python client; do
  [ -d "$svc" ] && echo "SERVICE: $svc" && ls "$svc/src/" 2>/dev/null || true
done

# ── Package manifests (stack, scripts, dependencies) ──────────────────────────
find . -maxdepth 3 -name "package.json" -not -path "*/node_modules/*" \
  -exec echo "=== {} ===" \; -exec python3 -c "
import sys,json
try:
  d=json.load(open(sys.argv[1]))
  print('name:', d.get('name',''))
  print('scripts:', list(d.get('scripts',{}).keys()))
  print('deps:', list(d.get('dependencies',{}).keys())[:10])
except: pass
" {} \; 2>/dev/null

find . -maxdepth 3 -name "requirements.txt" -not -path "*/.venv/*" \
  -exec echo "=== {} ===" \; -exec head -20 {} \; 2>/dev/null

# ── Port and URL configuration ────────────────────────────────────────────────
grep -rn "PORT\|port\s*=\s*[0-9]\|localhost:[0-9]" \
  --include="*.js" --include="*.ts" --include="*.py" --include="*.env*" \
  -not -path "*/node_modules/*" 2>/dev/null | grep -v ".venv" | head -20

# ── TODO/FIXME/debt inventory ─────────────────────────────────────────────────
grep -rn "TODO\|FIXME\|HACK\|XXX\|TEMP\|NOTE:\|REVIEW:" \
  --include="*.js" --include="*.ts" --include="*.py" \
  -not -path "*/node_modules/*" -not -path "*/.venv/*" 2>/dev/null | head -50

# ── All markdown files (not in .d3/ or node_modules) ─────────────────────────
find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.d3/*" \
  -not -path "*/.git/*" | sort

# ── Git history ───────────────────────────────────────────────────────────────
git log --oneline -25 2>/dev/null
git log --format="%H %s" --diff-filter=A -- "*.md" 2>/dev/null | head -20

# ── Existing D3 state ─────────────────────────────────────────────────────────
cat .d3/TASKS.md 2>/dev/null
cat .d3/CHANGELOG.md 2>/dev/null | head -40
ls .d3/reports/*.md 2>/dev/null | head -10
ls .d3/docs/**/*.md 2>/dev/null | head -20
```

---

## Phase 2 — Build memory profile

Synthesise everything discovered in Phase 1 into `.d3/memory.md`. This file is the persistent project memory — read by agents, hooks, and D3 commands for project context that goes beyond CLAUDE.md.

Write `.d3/memory.md`:

```markdown
# Project Memory
**Scanned:** YYYY-MM-DD HH:MM
**Project:** [name from README or CLAUDE.md]

## Identity
[One sentence: what this project is and what it does, synthesised from README/CLAUDE.md]

## Services and stack
| Service | Directory | Stack | Port | Status |
|---|---|---|---|---|
| [name] | [dir] | [stack] | [port] | live / in-dev / scaffolded |

## Dev commands
```sh
[Accurate commands extracted from package.json scripts and project files]
```

## Implementation status
**Live and working:**
- [Feature/service that is confirmed shipped and functional]

**In active development:**
- [Work in progress from TASKS.md, CHANGELOG.md, commit history]

**Scaffolded / placeholder:**
- [Files/modules that exist but are not yet functional]

**Known debt:**
- [TODO/FIXME items organised by service with file:line references]

## Architecture patterns
[Key patterns observed in the codebase: how the services communicate,
data flow, auth model, database patterns, testing approach]

## Documentation inventory
| File | Category | Status |
|---|---|---|
| [path] | current / roadmap / design / stale | in .d3/ / at root / needs moving |

## D3 state
- TASKS.md: N active tasks, N directives
- CHANGELOG.md: N entries, last: YYYY-MM-DD
- vision.md: [defined / stub — run /vision]
- Last audit: [date or never]
```

If `.d3/memory.md` already exists, **append** a new dated entry rather than overwriting — this creates a scan history.

---

## Phase 3 — Populate D3 state files

### 3a — TASKS.md

Scan for work items not yet tracked in `.d3/TASKS.md`:

**Sources to mine:**
1. TODO/FIXME/HACK comments in source code → proposed TASK-NNN entries
2. Incomplete features identified in Phase 2 (scaffolded but not functional)
3. Known bugs from git commit messages ("fix", "broken", "debug")
4. Items mentioned in discovered documentation as "TODO" or "planned"
5. Any existing task-like lists in markdown files not yet in TASKS.md

For each discovered item, draft a TASK-NNN entry:
```markdown
### TASK-NNN: [Concise title from the comment/description]
**Status:** ready
**Files:** [file:line where the TODO was found]

[Expanded description: what needs to be done and why, contextualised from the surrounding code]

**Done when:**
- [ ] [Primary testable criterion]
```

**Present the proposed entries** before writing. Use AskUserQuestion (multiSelect):
- "Add all discovered tasks"
- One option per item: "[TASK-NNN] [title]"
- "Skip — I'll manage TASKS.md manually"

Write only the selected entries to `.d3/TASKS.md`, inserting in the appropriate phase section.

### 3b — CLAUDE.md

If CLAUDE.md is still the template (contains `[Project Name]`), or if it's significantly out of date compared to the memory profile:

Propose an updated CLAUDE.md grounded in what was actually found — services, ports, dev commands, and implementation status pulled from the scan, not guessed. Don't overwrite; show a diff and ask for confirmation.

### 3c — CHANGELOG.md

If `.d3/CHANGELOG.md` is blank or minimal but git history exists:

Extract merged PRs and significant commits to reconstruct a CHANGELOG:
```bash
git log --oneline --merges --format="## %ad%n- %s (merged)" --date=short -20
```

Show proposed entries. Ask to confirm before writing.

---

## Phase 4 — Organise documentation

List every `.md` file found outside `.d3/` (excluding `CLAUDE.md` and `README.md` which stay at root):

For each file, assess its category based on content:
- **`current`** — describes what IS built today (architecture, API docs, component inventory)
- **`roadmap`** — describes what WILL BE built (plans, vision, execution roadmap, economics)
- **`design`** — design decisions, UI/UX specs, information architecture, workflows
- **`archive`** — superseded, historical, or no longer relevant

Present the assessment in a table, then ask for each file (multiSelect options per file):

```
DOCUMENTATION INVENTORY
========================
File                         Category   Suggested destination
────────────────────────────────────────────────────────────────
ENHANCEMENTS.md              roadmap    .d3/docs/roadmap/enhancements.md
PRODUCT-DESIGN-REVIEW.md     design     .d3/docs/design/product-review.md
USER-WORKFLOWS.md            design     .d3/docs/design/user-workflows.md
docs/current/express-api.md  current    .d3/docs/current/express-api.md  (already correct)
...

For each file, what would you like to do?
```

Use AskUserQuestion (multiSelect) per file or in batches by category:
- "Move to suggested destination"
- "Keep at current location"
- "Delete"
- "I'll decide later"

Execute the chosen actions. For moves: `git mv` where possible to preserve history.

---

## Phase 5 — Enforce D3 conventions

After Phase 4, verify all D3 files follow conventions:

**`.d3/TASKS.md`:**
- Has `## DIRECTIVES` section with italic note
- Has `## ARCHIVED DIRECTIVES` section with table header
- All directive blocks have required fields (`**Status:**`, `**Agent:**`, `**Services:**`, `**Added:**`, `**Done when:**`)
- Path references use `.d3/` prefix (not root)

**`.d3/CHANGELOG.md`:**
- Has header comment explaining format
- Entries follow `## YYYY-MM-DD` / `- DIRECTIVE-NNN: description. (PR #N)` pattern

**`.d3/docs/` structure:**
- `current/` — as-built only (no plans or speculation)
- `roadmap/` — forward-looking only (no current-state descriptions)
- `design/` — design decisions and specs
- `adr/` — architecture decision records
- `specs/` — feature specs (output of /spec)
- `lessons/` — agent learning records

Flag any files in the wrong location. Offer to move them.

---

## Phase 6 — Cleanup candidates

Surface files that may no longer be needed:

```bash
# Files that may be superseded by D3 conventions
ls TASK.template.md ENHANCEMENTS.md PRODUCT-DESIGN-REVIEW.md \
   USER-WORKFLOWS.md *.md 2>/dev/null | grep -v "CLAUDE.md\|README.md"

# Duplicate content (same file in two locations)
# Old format files moved to .d3/ that still have roots at top level
```

Present each with a brief explanation of why it's a cleanup candidate:
```
CLEANUP CANDIDATES
==================
ENHANCEMENTS.md      → moved to .d3/docs/roadmap/enhancements.md — safe to delete
USER-WORKFLOWS.md    → moved to .d3/docs/design/user-workflows.md — safe to delete
reports/             → moved to .d3/reports/ — safe to delete if empty
```

Ask (multiSelect) for each candidate:
- "Delete"
- "Keep"

---

## Step — Final report

```
BOOTSTRAP COMPLETE — YYYY-MM-DD
=================================
Memory profile:  .d3/memory.md (created / updated)

Populated:
  TASKS.md:     N new tasks added (N total)
  CHANGELOG.md: N entries reconstructed
  CLAUDE.md:    updated (or: up to date)

Organised:
  N files moved to .d3/docs/
  N files kept at current location
  N files deleted

Convention check: ✓ all D3 files conform / ⚠ N issues found

Next steps:
  /vision          — define or refine the project vision
  /gap             — find product completeness gaps
  /evaluate        — score the project across all 10 dimensions
  /guide           — learn how D3 works
```
