---
title: Upgrading to 0.11
description: 0.11 reads and writes one wire format. What that breaks, and the migration for audit rows written before 0.10.
---

0.11 drops every wire format older than the ones 0.10 writes. A decision
record is read only as wire version 2, a decision stream is read only as
stored-record envelopes, and a hydration payload is read only as `version: 2`.
0.10 already writes all three, so a deployment that is entirely on 0.10 has
nothing to migrate except **audit rows written before 0.10**.

Nothing older is upgraded or guessed at. Each one is refused, and each refusal
is reported with its own reason, so nothing is lost without a trace.

## Audit rows written before 0.10

A row written by `@qadi/audit` before 0.10 holds a version-1 record: it has no
`version` key, and its outcome is in `decided`/`failed`. 0.11's
`decodeAuditEntry` refuses such a row as `UnsupportedVersion`, with
`version: undefined`. It does not upgrade the row, and it does not skip it.

**Re-encode those rows as version 2 with 0.10.x before you upgrade anything that
reads the store.** 0.10 reads both versions and writes version 2, so the
migration is to read each row with 0.10's `decodeAuditEntry` and write it back
with 0.10's `encodeAuditEntry`. Run it in a one-off script pinned to
`@qadi/audit@0.10` and `@qadi/core@0.10`:

```ts
// Run with @qadi/audit@0.10 and @qadi/core@0.10 — not 0.11, which no longer
// reads the rows this migrates.
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { decodeAuditEntry, encodeAuditEntry } from "@qadi/audit";

const migrateRow = (stored: unknown) =>
  Effect.gen(function* () {
    const read = decodeAuditEntry(stored); // 0.10 reads version 1 and version 2
    if (Result.isFailure(read)) return yield* Effect.fail(read.failure);
    const rewritten = yield* encodeAuditEntry(read.success.record); // writes version 2
    // Keep the store's own sequence number: encodeAuditEntry never sets one.
    return { ...rewritten, sequenceNumber: read.success.entry.sequenceNumber };
  });
```

A row that already has `version: 2` comes back out as the same record, so
running the script twice is safe. An `AuditArchive` bundled before
0.10 is migrated the same way, entry by entry. Its `archiveVersion` stays `"1"`.

A row that is not migrated is still reported once you are on 0.11.
`decodeAuditEntry` returns `UnsupportedVersion` for it, and you can count those
refusals:

```typescript
import * as Result from "effect/Result";
import { decodeAuditEntry } from "@qadi/audit";

const unmigrated = (rows: ReadonlyArray<unknown>): number =>
  rows.filter((row) => {
    const read = decodeAuditEntry(row);
    return Result.isFailure(read) && read.failure.refusal._tag === "UnsupportedVersion";
  }).length;
```

## Peers on 0.9 or earlier

A process on 0.9 or earlier writes version-1 records. That includes a
`decisionSinkForwarding` sender and a server behind `/__decisions`. A 0.11
reader refuses those records as `UnsupportedVersion`, and refuses a 0.9
server's stream frames because they are bare records, not
`{ environment, record }` envelopes. **There is no compatibility path: upgrade
those peers.** Upgrading them to 0.10 or later is enough, because 0.10 already
writes version 2 and envelopes. The order no longer matters within 0.10 and
later.

Each refusal is reported, not swallowed:

- `@qadi/devtools` reports a version-1 record as an `UnsupportedVersion`
  refusal and a bare frame as a `Malformed` one, through `onMalformed`.
- An aggregator using `decodeSinkRecordString` gets `UnsupportedVersion`, which
  the example's ingest route answers with a 400 carrying `describeDecodeRefusal`'s
  sentence: upgrade the sender.

## Hydration payloads from older servers

`hydrateDecisions` reads `version: 2` payloads only. A payload without a
`version` key is what `@qadi/react` 0.9 and earlier wrote, and 0.10 read it for
one release. 0.11 drops such a payload whole as `UnsupportedPayloadVersion`,
the same reason a newer version gets. The drop is counted and reported, and the
client re-decides those questions itself, so the page flashes once and stays
correct.

A page cached by a 0.9 server goes through this once, until the cache turns
over. If it keeps happening, the server and the client are running different
releases.

## A decision is built from its trace

`Allow` and `Deny` no longer take `visibleFields`, `obligations` or `reason`: they take a stamp (`evaluationId`, `subjectId`, `durationMillis`) and a trace whose root allows or denies, and read those fields from it. `makeDecision(stamp, trace)` picks the class. Fixture code that passed the fields moves them onto the trace.

```ts
new Allow({ ...stamp, trace: { ...allowingTrace, visibleFields: ["id"] } });
```

`decodeDecision` returns a `Result` (a `DecisionDisagreement` on failure), and `decodeSinkRecord` refuses a record whose decision contradicts its own trace, or whose ids or policy tag contradict its decision, as `Inconsistent`. A consumer that matches `DecodeRefusal` exhaustively, or `/devtools`' `MalformedReason`, needs an arm for the new member. Records written by `evaluate` never trigger it; a test store seeded from a hand-built record that disagreed with itself will.

## Removed exports

| Package | Removed | Instead |
| - | - | - |
| `@qadi/core` | `DecodeStoredRecordOptions`, and the `options` argument of `decodeStoredRecord`/`decodeStoredRecordString` | an envelope is the only input read |
| `@qadi/core` | version-1 bytes as a member of `SinkRecordJson` | `SinkRecordJson` is version 2 |
| `@qadi/core` | `1` in `WireVersion`/`WIRE_VERSIONS` | `WireVersion` is `2`, `WIRE_VERSIONS` is `[2]` |
| `@qadi/devtools` | `sourceFromEventSource`'s `legacyEnvironment` | — |
| `@qadi/react` | `DehydratedPayload`, `DehydratedDecisionsV1`, `DehydratedEntryV1` | `DehydratedDecisions` |
| `@qadi/audit` | version-1 rows in `AuditEntry.record` | migrate them with 0.10.x, above |

`sourceFromEventSource` still waits up to `syncTimeout` for the server's
prelude. It no longer treats a `message` frame that arrives before `synced` as a
sign of an older server. Every server since 0.10 sends the prelude first, so
such a frame is delivered live, and the backlog is still the prelude's.

The decisions behind this release are the 2026-10-06 amendments to
[ADR-QD-096](https://github.com/leaderiop/qadi/blob/main/spec/decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)
(the record wire),
[ADR-QD-097](https://github.com/leaderiop/qadi/blob/main/spec/decisions/097-a-decision-log-is-a-sink-and-its-own-history.md)
(stored-record envelopes) and
[ADR-QD-078](https://github.com/leaderiop/qadi/blob/main/spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md)
(the hydration payload).

## 0.12: a port states its wire

`PortDescription` has a required `wire` (`PortWire<Args, A>`), the one statement of what a port's
question and answer look like off-process. The five ports in `@qadi/core` have theirs; code that builds
a `PortDescription` by hand (this is rare, because the registry of ports is closed) must add one. `PortInterpreter`
(and `@qadi/devtools`' `PortCallInterpreter`) is now `"evaluate" | "toPredicate" | "remote"`, so an
exhaustive match over it needs a `"remote"` arm. If your host wrote its own routes and browser adapters
for a re-check's ports, `portRoutesUnguarded` and `remotePortsLayer` (`@qadi/http`) replace them, and two
behaviours change: a store outage is the port's own typed error and never `"Unknown"`, and a question
about a subject other than the session's is a 403 instead of an answer about the session's subject. See
[ADR-QD-107](https://github.com/leaderiop/qadi/blob/main/spec/decisions/107-a-port-is-answered-remotely-through-its-description.md).

What a port's span says is stated on the description's `attributes`: `pose` for the question and
`disclose(answer, request)` for the answer. `PortWire` carries no span projection, so a local and a served
read of the same request leave the same span. A hand-built description (rare, because the registry is
closed) states both. See
[ADR-QD-109](https://github.com/leaderiop/qadi/blob/main/spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md).

A hand-built description also states `serving` (`PortServingFacet`): the allowlist word for the port, the
one name a request asks, and what a declaration admits and declares. `PortWire` no longer has `asked`; it is
`serving.asked`. See
[ADR-QD-114](https://github.com/leaderiop/qadi/blob/main/spec/decisions/114-a-port-states-what-it-serves.md).

It also states `asks` (`LeafRequests`): one `(leaf, site) => request` for each policy tag the port reads,
where `site` is a `ReadSite`, the subject asking and the resource asked about. Every read builds its
request through it, and `servingFor` reads the name a leaf asks from the same request, so the facet has no
`leaves`: the unreleased `ServedLeaves` is replaced by `LeafRequests`. `PortDescription` takes the request as
far as a site supplies it as a type parameter. A resource-scoped read whose resource has no string id now
leaves only the port's own span, on every scoped port, instead of a nested `qadi.requireScopedResourceId`
span on two of them. See
[ADR-QD-134](https://github.com/leaderiop/qadi/blob/main/spec/decisions/134-a-resource-scoped-port-read-is-one-read.md).

## 0.12: one per-port table builder

`mapPorts` is removed from `@qadi/core`. `tabulatePorts(f)` takes the same visitor and returns the same
record of layers (`PortLayers`), so replace `mapPorts(f)` with `tabulatePorts(f)`; `PortLayerVisitor` is
unchanged. `tabulatePorts` also still takes a visitor that returns any one type for every port. See
[ADR-QD-094](https://github.com/leaderiop/qadi/blob/main/spec/decisions/094-a-port-is-described-once.md).

## 0.12: `@qadi/devtools`' interface

`@qadi/devtools` used to export every name each of its modules declared: 245
across both entry points, of which an application used about a dozen. Its barrels
now name what a shell crosses, so a screen's mechanics can change without being a
breaking change to anyone. A name that is not exported is not importable
(`ERR_PACKAGE_PATH_NOT_EXPORTED`, or TS2305 in the editor).

What stays: the three stores (`makeTimelineStore` and `runSource`,
`makeSimulationSession`, `makeDiagnosticsStore` and `runDiagnostics`) with their
types, the sources and `mergeSources`, the timeline and its readings (`verdictOf`,
`pairedEntries`, `inspect`, `applyFilters`, `selectionOf`), the collectors,
`hydrationActivity`, `wiringReport`, `catalogueOf`, and the types all of those
name. From `@qadi/devtools/react`: `DevtoolsDock`, `useDiagnostics`, `useTimeline`
and the simulation session's hooks.

| Removed | Instead |
| - | - |
| `simulate`, `whatIf`, `sweepPlan`, `simulationLayer`, `SimulationOptions`, `WhatIfOptions` | `makeSimulationSession(...)`: `run("Run")`, `run("Sweep")`, and `getSnapshot().plan` |
| `fixtures`, `snapshot`, `live`, `capturing`, `replayLayer`, `SimulationSource` and its members | `session.chooseSource("Fixtures" \| "Snapshot" \| "Live")` and `session.setPorts(...)` |
| `replayInput`, `baselineDiff`, `matchesBaseline`, `Replay` | `session.seed(entry)`, then `getSnapshot().policy` and `getSnapshot().baseline` |
| `compareOutcomes`, `isChanged`, `changedRows`, `remedyEdits`, `singleEdits`, `pairEdits`, `composeEdits`, `applyEdits` | the rows of `run.report` from a sweep |
| `roleSummary`, `grantPath`, `decidingSet`, `gateGroups`, `isLocatable`, `policyLabel`, `policiesSeen` | none: screen internals; `flattenPermissions` and `permissionProvenance` from `@qadi/core` for a role |
| the `SimulationForm` codecs (`edgeCodec`, `withPair`, `encodeResource`, ...) | `session.edit`, `session.editResourceText`, `getSnapshot().resourceText` |
| from `@qadi/devtools/react`: `DecisionLog`, `Inspector`, `PolicyExplorer`, `PolicyTree`, `RoleViewer`, `ServicesPanel`, `Simulator`, `WhatIfTable`, `QuestionsPanel`, `FieldsPanel`, `ObligationList`, `VerdictTag`, `EnvironmentTag`, and their props | `DevtoolsDock` |
| from `@qadi/devtools/react`: `useLens`, `Lens`, `drawLens`, `clearLens`, `boxOf`, `boxesOf`, `gateIdAt`, `isMeasurable`, `GateBox` | none: the lens is the dock's |

Eighty-seven of these names were in 0.11.0. The 21 `SimulationForm` codecs and
three more were never released.

The decision is the 2026-10-08 amendment to
[ADR-QD-047](https://github.com/leaderiop/qadi/blob/main/spec/decisions/047-a-headless-devtools-model.md).

## 0.12: `guardApi` refuses an undeclared endpoint when it is built

An endpoint that declares neither `requiresPermission` nor `publicEndpoint` no
longer answers 500 on every request. `guardApi`'s layer fails to build with
`AccessNotDeclared`, naming the group and the endpoint, so the application does
not start. Annotate every endpoint before you upgrade. A declaration on a group
or on the API also fails the build, with `MisplacedAccessDeclaration`. An
exhaustive match over `ApiGuardRefusal` needs an `AccessNotDeclared` arm. See
[ADR-QD-118](https://github.com/leaderiop/qadi/blob/main/spec/decisions/118-guardapi-plans-access-from-the-api-value.md).

## 0.12: give `guardApi` the `HttpApi` value you serve

`guardApi` plans the `HttpApi` value it is given, and its middleware serves only
that value's endpoints. An endpoint of any other value answers 500 with one
error log line, even if its group and endpoint names are the same. That
includes a `prefix`ed copy. Pass `guardApi` the value `HttpApiBuilder.layer`
serves, prefix included:

```ts
const Served = Api.prefix("/v1");
HttpApiBuilder.layer(Served).pipe(Layer.provide(Handlers), Layer.provide(guardApi(Served)));
```

`/__permissions` then lists the paths that are served (`GET /v1/…`), not the
unprefixed ones.

## 0.12: a signature discharge on a resource without a string id is refused

`signatureObligationHandler` now fails the discharge with
`SignatureCaptureError` when the question's resource has no string `id`
(absent, numeric, an object), before `capture` runs. 0.11.0 captured such a
signature, and it was stored subject-wide, where a `hasSignature` check with
`scope: "Any"` would then find it for every resource. Give the resource a string
`id`, or ask the question without a resource if the signature really is
subject-wide. See
[ADR-QD-117](https://github.com/leaderiop/qadi/blob/main/spec/decisions/117-a-signature-ledger-is-a-keyed-store.md).

## 0.12: `@qadi/http` no longer exports `frame`, `syncedFrame` or `decisionFrames`

The order of `/__decisions` (the backlog, one `synced`, then live records) is
now written once, by `@qadi/core`'s `encodeDecisionStream`, and read back by
`decodeDecisionStream`. `@qadi/http`'s `frame`, `syncedFrame` and
`decisionFrames` were a second copy of that order and are removed, with no
aliases. `decisionStreamRoute` and `decisionBacklogRoute` are unchanged, and so
are the record bytes, the refusal warnings and `onRefused`.

If you built frames yourself, encode the log with core and write each frame in
your own transport. Before:

```ts
import { decisionFrames } from "@qadi/http";

const body = decisionFrames(entries, { onRefused }); // Stream<string> of SSE text
```

After:

```typescript
import { encodeDecisionStream, encodeStoredRecordString } from "@qadi/core";
import type { DecisionLog, DecisionStreamFrame } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import type * as Stream from "effect/Stream";

// One frame per record, in cursor order; `after` is the client's Last-Event-ID.
export const frames = (
  log: Pick<DecisionLog, "readEntries">,
  after: string | undefined,
): Stream.Stream<DecisionStreamFrame> =>
  encodeDecisionStream(log, {
    after,
    // A record the codec refuses answers None and loses only its own frame.
    encodeRecord: (record) => Effect.succeed(Result.getSuccess(encodeStoredRecordString(record))),
  });
```

The backlog now travels in cursor order rather than decision order, so a
client that reconnects with the last event id it received loses no record and
receives none twice. A reader built on `decodeDecisionStream` (as
`@qadi/devtools`' `sourceFromEventSource` is) still presents the backlog in
decision order. A reader against a server older than 0.12 can still lose
records on a reconnect during the backlog, because the order is the server's:
upgrade the server. See
[ADR-QD-097](https://github.com/leaderiop/qadi/blob/main/spec/decisions/097-a-decision-log-is-a-sink-and-its-own-history.md).

## 0.12: `dehydrateDecisions`' `onDropped` takes a `HydrationDrop`

`DehydrateOptions.onDropped` used to receive a bare array of the entries it
dropped. It now receives the same record `HydrateOptions.onDropped` does,
`{ reason, entries, wholePayload }`, once per reason, with `wholePayload`
always `false`. The reason is `ForeignSubject` (the entry belongs to another
subject) or the new `UnencodablePolicy` (a policy the policy schema refuses,
such as `gte(NaN)` or a fractional relationship depth, which used to make
`dehydrateDecisions` throw). Before:

```ts
dehydrateDecisions(entries, { onDropped: (dropped) => alert(dropped.length) });
```

After:

```typescript
import { dehydrateDecisions } from "@qadi/react";
import type { DecisionEntry, DehydratedDecisions } from "@qadi/react";

declare const alert: (count: number, reason: string) => void;

export const payload = (entries: ReadonlyArray<DecisionEntry>): DehydratedDecisions =>
  dehydrateDecisions(entries, {
    onDropped: (drop) => alert(drop.entries.length, drop.reason),
  });
```

`HydrationDrop` and `HydrationDropReporter` take the reason as a second type
parameter, defaulting to the hydrate side's reasons, so `HydrationDrop<A>` means
what it meant. `DehydrationDropReason`, and so `HydrationDropReason`, gains
`UnencodablePolicy`: an exhaustive `switch` or `Match` over either needs one more
arm, and `qadi_hydration_dropped_total` has one more key. A reporter you supply
that throws no longer changes the outcome: it is contained and announced. See
[ADR-QD-052](https://github.com/leaderiop/qadi/blob/main/spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md).

## 0.12: the audit doubles answer from a script, and a store call has a deadline

`AuditTrailPortTestOptions.failWith` and `AuditStagingPortTestOptions.failStageWith`
and `failCommitWith` are removed. Each double now answers every call from a script
that returns an `AuditPortReply`, and on `Fail` it builds the port's own error from
the call, so a test no longer constructs `AuditWriteError` or `AuditStagingError`.
A commit's `Fail` carries the entry staged under its handle. Before:

```ts
import { AuditStagingError, AuditStagingPortTest, AuditTrailPortTest, AuditWriteError } from "@qadi/audit";

const trail = AuditTrailPortTest({
  failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
});
const staging = AuditStagingPortTest({
  failCommitWith: () => new AuditStagingError({ entry: someEntry, cause: "offline" }),
});
```

After:

```typescript
import { AuditPortReply, AuditStagingPortTest, AuditTrailPortTest } from "@qadi/audit";

export const trail = AuditTrailPortTest({ write: () => AuditPortReply.Fail({ cause: "offline" }) });
export const staging = AuditStagingPortTest({ commit: () => AuditPortReply.Fail({ cause: "offline" }) });
```

A script also receives the entry and the call's 0-based index, and can answer
`Die`, `Interrupt`, `Never` or `Latch`; `undefined` is `Ok`.

`AuditDecisionSinkLive` now bounds each store call by `storeCallTimeout`,
5 seconds by default. A store that is healthy but slower than that now fails its
writes, which count toward the circuit breaker. Raise `storeCallTimeout` for it,
or pass `Duration.infinity` to keep 0.11's unbounded wait. See
[ADR-QD-126](https://github.com/leaderiop/qadi/blob/main/spec/decisions/126-an-audit-store-call-has-a-deadline.md).

## 0.12: a port's request key is a `Result`

`PortDescription.key` returns `Result<string, KeyRefusal>` instead of `string`, and every key's text
changes. Two requests now share a key exactly when every argument is `Equal.equals`. A request holding a
value the key cannot represent faithfully (a cycle, a function, a symbol, a class instance) gets a typed
`KeyRefusal`, where it used to throw or collide with another request. No key was ever persisted or sent
on a wire, so there is nothing to migrate. Only code that calls `key` itself changes. Before:

```ts
import { attributeResolverPort, makeSubjectId } from "@qadi/core";

const seen = new Map<string, number>();
seen.set(attributeResolverPort.key([makeSubjectId("alice"), "clearance"]), 5);
```

After, match the `Result` and key your map by the success text, never by the `Result` itself:

```typescript
import * as Result from "effect/Result";
import { attributeResolverPort, describeKeyRefusal, makeSubjectId } from "@qadi/core";

export const seen = new Map<string, number>();
export const refused: Array<string> = [];

const key = attributeResolverPort.key([makeSubjectId("alice"), "clearance"]);
if (Result.isSuccess(key)) seen.set(key.success, 5);
else refused.push(describeKeyRefusal(key.failure));
```

`replyTable` and `signatureHistoryFromSignatures` fail a request whose key is refused with the port's own
typed error. In `@qadi/devtools`, a what-if replay of a request its capture never saw now fails with the
port's typed error on every port. It used to answer the port's default, which `not(...)` turned into an
allow. See
[ADR-QD-129](https://github.com/leaderiop/qadi/blob/main/spec/decisions/129-a-replay-miss-is-an-outage-on-every-port.md).

## 0.12: untrusted JSON is decoded through `untrustedDecoder`

Every decode of untrusted JSON in the library now goes through one module, and the names that let a
caller assemble that decode by hand are gone.

| Removed | Instead |
| ------- | ------- |
| `PolicyFromJson` | `fromJson` for policy text, `fromJsonValue` for a parsed value |
| `UNTRUSTED_DECODE_OPTIONS` | `untrustedDecoder(schema, options?)`, which applies the strict options itself |
| `exceedsJsonDepth` (no longer exported) | `untrustedDecoder(schema).decode`, which runs the depth guard before the decode |

`fromJson` now refuses text that is not JSON as the new `PolicyNotJson` (`ACL021`), where it was a
`SchemaError`. Its failure is `PolicyNotJson | PolicyDecodeTooDeep | SchemaError`; `fromJsonValue` is
unchanged. `MAX_DECODE_DEPTH` keeps its value (256) and its export, and is now declared in
`UntrustedDecode.ts`. Before:

```ts
import * as Schema from "effect/Schema";
import { exceedsJsonDepth, MAX_DECODE_DEPTH, PolicyFromJson, UNTRUSTED_DECODE_OPTIONS } from "@qadi/core";

const decodeText = Schema.decodeUnknownEffect(PolicyFromJson, UNTRUSTED_DECODE_OPTIONS);
const tooDeep = (parsed: unknown) => exceedsJsonDepth(parsed, MAX_DECODE_DEPTH);
```

After, build the decoder once at module scope and match the `Result`:

```typescript
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { untrustedDecoder } from "@qadi/core";

const Settings = Schema.Struct({ name: Schema.String });
const decodeSettings = untrustedDecoder(Settings);

export const settings = decodeSettings.decodeText('{"name":"x"}');
export const refused = Result.isFailure(settings) ? settings.failure._tag : undefined;
```

Add a `PolicyNotJson` arm to any `catchTag` or exhaustive match on `fromJson`'s failure, and a
`PayloadTooDeep` arm to any exhaustive match on a hydration drop reason (`ClientHydrationDropReason` and
`hydrationDropReasons` gain it, so `qadi_hydration_dropped_total` has a ninth series). In
`@qadi/devtools`, the policy paste box now says "The text is not JSON" when it is not.

## 0.12: a payload or an archive nested past the decode bound is reported as too deep

Input nested past `MAX_DECODE_DEPTH` outside the part that is decoded entry by entry is now reported as
too deep, where it was reported as malformed. Each closed union below gains a member, so an exhaustive
match on it needs an arm.

- `@qadi/react`: `PayloadRefusalReason` gains `PayloadTooDeep`. A hydration payload nested past the
  bound outside its entries (an extra key, a field or an array payload holding such a value) is dropped
  as `PayloadTooDeep`, where it was `MalformedPayload`. An entry or policy nested too deep is still
  `EntryTooDeep`.
- `@qadi/audit`: `ArchiveRefusal` gains `TooDeep { maxDepth }`. `readAuditArchive` refuses a stored
  archive nested past the bound outside its entries before any decode, where it was `Malformed`.
- `@qadi/audit`: `decodeAuditEntry` refuses a row nested past the bound outside its record as
  `DecodeRefusal.TooDeep`, where it was `DecodeRefusal.Malformed`.

If you do not need the distinction, handle the new member as you handle the old one:

```typescript
import type { ArchiveRefusal } from "@qadi/audit";

export const isBadBundle = (refusal: ArchiveRefusal): boolean =>
  refusal._tag === "Malformed" || refusal._tag === "TooDeep";
```

## 0.12: one clock vocabulary, `EvaluationClock`

`@qadi/testing` and `@qadi/devtools` now take one clock word, `@qadi/core`'s `EvaluationClock`
(`"live" | "deterministic"`). `@qadi/testing`'s deterministic clock is `"deterministic"`, where it was
`"test"`, and `@qadi/devtools` no longer exports a clock type of its own: `SimulationClock` is removed.
`"live"` is still the default in both. Before:

```ts
import { qadiTestLayer, subjectWith } from "@qadi/testing";
import type { SimulationClock } from "@qadi/devtools";

const simulation: SimulationClock = "deterministic";
const layer = qadiTestLayer(subjectWith({ permissions: ["doc:read"] }), { clock: "test" });
```

After:

```typescript
import { qadiTestLayer, subjectWith } from "@qadi/testing";
import type { EvaluationClock } from "@qadi/core";

export const clock: EvaluationClock = "deterministic";
export const layer = qadiTestLayer(subjectWith({ permissions: ["doc:read"] }), { clock });
```

## 0.12: `useTimeline` follows its component's lifetime

`useTimeline` now reads its source in a scope the hook holds, as the dock does. A remount, or a tree that is
hidden and shown again, starts a fresh timeline, unpaused, and reads the source again; a capacity change keeps
the returned `store` and empties and re-reads it. Keep pause state and rows that must survive a hide above the
hook, for example in the dock's own model, or accept the fresh read, and stop comparing `store` across a
capacity change. Before:

```ts
import { useEffect } from "react";
import { useTimeline } from "@qadi/devtools/react";
import { source } from "./source";

export const useRows = (capacity: number) => {
  const { timeline, store } = useTimeline(source, { capacity });
  // A new store per capacity was the signal to reset.
  useEffect(() => resetSelection(), [store]);
  return timeline;
};
```

After:

```typescript
import { sourceFromRecords } from "@qadi/devtools";
import { useTimeline } from "@qadi/devtools/react";

const source = sourceFromRecords([]);

// The returned `store` is the same across capacities.
export const useRows = (capacity: number) => useTimeline(source, { capacity }).timeline;
```

## 0.12: `useDiagnostics` returns `{ status, reading }`

`useDiagnostics` now returns the diagnostics feed's snapshot, the same one the dock reads: the reading moved to
`reading`, and `status` says whether the sampler is off, starting, live or stopped, with the reason when it stopped.
A sampler that died used to leave a reading that never changed again; now the status says so. Read
`reading.hydration` and the other fields from `reading`. Before:

```ts
import { useDiagnostics } from "@qadi/devtools/react";

export const useHydration = () => {
  const { hydration } = useDiagnostics({ intervalMillis: 1_000 });
  return hydration;
};
```

After:

```typescript
import type { HydrationActivity } from "@qadi/devtools";
import { DiagnosticsStatus, useDiagnostics } from "@qadi/devtools/react";
import type { DiagnosticsDockOptions } from "@qadi/devtools/react";

const sampling: DiagnosticsDockOptions = { intervalMillis: 1_000 };

export const useHydration = (): HydrationActivity | undefined =>
  useDiagnostics(sampling).reading.hydration;

export const useStopReason = (): string | undefined => {
  const { status } = useDiagnostics(sampling);
  return DiagnosticsStatus.$is("Stopped")(status) ? status.reason : undefined;
};
```

## 0.12: the atom set holds its own bound

The atom set now sweeps its own question book back to `maxTrackedQuestions` within a few macrotasks of the book passing it, so a
provider is no longer what enforces the bound. `QadiProvider`'s `sweepIntervalMillis` and `QadiAtoms.sweepEvictions` are
gone: delete the prop, and delete any timer that ran `sweepEvictions` yourself. The bound now holds with no provider, on
a bare registry, and after a provider unmounts. Before:

```ts
import * as Effect from "effect/Effect";
import { QadiProvider } from "@qadi/react";
import { atoms, canRead, reader } from "./qadi";

export const App = () => (
  <QadiProvider atoms={atoms} subject={reader} sweepIntervalMillis={10_000}>
    <Can policy={canRead}>allowed</Can>
  </QadiProvider>
);

// A host without React ran the sweep itself on a timer.
setInterval(() => Effect.runSync(atoms.sweepEvictions), 10_000);
```

After:

```tsx
import { EvaluationServicesNone, hasPermission, makeSubject, permission } from "@qadi/core";
import { Can, QadiProvider, makeQadiAtoms } from "@qadi/react";

// The bound is the atom set's own: nothing else sweeps for it.
const atoms = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 200 });
const reader = makeSubject({ id: "u1", permissions: ["doc:read"] });
const canRead = hasPermission(permission("doc", "read"));

export const App = () => (
  <QadiProvider atoms={atoms} subject={reader}>
    <Can policy={canRead}>allowed</Can>
  </QadiProvider>
);
```

## 0.12: a checked baseline carries its own reading

`Baseline`'s `Checked` arm now carries `reading`, the one-line sentence and whether the reconstruction reproduces the
logged row, decided once when the baseline is checked. Code that builds a `Baseline` by hand must add it, and code that
worked the sentence out from `comparison` and `caveat` itself can read `baseline.reading.sentence` and
`baseline.reading.matches` instead. Before:

```ts
import type { Baseline } from "@qadi/devtools";

export const describeBaseline = (baseline: Baseline): string =>
  baseline._tag === "Checked" ? baseline.comparison._tag : baseline.reason;
```

After:

```typescript
import type { Baseline } from "@qadi/devtools";

export const describeBaseline = (baseline: Baseline): string =>
  baseline._tag === "Checked" ? baseline.reading.sentence : baseline.reason;
```

The headless model that decides this is [ADR-QD-047](https://github.com/leaderiop/qadi/blob/main/spec/decisions/047-a-headless-devtools-model.md).

## 0.13: onMalformed receives core's DecodeRefusal

`sourceFromEventSource`'s `onMalformed` now receives `@qadi/core`'s `DecodeRefusal` as its second argument, not a word. `MalformedReason` is gone, and the default warning's `qadi.reason` annotation is now `qadi.refusal`, holding the refusal's tag. The five words map to tags:

| Before | After |
| - | - |
| `not-json` | `NotJson` |
| `too-deep` | `TooDeep` |
| `not-a-record` | `Malformed` |
| `unsupported-version` | `UnsupportedVersion` |
| `inconsistent` | `Inconsistent` |

`not-a-record` named both a bare record and a record the wire does not describe; both are now `Malformed`, and its `message` tells them apart. Before:

```ts
import { sourceFromEventSource } from "@qadi/devtools";

export const dropped: Array<string> = [];

export const source = sourceFromEventSource({
  url: "/__decisions",
  onMalformed: (frame, reason) => {
    dropped.push(`${reason}: ${frame.slice(0, 120)}`);
  },
});
```

After:

```typescript
import { describeDecodeRefusal } from "@qadi/core";
import { sourceFromEventSource } from "@qadi/devtools";

export const dropped: Array<string> = [];

export const source = sourceFromEventSource({
  url: "/__decisions",
  onMalformed: (frame, refusal) => {
    dropped.push(`${describeDecodeRefusal(refusal)}: ${frame.slice(0, 120)}`);
  },
});
```

The decision is [ADR-QD-153](https://github.com/leaderiop/qadi/blob/main/spec/decisions/153-core-owns-describing-a-decode-refusal.md).

## 0.13: guard and the filter entry points refuse a second resource

`LoadedEnforceOptions` is renamed `HandoverOptions`, with no alias, and is now the options type of all eight entry points that hand over a value: `enforceProjected`, `enforceLoaded`, `enforceProjectedLoaded`, `guard`, `filter`, `filterStream`, `filterProjected` and `filterStreamProjected`. So `guard` and the four `filter*` entry points no longer accept `options.resource`, which they used to drop silently: the positional resource, or the item, was always the one evaluated. `enforce` and `assert` hand over no value and keep `options.resource`. Before:

```ts
import { filter } from "@qadi/core";
import type { LoadedEnforceOptions } from "@qadi/core";

declare const tenant: { readonly id: string };

export const options: LoadedEnforceOptions = { concurrency: 4 };

export const admitted = filter(policy, items, { resource: tenant, concurrency: 4 });
```

After:

```typescript
import { filter, hasRole } from "@qadi/core";
import type { HandoverOptions } from "@qadi/core";

const items: ReadonlyArray<{ readonly id: string }> = [{ id: "doc-1" }, { id: "doc-2" }];
const options: HandoverOptions = { concurrency: 4 };

export const admitted = filter(hasRole("editor"), items, options);
```

The decision is [ADR-QD-156](https://github.com/leaderiop/qadi/blob/main/spec/decisions/156-a-handed-over-value-is-decided-through-one-module.md).

## 0.13: the promise facade's filter takes no resource

`@qadi/promise`'s `filter` and `filterProjected` now refuse `resource` in their options (`Omit<FacadeOptions, "resource">` with `resource?: never`, so a `FacadeOptions` variable is refused too), as `projected` does: each item is the resource of its own decision, so a second one cannot be written. Before:

```ts
const admitted = await qadi.filter(alice, policy, docs, { resource: tenant });
```

After:

```typescript
import { EvaluationServicesNone, hasRole, makeSubject } from "@qadi/core";
import { makeQadi } from "@qadi/promise";

const qadi = makeQadi(EvaluationServicesNone);
const alice = makeSubject({ id: "u-1", roles: ["editor"] });
const docs: ReadonlyArray<{ readonly id: string }> = [{ id: "doc-1" }];

export const admitted = qadi.filter(alice, hasRole("editor"), docs);
```

The decision is [ADR-QD-156](https://github.com/leaderiop/qadi/blob/main/spec/decisions/156-a-handed-over-value-is-decided-through-one-module.md).

## 0.13: a seeded allow has no `visibleFields` key when the server sent none

`SeededAllow`'s `visibleFields` is now an optional key, as it is on the decision's wire form: a seed rebuilt from a payload that sent no `visibleFields` has no `visibleFields` key, where it held `visibleFields: undefined`. Reading `seed.visibleFields` is unchanged (`undefined` still means every field), and building a `SeededAllow` with or without the key compiles. What breaks is assigning a `SeededAllow` to a type that requires `visibleFields`, and code that checks for the key (`"visibleFields" in seed`, `Object.keys`, or `Equal.equals` against a seed built with an explicit `undefined`). The payload's version and bytes are unchanged. Before:

```ts
import type { VisibleFields } from "@qadi/core";
import type { SeededAllow } from "@qadi/react";

export const fieldsOf = (seed: SeededAllow): { readonly visibleFields: VisibleFields } => seed;
```

After:

```typescript
import type { VisibleFields } from "@qadi/core";
import type { SeededAllow } from "@qadi/react";

export const fieldsOf = (seed: SeededAllow): { readonly visibleFields: VisibleFields } => ({
  visibleFields: seed.visibleFields,
});
```

A check of the key's presence should read the value instead: `seed.visibleFields === undefined` is true whether the key is absent or holds `undefined`.

The decision is [ADR-QD-157](https://github.com/leaderiop/qadi/blob/main/spec/decisions/157-a-seeds-fields-are-the-wires-stated-once.md).

## 0.13: a breaker or audit sink option that cannot work is refused when it is built

`AuditDecisionSinkLive`'s layer is now `Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>`, where its error was `never`. Building it with an option that cannot work fails with `InvalidAuditSinkOption`, naming the option and the value received. Refused: a `failureThreshold` that is not a positive safe integer (`NaN` built a breaker that never opened), a `resetTimeoutMs` that is not a finite, positive, whole number of milliseconds within the safe integers, and a `storeCallTimeout` that is not a positive duration (zero timed every store call out at once). A plain-number `resetTimeoutMs` must be whole; a string or `Duration` form is read to the nanosecond, as `Duration` keeps it, and must come to whole milliseconds (`"1.5 millis"` is refused, `"1.5 seconds"` accepted). For `storeCallTimeout` only, `Duration.infinity` is still accepted as no deadline. This is also a runtime break: `failureThreshold: Infinity` (a breaker that never opens) and `resetTimeoutMs: Duration.infinity` (a breaker that never leaves Open; unlike `storeCallTimeout`, the cooldown has no infinite opt-out) were accepted and are now refused, as is any value past `Number.MAX_SAFE_INTEGER`. Pass `Number.MAX_SAFE_INTEGER` for either to keep the effect; the sink has no option to run without its breaker. A composition that passes no options, or valid ones, behaves as before, and for it only a type annotation on the layer, or on an `Effect` that provides it, that declares `never` stops compiling. Before:

```ts
const sink: Layer.Layer<DecisionSink, never, AuditTrailPort> = AuditDecisionSinkLive(options);
```

After:

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { DecisionSink } from "@qadi/core";
import { AuditDecisionSinkLive, AuditTrailPortTest } from "@qadi/audit";
import type { AuditTrailPort, InvalidAuditSinkOption } from "@qadi/audit";

export const sink: Layer.Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort> = AuditDecisionSinkLive({
  failureThreshold: 5,
});

export const program = Effect.void.pipe(
  Effect.provide(sink.pipe(Layer.provide(AuditTrailPortTest().layer))),
  Effect.catchTag("InvalidAuditSinkOption", (refused) => Effect.logError(refused.message)),
);
```

`Duration.infinity` is still the no-deadline value for `storeCallTimeout`; only a zero, negative, `NaN` or malformed duration is refused.

The decision is [ADR-QD-158](https://github.com/leaderiop/qadi/blob/main/spec/decisions/158-the-breakers-rules-are-one-transition-function.md).

## 0.13: a decision sink that fails is reported once

Whatever a sink's `record` does that loses the record (a defect, a throw, including one before it returns an effect, a self-interruption, or a failure leaked through a type escape) was contained and never reported, and a throw before an effect was returned ended `evaluate`. The emitter now contains every one of them and logs it once at `Warn`: `qadi: a decision sink failed; the record was not delivered`, annotated `qadi.sink`, `qadi.record_tag`, `evaluationId` and `qadi.cause`. The decision is unchanged, and the line carries nothing about the subject, resource, policy or action.

`DecisionSinkShape` gains an optional `name`, reported in `qadi.sink` (`unnamed` without one). `decisionSinkForwarding`, `decisionSinkAll`, the decision log's sink, the simulation shadow and `AuditDecisionSinkLive` name themselves, and `decisionSinkAll`'s member line gains `qadi.sink`, `qadi.record_tag` and `evaluationId`.

Nothing needs to change in a caller's code. One log text changes: a throwing `onFailure` on a send failure is now reported by the emitter's line, naming `decisionSinkForwarding`, where it said "qadi: a decision record could not be forwarded", so a query keyed on that text for this case should match the new line. A `send` that throws before returning an effect now reaches `onFailure`. To have a sink named in its reports:

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { DecisionSink } from "@qadi/core";

export const billingSink = Layer.succeed(DecisionSink, {
  name: "billing-audit",
  record: (record) => Effect.logDebug(`recorded ${record.evaluationId}`),
});
```

The decision is [ADR-QD-159](https://github.com/leaderiop/qadi/blob/main/spec/decisions/159-the-sink-emitter-reports-what-it-contains.md).

## 0.13: a port's defaulted state is read from the port, not its name

`@qadi/devtools` used to decide that a port was its fail-closed default by parsing the display name `@qadi/core` composes for a wrapper (`"<inner> (<suffix>)"`). It now asks `@qadi/core`, which marks the default it builds and carries the mark through every wrapper it derives (`…Retrying`, `…Bounded`, `…TimingOut`, `recordingPort`, `decoratePorts`). `isPortDefault(description, service)` is the new, public reader. The mark is a symbol-keyed property, so `Object.keys`, JSON and a clone do not see it, and evaluation never reads it. Nothing is renamed or removed and no outcome changes.

A hand-written wrapper moves in two directions:

- A wrapper that spreads `inner` now reads as defaulted, whatever it is called, including a wrapper with no name of its own. One that spreads the default and replaces its method still reads as defaulted, because the fact is that it was built from the default's shape, not that it answers like the default.
- A wrapper that builds a fresh object, or delegates through `Object.create`, now reads as a real adapter, even when its name starts with a default's. A name no longer makes a service count as a default.

The devtools wiring report and services panel show the difference, and nothing else about them changes. A wrapper that should keep the default's identity spreads `inner`:

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { AttributeResolver, AttributeResolverNone } from "@qadi/core";

export const auditedAttributes = Layer.effect(
  AttributeResolver,
  Effect.gen(function* () {
    const inner = yield* AttributeResolver;
    return AttributeResolver.of({
      ...inner,
      name: "audited",
      resolve: (subjectId, attribute) => inner.resolve(subjectId, attribute),
    });
  }),
).pipe(Layer.provide(AttributeResolverNone));
```

`decoratePorts` carries the mark by the slot it decorates, not by what your decorator returns: a decorator that replaces a default with a real implementation still reads as defaulted, because the slot held the default when it ran. Wire the real implementation into `portsLayer` instead of decorating a default into one.

A second install of `@qadi/core` has its own mark, so it reads the other copy's defaults as real adapters.

The decision is [ADR-QD-160](https://github.com/leaderiop/qadi/blob/main/spec/decisions/160-port-facts-are-read-from-the-description.md).
