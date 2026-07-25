# Guard — Specification

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | GUARD-00                                       |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Guard Engineering                              |
> | Classification | Functional Specification — Master Index        |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-EG-001) |

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
| [Invariants](./invariants.md) | Properties that hold for every execution, and what enforces each |
| [Traceability](./traceability.md) | Behavior → source → test → invariant → decision → scenario |

### Behaviors

| Document | Requirements |
| -------- | ------------ |
| [01 — Permission Tokens](./behaviors/01-permissions.md) | BEH-EG-001–006 |
| [02 — Roles and Inheritance](./behaviors/02-roles.md) | BEH-EG-009–012 |
| [03 — Policy ADT](./behaviors/03-policy-adt.md) | BEH-EG-017–020 |
| [04 — Matcher DSL](./behaviors/04-matchers.md) | BEH-EG-025–028 |
| [05 — Evaluator](./behaviors/05-evaluator.md) | BEH-EG-033–040 |
| [06 — Services and Layers](./behaviors/06-services.md) | BEH-EG-041–044 |
| [07 — Enforcement](./behaviors/07-enforcement.md) | BEH-EG-049–053 |
| [08 — Serialization](./behaviors/08-serialization.md) | BEH-EG-057–059 |
| [09 — React Integration](./behaviors/09-react.md) | BEH-EG-065–069 |

### Decisions

Sixteen ADRs, [indexed here](./decisions/index.yaml). The load-bearing ones:

| ADR | Decision |
| --- | -------- |
| [ADR-EG-002](./decisions/002-schema-derived-policy-adt.md) | The policy ADT is schema-derived — the central decision |
| [ADR-EG-004](./decisions/004-single-effect-evaluator.md) | One `Effect`-returning evaluator |
| [ADR-EG-005](./decisions/005-lazy-attribute-resolution.md) | Lazy per-node attribute resolution |
| [ADR-EG-011](./decisions/011-enforce-as-aspect.md) | `Guard.enforce` is an Effect aspect |
| [ADR-EG-016](./decisions/016-gxp-out-of-scope.md) | GxP compliance is out of scope |

### Process

| Document | Purpose |
| -------- | ------- |
| [Requirement Identifier Scheme](./process/requirement-id-scheme.md) | ID allocation and cross-reference obligations |
| [Definitions of Done](./process/definitions-of-done.md) | The merge gate |

## Why this library exists

Guard replaces an earlier `Result`-based authorization library. The rewrite was
prompted by defects that were structural rather than incidental — each came from
maintaining two representations of one thing and letting them drift:

| Defect | Cause | Now prevented by |
| ------ | ----- | ---------------- |
| Field visibility silently narrowed on a JSON round trip | Hand-written codec drifted from the type | [INV-EG-003](./invariants.md#inv-eg-003-codectype-identity) |
| Async relationship API never called | Two evaluators, one unreachable | [ADR-EG-004](./decisions/004-single-effect-evaluator.md) |
| Short-circuiting destroyed by eager resolution | Resolve-then-evaluate in two phases | [INV-EG-005](./invariants.md#inv-eg-005-short-circuit-preservation) |
| One error code for two unrelated failures | Manual code allocation | [INV-EG-010](./invariants.md#inv-eg-010-error-codes-are-injective) |
| Documentation examples that did not compile | Nothing checked them | `scripts/check-doc-examples.mjs` |

The first of those was reproduced against the original implementation before
this rewrite began: a policy exposing `["title", "author"]` returned only
`["title"]` after being stored and reloaded, with no error anywhere.

## Identifier scheme

| Prefix | Meaning |
| ------ | ------- |
| `BEH-EG-NNN` | Functional behavior requirement |
| `INV-EG-NNN` | Runtime invariant |
| `ADR-EG-NNN` | Architecture decision |
| `REQ-EG-NNN` | Acceptance scenario tag on a `.feature` file |
| `CCR-EG-NNN` | Change control record |

Full rules in [the identifier scheme](./process/requirement-id-scheme.md).

## Document history

| CCR | Date | Change |
| --- | ---- | ------ |
| CCR-EG-001 | 2026-07-25 | Initial specification |
