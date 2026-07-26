# Roadmap

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-RMP                                       |
> | Revision       | 1.8                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning                                       |
> | Change History | 1.8 (2026-07-26): E5 — the decision-history port — shipped (CCR-QD-016)<br>1.7 (2026-07-26): E2 — obligations — shipped (CCR-QD-015)<br>1.6 (2026-07-26): Reactivity canary; no blocking items remain (CCR-QD-013)<br>1.5 (2026-07-26): E1 — the action dimension — shipped (CCR-QD-012)<br>1.4 (2026-07-26): Span emission verified; every URS gap closed (CCR-QD-010)<br>1.3 (2026-07-26): Relationship short-circuit coverage closed (CCR-QD-009)<br>1.2 (2026-07-26): Package scope resolved; renamed to Qadi (CCR-QD-005)<br>1.1 (2026-07-26): React rebuilt on atoms (CCR-QD-003)<br>1.0 (2026-07-25): Initial release (CCR-QD-002) |

---

## Current state

Version `0.0.0`, unpublished, under the `@qadi` scope with the `QD`
specification infix. The core is complete and verified: thirteen policy variants,
eleven matchers, five value references, obligations, a decision-history port, the
evaluator, enforcement, serialization, React integration and a test toolkit.

| Gate | Status |
| ---- | ------ |
| `tsc -b` (sources and tests) | passing |
| `oxlint` + house-style checks | passing |
| Unit and property tests | 253 passing |
| Acceptance scenarios | 54 scenarios, 236 steps passing |
| Coverage | 99.6% statements, 96.8% branches — thresholds enforced |
| Doc examples compile | 58 blocks |
| Specification integrity | 13 checks passing |

Every requirement in the [URS](./urs.md) now has a test behind it; §7 there
records both gaps that writing it surfaced, and both are closed.

Three enablers from the [model adoption matrix](./models/00-adoption-matrix.md)
have shipped. **E1, the action dimension**
([ADR-QD-018](./decisions/018-action-dimension.md)): a policy can say what the
caller is doing, which is what read-down/write-up rules need and what eight
documented models were waiting on. **E2, obligations**
([ADR-QD-019](./decisions/019-obligations.md)): a policy can say "allow,
provided the access is logged", and enforcement refuses to proceed on a duty
nobody has discharged. **E5, the decision-history port**
([ADR-QD-020](./decisions/020-decision-history-port.md)): a policy can say
"approve, unless you raised it", reading the record from the caller's own store.
E5 carried the matrix's one genuine safety trap, and settling it changed the
design — the port is three-valued, because no boolean default can fail closed
under a negative policy.

Nothing below is required for the library to be correct. These are gaps in
confidence, ergonomics or reach.

## Blocking first release

Nothing. The last item — a canary over `effect/unstable/reactivity` — closed in
CCR-QD-013.

`@qadi/react` is still built on a module that is unstable by name
([ADR-QD-014](./decisions/014-react-via-atoms.md)), and its API may still move
before Effect 4.0. What changed is that the exposure is now pinned:
`packages/react/test/v4-reactivity-smoke.test.ts` exercises every reactivity API
`QadiAtoms.ts` and `QadiProvider.tsx` call, so a beta bump fails in one place
rather than diffusely across the React suite.

Writing it immediately earned its keep. `Atom.family` keys **structurally**, not
by reference — the opposite of what this package, its behaviour document, its
integration guide and `AGENTS.md` had all stated since the React rebuild. The
practical advice was unaffected, which is why the wrong reason survived three
revisions; see [BEH-QD-071](./behaviors/09-react.md).

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
