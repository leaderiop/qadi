---
"@qadi/core": minor
"@qadi/testing": minor
"@qadi/promise": minor
"@qadi/react": minor
"@qadi/http": minor
"@qadi/devtools": minor
"@qadi/audit": minor
"@qadi/predicate-sql": minor
"@qadi/predicate-prisma": minor
---

`@qadi/audit`: the circuit breaker's half-open probe protocol now lives inside `CircuitBreaker.withPermit`, and three defects found while moving it are fixed.

**Fixes.** A probe interrupted while `stage()` was in flight used to hold its claim until the half-open age-out, doubling recovery time to twice `resetTimeoutMs`; the claim is now released on every exit from the moment it is taken. A write failure settling on an already-`Open` breaker no longer re-announces an `Open` transition (over-counting `qadi_audit_circuit_breaker_transitions_total`) or restarts the open window. A write's outcome now counts only toward the window that admitted it, so a late failure from before a trip cannot reopen a newer half-open window. Comments and BEH-QD-251 no longer claim that a caller's interruption of a write reaches the breaker; it is not a store failure.

**Breaking, for `@qadi/audit/CircuitBreaker` subpath imports only.** The `CircuitBreaker` interface is now `status` plus `withPermit`; `recordSuccess`, `recordFailure`, `claimProbe` and `releaseProbe` are no longer members. `Permit`, `Admitted` and `Refused` are new exports. `@qadi/audit`'s barrel and `AuditDecisionSinkLive` behave as before.
