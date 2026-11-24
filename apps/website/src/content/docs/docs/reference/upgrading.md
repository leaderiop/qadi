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
const decodeSettings = untrustedDecoder(Settings, { unknownKeys: "refuse" });

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

const sampling = { intervalMillis: 1_000 };

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

`not-a-record` named both a bare record and a record the wire does not describe; both are now `Malformed`. A bare record's `message` is the decoder's own, a missing `environment`, and a record the wire does not describe carries the record decoder's. Before:

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

`decoratePorts` carries the mark by the slot it decorates, not by what your decorator returns: a decorator that replaces a default with a real implementation still reads as defaulted, because the slot held the default when it ran. Wire the real implementation into `portsLayer` instead of decorating a default into one. A result that accepts the property is marked in place, so return an object that does (a frozen one, or a proxy that refuses the define, is copied, and a `#private` field or internal slot does not survive the copy). The mark then stays on an object you also use elsewhere.

A second install of `@qadi/core` has its own mark, so it reads the other copy's defaults as real adapters.

The decision is [ADR-QD-160](https://github.com/leaderiop/qadi/blob/main/spec/decisions/160-port-facts-are-read-from-the-description.md).

## 0.13: audit reports core's refusal, and AuditEntryNotEncodable is gone

`@qadi/audit` declared its own refusal error beside `@qadi/core`'s `SinkRecordNotEncodable`, and `encodeAuditEntry` mapped one into the other. The audit class is removed. `encodeAuditEntry` fails with, and `AuditDecisionSinkLive`'s `onRefused` receives, `SinkRecordNotEncodable`, the error `decisionSinkForwarding` and `DecisionLogHttp` already report. It has the same `evaluationId`, `recordTag` and `refusal` fields. The `reason` field is gone: `describeEncodeRefusal(e.refusal)` gives byte for byte the same sentence. A `catchTag` on the old tag moves to `"SinkRecordNotEncodable"`, and `AuditWriteOutcome`'s `Refused.refusal` has the new type. The default refusal warning, every other log line, every metric and every span attribute are unchanged.

Before:

```ts
const onRefused = (e: AuditEntryNotEncodable) => refused.push(e.reason);
const encoded = encodeAuditEntry(record).pipe(Effect.catchTag("AuditEntryNotEncodable", (e) => Effect.logWarning(e.reason)));
```

After:

```typescript
import * as Effect from "effect/Effect";
import { describeEncodeRefusal, encodeRefusalAnnotations } from "@qadi/core";
import type { SinkRecord, SinkRecordNotEncodable } from "@qadi/core";
import { AuditDecisionSinkLive, encodeAuditEntry } from "@qadi/audit";

// Held in process for diagnosis, never logged: the sentence can carry text from the record.
export const refused: Array<string> = [];

export const sink = AuditDecisionSinkLive({
  onRefused: (e: SinkRecordNotEncodable) => {
    refused.push(`${e.evaluationId}: ${describeEncodeRefusal(e.refusal)}`);
  },
});

export const encodeOrNull = (record: SinkRecord) =>
  encodeAuditEntry(record).pipe(
    Effect.catchTag("SinkRecordNotEncodable", (e) =>
      Effect.logWarning("audit entry refused").pipe(
        Effect.annotateLogs(encodeRefusalAnnotations(e)),
        Effect.as(null),
      ),
    ),
  );
```

Log where the refusal was found, as above: `encodeRefusalAnnotations(e)` is the refusal's tag, its path and the evaluation id, the same annotations the default warning carries. They carry no value from the refused record, whose subject, resource and policy are what the refusal exists to keep out of a log line, but the path is made of the record's own keys, so a resource keyed by data puts that key in `qadi.path`. `describeEncodeRefusal(e.refusal)` returns the sentence `reason` held and, like `reason`, may carry caller text: an `EncodeFailed` sentence includes the message of a getter that threw on the record. It is for code holding the refusal to diagnose it, not for a log line or a span ([INV-QD-104](https://github.com/leaderiop/qadi/blob/main/spec/invariants.md#inv-qd-104-a-refusal-report-says-where-never-what)).

The decision is [ADR-QD-161](https://github.com/leaderiop/qadi/blob/main/spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md).

## 0.13: the dock takes the gate registry, not its instances

`DevtoolsDock`'s `gates` prop takes the gate registry instead of an array of guard instances. The dock subscribes to the registry in its own scope for as long as it is mounted and pairs each asked question with the guards asking it at one moment, so a host no longer re-renders to feed it. `useDevtoolsFeed()`'s `gates` is the registry too (the provider's `gates` prop, else `atoms.gates`), so `<DevtoolsDock {...feed} />` needs no edit; code that read `feed.gates` as an array reads `feed.gates.instances()`. When no registry is handed over, the panel now says "Pass gates — usually atoms.gates, from @qadi/react — to list who is asking."

Before:

```ts
const Dock = () => <DevtoolsDock gates={useGateInstances()} />;
```

After:

```typescript
import { createElement } from "react";
import type { GateRegistryLike } from "@qadi/devtools";
import { DevtoolsDock } from "@qadi/devtools/react";
import type { QadiAtoms } from "@qadi/react";

export const Dock = ({ atoms }: { readonly atoms: QadiAtoms }) => {
  // The registry satisfies the dock's structural type, with no import of @qadi/react in devtools.
  const fits: GateRegistryLike = atoms.gates;
  return createElement(DevtoolsDock, { gates: fits });
};
```

The decision is [ADR-QD-162](https://github.com/leaderiop/qadi/blob/main/spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md).

## 0.13: `PortActivity.port` is a `PortName`

`@qadi/devtools`'s `PortActivity.port` is now `PortName`, `@qadi/core`'s union of the five registry ports, where it was `string`. `portActivity` reads each registry port's own name in the four port metrics and reports one entry per port that was reached, in the registry's order, so a word written to a port metric outside the registry is no longer reported. Nothing is renamed or removed, and no export is added: `PortActivity` is still exported and only its field's type is narrower.

An entry built inline with a registry port's name still compiles, and so does every reader that treats `port` like a string. Two things a caller may need to fix:

- An array literal held in an unannotated variable widens `port` to `string`, which no longer fits `PortActivity`. Annotate the variable `ReadonlyArray<PortActivity>`, and the literal is checked against the registry's names.
- A comparison of `entry.port` with a name that is not a port, such as `"EvaluationId"`, no longer compiles, since no such entry can exist. Drop the comparison, or read the ports as strings first.

The Services panel reads the same: every word, `data-testid` and attribute on the tab is unchanged, and the cards are now computed by the dock model.

The decision is [ADR-QD-168](https://github.com/leaderiop/qadi/blob/main/spec/decisions/168-a-port-card-is-a-model-row.md).

## 0.13: the questions are a dock input, beside the gates

Two public breaks, one per package, and both move the same field. The Questions tab reads two things a host hands the dock, a registry of live guards (`gates`) and the questions asked (`questions`), and `questions` used to travel inside the diagnostics options where `gates` did not. It is now the dock's own input, beside `gates`.

`@qadi/devtools`: `questions` is no longer a field of `DiagnosticsDockOptions`, the type of the dock's `diagnostics` prop and of `useDiagnostics`'s options, or of `DiagnosticsOptions`, which `runDiagnostics` takes. It is `DevtoolsDock`'s own `questions` prop, read on the diagnostics cadence. A host that wrote `diagnostics={{ layer, collector, questions }}` writes `diagnostics={{ layer, collector }}` and `questions={…}`, the same function in the new place.

`@qadi/react`: `useDevtoolsFeed()` returns `questions` (`atoms.asked`) beside `gates` and `onInvalidate`, and its `diagnostics` is your extras plus `layer` only. Code that read `feed.diagnostics.questions` reads `feed.questions`. A host that spreads the feed, `<DevtoolsDock {...feed} />`, needs no edit, and setting `layer` or `questions` in the extras is still a compile error.

One behaviour changes with the move. A questions input that throws is now stated in the React panel, in one sentence with the reason, and the diagnostics poll keeps running. Before, a throwing input ended the poll, every tab's reading froze with the status `Stopped`, and the panel said nothing about its own input. The same panel states a throwing gate registry, and has since 0.13's earlier change to the gates.

`DiagnosticsReading.questions` is unchanged. A reading taken in another process still carries its own questions, a list a reading supplies wins over the input, and the input's failure is then not stated. The Questions panel's markup, words and `data-testid`s are unchanged.

The decision is [ADR-QD-169](https://github.com/leaderiop/qadi/blob/main/spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md).

## 0.13: untrustedDecoder states the envelope's unknown-key policy

`@qadi/core`'s `untrustedDecoder` now takes a required options object, and its `unknownKeys` is required: `UnknownKeyPolicy`, a new export, is `"refuse" | "ignore"`. It says what the decoder does with a top-level key its schema does not declare. A call that passed no options passes `{ unknownKeys: "refuse" }`, and a call that passed `unwalked` or `prepare` adds `unknownKeys: "refuse"` beside it. Both keep every answer they gave. Before:

```ts
import { untrustedDecoder } from "@qadi/core";

export const decodeSettings = untrustedDecoder(Settings);
```

After:

```typescript
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { untrustedDecoder } from "@qadi/core";

const Settings = Schema.Struct({ name: Schema.String });
const decodeSettings = untrustedDecoder(Settings, { unknownKeys: "refuse" });

export const settings = decodeSettings.decodeText('{"name":"x"}');
export const refused = Result.isFailure(settings) ? settings.failure._tag : undefined;
```

`"ignore"` is for a versioned envelope a newer producer may extend, and the library states it twice: the decision record's wire and the stored `{ environment, record }` envelope.

Two answers widen. A record, and so an audit row or an archive entry that carries one, whose record has an unknown top-level key nested past the decode bound now decodes (`decodeSinkRecord`, `decodeSinkRecordString`, `decodeSinkRecordWithJson`, `decodeAuditEntry` and `readAuditArchive`). It was `TooDeep`. With `version: 3` it is `UnsupportedVersion`. An unknown key inside the policy, and the audit row's and the archive's own unknown keys, are still refused.

`decodeStoredRecord` and `decodeStoredRecordString` keep every refusal tag and carry the strict decoder's messages:

| Input | Before | After |
| ----- | ------ | ----- |
| not an object | `a stored record is a JSON object { environment, record }` | `Expected object` |
| no `environment`, and no `record` (a bare record, `{}`) | `a bare record, not a stored-record envelope { environment, record }` | `Missing key` at `["environment"]` |
| `record` and no `environment` | `a stored record's environment is not a string` | `Missing key` at `["environment"]` |
| `environment` not a string | `a stored record's environment is not a string` | `Expected string` at `["environment"]` |
| `environment` and no `record` | `a stored record names no record` | `Missing key` at `["record"]` |

An `environment` nested past the decode bound is now `TooDeep`, where it was `Malformed`. A caller that matches `_tag` is unaffected; a caller that matched on a message reads the new ones.

The decision is [ADR-QD-170](https://github.com/leaderiop/qadi/blob/main/spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md).

## 0.13: a stored record is its envelope in memory

`@qadi/core`'s stored record is now the envelope the wire already had, `{ environment, record }`, as one class, `StoredRecord`. It was the record's own fields with the environment stamped beside them, as `StoredDecisionRecord` and `StoredObligationRecord` (the `Stamped` intersection) built by `stampRecord`, and a consumer narrowed on `stored._tag` and read `stored.evaluationId` as if the stamp were part of the record. The record is now held whole, by reference, under `stored.record`. Those four names are removed, with no alias, and the wire is unchanged byte for byte. Three migrations cover every use:

- `record.environment` becomes `stored.environment`.
- `stored._tag`, `stored.evaluationId` and every other record field become `stored.record._tag`, `stored.record.evaluationId`, and so on.
- `stampRecord(r, e)` becomes `new StoredRecord({ environment: e, record: r })`.

Before:

```ts
import { stampRecord, storedRecordOrder } from "@qadi/core";

const stored = stampRecord(record, "Server");
const kind = stored._tag;
const where = stored.environment;
const ordered = [a, b].toSorted(storedRecordOrder);
```

After:

```typescript
import { ObligationRecord, StoredRecord, storedRecordOrder } from "@qadi/core";

const record = new ObligationRecord({
  evaluationId: "e1",
  at: 1,
  outcome: "Discharged",
  obligationIds: ["audit.log"],
});
const stored = new StoredRecord({ environment: "Server", record });
const later = new StoredRecord({
  environment: "Server",
  record: new ObligationRecord({
    evaluationId: "e2",
    at: 2,
    outcome: "Discharged",
    obligationIds: ["audit.log"],
  }),
});

export const kind = stored.record._tag;
export const where = stored.environment;
export const ordered = [later, stored].toSorted(storedRecordOrder);
```

There are now two orders, one per thing held. `storedRecordOrder` orders `StoredRecord`s and `sinkRecordOrder`, a new export, orders bare records by the same rule, for a reader that holds records without an environment, such as an archive's entries. `storedRecordOrder` reads the record each envelope holds, so the order a sorted log gives is unchanged.

The decision log's two warnings, `qadi: a decision log's append half failed` and its publish twin, are gone: a defect in either half now propagates, and the sink emitter reports it once, as it reports any sink's. A log query that filtered on either message reads the emitter's report instead.

`@qadi/http`'s routes take a `DecisionLogReader` whose element type is `StoredRecord`, so a reader built from flat records no longer typechecks; no `@qadi/http` source changed and the routes write the same bytes. `@qadi/devtools`' `ingest` takes the envelope, and a `Source`'s backlog and live stream carry envelopes, so code that built a flat record for them builds `new StoredRecord({ environment, record })`.

The decision is [ADR-QD-171](https://github.com/leaderiop/qadi/blob/main/spec/decisions/171-a-stored-record-is-its-envelope-in-memory-too.md).

## 0.13: the feeds are devtools' headless interface

`@qadi/devtools`' root now exports `makeTimelineFeed`, `makeDiagnosticsFeed` and `makeGatesFeed`, each built in a scope. A handle names what a shell reads: the timeline feed's `timeline` and `status` stores, the diagnostics feed's snapshot (its `reading` and a `status` that is `Off`, `Starting`, `Live` or `Stopped`), and the gates feed's snapshot. A feed that stops says so, with a restart, where the runners left a dead fiber.

`makeTimelineStore`, `runSource`, `makeDiagnosticsStore`, `runDiagnostics`, `noDiagnostics` and the `DiagnosticsStore` type are no longer importable. `DiagnosticsDockOptions` is now `DiagnosticsOptions`, on both entries, and `DiagnosticsOptions` is not generic and takes `intervalMillis` where it took a `schedule`. A hand-fed timeline is `makeTimelineFeed()` and its `accept`; `useTimelineStore` is unchanged.

Before:

```ts
import { makeDiagnosticsStore, makeTimelineStore, runDiagnostics, runSource } from "@qadi/devtools";

const diagnostics = makeDiagnosticsStore();
yield* Effect.forkChild(runDiagnostics(diagnostics, { layer, schedule: Schedule.spaced("1 second") }));

const timeline = makeTimelineStore();
yield* Effect.forkChild(runSource(timeline, source));
```

After:

```typescript
import * as Effect from "effect/Effect";
import { makeDecisionLog } from "@qadi/core";
import { makeDiagnosticsFeed, makeTimelineFeed, type DiagnosticsOptions } from "@qadi/devtools";

const sampling: DiagnosticsOptions = { intervalMillis: 1_000 };

export const statuses = Effect.scoped(
  Effect.gen(function* () {
    const log = yield* makeDecisionLog({ environment: "Server", capacity: 512 });
    const timeline = yield* makeTimelineFeed({ source: log });
    const diagnostics = yield* makeDiagnosticsFeed(sampling);
    return {
      timeline: timeline.status.getSnapshot()._tag,
      diagnostics: diagnostics.getSnapshot().status._tag,
    };
  }),
);
```

A stop's `reason` is a `Cause.pretty` trace, with stack frames and checkout paths, for a developer in the host's own process. It must not cross a trust boundary: a shell that forwards status to a remote viewer sends the tag, not the reason.

The decision is [ADR-QD-173](https://github.com/leaderiop/qadi/blob/main/spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md).

## 0.13: a DecisionCache is asked only the question

`DecisionCacheShape.getOrCompute` takes the question and, optionally, how the walk runs: `getOrCompute(question, options?)`, where `options` is `{ concurrency? }`, the `concurrency` option of `evaluate` (`Pick<EvaluateOptions, "concurrency">`). It no longer takes a `compute`, and passing one as a caller is a compile error (TS2559). `decisionCacheLayer()` walks the question it is given, so no caller can store a trace under a question that trace does not answer.

`concurrency` is still not part of the key. One question asked with two concurrencies is one entry, and an ask that joins a walk already in flight shares that walk, run with the first asker's `concurrency`.

Callers of `evaluate` and of the enforcing entry points see no change. A hand-written `DecisionCacheShape` must now produce its own trace for the question it is handed, and core does not export the walk, so wrap `decisionCacheLayer()` and delegate to it. At runtime the `options` a cache receives is the options object the decision was asked with, passed through without a copy, so it can carry more keys than `concurrency`; read only `concurrency`, and do not log or retain the rest.

An implementation written as below no longer compiles where it runs `compute` (TS2345), where it annotates it (TS2322), or, written as a class that `implements DecisionCacheShape`, at the method (TS2416).

Before:

```ts
const cache = Layer.succeed(DecisionCache, {
  getOrCompute: (question, compute) => Effect.map(compute, (trace) => ({ trace, outcome: "miss" })),
  size: Effect.succeed(0),
  clear: Effect.void,
});
```

After:

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { DecisionCache, decisionCacheLayer } from "@qadi/core";

export const loggedCache = Layer.effect(
  DecisionCache,
  Effect.gen(function* () {
    const inner = yield* DecisionCache;
    return DecisionCache.of({
      ...inner,
      getOrCompute: (question, options) =>
        inner.getOrCompute(question, options).pipe(
          Effect.tap((lookup) => Effect.logDebug(`decision cache ${lookup.outcome}`)),
        ),
    });
  }),
).pipe(Layer.provide(decisionCacheLayer()));
```

The decision is [ADR-QD-174](https://github.com/leaderiop/qadi/blob/main/spec/decisions/174-a-decision-cache-is-asked-the-question.md).

## 0.13: the evaluate spans answer under `qadi.outcome` and a failed span says what was asked

The `qadi.evaluate` span's outcome is one key on every path that ends in a decision or a typed failure: `qadi.outcome`, with the values `Allow`, `Deny` and `Failed`. An interrupted or defected evaluation carries its question and no outcome, and the span's status says why. The key `qadi.decision`, which carried `Allow` or `Deny`, is removed, and nothing is written under both keys, so a tracer query or a dashboard on `qadi.decision` must move to `qadi.outcome`. A failed evaluation was never under `qadi.decision`; it was `qadi.outcome` with the value `Failed`, so a query that already read `qadi.outcome` for failures now finds the allows and denials under it too.

A failed `qadi.evaluate` span used to carry only `qadi.outcome` and `qadi.error_tag`, because its question was annotated after the decision was made. The question is now annotated first, on every path, so a query by `qadi.subject_id` or by `qadi.evaluation_id` finds the evaluations that failed as well as the ones that decided. The other spans of the family say what they were asked too, and `qadi.toPredicate` says why a translation failed.

| Span | Before | After |
| ---- | ------ | ----- |
| `qadi.evaluate`, an allow or a denial | `qadi.decision` (`Allow` or `Deny`), `qadi.subject_id`, `qadi.evaluation_id`, `qadi.policy_tag`, `qadi.action` when supplied, `qadi.obligations` on an allow that owes some | `qadi.outcome` (`Allow` or `Deny`) in place of `qadi.decision`; the other keys as before |
| `qadi.evaluate`, a failure | `qadi.outcome` (`Failed`) and `qadi.error_tag` | `qadi.subject_id`, `qadi.evaluation_id`, `qadi.policy_tag`, `qadi.action` when supplied, `qadi.outcome` (`Failed`) and `qadi.error_tag` |
| `qadi.toPredicate`, a translation | `qadi.subject_id`, `qadi.policy_tag` and `qadi.predicate_tag` | the same, and `qadi.action` when supplied |
| `qadi.toPredicate`, a failed translation | no key | `qadi.subject_id`, `qadi.policy_tag`, `qadi.action` when supplied and `qadi.error_tag` |
| `qadi.guardHealthCheck` | `qadi.healthy`, and `qadi.error_tag` when unhealthy | `qadi.subject_id`, `qadi.policy_tag` and `qadi.action` when supplied, then `qadi.healthy`, and `qadi.error_tag` when unhealthy |
| `qadi.decideSubjects` | `qadi.subject_count` and `qadi.policy_tag` | the same, and `qadi.action` when supplied |
| `qadi.decideSubjectsStream` | `qadi.policy_tag` | the same, and `qadi.action` when supplied |

Every evaluation now annotates its span twice, the question and then the answer, where it annotated once. The cost is recorded in the decision.

The decision is [ADR-QD-188](https://github.com/leaderiop/qadi/blob/main/spec/decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md).

## 0.13: `ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput` are removed, and two history errors may omit a member

`ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput` are removed from `@qadi/core`. A host that built its own set of history rows from them keys its rows with `decisionHistoryPort.key`, as `decisionHistoryFromEvents` does; `ActedEventInput`, the row `decisionHistoryFromEvents` takes, stays.

`SignatureHistoryUnavailable.subjectId` and `DecisionHistoryUnavailable.event` are optional. Each is absent exactly when the request's value for it was unreadable or one the member's schema refuses, a subject id or an event that is not a string, whether or not the port's key refuses it. The error's `cause` is the refusal's sentence when the key refuses the request, and the store's own cause when the key admits it, as it does a subject id that is an object. A reader of a sink record, or of `@qadi/http`'s `SignatureHistoryUnavailableResponse` and `DecisionHistoryUnavailableResponse`, checks for the member before reading it, and a decoder of a stored record accepts it absent.

The two fixtures also fail a request or a row they cannot key, where they used to misanswer: a history set with such a row answered `"NotActed"`, which `hasNotActed` reads as an allow.

| Change | Before | After |
| ------ | ------ | ----- |
| `ActedEvent` | a class exported by `@qadi/core` | removed; key a row with `decisionHistoryPort.key` |
| `ActedAnywhere` | a class exported by `@qadi/core` | removed; key a row with `decisionHistoryPort.key` |
| `ActedAnywhereInput` | the input type of `ActedAnywhere` | removed with it |
| `SignatureHistoryUnavailable.subjectId` | always present | optional, absent when the request's subject id was not a string |
| `DecisionHistoryUnavailable.event` | always present | optional, absent when the request's event was not a string |
| `decisionHistoryFromEvents`, a row or request it cannot key | answered `"NotActed"` or threw | fails with `DecisionHistoryUnavailable` |
| `signatureHistoryFromSignatures`, a request it cannot key | the read died | fails with `SignatureHistoryUnavailable` |

The decision is [ADR-QD-189](https://github.com/leaderiop/qadi/blob/main/spec/decisions/189-remedies-asks-core-whether-a-fixture-row-meets-a-signature-or-acted-leaf.md).

## 0.13: an audit row is made only by its codec

`@qadi/audit` archived rows its own reader refused. `AuditEntry` was a plain struct any caller could build, so a row with a `NaN` `at`, an extra top-level key or a record that disagreed with its decision reached `archiveAuditTrail`, and `readAuditArchive` then refused the bundle as `EntryNotDecodable`, which blocks the purge the archive exists for. An audit row is now a value only `encodeAuditEntry` and `decodeAuditEntry` make, and the writer never receives a row the reader refuses.

| Change | Before | After |
| ------ | ------ | ----- |
| `AuditEntry` | a schema value and a struct type, any object literal or spread | a type alone, made only by `encodeAuditEntry` and `decodeAuditEntry`; the schema value is removed |
| a store's sequence number on a row | `{ ...entry, sequenceNumber: n }` | `decodeAuditEntry({ record, sequenceNumber: n })` |
| `SequenceNumberInvalid` | the writer's and the verifier's failure for a number that is not a safe integer | removed; `decodeAuditEntry` refuses such a number as `Malformed`, so no row holds one |
| `undated` on `RetentionPlan` and `PurgePlan` | the rows whose `at` was not finite | removed; a row's `at` is finite, so a plan holds `retained` and `expired`, and a purge plan `purge`, `retain` and `unarchived` |
| `archiveAuditTrail` with a `now` that is not finite | archived the bundle with a `null` `createdAt` | fails `ArchiveInputInvalid`, naming `now` and the value |
| a `keyMaterial` item with an extra property | archived, and the reader refused the bundle | written as `keyId`, `algorithm` and `publicKey` |
| a `keyMaterial` typed `any` that the reader would refuse (an item with a number `keyId`, a `null` item, a value that is not a list) | a number `keyId` was archived and the reader refused the bundle; a `null` item or a non-list threw a `TypeError` and killed the fiber | fails `ArchiveInputInvalid`, naming `keyMaterial` and the index of the first item refused, or the value given when it is not a list |
| a row typed `any` that the codec did not make (`JSON.parse`, a raw SQL row, an untyped ORM result) in `archiveAuditTrail`, `verifySequenceIntegrity`, `planRetention` or `planPurge` | accepted, so a row with a `null` `at` was archived and a plain row numbered `1.5` was read as a number | fails `ArchiveInputInvalid` or `RetentionInputInvalid`, naming `entries` and the index of the first such row |
| an `AuditEntry` the codec made, written to (`entry.sequenceNumber = 1.5`, `entry.record.at = null`) | changed the row the writer and the purge read | throws a `TypeError` in strict mode: the codec freezes the row and its `record`, one level deep |
| `decodeAuditEntry` | read the row's record, then the row | reads the row, then its record: the message of a refusal changes, and so does the refusal of a row that is bad in both places, and every tag is unchanged |

A numbered row is read back from the store as it holds it. The sequence number is a fact of your store, so it reaches a row when the store returns the row, with the record the store holds beside it:

```typescript
import * as Result from "effect/Result";
import { decodeAuditEntry } from "@qadi/audit";

// A row as your store returns it: the encoded record and the store's own number.
declare const stored: { readonly record: unknown; readonly sequenceNumber: number };

const numbered = decodeAuditEntry({
  record: stored.record,
  sequenceNumber: stored.sequenceNumber,
});

if (Result.isSuccess(numbered)) {
  // The row `verifySequenceIntegrity` and `archiveAuditTrail` read.
  const entry = numbered.success.entry;
  void entry;
}
```

`decodeAuditEntry` refuses a row whose number is not a safe integer, and refuses a row with an undeclared top-level key, so a spread such as `{ ...entry, sequenceNumber: n }` is a way to write storage JSON and not a way to make an `AuditEntry`. Write that object to your store, and read the store's row back through `decodeAuditEntry`. There is no setter and no `encodeAuditEntry` option for the number.

A handler of the writer's failures covers `ArchiveInputInvalid` and `SequenceIntegrityError`; `ArchiveInputInvalid` has the shape of `RetentionInputInvalid`, with a `field` and a `value`. `ArchiveInputInvalid`'s `field` is `"now"`, `"keyMaterial"` or `"entries"` and `RetentionInputInvalid`'s is `"now"`, `"maxAgeMs"` or `"entries"`; for `entries` the `value` is the index of the first row the codec did not make, and for `keyMaterial` it is the index of the first item that is not key material, or the value you passed when it is not a list. `ArchiveInputInvalid`'s `value` is `unknown`, because `any` and JavaScript callers pass what the type does not admit. `verifySequenceIntegrity` can fail `ArchiveInputInvalid` as well as `SequenceIntegrityError`, so a handler of it covers both, and `planRetention` and `planPurge` can fail `RetentionInputInvalid` for `entries`. The record of what the codec made is per loaded copy of `@qadi/audit`: a row made by one copy and passed to another (two versions installed side by side, two bundles with separate module graphs, a test that resets modules) fails `ArchiveInputInvalid` naming `entries` and the index of the first such row, so install one copy. A host that passes only rows it read back through `decodeAuditEntry`, or made with `encodeAuditEntry`, from one copy of the package, sees no difference at run time; a row that arrives as `any` is read back through `decodeAuditEntry` first. A caller of `planRetention` or `planPurge` stops reading `undated`. A caller that catches `SequenceNumberInvalid` removes the handler, because `decodeAuditEntry` refuses the number first.

The migration example for rows written before 0.10, at the top of this guide, is unchanged. It runs on `@qadi/audit@0.10` and returns storage JSON, which is the object your store takes.

The decision is [ADR-QD-190](https://github.com/leaderiop/qadi/blob/main/spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md).
