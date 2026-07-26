# 00 — Access Control Model Adoption Matrix

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-00                                    |
> | Revision       | 1.20                                           |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.20 (2026-07-26): MLS to Shipped — `join` and `meet` reinstated on MOD-QD-029's own argument (ADR-QD-029, CCR-QD-030)<br>1.19 (2026-07-26): Bell–LaPadula and MLS status disagreement closed — 27 to Shipped on a borrowed `@REQ-QD-013`, 29 to Shipped, in part as a ceiling; MLS verified as `@REQ-QD-021`; the order laws proven under INV-QD-019 (CCR-QD-024)<br>1.18 (2026-07-26): Both Biba variants verified as `@REQ-QD-020`; the low-water-mark E5 finding withdrawn — the original E1/E4 answer was right; `Shipped, in part` added to the §1.1 legend; the Bell–LaPadula and MLS status disagreement recorded as open (CCR-QD-023)<br>1.17 (2026-07-26): Chinese Wall and TBAC verified; HBAC corrected to Shipped, in part; the §3.3 fence claim and the four-sketch note corrected (CCR-QD-022)<br>1.16 (2026-07-26): Static separation of duty verified; the §3.3 static row corrected to Shipped, in part (CCR-QD-021)<br>1.15 (2026-07-26): E7 shipped; ADR-QD-024 Accepted; phase 5 complete; every enabler shipped (CCR-QD-020)<br>1.14 (2026-07-26): E3 shipped; ADR-QD-023 Accepted; two §3.3 claims corrected (CCR-QD-019)<br>1.13 (2026-07-26): E6 shipped; ADR-QD-022 Accepted; phase 4 complete (CCR-QD-018)<br>1.12 (2026-07-26): E4 shipped; ADR-QD-021 Accepted; the §3.3 dominance note resolved (CCR-QD-017)<br>1.11 (2026-07-26): E5 shipped; ADR-QD-020 Accepted; the §3.3 trap resolved (CCR-QD-016)<br>1.10 (2026-07-26): E2 shipped; ADR-QD-019 Accepted (CCR-QD-015)<br>1.9 (2026-07-26): E2 decided in ADR-QD-019; two further claims corrected (CCR-QD-014)<br>1.8 (2026-07-26): E1 shipped; ADR-QD-018 Accepted; two claims corrected in §3.4 and §6 (CCR-QD-012)<br>1.7 (2026-07-26): E1 decided in ADR-QD-018 (CCR-QD-011)<br>1.6 (2026-07-26): Span emission verified, unblocking E2 (CCR-QD-010)<br>1.5 (2026-07-26): Phase 0 complete; relationship short-circuit gap closed (CCR-QD-009)<br>1.4 (2026-07-26): Model set complete at thirty-eight; four further claims corrected (CCR-QD-008)<br>1.3 (2026-07-26): Wiring-only models documented; two expressiveness limits recorded (CCR-QD-007)<br>1.2 (2026-07-26): Shipped models documented; three API claims corrected (CCR-QD-006)<br>1.1 (2026-07-26): Package-scope conflict resolved (CCR-QD-005)<br>1.0 (2026-07-26): Initial release (CCR-QD-004) |

---

This document is **not normative**. It records which access control models Qadi
can express, which it cannot yet, and what each missing one would cost. A model
becomes normative only when it acquires a behaviour in [behaviors](../behaviors/03-policy-adt.md),
an invariant in [invariants](../invariants.md), and a scenario tagged
`@REQ-QD-NNN` — see the [Definitions of Done](../process/definitions-of-done.md).

The distinction matters because the predecessor library shipped compliance
primitives that were never assembled and qualification evidence asserting
untested properties ([ADR-QD-016](../decisions/016-gxp-out-of-scope.md)). A
planning document that allocates `BEH-QD` identifiers to unbuilt capability
would repeat exactly that mistake. Model documents therefore use their own
`MOD-QD-NNN` series, which carries no verification claim.

```
REQUIREMENT: A model document MUST NOT allocate BEH-QD, INV-QD or REQ-QD
             identifiers. Those series assert verified behaviour; a model
             document asserts only intent. The predecessor's qualification
             evidence claimed properties no test exercised, and the identifier
             series is what keeps that claim honest here.
```

## 1. How to read this matrix

### 1.1 Status

| Status | Meaning |
| ------ | ------- |
| **Shipped** | Expressible today with the current ADT and services. Covered by tests. |
| **Shipped, in part** | Some variants of the model are Shipped and the rest are named. Each use says whether the remainder is a **stage** on the way to Shipped or a **ceiling** — a declined variant and a deferred one both land here, and the distinction is not recoverable from the status alone. |
| **Wiring** | Expressible today, but requires a resolver implementation the library does not ship. No core change. |
| **Additive** | Requires new core capability that does not change any existing type or wire format. |
| **Breaking** | Requires changing an existing type, evaluator rule or wire format. |
| **Excluded** | Enforced by a mechanism Qadi is not. Documented, not planned. |

### 1.2 Priority

Priority is assigned on demand and cost, not on academic prominence. Bell–LaPadula
is the most cited model in the literature and sits at P3 here, because almost no
application asks for it and it needs a label lattice Qadi does not have.

| Priority | Criterion |
| -------- | --------- |
| **P0** | Shipped. The document records the mapping and the evidence. |
| **P1** | Asked for by ordinary applications; costs a resolver and a recipe. |
| **P2** | Asked for by a recognisable class of application; costs additive core work. |
| **P3** | Rarely asked for, or costs a breaking change, or both. |
| **P4** | Excluded. The document records the boundary and what pairs with Qadi. |

## 2. Enablers

The sixteen models in §3.3 reduce to **seven** pieces of core capability.
Planning by enabler rather than by model is what keeps this from becoming sixteen
independent designs that each bolt a field onto `Policy`.

| Id | Enabler | Nature | Unlocks |
| -- | ------- | ------ | ------- |
| **E1** | Action dimension | **Shipped** | Bell–LaPadula, Biba, MLS, RuBAC, XACML parity, UCON, NGAC, OrBAC, type enforcement |
| **E2** | Obligations on `Decision` | **Shipped** | XACML parity, UCON, purpose-based, consent-based, break-glass |
| **E3** | Combining algorithms | **Shipped** | RuBAC, XACML parity |
| **E4** | Label lattice | **Shipped** | Bell–LaPadula, Biba, MLS, label-based |
| **E5** | Decision history port | **Shipped** | Chinese Wall, history-based, dynamic separation of duty, UCON |
| **E6** | Subject-set evaluation | **Shipped** | NGAC, administrative review tooling |
| **E7** | Predicate output | **Shipped** | Row-level security; cell-level security declined |

### E1 — Action dimension

**Shipped: [ADR-QD-018](../decisions/018-action-dimension.md),
[10 — The Action Dimension](../behaviors/10-actions.md),
[INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one),
`@REQ-QD-010`.**

Before this, an action existed only *inside* a permission token, as the second
segment of `resource:action`
([ADR-QD-007](../decisions/007-permission-token-representation.md)), and was
never an input to evaluation — so no policy could treat reads and writes
differently. That blocked a large family: Bell–LaPadula permits read-down and
write-up, Biba does the reverse, and neither is expressible by a policy that
cannot see the verb.

What landed:

| Addition | Where |
| -------- | ----- |
| `action?: string` | `EvaluateOptions` |
| `action: string \| undefined` | `MatcherContext` |
| `hasAction(action, options?)` → `HasAction` | the policy union, tenth variant |
| `action()` → `ActionRef` | the `ValueRef` union, fifth variant |
| `MissingAction` (`ACL009`) | the error taxonomy |
| `qadi.action` | the `qadi.evaluate` span, when supplied |

Purely additive, as forecast: no existing type changed and no serialized policy
was invalidated. The ADR settles the two questions the model documents left
open. A permission is a grant the subject holds; an action is a property of the
request, and neither may be derived from the other. And an absent action is an
**error**, not a denial — the same rule an absent resource already follows.

One thing the ADR did not foresee: because `evaluateMatcher` is total, a matcher
holding `action()` without one would have resolved to `undefined` and *denied*.
The evaluator therefore checks `referencesAction` before running any matcher.
That check is INV-QD-011, and it is the only non-obvious part of the work.

### E2 — Obligations on `Decision`

`Allow` and `Deny` are `Data.TaggedClass` values with no `Schema`, unlike
`Policy` and `Matcher`. Adding an `obligations` field is therefore **not** a
codec change and cannot reproduce the round-trip defect that motivated the
rewrite.

**Shipped: [ADR-QD-019](../decisions/019-obligations.md),
[11 — Obligations](../behaviors/11-obligations.md),
[INV-QD-012](../invariants.md#inv-qd-012-obligations-are-never-narrowed),
[INV-QD-013](../invariants.md#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation),
`@REQ-QD-011`.**

What landed:

| Addition | Where |
| -------- | ----- |
| `Obligation`, `obligation(id, attributes?, options?)` | a new `Obligation.ts` |
| `obliged(obligation, policy)` → `Obliged` | the policy union, eleventh variant |
| `obligations: ReadonlyArray<Obligation>` | `Allow`, and every `Trace` node |
| `unionObligations` | the merge rule, beside `mergeFields` |
| `onObligations` handler | `EnforceOptions` |
| `UndischargedObligation` (`ACL010`) | the error taxonomy |
| `qadi.obligations` | the `qadi.evaluate` span, when any are owed |

The work was in the evaluator, not the type: `mergeFields` is the only place
sibling results combine, so obligations need an analogue beside it. `Not` was
the hard case — negating a policy that carries an obligation is not obviously
meaningful — and the ADR dissolved it rather than choosing among the three
candidates the model documents offered. An obligation is a condition on
permission, so the obligations on a decision are those contributed by the allow
that was returned; `Not` is handed a set in neither of its two cases. Building it
made that mechanical: mutating `Not` to propagate its child's obligations kills
no test, because the mutant is *equivalent*.

It corrects two things this matrix and [26 — XACML](./26-xacml.md) had assumed.
Obligations **union and never intersect** — they are the opposite lattice to
field visibility, where narrowing is safe and here it is a quiet grant — so
`FieldStrategy` must not govern them and there is no strategy to configure. And
`Obliged` *is* a codec change: adding a field to `Allow` is not, but the new
policy node is, with the same four coordinated edits any variant costs.

The ADR also settled a question the model documents never asked: `enforce` must
**fail** on an `Allow` carrying a non-advisory obligation it cannot discharge,
rather than run the guarded effect while the condition goes unmet. In building it
the same test extended the rule to `assert` and `filter` — everything that runs
work or hands back data enforces; `decide` and `check` only report.

### E3 — Combining algorithms

**Shipped: [ADR-QD-023](../decisions/023-combining-algorithms.md),
[15 — Rule Tables](../behaviors/15-rules.md),
[INV-QD-017](../invariants.md#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden),
`@REQ-QD-015`.**

`FieldStrategy` governs *field-set merging only*. The allow/deny rule was
hard-coded in `evaluateAllOf` and `evaluateAnyOf`, and `AllOf`/`AnyOf` are
unordered sets. XACML's `deny-overrides`, `permit-overrides` and
`first-applicable`, and rule-based access control's ordered first-match, had no
representation.

| Addition | Where |
| -------- | ----- |
| `rules(rules, options?)` → `Rules` | the policy union, fourteenth variant |
| `Rule`, `permitWhen`, `denyWhen` | `Policy.ts` — two members, `condition` and `effect` |
| `Combining` — `FirstApplicable` \| `DenyOverrides` \| `PermitOverrides` | the schema |
| `RuleEffect` — `Permit` \| `Deny` | the schema |
| `evaluateRules` | `Evaluate.ts`, beside the two combinators |
| a `reason` on an *allowing* trace node | the first in the library |

**The fix did not change what `AllOf` and `AnyOf` mean.** This section forecast
that it would, and it is why E3 sat in phase 5. The honest fix turned out to be a
new variant that leaves both untouched, and
[MOD-QD-025](./25-rubac.md) had already argued for it: a `combining` field on the
existing combinators would have to be *required*, for the reason
[ADR-QD-006](../decisions/006-field-strategy-always-encoded.md) makes
`fieldStrategy` required, and a required field rejects every policy already
serialized. **E3 is breaking for the other reason** — a decoder predating `Rules`
rejects a policy containing one — which is a wire-format break rather than a
semantic one, and no existing policy or test changed meaning.

**It shipped narrower than designed, and the narrowing is one decision.** Exactly
one rule decides a table under every algorithm, so there is nothing to merge:
`Rules` needs no `fieldStrategy`, and obligations need no new rule because they
are the deciding rule's — [ADR-QD-019](../decisions/019-obligations.md)'s
sentence applied unchanged. `fields` and `label` on a row went with it, since a
condition is an ordinary policy that already carries both. Three of the six
fields [MOD-QD-025](./25-rubac.md) sketched did not ship.

**[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) held, by
being handed the question rather than a third clause.** Stopping is a property of
a boolean operator there and of the *algorithm* here, so `Rules` is governed by
[INV-QD-017](../invariants.md#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden)
— one sentence covering three algorithms — and INV-QD-005 defers to it.
Enumerating a third node would have left that invariant true by listing.

### E4 — Label lattice

**Shipped: [ADR-QD-021](../decisions/021-label-lattice.md),
[13 — The Label Lattice](../behaviors/13-labels.md),
[INV-QD-015](../invariants.md#inv-qd-015-incomparable-labels-deny-in-both-directions),
`@REQ-QD-013`.**

A security label is a `(level, compartments)` pair ordered by dominance. Qadi had
matchers for equality, membership and ordering on numbers, none for dominance,
and nowhere to declare a lattice.

| Addition | Where |
| -------- | ----- |
| `SecurityLabel`, `isSecurityLabel` | a new `SecurityLabel.ts` |
| `LabelOrdering`, `compareLabels`, `labelDominates` | the four-valued comparison |
| `dominates(ref)` → `Dominates` | the matcher union, twelfth variant |

**The lattice is declared nowhere**, which was the first open question. §3.3's
three options were a service holding it, a field on the matcher, or restricting
to `(level, compartments)` computed structurally; the third wins outright — no
configuration surface, no ambient state, no two policies disagreeing about the
order they were written against.

**Four values, not two, and cheaper than forecast.** The comparison distinguishes
`Equal`, `Dominates`, `DominatedBy` and `Incomparable`; the matcher's boolean is
*derived* from it. And the label never enters a policy — `Dominates` carries a
`ValueRef` and no label, so both operands are runtime data. That removes the cost
[MOD-QD-027](./27-bell-lapadula.md) called "the one that matters": there is no
`SecurityLabel` codec, no canonical set ordering, and no round-trip hazard.

**The ★-property trap in §3.3 disappears with it.** 27 had to warn that
descending `anyOf` rungs are correct for reads and wrong for writes, because the
permitted sets shrink as clearance rises. With a real comparison there are no
rungs to order wrongly.

### E5 — Decision history port

**Shipped: [ADR-QD-020](../decisions/020-decision-history-port.md),
[12 — Decision History](../behaviors/12-history.md),
[INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities),
`@REQ-QD-012`.**

Chinese Wall grants or denies based on what the subject has *already* accessed,
and Qadi held no history. This was the enabler most at risk of violating scope: a
history port has to be a *port* — the caller's store, behind an interface,
exactly as `RelationshipResolver` is — or Qadi starts persisting, which
[the URS](../urs.md) forbids.

| Addition | Where |
| -------- | ----- |
| `DecisionHistory`, `ActedQuery`, `ActedResult` | a new `DecisionHistory.ts` |
| `hasActed(event, options?)`, `hasNotActed(event, options?)` | the policy union, twelfth and thirteenth variants |
| `HistoryScope` — `"Resource"` \| `"Any"` | the schema |
| `DecisionHistoryUnknown`, `decisionHistoryFromEvents` | the layers |
| `DecisionHistoryUnavailable` (`ACL011`) | the error taxonomy |

It shipped **narrower than three of the four sketches**, and one member wide: a
read, no write, no `Engagement` type. The scope discipline held.

**The trap §3.3 recorded was worse than recorded, and that is this enabler's
finding.** A `false`-answering default grants under `hasNotActed`; a
`true`-answering one grants under `hasActed`. No boolean default is fail-closed
for both polarities, and the sketches proposed shipping both. The port is
therefore **three-valued** — `"Acted" | "NotActed" | "Unknown"` — and `"Unknown"`
satisfies neither. One default, no polarity argument left to get wrong.

Its corollary is the sharpest rule in the library: **`hasNotActed(e)` is not
`not(hasActed(e))`**. `not` inverts a decision, so under `"Unknown"` it turns the
denial into an allow, from a port nobody wired.

**Chinese Wall needed nothing further.** Brewer–Nash is two questions this port
already answers, so [MOD-QD-030](./30-chinese-wall.md)'s `Engagement` union and
`withinWall` variant were declined rather than deferred — and the equivalence is
asserted by test, not by argument.

### E6 — Subject-set evaluation

**Shipped: [ADR-QD-022](../decisions/022-subject-set-evaluation.md),
[14 — Subject Sets](../behaviors/14-subject-sets.md),
[INV-QD-016](../invariants.md#inv-qd-016-a-batch-decision-is-the-decision-made-alone),
`@REQ-QD-014`.**

The transpose of `Qadi.filter`: one policy against many subjects, answering
"who can see this?". Long on the [roadmap](../roadmap.md) as *Batch subject
evaluation*, and listed here because NGAC's review queries depend on it.

| Addition | Where |
| -------- | ----- |
| `decideSubjects`, `filterSubjects` | `SubjectSet.ts`, a new module |
| `SubjectDecision` | one subject paired with its decision |
| `SubjectSetServices` | `Exclude<EvaluationServices, CurrentSubject>` |
| `qadiReviewLayer` | `@qadi/testing` — the environment with no subject in it |

The first enabler to touch neither `Policy` nor the codec, and the first to add
no error: it is a second way to call the evaluator, not a new thing to say in a
policy.

This document recorded E6 as carrying **no design question**. That was very
nearly right, and the one it missed changes the public type. The roadmap's own
phrasing — *"the subject comes from the environment rather than a parameter"* —
was read here as an inconvenience to work around. It is instead the answer: each
element is *provided* as the subject for its own evaluation, which discharges the
requirement, so these are the only entry points in the library that do not ask
for a `CurrentSubject`. **A review query is asked by nobody**, and before this
there was nowhere in Qadi that could be true.

The second consequence is that subject sets **report** rather than enforce. The
resemblance to `filter` — both return a list — is misleading: `filter` hands
back resources, and these hand back *identities*, to an administrator rather than
to the subjects named. Nobody is being given access, so there is no permission
for an obligation to condition, and discharging would fire every duty once per
candidate for accesses that never happened.

### E7 — Predicate output

**Shipped: [ADR-QD-024](../decisions/024-predicate-output.md),
[16 — Predicate Output](../behaviors/16-predicates.md),
[INV-QD-018](../invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows),
`@REQ-QD-016`.**

Row-level security cannot be expressed as a decision about one resource; it is a
decision that *produces a filter* to push into a query. Qadi's evaluator returns
`Allow | Deny`. Returning a predicate is a different return type and a different
contract, and this document called it the single largest departure from the
current design. That assessment holds: E7 is the only enabler that added a
**second interpreter over the policy tree** rather than a new thing to say in a
policy or a second way to call the one interpreter there was.

| Addition | Where |
| -------- | ----- |
| `Predicate`, `CompareOp` | a new `Predicate.ts` |
| `toPredicate(policy, options?)` | the translator — folds the subject, emits columns |
| `evaluatePredicate(predicate, row)` | the reference semantics |
| `PredicateServices`, `PredicateOptions` | narrower than `EvaluationServices` |
| `referencesResource` | `Matcher.ts`, beside `referencesAction` |
| `PolicyNotTranslatable` (`ACL012`) | the error taxonomy |

**The risk this enabler carried was different in kind from every other one, and
the answer is the reference interpreter.** [MOD-QD-035](./35-row-level.md) named
it: *"two interpreters over one tree must agree, and nothing enforces that they
do — a divergence is an authorisation defect no round-trip test catches."* Every
other enabler could be verified by asserting what the one evaluator did. This one
cannot, and the answer is that the predicate is **executable**: `evaluatePredicate`
makes the agreement a property that can be *run*
([INV-QD-018](../invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows)),
and it makes the caller's own SQL compiler testable, which is the part of this
feature that would otherwise be unverifiable in principle. 35 demanded the
property and did not notice it was unobtainable without that export.

**It ships answering which rows, never which columns**, and refuses rather than
approximates: a policy carrying a `fields` restriction anywhere in the tree does
not translate, because a row filter alone would let a caller select columns the
policy withheld. That refusal is stricter than 35 contemplated and it is what
keeps [36 — Cell-Level Security](./36-cell-level.md)'s declined half declined.
`Obliged` is refused for the parallel reason — a predicate has no channel to carry
a duty.

**E3 composes into it.** A rule table translates: the overrides are one formula
each, and `FirstApplicable` costs O(n²) conjuncts because every `Permit` row must
exclude every row above it. `DenyOverrides` over a tenancy column is the shape
[35](./35-row-level.md) says every multi-tenant application asks for, and before
E3 it could not be written at all.

## 3. The matrix

Model documents are written as adoption proceeds. Until a model's document
exists, this table is the record.

### 3.1 Shipped — P0

Documented. Every worked example in these seven is compiled by CI, so a
signature that drifts fails the build rather than the reader.

| Model | Document | Expressed by | Evidence |
| ----- | -------- | ------------ | -------- |
| Role-based (RBAC₀, RBAC₁) | [MOD-QD-001](./01-rbac.md) | `hasRole`, `anyOfRoles`, role DAG | `REQ-QD-003`, [ADR-QD-015](../decisions/015-role-dag-acyclic-by-construction.md) |
| Attribute-based (ABAC) | [MOD-QD-002](./02-abac.md) | `hasAttribute`, `hasResourceAttribute` | `REQ-QD-004`, `REQ-QD-006` |
| Relationship-based (ReBAC) | [MOD-QD-003](./03-rebac.md) | `hasRelationship` | `REQ-QD-005` |
| Capability / permission token | [MOD-QD-004](./04-capability.md) | `hasPermission` | `REQ-QD-001`, [ADR-QD-007](../decisions/007-permission-token-representation.md) |
| Identity-based (IBAC) | [MOD-QD-005](./05-ibac.md) | `subjectId()` value reference | `REQ-QD-009` |
| Content-dependent | [MOD-QD-006](./06-content-dependent.md) | `hasResourceAttribute` | `REQ-QD-006` |
| Field-level authorization | [MOD-QD-007](./07-field-level.md) | `fields` + `fieldStrategy` | `REQ-QD-007`, [INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top) |

Writing them corrected two claims made earlier in this document and one in the
brief they were written from. `hasResourceAttribute` reads a **flat key**, not a
dotted path — descending into a value is `fieldMatch`'s job, and `getByPath`
serves only the `SubjectRef` and `ResourceRef` value references on the other
side of a comparison. A `HasRelationship` node with no resource id fails with
`MissingResourceId` specifically. And `contains` takes a constant rather than a
value reference, so co-ownership is written `someMatch(eq(subjectId()))`.

### 3.2 Wiring only — P1

Documented. No core change: each costs a resolver implementation the caller
writes, because the data behind it is theirs. Grouped by the service they extend.

| Model | Document | Extends | Note |
| ----- | -------- | ------- | ---- |
| Discretionary (DAC) | [MOD-QD-008](./08-dac.md) | `RelationshipResolver` | Ownership is already the shape; a recipe, not a feature |
| Access control lists | [MOD-QD-009](./09-acl.md) | `RelationshipResolver` | An ACL entry is a relation tuple; deny rows are a `Deny` row since E3 |
| Zanzibar-style stores | [MOD-QD-010](./10-zanzibar.md) | `RelationshipResolver` | Adapter for SpiceDB / OpenFGA; `depth` maps to userset rewrite depth |
| Claims-based | [MOD-QD-011](./11-claims.md) | `CurrentSubject` | OIDC claims are subject attributes; the work is mapping, not deciding |
| Context-aware (CBAC) | [MOD-QD-012](./12-context-aware.md) | `AttributeResolver` | Device, network, posture as resolved attributes |
| Temporal (TRBAC) | [MOD-QD-013](./13-temporal.md) | `AttributeResolver` + `Clock` | Must read `Clock`, never `Date.now` — [ADR-QD-012](../decisions/012-deterministic-time-and-ids.md) |
| Spatial (GEO-RBAC) | [MOD-QD-014](./14-spatial.md) | `AttributeResolver` | Geofence test belongs in the resolver, not a matcher |
| Risk-adaptive (RAdAC) | [MOD-QD-015](./15-risk-adaptive.md) | `AttributeResolver` | Risk score in, threshold compared by `lt`; step-up uses `obliged` (E2) |
| Trust / reputation | [MOD-QD-016](./16-trust.md) | `AttributeResolver` | As RAdAC, different provenance and incentive |
| Purpose-based | [MOD-QD-017](./17-purpose.md) | `AttributeResolver` | Purpose as a declared attribute; recording the *declaration* uses `obliged` (E2) |
| Consent-based | [MOD-QD-018](./18-consent.md) | `RelationshipResolver` | Consent is a relation; the data subject collapses into the resource |
| Hierarchical resource scoping | [MOD-QD-019](./19-hierarchy.md) | `RelationshipResolver` | Tenant trees; exceptions to an inherited grant are a `Deny` row since E3 |
| Team-based (TMAC) | [MOD-QD-020](./20-tmac.md) | `RelationshipResolver` | Membership is a relation; role ∧ team is the recipe |
| Organisation-based (OrBAC) | [MOD-QD-021](./21-orbac.md) | `AttributeResolver` | Organisation and view map cleanly; *activity* uses `hasAction` (E1) |
| Type enforcement | [MOD-QD-022](./22-type-enforcement.md) | `AttributeResolver` | Domain–type pairs; the *operation* uses `hasAction` (E1) |
| Label-based | [MOD-QD-023](./23-label-based.md) | `AttributeResolver` | Comparison only; *dominance* needs E4 |

#### Two constraints the P1 documents established

Writing these against the real source found two limits that were not previously
recorded anywhere, and both narrow what a resolver-backed model can express.

**The resource never reaches the resolver.** `RelationshipCheck` carries
`subjectId`, `relation`, `resourceId` and `depth` — nothing else. An adapter
cannot consult another field of the resource, so anything it needs must be
encoded into the id or fixed per resolver layer. `AttributeResolver.resolve`
is narrower still, taking only `(subjectId, attribute)`: it never sees the
resource at all, which is why trust scoped to a particular resource must be a
relationship rather than a resolved attribute.

**Only `eq` and `neq` accept a value reference.** `gte`, `lt` and `contains`
take constants. So a comparison between two *live* values — a clearance against
a resource's level, an expiry against the current time — is not expressible in
the policy tree at all. The workable forms are enumeration with `inArray`, or
deriving the comparison in the resolver and matching the boolean. This is the
sharpest expressiveness limit found in the phase and it affects the temporal,
label-based and type-enforcement models alike.

### 3.3 Core change — P2 and P3

Documented. Every document carries one compiled example, so the gap is
demonstrated rather than asserted. When these were written all proposed API sat in
uncompiled fences, because none of it existed; the rows that have since shipped
carry a compiled example of the **shipped** form beside the workaround, and their
withdrawn sketches stay uncompiled deliberately — so a declined name can never
masquerade as API.

| Model | Document | Status | Enablers | Priority |
| ----- | -------- | ------ | -------- | -------- |
| Separation of duty (RBAC₂), static | [MOD-QD-024](./24-separation-of-duty.md) | **Shipped, in part** | — (assignment-time prevention is excluded) | P2 |
| Separation of duty, dynamic | [MOD-QD-024](./24-separation-of-duty.md) | **Shipped** | — | P3 |
| Purpose enforcement with obligations | [MOD-QD-017](./17-purpose.md) | **Shipped** | — | P2 |
| XACML parity | [MOD-QD-026](./26-xacml.md) | **Shipped, in part** | — (the catalogue is declined) | P2 |
| Rule-based (RuBAC), ordered | [MOD-QD-025](./25-rubac.md) | **Shipped** | — | P2 |
| Usage control (UCON) | [MOD-QD-032](./32-ucon.md) | Breaking | — (continuity is architectural) | P3 |
| Task-based (TBAC) | [MOD-QD-033](./33-tbac.md) | **Shipped** | — | P3 |
| Bell–LaPadula | [MOD-QD-027](./27-bell-lapadula.md) | **Shipped** | — | P3 |
| Biba, strict | [MOD-QD-028](./28-biba.md) | **Shipped** | — | P3 |
| Biba, low-water-mark | [MOD-QD-028](./28-biba.md) | **Shipped** | — | P3 |
| Multi-level security / Denning lattice | [MOD-QD-029](./29-mls.md) | **Shipped** | — (an irregular lattice is still hand-enumerated) | P3 |
| Chinese Wall (Brewer–Nash) | [MOD-QD-030](./30-chinese-wall.md) | **Shipped** | — | P3 |
| History-based (HBAC) | [MOD-QD-031](./31-hbac.md) | **Shipped, in part** | — (the windowed count and the ordering question are deferred) | P3 |
| Next Generation Access Control (NGAC) | [MOD-QD-034](./34-ngac.md) | **Shipped, in part** | — (user-space review is out of reach) | P3 |
| Row-level security | [MOD-QD-035](./35-row-level.md) | **Shipped** | — | P3 |
| Cell-level security | [MOD-QD-036](./36-cell-level.md) | **Shipped, in part** | — (the cell half is declined) | P3 |

#### What the P2/P3 documents corrected here

**~~Low-water-mark Biba needs E5.~~ Withdrawn.** This table previously listed
Biba as needing E1 and E4 alone. Strict Biba does; the low-water-mark relaxation
drops the subject's effective integrity to that of the lowest object it has read,
which is history. Ring policies need no history, because nothing is remembered.

*Corrected in CCR-QD-023.* The relaxation is stateful — that much was right — but
E5 is not the mechanism and E1/E4 alone was the correct answer after all.
`hasActed` answers a membership question about one named event and returns no
value; a water mark is a **minimum over the set of everything read**, so the port
cannot supply it and was deliberately built not to. The caller maintains the mark
and `AttributeResolver` resolves it live. All three Biba variants land on E4, and
[MOD-QD-028](./28-biba.md) records both the rejected event-encoding route and the
hazard the resolver route carries: per BEH-QD-034 a static attribute of the same
name **shadows** the mark and fails open. This is the one correction in this
section where the original table was right and the model document talked it out
of being right.

**~~Open: two rows above are unearned, in the other direction.~~ Closed in
CCR-QD-024.** Both Biba rows read **Shipped** and, as of CCR-QD-023, are covered
by `@REQ-QD-020`. The Bell–LaPadula and MLS rows also read **Shipped**, applied by
the same commit that built E4 — but [MOD-QD-027](./27-bell-lapadula.md) and
[MOD-QD-029](./29-mls.md) still say **Additive** in their own Status sections, so
document and table disagree. By the definition in §1.1 the word requires tests:
27 is covered in substance by `@REQ-QD-013`, whose feature file is titled for it;
29 is not covered by anything.

*Both audited. 27 was right and 29 was not.* 27 moves to **Shipped**, citing
`@REQ-QD-013` as a **borrowed** tag rather than allocating a second one over the
same nine scenarios. 29 moves to **Shipped, in part** — a **ceiling** — because it
defines a lattice as "a partial order with joins" and E4 shipped no joins; three of
the seven laws in its own Verification table turned out unsatisfiable rather than
merely unmet. It gains `@REQ-QD-021`, whose scenarios state the rule as **flow**
with no `hasAction`, which is the claim that the general model needs E4 alone.

**And both documents asked for the same missing evidence.** 27 and 29 each
prescribed property tests over generated lattices for reflexivity, antisymmetry
and transitivity; neither got them, and `grep` for either word across `packages/`
returned nothing. They now exist as
[INV-QD-019](../invariants.md#inv-qd-019-dominance-is-a-partial-order). The
finding worth keeping is why it matters: 27's "composite property" — that no
sequence of permitted reads and writes moves information downwards — **is**
transitivity, so the ★-property's guarantee is a consequence of the order being an
order rather than a rule the evaluator enforces. Nothing had tested that dominance
composes.

**E1 was the highest-leverage enabler, and this table understated it.** Three
models — OrBAC's *activity*, type enforcement's *operation*, and NGAC's
*operation sets* — were each blocked on the action dimension alone, on top of the
five listed against E1 in §2. That is why it went first. It has shipped; the
enabler column above no longer lists it, and the models that named it are each
one requirement lighter.

**NGAC ships in part, and the part is the one worth having.** Both enablers it
named have landed, so the shape [MOD-QD-034](./34-ngac.md) actually recommends —
the policy graph behind a `RelationshipResolver`, the operation carried by
`hasAction`, review queries in both directions — is fully expressible. The graph
itself was declined, not deferred, so "Shipped, in part" is the ceiling for this
row rather than a stage on the way to "Shipped".

*E7 narrowed the remaining gap to exactly one half.* This paragraph treated
"review over the whole user or object space" as one item; it is two, and they are
not symmetric. `toPredicate` inverts a policy into a filter over **rows**, which is
object-space review. User-space review does not follow and never will: the
translator **folds** the subject to constants, which is the opposite of inverting
it, and it would need the subject store [the URS](../urs.md) forbids.

**A negated port inverts the fail-closed default.** `RelationshipResolverNever`
fails closed by answering `false` because `hasRelationship` is positive. E5's
natural node is *negative* — "has this subject not already acted?" — so a
`false`-answering default layer would **grant**. The obvious implementation of
E5's default breaches [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed).
Four documents depend on E5, so this belongs here and not only in
[MOD-QD-024](./24-separation-of-duty.md), which found it.

*Resolved, and it was worse than this.* Both 24 and 31 answered it with a
`true`-answering default named `DecisionHistoryAssumeActed`, which fixes
`hasNotActed` and breaks `hasActed` — and 31 proposed shipping both polarities.
**No boolean default is fail-closed for both.** The port shipped three-valued;
see [E5](#e5--decision-history-port) and
[ADR-QD-020](../decisions/020-decision-history-port.md).

**Dominance is a partial order, and a boolean matcher loses that.**
`(Secret, {CRYPTO})` and `(Secret, {BIO})` are incomparable. A `Dominates`
matcher returning `boolean` collapses "incomparable" into "false" — correct as a
dominance *test*, wrong for anything needing to distinguish the two. E4's design
should define the boolean in terms of a three-valued comparison.

*Resolved, and the count was four rather than three:*
[ADR-QD-021](../decisions/021-label-lattice.md) names `Equal` separately from
`Dominates`, because a caller explaining a decision wants to know which. The
matcher stays boolean and that is safe here — both directions of the rule are
asked by *swapping the operands*, never by negating the answer, which is exactly
what distinguishes this from [E5](#e5--decision-history-port), where negation was
the only other route and forced a third value into the *port*.

**The three E5 sketches do not agree, and that is the point of writing them.**
[MOD-QD-024](./24-separation-of-duty.md) proposes `hasActed` keyed by resource;
[MOD-QD-030](./30-chinese-wall.md) proposes an `engagement` read returning three
cases *plus* a write member; [MOD-QD-031](./31-hbac.md) settles a general
`hasActed` with an optional resource key and argues the write is not an
evaluation service at all. [MOD-QD-033](./33-tbac.md) spells the policy node's
parameter `action` where 024 spells it `relation`. These are four independent
attempts at one interface and they diverge on: whether the read returns a boolean
or a value, whether the port also writes, and what the parameter is called.

The divergence is useful rather than embarrassing — it is what a design review
would have surfaced, arrived at cheaply. E5's ADR must settle all four points
before any code, and the safest default remains the one from §3.3 above: the
fail-closed polarity inverts for a negative node.

*Settled, and the code followed rather than preceded it.*
[ADR-QD-020](../decisions/020-decision-history-port.md) answers all four points —
a three-valued read, one member, no write, and `event`. The second half of that
last sentence is the claim the *Resolved* note above overturns: there is no safest
boolean default, which is why the port is not boolean. All four sketches are now
annotated in their own documents (CCR-QD-021, CCR-QD-022) rather than deleted, so
the divergence stays on the record — and two of them turn out to have reached the
three-valued answer from opposite directions without either having the whole
argument.

**A write path would cost more than the read.** Chinese Wall needs an access
*recorded* for the wall to exist. If Qadi's evaluator writes, it is no longer
pure and [INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history)
weakens from "reproducible" to "reproducible given identical prior writes". The
recommendation across the E5 documents is consistent and worth stating once here:
the port reads, the caller writes after acting on a decision.

### 3.4 Excluded — P4

Documented in [MOD-QD-037](./37-excluded.md). Qadi decides. It does not
authenticate, persist, or administer. These models are enforced by a mechanism
Qadi is not, and the honest answer is a boundary plus a pointer to what pairs
with it.

| Model | Enforced by | Pairs with Qadi how |
| ----- | ----------- | -------------------- |
| Attribute-based encryption, functional and predicate encryption, proxy re-encryption | Cryptography | The ciphertext enforces the policy; Qadi cannot be in the path |
| SPKI/SDSI, RT, PERMIS, macaroons, biscuits, UCANs | Certificate and token chain verification | Verify the chain, then present the result as an `AuthSubject` |
| Administrative RBAC, HRU, Take–Grant, Typed Access Matrix | Administration and safety analysis | Out of scope per [the URS](../urs.md); Qadi has no administrative surface |
| Clark–Wilson | Certified transaction procedures | Integrity of the transaction, not of the decision |
| Information flow control, DIFC | Language runtime or OS | Taint propagation is not a decision Qadi returns |
| Object capabilities | Language reference graph | No ambient authority is a language property |
| Sticky policies | Data format | Policy travels with the data; Qadi could evaluate one once extracted |
| Zero Trust, JIT / zero standing privilege, PAM, break-glass audit | Architecture and operations | Qadi is a component; break-glass additionally needs an audit trail, excluded per [ADR-QD-016](../decisions/016-gxp-out-of-scope.md) |

## 4. Cross-reference against the existing roadmap

The [roadmap](../roadmap.md) predates this document. Four of its items interact
with model adoption, and one — the package scope — was resolved by it.

| Roadmap item | Interaction |
| ------------ | ----------- |
| Decide the package scope | **Resolved.** See §4.1 |
| Extend short-circuit coverage to relationships | **Closed** (CCR-QD-009). Was a prerequisite for P1, since every P1 model adds relationship lookups; the proof now exists |
| Verify span emission | **Closed** (CCR-QD-010). Was a prerequisite for E2, since obligations report through the span; the collector it needed now exists |
| Batch subject evaluation | **Closed** (CCR-QD-018). Was E6; the roadmap entry was the authority and named the design question this document said did not exist |
| Concurrent evaluation | **Unblocked** (CCR-QD-019), still unbuilt. The algorithm set is settled, so the entry can now be designed — and building E3 added a constraint to design against: the overrides are order-independent in the *verdict* but not in the *deciding rule* |

Both entries in [Known gaps](../urs.md) were verification gaps rather than
capability gaps. One is now closed: relationship short-circuiting is proven, and
closing it also covered `RelationshipResolveError` propagation, which turned out
to be untested entirely. Only the span-emission gap remains.

### 4.1 The package-scope conflict, and how it was resolved

Drafting this document surfaced a contradiction. The roadmap's first blocking
item held that the package scope and the specification infix were placeholders,
that both were embedded in roughly thirty documents, and that renaming "gets
more expensive with each addition, so it should happen before anything else".
This document plans up to thirty-seven more documents. Adoption would have
roughly doubled the cost of a rename already listed as blocking.

The contradiction was resolved in the only direction that preserved both: the
rename was executed first, under CCR-QD-005, before any per-model document was
written. The library was named Qadi, published under the `@qadi` scope, and the
`EG` infix became `QD`.

The name is not decoration. A *qadi* renders judgment; the *adoul* attests
identity and documents; the *makhzen* administers. Those are precisely the three
roles [the URS](../urs.md) separates — Qadi decides, and neither authenticates
nor administers — so the name states the scope boundary that
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md) argues for.

```
REQUIREMENT: Model documents MUST confine `@qadi/` references to import
             statements. Prose MUST name the library "Qadi" and MUST NOT cite a
             package specifier. A rename has now been paid for once; scattering
             specifiers through prose is what makes the second one a review
             rather than a sweep.
```

## 5. Adoption phases

Phases are ordered by dependency, not by value. Nothing here is required for the
library to be correct.

**Phase 0 — Unblock.** ✔ Complete. Package scope and infix resolved
(CCR-QD-005); relationship short-circuit coverage closed (CCR-QD-009). Neither
was model work, and both would have grown more expensive once the model
documents existed.

**Phase 1 — Record what is shipped.** ✔ Seven P0 documents (CCR-QD-006). The
template proof: it corrected three API claims this document had wrong, which is
what it was for.

**Phase 2 — Recipes.** ✔ Sixteen P1 documents (CCR-QD-007). Established the two
expressiveness limits in §3.2. The resolver adapters themselves remain undecided
— documenting the recipe and shipping the adapter are separate commitments.

**Phase 3 — Record what is not built.** ✔ Fourteen P2/P3/P4 documents
(CCR-QD-008), completing the set at thirty-eight. Corrected four further claims,
recorded in §3.3.

Documentation is now complete. What follows is implementation, and none of it is
required for the library to be correct.

**Phase 4 — Additive enablers.** ✔ **E1 (CCR-QD-012).** It went first and by a
clear margin: additive, invalidating no serialized policy, and the sole blocker
for eight models. It shipped complete —
[ADR-QD-018](../decisions/018-action-dimension.md) (now *Accepted*),
[10 — The Action Dimension](../behaviors/10-actions.md),
[INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one),
`@REQ-QD-010`, and the code. One thing the ADR had not foreseen surfaced in the
building: matchers are total, so a matcher reading an absent action would have
*denied* rather than failed, and a `referencesAction` pre-check was needed to
hold the rule. That is the shape to expect from the rest of these.

✔ **E2 (CCR-QD-015).** Additive for `Decision`, a codec change for `Policy`, and
carrying one behavioural consequence beyond the type: `enforce` refuses an allow
whose obligation it cannot discharge. Like E1, it surfaced something the ADR had
not written down — the refusal belongs to `assert` and `filter` too.

✔ **E5 (CCR-QD-016).** Its design question — the polarity of the default layer,
the one genuine safety trap in this matrix — was settled by ADR before any code,
and the answer was that the question had no boolean solution.

✔ **E4 (CCR-QD-017).** Its design question was settled by ADR before code, as
required, and the answer widened rather than narrowed: four values, not three.
Building it also cost *less* than forecast, because the label turned out never to
enter a policy.

✔ **E6 (CCR-QD-018).** Recorded here as carrying no design question, which was
wrong in a way worth keeping. The roadmap had already named it in one clause,
which this document read as an inconvenience to work around rather than as the
answer. Replacing the ambient subject rather than
reading it is what makes a review query askable by nobody, and it removes a
service from the public requirement set rather than adding one.

**Phase 4 is complete.** All five additive enablers have shipped, each with an
ADR settled before its code, and every one of them surfaced something its ADR had
not written down. The two that were *required* to be decided in advance — the
polarity of E5's default layer, which fails open in its obvious implementation,
and whether E4's dominance comparison is two- or three-valued — were the two
where the building found the least to correct, which is the argument for the
rule.

**Phase 5 — Breaking enablers.** ✔ Complete. **E3 (CCR-QD-019).** This phase was framed as
"both change what existing constructs mean", and for E3 that was wrong: the
honest fix was a new variant, and `AllOf`, `AnyOf` and every serialized policy
kept the meaning they had. What is breaking is the wire format in one direction —
a decoder predating `Rules` rejects a policy containing one — which is a real
cost and a different one. Like every enabler before it, building it found
something the ADR had not written down: `Rules` is the first node whose
*allowing* trace carries a reason, because a rule table's first question is which
row hit and it is asked as often of a grant as of a refusal.

✔ **E7 (CCR-QD-020).** The one enabler the phase framing did fit: a second
interpreter over the same tree, returning a different type under a different
contract. It shipped in the form [MOD-QD-035](./35-row-level.md) insisted on and
no wider — an abstract predicate over an explicitly translatable subset, failing
loudly outside it — because *a partial translator that quietly approximates is
worse than no feature*. Its finding is the one that generalises furthest: where
every earlier enabler could be verified by asserting what the single evaluator
did, this one needed the predicate to be **executable** so that the agreement
between two interpreters could be run as a property rather than argued for. That
export turned out to be the more valuable of the two.

**Every enabler in this document has now shipped**, and every one of them
surfaced something its ADR had not written down. Two of the seven shipped
*narrower* than designed (E5's port, E3's rule node), two shipped *wider* (E4's
four-valued comparison, E7's reference interpreter), and one — E6 — removed a
service from the public requirement set rather than adding one. The rule that
produced that record is the one worth keeping: the ADR is written first, and it is
allowed to be wrong in writing.

## 6. Compatibility validation

Adoption must not weaken what already holds. Each invariant is assessed against
the enablers that touch it.

| Invariant | Risk | Assessment |
| --------- | ---- | ---------- |
| [INV-QD-001](../invariants.md#inv-qd-001-permission-key-uniqueness) | E1 — **held** | An action dimension parallel to permission actions could create two spellings of one concept. [ADR-QD-018](../decisions/018-action-dimension.md) made "never derived from or compared against permission segments" the decision itself; nothing in the shipped API relates the two |
| [INV-QD-002](../invariants.md#inv-qd-002-role-graph-acyclicity) | — | Untouched. No enabler alters role construction |
| [INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) | E1, E3 — **held**; E4 | Any new `Policy` variant must be added in four places at once. This is the invariant the rewrite exists to protect. E1 added two variants (`HasAction`, `ActionRef`) and both are in the round-trip property's generator; the `ActionRef` case had to be nested deliberately, since a leaf generator producing only policies would never reach a `ValueRef`. E3 added `Rules`, whose `Rule` is the only *untagged* struct in the codec, and it entered the generator in the same change |
| [INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top) | E3, E7 — **held** | This row expected combining to interact with field merging. It does not: exactly one rule decides, so a rule table merges nothing and carries no `fieldStrategy`. `undefined` remains *top*, and a `Deny` row contributes no set at all — `Not`'s rule, in the first place where the subtree beneath it may have *allowed*. E7 held it by **refusing**: a predicate carries no field dimension, so a policy restricting fields does not translate rather than translating and losing the restriction |
| [INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) | E3, E5 — **held** | Ordered combining changes evaluation order, and rather than gain a third clause the invariant hands the question to [INV-QD-017](../invariants.md#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden): stopping is a property of a boolean operator there and of the *algorithm* here. An invariant true by listing has stopped constraining anything |
| [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) | E5 | A history store that is down is a failure, not a denial. Highest-risk pairing in this table |
| [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) | E5 | An unwired history port must deny. **This row previously said the same of an absent action, and that was wrong**: INV-QD-007 governs information a resolver could not supply, whereas a missing action is input the caller never provided. [ADR-QD-018](../decisions/018-action-dimension.md) routed it to [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) instead, and the rule is now [INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one) |
| [INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) | E5 | History makes evaluation stateful. Reproducibility must be restated as *given the same history*, or the invariant weakens silently |
| [INV-QD-009](../invariants.md#inv-qd-009-guarded-effects-do-not-run-when-denied) | E2 — **held** | Obligations must not become a channel that runs work before the decision is final. They are data; the evaluator invokes nothing, and a caller's handler runs after the decision and before the guarded effect ([INV-QD-013](../invariants.md#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation)) |
| [INV-QD-010](../invariants.md#inv-qd-010-error-codes-are-injective) | all — **held** | Mechanically enforced — `ERROR_CODES` is `satisfies Record<QadiError["_tag"], …>`, so a new error without a code fails compilation. Three enablers added one each: `MissingAction` (ACL009), `UndischargedObligation` (ACL010), `DecisionHistoryUnavailable` (ACL011), `PolicyNotTranslatable` (ACL012) |

**E7 is assessed here rather than in a row of its own, because it touches no
invariant by changing one.** It has its own —
[INV-QD-018](../invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows) —
and it is the only invariant in the set asserted by comparing **two independent
implementations** of the same semantics rather than by inspecting one. Every other
invariant here names a mechanism inside a single code path; this one names an
agreement between two, and the mechanism that holds it is a property test rather
than a type.

**E3 is the first enabler to make an existing invariant defer rather than
extend.** E1, E2, E4 and E5 each either held a rule unchanged or added one beside
it; INV-QD-005 could do neither, because two of the three combining algorithms
cannot stop in the direction that is cheap everywhere else in the library. The
alternative — a third clause naming `Rules` — would have kept the invariant
literally true while removing what it constrains.

**E6 appears in no row, and that is the assessment.** It added no policy variant,
no matcher, no error and no field, so §6.1 below does not engage: there is
nothing for the round-trip property to have missed. It added one invariant of its
own instead —
[INV-QD-016](../invariants.md#inv-qd-016-a-batch-decision-is-the-decision-made-alone),
that a batch decision equals the decision made alone — because evaluating many
subjects in sequence creates a way for one answer to reach the next that did not
previously exist.

### 6.1 Wire-format compatibility

Serialized policies must survive adoption. The round-trip property test in
`packages/core/test/Policy.test.ts` builds arbitrary policy trees with
`FastCheck.letrec`; it is the regression guard for the defect that motivated the
rewrite.

```
REQUIREMENT: A new policy variant MUST be added to the FastCheck generator in
             the same change that adds it to the schema. A variant absent from
             the generator is untested by the round-trip property, and the
             property is what stands between this library and the data-loss
             defect it was written to fix.
```

### 6.2 Validation procedure

Compatibility is claimed by running the merge gate, not by inspection:

```
pnpm check
```

which runs `typecheck`, `lint`, `coverage`, `test:bdd`, `spec:examples` and
`spec:verify:strict` in that order. For this document set, `spec:verify:strict`
is the operative gate: it verifies that every file in `spec/models/` appears in
`index.yaml` and that every relative link resolves.

Note two things it does **not** check. Anchors are never validated, so a link to
a heading that does not exist passes. And fence parity is load-bearing — the link
checker toggles on any line beginning with three backticks, so an unbalanced
fence silently disables checking for the rest of the file.

## 7. Document template

Each model document follows one shape, so the matrix can be regenerated from the
set:

| Section | Contents |
| ------- | -------- |
| What it is | Two or three sentences. The model, not its history |
| Who asks for it | The concrete application class that needs it. If none, say so |
| Status | Status, priority, enablers, breaking or not |
| How Qadi expresses it | API design, in `ts` fences |
| Worked example | `typescript` fences **only** where the API exists today |
| What is missing | The precise gap. Empty for shipped models |
| Verification | The test and scenario that would prove it |
| Related | Links to behaviours, decisions and enabler sections here |

```
REQUIREMENT: A model document describing unshipped API MUST use `ts` fences.
             `typescript` and `tsx` fences are extracted and compiled by
             `scripts/check-doc-examples.mjs`; an example calling a function
             that does not exist yet fails the build. The predecessor's
             documentation called signatures that no longer existed, which is
             worse than no documentation because readers pattern-match against
             it.
```

---

_Related: [Roadmap](../roadmap.md) · [User Requirements](../urs.md) · [Glossary](../glossary.md) · [Definitions of Done](../process/definitions-of-done.md)_
