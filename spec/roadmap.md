# Roadmap

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | GUARD-RMP                                      |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Guard Engineering                              |
> | Classification | Planning                                       |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-EG-002) |

---

## Current state

Version `0.0.0`, unpublished. The core is complete and verified: nine policy
variants, eleven matchers, the evaluator, enforcement, serialization, React
integration and a test toolkit.

| Gate | Status |
| ---- | ------ |
| `tsc -b` (sources and tests) | passing |
| `oxlint` + house-style checks | passing |
| Unit and property tests | 137 passing |
| Acceptance scenarios | 27 scenarios, 111 steps passing |
| Coverage | 99.2% statements, 95.5% branches — thresholds enforced |
| Doc examples compile | 5 blocks |
| Specification integrity | 8 checks passing |

Nothing below is required for the library to be correct. These are gaps in
confidence, ergonomics or reach.

## Blocking first release

### Decide the package scope

`@guard/*` is a placeholder. It is unclaimed on npm and almost certainly wrong.
The `EG` specification infix has the same status.

Both are now embedded in roughly thirty documents and every package manifest.
Renaming is a mechanical sweep today and gets more expensive with each addition,
so it should happen before anything else.

### Verify span emission

`URS-EG-012` — decisions appear in tracing — is satisfied by inspection only.
`evaluate` annotates a `guard.evaluate` span, but no test asserts that the span
is emitted or that its attributes are what the specification claims.

This is the one requirement in the URS with no verification behind it, which
makes it exactly the kind of claim this project exists not to make. A test using
a span collector layer would close it.

### Extend short-circuit coverage to relationships

`URS-EG-010` is proved for attribute resolution by counting resolver calls.
There is no equivalent proof that an unevaluated branch performs no
*relationship* lookup. `edgeRelationshipResolver` already records its calls, so
the test is a small addition — the gap is coverage, not capability.

## Planned

### Concurrent evaluation

An opt-in `EvaluateOptions.concurrency` allowing sibling policies to evaluate in
parallel, for callers who would rather pay for speculative lookups than latency.

Deliberately unbuilt rather than merely unfinished. Parallel evaluation
interacts with both short-circuiting (which it forfeits) and field-set merging
(where the order of allowing children currently determines the `First` result).
Those interactions need designing, not bolting on.

Two ADRs previously stated this option *existed*. They have been corrected —
see [ADR-EG-005](./decisions/005-lazy-attribute-resolution.md) and
[ADR-EG-013](./decisions/013-short-circuit-default.md).

### Policy explanation

A human-readable rendering of a policy — "requires role `editor` **and**
permission `doc:write`" — for administrative interfaces and review.

The trace already answers "why was this denied". This answers "what does this
rule say", which is a different question and the one a security reviewer asks.

### Batch subject evaluation

`Guard.filter` evaluates one policy against many resources. The transpose —
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
([ADR-EG-004](./decisions/004-single-effect-evaluator.md)). If it happens it
should be a thin, separately-packaged wrapper over `ManagedRuntime`, never a
second evaluator.

## Explicitly not planned

| Item | Why |
| ---- | --- |
| GxP / 21 CFR Part 11 support | [ADR-EG-016](./decisions/016-gxp-out-of-scope.md) — the predecessor shipped unassembled compliance primitives and qualification evidence asserting untested properties |
| Policy storage or administration UI | Out of scope; Guard decides, it does not persist or administer |
| Authentication | Out of scope; the caller supplies an authenticated subject |
| Backward compatibility with the predecessor's JSON | Discriminant changed from `kind` to `_tag` ([ADR-EG-003](./decisions/003-tag-discriminant.md)); a migration script is cheaper than a permanent compatibility layer |

---

_Related: [Overview](./overview.md) · [User Requirements](./urs.md) · [Definitions of Done](./process/definitions-of-done.md)_
