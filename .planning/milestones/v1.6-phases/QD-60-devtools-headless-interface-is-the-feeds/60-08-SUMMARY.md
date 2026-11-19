---
phase: QD-60-devtools-headless-interface-is-the-feeds
plan: 08
subsystem: process
tags: [close, scan, check-pr, release-check, hdls-01, hdls-02, hdls-03, hdls-04, wx-01, wx-07]
phase_base: 35a48554388da6c68940c1b94a1cc526b3111eae
requires: [60-07]
provides:
  - "60-scan.mjs: the phase's close scan, clean over phase_base..HEAD"
  - "pnpm check:pr green, run alone (WX-01)"
  - "the release check: one changeset, nothing versioned, tagged or pushed (WX-07)"
  - "HDLS-01..04 complete in REQUIREMENTS.md"
affects: []
actuals:
  tokens: 9000
  tasks: 3
  commits: 2
plan_head_before: ade4d40b8e180e1d6712b0d2d707269d1088d4e3
plan_head_after: bb340a4cc647a783681abcc2fe2405845a8126b3
key-files:
  created:
    - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-scan.mjs
  modified:
    - .planning/REQUIREMENTS.md
requirements-completed: [HDLS-01, HDLS-02, HDLS-03, HDLS-04]
completed: 2026-11-19
status: complete
---

# Phase QD-60 Plan 08: Close the phase

**The phase scan is clean over `phase_base..HEAD`, `pnpm check:pr` is green run alone, nothing was released, and HDLS-01..04 are complete; WX-01..07 stay Pending.**

## Commits

| Task | Commit | Subject | Files |
| ---- | ------ | ------- | ----- |
| 1 | `0307acc2` | `chore(60-08): the phase scan` | `60-scan.mjs` |
| 3 | `bb340a4c` | `docs(60-08): HDLS-01..04 complete` | `.planning/REQUIREMENTS.md` |

`commits: 2` is measured from the ledger (`ade4d40b..bb340a4c`). The SUMMARY commit is separate. No `fix(60)` commit was needed.

## Phase scan

The verbatim block extracted to `60-scan.mjs` hashed to `bac21b86…3c88` and passed `node --check`. Its first run found two things, both the recorded `5d297faf` shape:

```
packages/devtools/test/surface.tst.ts was changed by test(60-03): call the feed through its Effect, not toBeCallableWith
packages/devtools/test/model/DiagnosticsStore.tst.ts was changed by test(60-03): call the feed through its Effect, not toBeCallableWith
```

Both are `5d297faf`, already recorded in CCR-QD-451 (the two positive `toBeCallableWith` pins changed form, 4 lines in each file, 6 insertions and 2 deletions). The scan's rule 5 allows a RED file to be changed only by `test(60-0[25])` or `fix(60…)`. It was amended once, narrowly: the RED-file history clause now also accepts the exact subject `test(60-03): call the feed through its Effect, not toBeCallableWith`, which one commit in the range carries (`git rev-list --count 35a48554..HEAD --grep=…` is 1). No class of commit was allowed. No other finding appeared.

Amended hash: `c5fb180829ed6b5d0a85df1914e96e06bdf382cfd2dd4a15a5084aa3e975570e` (the plan pinned the verbatim `bac21b86…`, so Task 1's first automated verify, which compares that hash, cannot pass as written; this is the recorded deviation below).

```
$ node 60-scan.mjs
phase scan clean
$ node 60-mutation.mjs compare 60-mutation-static.json | tail -3
packages/devtools/src/model/GatesFeed.ts 1 -> 1 (detected 118 -> 118; lost 0, rewritten 0, deleted 0; survivors +0 -0, moved 0)
packages/devtools/src/model/TimelineFeed.ts 1 -> 1 (detected 47 -> 47; lost 0, rewritten 0, deleted 0; survivors +0 -0, moved 0)
WX-05 holds (D-10)
```

## check:pr

`pnpm check:pr < /dev/null`, run alone (`pgrep -fl 'stryker|vitest'` empty beforehand), exit 0, 2:21.69 wall (273 s user):

```
[run-check 1/16] pnpm typecheck ... [run-check 16/16] pnpm spec:publish
publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)
run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).
```

Coverage ran 34 files / 568 tests and 7 files / 43 tests, all passed. The tree was clean of tracked changes afterwards.

## Release

```
git diff --name-status 35a48554 HEAD -- .changeset   A  .changeset/devtools-headless-interface-is-the-feeds.md
CHANGELOG / package.json changes since phase_base      0
git tag --contains 35a48554                            (empty)
git branch -r --contains 9e7e0dfe (first phase commit) (empty)
```

Nothing was versioned, published, tagged or pushed.

## Deviations from Plan

**1. [Rule 9 - Plan error, recorded amendment] The scan refused the recorded `5d297faf` shape**
- **Found during:** Task 1, step 2.
- **Issue:** 60-08's verbatim scan did not know the 60-03 edit of the two `.tst.ts` RED files (CCR-QD-451 records it).
- **Fix:** one clause in the RED-history rule accepts that exact subject; the scan's SHA is now `c5fb1808…570e`. The amendment was committed with the scan in `0307acc2`. Nothing else in the scan changed.

**2. [Verify note] Task 1's first automated hash check compares the verbatim hash**
- The plan's check `test "$S" = bac21b86…` would fail on the amended file. Every other part of that verify (scan clean, compare ends `WX-05 holds (D-10)`) was run as written and passed; the commit-shape verify passes (`chore(60-08)` holds the scan alone, trailer last).

## Known gates (expected red)

None. `pnpm check:pr` is green; `pnpm mutation` was not run (release PRs run it; the phase's own mutation evidence is `60-mutation-after.json`, judged by the scan).

## Next plan must know

This was the last plan of Phase 60. Open for the verifier: WX-01..07 stay Pending in `REQUIREMENTS.md` (they span every v1.6 phase); `.planning/config.json`, `.planning/state.json`, `.agents/`, `.codex/` and the `*.iter*.md` files are untouched and unstaged.

## Known Stubs

None.

## Self-Check: PASSED

Commits `0307acc2` and `bb340a4c` are ancestors of `HEAD`; `60-scan.mjs` exists and prints `phase scan clean`; HDLS-01..04 read `[x]` and `Complete`, every WX line and row unchanged.
