---
phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
plan: 07
subsystem: devtools
tags: [devtools, stopped-box, stop-ledger, scratch-variants, red-evidence, unmeasured-react]

phase_base: 892c4d36bf0f639a5219c53e7c39563533ea8b7e
plan_head_before: 25ed7b61913da5272da2cae27f2e972532db309f
plan_head_after: 6715c3b0c134f5358a2058937c3f4e3bff3931fd
commits: 2
status: complete

requires:
  - phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
    provides: the keyed StoppedBox, useStopNotice over useReducer and the born hook and dock rows (88-01, 88-05, 88-06)
provides:
  - thirteen scratch variants (V1 to V10, H3, VN1, VN2) run over the whole devtools project, each with its failing titles recorded in 88-RED-EVIDENCE.md
  - every variant id that 88-mutation.mjs UNMEASURED names proved by at least one failed row
affects: [QD-88 plans 08 to 10]

key-files:
  created: []
  modified:
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-RED-EVIDENCE.md

key-decisions:
  - "V2 (record during render) is caught by exactly the two hook rows H1 and C1 and by no dock row; the plan's claim 'H1 and no other row' is amended to 'hook rows only, H1 required' (plan defect 1)"

requirements-completed: []

actuals:
  tokens: 30000
  tasks: 2
  commits: 2

duration: ~25min
completed: 2026-11-26
---

# Phase 88 Plan 07: scratch variants over the unmeasured React files Summary

**Thirteen copy-backed variants of the stop path (the box, the hook, the dock wiring, both notices and the ledger key) each fail the rows written for them; the three properties no dock row sees are caught only by hook rows (V2 by H1 and C1, V6 by H2, V8 by C1), and `packages` is byte for byte HEAD after every run.**

## Variant table

Counts are rows failed over the whole devtools project (2087 rows in 109 files); a row that runs plain and in StrictMode counts twice. "Research" is the S5 expectation.

| Variant | Edits | Failed | Research | Rows that carry the proof |
| ------- | ----- | ------ | -------- | ------------------------- |
| V1 | `StoppedBox.tsx`: the layout effect removed | 16 | 16 | DS1, D7, N9, N12, TN14, TN15 (and TN4, A1 to A4 plain and strict, DS2) |
| V2 | `StoppedBox.tsx`: the record in the body render | 2 | 0 dock rows and H1 | H1, C1 (hook rows only; no dock row) |
| V3 | `StoppedBox.tsx`: the wrapper key a constant `0` | 8 | 8 | N9, N12, DS2, TN14, A2, A3 (plain and strict) |
| V4 | `useStopNotice.ts`, `StoppedBox.tsx`: fixed handle, the body holds its own `useReducer` | 16 | 15 | DS1, DS2, TN4, N9, D7, N12, A1 to A4, TN14, TN15 |
| V5 | `DevtoolsDock.tsx`: the diagnostics notice handed the timeline ledger handle | 8 | the five named | DS1, DS2, A1, A2, A4 (plain and strict) |
| V6 | `useStopNotice.ts`: memo without `onRestart` | 1 | 0 dock rows and H2 | H2 only |
| V7 | `StoppedBox.tsx`: the alert computed every render | 29 | 28 | N9, D7, N12, D4, D8, DS1 to DS3, TN3, TN4, TN6 to TN8, TN10, TN14, TN15, A1 to A5, H1 |
| V8 | `StoppedBox.tsx`: the record effect keyed on `[announced, status]` | 1 | 0 DOM rows | C1 only |
| V9 | `useStopNotice.ts`: memo without `ledger` | 12 | 13 | D7, A1 to A4, DS1, DS2, TN4 |
| V10 | `model/StopLedger.ts`: `stoppedKey` always `count + 1` | 34 | 33 | A5, LAW1, LAW3, TN4, L2, L6, and the dock rows, H1, C1 |
| H3 | `useStopNotice.ts`: the `useMemo` removed | 1 | n/a | H3 only |
| VN1 | `TimelineNotice.tsx`: a fixed ledger in place of the notice's own | 13 | n/a | TN4, TN14, TN15, A1 to A4, DS1, DS2 |
| VN2 | `DiagnosticsNotice.tsx`: the same, diagnostics arm | 9 | n/a | N9, N12, D7, A1, A2, DS1, DS2 |

Counts that differ from research are recorded as measured: research S5 predates the commit-limit row C1 (so V2, V7 and V10 gain it) and H1 (V7 and V10 gain it), and the plain and StrictMode runs of the A rows are counted separately here.

## Findings

- **V2 fails two rows, not one.** The plan says V2 fails H1 and no other row. A render-time dispatch to the parent's reducer also adds a commit, so the commit-limit row C1 fails with H1. Both are hook rows; no dock row fails, which is the property the plan states ("no dock row can see"). Recorded as measured and not narrowed.
- **V6, V8 and H3 each fail exactly one row, as the plan requires** (H2, C1, H3).
- No variant failed fewer rows than the plan names. Every `UNMEASURED` variant id has a section with a failed row.

## Deviations from Plan

### Plan defects (verify as written)

**1. [Rule 1 - Bug in the plan's own check] Task 1 verify requires V2 to fail exactly `H1`**
- **Found during:** Task 1 verify
- **Issue:** the check printed `V2 fails ["H1","C1"], not exactly H1`. The measurement is stable and the research table predates C1 (decision D-12a added it afterwards).
- **Fix:** ran the verify with one token changed, `const exact={V2:[\"H1\"]}` to `const exact={V2:[\"C1\",\"H1\"]}`; every other check is byte for byte the plan's, V2 must still fail H1, and the set may hold no dock row. It then exited 0. The plan file is not edited; a later reader of the plan's must_haves (`V2 fails H1 and no other row`) should read it as "H1 and C1, hook rows only".
- **Files modified:** none (the amended verify is a scratch copy)
- **Commit:** 850bbc14 holds V2's recorded section as measured.

### Decisions

**2. [Run rules] Variants were applied and restored by one scratch script** (`variant.mjs` in the session scratchpad): each edit is an exact-one-occurrence string replacement, the report goes to `$TMPDIR/qd88/v-<id>.json`, and the touched files are put back with `cp` from `$TMPDIR/qd88/v-orig/` in a `finally`. `git status --porcelain -- packages` printed nothing after every run. The plan's `.vitest` directory was never left behind.

**3. [Variant detail] V4** edits `useStopNotice.ts` to hand `{ ledger: noStops, record: () => undefined }` and gives `StoppedBody` its own `useReducer(recordStop, noStops)` that it reads for the alert and records into at commit; V5 hands the diagnostics notice `announced: timelineNotice.announced` at the `Screen` call; VN1 and VN2 add a `noStops` import and pass `{ ...notice, announced: { ledger: noStops, record: () => undefined } }` as the box's `notice`.

Total deviations: 1 plan defect (an overstated exactness claim), 2 decisions. Impact: none on the evidence; V2 is caught by the hook rows as designed.

## Check lines (as printed)

- Task 1 verify (amended token): exit 0 (V1, V3, V4, V5 hold every named row; V2 fails exactly C1 and H1; commit check holds exactly the evidence file).
- Task 2 verify: run as written after the evidence commit, exit 0 (V6 and V8 fail exactly H2 and C1; V7, V10 and H3 hold their rows; every UNMEASURED id is proved; one commit holds exactly the evidence file; the summary exists). `trailers: 20 commits since phase_base, each with the one trailer`; `scan-ids: no id or phase wording in added lines`.
- Scratch runs: `vitest: 2087 rows in 109 files, <n> failed` for each variant, counts in the table.

## Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 | 850bbc14 | docs(88-07): record the box and hook variants |
| 2 | 6715c3b0 | docs(88-07): record the remaining variants |

## Known Stubs

None.

## Threat Flags

None. No source file is changed; every scratch edit is restored (T-88-12, T-88-13).

## Self-Check: PASSED

- FOUND: .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-RED-EVIDENCE.md with sections V1 to V10, H3, VN1, VN2
- FOUND commits: 850bbc14, 6715c3b0 (each an ancestor of HEAD)
- `git status --porcelain -- packages` is empty
