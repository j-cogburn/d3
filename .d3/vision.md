# Project Vision: D3 — Directive-Driven Development
**Defined:** 2026-06-02
**Last refined:** 2026-06-02

## Vision
D3 is a Claude Code workflow system that enables developers and small teams to ship software with AI agents at consistent quality and strategic alignment — without the process overhead of a full engineering organisation.

## Users

| User type | Job-to-be-done | Success looks like |
|---|---|---|
| Solo developer | When building a product with AI agents, they want a repeatable process that catches regressions, keeps agents aligned, and tracks what shipped | Ships faster with fewer regressions than without D3; always knows what's in progress and why |
| Small team | When coordinating multiple developers and agents on the same codebase, they want consistent process and shared context without project management overhead | Team ships in parallel without conflicts; new members onboard from CLAUDE.md and TASKS.md alone |

## Success horizon — 12 months
D3 is the standard workflow system for Claude Code users building serious software. Projects using D3 ship reliably in production — not just prototypes. Users who start with D3 on a new project don't remove it.

**North star metric:** Number of projects with `.d3/CHANGELOG.md` entries (active use, not just installation)

## Strategic bets
1. Developers will adopt structured AI workflows when the friction of setup is lower than the friction of inconsistency
2. Strategic alignment (vision, objectives) is the gap between prototype-quality and production-quality AI-assisted development
3. Vendored skills (agent-skills + custom) create enough leverage that agents working with D3 outperform those without it

## Anti-goals
We deliberately will NOT:
- Build a general project management tool (no Kanban, Gantt charts, sprint boards, or team management)
- Replace CI/CD platforms — D3 hooks into existing pipelines, never owns deployment
- Support multiple LLM providers — D3 is Claude Code native; multi-LLM abstraction dilutes the integration quality
- Build a visual UI or web dashboard — D3 lives in the terminal and the repo
- Automate decisions that should belong to the developer (merges always require confirmation)

## Decision principles
When in doubt, choose:
- Process clarity over feature richness — a smaller set of commands that work reliably beats a large set that's hard to learn
- Agent quality over agent quantity — one well-briefed agent outperforms ten poorly-briefed ones
- Strategic alignment over tactical throughput — shipping the right thing slowly beats shipping the wrong thing fast
- Composability over all-in-one — commands should orchestrate other commands, not duplicate logic
