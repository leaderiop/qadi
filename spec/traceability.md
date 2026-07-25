# Traceability Matrix

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | GUARD-RTM                                      |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Guard Engineering                              |
> | Classification | Verification Record                            |
> | Change History | 1.0 (2026-07-25): Initial release (CCR-EG-001) |

---

## Traceability chain

```
Behavior (BEH-EG-NNN)
    → Source module (packages/*/src/*.ts)
    → Test file (packages/*/test/*.test.ts)
    → Invariant (INV-EG-NNN)
    → Decision (ADR-EG-NNN)
    → Acceptance scenario (REQ-EG-NNN)
```

Sections §1–§6 are parsed by `scripts/verify-traceability.sh`; column order is a
contract.

## §1 Behavior to source

| Behavior file | Range | Source module |
| ------------- | ----- | ------------- |
| [01 — Permission Tokens](behaviors/01-permissions.md) | BEH-EG-001–005 | `packages/core/src/Permission.ts` |
| [02 — Roles and Inheritance](behaviors/02-roles.md) | BEH-EG-009–012 | `packages/core/src/Role.ts`, `AuthSubject.ts` |
| [03 — Policy ADT](behaviors/03-policy-adt.md) | BEH-EG-017–019 | `packages/core/src/Policy.ts` |
| [04 — Matcher DSL](behaviors/04-matchers.md) | BEH-EG-025–028 | `packages/core/src/Matcher.ts` |
| [05 — Evaluator](behaviors/05-evaluator.md) | BEH-EG-033–039 | `packages/core/src/Evaluate.ts`, `Decision.ts` |
| [06 — Services and Layers](behaviors/06-services.md) | BEH-EG-041–044 | `packages/core/src/{CurrentSubject,AttributeResolver,RelationshipResolver,EvaluationId}.ts` |
| [07 — Enforcement](behaviors/07-enforcement.md) | BEH-EG-049–052 | `packages/core/src/Guard.ts` |
| [08 — Serialization](behaviors/08-serialization.md) | BEH-EG-057–059 | `packages/core/src/Policy.ts` |
| [09 — React Integration](behaviors/09-react.md) | BEH-EG-065–071 | `packages/react/src/GuardAtoms.ts`, `GuardProvider.tsx`, `hooks.ts`, `components.tsx` |

## §2 Invariant traceability

| Invariant | Description | Enforced by | Test |
| --------- | ----------- | ----------- | ---- |
| [INV-EG-001](invariants.md#inv-eg-001-permission-key-uniqueness) | Permission key uniqueness | Schema pattern `/^[^:]+$/` | `Tokens.test.ts`, `Policy.test.ts` |
| [INV-EG-002](invariants.md#inv-eg-002-role-graph-acyclicity) | Role graph acyclicity | By-value `inherits` | `Tokens.test.ts` |
| [INV-EG-003](invariants.md#inv-eg-003-codectype-identity) | Codec/type identity | Single schema definition | `Policy.test.ts` (property) |
| [INV-EG-004](invariants.md#inv-eg-004-field-visibility-is-a-lattice-with-undefined-at-the-top) | Field visibility lattice | `intersectFields`, `unionFields` | `Matcher.test.ts`, `Evaluate.test.ts` |
| [INV-EG-005](invariants.md#inv-eg-005-short-circuit-preservation) | Short-circuit preservation | Leaf-local resolution | `Evaluate.test.ts` (call counts) |
| [INV-EG-006](invariants.md#inv-eg-006-failure-is-not-denial) | Failure is not denial | Effect error channel | `Evaluate.test.ts`, `Policies.test.tsx` |
| [INV-EG-007](invariants.md#inv-eg-007-defaults-fail-closed) | Defaults fail closed | Default layer bodies | `Layers.test.ts` |
| [INV-EG-008](invariants.md#inv-eg-008-evaluation-is-reproducible) | Evaluation is reproducible | `Clock` + `EvaluationId` | `Evaluate.test.ts` |
| [INV-EG-009](invariants.md#inv-eg-009-guarded-effects-do-not-run-when-denied) | Guarded effects do not run | `flatMap` after assert | `Guard.test.ts` |
| [INV-EG-010](invariants.md#inv-eg-010-error-codes-are-injective) | Error codes are injective | `satisfies Record<Tag, …>` | `Tokens.test.ts` |

## §3 Decision traceability

| Decision | Title | Affected invariants |
| -------- | ----- | ------------------- |
| [ADR-EG-001](decisions/001-effect-v4-as-effect-system.md) | Effect v4 as the effect system | — |
| [ADR-EG-002](decisions/002-schema-derived-policy-adt.md) | Schema-derived policy ADT | INV-EG-003 |
| [ADR-EG-003](decisions/003-tag-discriminant.md) | `_tag` discriminant | INV-EG-003 |
| [ADR-EG-004](decisions/004-single-effect-evaluator.md) | One Effect evaluator | INV-EG-005 |
| [ADR-EG-005](decisions/005-lazy-attribute-resolution.md) | Lazy attribute resolution | INV-EG-005 |
| [ADR-EG-006](decisions/006-field-strategy-always-encoded.md) | `fieldStrategy` always encoded | INV-EG-003, INV-EG-004 |
| [ADR-EG-007](decisions/007-permission-token-representation.md) | Permission representation | INV-EG-001 |
| [ADR-EG-008](decisions/008-error-taxonomy.md) | Error taxonomy | INV-EG-010 |
| [ADR-EG-009](decisions/009-observability-via-effect.md) | Observability via Effect | — |
| [ADR-EG-010](decisions/010-context-service-and-layers.md) | `Context.Service` + layer consts | INV-EG-007 |
| [ADR-EG-011](decisions/011-enforce-as-aspect.md) | `enforce` as an aspect | INV-EG-009 |
| [ADR-EG-012](decisions/012-deterministic-time-and-ids.md) | Deterministic time and ids | INV-EG-008 |
| [ADR-EG-013](decisions/013-short-circuit-default.md) | Short-circuit by default | INV-EG-005 |
| [ADR-EG-014](decisions/014-react-via-atoms.md) | React via Effect atoms | INV-EG-006 |
| [ADR-EG-015](decisions/015-role-dag-acyclic-by-construction.md) | Role DAG acyclic by construction | INV-EG-002 |
| [ADR-EG-016](decisions/016-gxp-out-of-scope.md) | GxP out of scope | — |
| [ADR-EG-017](decisions/017-stale-decisions-are-not-decisions.md) | A decision being re-checked is not a decision | INV-EG-007 |

## §4 Test file map

| Test file | Covers |
| --------- | ------ |
| `packages/core/test/v4-api-smoke.test.ts` | Effect v4 API canary |
| `packages/core/test/Tokens.test.ts` | BEH-EG-001–012, INV-EG-001, INV-EG-002, INV-EG-010 |
| `packages/core/test/Policy.test.ts` | BEH-EG-017–019, BEH-EG-057–059, INV-EG-003 |
| `packages/core/test/Matcher.test.ts` | BEH-EG-025–028, INV-EG-004 |
| `packages/core/test/Evaluate.test.ts` | BEH-EG-033–039, INV-EG-005, INV-EG-006, INV-EG-008 |
| `packages/core/test/Layers.test.ts` | BEH-EG-041–044, INV-EG-007 |
| `packages/core/test/Guard.test.ts` | BEH-EG-049–052, INV-EG-009 |
| `packages/testing/test/TestLayers.test.ts` | Test fixtures and layers |
| `packages/react/test/GuardAtoms.test.ts` | BEH-EG-065, BEH-EG-069, BEH-EG-070 |
| `packages/react/test/GuardProvider.test.tsx` | BEH-EG-067, BEH-EG-068, BEH-EG-070 |
| `packages/react/test/hooks.test.tsx` | BEH-EG-066, BEH-EG-068, BEH-EG-069, INV-EG-006, ADR-EG-017 |
| `packages/react/test/edges.test.tsx` | BEH-EG-067, BEH-EG-068 |

## §5 Acceptance scenario traceability

| Tag | Feature file | Behavior |
| --- | ------------ | -------- |
| REQ-EG-001 | `features/features/permissions/permissions.feature` | BEH-EG-001–003 |
| REQ-EG-002 | `features/features/permissions/composition.feature` | BEH-EG-019 |
| REQ-EG-003 | `features/features/roles/roles.feature` | BEH-EG-011 |
| REQ-EG-004 | `features/features/attributes/attributes.feature` | BEH-EG-034 |
| REQ-EG-005 | `features/features/rebac/relationships.feature` | BEH-EG-036 |
| REQ-EG-006 | `features/features/attributes/resource-attributes.feature` | BEH-EG-036 |
| REQ-EG-007 | `features/features/field-visibility/field-visibility.feature` | BEH-EG-018 |
| REQ-EG-008 | `features/features/serialization/round-trip.feature` | BEH-EG-058, INV-EG-003 |
| REQ-EG-009 | `features/features/attributes/ownership.feature` | BEH-EG-026, BEH-EG-036 |

## §6 Coverage targets

| Scope | Statements | Branches | Enforced by |
| ----- | ---------- | -------- | ----------- |
| `packages/core/src` | 95% | 95% | `vitest.config.ts` thresholds |
| Workspace | 90% | 90% | `vitest.config.ts` thresholds |

A shortfall fails the run; it is not merely reported.
