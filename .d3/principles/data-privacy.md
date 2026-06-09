# Data & privacy
**Consulted at:** SHAPE · BUILD

- **Sound data modeling** — normalize until it hurts, denormalize until it works; explicit constraints (NOT NULL, FK, unique).
- **Safe migrations** — backward-compatible, reversible-on-paper, expand/contract pattern.
- **Privacy-by-design** — collect the minimum; purpose limitation; retention policy.
- **Data minimization** — don't store what you don't need.
- **Tenant data isolation** — tenant_id on every tenant-scoped table; enforced, indexed.

**Gate:** schema-touching directives are one-way doors -> ADR + migration rollback plan.
