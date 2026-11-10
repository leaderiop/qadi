# 33 — Audit Pipeline

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-33                                    |
> | Revision       | 1.18                                           |
> | Effective Date | 2026-10-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.18 (2026-11-10): BEH-QD-249 gains storeCallTimeout; BEH-QD-251 — the sink's own deadline is a failure, a caller's interruption still is not; BEH-QD-379 (a store call is bounded; Duration.zero pinned; an uninterruptible adapter is not bounded) and BEH-QD-380 (the doubles' script; failWith, failStageWith and failCommitWith removed) added (ARCH-62, ADR-QD-126, CCR-QD-404)<br>1.17 (2026-11-10): BEH-QD-256 — a resource with no string id refuses the discharge before capture. BEH-QD-326 — the ledger is a keyed store read through ledgerKeyOf; a foreign row fails the read; scope "Any" reads subject-wide rows. BEH-QD-339 added — a ledger adapter can be checked (ARCH-59, ADR-QD-117, INV-QD-120, CCR-QD-395)<br>1.16 (2026-11-08): BEH-QD-254 — the writer and the reader compute an archive's order, claim and sequence break once, and the reader accepts every bundle the writer writes; a sequence number outside the safe integers fails `SequenceNumberInvalid` at the writer (code review WR-01) (ARCH-48, ADR-QD-110, CCR-QD-387)<br>1.15 (2026-10-08): BEH-QD-312 — a stored row whose record contradicts its own trace is refused as `Inconsistent` (ADR-QD-106, INV-QD-170, CCR-QD-301)<br>1.14 (2026-10-08): BEH-QD-256 — the capture request is derived from the discharged question (signer, `resourceId`, `action`, `resource`, `evaluationId`), not the ambient subject, and a capture that returns a signature for a different signer or meaning fails the discharge. BEH-QD-255 — a ledger is a store, not a capture. BEH-QD-326 — a signature captured for a discharged question answers that question's `hasSignature`, and no other (`SignatureLedger`; INV-QD-120, ADR-QD-105, CCR-QD-220)<br>1.13 (2026-10-08): BEH-QD-253 — a purge selects only rows a `VerifiedArchive` holds (`planPurge`); `planRetention` reports `expired`; `getPurgeableEntries` and `enforceRetention` removed. BEH-QD-254 — `readAuditArchive` reads a stored bundle back, each failure its own `ArchiveRefusal` (ARCH-38, CCR-QD-230)<br>1.12 (2026-10-08): BEH-QD-249 gains `AuditDecisionSinkOptions.onOutcome`. BEH-QD-251 — an entry neither written nor staged is reported by a warning naming its evaluation id, including after a failed trail write; `qadi_audit_writes_total` counts every record received exactly once, breaker-refused ones as `skipped_open`. BEH-QD-252 — a staged entry that was not written is reported at info; the eleven outcomes are tabled; `qadi_audit_entries_lost_total` (INV-QD-106, ADR-QD-056, CCR-QD-204)<br>1.11 (2026-10-07): BEH-QD-250 — a refused record is reported (`AuditDecisionSinkOptions.onRefused`, else a warning naming the refusal, its path and the evaluation id), never dropped silently, and a hook that throws never fails the record; `AuditEntryNotEncodable` carries `evaluationId` and its `reason` is core's `describeEncodeRefusal`. BEH-QD-249's signature fence gains `onRefused` and its `resetTimeoutMs` is `Duration.Input` as the code has it (CCR-QD-193)<br>1.10 (2026-10-07): BEH-QD-253 — retention is `planRetention`, which purges only with a finite age past a valid limit and refuses an impossible `now` or `maxAgeMs`; a non-finite `at` is retained and reported `undated`. BEH-QD-312 — a non-finite `at` and a non-integer `sequenceNumber` are `Malformed` (INV-QD-101, ADR-QD-095 amendment, CCR-QD-186)<br>1.9 (2026-10-07): BEH-QD-254 — entries carrying no `sequenceNumber` follow every sequenced entry in the order given, and are never ordered by `at` (pins what `archiveAuditTrail` already did; CCR-QD-185)<br>1.8 (2026-10-06): BEH-QD-312 — `decodeAuditEntry` reads wire version 2 only: a pre-0.10 row is refused as `UnsupportedVersion`, reported, never upgraded, and migrated with 0.10.x; `AuditEntry.record` is version-2 bytes (ADR-QD-096 amendment, CCR-QD-182)<br>1.7 (2026-10-05): BEH-QD-312 — `decodeAuditEntry` applies every check `decodeSinkRecord` applies, and reads rows of both wire versions; the row schema alone is not a reader. BEH-QD-250 — rows are written as wire version 2 (ADR-QD-096, CCR-QD-180)<br>1.6 (2026-10-05): BEH-QD-250 restated — a row's `record` is `encodeSinkRecord`'s encoded wire, byte-identical to the stream and forwarding; the refusal carries core's `EncodeRefusal`; a `cause` is never a reason to refuse. BEH-QD-312 — `decodeAuditEntry`, the guarded reader (ADR-QD-095, CCR-QD-179)<br>1.5 (2026-10-05): BEH-QD-250 widened — the guard walks the outcome as well: a resolver error's `cause` carrying a reference cycle or a `BigInt` used to pass it and then throw at the store's `JSON.stringify`, which counted as a write failure and could trip the breaker; `Map`/`Set`/`RegExp`/binary data are refused rather than persisted as `{}` (CCR-QD-178)<br>1.4 (2026-10-04): BEH-QD-251 — the half-open probe claim is released on every exit including interruption during staging; a failure settling on an already-`Open` breaker is a no-op; outcomes count only toward the window that admitted them; the interruption prose corrected (`Effect.exit` folds a typed failure, a defect and an adapter's self-interruption, not a caller's interruption) (CCR-QD-154)<br>1.3 (2026-09-09): BEH-QD-250 widened — `encodeAuditEntry` guarded only `resource` via `isJsonSafe`, not the whole record; `policy`'s `HasCustom.params` (ADR-QD-055's escape hatch) is a second caller-supplied `unknown` a `SinkRecord` can carry, and a circular or `BigInt`-valued one sailed past the narrow guard uncaught. Now guarded via `isRecordJsonSafe` (`SinkCodec.ts`), which walks `resource` **and** `policy` (issue #104)<br>1.2 (2026-09-07): BEH-QD-250 and BEH-QD-251 widened — `isJsonSafe` walks iteratively so a merely-deep (non-cyclic) value no longer risks the same stack exhaustion the circular-reference case was already guarded against; `stage()`/`write()` now run under `Effect.exit` rather than `Effect.result`, so a defect or interruption from either — not just a typed `AuditWriteError`/`AuditStagingError` — reaches the breaker and the metrics the same way a typed failure already did (CCR-QD-113)<br>1.1 (2026-09-06): BEH-QD-254 renamed — `verifyChainIntegrity`/`ChainIntegrityError` read as cryptographic tamper-evidence to a compliance reviewer and are not; renamed to `verifySequenceIntegrity`/`SequenceIntegrityError` (CCR-QD-094)<br>1.0 (2026-08-25): Initial release (CCR-QD-086) |

_Previous: [32 — Custom Predicates](./32-custom-predicates.md)_

---

What `@qadi/audit` does with the `SinkRecord`s `DecisionSink`
[24 — Decision Sink](./24-decision-sink.md) already exists to receive. See
[ADR-QD-056](../decisions/056-audit-companion-package.md).

## BEH-QD-249: The assembled pipeline is reachable through one `DecisionSink.record` call

```ts
export interface AuditDecisionSinkOptions {
  readonly failureThreshold?: number;
  readonly resetTimeoutMs?: Duration.Input;
  readonly storeCallTimeout?: Duration.Input;
  readonly onRefused?: (refusal: AuditEntryNotEncodable) => void;
  readonly onOutcome?: (outcome: AuditWriteOutcome) => void;
}
export const AuditDecisionSinkLive: (
  options?: AuditDecisionSinkOptions,
) => Layer.Layer<DecisionSink, never, AuditTrailPort>;
```

```
REQUIREMENT: AuditDecisionSinkLive MUST require AuditTrailPort as a Layer
             dependency and MUST read AuditStagingPort only optionally, via
             Effect.serviceOption — never as a Layer dependency, so a caller
             who never wires staging pays nothing for it.
REQUIREMENT: Every capability AuditDecisionSinkLive composes — encoding,
             staging, the circuit breaker, the trail write — MUST be reached
             through record(), the one method DecisionSink exposes. No
             capability may exist only as an export nothing in the assembled
             pipeline calls.
```

This is the piece that exists specifically to avoid the defect
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md) named and that HexDi's own
Guard still has: individually correct, individually tested primitives that
the real enforcement path never calls. Every behavior below is a property of
what `record()` actually does, not of a function that exists beside it.

## BEH-QD-250: A record with no safe durable representation refuses, cleanly, rather than approximating or crashing

```ts
export const AuditEntry: Schema.Struct<{ record: typeof SinkRecordJson; sequenceNumber: … }>;
export class AuditEntryNotEncodable { recordTag; evaluationId: string; refusal: EncodeRefusal; reason: string }
export const encodeAuditEntry: (record: SinkRecord) => Effect<AuditEntry, AuditEntryNotEncodable>;
```

```
REQUIREMENT: encodeAuditEntry MUST produce the row through `@qadi/core`'s
             `encodeSinkRecord`, so a row's `record` is the encoded wire:
             `JSON.stringify(entry.record)` MUST equal the decision stream's
             frame data and forwarding's `send` value for the same record.
REQUIREMENT: encodeAuditEntry MUST fail AuditEntryNotEncodable, carrying the
             `EncodeRefusal` and its path, for a record carrying anywhere a
             value with no safe durable representation (a function, a Symbol,
             a circular reference, a BigInt, a Map/Set/RegExp/binary array, a
             value nested past the decode bound) — MUST NOT stringify, drop the
             field silently, or throw an uncaught exception.
REQUIREMENT: A resolver error's `cause` MUST NOT be a reason to refuse: it
             crosses through `Schema.Defect()`.
REQUIREMENT: A refused record MUST be reported — through `onRefused` when
             given, otherwise by a warning naming the refusal, the path it was
             found at and the evaluation id — and the
             `qadi_audit_writes_total{outcome="encode_failed"}` counter MUST
             increment either way. It MUST NOT be dropped silently, and a hook
             that throws MUST NOT fail the record or the decision: it is logged,
             and the next record is still written.
REQUIREMENT: `AuditEntryNotEncodable.reason` MUST be `@qadi/core`'s
             `describeEncodeRefusal` of its `refusal`, and `evaluationId` the
             refused record's.
```

A `Predicate`'s `Compare`/`MemberOf` values are `unknown`, and
[BEH-QD-238](./31-predicate-compilation.md#beh-qd-238-an-unsafe-value-refuses-rather-than-binds-blind)
already refuses rather than approximates one layer of that; a `resource` is
the same shape of caller-supplied `unknown` one layer further out, and gets
the same discipline. So does `policy`'s `HasCustom.params` (ADR-QD-055's escape
hatch) and the outcome.

**One encode, so the store cannot get it wrong.** Before ARCH-09 the row held the
record's in-memory projection and the store's own `JSON.stringify` did the rest,
behind a guard that walked some fields: a circular or `BigInt`-valued `params`
passed it until issue #104, and a cyclic or `BigInt` resolver `cause` passed it
until CCR-QD-178. Each threw at the store's `JSON.stringify`, which the breaker
counts as a write failure — so during an attribute-store outage, five such
records opened it and the healthy rows after them were dropped. An `Error`
cause was written as `{}`, and a `Set` in a resource as `{}`. Now the row *is*
the encoded wire, checked over its whole encoded form by one walk
([ADR-QD-095](../decisions/095-sinkcodec-owns-both-directions.md)): there is no
encode step left for a store to forget, a `Failed` record is written with its
`cause` normalised, and the breaker trips only on genuine store failures. The
walk is iterative with one mutable ancestor set, so a merely deep value cannot
exhaust the call stack, and a value reachable twice without a cycle is not
refused.

**Reported, not only counted** ([ADR-QD-056](../decisions/056-audit-companion-package.md)'s
2026-10-07 amendment, [INV-QD-104](../invariants.md#inv-qd-104-a-refusal-report-says-where-never-what)).
Until ARCH-25 the pipeline built `reason` and discarded it, recording only the
counter: a decision had no audit row and no `evaluationId` anywhere, the one
reporter of the three that left no trace. The annotations are core's
`encodeRefusalAnnotations` (`qadi.refusal`, `qadi.path`, `evaluationId`), never a
value from the record; `reason` can carry caller text (a throwing getter's
message) and so is for a caller holding the error, not for a log.

A property whose value is `undefined` is absence — JSON drops the key — not a
refusal; a valid `Date` is persisted as its ISO string (the named normalisations
of [INV-QD-096](../invariants.md#inv-qd-096-whatever-the-record-codec-emits-it-accepts)).

## BEH-QD-312: A stored row is read back through a guard

> **Invariant:** [INV-QD-097](../invariants.md#inv-qd-097-the-record-codec-is-total)

```ts
export const decodeAuditEntry: (
  input: unknown,
) => Result<{ readonly entry: AuditEntry; readonly record: SinkRecord }, SinkRecordNotDecodable>;
```

```
REQUIREMENT: decodeAuditEntry MUST read the row's record through `@qadi/core`'s
             `decodeSinkRecord` — depth-guarded — before decoding the row, and
             MUST return a typed refusal, never throw, for any input.
REQUIREMENT: decodeAuditEntry MUST decode the row as untrusted: an excess
             property, a missing record, or a record that is not a record is
             `Malformed`.
REQUIREMENT: decodeAuditEntry MUST apply every check `decodeSinkRecord`
             applies to the row's record — an excess property inside the
             embedded `Policy`, and a decision naming no outcome, are refused,
             never stripped or repaired.
REQUIREMENT: decodeAuditEntry MUST refuse as `Malformed` a record whose `at` is
             not a finite number (a stored `1e400` reads as `Infinity`) and a
             row whose `sequenceNumber` is not an integer (`1.5`, `NaN`) —
             what no encoder emits, so no valid row is refused.
REQUIREMENT: decodeAuditEntry MUST read a row whose record is wire version 2,
             MUST tolerate what `decodeSinkRecord` tolerates (an unknown
             top-level envelope key) rather than refuse the row at its own
             decode, and MUST refuse a row of any other version — one written
             before 0.10, with no `version`, included — as
             `UnsupportedVersion`, never upgrading or skipping it.
REQUIREMENT: decodeAuditEntry MUST refuse a row whose record's decision
             contradicts its own trace, or whose ids or policy tag contradict
             its decision, as `Inconsistent` (a refusal `decodeSinkRecord`
             raises; INV-QD-170) rather than return an entry whose verdict,
             fields and trace disagree.
```

> **Amended in CCR-QD-182 (0.11.0).** The last requirement read:
> "decodeAuditEntry MUST read a row of either wire version — one written before
> the wire was versioned, by `@qadi/audit` 0.3 or later, included — and MUST
> tolerate what `decodeSinkRecord` tolerates (an unknown top-level envelope key,
> a pre-0.5 `failed.code`) rather than refuse the row at its own decode."
> Reversed by the maintainer's decision recorded in
> [ADR-QD-096](../decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)'s
> 2026-10-06 amendment.

A store keeps every row it was ever handed, so a store that predates 0.10 holds
version-1 rows. 0.11.0 reads version 2 only
([ADR-QD-096](../decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)),
so such a store is **migrated before its readers upgrade**: every pre-0.10 row is
re-encoded with 0.10.x — `decodeAuditEntry` then `encodeAuditEntry` from
`@qadi/audit@0.10`, which reads version 1 and writes version 2. A row left
unmigrated is not lost silently: `decodeAuditEntry` refuses it as
`UnsupportedVersion` with `version: undefined`, which a reader can count and
report. `AuditEntry.record` is `SinkRecordJson`, the version-2 encoded type, and
`AuditArchive`'s `archiveVersion` stays `"1"`: each entry names its own wire
version, and an archive bundled before 0.10 is migrated entry by entry.

The `AuditEntry` schema on its own is a description of the row, not a reader:
decoded with `Schema`'s default options it strips a typo'd field inside the
embedded policy and accepts a record naming no outcome (ARCH-15 C10), which is
the silent loss ADR-QD-002 exists to rule out. A stored row is re-parsed by
`decodeAuditEntry` and by nothing else.

A row is re-parsed later, by a compliance review, a query tool or another
process — the condition ADR-QD-002 names for a schema-derived type. Decoding a
row with the schema alone died with a `RangeError` on a stored policy nested
60,000 levels deep; there was no guarded reader to reach for. `decodeAuditEntry`
is that reader, and returns the rebuilt record beside the row so a reader does
not decode twice.

## BEH-QD-251: A tripped circuit breaker skips the write, not the stage, and its transitions are atomic under concurrency

> **Invariant:** [INV-QD-052](../invariants.md#inv-qd-052-once-a-circuit-breaker-trips-write-is-never-attempted-again-until-reset)

```
REQUIREMENT: The breaker MUST trip on any AuditTrailPort.write failure — a
             typed AuditWriteError or an unexpected defect/interruption from
             a misbehaving store adapter alike — and MUST NOT trip on
             AuditStagingError, which is tracked separately.
REQUIREMENT: While open, record() MUST still call stage() if AuditStagingPort
             is wired, and MUST skip write() entirely.
REQUIREMENT: A state transition MUST be computed and written back to the
             breaker's Ref as one atomic step. Two concurrent record() calls
             MUST NOT be able to read the same stale consecutive-failure
             count and both write back an update, losing one.
REQUIREMENT: No public error type MAY be constructed for a tripped breaker.
             Trip state is a check record() makes internally before
             attempting a write.
REQUIREMENT: A half-open probe claim MUST be released on every exit path from
             the moment it is claimed — including an interruption during
             staging — so the next half-open window opens resetTimeoutMs
             after the probe ends.
REQUIREMENT: A write failure that settles while the breaker is already Open
             MUST NOT count as a transition and MUST NOT restart the open
             window.
REQUIREMENT: An outcome MUST count only toward the half-open window (or Closed
             stretch) in which its write was admitted.
REQUIREMENT: A caller's interruption of record() is not a store failure: a
             caller-interrupted write while Closed MUST record nothing, and a
             caller-interrupted half-open probe MUST release its claim.
REQUIREMENT: The sink's own deadline (storeCallTimeout, BEH-QD-379) is not a
             caller's interruption: a write that reaches it MUST be recorded
             on the breaker as a failed attempt, like a typed failure.
REQUIREMENT: Every record record() receives MUST be counted exactly once in
             qadi_audit_writes_total, including a record the breaker refused
             (outcome skipped_open): the sum over its outcomes is the number
             of records received.
REQUIREMENT: An entry that is in neither the trail nor staging — the breaker
             refused it, or the trail write failed or died, and staging was
             not wired or failed — MUST be reported by a warning naming its
             evaluationId, and counted in qadi_audit_entries_lost_total.
```

`Qadi.ts`'s `filter`/`filterStream` evaluate items concurrently, so
concurrent `record()` calls reaching the same breaker are the ordinary case
for a caller batch-authorizing a collection, not an edge case. A `Ref.get`
followed by a later `Ref.set` lets two fibers both observe the same count
before either writes back — a lost update that lets the breaker take longer
than `failureThreshold` to trip, or a double-counted transition in
`qadi_audit_circuit_breaker_transitions_total`. `CircuitBreaker.ts` closes
this by computing every transition inside a single `Ref.modify` call.

No public error type, unlike a first instinct borrowed from HexDi's
`CircuitOpenError`: that type is modeled in HexDi's own error union and never
thrown by its real enforcement path — reachable only in principle, the exact
defect this whole package exists to avoid repeating.

`AuditDecisionSinkLive.ts`'s `record()` runs `AuditTrailPort.write` under
`Effect.exit`, not `Effect.result`: the latter only catches `write`'s own
typed `E` channel, so a defect or an interruption from a misbehaving store
adapter used to unwind straight past `breaker.recordFailure` and the
`qadi_audit_writes_total` `write_failed` counter alike — a store that never
resolves observably, and never tripped the one mechanism that exists to
detect it. `Effect.exit` folds success, a typed failure, a defect and an
adapter's own self-interruption into one `Exit` value the same code path
branches on, so a defect reaches `recordFailure` exactly as a typed
`AuditWriteError` does. A *caller's* interruption of `record` (a client
disconnect, an `Effect.timeout`) is not folded by `Effect.exit`: it is not a
store failure. A caller-interrupted write while `Closed` records nothing, and a
caller-interrupted half-open probe releases its claim, reopening the breaker.

The sink's own deadline (`storeCallTimeout`, [BEH-QD-379](#beh-qd-379-a-store-call-is-bounded-by-the-sinks-deadline))
is not a caller's interruption: a store call that reaches it is a failed attempt,
recorded on the breaker like a typed failure. A caller's interruption is still not.
The difference is where the interruption comes from: the deadline fails the call
the sink made, inside the attempt the breaker is watching
([ADR-QD-126](../decisions/126-an-audit-store-call-has-a-deadline.md)); a caller
interrupts the attempt itself, from outside.

## BEH-QD-379: A store call is bounded by the sink's deadline

> **Invariant:** [INV-QD-035](../invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)

```ts
export interface AuditDecisionSinkOptions {
  // …
  readonly storeCallTimeout?: Duration.Input; // default: 5 seconds
}
```

```
REQUIREMENT: AuditDecisionSinkLive MUST bound each store call it makes —
             AuditStagingPort.stage, AuditTrailPort.write and
             AuditStagingPort.commit — by storeCallTimeout, separately: each
             call gets its own deadline.
REQUIREMENT: A write that reaches the deadline MUST fail with AuditWriteError,
             its cause a Cause.TimeoutError, inside the breaker's attempt, so
             the breaker counts it as a failed attempt: the record is
             WriteFailed, and enough such writes open the breaker. A half-open
             probe that reaches it MUST settle and reopen the breaker.
REQUIREMENT: A stage that reaches the deadline MUST make the record's staging
             StageFailed, and a commit that reaches it MUST make it
             CommitFailed, carrying an AuditStagingError for the staged entry
             whose cause is a Cause.TimeoutError. Neither moves the breaker.
REQUIREMENT: storeCallTimeout MUST default to 5 seconds when omitted, and
             Duration.infinity MUST leave the store call unbounded.
REQUIREMENT: A caller's interruption of record() is still not a store failure
             (BEH-QD-251).
```

```typescript
import * as Layer from "effect/Layer";
import { AuditDecisionSinkLive, AuditPortReply, AuditTrailPortTest } from "@qadi/audit";

// A store that never answers. Each write fails after 2 seconds instead of
// holding the decision, and the third such write opens the breaker.
const trail = AuditTrailPortTest({ write: () => AuditPortReply.Never() });
const sink = AuditDecisionSinkLive({ storeCallTimeout: "2 seconds", failureThreshold: 3 }).pipe(
  Layer.provide(trail.layer),
);

void sink;
```

`evaluate` awaits `DecisionSink.record`
([ADR-QD-044](../decisions/044-an-optional-decision-sink.md)), so a store call
that never settled held the decision with it, and the breaker, which counts only
calls that end, stayed `Closed` however many records hung behind it. A hung
half-open probe held its claim, so the breaker never left `HalfOpen`. Each store
call now has a deadline, and a call that reaches it is a failure the pipeline
already knows how to report: a hang ends in the same outcome, the same counters
and the same log line as a typed failure. The exit matrix
(`AuditWriteExits.test.ts`) and the lost-entry table (`Metrics.test.ts`) each
carry rows for a store that never settles, and each expects exactly what its
`Fail` twin expects.

**Bounded, not removed.** The latency `record` adds is now at most one deadline
per store call it makes: three (stage, write, commit) with staging wired, one
without. A store that is healthy but slower than the deadline now fails; an
operator raises `storeCallTimeout` for it, or sets `Duration.infinity` to keep
the unbounded wait.

**`Duration.zero` is pinned, not chosen.** With a zero deadline the store call
starts — a `Latch` reply's latch is open afterwards — and then fails at once, with
no clock movement: the record is `WriteFailed`.

**The limit.** The deadline is `Effect.timeoutOrElse`'s, the same as core's
`…TimingOut` port wrappers: the store call is interrupted at the deadline and
waited for. An adapter that makes itself uninterruptible is not bounded by
`storeCallTimeout`.

## BEH-QD-380: The audit doubles answer each call from a script

```ts
export type AuditPortReply =
  | Ok | Fail { cause: unknown } | Die { defect: unknown } | Interrupt | Never | Latch { latch: Latch };
export type AuditTrailScript = (entry: AuditEntry, call: number) => AuditPortReply | undefined;
export type AuditStageScript = (entry: AuditEntry, call: number) => AuditPortReply | undefined;
export type AuditCommitScript = (handle: AuditStagingHandle, entry: AuditEntry, call: number) => AuditPortReply | undefined;
export interface AuditTrailPortTestOptions { readonly write?: AuditTrailScript }
export interface AuditStagingPortTestOptions { readonly stage?: AuditStageScript; readonly commit?: AuditCommitScript }
```

```
REQUIREMENT: AuditTrailPortTest MUST answer each write, and
             AuditStagingPortTest each stage and commit, with the reply its
             script returns for that call, where call is the 0-based index of
             the call among that method's calls. A script returning undefined,
             or no script, MUST be Ok: the double's normal behaviour.
REQUIREMENT: Fail MUST fail with the port's own error (AuditWriteError,
             AuditStagingError) built by the double from the call it answers,
             carrying the reply's cause; a commit's error MUST carry the entry
             staged under its handle. Fail, Die, Interrupt, Never and Latch MUST
             record, stage or commit nothing.
REQUIREMENT: Die MUST die with the reply's defect; Interrupt MUST interrupt the
             call; Never MUST never settle; Latch MUST open its latch when the
             call starts and then never settle.
REQUIREMENT: Each double MUST log every call it receives, whatever the reply
             (calls(), stageCalls(), commitCalls()).
REQUIREMENT: The doubles MUST NOT join @qadi/core's port registry
             (ADR-QD-094): AuditPortReply is the doubles' own closed union.
```

```typescript
import { AuditPortReply, AuditStagingPortTest, AuditTrailPortTest } from "@qadi/audit";

// The first write fails, the second dies, and every later one is recorded.
const trail = AuditTrailPortTest({
  write: (_entry, call) =>
    call === 0
      ? AuditPortReply.Fail({ cause: "offline" })
      : call === 1
        ? AuditPortReply.Die({ defect: new Error("adapter bug") })
        : undefined,
});

// Staging works; every commit hangs.
const staging = AuditStagingPortTest({ commit: () => AuditPortReply.Never() });

void [trail.layer, trail.calls, trail.written, staging.layer, staging.commitCalls];
```

Before ARCH-62 the doubles took only `failWith`/`failStageWith`/`failCommitWith`,
a callback returning a hand-built error. Every other way a store misbehaves — a
defect, a self-interruption, a call that never settles, one that starts and then
hangs — was a hand-written port layer in the test that needed it, eleven of them,
and `driveExit.ts` kept its own mode table. The three options are removed; a
`Fail` reply replaces each, and the double builds the error. A hand-built audit
port layer or port error in a test is refused by `scripts/check-house-style.mjs`
(`AUDIT_HAND_LAYER_BUDGET`, and the audit errors in `PORT_DOUBLE_BUDGET`;
[ADR-QD-126](../decisions/126-an-audit-store-call-has-a-deadline.md)).

A commit of a handle the double never issued is answered with the entry of the most
recent `stage` call, whatever its reply; a scripted commit before any `stage` call
dies, since there is no entry to answer with.

## BEH-QD-252: Staging is best-effort, and provably non-observable in the happy path

> **Invariant:** [INV-QD-051](../invariants.md#inv-qd-051-staging-presence-or-absence-never-changes-the-committed-audit-entries)

```
REQUIREMENT: An AuditStagingError from stage() or commit() MUST NOT block or
             fail record() — the write (or the skip, while the breaker is
             open) proceeds exactly as it would have if AuditStagingPort had
             never been wired.
REQUIREMENT: record() MUST NOT call discard on AuditStagingPort — the port
             has no such method. A staged entry left uncommitted after a
             write failure is left alone, for the caller's own reconciliation.
REQUIREMENT: A commit() failure — a typed AuditStagingError or an unexpected
             defect alike — MUST be tracked (qadi_audit_staging_total,
             outcome commit_failed) rather than silently discarded with no
             trace at all.
REQUIREMENT: A stage() failure — a typed AuditStagingError or an unexpected
             defect alike — MUST be tracked (qadi_audit_staging_total,
             outcome failed or failed_open) exactly as a typed failure is,
             rather than unwinding past both outcomes unmetered.
REQUIREMENT: A staged entry whose trail write did not happen or failed SHOULD
             be reported at info, naming its evaluationId, and MUST NOT be
             reported as dropped: its staged copy is left for reconciliation.
REQUIREMENT: record() MUST give each record exactly one write outcome
             (AuditWriteOutcome), report it once, and, when
             AuditDecisionSinkOptions.onOutcome is set, call it once after
             the metrics and the log. A hook that throws MUST be logged and
             never fail the record (INV-QD-035).
```

"WAL" is deliberately not this port's name: `@qadi/audit` owns no storage of
its own, so it cannot promise database-WAL-style durability the way HexDi's
`createWriteAheadLog` falsely claimed to (its own docstring said entries
"survive logical process restart" — a plain in-memory `Map` never could).
`AuditStagingPort` is a durability *protocol* a caller with a real durable
staging store can plug into; a caller who does not wire one pays nothing and
observes nothing different.

`stage()`, like `write()` above, runs under `Effect.exit` rather than
`Effect.result` — the same reasoning `commit()`'s own `Effect.catchCause`
already applied to `commit_failed`, extended to `stage()`'s two outcomes
(`failed`, `failed_open`) instead of leaving them the one path in this
pipeline still blind to a defecting adapter.

The eleven outcomes, by what `record()` did (`Refused`, or a write result by a
staging result). `Lost` is in neither the trail nor staging; each row is one
leaf of `AuditWriteOutcome` and one arm of the projection in
`packages/audit/src/AuditWriteReport.ts`:

| Outcome | Entry | `writes_total` | `staging_total` | Log |
| ------- | ----- | -------------- | --------------- | --- |
| `Refused` | none | `encode_failed` | | `onRefused`, else a warning (core's report) |
| `Written.NotWired` | trail | `written` | | |
| `Written.StageFailed` | trail | `written` | `failed` | |
| `Written.Committed` | trail | `written` | `staged` | |
| `Written.CommitFailed` | trail | `written` | `staged`, `commit_failed` | warning: `audit staging commit failed: ...` |
| `WriteFailed.NotWired` | **Lost** | `write_failed` | | warning: `audit entry dropped: trail write failed and no staging port wired` |
| `WriteFailed.Staged` | staging only | `write_failed` | `staged` | info: `audit entry not written: trail write failed; its staged copy is left for reconciliation` |
| `WriteFailed.StageFailed` | **Lost** | `write_failed` | `failed` | warning: `audit entry dropped: trail write failed and staging failed` |
| `Skipped.NotWired` | **Lost** | `skipped_open` | `skipped_open` | warning: `audit entry dropped: circuit breaker open and no staging port wired` |
| `Skipped.Staged` | staging only | `skipped_open` | `staged` | info: `audit entry not written: circuit breaker open; its staged copy is left for reconciliation` |
| `Skipped.StageFailed` | **Lost** | `skipped_open` | `failed_open` | warning: `audit entry dropped: circuit breaker open and staging failed` |

Every log line annotates `evaluationId` only (INV-QD-104's reasoning). `onOutcome`
receives the same value with the encoded entry, which is how a deployment builds
the gap marker ADR-QD-056 leaves open: the library writes none.

## BEH-QD-253: Retention partitions entries, by construction

> **Invariant:** [INV-QD-053](../invariants.md#inv-qd-053-retained-and-purged-partition-entries), [INV-QD-101](../invariants.md#inv-qd-101-retention-never-selects-a-row-without-a-finite-age-past-a-valid-limit), [INV-QD-130](../invariants.md#inv-qd-130-a-purge-never-selects-a-row-its-archive-does-not-hold)

```
REQUIREMENT: For any entries, RetentionPolicy and now, the sets
             planRetention(...).retained and planRetention(...).expired MUST
             partition entries: their union is entries, unchanged and
             undeduplicated; their intersection is empty. planPurge(...).purge
             and planPurge(...).retain MUST partition entries the same way.
```

```
REQUIREMENT: An entry MUST be expired (and so purgeable) only if its `at` and
             `now` are finite, `maxAgeMs >= 0`, and `now - at > maxAgeMs`. An
             entry whose `at` is not finite (`NaN`, `±Infinity`) MUST be
             retained.
REQUIREMENT: planRetention(entries, policy, now) MUST return
             `RetentionInputInvalid` (naming `now` or `maxAgeMs` and the value)
             for a `now` that is not finite or a `maxAgeMs` that is `NaN` or
             negative, and otherwise a plan `{ retained, expired, undated }`
             with `undated` the retained entries whose `at` is not finite.
             `maxAgeMs = +Infinity` is valid and expires nothing. `expired`
             is an age report, not a purge selection.
REQUIREMENT: planPurge(entries, policy, now, archive) is the only function that
             returns rows to delete. A row MUST be in `purge` only if
             planRetention finds it expired AND the given VerifiedArchive holds
             it, counted: two structurally identical rows need two archived
             copies. An expired row the archive does not hold MUST be in
             `retain` and listed in `unarchived`. `undated` rows MUST be in
             `retain`. planPurge MUST refuse the input planRetention refuses.
REQUIREMENT: planPurge MUST NOT be callable without a VerifiedArchive, and a
             VerifiedArchive MUST be obtainable only from readAuditArchive.
```

Computed by `planRetention`, the one owner of "is this row past its age?",
rather than by independent `.filter()` calls that could drift out of agreement
with each other — retention/archival are pure functions and data,
caller-invoked and caller-scheduled, since `@qadi/audit` has no scheduler of its
own. Fail-closed for a deletion selector means retaining: a wrong retain keeps a
row too long, a wrong purge destroys evidence that may never have been
archived. "Archive before purge" is therefore a property of the types, not a
caller's duty: `planPurge` needs the evidence `readAuditArchive` produces from
the bytes a store handed back (ADR-QD-056, [INV-QD-130](../invariants.md#inv-qd-130-a-purge-never-selects-a-row-its-archive-does-not-hold)).
The age-only selectors `getPurgeableEntries` and `enforceRetention` were removed
in ARCH-38: each returned rows to delete with no evidence they were kept. A
caller that wants to be told a job is misconfigured reads the refusal.

What a `VerifiedArchive` is evidence of is narrow: the bundle decoded and holds
together, and it holds those rows. It is not evidence that the store is durable,
that the bytes are untampered, or that the retention period is adequate;
`@qadi/audit` owns no storage and offers no cryptographic proof
([ADR-QD-016](../decisions/016-gxp-out-of-scope.md)).

## BEH-QD-254: Sequence-integrity verification detects a gap or a duplicate, and trusts neither write order

> **Invariant:** [INV-QD-054](../invariants.md#inv-qd-054-verifysequenceintegrity-detects-every-gap-and-duplicate-sequence-number), [INV-QD-130](../invariants.md#inv-qd-130-a-purge-never-selects-a-row-its-archive-does-not-hold)

```
REQUIREMENT: verifySequenceIntegrity MUST fail SequenceIntegrityError for any
             two sequence numbers, sorted ascending, that are not exactly one
             apart — catching both a gap (a jump past the expected next
             number) and a duplicate (the same number twice).
REQUIREMENT: verifySequenceIntegrity and archiveAuditTrail MUST fail
             SequenceNumberInvalid, naming the first entry in the order given
             (index, sequenceNumber), when a sequenceNumber is not a safe
             integer — the domain decodeAuditEntry reads (Schema.Int) — and
             MUST do so before looking for a gap or a duplicate.
REQUIREMENT: An entry carrying no sequenceNumber MUST be ignored by
             verifySequenceIntegrity — sequencing is opt-in, assigned only by
             the caller's own store, never by @qadi/audit.
REQUIREMENT: archiveAuditTrail MUST store entries sorted by sequenceNumber,
             stably, before setting metadata.sequenceIntegrityVerified: true —
             never the caller-supplied array order verifySequenceIntegrity
             happens to tolerate.
REQUIREMENT: Entries carrying no sequenceNumber MUST follow every sequenced
             entry, in the order given; archiveAuditTrail MUST NOT order them
             by `at`. The archive claims only the order sequenceIntegrityVerified
             backs; time order is a reader's job (storedRecordOrder, ADR-QD-056).
REQUIREMENT: readAuditArchive(input) MUST read a stored bundle back and return
             a VerifiedArchive only if the envelope is a bundle, archiveVersion
             is "1", every entry decodes through decodeAuditEntry, the declared
             entryCount equals the number of entries, the sequence numbers have
             no gap or duplicate, the entries are in the order archiveAuditTrail
             writes (sequenced in number order, then unsequenced), and
             sequenceIntegrityVerified equals (sequenced count >= 2). Each
             failure MUST be its own ArchiveRefusal (Malformed,
             UnsupportedArchiveVersion, EntryNotDecodable, CountMismatch,
             SequenceBroken, NotInSequenceOrder, UnbackedClaim) in an
             ArchiveNotVerified. It MUST NOT sort or repair the bundle.
REQUIREMENT: readAuditArchive MUST accept every bundle archiveAuditTrail
             writes, once stored as JSON and parsed back. The archive order,
             the sequenced count with the claim it backs
             (sequenceIntegrityVerified equals sequenced count >= 2) and the
             first sequence gap or duplicate MUST each be computed once, by
             archiveFacts (ArchiveFacts.ts), which the writer builds from and
             the reader recomputes. The index NotInSequenceOrder reports MUST
             be the first entry that sorts before its predecessor in that
             order.
```

The writer and the reader used to state the order (a comparator, and a loop)
and the claim each on their own. Both now read them from one computation
([ADR-QD-110](../decisions/110-an-archives-facts-are-computed-once.md)).
`verifySequenceIntegrity` and `SequenceIntegrityError` keep their names and
are re-exported through `SequenceIntegrity.ts`.

`AuditEntry.sequenceNumber` is a `number` in TypeScript, but the codec reads
only a safe integer (`Schema.Int`, CCR-QD-186). The writer used to archive
`1.5` or `2 ** 53` and claim a verified sequence, and the reader then refused
the bundle as `EntryNotDecodable`, which blocks the purge it was written for.
Past `2 ** 53` the gap check is also blind, because `n + 1 === n` there and a
duplicate is not seen as one. `archiveFacts` now states the domain with the
codec's own `Schema.Int`, and the writer fails `SequenceNumberInvalid` before
any other check, so a bundle it writes is one the reader reads.

No `scopeId`-style grouping key, unlike HexDi's version: Qadi has no "scope"
concept in its domain model, so sequencing is a single flat, global
sequence, checked as one. `sequenceNumber` is never populated by
`@qadi/audit` itself — only the caller's own store has cross-restart
visibility into a real write order, the same constraint that shapes
`AuditStagingPort` ([BEH-QD-252](#beh-qd-252-staging-is-best-effort-and-provably-non-observable-in-the-happy-path)).

Named for the mechanism, not for what a compliance reviewer might infer from
a stronger name: this is gap-and-duplicate detection over caller-assigned
sequence numbers, with no per-entry hash and nothing linking one entry to the
next. An attacker able to modify already-persisted rows can renumber them
and pass verification — the check protects against accidental loss or
duplication in the caller's own store, not deliberate tampering.

## BEH-QD-255: No e-signature default ships — an unwired obligation already fails closed

```
REQUIREMENT: @qadi/audit MUST NOT export a default SignatureCapturePort
             implementation, including a no-op one.
```

`Qadi.enforce`'s existing behavior on an unwired obligation —
`UndischargedObligation` — already is the safe default; a `Noop` capture
service, the kind HexDi ships ("always validates successfully," for
non-regulated environments only), would only manufacture the risk of someone
forgetting to swap it out in one that is regulated. This is the specific
false-compliance affordance [ADR-QD-016](../decisions/016-gxp-out-of-scope.md)
rejected, applied to a single port rather than a whole subsystem.

A `SignatureLedger` (BEH-QD-326) is not a default capture: it is a store, and it
records only what a deployment's own `capture` returned. Its in-memory form,
`SignatureLedgerTest`, is a `...Test` double like `AuditTrailPortTest`.

## BEH-QD-256: A signature obligation handler calls `capture` exactly once, and the discharge record matches its outcome

> **Invariant:** [INV-QD-055](../invariants.md#inv-qd-055-signatureobligationhandler-calls-capture-exactly-once-and-the-obligationrecord-matches)

```
REQUIREMENT: signatureObligationHandler(port, meaning) MUST call port.capture
             exactly once per discharge, with a request derived from the
             discharged question and the obligations being discharged — never
             once per obligation in the array. The signer MUST be the subject
             the allow was decided for (`question.subject.id`), not an ambient
             lookup, and the request MUST carry `resourceId`
             (`resourceIdOf(question.resource)`), `action`, `resource` and
             `evaluationId`.
REQUIREMENT: A discharge whose question has a resource with no string `id`
             (absent, numeric, an object) MUST fail with
             `SignatureCaptureError` before `capture` is called, and MUST NOT
             record anything (`HandlerFailed`). A question with no resource at
             all MAY still record subject-global.
REQUIREMENT: A capture that returns a signature for a different signer or a
             different meaning than the request asked for MUST fail the
             discharge with `SignatureCaptureError`; it MUST NOT discharge the
             duty and MUST NOT be recorded.
REQUIREMENT: The ObligationRecord DecisionSink observes for that discharge
             MUST report Discharged exactly when capture succeeded, and
             HandlerFailed exactly when it failed — never the reverse, and
             never a third outcome for this path.
```

Signature capture is a condition of enforcement, so it is wired through
`Qadi.ts`'s `ObligationHandler` — the only mechanism that exists for
enforcement-time custom logic — never through `DecisionSink`. This is the
piece that makes `SignatureCapturePort` actually reachable, in contrast to
HexDi's `SignatureServicePort`, which is unwired the same way its WAL and
circuit breaker are: no reference anywhere in `guard.ts`'s real enforcement
path.

## BEH-QD-326: A signature captured for a discharged question answers that question, and no other

> **Invariant:** [INV-QD-120](../invariants.md#inv-qd-120-a-signature-recorded-for-a-discharge-is-keyed-by-the-question-it-discharged)
> **See:** [ADR-QD-105](../decisions/105-an-obligation-is-discharged-against-the-question-it-answered.md), [ADR-QD-117](../decisions/117-a-signature-ledger-is-a-keyed-store.md)

Obligation, capture, `SignatureHistory` and `hasSignature` used to be four
pieces that did not meet: the capture request carried no resource, so a flow that
stored what it captured stored it subject-wide. A default-scope `hasSignature`
then denied (it asks `(subjectId, resourceId)`), and a `scope: "Any"` one allowed
for every resource, wider than the signer attested.

```
REQUIREMENT: A signature the handler records through a `SignatureLedger` MUST
             be appended under `ledgerKeyOf(entry)`, the key of the signature's
             signer and the request's `resourceId`, the pair `SignatureHistory`
             is asked with; `signatureHistoryFromLedger` MUST read under
             `ledgerKeyOf(query)`. A resource-scoped `hasSignature` on the
             discharged resource MUST then find it; on any other resource MUST
             NOT; and a subject-global (`scope: "Any"`) one MUST NOT find a
             signature recorded for a resource.
REQUIREMENT: An adapter MUST answer `entriesAt(key)` with exactly the entries
             appended under `key`, compared byte for byte (no case folding,
             trimming or normalisation).
REQUIREMENT: `signatureHistoryFromLedger` MUST fail the read as
             `SignatureHistoryUnavailable` (cause `SignatureLedgerReadError`)
             when the ledger answers an entry stored under another key, or one
             whose signature's `signerId` is not the entry's `subjectId`; and
             when the ledger itself fails.
REQUIREMENT: A ledger that fails to record MUST fail the discharge
             (`HandlerFailed`), so enforcement is refused rather than proceeding
             as though the duty were met.
```

The ledger is a keyed store: `append(key, entry)` and `entriesAt(key)` over an
opaque `SignatureLedgerKey` only `ledgerKeyOf` mints, so an adapter has no query and
no nullable resource column to get wrong. `scope: "Any"` on a signature reads the
rows stored subject-wide, with **no** resource, never "ever, on any resource" as it
does for `hasActed` (BEH-QD-092); `explain()` says so. `ledgerKeyOf` is a persisted
format, `[1,"alice","doc-1"]`, frozen by a golden test (a resource-less pair is
`[1,"alice",null]`); it reads only the pair, so a query carrying the asker's
`meaning` or `signerRole` reads the same rows as one without.

A deployment whose e-signature system is itself its `SignatureHistory` needs no
ledger: `capture` persists where it reads, keyed from the request's `resourceId`
(the `capture` documentation states it as a MUST).

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  currentSubjectLayer,
  decide,
  EvaluationIdLive,
  guard,
  hasPermission,
  hasSignature,
  makeSubject,
  obligation,
  obliged,
  permission,
  portsLayer,
} from "@qadi/core";
import {
  signatureHistoryFromLedger,
  signatureObligationHandler,
  SignatureLedgerTest,
} from "@qadi/audit";
import type { SignatureCapturePortShape } from "@qadi/audit";

const approve = permission("doc", "approve");
const alice = makeSubject({ id: "alice", permissions: ["doc:approve"] });

// A real capture runs the ceremony; this one returns the signature it was asked for.
const port: SignatureCapturePortShape = {
  capture: (request) =>
    Effect.succeed({ signerId: request.signerId, signedAt: 0, meaning: request.meaning }),
  validate: () => Effect.succeed({ valid: true, validatedAt: 0 }),
};

const { ledger } = SignatureLedgerTest();

const services = Layer.mergeAll(
  portsLayer({ SignatureHistory: signatureHistoryFromLedger(ledger) }),
  EvaluationIdLive,
  currentSubjectLayer(alice),
);

const program = Effect.gen(function* () {
  // Approving doc-1 captures a signature and records it under (alice, doc-1).
  yield* guard(approve, obliged(obligation("sig.approve"), hasPermission(approve)), {
    onObligations: signatureObligationHandler(port, "approved", { ledger }),
  })({ id: "doc-1" }, () => Effect.void);

  const onDoc1 = yield* decide(hasSignature("approved"), { resource: { id: "doc-1" } });
  const onDoc2 = yield* decide(hasSignature("approved"), { resource: { id: "doc-2" } });
  return [onDoc1._tag, onDoc2._tag]; // → ["Allow", "Deny"]
}).pipe(Effect.provide(services));

void program;
```

## BEH-QD-339: A ledger adapter can be checked

> **Invariant:** [INV-QD-120](../invariants.md#inv-qd-120-a-signature-recorded-for-a-discharge-is-keyed-by-the-question-it-discharged)
> **See:** [ADR-QD-117](../decisions/117-a-signature-ledger-is-a-keyed-store.md)

A keyed store has one obligation, equality on an opaque key, and a type cannot
rule out a store whose collation folds case, trims trailing spaces or normalises
Unicode. A deployment runs a check against its real store.

```
REQUIREMENT: `checkSignatureLedger(ledger, options?)` MUST append a fixed table
             of adversarial pairs through `ledgerKeyOf` and read each back,
             and MUST return `[]` for a conformant store, a `Foreign` violation
             for each row answered under a pair it was not written under, and
             a `Missing` violation for each row not answered under its own. A
             store failure MUST be the effect's error, not a violation.
REQUIREMENT: `checkSignatureHistoryScoping(seed, options?)` MUST seed rows
             through the caller's `seed`, query every pair of the table, and
             report the same two violations, for any `SignatureHistory`
             including one with no ledger behind it.
REQUIREMENT: A row the store answers that the fixture did not write (another
             tenant's row in a shared table) MUST NOT be reported as a
             violation.
REQUIREMENT: Neither check is a default: nothing runs them automatically, and
             they prove neither durability, concurrency nor the signer's
             identity or intent (BEH-QD-255).
```

`options.namespace` prefixes the fixture subjects so the check can run against a
shared, non-empty table.

```typescript
import * as Effect from "effect/Effect";
import { checkSignatureLedger } from "@qadi/audit";
import type { SignatureLedgerEntry, SignatureLedgerKey, SignatureLedgerShape } from "@qadi/audit";

// An adapter over a Map: the whole contract is equality on an opaque key.
const rows = new Map<SignatureLedgerKey, Array<SignatureLedgerEntry>>();
const ledger: SignatureLedgerShape = {
  name: "map-ledger",
  append: (key, entry) =>
    Effect.sync(() => {
      rows.set(key, [...(rows.get(key) ?? []), entry]);
    }),
  entriesAt: (key) => Effect.sync(() => [...(rows.get(key) ?? [])]),
};

const program = Effect.gen(function* () {
  const violations = yield* checkSignatureLedger(ledger, { namespace: "ci-run-1" });
  return violations.length; // → 0 for a conformant store
});

void program;
```

## BEH-QD-257: Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  currentSubjectLayer,
  evaluate,
  EvaluationServicesNone,
  hasPermission,
  makeSubject,
  permission,
} from "@qadi/core";
import { AuditDecisionSinkLive, AuditTrailPortTest } from "@qadi/audit";

const read = permission("doc", "read");
const alice = makeSubject({ id: "alice", permissions: ["doc:read"] });

const { layer: auditTrail, written } = AuditTrailPortTest();

// AuditDecisionSinkLive() itself requires AuditTrailPort — provided by a
// second Effect.provide, not merged alongside it: Layer.mergeAll combines
// what layers provide, it does not thread one's output into a sibling's
// unmet requirement the way a second Effect.provide does.
const services = Layer.mergeAll(currentSubjectLayer(alice), EvaluationServicesNone);

const program = evaluate(hasPermission(read)).pipe(
  Effect.provide(services),
  Effect.provide(AuditDecisionSinkLive()),
  Effect.provide(auditTrail),
);

// The evaluation and the audit write both happen from this one call —
// nothing separate had to be remembered.
void program;
// → an Allow decision; written().length === 1 once program has run.
```

---

_Previous: [32 — Custom Predicates](./32-custom-predicates.md)_
