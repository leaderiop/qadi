---
phase: QD-58-a-stored-record-is-its-envelope-in-memory-too
plan: 03
subsystem: devtools-http
tags: [characterisation, merged-order, timeline-order, wire-bytes, stored-record]
requires:
  - phase: QD-58
    provides: "58-02's core characterisation and RED rows on the untouched base"
provides:
  - "devtools' merged backlog order (M1, M2), timeline row order beside an orphan (T1, T2) and the unchanged entry key (T3), green on the base"
  - "the http encoders' stored bytes for real-log records (W1, W2), green on the base"
affects: [58-04, 58-09]
actuals:
  tokens: 3000
  tasks: 2
  commits: 2
plan_head_before: e96c108474317eacd1f08c6e8f172d8204295c4c
plan_head_after: ac9fc05cd3f25b4f41dabaa99a2d01093883e2c7
tech-stack:
  added: []
  patterns: ["merged order read through the encoder (idOf), timeline order through display rows, http bytes through jsonElements/recordData over a real log's snapshot"]
key-files:
  created:
    - packages/devtools/test/model/StoredOrder.test.ts
    - packages/http/test/StoredEnvelopeWire.test.ts
  modified: []
key-decisions:
  - "The http test copies the two core fixture texts with their source named, importing no core test file"
requirements-completed: [STOR-02, STOR-03, WX-06]
duration: 4min
completed: 2026-11-19
status: complete
---

# Phase QD-58 Plan 03: devtools and http characterisation

**devtools' merged backlog and timeline order (an orphan beside decisions of differing `at`, `NaN` last) and the http encoders' stored bytes pinned green on the base, read only through public API and display rows.**

## Characterisation

`packages/devtools/test/model/StoredOrder.test.ts` (`pnpm exec vitest run --project devtools packages/devtools/test/model/StoredOrder.test.ts`: 5 passed), one describe, five rows:

- M1: `[a3@3, aN@NaN]` and `[b1@1, bN@NaN, b2@2]` merge to `b1, b2, a3, aN, bN`.
- M2: `[p@5, r@5]` and `[q@5]` merge to `p, r, q`.
- T1: decisions `d2@2000`, `d1@1000` and an orphan `o1@1500` read `d1, o1, d2`, tagged `TimelineDecision, TimelineOrphan, TimelineDecision` (D-13: both arms compared).
- T2: an orphan at `NaN` sorts after a decision at 1000; a decision at `NaN` after an orphan at 10.
- T3: entry keys `TimelineDecision|Server|d1|1000`, `TimelineOrphan|Server|o1|1500`, `TimelineDecision|Server|d2|2000` (D-04).

`packages/http/test/StoredEnvelopeWire.test.ts` (`pnpm exec vitest run --project http packages/http/test/StoredEnvelopeWire.test.ts`: 2 passed), one describe, two rows, each over a failed decision and an obligations record under `Server` and `a"b`, ingested into a real log:

- W1: `jsonElements([stored])` has one element deep-equal to the parsed composed envelope.
- W2: `recordData()(stored)` is `Option.some` of exactly the composed text.

`pnpm -s typecheck` exits 0 with both files committed. No row reads a field of a stored record or names a deleted symbol; no `packages/*/src` file and not devtools' `test/helpers.ts` changed since `phase_base`.

## Task Commits

1. Task 1: `8ab597da` `test(58-03): characterise devtools' merged backlog and timeline order on the base`
2. Task 2: `ac9fc05c` `test(58-03): characterise the http encoders' stored bytes on the base`

## Deviations from Plan

None - plan executed exactly as written. (One compile fix inside Task 2 before its commit: the first draft's tuple table widened its elements to `string | undefined`; it became a table of named objects. No assertion changed.)

## Issues Encountered

None.

## Known Stubs

None.

## Next Phase Readiness

58-04 must leave all seven rows green unedited when it rewrites `test/helpers.ts`'s builder bodies and the stored record's shape (58-09's scan refuses any commit but `test(58-03|05)` touching either file).

## Self-Check: PASSED

- Both test files exist; `8ab597da` and `ac9fc05c` are ancestors of HEAD.
- Task 1's and Task 2's verifies exit 0; no change under `packages/*/src`; `.planning/config.json` not staged.
