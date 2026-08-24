# Roadmap

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-RMP                                       |
> | Revision       | 1.25                                           |
> | Effective Date | 2026-08-22                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning                                       |
> | Change History | 1.25 (2026-08-22): Two new merge gates (`madge`, `tstyche`) and changesets adopted; gate table updated (ADR-QD-037, ADR-QD-038, CCR-QD-051)<br>1.24 (2026-08-22): The witness/`guard` primitive and `@qadi/http` shipped; gate figures refreshed (ADR-QD-035, ADR-QD-036, CCR-QD-047)<br>1.23 (2026-07-26): The Promise facade shipped; Under consideration is now empty (ADR-QD-032, CCR-QD-033)<br>1.22 (2026-07-26): Decision caching shipped (ADR-QD-031, CCR-QD-032)<br>1.21 (2026-07-26): Policy simplification shipped (ADR-QD-030, CCR-QD-031)<br>1.20 (2026-07-26): `join` and `meet` shipped; MLS to Shipped (ADR-QD-029, CCR-QD-030)<br>1.19 (2026-07-26): Planned section empty — every committed item shipped; the evaluator's mutation score closed at 81.25% (CCR-QD-029)<br>1.18 (2026-07-26): Server-side rendering shipped (ADR-QD-028, CCR-QD-029)<br>1.17 (2026-07-26): Policy explanation shipped (ADR-QD-027, CCR-QD-028)<br>1.16 (2026-07-26): Concurrent evaluation shipped (ADR-QD-026, CCR-QD-027)<br>1.15 (2026-07-26): Mutation testing shipped as a merge gate (ADR-QD-025); the evaluator's 77.85% score added as a Planned item (CCR-QD-026)<br>1.14 (2026-07-26): Gate counts updated for MLS and the order laws (CCR-QD-024)<br>1.13 (2026-07-26): Gate counts corrected — they had not moved since before CCR-QD-021, so two verified models went unrecorded (CCR-QD-023)<br>1.12 (2026-07-26): E7 — predicate output — shipped; phase 5 complete, every enabler shipped (CCR-QD-020)<br>1.11 (2026-07-26): E3 — combining algorithms — shipped; concurrent evaluation unblocked (CCR-QD-019)<br>1.10 (2026-07-26): E6 — subject sets — shipped; phase 4 complete (CCR-QD-018)<br>1.9 (2026-07-26): E4 — the label lattice — shipped (CCR-QD-017)<br>1.8 (2026-07-26): E5 — the decision-history port — shipped (CCR-QD-016)<br>1.7 (2026-07-26): E2 — obligations — shipped (CCR-QD-015)<br>1.6 (2026-07-26): Reactivity canary; no blocking items remain (CCR-QD-013)<br>1.5 (2026-07-26): E1 — the action dimension — shipped (CCR-QD-012)<br>1.4 (2026-07-26): Span emission verified; every URS gap closed (CCR-QD-010)<br>1.3 (2026-07-26): Relationship short-circuit coverage closed (CCR-QD-009)<br>1.2 (2026-07-26): Package scope resolved; renamed to Qadi (CCR-QD-005)<br>1.1 (2026-07-26): React rebuilt on atoms (CCR-QD-003)<br>1.0 (2026-07-25): Initial release (CCR-QD-002) |

---

## Current state

Version `0.0.0`, unpublished, under the `@qadi` scope with the `QD`
specification infix. The core is complete and verified: fourteen policy variants,
twelve matchers, five value references, obligations, a decision-history port, a
label lattice, ordered rule tables, the evaluator, enforcement, subject-set
review, predicate output, serialization, React integration, a Promise facade,
HTTP framework bindings and a test toolkit — six packages.

| Gate | Status |
| ---- | ------ |
| `tsc -b` (sources and tests) | passing |
| `oxlint` + house-style checks | passing |
| Circular imports (`madge`) | none found, across every package's `src/` |
| Type-level tests (`tstyche`) | 13 assertions passing |
| Unit and property tests | 1589 passing |
| Acceptance scenarios | 220 scenarios, 1002 steps passing |
| Coverage | 99.29% statements, 96.16% branches, 99.59% functions, 99.53% lines — thresholds enforced |
| Doc examples compile | 73 blocks |
| Specification integrity | 15 checks passing |
| Mutation score | 96.65% on `packages/core` and 100.00% on the `@qadi/devtools` model, break threshold 80 — enforced |

This table groups the **fourteen** numbered steps of
[the merge gate](./process/definitions-of-done.md#merge-gate) into families and
is not a row-for-row image of it. `scripts/check-dod-table.mjs` checks that
table against `pnpm check`; this one carries measured numbers and is maintained
by hand, so it is the one to distrust first.

Every requirement in the [URS](./urs.md) now has a test behind it; §7 there
records both gaps that writing it surfaced, and both are closed.

**A framework-independent authorization witness shipped in `@qadi/core`, and
a new `@qadi/http` package bound it to both of Effect v4's HTTP surfaces**
([ADR-QD-035](./decisions/035-witness-guard-primitive.md),
[ADR-QD-036](./decisions/036-qadi-http-package-shape.md)). `guard` produces
`Authorized<P>` — a branded value proving a specific `Policy` check succeeded
against a specific resource — so a handler typed to require one cannot be
called without going through enforcement first, the same guarantee `enforce`
gives an `Effect` extended to a value a type signature can demand. `@qadi/http`
wraps it twice: `RequirePermission` for `effect/unstable/httpapi`'s
declarative `HttpApi`, `guardRoute`/`addGuardedRoute` for bare
`effect/unstable/http`'s `HttpRouter` — both thin adapters over the same
`guard`, and a `PermissionRegistry` answering "which permission does which
endpoint require" across a mix of both surfaces at a single `/__permissions`
route.

The one part of the design that did not survive contact with the compiler
was `requiresPermission`'s original shape — a `.pipe()`-composable
combinator, `endpoint.pipe(requiresPermission({ permission, policy }))`.
Reviewing it in isolation looked sound; the first real end-to-end HTTP test
found it made every endpoint it touched **unimplementable** through
`HttpApiBuilder.group`'s own type-checked handler builder, because
`HttpApiEndpoint` has no self-referential type member letting a reusable
wrapper function preserve an endpoint's literal identity. The shipped shape
gives up the one-step `.pipe()` composition — a real, recorded ergonomic
cost — for a form that is both type-sound and actually usable: the
permission requirement's *check* is reusable, but the type-preserving
`.annotate()` call itself has to be written inline at each endpoint's
definition, the one place TypeScript recovers the literal type. Two further
type-only bugs — `HttpApiEndpoint.Top`/`HttpApi.Top` not being supertypes of
a plain endpoint or API, and a `CurrentSubject` requirement `GuardRoute.ts`
declared its handler still needed after it was actually discharged — surfaced
the same way, and are recorded in ADR-QD-036 revision 1.2 rather than folded
in as if the design had been right from the start.

**A Promise facade shipped as its own package**
([ADR-QD-032](./decisions/032-promise-facade.md)): `@qadi/promise` is one file in
which every method is `runPromise` applied to a `@qadi/core` function, and no branch
decides anything. That is what makes "never a second evaluator" checkable by reading
rather than by trusting — the entry named the predecessor's `checkAsync` as the danger,
and a facade that only forwards cannot repeat it.

The boundary's one real design question is that a **denial resolves and a failure
rejects**. `try { check() } catch { return false }` is the natural Promise idiom and
it turns an attribute-store outage into a silent lockout, so the distinction
INV-QD-006 keeps inside the library is asserted again at the edge.

**Decision caching shipped, opt-in and caller-scoped**
([ADR-QD-031](./decisions/031-decision-cache.md)). The objection recorded here — that
staleness is "a correctness change dressed as an optimisation" — split cleanly in two
once it was built. The **key** prevents the security failure: `subjectId + policy +
resource + action`, because a cache keyed on the policy alone serves one subject's
allow to another. The **lifetime** governs staleness, and only the caller can choose
it, so `decisionCacheLayer()` is a function returning a fresh cache rather than a
constant.

Two things worth keeping. It caches the **`Trace`**, not the `Decision`: caching the
decision whole would hand two evaluations one `evaluationId`, so two log lines would
claim to be one event and correlation would stop working. And `Effect.provide` builds a
layer per *execution*, so piping the cache onto a single `evaluate` caches nothing
while reading exactly like code that does — a silently-ineffective cache is worse than
none, so that trap has a test rather than a note.

**Policy simplification shipped, and the roadmap's own objection was the right
one** ([ADR-QD-030](./decisions/030-policy-simplification.md)). `simplify` collapses
single-child composites and flattens same-strategy nesting; it is opt-in, and nothing
in the library calls it, because a shallower tree means a shallower trace and the
trace is what a reviewer reads.

Two conditions were not obvious and both are disclosure hazards rather than
verdict ones. Flattening is sound **only when the field strategies match** — an
`Intersection` parent absorbing a `Union` child reaches the same verdict and exposes a
different field set. And **double-negation elimination is unsound here**: `Not` carries
`visibleFields: undefined` and no obligations by design, so `not(not(p))` allows with
*every* field and owes *nothing* where `p` allows with its own fields and owes its own
duties. That rewrite was written, and the property test rejected it.

**`join` and `meet` shipped**
([ADR-QD-029](./decisions/029-lattice-join-and-meet.md)), reversing ADR-QD-021's
decline on MOD-QD-029's own unanswered argument. MLS is now **Shipped** and the
specification's oldest contradiction is closed — the model defines a lattice as "a
partial order with joins" and E4 had shipped only the order.

**Server-side rendering shipped**
([ADR-QD-028](./decisions/028-decision-hydration.md)): `dehydrateDecisions` on the
server and `hydrateDecisions` on the client seed `QadiProvider`'s `initialValues`,
so the first client render already has the answers and no guarded control flashes.

The roadmap entry described this as a hydration story and it turned out to be a
**security** story. A payload is authorization state crossing a network, and it is
the only place in the library where a decision enters without being evaluated by it
— so nothing else would catch a page cached across users seeding one person's
allows into another's session. The payload is bound to a subject id and refuses as a
whole on a mismatch; it withholds the trace by default, because a trace names the
policy's internal structure and which branch this subject failed. Both refusals
**drop** rather than throw, degrading exactly to the pre-hydration behaviour.

One thing the entry did not anticipate: this works only because `Atom.family` keys
**structurally**. A policy re-parsed on the client is a different object and equal,
so it maps to the same atom — which is why the payload can identify policies by
their serialized form rather than by caller-supplied keys nothing could verify. The
keying that BEH-QD-071 corrected as an incidental detail is what makes the feature
expressible.

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
([ADR-QD-025](./decisions/025-mutation-testing.md)): `stryker run` is step 15 of
`pnpm check` and fails below 80%. It replaces five hand-run passes whose results
were quoted into ADRs as prose — evidence nobody but its author could reproduce,
which is the predecessor's failure mode in miniature. The first enforced run also
measured where the suite is weakest, and the answer was uncomfortable:
`Evaluate.ts` scored **77.85%**, below the threshold and the one file where a
surviving mutant is most likely to be an authorization defect.

*It now scores 81.25%*, and not because anyone set out to fix it — the property
test written for concurrent evaluation kills evaluator mutants that nothing else
reached. Every file is above the threshold and the aggregate sits just under 90%.

**The survivors have now been read** (CCR-QD-037). 157 of them, and the question was
worth asking once: **62 are `StringLiteral`** — the wording of a `reason`, where a
survivor is the correct answer, since no security property depends on a sentence.
52 affect logic, and of those exactly **one was a real gap**: `fieldMatch` guarded a
non-object with `isObject(value) && …`, and every existing test used a non-object
whose property was `undefined`, so `&&` and `||` agreed by accident. A string has a
real `length`, so they disagree — `fieldMatch("length", gte(3))` on `"hello"` would
have read the property off a primitive. Now tested.

Two mutants that looked alarming were **reproduction errors of mine**: the JSON report
gives the replacement text but not which subexpression it replaced, so a hand-applied
"same" mutant can be a different one. A hypothesis that `coverageAnalysis: "perTest"`
was under-attributing tests was checked against `"all"` and **disproved** — 157 either
way.

The remaining ~156 are message strings, defensive arms and equivalent mutants. That is
a reading, not a proof, and re-reading them is cheap now that the JSON reporter is
enabled.

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

**Nothing.** Every item this roadmap committed to has shipped.

## Under consideration

**Nothing.** All three items that stood here — policy simplification, decision
caching and a non-Effect entry point — were built in CCR-QD-031 to CCR-QD-033, and in
every case the *objection recorded here* turned out to be the design brief rather than
a reason to stay away. That is the pattern worth keeping if this section fills again:
an item is ready when its objection is sharp enough to build against.

The section is retained rather than deleted, because "undecided" is a real state and
having nowhere to record it is how undecided things become accidentally decided.

**Policy simplification** left this section in CCR-QD-031: its objection — that rewriting the
tree makes the trace diverge from the policy the author wrote — turned out to be
exactly right, and naming it was what produced the design (opt-in, and nothing calls
it). An item can leave here by being built *because of* its objection rather than in
spite of it.

## Explicitly not planned

| Item | Why |
| ---- | --- |
| GxP / 21 CFR Part 11 support | [ADR-QD-016](./decisions/016-gxp-out-of-scope.md) — the predecessor shipped unassembled compliance primitives and qualification evidence asserting untested properties |
| Policy storage or administration UI | Out of scope; Qadi decides, it does not persist or administer |
| Authentication | Out of scope; the caller supplies an authenticated subject |
| Backward compatibility with the predecessor's JSON | Discriminant changed from `kind` to `_tag` ([ADR-QD-003](./decisions/003-tag-discriminant.md)); a migration script is cheaper than a permanent compatibility layer |

---

_Related: [Overview](./overview.md) · [User Requirements](./urs.md) · [Definitions of Done](./process/definitions-of-done.md)_
