# Qadi — Specification

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-00                                        |
> | Revision       | 1.16                                           |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification — Master Index        |
> | Change History | 1.16 (2026-07-26): Chinese Wall and task-based control verified; MOD-QD-030/031/033 corrected (CCR-QD-022)<br>1.15 (2026-07-26): Behaviours 15 and 16; separation of duty verified; CCR-QD-018–020 backfilled (CCR-QD-021)<br>1.14 (2026-07-26): Subject sets built; behaviour 14 and INV-QD-016 added (CCR-QD-018)<br>1.13 (2026-07-26): Label lattice built; behaviour 13 and INV-QD-015 added (CCR-QD-017)<br>1.12 (2026-07-26): Decision history built; behaviour 12 and INV-QD-014 added; INV-QD-008 restated (CCR-QD-016)<br>1.11 (2026-07-26): Obligations built; behaviour 11, INV-QD-012 and INV-QD-013 added (CCR-QD-015)<br>1.10 (2026-07-26): ADR-QD-019, obligations (CCR-QD-014)<br>1.9 (2026-07-26): Reactivity canary; BEH-QD-071 corrected (CCR-QD-013)<br>1.8 (2026-07-26): Action dimension built; behaviour 10 and INV-QD-011 added (CCR-QD-012)<br>1.7 (2026-07-26): ADR-QD-018, the action dimension (CCR-QD-011)<br>1.6 (2026-07-26): Span emission verified (CCR-QD-010)<br>1.5 (2026-07-26): Relationship short-circuit coverage closed (CCR-QD-009)<br>1.4 (2026-07-26): Core-change and excluded model documents (CCR-QD-008)<br>1.3 (2026-07-26): Wiring-only model documents (CCR-QD-007)<br>1.2 (2026-07-26): Shipped-model documents (CCR-QD-006)<br>1.1 (2026-07-26): Models index; renamed to Qadi (CCR-QD-004, CCR-QD-005)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

This specification is **normative**. Code follows it; where they disagree, one
of them is a defect.

Every document is mechanically checked. `spec/scripts/verify-traceability.sh`
verifies that the registries match the files on disk, that every invariant and
decision is traced, that every acceptance tag is defined, and that no relative
link is broken. `scripts/check-doc-examples.mjs` compiles the runnable examples.

## Contents

### Foundations

| Document | Purpose |
| -------- | ------- |
| [Overview](./overview.md) | Mission, design philosophy, public API surface |
| [User Requirements](./urs.md) | What users need, in their terms — and the two gaps writing it surfaced, both now closed |
| [Glossary](./glossary.md) | Terms of art, and where this codebase narrows an industry sense |
| [Invariants](./invariants.md) | Properties that hold for every execution, and what enforces each |
| [Traceability](./traceability.md) | Behavior → source → test → invariant → decision → scenario |
| [Roadmap](./roadmap.md) | What is deliberately unbuilt, and why |

### Models

| Document | Purpose |
| -------- | ------- |
| [00 — Access Control Model Adoption Matrix](./models/00-adoption-matrix.md) | Which models Qadi expresses, which it does not, and what each would cost |
| [01 — Role-Based Access Control](./models/01-rbac.md) | RBAC₀ and RBAC₁; why RBAC₂ needs an enabler |
| [02 — Attribute-Based Access Control](./models/02-abac.md) | Subject and resource attributes; lazy resolution |
| [03 — Relationship-Based Access Control](./models/03-rebac.md) | The relationship port, and why Qadi ships no graph store |
| [04 — Capability and Permission Tokens](./models/04-capability.md) | Permission tokens; why this is not object-capability |
| [05 — Identity-Based Access Control](./models/05-ibac.md) | `subjectId()` ownership, and when to prefer ReBAC |
| [06 — Content-Dependent Access Control](./models/06-content-dependent.md) | Deciding on the data's own values; the row-level boundary |
| [07 — Field-Level Authorization](./models/07-field-level.md) | The visibility lattice — the reason this library exists |
| [08 — Discretionary Access Control](./models/08-dac.md) | Owner-granted access; why granting itself is out of scope |
| [09 — Access Control Lists](./models/09-acl.md) | ACL entries as relation tuples; deny rows need an enabler |
| [10 — Zanzibar-Style Relationship Stores](./models/10-zanzibar.md) | SpiceDB / OpenFGA adapters; Qadi is the policy side |
| [11 — Claims-Based Access Control](./models/11-claims.md) | Tokens to subjects; scopes are not permissions |
| [12 — Context-Aware Access Control](./models/12-context-aware.md) | Device, network and posture; failure is not denial |
| [13 — Temporal Access Control](./models/13-temporal.md) | Time from `Clock`, never the ambient clock |
| [14 — Spatial Access Control](./models/14-spatial.md) | Geofencing and data residency; geometry stays in the resolver |
| [15 — Risk-Adaptive Access Control](./models/15-risk-adaptive.md) | Score in the resolver, threshold in the policy |
| [16 — Trust- and Reputation-Based Access Control](./models/16-trust.md) | Standing rather than assignment; an adversarial input |
| [17 — Purpose-Based Access Control](./models/17-purpose.md) | GDPR purpose limitation as a field projection |
| [18 — Consent-Based Access Control](./models/18-consent.md) | A three-party relation; revocation for free |
| [19 — Hierarchical Resource Scoping](./models/19-hierarchy.md) | Tenant and folder trees; `depth` and its limits |
| [20 — Team-Based Access Control](./models/20-tmac.md) | Care teams and case teams; role ∧ team |
| [21 — Organisation-Based Access Control](./models/21-orbac.md) | Multi-tenant rule catalogues; activity has no home yet |
| [22 — Type Enforcement](./models/22-type-enforcement.md) | SELinux-shaped domain/type matrices, and why it is not MAC |
| [23 — Label-Based Access Control](./models/23-label-based.md) | Clearances and classifications; dominance needs an enabler |
| [24 — Separation of Duty](./models/24-separation-of-duty.md) | Static, dynamic and object-based SoD; the last already works |
| [25 — Rule-Based Access Control](./models/25-rubac.md) | Ordered first-match rule lists; needs combining algorithms |
| [26 — XACML Parity](./models/26-xacml.md) | What parity would take, and why not to chase completeness |
| [27 — Bell–LaPadula](./models/27-bell-lapadula.md) | No read up, no write down; why a scalar approximation is wrong |
| [28 — Biba](./models/28-biba.md) | The integrity dual; low-water-mark needs history |
| [29 — Multi-Level Security](./models/29-mls.md) | The Denning lattice; dominance is a partial order |
| [30 — Chinese Wall](./models/30-chinese-wall.md) | Conflict of interest; the wall is built by the first access |
| [31 — History-Based Access Control](./models/31-hbac.md) | Rate limits and quotas; the port must not become a database |
| [32 — Usage Control](./models/32-ucon.md) | UCON's ABC model; continuity is a deliberate non-goal |
| [33 — Task-Based Access Control](./models/33-tbac.md) | Workflow authorizations; the once-ness was one conjunct |
| [34 — Next Generation Access Control](./models/34-ngac.md) | Policy as a graph; treat it as a resolver, not a rewrite |
| [35 — Row-Level Security](./models/35-row-level.md) | Predicates instead of decisions; the largest departure |
| [36 — Cell-Level Security](./models/36-cell-level.md) | Per-value visibility; more of it ships than expected |
| [37 — Models Qadi Does Not Implement](./models/37-excluded.md) | The boundary, and what pairs with Qadi instead |

Model documents are planning records, not specification. They carry `MOD-QD-NNN`
identifiers precisely so that describing a capability cannot be mistaken for
having verified one.

### Behaviors

| Document | Requirements |
| -------- | ------------ |
| [01 — Permission Tokens](./behaviors/01-permissions.md) | BEH-QD-001–006 |
| [02 — Roles and Inheritance](./behaviors/02-roles.md) | BEH-QD-009–012 |
| [03 — Policy ADT](./behaviors/03-policy-adt.md) | BEH-QD-017–020 |
| [04 — Matcher DSL](./behaviors/04-matchers.md) | BEH-QD-025–028 |
| [05 — Evaluator](./behaviors/05-evaluator.md) | BEH-QD-033–040 |
| [06 — Services and Layers](./behaviors/06-services.md) | BEH-QD-041–044 |
| [07 — Enforcement](./behaviors/07-enforcement.md) | BEH-QD-049–053 |
| [08 — Serialization](./behaviors/08-serialization.md) | BEH-QD-057–059 |
| [09 — React Integration](./behaviors/09-react.md) | BEH-QD-065–069 |
| [10 — The Action Dimension](./behaviors/10-actions.md) | BEH-QD-073–078 |
| [11 — Obligations](./behaviors/11-obligations.md) | BEH-QD-081–087 |
| [12 — Decision History](./behaviors/12-history.md) | BEH-QD-089–095 |
| [13 — The Label Lattice](./behaviors/13-labels.md) | BEH-QD-097–101 |
| [14 — Subject Sets](./behaviors/14-subject-sets.md) | BEH-QD-105–109 |
| [15 — Rule Tables](./behaviors/15-rules.md) | BEH-QD-111–117 |
| [16 — Predicate Output](./behaviors/16-predicates.md) | BEH-QD-121–128 |

### Decisions

Twenty-four ADRs, [indexed here](./decisions/index.yaml). The load-bearing ones:

| ADR | Decision |
| --- | -------- |
| [ADR-QD-002](./decisions/002-schema-derived-policy-adt.md) | The policy ADT is schema-derived — the central decision |
| [ADR-QD-004](./decisions/004-single-effect-evaluator.md) | One `Effect`-returning evaluator |
| [ADR-QD-005](./decisions/005-lazy-attribute-resolution.md) | Lazy per-node attribute resolution |
| [ADR-QD-011](./decisions/011-enforce-as-aspect.md) | `Qadi.enforce` is an Effect aspect |
| [ADR-QD-014](./decisions/014-react-via-atoms.md) | React integrates through Effect atoms |
| [ADR-QD-016](./decisions/016-gxp-out-of-scope.md) | GxP compliance is out of scope |
| [ADR-QD-018](./decisions/018-action-dimension.md) | The action is an evaluation input, not a permission segment |
| [ADR-QD-019](./decisions/019-obligations.md) | An obligation is a condition on permission |
| [ADR-QD-020](./decisions/020-decision-history-port.md) | History is a three-valued port — a boolean cannot fail closed under negation |
| [ADR-QD-021](./decisions/021-label-lattice.md) | Dominance is four-valued; the label never enters the policy |
| [ADR-QD-022](./decisions/022-subject-set-evaluation.md) | A subject set is asked by nobody, and reports rather than enforces |
| [ADR-QD-023](./decisions/023-combining-algorithms.md) | A rule list stops at the first rule that cannot be overridden |
| [ADR-QD-024](./decisions/024-predicate-output.md) | A predicate is a second interpreter, shipped with its reference semantics |

All twenty-four are **Accepted** and describe code that exists. ADR-QD-018
through ADR-QD-024 were each written *Proposed* first — recording a
decision whose implementation had not landed — and moved to Accepted when the
capability shipped with its behaviour, invariant and scenario. That is the path a
Proposed decision takes, and for ADR-QD-020 and ADR-QD-021 it was mandatory: the
matrix required each of their design questions settled before any code — and
ADR-QD-022 was written the same way for a question the matrix said did not
exist. The
status is what tells the two apart, and nothing may cite a Proposed decision as
evidence of behaviour.

### Appendices

| Document | Purpose |
| -------- | ------- |
| [React Integration Guide](./appendices/react-integration.md) | A worked application, from wiring to testing — every example compiled in CI |

### Process

| Document | Purpose |
| -------- | ------- |
| [Requirement Identifier Scheme](./process/requirement-id-scheme.md) | ID allocation and cross-reference obligations |
| [Definitions of Done](./process/definitions-of-done.md) | The merge gate |

### Reading order

New to the library: [Overview](./overview.md) → [User Requirements](./urs.md) →
[Glossary](./glossary.md) → the behaviors.

Reviewing a change: [Invariants](./invariants.md) →
[Traceability](./traceability.md) → [Definitions of Done](./process/definitions-of-done.md).

## Why this library exists

Qadi replaces an earlier `Result`-based authorization library. The rewrite was
prompted by defects that were structural rather than incidental — each came from
maintaining two representations of one thing and letting them drift:

| Defect | Cause | Now prevented by |
| ------ | ----- | ---------------- |
| Field visibility silently narrowed on a JSON round trip | Hand-written codec drifted from the type | [INV-QD-003](./invariants.md#inv-qd-003-codectype-identity) |
| Async relationship API never called | Two evaluators, one unreachable | [ADR-QD-004](./decisions/004-single-effect-evaluator.md) |
| Short-circuiting destroyed by eager resolution | Resolve-then-evaluate in two phases | [INV-QD-005](./invariants.md#inv-qd-005-short-circuit-preservation) |
| One error code for two unrelated failures | Manual code allocation | [INV-QD-010](./invariants.md#inv-qd-010-error-codes-are-injective) |
| Documentation examples that did not compile | Nothing checked them | `scripts/check-doc-examples.mjs` |

The first of those was reproduced against the original implementation before
this rewrite began: a policy exposing `["title", "author"]` returned only
`["title"]` after being stored and reloaded, with no error anywhere.

## Identifier scheme

| Prefix | Meaning |
| ------ | ------- |
| `BEH-QD-NNN` | Functional behavior requirement |
| `INV-QD-NNN` | Runtime invariant |
| `ADR-QD-NNN` | Architecture decision |
| `REQ-QD-NNN` | Acceptance scenario tag on a `.feature` file |
| `MOD-QD-NNN` | Access control model adoption record — planning, not specification |
| `CCR-QD-NNN` | Change control record |

Full rules in [the identifier scheme](./process/requirement-id-scheme.md).

## Document history

| CCR | Date | Change |
| --- | ---- | ------ |
| CCR-QD-001 | 2026-07-25 | Initial specification |
| CCR-QD-002 | 2026-07-25 | Glossary, user requirements and roadmap |
| CCR-QD-003 | 2026-07-26 | React rebuilt on `effect/unstable/reactivity` (ADR-QD-014 revised, ADR-QD-017 added) |
| CCR-QD-004 | 2026-07-26 | Access control model adoption matrix; `MOD-QD` identifier series registered |
| CCR-QD-005 | 2026-07-26 | Library renamed Guard → Qadi; scope `@guard/*` → `@qadi/*`; infix `EG` → `QD`; service tags, span names and document ids follow |
| CCR-QD-006 | 2026-07-26 | Model documents for the seven shipped access control models (MOD-QD-001–007) |
| CCR-QD-007 | 2026-07-26 | Model documents for the sixteen wiring-only models (MOD-QD-008–023) |
| CCR-QD-008 | 2026-07-26 | Model documents for the core-change and excluded models (MOD-QD-024–037); model set complete |
| CCR-QD-009 | 2026-07-26 | Relationship short-circuit and resolver-failure coverage; URS-QD-010 known gap closed |
| CCR-QD-010 | 2026-07-26 | Span emission verified with a collecting tracer; URS-QD-012 known gap closed |
| CCR-QD-011 | 2026-07-26 | ADR-QD-018 decides the action dimension (E1); first *Proposed* decision in the set |
| CCR-QD-012 | 2026-07-26 | Action dimension built: `hasAction`, `action()`, `MissingAction`, `qadi.action`; BEH-QD-073–078, INV-QD-011, URS-QD-015, `@REQ-QD-010`; ADR-QD-018 Accepted |
| CCR-QD-013 | 2026-07-26 | Canary over `effect/unstable/reactivity`; BEH-QD-071 corrected — atom keying is structural, not by reference; last release blocker closed |
| CCR-QD-014 | 2026-07-26 | ADR-QD-019 decides obligations (E2); corrects the model documents' `FieldStrategy` assumption and their "not a codec change" claim |
| CCR-QD-015 | 2026-07-26 | Obligations built: `obliged`, `Obligation`, `UndischargedObligation`, `onObligations`; BEH-QD-081–087, INV-QD-012, INV-QD-013, URS-QD-016, `@REQ-QD-011`; ADR-QD-019 Accepted |
| CCR-QD-016 | 2026-07-26 | Decision history built: `DecisionHistory`, `hasActed`, `hasNotActed`, `DecisionHistoryUnavailable`; BEH-QD-089–095, INV-QD-014, URS-QD-017, `@REQ-QD-012`; INV-QD-008 restated as "given the same history"; ADR-QD-020 Accepted |
| CCR-QD-017 | 2026-07-26 | Label lattice built: `SecurityLabel`, `compareLabels`, `dominates`; BEH-QD-097–101, INV-QD-015, URS-QD-018, `@REQ-QD-013`; ADR-QD-021 Accepted |
| CCR-QD-018 | 2026-07-26 | Subject sets built: `decideSubjects`, `filterSubjects`, `SubjectSetServices`, `qadiReviewLayer`; BEH-QD-105–109, INV-QD-016, URS-QD-019, `@REQ-QD-014`; ADR-QD-022 Accepted; phase 4 of the adoption matrix complete |
| CCR-QD-019 | 2026-07-26 | Combining algorithms built: `rules`, `permitWhen`, `denyWhen`, `Combining`, `RuleEffect`; BEH-QD-111–117, INV-QD-017, URS-QD-020, `@REQ-QD-015`; INV-QD-005 defers to INV-QD-017; ADR-QD-023 Accepted |
| CCR-QD-020 | 2026-07-26 | Predicate output built: `Predicate`, `toPredicate`, `evaluatePredicate`, `PolicyNotTranslatable`; BEH-QD-121–128, INV-QD-018, URS-QD-021, `@REQ-QD-016`; ADR-QD-024 Accepted; phase 5 complete, every enabler shipped |
| CCR-QD-021 | 2026-07-26 | Separation of duty verified as `@REQ-QD-017`; MOD-QD-024 corrected — static SoD to *Shipped, in part*, `DecisionHistoryAssumeActed` withdrawn, and two forecasts corrected (a label is a trace property, and an absent field grants) |
| CCR-QD-022 | 2026-07-26 | Chinese Wall verified as `@REQ-QD-018` and task-based control as `@REQ-QD-019`; MOD-QD-030, MOD-QD-031 and MOD-QD-033 corrected — all three to Shipped (HBAC in part, the count and the ordering question deferred), `DecisionHistorySealed` and 30's `Engagement` union withdrawn, 33's absent-`raisedBy` hazard closed in a compiled example; MOD-QD-032's E5 claims brought up to date |
