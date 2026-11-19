---
phase: QD-60-devtools-headless-interface-is-the-feeds
plan: 01
subsystem: devtools
tags: [evidence, mutation-baseline, reserved-ids, api-surface, phase-base]
phase_base: 35a48554388da6c68940c1b94a1cc526b3111eae
requires: []
provides:
  - phase_base, the commit every later plan in the phase is measured against
  - the base facts the change removes, with their lines at phase_base
  - ten reserved ids (and ARCH-107) confirmed free at phase_base
  - the 933-export API surface baseline
  - 60-mutation.mjs and 60-mutation-base.json, the rule and the floor for D-10
affects: [60-02, 60-03, 60-04, 60-05, 60-06, 60-07, 60-08]
actuals:
  tokens: 12000
  tasks: 3
  commits: 1
plan_head_before: 35a48554388da6c68940c1b94a1cc526b3111eae
plan_head_after: 9e7e0dfe464c1705fabfcc0fc2a25fec2837de57
requirements-completed: []
duration: 8min
completed: 2026-11-19
status: complete
---

# Phase QD-60 Plan 01: Evidence on the untouched base

**phase_base `35a48554`, the base facts the change removes, eleven reserved ids free, the 933-export surface baseline, and the five devtools model files' mutation floor (DiagnosticsFeed 0.9540 with the D-16 survivor, the other four 1) committed with D-10's rule as `chore(60-01)` 9e7e0dfe.**

## Base facts

`pnpm exec vitest run --project devtools < /dev/null` on `phase_base`: **70 test files passed (70), 1645 tests passed
(1645)**, 5.94 s. The dock and both characterisations are green on the base.

Each line is `git show 35a48554:<file> | /usr/bin/grep -nF '<text>'`.

| File | Fact | Line at base |
| ---- | ---- | ------------ |
| `packages/devtools/src/index.ts` | `export { makeTimelineStore, runSource } from "./model/TimelineStore.ts";` | 125 |
| `packages/devtools/src/index.ts` | `makeDiagnosticsStore,` / `noDiagnostics,` / `runDiagnostics,` in the `DiagnosticsStore.ts` value export | 27 / 29 / 30 |
| `packages/devtools/src/index.ts` | type export `DiagnosticsStore,` | 36 |
| `packages/devtools/src/index.ts` | `makeTimelineFeed` / `makeDiagnosticsFeed` / `makeGatesFeed`: no match (none of the three feeds is a root export) | none |
| `packages/devtools/src/react/index.ts` | `export type { DiagnosticsDockOptions, DiagnosticsSnapshot } from "../model/DiagnosticsFeed.ts";` | 20 |
| `packages/devtools/src/model/DiagnosticsFeed.ts` | `import * as Schedule from "effect/Schedule";` | 26 |
| `packages/devtools/src/model/DiagnosticsFeed.ts` | `export interface DiagnosticsDockOptions {` | 77 |
| `packages/devtools/src/model/DiagnosticsFeed.ts` | `const runOptions = (next: DiagnosticsDockOptions) => ({` | 178 |
| `packages/devtools/src/model/DiagnosticsFeed.ts` | the D-16 guard `if (before !== undefined) off();` | 220 |
| `packages/devtools/src/model/DiagnosticsStore.ts` | `export interface DiagnosticsOptions<ROut = never, E = never> {` | 188 |
| `packages/devtools/src/model/DiagnosticsStore.ts` | `readonly schedule?: Schedule.Schedule<unknown>;` | 198 |
| `packages/devtools/src/model/DiagnosticsStore.ts` | `options?.schedule ?? Schedule.spaced(DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS),` | 228 |
| `packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx` | line 26 `import type { DevtoolsDockProps, DiagnosticsDockOptions } from "../../src/react/index.ts";` and line 66 `const live: DiagnosticsDockOptions = {};` (the two D-12 lines) | 26, 66 |

The root's runners at the base are `makeTimelineStore`/`runSource` and `makeDiagnosticsStore`/`runDiagnostics` (the
"four runners" of the plan's wording), with `noDiagnostics` and the type `DiagnosticsStore`; `makeSimulationSession` is
also a root export, untouched by this phase.

## Reserved numbers

Whole-word `git grep -lwF <id> 35a48554 -- spec packages .changeset AGENTS.md CONTRIBUTING.md features apps/website/src examples scripts`
for each id: **no match** for ARCH-107, ADR-QD-173, CCR-QD-451, BEH-QD-636, BEH-QD-637, BEH-QD-638, BEH-QD-639,
BEH-QD-640, INV-QD-365, INV-QD-366 (the eleven ids of the plan, BEH-QD-636..640 and INV-QD-365..366 counting as seven
and two). `git ls-tree --name-only 35a48554 spec/decisions/` lists no `spec/decisions/173-*`.

Reservation file `$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`:

```
{
  "CCR": 452,
  "ADR": 174,
  "BEH": 645,
  "INV": 368
}
```

`node scripts/next-id.mjs` was not run.

## API surface base

`pnpm -s spec:api < /dev/null` prints:

```
api-surface: 933 export(s) documented across 9 package(s)
```

`ls .changeset | wc -l` is **39** (`config.json` included).

## Mutation base

Commit `chore(60-01)` **9e7e0dfe** holds `60-mutation.mjs` (SHA-256 `8cf523364a17ec67083808f12c02b7ea605f82b6d7a3862627f925e6ebc6a026`,
extracted mechanically from the plan's block) and `60-mutation-base.json`, alone, the first plan commit after
`phase_base`. `stryker.devtools.mjs` is unchanged.

Run: `pnpm exec stryker run stryker.devtools.mjs --mutate <the five files> < /dev/null`, exit 0, "Done in 1 minute and 13
seconds" (wall time 75 s), 14.93 tests per mutant on average, final score 99.05. Stryker's per-file table:

```
File                 |  total | covered | # killed | # timeout | # survived | # no cov | # errors |
All files            |  99.05 |   99.05 |      419 |         0 |          4 |        0 |        0 |
 DiagnosticsFeed.ts  |  95.40 |   95.40 |       83 |         0 |          4 |        0 |        0 |
 DiagnosticsStore.ts | 100.00 |  100.00 |       57 |         0 |          0 |        0 |        0 |
 DockModel.ts        | 100.00 |  100.00 |      114 |         0 |          0 |        0 |        0 |
 GatesFeed.ts        | 100.00 |  100.00 |      118 |         0 |          0 |        0 |        0 |
 TimelineFeed.ts     | 100.00 |  100.00 |       47 |         0 |          0 |        0 |        0 |
```

`node 60-mutation.mjs base` printed, verbatim:

```
packages/devtools/src/model/DiagnosticsFeed.ts 0.9540229885057471 (83/87) ignored 13
  survivor packages/devtools/src/model/DiagnosticsFeed.ts:179:9 Survived | ConditionalExpression | false | next.layer === undefined | ...(next.layer === undefined ? {} : { layer: next.layer }),
  survivor packages/devtools/src/model/DiagnosticsFeed.ts:180:9 Survived | ConditionalExpression | false | next.collector === undefined | ...(next.collector === undefined ? {} : { collector: next.collector }),
  survivor packages/devtools/src/model/DiagnosticsFeed.ts:193:13 Survived | ConditionalExpression | false | !runs.isCurrent(token) | if (!runs.isCurrent(token)) return;
  survivor packages/devtools/src/model/DiagnosticsFeed.ts:220:11 Survived | ConditionalExpression | true | before !== undefined | if (before !== undefined) off();
packages/devtools/src/model/DiagnosticsStore.ts 1 (57/57) ignored 6
packages/devtools/src/model/DockModel.ts 1 (114/114) ignored 10
packages/devtools/src/model/GatesFeed.ts 1 (118/118) ignored 4
packages/devtools/src/model/TimelineFeed.ts 1 (47/47) ignored 10
wrote .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-mutation-base.json
```

The four survivors are exactly the plan-time set, with identical counts: `:179` and `:180` (`runOptions`' two spreads,
deleted by the change), `:193` (`if (!runs.isCurrent(token)) return;`, a Phase 56 leftover that is not this phase's and
stays a base survivor), and `:220`, **the D-16 survivor** `if (before !== undefined) off();`. No survivor outside the
plan's list.

## Deviations from Plan

None - plan executed exactly as written. (The plan's "four runners" wording counts `makeTimelineStore`, `runSource`,
`makeDiagnosticsStore` and `runDiagnostics`; recorded under Base facts.)

## Next plan must know

- `phase_base` is `35a48554388da6c68940c1b94a1cc526b3111eae`; read it from this file's front matter.
- No gate is expected to be red as a consequence of this plan; nothing outside `.planning/` changed.
- `60-mutation.mjs` and `60-mutation-base.json` are never edited again; `.planning/state.json` and
  `.planning/config.json` are left unstaged.
- The unrelated `reports/mutation-devtools/` report on disk is the base run's; the next Stryker run overwrites it.

