DEFINE — turn a problem into a measurable Objective. The entry point of the cycle. Definition always precedes action.

**Usage:**
- `/define our activation is weak` — vague: create an outcome objective, then decompose
- `/define add SSO with SAML` — specific: create one atomic objective
- `/define --project` — bootstrap/refine CLAUDE.md + vision via interview (replaces /setup)
- `/define refine OBJ-021` — sharpen an existing objective

---

## Step 1 — Load context
Read `.d3/vision.md` (JTBD, anti-goals, decision principles) and `.d3/principles/product-discovery.md` and `saas-business.md`. Run `d3 index`; read `.d3/index.json` for the next free OBJ id.

## Step 2 — Choose intake mode
- **Specific** (owner knows the solution space): create ONE objective with `level: atomic`.
- **Vague** (an outcome): create ONE objective with `level: outcome`, then decompose via an **Opportunity Solution Tree** into child objectives (`level: atomic`, `parent_id` = the outcome). Do not over-decompose — elaborate the branch the owner wants now; leave the rest.

## Step 3 — Interview for the required fields
Every objective MUST have a measurable **success metric** and explicit **non-goals**. One-way doors also require a **working-backwards brief**. Use `templates/objective.md`.

## Step 4 — Write node files
Write each objective as `.d3/objectives/obj-NNN-<slug>.md` with YAML frontmatter (id, type, level, parent_id, door, appetite, success metric, non-goals). Never invent directives here — that is SHAPE's job, and an objective must exist first (the law).

## Step 5 — Index & show
Run `d3 index` (must pass integrity), then `/tree` the new objective. Recommend the next step: `/shape OBJ-NNN`.
