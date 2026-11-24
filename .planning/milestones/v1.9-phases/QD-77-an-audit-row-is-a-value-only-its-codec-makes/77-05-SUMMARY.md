---
phase: QD-77-an-audit-row-is-a-value-only-its-codec-makes
plan: 05
subsystem: spec
tags: [adr, audit, traceability, amendment, spec]
requires:
  - phase: QD-77 plan 04
    provides: the type pins, the two properties, the evidence tables and the measured purge cost the ADR quotes
provides:
  - ADR-QD-190 at Rev 1.0, registered in index.yaml, traced in traceability.md section 3, and registered as CCR-QD-469 in spec/README.md
  - dated amendments to ADR-QD-110 (Rev 1.1) and ADR-QD-056 (Rev 1.16)
affects: [QD-77 plans 06 and 07]
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
plan_head_before: 7aee3b53d8947ed5b3b6dc782641eab22ee8b8b2
plan_head_after: 2a55b7d6a36422f70d9664d89657cd096c9b9e5b
key-files:
  created:
    - spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
    - spec/decisions/110-an-archives-facts-are-computed-once.md
    - spec/decisions/056-audit-companion-package.md
key-decisions:
  - "ADR-QD-190 records the brand, the decode order with the moved-row table, the writer-input table with base outcomes, the type pins, the purge-cost measurement and the autonomous provenance, with every rejected option from the discussion"
  - "The Date/undefined finding is recorded as a consequence: equal bytes, not Equal, so holds() retains the row and core's encoder is unchanged"
  - "ADR-QD-170 is applied unchanged, because its text does not name the row's decode order"
requirements-completed: [AROW-02, AROW-03, AROW-04, AROW-06, WX-02, WX-07]
coverage:
  - id: D1
    description: "ADR-QD-190 is on record with its six sections, refusal table, writer-input table and measured purge cost, and holds no plan-local id"
    requirement: "AROW-06"
    verification:
      - kind: other
        ref: "plan Task 1 verify (VERIFY1-OK) and bash spec/scripts/verify-traceability.sh --strict -> PASS: 21 FAIL: 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "ADR-QD-110 and ADR-QD-056 carry dated amendments naming what they retire, rewriting only their header rows"
    requirement: "AROW-06"
    verification:
      - kind: other
        ref: "plan Task 2 verify (VERIFY2-OK)"
        status: pass
    human_judgment: false
  - id: D3
    description: "WX-02: ADR-QD-190 is the only ADR added, its Document ID equals its number, and no id outside the reserved set is introduced"
    requirement: "WX-02"
    verification:
      - kind: other
        ref: "verify-traceability --strict: 147 ADR(s) traced, 123 ADR(s) agree (base 146 and 122)"
        status: pass
    human_judgment: false
duration: 14min
completed: 2026-11-24
status: complete
---

# Phase QD-77 Plan 05: An audit row is a value only its codec makes Summary

**ADR-QD-190 records the nominal row, the envelope-first decode with its before and after table, the writer-input table and the measured purge cost, and ADR-QD-110 and ADR-QD-056 carry dated amendments that retire what the brand made dead.**

## Performance
- Duration: 14 min (00:23Z to 00:37Z). Tasks: 2. Files: 6 (1 created). Commits: `a8f6f466`, `2a55b7d6`.

## Accomplishments
- **ADR-QD-190** (Rev 1.0, `QADI-ADR-190`, 2026-11-23, `Accepted — amends ADR-QD-110 and ADR-QD-056`), 12 numbered decisions: the nominal `Data.Class` with its type-only export and the compiler probes; the schema value removed; a store's number through `decodeAuditEntry`; the dead checks removed with the safe-integer rule stated once; the envelope-first decode with the seven moved rows (input, before, after, from 77-03) and the nine that did not move; `unknownKeys` kept `refuse` with ADR-QD-170 applied unchanged; the writer-input table with each row's base outcome (seven RED, four refuted rows grouped, from the RED evidence) and its outcome after; `ArchiveInputInvalid`; the `keyMaterial` projection; the six `@ts-expect-error` pins and why not a counted negative pin; the purge cost with the machine, method and fifteen counted rounds (median 22.36 us per row, `Hash.hash` alone 6 to 10 us); the autonomous provenance. Alternatives considered lists every rejected option of the discussion in one line each.
- **Consequences** name the five breaking changes, the `Date` or `undefined` finding (equal bytes, not `Equal`, so `holds()` retains such a row and core's encoder is unchanged), and that gate 13 learned a local export list.
- **Registration.** `index.yaml` ends with ADR-QD-190; `traceability.md` section 3 holds its row (INV-QD-101, INV-QD-054, INV-QD-130, INV-QD-097) after ADR-QD-189's, Rev 1.287; `spec/README.md` Rev 1.350 holds the CCR-QD-469 row after CCR-QD-468's, naming this plan's documents with their revisions and the files 77-03 and 77-04 changed, and stating that the BEH and INV text completes it.
- **Amendments.** ADR-QD-110 Rev 1.1 retires `SequenceNumberInvalid` and `invalidSequenceNumber` and moves the writer's refusal of a number to the codec; ADR-QD-056 Rev 1.16 retires `undated`, `SequenceNumberInvalid` and the schema note and states a row is made only by its codec. Each names the passages it reads differently by their dates; the only lines removed are the three header rows. The CCR-QD-469 row cites both.
- **Checks.** `bash spec/scripts/verify-traceability.sh --strict`: `PASS: 21 FAIL: 0 SKIP: 0`, 147 ADRs traced and 123 agreeing (base 146 and 122, so one more of each). ADR-QD-170 and every `packages/` file are byte-identical to before the plan.

## Task Commits
1. **Task 1 (tracer):** `a8f6f466` docs(77-05): record ADR-QD-190, an audit row is a value only its codec makes
2. **Task 2:** `2a55b7d6` docs(77-05): amend ADR-QD-110 and ADR-QD-056 for the codec-made row

The tracer's `<verify>` was re-run end to end after its commit before Task 2 started.

## Deviations from Plan

**1. [Rule 1 - Bug in the plan] The Task 1 verify expects the four committed files in an order `LC_ALL=C sort` cannot produce**
- **Found during:** Task 1 verify
- **Issue:** the expected string lists the ADR first, then `spec/README.md`. Under `LC_ALL=C` the capital `R` sorts before the lowercase `d`, so the sorted list starts with `spec/README.md`. The commit holds exactly the four required files.
- **Fix:** the verify was run with the expected string in sorted order (`spec/README.md`, the ADR, `index.yaml`, `traceability.md`). No source file changed; the check itself is the plan's, reordered.
- **Commit:** none (a scratch copy of the verify under the scratchpad)

**Total deviations:** 1 (a mis-ordered expectation in the plan's verify). **Impact:** none.

## Known Stubs
None.

## Threat Flags
None. Spec files only; no `package.json` or lockfile changed (T-77-SC). The ADR quotes committed evidence and measures, and the amendments append (T-77-13).

## Issues Encountered
`verify-traceability.sh --strict` takes longer than two minutes on this tree; it was run in the foreground with a ten minute timeout.

## Next Phase Readiness
Ready for 77-06: BEH-QD-721 and BEH-QD-722 and INV-QD-399 and INV-QD-400 are linked from ADR-QD-190 by file (`behaviors/33-audit-pipeline.md`, `invariants.md`), so the records they name must land in those two files; the CCR-QD-469 row is to be completed with them, the restated records, the changeset and the prose.

## Self-Check: PASSED
- FOUND: spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md, spec/decisions/index.yaml, spec/traceability.md, spec/README.md, spec/decisions/110-an-archives-facts-are-computed-once.md, spec/decisions/056-audit-companion-package.md
- FOUND commits a8f6f466 and 2a55b7d6 (ancestors of HEAD); both task verifies exit 0 (VERIFY1-OK, VERIFY2-OK)
