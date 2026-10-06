# @qadi/devtools

## 0.11.1

### Patch Changes

- e9c7afc: `renderExplanation` no longer throws on a policy built in code whose `fieldStrategy` or `combining` is outside its closed union (an unknown string, a key `Object.prototype` supplies such as `"toString"`, or `""`). It names the value verbatim and says what the evaluator does with it — an `allOf`/`anyOf` exposes no fields and is evaluated fail-closed, a rule table is walked under `DenyOverrides` — including for an empty or one-part composite, which used to render its part's fields though none are granted. `@qadi/devtools`' `inspect` marks such a value "(outside the union, evaluated fail-closed)" instead of showing it bare (ADR-QD-092, amended 2026-10-06).
- Updated dependencies [e9c7afc]
  - @qadi/core@0.11.1

## 0.11.0

### Minor Changes

- 9d9f249: One wire format: this release reads and writes only the formats 0.10 writes — record wire version 2, `{ environment, record }` stream envelopes, and `version: 2` hydration payloads. Every older format is refused, and each refusal is reported with its own reason (ADR-QD-096, ADR-QD-097 and ADR-QD-078, amended 2026-10-06; INV-QD-099 retired).

  **Migration — read this first. Audit rows written before 0.10 (wire version 1, no `version` key) are no longer readable. Before upgrading anything that reads an audit store, re-encode every pre-0.10 row as version 2 with 0.10.x: read it with `decodeAuditEntry` and write it back with `encodeAuditEntry` from `@qadi/audit@0.10`, which reads version 1 and writes version 2. A row that is not migrated is refused by this release as `UnsupportedVersion` with `version: undefined`. It is reported, never skipped, never upgraded.** A peer on 0.9 or earlier, such as a forwarding sender or a `/__decisions` server, writes version-1 records and bare frames. **It must upgrade (0.10 or later is enough). There is no compatibility path.** A deployment that is entirely on 0.10 has nothing else to migrate. The website's "Upgrading to 0.11" page has the full guide.

  - **Breaking (`@qadi/core`):** `decodeSinkRecord`/`decodeSinkRecordString` read wire version 2 only. A record with no `version` (a pre-0.10, version-1 record), or with any version other than 2, is refused as `DecodeRefusal.UnsupportedVersion`. `version` is `undefined` when absent. The record is never upgraded and never given a sentinel subject or an outcome. The pre-0.5 `failed.code` tolerance went with the version-1 reader. A JSON value that is not an object is still `Malformed`. `SinkRecordJson` is now the version-2 encoded type alone, not a union of versions. `WireVersion` narrows to `2` and `WIRE_VERSIONS` to `[2]`; both stay exported, because `UnsupportedVersion.supported` reports them.
  - **Breaking (`@qadi/core`):** `DecodeStoredRecordOptions` is removed, along with its deprecated `legacyEnvironment` (scheduled for removal when it shipped). `decodeStoredRecord` and `decodeStoredRecordString` take no options, and a bare record (what a server older than 0.10 sends) is refused as `Malformed`.
  - **Breaking (`@qadi/audit`):** `AuditEntry.record` is version-2 bytes only. A store adapter no longer needs to narrow on `"version" in entry.record`. `decodeAuditEntry` refuses a pre-0.10 row as `UnsupportedVersion` (see the migration above). `AuditArchive`'s `archiveVersion` stays `"1"`, and an archive bundled before 0.10 is migrated entry by entry.
  - **Breaking (`@qadi/devtools`):** `sourceFromEventSource` loses `legacyEnvironment`. A bare frame is reported as `"not-a-record"`, and a version-1 record as `"unsupported-version"`. A `message` frame that arrives before `synced` no longer ends the prelude wait as a sign of an "older server". Every server since 0.10 sends the prelude first, so such a frame is delivered live. `syncTimeout` still bounds the wait for a server whose prelude has not arrived, which leaves the backlog absent.
  - **Breaking (`@qadi/react`):** `hydrateDecisions` reads `version: 2` payloads only, as scheduled when 0.10 deprecated the older reader. A payload with no `version` (the format 0.9 and earlier wrote) is dropped whole as `UnsupportedPayloadVersion`, counted and reported like any other unsupported version, and the client re-decides those questions. `DehydratedDecisionsV1`, `DehydratedEntryV1` and `DehydratedPayload` are removed. `hydrateDecisions` and `QadiAtoms.hydrate` take `DehydratedDecisions`.

### Patch Changes

- Updated dependencies [9d9f249]
  - @qadi/core@0.11.0

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

- 1fd8700: Never offer a remedy whose value the matcher rejects.

  `satisfyingValue` read each matcher backwards to a witness, and some of those witnesses did not satisfy the matcher they came from: `gte(Infinity)`, `gte(-Infinity)` and `gte(NaN)` offered the bound itself, `eq(literal(NaN))` offered `NaN`, and `eq(literal(undefined))` offered `undefined`. The remedies panel then showed rows that would not have helped. Every leaf witness is now checked with `@qadi/core`'s `judgeMatcher` before it is offered, and declined with the reason "the synthesised value does not satisfy the matcher" when it does not hold.

- 1fd8700: **Breaking (`@qadi/react`).** The gate registry is owned by the atom set, not the process.

  Every instrumented `QadiProvider` used to write its guards into one module-scope map, so two atom sets listed each other's guards, and two hydrated React roots (which derive `useId` from tree position and so mint the same id) silently replaced a still-mounted guard of the other. Each atom set now owns a registry, `atoms.gates`, beside `atoms.asked()`, and registration is a handle only `@qadi/react` can reach. A colliding id is kept, disambiguated as `<id>~<n>`, and reported once (`onGateIdCollision`, or a development warning naming `identifierPrefix`); `data-qadi-gate` still carries React's own id.

  Removed, with no shim: `gateInstances`, `subscribeGates`, `registerGate`, `updateGateState` and `clearGatesUnsafe`. Added: `makeGateRegistry`, `GateRegistry`, `GateRegistryOptions`, `useGateInstances`, `QadiAtoms.gates`, `QadiAtomsOptions.onGateIdCollision` and `QadiProviderProps.gates` (hand one registry to several atom sets; it must come from `makeGateRegistry()`). `QadiContextValue` gains `gates`. `QadiAtoms` gains a required `gates` member, so a hand-written `QadiAtoms` test double stops compiling.

  Migration:

  ```ts
  // before
  useSyncExternalStore(subscribeGates, gateInstances, gateInstances);
  // after, inside the provider
  const gates = useGateInstances();
  // after, outside it
  useSyncExternalStore(atoms.gates.subscribe, atoms.gates.instances, atoms.gates.instances);
  ```

  `clearGatesUnsafe()` in a test becomes "build a fresh atom set per test".

  `@qadi/devtools` is unchanged in behaviour; its empty-state text now names `useGateInstances()`.

- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
- Updated dependencies [1fd8700]
  - @qadi/core@0.10.0

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

### Patch Changes

- Updated dependencies [ab38290]
  - @qadi/core@0.9.0

## 0.8.0

### Patch Changes

- be76b5b: `@qadi/audit`: `AuditDecisionSinkLive`'s staging-commit-failure path now logs a warning like its two sibling loss paths already did, instead of being silent except for a metric.

  `@qadi/devtools`: `PolicyExplorer`'s paste-box decode-failure message is now a readable, path-prefixed sentence instead of a raw `SchemaError` dump of the whole `Policy` union.

- 2ac15c3: Declare the internal `@qadi/core` (and, for `@qadi/devtools`, `@qadi/testing`) dependency as `workspace:^` instead of `workspace:*`. `pnpm publish` converts `workspace:*` into an exact version pin in the published tarball, so a consumer that already has an older `@qadi/core` on a compatible version gets a second, separately-resolved copy installed alongside it the moment any of these packages bump — two nominally-different instances of the same package, which TypeScript cannot always reconcile when a value's inferred type spans both (surfaced downstream as `TS2883: The inferred type ... cannot be named without a reference to ...`). `workspace:^` still gets fully resolved by `pnpm publish` (verified via `scripts/check-package-install.mjs`, no `workspace:`/`catalog:` protocol reaches the packed manifest) — it just publishes a caret range instead of an exact pin, so a consumer's own compatible `@qadi/core` continues to satisfy it in place.
- Updated dependencies [be76b5b]
  - @qadi/core@0.8.0

## 0.7.0

### Patch Changes

- c7aecf1: Bump `effect` to `4.0.0-rc.116` (and its lockstep catalog siblings `@effect/atom-react`, `@effect/platform-node`, `@effect/vitest`). No public API or runtime behavior changes for any `@qadi/*` package — confirmed by diffing the published `4.0.0-rc.115`/`4.0.0-rc.116` tarballs directly and grepping every changed symbol against this codebase's own source.
- Updated dependencies [c7aecf1]
  - @qadi/core@0.7.0

## 0.6.3

### Patch Changes

- @qadi/core@0.6.3

## 0.6.2

### Patch Changes

- @qadi/core@0.6.2

## 0.6.1

### Patch Changes

- `0.6.0` was published from a checkout where `pnpm build` had never been run, so all 9 tarballs shipped `src/` and `package.json` only — no `lib/`, no `.d.ts`, no `index.js`. `0.6.0` could not be unpublished (no OTP access at the time), so it stays on the registry as a known-broken release; `npm deprecate` points installers at `0.6.1` instead. This release ships the intended build output, no source changes otherwise.

  Root cause fixed: each public package now has a `prepack` script (`pnpm -w run build`, not a package-local `tsc -b` — `@qadi/testing`, `@qadi/audit`, etc. depend on other workspace packages and a local-only build would not rebuild them) that runs automatically before `npm pack`/`npm publish`/`pnpm pack`/`pnpm publish`, so this can no longer happen regardless of which checkout the publish step runs from.

- Updated dependencies
  - @qadi/core@0.6.1

## 0.6.0

### Minor Changes

- 47e5683: `effect` bumped from `4.0.0-rc.112` to `4.0.0-rc.115` (`4.0.0-rc.113` shipped a broken `.d.ts` bundle — missing `Match`/`Schema` type exports — fixed in `rc.115`).

  **Breaking: the minimum supported Node version is now `>=22.12.0`, up from `>=20.19.0`.** This is forced by the bump: `@effect/vitest@4.0.0-rc.115` requires `vitest@^5.0.0`, and `vitest` 5 does not run on Node 20 at any patch level. There is no path that keeps both effect's newest rc and Node 20 support — see ADR-QD-074. If you run these packages on Node 20, stay on `effect@4.0.0-rc.112` and the previous published version until you can move to Node 22.12+.

  No public API changed. Internal-only: `effect/testing/FastCheck` was removed upstream, so this repo's own tests depend on `fast-check` directly now; `vitest`'s benchmark API moved to a `test`-context fixture, so `packages/core/bench/*.bench.ts` were ported to the new shape; `@stryker-mutator/vitest-runner` doesn't yet support `vitest` 5's `testNamePattern` change ([stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210)), so it's patched via `pnpm patch` to backport the pending upstream fix (dev-only, not part of the published packages).

### Patch Changes

- Updated dependencies [47e5683]
  - @qadi/core@0.6.0

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

### Patch Changes

- Smaller fixes and consolidation rounding out this release:
  - `@qadi/audit`'s `encodeAuditEntry` now guards the whole record (`isRecordJsonSafe`) instead of `resource` alone — a circular or `BigInt`-valued `HasCustom.params` previously sailed past the guard and threw uncaught at the store write.
  - `@qadi/react`'s `Hydration.ts` now decodes with `UNTRUSTED_DECODE_OPTIONS`, refusing an excess property on a dehydrated entry or its embedded policy instead of silently stripping it.
  - `SinkCodec.ts`'s `toWire`/`fromWire`/`isRecordJsonSafe` dispatch is now `Match.tagsExhaustive` instead of a ternary/`if` chain — a third `SinkRecord` tag is now a compile error instead of a silent fall-through.
  - Five hand-built one-shot test gates now use `Latch`; `TestClock.testClockWith` replaces a cast-requiring fixture pattern; five duplicated `CollectingTracer` test helpers are consolidated into one shared `@qadi/testing` implementation.
  - The docs' flagship error-handling example now uses `Effect.catchTag` instead of `_tag ===` narrowing.

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @qadi/core@0.5.0

## 0.4.0

### Patch Changes

- **`@qadi/devtools`**: deduped the waiting/failure ladder in `components.tsx`
  — a decision panel could render conflicting waiting and failure states for
  the same question at once; the ladder now reflects exactly one state per
  question.

  **`@qadi/react`**: a decision atom's suspense promise is now resolved
  exactly once, when the decision actually settles. Previously a
  time-of-check-to-time-of-use gap could leave a suspended component waiting
  on a promise that had already settled, or resolve one twice.

- Updated dependencies
- Updated dependencies
  - @qadi/core@0.4.0

## 0.3.0

### Minor Changes

- fd63503: New package: `@qadi/devtools`, the surface for the decision data plane.

  Two entry points. `@qadi/devtools` is the **headless model** — three source
  adapters (`sourceFromRecords`, `sourceFromFeed`, `sourceFromEventSource`), the
  `Timeline` fold that merges them, and a subscribable `TimelineStore` — with no
  React anywhere in it. `@qadi/devtools/react` adds one `useSyncExternalStore`
  hook and computes nothing, so a server-side aggregator can consume the model
  without a UI and `react` is an _optional_ peer dependency.

  The model is what absorbs a feed that promises nothing. `EventSource` reconnects
  by itself and a feed may be replaying, so a record arrives twice; a merge
  interleaves two clocks, so records arrive out of order; and an obligation
  outcome is emitted after `evaluate` returned, so the two halves of one story
  arrive backwards. All of that is handled here and nowhere else, and everything
  downstream may assume entries are ordered, unique and joined.

  Three things it deliberately does **not** do: it never collapses a server
  decision and its client re-check, because sharing an evaluation id is the whole
  pairing story; it never lets a bad frame take down the panel, because a panel is
  what you are looking at when something is already wrong; and it never decides
  CORS, because a browser reading a separate API origin is a deployment's call.

  `onMalformed` reports _why_ a frame was dropped — `"not-json"` is a broken
  transport, `"not-a-record"` is a protocol mismatch — because they have different
  fixes and a reader that cannot tell them apart debugs the wrong one.

  The model joins the mutation gate at core's threshold, through a second Stryker
  configuration (`stryker.devtools.mjs`); it currently sits at 100% with no
  survivors. Three separate rounds of it found dead code rather than weak tests: a
  sequence-number tie-break that stable sorting already provided, a three-way
  comparator whose `-1` and `0` were the same answer to the only question asked of
  it, and two redundant guards. All four were deleted rather than pinned.

- f356c73: Screens 1 and 2 — the decision log and the inspector — in a dock the host
  mounts.

  `DevtoolsDock` renders a chronological table of every record from every wired
  sink, with the environment as a badge on the row rather than a mode of the tool:
  the cross-environment story is what the timeline exists to show, and a switcher
  would hide exactly that. Clicking a row opens the inspector; clicking a pair
  badge moves to the partner in either direction.

  Three rendering rules are tests rather than conventions, because each is a
  conclusion a reviewer acts on:
  - **An `EvaluationError` is ERROR, never DENY.** The three classes differ in
    treatment — tinted, solid, outlined — not only in hue, so the distinction
    survives a reader who cannot tell the colours apart.
  - **A short-circuited node reads "never resolved".** Rendering it as a cross
    would say the policy rejected something it never examined.
  - **A trace truncated below the root reads "not disclosed".** That is a
    disclosure boundary rather than a defect, and it is distinguishable from
    short-circuiting because a composite that short-circuits always evaluates its
    first child.

  The inspector states what it cannot know rather than guessing: per-duty
  obligation state is unobservable — a handler receives the whole set and reports
  once — an absent `cache` is worded differently from `"miss"`, and a selection
  dropped by capacity says the buffer moved on rather than silently emptying. A
  denial gets no field panel at all, because `Deny` carries neither
  `visibleFields` nor `obligations`: it permits nothing, so it has nothing to
  narrow and nothing it can oblige.

  Nothing runs on import. The package declares `"sideEffects": false`, so a module
  whose only job is a side effect would be droppable — an overlay that installed
  itself would vanish in the production build nobody tests. Styles are inline
  objects for the same reason and because there is no CSS pipeline to put them in.

  **Three of the six topologies still have no rendered surface.** A backend-only
  service, a serverless function and a replicated server have nowhere to host an
  in-page dock. Their decisions are reachable at `/__decisions` and the model that
  merges them imports no React, so a served page or a CLI is a second shell over
  the same model — but neither is written, and the documents say so.

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

- 1a0d767: The subject simulator — the seventh devtools screen, and the only one that
  **runs** an evaluation rather than reading records.

  Run a policy against a subject you describe, vary that description a grant at a
  time to find which grant the answer turns on, and — starting from a decision the
  application actually made — check whether your reconstruction reproduces it.

  **A simulation is sealed.** `Effect.provide` adds to a context and cannot remove
  from one, so supplying the five services `evaluate` requires does not stop it
  finding an optional one already in scope — and it reads two optionally. Left
  unshadowed, a what-if sweep of eight edits writes eight fabricated decisions into
  your real log and eight entries into your real cache, indistinguishable on screen
  from decisions somebody asked for. `simulationLayer` shadows `DecisionSink` and
  `DecisionCache` in every mode, `CurrentSubject` is excluded from a live layer by
  type, and both are asserted rather than assumed.

  **Three answer sources.** `Fixtures` (what you typed), `Snapshot` (real answers
  captured once and replayed) and `Live` (your own resolvers, opt-in by passing a
  `ports` layer to the dock). A sweep of N edits costs N in-memory folds on
  fixtures, N live sweeps on `Live`, and one live run plus N folds on a snapshot —
  which is why `Snapshot` exists and why the panel warns, with a count, before any
  sweep that performs lookups.

  **What-if runs in both directions.** Dropping each grant in turn answers the
  question a reviewer holding an _allow_ has; it is silent for one holding a
  _denial_, since no removal turns a denial into an allow. So the sweep also reads
  the policy for what it asks for and offers each of those, including attribute
  values read backwards out of the matcher that demands them — and says which
  requirements it could not build a remedy for, and why.

  **Replay says what it could not seed.** A `DecisionRecord` names the subject by
  id and carries what your ports answered only inside its trace, so the grants are
  your hypothesis. The panel names every field it left blank, and refuses to claim
  a match where the record cannot attest to one — a truncated payload or a failed
  row cannot vouch for agreement it never recorded.

  New in `@qadi/testing`: **`TestLayerOptions.clock`**. `qadiTestLayer(subject,
{ clock: "test" })` wires a `TestClock`, so `durationMillis` is reproducible
  outside a test runner that happens to supply one. The ids were already
  deterministic and the clock was not, which is half a determinism claim — and it
  survived unnoticed because `@effect/vitest` hands `it.effect` a `TestClock`
  anyway.

- ab7301b: A guard can say that it exists, and the devtools can point at it.

  `QadiProvider` takes `instrument`, off by default. With it on, every `<Can>`,
  `<Cannot>`, `useCan`, `useDecision` and `useDecisionSuspense` records its policy,
  its resource and what it rendered, and the two component guards wrap their output
  in a `display: contents` span — which generates no box, so no layout changes.

  The React panel lists those under each question and offers two directions:
  **highlight**, which draws over every guard asking a question, and **pick**, which
  outlines the guard under the pointer and selects its row. A guard that rendered
  nothing is still pointed at, which is the answer to "why is this button missing".

  This reverses a documented conclusion. The panel previously said a per-instance
  view was unobtainable, on the grounds that `Atom.family` keys structurally and so
  ten gates on one policy are one atom. That is true of the _atom layer_ and does
  not follow for components; the panel is still keyed by question, with the guards
  listed underneath.

  Nothing is a breaking change. `instrument` defaults to `false`, and off means no
  registration and no wrapper element — the DOM is byte for byte what it was.

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

### Patch Changes

- Updated dependencies [efa3435]
- Updated dependencies [dc767f2]
- Updated dependencies [d251db4]
- Updated dependencies [a61dadc]
- Updated dependencies [f1c6aa5]
- Updated dependencies [50bf38a]
- Updated dependencies [2227e5e]
- Updated dependencies [39b7cbe]
- Updated dependencies [0649129]
- Updated dependencies [f03d75c]
- Updated dependencies [0363a5a]
- Updated dependencies [e2a44d9]
- Updated dependencies [73508bb]
- Updated dependencies [0363a5a]
  - @qadi/core@0.3.0
