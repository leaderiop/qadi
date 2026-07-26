# Overview

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-OVERVIEW                                  |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-07-25                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.2 (2026-07-26): Drifted a second time — ten exports and `@qadi/promise` missing; the surfaces of all four public packages now listed, a "Not listed above" table added, and `scripts/check-api-surface.mjs` added as merge gate 9 so a third drift fails the build (CCR-QD-034)<br>1.1 (2026-07-26): Public API surface brought up to date — it had described the library as it was before any of the seven enablers shipped, omitting twenty-one exports and four errors; five services, not four (CCR-QD-025)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## Mission

Qadi decides whether a subject may perform an action, and which parts of the
result they may see. It is Effect-native: evaluation is an `Effect`, dependencies
are `Layer`s, and observability comes from Effect's tracing rather than a
bespoke port.

## Design philosophy

**One definition per concept.** The policy union is a Schema; the type and the
JSON codec are derived from it. Every defect this library was written to remove
came from maintaining two representations of one thing and letting them drift.

**Failure is not denial.** A broken attribute lookup is an error, never a
denial. Reporting an outage as "not authorized" sends engineers to audit
permissions instead of the backend.

**Defaults fail closed.** An unwired resolver denies. A missing subject holds
nothing. A wiring omission must surface as denials in testing, not as a silent
grant in production.

**Determinism is a feature.** Time and identifiers come from services, so a
decision — including its trace and duration — is reproducible under test.

**Say only what is true.** Capability that is not implemented, wired and tested
is not shipped. See [ADR-QD-016](decisions/016-gxp-out-of-scope.md).

## Packages

| Package | Description |
| ------- | ----------- |
| `@qadi/core` | Tokens, policy ADT, matchers, evaluator, enforcement |
| `@qadi/testing` | Fixtures, deterministic layers, recording resolvers |
| `@qadi/react` | `QadiProvider`, hooks, `Can`/`Cannot` |
| `@qadi/promise` | A Promise facade for callers who do not use Effect |
| `@qadi/features` | Cucumber acceptance suite (private) |

## Public API surface

### Tokens

| Export | Kind | Source |
| ------ | ---- | ------ |
| `permission`, `permissionKey`, `isValidSegment` | function | `Permission.ts` |
| `Permission`, `PermissionKey`, `InferResource`, `InferAction`, `InferKey` | type | `Permission.ts` |
| `PermissionSchema` | schema | `Permission.ts` |
| `role`, `flattenPermissions`, `flattenAll`, `roleNames`, `resolveRoleGraph` | function | `Role.ts` |
| `makeSubject`, `fromRoles`, `withAttributes`, `anonymous` | function | `AuthSubject.ts` |
| `AuthSubject` | type | `AuthSubject.ts` |
| `Role`, `RoleDefinition` | type | `Role.ts` |

### Policy

| Export | Kind | Source |
| ------ | ---- | ------ |
| `Policy`, `FieldStrategy` | schema + type | `Policy.ts` |
| `hasPermission`, `hasRole`, `hasAttribute`, `hasResourceAttribute`, `hasRelationship` | function | `Policy.ts` |
| `hasAction` | function | `Policy.ts` |
| `hasActed`, `hasNotActed` | function | `Policy.ts` |
| `allOf`, `anyOf`, `not`, `labeled`, `anyOfRoles` | function | `Policy.ts` |
| `obliged` | function | `Policy.ts` |
| `rules`, `permitWhen`, `denyWhen` | function | `Policy.ts` |
| `Combining`, `RuleEffect`, `Rule` | schema + type | `Policy.ts` |
| `toJson`, `fromJson`, `toJsonValue`, `fromJsonValue`, `PolicyFromJson` | codec | `Policy.ts` |
| `eq`, `neq`, `inArray`, `exists`, `gte`, `lt`, `contains`, `fieldMatch`, `someMatch`, `everyMatch`, `size` | function | `Matcher.ts` |
| `dominates` | function | `Matcher.ts` |
| `subject`, `subjectId`, `resource`, `action`, `literal` | function | `Matcher.ts` |
| `SecurityLabel`, `LabelOrdering` | type | `SecurityLabel.ts` |
| `isSecurityLabel`, `compareLabels`, `labelDominates` | function | `SecurityLabel.ts` |
| `join`, `meet` | function | `SecurityLabel.ts` |
| `Obligation`, `ObligationOptions` | schema + type | `Obligation.ts` |
| `obligation`, `unionObligations`, `bindingObligations` | function | `Obligation.ts` |
| `FieldOptions`, `CombinatorOptions`, `HistoryOptions`, `HistoryScope` | type | `Policy.ts` |
| `Matcher`, `ValueRef`, `MatcherContext` | schema + type | `Matcher.ts` |
| `evaluateMatcher`, `referencesAction`, `referencesResource`, `getByPath` | function | `Matcher.ts` |
| `simplify` | function | `Simplify.ts` |
| `explain`, `renderExplanation` | function | `Explanation.ts` |
| `Explanation`, `RenderOptions` | type | `Explanation.ts` |

### Evaluation and enforcement

| Export | Kind | Source |
| ------ | ---- | ------ |
| `evaluate` | function | `Evaluate.ts` |
| `Decision`, `Allow`, `Deny`, `Trace`, `isAllowed`, `project` | type + function | `Decision.ts` |
| `enforce`, `enforceProjected`, `check`, `decide`, `assert`, `filter` | function | `Qadi.ts` |
| `EvaluateOptions`, `Resource` | type | `Evaluate.ts` |
| `decideSubjects`, `filterSubjects` | function | `SubjectSet.ts` |
| `SubjectDecision`, `SubjectSetServices` | type | `SubjectSet.ts` |
| `toPredicate`, `evaluatePredicate` | function | `Predicate.ts` |
| `Predicate`, `CompareOp`, `PredicateOptions`, `PredicateServices` | type | `Predicate.ts` |
| `EvaluationServices` | type | `Evaluate.ts` |
| `intersectFields`, `unionFields` | function | `Decision.ts` |
| `EnforceOptions`, `EnforcementError`, `ObligationHandler` | type | `Qadi.ts` |

### Services

| Export | Kind | Source |
| ------ | ---- | ------ |
| `CurrentSubject`, `currentSubjectLayer`, `CurrentSubjectAnonymous` | service + layer | `CurrentSubject.ts` |
| `AttributeResolver`, `AttributeResolverNone`, `attributeResolverFromRecord` | service + layer | `AttributeResolver.ts` |
| `RelationshipResolver`, `RelationshipResolverNever`, `relationshipResolverFromEdges` | service + layer | `RelationshipResolver.ts` |
| `DecisionHistory`, `DecisionHistoryUnknown`, `decisionHistoryFromEvents` | service + layer | `DecisionHistory.ts` |
| `EvaluationId`, `EvaluationIdLive`, `evaluationIdSequential` | service + layer | `EvaluationId.ts` |
| `DecisionCache`, `decisionCacheLayer` | service + layer | `DecisionCache.ts` |
| `AttributeResolverShape`, `RelationshipResolverShape`, `RelationshipCheck` | type | resolver modules |
| `DecisionHistoryShape`, `ActedQuery`, `ActedResult` | type | `DecisionHistory.ts` |
| `EvaluationIdShape`, `DecisionCacheShape`, `DecisionCacheKey` | type | service modules |

**Six services, and only five are required.** `DecisionHistory` was the one added
after the initial release, and the one whose default had to be **three-valued** — see
[BEH-QD-042](behaviors/06-services.md) and
[INV-QD-014](invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities).

`DecisionCache` is the sixth and is **optional**: it is absent from
`EvaluationServices` and read through `Effect.serviceOption`, so an application that
never provides it is unaffected ([ADR-QD-031](decisions/031-decision-cache.md)). That
is also why it was missed — it is a service that does not appear in the type every
other service appears in.

### Errors

`AccessDenied`, `AttributeResolveError`, `RelationshipResolveError`,
`MissingResource`, `MissingResourceId`, `MissingAction`, `PolicyTooDeep`,
`CircularRoleInheritance`, `InvalidPermissionSegment`,
`DecisionHistoryUnavailable`, `UndischargedObligation`, `PolicyNotTranslatable`,
plus `ERROR_CODES` and `errorCode`, and the two unions `EvaluationError` and
`QadiError`. See [ADR-QD-008](decisions/008-error-taxonomy.md).

## The other packages

`@qadi/core` is the library; these are the surfaces built on it. They are listed here
because this section is called the *public API surface*, and a reader looking for
`makeQadi` should not have to know which package it lives in.

### `@qadi/react`

| Export | Kind | Source |
| ------ | ---- | ------ |
| `QadiProvider`, `useQadiContext`, `useAtomValue` | component + hook | `QadiProvider.tsx` |
| `QadiProviderProps`, `QadiContextValue`, `InitialValues` | type | `QadiProvider.tsx` |
| `MissingQadiProviderError` | class | `QadiProvider.tsx` |
| `makeQadiAtoms`, `currentDecision` | function | `QadiAtoms.ts` |
| `QadiAtoms`, `QadiLayer`, `QadiRuntimeServices`, `DecisionResult` | type | `QadiAtoms.ts` |
| `Can`, `Cannot` | component | `components.tsx` |
| `CanProps`, `CannotProps` | type | `components.tsx` |
| `useSubject`, `useDecision`, `useCan`, `useDecisionSuspense` | hook | `hooks.ts` |
| `usePolicies`, `useProjected`, `useInvalidate` | hook | `hooks.ts` |
| `dehydrateDecisions`, `hydrateDecisions` | function | `Hydration.ts` |
| `DehydratedDecisions`, `DehydratedEntry`, `DecisionEntry`, `DehydrateOptions` | type | `Hydration.ts` |

`currentDecision` is the one to read twice: it is the single place the rule "a decision
being re-checked is not a decision" lives
([ADR-QD-017](decisions/017-stale-decisions-are-not-decisions.md)), and a consumer
reading `AsyncResult.isSuccess` directly will report stale allows.

### `@qadi/promise`

| Export | Kind | Source |
| ------ | ---- | ------ |
| `makeQadi` | function | `index.ts` |
| `Qadi`, `QadiLayer` | type | `index.ts` |

Three exports, and the package is one file with no evaluation logic in it — every
method forwards to `@qadi/core` ([ADR-QD-032](decisions/032-promise-facade.md)).

### `@qadi/testing`

| Export | Kind | Source |
| ------ | ---- | ------ |
| `qadiTestLayer`, `qadiReviewLayer` | layer | `TestLayers.ts` |
| `recordingAttributeResolver`, `edgeRelationshipResolver`, `eventDecisionHistory` | layer | `TestLayers.ts` |
| `failingAttributeResolver` | layer | `TestLayers.ts` |
| `QadiTestServices`, `TestLayerOptions` | type | `TestLayers.ts` |
| `subjectWith`, `permissions`, `roles`, `policies` | fixture | `Fixtures.ts` |
| `nobody`, `viewer`, `administrator` | fixture | `Fixtures.ts` |

## Not listed above

Every export not named in the tables above appears here, with the reason. The gate in
`scripts/check-api-surface.mjs` accepts a name found *anywhere* in this document, so
this table is what keeps an omission **explicit** rather than silent — the same
standard the rest of the specification holds itself to.

| Export | Why not listed |
| ------ | -------------- |
| `Requirement`, `All`, `Any`, `Negated`, `Named`, `Owing`, `Row`, `Table` | The eight members of the `Explanation` union. A caller needs the union and the two functions over it; naming each member above would describe the shape of a tree rather than the surface of an API. They are specified in [18 — Policy Explanation](behaviors/18-explanation.md) |

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  currentSubjectLayer,
  enforceProjected,
  fromRoles,
  hasPermission,
  hasRole,
  permission,
  role,
} from "@qadi/core";

const readDoc = permission("doc", "read");
const editor = role({ name: "editor", permissions: [readDoc] });

// Module-level constants: a policy built inline would be a new object per call.
const canReadTitle = allOf([
  hasRole("editor"),
  hasPermission(readDoc, { fields: ["id", "title"] }),
]);

const qadiServices = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
);

declare const loadDocument: (id: string) => Effect.Effect<{
  id: string;
  title: string;
  internalNotes: string;
}>;

const program = loadDocument("doc-1").pipe(
  enforceProjected(canReadTitle),
  Effect.provide(currentSubjectLayer(fromRoles({ id: "u1", roles: [editor] }))),
  Effect.provide(qadiServices),
);
// → { id: "doc-1", title: "…" }   `internalNotes` is not returned.
```

---

_Next: [Requirement Identifier Scheme](process/requirement-id-scheme.md)_
