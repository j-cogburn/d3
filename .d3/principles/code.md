# Logic & code
**Consulted at:** BUILD (hooks) · PROVE

- **Clean code** — small functions, intention-revealing names, no dead code.
- **GoF patterns** — apply the named pattern; don't reinvent.
- **TDD** — a failing test first; the test is the spec.
- **DRY / KISS / YAGNI** — one source of truth; simplest thing that works; build only what the objective demands.
- **Trunk-based development** — short-lived branches, merge small and often.
- **Conventional Commits + SemVer** — machine-readable history (also feeds `/learn git`) and predictable versions.

**Gate:** lint + test hooks block on failure; every directive's done-when has a test row.
