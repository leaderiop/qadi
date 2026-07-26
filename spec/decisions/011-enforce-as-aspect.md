# ADR-QD-011: `Qadi.enforce` is an Effect aspect

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

The predecessor's `enforcePolicy` took eight arguments — policy, subject, port
name, scope id, audit trail, a fail-on-audit-error flag, an optional resource
and an optional field-mask adapter — and returned `Result<void, E>`. Its README
and architecture document both described it as wrapping an adapter so that
enforcement ran automatically at resolution time. It did not. It was a function
you had to remember to call, and forgetting produced no signal.

## Decision

`Qadi.enforce(policy)` is a combinator that wraps an Effect:

```ts
const handler = updateDocument(id).pipe(Qadi.enforce(canEditDocument))
```

The guarded effect runs only if the policy allows; otherwise the result fails
with `AccessDenied` and the protected work never starts. Subject, resolvers and
identifier generator all travel in the environment, so the aspect takes one
argument.

`Qadi.enforceProjected` additionally narrows the result to the fields the
decision exposes, so a single pass answers both "may they read this?" and
"which parts?".

## Consequences

**Positive**:

- Enforcement composes with any Effect and needs no container.
- The protected effect is not merely discarded on denial — it never runs, which
  a test asserts directly.
- The type signature shows `AccessDenied` in the error channel, so an unhandled
  denial is a compile-time signal.

**Negative**:

- Enforcement is still explicit at each call site; nothing enforces that a
  handler is guarded at all.

**Trade-off accepted**: automatic enforcement requires owning the call graph,
which is what the predecessor's container attempted and its documentation
overstated. An honest, explicit aspect beats an implicit mechanism that does not
actually exist.
