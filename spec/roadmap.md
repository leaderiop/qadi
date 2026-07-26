# Roadmap

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-RMP                                       |
> | Revision       | 1.4                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning                                       |
> | Change History | 1.4 (2026-07-26): Span emission verified; every URS gap closed (CCR-QD-010)<br>1.3 (2026-07-26): Relationship short-circuit coverage closed (CCR-QD-009)<br>1.2 (2026-07-26): Package scope resolved; renamed to Qadi (CCR-QD-005)<br>1.1 (2026-07-26): React rebuilt on atoms (CCR-QD-003)<br>1.0 (2026-07-25): Initial release (CCR-QD-002) |

---

## Current state

Version `0.0.0`, unpublished, under the `@qadi` scope with the `QD`
specification infix. The core is complete and verified: nine policy variants,
eleven matchers, the evaluator, enforcement, serialization, React integration
and a test toolkit.

| Gate | Status |
| ---- | ------ |
| `tsc -b` (sources and tests) | passing |
| `oxlint` + house-style checks | passing |
| Unit and property tests | 174 passing |
| Acceptance scenarios | 31 scenarios, 128 steps passing |
| Coverage | 99.6% statements, 96.1% branches — thresholds enforced |
| Doc examples compile | 53 blocks |
| Specification integrity | 13 checks passing |

Every requirement in the [URS](./urs.md) now has a test behind it; §7 there
records both gaps that writing it surfaced, and both are closed.

Nothing below is required for the library to be correct. These are gaps in
confidence, ergonomics or reach.

## Blocking first release

### Track `effect/unstable/reactivity`

`@qadi/react` is built on a module that is unstable by name
([ADR-QD-014](./decisions/014-react-via-atoms.md)). Its API may move before
Effect 4.0 is released, and this package moves with it.

The exposure is contained — `QadiAtoms.ts` and one `useSyncExternalStore` call
in `QadiProvider.tsx` — but there is no canary for it yet. The core package has
`v4-api-smoke.test.ts` pinning the APIs it relies on; the reactivity APIs
deserve the same, so a beta bump fails loudly in one place rather than
mysteriously across the React suite.

## Planned

### Concurrent evaluation

An opt-in `EvaluateOptions.concurrency` allowing sibling policies to evaluate in
parallel, for callers who would rather pay for speculative lookups than latency.

Deliberately unbuilt rather than merely unfinished. Parallel evaluation
interacts with both short-circuiting (which it forfeits) and field-set merging
(where the order of allowing children currently determines the `First` result).
Those interactions need designing, not bolting on.

Two ADRs previously stated this option *existed*. They have been corrected —
see [ADR-QD-005](./decisions/005-lazy-attribute-resolution.md) and
[ADR-QD-013](./decisions/013-short-circuit-default.md).

### Policy explanation

A human-readable rendering of a policy — "requires role `editor` **and**
permission `doc:write`" — for administrative interfaces and review.

The trace already answers "why was this denied". This answers "what does this
rule say", which is a different question and the one a security reviewer asks.

### Server-side rendering

`QadiProvider` accepts `initialValues`, which is the hook a hydration story
would use, but nothing yet encodes decisions on the server and seeds them on the
client. Until it does, a server-rendered page shows its pending state and
re-decides after mount.

### Batch subject evaluation

`Qadi.filter` evaluates one policy against many resources. The transpose —
one policy against many subjects, for "who can see this?" — is a distinct
access pattern that the current shape does not serve well, since the subject
comes from the environment rather than a parameter.

### Mutation testing

Coverage says lines executed; it does not say assertions meaningful. Stryker at
≥80% on `packages/core` would test the tests. The predecessor set this bar, and
matching it is reasonable.

## Under consideration

These have real arguments on both sides and are not yet decided.

### Policy simplification

Rewriting a policy tree to an equivalent smaller one — collapsing nested
`allOf`, eliminating double negation. Cheap to implement, but it makes the trace
diverge from the policy the author wrote, which undermines explanation. Probably
only worth it as an explicit, opt-in transform.

### Caching decisions

Memoizing per subject and policy within a request. Tempting for policies
evaluated repeatedly while rendering a list. The hazard is staleness: an
attribute that changes mid-request would be read once and reused, which is a
correctness change dressed as an optimisation. Would need a clearly scoped
lifetime.

### Non-Effect entry point

A Promise-returning facade for consumers not using Effect. It would widen
adoption considerably, and it would reintroduce exactly the dual-path shape
that produced the predecessor's dead `checkAsync` API
([ADR-QD-004](./decisions/004-single-effect-evaluator.md)). If it happens it
should be a thin, separately-packaged wrapper over `ManagedRuntime`, never a
second evaluator.

## Explicitly not planned

| Item | Why |
| ---- | --- |
| GxP / 21 CFR Part 11 support | [ADR-QD-016](./decisions/016-gxp-out-of-scope.md) — the predecessor shipped unassembled compliance primitives and qualification evidence asserting untested properties |
| Policy storage or administration UI | Out of scope; Qadi decides, it does not persist or administer |
| Authentication | Out of scope; the caller supplies an authenticated subject |
| Backward compatibility with the predecessor's JSON | Discriminant changed from `kind` to `_tag` ([ADR-QD-003](./decisions/003-tag-discriminant.md)); a migration script is cheaper than a permanent compatibility layer |

---

_Related: [Overview](./overview.md) · [User Requirements](./urs.md) · [Definitions of Done](./process/definitions-of-done.md)_
