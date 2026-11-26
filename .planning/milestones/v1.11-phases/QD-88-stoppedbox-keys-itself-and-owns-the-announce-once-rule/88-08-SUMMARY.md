---
phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
plan: 08
subsystem: devtools
tags: [devtools, stryker, stop-ledger, mutation-close, coverage, changeset]

phase_base: 892c4d36bf0f639a5219c53e7c39563533ea8b7e
plan_head_before: 24d1f2a8
plan_head_after: 2284458f91e9ce9ce1ef6d10cbf9c615f5ce3284
commits: 3
status: complete

requires:
  - phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
    provides: the born StopLedger.ts and its held test (88-05), the scorer and base record (88-01), the keyed box, hook and notices (88-06), the scratch variants (88-07)
provides:
  - 88-mutation-close.json, the ledger group measured on head 5951ac77 (12 Killed, 4 Ignored examined, 0 open)
  - EXAMINED in 88-mutation.mjs, the four static mutant kinds each run by hand and seen Killed
  - .changeset/devtools-stop-box-keys-itself.md, the one patch changeset for @qadi/devtools
affects: [QD-88 plans 09 to 10]

actuals:
  tokens: 2147
  tasks: 2
  commits: 3

key-files:
  created:
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-mutation-close.json
    - .changeset/devtools-stop-box-keys-itself.md
  modified:
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-mutation.mjs
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-RED-EVIDENCE.md

key-decisions:
  - "The four static Ignored mutants of StopLedger.ts (`ObjectLiteral {}` x1 on noStops, `ArrowFunction () => undefined` x3 on the three const-arrow bodies) are admitted through EXAMINED after a hand run with ignoreStatic false saw all 16 mutants Killed; StopLedger.test.ts rows L1 to L6 (and LAW1 to LAW3 for recordStop and noStops) are their killers, so no new killing row was needed."

requirements-completed: []

duration: ~12min
completed: 2026-11-26
---

# Phase 88 Plan 08: Stryker close of StopLedger.ts, coverage and the patch changeset Summary

**The born stop ledger closes absolutely under Stryker (12 Killed, 4 static Ignored each examined by hand and Killed, nothing open), coverage holds, and one `@qadi/devtools` patch changeset is written.**

## Performance

- **Tasks:** 2 (one tracer, one auto); **commits:** 3, plus the metadata commit
- Scratch files (logs, the two hand-run JSON reports) lived in `$TMPDIR/qd88`; the scratch Stryker config and a scratch vitest config were removed with `.stryker-tmp/` before every record.

## Accomplishments

- **Tracer (Task 1):** the canonical invocation `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/StopLedger.ts --disableBail` ran alone on a clean tree with stdin closed: 100.00 percent, 12 Killed, 0 Survived, 0 NoCoverage, 0 Timeout, 4 Ignored, 50 seconds. `probe ledger` was seen failing on the four Ignored mutants (first stderr line `StopLedger.ts:21 is new and Ignored: ObjectLiteral -> {}`), then each kind was run by hand with `ignoreStatic: false`: 16 mutants, all Killed. The killers of each kind are `StopLedger.test.ts` L1 to L6 (line 29 `stoppedKey`, line 37 `announcesStop`), L1 to L6 with LAW1 and LAW3 (line 45 `recordStop`; `noStops` at line 21 also LAW1, LAW3). `EXAMINED` now holds `ObjectLiteral {}`: 1 and `ArrowFunction () => undefined`: 3 with a comment per kind. `record close ledger` then `compare` pass, including the measured set (the 43 base model files keep their blobs, `StopLedger.ts` is the only model file added). The tracer verify passed before Task 2 began.
- **Coverage (Task 2):** `pnpm coverage` ran alone and exited 0 (all thresholds held; totals: statements 99.67, branches 98.71, functions 99.61, lines 99.84). Per-file lines from `coverage/lcov.info` (below).
- **Changeset:** `.changeset/devtools-stop-box-keys-itself.md`, `"@qadi/devtools": patch`, the D-04 sentence verbatim as one paragraph; the only changeset added since `phase_base`.

### Coverage lines (from `coverage/lcov.info`)

| File | Lines | Functions | Branches |
| ---- | ----- | --------- | -------- |
| `src/model/StopLedger.ts` | 6/6 | 3/3 | 4/4 |
| `src/react/StoppedBox.tsx` | 15/15 | 5/5 | 10/10 |
| `src/react/useStopNotice.ts` | 4/4 | 2/2 | 0/0 |
| `src/react/TimelineNotice.tsx` | 10/10 | 4/4 | 0/0 |
| `src/react/DiagnosticsNotice.tsx` | 21/21 | 8/8 | 2/2 |

### Phase checks on the close head (2284458f)

- `88-check.mjs scan-ids`: scan-ids: no id or phase wording in added lines
- `88-check.mjs scan-forbidden`: scan-forbidden: no forbidden form in added lines
- `88-check.mjs trailers`: trailers: 24 commits since phase_base, each with the one trailer
- `88-check.mjs box-keys-itself`: the stopped box keys itself, decides its alert at mount and records at commit; the notices hand it the notice whole
- `88-check.mjs ledger-module`: the stop ledger is one React-free module only the box and the hook import
- `88-check.mjs records`: the pinned-by lists name tests that exist
- `88-pinned-check.mjs --all-applied`: pinned: 130 files hold their base text, 3 of 3 born files held, 5 of 5 declared edits applied
- `88-earlier-checks.mjs`: 87-mutation.mjs --self-test 103 passed; 87-earlier-checks.mjs --self-test 21 passed
- `88-mutation.mjs compare`: the born module has no open, Timeout or unexamined Ignored mutant, every killed mutant is killed by its own tests, no measured model file moved and the measured code is the shipped code
- `88-mutation.mjs --self-test`: 68 passed

## Task Commits

1. `5951ac77` chore(88-08): admit the examined static mutants of the stop ledger (scorer and evidence)
2. `49daddba` docs(88-08): record the mutation close (`88-mutation-close.json` alone)
3. `2284458f` chore(88-08): add the patch changeset

## Deviations from Plan

**1. [Rule 1 - Bug] The scorer's self-test read the real allowance**
- **Found during:** Task 1, after filling `EXAMINED`
- **Issue:** the self-test helper `verdict` called `judgeNew` with the default `examined = EXAMINED`, so once the real allowance was non-empty every planted report with no Ignored mutant failed ("an allowance the close does not need"). The scorer's header and 88-01 say the self-test asserts nothing about the real `EXAMINED`.
- **Fix:** `judgeNew({ close: { files: read.out } }, [O], () => {}, K, [], {})`, passing an empty allowance explicitly, so the planted cases stay independent of the real constant. Self-test back to 68 passed.
- **Files modified:** `88-mutation.mjs`; **Commit:** `5951ac77`

**2. [Plan note - scratch config] The narrowed vitest run did not narrow**
- **Found during:** Task 1, the hand run
- **Issue:** the first hand run (whole suite, `ignoreStatic: false`) made the line 45 arrow a Timeout once (the whole suite under load). A scratch vitest config narrowing `include` to `StopLedger.test.ts` was tried for the second run; Stryker's vitest runner kept running the whole suite (dock and diagnostics rows appear among the killers, run time 1m41s). The second run is a whole-suite run, settled, with 16 Killed and no Timeout.
- **Fix:** none needed for the close (the canonical invocation was clean on its own); the examination is recorded as it ran in `88-RED-EVIDENCE.md` under `## 88-08 the mutation close`, both scratch configs removed.
- **Commit:** `5951ac77`

**3. [Plan defect - none] The verify blocks ran as written.** Neither `<automated>` embedded `rm -f`; the harness did not refuse them. The `ls stryker.examine*.mjs` step prints a zsh "no matches" line when nothing is left, which is the expected outcome.

**Total deviations:** 1 auto-fixed bug, 1 recorded run note. **Impact:** none on the close; no survivor appeared, so no `StopLedger.mutants.test.ts` was needed and the held `StopLedger.test.ts` was not touched.

## Known Stubs

None.

## Threat Flags

None: no endpoint, auth path or schema changed.

## Next

Ready for 88-09.

## Self-Check: PASSED

- `88-mutation-close.json`, `.changeset/devtools-stop-box-keys-itself.md`, `88-mutation.mjs` and `88-RED-EVIDENCE.md` exist; commits `5951ac77`, `49daddba` and `2284458f` are ancestors of HEAD.
- `.stryker-tmp/`, `.vitest/` and every scratch config are absent; `packages/` and `stryker.devtools.mjs` are clean.
