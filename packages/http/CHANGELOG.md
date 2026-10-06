# @qadi/http

## 0.11.1

### Patch Changes

- Updated dependencies [e9c7afc]
  - @qadi/core@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [9d9f249]
  - @qadi/core@0.11.0

## 0.10.0

### Minor Changes

- 1fd8700: The enforcement-error class table moves into `@qadi/core`, and `@qadi/http` derives every status, wire schema and middleware error list from one table (ADR-QD-081, INV-QD-060, BEH-QD-270). HTTP bodies and statuses are unchanged for callers.

  **Breaking for `@qadi/http` importers.** Each name has one home, with no re-export shim:

  - `ENFORCEMENT_ERROR_TAGS`, `EnforcementErrorClass` and `classifyEnforcementError` are no longer exported by `@qadi/http`. Import them from `@qadi/core`.
  - `DENIAL_STATUS` is removed. Use `HTTP_STATUS_BY_CLASS.denied` (or `HTTP_STATUS_BY_CLASS[classifyEnforcementError(error)]`).

  New in `@qadi/core`: `ENFORCEMENT_ERROR_CLASSES` (a total, tag-keyed class table beside `ERROR_CODES`), `classifyEnforcementError`, `ENFORCEMENT_ERROR_TAGS`, `ENFORCEMENT_DENIAL_TAGS`, `EnforcementErrorClass`, `EnforcementErrorClassTable`, `EnforcementErrorTagOf`, `EnforcementDenial`, and `StandingEvaluationServices` (`Exclude<EvaluationServices, CurrentSubject>`, the services a runtime holds while the subject travels per call). `EnforcementError` is now declared in `Errors.ts`; the package barrel is unchanged.

  New in `@qadi/http`: `HTTP_STATUS_BY_CLASS`, `ENFORCEMENT_ERROR_WIRE` (one entry per tag: class, derived status, `httpApiStatus` schema, typed redacting projection), `projectHttpEnforcementFailure`, `HTTP_ENFORCEMENT_TAGS`, `HTTP_ENFORCEMENT_ERROR_SCHEMAS`, `HttpEnforcementFailure`, `HttpEnforcementTag`, `EnforcementErrorWire`, `EnforcementErrorWireTable` and `logSubjectExtractionFailed`. The `*Response` and `*Refused` schemas keep their names as views onto the table.

  Adding an enforcement error is now one entry in each of two tables, and every omission is a compile error. The bare route and `RequirePermission` can no longer disagree about a tag's status. `RequirePermissionLive` projects all twelve tags in-channel instead of hand-catching three. The generated OpenAPI document declares its error responses in the same order as before.

  The Next.js example's publish action no longer misreports an unmet obligation as an outage, and no longer lets `CustomPredicateError` or `SignatureHistoryUnavailable` escape as a rejected Promise.

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

### Minor Changes

- be76b5b: Fixed a real disclosure bug: five resolver/history-outage responses were serializing the real `Error.message`/`cause` (connection strings, internal error text) straight into a client-visible 502 body, because the wire schema reused the full error class instead of a redacted projection.

  `requiresPermission`'s return value is now a nominal `RequiredPermissionShape` brand — a raw `{ permission, policy }` literal passed directly to `.annotate(RequiredPermission, {...})` no longer type-checks, closing a silent-overwrite gap. `AccessDenied`'s HTTP body now carries `subjectId`/`policyTag`/`reason` (via the new `AccessDeniedPublic`/`toAccessDeniedPublic`) instead of being forced empty, and `UndischargedObligation`/`SubjectExtractionFailed` now encode their tag rather than answering a truly empty body a generated client could never actually decode.

  New exports: `DENIAL_STATUS`, `EnforcementErrorClass`, `classifyEnforcementError`, `logDenial`, `AccessDeniedRefused` (corrected), `RequiredPermissionShape`.

### Patch Changes

- 2ac15c3: Declare the internal `@qadi/core` (and, for `@qadi/devtools`, `@qadi/testing`) dependency as `workspace:^` instead of `workspace:*`. `pnpm publish` converts `workspace:*` into an exact version pin in the published tarball, so a consumer that already has an older `@qadi/core` on a compatible version gets a second, separately-resolved copy installed alongside it the moment any of these packages bump — two nominally-different instances of the same package, which TypeScript cannot always reconcile when a value's inferred type spans both (surfaced downstream as `TS2883: The inferred type ... cannot be named without a reference to ...`). `workspace:^` still gets fully resolved by `pnpm publish` (verified via `scripts/check-package-install.mjs`, no `workspace:`/`catalog:` protocol reaches the packed manifest) — it just publishes a caret range instead of an exact pin, so a consumer's own compatible `@qadi/core` continues to satisfy it in place.
- Updated dependencies [be76b5b]
  - @qadi/core@0.8.0

## 0.7.0

### Minor Changes

- 3f83e90: **Breaking:** `RequirePermission` now declares `requiredForClient: true`, so its full set of twelve enforcement-outcome schemas appears in a generated client's _static_ error type for every endpoint it guards — automatically, with no per-endpoint `error:` declaration needed. Previously this required hand-declaring a subset of `RequirePermission`'s own schemas on each endpoint (the workaround `examples/http-advanced/api.ts` used to ship, now removed).

  If you build a client via `HttpApiClient.make` against an API using `RequirePermission`, add `Effect.provide(passthroughClientLayer(RequirePermission))` to your layer graph. `passthroughClientLayer` is a new export — a fully generic, one-line forwarding implementation for any `requiredForClient` middleware with no real client-side behavior, not specific to `RequirePermission`.

  No runtime behavior changes: `RequirePermission` enforces exactly as before. Only the generated client's static type, and what it now requires to compile, changed. See ADR-QD-075 for the full decision record, including the accepted `PublicEndpoint` over-approximation limitation.

### Patch Changes

- c7aecf1: Bump `effect` to `4.0.0-rc.116` (and its lockstep catalog siblings `@effect/atom-react`, `@effect/platform-node`, `@effect/vitest`). No public API or runtime behavior changes for any `@qadi/*` package — confirmed by diffing the published `4.0.0-rc.115`/`4.0.0-rc.116` tarballs directly and grepping every changed symbol against this codebase's own source.
- Updated dependencies [c7aecf1]
  - @qadi/core@0.7.0

## 0.6.3

### Patch Changes

- @qadi/core@0.6.3

## 0.6.2

### Patch Changes

- 540e19c: Fix `RequirePermission`'s TypeScript typing gap where its declared `requires` never expanded to a concrete service union downstream (`HttpApiBuilder.group`, `HttpApiTest.groups`), forcing consumers into a type-widening cast to use the middleware at all.

  `RequirePermission` now declares `requires: never` and resolves its six evaluation-service dependencies (`AttributeResolver`, `RelationshipResolver`, `DecisionHistory`, `EvaluationId`, `CustomPredicate`, `SignatureHistory`) as an ordinary `RequirePermissionLive` build-time dependency instead — a ordinary, non-self-referential `Layer.effect` build-time capture, which TypeScript expands eagerly, unlike the deferred conditional type `effect`'s `HttpApiMiddleware.ApplyServices`/`Requires` computes for a self-referential middleware class with a non-trivial `requires`.

  `RequirePermission` also now declares `provides: CurrentSubject`, matching what it already does at runtime (`Effect.provideService(CurrentSubject, subject)` around every guarded request) — so a handler that reads `CurrentSubject` (directly, or transitively through `@qadi/core`'s `guard`/`Qadi.assert`) no longer carries an unresolvable `HttpRouter.Request<"Requires", CurrentSubject>` marker in its own type. The `publicEndpoint` branch now explicitly provides `anonymous` as the current subject, so the declaration stays honest for endpoints that skip subject extraction entirely.

  No behavior changes: both evaluation-service resolution and per-request subject provision happen exactly as before — only the type-level declaration changed, so `RequirePermissionLive`'s callers get plain, ordinary types end to end with no cast required.

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

- **Error-wire schema model** (ADR-QD-060, ADR-QD-072): all eleven `EnforcementError` tags — the nine that cross the `SinkCodec` wire, plus `AccessDenied`/`UndischargedObligation` for the HTTP response boundary — are now `Schema.TaggedError` instead of `Data.TaggedError`. This deletes ~200 lines of hand-mapped bridge code from `SinkCodec.ts` (`ErrorSchema`/`encodeError`/`decodeError`, replaced by `EvaluationErrorSchema`, their union directly).

  **HttpApi adoption** (`@qadi/http`): `RequirePermission`'s `HttpApiMiddleware` now declares `error: [...]`, letting the framework's own encoder answer nine of the eleven `EnforcementError` tags declaratively (real status + body, OpenAPI-visible) — the three disclosure-sensitive tags (`AccessDenied`, `UndischargedObligation`, `SubjectExtractionFailed`) stay tag-only-schema with an empty body. SSE framing in `DecisionStreamRoute.ts` now calls `effect/unstable/encoding/Sse`'s real encoder instead of a hand-built template string.

  **Breaking**: `handleMiddlewareEnforcementErrors` is removed from `@qadi/http`'s public API — `RequirePermission`'s declared `error:` now lets `HttpApiMiddleware` encode those tags itself, so the function it replaced no longer exists. `handleEnforcementErrors` (the bare-`HttpRouter` counterpart) is unaffected.

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

### Minor Changes

- **`decisionStreamRoute` gains an optional `reauth` option.** Without it,
  `/__decisions` authorizes only once, at connect — a revoked or logged-out
  principal whose connection stayed open kept receiving every decision the
  process made for as long as the stream stayed up. `reauth: { interval }`
  re-extracts the subject from the same request and re-evaluates the policy
  against it on that interval, ending the stream on the first failed recheck;
  `EventSource`'s own reconnect recovers through a fresh connect-time check.
  Off by default — it is meaningless without a `SubjectExtractor` whose lookup
  actually consults something revocable. Adds `DecisionStreamOptions` and
  `reauthCheck` (the latter exported so the recheck is testable directly
  against `TestClock`, without a live SSE connection).

  **A frame with a non-JSON-safe resource no longer crashes the whole feed.**
  `decisionStreamRoute` now shares `@qadi/core`'s `isJsonSafe` guard (previously
  duplicated as a private helper inside `@qadi/audit`, now a single shared
  implementation): one bad decision's resource —
  a circular reference, a `BigInt` — drops just that one SSE frame instead of
  throwing out of `JSON.stringify` and ending every subscriber's connection
  over it.

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @qadi/core@0.4.0

## 0.3.0

### Minor Changes

- 6136e3f: The HTTP boundary now fails in the right direction, and the package finally has
  a behaviour specification.

  **An endpoint that declares no authorization is refused.** `RequirePermission`
  served any endpoint carrying no `RequiredPermission` annotation — so adding an
  endpoint to a guarded group and forgetting one line published it, with no signal
  at build time, layer-build time or request time.

  ADR-QD-036 had rejected exactly this, by name, in its Alternatives section:
  _"annotate-and-forget … Rejected: it inverts this library's fail-closed posture
  … by making the **absence** of a permission requirement mean 'unguarded'."_ The
  rejected alternative shipped anyway, and a test asserted it was correct.

  **Breaking.** An endpoint meant to be reachable without authorization now says
  so:

  ```ts
  HttpApiEndpoint.get("health", "/health").pipe((e) =>
    e.annotate(PublicEndpoint, publicEndpoint("liveness probe, no subject exists yet")),
  );
  ```

  The `reason` is required and never read by the middleware — it is there so a
  reviewer can see that someone chose this. An endpoint declaring neither gets
  **500**, not 403: a missing declaration is a wiring mistake in the service, and
  reporting it as a permissions decision sends an operator to audit the wrong
  system. The endpoint's identifier is logged at error level.

  **`SubjectExtractorShape.extract` can now fail.** Its error channel was `never`,
  so an implementor whose token store broke had two options and both violated
  INV-QD-006: `Effect.die`, which escapes the adapters' `catchTag` entirely and
  turns an authorization path into a defect, or falling back to `anonymous`, which
  renders an outage as a denial. It now fails with `SubjectExtractionFailed` and
  both adapters map that to **502**.

  **Breaking**: `subjectExtractorBearer`'s `lookup` may return a failing Effect.
  A request carrying _no_ credential is still a success resolving to `anonymous` —
  that is a different answer from a broken store, and keeping the two apart is the
  point.

  **The Bearer scheme is matched case-insensitively**, per RFC 7235 §2.1. It
  compared `startsWith("Bearer ")`, so a legal `bearer …` had its credential
  silently discarded and was served as anonymous — which denied, so a parsing bug
  presented as a permissions problem.

  **`PolicyTooDeep` maps to 500, not 400.** No path in this package lets a request
  supply a policy, so the "malformed or hostile input" a 400 asserts cannot reach
  it — and a 400 is classified non-retryable client error, so the operator whose
  policy tree is too deep would never have been paged.

  Finally, **`spec/behaviors/23-http.md`** — the package shipped with no behaviour
  document, entering the traceability chain at the Decision link, which is how it
  came to contradict its own ADR unnoticed.

  See BEH-QD-174–180, INV-QD-034, ADR-QD-036 rev 1.3.

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
