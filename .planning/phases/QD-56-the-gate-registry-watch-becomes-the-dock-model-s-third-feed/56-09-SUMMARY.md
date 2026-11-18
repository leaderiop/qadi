---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
plan: 09
subsystem: devtools
tags: [mutation, wx-05, d-11, evidence]
requires: ["56-08"]
provides:
  - 56-mutation-after.json, the five files' scores on the final tree (every file 1 except DiagnosticsFeed.ts at 86/87)
  - 56-mutation-static.json, the ignoreStatic:false evidence for GatesFeed.ts (122 of 122 Killed)
  - WX-05 holds (D-11), judged by the rule and base 56-01 committed
affects: [56-10, 56-11, 56-12, 56-13]
actuals:
  tokens: 3300
  tasks: 2
  commits: 4
plan_head_before: 2588b401e91a4f79fc92e288099933d634de6516
plan_head_after: 308beb9486e62a3f0e6876aa0e5635ec9478db04
tech-stack:
  added: []
  patterns: ["an equivalent mutant is rewritten away so its two outcomes become observable, never ignored by a comment"]
key-files:
  created:
    - .planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-mutation-after.json
    - .planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-mutation-static.json
  modified:
    - packages/devtools/src/model/GatesFeed.ts
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/src/model/Gates.ts
    - packages/devtools/test/model/GatesFeed.test.ts
    - packages/devtools/test/model/DockModel.test.ts
key-decisions:
  - "Equivalent mutants were rewritten away (refactor(56-09)), not ignored: a watch of no registry is observable (the failure is read before the no-registry answer), the dead tick guard, the dead trailing rejoin and the dead supplied-list conditional are gone, and JoinInput's gates and failed are optional so an arm states only what it read"
requirements-completed: [WX-05]
duration: 20min
completed: 2026-11-18
status: complete
---

# Phase QD-56 Plan 09: The final tree measured and judged by D-11

The after-run and the `ignoreStatic:false` evidence run on the final tree satisfy D-11 as committed by 56-01: no model file fell, and `GatesFeed.ts` holds no survivor with every static-ignored mutant Killed.

## Mutation after

The first run (before any gap-closing work) failed `compare`: `DockModel.ts` fell from 1 to 0.9583 with five new survivors, and `GatesFeed.ts` held 13. Tests and rewrites closed them (below). The last gate run's lines, from `node .../56-mutation.mjs after`:

```
packages/devtools/src/model/DiagnosticsFeed.ts 0.9885057471264368 (86/87) ignored 13
  survivor packages/devtools/src/model/DiagnosticsFeed.ts:220:11 ConditionalExpression | Survived | true | before !== undefined | if (before !== undefined) off();
packages/devtools/src/model/DiagnosticsStore.ts 1 (57/57) ignored 6
packages/devtools/src/model/DockModel.ts 1 (114/114) ignored 10
packages/devtools/src/model/Gates.ts 1 (70/70) ignored 15
packages/devtools/src/model/GatesFeed.ts 1 (118/118) ignored 4
wrote .planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-mutation-after.json
```

`DiagnosticsFeed.ts` showed four survivors in the first two runs (179, 180, 193 and 220) and one in the last; three of them are timing-sensitive under the parallel Stryker workers (the base held five, so it never fell). It is not a file this plan edits.

## Static evidence

Tallies from `node .../56-mutation.mjs evidence <scratchpad>/stryker56-static-report.json`:

```
packages/devtools/src/model/DiagnosticsFeed.ts {"Killed":95,"Survived":5}
packages/devtools/src/model/DiagnosticsStore.ts {"Killed":61,"Survived":2}
packages/devtools/src/model/DockModel.ts {"Killed":122,"Survived":2}
packages/devtools/src/model/Gates.ts {"Killed":85}
packages/devtools/src/model/GatesFeed.ts {"Killed":122}
```

The config, written to the session scratchpad and never the repository:

```js
// Evidence only (56-09, D-11): ignoreStatic false so GatesFeed.ts' static-ignored mutants are measured. Never a gate run.
import base from "/Users/mohammadalmechkor/Projects/Perso/qadi/stryker.devtools.mjs";

export default {
  ...base,
  ignoreStatic: false,
  reporters: ["json", "clear-text"],
  jsonReporter: { fileName: "<scratchpad>/stryker56-static-report.json" },
};
```

The first evidence run left one `GatesFeed.ts` static mutant alive, the span-name literal (`"qadi.devtools.makeGatesFeed"` to `""`); T10 kills it.

## D-11

```
packages/devtools/src/model/DiagnosticsFeed.ts 0.9473684210526315 -> 0.9885057471264368 (detected 90 -> 86; survivors +0 -4)
  gone survivor ConditionalExpression | Survived | false | !runs.isCurrent(token) | if (!runs.isCurrent(token)) return;
  gone survivor ConditionalExpression | Survived | false | next.collector === undefined | ...(next.collector === undefined ? {} : { collector: next.collector }),
  gone survivor ConditionalExpression | Survived | false | next.layer === undefined | ...(next.layer === undefined ? {} : { layer: next.layer }),
  gone survivor ConditionalExpression | Survived | false | next.questions === undefined | ...(next.questions === undefined ? {} : { questions: next.questions }),
packages/devtools/src/model/DiagnosticsStore.ts 1 -> 1 (detected 60 -> 57; survivors +0 -0)
packages/devtools/src/model/DockModel.ts 1 -> 1 (detected 145 -> 114; survivors +0 -0)
packages/devtools/src/model/Gates.ts 1 -> 1 (detected 66 -> 70; survivors +0 -0)
packages/devtools/src/model/GatesFeed.ts 1 (detected 118; survivors 0; ignored 4)
static: all 4 ignored mutants of packages/devtools/src/model/GatesFeed.ts are Killed in .planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-mutation-static.json
WX-05 holds (D-11)
```

No file fell (`sa >= sb` everywhere), so the moved-mutant budget was not drawn on; `GatesFeed.ts` detects 118 (+4 static).

## Gap commits

- `a9f308ac` test(56-09): G42 c (a notification reaching a closed feed reads and publishes nothing), T8 (the same thunk and interval reads nothing, a new interval reads at once and re-times the cadence), T9 (a counting clock shows no pending sleep with no thunk), M55 (a closed model recomputes no services view). All pass on the old source.
- `c02f2c43` refactor(56-09): five mutants no test could tell apart, rewritten away. `GatesFeed.ts`: `readRegistry` reads a watch failure before the no-registry answer (so a watch of no registry is observable); the cadence `tick` drops the closed guard the interrupted run makes unreachable; the first snapshot is built by the helper `publish` uses. `DockModel.ts`: the join arms state only what each read has, `questionsFailed` is the thunk's failure (the view already states it only when no questions are read), and `configure` drops the trailing `rejoin()` that `remerge`'s subscription makes redundant. `Gates.ts`: `JoinInput.gates` and `failed` are optional.
- `9dd2d939` test(56-09): T10 pins the feed's span name.
- `308beb94` chore(56-09): the two JSON files alone.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] compare failed on the first after-run**
- **Found during:** Task 2
- **Issue:** `DockModel.ts` fell with five new survivors and `GatesFeed.ts` held 13 survivors.
- **Fix:** the tests and rewrites above, then both runs repeated, as the plan prescribes.
- **Files modified:** the five listed under key-files.modified
- **Commit:** a9f308ac, c02f2c43, 9dd2d939

**2. [Rule 3 - Blocking] The foreground wait used a shell loop**
- **Issue:** the `Monitor` tool was not available, so the wait on each background Stryker run was a bounded `until` loop in the shell; the runs themselves were backgrounded as the plan requires.

The two known wrong verify patterns did not appear in this plan.

**Total deviations:** 1 auto-fixed (Rule 1), 1 procedural. **Impact:** none on the rule; the script, the base JSON and `stryker.devtools.mjs` are unchanged since `chore(56-01)`.

## Known Stubs

None.

## Next

Ready for 56-10.

## Self-Check: PASSED

The two JSON files exist, the four commits are ancestors of HEAD, `compare` prints `WX-05 holds (D-11)`, the whole devtools project is green (69 files, 1639 tests), `tsc -b` and `tsc -p tsconfig.test.json` pass and `check-house-style` is clean.
