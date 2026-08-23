# Traceability Matrix

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-RTM                                       |
> | Revision       | 1.31                                           |
> | Effective Date | 2026-08-23                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Verification Record                            |
> | Change History | 1.31 (2026-08-23): A lossy projection is not an identity; INV-QD-030, INV-QD-031, ADR-QD-042, BEH-QD-167. `"use client"` and server rendering; BEH-QD-067. The 21 range corrected from 161–165, BEH-QD-166 having been added without it (CCR-QD-057)<br>1.30 (2026-08-23): An unwired port names its absence; INV-QD-029, ADR-QD-040, BEH-QD-045 (CCR-QD-055). A superseded seed is announced; ADR-QD-041, BEH-QD-152 (CCR-QD-056)<br>1.29 (2026-08-23): BEH-QD-072 — a guard hands its denial to the node that replaces it (CCR-QD-054)<br>1.28 (2026-08-23): `renderTrace` and the trace on `AccessDenied`; BEH-QD-144, BEH-QD-054 (ADR-QD-039, CCR-QD-053)<br>1.27 (2026-08-23): A seed never outlives the client's own answer; INV-QD-028, ADR-QD-039, BEH-QD-151 (CCR-QD-052)<br>1.26 (2026-08-22): ADR-QD-037, the circular-import/type-level-test gates; ADR-QD-038, changesets (CCR-QD-050)<br>1.25 (2026-08-22): ADR-QD-035, the witness/guard primitive; ADR-QD-036, the `@qadi/http` package shape (CCR-QD-044)<br>1.24 (2026-07-27): ADR-QD-034, the measured switch exception (CCR-QD-040)<br>1.23 (2026-07-26): The packed artifact; INV-QD-027, ADR-QD-033 (CCR-QD-038)<br>1.22 (2026-07-26): Four §1 ranges corrected — behaviour files 01, 03, 05 and 07 had gained identifiers the matrix never followed (CCR-QD-035)<br>1.21 (2026-07-26): `DecisionCache.ts` added to the services row (CCR-QD-034)<br>1.20 (2026-07-26): The Promise facade; behaviour 22, INV-QD-026, ADR-QD-032 (CCR-QD-033)<br>1.19 (2026-07-26): The decision cache; behaviour 21, INV-QD-025, ADR-QD-031 (CCR-QD-032)<br>1.18 (2026-07-26): Policy simplification; behaviour 20, INV-QD-024, ADR-QD-030 (CCR-QD-031)<br>1.17 (2026-07-26): `join` and `meet`; INV-QD-023, ADR-QD-029; MLS to Shipped (CCR-QD-030)<br>1.16 (2026-07-26): Decision hydration; behaviour 19, INV-QD-022, ADR-QD-028 (CCR-QD-029)<br>1.15 (2026-07-26): Policy explanation; behaviour 18, INV-QD-021, ADR-QD-027, `@REQ-QD-023` (CCR-QD-028)<br>1.14 (2026-07-26): Concurrent evaluation; behaviour 17, INV-QD-020, ADR-QD-026, `@REQ-QD-022` (CCR-QD-027)<br>1.13 (2026-07-26): ADR-QD-025, mutation testing as a merge gate (CCR-QD-026)<br>1.12 (2026-07-26): MLS verified; INV-QD-019 and BEH-QD-102, the order laws (CCR-QD-024)<br>1.11 (2026-07-26): Biba verified, both variants (CCR-QD-023)<br>1.10 (2026-07-26): Chinese Wall and task-based control verified (CCR-QD-022)<br>1.9 (2026-07-26): Separation of duty verified (CCR-QD-021)<br>1.8 (2026-07-26): Predicate output built (CCR-QD-020)<br>1.7 (2026-07-26): Rule tables built (CCR-QD-019)<br>1.6 (2026-07-26): Subject sets built (CCR-QD-018)<br>1.5 (2026-07-26): Label lattice built (CCR-QD-017)<br>1.4 (2026-07-26): Decision history built (CCR-QD-016)<br>1.3 (2026-07-26): Obligations built (CCR-QD-015)<br>1.2 (2026-07-26): Reactivity canary; BEH-QD-071 corrected (CCR-QD-013)<br>1.1 (2026-07-26): Action dimension built (CCR-QD-012)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

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
| [01 — Permission Tokens](behaviors/01-permissions.md) | BEH-QD-001–006 | `packages/core/src/Permission.ts` |
| [02 — Roles and Inheritance](behaviors/02-roles.md) | BEH-QD-009–012 | `packages/core/src/Role.ts`, `AuthSubject.ts` |
| [03 — Policy ADT](behaviors/03-policy-adt.md) | BEH-QD-017–020 | `packages/core/src/Policy.ts` |
| [04 — Matcher DSL](behaviors/04-matchers.md) | BEH-QD-025–028 | `packages/core/src/Matcher.ts` |
| [05 — Evaluator](behaviors/05-evaluator.md) | BEH-QD-033–040 | `packages/core/src/Evaluate.ts`, `Decision.ts` |
| [06 — Services and Layers](behaviors/06-services.md) | BEH-QD-041–045 | `packages/core/src/{CurrentSubject,AttributeResolver,RelationshipResolver,DecisionHistory,DecisionCache,EvaluationId}.ts` |
| [07 — Enforcement](behaviors/07-enforcement.md) | BEH-QD-049–054 | `packages/core/src/Qadi.ts`, `Errors.ts` |
| [08 — Serialization](behaviors/08-serialization.md) | BEH-QD-057–059 | `packages/core/src/Policy.ts` |
| [09 — React Integration](behaviors/09-react.md) | BEH-QD-065–072 | `packages/react/src/QadiAtoms.ts`, `QadiProvider.tsx`, `hooks.ts`, `components.tsx` |
| [10 — The Action Dimension](behaviors/10-actions.md) | BEH-QD-073–078 | `packages/core/src/Evaluate.ts`, `Policy.ts`, `Matcher.ts`, `Errors.ts` |
| [11 — Obligations](behaviors/11-obligations.md) | BEH-QD-081–087 | `packages/core/src/Obligation.ts`, `Decision.ts`, `Policy.ts`, `Evaluate.ts`, `Qadi.ts` |
| [12 — Decision History](behaviors/12-history.md) | BEH-QD-089–095 | `packages/core/src/DecisionHistory.ts`, `Policy.ts`, `Evaluate.ts`, `Errors.ts` |
| [13 — The Label Lattice](behaviors/13-labels.md) | BEH-QD-097–104 | `packages/core/src/SecurityLabel.ts`, `Matcher.ts` |
| [14 — Subject Sets](behaviors/14-subject-sets.md) | BEH-QD-105–109 | `packages/core/src/SubjectSet.ts` |
| [15 — Rule Tables](behaviors/15-rules.md) | BEH-QD-111–117 | `packages/core/src/Policy.ts`, `Evaluate.ts` |
| [16 — Predicate Output](behaviors/16-predicates.md) | BEH-QD-121–128 | `packages/core/src/Predicate.ts`, `Matcher.ts`, `Errors.ts` |
| [17 — Concurrent Evaluation](behaviors/17-concurrency.md) | BEH-QD-129–135 | `packages/core/src/Evaluate.ts` |
| [18 — Policy Explanation](behaviors/18-explanation.md) | BEH-QD-137–144 | `packages/core/src/Explanation.ts`, `Decision.ts` |
| [19 — Decision Hydration](behaviors/19-hydration.md) | BEH-QD-145–152 | `packages/react/src/Hydration.ts`, `HydrationSeed.ts`, `HydrationWarning.ts`, `QadiAtoms.ts` |
| [20 — Policy Simplification](behaviors/20-simplification.md) | BEH-QD-153–156 | `packages/core/src/Simplify.ts` |
| [21 — Decision Cache](behaviors/21-decision-cache.md) | BEH-QD-161–167 | `packages/core/src/DecisionCache.ts`, `Evaluate.ts` |
| [22 — The Promise Facade](behaviors/22-promise-facade.md) | BEH-QD-169–173 | `packages/promise/src/index.ts` |

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
| [INV-QD-018](invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows) | A predicate admits exactly the rows the evaluator allows | An executable predicate, compared against the evaluator | `Predicate.test.ts` (property over policies × rows) |
| [INV-QD-019](invariants.md#inv-qd-019-dominance-is-a-partial-order) | Dominance is a partial order | `>=` on level composed with containment on compartments | `Matcher.test.ts` (properties over sampled pairs and triples) |
| [INV-QD-020](invariants.md#inv-qd-020-concurrency-changes-lookups-never-decisions) | Concurrency changes lookups, never decisions | One fold per composite, driven by both paths in declaration order | `Evaluate.test.ts` (property over generated trees, sequential vs bounded vs unbounded) |
| [INV-QD-021](invariants.md#inv-qd-021-every-policy-explains) | Every policy explains | `Match.tagsExhaustive` over policies, matchers and refs; no error channel | `Explanation.test.ts` (property over generated trees, plus node counts) |
| [INV-QD-022](invariants.md#inv-qd-022-a-hydrated-decision-belongs-to-the-subject-that-hydrates-it) | A hydrated decision belongs to the subject that hydrates it | Subject-id check that seeds nothing on mismatch; undecodable entries dropped | `Hydration.test.ts` (cross-subject seeding asserted to deny) |
| [INV-QD-023](invariants.md#inv-qd-023-every-pair-of-labels-has-a-least-upper-and-a-greatest-lower-bound) | Every pair of labels has a least upper and a greatest lower bound | `join` maxes the level and unions the compartments; `meet` mins and intersects | `Matcher.test.ts` (bound and absorption properties) |
| [INV-QD-024](invariants.md#inv-qd-024-simplification-changes-the-tree-and-nothing-a-caller-can-observe) | Simplification changes the tree and nothing observable | Two conditional rewrites; nothing in the library calls it | `Simplify.test.ts` (property over policies × four subjects) |
| [INV-QD-025](invariants.md#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity) | A cache hit differs only in speed and identity | The trace is cached; id and duration stamped per call; subject in the key | `DecisionCache.test.ts` (call counts, id inequality, two subjects through one cache) |
| [INV-QD-026](invariants.md#inv-qd-026-the-facade-answers-what-the-core-answers) | The facade answers what the core answers | Every method is `runPromise` over a core function; no branch decides | `facade.test.ts` (both paths compared, trace included; failure rejects) |
| [INV-QD-027](invariants.md#inv-qd-027-the-published-package-decides-what-the-sources-decide) | The published package decides what the sources decide | The build graph emits every public package; `pnpm pack` resolves the workspace protocols | `scripts/check-package-install.mjs` (merge gate 10; five deliberate breaks) |
| [INV-QD-028](invariants.md#inv-qd-028-a-seed-never-outlives-the-clients-own-answer) | A seed never outlives the client's own answer | Seed held in its own atom; the atom a consumer reads consults it only while the computed result is `Initial` | `Hydration.test.ts` (a seeded allow for a failing policy asserted to read as a denial, immediately and after every scheduled turn) |
| [INV-QD-029](invariants.md#inv-qd-029-a-denial-names-only-what-was-consulted) | A denial names only what was consulted | `RelatedResult` is three-valued, so an unwired resolver answers `"Unknown"`; `attributeReason` distinguishes an unresolved attribute from one that compared wrong | `Evaluate.test.ts` (each sentence pinned against its neighbour), `relationships.feature` |
| [INV-QD-030](invariants.md#inv-qd-030-cache-key-uniqueness) | Cache key uniqueness | `DecisionCacheKey` is the `HashMap` key itself; Effect's structural `Equal`/`Hash` replace `JSON.stringify` | `DecisionCache.test.ts` (a `Date` beside its ISO string, an `undefined`-valued property beside an absent one — two evaluations each) |
| [INV-QD-031](invariants.md#inv-qd-031-a-rendered-explanation-denotes-exactly-one-policy) | A rendered explanation denotes exactly one policy | One `embed` helper parenthesises every non-atomic child of `renderExplanation` | `Explanation.test.ts` (the two groupings that collided, plus one case per embedding position), `explanation.feature` |

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
| [ADR-QD-024](decisions/024-predicate-output.md) | A predicate is a second interpreter, shipped with its reference semantics | INV-QD-004, INV-QD-006, INV-QD-010, INV-QD-011, INV-QD-013, INV-QD-018 |
| [ADR-QD-025](decisions/025-mutation-testing.md) | Mutation testing as a merge gate | — (it verifies the others rather than adding one) |
| [ADR-QD-026](decisions/026-concurrent-evaluation.md) | Concurrency changes lookups, never decisions | INV-QD-005 (scoped), INV-QD-006, INV-QD-017, INV-QD-020 |
| [ADR-QD-027](decisions/027-policy-explanation.md) | An explanation is a tree, and English is one rendering | INV-QD-021 |
| [ADR-QD-028](decisions/028-decision-hydration.md) | A hydrated decision is bound to a subject and carries no trace | INV-QD-007, INV-QD-022 |
| [ADR-QD-029](decisions/029-lattice-join-and-meet.md) | `join` and `meet` ship as utilities | INV-QD-019, INV-QD-023 |
| [ADR-QD-030](decisions/030-policy-simplification.md) | Simplification preserves the verdict, not the trace | INV-QD-004, INV-QD-012, INV-QD-024 |
| [ADR-QD-031](decisions/031-decision-cache.md) | A cache stores the trace, and the key is the security boundary | INV-QD-008, INV-QD-020, INV-QD-025 |
| [ADR-QD-032](decisions/032-promise-facade.md) | A Promise facade with no evaluator in it | INV-QD-006, INV-QD-026 |
| [ADR-QD-033](decisions/033-the-packed-artifact-is-the-product.md) | The packed artifact is the product, so a gate installs it | INV-QD-006, INV-QD-026, INV-QD-027 |
| [ADR-QD-034](decisions/034-the-switch-exception-is-measured.md) | The switch exception is measured, and two of the four were unguarded | INV-QD-004 |
| [ADR-QD-035](decisions/035-witness-guard-primitive.md) | A witness travels as a value, because Context cannot prove which permission it's for | INV-QD-009 |
| [ADR-QD-036](decisions/036-qadi-http-package-shape.md) | `@qadi/http`: two framework adapters, one enforcement path, one registry | — |
| [ADR-QD-037](decisions/037-circular-imports-and-type-level-tests-are-gates.md) | Two new merge gates: no circular imports, and type-level tests that outlive a comment | — (tooling gates, not an authorization invariant) |
| [ADR-QD-038](decisions/038-changesets-for-versioned-releases.md) | Changesets track versioned releases; publishing itself still doesn't run anywhere | — (release process, not an authorization invariant) |
| [ADR-QD-039](decisions/039-a-seed-is-not-an-authority.md) | A seed is not an authority, so it lives in its own atom | [INV-QD-028](invariants.md#inv-qd-028-a-seed-never-outlives-the-clients-own-answer) |
| [ADR-QD-040](decisions/040-an-unwired-port-names-its-absence.md) | An unwired port names its own absence, because a denial that guesses sends the reader to the wrong system | [INV-QD-029](invariants.md#inv-qd-029-a-denial-names-only-what-was-consulted) |
| [ADR-QD-041](decisions/041-a-mismatch-is-announced.md) | A hydration mismatch is announced, not resolved | [INV-QD-028](invariants.md#inv-qd-028-a-seed-never-outlives-the-clients-own-answer) |
| [ADR-QD-042](decisions/042-a-projection-is-not-an-identity.md) | A lossy projection is not an identity, in prose or in a cache key | [INV-QD-030](invariants.md#inv-qd-030-cache-key-uniqueness), [INV-QD-031](invariants.md#inv-qd-031-a-rendered-explanation-denotes-exactly-one-policy) |

## §4 Test file map

| Test file | Covers |
| --------- | ------ |
| `packages/core/test/v4-api-smoke.test.ts` | Effect v4 API canary |
| `packages/react/test/v4-reactivity-smoke.test.ts` | `effect/unstable/reactivity` API canary, ADR-QD-014 |
| `packages/core/test/Tokens.test.ts` | BEH-QD-001–012, INV-QD-001, INV-QD-002, INV-QD-010 |
| `packages/core/test/Policy.test.ts` | BEH-QD-017–019, BEH-QD-057–059, BEH-QD-074, BEH-QD-081, BEH-QD-091–092, INV-QD-003 |
| `packages/core/test/Matcher.test.ts` | BEH-QD-025–028, BEH-QD-075, BEH-QD-097–104, INV-QD-004, INV-QD-011, INV-QD-015, INV-QD-019, INV-QD-023 |
| `packages/core/test/Evaluate.test.ts` | BEH-QD-033–040, BEH-QD-073–078, BEH-QD-081–086, BEH-QD-089–095, BEH-QD-098–101, INV-QD-005, INV-QD-006, INV-QD-008, INV-QD-011, INV-QD-012, INV-QD-014, INV-QD-015, INV-QD-029, ADR-QD-009 |
| `packages/core/test/SubjectSet.test.ts` | BEH-QD-105–109, INV-QD-006, INV-QD-016 |
| `packages/core/test/Rules.test.ts` | BEH-QD-111–117, INV-QD-004, INV-QD-006, INV-QD-017 |
| `packages/core/test/Predicate.test.ts` | BEH-QD-121–128, INV-QD-006, INV-QD-011, INV-QD-018 |
| `packages/core/test/Explanation.test.ts` | BEH-QD-137–143, INV-QD-021, INV-QD-031 |
| `packages/core/test/RenderTrace.test.ts` | BEH-QD-144, INV-QD-004, INV-QD-020 |
| `packages/react/test/Hydration.test.ts` | BEH-QD-145–152, INV-QD-022, INV-QD-028, ADR-QD-041 |
| `packages/react/test/ServerRender.test.tsx` | BEH-QD-067, BEH-QD-145, BEH-QD-151 (server rendering) |
| `packages/core/test/Simplify.test.ts` | BEH-QD-153–156, INV-QD-024 |
| `packages/core/test/DecisionCache.test.ts` | BEH-QD-161–167, INV-QD-025, INV-QD-030 |
| `packages/promise/test/facade.test.ts` | BEH-QD-169–173, INV-QD-006, INV-QD-026 |
| `packages/core/test/Layers.test.ts` | BEH-QD-041–045, INV-QD-007 |
| `packages/core/test/Qadi.test.ts` | BEH-QD-049–053, BEH-QD-085, INV-QD-009, INV-QD-013 |
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
| REQ-QD-016 | `features/features/predicates/predicates.feature` | BEH-QD-121–127, INV-QD-018 |
| REQ-QD-017 | `features/features/separation-of-duty/separation-of-duty.feature` | BEH-QD-019, BEH-QD-026, BEH-QD-039 |
| REQ-QD-018 | `features/features/chinese-wall/chinese-wall.feature` | BEH-QD-019, BEH-QD-039, BEH-QD-092, BEH-QD-094, INV-QD-014 |
| REQ-QD-019 | `features/features/tbac/tbac.feature` | BEH-QD-019, BEH-QD-026, BEH-QD-036, BEH-QD-092 |
| REQ-QD-020 | `features/features/biba/biba.feature` | BEH-QD-034, BEH-QD-073, BEH-QD-098–099, INV-QD-015 |
| REQ-QD-021 | `features/features/mls/mls.feature` | BEH-QD-098–099, BEH-QD-102–103, INV-QD-015, INV-QD-019, INV-QD-023 |
| REQ-QD-022 | `features/features/concurrency/concurrency.feature` | BEH-QD-129–133, INV-QD-005, INV-QD-020 |
| REQ-QD-023 | `features/features/explanation/explanation.feature` | BEH-QD-137–141, INV-QD-021 |

## §6 Coverage targets

| Scope | Statements | Branches | Enforced by |
| ----- | ---------- | -------- | ----------- |
| `packages/core/src` | 95% | 95% | `vitest.config.ts` thresholds |
| Workspace | 90% | 90% | `vitest.config.ts` thresholds |

A shortfall fails the run; it is not merely reported.
