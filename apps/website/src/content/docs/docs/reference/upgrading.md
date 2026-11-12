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

- `@qadi/devtools` reports a version-1 record as `"unsupported-version"` and a
  bare frame as `"not-a-record"`, through `onMalformed`.
- An aggregator using `decodeSinkRecordString` gets `UnsupportedVersion`, which
  the example's ingest route answers with a 400 saying the sender predates 0.10.

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
