# 00 — Access Control Model Adoption Matrix

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-00                                    |
> | Revision       | 1.3                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.3 (2026-07-26): Wiring-only models documented; two expressiveness limits recorded (CCR-QD-007)<br>1.2 (2026-07-26): Shipped models documented; three API claims corrected (CCR-QD-006)<br>1.1 (2026-07-26): Package-scope conflict resolved (CCR-QD-005)<br>1.0 (2026-07-26): Initial release (CCR-QD-004) |

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
| **Wiring** | Expressible today, but requires a resolver implementation the library does not ship. No core change. |
| **Additive** | Requires new core capability that does not change any existing type or wire format. |
| **Breaking** | Requires changing an existing type, evaluator rule or wire format. |
| **Excluded** | Enforced by a mechanism Qadi is not. Documented, not planned. |

### 1.2 Priority

Priority is assigned on demand and cost, not on academic prominence. Bell–LaPadula
is the most cited model in the literature and sits at P3 here, because almost no
application asks for it and it needs an evaluation dimension Qadi does not have.

| Priority | Criterion |
| -------- | --------- |
| **P0** | Shipped. The document records the mapping and the evidence. |
| **P1** | Asked for by ordinary applications; costs a resolver and a recipe. |
| **P2** | Asked for by a recognisable class of application; costs additive core work. |
| **P3** | Rarely asked for, or costs a breaking change, or both. |
| **P4** | Excluded. The document records the boundary and what pairs with Qadi. |

## 2. Enablers

Thirteen unshipped models reduce to **seven** pieces of core capability. Planning
by enabler rather than by model is what keeps this from becoming thirteen
independent designs that each bolt a field onto `Policy`.

| Id | Enabler | Nature | Unlocks |
| -- | ------- | ------ | ------- |
| **E1** | Action dimension | Additive | Bell–LaPadula, Biba, MLS, RuBAC, XACML parity, UCON, NGAC |
| **E2** | Obligations on `Decision` | Additive | XACML parity, UCON, purpose-based, consent-based, break-glass |
| **E3** | Combining algorithms | Breaking | RuBAC, XACML parity |
| **E4** | Label lattice | Additive | Bell–LaPadula, Biba, MLS, label-based |
| **E5** | Decision history port | Additive | Chinese Wall, history-based, dynamic separation of duty, UCON |
| **E6** | Subject-set evaluation | Additive | NGAC, administrative review tooling |
| **E7** | Predicate output | Breaking | Row-level security, cell-level security |

### E1 — Action dimension

Today an action exists only *inside* a permission token, as the second segment of
`resource:action` ([ADR-QD-007](../decisions/007-permission-token-representation.md)).
It is never an input to evaluation. `EvaluateOptions` carries `{ resource?, maxDepth? }`
and `MatcherContext` carries `{ subject, subjectId, resource }` — neither knows
whether the caller is reading or writing.

Every model that treats reads and writes asymmetrically is blocked on this, and
that is a large family: Bell–LaPadula permits read-down and write-up, Biba does
the reverse, and neither is expressible by a policy that cannot see the verb.

Adding `action?: string` to `EvaluateOptions` and `MatcherContext` is a pure
addition — no existing type changes and no serialized policy is invalidated.

### E2 — Obligations on `Decision`

`Allow` and `Deny` are `Data.TaggedClass` values with no `Schema`, unlike
`Policy` and `Matcher`. Adding an `obligations` field is therefore **not** a
codec change and cannot reproduce the round-trip defect that motivated the
rewrite.

The work is in the evaluator, not the type: `mergeFields` is the only place
sibling results combine, so obligations need an analogue beside it, with a
defined rule for what `AllOf`, `AnyOf` and `Not` do to an obligation set. `Not`
is the hard case — negating a policy that carries an obligation is not obviously
meaningful, and the answer should be an ADR, not an implementation detail.

### E3 — Combining algorithms

`FieldStrategy` governs *field-set merging only*. The allow/deny rule is
hard-coded in `evaluateAllOf` and `evaluateAnyOf`, and `AllOf`/`AnyOf` are
unordered sets. XACML's `deny-overrides`, `permit-overrides` and
`first-applicable`, and rule-based access control's ordered first-match, have no
representation.

This is marked **breaking** because the honest fix changes what `AllOf` and
`AnyOf` mean, and their short-circuit behaviour is currently asserted by
call-counting tests ([INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)).

### E4 — Label lattice

A security label is a `(level, compartments)` pair ordered by dominance. Qadi
has `Matcher` variants for equality, membership and ordering on numbers, but
none for lattice dominance, and no place to declare the lattice.

### E5 — Decision history port

Chinese Wall grants or denies based on what the subject has *already* accessed.
Qadi holds no history: `EvaluationId` exists only to correlate a decision with a
span, and there is no store behind it.

This is the enabler most at risk of violating scope. A history port must be a
*port* — the caller's store, behind an interface, exactly as `RelationshipResolver`
is — or Qadi starts persisting, which [the URS](../urs.md) forbids.

### E6 — Subject-set evaluation

The transpose of `Qadi.filter`: one policy against many subjects, answering
"who can see this?". Already on the [roadmap](../roadmap.md) as *Batch subject
evaluation*; listed here because NGAC's review queries depend on it.

### E7 — Predicate output

Row-level security cannot be expressed as a decision about one resource; it is a
decision that *produces a filter* to push into a query. Qadi's evaluator returns
`Allow | Deny`. Returning a predicate is a different return type and a different
contract, and it is the single largest departure from the current design in this
document.

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
| Access control lists | [MOD-QD-009](./09-acl.md) | `RelationshipResolver` | An ACL entry is a relation tuple; deny rows need E3 |
| Zanzibar-style stores | [MOD-QD-010](./10-zanzibar.md) | `RelationshipResolver` | Adapter for SpiceDB / OpenFGA; `depth` maps to userset rewrite depth |
| Claims-based | [MOD-QD-011](./11-claims.md) | `CurrentSubject` | OIDC claims are subject attributes; the work is mapping, not deciding |
| Context-aware (CBAC) | [MOD-QD-012](./12-context-aware.md) | `AttributeResolver` | Device, network, posture as resolved attributes |
| Temporal (TRBAC) | [MOD-QD-013](./13-temporal.md) | `AttributeResolver` + `Clock` | Must read `Clock`, never `Date.now` — [ADR-QD-012](../decisions/012-deterministic-time-and-ids.md) |
| Spatial (GEO-RBAC) | [MOD-QD-014](./14-spatial.md) | `AttributeResolver` | Geofence test belongs in the resolver, not a matcher |
| Risk-adaptive (RAdAC) | [MOD-QD-015](./15-risk-adaptive.md) | `AttributeResolver` | Risk score in, threshold compared by `lt`; step-up needs E2 |
| Trust / reputation | [MOD-QD-016](./16-trust.md) | `AttributeResolver` | As RAdAC, different provenance and incentive |
| Purpose-based | [MOD-QD-017](./17-purpose.md) | `AttributeResolver` | Purpose as a declared attribute; enforcing the *declaration* needs E2 |
| Consent-based | [MOD-QD-018](./18-consent.md) | `RelationshipResolver` | Consent is a relation; the data subject collapses into the resource |
| Hierarchical resource scoping | [MOD-QD-019](./19-hierarchy.md) | `RelationshipResolver` | Tenant trees; exceptions to an inherited grant need E3 |
| Team-based (TMAC) | [MOD-QD-020](./20-tmac.md) | `RelationshipResolver` | Membership is a relation; role ∧ team is the recipe |
| Organisation-based (OrBAC) | [MOD-QD-021](./21-orbac.md) | `AttributeResolver` | Organisation and view map cleanly; *activity* needs E1 |
| Type enforcement | [MOD-QD-022](./22-type-enforcement.md) | `AttributeResolver` | Domain–type pairs; the *operation* needs E1 |
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

| Model | Status | Enablers | Priority |
| ----- | ------ | -------- | -------- |
| Separation of duty (RBAC₂), static | Additive | — | P2 |
| Separation of duty, dynamic | Additive | E5 | P3 |
| Purpose enforcement with obligations | Additive | E2 | P2 |
| XACML parity | Breaking | E1, E2, E3 | P2 |
| Rule-based (RuBAC), ordered | Breaking | E3 | P2 |
| Usage control (UCON) | Breaking | E1, E2, E5 | P3 |
| Task-based (TBAC) | Additive | E5 | P3 |
| Bell–LaPadula | Additive | E1, E4 | P3 |
| Biba | Additive | E1, E4 | P3 |
| Multi-level security / Denning lattice | Additive | E1, E4 | P3 |
| Chinese Wall (Brewer–Nash) | Additive | E5 | P3 |
| History-based (HBAC) | Additive | E5 | P3 |
| Next Generation Access Control (NGAC) | Additive | E1, E6 | P3 |
| Row-level security | Breaking | E7 | P3 |
| Cell-level security | Breaking | E7 | P3 |

### 3.4 Excluded — P4

Qadi decides. It does not authenticate, persist, or administer. These models are
enforced by a mechanism Qadi is not, and the honest answer is a boundary plus a
pointer to what pairs with it.

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
| Extend short-circuit coverage to relationships | **Prerequisite for P1.** Every P1 model adds relationship lookups; the short-circuit proof should exist before the surface widens |
| Verify span emission | **Prerequisite for E2.** Obligations are reported through the span; asserting them requires the span collector this item already needs |
| Batch subject evaluation | **Is E6.** Same work, listed twice; the roadmap entry is the authority |
| Concurrent evaluation | **Blocked by E3.** Combining algorithms and evaluation order are the same design question, and settling concurrency first would fix the answer |

The two entries in [Known gaps](../urs.md) are both verification gaps, not
capability gaps, and both are already tracked. Neither blocks model adoption,
but the relationship short-circuit gap is listed above as a prerequisite because
P1 multiplies the untested surface.

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

**Phase 0 — Unblock.** ✔ Package scope and infix resolved (CCR-QD-005). Still
open: close the relationship short-circuit coverage gap. Neither is model work;
both get more expensive once model documents exist.

**Phase 1 — Record what is shipped.** Seven P0 documents. No code. These are the
template proof: if the format does not work for a model Qadi already implements,
it will not work for one it does not.

**Phase 2 — Recipes.** Sixteen P1 documents plus the resolver adapters worth
shipping. The highest-value work in this plan, because it converts documented
capability into usable capability without touching the evaluator.

**Phase 3 — Additive enablers.** E1, E2, E4, E5, E6. Each is an ADR, a behaviour,
an invariant and a scenario. E1 and E2 first — they unlock the most and break the
least.

**Phase 4 — Breaking enablers.** E3 and E7, and the models that need them. Both
change what existing constructs mean. Both should land before `1.0.0` or not at
all.

## 6. Compatibility validation

Adoption must not weaken what already holds. Each invariant is assessed against
the enablers that touch it.

| Invariant | Risk | Assessment |
| --------- | ---- | ---------- |
| [INV-QD-001](../invariants.md#inv-qd-001-permission-key-uniqueness) | E1 | An action dimension parallel to permission actions could create two spellings of one concept. The action input MUST NOT be derived from or compared against permission segments |
| [INV-QD-002](../invariants.md#inv-qd-002-role-graph-acyclicity) | — | Untouched. No enabler alters role construction |
| [INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) | E1, E3, E4 | Any new `Policy` variant must be added in four places at once. This is the invariant the rewrite exists to protect |
| [INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top) | E3, E7 | Combining algorithms and predicate output both interact with field merging. `undefined` must remain *top* |
| [INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) | E3, E5 | Ordered combining changes evaluation order; a history port adds a lookup that must not be eager |
| [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) | E5 | A history store that is down is a failure, not a denial. Highest-risk pairing in this table |
| [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) | E1, E5 | An absent action and an unwired history port must both deny |
| [INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible) | E5 | History makes evaluation stateful. Reproducibility must be restated as *given the same history*, or the invariant weakens silently |
| [INV-QD-009](../invariants.md#inv-qd-009-guarded-effects-do-not-run-when-denied) | E2 | Obligations must not become a channel that runs work before the decision is final |
| [INV-QD-010](../invariants.md#inv-qd-010-error-codes-are-injective) | all | Mechanically enforced — `ERROR_CODES` is `satisfies Record<QadiError["_tag"], …>`, so a new error without a code fails compilation |

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
