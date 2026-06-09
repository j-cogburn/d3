---
id: DIR-NNN
type: directive
title: <imperative title, <= 8 words>
status: ready           # ready | in-progress | complete
parent_id: OBJ-NNN      # REQUIRED — the law: a directive's parent is its objective
door: two-way           # two-way | one-way (one-way requires a design doc/ADR before BUILD)
appetite: small
sketch_id:              # approved sketch this directive builds, if any
refs: []                # e.g. - { rel: blocks, target: DIR-141 }  - { rel: gated_by, target: ADR-007 }
agent: general-purpose
services: []
skills: []
created: YYYY-MM-DD
---

**Problem.** <1-2 sentences tracing this directive to the objective's problem.>

**Build.** <what to build, why it matters, constraints the agent needs.>

**Done when:**
- [ ] <primary testable criterion>
- [ ] Test gate passes for each service in scope
- [ ] State coverage: empty / loading / error / offline / zero-result / long-content
- [ ] Instrumentation emits the signal the objective's success metric needs
