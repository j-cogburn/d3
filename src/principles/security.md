# Security
**Consulted at:** SHAPE · BUILD · PROVE

- **OWASP Top 10:2025** — broken access control (#1), security misconfiguration (#2), software-supply-chain failures, etc.
- **OWASP ASVS 5.0** — verifiable security requirements across the SDLC.
- **Least privilege** — minimal permissions by default; deny by default.
- **Secrets management** — never in code/config; rotate; scan.
- **Secure SDLC + supply-chain integrity** — pin/verify dependencies; SBOM where relevant.
- **SaaS tenant isolation** — enforce at the data layer (e.g. RLS), not trusted to app code.

**Gate:** security-relevant directives get a negative-test (it must PROVE the bad path is denied).
