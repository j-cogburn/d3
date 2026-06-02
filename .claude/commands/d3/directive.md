Add a new directive to the DIRECTIVES section of `.d3/TASKS.md`.

The directive to add is: $ARGUMENTS

## Steps

1. Read `.d3/TASKS.md`.

2. Count existing `DIRECTIVE-NNN` entries to determine the next ID. If none exist, start at `DIRECTIVE-001`.

3. The argument may be a short title, a full description, or a mix. Use judgment:
   - If it's a short phrase (< 8 words), treat it as the title and leave the description as the title reworded into an imperative sentence.
   - If it's a longer sentence or paragraph, extract a concise title (≤ 6 words) and use the full argument as the description.

4. Determine the appropriate agent type for this directive. Choose from:
   - `general-purpose` — implementation tasks spanning multiple files or services (default)
   - `claude` — catch-all for tasks that don't fit a more specific type
   - `Plan` — use when the directive is primarily about designing an approach before any code is written

   Do not use `Explore` (read-only) or `claude-code-guide` (Claude API questions) for directives.

5. Infer which services are involved from the description. List only those that apply: `Express`, `Python`, `React`. If it's unclear, list all three.

5a. Suggest relevant skills from `.d3/skills/` based on the directive description. List only those that clearly apply — do not pad. Common mappings:
   - Building an API endpoint → `api-and-interface-design`
   - Any implementation work → `incremental-implementation`, `test-driven-development`
   - UI / frontend work → `frontend-ui-engineering`, `interaction-design`
   - New UI components or design system work → `design-system`, `design-critique`
   - Navigation or IA changes → `information-architecture`
   - Buttons, forms, empty states, error messages → `ux-writing`
   - Multi-step flows or onboarding → `user-journey-mapping`, `ux-writing`
   - Visual redesign or audit-driven design fixes → `design-critique`
   - User research findings → `user-research-synthesis`
   - Auth, input handling, external integrations → `security-and-hardening`
   - Performance concerns → `performance-optimization`
   - Shipping / deploy → `shipping-and-launch`, `git-workflow-and-versioning`
   - Omit the `**Skills:**` line entirely if no skills clearly apply.

6. Insert the following block immediately after the DIRECTIVES section header line (the line containing `## DIRECTIVES`) and its italicised note, before any existing directives or the next `---` separator:

```
### DIRECTIVE-NNN: <title>
**Status:** ready
**Agent:** <agent-type>
**Services:** <services>
**Skills:** <comma-separated skill names — omit line if none apply>
**Added:** YYYY-MM-DD

<description as a clear imperative — what to do and why it matters.>

**Done when:**
- [ ] <primary success criterion derived from the description>
- [ ] <test gate: include one per service in scope>
  - Express: `npm test --prefix api-express` passes
  - Python: `api-python/.venv/bin/pytest api-python/tests/ -q` passes
  - React: `npm run build --prefix client` succeeds

---
```

Include only the test gate lines for services actually in scope.

Use today's date for the Added field.

7. Do not renumber or reorder any existing tasks or directives.

8. Confirm what was added with a one-line summary including the agent type chosen and why.
