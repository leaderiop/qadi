---
phase: QD-55-a-port-card-is-a-model-row-not-a-view-join
plan: 06
subsystem: evidence
tags: [stryker, mutation-after, d-15, static-credit]
phase_base: 0c349d6fc46978fe546dcb4767b94c17cbf7b03c
requires: ["55-05"]
provides:
  - "55-mutation-after.json: scores, counts, survivors and ignored mutants of DockModel.ts, PortCards.ts, Wiring.ts"
  - "55-mutation-static.json: the ignoreStatic:false evidence run, per mutant"
affects: [55-07, 55-08, 55-09]
tech-stack:
  added: []
  patterns: ["static-ignored mutants of the new module credited only when an ignoreStatic:false run kills each (ADR-QD-167 Rev 1.1)"]
key-files:
  created:
    - .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation-after.json
    - .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation-static.json
  modified: []
key-decisions:
  - "No gap to close: the first compare held, so no test(55-06) or refactor(55-06) commit exists"
requirements-completed: [WX-05]
duration: 6min
completed: 2026-11-18
status: complete
commits: 1
plan_head_before: b65dc4a7b8582a27f8c4b5bd445b30fd622e1979
plan_head_after: 66bcbcb1
actuals:
  tokens: 4000
  tasks: 2
  commits: 1
---

# Phase QD-55 Plan 06: Mutation after the join moved into PortCards.ts

**D-15 holds on the first comparison: DockModel.ts 145/145 and Wiring.ts 48/48 keep their base score of 1, PortCards.ts is 126/126 with no survivor, and all 14 of its static-ignored mutants are Killed when static mutants run.**

Note: `REQUIREMENTS.md` is untouched (the phase instructions defer WX-05 to the milestone close); `requirements-completed` copies the plan's id per the template.

## Mutation after

Gate run on the final tree, nothing else running: `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/DockModel.ts,packages/devtools/src/model/PortCards.ts,packages/devtools/src/model/Wiring.ts' < /dev/null`, exit 0, 62 seconds, 21.98 tests per mutant, whole-run score 100.00 (break threshold 80). `node .../55-mutation.mjs after` printed:

```
packages/devtools/src/model/DockModel.ts 1 (145/145) ignored 2
packages/devtools/src/model/PortCards.ts 1 (126/126) ignored 14
packages/devtools/src/model/Wiring.ts 1 (48/48) ignored 4
wrote .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation-after.json
```

Base for comparison (55-01): DockModel.ts 123/123 ignored 2, Wiring.ts 50/50 ignored 4. DockModel.ts gained 22 detected mutants (the `services` store), Wiring.ts lost 2 (cause not examined: the score stayed 1 and no survivor appeared in either).

## Static evidence

The `ignoreStatic:false` run, same `--mutate` list, same tree, config outside the repository (`<scratchpad>/ex55/stryker55-static.config.mjs`), exit 0, 59 seconds, 15.99 tests per mutant. Its text:

```js
// Evidence-only run (55-06 D-15): the repo's devtools config with ignoreStatic off. Never a gate run.
import base from "/Users/mohammadalmechkor/Projects/Perso/qadi/stryker.devtools.mjs";
export default {
  ...base,
  ignoreStatic: false,
  reporters: ["json", "clear-text"],
  jsonReporter: { fileName: "<scratchpad>/ex55/stryker55-static-report.json" },
};
```

`node .../55-mutation.mjs evidence <report>` printed the tallies:

```
packages/devtools/src/model/DockModel.ts {"Killed":146,"Survived":1}
packages/devtools/src/model/PortCards.ts {"Killed":140}
packages/devtools/src/model/Wiring.ts {"Killed":52}
wrote .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation-static.json
```

The one DockModel.ts survivor is one of its two static-ignored mutants (`:117:39` / `:120:40`, ignored at the base too, 55-01). D-15 gives static credit to PortCards.ts only and judges DockModel.ts on its gate-run score, so it neither costs nor earns anything. PortCards.ts: 126 gate-detected + 14 static-ignored = 140 Killed.

## D-15

`node .../55-mutation.mjs compare .../55-mutation-static.json` (exit 0):

```
packages/devtools/src/model/DockModel.ts 1 -> 1 (detected 123 -> 145; survivors +0 -0)
packages/devtools/src/model/Wiring.ts 1 -> 1 (detected 50 -> 48; survivors +0 -0)
packages/devtools/src/model/PortCards.ts 1 (detected 126; survivors 0; ignored 14)
static: all 14 ignored mutants of packages/devtools/src/model/PortCards.ts are Killed in .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation-static.json
WX-05 holds (D-15)
```

`MOVED` stays empty; Wiring.ts's detected count fell by 2 but its score did not (`sa >= sb`).

## Gap commits

None. No survivor or no-coverage mutant in PortCards.ts and no fall in a base file, so no test was needed and no run was repeated.

## Task Commits

1. Task 1: the two runs (no commit; Task 1's verify exits 0).
2. Task 2: `66bcbcb1` `chore(55-06): mutation after-run and static evidence for D-15` (the two JSON files alone, trailer last). No packages or features commit follows it.

## Deviations from Plan

None - plan executed exactly as written. `55-mutation.mjs`, `55-mutation-base.json` and `stryker.devtools.mjs` were not edited; the evidence config and report stayed in the scratchpad.

## Known Stubs

None.

## Self-Check: PASSED

- `55-mutation-after.json`, `55-mutation-static.json` exist; `66bcbcb1` is an ancestor of HEAD and touches exactly those two files.
- `compare` with the evidence prints `WX-05 holds (D-15)`.
