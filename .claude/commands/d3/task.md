Add a new task to TASKS.md. You are the orchestrator — use your judgment to decide where this task belongs.

The task to add is: $ARGUMENTS

## Steps

1. Read TASKS.md in full.

2. Read the root CLAUDE.md for project context (implementation status, architecture, what's live vs. roadmap).

3. Determine the next available TASK-NNN ID by finding the highest existing number and incrementing.

4. Analyze the task against the existing structure and make a judgment call on:

   **Which section it belongs in** — choose one:
   - `PREREQUISITES` — only if it is a hard technical blocker for multiple other tasks
   - A named phase (`PHASE H1`, `PHASE H2`, `PHASE 1`, `PHASE 2`, etc.) — based on what the task is logically part of
   - A new phase section if the task doesn't fit any existing phase (create the section, explain why)

   **Where within the section** — order by priority relative to existing tasks. Higher impact / lower effort goes earlier.

   **Dependencies** — is it blocked by any existing task? If so, note `blocked by TASK-NNN`. If it can run alongside other in-flight tasks, mark `[parallel-safe]`.

   **Never place the task in DIRECTIVES** — that section is owner-reserved.

5. Format the task block consistently with existing tasks:

```
### TASK-NNN: <concise title>
**Status:** ready [parallel-safe] OR blocked by TASK-NNN
**Files:** <key files this task will touch, if determinable>

<2–4 sentence description: what to build, why it exists, what problem it solves.
Include any non-obvious constraints or context the agent will need.>

**Done when:**
- <primary success criterion>
- <secondary criterion if needed>
```

6. Insert the block in the correct location in TASKS.md. Do not renumber or reorder existing tasks.

7. Report back:
   - The assigned ID and title
   - Which section it was placed in and why
   - Any dependencies noted
   - Any assumptions made about priority or placement
