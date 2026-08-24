# Runtime Invariants

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-INV                                       |
> | Revision       | 1.18                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.18 (2026-08-24): INV-QD-046, instrumentation never changes what a guard renders (CCR-QD-073)<br>1.17 (2026-08-24): INV-QD-045, hydration accounts for every entry (CCR-QD-072)<br>1.16 (2026-07-26): INV-QD-027, the published package (CCR-QD-038)<br>1.15 (2026-07-26): INV-QD-026, the Promise facade (CCR-QD-033)<br>1.14 (2026-07-26): INV-QD-025, the decision cache (CCR-QD-032)<br>1.13 (2026-07-26): INV-QD-024, simplification (CCR-QD-031)<br>1.12 (2026-07-26): INV-QD-023, the lattice bounds (CCR-QD-030)<br>1.11 (2026-07-26): INV-QD-022, hydration is subject-bound (CCR-QD-029)<br>1.10 (2026-07-26): INV-QD-021, explanation totality (CCR-QD-028)<br>1.9 (2026-07-26): INV-QD-020, concurrency; INV-QD-005 scoped to sequential evaluation (CCR-QD-027)<br>1.8 (2026-07-26): INV-QD-019, the order laws (CCR-QD-024)<br>1.7 (2026-07-26): INV-QD-018, predicate agreement (CCR-QD-020)<br>1.6 (2026-07-26): INV-QD-017, rule tables; INV-QD-005 defers to it (CCR-QD-019)<br>1.5 (2026-07-26): INV-QD-016, subject sets (CCR-QD-018)<br>1.4 (2026-07-26): INV-QD-015, label dominance (CCR-QD-017)<br>1.3 (2026-07-26): INV-QD-014, the history port; INV-QD-008 restated as "given the same history" (CCR-QD-016)<br>1.2 (2026-07-26): INV-QD-012 and INV-QD-013, obligations (CCR-QD-015)<br>1.1 (2026-07-26): INV-QD-011, the action dimension (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

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

**Enforcement**: step 14 of `pnpm check`. `scripts/check-package-install.mjs` reads the
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

## INV-QD-030: Cache key uniqueness

Two distinct questions never produce the same cache entry.

**Source**: `packages/core/src/DecisionCache.ts` — `DecisionCacheKey` is used as
a `HashMap` key directly, with no serialization step. Effect's `Equal`/`Hash`
compare plain objects structurally, nested included, so equality of keys is
equality of questions.

**Implication**: the reverse held, and it was a serving defect rather than a
performance one. `keyOf` was `JSON.stringify`, which maps a `Date` onto its ISO
string, drops `undefined`-valued and function-valued properties, and renders
`NaN` as `null` — so `{d: new Date(0)}` and `{d: "1970-01-01T00:00:00.000Z"}`
were one key for two questions, and the second caller received the first's
verdict.

This is [INV-QD-001](#inv-qd-001-permission-key-uniqueness) one layer down, and
the wording deliberately matches it. A permission key and a cache key are the
same kind of object — a projection used as an identity — and the same rule has
to hold of both.

Note what this repairs rather than adds.
[INV-QD-025](#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity)
says a hit differs from a miss only in speed and identity; under a colliding key
a hit differed in **verdict**, so that invariant was false and is now true. The
function's own doc comment had claimed the opposite property — that stringifying
was the option with "no chance of colliding" — which is why nothing looked.

A second consequence, not the point: two structurally equal resources whose
properties were written in a different order now **hit**. That was previously
documented as a deliberate miss, and it is safe to drop precisely because the
comparison is now real structural equality rather than a stringification that
happens to agree.

**Enforcement**: `packages/core/test/DecisionCache.test.ts` counts resolver
invocations for the two collision shapes — a `Date` beside its ISO string, an
`undefined`-valued property beside an absent one — and asserts two evaluations,
not one.

**Related**: [BEH-QD-167](behaviors/21-decision-cache.md), [INV-QD-001](#inv-qd-001-permission-key-uniqueness), [INV-QD-025](#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity), [ADR-QD-042](decisions/042-a-projection-is-not-an-identity.md).

---

## INV-QD-031: A rendered explanation denotes exactly one policy

Two policies that are not equivalent never render to the same sentence.

**Source**: `packages/core/src/Explanation.ts` — `renderExplanation` embeds every
child through one `embed` helper, which parenthesises anything that is not
atomic. Only a `Requirement` and the empty `All`/`Any`/`Table` render bare, the
latter because their fixed sentences have no loose end for a following word to
attach to.

**Implication**: the reverse shipped. `anyOf([a, allOf([b, c])])` and
`allOf([anyOf([a, b]), c])` produced a byte-identical sentence, and they are not
the same policy — the first admits a lone `a`. The rendering is the only thing an
administrative screen shows ([ADR-QD-027](decisions/027-policy-explanation.md)
made it the one place English is assembled), so a reviewer had no way to recover
which policy they were reading.

The same flattening left an obligation ambiguous: `allOf([x, obliged(o, y)])`
read as though the whole policy owed `o`, when only the second branch does.

**The top level is deliberately never wrapped.** Nothing follows it, so there is
nothing to run into, and wrapping it would put brackets around every sentence in
the library for no gain.

**Enforcement**: `packages/core/test/Explanation.test.ts` pins the two policies
above and asserts their renderings differ, one case per embedding position so a
site that reverted to bare joining fails on its own shape, and the atomic cases
in the other direction so parentheses cannot spread to ordinary sentences.
`features/features/explanation/explanation.feature` carries the pair as scenarios.

**Related**: [BEH-QD-137](behaviors/18-explanation.md), [ADR-QD-042](decisions/042-a-projection-is-not-an-identity.md), [ADR-QD-027](decisions/027-policy-explanation.md).

---

## INV-QD-032: A guarded resource is the evaluated resource

The resource `guard` is given is the resource the policy is evaluated against.

**Source**: `packages/core/src/Qadi.ts` — `guard` calls
`enforce(policy, { ...options, resource })`, so the positional resource reaches
evaluation and overrides any `options.resource`.

**Implication**: the reverse shipped, and it was fail-open rather than
fail-closed. The resource was passed only to the handler; the policy was
evaluated with `options.resource`, which no caller set. An absent resource does
**not** deny — `resolveRef` yields `undefined` for a `ResourceRef` with no
resource, and `neq` on `undefined` is `true` — so a policy written to refuse a
mismatched tenant allowed one, and the handler received an `Authorized<P>`
witness asserting a check that never ran.

`@qadi/http`'s `guardRoute` loads a resource per request and passes it here, so
its central parameter was authorization-inert. The defect survived because that
package's fixture uses a subject-only policy, against which an empty resource and
a correct one are indistinguishable.

A second consequence, now correct: an **empty** resource reaches the evaluator
and denies a resource-scoped policy, where no resource at all fails with
`MissingResource`. That is the difference between a 403 and a 500 in
`@qadi/http`, and `NO_RESOURCE`'s comment had described the former while the code
did the latter.

**Enforcement**: `packages/core/test/Qadi.test.ts` guards a resource that should
be refused and asserts `AccessDenied` with the handler never started, guards one
that should pass so the test cannot succeed by denying everything, pins the empty
resource as a denial rather than an error, and pins the positional resource
winning over `options.resource`.

**Related**: [BEH-QD-055](behaviors/07-enforcement.md), [ADR-QD-043](decisions/043-a-decision-is-computed-from-its-inputs.md), [ADR-QD-035](decisions/035-witness-guard-primitive.md), [INV-QD-006](#inv-qd-006-failure-is-not-denial).

---

## INV-QD-033: A cached decision belongs to the grants that earned it

Two subjects with different grants never share a cache entry, whatever their ids.

**Source**: `packages/core/src/Evaluate.ts` — the `DecisionCacheKey` carries the
whole `AuthSubject`, not `subject.id`. `AuthSubject` compares structurally,
`HashSet` roles and permissions included.

**Implication**: the key was `subject.id`, and an id is a sound proxy for a
subject only if it determines that subject's grants. It does not.
`@qadi/http`'s `SubjectExtractor` rebuilds an `AuthSubject` per request from a
bearer token, so a scoped token and a full token for one user share an id and
hold different permissions. Under an application-scoped cache — which
`DecisionCache.ts` documents as a supported choice — the first verdict for a
given id won permanently, in both directions: a scoped token receiving a full
token's allow, and a full token receiving a scoped token's denial.

This narrows staleness rather than removing it, and the boundary is the useful
part. A grant revoked in the **subject** changes the key, so the next request
re-evaluates. A grant revoked only in a **store the evaluation consults** — an
attribute value, a relationship edge, a history event — is invisible to the key
and stays cached. Application scope is safe against token downgrade and unsafe
against backend revocation; per-request scope is safe against both.

**Enforcement**: `packages/core/test/DecisionCache.test.ts` runs two tokens for
one id through one application-scoped cache in both orders and asserts each gets
its own verdict; a control asserts that two structurally equal subjects still
hit, so the fix cannot pass by disabling the cache. Verified by falsification —
erasing the grants from the key reproduces `[true, true]` where `[true, false]`
is correct.

**Related**: [BEH-QD-168](behaviors/21-decision-cache.md), [INV-QD-030](#inv-qd-030-cache-key-uniqueness), [ADR-QD-043](decisions/043-a-decision-is-computed-from-its-inputs.md), [ADR-QD-031](decisions/031-decision-cache.md).

---

## INV-QD-034: An endpoint's authorization is declared, not inferred

An HTTP endpoint that declares neither a permission requirement nor an explicit
public marker is refused.

**Source**: `packages/http/src/RequirePermission.ts` — `RequirePermissionLive`
serves an endpoint only when it carries `RequiredPermission` (enforce) or
`PublicEndpoint` (pass through). Neither is a 500, logged with the endpoint's
identifier.

**Implication**: the reverse shipped, and
[ADR-QD-036](decisions/036-qadi-http-package-shape.md) had **already rejected
it by name** — "annotate-and-forget, where an unannotated route silently passes
through enforcement … Rejected: it inverts this library's fail-closed posture …
by making the *absence* of a permission requirement mean 'unguarded'". The code
implemented the rejected alternative, and a test asserted it was correct. Adding
an endpoint to a guarded group and forgetting one annotation published it, with
no signal at build time, layer-build time, or request time.

This is the only invariant in this document whose violation was **written down
as a rejected design before it was built**. The package had no behaviour
document ([23 — HTTP Enforcement](behaviors/23-http.md) was written after the
audit that found this), so nothing normative sat between the ADR's prose and the
code, and nothing checked that they agreed.

500 rather than 403 is part of the invariant. A missing declaration is a wiring
mistake in the service, and reporting it as a permissions decision sends an
operator to audit the wrong system — the same reasoning that puts `MissingAction`
and `MissingResource` in the 500 group
([BEH-QD-177](behaviors/23-http.md)).

**Enforcement**: `packages/http/test/http.test.ts` serves an endpoint declaring
neither and asserts 500, beside one declared public asserting 204 — so the fix
cannot pass by refusing everything.

**Related**: [BEH-QD-174](behaviors/23-http.md), [ADR-QD-036](decisions/036-qadi-http-package-shape.md), [INV-QD-007](#inv-qd-007-defaults-fail-closed).

---

## INV-QD-035: A sink cannot change a decision

An observer of an evaluation cannot alter its outcome. Neither a `DecisionSink`
that fails nor one that raises a defect may change the verdict, the trace, or the
error the caller receives.

**Source**: `packages/core/src/DecisionSink.ts` — `record` returns
`Effect<void>`, a `never` error channel. `packages/core/src/Evaluate.ts` — the
call site wraps it in `Effect.catchCause`, so a defect is swallowed too.

**Implication**: enforced twice, because the type closes only part of the gap.
It closes more than expected — `Effect.fail` is not assignable to
`Effect<void>`, so a sink that *reports* failure cannot be written at all — but
a **defect** still is, both as `Effect.die` and as any body that throws inside
`Effect.sync`. That is exactly the subversion
[BEH-QD-175](behaviors/23-http.md) recorded on
`SubjectExtractorShape.extract`, where a `never` channel drove implementors to
`Effect.die` instead. The difference is direction, and it is why `never` is right
here and wrong there: an extractor that cannot reach its store *must* change the
answer; a sink must never be able to.

The `catchCause` at the call site is the **inverse** of the `Effect.orDie` that
[AGENTS.md §4](../AGENTS.md) forbids on evaluation paths, not an instance of it.
`orDie` turns a failure into a defect; this stops a bystander's defect from
becoming an authorization outcome. An observer must never be able to deny.

**Enforcement**: `packages/core/test/DecisionSink.test.ts` runs a **throwing**
sink and a **dying** sink against a no-sink baseline and asserts the trace is
identical, and asserts that a sink dying on the *failure* path leaves the
original `EvaluationError` intact rather than replacing it.
`packages/core/test/DecisionSink.tst.ts` pins the half the type carries: a
failing sink is not assignable, a dying one is.

**Related**: [BEH-QD-182](behaviors/24-decision-sink.md), [ADR-QD-044](decisions/044-an-optional-decision-sink.md), [INV-QD-006](#inv-qd-006-failure-is-not-denial).

---

## INV-QD-036: A decision record is complete

A record identifies the policy, resource, action and start time of the
evaluation it describes. No consumer needs a side channel to interpret one.

**Source**: `packages/core/src/DecisionRecord.ts` — `DecisionRecord` carries
`policy`, `resource`, `action`, `at` and `evaluationId` beside the outcome.

**Implication**: a `Decision` alone cannot be interpreted, and the most damaging
gap was the policy. `explain` takes a `Policy`; a `Decision` carries
`trace.policyTag`, a string — so **the explanation of a denial was unreachable
from the denial**, which is the failure this library was rewritten to fix. The
action and resource were `EvaluateOptions` inputs consumed and dropped, so the
question asked could not be reconstructed; the start time was read from `Clock`,
used for one subtraction, and discarded, so records could not be ordered.

`at` comes from `Clock`, never `Date.now()`, so a record is reproducible under
`TestClock` ([ADR-QD-012](decisions/012-deterministic-time-and-ids.md)).

A record deliberately carries **no environment**. Core cannot know whether it
runs in a browser, on a server, or at an edge; the sink implementation stamps it.
A field the evaluator would have to guess at is a field that is wrong somewhere.

**Enforcement**: `packages/core/test/DecisionSink.test.ts` asserts a record's
policy round-trips through `explain`/`renderExplanation` to the same rendering as
the original, and asserts `at` is the `TestClock` start time across two ordered
evaluations.

**Related**: [BEH-QD-181](behaviors/24-decision-sink.md), [BEH-QD-183](behaviors/24-decision-sink.md), [ADR-QD-044](decisions/044-an-optional-decision-sink.md).

## INV-QD-037: A measured depth agrees with the evaluated bound

`policyDepth(p) <= n` holds exactly when `evaluate(p, { maxDepth: n })` does not
raise `PolicyTooDeep`.

**Source**: `packages/core/src/Policy.ts` — `policyDepth` counts a leaf as 0 and
adds one at each recursive position, which is how `evaluateNode` counts.

**Implication**: a second walk of the policy tree is a second interpreter of the
same rule, and this document already treats interpreter disagreement as the
defect worth naming ([INV-QD-018](#inv-qd-018-the-two-interpreters-agree)). Here
the disagreement has a direction that matters: a depth **under**-reported by one
declares a policy safe that the evaluator then refuses, so a caller bounding
untrusted decoded input would admit exactly the input it meant to reject.

The function exists because `maxDepth` is an evaluation input, not a property of
a policy — nothing recorded how deep a policy actually was, so every caller
needing to know had to write this walk and guess at the convention.

**Enforcement**: `packages/core/test/RolesAndDepth.test.ts` asserts the agreement
against `evaluate` itself, in both directions, over five shapes: at the reported
depth it evaluates, and one below it raises. A `FastCheck` property pins a
right-leaning spine of arbitrary length.

**Related**: [BEH-QD-191](behaviors/25-inspection.md), [INV-QD-018](#inv-qd-018-the-two-interpreters-agree).

---

## INV-QD-038: Provenance and flattening agree

The permissions `permissionProvenance` reports are exactly the set
`flattenPermissions` returns.

**Source**: `packages/core/src/Role.ts` — both walk depth-first with a
name-keyed visited set, so a diamond is walked once by each and the first path
wins in both.

**Implication**: two functions answering one question is the shape this codebase
has already been bitten by, so the agreement is stated rather than assumed. The
consequence of drift is specific: a screen showing "who granted this" built on
provenance would display a different permission set from the one that decides,
and a reviewer comparing them would trust the wrong one.

They are kept separate rather than one derived from the other because
`flattenPermissions` runs inside `makeSubject` — once per subject, so per request
on a server — and building a path array per permission there would charge every
caller for what only an explorer wants.

**Enforcement**: `packages/core/test/RolesAndDepth.test.ts` compares the two
sets directly over an inheritance chain, and asserts a diamond yields one grant
rather than two.

**Related**: [BEH-QD-192](behaviors/25-inspection.md), [ADR-QD-015](decisions/015-role-dag-acyclic-by-construction.md).

## INV-QD-039: The timeline is ordered, unique, and independent of arrival

The entries a `Timeline` holds are a function of the *set* of records folded
into it, not of the order they arrived in or how often each was delivered.

**Source**: `packages/devtools/src/model/Timeline.ts` — `ingest` places each
record by a total order over `at`, identifies it by
`(_tag, environment, evaluationId, at)`, and returns the identical timeline for
a repeat.

**Implication**: everything downstream — pairing, filters, both screens — reads
entries and may assume they are ordered, unique and joined, so exactly one
module absorbs a feed that promises none of that. It has to: `EventSource`
reconnects on its own and a feed may be replaying, so a record arrives twice; a
merge interleaves two processes' clocks, so records arrive out of order; and an
obligation outcome is emitted after `evaluate` returned, so the two halves of
one story can arrive backwards.

The identity is deliberately **not** the evaluation id alone. A server decision
and its client re-check share one — that is the whole pairing story
([BEH-QD-186](behaviors/24-decision-sink.md)) — and collapsing them would erase
what the tool exists to show.

*Identical* rather than merely equal is load-bearing rather than an
optimisation: `useSyncExternalStore` compares snapshots by identity, so a
rebuilt-but-equal timeline would re-render the panel on every replayed frame.

**Enforcement**: `packages/devtools/test/model/Timeline.test.ts` folds a closed
product of record shapes forward, reversed and twice over, and asserts the same
entries each time; `TimelineStore.test.ts` asserts the identity property
directly.

**Related**: [BEH-QD-205](behaviors/27-devtools-timeline.md), [ADR-QD-047](decisions/047-a-headless-devtools-model.md).

## INV-QD-040: The inspector never claims more than the trace does

Every node the inspector renders as decided has a trace node behind it, and
every node without one renders as unexamined.

**Source**: `packages/devtools/src/model/Inspect.ts` — `inspect` walks
`explain(policy)` against the `Trace` by index, and a part with no child trace
at its index yields `NeverResolved`, recursively.

**Implication**: this is the one place where a *rendering* defect becomes a
security misreading, which is why it is an invariant rather than a style rule.
[INV-QD-005](#inv-qd-005-short-circuit-preservation) says a branch that is never
reached performs no lookup; a reviewer who reads such a node as "denied"
concludes their policy rejected something it never examined, and acts on it.

Two neighbouring cases fall out of the same rule. A `Failed` outcome has no
trace at all, so `inspectEntry` yields **nothing** rather than a tree of
unexamined nodes — an empty requirement tree reads as *no requirements*, which
reads as *allowed*, which is the inversion
[INV-QD-006](#inv-qd-006-failure-is-not-denial) exists to prevent. And a trace
truncated below the root — what `dehydrateDecisions` ships without
`includeTrace` — is reported as *not disclosed* rather than as unexamined,
because a composite that short-circuits always evaluates its first child, so the
two shapes are distinguishable and blaming the evaluator for a disclosure
decision would mislead.

The alignment by index is sound by construction rather than by convention:
`evaluateNode` emits one trace node per policy node in declaration order, every
wrapper produces a single child, and the composites push one child per element
they evaluated.

**Enforcement**: `packages/devtools/test/model/Inspect.test.ts` drives every
tree from a real `evaluate` rather than a hand-built trace — a hand-built one
would prove only that the zip agrees with what the test author assumed — and
`test/react/DevtoolsDock.test.tsx` asserts the rendered wording.

**Related**: [BEH-QD-208](behaviors/27-devtools-timeline.md), [ADR-QD-027](decisions/027-policy-explanation.md).

## INV-QD-041: A structural view states no verdict

A policy rendered without an evaluation carries no verdict mark, no status and
no reason.

**Source**: `packages/devtools/src/react/PolicyTree.tsx` — one component renders
the requirement tree for both the inspector and the policy explorer, and
`showStatus` is what separates them.

**Implication**: `inspect(policy, undefined)` marks every node `NeverResolved`,
and that value means two different things depending on why the trace is absent.
In the *inspector* it is truthful and load-bearing: the branch was
short-circuited, and saying so is
[INV-QD-040](#inv-qd-040-the-inspector-never-claims-more-than-the-trace-does).
In a screen describing a rule nobody has run, the same value would say a policy
was skipped when it was never evaluated at all — a claim about an evaluation
that did not happen.

So `showStatus` is not a display preference. It is the difference between
reporting an evaluation and describing a rule, and both screens go through one
component precisely so the difference cannot drift into two.

A field restriction is the exception, and deliberately: `hasPermission(read,
{ fields: [...] })` narrows what the *rule* grants, so it belongs in a
structural view. Describing a field-narrowed permission as a bare requirement
overstates the grant, which is the direction of error a reviewer acts on
([INV-QD-004](#inv-qd-004-the-field-lattice)).

**Enforcement**: `packages/devtools/test/react/PolicyExplorer.test.tsx` asserts
no `data-status` attribute, no `never resolved` text and none of the three
verdict marks anywhere on the screen; `DevtoolsDock.test.tsx` asserts the same
policy carries a status in the inspector and none in the explorer.

**Related**: [BEH-QD-212](behaviors/28-devtools-screens.md), [ADR-QD-047](decisions/047-a-headless-devtools-model.md).

## INV-QD-042: A simulation reaches no port it was not given, and records nothing

A simulated evaluation resolves every attribute, relationship and history
question through the source it was given, writes no `DecisionRecord`, and
neither reads from nor writes to the application's decision cache — in **all
three** source modes, `Live` included.

**Source**: `packages/devtools/src/model/Simulation.ts` — `simulationLayer`
supplies `CurrentSubject`, the three ports, `EvaluationId`, and shadows
`DecisionSink` and `DecisionCache`.

**Implication**: the seal is **shadowing, not omission**, and the distinction is
the whole property. `Effect.provide` adds to a context and cannot remove from
one, so providing the five services `evaluate` requires does not stop it finding
an optional one already in scope — and it reads two optionally. Left unshadowed,
a what-if sweep of eight edits writes **eight fabricated decisions into the real
log** and eight entries into the real cache, indistinguishable on screen from
decisions somebody actually asked for. Fabricating audit rows from a debug panel
is a defect rather than a trade-off, which is why the shadowing is unconditional
rather than a mode.

`CurrentSubject` is never taken from a supplied layer even in `Live` mode: the
subject is the thing being simulated, so a layer able to supply one could change
*what is being asked* rather than merely how it is answered. That exclusion lives
in the type — `LiveSource` carries
`Layer<Exclude<EvaluationServices, CurrentSubject | EvaluationId>>` — rather than
in a convention.

**Enforcement**: `packages/devtools/test/model/Simulation.test.ts` runs a
simulation beside a real `decisionSinkRing` and asserts the ring is empty, and
beside a layer whose every port dies and asserts the simulation still decides;
`Sources.test.ts` repeats both for `Snapshot` and `Live`;
`WhatIf.test.ts` asserts the same of a sweep of more than twenty rows.

**Related**: [BEH-QD-219](behaviors/29-devtools-simulator.md), [ADR-QD-050](decisions/050-a-simulation-is-sealed.md).

## INV-QD-043: A snapshot answers what the live layer answered

Replaying a captured set of answers produces the same trace the run that
captured them produced, including its failures.

**Source**: `packages/devtools/src/model/Capture.ts` — `capturing` wraps a layer
and records each `(query → answer)`; `replayLayer` answers from that record.

**Implication**: this is an **agreement property** in the family of INV-QD-018
and INV-QD-038 — two paths answering one question — and it drifts the way those
do. Three things keep it from drifting:

A capture records **answers, not calls**. `@qadi/testing`'s
`recordingAttributeResolver` records the attribute *name*, which answers "was
this consulted" and cannot answer "with what".

A captured **failure replays as a failure**. Turning an outage into a miss would
make a snapshot disagree with the run that produced it in exactly the direction
that matters: fail-closed defaults deny, and so a replayed outage would look like
a correctly-denying policy rather than a broken port ([INV-QD-006](#inv-qd-006-a-failure-is-not-a-denial)).

The **keys are written once** and called from both sides. Two functions deriving
one key would make this invariant fail in a way no single test of either side
could see. Every key includes the subject, because the subject is the axis a
what-if sweep varies: a capture taken for `alice` must not answer a question
asked about `bob` after her `editor` role was dropped.

A query the capture never saw answers the **fail-closed default** — `undefined`
for an attribute, `Unknown` for a relationship and for history — which is what a
real deployment gets from an unwired port ([INV-QD-007](#inv-qd-007-fail-closed)),
so a sweep that wanders outside the captured set denies for a reason a
deployment would rather than for one peculiar to this panel.

**Enforcement**: `packages/devtools/test/model/Capture.test.ts` captures against
a fixture layer, replays, and asserts `diffTraces` between the two runs is empty;
it asserts a captured failure replays as the same error class with the same
cause, that two queries to one port are keyed apart, and that a relationship
keyed by `(subject, relation, resource)` does not collapse to the relation alone.

**Related**: [BEH-QD-221](behaviors/29-devtools-simulator.md), [ADR-QD-050](decisions/050-a-simulation-is-sealed.md).

## INV-QD-044: A span never carries a resolved attribute's value

`qadi.attribute` records the attribute's **name**, the subject it was asked
about, and whether a value came back. It never records the value.

**Source**: `packages/core/src/Evaluate.ts` — `resolveAttribute` annotates
`qadi.resolved` with `value !== undefined`, a boolean.

**Implication**: a span attribute is not a debug print. It reaches whatever
tracing backend the host wired, is retained there on that backend's terms, and
is readable by anyone with access to it — which is a wider and longer-lived
audience than the code that asked for the attribute.

The other two ports are safe to report in full, and the contrast is the whole
reason this invariant names only one of them: `hasActed` and `hasRelationship`
answer with **closed three-valued enums** — `Acted`/`NotActed`/`Unknown` and
`Related`/`Unrelated`/`Unknown` — which disclose no more than a policy tag does.
An attribute resolves to arbitrary data: a clearance level, a department, a
security label, a patient identifier. The library cannot know which, so it
records none of them.

This is the line [BEH-QD-147](behaviors/19-hydration.md) already draws in the
other direction — `dehydrateDecisions` withholds a trace by default because it
"names every node's tag, its label and the sentence explaining why it refused".
Same reasoning, same default, opposite boundary.

**`qadi.resolved` is a boolean and not a presence check on the trace**, because
the distinction it draws is one a reviewer acts on: an attribute the store did
not have denies for a different reason than one it had and that compared wrong,
and only the first sends somebody to look at their wiring
([INV-QD-029](#inv-qd-029-an-unwired-port-names-its-own-absence)).

**Enforcement**: `packages/core/test/Evaluate.test.ts` resolves an attribute
whose value is a recognisable sentinel and asserts the sentinel appears in **no**
span the evaluation emitted — every span, not only the attribute's own, because
the question is where a value could leak rather than where it was meant to.
`packages/devtools/test/model/PortCalls.test.ts` asserts the decoded row carries
no value field.

**Related**: [BEH-QD-227](behaviors/30-port-calls.md), [ADR-QD-051](decisions/051-a-span-says-what-was-asked.md).

## INV-QD-045: No entry leaves hydration unaccounted for

Every entry offered to `dehydrateDecisions` is either counted as dehydrated or
counted as dropped, with a reason. Every entry in a payload handed to
`hydrateDecisions` is either counted as seeded or counted as dropped, with a
reason. Neither function loses one silently.

**Source**: `packages/react/src/Hydration.ts`, through
`packages/react/src/HydrationCounts.ts` — the counts are conservation laws over
the two partitions each function performs.

**Implication**: this is an **availability** invariant rather than a security
one, and it is the only one in this document that is. Nothing here can leak a
decision or grant a subject something they lack; the failure it prevents is a
page that quietly re-decides everything from scratch while every signal says
hydration is working. That failure is invisible by construction — the correct
outcome of a dropped entry is *ask the question properly*, which is also what a
page with nothing to hydrate does.

Hydration had **four** exits by which an entry could be discarded and only one of
them was ever announced ([BEH-QD-230](behaviors/19-hydration.md)). The one that
was is the one somebody went looking for; the other three were found by
enumerating them, which is why this invariant is stated as a conservation law
over the whole partition rather than as a list of the cases known today. A fifth
exit added without a count is a failure of this invariant, not a gap in it.

**The two ends are not one sum.** `dehydrated` and `seeded` are process-wide
aggregates over different populations — a server builds payloads for many
clients, a browser seeds payloads it did not build — so the invariant holds
*per call*, and subtracting one total from the other is a comparison
[BEH-QD-232](behaviors/19-hydration.md) explicitly refuses where it would go
negative.

**Enforcement**: `packages/react/test/HydrationCounts.test.ts` asserts the
partition for both functions, including that an empty payload lands in neither
bin — a working system must not report a fault on every request that happened to
ask no questions.

**Related**: [BEH-QD-230](behaviors/19-hydration.md), [BEH-QD-231](behaviors/19-hydration.md), [ADR-QD-052](decisions/052-hydration-is-counted-where-both-ends-can-see-it.md).

## INV-QD-046: Instrumentation never changes what a guard renders

With `instrument` off, no guard registers and no marker element exists. With it
on, a guard renders the same node it rendered before, wrapped in an element that
generates no box.

**Source**: `packages/react/src/useGate.ts` and `components.tsx` — the branching
that chooses what to render is untouched by the flag, and the marker's
`display: contents` generates no layout box.

**Implication**: an observability feature that changed the thing it observes is
worse than no observability, because the reader trusts what it shows. Two
different failures are prevented here and they are not the same one.

**A DOM that changes on upgrade.** Off has to mean *absent*, not inert. A wrapper
rendered unconditionally with a no-op style would still break a consumer's
snapshot tests, their `:first-child` selectors, and any query counting immediate
children — on a version bump, for a feature they never asked for.

**A layout that changes when the panel is opened.** `display: contents` is what
makes the marker affordable at all: it generates no box, so flex and grid
children, margin collapsing and adjacency selectors all behave exactly as they
did. A `<span>` with default styling would reflow a flex row the moment somebody
started debugging it — and the bug would move.

**The flag is not a feature switch on behaviour.** It gates *recording*, never
deciding. `useGate` reads its decision and branches identically either way, and
the hooks below the check run unconditionally, because the rules of hooks do not
bend for a debug feature.

**Enforcement**: `packages/react/test/GateRegistry.test.tsx` asserts that an
uninstrumented tree registers nothing and renders no wrapper at all, and that an
instrumented marker carries `display: contents`. The stronger evidence is
indirect and worth more: the **127 tests that existed before this feature pass
untouched**, none of them instrumented.

**Related**: [BEH-QD-233](behaviors/28-devtools-screens.md), [BEH-QD-234](behaviors/28-devtools-screens.md), [ADR-QD-053](decisions/053-a-gate-can-be-found.md).
