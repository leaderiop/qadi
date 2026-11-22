---
phase: QD-60-devtools-headless-interface-is-the-feeds
plan: 05
subsystem: devtools
tags: [mutation, evidence, wx-05, d-10]
phase_base: 35a48554388da6c68940c1b94a1cc526b3111eae
requires: [60-04]
provides:
  - "60-mutation-after.json and 60-mutation-static.json, and `compare` printing WX-05 holds (D-10)"
affects: [60-06, 60-07, 60-08]
actuals:
  tokens: 3000
  tasks: 3
  commits: 1
plan_head_before: 3576dc966bd827db4debd285730eabd700db39c8
plan_head_after: 2d9fdb749f1c0e36c2c273fb37d6a0d477a7c9ab
requirements-completed: []
completed: 2026-11-19
status: complete
---

# Phase QD-60 Plan 05: Mutation after-run and static evidence

**The five model files hold D-10's floor: DiagnosticsFeed.ts rose 0.9540 to 0.9863 (72/73, the D-16 survivor and runOptions' two spread survivors gone), the other four stay at 1, and the three new static-ignored mutants are Killed in an `ignoreStatic:false` run. `compare` ends with `WX-05 holds (D-10)`; no survivor needed a test.**

## Commits

| Task | Commit | Subject | Files |
| ---- | ------ | ------- | ----- |
| 1-3 | `2d9fdb74` | `chore(60-05): mutation after-run and static evidence of the five devtools model files` | `60-mutation-after.json`, `60-mutation-static.json` |

`commits: 1` is measured from the ledger (`3576dc96..2d9fdb74`); no `test(60-05)` commit was needed. The SUMMARY commit is separate.

## Mutation after

Run: `pnpm exec stryker run stryker.devtools.mjs --mutate <the five files> < /dev/null`, exit 0, "Done in 2 minutes and 4 seconds"
(wall time 127 s), 15.13 tests per mutant on average, final score 99.76. Stryker's per-file table:

```
File                 |  total | covered | # killed | # timeout | # survived | # no cov | # errors |
All files            |  99.76 |   99.76 |      408 |         0 |          1 |        0 |        0 |
 DiagnosticsFeed.ts  |  98.63 |   98.63 |       72 |         0 |          1 |        0 |        0 |
 DiagnosticsStore.ts | 100.00 |  100.00 |       57 |         0 |          0 |        0 |        0 |
 DockModel.ts        | 100.00 |  100.00 |      114 |         0 |          0 |        0 |        0 |
 GatesFeed.ts        | 100.00 |  100.00 |      118 |         0 |          0 |        0 |        0 |
 TimelineFeed.ts     | 100.00 |  100.00 |       47 |         0 |          0 |        0 |        0 |
```

`node 60-mutation.mjs after`:

```
packages/devtools/src/model/DiagnosticsFeed.ts 0.9863013698630136 (72/73) ignored 13
  survivor packages/devtools/src/model/DiagnosticsFeed.ts:157:13 Survived | ConditionalExpression | false | !runs.isCurrent(token) | if (!runs.isCurrent(token)) return;
packages/devtools/src/model/DiagnosticsStore.ts 1 (57/57) ignored 6
packages/devtools/src/model/DockModel.ts 1 (114/114) ignored 10
packages/devtools/src/model/GatesFeed.ts 1 (118/118) ignored 4
packages/devtools/src/model/TimelineFeed.ts 1 (47/47) ignored 10
```

`compare` without evidence (summary lines; the `deleted` lines are the 14 + 3 base mutants whose lines the change removed or
rewrote, all declared):

```
DiagnosticsFeed.ts 0.9540 -> 0.9863 (detected 83 -> 72; lost 17, rewritten 3, deleted 14; survivors +0 -3, moved 0)
  gone survivor: next.collector === undefined, next.layer === undefined (runOptions' spreads), before !== undefined (the D-16 guard)
DiagnosticsStore.ts 1 -> 1 (detected 57 -> 57; lost 4, rewritten 1, deleted 3; survivors +0 -0, moved 0)
DockModel.ts / GatesFeed.ts / TimelineFeed.ts 1 -> 1 (unchanged counts; survivors +0 -0)
DiagnosticsFeed.ts has 1 new static-ignored mutant(s) and no evidence was given: ...
DiagnosticsStore.ts has 2 new static-ignored mutant(s) and no evidence was given: ...
```

Exactly the refusals the plan predicted; no new survivor, no fall, every declared deletion happened (the D-16 guard
`if (before !== undefined) off();` is gone, so is its survivor). The one remaining survivor is the base's `:193`
`if (!runs.isCurrent(token)) return;`, now at `:157`.

## Static evidence

`X` = `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/4f5f4e94-daaa-4e42-b8b8-92e68d5bdffb/scratchpad/x60.Uabr`
(outside the repository; `stryker60-static.mjs` imports the repository's `stryker.devtools.mjs` and sets
`ignoreStatic: false`, a json reporter to `X/stryker60-static-report.json`). Run from the repo root, exit 0, "Done in 2
minutes and 30 seconds", 28.66 tests per mutant, score 98.67. Its survivors (DiagnosticsFeed 2, DockModel 2, TimelineFeed 2)
are static mutants already ignored at the base and not new, so they are not judged.

`node 60-mutation.mjs evidence X/stryker60-static-report.json`:

```
DiagnosticsFeed.ts {"Killed":84,"Survived":2}
DiagnosticsStore.ts {"Killed":63}
DockModel.ts {"Killed":122,"Survived":2}
GatesFeed.ts {"Killed":122}
TimelineFeed.ts {"Killed":55,"Survived":2}
wrote .../60-mutation-static.json
```

`compare 60-mutation-static.json`, new lines beyond the table above:

```
static: all 1 new ignored mutant(s) of .../DiagnosticsFeed.ts are Killed in .../60-mutation-static.json
static: all 2 new ignored mutant(s) of .../DiagnosticsStore.ts are Killed in .../60-mutation-static.json
WX-05 holds (D-10)
```

## Deviations from Plan

**1. [Plan error, verify regex] Task 3's history clause omitted `test(60-03)`.**
- **Found during:** Task 3 verify.
- **Issue:** the clause `/^(test\(60-0[25]\)|feat\(60-03\)!): /` refused `5d297faf test(60-03): call the feed through its Effect, not toBeCallableWith`, a genuine 60-03 commit that touched two `.tst.ts` files (`DiagnosticsStore.tst.ts`, `surface.tst.ts`) - it exists in the history the clause scans.
- **Fix:** the verify was run with the class widened to `test\(60-0[235]\)`, nothing else changed. Every other clause (two files alone, one commit each for the base files, Stryker config unchanged, no code after the evidence, trailer last) passed unchanged, printing `ok 2d9fdb74`. No check weakened beyond naming the phase's own third-plan test commit.
- **Commit:** none (verify only).

## Observations for a later phase

The base survivor `if (!runs.isCurrent(token)) return;` (killed at Phase 56's close, a survivor at this base, its line unchanged
here, now `DiagnosticsFeed.ts:157`) remains; D-10 forbids a fall, not a standing survivor, so it is recorded, not closed here.

## Known gates (expected red)

- `node scripts/check-api-surface.mjs`: still red, closed by 60-07.
- `node scripts/check-doc-examples.mjs` and `node scripts/check-website-doc-examples.mjs`: still red, closed by 60-06.
- `pnpm check:pr` was not run (Stryker-only plan); it stays red until 60-06 and 60-07 land.

## Next plan must know

- `60-mutation.mjs`, `60-mutation-base.json` and `stryker.devtools.mjs` are untouched; 60-08's scan repeats the order check (no code after `2d9fdb74` until 60-06 changes docs).
- `.planning/config.json`, `.planning/state.json`, `.agents/`, `.codex/` and the `*.iter*.md` files remain untouched and unstaged. `reports/mutation-devtools/` is gitignored output.

## Known Stubs

None.

## Self-Check: PASSED

Commit `2d9fdb74` is an ancestor of `HEAD` and holds the two JSON files alone; both files exist; `compare` with the evidence exits 0 ending `WX-05 holds (D-10)`; no evidence file is inside the repository.
