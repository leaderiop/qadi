# Runtime Invariants

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-INV                                       |
> | Revision       | 1.7                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.7 (2026-07-26): INV-QD-018, predicate agreement (CCR-QD-020)<br>1.6 (2026-07-26): INV-QD-017, rule tables; INV-QD-005 defers to it (CCR-QD-019)<br>1.5 (2026-07-26): INV-QD-016, subject sets (CCR-QD-018)<br>1.4 (2026-07-26): INV-QD-015, label dominance (CCR-QD-017)<br>1.3 (2026-07-26): INV-QD-014, the history port; INV-QD-008 restated as "given the same history" (CCR-QD-016)<br>1.2 (2026-07-26): INV-QD-012 and INV-QD-013, obligations (CCR-QD-015)<br>1.1 (2026-07-26): INV-QD-011, the action dimension (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

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

**Source**: `RelationshipResolverNever` returns `false`;
`CurrentSubjectAnonymous` holds no roles or permissions; `AttributeResolverNone`
resolves to `undefined`, which satisfies no matcher.

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
