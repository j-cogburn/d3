Update all documentation to reflect the current state of the codebase. Run after any significant feature addition, directive execution, or code change.

**Usage:**
- `/sync-docs` — update all docs based on recent git changes
- `/sync-docs "added portfolio system and waitlist capture"` — hint about what changed to focus the update

---

## Step 1 — Identify what changed

```bash
git log --oneline -10
git diff origin/main --name-only 2>/dev/null || git diff HEAD~5 --name-only
```

Use the git diff to know which services and areas changed. Focus doc updates on those areas — don't rewrite docs for unchanged code.

If `$ARGUMENTS` provides a hint, use it to narrow focus further.

---

## Step 2 — Update as-built docs

For each area that changed, update the corresponding doc in `.d3/docs/current/`:

**If Express code changed** (`api-express/src/`):
- Read `.d3/docs/current/express-api.md`
- Update: endpoint tables, model schemas, controller descriptions, env vars, known issues
- Check: are any new routes, models, or controllers missing from the doc?

**If Python code changed** (`api-python/src/`):
- Read `.d3/docs/current/python-api.md`
- Update: endpoint table, boot sequence, CLI tools, signal dimensions, known issues

**If React code changed** (`client/src/`):
- Read `.d3/docs/current/frontend.md`
- Update: route table (with live/mock status), page inventory, component descriptions, known issues
- Verify the page count is still correct

**If data pipeline changed** (fetcher, ingestion, schema):
- Read `.d3/docs/current/data-platform.md`
- Update storage layouts, table schemas, source descriptions

**Rule:** document what IS, not what was planned. If something is built-but-not-wired, say so explicitly. Never leave a section describing a previous state.

---

## Step 3 — Update service CLAUDE.md files

For each service that changed:

**`api-express/CLAUDE.md`:**
- File map: any new models, controllers, or route files?
- Endpoints table: any new route groups?

**`api-python/CLAUDE.md`:**
- File map: any new modules?
- Endpoints table: any new endpoints?
- TimescaleDB table: any status changes?

**`client/CLAUDE.md`:**
- Routes table: any new pages? Status changes (mock → live)?

---

## Step 4 — Update root CLAUDE.md

Check the Implementation Status table. Flip any ✅/⚠️/⏳ that changed. Add any new architectural decisions to the Key Architectural Decisions table.

---

## Step 5 — Check design and roadmap docs

If any UI changes shipped:
- Read `.d3/docs/design/information-architecture.md` — any new routes to add? Any status markers to update?

If any roadmap items completed:
- No changes to `.d3/docs/roadmap/` — those are forward-looking and should not be retroactively updated to describe past work. CHANGELOG.md is the record of what shipped.

---

## Step 6 — Verify

Read back each file you edited. Check:
- No section still describes a previous state
- No TODOs or placeholders in as-built docs
- Version numbers / dates updated where the doc has them
- No contradictions between docs

---

## Step 7 — Report

```
DOCS SYNCED
============
Files updated:
  .d3/docs/current/express-api.md  — [what changed]
  client/CLAUDE.md             — [what changed]
  ...

Files unchanged (not affected by recent commits):
  .d3/docs/current/python-api.md
  ...
```
