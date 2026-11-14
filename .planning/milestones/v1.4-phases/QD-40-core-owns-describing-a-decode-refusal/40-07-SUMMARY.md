---
phase: QD-40-core-owns-describing-a-decode-refusal
plan: 07
subsystem: spec-records
tags: [decode-refusal, spec, adr, invariants, behaviors, overview, gate-13]
phase_base: eb5a94063ac2ba730eaff53ac7095b3e0add36ca
plan_head_before: c376c9e43a9e22eb71dce5c0343d1abe3e30eee8
plan_head_after: 2e8947f1
requires: [40-06]
provides:
  - "ADR-QD-153 Rev 1.1 with a Measured section (the single decode's cost, the new-refusal experiment before and after)"
  - "ADR-QD-095 and ADR-QD-143 CCR-QD-431 amendments; INV-QD-104 amended; INV-QD-325 new"
  - "BEH-QD-536 and BEH-QD-537 in 25-inspection.md; BEH-QD-204 restated in DecodeRefusal's tags"
  - "overview naming the six new exports, MalformedReason dropped; gate 13 green"
affects: [40-08, 40-09]
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: [amendment blocks keep old wording, spec-revise per document, bench lines copied verbatim into the ADR]
key-files:
  created: []
  modified:
    - spec/decisions/153-core-owns-describing-a-decode-refusal.md
    - spec/decisions/095-sinkcodec-owns-both-directions.md
    - spec/decisions/143-untrusted-json-is-decoded-through-one-module.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/behaviors/25-inspection.md
    - spec/behaviors/27-devtools-timeline.md
    - spec/behaviors/26-decision-stream.md
    - spec/overview.md
key-decisions:
  - "The ADR states the single decode stays at about 2.19x the mean (about 10 microseconds per record) and the two-decoders fallback is not taken"
  - "BEH-QD-204's three requirements are restated in core's tags; the five kebab words live only in its CCR-QD-431 amendment block"
requirements-completed: [DREF-07, WX-02, WX-03]
duration: ~20 min
completed: 2026-11-14
status: complete
commits: 2
---

# Phase 40 Plan 07: Spec records Summary

The phase is recorded in the specification: ADR-QD-153 carries what was measured, ADR-QD-095 and ADR-QD-143 are amended, INV-QD-104 is amended and INV-QD-325 added, BEH-QD-536 and BEH-QD-537 sit beside the record codec's behaviours, BEH-QD-204 is stated in core's tags, and the overview names every new export, which turns gate 13 green.

## Commits

- `398195d3` docs(40-07): ADR-QD-153 measured; ADR-QD-095 and ADR-QD-143 amended; INV-QD-104 amended, INV-QD-325 (five files: the three ADRs, `spec/invariants.md`, `spec/traceability.md`)
- `2e8947f1` docs(40-07): BEH-QD-536 and BEH-QD-537; BEH-QD-204 in core's tags; the overview names the new exports (five files: `25-inspection.md`, `27-devtools-timeline.md`, `26-decision-stream.md`, `overview.md`, `traceability.md`)

## Document revisions (40-08 copies these into the CCR row)

| Document | Before | After |
| -------- | ------ | ----- |
| `spec/decisions/153-core-owns-describing-a-decode-refusal.md` | 1.0 | 1.1 |
| `spec/decisions/095-sinkcodec-owns-both-directions.md` | 1.6 | 1.7 |
| `spec/decisions/143-untrusted-json-is-decoded-through-one-module.md` | 1.2 | 1.3 |
| `spec/invariants.md` | 1.120 | 1.121 |
| `spec/traceability.md` | 1.171 | 1.173 (once per commit) |
| `spec/behaviors/25-inspection.md` | 1.27 | 1.28 |
| `spec/behaviors/27-devtools-timeline.md` | 1.11 | 1.12 |
| `spec/behaviors/26-decision-stream.md` | 1.15 | 1.16 |
| `spec/overview.md` | 1.102 | 1.103 |

## What changed

- **ADR-QD-153 `## Measured`** (before `## Related`, no existing line changed): the two `- decodeSinkRecord alone:` lines copied verbatim from 40-02's and 40-04's summaries (120,796.63 hz, mean 0.0084 ms on the base; 54,601.48 hz, mean 0.0184 ms after, ratio 0.452 by hz, mean 2.19x), the per-record cost (about 10 microseconds, paid per frame on devtools' feed and per row on audit's read path), the single path staying and the two-decoders fallback not taken; and the new-refusal experiment (base: `tsc` names `Source.ts` only, plus one exhaustive read in the example's `api.ts` that `tsc` cannot see; after: `tsc` names only `packages/core/src/SinkWire.ts`, no `Match.type<DecodeRefusal>` left outside it).
- **ADR-QD-095:** an appended `> **Amended 2026-11-14 (CCR-QD-431, ARCH-87).**` block retiring D-09-f's `MalformedReason` (and the members ADR-QD-096 D-15-f and ADR-QD-106 added). **ADR-QD-143:** an appended `## Amendment (2026-11-14, ADR-QD-153, CCR-QD-431)` retiring the `AuditEntry.ts` row and the `recordJsonOf` non-seam, stating `SinkCodec.ts`'s count of 2 (`JSON.parse` plus `Schema.decodeTo`) and the total staying 11.
- **Invariants:** INV-QD-104 gains an amendment block naming `decodeRefusalAnnotations`, `describeDecodeRefusal`, that `Malformed.message` and `UnsupportedVersion.version` are never annotated, and `DecodeRefusal.test.ts`. INV-QD-098, INV-QD-099 and INV-QD-170 enforcement lines read "a `Malformed` refusal", "an `UnsupportedVersion` refusal" and "an `Inconsistent` refusal". INV-QD-325 appended after INV-QD-323; INV-QD-326 unused.
- **Behaviours:** BEH-QD-536 (the describer: `describeDecodeRefusal`, `decodeRefusalAnnotations`, `DecodeRefusalAnnotations`, `decodeRefusalOf`, bounds of 40 and 200 code units) and BEH-QD-537 (`decodeSinkRecordWithJson`, `DecodedSinkRecord`) between BEH-QD-200 and BEH-QD-511; BEH-QD-538 to 540 unused. BEH-QD-204 states `NotJson`, `TooDeep`, `Malformed`, `UnsupportedVersion`, `Inconsistent` and a third requirement for the default warning; the old words appear only in its CCR-QD-431 block. `26-decision-stream.md` carries the two CCR-QD-431 notes.
- **Overview:** new row `decodeSinkRecordWithJson`, `DecodedSinkRecord` (`SinkCodec.ts`); the `SinkRecordNotDecodable` prose and the `SinkWire.ts` leaf paragraph name `decodeRefusalOf`, `decodeRefusalAnnotations`, `DecodeRefusalAnnotations` and `describeDecodeRefusal`; the `decodeAuditEntry` row names the single decode; the devtools `Source` row no longer names `MalformedReason`; the `sourceFromEventSource` row says a bare record is a `Malformed` refusal.
- **Traceability:** INV-QD-325 row after INV-QD-323; INV-QD-104, INV-QD-099, `SinkWire.tst.ts`, `SinkCodec.test.ts`, `Source.test.ts`, `AuditEntry.test.ts` and the ADR-QD-153 row extended; the §1 `25 — Inspection` row gains BEH-QD-536, BEH-QD-537 and `SinkWire`; new `DecodeRefusal.test.ts` and `AuditEntryDifferential.test.ts` rows in place.

## Verification

- Task 1 and Task 2 plan verify scripts exit 0 (including the "no existing line changed" diff checks, the reserved-number checks and the no plan or decision id check).
- `node scripts/spec-revise.mjs --check`, `pnpm spec:verify:strict` (21 PASS, 0 FAIL), `pnpm spec:examples` (113 blocks compile), `pnpm spec:api` (gate 13: 925 exports documented across 9 packages; green, red since 40-03) and `node scripts/check-house-style.mjs` (498 files clean) all pass after the second commit.

## Deviations from Plan

**1. [Attribution] Commit trailer is `Claude Sonnet 5.5`, not `Claude Opus 5.5`**
- **Found during:** both commits
- **Issue:** the plan and brief ask for `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; this executor runs as Sonnet 5.5 and the session's attribution instruction gives the Sonnet line. Same choice as 40-05 and 40-06; the Opus line would misstate the author.
- **Fix:** Sonnet line as the last line of both messages. If a uniform milestone trailer matters, amend `398195d3` and `2e8947f1` (with 40-05's and 40-06's) before anything is pushed.
- **Commit:** 398195d3, 2e8947f1

**2. [Scope note] Backticked old words remain in history lines I was told not to touch**
- `git grep MalformedReason -- spec` still prints ADR-QD-095's D-09-f table row and its `:116` line, ADR-QD-096's D-15-f row and `:213`, and the CCR-QD-431 row in `spec/README.md`. These are the original decision text and change history, which the plan keeps (amendment blocks carry the correction), not current statements. No overview or behaviour line states `MalformedReason` as current.

**Total deviations:** 1 attribution, 1 scope note. **Impact:** none on content; the records are complete.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Flags

None. T-40-17: the ADR's bench lines are the summaries' lines verbatim (checked by the verify script), no removed line outside the Document Control rows and the three named invariants lines, no reserved number beyond ARCH-87, ADR-QD-153, CCR-QD-431, BEH-QD-536, BEH-QD-537, INV-QD-325 (BEH-QD-538 to 540 and INV-QD-326 unused). T-40-SC: no manifest or lockfile change.

## Self-Check: PASSED

- Commits `398195d3` and `2e8947f1` are ancestors of HEAD; `git status --porcelain -- spec packages` is empty.
- Files exist: all nine spec files above; `spec/behaviors/25-inspection.md` carries `## BEH-QD-537: A record and its JSON form come from one strict decode`; `spec/invariants.md` carries `## INV-QD-325`.
