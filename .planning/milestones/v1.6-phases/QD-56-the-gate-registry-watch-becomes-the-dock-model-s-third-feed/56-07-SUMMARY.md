---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
plan: 07
subsystem: devtools
tags: [dock-model, gates-feed, questions-input, diagnostics-poll, join, gfed-02, gfed-05]
requires: ["56-06"]
provides:
  - DockModel composing three feeds (timeline, diagnostics, gates) and joining them purely through two hoisted Match.tagsExhaustive matchers
  - questions as a DockModelInputs, UseDockModelInput and DevtoolsDockProps field, read by the gates feed on the diagnostics cadence
  - the diagnostics poll without a questions thunk (DiagnosticsDockOptions, DiagnosticsOptions, runDiagnostics), pinned by tstyche
  - J1..J8, the join's cases at the model's boundary
affects: [56-08, 56-09, 56-10, 56-11, 56-12, 56-13]
actuals:
  tokens: 17274
  tasks: 3
  commits: 3
plan_head_before: cd60e909bb99b241710306812a72f714b70d8f07
plan_head_after: 15a6a152a70f15891e20503797b85b8f95eea63e
tech-stack:
  added: []
  patterns: ["a model that composes feeds and holds only a pure join over their snapshots", "a join key whose unsampled flag is already reduced by the supplied list, so a supplied list keeps one snapshot across a poll's Starting to Live"]
key-files:
  created: []
  modified:
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/src/react/useDockModel.ts
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/src/model/DiagnosticsFeed.ts
    - packages/devtools/src/model/DiagnosticsStore.ts
    - packages/devtools/src/react/useDiagnostics.ts
    - packages/devtools/test/model/DockModel.test.ts
    - packages/devtools/test/react/questionsProp.ts
    - packages/devtools/test/model/DiagnosticsFeed.test.ts
    - packages/devtools/test/model/DiagnosticsStore.test.ts
    - packages/devtools/test/model/DiagnosticsStore.tst.ts
key-decisions:
  - "The join key carries unsampled already reduced to 'no supplied questions and an unsampled status', so a supplied list keeps one snapshot while the poll goes from Starting to Live (M34)"
  - "The watch and the thunk moved in one commit: a registry-only move would have dropped, for one commit, the recovery path where a poll whose questions changed re-reads the registry"
  - "IN-03 (the unguarded reservice) is fixed here: the closed guard the composed model needs costs one line there, so reservice now returns when closed"
requirements-completed: [GFED-02, GFED-03, GFED-04, GFED-05, WX-04, WX-06]
duration: 8min
completed: 2026-11-18
status: complete
---

# Phase QD-56 Plan 07: The dock model composes the gates feed

`DockModel` now composes a timeline feed, a diagnostics feed and a gates feed and joins their snapshots with one pure function, `questions` is a dock input beside `gates`, and the diagnostics poll no longer samples a thunk, so a throwing questions input is stated in the panel while the poll stays `Live`.

## Before the move

State of each J case on the untouched model, run before the `test(56-07)` commit (the file with J1..J8 added: 74 cases, 6 failing, 68 passing):

- J1 passes (characterises behaviour the model keeps: the join moves first on the registry side and the diagnostics side).
- J2 fails by assertion (the model does not read `inputs.questions`, so no `Failed` view).
- J3 fails by assertion (status `Off` holds, then no row is read at build).
- J4 fails by assertion (the `Unsampled` half holds, the throwing thunk reads `Unsampled` instead of `Failed`).
- J5 passes (a supplied list wins; the thunk is ignored, so no failure is stated).
- J6 fails by assertion (no thunk call is made at build).
- J7 fails by assertion (rows absent, so the registry's failure reaches no row).
- J8 fails by assertion (one publish, but not `second`'s rows joined to `b`'s guards).

Every existing case (M1..M54, P1, P2) passed with them.

## Task Commits

1. Task 1 (RED and characterisation): `4ab0b6d4` `test(56-07): the join of three feeds, written before the move`, `DockModel.test.ts` alone.
2. Task 2 (the move): `b2d94778` `refactor(56-07)!: the dock model composes the gates feed, and questions is a dock input`, five files: `DockModel.ts`, `useDockModel.ts`, `DevtoolsDock.tsx`, `questionsProp.ts`, `DockModel.test.ts`.
3. Task 3 (the poll): `15a6a152` `refactor(56-07)!: the diagnostics poll no longer samples a questions thunk`, six files: `DiagnosticsFeed.ts`, `DiagnosticsStore.ts`, `useDiagnostics.ts` and three tests.

All three end with the trailer. `commits:` above is measured from the plan ledger (`cd60e909..HEAD`).

## What changed

- `DockModel.ts` went from 328 to 324 lines. It holds none of the base's gate watch (`gatesNow`, `offGates`, `watchFailure`, `watchKey`, `failureKey`, `lastKey`, `lastFailureKey`, `readGates`, `watchGates`, `reasonOf`, `keyOf`, the registry subscription and finalizer are gone). Of the base's eight `let`s only `closed` remains, beside `lastJoin`.
- The join is `joinInputOf(key)`, pure over `{ feed: GatesSnapshot, supplied, unsampled }`, composed from `registryInput` and `askedInput`, each a module-scope `Match.type<…>().pipe(Match.tagsExhaustive(…))`.
- `gatesFeed.subscribe(rejoin)` and `shownReading.subscribe(rejoin)` are registered during the build before any host listener. `configure` calls `gatesFeed.configure` (forwarding `diagnostics.intervalMillis`) before `diagnosticsFeed.configure` and `remerge`, so one configure publishes one join (J8, M47).
- `Diagnostics.questions`, `DiagnosticsReading.questions` and `mergeReading`'s precedence are intact (research Option A); the poll supplies `questions: undefined` for each sample.

## Cases

- **Deleted** (each twin `G<n> (twin of M<n>)` is present and green in `GatesFeed.test.ts`): M31, M33, M35, M37, M38, M39, M40, M41, M42, M42 b, M43, M44, M45, M46. Also deleted, in Task 3: the `DiagnosticsStore.test.ts` quiet-tick case, twinned by GatesFeed T6.
- **Kept**: M32 (its `asked` literal is now `{ diagnostics: {}, questions: … }`), M32 b, M34, M36, M47 unchanged; M49 hands `questions` as a dock input and counts `model.questions` publishes; P2 hands `questions` with `diagnostics: {}` and its oracle reads what the thunk last answered, recorded inside the thunk so it is set before the feed publishes it.
- **Added**: J1..J8 under `the join of the three feeds (J1..J8)`; the questions-store describe is retitled `the questions store (M32, M32 b, M34, M36, M47, P2)`.
- F13 is retitled `a changed layer, collector or intervalMillis each restarts exactly once` and lost its `questions` row. The two tstyche pins refuse a `questions` option on `runDiagnostics` and on `DiagnosticsDockOptions`.
- `questionsProp.ts` body is now `({ ...props, questions })`, the one test-seam line that changed for the flip.

## Verification

- Whole devtools project with no exclusion: 69 files, 1635 tests passed, including `QuestionsPanel.thunk.test.tsx` Q1..Q5 and both characterisations, none of them edited.
- `QuestionsPanel.thunk.test.tsx` run alone three times in a row: 5/5 passed, 5/5 passed, 5/5 passed. No flake.
- `pnpm typecheck`, `pnpm lint` (`house-style: 555 file(s) clean (3 declared switch(es))`), `pnpm circular` and `pnpm test:tstyche` (62 files, 326 tests, 684 assertions) exit 0.
- Barrels: neither `src/index.ts` nor `src/react/index.ts` mentions `GatesFeed`.
- No new `as`, `!`, `any`, `switch`, `fnUntraced`, `async`/`await` or `Record<string, unknown>` in the added source lines; no budget moved.
- Mutation was not run here: 56-09 measures it.

## Deviations from Plan

**1. [Rule 1 - Bug] The join key's `unsampled` must already be reduced by the supplied list**
- **Found during:** Task 2, first whole-project run (M34 failed: `expected … to equal …`, no visual difference).
- **Issue:** the plan states the key as `isUnsampled(status)` compared by identity, with the reduction applied inside the join. Then a supplied list's snapshot changed when the poll went Starting to Live, though the join's input did not. M34 pins "a supplied question list keeps one snapshot while the poll goes from Starting to Live".
- **Fix:** `keyNow` computes `unsampled` as "no supplied questions and an unsampled status", and `joinInputOf` reads it directly. This is the rule the truths state ("`unsampled` is true only with no supplied questions and an unsampled status").
- **Files modified:** `packages/devtools/src/model/DockModel.ts`.
- **Commit:** `b2d94778`.

**2. [Rule 3 - Blocking] M24 handed `diagnostics.questions`, which Task 2's verify and Task 3's types refuse**
- **Found during:** Task 2's static verify (`DockModel.test.ts still hands diagnostics.questions`).
- **Issue:** M24 ("a fresh diagnostics literal holding the same field references notifies no store") listed `questions` among the diagnostics fields. It is not in the plan's list of converted cases.
- **Fix:** the literal holds `layer`, a `collector` double and `intervalMillis`, and `questions` is passed as a dock input in the build and the configure, so the case still asserts that equal field references restart and notify nothing. The change was folded into the move commit by amending it (unpushed, my own commit), so the commit still holds exactly the five files.
- **Files modified:** `packages/devtools/test/model/DockModel.test.ts`.
- **Commit:** `b2d94778`.

**3. [Rule 1 - Bug] A typo my own edit put in the Task 1 commit: `M48:the services store`**
- **Found during:** Task 2, reading the diff.
- **Issue:** the Task 1 edit that inserted the J describe dropped the space after `M48:` in an existing title.
- **Fix:** restored in the Task 2 commit. Nothing else of an existing case changed in Task 1.
- **Commit:** `b2d94778`.

**4. [Scope note] The helpers the J describe needs were hoisted**
- `askingIds`, `tick` and `guard` moved to module scope before the questions-store describe, so the two describes share them instead of keeping two copies. `claims`, `failedReason` and `boom` went with the deleted cases.

**5. [Deferred item taken, IN-03]** The unguarded `reservice` in `DockModel.ts` is fixed here: `closed` is a guard the composed model already needs for `rejoin`, so adding `if (closed) return;` to `reservice` cost one line. Nothing else was widened for it.

**Total deviations:** 3 auto-fixed (2 bug, 1 blocking), 2 notes. **Impact:** none on scope or on a locked decision. The two plan verify patterns the orchestrator flagged as wrong (a `packages/*/src` pathspec that matches nothing, and an `as` regex matching `import * as`) are not used by this plan's own verifies; where I ran such a scan I used `':(glob)packages/*/src/**'` and removed the import lines.

## Authentication Gates

None.

## Known Stubs

None. No placeholder, hardcoded empty value or unwired data source was added.

## Threat Flags

None. The change adds no network endpoint, auth path, file access or schema at a trust boundary; T-56-11 (a throwing thunk stopping the poll) and T-56-12 (a join pairing a new reading with a handed-away registry) are mitigated and pinned by J2, J8 and M47.

## Next Phase Readiness

Ready for 56-08 (`useDevtoolsFeed` returning `questions` at the top level, the react tests and the example comment). `@qadi/react`'s `DevtoolsFeed` still returns `questions` inside `diagnostics`: 56-08 moves it, and a host that hands that shape to the dock now needs the new prop.

## Self-Check: PASSED

- `packages/devtools/src/model/DockModel.ts`, `useDockModel.ts`, `DevtoolsDock.tsx`, `DiagnosticsFeed.ts`, `DiagnosticsStore.ts`, `useDiagnostics.ts`, `packages/devtools/test/model/DockModel.test.ts`, `questionsProp.ts`, `DiagnosticsFeed.test.ts`, `DiagnosticsStore.test.ts`, `DiagnosticsStore.tst.ts`: all present and committed.
- Commits `4ab0b6d4`, `b2d94778`, `15a6a152` are ancestors of HEAD; each verify script of the three tasks exited 0.
