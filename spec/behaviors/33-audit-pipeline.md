# 33 — Audit Pipeline

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-33                                    |
> | Revision       | 1.33                                           |
> | Effective Date | 2026-10-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.33 (2026-11-26): BEH-QD-781 to BEH-QD-785 new: one admission step, each entry point refuses what it refuses, the sequence check's span opens only for admitted rows, NowNotFinite shared by both refusal enums, maxAgeMs read once; BEH-QD-722 restated; BEH-QD-253 and BEH-QD-254 link BEH-QD-781 (ADR-QD-202, ARCH-136, CCR-QD-481)<br>1.32 (2026-11-24): BEH-QD-253, BEH-QD-254 and BEH-QD-722: a refusal is a closed tagged enum, and entries that is not a list is refused; keyMaterial is read once (ADR-QD-190, CCR-QD-469)<br>1.31 (2026-11-24): BEH-QD-254 and BEH-QD-722: the writer refuses a keyMaterial its reader would refuse (ADR-QD-190, CCR-QD-469)<br>1.30 (2026-11-24): BEH-QD-253, BEH-QD-254 and BEH-QD-722 state the run-time refusal of an entry the codec did not make (ADR-QD-190, CCR-QD-469)<br>1.29 (2026-11-23): BEH-QD-250's listing declares AuditEntry as the codec-made type; BEH-QD-312 states the envelope-first order; BEH-QD-253 drops undated; BEH-QD-254 names ArchiveInputInvalid and drops SequenceNumberInvalid (ADR-QD-190, CCR-QD-469)<br>1.28 (2026-11-23): BEH-QD-721 and BEH-QD-722 new: a stored row is read envelope first, and the archive writer refuses a non-finite now and writes key material as declared (ADR-QD-190, CCR-QD-469)<br>1.27 (2026-11-19): the archive's time order is sinkRecordOrder (ARCH-105, CCR-QD-449)<br>1.26 (2026-11-19): BEH-QD-625, a deep unknown key inside an audit row's record is ignored (ADR-QD-170)<br>1.25 (2026-11-16): BEH-QD-577: encodeRefusalAnnotations carries no value from the record, but qadi.path names its keys (INV-QD-104, CCR-QD-439)<br>1.24 (2026-11-16): BEH-QD-578: the unwritten line's wording reads the row too (ARCH-95, CCR-QD-439)<br>1.23 (2026-11-16): BEH-QD-577: describeEncodeRefusal may carry caller text, so it is for diagnosis, not a log line (ARCH-95, CCR-QD-439)<br>1.22 (2026-11-16): BEH-QD-576 to 580 new; BEH-QD-249 and 250 restated, the audit refusal is core's SinkRecordNotEncodable and carries no reason; BEH-QD-252 note (ARCH-95, ADR-QD-161, CCR-QD-439)<br>1.21 (2026-11-15): BEH-QD-561 — a failureThreshold is a positive safe integer; a resetTimeoutMs is whole and within the safe integers, a raw non-whole number refused (ARCH-92, CCR-QD-436)<br>1.20 (2026-11-15): BEH-QD-561 new — an option that cannot work is refused when built; BEH-QD-249 the layer's error; BEH-QD-251 one transition function; BEH-QD-379 a zero deadline is refused (ARCH-92, CCR-QD-436)<br>1.19 (2026-11-12): BEH-QD-254 lists ArchiveRefusal.TooDeep; BEH-QD-312 reads a row through untrustedDecoder; BEH-QD-489 new (ARCH-78, CCR-QD-421)<br>1.18 (2026-11-10): BEH-QD-249 gains storeCallTimeout; BEH-QD-251 — the sink's own deadline is a failure, a caller's interruption still is not; BEH-QD-379 (a store call is bounded; Duration.zero pinned; an uninterruptible adapter is not bounded) and BEH-QD-380 (the doubles' script; failWith, failStageWith and failCommitWith removed) added (ARCH-62, ADR-QD-126, CCR-QD-404)<br>1.17 (2026-11-10): BEH-QD-256 — a resource with no string id refuses the discharge before capture. BEH-QD-326 — the ledger is a keyed store read through ledgerKeyOf; a foreign row fails the read; scope "Any" reads subject-wide rows. BEH-QD-339 added — a ledger adapter can be checked (ARCH-59, ADR-QD-117, INV-QD-120, CCR-QD-395)<br>1.16 (2026-11-08): BEH-QD-254 — the writer and the reader compute an archive's order, claim and sequence break once, and the reader accepts every bundle the writer writes; a sequence number outside the safe integers fails `SequenceNumberInvalid` at the writer (code review WR-01) (ARCH-48, ADR-QD-110, CCR-QD-387)<br>1.15 (2026-10-08): BEH-QD-312 — a stored row whose record contradicts its own trace is refused as `Inconsistent` (ADR-QD-106, INV-QD-170, CCR-QD-301)<br>1.14 (2026-10-08): BEH-QD-256 — the capture request is derived from the discharged question (signer, `resourceId`, `action`, `resource`, `evaluationId`), not the ambient subject, and a capture that returns a signature for a different signer or meaning fails the discharge. BEH-QD-255 — a ledger is a store, not a capture. BEH-QD-326 — a signature captured for a discharged question answers that question's `hasSignature`, and no other (`SignatureLedger`; INV-QD-120, ADR-QD-105, CCR-QD-220)<br>1.13 (2026-10-08): BEH-QD-253 — a purge selects only rows a `VerifiedArchive` holds (`planPurge`); `planRetention` reports `expired`; `getPurgeableEntries` and `enforceRetention` removed. BEH-QD-254 — `readAuditArchive` reads a stored bundle back, each failure its own `ArchiveRefusal` (ARCH-38, CCR-QD-230)<br>1.12 (2026-10-08): BEH-QD-249 gains `AuditDecisionSinkOptions.onOutcome`. BEH-QD-251 — an entry neither written nor staged is reported by a warning naming its evaluation id, including after a failed trail write; `qadi_audit_writes_total` counts every record received exactly once, breaker-refused ones as `skipped_open`. BEH-QD-252 — a staged entry that was not written is reported at info; the eleven outcomes are tabled; `qadi_audit_entries_lost_total` (INV-QD-106, ADR-QD-056, CCR-QD-204)<br>1.11 (2026-10-07): BEH-QD-250 — a refused record is reported (`AuditDecisionSinkOptions.onRefused`, else a warning naming the refusal, its path and the evaluation id), never dropped silently, and a hook that throws never fails the record; `AuditEntryNotEncodable` carries `evaluationId` and its `reason` is core's `describeEncodeRefusal`. BEH-QD-249's signature fence gains `onRefused` and its `resetTimeoutMs` is `Duration.Input` as the code has it (CCR-QD-193)<br>1.10 (2026-10-07): BEH-QD-253 — retention is `planRetention`, which purges only with a finite age past a valid limit and refuses an impossible `now` or `maxAgeMs`; a non-finite `at` is retained and reported `undated`. BEH-QD-312 — a non-finite `at` and a non-integer `sequenceNumber` are `Malformed` (INV-QD-101, ADR-QD-095 amendment, CCR-QD-186)<br>1.9 (2026-10-07): BEH-QD-254 — entries carrying no `sequenceNumber` follow every sequenced entry in the order given, and are never ordered by `at` (pins what `archiveAuditTrail` already did; CCR-QD-185)<br>1.8 (2026-10-06): BEH-QD-312 — `decodeAuditEntry` reads wire version 2 only: a pre-0.10 row is refused as `UnsupportedVersion`, reported, never upgraded, and migrated with 0.10.x; `AuditEntry.record` is version-2 bytes (ADR-QD-096 amendment, CCR-QD-182)<br>1.7 (2026-10-05): BEH-QD-312 — `decodeAuditEntry` applies every check `decodeSinkRecord` applies, and reads rows of both wire versions; the row schema alone is not a reader. BEH-QD-250 — rows are written as wire version 2 (ADR-QD-096, CCR-QD-180)<br>1.6 (2026-10-05): BEH-QD-250 restated — a row's `record` is `encodeSinkRecord`'s encoded wire, byte-identical to the stream and forwarding; the refusal carries core's `EncodeRefusal`; a `cause` is never a reason to refuse. BEH-QD-312 — `decodeAuditEntry`, the guarded reader (ADR-QD-095, CCR-QD-179)<br>1.5 (2026-10-05): BEH-QD-250 widened — the guard walks the outcome as well: a resolver error's `cause` carrying a reference cycle or a `BigInt` used to pass it and then throw at the store's `JSON.stringify`, which counted as a write failure and could trip the breaker; `Map`/`Set`/`RegExp`/binary data are refused rather than persisted as `{}` (CCR-QD-178)<br>1.4 (2026-10-04): BEH-QD-251 — the half-open probe claim is released on every exit including interruption during staging; a failure settling on an already-`Open` breaker is a no-op; outcomes count only toward the window that admitted them; the interruption prose corrected (`Effect.exit` folds a typed failure, a defect and an adapter's self-interruption, not a caller's interruption) (CCR-QD-154)<br>1.3 (2026-09-09): BEH-QD-250 widened — `encodeAuditEntry` guarded only `resource` via `isJsonSafe`, not the whole record; `policy`'s `HasCustom.params` (ADR-QD-055's escape hatch) is a second caller-supplied `unknown` a `SinkRecord` can carry, and a circular or `BigInt`-valued one sailed past the narrow guard uncaught. Now guarded via `isRecordJsonSafe` (`SinkCodec.ts`), which walks `resource` **and** `policy` (issue #104)<br>1.2 (2026-09-07): BEH-QD-250 and BEH-QD-251 widened — `isJsonSafe` walks iteratively so a merely-deep (non-cyclic) value no longer risks the same stack exhaustion the circular-reference case was already guarded against; `stage()`/`write()` now run under `Effect.exit` rather than `Effect.result`, so a defect or interruption from either — not just a typed `AuditWriteError`/`AuditStagingError` — reaches the breaker and the metrics the same way a typed failure already did (CCR-QD-113)<br>1.1 (2026-09-06): BEH-QD-254 renamed — `verifyChainIntegrity`/`ChainIntegrityError` read as cryptographic tamper-evidence to a compliance reviewer and are not; renamed to `verifySequenceIntegrity`/`SequenceIntegrityError` (CCR-QD-094)<br>1.0 (2026-08-25): Initial release (CCR-QD-086) |

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
  readonly onRefused?: (refusal: SinkRecordNotEncodable) => void;
  readonly onOutcome?: (outcome: AuditWriteOutcome) => void;
}
export const AuditDecisionSinkLive: (
  options?: AuditDecisionSinkOptions,
) => Layer.Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>;
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

> **Amended in CCR-QD-436 (ARCH-92).** The layer's error was `never`: an option that
> cannot work is now refused when the layer is built
> ([BEH-QD-561](#beh-qd-561-a-breaker-or-audit-sink-option-that-cannot-work-is-refused-when-it-is-built)).

> **Amended in CCR-QD-439 (ARCH-95).** `onRefused` receives `@qadi/core`'s
> `SinkRecordNotEncodable` ([BEH-QD-576](#beh-qd-576-an-audit-refusal-is-cores-sinkrecordnotencodable)).

## BEH-QD-250: A record with no safe durable representation refuses, cleanly, rather than approximating or crashing

> **Amended by [ADR-QD-190](../decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md) (CCR-QD-469).** `AuditEntry` is a type
> only the codec makes ([INV-QD-400](../invariants.md#inv-qd-400-an-audit-row-is-made-only-by-its-codec)),
> and the module exports no schema value for it.

```ts
declare class AuditEntry {
  private readonly nominal: never;
  readonly record: SinkRecordJson;
  readonly sequenceNumber: number | undefined;
}
export type { AuditEntry };
export const encodeAuditEntry: (record: SinkRecord) => Effect<AuditEntry, SinkRecordNotEncodable>;
```

```
REQUIREMENT: encodeAuditEntry MUST produce the row through `@qadi/core`'s
             `encodeSinkRecord`, so a row's `record` is the encoded wire:
             `JSON.stringify(entry.record)` MUST equal the decision stream's
             frame data and forwarding's `send` value for the same record.
REQUIREMENT: encodeAuditEntry MUST fail with `@qadi/core`'s
             SinkRecordNotEncodable, exactly as `encodeSinkRecord` returns it,
             carrying the `EncodeRefusal` and its path, for a record carrying anywhere a
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
REQUIREMENT: The refusal's `evaluationId` MUST be the refused record's. Its
             sentence is `@qadi/core`'s `describeEncodeRefusal(refusal)`,
             computed only there: the refusal carries no `reason` field.
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
value from the record; core's sentence (`describeEncodeRefusal`) can carry caller text
(a throwing getter's message) and so is for a caller holding the error, not for a log.

A property whose value is `undefined` is absence — JSON drops the key — not a
refusal; a valid `Date` is persisted as its ISO string (the named normalisations
of [INV-QD-096](../invariants.md#inv-qd-096-whatever-the-record-codec-emits-it-accepts)).

> **Amended in CCR-QD-439 (ARCH-95).** The audit package's own refusal class is gone:
> the refusal is core's, and the default line is unchanged
> ([BEH-QD-576](#beh-qd-576-an-audit-refusal-is-cores-sinkrecordnotencodable), [BEH-QD-577](#beh-qd-577-a-refused-records-default-line-is-cores-report-and-its-sentence-is-cores-to-compute), [ADR-QD-161](../decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md)).

## BEH-QD-576: An audit refusal is core's `SinkRecordNotEncodable`

> **Invariant:** [INV-QD-342](../invariants.md#inv-qd-342-an-audit-refusal-is-cores-one-sinkrecordnotencodable)

```
REQUIREMENT: encodeAuditEntry MUST fail with `@qadi/core`'s
             SinkRecordNotEncodable exactly as `encodeSinkRecord` returns it;
             `onRefused` (AuditDecisionSinkOptions, AuditWriteEmitOptions) and
             AuditWriteOutcome.Refused.refusal MUST be typed with it;
             `@qadi/audit` MUST NOT declare an error of its own for a refusal,
             and the refusal MUST NOT carry a `reason`.
```

It is the same class `decisionSinkForwarding` and `DecisionLogHttp` report, so a
consumer handles one tag for a refusal across core, audit and http. The audit
package once declared its own class around it and built the sentence into a
`reason` field on the strength of an ADR-QD-054 citation that was a misreading
([ADR-QD-161](../decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md)).
Pinned by `AuditRefusal.tst.ts` (four type pins) and `AuditEntry.test.ts`.

## BEH-QD-577: A refused record's default line is core's report, and its sentence is core's to compute

```
REQUIREMENT: Without `onRefused`, a refused record MUST be logged once at Warn by
             `@qadi/core`'s `reportEncodeRefusal` with the message "qadi/audit: a
             decision record could not be encoded for the audit trail; no row was
             written", annotated `qadi.refusal`, `qadi.path` and `evaluationId` and
             nothing else, and MUST NOT carry the sentence.
REQUIREMENT: With `onRefused`, no line is logged and the hook receives the
             refusal; a hook that wants the sentence calls
             `describeEncodeRefusal(e.refusal)`, which may carry caller text
             and so is for diagnosis, not a log line (INV-QD-104); a hook
             that logs annotates `encodeRefusalAnnotations(e)`, which carries
             no value from the record, though `qadi.path` is made of the
             record's own keys (INV-QD-104's one residue).
REQUIREMENT: `qadi_audit_writes_total{outcome="encode_failed"}` MUST increment
             either way.
```

The default line is unchanged from the phase base, byte for byte; the only thing
that moved is who computes the sentence (core, on demand, rather than the audit
package at refusal time). Pinned by `AuditWriteOutput.test.ts` (the `Refused`
rows).

## BEH-QD-312: A stored row is read back through a guard

> **Invariant:** [INV-QD-097](../invariants.md#inv-qd-097-the-record-codec-is-total)
> **See:** [BEH-QD-721](#beh-qd-721-a-stored-row-is-read-envelope-first)

> **Amended by [ADR-QD-190](../decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md) (CCR-QD-469).** The row is read envelope
> first, then its record.

```ts
export const decodeAuditEntry: (
  input: unknown,
) => Result<{ readonly entry: AuditEntry; readonly record: SinkRecord }, SinkRecordNotDecodable>;
```

```
REQUIREMENT: decodeAuditEntry MUST decode the row as untrusted first, through
             `@qadi/core`'s `untrustedDecoder` with `record` unwalked (the
             record is guarded from its own root by the record's decoder),
             and then read the row's record through `@qadi/core`'s
             `decodeSinkRecordWithJson` — depth-guarded — and MUST return a
             typed refusal, never throw, for any input.
REQUIREMENT: An excess property, a missing record, or a row that is not an
             object MUST be `Malformed` with the strict decoder's own message,
             and a row nested past `MAX_DECODE_DEPTH` outside its record MUST be
             `DecodeRefusal.TooDeep`.
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

A schema on its own is a description of a row, not a reader: decoded with
`Schema`'s default options it strips a typo'd field inside the embedded policy
and accepts a record naming no outcome (ARCH-15 C10), which is the silent loss
ADR-QD-002 exists to rule out. `AuditEntry` has no schema value, so a stored row
is re-parsed by `decodeAuditEntry` and by nothing else, and it is the one route a
store's sequence number reaches a row: `decodeAuditEntry({ record,
sequenceNumber })`.

A row is re-parsed later, by a compliance review, a query tool or another
process — the condition ADR-QD-002 names for a schema-derived type. Decoding a
row with a schema alone died with a `RangeError` on a stored policy nested
60,000 levels deep. `decodeAuditEntry` is the guarded reader, and returns the
rebuilt record beside the row so a reader does not decode twice.

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

> **Amended in CCR-QD-436 (ARCH-92).** Every transition is now one pure function,
> `step`, which `run` applies inside one `Ref.modify` per event, so the atomicity
> requirement above holds by construction rather than by five bodies each
> remembering it. The generation's increment is written once, where a status change
> is built, so a transition is announced exactly when the status changed
> ([INV-QD-335](../invariants.md#inv-qd-335-a-circuit-breakers-generation-increments-exactly-when-its-status-changes),
> [ADR-QD-158](../decisions/158-the-breakers-rules-are-one-transition-function.md)).
> A refusal when the breaker is built (`InvalidAuditSinkOption`,
> [BEH-QD-561](#beh-qd-561-a-breaker-or-audit-sink-option-that-cannot-work-is-refused-when-it-is-built))
> is not an error for a tripped breaker, so the no-public-error requirement stands.

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
REQUIREMENT: A storeCallTimeout that is not a positive duration — zero,
             negative, NaN, -Infinity or malformed — MUST be refused when the
             layer is built (BEH-QD-561).
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

**A zero deadline is refused, not pinned.** A zero deadline failed every store call at
once, so every record was `WriteFailed` and the breaker tripped from configuration
alone: the sink refuses it when the layer is built
([BEH-QD-561](#beh-qd-561-a-breaker-or-audit-sink-option-that-cannot-work-is-refused-when-it-is-built)).
`Duration.infinity` is still no deadline.

> **Amended in CCR-QD-436 (ARCH-92).** This paragraph read: "**`Duration.zero` is
> pinned, not chosen.** With a zero deadline the store call starts — a `Latch`
> reply's latch is open afterwards — and then fails at once, with no clock movement:
> the record is `WriteFailed`."
> ([ADR-QD-158](../decisions/158-the-breakers-rules-are-one-transition-function.md)).

**The limit.** The deadline is `Effect.timeoutOrElse`'s, the same as core's
`…TimingOut` port wrappers: the store call is interrupted at the deadline and
waited for. An adapter that makes itself uninterruptible is not bounded by
`storeCallTimeout`.

## BEH-QD-561: A breaker or audit sink option that cannot work is refused when it is built

> **Invariant:** [INV-QD-052](../invariants.md#inv-qd-052-once-a-circuit-breaker-trips-write-is-never-attempted-again-until-reset)

```ts
export class InvalidAuditSinkOption extends Data.TaggedError("InvalidAuditSinkOption")<{
  readonly option: "failureThreshold" | "resetTimeoutMs" | "storeCallTimeout";
  readonly received: Duration.Input;
}> {}
export const makeCircuitBreaker: (
  options: CircuitBreakerOptions,
) => Effect.Effect<CircuitBreaker, InvalidAuditSinkOption>;
export const AuditDecisionSinkLive: (
  options?: AuditDecisionSinkOptions,
) => Layer.Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>;
```

```
REQUIREMENT: makeCircuitBreaker MUST refuse a failureThreshold that is not a
             positive safe integer, and a resetTimeoutMs that is not a finite,
             positive, whole number of milliseconds no larger than
             Number.MAX_SAFE_INTEGER — a malformed duration and a raw number
             that is not whole (1.0000000001) included — with
             InvalidAuditSinkOption carrying the option and the value received.
REQUIREMENT: AuditDecisionSinkLive MUST refuse a storeCallTimeout that is not a
             positive duration, and MUST accept Duration.infinity (BEH-QD-379).
REQUIREMENT: The refusal MUST be a failure of the layer, never a defect and
             never a breaker that is built.
REQUIREMENT: Every default MUST be accepted.
```

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { AuditDecisionSinkLive, AuditTrailPortTest } from "@qadi/audit";

// A threshold of NaN built a breaker that never opened, because
// `consecutiveFailures >= NaN` is always false. It is refused when the layer is built.
const sink = AuditDecisionSinkLive({ failureThreshold: Number.NaN }).pipe(
  Layer.provide(AuditTrailPortTest().layer),
);

const program = Effect.scoped(Layer.build(sink)).pipe(
  Effect.map(() => "built"),
  Effect.catchTag("InvalidAuditSinkOption", (refused) => Effect.succeed(refused.option)),
);

void program;
```

The options are deployment configuration, often read from the environment, so a
composition must be able to report a bad one: that is why a refusal is a typed
error here, where
[BEH-QD-166](./21-decision-cache.md#beh-qd-166-capacity-bounds-the-cache-validated-at-construction)
makes a bound written as a constant in code a defect
([ADR-QD-158](../decisions/158-the-breakers-rules-are-one-transition-function.md)).
`makeCircuitBreaker` checks its own two options, so every breaker is valid by
construction, and the sink checks `storeCallTimeout`.

`received` is the raw input, not its decoded form, because `NaN` decodes to a zero
duration and would be reported as `0`. `Duration.infinity` is the one non-finite
value accepted, for `storeCallTimeout` only: it is the documented opt-out from the
deadline.

The tests are `packages/audit/test/CircuitBreakerOptions.test.ts` (each refused and
accepted value, through the breaker and through the layer) and
`packages/audit/test/AuditDecisionSinkLive.tst.ts` (the layer's type).

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

> **Amended in CCR-QD-439 (ARCH-95).** The Entry column's Lost and staging only, the
> `qadi_audit_entries_lost_total` label and the Log column's warning or info for the
> six unwritten rows are one row per staging variant ([BEH-QD-578](#beh-qd-578-one-row-per-unwritten-staging-decides-whether-the-entry-is-lost));
> `Written.CommitFailed` and `Refused` warn without being lost ([BEH-QD-579](#beh-qd-579-the-spans-durability-the-lost-counter-and-the-unwritten-lines-level-agree-on-every-leaf)).

## BEH-QD-578: One row per unwritten staging decides whether the entry is lost

> **Invariant:** [INV-QD-341](../invariants.md#inv-qd-341-an-unwritten-audit-entry-is-lost-exactly-when-its-stagings-row-says-so)

```
REQUIREMENT: Each UnwrittenStaging variant MUST have exactly one row:
             NotWired is Lost with the word not_wired; Staged is StagingOnly
             with no word; StageFailed is Lost with the word failed. The row is
             typed so that a Lost row carries its word and a StagingOnly row
             carries none.
REQUIREMENT: `durabilityOf`, the `qadi_audit_entries_lost_total` label and the
             unwritten line's level and wording MUST be read from that row: a
             Lost row's line says "audit entry dropped" and names its word's
             clause, a StagingOnly row's says "audit entry not written" and that
             the staged copy is left. A fourth variant MUST be a compile error
             at the row's reader.
```

Before ARCH-95 the same fact was written three times, in `durabilityOf`, in the
lost label and in the line's level, and they agreed by accident
([ADR-QD-161](../decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md)).
The row (`UnwrittenRow.ts`) is package-private. Pinned by `UnwrittenRow.test.ts`
and `UnwrittenRow.tst.ts`.

## BEH-QD-579: The span's durability, the lost counter and the unwritten line's level agree on every leaf

> **Invariant:** [INV-QD-341](../invariants.md#inv-qd-341-an-unwritten-audit-entry-is-lost-exactly-when-its-stagings-row-says-so)

```
REQUIREMENT: For each of the eleven leaves of AuditWriteOutcome, `durabilityOf`
             MUST be "Lost" exactly when a `qadi_audit_entries_lost_total`
             series increments and exactly when the span's
             `qadi.audit.durability` is "Lost".
REQUIREMENT: Over the six unwritten leaves (WriteFailed and Skipped, each by
             three stagings), the same MUST hold of the line: it is a warning
             exactly when the entry is Lost.
REQUIREMENT: Written.CommitFailed (durability Trail) and Refused (durability
             Refused) MUST warn without being lost.
```

The warning leg is scoped to the six unwritten leaves because two others warn for
a different reason: a failed commit is the staging store's bookkeeping, and a
refusal is reported, not lost (the entry never existed). Pinned by
`AuditLostAgreement.test.ts` (nineteen rows).

## BEH-QD-580: The stage result is a closed union, and every branch on an outcome is exhaustive

```
REQUIREMENT: The stage result MUST be a closed union in which only Staged carries
             `commit`.
REQUIREMENT: The written staging MUST be chosen by an exhaustive match over it
             (NotWired, StageFailed, or the commit, then Committed or
             CommitFailed on any cause); an unwritten outcome's `staging` MUST
             carry only its tag.
REQUIREMENT: The evaluation id, the outcome path and the refusal dispatch MUST
             be exhaustive matches, so a new variant is a compile error.
```

No output changed. Pinned by `AuditWriteOutput.test.ts` (the unwritten leaves'
staging keys) and `AuditWriteOutcome.test.ts` (the path per leaf).

## BEH-QD-253: Retention partitions entries, by construction

> **Invariant:** [INV-QD-053](../invariants.md#inv-qd-053-retained-and-purged-partition-entries), [INV-QD-101](../invariants.md#inv-qd-101-retention-never-selects-a-row-without-a-finite-age-past-a-valid-limit), [INV-QD-130](../invariants.md#inv-qd-130-a-purge-never-selects-a-row-its-archive-does-not-hold)

> **Amended by [ADR-QD-190](../decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md) (CCR-QD-469).** A row's `at` is finite
> because only the codec makes a row ([INV-QD-400](../invariants.md#inv-qd-400-an-audit-row-is-made-only-by-its-codec)),
> so a plan holds `retained` and `expired` alone. A list holding a value the codec did not make, which a
> store client's `any` and a JavaScript caller can pass, is refused as `RetentionInputInvalid` with the refusal
> `EntryNotMadeByCodec`, and `entries` that is not a list with `EntriesNotAList` (2026-11-24).
> The step that refuses them, and the order `now`, `maxAgeMs`, rows, are [BEH-QD-781](#beh-qd-781-one-admission-step-checks-a-hosts-batch-in-one-order-and-every-entry-point-calls-it-before-any-work-of-its-own).

```
REQUIREMENT: For any entries, RetentionPolicy and now, the sets
             planRetention(...).retained and planRetention(...).expired MUST
             partition entries: their union is entries, unchanged and
             undeduplicated; their intersection is empty. planPurge(...).purge
             and planPurge(...).retain MUST partition entries the same way.
```

```
REQUIREMENT: An entry MUST be expired (and so purgeable) only if its `at` and
             `now` are finite, `maxAgeMs` is a number `>= 0`, and
             `now - at > maxAgeMs`. A
             row's `at` is finite because only the codec makes a row
             (INV-QD-400).
REQUIREMENT: planRetention(entries, policy, now) MUST return
             `RetentionInputInvalid` with the refusal `NowNotFinite { value }`
             for a `now` that is not finite or `MaxAgeInvalid { value }` for a
             `maxAgeMs` that is not a number from zero up: `NaN`, a negative
             number, or a value that is not a number at all, which is never
             converted (`value` the value given),
             then `EntriesNotAList { value }` for `entries` that is not a list
             (`value` the value given), then
             `EntryNotMadeByCodec { index }`, `index` the index of the first
             entry the codec did not make, and otherwise a plan
             `{ retained, expired }`.
             `maxAgeMs = +Infinity` is valid and expires nothing. `expired`
             is an age report, not a purge selection.
REQUIREMENT: planPurge(entries, policy, now, archive) is the only function that
             returns rows to delete. A row MUST be in `purge` only if
             planRetention finds it expired AND the given VerifiedArchive holds
             it, counted: two structurally identical rows need two archived
             copies. An expired row the archive does not hold MUST be in
             `retain` and listed in `unarchived`. planPurge MUST refuse the input
             planRetention refuses.
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

> **Invariant:** [INV-QD-054](../invariants.md#inv-qd-054-verifysequenceintegrity-detects-every-gap-and-duplicate-sequence-number), [INV-QD-130](../invariants.md#inv-qd-130-a-purge-never-selects-a-row-its-archive-does-not-hold), [INV-QD-399](../invariants.md#inv-qd-399-every-archive-the-writer-returns-is-read-back-by-its-reader)

> **Amended by [ADR-QD-190](../decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md) (CCR-QD-469).** The writer fails
> `ArchiveInputInvalid` and then `SequenceIntegrityError`, and a row's number is a
> safe integer because the codec decoded it
> ([BEH-QD-722](#beh-qd-722-the-archive-writer-refuses-a-non-finite-now-and-writes-key-material-as-declared)).
> `entries` that is not a list is refused as `ArchiveInputInvalid` with the refusal `EntriesNotAList`, and an entry
> the codec did not make with `EntryNotMadeByCodec` and its index, by the writer and by `verifySequenceIntegrity`
> alike (2026-11-24). Both are refused by the admission step before any sequence fact is computed
> ([BEH-QD-781](#beh-qd-781-one-admission-step-checks-a-hosts-batch-in-one-order-and-every-entry-point-calls-it-before-any-work-of-its-own)).

```
REQUIREMENT: verifySequenceIntegrity MUST fail SequenceIntegrityError for any
             two sequence numbers, sorted ascending, that are not exactly one
             apart — catching both a gap (a jump past the expected next
             number) and a duplicate (the same number twice).
REQUIREMENT: A row's sequenceNumber MUST be a safe integer or absent, because
             only `decodeAuditEntry` gives a row a number and it refuses any
             other (`Malformed`, `Schema.Int`), so verifySequenceIntegrity and
             archiveAuditTrail fail SequenceIntegrityError for the sequence
             alone.
REQUIREMENT: archiveAuditTrail MUST fail `ArchiveInputInvalid` for a `now` that
             is not finite, for a `keyMaterial` its reader would refuse, and for
             the first entry the codec did not make (BEH-QD-722), before it looks
             for a gap or a duplicate, and
             otherwise MUST fail SequenceIntegrityError for a broken sequence.
REQUIREMENT: verifySequenceIntegrity MUST fail `ArchiveInputInvalid` with the
             refusal `EntriesNotAList { value }` for `entries` that is not a
             list, and `EntryNotMadeByCodec { index }` for the first entry the
             codec did not make, before it looks for a gap or a duplicate.
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
             backs; time order is a reader's job (sinkRecordOrder, ADR-QD-056).
REQUIREMENT: readAuditArchive(input) MUST read a stored bundle back and return
             a VerifiedArchive only if the envelope is a bundle, archiveVersion
             is "1", every entry decodes through decodeAuditEntry, the declared
             entryCount equals the number of entries, the sequence numbers have
             no gap or duplicate, the entries are in the order archiveAuditTrail
             writes (sequenced in number order, then unsequenced), and
             sequenceIntegrityVerified equals (sequenced count >= 2). Each
             failure MUST be its own ArchiveRefusal (TooDeep, Malformed,
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

> **Amended in CCR-QD-449 (ARCH-105).** The third requirement read "…time order is a
> reader's job (storedRecordOrder, ADR-QD-056)." Archive entries are bare records, so the
> order a reader applies is `sinkRecordOrder`.

The writer and the reader used to state the order (a comparator, and a loop)
and the claim each on their own. Both now read them from one computation
([ADR-QD-110](../decisions/110-an-archives-facts-are-computed-once.md)).
`verifySequenceIntegrity` and `SequenceIntegrityError` keep their names and
are re-exported through `SequenceIntegrity.ts`.

`AuditEntry.sequenceNumber` is a `number` in TypeScript, and the codec reads
only a safe integer (`Schema.Int`, CCR-QD-186). A row is made only by the codec
(INV-QD-400), so every number the writer sees is one, and the gap check is never
blind: past `2 ** 53`, `n + 1 === n` and a duplicate would not be seen as one. The
rule is stated once, in the row's schema, and neither `archiveFacts` nor the
writer re-checks it. What the writer and `verifySequenceIntegrity` do check, at run
time and for every field at once, is that each entry is one the codec made, because
a store client's `any` passes the type; a plain row numbered `1.5` and `2.5` is
refused there and never reaches the gap check. The code before ADR-QD-190 took a row built by hand, so it
archived `1.5` or `2 ** 53` and claimed a verified sequence, and the reader then
refused the bundle as `EntryNotDecodable`, which blocks the purge it was written
for; it guarded that with `SequenceNumberInvalid`, a failure ADR-QD-190 retired
because the type makes it unreachable.

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

## BEH-QD-489: An archive nested past the bound outside its entries is `TooDeep`, and each entry is guarded from its own root

> **Invariant:** [INV-QD-097](../invariants.md#inv-qd-097-the-record-codec-is-total), [INV-QD-306](../invariants.md#inv-qd-306-an-unwalked-slot-is-unknown-and-has-its-own-guarded-decoder)
> **See:** [ADR-QD-143](../decisions/143-untrusted-json-is-decoded-through-one-module.md)

```
REQUIREMENT: readAuditArchive MUST refuse a bundle nested past
             `MAX_DECODE_DEPTH` outside its `entries` as
             `ArchiveRefusal.TooDeep { maxDepth }`, before the envelope is
             decoded and before `archiveVersion` is read, and MUST NOT throw.
REQUIREMENT: readAuditArchive MUST guard each entry from its own root: an entry
             nested past the bound is `EntryNotDecodable` at its index with a
             `TooDeep` refusal (lowest index first), never `TooDeep` of the bundle.
```

The envelope's `entries` slot is `Schema.Unknown` and named `unwalked`, so the
envelope guard does not walk the entries it is about to hand, one by one, to
`decodeAuditEntry`. Before ARCH-78 the envelope had no guard of its own, and a
`metadata` or excess key nested past the bound was `Malformed` only because the
strict decode refused the key before recursing; it is `TooDeep` now, and
`archiveVersion: "2"` on such a bundle is `TooDeep` too, since the guard runs
before the version is read.

## BEH-QD-625: A deep unknown key inside an audit row's record is ignored

> **Invariant:** [INV-QD-360](../invariants.md#inv-qd-360-an-ignored-key-is-never-walked-so-it-cannot-refuse-the-input), [INV-QD-097](../invariants.md#inv-qd-097-the-record-codec-is-total)
> **See:** [ADR-QD-170](../decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md), [ADR-QD-153](../decisions/153-core-owns-describing-a-decode-refusal.md)

```
REQUIREMENT: A stored audit row's `record`, and an archive entry's record, MUST
             decode when it carries an undeclared top-level key nested past
             `MAX_DECODE_DEPTH`, and the same key with `version` 3 MUST be
             `UnsupportedVersion`, not `TooDeep`.
REQUIREMENT: The row's and the archive's own envelopes MUST state `refuse`: an
             unknown key of theirs stays `Malformed`, or `TooDeep` when nested
             past the bound.
```

The row and the archive read the record through `decodeSinkRecordWithJson`, the
record wire's decoder, so [BEH-QD-622](./08-serialization.md#beh-qd-622-an-ignored-key-is-never-walked-so-it-cannot-refuse-the-input)
reaches them with no change of their own: it is the same decision at a second
reader, not a new one. Only the record's top level is tolerant; an unknown key
one level down is refused as before.

## BEH-QD-721: A stored row is read envelope first

> **Invariant:** [INV-QD-400](../invariants.md#inv-qd-400-an-audit-row-is-made-only-by-its-codec), [INV-QD-097](../invariants.md#inv-qd-097-the-record-codec-is-total)
> **See:** [ADR-QD-190](../decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md), [ADR-QD-170](../decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md)

```
REQUIREMENT: decodeAuditEntry MUST decode the row as untrusted, with `record`
             unwalked, before it reads the record, and only then read the
             record through `@qadi/core`'s `decodeSinkRecordWithJson`. A row
             that is not an object, has no `record`, carries an undeclared
             top-level key or carries a `sequenceNumber` that is not a safe
             integer is refused by the first read, with the strict decoder's
             own message, and its record is not read.
REQUIREMENT: For a row that is bad in both places, decodeAuditEntry MUST return
             the envelope's refusal, not the record's.
REQUIREMENT: decodeAuditEntry MUST keep every refusal tag and its accept set:
             `Malformed`, `TooDeep`, `UnsupportedVersion` and `Inconsistent`
             each fire for the input that fired them when the record was read
             first, and every row that was accepted is accepted.
```

The order is the one core's `decodeStoredRecord` has, and the unknown-key policy
the row states at its decoder is `refuse`, as ADR-QD-170 assigns. A row's decoded
fields are its identity for `holds()` and `planPurge`, so ignoring an undeclared
top-level key would make two different stored rows decode equal.

What a refusal reports is the only thing the order changes. A `null`, a string, a
number or an array is `Malformed "Expected object"`, and `{}` or a row with no
record is `Malformed` at `["record"]`; the sentence "an audit row has no record"
is not written. A row whose envelope and record are both bad
(`{ record: { version: 2 }, sequenceNumber: 1.5, extra: 1 }`) is refused for its
excess property `["extra"]`. A row nested past `MAX_DECODE_DEPTH` outside its
record is `TooDeep` from the envelope's guard, and one inside its record is
`TooDeep` from the record's own.

Pinned by `AuditEntry.characterisation.test.ts` (sixteen stored rows, each as its
exact refusal, and the twin check that an encode-made row and its decode-made
twin are one row), `AuditEntryDifferential.test.ts` and `UntrustedSeams.test.ts`
(the refusal-precedence table of the row seam).

## BEH-QD-722: The archive writer refuses a non-finite now and writes key material as declared

> **Invariant:** [INV-QD-399](../invariants.md#inv-qd-399-every-archive-the-writer-returns-is-read-back-by-its-reader)
> **See:** [ADR-QD-190](../decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md), [ADR-QD-110](../decisions/110-an-archives-facts-are-computed-once.md)

```ts
export type NowRefusalCases = {
  readonly NowNotFinite: { readonly value: unknown };
};

export type RowsRefusalCases = {
  readonly EntriesNotAList: { readonly value: unknown };
  readonly EntryNotMadeByCodec: { readonly index: number };
};

export type ArchiveInputRefusal = Data.TaggedEnum<
  RowsRefusalCases &
    NowRefusalCases & {
      KeyMaterialNotAList: { readonly value: unknown };
      KeyMaterialItemRefused: { readonly index: number };
    }
>;

export class ArchiveInputInvalid extends Data.TaggedError("ArchiveInputInvalid")<{
  readonly refusal: ArchiveInputRefusal;
}> {}
```

```
REQUIREMENT: archiveAuditTrail MUST fail `ArchiveInputInvalid` with the
             refusal `NowNotFinite { value }` for a `now` that is `NaN`,
             `+Infinity` or `-Infinity` (`value` the value given), before it
             reads the key material, the entries or any fact, so a non-finite
             `now` on entries with a sequence break fails `ArchiveInputInvalid`.
             A finite `now`, `-0` included, is archived. The order of the
             checks is the admission step's ([BEH-QD-781](#beh-qd-781-one-admission-step-checks-a-hosts-batch-in-one-order-and-every-entry-point-calls-it-before-any-work-of-its-own)).
REQUIREMENT: archiveAuditTrail MUST fail `ArchiveInputInvalid` with the
             refusal `KeyMaterialNotAList { value }` for a `keyMaterial` that
             is not a list (`value` the value given), and
             `KeyMaterialItemRefused { index }` for the first item
             `readAuditArchive` would not read, after the `now` check and
             before the entries are read ([BEH-QD-781](#beh-qd-781-one-admission-step-checks-a-hosts-batch-in-one-order-and-every-entry-point-calls-it-before-any-work-of-its-own)). An item is read when it is an object
             with a string `keyId`, `algorithm` and `publicKey`, whatever else
             it carries; `null`, a primitive, a missing field, a field that is
             not a string and a hole are each an item that is not read. An
             absent `keyMaterial` and an empty list are archived.
REQUIREMENT: archiveAuditTrail MUST fail `ArchiveInputInvalid` with the
             refusal `EntriesNotAList { value }` for `entries` that is not a
             list (`value` the value given), and `EntryNotMadeByCodec { index }`
             for the first entry the codec did not make, after the
             `keyMaterial` check and before it computes any fact from the
             entries ([BEH-QD-781](#beh-qd-781-one-admission-step-checks-a-hosts-batch-in-one-order-and-every-entry-point-calls-it-before-any-work-of-its-own)). An entry the codec did not make is any
             value `encodeAuditEntry` and `decodeAuditEntry` did not return: a
             parsed row, a plain object with a row's fields, an object with a
             row's prototype, `null` or a primitive. An empty list is archived.
REQUIREMENT: archiveAuditTrail MUST write each `keyMaterial` item as a fresh
             `{ keyId, algorithm, publicKey }`, MUST NOT carry a property the
             declared shape does not name, and MUST NOT judge what the strings
             mean. It MUST read the `keyMaterial` list once and each item's
             three fields once, and write what it checked, so a getter that
             answers differently the second time is never asked a second time.
REQUIREMENT: Every bundle archiveAuditTrail returns MUST be read back by
             readAuditArchive from its JSON text, and archiveAuditTrail MUST
             otherwise fail `SequenceIntegrityError`.
REQUIREMENT: archiveAuditTrail MUST read the entries once, as one read of the
             list's length and one read of each index, and MUST build the bundle
             from the entries it checked, so a list that answers differently on a
             second read never makes it return a bundle its reader refuses
             ([INV-QD-424](../invariants.md#inv-qd-424-each-input-of-a-hosts-batch-is-read-once-what-was-checked-is-what-is-used-and-no-input-is-a-defect)).
```

The type refuses a row built by hand, and `any` passes it: a store client's
`JSON.parse`, a raw SQL row and an untyped ORM result are assignable to `AuditEntry`
with no cast, and a JavaScript caller has no compiler. So the codec records each row
it makes (`CodecMade.ts`) and the writer asks, by identity, because a prototype can
be imitated; a plain row numbered `1.5` and `2.5` would otherwise pass as a verified
sequence, and a row with a `null` `at` would be archived and refused by the reader.

`now` stays a parameter, because the package is parameterized on the time it is
given (`Retention.ts`). `createdAt` of `NaN` or an infinity is written by
`JSON.stringify` as `null`, which the reader refuses as `Malformed`, so the writer
refuses it first. `ArchiveInputInvalid` is shaped like `RetentionInputInvalid` and
`ArchiveNotVerified`: a `refusal` that is a closed `Data.TaggedEnum`, read with
`Match.tagsExhaustive`, so a host handles each the same way. It is named for the
archive because the refusals differ by which call refused: `RetentionInputRefusal`
has `MaxAgeInvalid` and no key material. A member carries `unknown` only where it
holds a value the caller gave (`NowNotFinite`, `KeyMaterialNotAList`,
`EntriesNotAList`) and `index: number` wherever it is an index
(`KeyMaterialItemRefused`, `EntryNotMadeByCodec`), so a handler never asks which
of the two a slot holds.

A `keyMaterial` item with an extra property is a structurally wider value the type
admits, and the reader refuses a nested excess key everywhere (ADR-QD-143), so the
item is written as its three declared fields rather than refused: the package
carries key material and never judges what it means.

`keyMaterial` is the third input a host hands the writer, and the type alone does
not bind it either: an item typed `any` whose `keyId` is a number was archived and
then refused by the reader as `Malformed`, and a `null` item or a value that is not
a list killed the fiber with a `TypeError`, a defect where a typed failure belongs.
The writer holds each item to the reader's own schema (`Schema.is` of the one
`KeyMaterialSchema`), so the shape is stated once. The check follows `now` and
precedes the rows: the admission step asks the inputs in that order
([BEH-QD-781](#beh-qd-781-one-admission-step-checks-a-hosts-batch-in-one-order-and-every-entry-point-calls-it-before-any-work-of-its-own)). The list and each item's fields
are read once: the check that read `options.keyMaterial` and then read it, and each
item, again to build the projection was a second read an accessor can answer
differently, so the archive could hold a `keyId` the check never saw.

`entries` is the fourth, and the first thing asked of it is that it is a list: a
store client's result and a JavaScript caller's argument can be `undefined`, `null`
or an object, and `findIndex` on one would be a defect where a typed failure belongs.
The admission step asks it for every function that takes rows, and then asks the codec's
question (`CodecMade.ts`'s `isCodecMade`) of each entry as it reads the list, one index at a
time, stopping at the first entry it refuses, so none of the four is a defect, whatever the
value given, and the rows that were checked are the rows that are used.

Pinned by `ForeignRows.test.ts` (each entry the codec did not make, refused by index by the writer,
`verifySequenceIntegrity` and `planRetention`, `entries` that is not a list refused with the value given by the writer,
`verifySequenceIntegrity`, `planRetention` and `planPurge`, each `keyMaterial` the reader would refuse, refused by index
or by value, a list getter and an item getter read once, each refusal read through `Match.tagsExhaustive`, and one
comparison case per entry point that it refuses what the admission step refuses), `AdmissionOrder.characterisation.test.ts`
(W1 to W18, which refusal wins for each pair of the writer's faults, written out literally, and S1 to S5, the spans the
writer opens), `HostBatch.test.ts` (H2 to H12, the order of the checks, asserted once at the step), `HostBatch.tst.ts`
(the refusal union as its fragments plus its own members), `ArchiveWriterInputs.test.ts` (each writer input the type
admits, as what the reader makes of the bundle), `AuditArchive.test.ts` (the exact `ArchiveInputInvalid` and the
declared-fields projection) and `ArchiveRoundTrip.test.ts` (the property over finite `now` and any `keyMaterial`).

## BEH-QD-781: One admission step checks a host's batch in one order, and every entry point calls it before any work of its own

> **Decision:** [ADR-QD-202](../decisions/202-one-admission-step-for-a-hosts-audit-batch.md) ·
> **Scope:** [ADR-QD-190](../decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md) ·
> **Invariant:** [INV-QD-423](../invariants.md#inv-qd-423-no-fact-plan-or-sequence-check-is-computed-from-host-rows-the-admission-step-did-not-admit),
> [INV-QD-424](../invariants.md#inv-qd-424-each-input-of-a-hosts-batch-is-read-once-what-was-checked-is-what-is-used-and-no-input-is-a-defect)

```ts
export interface DatedBatch<Terms, Refused> {
  readonly now: number;
  readonly terms: () => Result.Result<Terms, Refused>;
  readonly entries: unknown;
}

export interface AdmittedBatch<Terms> {
  readonly now: number;
  readonly terms: Terms;
  readonly rows: AdmittedRows;
}

export const admitRows: (entries: unknown) => Result.Result<AdmittedRows, RowsRefusal>;

export const admitBatch: <Terms, Refused>(
  batch: DatedBatch<Terms, Refused>,
) => Result.Result<AdmittedBatch<Terms>, NowRefusal | Refused | RowsRefusal>;
```

```
REQUIREMENT: The step MUST refuse a batch for its first fault in the order `now`,
             then the caller's terms, then the rows, so a refusal of an earlier
             input hides every later one. `now` is refused by `Number.isFinite`,
             never the coercing global, so `NaN`, both infinities, a string,
             `undefined`, `null` and a `bigint` are `NowNotFinite { value }` with
             the value given, and `0`, `-0` and `1` are admitted.
REQUIREMENT: The terms MUST be asked at most once, and MUST NOT be asked for a `now`
             that is refused. The rows MUST NOT be read for a `now` or terms that
             are refused. The step MUST be a plain function returning a `Result`,
             with no `Effect` and no span.
REQUIREMENT: `archiveAuditTrail` MUST admit `{ now, key material, rows }`,
             `planRetention` and `planPurge` MUST each admit `{ now, maxAgeMs, rows }`
             and `verifySequenceIntegrity` MUST admit its rows, each as the first
             statement of its body, before any fact, plan or span of its own work.
             `planPurge` MUST admit its own batch and MUST NOT call `planRetention`,
             so the archive is asked only for an admitted batch.
REQUIREMENT: The rows MUST be read as their `length` once and each index once, in
             order, each entry checked as it is read, and the read MUST stop at the
             first entry that is not a row the codec made. A `length` that is not a
             number MUST be refused as `EntriesNotAList` with the list given, and a
             `length` past any array's (`2 ** 32`, `Infinity`) MUST be read only as
             far as its first refused index, so no list is copied whole before it
             is checked and no length is a `RangeError`.
```

Every call that takes a host's rows took the same three inputs in the same order, and the order was written once per
call and asserted once per call. The step states it once, and the calls differ only in the terms they pass: the writer
its key material, retention and purge their `maxAgeMs`, and the verify none, which makes it `admitRows` alone. The
terms are a thunk, so a refused `now` never reads the host's options or policy, and refused terms never read the
rows. Each caller wraps the step's refusal once, as `ArchiveInputInvalid` or `RetentionInputInvalid`, and the refusal
is the caller's own member with no mapping ([BEH-QD-784](#beh-qd-784-nownotfinite-is-one-case-shared-by-both-refusal-enums-and-both-enums-keep-every-member-tag-and-field)).
The order is the one [BEH-QD-722](#beh-qd-722-the-archive-writer-refuses-a-non-finite-now-and-writes-key-material-as-declared),
[BEH-QD-253](#beh-qd-253-retention-partitions-entries-by-construction) and
[BEH-QD-254](#beh-qd-254-sequence-integrity-verification-detects-a-gap-or-a-duplicate-and-trusts-neither-write-order)
state for their own calls.

Pinned by `packages/audit/test/HostBatch.test.ts` (H2 to H12, which refusal wins for every subset of a bad `now`, refused
terms, rows that are not a list and a refused row; H13 to H14, the terms called once and never for a refused `now`, and the
rows unread for refused terms; H15 to H16, the `now` boundary) and `packages/audit/test/AdmissionOrder.characterisation.test.ts`
(W1 to W18, R1 to R13, P1 to P13 and V1 to V4, which refusal wins for each pair of faults per entry point, written out
literally; O1 to O3, the first fault of any set; L1 to L5, what a refusal leaves unread) and
`packages/audit/test/RowListAdmission.test.ts` (X1 to X5: a list whose `length` reads past any array's refused at index 0
by the step and by each entry point with no `RangeError`, a long sparse list and a long list with a foreign entry
stopped at index 1 having read two indexes, and a `length` that is not a number refused as `EntriesNotAList`).

## BEH-QD-782: Each entry point refuses exactly what the step refuses for the same batch

> **Decision:** [ADR-QD-202](../decisions/202-one-admission-step-for-a-hosts-audit-batch.md) ·
> **Scope:** [BEH-QD-781](#beh-qd-781-one-admission-step-checks-a-hosts-batch-in-one-order-and-every-entry-point-calls-it-before-any-work-of-its-own) ·
> **Invariant:** [INV-QD-423](../invariants.md#inv-qd-423-no-fact-plan-or-sequence-check-is-computed-from-host-rows-the-admission-step-did-not-admit)

```
REQUIREMENT: `archiveAuditTrail` MUST fail `ArchiveInputInvalid` with the refusal the
             step gives for the same `now`, key material and rows, and
             `verifySequenceIntegrity` MUST fail it with the refusal `admitRows` gives
             for the same rows.
REQUIREMENT: `planRetention` and `planPurge` MUST each return `RetentionInputInvalid`
             with the refusal the step gives for the same `now`, `maxAgeMs` and rows.
REQUIREMENT: A batch the step admits MUST NOT be refused by an entry point for its
             inputs. What an entry point does after admission, a sequence break or
             an archive that does not hold a row, is its own failure and its own
             result.
```

The entry points do not restate which refusal wins, because the step does. A test that wants to know an entry point
admits the batch runs one table of faults through the entry point and through the step and asks that the two refusals
are equal, so a call that checked in an order of its own, or skipped a check, differs from the step on some row of the
table.

Pinned by `packages/audit/test/ForeignRows.test.ts` ("archiveAuditTrail refuses each batch as the admission step refuses it",
"verifySequenceIntegrity refuses each rows list as the admission step refuses it", "planRetention refuses each batch as the
admission step refuses it" and "planPurge refuses each batch as the admission step refuses it", each over the fault table
of `hostBatchFaults.ts`).

## BEH-QD-783: The sequence check's span opens only for admitted rows

> **Decision:** [ADR-QD-202](../decisions/202-one-admission-step-for-a-hosts-audit-batch.md) ·
> **Scope:** [ADR-QD-110](../decisions/110-an-archives-facts-are-computed-once.md) ·
> **Invariant:** [INV-QD-423](../invariants.md#inv-qd-423-no-fact-plan-or-sequence-check-is-computed-from-host-rows-the-admission-step-did-not-admit)

```
REQUIREMENT: The span `qadi.audit.verifySequenceIntegrity` MUST open only when the
             sequence check runs, on rows the step admitted.
REQUIREMENT: `archiveAuditTrail` refused for its `now`, its key material or its rows
             MUST open only `qadi.audit.archiveAuditTrail` and fail inside it, and
             `verifySequenceIntegrity` refused for its rows MUST open no span.
REQUIREMENT: For an admitted batch the traces MUST be unchanged: `archiveAuditTrail`
             opens `qadi.audit.archiveAuditTrail` with the child
             `qadi.audit.verifySequenceIntegrity`, `verifySequenceIntegrity` opens
             exactly one span, `qadi.audit.verifySequenceIntegrity`, and
             `planRetention` and `planPurge` open none, refused or admitted.
```

A refused input was never checked, and a span says what was asked
([ADR-QD-051](../decisions/051-a-span-says-what-was-asked.md)). Admission runs before the span-opening step of each
call's own work, so a refused archive fails inside its own span and a refused verify is a typed failure in the host's
own span. The public `verifySequenceIntegrity` stays an unnamed `Effect.fn` that delegates, so a call opens exactly one
span, and `verifiedArchiveFacts`, which takes only admitted rows, keeps the span name and fails only
`SequenceIntegrityError`. The span names do not change, and a span is not part of a public type.

Pinned by `packages/audit/test/AdmissionOrder.characterisation.test.ts` (S1 to S8, the spans each outcome opens; SF1 to SF4,
no sequence span on refused rows: the writer opens only its own and the verify none; F1, F2 and F5,
`verifiedArchiveFacts` over admitted rows; F3 and F4, a refused list over which neither the verify nor the writer opens
its span) and
`packages/audit/test/AuditArchive.test.ts` ("archiving an entry opens a span named qadi.audit.archiveAuditTrail" and
"verifying a sequence opens a span named qadi.audit.verifySequenceIntegrity", the success traces).

## BEH-QD-784: NowNotFinite is one case shared by both refusal enums, and both enums keep every member, tag and field

> **Decision:** [ADR-QD-202](../decisions/202-one-admission-step-for-a-hosts-audit-batch.md) ·
> **Scope:** [ADR-QD-190](../decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md) ·
> **Invariant:** [INV-QD-423](../invariants.md#inv-qd-423-no-fact-plan-or-sequence-check-is-computed-from-host-rows-the-admission-step-did-not-admit)

```ts
export type NowRefusalCases = {
  readonly NowNotFinite: { readonly value: unknown };
};

export type ArchiveInputRefusal = Data.TaggedEnum<
  RowsRefusalCases &
    NowRefusalCases & {
      KeyMaterialNotAList: { readonly value: unknown };
      KeyMaterialItemRefused: { readonly index: number };
    }
>;

export type RetentionInputRefusal = Data.TaggedEnum<
  RowsRefusalCases &
    NowRefusalCases & {
      MaxAgeInvalid: { readonly value: unknown };
    }
>;
```

```
REQUIREMENT: `NowNotFinite { value }` MUST be declared once, as `NowRefusalCases`
             beside the check that answers it, and `ArchiveInputRefusal` and
             `RetentionInputRefusal` MUST each be the fragments `RowsRefusalCases` and
             `NowRefusalCases` plus their own members, so the member is one type in
             both.
REQUIREMENT: `ArchiveInputRefusal` MUST hold exactly `NowNotFinite`,
             `KeyMaterialNotAList`, `KeyMaterialItemRefused`, `EntriesNotAList` and
             `EntryNotMadeByCodec`, and `RetentionInputRefusal` exactly
             `NowNotFinite`, `MaxAgeInvalid`, `EntriesNotAList` and
             `EntryNotMadeByCodec`, each with the fields it had, and each enum MUST
             keep its own constructors.
REQUIREMENT: `NowRefusalCases` MUST NOT be exported from the package.
```

The two row members are stated once beside the row check and `NowNotFinite` is stated once beside the `now` check,
which is the discipline ADR-QD-190 gave the rows. The step's refusal is a union of those members, so each is assignable
to the caller's enum with no mapping. Neither enum nor either error class changes a tag, a member or a field, so the
change is not Breaking.

Pinned by `packages/audit/test/HostBatch.tst.ts`, which spells each union's members out independently of the source, asks
for each union as its fragments plus its own members, asks the shared members to be one type, and asks that the
`AdmittedRows` of the step is nominal.

## BEH-QD-785: A policy's maxAgeMs is read once, and a policy that is not an object is MaxAgeInvalid

> **Decision:** [ADR-QD-202](../decisions/202-one-admission-step-for-a-hosts-audit-batch.md) ·
> **Scope:** [BEH-QD-253](#beh-qd-253-retention-partitions-entries-by-construction) ·
> **Invariant:** [INV-QD-424](../invariants.md#inv-qd-424-each-input-of-a-hosts-batch-is-read-once-what-was-checked-is-what-is-used-and-no-input-is-a-defect)

```
REQUIREMENT: `planRetention` and `planPurge` MUST read `policy.maxAgeMs` once, however
             many rows there are, admit it only when it is a number (`typeof`
             `"number"`) from zero up, refuse anything else as
             `MaxAgeInvalid { value }`, and compare each row with the number they
             admitted, never with the policy read again.
REQUIREMENT: A `maxAgeMs` that is not a number (`null`, a boolean, a string, a list,
             a boxed number, an object with its own `valueOf`, a Symbol or an
             object with no prototype) MUST be refused as `MaxAgeInvalid` with the
             value given, MUST NOT be converted to a number, and MUST NOT throw.
REQUIREMENT: A `policy` that is `null`, `undefined`, a primitive or an object with no
             `maxAgeMs` MUST be refused as `MaxAgeInvalid { value: undefined }`, and
             MUST NOT throw. `NaN` and a negative number are refused with the value
             given, and `+Infinity`, `0` and `-0` are valid.
```

The policy is an input a host hands over, and the type does not bind it: a JavaScript caller's missing policy was a
`TypeError` where a typed failure belongs, and a policy that is a getter or a proxy answers each read separately, so a
limit that passed the check could be compared with a different one. The terms of retention read the limit once and
return it. A `MaxAgeInvalid` that already existed for `{}` answers for the policy that is not an object, so the enum
gains no member. A relational check converts what it compares: `null`, `false`, `""` and `[]` compare as `0`, so a
host whose config gives `maxAgeMs: null` for "no limit" would have every archived row selected for purge, an object
would be converted through its own `valueOf` once for the check and again for every row, and a Symbol throws. The
terms admit only a primitive number, so the value compared is the value checked, and for a deletion selector a value
that is not a limit retains.

Pinned by `packages/audit/test/BatchReadOnce.test.ts` (B1 to B5, the limit read once by each plan over two rows and over a
refused value, and a policy that is not an object refused as `MaxAgeInvalid` with the value `undefined` by each plan),
`packages/audit/test/MaxAgeAdmission.test.ts` (M1 to M4, a `maxAgeMs` that is not a number refused by each plan as
`MaxAgeInvalid` with the value given, never converted and never thrown) and
`packages/audit/test/Retention.test.ts` ("refuses a maxAgeMs that is NaN or negative, naming the member and the value").

---

_Previous: [32 — Custom Predicates](./32-custom-predicates.md)_
