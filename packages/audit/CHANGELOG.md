# @qadi/audit

## 0.11.1

### Patch Changes

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

- `ChainIntegrity`/`verifyChainIntegrity`/`ChainIntegrityError`/
  `chainIntegrityVerified` are renamed to `SequenceIntegrity`/
  `verifySequenceIntegrity`/`SequenceIntegrityError`/
  `sequenceIntegrityVerified` throughout — no compatibility alias.

  The prior names read as cryptographic tamper-evidence to a compliance
  reviewer; what this actually checks is gap-and-duplicate detection over
  caller-assigned sequence numbers, nothing more. **Breaking**: a consumer
  importing any of the four old names must switch to the new ones — there is
  no rename shim.

### Patch Changes

- Fixed two correctness issues in the audit sink's circuit breaker:
  - **Half-open now admits exactly one concurrent probe write.** Previously
    every write arriving while the breaker was half-open could race in as its
    own probe, so a burst of concurrent writes could trip the breaker back to
    open (or close it) based on more than one outcome instead of the single
    probe half-open is meant to gate on.
  - **An audit-entry dropped while the breaker is open is now logged**, even
    when no `AuditStagingPort` is wired to catch it. Previously that drop was
    silent — the entry disappeared with no observable trace at all.

- Updated dependencies
- Updated dependencies
  - @qadi/core@0.4.0

## 0.3.0

### Minor Changes

- 0ee42d1: `SignatureCapturePort` now speaks `@qadi/core`'s canonical `Signature` type
  instead of a second, independently-maintained one of its own.

  **`capture` now returns, and `validate` now accepts, `@qadi/core`'s
  `Signature` directly.** `@qadi/audit`'s own `ElectronicSignature` is retired.
  The two types started out structurally identical, but two
  independently-maintained "signature" types, one per package, is exactly the
  drift ADR-QD-002's single-definition reasoning exists to prevent for the
  Policy ADT — and now that `@qadi/core` has a canonical `Signature` of its
  own, the same reasoning applies here.

  **Breaking**: `ElectronicSignature` is removed outright, with no
  compatibility type alias. A consumer that imports `ElectronicSignature` by
  name must switch to `@qadi/core`'s `Signature` — there is no rename, no
  deprecation window, and no bridging type to fall back on.

  **`SIGNATURE_MEANINGS` and `SignatureMeaning` now live in `@qadi/core`,
  re-exported from `@qadi/audit`.** Existing
  `import { SIGNATURE_MEANINGS } from "@qadi/audit"` call sites keep working
  unchanged — only where the vocabulary is canonically defined moved, not the
  value itself.

  **`SignatureCaptureRequest` gains an optional `signerRole`, threaded
  straight into the produced `Signature.signerRole`.** A caller with role
  context can now populate it; a caller that omits it gets `undefined`, the
  same behavior as before the field existed. This part is additive and needs
  no action from anyone.

  See ADR-QD-057.

- a52e92e: The audit pipeline's correctness guarantees are now formally specified
  rather than implied, and held by tests that are themselves checked for
  whether they'd notice a break.

  **Five properties are named, not just intended.** INV-QD-051 through
  INV-QD-055 and BEH-QD-249 through BEH-QD-257 state what `@qadi/audit`
  promises: staging presence or absence never changes the committed audit
  entries (staging non-observability); once a circuit breaker trips,
  concurrent `record()` calls cannot race it into attempting a write before
  reset (circuit-breaker atomicity under concurrency); `enforceRetention` and
  `getPurgeableEntries` partition every entry set exactly, with no row
  double-counted or dropped (retention's partition property);
  `verifyChainIntegrity` detects every gap and every duplicate sequence
  number (chain-integrity gap detection); and `signatureObligationHandler`
  calls `capture` exactly once per discharge, with the recorded
  `ObligationRecord` outcome matching whether that call succeeded (the
  signature obligation handler's call-once / outcome-match guarantee). A
  consumer relying on this package for an audit trail cares which of these
  are guaranteed and which were previously only intended.

  **A mutation-testing gate now runs as part of `pnpm check`.** `stryker.audit.mjs`
  mutates `packages/audit/src/**/*.ts` and breaks the build below 80%. The
  first run scored 81.46% and revealed real gaps in what the existing tests
  would notice; the suite was hardened to 92.03%, clearing the 90% high
  threshold. Reporting only the final number would hide what the gate found;
  reporting only the first would understate what closed the gap.

  Nothing here changes `@qadi/audit`'s public API — this is worth a release
  note anyway, because what changed for a consumer is the strength of the
  guarantee behind an interface that looks identical: the promise was always
  made, and now it's checked.

  See INV-QD-051–055, BEH-QD-249–257.

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
