---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
plan: 01
subsystem: devtools
tags: [stryker, mutation-baseline, evidence, reserved-ids, api-surface]
phase_base: 88f0ca26d54ead81df550ce8da2d49b396f065e1
requires: []
provides:
  - phase_base and the re-verified base facts
  - ten reserved ids confirmed free at the base
  - the 935-export API surface baseline
  - 56-mutation.mjs and 56-mutation-base.json (D-11's rule and baseline, fixed before the change)
affects: [56-02, 56-03, 56-04, 56-07, 56-09, 56-13]
actuals:
  tokens: 4500
  tasks: 2
  commits: 1
plan_head_before: 88f0ca26d54ead81df550ce8da2d49b396f065e1
plan_head_after: 4c19bc9e0cada0a0795e070513ab0c108e1ba4fb
tech-stack:
  added: []
  patterns: ["mutation baseline committed alone as the phase's first commit, rule constants fixed before the change"]
key-files:
  created:
    - .planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-mutation.mjs
    - .planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-mutation-base.json
  modified: []
key-decisions:
  - "DiagnosticsFeed.ts base is 90/95 with five pre-existing survivors; the close compares against that floor (survivor set unchanged), not against 1"
requirements-completed: [WX-02, WX-05, WX-06]
duration: 6min
completed: 2026-11-18
status: complete
---

# Phase QD-56 Plan 01: Evidence on the untouched base

## Base facts

Read at `phase_base` (`88f0ca26`). Every site matched.

`packages/devtools/src/model/DockModel.ts`:

- The eight gate-watch `let`s: `gatesNow` `:179`, `closed` `:180`, `offGates` `:181`, `watchFailure` `:183`, `watchKey` `:184`, `failureKey` `:186`, `lastKey` `:205`, `lastFailureKey` `:206`.
- `registry.subscribe(rejoin)` `:239`; the registry fallback sentence ("The registry threw a value that could not be described.") `:108`; header `**Nine stores, counted once.**` `:24`.

`packages/devtools/src/model/DiagnosticsFeed.ts`: `DiagnosticsDockOptions.questions` `:95`; restart on `next.questions !== before.questions` `:230`.

`packages/devtools/src/model/DiagnosticsStore.ts`: `Effect.sync(questionsThunk)` `:225`.

`packages/devtools/src/model/Gates.ts`: `QuestionsView` `Unsampled: {};` `:286`; no `Failed` arm and no `questionsFailed` in `JoinInput`.

`packages/react/src/DevtoolsFeed.ts`: `type FeedOwnedKey = keyof DevtoolsDiagnosticsFeed;` `:95`; `readonly questions: () => ReadonlyArray<AskedQuestion>;` `:76`.

Absent at the base: `GatesFeed.ts`, `GatesFeed.test.ts`, `questionsProp.ts`, `collectorDouble.ts`, `QuestionsPanel.feed.characterisation.test.tsx`, `QuestionsPanel.thunk.test.tsx`; `QuestionsPanel.tsx` holds no `qadi-questions-failed`.

## Reserved numbers

`ARCH-103`, `ADR-QD-169`, `CCR-QD-447`, `BEH-QD-616`..`BEH-QD-620`, `INV-QD-357`, `INV-QD-358`: `git grep -lwF` at `phase_base` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts prints nothing for any of the ten. No `spec/decisions/169-*` exists at `phase_base`. The reservation file reads `{"CCR":452,"ADR":174,"BEH":645,"INV":368}`. `node scripts/next-id.mjs` was not run.

## API surface base

`pnpm -s spec:api` at `phase_base`:

```
api-surface: 935 export(s) documented across 9 package(s)
```

(56-11 and 56-13 require the same line, adjusted only by the exports this phase documents.)

## Mutation base

`pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/DiagnosticsFeed.ts,packages/devtools/src/model/DiagnosticsStore.ts,packages/devtools/src/model/DockModel.ts,packages/devtools/src/model/Gates.ts' < /dev/null`, run alone on the untouched green tree (no test written yet), exit 0, 1 minute 37 seconds, 21.74 tests per mutant. `node .../56-mutation.mjs base` printed:

```
packages/devtools/src/model/DiagnosticsFeed.ts 0.9473684210526315 (90/95) ignored 13
  survivor packages/devtools/src/model/DiagnosticsFeed.ts:181:9 ConditionalExpression | Survived | false | next.layer === undefined | ...(next.layer === undefined ? {} : { layer: next.layer }),
  survivor packages/devtools/src/model/DiagnosticsFeed.ts:182:9 ConditionalExpression | Survived | false | next.collector === undefined | ...(next.collector === undefined ? {} : { collector: next.collector }),
  survivor packages/devtools/src/model/DiagnosticsFeed.ts:183:9 ConditionalExpression | Survived | false | next.questions === undefined | ...(next.questions === undefined ? {} : { questions: next.questions }),
  survivor packages/devtools/src/model/DiagnosticsFeed.ts:196:13 ConditionalExpression | Survived | false | !runs.isCurrent(token) | if (!runs.isCurrent(token)) return;
  survivor packages/devtools/src/model/DiagnosticsFeed.ts:223:11 ConditionalExpression | Survived | true | before !== undefined | if (before !== undefined) off();
packages/devtools/src/model/DiagnosticsStore.ts 1 (60/60) ignored 6
packages/devtools/src/model/DockModel.ts 1 (145/145) ignored 2
packages/devtools/src/model/Gates.ts 1 (66/66) ignored 14
wrote .planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-mutation-base.json
```

- `DiagnosticsFeed.ts`: 90 Killed, 0 Timeout, 5 Survived, 0 NoCoverage, 13 Ignored. Score 0.9473684210526315. Not 1: the five survivors above are pre-existing (research A2: the file was never measured), so the close's bar for it is "not lower, survivor set unchanged".
- `DiagnosticsStore.ts`: 60 Killed, 0 Survived, 6 Ignored. Score 1.
- `DockModel.ts`: 145 Killed, 0 Survived, 2 Ignored. Score 1 (matches Phase 55's close).
- `Gates.ts`: 66 Killed, 0 Survived, 14 Ignored. Score 1.

Committed alone as `chore(56-01)` `4c19bc9e`, parent `phase_base`.

## Task Commits

1. Task 1 (evidence, no commit): base facts, reserved numbers, API surface base; all three verifies exit 0.
2. Task 2: `4c19bc9e` `chore(56-01): mutation baseline of the four model files on the untouched base` (56-mutation.mjs, 56-mutation-base.json).

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `56-mutation.mjs` and `56-mutation-base.json` exist on disk; `4c19bc9e` is an ancestor of HEAD; its parent is `phase_base`.
- Task 1's three verifies and Task 2's two verifies exit 0.
- No change under packages, spec, scripts, .changeset, apps, examples, features or AGENTS.md; `node scripts/next-id.mjs` was not run.
