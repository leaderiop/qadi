---
phase: QD-77-an-audit-row-is-a-value-only-its-codec-makes
verified: 2026-11-24T04:45:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".changeset/audit-row-made-only-by-its-codec.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-01-PLAN.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-01-SUMMARY.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-02-PLAN.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-02-SUMMARY.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-03-PLAN.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-03-SUMMARY.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-04-PLAN.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-04-SUMMARY.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-05-PLAN.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-05-SUMMARY.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-06-PLAN.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-06-SUMMARY.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-07-PLAN.md"
  - ".planning/phases/QD-77-an-audit-row-is-a-value-only-its-codec-makes/77-07-SUMMARY.md"
  - "packages/audit/src/ArchiveFacts.ts"
  - "packages/audit/src/AuditArchive.ts"
  - "packages/audit/src/AuditEntry.ts"
  - "packages/audit/src/CodecMade.ts"
  - "packages/audit/src/Retention.ts"
  - "packages/audit/src/SequenceIntegrity.ts"
  - "packages/audit/test/ArchiveWriterInputs.test.ts"
  - "packages/audit/test/AuditEntry.characterisation.test.ts"
  - "packages/audit/test/AuditEntry.tst.ts"
  - "packages/audit/test/ForeignRows.test.ts"
  - "spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md"
covered_digest: "v4:sha256:4368ecba1ab372e210d5826a4f42058d885cb4baad284925de7a3d0c6d422513"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 77: An audit row is a value only its codec makes - Verification Report

**Phase Goal:** `@qadi/audit` can no longer write an archive its own reader refuses, because an `AuditEntry` is a value only its codec makes, so the archive, retention and the archive facts trust a row without re-checking it, and the row decodes envelope-first as core's stored record does.
**Verified:** 2026-11-24
**Status:** passed
**Re-verification:** No, initial verification (judged against the final code at `cfd2e21e`, after three review-fix iterations)

## Basis and where a review disposition governs

Judged against the final code. Where a plan's literal text predates a review disposition, the disposition governs:

- The plan text says "`ArchiveInputInvalid { field, value }`". The final code has `ArchiveInputInvalid { refusal: ArchiveInputRefusal }`, a closed `Data.TaggedEnum`, and `RetentionInputInvalid { refusal: RetentionInputRefusal }` (iteration 3, WR-03 and IN-01).
- The plan text says the brand is compile-time only and "the `isSequenceNumber` check is dead, only a cast can break it". The final code adds the run-time membership set `CodecMade.ts` (iteration 1, WR-01), freezes each codec-made row and its record (iteration 2, IN-02), and validates `keyMaterial` (iteration 2, WR-01) and a non-list `entries` (iteration 3, WR-02). The disposition narrows nothing in INV-QD-399; it widens what the writer refuses.
- Success criterion 4 allows "removed or kept with a recorded reason" for the dead checks. They were removed, and the decision record states why.

None of these is a gap. They are the binding review decisions.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Regression tests written on the phase base, without `as`, are RED for each writer input the reader refuses (the `at: NaN` row and `archiveAuditTrail(entries, NaN)` at least; every other input RED or recorded "refuted at the base"); after the phase every archive `archiveAuditTrail` returns is read back by `readAuditArchive(JSON.parse(JSON.stringify(archive)))` | VERIFIED | `77-RED-EVIDENCE.md` records 7 RED rows (`at: NaN`, extra key, disagreeing record, `now` NaN, `now` +Inf, `now` -Inf, `keyMaterial` extra key) and 8 "refuted at the base" rows, on a HEAD whose `packages/audit/src` equals the phase base. Commit order confirms it: `c4fd276e test(77-02)` precedes the change `3f27e7ed feat(77-03)`. `ArchiveWriterInputs.test.ts` and the whole-archive property in `ArchiveRoundTrip.test.ts` exist and pass now (`npx vitest run --project audit`: 31 files, 618 tests, all green). The writer in `AuditArchive.ts:158-208` refuses non-finite `now`, a bad `keyMaterial`, a non-list `entries` and a row the codec did not make, each as a typed `ArchiveInputInvalid`, before any fact is computed. Each new check is recorded as seen failing once (`77-RED-EVIDENCE.md`, "Each new check seen failing once"). |
| 2 | An `AuditEntry` is obtainable only from `encodeAuditEntry` or `decodeAuditEntry`: a literal, a spread with a changed field, and the exported schema value each fail to compile, pinned by type tests that can fail; the row keeps its `JSON.stringify` bytes, key-absent `sequenceNumber` and structural `Equal`/`Hash`; a host can still assign a `sequenceNumber` through a codec-owned route | VERIFIED | `AuditEntry.ts`: module-local `class AuditEntry extends Data.Class<...>` with `declare private readonly nominal: never`, exported with `export type { AuditEntry }` only, so the schema value is gone. `AuditEntry.tst.ts` holds 6 negative `@ts-expect-error` pins (literal, encode-made spread, decode-made spread, writer given a plain row, `new Row.AuditEntry`, `Schema.decodeUnknownEffect(Row.AuditEntry)`), each with a positive twin. `77-RED-EVIDENCE.md` records that deleting the `nominal` member turns `pnpm test:tstyche` red in both passes (2 failed, 4 diagnostics), so the pins can fail. The `Equal`, `Hash` and `JSON.stringify` bytes are pinned by `AuditEntry.characterisation.test.ts`, written on the base and unchanged through the freeze. The assignment route is `decodeAuditEntry({ record, sequenceNumber })` and is recorded in ADR-QD-190 (AROW-03; the plan-time "no setter" decision stands). Freezing the row (`madeByCodec`) leaves `holds()` and `planPurge` working: retention, equality and round-trip suites are green. |
| 3 | `decodeAuditEntry` reads the envelope first with `record` unwalked, then the record, through `untrustedDecoder`, with no new `Schema.decode*` or `JSON.parse` token; refusal tags unchanged; a characterisation matrix written on the base (including a both-bad row) shows every message and precedence change, tabulated by the ADR | VERIFIED | `AuditEntry.ts` `decodeAuditEntry`: `decodeRow` (`untrustedDecoder(..., { unknownKeys: "refuse", unwalked: ["record"] })`) runs first, then `decodeSinkRecordWithJson(row.success.record)`. The hand `hasProperty` pre-check is gone. `node scripts/check-house-style.mjs` reports "590 file(s) clean", so `UNTRUSTED_DECODE_BUDGET` did not move. `AuditEntry.characterisation.test.ts` pins every row (null, string, number, array, `{}`, bad `sequenceNumber`, extra key, too deep, version 1, inconsistent, both-bad). `77-RED-EVIDENCE.md` shows restoring the old record-first order turns 9 tests red. ADR-QD-190 tabulates input, before and after. |
| 4 | The checks the brand makes dead (`isSequenceNumber`, write-path `SequenceNumberInvalid`, `Retention`'s `undated` branch and fields) are removed or kept with a recorded reason; the safe-integer rule is stated in one place; a record-domain round-trip property mirrors `ArchiveRoundTrip.test.ts`'s sequence-number one | VERIFIED | `grep` over `packages/*/src` and `packages/audit/README.md` finds no `SequenceNumberInvalid`, `undated`, `isSequenceNumber` or `invalidSequenceNumber`. The only live mention is `spec/overview.md:779`, a note that `undated` was removed. The rule is stated once, as `SequenceNumber = Schema.optional(Schema.Int)` in `AuditEntry.ts`. `ArchiveRoundTrip.test.ts` holds "PROPERTY: over any record, the codec refuses it or reads it back" (hostile values: lone surrogate, `-0`, `__proto__`, `Date`) and "PROPERTY: over any number, the codec sets the domain". |
| 5 | ADR-QD-190 records the brand, the decode order and the refusal table and amends ADR-QD-110; INV-QD-101, BEH-QD-253 and the affected `spec/overview.md` rows move with it; a `@qadi/audit` changeset marks the change Breaking with an upgrade-guide entry | VERIFIED | `spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md` (431 lines, with the 2026-11-24 amendment sections); ADR-QD-110 and ADR-QD-056 each cite ADR-QD-190; `spec/decisions/index.yaml` has the entry; CCR-QD-469 row at `spec/README.md:406`; BEH-QD-721 and 722 at `spec/behaviors/33-audit-pipeline.md:1168,1208`; INV-QD-399 and 400 in `spec/invariants.md`; `.changeset/audit-row-made-only-by-its-codec.md` is `"@qadi/audit": minor` and opens with **Breaking**; `apps/website/.../reference/upgrading.md` has the 0.13 rows (lines 1159-1211). `bash spec/scripts/verify-traceability.sh --strict`: PASS 21, FAIL 0, SKIP 0. |

**Score:** 5/5 truths verified (0 behavior-unverified; every behavior-dependent truth has a passing behavioral test).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/audit/src/AuditEntry.ts` | nominal class, codec-only maker, envelope-first decode | VERIFIED | Substantive and wired: `AuditArchive.ts`, `ArchiveFacts.ts`, `Retention.ts` import the type; `readAuditArchive` decodes through `decodeAuditEntry`. |
| `packages/audit/src/CodecMade.ts` | package-private membership set and rows refusal | VERIFIED | Not re-exported by `index.ts`; used by `AuditEntry.ts` (`markCodecMade`), `ArchiveFacts.ts` and `Retention.ts` (`rowsRefusal`). Module-scope `const`, so no `MODULE_STATE_BUDGET` row. |
| `packages/audit/src/ArchiveFacts.ts` | dead checks gone, `ArchiveInputRefusal` closed enum | VERIFIED | `verifiedArchiveFacts` asks `rowsRefusal` before any fact. |
| `packages/audit/src/AuditArchive.ts` | `now` guard, one-read `keyMaterial` snapshot, entries guard | VERIFIED | `snapshotKeyMaterial` reads each field once and returns the projected copy that was checked. |
| `packages/audit/src/Retention.ts` | `undated` removed, `RetentionInputRefusal` | VERIFIED | `planRetention` asks `rowsRefusal`; `planPurge` inherits it. |
| `packages/audit/test/AuditEntry.tst.ts` | negative pins with positive twins | VERIFIED | 6 negatives, each with a twin, shown failing without the brand. |
| `packages/audit/test/ArchiveWriterInputs.test.ts`, `ForeignRows.test.ts`, `AuditEntry.characterisation.test.ts` | base-side RED, run-time brand, decode matrix | VERIFIED | All present and green. |
| `77-mutation-base.json`, `77-mutation-close.json`, `77-mutation.mjs` | per-file Stryker records | VERIFIED | See spot-checks. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `encodeAuditEntry` / `decodeAuditEntry` | `markCodecMade` | `madeByCodec` (freeze, then mark) | WIRED, the only two callers |
| `archiveAuditTrail` | `rowsRefusal` | `verifiedArchiveFacts` | WIRED, before `archiveFacts` |
| `planPurge` | `rowsRefusal` | `planRetention` | WIRED |
| `verifySequenceIntegrity` | `rowsRefusal` | `verifiedArchiveFacts` | WIRED |
| `readAuditArchive` | `decodeAuditEntry` | per entry, from its own root | WIRED |
| `SequenceIntegrity.ts` | `ArchiveFacts.ts` | two-name re-export for the barrel | WIRED |

### Data-Flow Trace (Level 4)

Not applicable: no rendered dynamic data. The data path that matters, a row from codec to bundle to reader, is covered by the whole-archive round-trip property.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Audit suite | `npx vitest run --project audit` | 31 files, 618 tests passed | PASS |
| Gate 13, public surface | `node scripts/check-api-surface.mjs` | 942 exports documented across 9 packages | PASS |
| House style | `node scripts/check-house-style.mjs` | 590 files clean, 3 declared switches, 75 type-test files | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict` | PASS 21, FAIL 0, SKIP 0 | PASS |
| Mutation compare | `node 77-mutation.mjs compare` | `AuditEntry.ts` 17/17 to 13/13, `ArchiveFacts.ts` 66/66 to 55/55, `AuditArchive.ts` 53/53 to 82/82, `Retention.ts` 59/59 to 57/57, `CodecMade.ts` 18/18; 0 survived, 0 no-coverage, no new Ignored mutant; "every score that fell lost only killed mutants" | PASS |
| Mutation script self-test | `node 77-mutation.mjs --self-test` | 31 passed | PASS |
| Merge gate recorded | `$TMPDIR/qd77/checkpr-fix3.log` | `run-check: ran 17 of 18 steps; "pnpm mutation" was skipped`, `EXIT:0` | PASS |
| Nothing outside `.planning` changed since the gate | `git diff --stat 13c0b7c7 HEAD -- . ':!.planning'` | empty | PASS |

I did not rerun the full `pnpm check:pr` or Stryker, as instructed. The WX-01 evidence is the recorded log plus the empty diff outside `.planning`, and the individual gates above re-run green.

### Probe Execution

No probes are declared by the phase's plans. Skipped.

### Requirements Coverage

Every ID in the PLAN frontmatter (`77-01` to `77-07`) was cross-checked against `.planning/REQUIREMENTS.md`. The union of the plans' `requirements:` is exactly the 13 phase IDs, and no requirement mapped to Phase 77 is orphaned.

| Requirement | Source Plan(s) | Status | Evidence |
|-------------|----------------|--------|----------|
| AROW-01 | 02, 03, 04 | SATISFIED | Truth 1. RED file, run-time writer guards, whole-archive property. |
| AROW-02 | 03, 04, 05 | SATISFIED | Truth 2. Nominal class, type-only export, schema value removed, 6 pins with twins. |
| AROW-03 | 03, 05 | SATISFIED | Truth 2. Route is `decodeAuditEntry({ record, sequenceNumber })`, recorded in ADR-QD-190. |
| AROW-04 | 02, 03, 05 | SATISFIED | Truth 3. Envelope first, `unwalked: ["record"]`, matrix on the base. |
| AROW-05 | 03, 04 | SATISFIED | Truth 4. Dead checks removed, rule stated once, record-domain property. |
| AROW-06 | 05, 06 | SATISFIED | Truth 5. ADR, CCR, BEH, INV, overview, changeset, upgrade guide. |
| WX-01 | 07 | SATISFIED | Recorded `check:pr` exit 0 at `13c0b7c7`, no later source change. |
| WX-02 | 05, 06 | SATISFIED | ADR-QD-190, CCR-QD-469, BEH-QD-721 to 722 (and the reserved block) and INV-QD-399 to 400 use only reserved ids; traceability gate green. |
| WX-03 | 03, 06 | SATISFIED | Gate 13 green (942 exports); `spec/overview.md` names `ArchiveInputInvalid`, `ArchiveInputRefusal`, `RetentionInputRefusal`, and drops `SequenceNumberInvalid` and `undated`. No `make*Feed` signature changed. |
| WX-04 | 03, 07 | SATISFIED | Added-lines scan over `packages`, `features` and `scripts` found no new `as` assertion (only the existing `as const` idiom), `!`, `any`, `switch`, `fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock, `Record<string, unknown>`, `Stryker disable` or module-scope `let`; the house-style gate agrees. `CodecMade.ts`'s `WeakSet` is a `const`. The one non-source edit, `scripts/check-api-surface.mjs`, teaches gate 13 a local export list. |
| WX-05 | 01, 07 | SATISFIED | Truth spot-check above: no file's score fell except by losing killed mutants, 0 survivors, 0 no-coverage. Coverage thresholds are part of the `check:pr` run. |
| WX-06 | 01, 02, 04, 07 | SATISFIED | Base-side RED and characterisation tests precede the change commit; `77-RED-EVIDENCE.md` records each new check seen failing. |
| WX-07 | all | SATISFIED | No D-numbers, plan ids or phase numbers found in shipped source or test titles by the house-style gate; nothing released. |

`REQUIREMENTS.md` still shows `WX-01` to `WX-07` as `Pending` ("All v1.9 phases"). That is by design for cross-cutting rows that close with the last phase, not a Phase 77 gap. AROW-01 to AROW-06 are checked `[x]` and `Complete`.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | | No `TBD`, `FIXME` or `XXX` marker, no stub return, no hollow prop in the modified audit sources | none | |

### Human Verification Required

None. The phase touches no UI and no runtime service.

### Noted limits, recorded, not gaps

- **Per-copy membership.** `CodecMade.ts` is one `WeakSet` per loaded copy of `@qadi/audit`. Two copies mean a row made by one is refused by the other as `ArchiveInputInvalid` naming `entries`. This is recorded in the `CodecMade.ts` header, the ADR-QD-190 amendment and the upgrade guide (iteration 2, IN-01, decided as record-and-keep).
- **Freeze is shallow on the record.** `madeByCodec` freezes the row and its top-level record object, which covers the two identity fields `sequenceNumber` and `record.at`. Nested host-supplied objects stay the host's. This is documented in `madeByCodec`'s comment.
- **Exact decode messages are pinned on purpose.** `AuditEntry.characterisation.test.ts` pins `effect`'s formatter wording. Iteration 1 (IN-03) kept it deliberately, with the reason in the test header.
- **ADR-QD-190 amendment 1** still names `firstNotCodecMade`, which the third amendment replaced with `rowsRefusal`; the text says so in place. Cosmetic.

### Gaps Summary

No gaps. The original live defect (a writer input the reader refuses) is closed at both layers: the compiler refuses a hand-built row, and the run-time membership check plus the `now`, `keyMaterial` and `entries` guards refuse what the compiler cannot (`any`, JavaScript callers). Every archive the writer returns is covered by the whole-archive property, and the phase's records, changeset and gates are consistent with the final code.

---

_Verified: 2026-11-24_
_Verifier: Claude (gsd-verifier)_
