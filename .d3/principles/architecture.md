# Architecture
**Consulted at:** DEFINE (door) · SHAPE · BUILD

- **12-Factor** (+ API-first, OpenTelemetry observability, zero-trust) — config in env, stateless processes, dev/prod parity.
- **SOLID** — single responsibility, open/closed, Liskov, interface segregation, dependency inversion.
- **Domain-Driven Design** — model around the domain; clear bounded contexts.
- **C4 model** — context/container/component diagrams for shared understanding.
- **OpenAPI-first contracts** — define the interface before the implementation.
- **Modular-monolith-by-default; services only when warranted** — earn distribution; don't start with it.
- **One-way vs two-way doors + ADRs** — irreversible decisions get a written ADR + sign-off before BUILD.

**Gate:** one-way-door objectives/directives require an ADR (§ proposal 2.1).
