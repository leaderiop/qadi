# Overview

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-OVERVIEW                                  |
> | Revision       | 1.43                                           |
> | Effective Date | 2026-10-06                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.43 (2026-10-07): `decideSubject`, `SubjectOutcome` and `FilteredSubjectOutcome` added; the streamed subject-set siblings report per element (CCR-QD-187)<br>1.42 (2026-10-07): `planRetention`, `RetentionPlan` and `RetentionInputInvalid` added (CCR-QD-186)<br>1.41 (2026-10-06): `isFieldStrategy` (`FieldLattice.ts`) and `isCombining` (`ShortCircuit.ts`) added to "Not listed above" — the one membership test per closed union, read by the evaluator's lookups and by `renderExplanation` (ADR-QD-092 amendment, CCR-QD-183)<br>1.40 (2026-10-06): Pure v2, 0.11.0 (ADR-QD-096/097/078 amendments, CCR-QD-182) — `@qadi/core`: `SinkRecordJson` is the version-2 encoded type alone; `WireVersion` is `2` and `WIRE_VERSIONS` `[2]`; `decodeSinkRecord` refuses a record with no `version` (or any but 2) as `UnsupportedVersion`; `DecodeStoredRecordOptions` removed and `decodeStoredRecord`/`decodeStoredRecordString` take no options (**breaking**). `@qadi/react`: `DehydratedPayload`, `DehydratedDecisionsV1` and `DehydratedEntryV1` removed (**breaking**). `@qadi/devtools`: `sourceFromEventSource` loses `legacyEnvironment` (**breaking**). `@qadi/audit`: `AuditEntry` rows are version 2 only, and `decodeAuditEntry` refuses a pre-0.10 row<br>1.39 (2026-10-05): ARCH-11 (ADR-QD-097, CCR-QD-181) — `@qadi/core`: `makeDecisionLog`, `DEFAULT_LOG_CAPACITY`, `DecisionLog`, `DecisionLogRead`, `DecisionLogReader`, `LogCursor`, `LogEntry`, `DecisionLogEntries`, `formatLogCursor`, `parseLogCursor`, `storedRecordOrder`, `StoredRecordJson`, `encodeStoredRecord`/`encodeStoredRecordString`, `decodeStoredRecord`/`decodeStoredRecordString` and `DecodeStoredRecordOptions` added; `Stamped`, `StoredRecord`, `StoredDecisionRecord`, `StoredObligationRecord` and `stampRecord` move to `DecisionRecord.ts`; `decisionSinkRing`, `DEFAULT_RING_CAPACITY`, `decisionSinkFeed` and `DEFAULT_FEED_CAPACITY` removed (**breaking**). `@qadi/http`: `decisionStreamRoute` takes a `DecisionLogReader` and serves the backlog prelude; `frame` takes a `DecisionFrameEvent` and a cursor; `decisionFrames` takes one read's entries; `DecisionFrameEvent`, `DecisionStreamSynced`, `syncedFrame` and `decisionBacklogRoute` added. `@qadi/devtools`: `Source` is one scoped `read` (`SourceRead` added) and `sourceFromFeed` removed; `sourceFromEventSource` loses `environment`, gains `legacyEnvironment`/`syncTimeout` and reads the prelude; `DecisionEventSource` is `onEvent` per `DecisionEventName` (added)<br>1.38 (2026-10-05): ARCH-15 (ADR-QD-096, CCR-QD-180) — the record wire is versioned: `SinkRecordJson` is the closed union of version-1 and version-2 bytes, `DecodeRefusal` gains `UnsupportedVersion`, `WireVersion`/`WIRE_VERSIONS` added; every writer writes version 2 (the staged `wireVersion` option and `DEFAULT_WIRE_VERSION` were added and removed within this change); devtools' `MalformedReason` gains `"unsupported-version"`; `AuditEntry` rows are a union of wire versions<br>1.37 (2026-10-05): ARCH-09 (ADR-QD-095, CCR-QD-179) — `@qadi/core`'s record codec is four operations, `encodeSinkRecord`/`encodeSinkRecordString`/`decodeSinkRecord`/`decodeSinkRecordString`, over `SinkRecordJson`; `SinkRecordNotEncodable`/`SinkRecordNotDecodable` (with `EncodeRefusal`, `DecodeRefusal`, `OpaqueKind`, `UnrepresentableKind`, `WirePath`, `SinkRecordTag`) join the errors; `toWire`, `fromWireUnsafe`, `isJsonSafe`, `isRecordJsonSafe`, `encodeRecord`, `encodeRecordSync`, `decodeRecordWire`, `decodeRecord`, `EvaluationErrorSchema` and `SinkRecordWire` removed. `@qadi/http` gains `decisionFrames` and `DecisionStreamOptions.onRefused`, and `frame` fails with `SinkRecordNotEncodable`; `@qadi/audit` gains `decodeAuditEntry`; `@qadi/devtools`' `MalformedReason` gains `"too-deep"`<br>1.36 (2026-10-05): ARCH-10 (ADR-QD-094, CCR-QD-177) — `@qadi/core` gains the five port descriptions (`attributeResolverPort`, …), `PortDescription`, `PortShape`, `PortReply`, `PortScript`, `PortSpanName`, the doubles `scriptedPort`/`recordingPort`/`replyTable`/`PortDouble`, the registry `PortTypes`/`PORTS`/`DescriptionOf`/`ServiceOf`/`ShapeOf`/`ArgsOf`/`AnswerOf`/`ErrorOf`, `PortServices`/`PortLayers`/`PortOverrides`, `portsLayer`/`mapPorts`/`mergePorts`/`decoratePorts`/`forEveryPort`/`tabulatePorts` and their visitor types, and the seven missing wrappers (`decisionHistory…`, `signatureHistory…`, `customPredicateTimingOut`); `RetryingPortName`/`TimingOutPortName` removed; `RetryingLayer.ts`'s "Not listed above" row becomes `PortDerivation.ts`'s. `@qadi/testing` loses its eleven per-port doubles and `CallRecorder`; `@qadi/devtools` loses its five key functions and `PortActivity` gains `timeouts`<br>1.35 (2026-10-05): `@qadi/react` gains `outcomeOf` and `DecisionOutcome`; `DecisionResult` and `currentDecision` re-sourced to `DecisionOutcome.ts` (same public names, `currentDecision` now a projection of `outcomeOf`); `GateRenderState` noted as derived from the outcome's tag; the closing paragraph names `outcomeOf` (ADR-QD-093, CCR-QD-175)<br>1.34 (2026-10-05): `mergeFields` added beside `intersectFields`/`unionFields`, whose source (with `VisibleFields`) moves to `FieldLattice.ts`; `fieldStrategyLaws`/`StrategyLaws` and `effectiveCombining` added to "Not listed above" (ADR-QD-092, CCR-QD-174)<br>1.33 (2026-10-05): `judgeMatcher` and `Verdict` added to the matcher table; `Compare.ts`'s verdict functions added to "Not listed above" (ADR-QD-091, CCR-QD-173)<br>1.32 (2026-10-05): `ColumnFiniteness`, `FiniteGuard` and `FiniteExclusion` added — a `Range` excludes non-finite rows where the target can hold them, or refuses where it cannot exclude them; `@qadi/predicate-prisma` gains a required `floating` option, `floatingFieldsOf`, `PrismaTypedModelLike` and `PrismaTypedFieldLike`; the `isRangeBound` row says both operands (CCR-QD-172)<br>1.31 (2026-10-04): the predicate-compilation surface follows ADR-QD-079 — `@qadi/core` gains `toRenderable`, `RenderableNode`, `RenderRules` and the dialect-free leaf rules (`PredicateLiteral.ts`) and declares the one `PredicateNotRenderable` (`ACL018`, a `QadiError` member); both dialect packages re-export it, `@qadi/predicate-sql` gains `nullable`/`identifiers` options, `@qadi/predicate-prisma` gains `maxInValues`/`identifiers` (CCR-QD-158)<br>1.30 (2026-10-04): `@qadi/predicate-prisma` gains `CompilePrismaWhereOptions`, `PrismaModelLike`, `PrismaFieldLike` and `nullableFieldsOf` — `compilePrismaWhere` now takes a required nullability declaration (CCR-QD-157)<br>1.29 (2026-10-04): ARCH-05 (ADR-QD-078, CCR-QD-156) — `@qadi/core` gains `DecisionWire`/`DecisionWireAllow`/`DecisionWireDeny`, `encodeDecision`/`decodeDecision` (moved out of `SinkCodec.ts`, which embeds them with its bytes unchanged), `projectVisible` and `subjectEquivalence`; `ClientHydrationDropReason` loses `UnregisteredAtoms` and gains `UnsupportedPayloadVersion` and `MalformedPayload`. `@qadi/react` gains `SeededAllow`, `SeededDeny`, `SeededDecision`, `ClientDecision`, `AllowDisclosure`, `DenyDisclosure`, `permits`, `isSeeded`, `DehydratedPayload`, `DehydratedDecisionsV1`/`DehydratedEntryV1` (deprecated) and `QadiAtoms.hydrate`; `DecisionResult`/`currentDecision`/`DeniedNode` now name a `ClientDecision`; `InitialValues` is declared in `HydrationEngine.ts`<br>1.28 (2026-10-04): `foldPolicy`, `fieldsOf` and `POLICY_TAGS` (`Policy.ts`), `foldExplanation` (`Explanation.ts`) and `foldMatcher`, `matcherDepth` (`Matcher.ts`) added to the policy-inspection table; `childrenOf`'s prose corrected; `foldTree` (`TreeFold.ts`) added to "Not listed above" (ADR-QD-090, CCR-QD-170)<br>1.27 (2026-10-04): `EnforcementError` moved to `Errors.ts` and `StandingEvaluationServices`, `EnforcementErrorClass`, `EnforcementErrorClassTable`, `EnforcementErrorTagOf`, `EnforcementDenial`, `ENFORCEMENT_ERROR_CLASSES`, `classifyEnforcementError`, `ENFORCEMENT_ERROR_TAGS`, `ENFORCEMENT_DENIAL_TAGS` added to core; `@qadi/http` drops `ENFORCEMENT_ERROR_TAGS`, `DENIAL_STATUS`, `EnforcementErrorClass`, `classifyEnforcementError` and adds `HTTP_STATUS_BY_CLASS`, `HttpEnforcementFailure`, `HttpEnforcementTag`, `EnforcementErrorWire`, `EnforcementErrorWireTable`, `ENFORCEMENT_ERROR_WIRE`, `projectHttpEnforcementFailure`, `HTTP_ENFORCEMENT_TAGS`, `HTTP_ENFORCEMENT_ERROR_SCHEMAS`, `logSubjectExtractionFailed` (ADR-QD-081, CCR-QD-155)<br>1.26 (2026-10-04): `predicatePortCallsTotal` and `PredicatePortName` added to the metrics/types tables; `PortAccess.ts` and `ShortCircuit.ts` exports added to "Not listed above" (ADR-QD-077, CCR-QD-153)<br>1.25 (2026-10-04): `Permit`, `Admitted`, `Refused` added to the `@qadi/audit/CircuitBreaker.ts` row — the breaker's interface is now `status` plus `withPermit` (CCR-QD-154)<br>1.24 (2026-09-19): `childrenOf` (`Policy.ts`) added to the policy-inspection table — `policyDepth`'s explicit-stack children lookup is now exported so `Simplify.ts`'s `simplify` and `Explanation.ts`'s `explain` can share it rather than recurse natively over a caller-held `Policy` with no depth bound (.issues/medium/radia-perlman-RP-01.md)<br>1.23 (2026-09-19): `scripts/check-api-surface.mjs`'s MISSING check narrowed to the same `## Public API surface`-through-`## Not listed above` window STALE already read — a name backticked once in `## Mission`, `## Design philosophy` or a changelog entry used to satisfy it without ever earning a table row, which the whole-document scan let pass silently (100-lens audit, corroborated by armin-ronacher/grace-hopper/maxwell-brown/orta-therox/paul-chiusano/ryan-cavanaugh/sindre-sorhus/werner-vogels). `UNSUPPORTED` also now catches `export async function|enum|abstract class|let|var|import|declare`, forms that previously matched no pattern in the checker and were silently dropped from the surface instead of raising the hard error the checker's own contract promises (ryan-cavanaugh, RC-02). Both directions' prose above and in "Not listed above" updated to match<br>1.22 (2026-09-19): `RequiredPermissionShape` added to the `@qadi/http` table — `RequiredPermission`'s own Shape is now `PermissionRequirement` branded (`Brand.nominal`), closing the silent-overwrite gap a raw `{ permission, policy }` literal passed straight to `.annotate(RequiredPermission, {...})` left open. `AccessDeniedPublic` and `toAccessDeniedPublic` added to the core Errors section — `AccessDenied`'s no-trace public projection, formalizing the ad hoc redaction `QadiHttpError.ts` and `RequirePermission.ts` each reinvented; `AccessDeniedRefused`'s row corrected to describe it as that projection, annotated, rather than an anonymous tag-only `Schema.TaggedStruct`<br>1.21 (2026-09-14): `RequirePermissionClientError` and `passthroughClientLayer` added to the `@qadi/http` table — `RequirePermission` now declares `requiredForClient: true` with a `clientError` derived from its own `error:` schemas, so a generated client's static type includes every enforcement outcome automatically (ADR-QD-075, BEH-QD-263, CCR-QD-151)<br>1.20 (2026-09-09): `collectingTracer` (`@qadi/testing/CollectingTracer.ts`) added — the span-capturing `Tracer` five test files (`SubjectSet.test.ts`, `Evaluate.test.ts`, `WhatIf.test.ts`, `PortCalls.test.ts`, the port-calls feature steps) each hand-rolled a near-identical copy of is now one shared implementation the non-`@qadi/core` call sites import; `@qadi/core`'s own two keep a hand-copied twin in `test/helpers.ts` for the same circular-import reason `testLayer`/`subjectWith` already document there (issue #108, CCR-QD-146)<br>1.19 (2026-09-09): `isJsonSafe`/`isRecordJsonSafe` rows corrected — `@qadi/audit`'s `encodeAuditEntry` called `isJsonSafe(resource)` directly, not `isRecordJsonSafe`, so `policy`'s `HasCustom.params` reached the wire unchecked; it now calls `isRecordJsonSafe` like `@qadi/http`'s decision-stream route already did, and both rows are corrected to say so (issue #104, CCR-QD-143)<br>1.18 (2026-09-08): `AccessDenied`/`UndischargedObligation` are now `Schema.TaggedError` too (ADR-QD-072, narrowing ADR-QD-060 to all eleven `EnforcementError` tags); `TraceSchema`'s Source corrected from `SinkCodec.ts` to `Decision.ts`, where it moved to avoid an import cycle. `@qadi/http`'s table gains nine `httpApiStatus`-annotated `*Response` schemas and three tag-only `*Refused` schemas (`QadiHttpError.ts`); `handleMiddlewareEnforcementErrors` removed (deleted — `RequirePermission`'s declared `error:` lets `HttpApiMiddleware` encode nine of the eleven tags itself); `subjectExtractionFailedResponse` added, now exported (issue #98, CCR-QD-141)<br>1.17 (2026-09-08): `SubjectIdSchema`/`ResourceIdSchema` (`Identity.ts`) and `EvaluationErrorSchema` (`SinkCodec.ts`) added — the nine wire-crossing `EvaluationError` tags are now `Schema.TaggedError` classes (ADR-QD-060), so `SinkCodec.ts`'s hand-mapped `ErrorSchema`/`encodeError`/`decodeError` are deleted and `EvaluationErrorSchema` is their union directly (CCR-QD-140)<br>1.16 (2026-09-08): Issue #78's untrusted-input sweep. `exceedsJsonDepth` (`DecodeDepthGuard.ts`) moved out of "Not listed above" into the Policy table: `@qadi/core`'s barrel now re-exports `DecodeDepthGuard.ts` directly, so it is reachable as `@qadi/core`'s own export, not only via the `./DecodeDepthGuard` wildcard subpath. `UNTRUSTED_DECODE_OPTIONS` (`Policy.ts`) added to the same table — previously module-private, now exported so `SinkCodec.ts`'s `decodeSinkRecordWireUnknown` can share Policy.ts's excess-property stance instead of decoding its embedded `Policy` with no `ParseOptions` at all. `hydrateDecisions` (`@qadi/react/Hydration.ts`) now runs `exceedsJsonDepth` ahead of `decodeEntryFields`/`decodePolicy`, closing the one recursive decode boundary `DecodeDepthGuard.ts`'s and `SinkCodec.ts`'s own doc comments had named as "tracked separately"; `ClientHydrationDropReason` gains a fifth member, `EntryTooDeep` (CCR-QD-139)<br>1.15 (2026-09-08): Three re-audit findings corrected (issue #73). "Not listed above" said the `Explanation` union has eight members, `Requirement`/`All`/`Any`/`Negated`/`Named`/`Owing`/`Row`/`Table` — it has seven, and `Row` is the shape of one `Table.rows` entry, not a union alternative. `mergeSources`'s Kind cell carried a description sentence instead of `function`, the same prose-in-the-wrong-cell defect this document's own header note says the gate cannot catch. `HydrationMismatch`/`HydrationMismatchReporter` and `HydrationDrop`/`HydrationDropReporter` are declared in `HydrationWarning.ts` and only re-exported from `QadiAtoms.ts`/`Hydration.ts`; their rows now say so, matching the `SignatureInput` row's existing convention (CCR-QD-123)<br>1.14 (2026-09-07): The Public API surface section's gate description scoped down further — it now also states plainly that `scripts/check-api-surface.mjs`'s STALE check reads Export-column table cells only (a name mentioned solely in prose is not staleness-checked) and that both checks are name-existence-only (no arity/parameter/return-type comparison), matching Rev 1.11's Kind/Source scoping rather than leaving those two gaps implicit (CCR-QD-111)<br>1.13 (2026-09-07): `exceedsJsonDepth` (`@qadi/core/DecodeDepthGuard.ts`) added to "Not listed above" — `Policy.ts`'s and `SinkCodec.ts`'s previously hand-duplicated depth guard is now one shared implementation both import (H6)<br>1.12 (2026-09-07): `handleEnforcementErrors`/`handleMiddlewareEnforcementErrors` added (`QadiHttpError.ts`) — the enforcement-error-to-response mapping `GuardRoute.ts` and `RequirePermission.ts` had each duplicated inline is now shared, as two monomorphic functions rather than one generic (`Effect.catchTag`'s array form cannot narrow a generic pass-through error type); `frame`/`reauthCheck` descriptions corrected to match their current implementation (`isRecordJsonSafe` covers `policy` too, `reauthCheck` now uses `assert`'s obligation-discharging semantics rather than a bare `isAllowed`)<br>1.11 (2026-09-07): Noted that `scripts/check-api-surface.mjs` (gate 13) validates the Export column only — Kind and Source are prose, unverified by the gate<br>1.10 (2026-09-06): `decisionStreamRoute` gains an optional `reauth` — a periodic re-extraction of the subject and re-evaluation of the policy against an open `/__decisions` connection, ending it on the first failed recheck; `DecisionStreamOptions` and `reauthCheck` added (CCR-QD-107)<br>1.9 (2026-09-06): Eleven exports the checker's wildcard-subpath blind spot had hidden from every review — `parseFieldPath`/`Containment`/`compareFieldPaths`/`project` (`@qadi/core/FieldPath.ts`), `wrapService` (`@qadi/core/RetryingLayer.ts`), `CircuitBreakerStatus`/`CircuitBreakerOptions`/`CircuitBreaker`/`makeCircuitBreaker` (`@qadi/audit/CircuitBreaker.ts`), `CallRecorder`/`makeCallRecorder` (`@qadi/testing/CallRecorder.ts`) — added to "Not listed above"; `scripts/check-api-surface.mjs` now expands a `./*` wildcard subpath to every `src/*.ts` module instead of skipping it, and the STALE check now covers every table through "Not listed above", not only "Public API surface" (CCR-QD-102)<br>1.8 (2026-08-25): `hasSignature` implemented end to end — `HasSignature`/`hasSignature` (`Policy.ts`), `evaluateHasSignature` wired into `evaluateNode`, `Explanation`, `Predicate` (INV-QD-056) and `SinkCodec`; `SignatureHistory` graduates to the ninth service, seventh required; `SignatureHistoryUnavailable` joins `EvaluationError`/`QadiError`; full consumer wiring across `@qadi/testing`, `@qadi/http`, `@qadi/devtools`, the Next.js example and the Gherkin suite; `@qadi/audit` harmonized — `ElectronicSignature` retired in favor of the canonical `Signature` (ADR-QD-057, ADR-QD-058, CCR-QD-089)<br>1.7 (2026-08-25): `createPermissionGroup`/`PermissionGroup` (permission-bundling ergonomics) and `createGuardHealthCheck`/`GuardHealthCheckResult` (a canary-evaluation readiness probe) added — both were ruled out of scope on both `wayfinder:map` efforts as "no open decision, build directly", so neither carries a ticket (CCR-QD-088)<br>1.6 (2026-08-25): `Signature`, `SignatureHistory` and `SignatureHistoryUnavailable` added — the canonical e-signature shape and its lookup port, resolving wayfinder ticket #13 ahead of the `hasSignature` Policy leaf itself; declared but not yet wired into `EvaluationServices` or the error unions (CCR-QD-087)<br>1.5 (2026-08-25): `@qadi/audit` added to the Packages table and given its own subsection — audit trail, staging, circuit breaker, retention and e-signature capture, composed onto `DecisionSink` (ADR-QD-056, CCR-QD-085)<br>1.4 (2026-08-25): `hasCustom`, `CustomPredicate` and its layers added — the policy tree's one escape hatch for logic the built-in matchers cannot express; eighth service, sixth required (ADR-QD-055, CCR-QD-082)<br>1.3 (2026-08-25): `@qadi/predicate-sql` and `@qadi/predicate-prisma` added to the Packages table and given their own subsections (ADR-QD-054, CCR-QD-079)<br>1.2 (2026-07-26): Drifted a second time — ten exports and `@qadi/promise` missing; the surfaces of all four public packages now listed, a "Not listed above" table added, and `scripts/check-api-surface.mjs` added as merge gate 9 so a third drift fails the build (CCR-QD-034)<br>1.1 (2026-07-26): Public API surface brought up to date — it had described the library as it was before any of the seven enablers shipped, omitting twenty-one exports and four errors; five services, not four (CCR-QD-025)<br>1.0 (2026-07-25): Initial release (CCR-QD-001) |

---

## Mission

Qadi decides whether a subject may perform an action, and which parts of the
result they may see. It is Effect-native: evaluation is an `Effect`, dependencies
are `Layer`s, and observability comes from Effect's tracing rather than a
bespoke port.

## Design philosophy

**One definition per concept.** The policy union's recursive type is
hand-written once, and the Schema — and from it the JSON codec — is built and
type-checked against that single definition. Every defect this library was
written to remove came from maintaining two representations of one thing and
letting them drift.

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
| `@qadi/http` | `effect/http`/`httpapi` bindings — enforcement middleware, subject extraction, permission registry |
| `@qadi/devtools` | A headless decision timeline, and a React dock that renders it |
| `@qadi/predicate-sql` | Compiles a `Predicate` to PostgreSQL, MySQL, or SQLite |
| `@qadi/predicate-prisma` | Compiles a `Predicate` to a Prisma `WhereInput` |
| `@qadi/audit` | Audit trail, staging, circuit breaker, retention and e-signature capture, composed onto `DecisionSink` |
| `@qadi/features` | Cucumber acceptance suite (private) |

## Public API surface

`scripts/check-api-surface.mjs` (merge gate 13) checks that the **Export**
column is complete and accurate: every export of every public package is
named somewhere between this heading and `## Worked example` — a table row
above or a "Not listed above" entry, as a backticked token — and every
backticked name in an **Export column of a table** is a real export of
something. A name backticked only in `## Mission`, `## Design philosophy` or
`## Packages` does not satisfy the first direction; both checks now read the
same window (2026-09-19 audit correction — a mention anywhere in the document
used to count, which let a name clear the gate without ever earning a table
row or a "Not listed above" reason). The **Kind** and **Source** columns are
not gated — the checker
does not confirm that a row's `Kind` matches the actual declaration form
(`function`/`type`/`interface`/`class`/…) of the export it names, or that
`Source` names the right file. Those two columns are prose, verified by
review rather than by the checker; treat a `Kind`/`Source` mismatch as a
documentation bug to fix by hand, not something a red gate would have
caught. Nor does the checker read prose outside a table's Export column —
a name mentioned only in a paragraph (a description, a cross-reference, an
example walkthrough) is not staleness-checked, so a rename that leaves a
paragraph naming the old identifier passes silently; only a table row
catches that. It is also **name-existence-only**: it confirms an
identifier resolves to *some* real export, not that the export's arity,
parameter types or return type match what the row (or any prose near it)
describes — a signature change under an unchanged name passes the gate
the same way a `Kind`/`Source` drift does. Closing either gap for real
means reading types, not text — see the checker's own top-of-file comment
for why that is a deliberate, open trade rather than an oversight.

### Tokens

| Export | Kind | Source |
| ------ | ---- | ------ |
| `permission`, `permissionKey`, `isValidSegment`, `createPermissionGroup` | function | `Permission.ts` |
| `Permission`, `PermissionKey`, `InferResource`, `InferAction`, `InferKey`, `PermissionGroup` | type | `Permission.ts` |
| `PermissionSchema` | schema | `Permission.ts` |
| `SEGMENT_PATTERN` | constant | `Permission.ts` |
| `role`, `flattenPermissions`, `flattenAll`, `roleNames`, `resolveRoleGraph` | function | `Role.ts` |
| `makeSubject`, `fromRoles`, `withAttributes`, `anonymous` | function | `AuthSubject.ts` |
| `AuthSubject` | type | `AuthSubject.ts` |
| `subjectEquivalence` | function | `AuthSubject.ts` — structural "same subject", the rule `DecisionCache`'s key relies on, shared with `@qadi/react`'s `subject` atom |
| `Role`, `RoleDefinition` | type | `Role.ts` |
| `SubjectId`, `ResourceId` | type | `Identity.ts` |
| `makeSubjectId`, `makeResourceId` | function | `Identity.ts` |
| `SubjectIdSchema`, `ResourceIdSchema` | schema | `Identity.ts` |
| `SUBJECT_ID_TAG` | constant | `Identity.ts` — the `"SubjectId"` brand tag as a value, so `Signature.ts`'s independently-declared `Schema.brand(...)` field imports it instead of repeating the string literal (MP-06) |

### Policy

| Export | Kind | Source |
| ------ | ---- | ------ |
| `Policy`, `FieldStrategy` | schema + type | `Policy.ts` |
| `DEFAULT_MAX_DEPTH`, `MAX_DECODE_DEPTH` | constant | `Policy.ts` |
| `UNTRUSTED_DECODE_OPTIONS` | constant | `Policy.ts` |
| `exceedsJsonDepth` | function | `DecodeDepthGuard.ts` |
| `PolicyEncoded`, `RuleEncoded` | type | `Policy.ts` |
| `RoleName`, `ActionName`, `EventName`, `RelationName`, `LabelName` | schema + type | `Policy.ts` |
| `makeRoleName` | function | `Policy.ts` |
| `hasPermission`, `hasRole`, `hasAttribute`, `hasResourceAttribute`, `hasRelationship` | function | `Policy.ts` |
| `hasAction` | function | `Policy.ts` |
| `hasActed`, `hasNotActed` | function | `Policy.ts` |
| `hasCustom` | function | `Policy.ts` |
| `hasSignature` | function | `Policy.ts` |
| `allOf`, `anyOf`, `not`, `labeled`, `anyOfRoles`, `allOfRoles` | function | `Policy.ts` |
| `defaultFieldStrategy` | function | `Policy.ts` — the `"AllOf"`/`"AnyOf"` -> `"Intersection"`/`"First"` mapping `allOf`/`anyOf` and `Explanation.ts`'s `isDefaultFieldStrategy` both now call, instead of each restating it (EK-04) |
| `obliged` | function | `Policy.ts` |
| `rules`, `permitWhen`, `denyWhen` | function | `Policy.ts` |
| `Combining`, `RuleEffect`, `Rule` | schema + type | `Policy.ts` |
| `toJson`, `fromJson`, `toJsonValue`, `fromJsonValue`, `PolicyFromJson` | codec | `Policy.ts` |
| `PolicyDecodeTooDeep` | error | `Policy.ts` |
| `eq`, `neq`, `inArray`, `exists`, `gte`, `lt`, `contains`, `fieldMatch`, `someMatch`, `everyMatch`, `size` | function | `Matcher.ts` |
| `dominates` | function | `Matcher.ts` |
| `subject`, `subjectId`, `resource`, `action`, `literal` | function | `Matcher.ts` |
| `SecurityLabel`, `LabelOrdering` | type | `SecurityLabel.ts` |
| `isSecurityLabel`, `compareLabels`, `labelDominates` | function | `SecurityLabel.ts` |
| `join`, `meet` | function | `SecurityLabel.ts` |
| `Obligation`, `ObligationOptions` | schema + type | `Obligation.ts` |
| `obligation`, `unionObligations`, `bindingObligations` | function | `Obligation.ts` |
| `FieldOptions`, `CombinatorOptions`, `HistoryOptions`, `HistoryScope`, `SignatureOptions` | type | `Policy.ts` |
| `Matcher`, `ValueRef`, `MatcherContext` | schema + type | `Matcher.ts` |
| `evaluateMatcher`, `judgeMatcher`, `referencesAction`, `referencesResource`, `getByPath` | function | `Matcher.ts` — `judgeMatcher` answers with a `Verdict` (why a matcher did not hold, not only whether); `evaluateMatcher` is `holds(judgeMatcher(…))` |
| `Verdict` | type | `Matcher.ts` (declared in `Compare.ts`) — `Held \| NotHeld \| ValueAbsent \| ReferenceAbsent \| Incomparable`, ordered: an absent value before an absent reference, both before incomparability |
| `simplify` | function | `Simplify.ts` |
| `explain`, `renderExplanation` | function | `Explanation.ts` |
| `Explanation`, `RenderOptions`, `RequirementKind` | type | `Explanation.ts` |

### Evaluation and enforcement

| Export | Kind | Source |
| ------ | ---- | ------ |
| `evaluate` | function | `Evaluate.ts` |
| `Decision`, `Allow`, `Deny`, `Trace`, `isAllowed`, `project` | type + function | `Decision.ts` |
| `projectVisible` | function | `Decision.ts` — `project`'s body after its verdict check: projects a record to a visible-field set with no `Decision` in hand, for `@qadi/react`'s seeded allow |
| `enforce`, `enforceProjected`, `check`, `decide`, `assert`, `filter`, `filterStream`, `guard` | function | `Qadi.ts` |
| `EvaluateOptions` | type | `Evaluate.ts` |
| `Resource` | type | `Resource.ts` |
| `decideSubjects`, `filterSubjects`, `decideSubjectsStream`, `filterSubjectsStream`, `decideSubject` | function | `SubjectSet.ts` — `decideSubjects`/`filterSubjects` never fail; a resolver failure for one subject is reported in the returned `failures`, and the rest of the batch's decisions are no longer discarded with it (issue #107). The streamed siblings report per element too: `decideSubjectsStream` emits a `SubjectOutcome`, `filterSubjectsStream` a `FilteredSubjectOutcome`, and neither fails with `EvaluationError`. `decideSubject` is the one per-subject step all of them fold over |
| `SubjectOutcome`, `FilteredSubjectOutcome` | type, const | `SubjectSet.ts` — `Data.taggedEnum`s with their constructors: `SubjectOutcome` is `SubjectDecided { subject, decision }` or `SubjectFailed { subject, error }`; `FilteredSubjectOutcome` is `SubjectAllowed { subject }` or `SubjectFailed { subject, error }` |
| `SubjectDecision`, `SubjectSetServices`, `SubjectEvaluationFailure`, `SubjectSetOutcome`, `FilteredSubjects` | type | `SubjectSet.ts` — `SubjectEvaluationFailure` pairs a subject with the `EvaluationError` its own evaluation raised; `SubjectSetOutcome` (`decideSubjects`'s return shape) is `{ decisions, failures }`, `FilteredSubjects` (`filterSubjects`'s) is `{ subjects, failures }` |
| `toPredicate`, `evaluatePredicate` | function | `Predicate.ts` |
| `Predicate`, `CompareOp`, `PredicateOptions`, `PredicateServices` | type | `Predicate.ts` |
| `toRenderable` | function | `RenderablePredicate.ts` — classifies a `Predicate` once, under a renderer's `RenderRules`, into a closed `RenderableNode` tree, or refuses with `PredicateNotRenderable`. Core still emits no dialect text (ADR-QD-079) |
| `RenderableNode`, `EqualityLiteral` | type | `RenderablePredicate.ts` — eight tags (`Constant`, `IsNull`, `Equals`, `Range`, `OneOf`, `All`, `Any`, `Not`), every `Compare`/`MemberOf` already validated and every NULL decision already made |
| `RenderRules`, `ColumnNullability`, `Negation`, `NullGuard`, `ColumnFiniteness`, `FiniteGuard`, `FiniteExclusion` | type | `RenderablePredicate.ts` — what a renderer declares (identifier rule, reserved columns, `maxInValues`, which columns may be NULL, whether its `NOT` is two- or three-valued, which columns can hold a non-finite number, whether it can exclude one from a range) and the per-leaf NULL and finiteness treatment derived from it. A nullability declaration can only narrow or refuse (ADR-QD-079); a `Range` on a column that may hold `±Infinity`/`NaN` carries `finiteGuard: "ExcludeNonFinite"`, which only removes rows, or is refused (`NonFiniteColumn`) by a target that cannot express it (CCR-QD-172) |
| `DEFAULT_MAX_IN_VALUES` | const | `RenderablePredicate.ts` — 1000 |
| `SafeLiteral`, `IdentifierRule` | type | `PredicateLiteral.ts` |
| `isSafeLiteral`, `isRangeBound`, `isRenderableIdentifier` | function | `PredicateLiteral.ts` — the dialect-free leaf rules; `evaluatePredicate`'s `Gte`/`Lt` check both operands with `isRangeBound`, and `toRenderable` checks the bound with the same function (CCR-QD-172) |
| `EvaluationServices` | type | `Evaluate.ts` — `CurrentSubject \| EvaluationId \| PortServices`; the ports come from the registry (`Ports.ts`), so a port added there reaches every alias without an edit here (ADR-QD-094) |
| `StandingEvaluationServices` | type | `Evaluate.ts` — `Exclude<EvaluationServices, CurrentSubject>`, the services a runtime holds while the subject travels per call; `SubjectSetServices`, `QadiRuntimeServices`, `EvaluationServicesNone`, `@qadi/promise`'s `QadiLayer`, `DecisionStreamRoute.ts` and `RequirePermissionLive` all use it (ADR-QD-081) |
| `intersectFields`, `unionFields`, `mergeFields` | function | `FieldLattice.ts`, re-exported by `Decision.ts` — `mergeFields(strategy, sets)` merges allowing children's field sets exactly as `allOf`/`anyOf` do: never wider than its inputs, `undefined` for no inputs under a known strategy, `[]` for a strategy outside the union; `Intersection` and `Union` are independent of input order, byte for byte (ADR-QD-092) |
| `VisibleFields` | type | `FieldLattice.ts`, re-exported by `Decision.ts` — a named `ReadonlyArray<string> \| undefined`: `undefined` is the field-visibility lattice's top ("all fields"), not "none"; `intersectFields`/`unionFields` and `Trace`/`Allow`'s `visibleFields` field are typed against it rather than restating the union at each site (D8, issue #107) |
| `renderTrace` | function | `Decision.ts` |
| `RenderTraceOptions` | type | `Decision.ts` |
| `EnforceOptions`, `ObligationHandler` | type | `Qadi.ts` |
| `EnforcementError` | type | `Errors.ts` — moved from `Qadi.ts` so the tag-keyed class table is `satisfies`-checked beside `ERROR_CODES` (BEH-QD-270, ADR-QD-081); the package barrel is unchanged |
| `EnforcementErrorClass`, `EnforcementErrorClassTable`, `EnforcementErrorTagOf`, `EnforcementDenial` | type | `Errors.ts` — the closed `"denied"`/`"outage"`/`"wiringMistake"` union, the total tag-keyed table type over any failure union, and the tags and members of a given class (BEH-QD-270) |
| `ENFORCEMENT_ERROR_CLASSES`, `classifyEnforcementError`, `ENFORCEMENT_ERROR_TAGS`, `ENFORCEMENT_DENIAL_TAGS` | const + function | `Errors.ts` — the single partition of all eleven `EnforcementError` tags into classes, and the literal tag tuples `Effect.catchTag`'s array form needs; moved from `@qadi/http` so every adapter derives from one table (INV-QD-060, ADR-QD-081) |
| `Authorized` | type | `Authorized.ts` |
| `createGuardHealthCheck` | function | `GuardHealthCheck.ts` |
| `GuardHealthCheckResult` | type | `GuardHealthCheck.ts` |

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

`createGuardHealthCheck` is a readiness probe, not a seventh reporting or
enforcing call: it runs a caller-supplied canary `Policy` through `decide`,
times it, and reports `{ healthy, checkedAt, latencyMillis, errors }` without
ever failing itself. A typed `EvaluationError` from the probed evaluation
counts as unhealthy; a clean `Allow` or `Deny` both count as healthy, since
the question is whether `EvaluationServices` answered at all, not what it
answered.

### Services

| Export | Kind | Source |
| ------ | ---- | ------ |
| `CurrentSubject`, `currentSubjectLayer`, `CurrentSubjectAnonymous` | service + layer | `CurrentSubject.ts` |
| `AttributeResolver`, `AttributeResolverNone`, `attributeResolverFromRecord` | service + layer | `AttributeResolver.ts` |
| `attributeResolverRetrying`, `attributeResolverBounded`, `attributeResolverTimingOut` | layer combinator | `AttributeResolver.ts` — every port has these three, each derived from its description (`PortDerivation.ts`): `…Retrying` annotates `qadi.attempts` on the caller's span, `…Bounded` rejects a permit count that is not a positive integer with `InvalidBoundedPermits`, and `…TimingOut` turns a call that does not settle in time into the port's own typed error rather than hanging the evaluation |
| `RelationshipResolver`, `RelationshipResolverNever`, `relationshipResolverFromEdges` | service + layer | `RelationshipResolver.ts` |
| `relationshipResolverRetrying`, `relationshipResolverBounded`, `relationshipResolverTimingOut` | layer combinator | `RelationshipResolver.ts` — same timeout-to-typed-error conversion as `attributeResolverTimingOut` |
| `DecisionHistory`, `DecisionHistoryUnknown`, `decisionHistoryFromEvents` | service + layer | `DecisionHistory.ts` |
| `decisionHistoryRetrying`, `decisionHistoryBounded`, `decisionHistoryTimingOut` | layer combinator | `DecisionHistory.ts` — the same three wrappers every port has, derived from `decisionHistoryPort` |
| `SignatureHistory`, `SignatureHistoryNone`, `signatureHistoryFromSignatures` | service + layer | `SignatureHistory.ts` |
| `signatureHistoryRetrying`, `signatureHistoryBounded`, `signatureHistoryTimingOut` | layer combinator | `SignatureHistory.ts` — the same three wrappers every port has, derived from `signatureHistoryPort` |
| `Signature`, `SIGNATURE_MEANINGS` | schema + constant | `Signature.ts` |
| `EvaluationId`, `EvaluationIdLive`, `evaluationIdSequential` | service + layer | `EvaluationId.ts` |
| `CustomPredicate`, `CustomPredicateNone`, `customPredicateFromRecord` | service + layer | `CustomPredicate.ts` |
| `customPredicateRetrying`, `customPredicateBounded`, `customPredicateTimingOut` | layer combinator | `CustomPredicate.ts` — a timed-out call's `CustomPredicateError.reason` is the deadline message |
| `attributeResolverPort`, `relationshipResolverPort`, `customPredicatePort`, `decisionHistoryPort`, `signatureHistoryPort` | port description | each port's own module — the port described once: name, method, span, a lens onto its one method, its typed-error constructors (`failure`, `defect`), its request `key` and its fail-closed `none` answer. Every wrapper and named default above is derived from it, and `PortAccess.ts`, `@qadi/devtools`' capture/replay and the doubles below read it (ADR-QD-094) |
| `PortDescription`, `PortShape`, `PortScript` | type | `PortDescription.ts` — a description's shape; `PortScript` is what a scripted double does with each request |
| `PortReply` | type + constructors | `PortDescription.ts` — `Answer`, `Fail`, `Die` or `Throw`, a closed tagged union, with `PortReply.answer`/`fail`/`die`/`throw` |
| `scriptedPort`, `recordingPort`, `replyTable`, `PortDouble` | test double | `PortDoubles.ts` — any port's scripted double (answers, fails with the port's own error, dies or throws per request; an unscripted request answers the fail-closed default) and recording decorator (observes without absorbing), each with a typed, in-order call log |
| `EvaluationServicesNone` | layer | `EvaluationServicesNone.ts` — `Layer.merge(portsLayer(), EvaluationIdLive)`: every port's fail-closed default plus `EvaluationIdLive`; excludes `CurrentSubject` (ADR-QD-022) |
| `PortTypes`, `PORTS` | type + constant | `Ports.ts` — the closed registry of the five port descriptions, keyed by `PortName`; a port name without an entry is a compile error wherever a derived type indexes it (ADR-QD-094) |
| `PortServices`, `PortLayers`, `PortOverrides` | type | `Ports.ts` — the five port services as one union, one layer per port, and any subset of ports replaced by a layer of their own service |
| `ServiceOf`, `ShapeOf`, `ArgsOf`, `AnswerOf`, `ErrorOf` | type | `Ports.ts` — a description's service, Shape, request tuple, answer and typed error, recovered from its type |
| `DescriptionOf` | type | `Ports.ts` — the description of the port named `K`, spelled through the registry, so a function generic in the port keeps its name, service and answer correlated (`answers[d.port]` and `d.none.answer` agree) |
| `tabulatePorts` | function | `Ports.ts` — one value per port, keyed by name, for values uniform across ports (an empty answer map per port) |
| `portsLayer` | function | `Ports.ts` — every port at its fail-closed default unless an override names it; each override has its own slot, so order cannot matter |
| `mapPorts`, `mergePorts`, `decoratePorts`, `forEveryPort` | function | `Ports.ts` — a layer per port from its description; the five as one layer; every port of a built environment rebuilt through one decorator (built once); a function run over every description in `PortName` order |
| `PortVisitor`, `PortLayerVisitor`, `PortDecorator` | type | `Ports.ts` — the generic function types `forEveryPort`, `mapPorts` and `decoratePorts` take |
| `DecisionCache`, `decisionCacheLayer` | service + layer | `DecisionCache.ts` |
| `DecisionSink` | service | `DecisionSink.ts` |
| `makeDecisionLog`, `DEFAULT_LOG_CAPACITY` | constructor + constant | `DecisionLog.ts` — one bounded sink that is also a readable history and a live feed; `ingest` reaches the backlog and every live reader; one `capacity` (a positive integer) bounds both (ADR-QD-097) |
| `DecisionLog`, `DecisionLogRead`, `DecisionLogReader` | type | `DecisionLog.ts` — the log; what one scoped `read` returns (`backlog` in `storedRecordOrder`, then `live`, each retained record exactly once, INV-QD-100); the `read`/`readEntries` view a route takes |
| `LogCursor`, `LogEntry`, `DecisionLogEntries`, `formatLogCursor`, `parseLogCursor` | type, function | `DecisionLog.ts` — a record's place in one log (`epoch`, the `Clock` time the log was made, and `seq`), a record with its cursor, what `readEntries(after?)` returns, and the cursor's `<epoch>.<seq>` text form — strict, since it is the SSE `id` a reconnecting reader sends back as `Last-Event-ID` (ARCH-11 D-11-g) |
| `decisionSinkForwarding`, `decisionSinkAll` | layer factory | `DecisionSinkForwarding.ts` |
| `portCallsTotal`, `portRetriesTotal`, `portTimeoutsTotal`, `predicatePortCallsTotal` | metric | `PortMetrics.ts` — `predicatePortCallsTotal` counts `toPredicate`'s reads of `AttributeResolver`/`DecisionHistory`, a sibling of `portCallsTotal` rather than an attribute on it (ADR-QD-077); `portCallsTotal`, `portRetriesTotal` and `portTimeoutsTotal` each carry the five `PortName` values as `preregisteredWords` (issue #107) — every port has a retrying and a timing-out wrapper, so the wrapper metrics need no narrower domain (ADR-QD-094); `portTimeoutsTotal` is incremented when a `…TimingOut` wrapper converts a hang into a typed timeout error |
| `PortName`, `PredicatePortName`, `PortSpanName` | type | `PortMetrics.ts` — `PortName` is `portCallsTotal`/`portRetriesTotal`/`portTimeoutsTotal`'s closed domain, `PredicatePortName` `predicatePortCallsTotal`'s (the two-member subset `toPredicate` can read); `PortSpanName` is the closed set of span names a port read opens, one per port, named by each port's description (BEH-QD-227) |
| `hydrationDehydratedTotal`, `hydrationSeededTotal` | metric | `HydrationMetrics.ts` |
| `hydrationDroppedTotal`, `hydrationRechecksTotal`, `hydrationMismatchesTotal` | metric | `HydrationMetrics.ts` |
| `DehydrationDropReason`, `ClientHydrationDropReason`, `HydrationDropReason` | type | `HydrationMetrics.ts` — seven reasons across both ends: `ForeignSubject` (dehydrate), then `PayloadSubjectMismatch`, `MalformedEntry`, `UndecodablePolicy`, `EntryTooDeep`, `UnsupportedPayloadVersion` and `MalformedPayload` (hydrate); `UnregisteredAtoms` was removed when the atom set took ownership of seeding |
| `hydrationDropReasons` | constant | `HydrationMetrics.ts` |
| `AttributeResolverShape`, `RelationshipResolverShape`, `RelationshipCheck` | type | resolver modules |
| `CustomPredicateShape` | type | `CustomPredicate.ts` |
| `RelatedResult`, `RelationshipEdgeInput` | type | `RelationshipResolver.ts` |
| `RelationshipEdge` | value class | `RelationshipResolver.ts` |
| `DecisionHistoryShape`, `ActedQuery`, `ActedResult` | type | `DecisionHistory.ts` |
| `ActedEventInput`, `ActedAnywhereInput` | type | `DecisionHistory.ts` |
| `ActedEvent`, `ActedAnywhere` | value class | `DecisionHistory.ts` |
| `SignatureHistoryShape`, `SignatureQuery`, `SignatureInput` | type | `SignatureHistory.ts` |
| `SignatureMeaning` | type | `Signature.ts` |
| `EvaluationIdShape`, `DecisionCacheShape`, `DecisionCacheKey` | type | service modules |
| `DecisionSinkShape`, `DecisionOutcome`, `ObligationOutcome`, `SinkRecord` | type | sink modules |
| `DecisionRecord`, `ObligationRecord`, `Decided`, `Failed` | value class | `DecisionRecord.ts` |
| `Stamped`, `StoredRecord` | type | `DecisionRecord.ts` |
| `StoredDecisionRecord`, `StoredObligationRecord` | value class | `DecisionRecord.ts` — a `DecisionRecord`/`ObligationRecord` plus `Stamped`'s `environment`, built via `new`, never a spread of the un-stamped instance |
| `stampRecord` | function | `DecisionRecord.ts` |
| `storedRecordOrder` | `Order` | `DecisionRecord.ts` — the one order a stored record is read in (INV-QD-039): by `at`, an unknown (`NaN`) time after every known one, two unknowns equal so a stable sort keeps arrival order |
| `DecisionWire` | schema + type | `DecisionWire.ts` — the wire form of a `Decision`, moved out of `SinkCodec.ts` so the record wire's outcome (`outcome.decision` in wire version 2, `decided` in version 1) and `@qadi/react`'s hydration entry derive from one definition. A tagged union: an `Allow` cannot carry a `reason` and a `Deny` cannot lack one |
| `DecisionWireAllow`, `DecisionWireDeny` | schema | `DecisionWire.ts` — the two members of `DecisionWire`, exported so a consumer deriving its own payload (`@qadi/react`'s hydration entry) derives from one verdict's fields |
| `encodeDecision`, `decodeDecision` | function | `DecisionWire.ts` — `encodeDecision` projects a `Decision` onto `DecisionWire` (omitting `visibleFields` when `undefined`); `decodeDecision` rebuilds one from an already-validated wire value |
| `TraceSchema` | schema | `Decision.ts` — moved from `SinkCodec.ts` (ADR-QD-072), so `Errors.ts`'s `AccessDenied` can reuse it without an `Errors.ts` → `SinkCodec.ts` → `Errors.ts` import cycle; still reused by `DecisionWire.ts`, which `SinkCodec.ts` embeds and which `@qadi/react`'s hydration payload derives its entry schema from |
| `SinkRecordJson` | schema + type | `SinkCodec.ts` — the encoded wire form of a `SinkRecord`: wire-version-2 bytes (`version: 2`, one tagged `outcome`), `Schema.toEncoded` of the wire schema. What `encodeSinkRecord` returns, what forwarding's `send` receives, what an audit row carries and what `decodeSinkRecord` reads. Version-1 bytes (no `version` key) are no longer a member since 0.11.0 (ARCH-09, ADR-QD-096 and its 2026-10-06 amendment) |
| `encodeSinkRecord`, `encodeSinkRecordString` | codec | `SinkCodec.ts` — the outbound operation: a record becomes a verified JSON wire value (or its text) as wire version 2, or a `SinkRecordNotEncodable` naming the refusal and its path. Runs the depth pre-checks, the schema encode (every resolver `cause` crosses through `Schema.Defect()`) and one walk over the encoded output; returns `Result` and never throws (ARCH-09, ADR-QD-096) |
| `decodeSinkRecord`, `decodeSinkRecordString` | codec | `SinkCodec.ts` — the inbound operation: untrusted `unknown` (or text) becomes a `SinkRecord`, or a `SinkRecordNotDecodable` whose `DecodeRefusal` says `NotJson`, `TooDeep`, `Malformed` or `UnsupportedVersion`. Depth-guarded before the schema recurses; reads wire version 2 only — an object with no `version` (a pre-0.10 version-1 record) or any other is `UnsupportedVersion`, never upgraded — ignores a top-level envelope key it does not declare and decodes everything nested with `UNTRUSTED_DECODE_OPTIONS`; a decision naming no outcome is `Malformed`. Accepts whatever `encodeSinkRecord` emits and never throws (ARCH-09, ADR-QD-096) |
| `StoredRecordJson` | schema + type | `SinkCodec.ts` — a stored record on the wire: `{ environment, record }`, the producer's label beside the record's `SinkRecordJson`. What a decision log's SSE frames and `/__decisions/backlog`'s elements carry; forwarding and audit never see it (ARCH-11, ADR-QD-097) |
| `encodeStoredRecord`, `encodeStoredRecordString` | codec | `SinkCodec.ts` — `encodeSinkRecord` on the record, with the environment beside it; the same refusals, never throws (ARCH-11) |
| `decodeStoredRecord`, `decodeStoredRecordString` | codec | `SinkCodec.ts` — reads the envelope (an own string `environment`, an own `record`; unknown top-level keys ignored), decodes `record` with `decodeSinkRecord` and stamps it with the producer's label. A bare record — a server older than 0.10 — is `Malformed`; there are no options since `legacyEnvironment` and `DecodeStoredRecordOptions` were removed in 0.11.0 (ARCH-11 D-11-e, ADR-QD-097's 2026-10-06 amendment) |
| `CacheOutcome`, `CacheLookup` | type | `DecisionCache.ts` |

**Nine services, and only seven are required.** `DecisionHistory` was the one added
after the initial release, and the one whose default had to be **three-valued** — see
[BEH-QD-042](behaviors/06-services.md) and
[INV-QD-014](invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities).

`CustomPredicate` is the sixth required service, backing `hasCustom` — the policy
tree's one escape hatch for a condition that does not reduce to a declarative
matcher. Its default, `CustomPredicateNone`, denies every name; a registry that
**is** wired but has no entry for a given name fails rather than denies, since that
is a wiring mistake, not a legitimate answer
([ADR-QD-055](decisions/055-a-named-registered-custom-predicate.md),
[INV-QD-049](invariants.md#inv-qd-049-an-unregistered-custom-predicate-name-is-an-error-never-a-denial)).

`SignatureHistory` is the seventh required service, backing `hasSignature` — the
policy tree's own signature check, decomposable (unlike `hasCustom`) since
`meaning`/`signerRole`/`scope` are public policy fields, not opaque registered
logic. Its default, `SignatureHistoryNone`, answers with no signatures on file,
the same fail-closed shape every other default in this table follows
([INV-QD-007](invariants.md#inv-qd-007-defaults-fail-closed)); `SignatureHistoryUnavailable`
is distinct — a wired store that could not be reached, not a legitimate "no
signatures" answer.

`DecisionCache` is the eighth and is **optional**: it is absent from
`EvaluationServices` and read through `Effect.serviceOption`, so an application that
never provides it is unaffected ([ADR-QD-031](decisions/031-decision-cache.md)). That
is also why it was missed — it is a service that does not appear in the type every
other service appears in.

`DecisionSink` is the ninth and is optional on the same terms
([ADR-QD-044](decisions/044-an-optional-decision-sink.md)). It is the only
**write-only** port: `evaluate` hands it every completed evaluation and reads
nothing back, and whatever happens to it — a failure or a defect — cannot change
the decision ([INV-QD-035](invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)).

#### Inspecting a policy, a role graph and two traces

| Export | Kind | Source |
| ------ | ---- | ------ |
| `policyDepth` | function | `Policy.ts` |
| `childrenOf` | function | `Policy.ts` |
| `foldPolicy` | function | `Policy.ts` |
| `fieldsOf` | function | `Policy.ts` |
| `POLICY_TAGS` | constant | `Policy.ts` |
| `foldExplanation` | function | `Explanation.ts` |
| `foldMatcher`, `matcherDepth` | function | `Matcher.ts` |
| `permissionProvenance`, `PermissionGrant` | function + type | `Role.ts` |
| `diffTraces`, `flippedAt` | function | `TraceDiff.ts` |
| `TraceDifference`, `TracePath` | type | `TraceDiff.ts` |
| `VerdictChanged`, `ReasonChanged`, `PolicyTagChanged`, `LabelChanged`, `ChildCountChanged`, `FieldsChanged`, `ObligationsChanged` | type | `TraceDiff.ts` |

Each answers a question the library could pose but not answer. `policyDepth`
counts the way the evaluator counts, so `policyDepth(p) <= n` is exactly the
condition under which `evaluate(p, { maxDepth: n })` will not raise
([BEH-QD-191](behaviors/25-inspection.md)), and — since ADR-QD-090 — whichever
subject asks. `childrenOf` is the per-tag fact `foldPolicy` folds over, and
`foldPolicy` is the stack-safe bottom-up walk a caller-held `Policy` (one a smart
constructor built, with no `MAX_DECODE_DEPTH` bound) is folded through:
`policyDepth`, `simplify`, `explain` and `toPredicate`'s refusal pass are all
`foldPolicy` users, and devtools'
remedy derivation folds through the public `foldPolicy`/`foldMatcher`
([BEH-QD-300](behaviors/25-inspection.md), [BEH-QD-304](behaviors/04-matchers.md)).
`foldExplanation` is its twin over an `Explanation` ([BEH-QD-303](behaviors/18-explanation.md)),
`matcherDepth` counts how a matcher nests (and so how `policyDepth` counts a
matcher-bearing leaf), `fieldsOf` is a node's own `fields` restriction
([BEH-QD-301](behaviors/25-inspection.md)), and `POLICY_TAGS` is every `Policy`
tag, derived from the schema union ([BEH-QD-302](behaviors/25-inspection.md)).
`permissionProvenance` returns the
granting role and path that `flattenPermissions` computes and discards.
`diffTraces` names *which node* changed between two evaluations — the comparison
a what-if needs and that `isMismatch`, which compares verdicts alone, cannot give.

### Errors

`AccessDenied`, `AccessDeniedPublic`, `AttributeResolveError`,
`RelationshipResolveError`,
`MissingResource`, `MissingResourceId`, `MissingAction`, `PolicyTooDeep`,
`CircularRoleInheritance`, `DuplicateRoleDefinition`, `InvalidPermissionSegment`,
`DecisionHistoryUnavailable`, `UndischargedObligation`, `PolicyNotTranslatable`,
`CustomPredicateError`, `SignatureHistoryUnavailable`, `PolicyDecodeTooDeep`,
`InvalidBoundedPermits`, `PredicateNotRenderable` (with its `RenderRefusal` union),
`SinkRecordNotEncodable` (with `EncodeRefusal`, `OpaqueKind`, `UnrepresentableKind`,
`WirePath` and `SinkRecordTag`), `SinkRecordNotDecodable` (with `DecodeRefusal`, `WireVersion` and `WIRE_VERSIONS`),
plus `toAccessDeniedPublic`, `ERROR_CODES` and `errorCode`, and the two unions
`EvaluationError` and `QadiError`. See [ADR-QD-008](decisions/008-error-taxonomy.md).

`AccessDeniedPublic` is `AccessDenied`'s public, no-trace projection —
`subjectId`, `policyTag` and `reason` survive, `trace` (attribute values,
matched rules, policy internals) does not. `toAccessDeniedPublic` is the only
way to construct one, from a real `AccessDenied`, at the moment a denial is
about to cross a process boundary (`@qadi/http`'s response body is the current
consumer — see `AccessDeniedRefused` in the `@qadi/http` table below). Neither
joins `EvaluationError`/`QadiError`/`ERROR_CODES`: evaluation never raises
`AccessDeniedPublic` directly, so it carries no independent stable code of its
own — it shares `AccessDenied`'s `_tag` ("AccessDenied") rather than a
distinct one, since a caller on the far side of that boundary is told the same
thing either way.

`SignatureHistoryUnavailable` joins `EvaluationError`/`QadiError` the same way
`DecisionHistoryUnavailable`/`RelationshipResolveError` do — a wired store that
could not be reached, distinct from `SignatureHistoryNone`'s legitimate "no
signatures" answer. `ERROR_CODES["SignatureHistoryUnavailable"]` is `ACL014`.

`DuplicateRoleDefinition` joins `QadiError` (not `EvaluationError` — it is raised
by `resolveRoleGraph`, not by evaluation) alongside `CircularRoleInheritance`:
`resolveRoleGraph` names a role graph loaded from serialized form with a
repeated definition name, rather than letting the last definition silently
shadow the others. `ERROR_CODES["DuplicateRoleDefinition"]` is `ACL015`.

`PolicyDecodeTooDeep` joins `QadiError` (not `EvaluationError` — it is raised by
`decodePolicy`/`fromJson`, before a policy is ever evaluated). It is defined in
`Policy.ts`, not `Errors.ts`, and imported there as a type only, to avoid the
circular value-import `Policy.ts`'s own doc comment on the class explains; a
type-only import carries no such risk. It had bypassed `QadiError` and
`ERROR_CODES` entirely until now, which meant `decodePolicy` could raise an
error with no stable code — the exact guarantee
ADR-QD-008/INV-QD-010 exist to make. `ERROR_CODES["PolicyDecodeTooDeep"]` is
`ACL017`.

`PredicateNotRenderable` joins `QadiError` (not `EvaluationError` — it is raised by
`toRenderable`, a row-filter concern like `PolicyNotTranslatable`, never by
evaluation). It is declared once, in `Errors.ts`, and re-exported by
`@qadi/predicate-sql` and `@qadi/predicate-prisma`; before ADR-QD-079 each package
declared its own class with the same `_tag`. It carries `predicateTag`
(`"Compare" | "MemberOf"`), a closed `refusal: RenderRefusal` and the human
`reason`. A `Data.TaggedError`, not a `Schema.TaggedError`: it crosses no codec.
`ERROR_CODES["PredicateNotRenderable"]` is `ACL018`.

`SinkRecordNotEncodable` and `SinkRecordNotDecodable` join `QadiError` (not
`EvaluationError` — they are raised by the record codec, `SinkCodec.ts`'s
`encodeSinkRecord` and `decodeSinkRecord`, never by evaluation). Each carries a
closed `Data.TaggedEnum` reason: `EncodeRefusal` (`Circular`, `TooDeep`,
`NonFinite`, `Unrepresentable`, `Opaque`, `EncodeFailed`, each but the last with
the `WirePath` it was found at) and `DecodeRefusal` (`NotJson`, `TooDeep`,
`Malformed`, `UnsupportedVersion` — which carries the `version` sent and the
`supported` versions, `version` being `undefined` for a record that names none;
ADR-QD-096). `WireVersion` is the closed `2` — one member since 0.11.0, kept as
the type `supported` reports — and `WIRE_VERSIONS` (`[2]`) the versions
`decodeSinkRecord` reads. Both are declared in `Errors.ts`, which cannot import
`SinkCodec.ts` or `DecisionRecord.ts` without a cycle (ADR-QD-037);
`SinkRecordTag` restates `SinkRecord["_tag"]` for that reason and a type test
pins the two equal. `Data.TaggedError`, not `Schema.TaggedError`: a refusal is
reported where it happens and crosses no codec. `ERROR_CODES` gives them
`ACL019` and `ACL020` (branch-local numbering, renumbered at merge).

`InvalidBoundedPermits` joins `QadiError` (construction-time, not evaluation)
and is shared by every `…Bounded` port wrapper — `AttributeResolver.ts`'s
`attributeResolverBounded`, `RelationshipResolver.ts`'s
`relationshipResolverBounded`, and `CustomPredicate.ts`'s
`customPredicateBounded` all raise it: `Semaphore.make` performs no validation
of its own, so `permits <= 0` previously built a layer whose every wrapped call
deadlocked forever rather than failing. Fixing this requires each port wrapper
to fail fast instead of building the layer, which is why the error is raised
from the wrapper rather than from `Semaphore.make` itself.
`ERROR_CODES["InvalidBoundedPermits"]` is `ACL016`.

## The other packages

`@qadi/core` is the library; these are the surfaces built on it. They are listed here
because this section is called the *public API surface*, and a reader looking for
`makeQadi` should not have to know which package it lives in.

### `@qadi/react`

| Export | Kind | Source |
| ------ | ---- | ------ |
| `QadiProvider`, `useQadiContext`, `useAtomValue` | component + hook | `QadiProvider.tsx` |
| `QadiProviderProps`, `QadiContextValue` | type | `QadiProvider.tsx` |
| `InitialValues` | type | declared in `HydrationEngine.ts`, re-exported from `QadiProvider.tsx` |
| `MissingQadiProviderError` | class | `QadiProvider.tsx` |
| `outcomeOf`, `currentDecision` | function | `DecisionOutcome.ts` — `outcomeOf` reads a `DecisionResult` into one of five outcomes, the one read every surface renders from; `currentDecision` is its projection, the decision for `Allowed`/`Denied` and `undefined` otherwise (ADR-QD-093) |
| `DecisionOutcome` | type + constructors (`Data.taggedEnum`) | `DecisionOutcome.ts` — `Pending \| Rechecking \| Allowed{decision} \| Denied{decision} \| Failed{cause}`; only `Allowed` carries an allow, and nothing carries a failure's `previousSuccess` |
| `DecisionResult` | type | `DecisionOutcome.ts` — `AsyncResult<ClientDecision, EvaluationError>`, what a decision atom holds |
| `makeQadiAtoms` | function | `QadiAtoms.ts` |
| `QadiAtoms`, `QadiLayer`, `QadiRuntimeServices`, `AskedQuestion` | type | `QadiAtoms.ts` |
| `QadiAtomsOptions` | type | `QadiAtoms.ts` |
| `HydrationMismatch`, `HydrationMismatchReporter` | type, re-exported from `./HydrationEngine.ts` (declared in `HydrationWarning.ts`) | `QadiAtoms.ts` |
| `Can`, `Cannot` | component | `components.tsx` |
| `CanProps`, `CannotProps`, `DeniedNode` | type | `components.tsx` |
| `useSubject`, `useDecision`, `useCan`, `useDecisionSuspense` | hook | `hooks.ts` |
| `usePolicies`, `useProjected`, `useInvalidate`, `useGateInstances` | hook | `hooks.ts` |
| `dehydrateDecisions`, `hydrateDecisions` | function | `Hydration.ts` |
| `makeGateRegistry` | function | `GateRegistry.ts` |
| `GateRegistry`, `GateRegistryOptions` | type | `GateRegistry.ts` |
| `GateInstance`, `GateKind`, `GateRenderState` | type, re-exported from `./GateWriter.ts` | `GateRegistry.ts` — `GateRenderState` is `DecisionOutcome["_tag"]`, derived rather than restated |
| `DehydratedDecisions`, `DehydratedEntry`, `DecisionEntry`, `DehydrateOptions` | type | `Hydration.ts` — `DehydratedDecisions` carries `version: 2` and each entry nests a `decision` derived from `DecisionWire`, with a tagged `disclosure` where the withheld trace (and a denial's reason) would be; declared in `HydrationEngine.ts` |
| `HydrateOptions` | type | `Hydration.ts` |
| `SeededAllow`, `SeededDeny` | class | `Hydration.ts` — the server's decision as a client received it: a projection (verdict, visible fields, obligations) and a `disclosure`, never a fabricated trace or reason; declared in `SeededDecision.ts` |
| `SeededDecision`, `ClientDecision` | type | `Hydration.ts` — `SeededDecision` is `SeededAllow | SeededDeny`; `ClientDecision` is the closed union `Allow | Deny | SeededAllow | SeededDeny` a decision atom holds |
| `AllowDisclosure`, `DenyDisclosure` | schema + type | `Hydration.ts` — `Withheld`, or `Disclosed` with the server's trace (and a denial's reason) |
| `permits`, `isSeeded` | function | `Hydration.ts` — `permits` is the verdict read for a `ClientDecision` (`isAllowed` from `@qadi/core` rejects one, on purpose); `isSeeded` tells a seed from this client's own evaluation |
| `HydrationDrop`, `HydrationDropReporter` | type, re-exported from `./HydrationWarning.ts` | `Hydration.ts` |

`atoms.gates` is the registry an atom set's guards write to ([ADR-QD-080](decisions/080-a-gate-registry-belongs-to-its-atom-set.md)); its write side is internal and not in the barrel.

`outcomeOf` is the one to read twice: it is the single place the rule "a decision
being re-checked is not a decision" lives
([ADR-QD-017](decisions/017-stale-decisions-are-not-decisions.md), as amended by
[ADR-QD-093](decisions/093-a-decision-is-read-once.md)), with `currentDecision` its
projection. A consumer reading `AsyncResult` state directly — `isSuccess`, `waiting`, or
a failure's `previousSuccess` — will report stale allows.

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
| `RequiredPermissionShape` | type | `RequirePermission.ts` — `PermissionRequirement` branded (`Brand.nominal`, matching `@qadi/core`'s `Authorized<P>`) so only a value `requiresPermission` returned satisfies `RequiredPermission`'s own Shape; a raw `{ permission, policy }` literal passed straight to `.annotate(RequiredPermission, {...})` no longer type-checks, closing the silent-overwrite gap `Context` annotation's last-write-wins semantics otherwise leave open |
| `RequirePermission`, `RequirePermissionLive` | middleware + layer | `RequirePermission.ts` — `requiredForClient: true`, with a `clientError` derived from the same schema array as `error:` (ADR-QD-075); a generated client needs `passthroughClientLayer(RequirePermission)` |
| `RequirePermissionClientError` | type | `RequirePermission.ts` — the full 12-tag decoded union `HttpApiMiddleware.ClientError<RequirePermission>` resolves to, derived via `ClientErrorOf` |
| `passthroughClientLayer` | function | `HttpApiMiddlewareClient.ts` — a client-side layer for any `requiredForClient` middleware with no real client-side behavior, generic over `HttpApiMiddleware.AnyId`; not `RequirePermission`-specific (ADR-QD-075) |
| `ClientErrorOf` | type | `HttpApiMiddlewareClient.ts` — derives a middleware's `clientError` union from its own `error:` schema array (`Schemas[number]["Type"]`); `RequirePermissionClientError` is this applied to `RequirePermission`'s array, and any future middleware reuses it the same way rather than re-deriving the formula (ADR-QD-075) |
| `PublicEndpoint`, `publicEndpoint`, `PublicDeclaration` | service + function + type | `RequirePermission.ts` |
| `NO_RESOURCE` | const | `RequirePermission.ts` — the shared "no resource is available yet" placeholder every route that evaluates before a real resource exists (`RequirePermission`'s own middleware, `decisionStreamRoute`, `permissionRegistryRoute`) passes as `loadResource`'s result, rather than each reimplementing `{}` |
| `guardRoute` | function | `GuardRoute.ts` |
| `addGuardedRoute` | function | `PermissionRegistry.ts` |
| `PermissionRegistry`, `PermissionRegistryLive` | service + layer | `PermissionRegistry.ts` |
| `registerApi`, `permissionRegistryRoute`, `permissionRegistryRouteUnguarded` | function + layer | `PermissionRegistry.ts` |
| `decisionBacklogRoute` | layer factory | `DecisionBacklogRoute.ts` — `GET /__decisions/backlog`: a log's retained records as a JSON array of stored-record envelopes (`no-store`), guarded with no unguarded variant and registered with `PermissionRegistry`; not atomic with `/__decisions` (ARCH-11 D-11-f, ADR-QD-049's CLI is its reader) |
| `decisionStreamRoute` | layer factory | `DecisionStreamRoute.ts` — serves a `DecisionLogReader` as SSE: the backlog as `backlog` frames, one `synced`, then live `message` frames, each a stored-record envelope (ADR-QD-097); takes an optional `DecisionStreamOptions.reauth` to re-authorize an open connection on an interval, ending it on the first failed recheck |
| `DecisionStreamOptions` | type | `DecisionStreamRoute.ts` — `reauth`, and `onRefused`: called for each record that cannot be framed, in place of the default warning (ARCH-09) |
| `frame` | function | `DecisionStreamRoute.ts` — `frame(event)` is one `StoredRecord` as an SSE frame of that `DecisionFrameEvent` through `@qadi/core`'s `encodeStoredRecordString`, or its `SinkRecordNotEncodable` as the filter's failure value; exported so the refusal is testable directly rather than only through a live connection |
| `DecisionFrameEvent` | type | `DecisionStreamRoute.ts` — `"backlog" \| "message"`, the closed set of events a record is framed as |
| `DecisionStreamSynced`, `syncedFrame` | schema + type, function | `DecisionStreamRoute.ts` — the `synced` frame's data, `{ backlog: n }` (the backlog frames actually sent), and the frame itself |
| `decisionFrames` | function | `DecisionStreamRoute.ts` — the route's body before UTF-8 encoding: one log read's backlog, `synced`, then live, each through `frame`, a refused record reported (`onRefused`, else a warning) and dropped, so one record never ends the stream for any subscriber (ARCH-09); exported for the same reason `frame` is |
| `reauthCheck` | function | `DecisionStreamRoute.ts` — one re-authorization attempt against a request already in hand, on `assert`'s permitted-and-discharged semantics (matching connect-time `guardRoute`); exported for the same reason `frame` is, so the periodic recheck `reauth` drives is testable directly against `TestClock` |
| `EndpointDescriptor`, `PermissionRegistryData`, `PermissionRegistryShape` | type | `PermissionRegistry.ts` |
| `toResponse` | function | `QadiHttpError.ts` — the bare-`HttpRouter` adapter's status mapping, `HTTP_STATUS_BY_CLASS[classifyEnforcementError(error)]`; every `EnforcementError` tag still gets an empty body here (ADR-QD-072) |
| `HTTP_STATUS_BY_CLASS` | const | `QadiHttpError.ts` — the status each `EnforcementErrorClass` answers with on both routing shapes; replaces `DENIAL_STATUS` (ADR-QD-081) |
| `HttpEnforcementFailure`, `HttpEnforcementTag` | type | `QadiHttpError.ts` — `EnforcementError` plus the package-local `SubjectExtractionFailed`, and its twelve tags |
| `EnforcementErrorWire`, `EnforcementErrorWireTable` | interface + type | `QadiHttpError.ts` — one tag's class, status, `httpApiStatus`-annotated schema and typed projection; and the total tag-keyed table of them, generic over the failure union so a type test can model a new tag |
| `ENFORCEMENT_ERROR_WIRE`, `projectHttpEnforcementFailure` | const + function | `QadiHttpError.ts` — the one table every status, wire schema, `RequirePermission` `error:`/`clientError` entry and denial-log tag derives from, and the typed per-tag projection to the redacted wire value (BEH-QD-177, BEH-QD-260, INV-QD-060) |
| `HTTP_ENFORCEMENT_TAGS`, `HTTP_ENFORCEMENT_ERROR_SCHEMAS` | const | `QadiHttpError.ts` — the twelve tags as a literal tuple for `Effect.catchTag`, and the twelve schemas in table order (ADR-QD-075's single list) |
| `handleEnforcementErrors` | function | `QadiHttpError.ts` — `GuardRoute.ts`'s enforcement-error-to-response mapping; `handleMiddlewareEnforcementErrors`, its `HttpApiMiddleware` counterpart, is deleted as of ADR-QD-072 — `RequirePermission`'s declared `error:` schemas project every tag in-channel and let `HttpApiMiddleware`'s own encoder answer instead (ADR-QD-081) |
| `logDenial` | function | `QadiHttpError.ts` — logs `errorCode`/`subjectId`/`reason`-or-`obligationIds` (never the full `trace`) for an `AccessDenied`/`UndischargedObligation`; wired via `Effect.tapErrorTag` into both `handleEnforcementErrors` and `RequirePermissionLive`, so a denial leaves a server-side record instead of only the client-visible response (JD-03, JM-05) |
| `AttributeResolveErrorResponse`, `RelationshipResolveErrorResponse`, `DecisionHistoryUnavailableResponse`, `CustomPredicateErrorResponse`, `SignatureHistoryUnavailableResponse`, `MissingActionResponse`, `MissingResourceResponse`, `MissingResourceIdResponse`, `PolicyTooDeepResponse` | schema | `QadiHttpError.ts` — views onto `ENFORCEMENT_ERROR_WIRE`: the nine wire-crossing `EnforcementError` classes (ADR-QD-060), each `.pipe(HttpApiSchema.status(…))`-annotated in `@qadi/http` rather than in `@qadi/core`, which has no dependency on `effect/http-api`; declared in `RequirePermission.error` so `HttpApiMiddleware`'s response encoder produces the real status and body for each; the status is derived from the tag's class, never chosen here (ADR-QD-081) |
| `AccessDeniedRefused` | schema | `QadiHttpError.ts` — `@qadi/core`'s `AccessDeniedPublic` annotated with `HttpApiSchema.status(403)`; carries `subjectId`, `policyTag`, `reason`, never `trace`. A view onto `ENFORCEMENT_ERROR_WIRE.AccessDenied`; the entry's projection (`toAccessDeniedPublic`) reduces the real `AccessDenied` to it before `HttpApiMiddleware`'s encoder runs, so what OpenAPI advertises here matches what a caller actually receives |
| `UndischargedObligationRefused`, `SubjectExtractionRefused` | schema | `QadiHttpError.ts` — views onto `ENFORCEMENT_ERROR_WIRE`: tag-only `Schema.TaggedStruct`s (the body is the tag, not empty) for `UndischargedObligation`/`SubjectExtractionFailed`, declared for OpenAPI visibility only; **not** `HttpApiSchema.Empty` (`Schema.Void`) — a bare no-content schema in the same declared union "encodes" any other member's value successfully without inspecting it (`HttpApiBuilder.ts:1268`, `:1296`, `:1332` in `effect` 4.0.0), silently reverting the nine schemas above back to empty bodies (BEH-QD-260, found by the TDD test this required) |
| `subjectExtractionFailedResponse` | function | `QadiHttpError.ts` — the log-then-502 arm `handleEnforcementErrors` uses for a `SubjectExtractionFailed` on a bare route, built from `ENFORCEMENT_ERROR_WIRE.SubjectExtractionFailed` |
| `logSubjectExtractionFailed` | function | `QadiHttpError.ts` — logs a `SubjectExtractionFailed`'s real reason server-side; wired via `Effect.tapErrorTag` into `RequirePermissionLive` and used by `subjectExtractionFailedResponse` |
| `SubjectExtractor`, `subjectExtractorBearer` | service + layer | `SubjectExtractor.ts` |
| `SubjectExtractorShape` | type | `SubjectExtractor.ts` |
| `SubjectExtractionFailed` | error | `SubjectExtractor.ts` |

Two framework adapters over one enforcement path — `RequirePermission` for
`effect/http-api`'s declarative `HttpApi`, `guardRoute`/
`addGuardedRoute` for bare `effect/http`'s `HttpRouter` — both thin
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

### `@qadi/predicate-sql`

| Export | Kind | Source |
| ------ | ---- | ------ |
| `compileSql` | function | `index.ts` |
| `SqlDialect`, `SqlFragment`, `CompileSqlOptions`, `SqlSafeValue` | type | `index.ts` |
| `PredicateNotRenderable` | error | re-exported from `@qadi/core` |

`SqlSafeValue` (BC-02) is an alias of `@qadi/core`'s `SafeLiteral` — `string | number | boolean | null`, the only shapes a driver can bind as a parameter, with the rule itself (`isSafeLiteral`) living beside `evaluatePredicate` so the two dialect packages cannot drift on it — carried through to `SqlFragment.params`'s own type so an unchecked value pushed there is a compile error, not a reviewer's job. `CompileSqlOptions` takes `dialect`, `maxInValues?`, `nullable?` (which columns accept NULL; absent declares nothing) and `identifiers?` (`"Ascii"` by default). The SQLite dialect binds a boolean as `1`/`0`, since neither Node SQLite driver can bind a JavaScript boolean.

Compiles a `Predicate` into a parameterized SQL fragment for PostgreSQL, MySQL,
or SQLite, all three built at v1. Optional and separately versioned —
`@qadi/core` gains no dependency of any kind through this package existing.
Refuses rather than approximates: an unsafe `Compare`/`MemberOf` value or column,
or a `MemberOf` past `maxInValues`, fails `PredicateNotRenderable` instead of being
stringified into the fragment. A renderer of `@qadi/core`'s `toRenderable`: what a
predicate may hold and what it means is core's, and this package prints syntax. See
[ADR-QD-054](decisions/054-a-companion-package-may-compile-a-dialect.md) and
[31 — Predicate Compilation](behaviors/31-predicate-compilation.md).

### `@qadi/predicate-prisma`

| Export | Kind | Source |
| ------ | ---- | ------ |
| `compilePrismaWhere` | function | `index.ts` |
| `CompilePrismaWhereOptions` | interface | `index.ts` |
| `PrismaModelLike` | interface | `index.ts` |
| `PrismaFieldLike` | interface | `index.ts` |
| `nullableFieldsOf` | function | `index.ts` |
| `PrismaTypedModelLike` | interface | `index.ts` |
| `PrismaTypedFieldLike` | interface | `index.ts` |
| `floatingFieldsOf` | function | `index.ts` |
| `PrismaWhereInput` | type | `index.ts` |
| `PredicateNotRenderable` | error | re-exported from `@qadi/core` |

Compiles a `Predicate` into a Prisma `WhereInput`. `compilePrismaWhere` takes a
required `CompilePrismaWhereOptions.nullable` — which columns accept NULL — that
`nullableFieldsOf` derives from a structural Prisma DMMF model
(`PrismaModelLike`); it is what lets a `Negate` over a nullable column admit the
NULL rows the evaluator does and keeps a required column from ever mentioning
`null` (CCR-QD-157). It also takes a required `floating` — which columns are
`Float`/`Decimal` fields — that `floatingFieldsOf` derives from a DMMF model's
`type` (`PrismaTypedModelLike`, which Prisma 7's runtime `Prisma.dmmf` satisfies);
a `gte`/`lt` on such a column refuses (`NonFiniteColumn`) because Prisma has no
filter that keeps an infinite row out of a range (CCR-QD-172). `PrismaWhereInput` is
`Record<string, unknown>` deliberately — this package never sees a generated
Prisma schema, so it cannot claim a narrower type; a caller assigns the result
to their own model's `WhereInput` at the call site. Same refusal discipline as
`@qadi/predicate-sql`: both are renderers of `@qadi/core`'s `toRenderable`, and the
two compile the same predicates apart from Prisma's own reserved column names.
`CompilePrismaWhereOptions` also takes `maxInValues?` (default 1000) and
`identifiers?`. See
[ADR-QD-054](decisions/054-a-companion-package-may-compile-a-dialect.md) and
[31 — Predicate Compilation](behaviors/31-predicate-compilation.md).

### `@qadi/audit`

| Export | Kind | Source |
| ------ | ---- | ------ |
| `AuditTrailPort`, `AuditTrailPortShape` | service | `AuditTrailPort.ts` |
| `AuditWriteError` | error | `AuditTrailPort.ts` |
| `AuditStagingPort`, `AuditStagingPortShape` | service | `AuditStagingPort.ts` |
| `AuditStagingError` | error | `AuditStagingPort.ts` |
| `AuditStagingHandle` | type | `AuditStagingPort.ts` |
| `AuditEntry` | schema + type | `AuditEntry.ts` — the persisted row: `record` is `SinkRecordJson`, wire-version-2 bytes. A pre-0.10 (version-1) row is re-encoded with 0.10.x before upgrading (ADR-QD-096 and its 2026-10-06 amendment) |
| `AuditEntryNotEncodable` | error | `AuditEntry.ts` — carries core's `EncodeRefusal` as `refusal`, and `reason`, that refusal as a sentence |
| `encodeAuditEntry` | function | `AuditEntry.ts` — one `encodeSinkRecord` call: a row's `record` is the encoded wire, byte-identical to the decision stream's and forwarding's for the same record (ARCH-09), written as wire version 2 (ADR-QD-096) |
| `decodeAuditEntry` | function | `AuditEntry.ts` — the guarded reader for a stored row: the record through core's depth-guarded `decodeSinkRecord`, then the row decoded as untrusted; returns `Result<{ entry, record }, SinkRecordNotDecodable>` (ARCH-09). Reads version-2 rows, with the core decode's envelope leniency and content strictness, and refuses a pre-0.10 row as `UnsupportedVersion`; the sanctioned re-parse path (ADR-QD-096) |
| `AuditDecisionSinkLive` | layer | `AuditDecisionSinkLive.ts` |
| `AuditDecisionSinkOptions` | type | `AuditDecisionSinkLive.ts` |
| `AuditTrailPortTest` | function | `AuditTrailPortTest.ts` |
| `AuditTrailPortTestOptions`, `AuditTrailPortTestHandle` | type | `AuditTrailPortTest.ts` |
| `AuditStagingPortTest` | function | `AuditStagingPortTest.ts` |
| `AuditStagingPortTestOptions`, `AuditStagingPortTestHandle` | type | `AuditStagingPortTest.ts` |
| `getPurgeableEntries`, `enforceRetention`, `planRetention` | function | `Retention.ts` — `planRetention` is the one rule (INV-QD-101); the other two project it |
| `RetentionPolicy`, `RetentionPlan` | type | `Retention.ts` |
| `RetentionInputInvalid` | class | `Retention.ts` — a `Data.TaggedError`: `planRetention` refused a non-finite `now` or a `maxAgeMs` that is `NaN` or negative |
| `verifySequenceIntegrity` | function | `SequenceIntegrity.ts` — renamed from `verifyChainIntegrity`; gap-and-duplicate detection over caller-assigned sequence numbers, not cryptographic tamper-evidence |
| `SequenceIntegrityError` | error | `SequenceIntegrity.ts` — renamed from `ChainIntegrityError` |
| `archiveAuditTrail` | function | `AuditArchive.ts` |
| `AuditArchive`, `ArchivalOptions`, `KeyMaterial` | type | `AuditArchive.ts` |
| `makeDecommissioningChecklist`, `completeDecommissioningStep` | function | `DecommissioningChecklist.ts` |
| `DecommissioningChecklist`, `DecommissioningStep`, `DecommissioningStepId` | type | `DecommissioningChecklist.ts` |
| `UnknownDecommissioningStep` | error | `DecommissioningChecklist.ts` |
| `SignatureCapturePort`, `SignatureCapturePortShape` | service | `SignatureCapturePort.ts` |
| `signatureObligationHandler` | function | `SignatureCapturePort.ts` |
| `SignatureCaptureError` | error | `SignatureCapturePort.ts` |
| `SignatureCaptureRequest`, `SignatureValidationResult` | type | `SignatureCapturePort.ts` |
| `SIGNATURE_MEANINGS` | constant, re-exported from `@qadi/core` | `SignatureCapturePort.ts` |
| `SignatureMeaning` | type, re-exported from `@qadi/core` | `SignatureCapturePort.ts` |

Narrows [ADR-QD-016](decisions/016-gxp-out-of-scope.md) the way ADR-QD-054
narrowed ADR-QD-024: an optional, dependency-free companion package, adding
nothing to `@qadi/core`'s dependency graph. `AuditDecisionSinkLive` is the
assembled `DecisionSink` implementation — audit-trail write, best-effort
staging and an internal circuit breaker composed into one pipeline, so the
capability is reachable through one call rather than individually correct and
never wired together, the defect ADR-QD-016 named in the predecessor and
[HexDi's own Guard](decisions/016-gxp-out-of-scope.md) still has. Retention,
archival, the decommissioning checklist and e-signature *capture* are
structurally outside that pipeline — pure functions and an `ObligationHandler`,
respectively. See [ADR-QD-056](decisions/056-audit-companion-package.md).

E-signature *check* — the `hasSignature` `Policy` predicate — was out of
scope for ADR-QD-056 and landed separately as its own `@qadi/core` change
(the "hasSignature" map). `SignatureCapturePort.capture`/`validate` now
operate on that map's canonical `Signature` type directly, harmonized by
**ADR-QD-057**, which retired this package's own `ElectronicSignature` in
favor of it.

### `@qadi/testing`

| Export | Kind | Source |
| ------ | ---- | ------ |
| `qadiTestLayer` | layer | `QadiTestLayer.ts` |
| `qadiReviewLayer` | layer | `QadiReviewLayer.ts` |
| `QadiTestServices`, `TestLayerOptions` | type | `QadiReviewLayer.ts` — `TestLayerOptions.ports` overrides any port by name (`PortOverrides`), winning over the matching data option; a failing, scripted or recording port is `@qadi/core`'s `scriptedPort`/`recordingPort`, which replaced this package's eleven per-port doubles (ADR-QD-094) |
| `subjectWith`, `permissions`, `roles`, `policies` | fixture | `Fixtures.ts` |
| `nobody`, `viewer`, `administrator` | fixture | `Fixtures.ts` |
| `collectingTracer` | function | `CollectingTracer.ts` — the shared span-capturing `Tracer` five test files each hand-rolled a copy of before this consolidation |

### `@qadi/devtools`

Two entry points. `@qadi/devtools` is the headless model — decoding, merging,
ordering and pairing, with no React in it — and `@qadi/devtools/react` renders
that model and computes nothing. `react` is an **optional** peer dependency, so
a server-side aggregator can consume the model without a UI.

The `bun` condition of every entry point in a package's `exports` map is read by
`scripts/check-api-surface.mjs`, gate 13, so a second entry point's surface is
checked exactly as the first one's is (CCR-QD-067).

| Export | Kind | Source |
| ------ | ---- | ------ |
| `Source`, `SourceRead`, `DecisionEventSource`, `DecisionEventName`, `MalformedReason` | type | `model/Source.ts` — `DecisionEventSource` is the structural `EventSource` subset, one `onEvent` listener per `DecisionEventName` (`"backlog" \| "synced" \| "message"`); a `Source` is one scoped `read` returning `SourceRead` (`backlog?` absent when the source cannot answer for the past, then `live`); `MalformedReason` is `"not-json" \| "too-deep" \| "not-a-record" \| "unsupported-version"`, mapped from core's `DecodeRefusal` (ARCH-09, ADR-QD-096) |
| `sourceFromRecords`, `sourceFromEventSource` | constructor | `model/Source.ts` — `sourceFromEventSource` reads `/__decisions`' prelude as its backlog (absent when no `synced` arrives within `syncTimeout`; a `message` before it is live) and takes each record's environment off the wire; a bare record is `not-a-record`, never labelled. A `DecisionLog` is itself a `Source`, so an in-process log needs no constructor |
| `mergeSources` | function | `model/Source.ts` — several sources as one, so a server's decisions and a browser's re-checks share a timeline |
| `Timeline`, `TimelineEntry` | type | `model/Timeline.ts` |
| `TimelineDecision`, `TimelineOrphan` | class | `model/Timeline.ts` |
| `emptyTimeline`, `ingest`, `ingestAll`, `entryKey` | function | `model/Timeline.ts` |
| `DEFAULT_TIMELINE_CAPACITY` | constant | `model/Timeline.ts` |
| `TimelineStore` | type | `model/TimelineStore.ts` |
| `makeTimelineStore`, `runSource` | function | `model/TimelineStore.ts` |
| `Verdict`, `Counts` | type | `model/Verdict.ts` |
| `verdictOf`, `verdictOfOutcome`, `countsOf` | function | `model/Verdict.ts` |
| `PairRole`, `PairedEntry` | type | `model/Pairing.ts` |
| `PortCallPort`, `PortCallInterpreter`, `AttributeCall`, `ActedCall`, `RelationshipCall`, `CustomPredicateCall`, `SignatureHistoryCall`, `PortCall` | type | `model/PortCalls.ts` — `PortCallInterpreter` is the closed pair `"evaluate"` / `"toPredicate"` every `PortCall` carries (BEH-QD-228) |
| `PortCallLog`, `PortCallCollector` | type | `model/PortCalls.ts` |
| `DEFAULT_PORT_CALL_CAPACITY` | constant | `model/PortCalls.ts` |
| `collectPortCalls` | function | `model/PortCalls.ts` |
| `pairedEntries`, `pairsOf` | function | `model/Pairing.ts` |
| `NodeStatus`, `InspectKind`, `InspectNode` | type | `model/Inspect.ts` |
| `inspect`, `inspectEntry`, `isNeverResolved`, `isTruncated`, `flattenTree` | function | `model/Inspect.ts` |
| `Filters` | type | `model/Filters.ts` |
| `noFilters` | constant | `model/Filters.ts` |
| `isUnfiltered`, `applyFilters`, `environmentsOf`, `searchTextOf` | function | `model/Filters.ts` |
| `SimulatedSubject`, `SimulationInput`, `EvaluationPorts`, `EvaluationPortsLayer` | type | `model/SimulationInput.ts` |
| `subjectOf`, `evaluationOptionsOf` | function | `model/SimulationInput.ts` |
| `SimulationClock`, `SimulationOptions` | type | `model/Simulation.ts` |
| `simulate`, `simulationLayer` | function | `model/Simulation.ts` |
| `SimulationSource`, `FixtureSource`, `SnapshotSource`, `LiveSource` | type | `model/SimulationSource.ts` |
| `fixtures`, `snapshot`, `live`, `causesIO`, `portsOf` | function | `model/SimulationSource.ts` |
| `Answer`, `CapturedAnswers` | type | `model/Capture.ts` — `CapturedAnswers` is keyed by port name (`AttributeResolver`, …), each map keyed by that port's description's `key`, so a capture and its replay agree about a key by construction (INV-QD-043, ADR-QD-094) |
| `emptyAnswers` | constant | `model/Capture.ts` |
| `capturing`, `replayLayer`, `answerCount` | function | `model/Capture.ts` — `capturing` is `@qadi/core`'s `decoratePorts`; `replayLayer` is each port's `scriptedPort`, answering an unseen request with the description's fail-closed `none` answer |
| `EditDirection`, `EditKind`, `SimulationEdit` | type | `model/SimulationEdit.ts` |
| `composeEdits`, `applyEdits`, `editParts` | function | `model/SimulationEdit.ts` |
| `PairSweep` | type | `model/Edits.ts` |
| `DEFAULT_MAX_PAIRS` | constant | `model/Edits.ts` |
| `singleEdits`, `pairEdits`, `sameEdge`, `sameEvent` | function | `model/Edits.ts` |
| `Synthesised`, `SkippedRemedy`, `RemedySweep` | type | `model/Remedies.ts` |
| `remedyEdits`, `satisfyingValue` | function | `model/Remedies.ts` |
| `Comparison`, `Compared`, `BecameError`, `Recovered`, `StillFailed` | type | `model/WhatIf.ts` |
| `UnseededField`, `Replay`, `BaselineCaveat`, `Baseline` | type | `model/Replay.ts` |
| `unseededByReplay` | constant | `model/Replay.ts` |
| `replayInput`, `baselineDiff`, `matchesBaseline` | function | `model/Replay.ts` |
| `WhatIfOptions`, `SweepPlan`, `WhatIfRow`, `WhatIfReport` | type | `model/WhatIf.ts` |
| `compareOutcomes`, `isChanged`, `sweepPlan`, `whatIf`, `changedRows` | function | `model/WhatIf.ts` |
| `Selection` | type | `model/Selection.ts` |
| `NoSelection`, `Selected`, `Evicted` | class | `model/Selection.ts` |
| `selectionOf` | function | `model/Selection.ts` |
| `Catalogue`, `PolicySighting` | type | `model/Catalogue.ts` |
| `policyLabel`, `policiesSeen`, `catalogueOf` | function | `model/Catalogue.ts` |
| `RoleNode`, `RoleSummary` | type | `model/RoleTree.ts` |
| `roleSummary`, `grantPath`, `decidingSet` | function | `model/RoleTree.ts` |
| `PortReport`, `CacheReport`, `WiringReport`, `PortActivity` | type | `model/Wiring.ts` — `PortActivity` carries `calls`, `retries`, `timeouts` (`qadi_port_timeouts_total`) and `translationCalls` |
| `wiringReport`, `portActivity` | effect | `model/Wiring.ts` |
| `GateInstanceLike`, `GateGroup`, `GateStateCount` | type | `model/Gates.ts` |
| `gateGroups`, `isLocatable`, `locatableIds`, `instancesAsking` | function | `model/Gates.ts` |
| `GATE_STATES` | constant | `model/Gates.ts` |
| `HydrationActivity`, `HydrationDrops` | type | `model/Hydration.ts` |
| `hydrationActivity` | effect | `model/Hydration.ts` |
| `unaccountedEntries`, `hasHydrated` | function | `model/Hydration.ts` |
| `useTimeline`, `useTimelineStore`, `UseTimeline` | hook + type | `react/useTimeline.ts` |
| `DevtoolsDock`, `DevtoolsDockProps` | component + type | `react/DevtoolsDock.tsx` |
| `DecisionLog`, `DecisionLogProps` | component + type | `react/DecisionLog.tsx` |
| `Inspector`, `InspectorProps` | component + type | `react/Inspector.tsx` |
| `FieldsPanel`, `ObligationList` | component | `react/DecisionPanels.tsx` |
| `Simulator`, `SimulatorProps` | component + type | `react/Simulator.tsx` |
| `WhatIfTable`, `WhatIfTableProps` | component + type | `react/WhatIfTable.tsx` |
| `VerdictTag`, `EnvironmentTag` | component | `react/VerdictTag.tsx` |
| `PolicyTree`, `PolicyTreeProps` | component + type | `react/PolicyTree.tsx` |
| `PolicyExplorer`, `PolicyExplorerProps` | component + type | `react/PolicyExplorer.tsx` |
| `RoleViewer`, `RoleViewerProps` | component + type | `react/RoleViewer.tsx` |
| `ServicesPanel`, `ServicesPanelProps` | component + type | `react/ServicesPanel.tsx` |
| `QuestionsPanel`, `QuestionsPanelProps`, `AskedQuestionLike` | component + type | `react/QuestionsPanel.tsx` |
| `GateBox` | type | `react/Lens.ts` |
| `isMeasurable`, `boxOf`, `boxesOf`, `drawLens`, `clearLens`, `gateIdAt` | function | `react/Lens.ts` |
| `useLens`, `Lens` | hook + type | `react/useLens.ts` |

## Not listed above

Every export not named in the tables above appears here, with the reason. The gate in
`scripts/check-api-surface.mjs` accepts a name found anywhere between `## Public API
surface` and `## Worked example` — this table included, the rest of the document not
— so this table is what keeps an omission **explicit** rather than silent — the same
standard the rest of the specification holds itself to.

| Export | Why not listed |
| ------ | -------------- |
| `Requirement`, `All`, `Any`, `Negated`, `Named`, `Owing`, `Table` | The seven members of the `Explanation` union, plus `Row`, the shape of one entry in a `Table`'s `rows` field rather than a union alternative in its own right. A caller needs the union and the two functions over it; naming each member above would describe the shape of a tree rather than the surface of an API. They are specified in [18 — Policy Explanation](behaviors/18-explanation.md) |
| `parseFieldPath`, `Containment`, `compareFieldPaths`, `project`, `SpecShape`, `shapeOf`, `compareShapes` (`@qadi/core/FieldPath.ts`) | Deliberately kept out of the barrel per §9 (they are the field-lattice's own internal helpers, not vocabulary a policy author reaches for), but `@qadi/core`'s `./*` wildcard subpath export still makes `@qadi/core/FieldPath` importable, so they are real exports rather than private ones. `SpecShape`/`shapeOf`/`compareShapes` split `compareFieldPaths`'s two steps apart so `Decision.ts`'s `intersectFields` can compute each spec's shape once and reuse it across an O(|a|·|b|) pairwise comparison instead of recomputing it per pair. No known consumer imports this subpath today |
| `wrapService`, `wrapServiceEffect`, `boundedPermits`, `retryCountingAttempts`, `wrapPort`, `retryingPort`, `boundedPort`, `timingOutPort`, `nonePort` (`@qadi/core/PortDerivation.ts`) | Same reasoning as `FieldPath.ts` — the derivations every port's wrappers and named default are built from, reachable only via `@qadi/core/PortDerivation`. Callers use the named wrappers and defaults each port module exports; there is no port outside the five to apply them to (D-10-c, ADR-QD-094). `PortDerivation.ts` absorbed `RetryingLayer.ts`, whose `wrapService`/`wrapServiceEffect`/`boundedPermits` rows this replaces |
| `catchPortDefect`, `Interpreter`, `readAttribute`, `askActedAny`, `askActedForResource`, `askRelationship`, `askCustom`, `askSignature`, `SignatureAnswer` (`@qadi/core/PortAccess.ts`) | Scaffolding shared by the two interpreters, reachable only via the `./*` subpath (AGENTS.md §9), mirroring the `PortDerivation.ts` row above. Every port read `evaluate` and `toPredicate` make — question, span, call metric and defect-to-typed-error mapping — lives here once; not vocabulary a policy author reaches for. See [ADR-QD-077](decisions/077-both-interpreters-read-ports-through-one-module.md) |
| `foldTree` (`@qadi/core/TreeFold.ts`) | Deliberately kept out of the barrel per AGENTS.md §9 — generic scaffolding behind `foldPolicy`, `foldExplanation` and `foldMatcher`, reachable only through the `./*` wildcard subpath. `@qadi/devtools` keeps a package-private twin (`src/model/TreeFold.ts`, not exported) rather than importing it, because AGENTS.md §1 forbids a cross-package subpath import (ADR-QD-090) |
| `anyOfStopsAtAllow`, `rulesDecisiveEffect`, `effectiveCombining`, `isCombining` (`@qadi/core/ShortCircuit.ts`) | Same reasoning as `PortAccess.ts` — the stop rules both interpreters read, reachable only via `@qadi/core/ShortCircuit`. Pure functions over `FieldStrategy` and `Combining`; a change to when `anyOf` may stop changes `evaluate` and `toPredicate` at once ([BEH-QD-265](behaviors/16-predicates.md)). `effectiveCombining` maps a `combining` outside the union to `DenyOverrides` for both interpreters (ADR-QD-092); `isCombining` is the own-property membership test it reads, which `renderExplanation` reads too to name such a value instead of throwing (ADR-QD-092 amendment) |
| `fieldStrategyLaws`, `StrategyLaws`, `isFieldStrategy` (`@qadi/core/FieldLattice.ts`) | Kept out of the barrel per AGENTS.md §9 — each strategy's merge and the three laws (`decidedByFirst`, `emptyIsUnit`, `singletonIsIdentity`) that `ShortCircuit.ts` and `Simplify.ts` read instead of restating, with a fail-closed row for a value outside the union. `isFieldStrategy` is the own-property membership test that row is chosen by, which `renderExplanation` reads too to name such a value instead of throwing. Generic names, consumer-facing only for those adapters; reachable through the `./*` wildcard subpath (ADR-QD-092 and its amendment) |
| `holds`, `isFiniteNumber`, `equalsVerdict`, `differsVerdict`, `atLeastVerdict`, `belowVerdict`, `memberVerdict`, `dominatesVerdict`, `compareVerdict` (`@qadi/core/Compare.ts`) | Kept out of the barrel (AGENTS.md §9): generic names like `holds` would leak into the flat namespace, and the module's interface stays free to change while only core consumes it. It is the one owner of what a comparison means — `judgeMatcher`, `evaluatePredicate` and the denial reason all read it ([ADR-QD-091](decisions/091-comparison-semantics-have-one-owner.md), [BEH-QD-305](behaviors/04-matchers.md#beh-qd-305-comparison-semantics-have-one-owner)). `Verdict` and `CompareOp`, which it also declares, are public through `Matcher.ts` and `Predicate.ts`; reachable only via `@qadi/core/Compare` |
| `CircuitBreakerStatus`, `CircuitBreakerOptions`, `CircuitBreaker`, `Permit`, `Admitted`, `Refused`, `makeCircuitBreaker` (`@qadi/audit/CircuitBreaker.ts`) | Same reasoning, reachable via `@qadi/audit/CircuitBreaker`; `@qadi/audit`'s barrel exposes the breaker's effect on `record`, not the breaker type itself |

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  EvaluationIdLive,
  allOf,
  currentSubjectLayer,
  enforceProjected,
  fromRoles,
  hasPermission,
  hasRole,
  permission,
  role,
  portsLayer,
} from "@qadi/core";

const readDoc = permission("doc", "read");
const editor = role({ name: "editor", permissions: [readDoc] });

// Module-level constants: a policy built inline would be a new object per call.
const canReadTitle = allOf([
  hasRole("editor"),
  hasPermission(readDoc, { fields: ["id", "title"] }),
]);

const qadiServices = Layer.mergeAll(
  portsLayer(),
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
