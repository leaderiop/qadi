---
"@qadi/audit": patch
"@qadi/predicate-sql": patch
"@qadi/predicate-prisma": patch
---

Each package's metrics are declared once, in a module its own tests import, and those tests read them by reference instead of matching an id string (ARCH-61, ADR-QD-123): `@qadi/audit`'s write, staging, lost-entry and circuit-breaker counters, and each compiler's compile counter, now in `CompileMetrics.ts`. Nothing is added to any package's public exports, and every metric id, description, type and series is unchanged, so an exporter sees the same metrics.
