---
phase: QD-37-a-scoped-run-that-a-newer-run-supersedes
plan: 09
subsystem: testing
tags: [stryker, mutation, merge-gate, gate-integrity, devtools]
phase_base: c52e0d653e84702d64d7e18ac6c4505182dfe34b
plan_head_before: 1c206cd04706341c04591e36e2ddf1bf2265918e
plan_head_after: 021e3bf78741b49930bc664d68353df692545ba3
status: complete

requires: ["37-08"]
provides:
  - "37-mutation-after.json: the close's flat mutation result"
  - "37-mutation-survivors.json: the three equivalent SupersedingRun.ts survivors, each with a reason"
affects: []

actuals:
  tokens: 2500
  tasks: 3
  commits: 2

key-files:
  created:
    - .planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-mutation-after.json
    - .planning/phases/QD-37-a-scoped-run-that-a-newer-run-supersedes/37-mutation-survivors.json
  modified:
    - packages/devtools/test/model/SupersedingRun.test.ts

key-decisions:
  - "The three SupersedingRun.ts survivors are named as equivalent rather than killed or restructured: no input through the module's interface can tell them apart"

requirements-completed: [WX-01, WX-02, WX-03, WX-04, WX-05, WX-06, WX-07, RUN-02]

duration: 25 min
completed: 2026-11-14
---

# Phase 37 Plan 09: Phase close Summary

The whole phase checked from its base: no judging file touched, no forbidden construct added, commits in planned order, no store score below base, the new module's three survivors named as equivalent, and `pnpm check:pr` green on the final committed tree.

## Task 1: integrity, scan, order, shape, spec:api and circular

| Check | Exit |
|---|---|
| Gate integrity (no judging file changed, AGENTS.md only inside section 10) | 0 |
| Forbidden-token scan over added lines (WX-04) | 0 |
| Commit order (chore, test, test first; each RED alone and before its conversion; each src commit in its plan's files) | 0 |
| Test shape, protocol constructs only in SupersedingRun.ts, barrels and overview unchanged | 1, then 0 after the fix below |
| `pnpm spec:api` | 0 |
| `pnpm circular` | 0 |

## Task 2: mutation, against `37-mutation-base.json`

Stryker ran once, with the invocation 37-01 recorded plus the module, on a tree whose newest devtools file predated it. Overall 97.36, 515 killed, 1 timeout, 14 survived, 0 no-coverage, 1 min 49 s.

| File | Base | After | Detected/scored |
|---|---|---|---|
| TimelineFeed.ts | 1 | 1 | 47/47 |
| DiagnosticsFeed.ts | 0.9279279279279279 | 0.9473684210526315 | 90/95 |
| SimulationSession.ts | 0.9766763848396501 | 0.9818731117824774 | 325/331 |
| SupersedingRun.ts | new | 0.9473684210526315 | 54/57 |

No store dropped. The module's three survivors, named in `37-mutation-survivors.json`:

- `SupersedingRun.ts:89:29 ObjectLiteral` (`{ [tokenBrand]: true }` to `{}`): a token is compared by identity only, and `{}` is as distinct an object.
- `SupersedingRun.ts:89:45 BooleanLiteral` (`true` to `false`): the brand's value is never read; the key exists for the type.
- `SupersedingRun.ts:114:7 ConditionalExpression` (`onFailure === undefined` forced false): a hook-less fork would then pipe through `onExit` and throw inside `Effect.sync` for a current failing run, changing only the exit of a fiber nobody observes (the handle's deferred is never joined; Effect v4 logs no unhandled fiber failure for it).

The `drain` stale-held-token arm (`if (isCurrent(next.token))`) is not among the survivors: 37-04's property kills it. The stores' remaining survivors (DiagnosticsFeed 5, SimulationSession 6) are fewer than their base's 8 each and scores rose, so none needed a test.

## Task 3: merge gate

`pnpm check:pr < /dev/null` ran on `021e3bf7` (the last commit, nothing under packages, scripts, spec, apps, examples, .changeset or AGENTS.md uncommitted): exit 0, 158 s, 16 of 17 steps (mutation skipped by design, run directly in Task 2). Vitest coverage run: 202 files, 4946 tests passed; coverage all files 99.49 statements, 98.05 branches, 99.30 functions, 99.75 lines, thresholds met. Constraint check exit 0: no version-packages commit, no tag, `.changeset/superseding-run.md` still present.

## Commits

| Commit | Message |
|---|---|
| 32c6b3e4 | fix(37-04): drop a decision and requirement id from the property's doc comment |
| 021e3bf7 | chore(37-09): mutation result for the superseding run and its three stores |

## Deviations from Plan

**1. [Rule 1 - Bug] A decision and requirement id in a test doc comment**
- **Found during:** Task 1, test-shape check (`added lines name a plan or decision id`).
- **Issue:** 37-04's property comment in `SupersedingRun.test.ts` read "(D-11, RUN-07; the form of ...)".
- **Fix:** removed the parenthetical id pair, keeping the reference to `SharedComputation.test.ts`.
- **Files modified:** packages/devtools/test/model/SupersedingRun.test.ts
- **Commit:** 32c6b3e4. Committed as `fix(37-04)`, not `(37-09)`, because the line is 37-04's and any change to it removes a line that task 3's constraint check (which counts every removed test line in a `(37-09)` commit) would otherwise flag; a comment edit in a file this phase created is not the store-test deletion that check guards against. Every check re-ran green afterwards.

## Known Stubs

None.

## Self-Check: PASSED

37-mutation-after.json, 37-mutation-survivors.json found; commits 32c6b3e4 and 021e3bf7 are ancestors of HEAD.
