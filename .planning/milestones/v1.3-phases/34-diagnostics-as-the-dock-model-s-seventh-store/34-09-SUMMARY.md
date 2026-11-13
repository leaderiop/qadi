---
phase: 34-diagnostics-as-the-dock-model-s-seventh-store
plan: 09
subsystem: verification
tags: [gates, mutation, stryker, check-pr, devtools]
status: complete

requires:
  - phase: 34-08
    provides: the spec records for the seventh store
provides:
  - 34-mutation-after.json (flat path-to-score map for the four model files)
  - the phase's gate, order, shape and mutation evidence
  - the three browser checks left for the verifier
affects: [verification]

actuals:
  tokens: 2000
  tasks: 3
  commits: 1
plan_head_before: b5d61c7216bbac70b65cbb251916eace61cdee19
plan_head_after: 380f8a918b28d35047e1bccb1f4850babcd76250
commits: 1

tech-stack:
  added: []
  patterns:
    - "closing plan: verification only, one committed record"

key-files:
  created:
    - .planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-mutation-after.json
  modified: []

key-decisions:
  - "The six DiagnosticsFeed.ts survivors stay named in 34-mutation-survivors.json: each is a distinction no run can observe, and the comparison confirms every named entry still survives and none is missing"

requirements-completed: [WX-01, WX-04, WX-05, WX-06]

duration: 4 min
completed: 2026-11-12
---

# Phase 34 Plan 09: Closing gates and mutation Summary

Gate integrity, the forbidden-token scan, commit order, test-edit shape, the model mutation comparison and `pnpm check:pr` all pass on the final committed tree; the only 34-09 commit is the mutation record.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 2 | 380f8a91 | chore(34-09): mutation result for the diagnostics and timeline feeds |

Tasks 1 and 3 are verification only and commit nothing.

## Task 1: the four checks (phase_base 20089321)

| Check | Exit |
|-------|------|
| Gate integrity (no judging file changed since the base) | 0 |
| WX-04 forbidden-token and suppression scan | 0 |
| Commit order (baseline alone, two pins alone before any src change, ten src commits with exactly their files, then 34-09 only) | 0 |
| Test-edit shape | 0 with one recorded narrowing (below); re-run after the last commit, same result |

## Task 2: mutation (`stryker.devtools.mjs`, four model files, one run)

| File | Base | After | Detected/scored |
|------|------|-------|-----------------|
| model/DockModel.ts | 1 | 1 | 48/48 |
| model/DiagnosticsStore.ts | 1 | 1 | 60/60 |
| model/DiagnosticsFeed.ts | new | 0.9388 | 92/98 |
| model/TimelineFeed.ts | new | 1 | 31/31 |

The comparison exited 0 from a fresh report. Stryker's own exit was 0 (total 97.47, break threshold 80). The report names no react file, no unmeasured file and none of the three deleted files, and no src file lies outside the base's lists.

DiagnosticsFeed.ts has six Survived mutants, each already named with a reason in `34-mutation-survivors.json` (34-02); no entry is stale and none is missing, so no test or restructure was added:

| Mutant | Reason it cannot be told apart |
|--------|--------------------------------|
| 184:9 ConditionalExpression (layer spread) | `layer: undefined` reads the same as an absent key; the conditional exists only for `exactOptionalPropertyTypes` |
| 185:9 ConditionalExpression (collector spread, `false`) | same; the `true` mutant here is killed by F22 |
| 186:9 ConditionalExpression (questions spread) | same |
| 191:5 AssignmentOperator (`generation -= 1`, start) | the token only has to be distinct per run |
| 200:13 ConditionalExpression (run token in the marking accept) | a replaced run is interrupted before it reaches the accept; F16 shows this; guard is defence in depth |
| 222:5 AssignmentOperator (`generation -= 1`, off) | as for start |

`34-mutation-after.json` is a flat map committed alone.

## Task 3: merge gate on the final committed tree

- `pnpm check:pr < /dev/null` ran on HEAD `380f8a91`, exit 0, 134 s, 16 of 17 steps (mutation skipped by design).
- Coverage (vitest, whole repo): Statements 99.46%, Branches 97.99%, Functions 99.3%, Lines 99.75%. Devtools rows: `devtools/src/model` 99.82 / 99.25 / 100 / 100; `devtools/src/react` 98.75 / 94.09 / 97.52 / 99.14 (stmts / branch / funcs / lines). 4807 tests in 192 files passed.
- Constraint check: exit 0 (34-09's only commit touches only a planning record; no test line removed; nothing uncommitted under packages, scripts, spec, apps, examples, .changeset; neither tool-managed planning file staged).

## Deviations from Plan

### Narrowed checks

**1. [Recorded 34-07 deviation] Test-edit shape check, planned-set list**
- **Found during:** Task 1, check 4
- **Issue:** `test file changed outside the planned set: packages/devtools/test/react/VerdictTreatment.test.tsx`. This is the 34-07 deviation commit 11352941 (the mechanical insertion of the required `diagnostics` prop).
- **Fix:** none to the code. I re-ran check 4 with that one file added to its allowed list and nothing else loosened. The file's diff against the base is exactly one added import (`liveNotice`) and one line changed (`<QuestionsPanel` to `<QuestionsPanel diagnostics={liveNotice}`); no assertion touched. The narrowed run exited 0, both before and after the last commit.
- **Files modified:** none.

**Total deviations:** 1 recorded narrowing, no code change. **Impact:** none.

Carried milestone facts, not gate failures: commits 4f22f6a7 and f3cdf7a3 (phase 31) carry a Sonnet trailer, and 896addf1 and 56981394 carry none; both are outside this phase's range.

## Known Stubs

None.

## Threat Flags

None. Verification only; no code, endpoint or trust boundary changed.

## human_needed

Three checks only a real browser answers. Not blocking. In the example app run `pnpm --filter @qadi/example-nextjs dev` and open the dock.

1. **Activity hide and show.** Hide the dock inside an `Activity` and show it again. The Services and React screens state that sampling is starting, then show a fresh reading; nothing from before the hide flashes.
2. **Stopped notice legibility.** Cause the poll to stop (for example by making a layer fail). The notice's amber tint and its text are legible in both the light and dark themes.
3. **Restart focus and announcement.** Press Restart diagnostics. Focus lands on the screen root, and a screen reader announces the stop once per stop, not on every re-render.

## Self-Check: PASSED

- `34-mutation-after.json` exists and is committed alone in 380f8a91 (ancestor of HEAD).
- The commit message ends with the Opus 5.5 trailer.
- `.planning/config.json` and `.planning/state.json` never staged.
