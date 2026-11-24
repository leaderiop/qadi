# ADR-QD-190 — An audit row is a value only its codec makes

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-190                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-23                                     |
> | Status         | Accepted — amends ADR-QD-110 and ADR-QD-056   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-23): Initial (ARCH-124, CCR-QD-469) |

---

## Context

`@qadi/audit` wrote archives its own reader refused. `archiveAuditTrail` took rows of the type `AuditEntry`, which
the code before ADR-QD-190 declared as a plain struct, so any caller could build one, and the writer checked only the
sequence facts (ADR-QD-110). A row the type admitted and the codec would never make was archived, and
`readAuditArchive` then refused the bundle as `EntryNotDecodable`.

The probe (2026-11-23, throwaway, deleted afterwards): a type-valid row `{ ...e, record: { ...e.record, at: NaN } }` was
archived, and `readAuditArchive(JSON.parse(JSON.stringify(archive)))` refused it as `EntryNotDecodable`
(`Malformed: Expected number at ["at"]`). The same held for a row with an extra top-level key, a row whose record
fields disagree (`Inconsistent`), `now: NaN` and `now: ±Infinity` (`createdAt` written as `null`), and a `keyMaterial`
item carrying an extra key.

The codec itself round-trips. A second probe showed that `encodeAuditEntry` refuses every edge record its decoder would
refuse (`at` NaN or ±Infinity, a NaN `durationMillis`, a NaN, bigint, array-hole or over-deep value in `resource`), and
that it encodes, and the decoder reads back, a lone surrogate, `-0`, a `__proto__` key, a `Date` and an `undefined`
value. So the defect was the row type, not the codec: a value the codec never made could reach the writer.

Three checks existed only to defend against such a row, and each was dead once only the codec makes one.
`isSequenceNumber` and its fact `invalidSequenceNumber` (ADR-QD-110, with `SequenceNumberInvalid`) re-checked the
safe-integer rule the codec already states, and `planRetention`'s `undated` branch (ADR-QD-056, 2026-10-07) guarded a
hand-built row whose `at` was not finite. Where a decoder reads an envelope before its record, `decodeAuditEntry` did
the reverse and carried a hand-written pre-check for a missing record.

## Decision

1. **The row is a nominal class, exported as a type.** `class AuditEntry extends Data.Class<{ readonly record:
   SinkRecordJson; readonly sequenceNumber: number | undefined }>` is module-local to `AuditEntry.ts`, carries
   `declare private readonly nominal: never` (the idiom of core's `Admitted`), and is exported with `export type {
   AuditEntry }` alone. Only `encodeAuditEntry` and `decodeAuditEntry` call `new AuditEntry`. The compiler was probed
   (`tsc` under `tsconfig.base.json`, vitest on the installed `effect` 4.1.2):
   - a spread with a changed field fails TS2741, "Property 'nominal' is missing in type … but required in type …";
   - a bare literal fails TS2739, missing `nominal` and `pipe`;
   - `JSON.stringify(row)` is the two fields and nothing else (an `undefined` number is absent from the bytes, and
     there is no `toJSON`), and `Object.keys` is `["record", "sequenceNumber"]`;
   - `Equal.equals` and `Hash.hash` are structural and recursive, so `MutableHashMap.get` finds a row by an equal
     instance and `holds()` and `planPurge` read rows unchanged;
   - plain-object `Equal` tells an absent key from an `undefined` one, which is why `sequenceNumber` is a required
     `number | undefined` field: every row has the key, so an encode-made row and its decode-made twin are equal.

   A second probe, on the pins, found where the brand's strength comes from. Without `nominal` the `Data.Class` base
   alone refuses a literal, because a literal has no `pipe`, but a spread of a real row keeps `pipe` and is assignable
   to the class, so `{ ...entry, sequenceNumber: 1.5 }` would compile. Only the private `nominal` member refuses a
   spread of a real row, which is the case the writer must never receive.
2. **The schema value is removed.** The exported `AuditEntry` schema is gone, and the name `AuditEntry` is the type. The
   row's envelope struct stays module-private as `decodeAuditEntry`'s row decoder. A schema was never a reader of a
   row (ADR-QD-056, the 2026-10-06 amendment), and a value and a type of one name that disagree would be worse than
   either.
3. **A store's number reaches a row through `decodeAuditEntry`.** The sequence number is a fact of the host's store, and
   it reaches a row when the store returns the row, `decodeAuditEntry({ record, sequenceNumber })`. There is no setter
   and no encode option. A host that writes `{ ...entry, sequenceNumber: n }` to its store as JSON still can: that
   object is storage JSON, not an `AuditEntry`.
4. **The checks the brand made dead are removed.** The safe-integer rule is stated once, in the row's schema
   (`Schema.optional(Schema.Int)`). `isSequenceNumber`, the `invalidSequenceNumber` fact, `verifiedArchiveFacts`' first
   failure and the public `SequenceNumberInvalid` are removed, so `verifySequenceIntegrity` and `archiveAuditTrail`
   fail `SequenceIntegrityError` for the sequence alone and `SequenceIntegrity.ts` re-exports two names. Only a cast
   puts a non-safe-integer on an `AuditEntry`, and the house forbids `as`.
   `undated` is removed from `planRetention`, `RetentionPlan` and `PurgePlan`: an `AuditEntry`'s `at` is finite by
   construction (`encodeAuditEntry` refuses NaN and ±Infinity, probed, and `decodeAuditEntry` reads `at` as
   `Schema.Finite`). The purge guarantee never leaned on the branch: `planPurge` selects only rows the
   `VerifiedArchive` holds, every archived row was decoded, and a row with a non-finite `at` cannot equal one
   (INV-QD-130). `planRetention` still refuses a non-finite `now` and a NaN or negative `maxAgeMs`.
   `RetentionInputInvalid` is unchanged.
5. **`decodeAuditEntry` reads the envelope first.** It runs the module-private row decoder (`unknownKeys: "refuse"`,
   `unwalked: ["record"]`) and then `decodeSinkRecordWithJson` on the row's record, as core's `decodeStoredRecord`
   does. The hand-written pre-check for a missing record and its sentence are deleted, and the strict decoder's own
   messages replace it, the choice ADR-QD-170 made for the stored envelope. Every refusal tag is unchanged
   (`Malformed`, `TooDeep`, `UnsupportedVersion`, `Inconsistent`), the accept set is unchanged, and no
   `Schema.decode*`, `JSON.parse`, `onExcessProperty` or `exceedsJsonDepth` token is added, so `UNTRUSTED_DECODE_BUDGET`
   does not move. A characterisation of sixteen inputs was written on the code before the change and was green there;
   seven of its rows moved, and nine did not:

   | Input | Before (the record first, the pre-check) | After (the envelope first) |
   | ----- | ---------------------------------------- | -------------------------- |
   | `null` | `Malformed "an audit row has no record"` | `Malformed "Expected object"` |
   | `"a row"` (a string) | `Malformed "an audit row has no record"` | `Malformed "Expected object"` |
   | `5` (a number) | `Malformed "an audit row has no record"` | `Malformed "Expected object"` |
   | `[]` (an array) | `Malformed "an audit row has no record"` | `Malformed "Expected object"` |
   | `{}` | `Malformed "an audit row has no record"` | `Malformed "Missing key\n  at [\"record\"]"` |
   | `{ sequenceNumber: 1 }` | `Malformed "an audit row has no record"` | `Malformed "Missing key\n  at [\"record\"]"` |
   | `{ record: { version: 2 }, sequenceNumber: 1.5, extra: 1 }` (the envelope and the record both bad) | the record's `Malformed "Missing key\n  at [\"_tag\"]\nMissing key\n  at [\"_tag\"]"` | the envelope's `Malformed "Expected no excess property\n  at [\"extra\"]"` |

   The nine rows that did not move are a record that is `undefined`, a valid record with `sequenceNumber` 1.5, `null`
   or `2 ** 53`, a valid record with an extra top-level key, an extra key and a record each nested past the decode
   bound (`TooDeep`), a version-1 record (`UnsupportedVersion`) and an inconsistent record (`Inconsistent`). Only the
   message, and which refusal wins for a row that is bad in both places, changed. A twin check, an encode-made row
   against its decode-made twin by bytes, keys and `Equal`, passed unedited.
6. **The row's `unknownKeys` stays `refuse`, and ADR-QD-170 is applied unchanged.** ADR-QD-170 assigned the policy and
   states it at the decoder, and its text does not name the row's decode order, so it is not amended. A row's decoded
   fields are its identity for `holds()` and `planPurge`: ignoring an undeclared top-level key would make two different
   stored rows decode equal. The archive envelope refuses as well.
7. **Every writer input is enumerated, and each is probed.** The base outcome is the code before the change, from a
   regression written there and seen failing for each RED row. A row the type refuses became a type pin.

   | Writer input | Before | After |
   | ------------ | ------ | ----- |
   | a row with `record.at: NaN` (spread) | archived, the reader refuses `EntryNotDecodable` (`Malformed`): RED | does not compile |
   | a row with an extra top-level key (spread) | archived, the reader refuses `EntryNotDecodable`: RED | does not compile |
   | a row whose record disagrees with its decision (spread) | archived, the reader refuses `EntryNotDecodable` (`Inconsistent`): RED | does not compile |
   | a row with a non-safe-integer `sequenceNumber` (spread) | the writer failed `SequenceNumberInvalid`: refuted | does not compile; `decodeAuditEntry` refuses it (`Malformed`) |
   | `now: NaN` | `createdAt` written as `null`, the reader refuses `Malformed`: RED | `ArchiveInputInvalid` |
   | `now: +Infinity` and `-Infinity` | `createdAt` written as `null`, the reader refuses `Malformed`: RED | `ArchiveInputInvalid` |
   | `now: -0` | reads back with `createdAt` 0: refuted | unchanged |
   | a `keyMaterial` item with an extra key (held in a variable, type-valid) | the reader refuses `Malformed` (an excess property at `["keyMaterial"][0]`): RED | written as its declared fields |
   | `keyMaterial: []`, no entries | reads back: refuted | unchanged |
   | a codec-made row whose resource holds a lone surrogate, `-0`, a `__proto__` key or a `Date` | reads back: refuted | unchanged |
   | two rows encoded from one record | archived and read back in the order given: refuted | unchanged |

   Seven rows were RED. Two properties close the domain. Over codec-made entries, any finite `now` and any
   `keyMaterial`, `archiveAuditTrail` either fails a typed error or returns a bundle that
   `readAuditArchive(JSON.parse(JSON.stringify(bundle)))` reads back. Over records that include the hostile values
   probed above, either `encodeAuditEntry` fails `SinkRecordNotEncodable`, or the read-back has the encoded row's own
   bytes and is its own fixed point. The sequence-number property moved from the writer to the reader:
   `decodeAuditEntry` refuses a non-safe-integer number as `Malformed`.
8. **`now` is guarded, and the guard has its own error.** `now` stays a parameter, because the package is parameterized
   on `now` (`Retention.ts`). A non-finite `now` fails `ArchiveInputInvalid` `{ field: "now"; value: number }`, a
   `Data.TaggedError` shaped like `RetentionInputInvalid`, so a host handles both the same way. It is checked before
   the sequence facts, so `archiveAuditTrail` fails `ArchiveInputInvalid | SequenceIntegrityError`. The new export is a
   row of `spec/overview.md`, which gate 13 (`scripts/check-api-surface.mjs`) reads.
9. **`keyMaterial` is a projection.** `archiveAuditTrail` writes each item as a fresh `{ keyId, algorithm, publicKey }`.
   An extra property of a structurally wider value is not part of the declared shape and is not carried. Values are
   still never judged.
10. **The pins are `@ts-expect-error` with a message fragment.** `AuditEntry.tst.ts` holds six negative pins, each on a
    line with exactly one erroring expression and each with a positive twin: a literal, a spread of an encode-made row,
    a spread of a decode-made row and the writer given a plain row each expect `nominal`, and `new AuditEntry(...)` and
    `Schema.decodeUnknownEffect(AuditEntry)` expect `does not exist on type`, because a type-only export is absent from
    the module's value namespace. `tsc` reports TS2578 for a directive that suppresses nothing, and tstyche's
    `checkSuppressedErrors` checks the fragment, so a pin cannot pass for the wrong reason. No
    `not.toBeCallableWith` or `not.toBeConstructableWith` pin is added, so ADR-QD-175's budget and its table do not
    move. Deleting the `nominal` line was run once: two spread pins reported an unused directive and the literal and
    the writer pin reported a message that did not contain `nominal`.
11. **The purge cost is a measured figure.** `planPurge`'s documentation said "about 25 µs measured", from an
    unrecorded probe. It was re-measured on an Apple M3 Pro (`arm64`, node v26.13.0): 20,000 codec-made rows
    (`encodeAuditEntry`, numbered by `decodeAuditEntry`) were archived, read back with `readAuditArchive`, rebuilt from
    their JSON text each round so no cached hash was reused, and `planPurge` was timed once over all of them with every
    row expired and held, beside `Hash.hash` alone over another fresh set. Five cold rounds spread by a factor of 2.73
    (median 26.64 µs per row), over the factor of two the method allows, so the probe was repeated three times with one
    uncounted warm-up round before five counted ones. Each run spread by 1.39 to 1.57, with medians of 23.66, 22.36 and
    18.80 µs per row. The median of the fifteen counted rounds is 22.36 µs per row, so the documentation says "about
    22 µs", as an order of magnitude and not a constant. `Hash.hash` alone is 6 to 10 µs per row, so the figure is the
    whole call (the age pass, the identity set, the structural hash and the comparison with the archived copy).
12. **Every decision here was taken autonomously on 2026-11-23**, under the owner's standing instruction of 2026-11-22
    to take the most complete and clean solution and not ask, after the probes cited above. The options rejected are
    recorded below.

## Alternatives considered

- **`Brand.nominal`, `Schema.brand` or any intersection brand.** A spread keeps the brand property, so
  `{ ...entry, sequenceNumber: 1.5 }` type-checks, and `Schema.brand` also keeps `.make`, a third maker.
- **A `#private` marker.** It gives the same result as the private `nominal` member, at the cost of a run-time slot,
  and it fails TS6133 as an unused member.
- **`Schema.Class`.** Its public, validating constructor is a third maker, and it validates the record on every
  construction, a cost measured and rejected for the sink record (ADR-QD-135).
- **A class that is an implementation with an alias in front of it, as `VerifiedArchive` is.** It works, but
  diagnostics and hovers would name the implementation. It is the fallback only if a gate cannot read a type-only class
  export, and gate 13 (`scripts/check-api-surface.mjs`) can, since it learned a local export list.
- **Keeping an unbranded schema under the name `AuditEntry`.** A value and a type of one name that disagree.
- **Renaming the schema `AuditRow`.** It is a second public description of the row that nobody reads.
- **A public `withSequenceNumber`.** It is a third maker, adds a row to gate 13 (`scripts/check-api-surface.mjs`) and a probe to gate 14 (`scripts/check-package-install.mjs`), and no host flow
  needs it.
- **`encodeAuditEntry(record, { sequenceNumber })`.** The sink never knows the store's number at encode time.
- **Keeping the sequence-number check as defence in depth.** Only a cast can reach it, the house forbids `as`, and an
  unreachable check is an unkillable mutant that the per-file mutation bar counts against the file.
- **A silent `isFinite(at)` guard in place of `undated`.** It is dead under the type, and unkillable.
- **`undated` as an always-empty report.** A member every caller must learn that never carries anything.
- **`unknownKeys: "ignore"` for the row, mirroring the stored-record envelope.** That envelope ignores a newer
  server's additive metadata on a live stream, and an audit row is evidence.
- **Reading `Clock` inside `archiveAuditTrail`.** It breaks the package's documented parameterization, and it still
  trusts a host's `Clock`.
- **`RetentionInputInvalid` for `now`.** It is named for retention, and its `field` union would claim `maxAgeMs`.
- **Letting `createdAt` be `null`.** `ArchiveRefusal` and `ARCHIVE_VERSION` would change for a value no host intends.
- **Refusing a `keyMaterial` item with an extra key.** That judges a shape the package says it carries unjudged.
- **Widening the reader to accept a nested excess key.** The strict decode refuses nested excess keys everywhere
  (ADR-QD-143).
- **A counted negative type pin for each case.** A bare pin on a function that returns an `Effect` can pass for the wrong
  reason (ADR-QD-175), and a `@ts-expect-error` with a fragment pins the message.

## Consequences

Five breaking changes for `@qadi/audit`, a minor release marked **Breaking**:

1. `AuditEntry` is a type alone, and its schema value is removed.
2. `SequenceNumberInvalid` is removed.
3. `undated` is removed from `planRetention`, `RetentionPlan` and `PurgePlan`.
4. `ArchiveInputInvalid` is new.
5. `decodeAuditEntry`'s messages, and which refusal wins for a row bad in two places, change. Its tags do not.

A record holding a `Date` or an `undefined` value is a finding the codec's encoder does not change. It reads back with
equal bytes, because `JSON.stringify` writes a `Date` as text and drops an `undefined` member, but the read-back row is
not `Equal` to the in-memory row, which holds the `Date` or the `undefined`. So `holds()` does not hold such a row, and
`planPurge` retains it. That fails closed, and it is recorded here rather than closed by changing core's encoder to
refuse a value it can write.

Gate 13 (`scripts/check-api-surface.mjs`) learned to read a local export list, `export type { AuditEntry }`. Before the
change it refused one as unsupported, and with the form read, a name exported that way is held to `spec/overview.md`
like a declaration-form export.

ADR-QD-110 and ADR-QD-056 each gain a dated amendment: the first retires `SequenceNumberInvalid` and
`invalidSequenceNumber`, and the second retires `undated`, `SequenceNumberInvalid` and the schema note and states that a
row is made only by its codec. ADR-QD-170 is unchanged.

## What enforces it

**The compiler** holds the brand: `packages/audit/test/AuditEntry.tst.ts` (the six pins of decision 10, each with its
positive twin), and `pnpm typecheck` refuses a row literal or spread anywhere under `packages/audit`. `new
AuditEntry` occurs only in `AuditEntry.ts`.

**The properties** are in `packages/audit/test/ArchiveRoundTrip.test.ts`: "PROPERTY: every archive the writer returns is
read back", "PROPERTY: over any record, the codec refuses it or reads it back" and "PROPERTY: over any number, the
codec sets the domain and the writer".

**The writer-input file** is `packages/audit/test/ArchiveWriterInputs.test.ts`, which holds the rows of decision 7 that
compile, and `packages/audit/test/AuditArchive.test.ts` holds the exact assertions for the `now` guard and the
`keyMaterial` projection.

**The characterisation** is `packages/audit/test/AuditEntry.characterisation.test.ts`: its sixteen inputs, each as its
exact refusal, and the twin check that an encode-made row and its decode-made twin are one row.

**The scripts.** `scripts/check-api-surface.mjs` names `ArchiveInputInvalid`, and `AuditEntry` as a type, in
`spec/overview.md`; `scripts/check-house-style.mjs` holds `UNTRUSTED_DECODE_BUDGET` and `NOT_CALLABLE_PIN_BUDGET`
unmoved; `bash spec/scripts/verify-traceability.sh --strict` holds this record's registration, tracing and revision.

**The mutation floor.** Per-file Stryker baselines of `AuditEntry.ts`, `ArchiveFacts.ts`, `AuditArchive.ts` and
`Retention.ts` were taken at the base, and a drop at close is answered with a test, never with a new baseline. Each new
check was seen failing once, on a scratch edit of the rule it pins: the `now` guard, the `keyMaterial` projection, the
decode order, the brand, and an encoder that writes a record its codec cannot read back.

## Related

- [ADR-QD-056](056-audit-companion-package.md) — the companion package; amended by this decision
- [ADR-QD-110](110-an-archives-facts-are-computed-once.md) — an archive's facts are computed once; amended by this decision
- [ADR-QD-135](135-sink-record-fields-stated-once.md) — the record's fields stated once, and why a validating class constructor was rejected
- [ADR-QD-143](143-untrusted-json-is-decoded-through-one-module.md) — untrusted JSON is decoded through one module
- [ADR-QD-153](153-core-owns-describing-a-decode-refusal.md) — core owns describing a decode refusal
- [ADR-QD-170](170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md) — the row's unknown-key policy, applied unchanged
- [ADR-QD-171](171-a-stored-record-is-its-envelope-in-memory-too.md) — a record-carrying class with structural `Equal`
- [BEH-QD-721 and BEH-QD-722](../behaviors/33-audit-pipeline.md) — envelope-first decode, and the writer's `now` and `keyMaterial`
- [INV-QD-399 and INV-QD-400](../invariants.md) — every archive the writer returns is read back, and a row is made only by its codec
