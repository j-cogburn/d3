---
id: OBJ-NNN
type: objective
title: <problem framed as an outcome, <= 10 words>
status: open            # open | active | met | killed | pivoted
level: atomic           # outcome (decomposes into child objectives) | atomic (spawns directives)
parent_id: Vision       # Vision | OBJ-NNN (a parent objective)
door: two-way           # two-way (reversible) | one-way (expensive to undo)
appetite: medium        # small (~1/2 day) | medium (~2 days) | large (~1 week)
selected_option_id:     # set after SHAPE selection
refs: []                # e.g. - { rel: relates_to, target: OBJ-002 }
created: YYYY-MM-DD
---

**Problem.** <the job-to-be-done, who has it, what's broken today.>

**Who it's for.** <the specific user/segment.>

**Success metric.** <the one measurable signal that says this is solved.>

**Non-goals.** <what we are explicitly NOT solving here.>

**Working-backwards brief.** <required only for one-way doors.>
