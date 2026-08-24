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
| `@qadi/http` | `effect/unstable/http`/`httpapi` bindings — enforcement middleware, subject extraction, permission registry |
| `@qadi/devtools` | A headless decision timeline, and a React dock that renders it |
| `@qadi/features` | Cucumber acceptance suite (private) |

## Public API surface

### Tokens

| Export | Kind | Source |
| ------ | ---- | ------ |
| `permission`, `permissionKey`, `isValidSegment` | function | `Permission.ts` |
| `Permission`, `PermissionKey`, `InferResource`, `InferAction`, `InferKey` | type | `Permission.ts` |
| `PermissionSchema` | schema | `Permission.ts` |
| `SEGMENT_PATTERN` | constant | `Permission.ts` |
| `role`, `flattenPermissions`, `flattenAll`, `roleNames`, `resolveRoleGraph` | function | `Role.ts` |
| `makeSubject`, `fromRoles`, `withAttributes`, `anonymous` | function | `AuthSubject.ts` |
| `AuthSubject` | type | `AuthSubject.ts` |
| `Role`, `RoleDefinition` | type | `Role.ts` |
| `SubjectId`, `ResourceId` | type | `Identity.ts` |
| `makeSubjectId`, `makeResourceId` | function | `Identity.ts` |

### Policy

| Export | Kind | Source |
| ------ | ---- | ------ |
| `Policy`, `FieldStrategy` | schema + type | `Policy.ts` |
| `DEFAULT_MAX_DEPTH` | constant | `Policy.ts` |
| `PolicyEncoded`, `RuleEncoded` | type | `Policy.ts` |
| `RoleName`, `ActionName`, `EventName`, `RelationName`, `LabelName` | schema + type | `Policy.ts` |
| `makeRoleName` | function | `Policy.ts` |
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
| `Explanation`, `RenderOptions`, `RequirementKind` | type | `Explanation.ts` |

### Evaluation and enforcement

| Export | Kind | Source |
| ------ | ---- | ------ |
| `evaluate` | function | `Evaluate.ts` |
| `Decision`, `Allow`, `Deny`, `Trace`, `isAllowed`, `project` | type + function | `Decision.ts` |
| `enforce`, `enforceProjected`, `check`, `decide`, `assert`, `filter`, `filterStream`, `guard` | function | `Qadi.ts` |
| `EvaluateOptions` | type | `Evaluate.ts` |
| `Resource` | type | `Resource.ts` |
| `decideSubjects`, `filterSubjects`, `decideSubjectsStream`, `filterSubjectsStream` | function | `SubjectSet.ts` |
| `SubjectDecision`, `SubjectSetServices` | type | `SubjectSet.ts` |
| `toPredicate`, `evaluatePredicate` | function | `Predicate.ts` |
| `Predicate`, `CompareOp`, `PredicateOptions`, `PredicateServices` | type | `Predicate.ts` |
| `EvaluationServices` | type | `Evaluate.ts` |
| `intersectFields`, `unionFields` | function | `Decision.ts` |
| `renderTrace` | function | `Decision.ts` |
| `RenderTraceOptions` | type | `Decision.ts` |
| `EnforceOptions`, `EnforcementError`, `ObligationHandler` | type | `Qadi.ts` |
| `Authorized` | type | `Authorized.ts` |

#### Which of the six to call

`Qadi.ts`'s own header names the line that actually divides these six: **reporting
versus enforcing**. `decide` and `check` report — they hand back an answer and run
nothing, so any obligation is the caller's to read off the decision. `assert`,
`enforce`, `enforceProjected` and `filter` enforce — each either runs work or hands
over data, so each refuses an allow whose obligation nobody has discharged
([ADR-QD-019](decisions/019-obligations.md)).

| Call | Use when | Returns | On denial |
| ---- | -------- | ------- | --------- |
| `decide` | You need the full decision — trace, visible fields, obligations — to inspect, log, or hand to `@qadi/react`'s hydration. | `Decision` (`Allow \| Deny`) | Carried in the `Decision`, never thrown |
| `check` | You need a plain yes/no gate, **and the policy carries no obligation**. A boolean has no room to represent one, so an obligation on an `Allow` a caller reaches through `check` is silently never discharged — reach for `decide` (or an enforcing call) the moment a policy might carry one. | `boolean` | `false` |
| `assert` | You have no `Effect` to wrap — a standalone precondition before a block of otherwise-imperative code. | `void` | Fails with `AccessDenied` |
| `enforce` | You have one `Effect` to guard, and its result should pass through unchanged. | `A`, the wrapped effect's own result | Fails with `AccessDenied`; the wrapped effect never runs |
| `enforceProjected` | You have one `Effect` returning a record, and the caller on the other side of it should see only the fields the policy allows — an API response, a UI prop, anything crossing a trust boundary. | `Partial<A>` | Fails with `AccessDenied`; the wrapped effect never runs |
| `filter` | You have a list of items to authorize one at a time, each as the evaluation's `resource`, and want back only the ones allowed. | `ReadonlyArray<A>` | Denied items are dropped from the result, not surfaced individually |

The closest pair is `check` and `decide`: both report, so the choice is purely
about how much of the decision the caller needs — reach for `decide` by default and
drop to `check` only once it's clear the policy in question never carries an
obligation. The other close pair is `enforce` and `enforceProjected`: identical
enforcement behavior, differing only in whether the wrapped effect's result is a
record whose fields the policy should filter on the way out.

`filterStream`, `decideSubjectsStream` and `filterSubjectsStream` are streamed
siblings of `filter`, `decideSubjects` and `filterSubjects` respectively — same
per-item decision, `Stream.Stream` in and out instead of `ReadonlyArray`. Reach
for one only when the collection itself is a stream (paginated rows, say) or too
large to hold in memory as an array; `filter`/`decideSubjects`/`filterSubjects`
stay the default for the common case of a collection already in hand.

`guard` doesn't fit the report-versus-enforce split the six above are built
from — built on `enforce`, but shaped differently: rather than wrapping an
existing `Effect`, it takes a resource and a handler function,
`guard(permission, policy)(resource, handler)`, and hands the handler an
`Authorized<P>` witness that the check succeeded, as a value rather than
through the environment. Reach for it when downstream code needs proof, not
just an unblocked effect — a handler typed to require `Authorized<typeof
writeDocument>` cannot be called without going through `guard` first, which
`enforce` alone cannot express. See [ADR-QD-035](decisions/035-witness-guard-primitive.md).

### Services

| Export | Kind | Source |
| ------ | ---- | ------ |
| `CurrentSubject`, `currentSubjectLayer`, `CurrentSubjectAnonymous` | service + layer | `CurrentSubject.ts` |
| `AttributeResolver`, `AttributeResolverNone`, `attributeResolverFromRecord` | service + layer | `AttributeResolver.ts` |
| `attributeResolverRetrying`, `attributeResolverBounded` | layer combinator | `AttributeResolver.ts` |
| `RelationshipResolver`, `RelationshipResolverNever`, `relationshipResolverFromEdges` | service + layer | `RelationshipResolver.ts` |
| `relationshipResolverRetrying`, `relationshipResolverBounded` | layer combinator | `RelationshipResolver.ts` |
| `DecisionHistory`, `DecisionHistoryUnknown`, `decisionHistoryFromEvents` | service + layer | `DecisionHistory.ts` |
| `EvaluationId`, `EvaluationIdLive`, `evaluationIdSequential` | service + layer | `EvaluationId.ts` |
| `DecisionCache`, `decisionCacheLayer` | service + layer | `DecisionCache.ts` |
| `DecisionSink` | service | `DecisionSink.ts` |
| `decisionSinkRing`, `DEFAULT_RING_CAPACITY` | layer factory + constant | `DecisionSinkRing.ts` |
| `decisionSinkForwarding`, `decisionSinkAll` | layer factory | `DecisionSinkForwarding.ts` |
| `decisionSinkFeed`, `DEFAULT_FEED_CAPACITY` | layer factory + constant | `DecisionSinkFeed.ts` |
| `AttributeResolverShape`, `RelationshipResolverShape`, `RelationshipCheck` | type | resolver modules |
| `RelatedResult`, `RelationshipEdgeInput` | type | `RelationshipResolver.ts` |
| `RelationshipEdge` | value class | `RelationshipResolver.ts` |
| `DecisionHistoryShape`, `ActedQuery`, `ActedResult` | type | `DecisionHistory.ts` |
| `ActedEventInput`, `ActedAnywhereInput` | type | `DecisionHistory.ts` |
| `ActedEvent`, `ActedAnywhere` | value class | `DecisionHistory.ts` |
| `EvaluationIdShape`, `DecisionCacheShape`, `DecisionCacheKey` | type | service modules |
| `DecisionSinkShape`, `DecisionRecord`, `DecisionOutcome`, `StoredRecord` | type | sink modules |
| `ObligationRecord`, `ObligationOutcome`, `SinkRecord`, `Stamped` | type | sink modules |
| `SinkRecordWire` | schema + type | `SinkCodec.ts` |
| `toWire`, `fromWire`, `encodeRecord`, `decodeRecord`, `decodeRecordWire` | codec | `SinkCodec.ts` |
| `CacheOutcome`, `CacheLookup` | type | `DecisionCache.ts` |
| `Decided`, `Failed` | value class | `DecisionRecord.ts` |

**Seven services, and only five are required.** `DecisionHistory` was the one added
after the initial release, and the one whose default had to be **three-valued** — see
[BEH-QD-042](behaviors/06-services.md) and
[INV-QD-014](invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities).

`DecisionCache` is the sixth and is **optional**: it is absent from
`EvaluationServices` and read through `Effect.serviceOption`, so an application that
never provides it is unaffected ([ADR-QD-031](decisions/031-decision-cache.md)). That
is also why it was missed — it is a service that does not appear in the type every
other service appears in.

`DecisionSink` is the seventh and is optional on the same terms
([ADR-QD-044](decisions/044-an-optional-decision-sink.md)). It is the only
**write-only** port: `evaluate` hands it every completed evaluation and reads
nothing back, and whatever happens to it — a failure or a defect — cannot change
the decision ([INV-QD-035](invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)).

#### Inspecting a policy, a role graph and two traces

| Export | Kind | Source |
| ------ | ---- | ------ |
| `policyDepth` | function | `Policy.ts` |
| `permissionProvenance`, `PermissionGrant` | function + type | `Role.ts` |
| `diffTraces`, `flippedAt` | function | `TraceDiff.ts` |
| `TraceDifference`, `TracePath` | type | `TraceDiff.ts` |
| `VerdictChanged`, `ReasonChanged`, `ChildCountChanged`, `FieldsChanged`, `ObligationsChanged` | type | `TraceDiff.ts` |

Each answers a question the library could pose but not answer. `policyDepth`
counts the way the evaluator counts, so `policyDepth(p) <= n` is exactly the
condition under which `evaluate(p, { maxDepth: n })` will not raise
([BEH-QD-191](behaviors/25-inspection.md)). `permissionProvenance` returns the
granting role and path that `flattenPermissions` computes and discards.
`diffTraces` names *which node* changed between two evaluations — the comparison
a what-if needs and that `isMismatch`, which compares verdicts alone, cannot give.

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
| `QadiAtoms`, `QadiLayer`, `QadiRuntimeServices`, `DecisionResult`, `AskedQuestion` | type | `QadiAtoms.ts` |
| `QadiAtomsOptions`, `HydrationMismatch`, `HydrationMismatchReporter` | type | `QadiAtoms.ts` |
| `Can`, `Cannot` | component | `components.tsx` |
| `CanProps`, `CannotProps`, `DeniedNode` | type | `components.tsx` |
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

### `@qadi/http`

| Export | Kind | Source |
| ------ | ---- | ------ |
| `requiresPermission`, `AnnotatedEndpoint` | function + type | `RequirePermission.ts` |
| `RequiredPermission`, `PermissionRequirement` | service + type | `RequirePermission.ts` |
| `RequirePermission`, `RequirePermissionLive` | middleware + layer | `RequirePermission.ts` |
| `PublicEndpoint`, `publicEndpoint`, `PublicDeclaration` | service + function + type | `RequirePermission.ts` |
| `guardRoute` | function | `GuardRoute.ts` |
| `addGuardedRoute` | function | `PermissionRegistry.ts` |
| `PermissionRegistry`, `PermissionRegistryLive` | service + layer | `PermissionRegistry.ts` |
| `registerApi`, `permissionRegistryRoute`, `permissionRegistryRouteUnguarded` | function + layer | `PermissionRegistry.ts` |
| `decisionStreamRoute` | layer factory | `DecisionStreamRoute.ts` |
| `EndpointDescriptor`, `PermissionRegistryData`, `PermissionRegistryShape` | type | `PermissionRegistry.ts` |
| `ENFORCEMENT_ERROR_TAGS`, `toResponse` | const + function | `QadiHttpError.ts` |
| `SubjectExtractor`, `subjectExtractorBearer` | service + layer | `SubjectExtractor.ts` |
| `SubjectExtractorShape` | type | `SubjectExtractor.ts` |
| `SubjectExtractionFailed` | error | `SubjectExtractor.ts` |

Two framework adapters over one enforcement path — `RequirePermission` for
`effect/unstable/httpapi`'s declarative `HttpApi`, `guardRoute`/
`addGuardedRoute` for bare `effect/unstable/http`'s `HttpRouter` — both thin
wrappers over `@qadi/core`'s `guard`, never a second enforcement
implementation. `requiresPermission` is not `.pipe()`-composable: TypeScript
only preserves an `HttpApiEndpoint`'s literal type through an inline,
unannotated callback passed directly to `.pipe()`, so the canonical usage is

```ts
HttpApiEndpoint.get("read", "/documents").pipe((endpoint) =>
  endpoint.annotate(
    RequiredPermission,
    requiresPermission(endpoint, { permission: readPermission, policy: readPolicy }),
  ),
)
```

not a one-step `.pipe(requiresPermission({...}))`. `PermissionRegistry`
answers "which permission does which endpoint require" for a mix of both
surfaces — seed it from an `HttpApi` with `registerApi`, from `HttpRouter`
routes by using `addGuardedRoute` in place of a bare `HttpRouter.add`, and
mount `permissionRegistryRoute(permission, policy)` to expose the result at
`/__permissions`, **behind that policy**. The route publishes every guarded path
and the permission each requires, so it is guarded by default;
`permissionRegistryRouteUnguarded(reason)` is the explicit opt-out and warns on
every request.
See [ADR-QD-036](decisions/036-qadi-http-package-shape.md).

### `@qadi/testing`

| Export | Kind | Source |
| ------ | ---- | ------ |
| `qadiTestLayer` | layer | `QadiTestLayer.ts` |
| `qadiReviewLayer` | layer | `QadiReviewLayer.ts` |
| `recordingAttributeResolver` | layer | `RecordingAttributeResolver.ts` |
| `edgeRelationshipResolver` | layer | `EdgeRelationshipResolver.ts` |
| `eventDecisionHistory` | layer | `EventDecisionHistory.ts` |
| `failingAttributeResolver` | layer | `FailingAttributeResolver.ts` |
| `QadiTestServices`, `TestLayerOptions` | type | `QadiReviewLayer.ts` |
| `subjectWith`, `permissions`, `roles`, `policies` | fixture | `Fixtures.ts` |
| `nobody`, `viewer`, `administrator` | fixture | `Fixtures.ts` |

### `@qadi/devtools`

Two entry points. `@qadi/devtools` is the headless model — decoding, merging,
ordering and pairing, with no React in it — and `@qadi/devtools/react` renders
that model and computes nothing. `react` is an **optional** peer dependency, so
a server-side aggregator can consume the model without a UI.

The `bun` condition of every entry point in a package's `exports` map is read by
gate 9, so a second entry point's surface is checked exactly as the first one's
is (CCR-QD-067).

| Export | Kind | Source |
| ------ | ---- | ------ |
| `Source`, `DecisionEventSource`, `MalformedReason` | type | `model/Source.ts` |
| `sourceFromRecords`, `sourceFromFeed`, `sourceFromEventSource` | constructor | `model/Source.ts` |
| `Timeline`, `TimelineEntry` | type | `model/Timeline.ts` |
| `TimelineDecision`, `TimelineOrphan` | class | `model/Timeline.ts` |
| `emptyTimeline`, `ingest`, `ingestAll` | function | `model/Timeline.ts` |
| `DEFAULT_TIMELINE_CAPACITY` | constant | `model/Timeline.ts` |
| `TimelineStore` | type | `model/TimelineStore.ts` |
| `makeTimelineStore`, `runSource` | function | `model/TimelineStore.ts` |
| `useTimeline`, `useTimelineStore`, `UseTimeline` | hook + type | `react/useTimeline.ts` |

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
