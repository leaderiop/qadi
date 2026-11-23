# Phase 77: An audit row is a value only its codec makes - Context

**Gathered:** 2026-11-23
**Status:** Ready for planning

<domain>
## Phase Boundary

`AuditEntry` is a plain struct type that any caller can build, and `archiveAuditTrail` checks only the sequence facts.
So the package writes archives that its own reader refuses. Probe (2026-11-23, throwaway, deleted afterwards): a
type-valid row `{ ...e, record: { ...e.record, at: NaN } }` is archived, and
`readAuditArchive(JSON.parse(JSON.stringify(archive)))` refuses it as `EntryNotDecodable`
(`Malformed: Expected number at ["at"]`). The same happens for:
- a row with an extra top-level key;
- a row whose record fields disagree;
- `now: NaN` or `now: ±Infinity` (`createdAt: null`);
- a `keyMaterial` item carrying an extra key.

The codec itself round-trips. A second probe showed that `encodeAuditEntry` refuses every edge record its decoder would
refuse: `at` NaN/±Infinity, a NaN `durationMillis`, NaN/bigint/array-hole/over-deep values in `resource`. It encodes,
and the decoder reads back, a lone surrogate, `-0`, a `__proto__` key, a `Date` and an `undefined` value.

After this phase:
- An `AuditEntry` can be made only by `encodeAuditEntry` or `decodeAuditEntry`.
- `decodeAuditEntry` reads the row's envelope first, then the record, as core's `decodeStoredRecord` does.
- The writer refuses a non-finite `now` and writes `keyMaterial` as its declared fields.
- Every archive `archiveAuditTrail` returns is read back by its reader.
- The re-checks a structural row needed are removed: `isSequenceNumber`, the public `SequenceNumberInvalid`, the
  `invalidSequenceNumber` fact, and Retention's `undated` branch and fields.

ARCH-124. Package: `@qadi/audit`, a **minor** changeset marked **Breaking**.

Records (reserved, use nothing else; `node scripts/next-id.mjs` is never run):
- ADR-QD-190;
- CCR-QD-469;
- BEH-QD-721–725;
- INV-QD-399–400.

An unused reserved id is named in the CCR row.

Requirements: AROW-01..06, plus the cross-cutting WX-01..07.

</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE14-CONTEXT.md`)
- **D1–D4 (owner, 2026-11-23):**
  - all four phases, the small find folded into 80;
  - order 77 → 80, strictly serial;
  - branch `arch-wave-14`, with no merge and no release;
  - the research has run.
- **Standing instruction (owner, 2026-11-22):** "do not ask me, you are in the autonomous mode. always pick the most
  complete and clean solutions not the simplest." Every decision below was **decided autonomously, 2026-11-23, under
  that instruction**, after the probes it cites. Rejected options are recorded with each decision.

### The row (AROW-02)
- **D-01, the brand.** `AuditEntry` becomes a module-local class:
  - It is `class AuditEntry extends Data.Class<{ readonly record: SinkRecordJson; readonly sequenceNumber: number | undefined }>`.
  - It carries `declare private readonly nominal: never`, the `Admitted` idiom at `packages/core/src/Admission.ts:87-92`.
  - It is exported **type-only** (`export type { AuditEntry }`), so only `AuditEntry.ts` can construct one.

  Probe (2026-11-23, `tsc` under `tsconfig.base.json`, a vitest run on installed `effect` 4.1.2):
  - A spread with a changed field fails TS2741: "Property 'nominal' is missing in type … but required in type …".
  - A bare literal fails TS2739 ("missing the following properties … nominal, pipe").
  - `JSON.stringify(instance)` gives the field bytes only. An `undefined` `sequenceNumber` is dropped, so the key is
    absent in the bytes, and there is no `toJSON`.
  - `Object.keys` is `["record", "sequenceNumber"]`. Today's rows from both encode and decode are key-present too.
  - `Equal.equals` is structural and recursive: two instances with equal fields are equal, and one differing in a
    nested array element is not.
  - `Hash.hash` agrees with `Equal.equals`.
  - `MutableHashMap.get` finds a row by an equal instance, so `holds()` and `planPurge` keep working unchanged.
  - Plain-object `Equal` tells an absent key from an `undefined` one. That is why `sequenceNumber` is a *required*
    `number | undefined` field: every row is key-present, so encode-made and decode-made rows stay equal.

  Rejected:
  - `Brand.nominal`, `Schema.brand`, or any intersection brand: a spread keeps the brand property, so
    `{...entry, sequenceNumber: 1.5}` type-checks, and `Schema.brand` also keeps `.make`.
  - A `#private` marker: same result, but it costs a runtime slot and trips TS6133.
  - `Schema.Class`: its public, validating constructor is a third maker, and it re-validates the record on every
    construction. That cost was measured and rejected for the record class (ADR-QD-135).
  - A `VerifiedArchive`-style `AuditEntryImpl` plus an alias: it works, but diagnostics and hovers would name
    `AuditEntryImpl`. It is the fallback only if a gate cannot read a type-only class export.
- **D-02, the schema value.** The exported `AuditEntry` schema value is **removed**, and `AuditEntry` names only the
  type. The row's envelope struct stays module-private, as `decodeAuditEntry`'s row decoder.

  Rejected:
  - Keeping an unbranded schema under the same name: a value and a type of one name that disagree.
  - Renaming it (`AuditRow`): a second public description of the row nobody reads. The schema was never a reader
    (BEH-QD-312, ADR-QD-056 :315), and `decodeAuditEntry` is.

  `AuditEntry.test.ts:310-320` and `:358` decode through `Schema.decodeUnknownEffect(AuditEntry)`. They are deleted, or
  re-pointed at `decodeAuditEntry` where the case they pin still exists.
- **D-03, the store's sequence number (AROW-03).** A sequence number reaches a row only through `decodeAuditEntry`.
  There is no setter and no encode option.
  - The number is a fact of the host's store, and it reaches a row when the store returns the row
    (`decodeAuditEntry({ record, sequenceNumber })`). This is the documented flow at `AuditEntry.ts:72-78`.
  - A host that writes `{ ...entry, sequenceNumber: n }` to its store as JSON still can: that object is storage JSON,
    not an `AuditEntry`.
  - Tests get a helper `numbered(entry, n)` in `test/helpers.ts`. It goes through `decodeAuditEntry` and fails the test
    on a refusal, with no `as` and no `!`.

  Rejected:
  - A public `withSequenceNumber`: a third maker AROW-02 does not list, adding a gate-13 row and a gate-14 probe that no
    host flow needs.
  - `encodeAuditEntry(record, { sequenceNumber })`: the sink never knows the store's number at encode time.

  The 0.10 migration fence in `upgrading.md:30-42` is pinned to `@qadi/audit@0.10` and returns storage JSON, so it
  stays as written.

### Dead checks (AROW-05)
- **D-04, sequence numbers.** The safe-integer rule is stated once, in `AuditEntry.ts`'s row schema
  (`Schema.optional(Schema.Int)`). These are removed (Breaking):
  - `ArchiveFacts.ts`'s `isSequenceNumber`;
  - the `invalidSequenceNumber` fact;
  - `verifiedArchiveFacts`'s first failure;
  - the public `SequenceNumberInvalid` class.

  `verifySequenceIntegrity` and `archiveAuditTrail` stop failing with it, and `SequenceIntegrity.ts` re-exports two
  names. ADR-QD-110 is amended, dated.

  Rejected: keeping the check as defence in depth. Only a cast can put a non-safe-integer on an `AuditEntry`, the house
  forbids `as`, and an unreachable check is an unkillable mutant that the per-file mutation bar would count against the
  file.
- **D-05, `undated`.** Removed: the branch, and the `undated` field on both `RetentionPlan` and `PurgePlan` (Breaking).
  - An `AuditEntry`'s `at` is finite by construction. `encodeAuditEntry` refuses NaN/±Infinity (probed), and
    `decodeAuditEntry` reads `at` as `Schema.Finite`.
  - The purge guarantee never leaned on the branch. `planPurge` selects only rows the `VerifiedArchive` holds. Every
    archived row was decoded, so a row with a non-finite `at` cannot equal one (INV-QD-130).
  - `planRetention` still refuses a non-finite `now` and a NaN or negative `maxAgeMs`; `RetentionInputInvalid` is
    unchanged.

  These records move with the decision:
  - INV-QD-101: the finite-age clause now holds because only the codec makes a row.
  - BEH-QD-253.
  - The INV-QD-053/101 FastCheck enforcement text.
  - `spec/overview.md:777`.

  `Retention.test.ts`'s properties draw `at` from the finite domain the codec admits. The non-finite domain is covered
  by the record-domain property in D-08.

  Rejected:
  - Keeping a silent `isFinite(at)` guard: dead under the type, and unkillable.
  - Keeping `undated` as an always-empty report: a member every caller must learn that never carries anything.

### Decode order (AROW-04)
- **D-06, envelope first.** `decodeAuditEntry` runs the existing module-private row decoder
  (`untrustedDecoder(Schema.Struct({ record: Schema.Unknown, sequenceNumber }), { unknownKeys: "refuse", unwalked: ["record"] })`)
  **first**. Then it runs `decodeSinkRecordWithJson(row.record)`, as `decodeStoredRecord` does
  (`packages/core/src/SinkCodec.ts:616-651`).
  - The hand-written `Predicate.hasProperty(input, "record")` pre-check is deleted, along with its sentence
    "an audit row has no record".
  - The strict decoder's own messages replace it ("Missing key at ["record"]", "Expected object…"), the choice
    ADR-QD-170 D-17 made for the stored envelope.
  - Every tag is unchanged: `Malformed`, `TooDeep`, `UnsupportedVersion`, `Inconsistent`.
  - No `Schema.decode*`, `JSON.parse`, `onExcessProperty` or `exceedsJsonDepth` token is added, so
    `UNTRUSTED_DECODE_BUDGET` does not move.

  A characterisation matrix written on the base, and green there, pins each input's tag and message today.
  - Its rows: `null`, a string, a number, an array, `{}`, `{ record: undefined }`, a valid record with a bad
    `sequenceNumber` (`1.5`, `null`, `2 ** 53`), a valid record with an extra top-level key, a record too deep, a
    version-1 record, an inconsistent record, and **a both-bad row** (envelope and record invalid).
  - The change commit edits exactly the rows whose message or precedence moves.
  - ADR-QD-190 tabulates each one as input / before / after.

  Today (probed): `null` and `{ sequenceNumber: 1 }` read `Malformed "an audit row has no record"`, and
  `{ record: { version: 2 }, sequenceNumber: 1.5, extra: 1 }` reads the record's
  `Malformed "Missing key at ["_tag"]…"`. After the change, the envelope's refusal wins on the both-bad row.
- **D-07, `unknownKeys` for the row stays `refuse`.** ADR-QD-170 assigned it, and it is not re-litigated. A row's
  decoded fields are its identity for `holds()` and `planPurge`. Ignoring an undeclared top-level key would make two
  different stored rows decode equal. The archive envelope refuses as well.

  Rejected: `ignore`, mirroring the stored-record envelope. That envelope ignores a newer server's additive metadata on
  a live stream; an audit row is evidence.

### The writer (AROW-01)
- **D-08, every writer input, enumerated.** Each row below is probed on the base (2026-11-23):

  | Writer input | Base | After |
  |---|---|---|
  | row, `record.at: NaN` (spread) | archived; reader `EntryNotDecodable` (`Malformed`) — **RED** | compile error (D-01) |
  | row with an extra top-level key (spread) | archived; reader `EntryNotDecodable` — **RED** | compile error |
  | row whose record fields disagree (spread `evaluationId`) | archived; reader `EntryNotDecodable` — **RED** | compile error |
  | row, non-safe-integer `sequenceNumber` (spread) | writer fails `SequenceNumberInvalid` — refuted at base | compile error; `decodeAuditEntry` refuses it (`Malformed`) |
  | `now: NaN` | `createdAt: null`; reader `Malformed` — **RED** | `ArchiveInputInvalid` (D-09) |
  | `now: +Infinity` / `-Infinity` | `createdAt: null`; reader `Malformed` — **RED** | `ArchiveInputInvalid` |
  | `now: -0` | reads back (`createdAt: 0`) — refuted at base | unchanged |
  | `keyMaterial` item with an extra key (held in a variable, type-valid) | reader `Malformed` (excess property at `["keyMaterial"][0]`) — **RED** | written as its declared fields (D-10) |
  | `keyMaterial: []`, no entries | reads back — refuted at base | unchanged |
  | codec-made row with a lone surrogate, `-0`, a `__proto__` key, or a `Date` in `resource` | reads back — refuted at base | unchanged |

  How the tests move:
  - The runtime regression file is written on the base without `as`, and is seen RED for each RED row.
  - At the change, the spread rows leave the runtime table and become D-11's type pins.
  - The `now` and `keyMaterial` rows stay at runtime and turn GREEN.

  Two properties close the domain:
  - **Whole archive.** For codec-made entries (`encodeAuditEntry` over generated records, numbered through
    `numbered`), any finite `now` and any `keyMaterial`, `archiveAuditTrail` either fails a typed error or returns a
    bundle that `readAuditArchive(JSON.parse(JSON.stringify(bundle)))` reads back.
  - **Record domain** (AROW-05). It mirrors `ArchiveRoundTrip.test.ts:259-309`. Over generated records that include
    the hostile values probed above, either `encodeAuditEntry` fails `SinkRecordNotEncodable`, or
    `decodeAuditEntry(JSON.parse(JSON.stringify(entry)))` succeeds and its `entry` `Equal`s the encoded one.

  The existing sequence-number property moves from the writer to the reader. `decodeAuditEntry({ record, sequenceNumber: n })`
  refuses a non-safe-integer `n` as `Malformed`. Every set of decoded rows otherwise archives, or fails
  `SequenceIntegrityError`, and reads back.
- **D-09, `now`.** `now` stays a parameter, because the package is "parameterized on `now`" (`Retention.ts:5-8`).
  - A non-finite `now` is refused by a new `Data.TaggedError`, `ArchiveInputInvalid` `{ field: "now"; value: number }`.
    It is shaped like `RetentionInputInvalid`, so a host handles both the same way.
  - It is checked before the sequence facts.
  - `archiveAuditTrail` fails with `ArchiveInputInvalid | SequenceIntegrityError`.
  - The new export gets a `spec/overview.md` row (gate 13).

  Rejected:
  - Reading `Clock` inside: it breaks the package's documented convention, and it still trusts a host's `Clock`.
  - Reusing `RetentionInputInvalid`: it is named for retention, and its `field` union would claim `maxAgeMs`.
  - Letting `createdAt` be `null`: out of scope, since `ArchiveRefusal` and `ARCHIVE_VERSION` do not change.
- **D-10, `keyMaterial`.** `archiveAuditTrail` writes each item as a fresh `{ keyId, algorithm, publicKey }`. An extra
  property of a structurally wider value is not part of the declared shape and is not carried. Values are still never
  judged.

  Rejected:
  - Refusing an item with an extra key: that judges a shape the package says it carries unjudged.
  - Widening the reader: nested excess keys are refused by the strict decode everywhere, which is ADR-QD-143's ground.

### Tests and records
- **D-11, type pins.** A new `packages/audit/test/AuditEntry.tst.ts` uses the house idiom of `PolicyArity.tst.ts`.
  Each negative is a `@ts-expect-error <message fragment>` on a line holding exactly one erroring expression:
  - `tsc` reports TS2578 if the directive is unused;
  - tstyche's `checkSuppressedErrors` checks the fragment.

  Every negative has a positive twin. The negatives:
  - a literal is not an `AuditEntry` ("nominal");
  - a spread of an encode-made row with a changed field is not one ("nominal");
  - nor is the same spread of a decode-made row;
  - `AuditEntry` is not a value: no `new`, and no `Schema.decode*(AuditEntry)`.

  The positives: `encodeAuditEntry`'s success and `decodeAuditEntry`'s `entry` are `AuditEntry`, and
  `archiveAuditTrail`, `planRetention` and `planPurge` accept them.

  `toRaiseError` is not used anywhere in this repo. The `@ts-expect-error` plus `checkSuppressedErrors` form already
  pins the message, which is the reason-aware pin the research asked for.

  No new `not.toBeCallableWith` or `not.toBeConstructableWith` pin is added unless `NOT_CALLABLE_PIN_BUDGET` and the
  AGENTS.md §6 table move with it. Existing type-pin files that build rows by literal are re-pointed, and their counts
  stay or move with the table: `Retention.tst.ts`, `AuditArchive.tst.ts`, `AuditPortReply.tst.ts`,
  `AuditWriteOutcome.tst.ts` and `AuditRefusal.tst.ts`.
- **D-12, records (AROW-06).**
  - **ADR-QD-190** (new) is "An audit row is a value only its codec makes". It records D-01 to D-10, with the probes,
    the decode refusal table, and the writer-input table.
  - **Dated amendments:**
    - ADR-QD-110: `SequenceNumberInvalid` and `invalidSequenceNumber` are retired.
    - ADR-QD-056: `undated` at :215, `SequenceNumberInvalid` at :426, and the schema note at :315.
    - ADR-QD-170: only if its seam text names the row's decode order.
  - **CCR-QD-469** gets a row in `spec/README.md`.
  - **New ids** (suggested):
    - INV-QD-399: "every archive `archiveAuditTrail` returns is read back by `readAuditArchive`".
    - INV-QD-400: "an `AuditEntry` is made only by `encodeAuditEntry` or `decodeAuditEntry`".
    - BEH-QD-721: envelope-first decode.
    - BEH-QD-722: the writer's `now` and `keyMaterial`.
  - **Restated in place:** BEH-QD-253, 254 and 312, BEH-QD-489 and 625 if they name the removed pre-check, INV-QD-101,
    and the INV-QD-053/054 enforcement text. Also `traceability.md` rows.
  - **`spec/overview.md`:**
    - `AuditEntry` becomes type-only;
    - `ArchiveInputInvalid` is added;
    - `SequenceNumberInvalid` is removed;
    - `undated` leaves `planRetention`, `RetentionPlan` and `PurgePlan`;
    - `archiveAuditTrail` and `verifySequenceIntegrity` get their new failures.
  - **Changeset** `.changeset/audit-row-made-only-by-its-codec.md`, `@qadi/audit` minor, marked **Breaking**:
    1. `AuditEntry` is type-only, and the schema value is removed.
    2. `SequenceNumberInvalid` is removed.
    3. `undated` is removed.
    4. `ArchiveInputInvalid` is new.
    5. `decodeAuditEntry` messages and precedence change; tags do not.
  - **Prose:**
    - an upgrade-guide entry in `apps/website/src/content/docs/docs/reference/upgrading.md` (its unreleased section);
    - `packages/audit/README.md` (`:136-153`);
    - `apps/website/src/content/docs/docs/packages/audit/capabilities.md` (`:25`, `:125-178`);
    - the `ts` signature listing in `spec/behaviors/33-audit-pipeline.md:66`.
- **D-13, mutation (WX-05).**
  - Per-file Stryker baselines are taken at the phase base for `AuditEntry.ts`, `ArchiveFacts.ts`, `AuditArchive.ts`
    and `Retention.ts`, using `stryker.audit.mjs` and the `NN-mutation.mjs` pattern of earlier phases.
  - They are committed alone and first, as `77-mutation-base.json`.
  - They are re-measured at close with the same invocation.
  - A drop is closed with a test, never by re-baselining.
- **D-14, a measured claim.** `planPurge`'s doc says "about 25 µs measured" (`Retention.ts:127`). It is re-measured
  with the row now a class, or reworded if the original method cannot be reproduced. A stale number does not ship.

### Claude's Discretion
- How the work splits into plans and waves. A natural cut:
  1. baselines plus the base-side characterisation and RED files;
  2. the brand, decode order, writer guards, dead-check removal and test churn, which must be one compile-green
     change;
  3. records and prose.
- The name and placement of the characterisation and regression test files. Keep them out of shared helpers.
- The exact message fragments in the `@ts-expect-error` pins, read from the compiler.
- The `numbered` helper's exact shape, and whether it lives in `test/helpers.ts`.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/src/Admission.ts:87-92`: the `declare private readonly nominal: never` nominal-class idiom.
- `packages/audit/src/AuditArchive.ts:186-239`: `VerifiedArchiveImpl` plus `export type VerifiedArchive`, the
  same-package precedent for a type only one module can mint.
- `packages/core/src/DecisionRecord.ts:122-146`: `StoredRecord extends Data.Class<…>`, structural `Equal`/`Hash` on a
  record-carrying class (ADR-QD-171).
- `packages/core/src/SinkCodec.ts:590-651`: `decodeStoredRecord`, the envelope-first read to mirror.
- `packages/audit/src/AuditEntry.ts:117-120`: the row decoder that already exists (`unwalked: ["record"]`).
- `packages/audit/test/ArchiveRoundTrip.test.ts:259-309`: the sequence-domain property the record-domain one mirrors.
- `packages/core/test/PolicyArity.tst.ts:1-13`: the `@ts-expect-error` plus `checkSuppressedErrors` pin idiom.

### Established Patterns
- A refusal is a value (`Result`), never thrown. A caller-supplied number is refused with `{ field, value }`
  (`RetentionInputInvalid`, `Retention.ts:35-38`).
- Pure readers return `Result`. Effectful writers are named `Effect.fn` spans (`qadi.audit.archiveAuditTrail`).
- A seam's strict decode messages are the decoder's own (ADR-QD-170 D-17), and tags stay closed.

### Integration Points
- `packages/audit/src`: `AuditEntry.ts` (the class, codec, decode order), `ArchiveFacts.ts` (dead checks out),
  `AuditArchive.ts` (`now`, `keyMaterial`, branded entries), `Retention.ts` (`undated` out, D-14),
  `SequenceIntegrity.ts` (re-export list, doc), and `AuditStagingPortTest.ts` (holds `AuditEntry` values).
- `packages/audit/test`, the files that name the row APIs:
  - archive: `Agreement`, `ArchiveFacts`, `ArchiveRoundTrip`, `AuditArchive(.tst)`;
  - row and codec: `AuditEntry`, `AuditEntryDifferential`, `UntrustedSeams` (A11/A12 pin "an audit row has no
    record"), `UnwrittenRow`;
  - ports and outcomes: `AuditPortReply(.tst)`, `AuditRefusal.tst`, `AuditStagingPortTest`, `AuditTrailPortTest`,
    `AuditWriteOutcome(.tst)`;
  - retention and sequence: `Retention(.tst)`, `SequenceIntegrity`;
  - shared helpers: `driveExit`, `helpers`, `observeLeaf`.
- Elsewhere: `features/features/wire-versions/*` (raw stored text only), `scripts/check-package-install.mjs:516,807-819`
  (gate 14 writes through `AuditTrailPortTest`; no row literal), `apps/website` (`capabilities.md`, `upgrading.md`,
  `obligations.md`, which only declares its own `writeAuditEntry`), `packages/audit/README.md`.
- Gates that move: gate 13 (`spec/overview.md`). `UNTRUSTED_DECODE_BUDGET` must **not** move. `NOT_CALLABLE_PIN_BUDGET`
  moves only together with its AGENTS.md table.

</code_context>

<specifics>
## Specific Ideas

- Commit the RED writer-input file on the base and record its RED output in `77-RED-EVIDENCE.md` before any source
  edit.
- The decode characterisation matrix and a bytes/`Equal` characterisation are also committed on the base:
  `JSON.stringify` of an encode-made and a decode-made row, their key sets, and their equality. Every one of these must
  pass unedited after the change, except the matrix rows D-06 names.

</specifics>

<deferred>
## Deferred Ideas

- A general "unwalked member decoded by its own decoder" option on `untrustedDecoder`. It was dropped by the review: its
  users have different refusal policies.
- Converting `VerifiedArchive` from its alias form to a type-only class export, for symmetry with D-01. That is not this
  phase's change.

</deferred>

## Workflow note (decided autonomously, 2026-11-23)

`check ui-plan-gate 77` answered `frontend: true`, but only because the token `form` matched inside "brand form" in
the roadmap's planning notes. `@qadi/audit` is server-only, and this phase edits no UI file. So step 3a.5's UI-SPEC and
AI-SPEC hooks are skipped for this phase, as a false positive: a design contract for a codec change would be noise.
