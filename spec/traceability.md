# Traceability Matrix

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-RTM                                       |
> | Revision       | 1.7                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Verification Record                            |
> | Change History | 1.7 (2026-07-26): Rule tables built (CCR-QD-019)<br>1.6 (2026-07-26): Subject sets built (CCR-QD-018)<br>1.5 (2026-07-26): Label lattice built (CCR-QD-017)<br>1.4 (2026-07-26): Decision history built (CCR-QD-016)<br>1.3 (2026-07-26): Obligations built (CCR-QD-015)<br>1.2 (2026-07-26): Reactivity canary; BEH-QD-071 corrected (CCR-QD-013)<br>1.1 (2026-07-26): Action dimension built (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## Traceability chain

```
Behavior (BEH-QD-NNN)
    → Source module (packages/*/src/*.ts)
    → Test file (packages/*/test/*.test.ts)
    → Invariant (INV-QD-NNN)
    → Decision (ADR-QD-NNN)
    → Acceptance scenario (REQ-QD-NNN)
```

Sections §1–§6 are parsed by `scripts/verify-traceability.sh`; column order is a
contract.

## §1 Behavior to source

| Behavior file | Range | Source module |
| ------------- | ----- | ------------- |
| [01 — Permission Tokens](behaviors/01-permissions.md) | BEH-QD-001–005 | `packages/core/src/Permission.ts` |
| [02 — Roles and Inheritance](behaviors/02-roles.md) | BEH-QD-009–012 | `packages/core/src/Role.ts`, `AuthSubject.ts` |
| [03 — Policy ADT](behaviors/03-policy-adt.md) | BEH-QD-017–019 | `packages/core/src/Policy.ts` |
| [04 — Matcher DSL](behaviors/04-matchers.md) | BEH-QD-025–028 | `packages/core/src/Matcher.ts` |
| [05 — Evaluator](behaviors/05-evaluator.md) | BEH-QD-033–039 | `packages/core/src/Evaluate.ts`, `Decision.ts` |
| [06 — Services and Layers](behaviors/06-services.md) | BEH-QD-041–044 | `packages/core/src/{CurrentSubject,AttributeResolver,RelationshipResolver,EvaluationId}.ts` |
| [07 — Enforcement](behaviors/07-enforcement.md) | BEH-QD-049–052 | `packages/core/src/Qadi.ts` |
| [08 — Serialization](behaviors/08-serialization.md) | BEH-QD-057–059 | `packages/core/src/Policy.ts` |
| [09 — React Integration](behaviors/09-react.md) | BEH-QD-065–071 | `packages/react/src/QadiAtoms.ts`, `QadiProvider.tsx`, `hooks.ts`, `components.tsx` |
| [10 — The Action Dimension](behaviors/10-actions.md) | BEH-QD-073–078 | `packages/core/src/Evaluate.ts`, `Policy.ts`, `Matcher.ts`, `Errors.ts` |
| [11 — Obligations](behaviors/11-obligations.md) | BEH-QD-081–087 | `packages/core/src/Obligation.ts`, `Decision.ts`, `Policy.ts`, `Evaluate.ts`, `Qadi.ts` |
| [12 — Decision History](behaviors/12-history.md) | BEH-QD-089–095 | `packages/core/src/DecisionHistory.ts`, `Policy.ts`, `Evaluate.ts`, `Errors.ts` |
| [13 — The Label Lattice](behaviors/13-labels.md) | BEH-QD-097–101 | `packages/core/src/SecurityLabel.ts`, `Matcher.ts` |
| [14 — Subject Sets](behaviors/14-subject-sets.md) | BEH-QD-105–109 | `packages/core/src/SubjectSet.ts` |
| [15 — Rule Tables](behaviors/15-rules.md) | BEH-QD-111–117 | `packages/core/src/Policy.ts`, `Evaluate.ts` |

## §2 Invariant traceability

| Invariant | Description | Enforced by | Test |
| --------- | ----------- | ----------- | ---- |
| [INV-QD-001](invariants.md#inv-qd-001-permission-key-uniqueness) | Permission key uniqueness | Schema pattern `/^[^:]+$/` | `Tokens.test.ts`, `Policy.test.ts` |
| [INV-QD-002](invariants.md#inv-qd-002-role-graph-acyclicity) | Role graph acyclicity | By-value `inherits` | `Tokens.test.ts` |
| [INV-QD-003](invariants.md#inv-qd-003-codectype-identity) | Codec/type identity | Single schema definition | `Policy.test.ts` (property) |
| [INV-QD-004](invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top) | Field visibility lattice | `intersectFields`, `unionFields` | `Matcher.test.ts`, `Evaluate.test.ts` |
| [INV-QD-005](invariants.md#inv-qd-005-short-circuit-preservation) | Short-circuit preservation | Leaf-local resolution | `Evaluate.test.ts` (attribute and relationship call counts) |
| [INV-QD-006](invariants.md#inv-qd-006-failure-is-not-denial) | Failure is not denial | Effect error channel | `Evaluate.test.ts`, `Policies.test.tsx` |
| [INV-QD-007](invariants.md#inv-qd-007-defaults-fail-closed) | Defaults fail closed | Default layer bodies | `Layers.test.ts` |
| [INV-QD-008](invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) | Reproducible given the same history | `Clock` + `EvaluationId`; the port is read-only | `Evaluate.test.ts` |
| [INV-QD-009](invariants.md#inv-qd-009-guarded-effects-do-not-run-when-denied) | Guarded effects do not run | `flatMap` after assert | `Qadi.test.ts` |
| [INV-QD-010](invariants.md#inv-qd-010-error-codes-are-injective) | Error codes are injective | `satisfies Record<Tag, …>` | `Tokens.test.ts` |
| [INV-QD-011](invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one) | Reading an absent action fails | `referencesAction` pre-check | `Evaluate.test.ts`, `Matcher.test.ts` |
| [INV-QD-012](invariants.md#inv-qd-012-obligations-are-never-narrowed) | Obligations are never narrowed | `unionObligations`, the only combinator | `Evaluate.test.ts` |
| [INV-QD-013](invariants.md#inv-qd-013-enforcement-never-proceeds-on-an-undischarged-obligation) | Enforcement refuses an undischarged obligation | One shared `permitted` path | `Qadi.test.ts` |
| [INV-QD-014](invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities) | An unwired history port denies both polarities | Three-valued port; `DecisionHistoryUnknown` | `Evaluate.test.ts`, `TestLayers.test.ts` |
| [INV-QD-015](invariants.md#inv-qd-015-incomparable-labels-deny-in-both-directions) | Incomparable labels deny both ways | `compareLabels` / `labelDominates` | `Matcher.test.ts`, `Evaluate.test.ts` |
| [INV-QD-016](invariants.md#inv-qd-016-a-batch-decision-is-the-decision-made-alone) | A batch decision equals the decision made alone | Per-element `provideService`; no batch state | `SubjectSet.test.ts` |
| [INV-QD-017](invariants.md#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden) | A rule list stops at the first rule that cannot be overridden | Per-algorithm stopping condition in `evaluateRules` | `Rules.test.ts` (resolver call counts and trace child counts) |

## §3 Decision traceability

| Decision | Title | Affected invariants |
| -------- | ----- | ------------------- |
| [ADR-QD-001](decisions/001-effect-v4-as-effect-system.md) | Effect v4 as the effect system | — |
| [ADR-QD-002](decisions/002-schema-derived-policy-adt.md) | Schema-derived policy ADT | INV-QD-003 |
| [ADR-QD-003](decisions/003-tag-discriminant.md) | `_tag` discriminant | INV-QD-003 |
| [ADR-QD-004](decisions/004-single-effect-evaluator.md) | One Effect evaluator | INV-QD-005 |
| [ADR-QD-005](decisions/005-lazy-attribute-resolution.md) | Lazy attribute resolution | INV-QD-005 |
| [ADR-QD-006](decisions/006-field-strategy-always-encoded.md) | `fieldStrategy` always encoded | INV-QD-003, INV-QD-004 |
| [ADR-QD-007](decisions/007-permission-token-representation.md) | Permission representation | INV-QD-001 |
| [ADR-QD-008](decisions/008-error-taxonomy.md) | Error taxonomy | INV-QD-010 |
| [ADR-QD-009](decisions/009-observability-via-effect.md) | Observability via Effect | — |
| [ADR-QD-010](decisions/010-context-service-and-layers.md) | `Context.Service` + layer consts | INV-QD-007 |
| [ADR-QD-011](decisions/011-enforce-as-aspect.md) | `enforce` as an aspect | INV-QD-009 |
| [ADR-QD-012](decisions/012-deterministic-time-and-ids.md) | Deterministic time and ids | INV-QD-008 |
| [ADR-QD-013](decisions/013-short-circuit-default.md) | Short-circuit by default | INV-QD-005 |
| [ADR-QD-014](decisions/014-react-via-atoms.md) | React via Effect atoms | INV-QD-006 |
| [ADR-QD-015](decisions/015-role-dag-acyclic-by-construction.md) | Role DAG acyclic by construction | INV-QD-002 |
| [ADR-QD-016](decisions/016-gxp-out-of-scope.md) | GxP out of scope | — |
| [ADR-QD-017](decisions/017-stale-decisions-are-not-decisions.md) | A decision being re-checked is not a decision | INV-QD-007 |
| [ADR-QD-018](decisions/018-action-dimension.md) | The action is an evaluation input, not a permission segment | INV-QD-001, INV-QD-006, INV-QD-011 |
| [ADR-QD-019](decisions/019-obligations.md) | Obligations are a condition on permission | INV-QD-003, INV-QD-005, INV-QD-009, INV-QD-012, INV-QD-013 |
| [ADR-QD-020](decisions/020-decision-history-port.md) | History is a three-valued port | INV-QD-003, INV-QD-006, INV-QD-007, INV-QD-008, INV-QD-014 |
| [ADR-QD-021](decisions/021-label-lattice.md) | Dominance is four-valued; the label never enters the policy | INV-QD-003, INV-QD-007, INV-QD-015 |
| [ADR-QD-022](decisions/022-subject-set-evaluation.md) | A subject set is asked by nobody, and reports rather than enforces | INV-QD-006, INV-QD-008, INV-QD-016 |
| [ADR-QD-023](decisions/023-combining-algorithms.md) | A rule list stops at the first rule that cannot be overridden | INV-QD-003, INV-QD-004, INV-QD-005, INV-QD-006, INV-QD-017 |

## §4 Test file map

| Test file | Covers |
| --------- | ------ |
| `packages/core/test/v4-api-smoke.test.ts` | Effect v4 API canary |
| `packages/react/test/v4-reactivity-smoke.test.ts` | `effect/unstable/reactivity` API canary, ADR-QD-014 |
| `packages/core/test/Tokens.test.ts` | BEH-QD-001–012, INV-QD-001, INV-QD-002, INV-QD-010 |
| `packages/core/test/Policy.test.ts` | BEH-QD-017–019, BEH-QD-057–059, BEH-QD-074, BEH-QD-081, BEH-QD-091–092, INV-QD-003 |
| `packages/core/test/Matcher.test.ts` | BEH-QD-025–028, BEH-QD-075, BEH-QD-097–099, INV-QD-004, INV-QD-011, INV-QD-015 |
| `packages/core/test/Evaluate.test.ts` | BEH-QD-033–039, BEH-QD-073–078, BEH-QD-081–086, BEH-QD-089–095, BEH-QD-098–101, INV-QD-005, INV-QD-006, INV-QD-008, INV-QD-011, INV-QD-012, INV-QD-014, INV-QD-015, ADR-QD-009 |
| `packages/core/test/SubjectSet.test.ts` | BEH-QD-105–109, INV-QD-006, INV-QD-016 |
| `packages/core/test/Rules.test.ts` | BEH-QD-111–117, INV-QD-004, INV-QD-006, INV-QD-017 |
| `packages/core/test/Layers.test.ts` | BEH-QD-041–044, INV-QD-007 |
| `packages/core/test/Qadi.test.ts` | BEH-QD-049–052, BEH-QD-085, INV-QD-009, INV-QD-013 |
| `packages/testing/test/TestLayers.test.ts` | Test fixtures and layers, INV-QD-014 |
| `packages/react/test/QadiAtoms.test.ts` | BEH-QD-065, BEH-QD-069, BEH-QD-070, BEH-QD-071 |
| `packages/react/test/QadiProvider.test.tsx` | BEH-QD-067, BEH-QD-068, BEH-QD-070 |
| `packages/react/test/hooks.test.tsx` | BEH-QD-066, BEH-QD-068, BEH-QD-069, INV-QD-006, ADR-QD-017 |
| `packages/react/test/edges.test.tsx` | BEH-QD-067, BEH-QD-068 |

## §5 Acceptance scenario traceability

| Tag | Feature file | Behavior |
| --- | ------------ | -------- |
| REQ-QD-001 | `features/features/permissions/permissions.feature` | BEH-QD-001–003 |
| REQ-QD-002 | `features/features/permissions/composition.feature` | BEH-QD-019 |
| REQ-QD-003 | `features/features/roles/roles.feature` | BEH-QD-011 |
| REQ-QD-004 | `features/features/attributes/attributes.feature` | BEH-QD-034 |
| REQ-QD-005 | `features/features/rebac/relationships.feature` | BEH-QD-036 |
| REQ-QD-006 | `features/features/attributes/resource-attributes.feature` | BEH-QD-036 |
| REQ-QD-007 | `features/features/field-visibility/field-visibility.feature` | BEH-QD-018 |
| REQ-QD-008 | `features/features/serialization/round-trip.feature` | BEH-QD-058, INV-QD-003 |
| REQ-QD-009 | `features/features/attributes/ownership.feature` | BEH-QD-026, BEH-QD-036 |
| REQ-QD-010 | `features/features/actions/actions.feature` | BEH-QD-073–076, INV-QD-011 |
| REQ-QD-011 | `features/features/obligations/obligations.feature` | BEH-QD-081–085, INV-QD-012, INV-QD-013 |
| REQ-QD-012 | `features/features/history/history.feature` | BEH-QD-090–093, INV-QD-014 |
| REQ-QD-013 | `features/features/labels/labels.feature` | BEH-QD-098–099, INV-QD-015 |
| REQ-QD-014 | `features/features/subject-sets/subject-sets.feature` | BEH-QD-105–108, INV-QD-016 |
| REQ-QD-015 | `features/features/rules/rules.feature` | BEH-QD-111–116, INV-QD-017 |

## §6 Coverage targets

| Scope | Statements | Branches | Enforced by |
| ----- | ---------- | -------- | ----------- |
| `packages/core/src` | 95% | 95% | `vitest.config.ts` thresholds |
| Workspace | 90% | 90% | `vitest.config.ts` thresholds |

A shortfall fails the run; it is not merely reported.
