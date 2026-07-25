# ADR-EG-014: React integrates through a `ManagedRuntime`

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

Evaluation returns an `Effect` (ADR-EG-004), so React cannot call it
synchronously during render. Something must supply the guard services and run
the effect.

Separately, the predecessor shipped two implementations of its nine hooks — a
module-level set and a `createGuardHooks()` factory for multi-tenant isolation —
as a 250-line near-verbatim clone that had to be kept in sync by hand.

## Decision

`GuardProvider` carries a `ManagedRuntime` supplying the guard services; the
subject is injected per render as a layer. Hooks run the effect in `useEffect`
and expose `{ decision, allowed, loading, error }`.

There is one implementation. `createGuardHooks()` builds a provider and hook set
over a fresh context, and the module-level exports are simply that factory
called once.

An evaluation failure is surfaced as `error`, distinct from a denial. Using a
hook outside a provider throws.

## Consequences

**Positive**:

- One implementation to maintain; multi-tenant isolation is the same code.
- An attribute-backend outage is distinguishable from "not permitted", so an
  incident does not present as a permissions bug.
- A missing provider fails loudly rather than denying everything, so a wiring
  mistake looks like a wiring mistake.

**Negative**:

- Decisions are asynchronous, so components render a pending state first.
- Policies built inline in render are new objects each time and re-evaluate on
  every render.

**Trade-off accepted**: the pending state is inherent once evaluation can do
I/O. The memoisation hazard is documented and addressed by building policies as
module-level constants, which is the natural style anyway.
