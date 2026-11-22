---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 12
subsystem: mutation close, phase close scan
status: complete
tags: [hygn-01, wx-03, wx-04, wx-05, wx-06, wx-07, mutation, close-scan]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: 68-02's mutation base (4813c67c), 68-05's bench of record (17dfa4ef), 68-11's CCR-QD-459 row and changeset (eacfeb6c)
provides:
  - "68-mutation-close.json: the close of both Stryker groups, measured on one commit (10880abb), with no file's score below its base and no new open or Ignored mutant"
  - "the phase's close scan, 13 checks, all ok on the real commit order (one corrected copy, see Deviations)"
affects: [68-13, 68-14, 68-15]

actuals:
  tokens: 3779
  tasks: 3
  commits: 1
plan_head_before: 10880abb65250378fb053e358b5d017d9900dbed
plan_head_after: 32ec9268b8189be7b336f78d2d84d3babb723e83
commits: 1

tech-stack:
  added: []
  patterns:
    - "a close scan that reads the real commit order from git, not the planned one"

key-files:
  created:
    - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-mutation-close.json
  modified: []

key-decisions:
  - "the close scan's commit-order list is corrected in a scratch copy for the owner's 2026-11-21 reorder (68-06 to 68-09 before 68-05); no condition is weakened and the corrected copy is shown still failing on a wrong order"

requirements-completed: [HYGN-01, WX-03, WX-04, WX-05, WX-06, WX-07]

coverage:
  - id: D1
    description: "the six edited source files' mutation scores did not fall below the base (HYGN-01, WX-05)"
    requirement: WX-05
    verification:
      - kind: other
        ref: "node 68-mutation.mjs compare: `no file's score fell below its base, and no file has an open or Ignored mutant its base did not have`"
        status: pass
    human_judgment: false
  - id: D2
    description: "no export added or removed; gate 13 at 939, gate 14 at 524 runtime exports (WX-03)"
    requirement: WX-03
    verification:
      - kind: other
        ref: "git diff <B> HEAD over the barrels and spec/overview.md is empty; api-surface: 939 export(s) documented across 9 package(s); package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))"
        status: pass
    human_judgment: false
  - id: D3
    description: "no forbidden token or milestone id on an added line, the scanner seen failing on a plant (WX-04, WX-06, WX-07)"
    requirement: WX-04
    verification:
      - kind: other
        ref: "added-tokens.mjs on the plant: `added-tokens: 2 hit(s)` naming as and milestone id; on the real diff `added-tokens: 0 hit(s)`"
        status: pass
    human_judgment: false
  - id: D4
    description: "the phase's close scan, 13 checks"
    requirement: WX-07
    verification:
      - kind: other
        ref: "bash close-scan.sh (reordered copy): `close-scan: 13 checks passed`"
        status: pass
    human_judgment: false
---

# Phase 68 Plan 12: Mutation Close and Close Scan Summary

Both Stryker groups were re-run alone on the final source tree, no file's score fell below 68-02's base, and the phase's 13-check close scan passes on the real commit order.

## Mutation close

Both groups were measured at `10880abb`, the same commit, with the invocations 68-02 used. The devtools group took 41 s and the core group 38 s, each alone, with nothing else running. Counts are detected over valid mutants.

| File | Base | Close | Ignored (base, close) |
| ---- | ---- | ----- | --------------------- |
| `packages/core/src/Admission.ts` | 20/20 | 20/20 | 3, 3 |
| `packages/core/src/DecisionLog.ts` | 66/66 | 66/66 | 2, 2 |
| `packages/core/src/SinkCodec.ts` | 123/127 | 123/127 | 45, 45 |
| `packages/core/src/UntrustedDecode.ts` | 44/46 | 44/46 | 5, 5 |
| `packages/devtools/src/model/DiagnosticsFeed.ts` | 72/73 | 73/73 | 13, 13 |
| `packages/devtools/src/model/TimelineFeed.ts` | 49/49 | 50/50 | 10, 10 |

`SinkCodec.ts` still has four open mutants (322, 324, 387, 391) and `UntrustedDecode.ts` two (244), the same ones the base recorded; the scorer found no new open or Ignored one. The one devtools base survivor (`DiagnosticsFeed.ts:165`) is gone, so that file closes at 100%. No test was added, no base re-recorded, no Stryker config edited and no suppression added.

Commit `32ec9268`: `docs(68-12): record the mutation close`, holding only `68-mutation-close.json`, with the trailer.

## Close scan

`bash close-scan-reordered.sh` ends `close-scan: 13 checks passed`:

```
ok 1 phase_base 3d66becb9034fb16ffd97ccd5966b92d972e3b8e is an ancestor of HEAD
ok 2 packages and features: exactly the planned files changed, besides tests that only gain lines
ok 3 texts: the sources, the README and the edited tests are the planned texts; the extended tests only gain lines; the wording-only files compile the same
ok 4 unchanged: the Stryker configs, the manifests and lockfile, AGENTS.md, spec/overview.md, the barrels, the dock's characterisation tests, the earlier phases' harness copies
ok 5 release: one @qadi/devtools patch changeset, no version, changelog or tag
ok 6 bans: no banned path committed
ok 7 tokens: no forbidden token, suppression comment or milestone id on an added line, and none left in StoredEnvelope.test.ts
ok 8 ccr-row: the CCR-QD-459 row cites every revised document at its current Revision
ok 9 texts: no text outside the change history describes what a fixed item changed as it was
ok 10 gates: house-style (every budget), api-surface and dod-table unchanged
ok 11 commits: the phase's commits in order, each with exactly the trailer
ok 12 bench: the bench of record passed, and no source, bench file or package.json changed after it
ok 13 mutation: no touched file's score fell below its base, and no mutant is newly open or newly ignored
close-scan: 13 checks passed
```

The scanner's plant (`x as string; // D-07` appended to `Admission.ts`) gave `added-tokens: 2 hit(s)` naming `as` and `milestone id`, and was reverted at once; on the real diff it prints `added-tokens: 0 hit(s)`. Gate 14 printed `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))`; gate 13 printed 939 with no barrel or `spec/overview.md` difference from the base.

Separately from check 12, `packages/*/src`, `packages/*/bench` and `package.json` are unchanged between `1e8c9b2b` and HEAD (empty diff), and unchanged since the bench commit `17dfa4ef`.

## Deviations from Plan

**1. [Rule 3 - Blocking] The close scan's commit list assumes 68-05 came right after 68-04**
- **Found during:** Task 3
- **Issue:** the owner reordered the run on 2026-11-21: 68-06 to 68-09 ran before 68-05. Check 11 of the unmodified `close-scan.sh` failed with `commits: out of order: test(68-06): ...` for that reason only; checks 1 to 10 passed unmodified.
- **Fix:** in a scratch copy, `docs(68-05): the bench of record` moved to follow `fix(68-09): ...` in check 11's list, matching `git log`; nothing else changed (`diff` shows exactly that move). Every condition is kept. A second copy with the line moved after `docs(68-10)` still fails with `out of order`, so the order condition can fail. The original script (SHA-256 `901b229b...`) is kept in the scratch directory.
- **Files modified:** none in the repository.

**2. [Rule 1 - Bug in plan check] Task 2's verify compares `68-mutation-base.json` against `<B>`**
- **Found during:** Task 2
- **Issue:** `68-mutation-base.json` was first created by 68-02 (`4813c67c`), after `<B>`, so `git diff --quiet <B> HEAD -- 68-mutation-base.json` is always non-empty and the verify stopped with `the base or a Stryker config changed`. Every other verify condition and the compare itself passed.
- **Fix:** a scratch copy of the verify checks the base file against its recording commit `4813c67c` (empty diff) and the two Stryker configs against `<B>` (empty diff); the suppression, one-commit, at-HEAD, only-the-record and trailer conditions are unchanged and pass. No condition was weakened.
- **Files modified:** none in the repository.

**Total deviations:** 2 (one Rule 3 for the reorder, one Rule 1 plan-check fix), both in scratch scripts. **Impact:** none on the repository; the planned condition is checked in each case on the real order and the real history.

## Known Stubs

None.

## Self-Check: PASSED

- `68-mutation-close.json` exists; commit `32ec9268` is an ancestor of HEAD and holds only that file.
- Close scan 13/13, task 3 verify (corrected scratch copy) passed.
