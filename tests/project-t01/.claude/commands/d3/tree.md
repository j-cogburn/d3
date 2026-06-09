TREE — render the objective/directive tree with status rollup. Reads the node files (source of truth).

**Usage:**
- `/tree` — all objective trees
- `/tree OBJ-021` — one subtree

---

## Step 1 — Render
Run:
```bash
d3 tree $ARGUMENTS
```
This prints the tree: each objective shows a `(done/total)` rollup and `[level]`; one-way doors are marked `{one-way}`; every node shows its status. Directives hang under their parent objective (the law).

## Step 2 — Read it
Point out: objectives with open children, any one-way doors awaiting an ADR, and the next ready directives (no open `blocked_by`). If `d3 index` reported integrity errors, surface them first.
