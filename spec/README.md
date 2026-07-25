# Qadi — Specification

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-00                                        |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification — Master Index        |
> | Change History | 1.2 (2026-07-26): Shipped-model documents (CCR-QD-006)<br>1.1 (2026-07-26): Models index; renamed to Qadi (CCR-QD-004, CCR-QD-005)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

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
| [User Requirements](./urs.md) | What users need, in their terms — and the two gaps that has surfaced |
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

### Decisions

Seventeen ADRs, [indexed here](./decisions/index.yaml). The load-bearing ones:

| ADR | Decision |
| --- | -------- |
| [ADR-QD-002](./decisions/002-schema-derived-policy-adt.md) | The policy ADT is schema-derived — the central decision |
| [ADR-QD-004](./decisions/004-single-effect-evaluator.md) | One `Effect`-returning evaluator |
| [ADR-QD-005](./decisions/005-lazy-attribute-resolution.md) | Lazy per-node attribute resolution |
| [ADR-QD-011](./decisions/011-enforce-as-aspect.md) | `Qadi.enforce` is an Effect aspect |
| [ADR-QD-014](./decisions/014-react-via-atoms.md) | React integrates through Effect atoms |
| [ADR-QD-016](./decisions/016-gxp-out-of-scope.md) | GxP compliance is out of scope |

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
