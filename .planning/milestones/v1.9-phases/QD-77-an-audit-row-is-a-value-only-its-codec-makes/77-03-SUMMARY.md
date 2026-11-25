---
phase: QD-77-an-audit-row-is-a-value-only-its-codec-makes
plan: 03
subsystem: audit
tags: [audit, nominal-class, codec, writer-guards, api-surface]
requires:
  - phase: QD-77 plan 02
    provides: the RED writer-input file, the decode matrix and twin checks, numbered, gate 13's local export list
provides:
  - AuditEntry as a module-local nominal Data.Class exported as a type, made only by encodeAuditEntry and decodeAuditEntry
  - decodeAuditEntry reading the envelope first, then the record through core
  - archiveAuditTrail failing ArchiveInputInvalid for a non-finite now and projecting keyMaterial item by item
  - the dead checks removed (SequenceNumberInvalid, the invalidSequenceNumber fact, undated)
  - gate 13's rows for the changed audit exports
affects: [QD-77 plans 04 to 07]
actuals:
  tokens: 60000
  tasks: 3
  commits: 1
plan_head_before: 87fa99b386a639e677af501a3176a033440e61ca
plan_head_after: 3f27e7ed9f1bb4935024a39eeba4ae7df065d2d8
key-files:
  created: []
  modified:
    - packages/audit/src/AuditEntry.ts
    - packages/audit/src/ArchiveFacts.ts
    - packages/audit/src/SequenceIntegrity.ts
    - packages/audit/src/AuditArchive.ts
    - packages/audit/src/Retention.ts
    - spec/overview.md
    - packages/audit/test/ArchiveFacts.test.ts
    - packages/audit/test/SequenceIntegrity.test.ts
    - packages/audit/test/AuditArchive.test.ts
    - packages/audit/test/ArchiveRoundTrip.test.ts
    - packages/audit/test/AuditEntry.test.ts
    - packages/audit/test/UntrustedSeams.test.ts
    - packages/audit/test/Retention.test.ts
    - packages/audit/test/AuditEntry.characterisation.test.ts
    - packages/audit/test/ArchiveWriterInputs.test.ts
key-decisions:
  - "A row is a Data.Class with a required sequenceNumber field holding undefined, so an encoded row and its decode-made twin have the same keys and are equal"
  - "keyMaterial is projected through a local const so the writer's one-line projection stays under 90 columns and still reads as the declared three fields"
requirements-completed: [AROW-01, AROW-02, AROW-03, AROW-04, AROW-05, WX-03, WX-04, WX-07]
coverage:
  - id: D1
    description: "An audit row is a value only its codec makes: the nominal class, type-only export, no schema value"
    requirement: "AROW-02"
    verification:
      - kind: other
        ref: "pnpm typecheck (a literal or spread row is TS2741; the type pins land in the next plan)"
        status: pass
    human_judgment: false
  - id: D2
    description: "decodeAuditEntry reads the envelope first and the record second; every refusal tag is unchanged"
    requirement: "AROW-04"
    verification:
      - kind: unit
        ref: "packages/audit/test/AuditEntry.characterisation.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "The writer refuses a non-finite now and writes keyMaterial as its declared fields; the RED writer-input rows are GREEN"
    requirement: "AROW-01"
    verification:
      - kind: unit
        ref: "packages/audit/test/ArchiveWriterInputs.test.ts"
        status: pass
    human_judgment: false
  - id: D4
    description: "The safe-integer rule is stated once, at the codec, and the dead checks are gone"
    requirement: "AROW-05"
    verification:
      - kind: unit
        ref: "packages/audit/test/ArchiveRoundTrip.test.ts#PROPERTY: over any number, the codec sets the domain and the writer"
        status: pass
    human_judgment: false
  - id: D5
    description: "Gate 13 names the changed audit exports"
    requirement: "WX-03"
    verification:
      - kind: other
        ref: "node scripts/check-api-surface.mjs -> api-surface: 940 export(s) documented across 9 package(s)"
        status: pass
    human_judgment: false
duration: 10min
completed: 2026-11-24
status: complete
---

# Phase QD-77 Plan 03: An audit row is a value only its codec makes Summary

**AuditEntry is now a module-local nominal `Data.Class` exported as a type, `decodeAuditEntry` reads the envelope before the record, and `archiveAuditTrail` refuses a non-finite `now` and projects `keyMaterial`, in one compile-green commit.**

## Performance
- Duration: 10 min (23:51Z to 00:01Z). Tasks: 3. Files: 15 (5 source, 1 spec, 9 test). Commit: `3f27e7ed`.

## Accomplishments
- **The brand.** `class AuditEntry extends Data.Class<{ record: SinkRecordJson; sequenceNumber: number | undefined }>` with `declare private readonly nominal: never`, module-local, `export type { AuditEntry }`. `new AuditEntry(` occurs only in `AuditEntry.ts` (`encodeAuditEntry`, `decodeAuditEntry`); the schema value, the `Predicate.hasProperty` pre-check, `malformed` and the `Predicate`, `DecodeRefusal`, `SinkRecordJson` value imports are gone. A row literal or spread is now TS2741 (every test that built one failed to compile until moved).
- **Envelope-first decode.** `decodeRow` (`unknownKeys: "refuse"`, `unwalked: ["record"]`) runs first, `decodeSinkRecordWithJson(row.success.record)` second. No `Schema.decode*`, `JSON.parse`, `onExcessProperty` or `exceedsJsonDepth` token was added: the audit source's only such token is the one doc line it was at the base, so `UNTRUSTED_DECODE_BUDGET` did not move.
- **Writer guards.** `ArchiveInputInvalid { field: "now"; value }` (a `Data.TaggedError`), checked with `Number.isFinite(now)` before `verifiedArchiveFacts`; each `keyMaterial` item is written as a fresh `{ keyId, algorithm, publicKey }`.
- **Dead checks out.** `isSequenceNumber`, the `invalidSequenceNumber` fact and `InvalidSequenceNumber`, `SequenceNumberInvalid`, `verifiedArchiveFacts`' first failure, and `undated` from `RetentionPlan`, `PurgePlan`, `planRetention` and `planPurge`. `SequenceIntegrity.ts` re-exports `SequenceIntegrityError` and `verifySequenceIntegrity`. The safe-integer rule is stated once, `Schema.optional(Schema.Int)` in `AuditEntry.ts`.
- **Gate 13.** `spec/overview.md` (rev 1.136): `AuditEntry` is a type, `ArchiveInputInvalid` added, `SequenceNumberInvalid` row deleted, `undated` and the new failures worded. Count stays 940 (one export out, one in; `AuditEntry` value and type were one name).
- **Writer-input file.** All 11 remaining rows pass: the three `now` rows and the `keyMaterial` row turned GREEN through the source change; only the four spread rows left (they become type pins in 77-04).
- **Suites.** `pnpm typecheck`, `pnpm lint`, `pnpm circular`, `pnpm test:tstyche` (74 files), audit project (568 tests, 0 failed) and `pnpm test:bdd` (568) pass; gate lines `house-style: 588 file(s) clean (3 declared switch(es), 74 type-test file(s))`, `api-surface: 940 ...`, doc-examples 118 and website-doc-examples 71 compile. `AGENTS.md` and `scripts/check-house-style.mjs` are unchanged from `phase_base`.

## Moved matrix rows (for ADR-QD-190)

The twin checks (`assert.deepStrictEqual(encodeMade, decodeMade)` included) pass unedited. Seven rows of the 16-row matrix moved; nine did not and were not touched.

| Input | Before (record read first, `Predicate` pre-check) | After (envelope read first) |
| ----- | ------------------------------------------------- | --------------------------- |
| `null` | `Malformed "an audit row has no record"` | `Malformed "Expected object"` |
| `"a row"` (a string) | `Malformed "an audit row has no record"` | `Malformed "Expected object"` |
| `5` (a number) | `Malformed "an audit row has no record"` | `Malformed "Expected object"` |
| `[]` (an array) | `Malformed "an audit row has no record"` | `Malformed "Expected object"` |
| `{}` | `Malformed "an audit row has no record"` | `Malformed "Missing key\n  at [\"record\"]"` |
| `{ sequenceNumber: 1 }` | `Malformed "an audit row has no record"` | `Malformed "Missing key\n  at [\"record\"]"` |
| `{ record: { version: 2 }, sequenceNumber: 1.5, extra: 1 }` (both bad) | the record's `Malformed "Missing key\n  at [\"_tag\"]\nMissing key\n  at [\"_tag\"]"` | the envelope's `Malformed "Expected no excess property\n  at [\"extra\"]"` |

Only the message and which refusal wins for a doubly bad row changed; every refusal tag and the accept set are unchanged. `UntrustedSeams.test.ts` carries the same two edits (no record, and A11 `5, null, [] and {}`), with the titles reworded so they name what they pin.

Other test edits: `ArchiveFacts.test.ts` loses its sequence-number-domain block; `SequenceIntegrity.test.ts` loses its `SequenceNumberInvalid` block and keeps the "largest safe integers" case beside the other cases; the two `Schema.decodeUnknownEffect(AuditEntry)` cases in `AuditEntry.test.ts` are deleted and the describe renamed to "decodeAuditEntry reads the record strictly"; `Retention.test.ts` drops the non-finite `at` and undated cases and draws `at` from finite numbers only (`now` and `maxAgeMs` keep their non-finite draws); the writer-side sequence property in `ArchiveRoundTrip.test.ts` moved to the reader (a non-safe-integer is `Malformed` at decode, a safe one reads, and every codec-made set either archives and reads back or fails `SequenceIntegrityError` with the reader reporting the same `SequenceBroken` numbers).

## Equality probe (vitest and chai on `Data.Class` rows)

Probed in a throwaway test, deleted before the commit: `assert.deepStrictEqual` and `expect().toStrictEqual` and `toEqual` all **accept** two `AuditEntry` instances compared with each other (including an encode-made row against its decode-made twin, and two numbered rows). Against a plain object, chai `deepStrictEqual` and `toStrictEqual` **throw** while `toEqual` passes; two rows with different numbers are not equal. So every row-compared assertion in the suite compares a codec-made row with a codec-made row, never a literal.

## Task Commits
1. **Tasks 1-3 (one commit, as planned):** `3f27e7ed` feat(77-03): make an audit row a value only its codec makes. Tasks 1 and 2 left the tree uncommitted by design; the test project did not compile between them.

## Deviations from Plan

None - plan executed exactly as written. Judgment calls inside the plan's latitude:
- `archiveAuditTrail` builds `keyMaterial` in a local const (the plan's one-line projection text is kept verbatim in it) so every line stays at 90 columns.
- The `at` NaN and `at` non-finite cases in `Retention.test.ts` were deleted rather than re-pointed: a non-finite `at` cannot be a codec-made row.
- Where a test file had no listed churn but failed to compile or run (`UntrustedSeams.test.ts` only), it was edited as the plan names; no other audit test file needed changing.

## Known Stubs
None.

## Threat Flags
None. No new endpoint, auth path or trust-boundary surface: `ArchiveInputInvalid` is an error class, and the `keyMaterial` projection narrows what the writer carries (T-77-05). No `package.json` or lockfile changed (T-77-SC).

## Issues Encountered
None. Gate 13 does not name README or website prose that still mentions `SequenceNumberInvalid` and `undated` (`packages/audit/README.md`, the website audit capabilities page, `spec/behaviors/33-audit-pipeline.md`, `spec/invariants.md`, ADR-QD-110 and ADR-QD-056); those belong to the prose and record plans, and doc-example gates still pass.

## Next Phase Readiness
Ready for 77-04: the brand is in, so the `AuditEntry.tst.ts` type pins (a literal and a spread refused, the four removed spread rows), the record-domain properties, the writer-guard assertions and the purge-cost re-measure can be written against it.

## Self-Check: PASSED
- FOUND: packages/audit/src/AuditEntry.ts, ArchiveFacts.ts, SequenceIntegrity.ts, AuditArchive.ts, Retention.ts, spec/overview.md and the nine test files in the commit
- FOUND commit 3f27e7ed (ancestor of HEAD); the plan's Task 3 verify exits 0 on it; the source change since `phase_base` is exactly that one commit
