# Runtime Invariants

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-INV                                       |
> | Revision       | 1.16                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.16 (2026-07-26): INV-QD-027, the published package (CCR-QD-038)<br>1.15 (2026-07-26): INV-QD-026, the Promise facade (CCR-QD-033)<br>1.14 (2026-07-26): INV-QD-025, the decision cache (CCR-QD-032)<br>1.13 (2026-07-26): INV-QD-024, simplification (CCR-QD-031)<br>1.12 (2026-07-26): INV-QD-023, the lattice bounds (CCR-QD-030)<br>1.11 (2026-07-26): INV-QD-022, hydration is subject-bound (CCR-QD-029)<br>1.10 (2026-07-26): INV-QD-021, explanation totality (CCR-QD-028)<br>1.9 (2026-07-26): INV-QD-020, concurrency; INV-QD-005 scoped to sequential evaluation (CCR-QD-027)<br>1.8 (2026-07-26): INV-QD-019, the order laws (CCR-QD-024)<br>1.7 (2026-07-26): INV-QD-018, predicate agreement (CCR-QD-020)<br>1.6 (2026-07-26): INV-QD-017, rule tables; INV-QD-005 defers to it (CCR-QD-019)<br>1.5 (2026-07-26): INV-QD-016, subject sets (CCR-QD-018)<br>1.4 (2026-07-26): INV-QD-015, label dominance (CCR-QD-017)<br>1.3 (2026-07-26): INV-QD-014, the history port; INV-QD-008 restated as "given the same history" (CCR-QD-016)<br>1.2 (2026-07-26): INV-QD-012 and INV-QD-013, obligations (CCR-QD-015)<br>1.1 (2026-07-26): INV-QD-011, the action dimension (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

Properties that hold for every execution. Each names the mechanism that enforces
it, because an invariant nobody enforces is a wish.

## INV-QD-001: Permission key uniqueness

Two distinct permissions never produce the same runtime lookup key.

**Source**: `packages/core/src/Permission.ts` — `PermissionSchema` constrains
both segments with `/^[^:]+$/`, which rejects empty segments and any segment
containing the reserved separator.

**Implication**: `{resource: "a:b", action: "c"}` cannot be decoded, so it can
never collide with `{resource: "a", action: "b:c"}`. In the predecessor both
formatted to `"a:b:c"` and each silently granted the other.

**Related**: [BEH-QD-002](behaviors/01-permissions.md), [ADR-QD-007](decisions/007-permission-token-representation.md).

---

## INV-QD-002: Role graph acyclicity

The role inheritance graph reachable from any `Role` value is acyclic.

**Source**: `packages/core/src/Role.ts` — `role()` takes parents **by value**, so
a cycle is unconstructible: a role cannot reference one that does not yet exist.
`resolveRoleGraph` is the only entry point where parents are named rather than
referenced, and it detects cycles explicitly.

**Implication**: `flattenPermissions` needs no cycle check and cannot diverge. A
visited set is still required, but only to keep a diamond linear rather than
exponential.

**Related**: [BEH-QD-009](behaviors/02-roles.md), [ADR-QD-015](decisions/015-role-dag-acyclic-by-construction.md).

---

## INV-QD-003: Codec/type identity

The JSON codec and the TypeScript type of a policy cannot disagree.

**Source**: `packages/core/src/Policy.ts` — both are derived from one
`Schema.Union`; `type Policy = typeof Policy.Type` and
`Schema.fromJsonString(Policy)`.

**Implication**: `fromJson(toJson(p))` is structurally equal to `p` for every
policy. The predecessor maintained three artefacts by hand and they drifted,
silently dropping `fieldStrategy` on encode.

**Enforcement**: a property test over generated policy trees, a unit test
pinning the original defect, and Gherkin scenario `@REQ-QD-008`.

**Related**: [BEH-QD-017](behaviors/03-policy-adt.md), [BEH-QD-058](behaviors/08-serialization.md), [ADR-QD-002](decisions/002-schema-derived-policy-adt.md).

---

## INV-QD-004: Field visibility is a lattice with `undefined` at the top

An absent field set means *all fields*, never *no fields*.

**Source**: `packages/core/src/Decision.ts` — `intersectFields` returns the other
operand when either is `undefined`; `unionFields` returns `undefined` when either
is, since a branch granting everything makes the union everything.

**Implication**: intersecting an unrestricted policy with a restricted one yields
the restriction, and a denial projects to `{}`. Treating `undefined` as the empty
set would invert the meaning of every unrestricted policy.

**Related**: [BEH-QD-018](behaviors/03-policy-adt.md), [BEH-QD-051](behaviors/07-enforcement.md), [ADR-QD-006](decisions/006-field-strategy-always-encoded.md).

---

## INV-QD-005: Short-circuit preservation

A policy branch that is not evaluated performs no attribute or relationship
lookup.

**Scoped, not universal, since CCR-QD-027**: this holds under the default
sequential evaluation. `EvaluateOptions.concurrency` forfeits it deliberately and
by explicit request — see
[INV-QD-020](#inv-qd-020-concurrency-changes-lookups-never-decisions), which
carries the property that makes forfeiting it safe. The invariant is *scoped*
rather than repealed because a caller who does not ask for concurrency is
unaffected by its existence, and that is the whole safety argument
([ADR-QD-026](decisions/026-concurrent-evaluation.md)).

**Source**: `packages/core/src/Evaluate.ts` — resolution happens inside the leaf
evaluator, reached only when that leaf is visited. `AllOf` returns at its first
denial and `AnyOf` at its first allow, except under `Union`, which must observe
every child to merge field sets.

**Implication**: `anyOf(cheapRbacCheck, expensiveAttributeCheck)` costs one set
lookup when the first branch allows. The predecessor resolved the entire tree
before evaluating anything.

**`Rules` is governed by
[INV-QD-017](#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden)
instead**, and is not an exception to this one. Where stopping is a property of a
boolean operator here, a rule list stops according to its combining algorithm,
and two of the three cannot stop in the direction that is cheap everywhere else.
Enumerating a third node in this invariant would have made it true only by
listing; the property belongs to the algorithm.

**Enforcement**: tests count resolver invocations rather than measuring time.

**Related**: [BEH-QD-034](behaviors/05-evaluator.md), [BEH-QD-035](behaviors/05-evaluator.md), [ADR-QD-005](decisions/005-lazy-attribute-resolution.md).

---

## INV-QD-006: Failure is not denial

A broken lookup never presents as "not authorized".

**Source**: `packages/core/src/Evaluate.ts` — resolver failures propagate through
the Effect error channel. `Effect.orDie` is prohibited on evaluation paths, so a
denial and a fault remain distinguishable at every layer, including React's
`PolicyState.error`.

**Implication**: an attribute-store outage surfaces as an incident rather than
sending an engineer to audit permissions.

**Related**: [BEH-QD-036](behaviors/05-evaluator.md), [BEH-QD-066](behaviors/09-react.md).

---

## INV-QD-007: Defaults fail closed

Every default layer denies rather than grants.

**Source**: `RelationshipResolverNever` returns `"Unknown"`, which matches
neither branch; `CurrentSubjectAnonymous` holds no roles or permissions;
`AttributeResolverNone` resolves to `undefined`, which satisfies no matcher.

**Implication**: forgetting to wire a resolver produces denials, which surface
immediately in testing. A default that granted would turn an omission into a
silent breach.

**Related**: [BEH-QD-043](behaviors/06-services.md), [ADR-QD-010](decisions/010-context-service-and-layers.md).

---

## INV-QD-008: Evaluation is reproducible given the same history

Given the same subject, policy, services **and history**, an evaluation produces
the same decision, identifier and duration.

**Source**: durations come from Effect's `Clock`, identifiers from the
`EvaluationId` service. `scripts/check-house-style.mjs` fails the build on
ambient `Date.now()`, `performance.now()` or `crypto.randomUUID()` anywhere
except `EvaluationId.ts`, which is the one recorded exemption.

**The qualifier was added when `DecisionHistory` shipped** and it is a genuine
weakening, recorded rather than absorbed. Before E5 the same inputs produced the
same decision forever; a history port means a second call may legitimately differ
from the first, because the world moved between them. Four model documents
insisted this be restated in the change that landed the port, on the grounds that
left alone it would not become false loudly — it would weaken silently, and
everything citing it would go on citing it.

What is *not* weakened: Qadi still writes nothing. Evaluation reads history and
never records it, so no evaluation changes the answer to the next one. The
non-determinism is entirely the caller's store moving, and under a fixed store —
`decisionHistoryFromEvents`, or the default — reproducibility is exactly what it
was.

**Implication**: traces can be asserted exactly. The predecessor built a trace
feature whose contents no test could predict.

**Related**: [BEH-QD-037](behaviors/05-evaluator.md), [ADR-QD-012](decisions/012-deterministic-time-and-ids.md).

---

## INV-QD-009: Guarded effects do not run when denied

`Qadi.enforce` never starts the effect it wraps unless the policy allows.

**Source**: `packages/core/src/Qadi.ts` — `enforce` is
`Effect.flatMap(assert(policy), () => self)`, so `self` is only constructed into
the chain after the assertion succeeds.

**Implication**: guarding a mutation is safe. Discarding a result after the fact
would not be.

**Related**: [BEH-QD-049](behaviors/07-enforcement.md), [ADR-QD-011](decisions/011-enforce-as-aspect.md).

---

## INV-QD-010: Error codes are injective

No two error tags share a numeric code.

**Source**: `packages/core/src/Errors.ts` — `ERROR_CODES` is declared
`satisfies Record<QadiError["_tag"], ...>`, so an error without a code does not
compile, and every code is visible in one table.

**Implication**: log aggregation keyed on the code cannot conflate unrelated
failures, as the predecessor's duplicated `ACL007` did.

**Enforcement**: a test asserts the code set has no duplicates.

**Related**: [ADR-QD-008](decisions/008-error-taxonomy.md).

---

## INV-QD-011: A policy that reads the action cannot be evaluated without one

Reading the action while none was supplied fails; it never denies.

**Source**: `packages/core/src/Evaluate.ts` — `HasAction` fails with
`MissingAction` when the action is absent, and `HasAttribute` and
`HasResourceAttribute` ask `referencesAction` **before** running their matcher.

The pre-check is what makes this an invariant rather than a hope.
`evaluateMatcher` is total by design (BEH-QD-028): it cannot fail, so an
unguarded `action()` would resolve to `undefined`, satisfy nothing, and return
`false` — a denial indistinguishable from a real one.

**Implication**: forgetting `{ action }` at a call site produces an incident,
not a quiet refusal. This is [INV-QD-006](#inv-qd-006-failure-is-not-denial)
applied to caller input rather than to a resolver, and it is the opposite of
[INV-QD-007](#inv-qd-007-defaults-fail-closed) on purpose: an unwired resolver
denies because the *system* could not answer, whereas a missing action means the
*caller* never asked a complete question.

**Enforcement**: tests assert `MissingAction` for both paths — the leaf, and a
matcher whose `action()` is nested inside another matcher.

**Related**: [BEH-QD-076](behaviors/10-actions.md), [ADR-QD-018](decisions/018-action-dimension.md).

---

## INV-QD-012: Obligations are never narrowed

Combining two allowing branches never yields fewer duties than either required.

**Source**: `packages/core/src/Obligation.ts` — `unionObligations` is the only
combinator, and nothing selects an alternative. `FieldStrategy` governs field
sets and is not consulted here.

This is the mirror image of
[INV-QD-004](#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)
and the asymmetry is deliberate. An absent field set is the *top* of its
lattice, so narrowing discloses less and is safe. An absent obligation set is
the *bottom* of this one, so narrowing lets a caller discharge fewer duties than
an allowing branch demanded — a grant nobody authorised, arrived at by a merge
rule.

**Implication**: there is no strategy to configure. An option whose other
settings are unsafe is not an option.

**Enforcement**: tests assert the union across `AllOf` and `AnyOf`, that a
duplicate collapses and that two duties sharing an `id` do not.

**Related**: [BEH-QD-082](behaviors/11-obligations.md), [ADR-QD-019](decisions/019-obligations.md).

---

## INV-QD-013: Enforcement never proceeds on an undischarged obligation

An entry point that runs work or hands back data refuses an allow whose binding
obligation nobody has met.

**Source**: `packages/core/src/Qadi.ts` — `assert`, `enforce`,
`enforceProjected` and `filter` all route through one internal `permitted`,
which evaluates, refuses a denial, and discharges. None of them can implement
half the rule, because none of them implements it.

`decide` and `check` deliberately do not: they run nothing and hand back
nothing, so there is no protected work an undischarged duty could guard.

**Implication**: forgetting `onObligations` produces a failure rather than a
deployment that believes it holds an audit record and does not. `enforce`
returns the guarded effect's value, not the decision, so without this the
obligation would be computed and thrown away in silence.

**Enforcement**: tests assert the refusal for each enforcing entry point, that
the guarded effect never starts, that a handler runs *before* it, and that a
failing handler stops it.

**Related**: [BEH-QD-085](behaviors/11-obligations.md), [ADR-QD-019](decisions/019-obligations.md).

---

## INV-QD-014: An unwired history port denies both polarities

`hasActed` and `hasNotActed` both deny when no history store is wired.

**Source**: `packages/core/src/DecisionHistory.ts` — the port is three-valued,
and `DecisionHistoryUnknown` answers `"Unknown"`, which satisfies neither.

This is [INV-QD-007](#inv-qd-007-defaults-fail-closed) surviving contact with a
*negative* policy, and a boolean could not have managed it.
`RelationshipResolverNever` fails closed by answering `false` only because
`hasRelationship` has one polarity; a `false`-answering history default would
grant under `hasNotActed`, and a `true`-answering one would grant under
`hasActed`. There is no safe boolean, so there is a third value.

**Implication**: `hasNotActed(e)` is **not** `not(hasActed(e))`. `not` inverts a
decision, so under `"Unknown"` it turns the denial into an allow — from a port
nobody wired. The two are separate `Policy` variants precisely so that the
distinction is held by the schema rather than by a comment.

**Enforcement**: tests assert both polarities deny under the default layer, and
assert directly that `not(hasActed(e))` allows where `hasNotActed(e)` denies.

**Related**: [BEH-QD-090](behaviors/12-history.md), [BEH-QD-091](behaviors/12-history.md), [ADR-QD-020](decisions/020-decision-history-port.md).

---

## INV-QD-015: Incomparable labels deny in both directions

Two labels that neither dominate nor are dominated by each other reach nothing
of the other's.

**Source**: `packages/core/src/SecurityLabel.ts` — `compareLabels` returns
`"Incomparable"` when neither covers the other, and `labelDominates` admits only
`"Equal"` and `"Dominates"`.

**Implication**: `(Secret, {CRYPTO})` and `(Secret, {BIO})` cannot read one
another. This is the property a scalar comparison destroys rather than
approximates: read as numbers both labels are `2`, each reaches the other, and
the answer is *allow* exactly where dominance says *deny*. Shipping that under
the name Bell–LaPadula would be a security defect, not a simplification.

**Why a boolean matcher is nevertheless safe here**, unlike the history port
([INV-QD-014](#inv-qd-014-an-unwired-history-port-denies-both-polarities)): both
directions of the rule are asked by *swapping the operands*, never by negating
the answer, so `Incomparable` collapsing to `false` denies in both. The four
values exist for explanation, not for the decision.

**Enforcement**: tests assert incomparability in both directions at the matcher
level and end to end through a Bell–LaPadula policy, plus a Gherkin scenario
under `@REQ-QD-013`. A mutation that drops the compartment test kills five.

**Related**: [BEH-QD-098](behaviors/13-labels.md), [ADR-QD-021](decisions/021-label-lattice.md).

---

## INV-QD-016: A batch decision is the decision made alone

Evaluating a policy over a set of subjects gives each element exactly the
decision it would have received on its own.

**Source**: `packages/core/src/SubjectSet.ts` — each element is evaluated by
`Effect.provideService(evaluate(…), CurrentSubject, subject)`. Nothing is
memoised across elements and the batch holds no state of its own, so there is no
carrier for one subject's answer to reach the next.

**Implication**: the attribute resolver's `subjectId` parameter becomes
load-bearing here in a way it was not before. With one subject per environment, a
resolver that ignored that argument was merely redundant; over a batch it hands
one subject another's attributes, and the result is a grant nobody wrote. Qadi
cannot enforce a port implementation, but the signature makes a correct one
writable and this invariant says which one is correct.

**A stronger relative of [INV-QD-008](#inv-qd-008-evaluation-is-reproducible-given-the-same-history)**:
reproducibility says the same inputs give the same answer twice; this says
neighbouring evaluations are not inputs to each other.

**Enforcement**: a test evaluates a five-subject batch and compares each element
against the same policy run under `currentSubjectLayer` alone, trace tree
included; another asserts the resolver is asked about the subject in hand. A
mutation evaluating every element as the first subject kills eleven tests, and
dropping the `provideService` does not compile — `SubjectSetServices` excludes
`CurrentSubject`, so the ambient one is unreachable.

**Related**: [BEH-QD-106](behaviors/14-subject-sets.md), [ADR-QD-022](decisions/022-subject-set-evaluation.md).

---

## INV-QD-017: A rule list stops at the first rule that cannot be overridden

Every combining algorithm has a stated stopping condition, and evaluation
performs no work beyond it.

**Source**: `packages/core/src/Evaluate.ts` — `evaluateRules` breaks on the first
applying rule under `FirstApplicable`, and on the first applying rule whose
effect is the *decisive* one under the overrides. Nothing else ends the walk.

| Combining | Stops at | Must otherwise |
| --------- | -------- | -------------- |
| `FirstApplicable` | the first applying rule — nothing overrides anything | — |
| `DenyOverrides` | the first applying `Deny` | evaluate every rule to permit |
| `PermitOverrides` | the first applying `Permit` | evaluate every rule to deny |

**Implication**: the overrides **invert the cost profile of the rest of the
library**, where allowing is the cheap outcome. Under `DenyOverrides` a permit is
the expensive answer, because nothing-denied is knowable only by asking
everything. That is the algorithm's meaning rather than an implementation
shortfall, and a caller who wants the cheap profile back writes
`FirstApplicable`, which is the default.

**Why this exists rather than a third clause in
[INV-QD-005](#inv-qd-005-short-circuit-preservation)**: stopping is a property of
a boolean operator there and of the *algorithm* here. Enumerating `Rules` beside
`AllOf` and `AnyOf` would have left INV-QD-005 true by listing, which is how an
invariant stops constraining anything.

**Enforcement**: six tests count resolver invocations across the three
algorithms in both directions, and assert the child count of the trace — a walk
that stopped early has fewer children than the table has rows, so the claim is
made twice by independent means. A mutation running every rule under
`FirstApplicable` kills two; one that stops the overrides at the first applying
rule of either effect kills five.

**Related**: [BEH-QD-115](behaviors/15-rules.md), [ADR-QD-023](decisions/023-combining-algorithms.md).

---

## INV-QD-018: A predicate admits exactly the rows the evaluator allows

For every translatable policy and every row, the compiled predicate and the
evaluator give the same answer.

**Source**: `packages/core/src/Predicate.ts` — `toPredicate` and
`evaluatePredicate`. Nothing structural forces the agreement; the predicate being
**executable** is what makes it checkable, and the check is what holds it.

**Implication**: this is the only invariant in the library asserted by comparing
two independent implementations of the same semantics rather than by inspecting
one. A divergence is an authorisation defect that no round-trip or coverage test
could catch — the predicate would simply return the wrong rows, silently, from a
query Qadi never sees.

**It is also the caller's tool.** A predicate compiled to SQL by the caller has
nothing saying their SQL means what Qadi meant. `evaluatePredicate` is the
reference semantics they differential-test against, so this invariant extends past
the library boundary in a way no other one does.

**Enforcement**: a `FastCheck` property samples 120 generated policies across
twelve generated rows — 1,440 comparisons. Only translatable shapes are
generated, because an untranslatable one has nothing to compare; everything
outside the subset is covered by the failure tests instead
([BEH-QD-123](behaviors/16-predicates.md)).

**The generators are the invariant's weak point, and mutation testing proved
it.** A row whose columns are all well-typed never reaches the place two
interpreters diverge. Ten mutations were run against the translator and nine died
immediately; the survivor **coerced** the ordered comparison —
`Number(value) >= Number(against)` instead of requiring both to be numbers. It
survived because every generated `level` was an integer and the one hand-written
non-number case was `"red"`, which is refused by coercion too. A **numeric
string** is the discriminator: a text column holding `"3"` is admitted by
coercion and refused by the matcher. The row generator now produces integers,
numeric strings and `null` for that column, and the property kills the mutant.
Rows missing a column entirely are generated for the same reason: `undefined`
must read identically on both sides.

**Related**: [BEH-QD-127](behaviors/16-predicates.md), [ADR-QD-024](decisions/024-predicate-output.md).

---

## INV-QD-019: Dominance is a partial order

`labelDominates` is reflexive, antisymmetric and transitive over every label.

**Source**: `packages/core/src/SecurityLabel.ts` — `compareLabels` composes `>=`
on `level` with containment on `compartments`, and both relations are themselves
partial orders.

**Implication**: this is what makes the ★-property a guarantee rather than a pair
of checks. A subject may read `source` when it dominates it and write `sink` when
`sink` dominates it; information then flows `source → sink`, and confidentiality
requires `sink` to dominate `source`. That conclusion follows **only** if
dominance composes. Bell–LaPadula's security property is therefore not an extra
rule the evaluator enforces — it is a consequence of the order being an order,
and it is the one thing about the model that no example-based test states.

[INV-QD-015](#inv-qd-015-incomparable-labels-deny-in-both-directions) covers
incomparability, which is one law of four. The other three had been asserted only
by example, and both [MOD-QD-027](models/27-bell-lapadula.md) and
[MOD-QD-029](models/29-mls.md) prescribed property tests for them.

**Enforcement**: `FastCheck` properties in `packages/core/test/Matcher.test.ts`
sample labels over four levels and three compartments — small deliberately, since
a wide alphabet makes overlapping-incomparable pairs rare, and those are the pairs
where a law can fail. Antisymmetry is asserted as the **implication** (mutual
dominance forces equal level and equal compartment set), not by comparing a pair
built to be equal. The flow property is stated separately in the terms the model
uses, and each property counts its witnesses and asserts the count, because an
antecedent that never fires makes the assertion vacuous — only about one triple in
sixteen forms a dominance chain.

**What this invariant is, honestly**: regression protection, not a bug found. The
laws hold *structurally*, and no mutation of `covers` or `compareLabels` broke one
without also breaking an example test. The change it guards against is a named
one: MOD-QD-029 asks for `join`, and a configurable lattice or a compartment
hierarchy is exactly where a structurally-emergent transitivity stops being
emergent. An invariant recorded before that change is cheap; recorded after, it
is archaeology.

**Related**: [BEH-QD-102](behaviors/13-labels.md), [ADR-QD-021](decisions/021-label-lattice.md).

---

## INV-QD-020: Concurrency changes lookups, never decisions

For every policy and every request, the `Decision` and its `Trace` are identical
whether or not `EvaluateOptions.concurrency` is supplied.

**Source**: `packages/core/src/Evaluate.ts` — the rules that combine child traces
live in one fold per composite (`stepAllOf`/`finishAllOf`, `stepAnyOf`/
`finishAnyOf`, and the `step` closure inside `evaluateRules`). Both paths drive
that same fold in declaration order; the sequential one stops evaluating when a
step yields a verdict, the concurrent one evaluates everything and then stops
*folding* at the same index.

**Implication**: `Trace.children` is the half a naive implementation gets wrong.
`Effect.forEach` preserves input order, so the verdict would survive while the
trace grew — a concurrent `allOf` recording four children where the sequential one
records two. The trace is public, is what `filter` and the React bindings surface,
and is what a reviewer reads to answer "why". So the concurrent path **discards**
trace nodes for children evaluated after the decisive one: the work was speculative
by construction, and keeping it would make the trace depend on a performance switch.

**This is structural rather than asserted into place.** There is no second copy of
the decision rules to compare against — unlike
[INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows),
where a predicate has an independent reason to exist as a second interpreter. A
schedule has none, so duplicating the rules and testing agreement was rejected in
favour of sharing them.

**Enforcement**: a `FastCheck` property samples 150 generated trees — composites
under all three field strategies, negation, and rule tables under all three
combining algorithms — and compares the full trace across sequential, bounded and
unbounded evaluation. Plus explicit cases for the three interactions that made this
undesignable earlier: `First` field-set order, the deciding rule selected by index
rather than arrival, and a resolver failure in a branch a sequential walk would
have skipped.

**The property needs a vacuity guard, and this is the second time.** Equality of
decisions alone would hold for a `concurrency` option that did nothing at all, so
the property counts the trees where the concurrent run performed *more* lookups
than the sequential one and asserts that count is non-trivial. INV-QD-018 cost this
lesson once; it is cheaper to apply it than to relearn it.

**Related**: [BEH-QD-130](behaviors/17-concurrency.md), [INV-QD-005](#inv-qd-005-short-circuit-preservation), [ADR-QD-026](decisions/026-concurrent-evaluation.md).

---

## INV-QD-021: Every policy explains

`explain` returns a non-empty explanation for every policy, and the explanation
has exactly one node per policy node.

**Source**: `packages/core/src/Explanation.ts` — `explain`, `matcherText` and
`refText` are each a `Match.tagsExhaustive` over their union, so a variant added
without an arm fails to compile. `explain` has no error channel and no services in
its signature.

**Implication**: an unexplained node would render as `undefined` inside an
otherwise fluent sentence — the worst failure mode available here, because it reads
as prose and a reviewer would not notice a requirement had gone missing. Totality
is what makes the output safe to put in front of someone making a decision.

**This is the one interpreter with no agreement property**, and that is a real
difference from [INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows).
A predicate is a second way of *deciding*, so it can be compared against the
evaluator row by row. An explanation is prose *about* a policy: there is nothing to
compare it to, and no test can establish that a sentence means what a tree says.
So what is asserted instead is the structural correspondence — one explanation node
per policy node — because a composite that silently dropped a child would still
render fluently.

**Not symmetrical with `toPredicate`, deliberately.** That refuses what it cannot
translate ([BEH-QD-123](behaviors/16-predicates.md)); this refuses nothing. A
partial translation returns wrong rows, so refusing is safe; a partial explanation
is an incomplete description, and no description at all is worse.

**Enforcement**: a `FastCheck` property over 200 generated trees asserts every
rendering is non-empty and contains neither `"undefined"` nor `"[object"`. Every
matcher and every value reference has an explicit case, because a missing arm would
render as `undefined` in the middle of a sentence rather than throw. Node counts
are compared directly.

**Related**: [BEH-QD-137](behaviors/18-explanation.md), [BEH-QD-141](behaviors/18-explanation.md), [ADR-QD-027](decisions/027-policy-explanation.md).

---

## INV-QD-022: A hydrated decision belongs to the subject that hydrates it

A server-rendered decision is seeded into a client registry only when the payload's
subject id is the hydrating subject's.

**Source**: `packages/react/src/Hydration.ts` — `hydrateDecisions` returns an empty
seed list on a mismatch, and skips any entry whose policy does not decode.
`dehydrateDecisions` drops entries whose decision belongs to a different subject
than the payload claims.

**Implication**: a hydration payload is **authorization state crossing a network**,
and the failure mode is a page cached or reused across users — one subject's allows
seeding another's registry. There is no lookup to catch that: the decision is
already made, and seeding it is asserting it. This is the only place in the library
where a decision enters the system without having been evaluated by it, which is
why it is the only place that needs to check whose decision it is.

**It fails closed by dropping, not by throwing.** A refused payload leaves every
atom `Initial`, so the client asks the question properly and the page flashes —
exactly what would have happened without hydration. Throwing would turn a cache
misconfiguration into a blank page; trusting would turn it into a breach. Dropping
is the only option that degrades to the pre-hydration behaviour.

**Disclosure is the second half.** A `Trace` names every node's tag, its label and
the sentence explaining why it refused, so shipping one describes the policy's
internal structure and which branch this subject failed. It is withheld by default
and disclosed only on request — [INV-QD-007](#inv-qd-007-defaults-fail-closed)'s
reasoning applied to information rather than to decisions.

**Enforcement**: `Hydration.test.ts` seeds one subject's payload into another
subject's registry and asserts the second subject is **denied** — the hydrating
subject deliberately holds no permissions, so a leak would surface as an `Allow`
carrying the other subject's evaluation id. A malformed policy entry, a
subject-mixing payload, and the absence of the denial reason in the serialized
payload are each asserted directly.

**Related**: [BEH-QD-146](behaviors/19-hydration.md), [BEH-QD-147](behaviors/19-hydration.md), [ADR-QD-028](decisions/028-decision-hydration.md).

---

## INV-QD-023: Every pair of labels has a least upper and a greatest lower bound

`join(a, b)` dominates both operands and is dominated by everything that dominates
both. `meet(a, b)` is dominated by both and dominates everything both dominate.

**Source**: `packages/core/src/SecurityLabel.ts` — `join` takes the maximum of the
levels and the union of the compartments; `meet` takes the minimum and the
intersection. Both are pure and neither is reachable from the evaluator.

**Implication**: this is what makes the structure a **lattice** rather than merely a
partial order, and it closes a contradiction the specification carried from E4 until
CCR-QD-030. [MOD-QD-029](models/29-mls.md) defines a lattice as "a partial order
with joins"; ADR-QD-021 shipped the order and declined the joins, so by that
document's own definition what shipped was not the thing it was named for. Two of
the seven laws in its Verification table were recorded as *Void — declined* rather
than unmet.

**The security reason it exists, which is not the algebra.** A caller labelling a
document derived from two sources has to compute the join, and the natural mistake —
take the higher level, carry *its* compartments — produces a label the correct one
**dominates**. So the derived object is labelled *lower* than its contents, and a
reader without the missing compartment reads material they have no clearance for
while every comparison in the system behaves correctly. The wrong label is compared
correctly, which is why no other invariant catches it and why a prose warning in a
model document could not.

**It does not move ADR-QD-021's boundary.** Deriving a label is still not a decision:
no policy variant computes one, no matcher constructs one, and `Evaluate.ts` does not
import either function. If it ever does, the line has been crossed and
[ADR-QD-029](decisions/029-lattice-join-and-meet.md) needs revisiting rather than
extending.

**Enforcement**: `FastCheck` properties over sampled triples assert both bound laws
in both directions, plus the two **absorption** laws — `join(a, meet(a, b)) = a` and
`meet(a, join(a, b)) = a`. Absorption is what distinguishes a lattice from any two
functions that happen to return bounds, and it is the law a compartment hierarchy
would break first. The under-classification mistake is asserted directly: the
correct join strictly dominates the mistaken one, and a reader who may read the
mistaken label may not read the correct one.

**Related**: [BEH-QD-103](behaviors/13-labels.md), [INV-QD-019](#inv-qd-019-dominance-is-a-partial-order), [ADR-QD-029](decisions/029-lattice-join-and-meet.md).

---

## INV-QD-024: Simplification changes the tree and nothing a caller can observe

For every policy and every subject, `simplify(p)` yields the same verdict, the same
`visibleFields` and the same obligations as `p`.

**Source**: `packages/core/src/Simplify.ts` — two rewrites, both conditional:
a single-child composite collapses to its child, and a composite nested in the same
composite flattens **only when the field strategies match**.

**Implication**: the guarantee has to be about fields and duties, not only the
verdict. A rewrite that preserved allow-or-deny while changing `visibleFields` would
be a **disclosure** defect, and field visibility is the reason this library exists
([MOD-QD-007](models/07-field-level.md)). Every allow-or-deny test in the suite would
still have passed.

**It deliberately does *not* preserve the trace.** A simplified policy has fewer
nodes, so its trace has fewer nodes; that is what "smaller tree" means. `labeled`
nodes are never removed, so a denial's attribution survives, and nothing in the
library calls `simplify`, so no trace changes unless a caller asks
([ADR-QD-030](decisions/030-policy-simplification.md)).

**The property rejected a rewrite, which is the point of having it.** Double
negation elimination — `not(not(p))` → `p` — was written and is unsound here. `Not`
carries `visibleFields: undefined`, the top of the lattice, and no obligations,
because knowing a policy did *not* hold says nothing about which fields are safe. So
`not(not(hasPermission(read, { fields: ["id"] })))` allows with **every** field where
the inner policy allows with `["id"]`, and `not(not(obliged(audit, p)))` owes
**nothing** where the inner owes `audit`. Both differences run in the safe direction
for the rewrite, and both are differences.

That counterexample needs a policy which *allows* with a restricted field set beneath
two negations, and every intuition says the negations cancel — so it is not something
a hand-written test would have looked for. It is the second time a property has paid
for itself by contradicting something obvious; the first was
[INV-QD-018](#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows).

**Enforcement**: a `FastCheck` property over 120 generated trees × **four subjects**,
comparing verdict, visible fields and obligations. Four subjects rather than one
because a rewrite sound for a subject who is denied everything says nothing: the
field-strategy trap is invisible unless two branches *allow* with different field
sets. A vacuity guard asserts that at least twenty trees actually shrank, since the
property holds trivially for a `simplify` that returns its argument. Idempotence is a
second property over 200 trees.

**Related**: [BEH-QD-154](behaviors/20-simplification.md), [BEH-QD-155](behaviors/20-simplification.md), [INV-QD-004](#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top), [ADR-QD-030](decisions/030-policy-simplification.md).

---

## INV-QD-025: A cache hit differs from a miss only in speed and identity

A cached decision equals an uncached one in verdict, visible fields, obligations and
trace, and carries a **different** `evaluationId`.

**Source**: `packages/core/src/DecisionCache.ts` and `Evaluate.ts` — the cache stores
the `Trace`, and `evaluate` stamps `evaluationId` and `durationMillis` per call on a
hit as well as a miss.

**Implication**: caching the `Decision` whole is the obvious implementation and it
breaks correlation. Two evaluations would share one `evaluationId`, so two log lines,
two spans and two audit records would claim to be the same event — undoing
[ADR-QD-012](decisions/012-deterministic-time-and-ids.md), whose whole purpose is that
an identifier comes from a service so traces can be correlated and tested. So the
identity clause is asserted as an **inequality**: equality there is the defect, not
the guarantee.

**The key is a security boundary, and this is the second time.** The key is
`subjectId + policy + resource + action`. Keyed on the policy alone, a cache serves
one subject's allow to another — the same class of defect as an unbound hydration
payload ([INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it)).
A decision is *about* a subject, so any structure holding decisions holds the subject.
`concurrency` is deliberately **not** in the key: it cannot change the answer
([INV-QD-020](#inv-qd-020-concurrency-changes-lookups-never-decisions)), so including
it would split one entry in two for nothing.

**Freshness is the caller's, and the failure mode is not the key's.** A correct key
prevents the cross-subject leak; only the *lifetime* governs staleness, and Qadi has
no notion of a request boundary. `decisionCacheLayer` is therefore a function
returning a fresh cache, so a call site reads as "make a cache here".

**A silently-ineffective cache is worse than none**, which is why the trap has a test
rather than a note. `Effect.provide` builds a layer per execution, so piping the cache
onto a single `evaluate` yields a fresh empty cache every run: the same lookups, the
same cost, and code that reads as though it were caching.

**Enforcement**: `DecisionCache.test.ts` — the same question twice with and without a
cache, counting resolver calls; a hit compared field by field against its miss with
`evaluationId` asserted **unequal**; two subjects through one cache with a resolver
that answers differently, so a leak surfaces as the second subject being allowed; the
resource and the action each shown to split entries; a denial shown to cache; the
per-evaluation trap asserted directly; and `concurrency` shown not to split an entry.

**Related**: [BEH-QD-162](behaviors/21-decision-cache.md), [BEH-QD-163](behaviors/21-decision-cache.md), [ADR-QD-031](decisions/031-decision-cache.md).

---

## INV-QD-026: The facade answers what the core answers

For every subject and policy, `@qadi/promise` resolves the value `@qadi/core`
produces, and rejects exactly when the core fails.

**Source**: `packages/promise/src/index.ts` — every method is `runPromise` applied to
a core function. There is no branch in the package that decides an authorization
outcome, which is what makes "never a second evaluator" checkable by reading rather
than by trusting.

**Implication**: this is the invariant that stops the predecessor's defect
recurring. It shipped a synchronous `evaluate` beside an `evaluateAsync` that
pre-resolved the whole tree, destroying short-circuiting and leaving the asynchronous
relationship API unreachable — and the second path rotted because nothing exercised
it ([ADR-QD-004](decisions/004-single-effect-evaluator.md)). Two evaluators means two
sets of semantics, and the second is always the one nobody tests.

**A denial resolves; a failure rejects.** That is
[INV-QD-006](#inv-qd-006-failure-is-not-denial) crossing a boundary that invites
breaking it: `try { check() } catch { return false }` is the natural Promise idiom and
it turns an attribute-store outage into a silent lockout. A denial is an *answer*, so
it is a value; a broken lookup is not an answer, so it is a rejection. `assert` is the
deliberate exception, because there the caller has said "proceed only if permitted".

**Enforcement**: a test runs both paths over the same subjects and policies and
compares the boolean **and the whole trace** — the facade must not reshape an answer,
only re-package it. Separately, a failing resolver is asserted to *reject* rather than
resolve `false`, which is the assertion that would catch the idiom above.

**Related**: [BEH-QD-169](behaviors/22-promise-facade.md), [BEH-QD-170](behaviors/22-promise-facade.md), [ADR-QD-032](decisions/032-promise-facade.md).

---

## INV-QD-027: The published package decides what the sources decide

The package a consumer installs answers as the sources do. A permission the subject
holds allows, one it does not holds denies, and both entry points agree — through the
published `exports` map, against the shipped declarations, outside this repository.

**Source**: `tsconfig.build.json` emits every public package, and `pnpm pack` resolves
the workspace-time dependency protocols that `npm pack` copies through verbatim. Both
are conditions on the artifact rather than on the code, which is why neither could be
established by reading it.

**Implication**: the artifact cannot pass while the sources fail, nor the reverse. It
was the reverse that occurred: `@qadi/promise` type-checked, tested and mutation-tested
green for six commits while `pnpm build` emitted nothing for it, because a *different*
project graph — the typecheck one — included the package and left a `lib/` behind that
looked like a build product. Ten gates read the sources and agreed, and the tarball
would have shipped empty.

**Enforcement**: step 10 of `pnpm check`. `scripts/check-package-install.mjs` reads the
build graph, packs each public package with `pnpm`, extracts the tarballs into a sandbox
resolving `effect` and `react` from this workspace, and compiles and runs a TypeScript
consumer against the shipped `.d.ts`. Its first check is static because it is the only
one a stale `lib/` cannot fool. Verified against five deliberate breaks: packing with
`npm`, an `exports` path with no file behind it, a renamed declaration, an
allow-turned-deny in the built evaluator, and the promise package removed from the build
graph *with its stale output left in place*.

**Related**: [INV-QD-006](#inv-qd-006-failure-is-not-denial), [INV-QD-026](#inv-qd-026-the-facade-answers-what-the-core-answers), [ADR-QD-033](decisions/033-the-packed-artifact-is-the-product.md).

---

## INV-QD-028: A seed never outlives the client's own answer

A server-rendered decision covers only the frames before this client has decided
for itself. Once it has — allow, deny or failure — that answer is what every
consumer reads, and the seed is never read again.

**Source**: `packages/react/src/QadiAtoms.ts` — the seed is a separate atom from
the decision, and the atom a consumer reads is a derivation that consults the seed
only while the computed result is `Initial`. `Initial` is the one state meaning
"this client has never answered", so the precedence is a property of the
expression rather than of when an effect settles.

**Implication**: the reverse is what occurred. Seeding the decision atom directly
put the seed under `AtomRegistry`'s `preserveInitialValueOnBuild`, which keeps a
seeded value over the one the node computes. An asynchronous evaluation escaped it
by publishing through `setSelf` on a later turn; a **synchronous** one published by
returning, and was discarded. Every policy needing no resolver evaluates
synchronously, so a subject held a server-issued allow they no longer qualified
for, for the life of the page.

Note the relationship to [INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it)
and to [ADR-QD-017](decisions/017-stale-decisions-are-not-decisions.md): the
bypassed value was bound to the right subject, and was not `waiting`, so
`currentDecision` returned it and every consumer was correct. **ADR-QD-017 guards
the `waiting` flag; this failure never set it.** An invariant about staleness that
speaks only of the flag does not reach a value that was never marked stale.

**Enforcement**: `packages/react/test/Hydration.test.ts` seeds an allow for a
policy the subject fails and asserts the read is a denial, both immediately and
after every scheduled turn has run — the shape of assertion the suite previously
had none of, because every test read the registry on the tick it was built and so
could only observe that a seed was *present*.

**Related**: [BEH-QD-151](behaviors/19-hydration.md), [INV-QD-022](#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it), [ADR-QD-039](decisions/039-a-seed-is-not-an-authority.md), [ADR-QD-028](decisions/028-decision-hydration.md).

---

## INV-QD-029: A denial names only what was consulted

A denial's reason never asserts a fact about a store that was not consulted.

**Source**: `packages/core/src/RelationshipResolver.ts` — the port is
three-valued, so `RelationshipResolverNever` answers `"Unknown"` rather than
`"Unrelated"` and `evaluateHasRelationship` has a distinct arm for it.
`packages/core/src/Evaluate.ts` — `attributeReason` says "has no value" for an
unresolved attribute and "did not match" only for one that was resolved and
compared.

**Implication**: the reverse is what shipped. An unwired relationship resolver
denied with `subject 'u1' has no 'owner' relation to 'doc-1'`, which is a claim
about the contents of a graph that had never been connected. That sentence
reaches an `AccessDenied` handler, a `renderTrace` line and a `Can` fallback, and
it sends the reader to audit their edges when the fix is in their layer wiring.
The unwired state is also the state every ReBAC integration starts in, so this
was the first sentence most readers ever saw.

Note what this invariant does **not** claim. The verdicts are identical either
way — both arms deny, [INV-QD-007](#inv-qd-007-defaults-fail-closed) is untouched,
and no decision anywhere moves. This is an invariant about diagnosis, and it is
worth stating precisely because nothing in a verdict-shaped test could have
caught its violation.

The attribute half is milder and is included for the same reason. `did not match`
is *true* of an unresolved attribute — every matcher fails `undefined` — so
nothing was false there; the diagnosis was merely withheld, and a misconfigured
`AttributeResolver` produces that case exclusively.

**Enforcement**: `packages/core/test/Evaluate.test.ts` pins both sentences
against each other — an unwired resolver beside a wired store that looked and
found nothing, an absent attribute beside a present one that compares wrong. A
single sentence for both cases passes any test asserting only the verdict, which
is how this survived to be found by reading.
`features/features/rebac/relationships.feature` carries the same pair.

**Related**: [BEH-QD-045](behaviors/06-services.md), [BEH-QD-043](behaviors/06-services.md), [ADR-QD-040](decisions/040-an-unwired-port-names-its-absence.md), [ADR-QD-020](decisions/020-decision-history-port.md), [INV-QD-014](#inv-qd-014-an-unwired-history-port-denies-both-polarities).

---
