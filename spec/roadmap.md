# Roadmap

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-RMP                                       |
> | Revision       | 1.17                                           |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning                                       |
> | Change History | 1.17 (2026-07-26): Policy explanation shipped (ADR-QD-027, CCR-QD-028)<br>1.16 (2026-07-26): Concurrent evaluation shipped (ADR-QD-026, CCR-QD-027)<br>1.15 (2026-07-26): Mutation testing shipped as a merge gate (ADR-QD-025); the evaluator's 77.85% score added as a Planned item (CCR-QD-026)<br>1.14 (2026-07-26): Gate counts updated for MLS and the order laws (CCR-QD-024)<br>1.13 (2026-07-26): Gate counts corrected — they had not moved since before CCR-QD-021, so two verified models went unrecorded (CCR-QD-023)<br>1.12 (2026-07-26): E7 — predicate output — shipped; phase 5 complete, every enabler shipped (CCR-QD-020)<br>1.11 (2026-07-26): E3 — combining algorithms — shipped; concurrent evaluation unblocked (CCR-QD-019)<br>1.10 (2026-07-26): E6 — subject sets — shipped; phase 4 complete (CCR-QD-018)<br>1.9 (2026-07-26): E4 — the label lattice — shipped (CCR-QD-017)<br>1.8 (2026-07-26): E5 — the decision-history port — shipped (CCR-QD-016)<br>1.7 (2026-07-26): E2 — obligations — shipped (CCR-QD-015)<br>1.6 (2026-07-26): Reactivity canary; no blocking items remain (CCR-QD-013)<br>1.5 (2026-07-26): E1 — the action dimension — shipped (CCR-QD-012)<br>1.4 (2026-07-26): Span emission verified; every URS gap closed (CCR-QD-010)<br>1.3 (2026-07-26): Relationship short-circuit coverage closed (CCR-QD-009)<br>1.2 (2026-07-26): Package scope resolved; renamed to Qadi (CCR-QD-005)<br>1.1 (2026-07-26): React rebuilt on atoms (CCR-QD-003)<br>1.0 (2026-07-25): Initial release (CCR-QD-002) |

---

## Current state

Version `0.0.0`, unpublished, under the `@qadi` scope with the `QD`
specification infix. The core is complete and verified: fourteen policy variants,
twelve matchers, five value references, obligations, a decision-history port, a
label lattice, ordered rule tables, the evaluator, enforcement, subject-set
review, predicate output, serialization, React integration and a test toolkit.

| Gate | Status |
| ---- | ------ |
| `tsc -b` (sources and tests) | passing |
| `oxlint` + house-style checks | passing |
| Unit and property tests | 403 passing |
| Acceptance scenarios | 147 scenarios, 723 steps passing |
| Coverage | 99.89% statements, 98.21% branches, 100% lines — thresholds enforced |
| Doc examples compile | 68 blocks |
| Specification integrity | 13 checks passing |
| Mutation score | 90.03% on `packages/core`, break threshold 80 — enforced |

Every requirement in the [URS](./urs.md) now has a test behind it; §7 there
records both gaps that writing it surfaced, and both are closed.

**Policy explanation shipped**
([ADR-QD-027](./decisions/027-policy-explanation.md)): `explain` describes a
policy without evaluating it, and `renderExplanation` turns the result into
English. The roadmap entry asked for a string; it got a **tree**, for the reason
E7 established — Qadi owns no dialect, and an administrative interface renders a
role as a link rather than as prose Qadi chose.

The entry was written before that argument existed, which is why it described the
output rather than deciding the type. Two things it did not anticipate: an
explanation must state **restrictions** as well as requirements, since describing
`hasPermission(read, { fields: ["id"] })` as "requires permission doc:read"
overstates the grant; and it takes **no subject**, which is not an optimisation but
the whole distinction from a trace — an explanation that varied by viewer would leak
whether they satisfy a policy they are only meant to read.

**Concurrent evaluation shipped**
([ADR-QD-026](./decisions/026-concurrent-evaluation.md)):
`EvaluateOptions.concurrency` evaluates the children of `allOf`, `anyOf` and
`rules` in parallel, and **changes nothing else**. The decision and the whole
trace are identical either way, because both paths drive the same fold over
children in declaration order — the concurrent one discards the trace of any child
it evaluated after the decisive one, since keeping it would make `Trace.children`
depend on a performance switch. INV-QD-005 is **scoped** rather than repealed: it
holds under the default, and forfeiting it requires asking.

Two things the long-standing entry for this item got right and one it did not. The
field-set interaction and the deciding-rule-by-index constraint were both real and
both had to be designed for. But the entry framed the work as *resolving* those
interactions, when the answer was to make them unreachable: share the fold, and a
schedule cannot reach a decision rule at all.

**Mutation testing is a gate rather than an aspiration**
([ADR-QD-025](./decisions/025-mutation-testing.md)): `stryker run` is step 9 of
`pnpm check` and fails below 80%. It replaces five hand-run passes whose results
were quoted into ADRs as prose — evidence nobody but its author could reproduce,
which is the predecessor's failure mode in miniature. The first enforced run also
measured where the suite is weakest, and the answer is uncomfortable:
**`Evaluate.ts` scores 77.85%**, the lowest of any file that matters and the one
where a surviving mutant is most likely to be an authorization defect. Recorded in
the ADR and listed below rather than quietly fixed.

**Phase 4 of the [model adoption matrix](./models/00-adoption-matrix.md) is
complete**: all five additive enablers have shipped, each with an ADR settled
before its code. **E1, the action dimension**
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
under a negative policy. **E4, the label lattice**
([ADR-QD-021](./decisions/021-label-lattice.md)): a policy can compare a
clearance against a classification, compartments included, so Bell–LaPadula,
Biba and MLS are one policy each rather than `n × 2^c` transcribed rungs.
**E6, subject-set evaluation** ([ADR-QD-022](./decisions/022-subject-set-evaluation.md)):
one policy across many subjects, answering "who can reach this?" — and answerable
by nobody, since the subject travels as a parameter and the ambient one is
replaced rather than read.

**Phase 5 of the matrix is also complete**, which means **every enabler in the
[model adoption matrix](./models/00-adoption-matrix.md) has shipped**.
**E3, combining algorithms**
([ADR-QD-023](./decisions/023-combining-algorithms.md)): a policy can be an
ordered rule table whose rows carry an effect of their own, so "and if this
matches, refuse" is a row rather than a negated guard clause hoisted ahead of
every permit. The phase was framed as "both change what an existing construct
means", and for E3 that was wrong — the honest fix was a new variant, and
`AllOf`, `AnyOf` and every serialized policy kept the meaning they had. It is
breaking for a different reason: a decoder predating `Rules` rejects a policy
containing one. **E7, predicate output**
([ADR-QD-024](./decisions/024-predicate-output.md)): a policy compiles into a
filter the database applies while the query runs, so a multi-tenant table is
narrowed by an index rather than read and discarded. E7 is the one enabler the
phase framing did fit — a second interpreter over the same tree — and it shipped
with `evaluatePredicate`, the reference semantics, because the agreement between
two interpreters has to be *runnable* rather than argued for.

Nothing from the matrix remains. What follows is the same list it always was:
gaps in confidence, ergonomics or reach, none of which the library needs to be
correct.

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

### Raise the evaluator's mutation score above 80%

`Evaluate.ts` scores **77.85%** — 65 surviving mutants, 3 timeouts — against a
global 89.22% and a threshold of 80. It is the largest file in the package and the
one where a survivor is most likely to be a real authorization defect rather than a
cosmetic one, so the aggregate passing is not much comfort.

Deliberately a separate item rather than a fix folded into
[ADR-QD-025](./decisions/025-mutation-testing.md). Killing 65 mutants is not a
tidying pass: each one is a question about what the suite actually pins, and the
useful outcome is the questions rather than the number. `Predicate.ts` (87.54%, 39
survivors) is the same work at a smaller scale, and `Errors.ts` at 61.54% is mostly
message strings, where a survivor may be the correct answer.

Raising the threshold itself is a decision to take **after** this, not before.

### Server-side rendering

`QadiProvider` accepts `initialValues`, which is the hook a hydration story
would use, but nothing yet encodes decisions on the server and seeds them on the
client. Until it does, a server-rendered page shows its pending state and
re-decides after mount.

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
