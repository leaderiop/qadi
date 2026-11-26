---
phase: QD-89-one-admission-step-for-a-host-s-audit-batch
verified: 2026-11-26T05:19:08Z
status: passed
score: 11/11 must-haves verified
covered_files:
  - .changeset/audit-batch-admitted-once.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-01-PLAN.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-01-SUMMARY.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-02-PLAN.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-02-SUMMARY.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-03-PLAN.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-03-SUMMARY.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-04-PLAN.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-04-SUMMARY.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-05-PLAN.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-05-SUMMARY.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-06-PLAN.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-06-SUMMARY.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-07-PLAN.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-07-SUMMARY.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-08-PLAN.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-08-SUMMARY.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-09-PLAN.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-09-SUMMARY.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-10-PLAN.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-10-SUMMARY.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-11-PLAN.md
  - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-11-SUMMARY.md
  - packages/audit/src/ArchiveFacts.ts
  - packages/audit/src/AuditArchive.ts
  - packages/audit/src/CodecMade.ts
  - packages/audit/src/HostBatch.ts
  - packages/audit/src/Retention.ts
  - packages/audit/test/AdmissionOrder.characterisation.test.ts
  - packages/audit/test/BatchReadOnce.test.ts
  - packages/audit/test/ForeignRows.test.ts
  - packages/audit/test/HostBatch.test.ts
  - packages/audit/test/HostBatch.tst.ts
  - packages/audit/test/MaxAgeAdmission.test.ts
  - packages/audit/test/Retention.test.ts
  - packages/audit/test/RowListAdmission.test.ts
  - packages/audit/test/hostBatchFaults.ts
  - spec/decisions/110-an-archives-facts-are-computed-once.md
  - spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md
  - spec/decisions/202-one-admission-step-for-a-hosts-audit-batch.md
covered_digest: "v4:sha256:ab917fa82abe4fe4cb99e53b85c299e1aba84bc98a13064e72d45ed13c3c2db8"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 89: One admission step for a host's audit batch — Verification Report

**Phase Goal:** A host's audit batch (`now`, rows, key material or max age) is admitted by one package-private step shared by `archiveAuditTrail`, `planRetention`, `verifiedArchiveFacts` and `planPurge`, and `NowNotFinite` is stated once.
**Verified:** 2026-11-26 at HEAD `235fa6fc` (phase base `8ee14f6f`; last code/spec commit `41acbff1`, where `pnpm check:pr` exited 0)
**Status:** passed
**Re-verification:** No — initial verification

Judged against the decided intent of `89-CONTEXT.md` and its addendum, and the review fix round `76d38f52..41acbff1`
recorded in `89-REVIEW-DISPOSITION.md`. Three readings of the roadmap wording are the context's, checked at HEAD and
accepted here: (1) the order is `now`, then the caller's terms, then the rows (context stale claim 4; the roadmap's own
planning note), not the goal's listing order; (2) `verifiedArchiveFacts` is package-private, so "shared by" holds as
"the public `verifySequenceIntegrity` calls `admitRows` first and `verifiedArchiveFacts` takes only the step's
`AdmittedRows`"; (3) "`CodecMade.ts` stays an import-free leaf" holds as "a leaf" (no `./` import) — it imported two
`effect` modules on the base and imports one now. The fix round overrode D-06's "`CodecMade.ts` byte-identical":
`rowsRefusal` became the leaf predicate `isCodecMade`, and `admitRows(entries: unknown)` checks each index as it reads
it. That override is declared in `89-pinned-check.mjs` and the `admission-step` judge, and the roadmap success
criteria do not require byte identity, so no override entry is needed.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / ADMIT-01: a characterisation written on the base pins, per entry point, which refusal wins for every pair of faults, and the spans each opens on a refusal | ✓ VERIFIED | `AdmissionOrder.characterisation.test.ts` born in `d7e4a0e7`, before any `src` change (`HostBatch.ts` born `16a97ff7`). Literal tables: writer W1-W18, `planRetention` R1-R13, `planPurge` P1-P13, verify V1-V4, `verifiedArchiveFacts` direct F1-F5; any-subset rows O1-O3; spans S1-S8 and SF1-SF4; laziness L1-L5. Later edits only in declared regions (`spanFlips`, `direct`, `header`, `impossible`); `89-pinned-check.mjs --all-applied` exit 0: "46 files hold their base text, 5 of 5 born files held, 5 of 5 declared edits applied". All rows green in the HEAD audit run. |
| 2 | SC2 / ADMIT-02: one package-private step checks a host batch in the pinned order; a plain function, no new span | ✓ VERIFIED | `HostBatch.ts:113-128` `admitBatch`: `Number.isFinite(batch.now)` (116), then `batch.terms()` once (119), then `admitRows(batch.entries)` (123). `admitRows` (88-105) is a plain function returning `Result`. Imports only `effect/Data`, `effect/Result`, `./AuditEntry.ts` (type) and `./CodecMade.ts` (128 lines, no `Effect`). Not in `src/index.ts`; `exports` map is `.` only. `89-check.mjs admission-step` exit 0. Behaviour: `HostBatch.test.ts` H2-H12 (every subset), H13/H14 (terms once, never on a refused `now`; rows unread on refused terms), H15/H16 (`NaN`, `±Infinity`, `"1"`, `undefined`, `null`, `1n` refused; `0`, `-0`, `1` admitted), all green. |
| 3 | SC2: every entry point calls the step first | ✓ VERIFIED | `AuditArchive.ts:186` (first statement of `archiveAuditTrail`): `admitBatch({ now, terms: () => snapshotKeyMaterial(options?.keyMaterial), entries })`, then `verifiedArchiveFacts(rows)` (191). `ArchiveFacts.ts:209-215`: `verifySequenceIntegrity` calls `admitRows(entries)` first. `Retention.ts:142` and `:192`: both plans `admitBatch({ now, terms: () => maxAgeOf(policy), entries })` first; `planPurge` no longer maps `planRetention` and walks `admitted.success.rows.entries` (201). `ArchiveFacts.ts:182-184`: `verifiedArchiveFacts(rows: AdmittedRows)`. `89-check.mjs entry-points-first` exit 0. |
| 4 | SC2: `CodecMade.ts` stays a leaf | ✓ VERIFIED | `CodecMade.ts` imports only `effect/Predicate` (25); no `./` import. The `admission-step` judge refuses a `./` import (seen failing in `89-RED-EVIDENCE.md` §"89 review fixes", with `pnpm circular` refusing the same edit). `isCodecMade(` called in `src` only by `HostBatch.ts` (judge exit 0). |
| 5 | SC3 / ADMIT-03: `NowNotFinite` stated once as a shared fragment; both unions, both errors, every tag and member unchanged; a type pin that can fail | ✓ VERIFIED | `grep "NowNotFinite:" packages/audit/src` → only `HostBatch.ts:25` (`NowRefusalCases`). `ArchiveFacts.ts:144-150` = `TaggedEnum<RowsRefusalCases & NowRefusalCases & {KeyMaterialNotAList; KeyMaterialItemRefused}>`; `Retention.ts:54-59` = `TaggedEnum<RowsRefusalCases & NowRefusalCases & {MaxAgeInvalid}>`; both keep their own `Data.taggedEnum` constructors and `Data.TaggedError` classes. `HostBatch.tst.ts` pins each union to its members spelled out, to its fragments plus own members, the shared members as one type, and `AdmittedRows` nominal (with `OtherAdmittedRows` twin and positive anchors). Seen failing on V1-V4, V6 and `entries-unknown` (`89-RED-EVIDENCE.md` §"89-07 the type pin", §"89 review fixes"). `pnpm test:tstyche` exit 0 (both passes list `HostBatch.tst.ts`). No callable pin added; `AGENTS.md` not in the phase diff, so `SCHEMA_ERROR_BUDGET` stays 12 and `NOT_CALLABLE_PIN_BUDGET` is unmoved. |
| 6 | SC4 / ADMIT-04: the order is tested once at the step; `ForeignRows.test.ts` keeps one case per entry point proving it calls the step | ✓ VERIFIED | Order asserted in `HostBatch.test.ts` H2-H12 only. `ForeignRows.test.ts` diff: five order rows removed (`a non-finite now…`, `planRetention reads now and maxAgeMs…`, `the inputs read before the rows…`, `now is read before the keys…`, `the rows are read after the keys…`); `Retention.test.ts` "checks now before maxAgeMs" removed — six, matching ADR-QD-202's "Tests removed: 6." One new `describe` with exactly four `it`s (writer, verify, `planRetention`, `planPurge`), each comparing the entry point's refusal with `admitBatch`/`admitRows` over `hostBatchFaults.ts`'s fault cross-product, never restating a winner. Held rows (rows before a break; `planPurge` fails before the archive is asked) still present. |
| 7 | The sequence span opens only for admitted rows; success traces unchanged (D-10, BEH-QD-783) | ✓ VERIFIED | SF1-SF4 written RED on the base in `08d25872` before the wiring commit `05d6e9da` (`89-RED-EVIDENCE.md` §"89-07 the archive wiring"); green at HEAD. S5/S7/F5 (success: writer span + child; verify exactly one span) green; `AuditArchive.test.ts` held (pinned check). Verify stays an unnamed `Effect.fn` (`ArchiveFacts.ts:209`). Variant "verify admits inside the span" fails F3/F4 (recorded). |
| 8 | Each input read once; what is checked is what is used; no input is a defect (D-12, BEH-QD-785, INV-QD-424) | ✓ VERIFIED | Rows: `admitRows` reads `length` once, refuses a non-number `length`, reads each index once into a fresh array and stops at the first refused index (`HostBatch.ts:92-103`). `maxAgeOf` (`Retention.ts:97-104`) reads `policy?.maxAgeMs` once and admits only `typeof value === "number" && value >= 0`; `ageRule` uses `batch.terms` (115). Behaviour, RED on the base/pre-fix then green: B1-B4, B6-B13 (`BatchReadOnce.test.ts`, born `940583c3` before the change), M1-M4 (`MaxAgeAdmission.test.ts`, CR-01), X1-X5 (`RowListAdmission.test.ts`, `RangeError` at 2^32 length closed); B5 preserved. |
| 9 | SC5 / ADMIT-05: ADR-QD-202, BEH-QD-722 and the invariant and traceability rows record the step | ✓ VERIFIED | `spec/decisions/202-one-admission-step-for-a-hosts-audit-batch.md` (audit table, "Tests removed: 6."); ADR-QD-190 amended (dated notes under decisions 3 and 5 naming `admitRows`/`isCodecMade`), ADR-QD-110 two dated notes; BEH-QD-781..785 and INV-QD-423..424 present in `33-audit-pipeline.md`, `invariants.md`, `traceability.md`; `index.yaml` holds ADR-QD-202; CCR-QD-481 row `spec/README.md:418`. `89-check.mjs records` and `records --close` exit 0; `pnpm spec:verify:strict` exit 0 (21 PASS, 0 FAIL, 0 SKIP). No live `rowsRefusal` reference left outside dated history. |
| 10 | Public surface unchanged; not Breaking; one patch changeset | ✓ VERIFIED | `HostBatch.ts` not in the barrel and not in `exports`; `spec/overview.md` not in the phase diff. One changeset added in the phase, `.changeset/audit-batch-admitted-once.md` (`"@qadi/audit": patch`, ends "No export changes."), naming the span change, read-once, the `maxAgeMs` fix and the INV-QD-399 fix. |
| 11 | Cross-cutting WX-01..07 hold | ✓ VERIFIED | WX-01: `pnpm check:pr` exit 0 at `41acbff1` (orchestrator-recorded; `git diff --stat 41acbff1..HEAD` is only `89-REVIEW-DISPOSITION.md`). WX-02: reserved ids only (`records --close`). WX-03: no export moved. WX-04: `scan-forbidden` exit 0; no budget change (`AGENTS.md`, `scripts/` not in diff). WX-05: `89-mutation.mjs compare` exit 0 (`HostBatch.ts` 38/38, every touched file 100%, `EQUIVALENT` empty, two `EXAMINED` static arrows killed by hand); coverage held in the `check:pr` run. WX-06: characterisation and RED rows precede each change (commit order above), every check seen failing (`89-RED-EVIDENCE.md`). WX-07: `scan-ids` and `trailers` (47 commits) exit 0; no remote branch contains HEAD, no upstream, no tag contains `8ee14f6f`, no `package.json`/`CHANGELOG.md` change, no `.planning/milestones`, `config.json`, root `README.md`, `.agents`, `.codex` path in the phase diff. `89-earlier-checks.mjs` exit 0 (85/86 `scan-ids`, 87 pinned and 88 `records --close` reports in its explained ledger). |

**Score:** 11/11 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/audit/src/HostBatch.ts` | the one step: `NowRefusalCases`, `AdmittedRows` (type-only export), `DatedBatch`, `AdmittedBatch`, `admitRows`, `admitBatch` | ✓ VERIFIED | 128 lines, plain functions, imported by `AuditArchive.ts`, `ArchiveFacts.ts`, `Retention.ts`; imports none of them back |
| `packages/audit/src/CodecMade.ts` | leaf record and `isCodecMade` predicate; `RowsRefusalCases` | ✓ VERIFIED | 59 lines, imports `effect/Predicate` only |
| `packages/audit/src/ArchiveFacts.ts` | union of fragments; `verifiedArchiveFacts(AdmittedRows)`; verify admits first | ✓ VERIFIED | 144-150, 182-190, 209-215 |
| `packages/audit/src/AuditArchive.ts` | writer admits first, builds from admitted values | ✓ VERIFIED | 186-191; `createdAt` from `admitted.now` |
| `packages/audit/src/Retention.ts` | `maxAgeOf`, `ageRule`, both plans admit first | ✓ VERIFIED | 97-122, 142, 192-201 |
| `test/AdmissionOrder.characterisation.test.ts` | base characterisation | ✓ VERIFIED | born on base, held except declared regions |
| `test/HostBatch.test.ts`, `test/HostBatch.tst.ts` | order table; type pin | ✓ VERIFIED | H1-H22; five pin tests |
| `test/ForeignRows.test.ts`, `test/hostBatchFaults.ts` | one case per entry point over a shared fault table | ✓ VERIFIED | four cases |
| `test/BatchReadOnce.test.ts`, `MaxAgeAdmission.test.ts`, `RowListAdmission.test.ts` | read-once and no-defect rows | ✓ VERIFIED | B1-B13, M1-M4, X1-X5 |
| `spec/decisions/202-…md` | ADR-QD-202 | ✓ VERIFIED | consistent with code (`isCodecMade`, check-as-read) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `archiveAuditTrail` | `admitBatch` | first statement, key-material thunk | WIRED | `AuditArchive.ts:186` |
| `archiveAuditTrail` | `verifiedArchiveFacts` | `admitted.success.rows` | WIRED | `AuditArchive.ts:191` |
| `verifySequenceIntegrity` | `admitRows` → `verifiedArchiveFacts` | first statement | WIRED | `ArchiveFacts.ts:210-214` |
| `planRetention` / `planPurge` | `admitBatch` → `ageRule` | `maxAgeOf(policy)` thunk | WIRED | `Retention.ts:142-146`, `192-201` |
| `admitRows` | `CodecMade.isCodecMade` | `isCodecMadeRow` guard per index | WIRED | `HostBatch.ts:75`, `99` |
| `ArchiveInputRefusal` / `RetentionInputRefusal` | `NowRefusalCases`, `RowsRefusalCases` | type intersection | WIRED | refusals assignable with no mapping (ForeignRows comparison rows green) |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `archiveAuditTrail` bundle | `createdAt`, `keyMaterial`, facts | `admitted.success` (the values checked) | Yes (B6: flipping list archived as the checked row, reader reads it back) | ✓ FLOWING |
| `ageRule` | `batch.terms`, `batch.rows.entries` | `maxAgeOf` result, `admitRows` snapshot | Yes (B1-B3 one read; B8/B9 the checked row planned) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Audit suite on HEAD (one full run) | `pnpm exec vitest run --project audit < /dev/null` | 36 files, 733 tests passed, exit 0 | ✓ PASS |
| Id scan / forbidden forms / trailers | `node 89-check.mjs scan-ids` / `scan-forbidden` / `trailers` | exit 0 each (47 commits trailed) | ✓ PASS |
| Step shape | `node 89-check.mjs admission-step` | exit 0 | ✓ PASS |
| Entry points first | `node 89-check.mjs entry-points-first` | exit 0 | ✓ PASS |
| Records | `node 89-check.mjs records` / `records --close` | exit 0 each | ✓ PASS |
| Pinned tests | `node 89-pinned-check.mjs --all-applied` | exit 0 | ✓ PASS |
| Earlier phases' checks | `node 89-earlier-checks.mjs` | exit 0 | ✓ PASS |
| Mutation close | `node 89-mutation.mjs compare` | exit 0; AuditArchive 78/78, ArchiveFacts 54/54, Retention 61/61, CodecMade 5/5, HostBatch 38/38, 0 survived | ✓ PASS |
| Spec | `pnpm spec:verify:strict < /dev/null` | 21 PASS, 0 FAIL, 0 SKIP, exit 0 | ✓ PASS |
| Type tests | `pnpm test:tstyche < /dev/null` | 80 files, 434 passed, 2 skipped (the `FloatingEffectPins.tst.ts` blocks skipped per pass by design), exit 0 | ✓ PASS |

`pnpm check:pr` and Stryker were not re-run (instructed: `check:pr` exit 0 recorded at `41acbff1`, only a `.planning` doc
landed after). No `.vitest/` directory was left behind, and the working tree under `packages/`, `spec/`, `.changeset/`,
`scripts/` and `AGENTS.md` is clean.

### Probe Execution

Step 7c: no `scripts/*/tests/probe-*.sh` declared by the phase; the phase's own check scripts above stand in and were
run in this process.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ADMIT-01 | 89-01 | base characterisation of winners and spans per entry point | ✓ SATISFIED | Truth 1 |
| ADMIT-02 | 89-05, 89-06, 89-07 | one package-private plain step, called first; `CodecMade.ts` a leaf | ✓ SATISFIED | Truths 2-4, 7 |
| ADMIT-03 | 89-05, 89-07 | `NowNotFinite` once; unions unchanged; failing-capable type pin | ✓ SATISFIED | Truth 5 |
| ADMIT-04 | 89-05, 89-08 | order tested once; one case per entry point | ✓ SATISFIED | Truth 6 |
| ADMIT-05 | 89-10 | ADR-QD-202, BEH-QD-722, INV/traceability | ✓ SATISFIED | Truth 9 |
| WX-01..07 | all | cross-cutting | ✓ SATISFIED | Truths 10-11 |

No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | none: no TBD/FIXME/XXX/TODO, no `as`/`!`/`any`/`switch`/`Effect.fn` in the step, no bare `isFinite(`, no module-scope `let` (the one `let index` is a loop binding inside `admitRows`) | — | — |

Informational only: "NowNotFinite stated once" is held by construction and the phase-local `admission-step` judge, which
`pnpm check` does not run (WR-03, recorded honestly in BEH-QD-784 and ADR-QD-202). Test titles carry row labels
(`H1`, `W1`, `SF1`), the same convention Phase 88 passed with; `scan-ids` refuses D-numbers, requirement ids and phase
wording, and found none. The `maxAgeMs` tightening (CR-01) refuses JavaScript-only inputs the base coerced; the type
was always `number` and the direction is fail-closed for a deletion selector, so a patch is consistent with the wave's
policy.

### Human Verification Required

None. Library behaviour only (UI hint: no). Every behaviour-dependent truth (order and laziness, span flips, read-once,
the proxied list, no defect on a hostile `length` or limit) is exercised by a named test that passed in the HEAD run.

### Gaps Summary

None. One plain, package-private `HostBatch.ts` admits every host batch in the order `now`, terms, rows, reading each
input once; all four public entry points call it first and `verifiedArchiveFacts` takes only its nominal
`AdmittedRows`. `NowNotFinite` is one fragment in both unchanged public unions, pinned by a type test seen failing. The
order is asserted once at the step, `ForeignRows.test.ts` holds one comparison case per entry point, and the spec
records match the code after the review fix round. All phase checks, the audit suite, the spec gate and the type tests
pass on HEAD, and nothing was released.

---

_Verified: 2026-11-26T05:19:08Z_
_Verifier: Claude (gsd-verifier)_
