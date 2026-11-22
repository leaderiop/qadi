---
phase: QD-58-a-stored-record-is-its-envelope-in-memory-too
plan: 07
subsystem: spec
tags: [spec, invariants, behaviours, traceability, stored-record, envelope]
requires:
  - phase: QD-58
    provides: 58-04 the envelope change, 58-02/58-03 the characterisation tests, 58-06 ADR-QD-171
provides:
  - INV-QD-361, INV-QD-362 and the INV-QD-039 amendment
  - BEH-QD-626, BEH-QD-627, BEH-QD-628, BEH-QD-629, BEH-QD-630
  - BEH-QD-185, BEH-QD-188, BEH-QD-569 amended, the stamp prose in 26, 27 and 33 reworded
  - traceability rows for every new id and test file
affects: [58-08, 58-09]
actuals:
  tokens: 17000
  tasks: 3
  commits: 3
plan_head_before: b8f854d0ea8aa4244a131053051e3aa4afda5e8b
plan_head_after: cd01e9f8e0a7e8b55500b2b1f3e6761326fd14df
tech-stack:
  added: []
  patterns: ["a changed REQUIREMENT keeps its old text in an Amended in CCR-QD-449 note", "one order rule stated over a record, read over an envelope by Order.mapInput"]
key-files:
  created: []
  modified:
    - spec/invariants.md
    - spec/behaviors/24-decision-sink.md
    - spec/behaviors/26-decision-stream.md
    - spec/behaviors/27-devtools-timeline.md
    - spec/behaviors/33-audit-pipeline.md
    - spec/traceability.md
key-decisions:
  - "BEH-QD-630 and its amended notes use only the reserved ids BEH-QD-626..630 and INV-QD-361..362"
requirements-completed: [STOR-01, STOR-02, STOR-03, WX-02]
duration: 22min
completed: 2026-11-19
status: complete
---

# Phase QD-58 Plan 07: Invariants, behaviours and traceability for the stored envelope

**Two invariants and five behaviours state that a stored record is the envelope holding the record it was handed, with one order rule and no log-level catch; the forced amendments keep their old text, and traceability joins all of it to the tests.**

## Invariants

| Id | What it states | Document revision |
|---|---|---|
| INV-QD-361 | a stored record holds the record it was handed, by reference and with its class | `invariants.md` 1.156 to 1.157 |
| INV-QD-362 | a stored record's wire is its record's wire plus one field | same |
| INV-QD-039 (amended) | Source names `sinkRecordOrder`, `storedRecordOrder` over an envelope and the timeline's `recordOf`; Enforcement adds `DecisionRecord.test.ts`, `StoredEnvelope.test.ts` (O1 to O4) and `StoredOrder.test.ts` (M1, M2, T1 to T3) | same |

## Behaviours

| Id | Document | Revision |
|---|---|---|
| BEH-QD-626 a stored record is the envelope, holding the record it was handed | 24 | 1.18 to 1.19 |
| BEH-QD-628 one order rule, read over a record or over its envelope (NaN after known, unknowns equal, arrival order kept; pins O2/O3, M2/T2) | 24 | same |
| BEH-QD-630 a decision log's record path has no catch of its own | 24 | same |
| BEH-QD-627 the stored codec is the record codec plus one field | 26 | 1.17 to 1.18 |
| BEH-QD-629 the timeline ingests the envelope and keeps its rows flat | 27 | 1.13 to 1.14 |

## Amendments

Each changed requirement is quoted in an `Amended in CCR-QD-449 (ARCH-105)` note.

| Passage | Change |
|---|---|
| BEH-QD-185 (24) | the two-catches paragraph replaced by one sentence pointing to BEH-QD-630; old paragraph quoted |
| BEH-QD-569 (24) | W6 and W7 rows deleted; quoted as text lines in the note |
| BEH-QD-188 (24) | `ingest` MUST place the environment beside the record; "stamping them all" is "labelling them all"; old requirement quoted |
| environment paragraph and bare-record REQUIREMENT (26) | "stated once, by the producing log, beside the record"; "never given a label"; old line quoted |
| environment REQUIREMENT, refusal sentence, BEH-QD-205 listing and order sentence (27) | stated, not stamped; refused, never labelled; `ingest(self, stored: StoredRecord)`; `sinkRecordOrder` over the record each row was built from; old requirement quoted |
| archive REQUIREMENT (33) | `sinkRecordOrder`; old line quoted (33: 1.26 to 1.27) |

## Traceability

`traceability.md` 1.219 to 1.220. Section 1 ranges name BEH-QD-626..630; section 2 has INV-QD-361 and INV-QD-362 and a rewritten INV-QD-039 row; section 3 has an ADR-QD-171 row and the ADR-QD-097, ADR-QD-135 and ADR-QD-159 rows say they were amended by it; section 4 has rows for `StoredEnvelope.test.ts`, `StoredEnvelope.tst.ts`, `StoredOrder.test.ts` and `StoredEnvelopeWire.test.ts`, and the `ShippedSinkReports.test.ts` (C1 to C3, no append half), `DecisionLog.test.ts` ("stores the envelope and bounds") and `DecisionRecord.test.ts` (both orders, BEH-QD-628) rows are rewritten. `verify-traceability.sh --strict` fails only on `CCR register coverage` for 449, which 58-08 adds.

## Task Commits

1. **Task 1: INV-QD-361, INV-QD-362, INV-QD-039 amended** - `cc19ac05` (docs)
2. **Task 2: BEH-QD-626..630, the amendments, the stamp prose** - `b26403b4` (docs)
3. **Task 3: the traceability rows** - `cd01e9f8` (docs)

## Deviations from Plan

**1. [Tooling, orchestrator-authorised] `spec-revise` run with `--date 2026-11-19`** on every call; the script was not edited.

**2. [Verify defect, narrowest fix] Task 3's second automated check greps `CCR-QD-449`, but the strict script prints the bare number** (`... got [... 137 449]`). The first run of the plan's command therefore exited 1 with "a traceability check other than the pending CCR row fails". The same check was re-run with the grep on ` 449]`: exactly one FAIL, `CCR register coverage`, naming 449. No document was changed for this.

**3. [Wording] BEH-QD-630 says "the append" and "the publish" instead of the half-names**, because Task 2's verify refuses `append half` outside a quoted note; the meaning is the plan's.

**Total deviations:** 0 code, 3 tooling or wording notes. **Impact:** none.

## Issues Encountered

None. `spec-revise --check` and `pnpm -s spec:examples` (116 blocks compile) pass.

## Known Stubs

None.

## Threat Flags

None. T-58-15 holds: every changed requirement is quoted in an amended note, and Task 2's verify refused unquoted stamp or catch prose.

## Self-Check: PASSED

- Task 1 and Task 2 verifies exit 0; Task 3's first verify exits 0 and its second exits 0 after the grep fix above.
- `cc19ac05`, `b26403b4` and `cd01e9f8` are ancestors of HEAD, each ends with the trailer; `.planning/config.json` not staged; nothing pushed or released; `next-id` not run.
