# 33 — Audit Pipeline

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-33                                    |
> | Revision       | 1.8                                            |
> | Effective Date | 2026-10-06                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.8 (2026-10-06): BEH-QD-312 — `decodeAuditEntry` reads wire version 2 only: a pre-0.10 row is refused as `UnsupportedVersion`, reported, never upgraded, and migrated with 0.10.x; `AuditEntry.record` is version-2 bytes (ADR-QD-096 amendment, CCR-QD-182)<br>1.7 (2026-10-05): BEH-QD-312 — `decodeAuditEntry` applies every check `decodeSinkRecord` applies, and reads rows of both wire versions; the row schema alone is not a reader. BEH-QD-250 — rows are written as wire version 2 (ADR-QD-096, CCR-QD-180)<br>1.6 (2026-10-05): BEH-QD-250 restated — a row's `record` is `encodeSinkRecord`'s encoded wire, byte-identical to the stream and forwarding; the refusal carries core's `EncodeRefusal`; a `cause` is never a reason to refuse. BEH-QD-312 — `decodeAuditEntry`, the guarded reader (ADR-QD-095, CCR-QD-179)<br>1.5 (2026-10-05): BEH-QD-250 widened — the guard walks the outcome as well: a resolver error's `cause` carrying a reference cycle or a `BigInt` used to pass it and then throw at the store's `JSON.stringify`, which counted as a write failure and could trip the breaker; `Map`/`Set`/`RegExp`/binary data are refused rather than persisted as `{}` (CCR-QD-178)<br>1.4 (2026-10-04): BEH-QD-251 — the half-open probe claim is released on every exit including interruption during staging; a failure settling on an already-`Open` breaker is a no-op; outcomes count only toward the window that admitted them; the interruption prose corrected (`Effect.exit` folds a typed failure, a defect and an adapter's self-interruption, not a caller's interruption) (CCR-QD-154)<br>1.3 (2026-09-09): BEH-QD-250 widened — `encodeAuditEntry` guarded only `resource` via `isJsonSafe`, not the whole record; `policy`'s `HasCustom.params` (ADR-QD-055's escape hatch) is a second caller-supplied `unknown` a `SinkRecord` can carry, and a circular or `BigInt`-valued one sailed past the narrow guard uncaught. Now guarded via `isRecordJsonSafe` (`SinkCodec.ts`), which walks `resource` **and** `policy` (issue #104)<br>1.2 (2026-09-07): BEH-QD-250 and BEH-QD-251 widened — `isJsonSafe` walks iteratively so a merely-deep (non-cyclic) value no longer risks the same stack exhaustion the circular-reference case was already guarded against; `stage()`/`write()` now run under `Effect.exit` rather than `Effect.result`, so a defect or interruption from either — not just a typed `AuditWriteError`/`AuditStagingError` — reaches the breaker and the metrics the same way a typed failure already did (CCR-QD-113)<br>1.1 (2026-09-06): BEH-QD-254 renamed — `verifyChainIntegrity`/`ChainIntegrityError` read as cryptographic tamper-evidence to a compliance reviewer and are not; renamed to `verifySequenceIntegrity`/`SequenceIntegrityError` (CCR-QD-094)<br>1.0 (2026-08-25): Initial release (CCR-QD-086) |

_Previous: [32 — Custom Predicates](./32-custom-predicates.md)_

---

What `@qadi/audit` does with the `SinkRecord`s `DecisionSink`
[24 — Decision Sink](./24-decision-sink.md) already exists to receive. See
[ADR-QD-056](../decisions/056-audit-companion-package.md).

## BEH-QD-249: The assembled pipeline is reachable through one `DecisionSink.record` call

```ts
export const AuditDecisionSinkLive: (
  options?: { readonly failureThreshold?: number; readonly resetTimeoutMs?: number },
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
export class AuditEntryNotEncodable { recordTag; refusal: EncodeRefusal; reason: string }
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
REQUIREMENT: decodeAuditEntry MUST read a row whose record is wire version 2,
             MUST tolerate what `decodeSinkRecord` tolerates (an unknown
             top-level envelope key) rather than refuse the row at its own
             decode, and MUST refuse a row of any other version — one written
             before 0.10, with no `version`, included — as
             `UnsupportedVersion`, never upgrading or skipping it.
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

## BEH-QD-253: Retention partitions entries, by construction

> **Invariant:** [INV-QD-053](../invariants.md#inv-qd-053-retained-and-purged-partition-entries)

```
REQUIREMENT: For any entries, RetentionPolicy and now, the sets
             enforceRetention(entries, policy, now) and
             getPurgeableEntries(entries, policy, now) MUST partition
             entries: their union is entries, unchanged and undeduplicated;
             their intersection is empty.
```

Computed in one pass over one shared predicate rather than by two
independent `.filter()` calls that could drift out of agreement with each
other — retention/archival/decommissioning are pure functions and data,
caller-invoked and caller-scheduled, since `@qadi/audit` has no scheduler of
its own.

## BEH-QD-254: Sequence-integrity verification detects a gap or a duplicate, and trusts neither write order

> **Invariant:** [INV-QD-054](../invariants.md#inv-qd-054-verifysequenceintegrity-detects-every-gap-and-duplicate-sequence-number)

```
REQUIREMENT: verifySequenceIntegrity MUST fail SequenceIntegrityError for any
             two sequence numbers, sorted ascending, that are not exactly one
             apart — catching both a gap (a jump past the expected next
             number) and a duplicate (the same number twice).
REQUIREMENT: An entry carrying no sequenceNumber MUST be ignored by
             verifySequenceIntegrity — sequencing is opt-in, assigned only by
             the caller's own store, never by @qadi/audit.
REQUIREMENT: archiveAuditTrail MUST store entries sorted by sequenceNumber,
             stably, before setting metadata.sequenceIntegrityVerified: true —
             never the caller-supplied array order verifySequenceIntegrity
             happens to tolerate.
```

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

## BEH-QD-256: A signature obligation handler calls `capture` exactly once, and the discharge record matches its outcome

> **Invariant:** [INV-QD-055](../invariants.md#inv-qd-055-signatureobligationhandler-calls-capture-exactly-once-and-the-obligationrecord-matches)

```
REQUIREMENT: signatureObligationHandler(port, meaning) MUST call port.capture
             exactly once per discharge, with a request derived from the
             current subject and the obligations being discharged — never
             once per obligation in the array.
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
