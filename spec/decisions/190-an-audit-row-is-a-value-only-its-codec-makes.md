# ADR-QD-190 — An audit row is a value only its codec makes

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-190                                   |
> | Revision       | 1.5                                            |
> | Effective Date | 2026-11-23                                     |
> | Status         | Accepted — amends ADR-QD-110 and ADR-QD-056; amended 2026-11-24 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.5 (2026-11-24): third amendment: the writer reads keyMaterial once and writes what it checked (code review WR-01, CCR-QD-469)<br>1.4 (2026-11-24): second amendment: the codec freezes each row it makes and its record, one level, so INV-QD-400 holds for the life of the row (code review IN-02, CCR-QD-469)<br>1.3 (2026-11-24): second amendment: the record of what the codec made is per loaded copy of the module, and the limit is recorded (code review IN-01, CCR-QD-469)<br>1.2 (2026-11-24): second amendment: archiveAuditTrail holds keyMaterial to the reader's schema; ArchiveInputInvalid gains the field keyMaterial and its value is unknown (code review, CCR-QD-469)<br>1.1 (2026-11-24): amendment — a row is also checked at run time, through a package-private record of what the codec made; ArchiveInputInvalid and RetentionInputInvalid gain the field entries (code review WR-01, CCR-QD-469)<br>1.0 (2026-11-23): Initial (ARCH-124, CCR-QD-469) |

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
   fail `SequenceIntegrityError` for the sequence alone and `SequenceIntegrity.ts` re-exports two names. A typed
   caller can put a non-safe-integer on an `AuditEntry` only with a cast, and the house forbids `as`; an `any`-typed row
   needs none, which the amendment of 2026-11-24 below closes at run time.
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
- **Keeping the sequence-number check as defence in depth.** A typed caller can reach it only with a cast, and the house
  forbids `as`. An `any`-typed row is covered by one membership test that holds for every field and for an extra key,
  where a per-field check restates the codec's rules field by field (the amendment of 2026-11-24).
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

**The run-time check** (the amendment of 2026-11-24) is `packages/audit/test/ForeignRows.test.ts`: a parsed row with a
`null` `at` and an extra key, two plain rows numbered `1.5` and `2.5`, the codec's own bytes parsed back, an object with a
real row's prototype and fields, and `null` and a string in the list, each refused by index by `archiveAuditTrail`,
`verifySequenceIntegrity`, `planRetention` and `planPurge`, each with a positive twin of rows the codec made.

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

## Amendment (2026-11-24, CCR-QD-469)

**The brand is a run-time fact too.** Decision 4 said only a cast puts a non-safe-integer on an `AuditEntry`. That
holds for a typed caller and not for the route a store takes: `JSON.parse`, a raw SQL row, an untyped ORM result and
`structuredClone` return `any`, which is assignable to `AuditEntry` with no cast, and a JavaScript caller has no
compiler at all. Through that route the writer archived a row with `at: null` and an extra key, which
`readAuditArchive` refuses as `EntryNotDecodable`, the defect this record set out to close, and it passed two plain rows
numbered `1.5` and `2.5` as a verified sequence, which the code before ADR-QD-190 refused as `SequenceNumberInvalid`.
Both were written as tests first (`ForeignRows.test.ts`) and were red on the code before this amendment.

1. **A row the codec made is recorded.** `CodecMade.ts` holds a module-scope `const` `WeakSet<object>`, which is not a
   rebindable name and so not a row of `MODULE_STATE_BUDGET`. `encodeAuditEntry` and `decodeAuditEntry` record each row
   they construct, through `markCodecMade`, and nothing else calls it. `firstNotCodecMade(entries)` answers the index of
   the first entry that is not a recorded object, `null` and a primitive included. The module is out of the barrel
   (ADR-QD-099), so a host cannot record a row of its own, and a `WeakSet` keeps no row alive.
2. **The functions that compute a fact from a host's rows ask.** `verifiedArchiveFacts` does, so `archiveAuditTrail`
   and `verifySequenceIntegrity` do, and `planRetention` does, so `planPurge` does. The pure `archiveFacts` is the
   reader's, over rows `readAuditArchive` has just decoded, and asks nothing. The check follows the `now` and `maxAgeMs`
   checks and precedes every fact, so a refused list is never read.
3. **The refusal is the closed shape the input already had.** `ArchiveInputInvalid.field` is `"now" | "entries"`, and
   `RetentionInputInvalid.field` is `"now" | "maxAgeMs" | "entries"`. For `entries`, `value` is the index of the first
   entry the codec did not make. A closed union states the whole set, and a second error class would make a host handle
   one input failure two ways. `ArchiveInputInvalid` is declared in `ArchiveFacts.ts`, which `verifiedArchiveFacts`
   needs, and re-exported by `AuditArchive.ts` for the barrel; declared in `AuditArchive.ts` it would make the two
   modules import each other. So `verifySequenceIntegrity` fails `SequenceIntegrityError | ArchiveInputInvalid`.
4. **`planPurge` is safe on its own account too.** `holds` counts by structural equality with the archived rows, which
   are all codec-made class instances, and a plain object never equals a class instance, so an archive holds no copy of
   a row the codec did not make. `planPurge` refuses through `planRetention` and keeps that second reason.
5. **Rejected.** Narrowing the claim to typed callers, because it leaves this record's own defect reachable from
   `JSON.parse`. `instanceof` alone, because `Object.create(Object.getPrototypeOf(row))` with a row's fields imitates it
   (a test builds that object). Restoring the per-field `isSequenceNumber` check, because it puts back the duplicated
   rule decision 4 removed, and it would not refuse an extra key or a `null` `at`.
6. **Breaking, in the release this record already marks Breaking.** `verifySequenceIntegrity`, `planRetention` and
   `planPurge` can fail with a value a host that handled the old error set did not handle, and `archiveAuditTrail`'s
   `ArchiveInputInvalid` has a wider `field`. A host that passes only rows it read back through `decodeAuditEntry` or
   made with `encodeAuditEntry` sees no difference at run time.
7. **Decided autonomously on 2026-11-24**, under the owner's standing instruction of 2026-11-22 to take the most complete
   and clean solution and not ask.

## Second amendment (2026-11-24, CCR-QD-469, code review of the first amendment)

**`keyMaterial` is the third input the writer takes from a host, and the type does not bind it either.** The first
amendment held the rows and `now` to run time and left `options.keyMaterial` to the type. Probed on that code, with a
codec-made row and `now` of `1`:

| `keyMaterial` given | Result |
| ------------------- | ------ |
| `[{ keyId: 5, algorithm: "a", publicKey: "k" }]` (`any`, a number `keyId`) | archived, and `readAuditArchive` refuses the bundle `Malformed`: the defect this record set out to close |
| `[null]` | a defect, `TypeError: Cannot destructure property 'keyId' of null` |
| `"x"` | a defect, `TypeError: options?.keyMaterial?.map is not a function` |

1. **The writer holds `keyMaterial` to the reader's own schema.** Each item is checked with `Schema.is` of the
   module's one `KeyMaterialSchema`, the schema `readAuditArchive` decodes the bundle's `keyMaterial` with, so the
   shape is stated once and the writer cannot accept an item the reader refuses. `Schema.is` ignores an extra
   property, which the projection to the three declared fields drops, so an item with a `privateKey` is still
   archived without it. `Schema.is` is not one of the tokens `UNTRUSTED_DECODE_BUDGET` counts (`Schema.decode*`,
   `onExcessProperty`, `exceedsJsonDepth`, `JSON.parse`), and no budget moves.
2. **The refusal is the closed shape the input already had, with a third member.** `ArchiveInputInvalid.field` is
   `"now" | "keyMaterial" | "entries"`, the whole set. For `keyMaterial`, `value` is the index of the first item that
   is not key material, or, when what was given is not a list, that value. `value` is `unknown`, which the
   `number` it was cannot say: a caller the type does not bind can give a `now` that is a string, and a
   non-list `keyMaterial` is any value. Both the index and the value can be a number, so a host that must tell the
   two apart asks `Array.isArray` of what it passed; a second `field` member for the non-list case was rejected,
   because it splits one input into two names for the sake of a case that a host has already seen at its own call
   site. A `Data.TaggedError` class cannot extend a union of shapes (TS2509), so `field` and `value` stay one pair.
3. **The order is `now`, then `keyMaterial`, then `entries`, then the facts.** The two scalars-and-small-lists the
   writer takes as options are read first and cost a constant or the size of the key list, and the rows, which can
   be many, last, so a refused list is never read and a bad `keyMaterial` is not hidden behind a bad row. The
   alternative, the signature's own order (entries first), would read an unbounded list before a one-line check.
4. **Rejected.** Narrowing INV-QD-399 to typed `keyMaterial`, because the invariant and the changeset say "any
   `keyMaterial`" and the first amendment's reason for a run-time check applies unchanged. `untrustedDecoder` for the
   list, because it would add a `Schema.decode*` token to `AuditArchive.ts` and move `UNTRUSTED_DECODE_BUDGET` and its
   table for a list that is not untrusted JSON but an in-process value. Checking after the projection, because the
   projection is what throws on a `null` item.
5. **Breaking, in the release this record already marks Breaking.** `archiveAuditTrail` can fail `ArchiveInputInvalid`
   for `keyMaterial` where it archived a bundle the reader refused or threw, and `value` widens from `number` to
   `unknown`. A host that passes `keyMaterial` of the declared shape sees no difference at run time.
6. **The record of what the codec made is per loaded copy of the module, and this is a limit of the chosen
   mechanism.** `CodecMade.ts`'s `WeakSet` belongs to one copy of `@qadi/audit`. A row made by another copy, which
   happens with two versions installed side by side, two bundles with separate module graphs, or a test or hot reload
   that resets modules, is "not made by the codec" to the copy that reads it, and the writer fails
   `ArchiveInputInvalid { field: "entries", value: 0 }` for a row that was made correctly, with nothing in the message
   to say the copies differ. The package's `bun` condition resolves to `./src/index.ts` beside the `import` condition's
   `./lib/index.js`, so a mixed resolution is possible. The limit is kept and recorded, and the mechanism is not
   changed: a registry keyed by `Symbol.for` on `globalThis` would let every copy read it, and would let any host
   record a row of its own and so forge membership, which is the check this amendment adds. A second loaded copy of
   `@qadi/audit` is already a configuration to fix, and one install of the package avoids it. A host that sees the symptom checks `pnpm why @qadi/audit` (or its package manager's equivalent) for
   two copies.
7. **A row the codec made is frozen, so the check is about what the row holds as well as who made it.** The record of
   makers attests who made an object, and a JavaScript caller could still run `entry.sequenceNumber = 1.5` or
   `entry.record.at = null` on a recorded row, which the type refuses to a typed caller (the fields are `readonly`).
   The codec now freezes the row and the `record` object it built, in `madeByCodec` before it records the row, so
   INV-QD-400's "its `at` is finite and its `sequenceNumber` is a safe integer or `undefined`" holds for the life of the
   row and not only at the moment of construction, and a write throws a `TypeError` in strict mode. Probed first:
   freezing breaks neither `Equal` nor `Hash` of a `Data.Class` (a frozen row equals its twin, hashes alike and is held
   by an archive: `holds`, `planPurge`) nor the bytes of `JSON.stringify`. The freeze is one level. The row's `record`
   is the codec's own top-level object, built by the encode or by the strict decode, and a host's own object is never
   that object (a test pins that decoding a host's parsed row leaves it unfrozen). Deeper, the encoder passes a host's
   nested object through (probed: for a `resource` of `{ a: { b: 1 } }`, the row's `record.resource.a` is the host's own
   `a`), so a deep freeze would freeze objects the host owns. INV-QD-400 says one level, and does not claim deep
   immutability. Rejected: a deep copy of the record before freezing, which adds a per-row allocation to every audit
   write to close a path (a write to a nested value) that no invariant of the writer or the purge reads.
8. **Decided autonomously on 2026-11-24**, under the owner's standing instruction of 2026-11-22.

## Third amendment (2026-11-24, CCR-QD-469, code review of the second amendment)

**The `keyMaterial` the writer checks is the one it writes.** The second amendment's check read `options.keyMaterial`,
validated each item with `Schema.is`, and then read `options.keyMaterial` again and destructured each item a second
time to build the three-field projection. A getter, or a proxy, answers each read separately. Probed on that code, an
item `{ get keyId() { return n++ ? 5 : "a" }, algorithm: "b", publicKey: "c" }` passed `Schema.is` (the first read,
`"a"`) and was then destructured to `keyId: 5`, so the writer archived a bundle its reader refuses as `Malformed`:
the defect this record set out to close, reached through the input the second amendment guards.

1. **The writer reads `options.keyMaterial` once, and each item's three fields once.** `snapshotKeyMaterial` in
   `AuditArchive.ts` takes the value given, refuses what is not a list, and for each item builds a fresh
   `{ keyId, algorithm, publicKey }` from one read of each field by name, checks that object with the module's
   `KeyMaterialSchema`, and returns the checked objects. What is checked is what is written, and a getter that
   answers differently the second time is never asked a second time. The fields are read by name and not spread,
   because a spread copies own enumerable properties only, and a class whose `keyId` is an accessor on its prototype
   is key material the reader would read from the archived bytes. An extra property is never read, which keeps the
   second amendment's rule that a `privateKey` on the object does not reach the archive. A throwing accessor is the
   host's own throw and is not an input this check reads.
2. **Rejected.** Mapping over the value already checked and reading each item again, because each item is read twice
   there. Validating after the projection with the first read, because the projection is the second read.
3. **Decided autonomously on 2026-11-24**, under the owner's standing instruction of 2026-11-22.
