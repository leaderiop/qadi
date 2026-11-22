---
phase: QD-61-decisioncache-is-asked-only-the-question
plan: 07
subsystem: verification
tags: [scan, mutation-compare, check-pr, release-check, requirements]
phase_base: 7d2d281d3f395b04ea584cf55ae6be44e1f4aaf3
requires: [61-06]
provides:
  - 61-scan.mjs, the phase's close scan, SHA-256 pinned, clean over phase_base..HEAD
  - WX-05 still holds at the close (D-06 compare)
  - pnpm check:pr green, run alone (WX-01)
  - release check: one changeset, nothing versioned, tagged or pushed (WX-07)
  - CASK-01..04 complete in REQUIREMENTS.md
affects: []
actuals:
  tokens: 9000
  tasks: 3
  commits: 2
plan_head_before: f2e2f2db
plan_head_after: 26678742
requirements-completed: [CASK-01, CASK-02, CASK-03, CASK-04]
completed: 2026-11-19
status: complete
---

# Phase QD-61 Plan 07: Close of the phase

**The phase scan prints `phase scan clean` over `7d2d281d..HEAD`, the D-06 compare ends `WX-05 holds (D-06)`, `pnpm check:pr` is green (152 s, run alone), one changeset was added and nothing was released, and CASK-01..04 are Complete; no fix commit was needed.**

## Commits

| Task | SHA | Subject |
| ---- | --- | ------- |
| 1 | 35c8fad6 | `chore(61-07): the phase scan` |
| 3 | 26678742 | `docs(61-07): CASK-01..04 complete` |

Each commit ends with the trailer. No `fix(61)` commit was needed, so the 61-04 mutation evidence (4661c111) is still
the last word on code. No file under `packages/*/src` or `packages/*/test` was touched.

## Phase scan

`61-scan.mjs` extracted byte for byte from the plan; `shasum -a 256` printed
`594baf91e2b047b1a50fa190b1a341c42b7646e8071c1a223972861fd0eeeec9`; `node --check` clean.

```
$ node .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-scan.mjs
phase scan clean
```

D-06 compare at the close (`61-mutation-static.json` exists, so it was passed):

```
packages/core/src/DecisionCache.ts 0.9761904761904762 -> 0.9767441860465116 (detected 41 -> 42; ... survivors +0 -0, moved 0)
  static: all 1 new ignored mutant(s) of packages/core/src/DecisionCache.ts are Killed in ...61-mutation-static.json
packages/core/src/Lifecycle.ts 1 -> 1 (detected 42 -> 42; ... survivors +0 -0, moved 0)
packages/core/src/SharedComputation.ts 0.9859154929577465 -> 0.9859154929577465 (detected 70 -> 70; ... survivors +0 -0, moved 0)
WX-05 holds (D-06)
```

## check:pr

`pnpm check:pr < /dev/null`, run alone (`pgrep -fl 'stryker|vitest'` empty first), exit 0, wall time 152 s.

```
[run-check 16/16] pnpm spec:publish
publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)

run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).
```

## Release

- `git diff --name-status 7d2d281d HEAD -- .changeset`: `A	.changeset/core-decision-cache-asked-the-question.md` and nothing else.
- No `CHANGELOG.md` or package manifest changed (the scan's frozen-file check is clean).
- `git tag --contains f1e690ca` (the first phase commit): empty. `git branch -r --contains f1e690ca`: empty.
- Not run: `changeset version`, publish, tag, push, `node scripts/next-id.mjs`.

## Requirements

CASK-01..04 are `- [x]` and `Complete` in the checklist and the traceability table. WX-01..07 lines and rows are
untouched and stay Pending (they span every v1.6 phase).

## Deviations from Plan

None - plan executed exactly as written.

## Next plan must know

This is the last plan of Phase 61. WX-01..07 stay Pending for the remaining v1.6 phases. The tree carries untracked
`.planning/state.json` and a modified `.planning/config.json`; neither was staged.

## Known Stubs

None.

## Self-Check

PASSED. `61-scan.mjs` found; commits 35c8fad6 and 26678742 are ancestors of HEAD.
