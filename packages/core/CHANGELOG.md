# @qadi/core

## 0.11.0

### Minor Changes

- 9d9f249: One wire format: this release reads and writes only the formats 0.10 writes — record wire version 2, `{ environment, record }` stream envelopes, and `version: 2` hydration payloads. Every older format is refused, and each refusal is reported with its own reason (ADR-QD-096, ADR-QD-097 and ADR-QD-078, amended 2026-10-06; INV-QD-099 retired).

  **Migration — read this first. Audit rows written before 0.10 (wire version 1, no `version` key) are no longer readable. Before upgrading anything that reads an audit store, re-encode every pre-0.10 row as version 2 with 0.10.x: read it with `decodeAuditEntry` and write it back with `encodeAuditEntry` from `@qadi/audit@0.10`, which reads version 1 and writes version 2. A row that is not migrated is refused by this release as `UnsupportedVersion` with `version: undefined`. It is reported, never skipped, never upgraded.** A peer on 0.9 or earlier, such as a forwarding sender or a `/__decisions` server, writes version-1 records and bare frames. **It must upgrade (0.10 or later is enough). There is no compatibility path.** A deployment that is entirely on 0.10 has nothing else to migrate. The website's "Upgrading to 0.11" page has the full guide.

  - **Breaking (`@qadi/core`):** `decodeSinkRecord`/`decodeSinkRecordString` read wire version 2 only. A record with no `version` (a pre-0.10, version-1 record), or with any version other than 2, is refused as `DecodeRefusal.UnsupportedVersion`. `version` is `undefined` when absent. The record is never upgraded and never given a sentinel subject or an outcome. The pre-0.5 `failed.code` tolerance went with the version-1 reader. A JSON value that is not an object is still `Malformed`. `SinkRecordJson` is now the version-2 encoded type alone, not a union of versions. `WireVersion` narrows to `2` and `WIRE_VERSIONS` to `[2]`; both stay exported, because `UnsupportedVersion.supported` reports them.
  - **Breaking (`@qadi/core`):** `DecodeStoredRecordOptions` is removed, along with its deprecated `legacyEnvironment` (scheduled for removal when it shipped). `decodeStoredRecord` and `decodeStoredRecordString` take no options, and a bare record (what a server older than 0.10 sends) is refused as `Malformed`.
  - **Breaking (`@qadi/audit`):** `AuditEntry.record` is version-2 bytes only. A store adapter no longer needs to narrow on `"version" in entry.record`. `decodeAuditEntry` refuses a pre-0.10 row as `UnsupportedVersion` (see the migration above). `AuditArchive`'s `archiveVersion` stays `"1"`, and an archive bundled before 0.10 is migrated entry by entry.
  - **Breaking (`@qadi/devtools`):** `sourceFromEventSource` loses `legacyEnvironment`. A bare frame is reported as `"not-a-record"`, and a version-1 record as `"unsupported-version"`. A `message` frame that arrives before `synced` no longer ends the prelude wait as a sign of an "older server". Every server since 0.10 sends the prelude first, so such a frame is delivered live. `syncTimeout` still bounds the wait for a server whose prelude has not arrived, which leaves the backlog absent.
  - **Breaking (`@qadi/react`):** `hydrateDecisions` reads `version: 2` payloads only, as scheduled when 0.10 deprecated the older reader. A payload with no `version` (the format 0.9 and earlier wrote) is dropped whole as `UnsupportedPayloadVersion`, counted and reported like any other unsupported version, and the client re-decides those questions. `DehydratedDecisionsV1`, `DehydratedEntryV1` and `DehydratedPayload` are removed. `hydrateDecisions` and `QadiAtoms.hydrate` take `DehydratedDecisions`.

## 0.10.0

### Minor Changes

- 1fd8700: `toPredicate` now reads its ports the way `evaluate` does, and stops asking where `evaluate` stops (ADR-QD-077, INV-QD-058). This is a behaviour change; every change is in the fail-safe direction (an error, never a widening — INV-QD-018 is unchanged).

  - A port that **dies** during `toPredicate` (throws, `Effect.die`) now fails with that port's own typed error — `AttributeResolveError` or `DecisionHistoryUnavailable` — instead of surfacing as an untyped defect, so `Effect.retry` and `Effect.catchTag` around `toPredicate` see it, exactly as they do around `evaluate`.
  - Translation now **stops asking ports** where `evaluate` does: an `allOf` at its first constant denial, an `anyOf` (under `fieldStrategy: "First"`) at its first constant allow, a rule table at the rule nothing later can override. A policy that previously failed because a port behind an already-decisive constant failed may now succeed. It never admits differently.
  - A **refusal now wins over a port failure** in the same tree: `PolicyNotTranslatable` and `PolicyTooDeep` are decided from the tree alone, before any port is asked, so `allOf([hasAttribute(…), hasCustom(…)])` refuses with `HasCustom` rather than surfacing the attribute store's error first, and a policy refuses for every subject or for none. `MissingAction` is still raised when translation reaches the node that needs an action.
  - New metric `predicatePortCallsTotal` (`qadi_predicate_port_calls_total`, keyed by the new closed `PredicatePortName`) counts `toPredicate`'s port calls. `portCallsTotal` keeps counting the evaluator's only, with its description unchanged.
  - Port spans (`qadi.attribute`, `qadi.acted`, …) gain a `qadi.interpreter` annotation, `"evaluate"` or `"toPredicate"`, and `toPredicate`'s reads now emit them. A test asserting an exact span attribute set must include the new key.
  - `@qadi/devtools`: `PortCall` gains `interpreter` and `PortActivity` gains `translationCalls`, so the Services screen tells a translation's reads from an evaluation's. `PortActivity.translationCalls` is a required field — a hand-built `PortActivity` needs it.

- 1fd8700: Policy, `Explanation` and `Matcher` walkers now fold through one stack-safe seam, and nesting depth is a property of the policy rather than of who is asking (ADR-QD-090, INV-QD-037, INV-QD-090). **Breaking, in the fail-safe direction** — a policy that used to evaluate can now be refused, never the other way round:

  - **`evaluate` rejects an over-deep policy before visiting any node.** A policy deeper than `maxDepth` now fails with `PolicyTooDeep` whichever subject asks and whatever its branches would have short-circuited past. Before, `anyOf([hasRole("editor"), deepChain])` with `maxDepth: 1` evaluated for an editor (the first child allowed, so the deep branch was never reached) and failed for everyone else. `policyDepth(p) <= n` now holds _exactly when_ `evaluate(p, { maxDepth: n })` does not raise `PolicyTooDeep`; INV-QD-037 said so but only the forward direction was true. A caller whose policy sits near the bound and relied on short-circuiting must raise `maxDepth`.
  - **Matcher nesting counts toward `maxDepth`.** A `HasAttribute` or `HasResourceAttribute` leaf contributes the nesting of its matcher, so `policyDepth(hasAttribute("tags", someMatch(eq(…))))` goes from `0` to `1`. This bounds `evaluateMatcher`'s native recursion, which a 5,000-deep in-memory matcher used to overflow as a defect. A policy near `maxDepth` that nests matchers may need a larger one.
  - **`toPredicate` reports `PolicyTooDeep` before the fields refusal.** A policy that is both too deep and field-restricting is now always `PolicyTooDeep`; it used to be `PolicyNotTranslatable` or `PolicyTooDeep` depending on child order.
  - **No `maxDepth` a caller supplies can turn a decision into a defect.** `evaluate(labeled^5000(…), { maxDepth: Infinity })` used to fail with a `Die` carrying a `RangeError`; `Not`, `Obliged` and `Labeled` now build their child lazily, and `toPredicate`'s refusal pass and translation are stack-safe too.
  - **Every pure walk over a caller-held tree is stack-safe.** `renderExplanation(explain(not^n(…)))` overflowed at about n = 734, `referencesAction`/`referencesResource` and `explain` over a deep matcher had no guard, and `@qadi/devtools`' `inspect` (about 1,759 levels), `remedyEdits`/`sweepPlan`/`whatIf` (about 2,000, 256 for `rules`) and `satisfyingValue` recursed natively. All now complete at 100,000 levels and 250,000 children.
  - **A cyclic policy throws instead of hanging.** Only in-process mutation can build one.
  - New exports: `foldPolicy`, `fieldsOf`, `POLICY_TAGS` (`Policy.ts`), `foldExplanation` (`Explanation.ts`), `foldMatcher`, `matcherDepth` (`Matcher.ts`). `POLICY_TAGS` is derived from the schema union and replaces two hand-written copies; `fieldsOf` is the node's own `fields` restriction. `TreeFold.ts`'s `foldTree` is reachable only as the `@qadi/core/TreeFold` subpath, deliberately not in the barrel.

- 1fd8700: The enforcement-error class table moves into `@qadi/core`, and `@qadi/http` derives every status, wire schema and middleware error list from one table (ADR-QD-081, INV-QD-060, BEH-QD-270). HTTP bodies and statuses are unchanged for callers.

  **Breaking for `@qadi/http` importers.** Each name has one home, with no re-export shim:

  - `ENFORCEMENT_ERROR_TAGS`, `EnforcementErrorClass` and `classifyEnforcementError` are no longer exported by `@qadi/http`. Import them from `@qadi/core`.
  - `DENIAL_STATUS` is removed. Use `HTTP_STATUS_BY_CLASS.denied` (or `HTTP_STATUS_BY_CLASS[classifyEnforcementError(error)]`).

  New in `@qadi/core`: `ENFORCEMENT_ERROR_CLASSES` (a total, tag-keyed class table beside `ERROR_CODES`), `classifyEnforcementError`, `ENFORCEMENT_ERROR_TAGS`, `ENFORCEMENT_DENIAL_TAGS`, `EnforcementErrorClass`, `EnforcementErrorClassTable`, `EnforcementErrorTagOf`, `EnforcementDenial`, and `StandingEvaluationServices` (`Exclude<EvaluationServices, CurrentSubject>`, the services a runtime holds while the subject travels per call). `EnforcementError` is now declared in `Errors.ts`; the package barrel is unchanged.

  New in `@qadi/http`: `HTTP_STATUS_BY_CLASS`, `ENFORCEMENT_ERROR_WIRE` (one entry per tag: class, derived status, `httpApiStatus` schema, typed redacting projection), `projectHttpEnforcementFailure`, `HTTP_ENFORCEMENT_TAGS`, `HTTP_ENFORCEMENT_ERROR_SCHEMAS`, `HttpEnforcementFailure`, `HttpEnforcementTag`, `EnforcementErrorWire`, `EnforcementErrorWireTable` and `logSubjectExtractionFailed`. The `*Response` and `*Refused` schemas keep their names as views onto the table.

  Adding an enforcement error is now one entry in each of two tables, and every omission is a compile error. The bare route and `RequirePermission` can no longer disagree about a tag's status. `RequirePermissionLive` projects all twelve tags in-channel instead of hand-catching three. The generated OpenAPI document declares its error responses in the same order as before.

  The Next.js example's publish action no longer misreports an unmet obligation as an outage, and no longer lets `CustomPredicateError` or `SignatureHistoryUnavailable` escape as a rejected Promise.

- 1fd8700: Each evaluation port is described once, and its wrappers, fail-closed default, test doubles and environment are derived from that description (ADR-QD-094, INV-QD-095).

  - **Every port has the full wrapper set.** `decisionHistoryRetrying`, `decisionHistoryBounded`, `decisionHistoryTimingOut`, `signatureHistoryRetrying`, `signatureHistoryBounded`, `signatureHistoryTimingOut` and `customPredicateTimingOut` are new, so a hung history or signature store no longer holds an evaluation open with no deadline. Every retrying wrapper annotates `qadi.attempts` on the caller's span. Each wrapper's retry now re-invokes the port's method on every attempt rather than re-running the effect the first call returned.
  - **Port descriptions.** `attributeResolverPort`, `relationshipResolverPort`, `customPredicatePort`, `decisionHistoryPort` and `signatureHistoryPort` state each port's name, method, span, typed-error constructors, request key and fail-closed answer. New types `PortDescription`, `PortShape`, `PortReply`, `PortScript`, `PortSpanName`.
  - **Doubles.** `scriptedPort` answers, fails with the port's own error, dies or throws per request, and falls back to the fail-closed answer; `recordingPort` records a real port's requests without absorbing failures; `replyTable` keys a script by the port's request key. Each logs requests as typed tuples.
  - **Registry and environments.** `PortTypes`, `PORTS`, `PortServices`, `PortLayers`, `PortOverrides`, `DescriptionOf` and the `ServiceOf`/`ShapeOf`/`ArgsOf`/`AnswerOf`/`ErrorOf` helpers; `portsLayer(overrides)` gives every port its fail-closed default unless named, and order no longer matters (overriding by merging after `EvaluationServicesNone` used to keep the default when the override came first); `mapPorts`, `mergePorts`, `decoratePorts`, `forEveryPort`, `tabulatePorts`. `EvaluationServices` is now `CurrentSubject | EvaluationId | PortServices`, the same union as before.
  - **Breaking (`@qadi/core`):** `RetryingPortName` and `TimingOutPortName` are removed; use `PortName`. `qadi_port_retries_total` and `qadi_port_timeouts_total` now preregister all five ports. Their descriptions are unchanged, so no metric registry key moved. `@qadi/core/RetryingLayer` is gone; its helpers live in `@qadi/core/PortDerivation`.
  - **Breaking (`@qadi/testing`):** `failingAttributeResolver`, `failingRelationshipResolver`, `failingDecisionHistory`, `failingCustomPredicate`, `failingSignatureHistory`, `recordingAttributeResolver`, `recordingCustomPredicate`, `recordingSignatureHistory`, `edgeRelationshipResolver`, `eventDecisionHistory`, `CallRecorder`/`makeCallRecorder` and the `SignatureInput` re-export are removed. Use `scriptedPort(<port>Port, () => PortReply.fail(cause)).layer` for a failing port and `recordingPort(<port>Port, layer)` for a recording one. `TestLayerOptions`' `attributeResolver`/`relationshipResolver`/`decisionHistory`/`customPredicate`/`signatureHistory` become one `ports` option keyed by port name (`{ ports: { AttributeResolver: layer } }`), which wins over the matching data option. The `attributes`/`relationships`/`history`/`signatures` options now build core's fixtures, so the implementation names a wiring panel shows for them change (`attributeResolverFromRecord`, …). `qadiReviewLayer` is typed `Layer<StandingEvaluationServices>`, the same set as before.
  - **Breaking (`@qadi/devtools`):** `CapturedAnswers` is keyed by port name (`AttributeResolver`, `RelationshipResolver`, `DecisionHistory`, `CustomPredicate`, `SignatureHistory`) instead of `attributes`/`relationships`/`history`/`custom`/`signatures`; `attributeKey`, `relationshipKey`, `historyKey`, `customPredicateKey` and `signatureHistoryKey` are removed, so use each port description's `key`. Capture and replay keys are unchanged. `PortActivity` gains a required `timeouts` field read from `qadi_port_timeouts_total`, and the Services screen shows it.

- 1fd8700: One decision log replaces the ring, the feed and their pairing: a process's sink, its backlog and its live stream in one value, with every retained record reaching a reader exactly once (ADR-QD-097, INV-QD-100).

  **Rollout.** `/__decisions` frames are now `{ environment, record }` envelopes. A devtools panel older than this release reads every frame from a newer server as `not-a-record` (reported through `onMalformed`, never shown mislabelled): upgrade the panel with the server. A newer panel reading an older server's bare frames labels them with `legacyEnvironment` when given, and reports them otherwise.

  - **`@qadi/core` — `makeDecisionLog({ environment, capacity? })`** returns a `DecisionLog`: `layer` (the `DecisionSink`), `ingest`, `snapshot`, `clear`, a scoped `read` (`{ backlog, live }`) and `readEntries(after?)` (each record with its `LogCursor`). One `capacity` (default `DEFAULT_LOG_CAPACITY = 500`, a positive integer — zero is refused) bounds the backlog and a reader's lag. `ingest` reaches live readers as well as the backlog, which is what makes an aggregator's `Edge` record visible to a reader already watching. A record made while a reader connects is never lost or repeated; the documented ring + feed recipe lost every such record.
  - **`@qadi/core` — the stored-record envelope.** `StoredRecordJson`, `encodeStoredRecord`/`encodeStoredRecordString` and `decodeStoredRecord`/`decodeStoredRecordString` (with `DecodeStoredRecordOptions.legacyEnvironment`, deprecated, kept for one minor) carry the producer's environment beside the unchanged record wire. Also new: `storedRecordOrder` (the one order a stored record is read in), `LogCursor`, `LogEntry`, `DecisionLogEntries`, `formatLogCursor`, `parseLogCursor`, `DecisionLogRead`, `DecisionLogReader`. `Stamped`, `StoredRecord`, `StoredDecisionRecord`, `StoredObligationRecord` and `stampRecord` now live in `DecisionRecord.ts`; their import from `@qadi/core` is unchanged.
  - **Breaking (`@qadi/core`):** `decisionSinkRing`, `decisionSinkFeed`, `DEFAULT_RING_CAPACITY` and `DEFAULT_FEED_CAPACITY` are removed.

    ```ts
    // before
    const ring = decisionSinkRing({ environment: "Server", capacity: 500 });
    const feed = Effect.runSync(decisionSinkFeed({ capacity: 256, replay: 32 }));
    const sink = decisionSinkAll([ring.layer, feed.layer]);
    // after
    const log = Effect.runSync(makeDecisionLog({ environment: "Server", capacity: 500 }));
    const sink = log.layer; // ring.snapshot → log.snapshot, ring.ingest → log.ingest
    ```

  - **Breaking (`@qadi/http`):** `decisionStreamRoute(permission, policy, log, options?)` takes a `DecisionLogReader` (a `DecisionLog`), not a `Stream`: `decisionStreamRoute(p, policy, feed.stream)` becomes `decisionStreamRoute(p, policy, log)`. Each connection receives the log's backlog as `event: backlog` frames, one `event: synced` frame (`{"backlog":n}`, `DecisionStreamSynced`), then live frames; every record frame carries its cursor as its SSE `id`, and a reconnect's `Last-Event-ID` from the same log is sent only what it missed. `frame(event, cursor?)` and `decisionFrames(entries, options?)` change signature accordingly; `DecisionFrameEvent` and `syncedFrame` are new.
  - **`@qadi/http` — `decisionBacklogRoute(permission, policy, log, options?)`** serves the backlog as a JSON array of envelopes at `/__decisions/backlog`, guarded with no unguarded variant and listed by `/__permissions`.
  - **Breaking (`@qadi/devtools`):** a `Source` is one scoped `read` — `{ read: Effect<SourceRead, never, Scope> }` with `SourceRead = { backlog?, live }` — so the past and the future are handed over together. A `DecisionLog` is a `Source` as it is, and `sourceFromFeed` is removed: `sourceFromFeed({ stream, environment, backlog })` becomes the log itself. `sourceFromEventSource` loses `environment` (each frame names its producer), gains `legacyEnvironment` (deprecated) and `syncTimeout` (default two seconds), reads the server's prelude as its backlog, and its `DecisionEventSource` registers `onEvent` per `DecisionEventName` (`"backlog" | "synced" | "message"`) instead of `onMessage`. A hand-built `Source` (`{ backlog: Effect, live }`) becomes `{ read: Effect.succeed({ backlog, live }) }`. `DEFAULT_TIMELINE_CAPACITY` is `DEFAULT_LOG_CAPACITY`.

- 1fd8700: `@qadi/audit`: the circuit breaker's half-open probe protocol now lives inside `CircuitBreaker.withPermit`, and three defects found while moving it are fixed.

  **Fixes.** A probe interrupted while `stage()` was in flight used to hold its claim until the half-open age-out, doubling recovery time to twice `resetTimeoutMs`; the claim is now released on every exit from the moment it is taken. A write failure settling on an already-`Open` breaker no longer re-announces an `Open` transition (over-counting `qadi_audit_circuit_breaker_transitions_total`) or restarts the open window. A write's outcome now counts only toward the window that admitted it, so a late failure from before a trip cannot reopen a newer half-open window. Comments and BEH-QD-251 no longer claim that a caller's interruption of a write reaches the breaker; it is not a store failure.

  **Breaking, for `@qadi/audit/CircuitBreaker` subpath imports only.** The `CircuitBreaker` interface is now `status` plus `withPermit`; `recordSuccess`, `recordFailure`, `claimProbe` and `releaseProbe` are no longer members. `Permit`, `Admitted` and `Refused` are new exports. `@qadi/audit`'s barrel and `AuditDecisionSinkLive` behave as before.

- 1fd8700: Fix `toPredicate` admitting non-finite rows the evaluator denies, and give comparison semantics one owner (breaking for hand-built `RenderRules`).

  `evaluatePredicate`'s `Gte`/`Lt` checked only the bound for finiteness, so `toPredicate(hasResourceAttribute("level", gte(3)))` admitted a row whose `level` is `Infinity`, and `lt(3)` a `-Infinity` row, while `evaluate` denied both: a filter wider than the policy. Both operands are now checked.

  What `Eq`, `Neq`, `Gte`, `Lt`, membership and dominance mean now lives in one internal module (`@qadi/core/Compare`) that the evaluator, `evaluatePredicate`, the renderable classifier and the denial reason all read, so the two interpreters' leaves cannot drift apart again.

  - New `judgeMatcher(matcher, value, context)` returns a `Verdict`: `"Held" | "NotHeld" | "ValueAbsent" | "ReferenceAbsent" | "Incomparable"`. `evaluateMatcher` is unchanged and equals `judgeMatcher(...) === "Held"`.
  - Denial reasons: an `eq`/`dominates` against a reference that resolves to nothing now reads `has no reference value to compare against` (only `neq` did), and a value the matcher cannot compare (`Infinity` or `"5"` under `gte(3)`) reads `is not a value this matcher can compare` instead of `did not match`.
  - `inArray([undefined])` no longer matches an absent value. An absent value now satisfies no matcher.
  - `RenderRules` gains two required fields, `finiteness: ColumnFiniteness` and `finiteExclusion: FiniteExclusion`, and a `Range` node gains `finiteGuard: FiniteGuard`. `RenderRefusal` gains `"NonFiniteColumn"`. Code that builds `RenderRules` by hand, or matches `RenderRefusal` exhaustively, must add them.

- 1fd8700: Give each field strategy's meaning one owner, export `mergeFields`, and fix three ways a policy built in code failed open.

  What `Intersection`, `Union` and `First` mean — the merge, and the facts the short-circuit rule and `simplify` lean on — now lives in one internal module (`@qadi/core/FieldLattice`), with a fail-closed answer for any value outside the union. `intersectFields`, `unionFields` and `VisibleFields` still resolve from `@qadi/core` and `@qadi/core/Decision`.

  - New export `mergeFields(strategy, sets)`: the evaluator's own merge of allowing children's field sets. It never grants a field no input granted, returns `undefined` (every field) for no inputs under a known strategy, and `[]` for a strategy outside the union.
  - Fix: an `anyOf` whose `fieldStrategy` was a key `Object.prototype` supplies (`"toString"`, `"constructor"`, `"__proto__"`, `"hasOwnProperty"`) stopped at its first allowing child and granted every field. It now walks every child and grants none. Decoded policies were never affected; only ones built in process.
  - Fix: `simplify` no longer changes `visibleFields`. It flattened an empty same-strategy `allOf` under `Union` or `First` (whose empty merge is not a unit), and unwrapped a one-child composite under a strategy outside the union, widening it from no fields to the child's.
  - Fix: a rule table whose `combining` is outside the union now decides as `DenyOverrides` in `evaluate` and `toPredicate`. It used to permit where `DenyOverrides` would deny, and `toPredicate` threw on it.
  - Behaviour: when `Intersection` meets two specs that denote the same set (`"title"` and `"title.**"`), it keeps the lexicographically smaller text instead of the right-hand one, so `Allow.visibleFields` no longer depends on the order of the allowing children. What a subject can see is unchanged.

- 1fd8700: Add `toRenderable`: the dialect-free leaf rules a SQL or Prisma renderer used to re-derive, and the one `PredicateNotRenderable`.

  `@qadi/predicate-sql` and `@qadi/predicate-prisma` each carried their own copy of what a safe literal is, what `Compare` means against NULL and against a non-number, that an empty `MemberOf` is false, which column names are refused, and how large an `IN` list may be. They are properties of `evaluatePredicate`, not of a dialect, and the copies drifted (the SQL one admitted `NaN` for a release). They now live beside `evaluatePredicate`:

  - `toRenderable(predicate, rules)` classifies a `Predicate` once into a closed `RenderableNode` tree (`Constant`, `IsNull`, `Equals`, `Range`, `OneOf`, `All`, `Any`, `Not`) or refuses with `PredicateNotRenderable`. `RenderRules` declares the identifier rule, reserved columns, `maxInValues`, which columns may hold NULL (`ColumnNullability`) and whether the target's `NOT` is two- or three-valued (`Negation`). Core still emits no dialect text and gains no dependency.
  - `PredicateLiteral`: `SafeLiteral`, `isSafeLiteral`, `isRangeBound`, `IdentifierRule` (`"Ascii"` or `"UnicodeBmp"`), `isRenderableIdentifier`. `evaluatePredicate`'s `Gte`/`Lt` and the classifier call the same `isRangeBound`.
  - `PredicateNotRenderable` is declared once in core, with `predicateTag`, a closed `refusal: RenderRefusal` and `reason`, and joins `QadiError` with the stable code `ACL018`.

  Breaking for exhaustive consumers: `QadiError` gains a member, so a `Match` or `switch` over it that has no default arm stops compiling until it handles `PredicateNotRenderable`. `ERROR_CODES` gains `"PredicateNotRenderable": "ACL018"`.

- 1fd8700: **Breaking (`@qadi/react`).** A server-rendered decision is now its own type, not a fabricated `Allow`/`Deny`.

  Hydration used to rebuild a seed into a core `Allow`/`Deny`, which needs a trace and a deny reason, so both were made up whenever the server withheld them: a single-node trace with the reason `"hydrated"` (which `<Can fallback={(deny) => deny.reason}>` rendered), and a root of `"AllOf"` for a payload with no trace. A seed is now a `SeededAllow` or `SeededDeny` carrying a tagged `disclosure` (`Withheld`, or `Disclosed` with the server's own trace and reason), and a decision atom holds a `ClientDecision = Allow | Deny | SeededAllow | SeededDeny`.

  What changes for you:

  - `DecisionResult`, `currentDecision`'s return type and `useDecisionSuspense` now name a `ClientDecision`. `isAllowed` from `@qadi/core` rejects one on purpose; read the verdict with the new `permits`, and tell a seed from this client's own evaluation with `isSeeded`.
  - `DeniedNode`'s function receives `Deny | SeededDeny`. A `SeededDeny` has no `reason` or `trace` of its own, so narrow with `isSeeded` before reading either.
  - **Fail-closed note.** Code comparing `decision._tag === "Allow"` keeps compiling and now treats a seeded allow as not allowed. That is never a grant — the page may flash again — but it is a behaviour change; move to `permits`.
  - `HydrationMismatch.seeded` is a `SeededDecision`.
  - The dehydrated payload is `version: 2`, and each entry nests a `decision` derived from `@qadi/core`'s new `DecisionWire`. `hydrateDecisions` still reads the format that predates `version` (typed `DehydratedDecisionsV1`, deprecated, removed in the next minor release), always seeding it `Withheld`. Any other version is dropped as `UnsupportedPayloadVersion`.
  - `hydrateDecisions` never throws: a value that is not an envelope is dropped as `MalformedPayload`. A disclosed trace whose root is not the entry's own policy is dropped as `MalformedEntry`.
  - `UnregisteredAtoms` is removed from the closed drop-reason union (`ClientHydrationDropReason`, `hydrationDropReasons`), and `UnsupportedPayloadVersion` and `MalformedPayload` are added. An exhaustive `Match` over the reasons stops compiling until it handles them.
  - `QadiAtoms` gains `hydrate`, the seeding capability `hydrateDecisions` delegates to. A spread copy or wrapper of an atom set now seeds the same questions its original does, instead of being refused whole.
  - `HydrateOptions.onDropped` receives `HydrationDrop<unknown>`: the entries are what failed to decode.

  `@qadi/core` gains `DecisionWire`/`DecisionWireAllow`/`DecisionWireDeny`, `encodeDecision`/`decodeDecision` (the decision's wire form, moved out of `SinkCodec` — `SinkRecordWire`'s bytes are unchanged, but a `Deny` without a `reason`, or an `Allow` with one, is now refused on decode instead of being given an invented `"denied"`), `projectVisible` (the body of `project` after its verdict check) and `subjectEquivalence` (the structural subject equality `DecisionCache` already used). `@qadi/react`'s `subject` atom now uses it, so a nested attribute object that is equal by structure no longer re-runs every mounted decision.

  `@qadi/devtools` reads the same five hydration metrics unchanged; its drop-reason table follows the new set.

- 1fd8700: The decision-record wire is versioned, a decision's outcome on it is exclusive, and a reader ignores envelope metadata it does not know (ADR-QD-096, INV-QD-098, INV-QD-099).

  **Rollout — read this first. This release writes wire version 2, and a reader on an earlier release refuses it. Upgrade every _reader_ of decision records — devtools panels, aggregators, audit tooling, anything that decodes another process's records or another deployment's audit rows — to this version before any _writer_ (`decisionSinkForwarding`, `decisionStreamRoute`, `AuditDecisionSinkLive`).** The change was planned as three releases — readers of both versions first, then writers defaulting to version 2 with a `wireVersion: 1` option to hold a lagging fleet, then the option's removal — and ships as one, so there is no option to hold a writer at version 1: the order above is the only lever. A process that reads its own records (the in-process devtools, a store written and read by one deployment) is unaffected.

  - **Two wire versions, both read.** Version 1 is the wire every earlier release wrote (no `version` key; the outcome as `decided` or `failed`), and is read for good, so audit rows written by any earlier release — including `@qadi/audit` 0.3/0.4 rows whose error still carries the `code` 0.5.0 dropped — keep reading. Version 2 adds `version: 2` and carries the outcome as one tagged value, `outcome: { _tag: "Decided", decision } | { _tag: "Failed", error }`; it is what every sender now writes. Any other `version` is refused as `UnsupportedVersion`. `WireVersion` (`1 | 2`) and `WIRE_VERSIONS` are exported.
  - **A newer sender's extra envelope field no longer refuses the record.** A top-level key a reader does not declare is ignored; a key it does not declare anywhere nested — inside the policy, the trace, the decision or the error — is still refused.
  - **Breaking (`@qadi/core`):** a decision record naming neither outcome, or both, is now refused as `Malformed` instead of decoding to an invented `MissingResource` error (indistinguishable by `ACL004` from a real resolver failure) or a silently chosen `decided`. `DecodeRefusal` gains `UnsupportedVersion { version, supported }`, so an exhaustive match over it needs an arm. `SinkRecordJson` is the closed union of version-1 and version-2 bytes, and a consumer of `send`'s value reading `decided`/`failed` must read version 2's `outcome` instead (or narrow on `"version" in json`).
  - **Breaking (`@qadi/audit`):** `AuditEntry.record` is that union: new rows are version 2, and a store adapter reading `entry.record.decided` directly must narrow on `"version" in entry.record`. `decodeAuditEntry` reads both versions with the same leniency and strictness as the core decode; it is the one re-parse path — the `AuditEntry` schema alone silently strips a typo inside a stored policy. `AuditArchive`'s `archiveVersion` stays `"1"`.
  - **Breaking (`@qadi/http`):** frames on `/__decisions` carry version-2 records.
  - **Breaking (`@qadi/devtools`):** `MalformedReason` gains `"unsupported-version"`: a server newer than the panel, fixed by upgrading the panel.

- 1fd8700: The decision-record codec owns the whole wire in both directions, so every sink makes one call and emits the same bytes (ADR-QD-095, INV-QD-096, INV-QD-097).

  - **Four operations.** `encodeSinkRecord(record)` returns `Result<SinkRecordJson, SinkRecordNotEncodable>` and `encodeSinkRecordString(record)` the same as text; `decodeSinkRecord(input: unknown)` and `decodeSinkRecordString(text)` return `Result<SinkRecord, SinkRecordNotDecodable>`. None of them throws. A refusal names its reason and, outbound, the path it was found at: `EncodeRefusal` is `Circular`, `TooDeep`, `NonFinite`, `Unrepresentable`, `Opaque` or `EncodeFailed`; `DecodeRefusal` is `NotJson`, `TooDeep` or `Malformed`. Both errors join `QadiError` (`ACL019`, `ACL020`).
  - **Breaking (`@qadi/core`):** `toWire`, `fromWireUnsafe`, `isJsonSafe`, `isRecordJsonSafe`, `encodeRecord`, `encodeRecordSync`, `decodeRecordWire`, `decodeRecord`, `EvaluationErrorSchema` and `SinkRecordWire` are removed. Use `encodeSinkRecord`/`encodeSinkRecordString` and `decodeSinkRecord`/`decodeSinkRecordString`; `SinkRecordJson` is the encoded wire's schema and type. `decisionSinkForwarding`'s `send` receives a `SinkRecordJson`, and a record that cannot be encoded never reaches it: `onFailure` receives the `SinkRecordNotEncodable` (with no `onFailure`, a log line distinct from a send failure's). `QadiError` gains two members, so an exhaustive match over it needs two more arms.
  - **Breaking (`@qadi/http`):** `frame`'s failure value is the `SinkRecordNotEncodable`. A refused record drops only its own frame and is reported through the new `DecisionStreamOptions.onRefused`, or a warning naming the refusal, its path and the evaluation. `decisionFrames` (the route's body stream) is exported for tests.
  - **Breaking (`@qadi/audit`):** `AuditEntry.record` is now the encoded JSON form (`SinkRecordJson`), so a store persists `JSON.stringify(entry)` as it is and gets exactly the bytes the decision stream and forwarding emit; a store reading `entry.record.failed` as a class instance must change. Read rows back with the new `decodeAuditEntry(input)`, which is depth-guarded and returns `Result<{ entry, record }, SinkRecordNotDecodable>`. `AuditEntryNotEncodable` gains `refusal`, and `reason` is now that refusal as a sentence.
  - **Breaking (`@qadi/devtools`):** `MalformedReason` gains `"too-deep"`: a frame nested past the decode bound, which a current sender refuses to emit, so it means an older or foreign sender.

  **Wire.** For the same record, decision-stream frames and audit rows now carry an `Error` cause as `{ name, message }` where they used to carry `{}`, matching forwarding byte for byte; any other cause is normalised through `Schema.Defect()` (a cycle dropped, a `bigint` as `"10n"`) instead of being refused. A property whose value is `undefined` now crosses as absent instead of refusing the record. `Decided` records are byte-identical to before.

  **Fixed.**

  - A resolver `cause` with a reference cycle (an HTTP client's error) or a `bigint` no longer ends every `/__decisions` subscriber's stream.
  - Such a `Failed` record no longer reaches an audit store's `JSON.stringify` and throws, so an attribute-store outage no longer trips the audit breaker and drops the healthy rows after it.
  - A policy about 5,000 levels deep no longer makes forwarding's encode throw and get reported as a send failure; it is refused as `TooDeep`.
  - A record nested past what every receiver decodes (an evaluation under a raised `maxDepth`) is refused at the sender instead of being sent and then refused by every receiver.
  - A `Map`, `Set`, `RegExp`, binary array, `URL` or `Error` inside a resource is refused with its path instead of being persisted and streamed as `{}`.
  - A deeply nested stored audit row is refused as `TooDeep` by `decodeAuditEntry` instead of dying with a `RangeError`.

### Patch Changes

- 1fd8700: `relationshipResolverRetrying` and `customPredicateRetrying` now annotate `qadi.attempts` on the caller's span, the way `attributeResolverRetrying` always has (KH-01). Before, a retried relationship check or custom predicate showed up in a trace as one slow call, with nothing saying how many store round trips it took. `customPredicateRetrying`'s documentation claimed it already did this. All three wrappers now share one implementation of the retry accounting. A test asserting an exact attribute set on a span that encloses one of these wrappers must now include `qadi.attempts`.
- 1fd8700: A decision record whose resolver error carries a circular or `BigInt` cause, or whose resource holds a `Map`, `Set`, `RegExp` or binary array, is now refused by `isRecordJsonSafe` instead of crashing the decision stream for every subscriber, or poisoning the audit store and tripping its circuit breaker. The guard used to walk `resource` and `policy` only. A plain `Error` cause is still accepted.

## 0.9.0

### Minor Changes

- ab38290: `effect` is now a peer dependency (`^4.0.0`, stable Effect v4) instead of an
  exactly pinned runtime dependency, and `@qadi/react` declares `@effect/atom-react` as a peer too.
  Install them yourself: `pnpm add @qadi/core effect`. The public API is made of Effect classes, so the peer
  guarantees a single copy in your dependency tree.

  The minimum Effect version is now stable `4.0.0`. Since rc.118 the modules Qadi imports live outside
  `unstable/` (`effect/http`, `effect/http-api`, `effect/reactivity`, `effect/encoding`,
  `effect/persistence`, `effect/devtools`), and a single build cannot import both spellings. Stable
  `4.0.0` also changed `Effect.partition` to return `[passes, fails]` (it was `[fails, passes]`) and tightened
  `Schema.brand`'s tag type; `decideSubjects`/`filterSubjects` and the `@qadi/core` brands are adapted.
  Projects on a release candidate must upgrade to `4.0.0`.

## 0.8.0

### Minor Changes

- be76b5b: Concurrent `AllOf`/`AnyOf`/`Rules` evaluation is now deterministic under failure: children run through `Effect.exit` and fold in declaration order, so a sibling failure can no longer pre-empt an earlier sibling's already-decisive `Deny`/`Allow` the way `Effect.forEach`'s fail-fast default let it (ADR-QD-026, INV-QD-020).

  Two runtime fail-opens fixed: `resolveRef`'s `Neq` path and `mergeFields` both used `const exhaustive: never = ref` as their exhaustiveness guard, which only checks at compile time — an unrecognized tag at runtime returned the bogus scrutinee itself instead of the documented safe fallback, reopening the exact gap CCR-QD-112 had closed for `resolveRef` and risking a lattice-top widen for `mergeFields`.

  `HasRelationship.depth` now decodes with a `[0, 64]` bound (previously unbounded/non-finite); `HasRole` gained `fields`; `policyDepth`/`simplify`/`explain` are now stack-safe over programmatically-built trees of arbitrary depth. New exports: `AccessDeniedPublic`, `toAccessDeniedPublic`, `attributeResolverTimingOut`, `relationshipResolverTimingOut`, `defaultFieldStrategy`, `allOfRoles`, `childrenOf`.

## 0.7.0

### Patch Changes

- c7aecf1: Bump `effect` to `4.0.0-rc.116` (and its lockstep catalog siblings `@effect/atom-react`, `@effect/platform-node`, `@effect/vitest`). No public API or runtime behavior changes for any `@qadi/*` package — confirmed by diffing the published `4.0.0-rc.115`/`4.0.0-rc.116` tarballs directly and grepping every changed symbol against this codebase's own source.

## 0.6.3

No changes in this release.

## 0.6.2

No changes in this release.

## 0.6.1

### Patch Changes

- `0.6.0` was published from a checkout where `pnpm build` had never been run, so all 9 tarballs shipped `src/` and `package.json` only — no `lib/`, no `.d.ts`, no `index.js`. `0.6.0` could not be unpublished (no OTP access at the time), so it stays on the registry as a known-broken release; `npm deprecate` points installers at `0.6.1` instead. This release ships the intended build output, no source changes otherwise.

  Root cause fixed: each public package now has a `prepack` script (`pnpm -w run build`, not a package-local `tsc -b` — `@qadi/testing`, `@qadi/audit`, etc. depend on other workspace packages and a local-only build would not rebuild them) that runs automatically before `npm pack`/`npm publish`/`pnpm pack`/`pnpm publish`, so this can no longer happen regardless of which checkout the publish step runs from.

## 0.6.0

### Minor Changes

- 47e5683: `effect` bumped from `4.0.0-rc.112` to `4.0.0-rc.115` (`4.0.0-rc.113` shipped a broken `.d.ts` bundle — missing `Match`/`Schema` type exports — fixed in `rc.115`).

  **Breaking: the minimum supported Node version is now `>=22.12.0`, up from `>=20.19.0`.** This is forced by the bump: `@effect/vitest@4.0.0-rc.115` requires `vitest@^5.0.0`, and `vitest` 5 does not run on Node 20 at any patch level. There is no path that keeps both effect's newest rc and Node 20 support — see ADR-QD-074. If you run these packages on Node 20, stay on `effect@4.0.0-rc.112` and the previous published version until you can move to Node 22.12+.

  No public API changed. Internal-only: `effect/testing/FastCheck` was removed upstream, so this repo's own tests depend on `fast-check` directly now; `vitest`'s benchmark API moved to a `test`-context fixture, so `packages/core/bench/*.bench.ts` were ported to the new shape; `@stryker-mutator/vitest-runner` doesn't yet support `vitest` 5's `testNamePattern` change ([stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210)), so it's patched via `pnpm patch` to backport the pending upstream fix (dev-only, not part of the published packages).

## 0.5.0

### Minor Changes

- Resolved all 202 findings from a full-codebase audit (2026-09-06), plus the two follow-up human-decision items it surfaced. Correctness fixes, spec-consistency corrections, and hardening spanning every package — no single public API change dominates; see the merged PRs (#28-#32) for the itemized findings.
- Resolved all 191 Low/Info findings from a second full-codebase audit (2026-09-07, issue #49), including several genuine correctness fixes surfaced along the way:
  - `Neq` now denies whenever either resolved operand is `undefined` (including the both-absent case), matching `Eq`'s existing fail-closed stance — previously matched on one side being absent (H2).
  - `projectAt` (`FieldPath.ts`) walks an explicit stack instead of the call stack, closing a stack-overflow on deeply-nested field specs.
  - The untrusted-decode depth guard is now shared between `Policy.ts` and `SinkCodec.ts` (H6), and the circuit breaker releases its probe claim on abnormal exit (H4).
  - `predicate-prisma`'s compiler constant-folds vacuous AND/OR identities so they never nest (C1); `predicate-sql`/`predicate-prisma` guard non-finite bounds so both interpreters agree.
  - `DecisionCache`'s coalesced-waiter interruption path was closed; its `maxDepth` key issue was confirmed already fixed.

  Also: spec-consistency sweeps across every behavior/invariant/traceability document, gate-blind-spot closures (dod-table, api-surface, doc-examples, mutation-upload), and house-style/BDD cleanup.

- Effect built-in adoption sweep (`packages/core` and downstream consumers), each replacing a hand-rolled equivalent: `EvaluationServicesNone` is now actually used at its ~37 call sites instead of being hand-retyped; `Effect.provideService` replaces `currentSubjectLayer` construction on the per-request path; `Schema.Finite`/`Schema.is` tighten `Predicate.ts`'s bounds and `isSecurityLabel`; `Array.dedupeWith`/`groupBy`, `Record.fromIterableWith`, `Struct.omit` replace hand-rolled equivalents in `Obligation.ts`/`Gates.ts`/`Pairing.ts`/`Permission.ts`/`Edits.ts`; `Metric.frequency`'s `preregisteredWords` option is now set on the frequencies that lacked it, and the circuit breaker's state is a tagged frequency instead of a 0/1/2 gauge; `resetTimeoutMs` is `Duration.Input`; `toWire`'s per-record encode uses `Schema.encodeSync` where the input is provably total.

  **Behavior change**: `decideSubjects`/`filterSubjects` (`SubjectSet.ts`) now use `Effect.partition` and never fail outright — a subject whose evaluation breaks is reported in a `failures` array instead of discarding every other subject's decision in the batch. `Qadi.filter`'s enforcement-path semantics are unchanged (still fail-fast, per `@qadi/promise`'s own contract and INV-QD-006).

- **Error-wire schema model** (ADR-QD-060, ADR-QD-072): all eleven `EnforcementError` tags — the nine that cross the `SinkCodec` wire, plus `AccessDenied`/`UndischargedObligation` for the HTTP response boundary — are now `Schema.TaggedError` instead of `Data.TaggedError`. This deletes ~200 lines of hand-mapped bridge code from `SinkCodec.ts` (`ErrorSchema`/`encodeError`/`decodeError`, replaced by `EvaluationErrorSchema`, their union directly).

  **HttpApi adoption** (`@qadi/http`): `RequirePermission`'s `HttpApiMiddleware` now declares `error: [...]`, letting the framework's own encoder answer nine of the eleven `EnforcementError` tags declaratively (real status + body, OpenAPI-visible) — the three disclosure-sensitive tags (`AccessDenied`, `UndischargedObligation`, `SubjectExtractionFailed`) stay tag-only-schema with an empty body. SSE framing in `DecisionStreamRoute.ts` now calls `effect/unstable/encoding/Sse`'s real encoder instead of a hand-built template string.

  **Breaking**: `handleMiddlewareEnforcementErrors` is removed from `@qadi/http`'s public API — `RequirePermission`'s declared `error:` now lets `HttpApiMiddleware` encode those tags itself, so the function it replaced no longer exists. `handleEnforcementErrors` (the bare-`HttpRouter` counterpart) is unaffected.

- Evaluator hardening and a measured performance change:
  - The five previously defect-blind evaluator port calls (`AttributeResolver.resolve`, `DecisionHistory.hasActed`, `RelationshipResolver.check`, `CustomPredicate.evaluate`, `SignatureHistory.signaturesFor`) now convert a defect into that port's own typed error, so `Effect.retry` around `evaluate` sees a retryable failure at all nine `EvaluationError` tags instead of four — a throwing port adapter no longer surfaces as an uncaught 500.
  - `evaluateAllOf`/`evaluateAnyOf`/`evaluateRules` (the per-node composite-dispatch functions) now use `Effect.fnUntraced` instead of `Effect.fn`, a measured, budgeted exception to the house tracing convention: isolated overhead was 2.7-2.9µs/call, and end-to-end this recovered 18-74% of evaluation time depending on policy shape (largest win on deep policies). Port-call and root spans stay traced — this only affects internal dispatch, not observability.

### Patch Changes

- Smaller fixes and consolidation rounding out this release:
  - `@qadi/audit`'s `encodeAuditEntry` now guards the whole record (`isRecordJsonSafe`) instead of `resource` alone — a circular or `BigInt`-valued `HasCustom.params` previously sailed past the guard and threw uncaught at the store write.
  - `@qadi/react`'s `Hydration.ts` now decodes with `UNTRUSTED_DECODE_OPTIONS`, refusing an excess property on a dehydrated entry or its embedded policy instead of silently stripping it.
  - `SinkCodec.ts`'s `toWire`/`fromWire`/`isRecordJsonSafe` dispatch is now `Match.tagsExhaustive` instead of a ternary/`if` chain — a third `SinkRecord` tag is now a compile error instead of a silent fall-through.
  - Five hand-built one-shot test gates now use `Latch`; `TestClock.testClockWith` replaces a cast-requiring fixture pattern; five duplicated `CollectingTracer` test helpers are consolidated into one shared `@qadi/testing` implementation.
  - The docs' flagship error-handling example now uses `Effect.catchTag` instead of `_tag ===` narrowing.

## 0.4.0

### Patch Changes

- Fixed a race in `DecisionCache`: a `getOrCompute` in flight when `clear()`
  runs could still write its result into the cache once it finished, silently
  resurrecting an entry the caller had just asked to be flushed. The cache now
  recognizes a generation that has moved on under it and discards the stale
  compute instead of storing it.
- Four hardening fixes against attacker-controlled policy and attribute data,
  found by an internal audit rather than in production.

  **Policy JSON decode now bounds nesting depth before `Schema` walks it.** A
  ~60k-deep nested policy document previously threw a raw `RangeError` out of
  `decodeUnknownEffect` instead of failing through the `Effect` error channel —
  a stack overflow masquerading as an unhandled defect.

  **`Matcher`'s `getByPath` and `FieldMatch` now require `Object.hasOwn` before
  indexing.** Without it, a policy field path of `__proto__` or `constructor`
  read across the prototype chain instead of failing to find the field.

  **`FieldPath.projectAt` and `Decision.project` no longer accept prototype
  pollution through a projected field name.** Both now build the projected
  object with `Object.create(null)` and `Object.defineProperty` instead of
  `Object.assign`, so a field named `__proto__` in attacker-controlled resource
  data can no longer reach `Object.prototype`.

  **`SecurityLabel.isSecurityLabel` now rejects a non-finite `level`.** `NaN`
  already failed safe (`Incomparable` against everything), but an
  `Infinity`-level label forged into untrusted subject or resource data would
  have dominated every comparison in an MLS/Biba policy. Refused now via
  `Number.isFinite`.

  No public API shape changed; all four are behavior corrections against
  malformed or hostile input.

## 0.3.0

### Minor Changes

- efa3435: Two fail-open defects fixed. Both were found by auditing `@qadi/http`, and both
  live here.

  **`guard` now evaluates the policy against the guarded resource.** It passed
  `resource` to the handler and evaluated with `options.resource`, which no caller
  set — so a resource-scoped policy was checked against nothing.

  This failed **open**, not closed. An absent resource does not deny: a
  `ResourceRef` resolves to `undefined`, and `neq` against `undefined` is `true`.
  A policy written as "the subject's home tenant must differ from the resource's"
  allowed a subject whose home tenant was exactly the resource's, and handed the
  handler an `Authorized<P>` witness for a check that never ran.

  If you use `guardRoute` from `@qadi/http`, its `loadResource` result was reaching
  your handler but not your policy.

  **Breaking**: a `resource` passed in `options` is now overridden by the
  positional one. Two channels for one value is what caused this.

  **The decision cache now keys on the whole subject, not `subject.id`.** An id
  identifies a subject only if it determines that subject's grants. It doesn't:
  a scoped token and a full token for one user share an id and hold different
  permissions, so under an application-scoped cache the first verdict won
  permanently — in both directions. A downgraded token inherited a full token's
  allow; a full token inherited a downgraded token's denial.

  **Breaking**: `DecisionCacheKey.subjectId` is now `DecisionCacheKey.subject`.

  Two structurally equal subjects still hit, so the cache still caches. What
  changes is that staleness is narrower than the docs claimed: a grant revoked in
  the **subject** now re-evaluates, while one revoked only in a store the
  evaluation consults stays cached. Application scope is safe against token
  downgrade and unsafe against backend revocation; per-request scope is safe
  against both.

  Both defects were defended by a doc comment asserting the exact property that
  was missing, which is why neither had been noticed.

  See ADR-QD-043, INV-QD-032, INV-QD-033, BEH-QD-055, BEH-QD-168.

- dc767f2: Six questions the library could pose and could not answer.

  Each was data it already computed and threw away, or a comparison nothing
  implemented. All six were found by auditing a devtools design against the code;
  none of them are devtools features, which is why they live in `@qadi/core`.

  **`policyDepth(policy)`** — `maxDepth` is an evaluation input, so nothing on a
  policy recorded how deep it was, and a caller bounding untrusted decoded input
  had to re-walk the tree and guess at the convention. It counts the way the
  evaluator counts, so `policyDepth(p) <= n` holds exactly when
  `evaluate(p, { maxDepth: n })` does not raise — asserted against `evaluate` in
  both directions, because a depth under-reported by one would declare safe
  precisely the input a caller meant to reject.

  **`permissionProvenance(role)`** — `flattenPermissions` holds the granting
  role's name in its own closure and calls `keys.add` without it, so "inherited via
  viewer" was unanswerable. Kept a separate function because the flatten runs
  inside `makeSubject`, once per subject; the two are held in agreement instead, so
  a screen cannot show a different permission set from the one that decides.

  **`diffTraces` / `flippedAt`** — "which node flipped the verdict" had no
  implementation at all; `isMismatch` compares verdicts and names nothing.
  Differences are addressed by path, ordered parents-first, and a shape divergence
  from short-circuiting is reported rather than descended past.

  **`getOrCompute` reports its outcome**, and a `DecisionRecord` carries it. Cache
  hit/miss was a process-global frequency shared by every cache in the process, so
  an operator could see a rate and never learn about the decision in front of them.
  Absence and `"miss"` are kept distinct: one says nothing was consulted, the other
  says the cache was asked and did not have it. This does not weaken INV-QD-025 —
  a hit still decides identically; only what an observer is told changed.

  **Breaking**: `DecisionCacheShape.getOrCompute` returns `CacheLookup`
  (`{ trace, outcome }`) rather than a bare `Trace`. Only custom `DecisionCache`
  implementations are affected.

  **`DecisionCacheShape.clear`** — a cache could be emptied only by discarding its
  layer scope, which a tool running inside that scope cannot do. In-flight work is
  left alone: those fibers are answering questions asked before the flush.

  **`resolveRoleGraph` reports unknown parents.** The lenient drop is right and
  stays — a partial catalogue is a normal deployment state, and failing closed
  would deny everything rather than granting less. The silence was the defect: a
  typo in one parent name granted fewer permissions than its author wrote, with
  nothing said at any level. Reported once per resolve with every missing name, at
  warning level or through `onUnknownParent`.

  **`@qadi/react` threads the seeded evaluation id into its re-check.** The
  mechanism shipped alongside `DecisionSink` and nothing used it, so a hydrated
  decision and its client re-check still could not be joined. Read with `get.once`,
  so the re-evaluation does not gain a dependency on the seed — the id is
  correlation metadata, not an input to the decision.

  See BEH-QD-189–194, INV-QD-037, INV-QD-038.

- d251db4: Four more screens: the policy explorer, the role viewer, services and cache, and
  the React panel rescoped to questions.

  **The policy rail is observed, not registered.** Every `DecisionRecord` already
  carries the `Policy` it evaluated, so the policies an application uses are in the
  log — `policiesSeen` groups them by `Equal.equals` (structural for plain objects,
  the same property `Atom.family` relies on) and counts their verdicts. An optional
  `catalogue` prop adds names and the policies that have not run yet. No registry,
  no registration call sites, no service whose only consumer is a panel.

  **A structural view states no verdict.** `inspect(policy, undefined)` marks every
  node `NeverResolved`, which reads truthfully in the _inspector_ as "this branch
  was short-circuited" and would say a rule was skipped when it was never run. One
  `PolicyTree` component serves both screens so the difference lives in one place.

  **A required port is never called unwired.** Five of the seven services are in
  `EvaluationServices` — a program that has not provided them does not run — so the
  card reports _defaulted to a fail-closed implementation_ and carries what that
  costs. `name?` says which implementation is behind each port; `portActivity`
  says whether anything ever reached it, read with zero wiring. Those are opposite
  problems with the same symptom.

  **No "acyclic ✓".** A by-value `Role` cannot express a cycle, so the check is
  vacuous there; a tick would report a check that never ran. The screen says why
  there is nothing to report instead.

  **The React panel is keyed by question.** Ten `<Can policy={isAdmin}>` in
  different places are one atom — the library cannot tell them apart, and a panel
  listing ten rows would invent a distinction the architecture does not have. The
  screen says so, because a reader counting rows against their component tree
  would otherwise conclude it is broken.

  `@qadi/core` now exports `portCallsTotal` and `portRetriesTotal`, which existed
  as internal scaffolding and are what makes the "wired but never reached" answer
  possible.

  Two things are deferred with their reasons named: the **simulator**, which runs
  evaluations inside a debug panel rather than reading records and needs a clock
  `@qadi/testing` does not wire; and the **CLI** for the three deployments with no
  browser page, which ADR-QD-049 records as the chosen second shell.

- a61dadc: Field-visibility specs may now be dot-paths, with `*`/`**` wildcards.

  `FieldOptions.fields` stays `ReadonlyArray<string>` — no schema change, no
  new export from `@qadi/core`'s barrel. A spec's terminal segment may now be
  a literal name (unbounded, as today), `**` (unbounded, explicit), or `*`
  (exactly one level: an object-valued child is present but empty, never
  omitted, never shown whole):

  ```ts
  hasPermission(readDoc, { fields: ["id", "author.name", "contact.*"] });
  ```

  Every existing `fields: [...]` array is byte-for-byte behaviorally
  identical after this change: a bare literal is containment-equivalent to
  that key's own `.**`, which is the whole backward-compatibility argument
  for this feature — not just a claim, but a structural property of
  `compareFieldPaths`.

  `intersectFields` gained a real algorithm fix alongside this: the previous
  exact-string-set comparison would have silently denied a field an unbounded
  ancestor spec already covered (`["address.**"]` vs. `["address.street"]`).
  It now compares specs pairwise by containment, and — deliberately — treats
  a `*`-bounded spec against a spec at a different depth as `Incomparable`,
  dropping both sides rather than guessing: whether `*`'s capped disclosure
  of a child is bigger or smaller than a deeper literal spec's own disclosure
  depends on that child's actual runtime shape, not on the specs alone. See
  BEH-QD-056.

- f1c6aa5: Hydration is counted at both ends, and every refusal names its reason.

  `dehydrateDecisions` and `hydrateDecisions` returned their entries and forgot
  them, so the only hydration number a panel could show was the mismatch count —
  and the host had to accumulate that itself. Five metrics now count what crosses
  the network, readable with no wiring through `hydrationActivity`.

  `hydrateDecisions` had three silent exits: a payload naming another subject, an
  atom set `makeQadiAtoms` did not build, and an entry whose policy would not
  decode. All three returned quietly, which is indistinguishable from a page with
  nothing to hydrate. It gains an optional `onDropped` carrying the reason, with a
  development-mode warning by default — the shape `dehydrateDecisions` and
  `onHydrationMismatch` already use.

  The metric declarations are exported from `@qadi/core` rather than restated in
  each package, because `Metric`'s registry key includes the description string: a
  reader re-declaring one with a description that differs by a word gets its own
  registry entry and reads zero, with no error raised.

  Nothing is a breaking change. `hydrateDecisions`'s new parameter is optional, and
  the devtools dock's `hydrationMismatches` prop still works and is shown when the
  new `hydration` prop is absent.

- 50bf38a: The deployment topology is a choice of sink.

  `decisionSinkRing` answers "what did _this_ process decide", and three of the six
  shapes Qadi runs in are not served by that: a replicated server has n rings and a
  reader reaches whichever instance answered its own request, a serverless
  function's ring dies with the invocation, and a browser talking to a separate API
  origin is two processes of which the deciding one has no page.

  **`decisionSinkForwarding({ send })`** projects a record onto the wire and hands
  the encoded value onward. Which socket, which store, which framing and which
  retry policy lie beyond `send` belong to the caller — `@qadi/core` learns nothing
  about transports and gains no dependency that could pull one in. That is the
  payoff for making the port write-only: reading back was left to implementations
  so that the topology could be one.

  **`decisionSinkAll([...])`** writes to every sink in order. The real deployment
  wants both a local ring and a forwarder, and merging two `Layer`s for one service
  does _not_ do that — the later one wins and the first silently sees nothing.

  **`decisionSinkRing(...).ingest(record, environment?)`** is the receiving half.
  `environment` is a parameter rather than the ring's own field because a merged
  log holds rows from several processes, and stamping them all with the
  aggregator's label would erase the one distinction the merge exists to preserve.

  A `send` that fails **or dies** cannot change a decision — a devtools page being
  unreachable is the most ordinary thing that can go wrong here, and an
  authorization request must not fail because nobody is watching. It is reported
  rather than swallowed, through `onFailure` or a warning.

  **`send` must not block.** `record` is awaited inside the evaluation, so records
  stay ordered and reproducible under `TestClock`; a `send` doing a network round
  trip makes every decision wait for it. Enqueue and drain elsewhere. Buffering
  inside the forwarder would remove that hazard rather than warn about it, and is
  deferred rather than guessed at without a real transport to build against.

  See BEH-QD-187, BEH-QD-188, ADR-QD-045.

- 2227e5e: A live decision feed, and the route that serves it.

  **`decisionSinkFeed`** is the buffering sink ADR-QD-045 deferred — deferred then
  because building one against no transport would have been speculative, built now
  because there is one. Publishing **never blocks and never fails**, whatever the
  reader is doing and including when there is none: a `PubSub.sliding` with
  `publishUnsafe` drops its oldest entry rather than waiting. That is the only
  acceptable behaviour for something an authorization decision waits on.

  Sliding rather than dropping, so a reader that reconnects gets the most recent
  decisions — matching how `decisionSinkRing` evicts, so a reader sees one policy
  rather than two. `replay` hands a joining reader recent records before live ones.

  **`decisionStreamRoute(permission, policy, stream)`** serves `/__decisions` as
  Server-Sent Events.

  **Guarded, with no unguarded variant** — unlike `/__permissions`, and the
  asymmetry is the disclosure. A topology is a map; decisions are the traffic on
  it, including subject ids, verdicts, resources and whatever a `Trace` names about
  why something refused.

  There is deliberately **no `NODE_ENV` gate**. An ambient value deciding who may
  read authorization data is precisely the inversion BEH-QD-174 rejects:
  authorization comes from a policy, and a variable that merely happens to be unset
  must never be what opens a route. A deployment that wants this off does not mount
  it.

  **SSE rather than a WebSocket**, decided by the traffic. Records flow one way, so
  SSE keeps the route on plain HTTP and therefore inside the same router,
  middleware and `guardRoute` as everything else here; a socket's upgrade path sits
  outside all three and would re-answer authorization on its own terms.
  `EventSource` reconnects by itself, which pairs with `replay`.

  Recorded as a cost rather than hidden: SSE is one-way, so a devtools that later
  wants to send something — a replay request, a filter — needs a second channel.

  See BEH-QD-201, BEH-QD-202, ADR-QD-046.

- 39b7cbe: Two lossy projections stopped standing in for the things they projected.

  **A rendered explanation now denotes exactly one policy.** `renderExplanation`
  joined a composite's children with `" and "` / `" or "` and never
  parenthesised, so these two rendered identically:

  ```ts
  anyOf([admin, allOf([editor, onCall])]); // a lone admin IS allowed
  allOf([anyOf([admin, editor]), onCall]); // a lone admin is NOT allowed
  ```

  They are not the same policy. Since this rendering is the only thing an
  administrative screen shows, a reviewer had no way to tell which one they were
  reading. Composite children are parenthesised now; the top level is not, so a
  single requirement or a flat conjunction of them reads exactly as before.

  The same flattening made an obligation ambiguous — `allOf([x, obliged(o, y)])`
  read as though the whole policy owed `o`, when only the second branch does.

  **The decision cache cannot collide.** `keyOf` was `JSON.stringify` over the
  question, and its doc comment defended that as the option with "no chance of
  colliding". It had that backwards:

  | Two different questions                                | One key, because `stringify`        |
  | ------------------------------------------------------ | ----------------------------------- |
  | `{d: new Date(0)}` / `{d: "1970-01-01T00:00:00.000Z"}` | maps a `Date` to its ISO string     |
  | `{a: 1, b: undefined}` / `{a: 1}`                      | drops `undefined`-valued properties |
  | `{n: NaN}` / `{n: null}`                               | renders `NaN` as `null`             |

  A collision served one question's cached decision as another's answer, verdict
  included — so INV-QD-025 ("a hit differs from a miss only in speed and
  identity") was false.

  The fix is a **deletion**: `keyOf` is gone and `DecisionCacheKey` is the
  `HashMap` key itself. Effect's `Equal`/`Hash` compare plain objects
  structurally, which is what `Atom.family` already relied on.

  One behaviour change worth knowing: two structurally equal resources whose
  properties were written in a different order now **hit**. That was previously
  documented as a deliberate miss, and it is safe to drop because the comparison
  is real structural equality rather than a serialization that happens to agree.

  See ADR-QD-042, INV-QD-030, INV-QD-031, BEH-QD-137, BEH-QD-167.

- 0649129: See what your ports were asked, not only that they were asked.

  `qadi_port_calls_total` could tell you an attribute store had been consulted
  ninety-one times and nothing else — its frequency is keyed on the port name, and
  deliberately so, because an attribute name is unbounded and a metric keyed on one
  grows an entry per distinct attribute for the life of the process.

  **In `@qadi/core`**, resolving an attribute through the port now emits a
  `qadi.attribute` span, and `qadi.acted` and `qadi.hasRelationship` carry what they
  asked and what came back: the subject, the attribute or event or relation, the
  resource where there is one, and the answer.

  An attribute the **subject** carries emits nothing — that path asks no port, and
  charging the commonest branch for a debug view would be the wrong trade. Short-
  circuiting is untouched: a branch never reached still performs no lookup and now
  emits no span either.

  **The resolved value is never recorded.** `hasActed` and `hasRelationship` answer
  with closed three-valued enums, safe to report. An attribute resolves to arbitrary
  data and a span attribute reaches whatever backend you wired, so `qadi.resolved`
  is a boolean saying a value came back — never the value. This is the line
  `dehydrateDecisions` already draws with `includeTrace`.

  Costs +4.7 µs on a resolver **miss**, measured against a resolver that answers
  synchronously from a record — an upper bound, since that port costs nothing. Most
  of it is the span rather than the annotations, and it is the same cost the other
  two ports have always paid. If it matters to you, the cheapest fix is to put the
  attribute on the subject, where it measurably costs nothing.

  **In `@qadi/devtools`**, `collectPortCalls()` reads those spans back:

  ```ts
  const collector = collectPortCalls();
  // provide `collector.layer` where your evaluations run
  const log = yield * collector.snapshot;
  ```

  Hand `log` to `<DevtoolsDock portCalls={log} />` and the Services panel lists what
  each port was actually asked, beside the counts it already showed. The two are
  differently scoped and the panel says which is which: the counts come from metrics
  and are process-wide, the calls come from spans and are the recent ones this
  collector saw.

  The collector **wraps** the tracer already in scope rather than replacing it, so
  mounting the dock does not turn your application's tracing off. It is bounded at
  200 calls and reports what it dropped.

- f03d75c: The remaining gaps closed in code, and one open security default decided.

  **The obligation gate is recorded.** A binding obligation nobody discharges turns
  an allow into a refusal at the enforcement boundary, so a log of decisions alone
  showed such a request as `ALLOW` while the caller received
  `UndischargedObligation`. `ObligationRecord` now reports `Discharged`,
  `HandlerFailed`, `Refused` or `NotRequired`, paired to its decision by evaluation
  id.

  Per decision, not per obligation — `ObligationHandler` receives the whole array
  and returns `void`, so which individual duty was met is not knowable without
  changing that contract, and a handler reporting falsely would be unverifiable.
  Reporting cannot change the outcome: a failing handler reports `HandlerFailed`
  and then fails unchanged.

  **Breaking**: `DecisionSinkShape.record` takes `SinkRecord`, a tagged union of
  `DecisionRecord | ObligationRecord`, because discharge happens in `Qadi.ts` after
  `evaluate` has already emitted. `DecisionRecord` gains `_tag: "Decision"`.

  **Ports say which implementation they are.** A service value was an anonymous
  object literal, so the only way to tell a fail-closed default from a real store
  was to call it and infer from the answer — an operator seeing "everything denies"
  could not see that `AttributeResolverNone` was wired. Every port Shape gains an
  optional `name`; every shipped implementation sets it, wrappers compose it
  (`"attributeResolverFromRecord (retrying)"`), and nothing branches on it.

  **Port activity is counted.** `qadi_port_calls_total` and
  `qadi_port_retries_total`. An attribute already on the subject counts nothing,
  which is the short-circuit guarantee visible as an absence. Metrics rather than
  the sink, because `MetricRegistry`'s default is memoised and therefore readable
  with zero wiring, where per-decision correlation would mean threading a collector
  through `evaluateNode` and risking INV-QD-005 for a debug view.

  **`QadiAtoms.asked()`** records the distinct questions an atom set has been
  asked. `Atom.family` keys structurally, so several `<Can>` on one policy are one
  atom; a panel keyed by component instance would invent a distinction the
  architecture does not have, and DOM highlighting is dropped rather than bought
  with a registry [AGENTS.md §13](https://github.com/leaderiop/qadi/blob/main/AGENTS.md) forbids.

  **`/__permissions` is guarded by default.** It publishes every guarded path and
  the permission each requires — a map of what to attack and where — and shipped as
  a bare `PermissionRegistryRoute` constant with no guard of its own.

  **Breaking**: that constant is replaced by
  `permissionRegistryRoute(permission, policy)`.
  `permissionRegistryRouteUnguarded(reason)` is the explicit opt-out and logs a
  warning on every request, so a local choice that reaches production is visible in
  the logs of the environment it is wrong in.

  Two things were **refused** rather than built, and the reasons are recorded: a
  cache TTL, whose natural use ("cache for five minutes") is exactly the
  backend-revocation hazard `DecisionCache`'s own documentation warns about; and
  per-obligation discharge state, above.

  Finally, every package now has a **README** — all five npm pages would have
  rendered blank — plus `homepage`, `bugs`, `engines` and keywords.

  See BEH-QD-195–198, BEH-QD-180 rev 1.1.

- 0363a5a: An unwired port now names its own absence.

  **Breaking.** `RelationshipResolverShape.check` returns `RelatedResult` instead
  of `boolean`:

  ```ts
  export type RelatedResult = "Related" | "Unrelated" | "Unknown";
  ```

  Every resolver implementation must change, and so must any `if (yield*
RelationshipResolver.check(...))`. All packages are 0.x, so this rides a `minor`.

  The reason: evaluated with nothing wired, `hasRelationship("owner")` denied with

  > `subject 'u1' has no 'owner' relation to 'doc-1'`

  which is a claim about the contents of a graph that had never been connected. A
  boolean cannot tell the evaluator "the store says no" from "there is no store",
  so an unwired resolver sent readers to audit their edges when the fix was in
  their layer wiring — and the unwired state is the one every ReBAC integration
  starts in. It now denies with

  > `no relationship resolver is wired, so no 'owner' relation to 'doc-1' can be confirmed`

  **The verdicts do not move.** Both new arms deny exactly where the boolean
  denied; `RelationshipResolverNever` keeps its name and every default still fails
  closed. What changes is the sentence.

  A three-value union rather than `boolean | "Unknown"`, and _because_ the union
  breaks. The widening would have kept every implementation assignable and every
  truthiness test compiling while `"Unknown"` is truthy — an unwired port silently
  reading as _related_. A compile error is the right failure mode for that.

  Also here: `HasAttribute` and `HasResourceAttribute` distinguish an absent
  attribute from one that compared wrong — `subject attribute 'level' has no
value` rather than `did not match`. Nothing was false before; the diagnosis was
  withheld, and a misconfigured `AttributeResolver` produces the absent case
  exclusively.

  `@qadi/testing`'s `edgeRelationshipResolver` answers `"Related"`/`"Unrelated"`,
  since a fixture edge list is the store and knows.

  See ADR-QD-040, BEH-QD-045, INV-QD-029.

- e2a44d9: A decision can be observed. Until now, nothing could observe one.

  `@qadi/core` had **no observer channel of any kind** — no `PubSub`, no queue, no
  callback, no sink. ADR-QD-009 had deleted all four that once existed, on sound
  reasoning, and what replaced them cannot carry what a reader of a denial needs: a
  span attribute is a flat primitive and a `Trace` is a tree. An `EvaluationError`
  was worse off still — it reached **no** observer at all, so a deployment watching
  `qadi_decisions_total` saw a broken attribute store as a _drop in traffic_.

  **`DecisionSink`** is a new optional service, read through `Effect.serviceOption`
  exactly as `DecisionCache` is. It adds nothing to `EvaluationServices`; an
  application that wires none is unaffected.

  ```ts
  const devtools = decisionSinkRing({ environment: "Server" });

  yield * evaluate(policy, { resource, action: "read" }).pipe(Effect.provide(devtools.layer));

  const records = yield * devtools.snapshot;
  ```

  **A sink cannot change a decision**, enforced twice. `record` returns
  `Effect<void>`, which makes a failing sink _unrepresentable_ — `Effect.fail` is
  not assignable to it. The one gap the type leaves is a **defect**, as
  `Effect.die` or as any body that throws inside `Effect.sync`, which is exactly
  the subversion BEH-QD-175 recorded — so `evaluate` also wraps the call in
  `Effect.catchCause`. Note this is the _opposite_ call from BEH-QD-175 and
  deliberately so: an extractor that cannot reach its token store must change the
  answer; a sink must never be able to. An observer must never be able to deny.

  **A record is complete**, which a `Decision` is not. It carries the `policy`,
  `resource`, `action` and start time — the policy most of all, because `explain`
  takes a `Policy` while a `Decision` carries `trace.policyTag`, a string. The
  explanation of a denial was unreachable from the denial.

  **A failure is a distinct outcome.** `DecisionOutcome` is `Decided | Failed`, so
  a broken dependency can never be mistaken for a denial, and
  `qadi_evaluation_errors_total` is added — a frequency keyed on the error tag.

  **`EvaluateOptions.evaluationId`** is added, opt-in. A decision made on the
  server, dehydrated, and re-checked on the client is one question answered twice,
  and with a freshly minted id at each end nothing joins them. The default is
  unchanged — a fresh id per call, cache hit or miss — because a cache hit is a
  repeat rather than a continuation, and only a caller can tell those apart.

  A record carries **no environment**: core cannot know whether it runs in a
  browser, on a server, or at an edge, so the sink implementation stamps it.
  `decisionSinkRing` requires one, and is bounded by default (500) unlike
  `decisionCacheLayer` — a record log is long-lived by nature, where a cache is
  usually scoped to one request.

  See BEH-QD-181–186, INV-QD-035, INV-QD-036, ADR-QD-044.

- 73508bb: A record can cross a process boundary.

  An in-memory sink hands a consumer real objects. Anything that crosses a
  boundary — a socket to a devtools page, a replica forwarding to a shared store, a
  serverless function shipping its log before it dies — needs a form that survives
  JSON and can be rebuilt on the far side, and `SinkRecord` had none.

  `toWire` / `fromWire` project between the record and its wire shape;
  `encodeRecord` / `decodeRecord` go through the schema. The wire shape lives
  beside the record it describes rather than inside whichever transport carries it
  first, because it is a contract two processes agree on.

  **Decoded as untrusted.** A record crossing a process boundary crosses a trust
  boundary, which is the reasoning ADR-QD-002 applies to policies. `decodeRecord`
  validates rather than casts, so a payload naming a policy shape the ADT does not
  have is refused rather than walked.

  **Errors carry their stable code.** `ERROR_CODES` has said since it was written
  that it exists "for logging and cross-process correlation"; this is that use. The
  code is written on encode and **ignored on decode** — the tag rebuilds the error,
  because trusting a sender's code to choose a class would let it name one error
  and receive another.

  The mapping is hand-written, and that is forced: AGENTS.md §4 requires
  `Data.TaggedError` and explicitly not `Schema.TaggedErrorClass`, so the errors
  cannot be Schema-derived where they are defined. A round-trip property over
  generated policies stands in for the gate the policy codec gets.

  Two losses are recorded rather than hidden:
  - an error's `cause` is `unknown` — possibly an `Error`, a circular object, or a
    function — so it is **rendered to a string**. An `Error` keeps its message; a
    value whose `toString` throws yields a marker, because the encoder a transport
    calls must never be able to break the thing it observes.
  - an explicitly-`undefined` optional field arrives **absent**, since
    `Schema.optional` drops absent keys. Both read as `undefined`.

  A decision record naming neither outcome decodes to a `Failed` that says so.
  Unreachable for anything this library encodes, but the wire is untrusted, and a
  row reading "the sender sent neither outcome" beats a silently dropped record.

  See BEH-QD-199, BEH-QD-200.

- 0363a5a: A denial now explains itself where it surfaces.

  `renderTrace(trace, options?)` renders an evaluation tree as plain text — the
  decision-side counterpart to `renderExplanation`. An explanation says what a
  _rule_ requires and takes no subject; a trace says what _happened_ to one
  subject. Both renderings now live in the library, and neither derives from the
  other.

  `AccessDenied` gained a `trace` field. Its doc comment had claimed to carry one
  since it was written; it did not. Enforcement is where most callers meet a
  denial — `assert`, `enforce`, `enforceProjected`, `guard`, the `@qadi/promise`
  rejection, the `@qadi/http` status mapping — and it was the one path that built
  the whole tree and then dropped it, keeping only the root sentence.

  **Breaking**: `AccessDenied` now requires `trace`. Code constructing one
  directly must pass it; code catching one is unaffected.

  Unchanged on purpose: `toResponse` still returns an empty body for every
  enforcement tag, and hydration still withholds the trace by default. A trace
  names every node's tag, its label and why it refused — it belongs in a log, an
  error or a test failure, not a response body.

  See ADR-QD-039, BEH-QD-054, BEH-QD-144.
