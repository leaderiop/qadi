---
phase: 36-carried-spec-debt-and-stale-records
plan: 14
subsystem: verification
tags: [verification, mutation, ledger, merge-gate, stryker, check-pr]
requires:
  - phase: 36-carried-spec-debt-and-stale-records
    provides: "36-01..36-13: the baseline, ledger, code, tests and records this plan checks"
provides:
  - "36-mutation-after.json: the after-run scores of the 13 measured files and the 3 new modules, committed alone"
  - "36-mutation-survivors.json: one named survivor (TimelineNotice.tsx, an equivalent mutant)"
  - "36-LEDGER.md Closed by column: all 37 rows name their commit, evidence or reason"
  - "TF18, TF19 (TimelineFeed.test.ts) and TN11..TN15 (TimelineNotice.test.tsx), appended"
  - "pnpm check:pr green on 6382e8c1, Playwright e2e 30 passed"
affects: []
actuals:
  tokens: 9000
  tasks: 3
  commits: 4
commits: 4
plan_head_before: 521943c20d4a46c3f7743a207fd4801a94cd8b17
plan_head_after: 6382e8c1ac6c9f934b3100f8a9b39e30e026a3a3
tech-stack:
  added: []
  patterns:
    - "a late-failing replaced read is pinned with a latch held across the scope close, so a generation counter that moved the wrong way collides with the old read's token"
key-files:
  created:
    - .planning/phases/36-carried-spec-debt-and-stale-records/36-mutation-after.json
    - .planning/phases/36-carried-spec-debt-and-stale-records/36-mutation-survivors.json
  modified:
    - .planning/phases/36-carried-spec-debt-and-stale-records/36-LEDGER.md
    - packages/devtools/test/model/TimelineFeed.test.ts
    - packages/devtools/test/react/TimelineNotice.test.tsx
key-decisions:
  - "TimelineNotice.tsx:40:20 (`Reading: () => () => null` inner arrow to `() => undefined`) is named, not restructured: React renders null and undefined as the same nothing, so no input distinguishes it and any restructure keeps an arrow returning null"
  - "StoppedBox's effect dependency array is pinned by TN15 (a handed-over ledger is written) rather than named, because that input does distinguish `[announced, status]` from `[]`"
requirements-completed: [WX-01, WX-04, WX-05, WX-06]
status: complete
duration: 40 min
completed: 2026-11-13
---

# Phase 36 Plan 14: Closing the phase Summary

**No judging file moved beyond the one allowed comment, no forbidden token was added, nothing measured fell under mutation (TimelineFeed.ts back at 1.0000, StoppedBox.tsx and focusRing.ts at 1.0000, one named equivalent survivor in TimelineNotice.tsx), every ledger row names what closed it, and `pnpm check:pr` passes with the e2e at 30.**

## Commits

| Task | Hash | Subject |
|------|------|---------|
| 2 | `39068124` | test(36-14): the feed's close and the notice's lifetime are pinned |
| 2 | `7a08dae8` | test(36-14): TN11 sees a restart that has no focus target fail |
| 2 | `9e90f110` | chore(36-14): mutation result for phase 36 |
| 3 | `6382e8c1` | docs(36-14): the ledger names what closed each item |

Task 1 is verification only and made no commit. Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (checked with `git log -1 --format=%B`).

## Task 1: integrity, token scan, order, shape

Each check was run from the repository root with the plan's own script (not edited), and re-run after the test commits (checks 2 and 3 also after the last commit).

| Check | Exit | Result |
|-------|------|--------|
| Gate integrity (WX-01) | 1, expected | Only `examples/nextjs-newsroom/e2e/ssr.spec.ts` and `examples/nextjs-newsroom/src/client/Divergent.tsx` reported, both the user-authorized D-20 change from `5672f37c` (the seen-sequence pin `Success,Initial+waiting,Success` to `Success(SeededAllow),Success(Deny)`, with the exhibit's narrative corrected). No judging file other than `stryker.http.mjs` (comment only, `16146436`) changed |
| WX-04 scan | 0 | No forbidden token or suppression added |
| Commit order | 0 | Baseline alone first, ledger alone second; every RED before its fix; subject fix before seed fix; CCR-QD-427 row first outside `.planning/`; one `chore(36-10)` for `stryker.http.mjs`; every phase commit ends with the attribution line; no commit touches `.planning/config.json` or `.planning/state.json` |
| Test-edit shape | 1, one finding | `packages/devtools/test/model/Replay.tst.ts:17`: `expect<SimulationSnapshot>().type.not.toHaveProperty("baselineReading")`. This is 36-08's planned type-level pin that the removed field is absent; the check's removed-name grep has no exemption for a negative pin. Every other shape rule held: test files within the planned set, every base `expect(` line kept, the four rewritten files changed only by their planned plans, `.changeset/` as expected, no plan or decision id in an added line. The regex was not edited and the pin was not touched |

Expected exceptions allowed per the dispatch and recorded here, none a failure: 36-06's `DiagnosticsNotice.test.tsx` import split and `helpers.ts` `1 1` (no assertion line changed); 36-08's `SimulationSource.prepare.test.ts` `.prepared` edit and two added assertions, and the IN-01 type-level RED landing in the `feat(36-08)!:` commit (RED output logged in `36-08-red.log`); 36-13's `readonly baseline: Baseline | undefined;` listing; orchestrator `521943c2` (spec only) treated as part of 36-13's records. None of these were flagged by the checks beyond the two lines in the table above.

## Task 2: mutation, after against base

`stryker.devtools.mjs` over the base's measured devtools files and the three new modules, then `stryker.react.mjs` over the two react files, serially; logs `36-14-stryker-devtools.log` and `36-14-stryker-react.log` in the session scratchpad. The first devtools run exited 0 (score above 80), and the comparison found findings; after the tests below the devtools run was repeated and the comparison exits 0.

First comparison: a drop in `TimelineFeed.ts` (1.0000 to 0.9194, five survivors from the new generation token and `closed` flag) and nine unnamed survivors in the three new modules. All closed with tests appended to the planned files, no existing line removed.

| File | Base | After | Detected/scored |
|------|------|-------|-----------------|
| `devtools/src/model/TimelineFeed.ts` | 1.0000 | 1.0000 | 62/62 |
| `devtools/src/model/TimelineStore.ts` | 0.9697 | 0.9697 | 32/33 |
| `devtools/src/model/DockModel.ts` | 1.0000 | 1.0000 | 48/48 |
| `devtools/src/model/SimulationSource.ts` | 0.9841 | 0.9844 | 63/64 |
| `devtools/src/model/SimulationSession.ts` | 0.9745 | 0.9767 | 335/343 |
| `devtools/src/model/Replay.ts` | 1.0000 | 1.0000 | 95/95 |
| `devtools/src/react/useTimeline.ts` | 0.7500 | 0.7727 | 17/22 |
| `devtools/src/react/useDockModel.ts` | 1.0000 | 1.0000 | 9/9 |
| `devtools/src/react/DevtoolsDock.tsx` | 0.5873 | 0.6119 | 41/67 |
| `devtools/src/react/Simulator.tsx` | 0.5449 | 0.5640 | 97/172 |
| `devtools/src/react/DiagnosticsNotice.tsx` | 0.8444 | 0.9167 | 11/12 |
| `react/src/QadiAtoms.ts` | 0.8966 | 0.8966 | 52/58 |
| `react/src/HydrationEngine.ts` | 0.9776 | 0.9784 | 226/231 |
| `devtools/src/react/StoppedBox.tsx` (new) | | 1.0000 | 36/36 |
| `devtools/src/react/TimelineNotice.tsx` (new) | | 0.8000 | 4/5 |
| `devtools/src/react/focusRing.ts` (new) | | 1.0000 | 10/10 |

How each survivor was closed (`39068124`, `7a08dae8`):

- `TimelineFeed.ts:163` (`if (!closed)` always true) and `:129`, `:131` (the close finalizer emptied or `closed = false`): TF18, a restart on a closed feed that is Stopped must stay Stopped with nothing heard (TF17 only covered a feed already Reading, where re-setting Reading is invisible).
- `TimelineFeed.ts:130`, `:137` (`generation += 1` turned to `-= 1`): TF19, a replaced read whose release dies while the scope closes. A latch holds the old read's failing release until the close has run, so a counter that moved the wrong way equals the old read's token and would publish Stopped on a closed feed. (An early version closed the scope with the latch held and timed out: the scope close joins its reads, so the latch is released from inside the close.)
- `StoppedBox.tsx:110` (the focus guard always true): TN11, a restart clicked where no focus target exists must raise no error and log none. The first version of the test passed under the mutant because React swallows a handler's TypeError; TN11 now listens for the window `error` event and spies `console.error`, and was shown to fail with the mutation applied (source restored afterwards; `git status` clean).
- `StoppedBox.tsx:103` (always overwrite the ledger): TN14, a notice mounted again for the stop already announced leaves the count at 1.
- `StoppedBox.tsx:104` (dependency array emptied): TN15, a notice handed another ledger writes its stop there.
- `StoppedBox.tsx:119` and `:121` (`data-sampled` absent when not given; the lead's style): TN12 asserts no `data-sampled` attribute and the lead's `fontWeight` 600, and the slot's padding.
- `TimelineNotice.tsx:42` (slot style object and string): TN12.
- `focusRing.ts:17` (a ring drawn without focus-visible): TN13, `matches` stubbed false, no outline set.
- Named, not killed: `TimelineNotice.tsx:40:20 ArrowFunction`, in `36-mutation-survivors.json`. The Reading arm's `() => null` becomes `() => undefined`; React renders both as nothing, so no input tells them apart, and restructuring leaves an arrow returning null with the same mutant.

Other survivors in measured files (for example `Simulator.tsx`, `DevtoolsDock.tsx`) are the base's own and none of those files fell. `36-mutation-base.json` is in exactly one commit.

## Task 3: ledger and merge gate

Ledger: all 37 rows filled (`6382e8c1`); 29 `fixed` rows name a commit from the row's own plan, 8 rows are `resolved` (24 IN-04, 24 IN-05, 24 IN-06, 26 IN-01, 28 IN-06), `refuted` (27 IN-02) or `exempt` (24 IN-02, 29 IN-02), each with its commit, file:line or reason. The ledger check exits 0.

`pnpm check:pr < /dev/null` ran on commit `6382e8c1` (tree clean apart from the two tool-managed files): exit 0 in 190 s; log `36-14-checkpr.log` in the session scratchpad. 16 of 17 steps ran, mutation skipped as designed (Task 2 ran it directly). Gate 13 (`spec:api`) green. Summary lines:

- tstyche: 51 files, 254 tests passed (`Replay.tst.ts` passes).
- vitest with coverage: 200 files, 4917 tests passed; all files 99.47% statements, 98.02% branch, 99.75% lines; `react/src` 99.53 / 98.08 / 99.49; `devtools/src/react` 98.8 / 94.43 / 99.18 (thresholds pass).
- Playwright: `30 passed (6.9s)`, nothing failed or flaky (log check exits 0).

Constraint check (36-14's own commits touch only planned test files, the three new modules and `.planning/`): exit 1 on one finding. `39068124` changed one existing test line in `TimelineNotice.test.tsx`: `import { Activity, StrictMode } from "react";` became `import { Activity, StrictMode, type RefObject } from "react";`. It is an import, not an assertion, and every base `expect(` line is intact (shape check). Fixing the flag needs a history rewrite, which is out of bounds, so it is reported. Nothing outside `.planning/` is uncommitted and neither tool-managed file is staged.

## Deviations from Plan

### Findings reported, not patched

**1. [Reported] Test-edit shape, removed-name grep hits `Replay.tst.ts:17`**
- **Found during:** Task 1
- **Issue:** the grep for `baselineReading` also matches the negative type pin 36-08 wrote on purpose.
- **Fix:** none; the check's regex may not be edited and the pin may not be loosened. Recorded as a false positive.

**2. [Reported] Constraint check, one changed import line in `39068124`**
- **Found during:** Task 3
- **Issue:** see above; a separate `import type { RefObject } from "react";` line would have left the check green.
- **Fix:** none; a rewrite of an unpushed commit is still a history rewrite.

### Auto-fixed Issues

None to src. Tests added under the plan's own rule for survivors (Rule 2 in effect): TF18, TF19, TN11..TN15, and the TN11 strengthening in `7a08dae8`.

## Known Stubs

None.

## Threat Flags

None. No file added introduces a network endpoint, auth path or trust-boundary schema change.

## human_needed

Two checks from `36-VALIDATION.md` that automation cannot settle; not a blocking checkpoint.

1. **UI visual backstop.** In Chromium and one more browser, open the example's dock. Keyboard-focus the Services screen root and the dock body: each shows a 2px accent ring. Make the timeline stop (a source that dies): the notice shows the amber tint, the reason verbatim and the hardened Restart button. Attach screenshots.
2. **Seed assumption A1.** Whether React selective hydration mounts a gate after the provider's first macrotask in a real streaming Next render. It is covered indirectly by the e2e's SSR path (30 passed) and is recorded as an assumption.

Nothing was pushed, released, published or versioned; `.planning/config.json` and `.planning/state.json` were left unstaged.

## Self-Check: PASSED

Created files exist (`36-mutation-after.json`, `36-mutation-survivors.json`); commits `39068124`, `7a08dae8`, `9e90f110`, `6382e8c1` are ancestors of HEAD.
