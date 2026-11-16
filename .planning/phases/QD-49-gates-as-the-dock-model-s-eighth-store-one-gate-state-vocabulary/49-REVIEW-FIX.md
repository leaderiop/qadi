---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
fixed_at: 2026-11-16T09:15:00Z
review_path: .planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase QD-49: Code Review Fix Report

**Fixed at:** 2026-11-16T09:15:00Z
**Source review:** .planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6 (WR-01, WR-02, IN-01 to IN-04; scope `--all`)
- Fixed: 6
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`), on branch `arch-wave-10`.

WR-01, IN-02 and IN-03 share one commit (`0d9c2071`). All three change the one join input and its view (`JoinInput`, `GatesView`, `rejoin`), so splitting them would have left a red tree. The characterisation file `QuestionsPanel.characterisation.test.tsx` and every expected value in the existing panel tests are unchanged.

## Fixed Issues

### WR-01: A throwing registry stops the model's updates silently, and ADR-QD-162 section 5's rationale does not hold for `@qadi/react`'s own registry

**Files modified:** `packages/devtools/src/model/DockModel.ts`, `packages/devtools/src/model/Gates.ts`, `packages/devtools/src/react/QuestionsPanel.tsx`, `packages/devtools/test/gateRegistryDouble.ts`, `packages/devtools/test/model/DockModel.test.ts`, `packages/devtools/test/model/Gates.test.ts`, `packages/devtools/test/react/DevtoolsDock.test.tsx`, `packages/devtools/test/react/QuestionsPanel.gates.test.tsx`, `spec/decisions/162-*.md` (Rev 1.1), `spec/behaviors/28-devtools-screens.md` (Rev 1.25), `.planning/phases/QD-49-*/49-UI-SPEC.md` (amendment note)
**Commits:** `0d9c2071` (the fix), `e4fc69d2` (a test the mutation run asked for), `da14a9c5` (traceability rows and the CCR-QD-440 row)
**Applied fix:**
- The registry read is guarded in one place, `readGates` in `DockModel.ts`, which `joinKeyNow` calls. That covers every path: the build, `configure`, a registry notification and a poll tick. A throw from `instances()` becomes `GatesView.Failed({ reason })`, with `reason` as `Cause.pretty(Cause.die(thrown))`, the text `DiagnosticsStatus.Stopped` carries. A throw from `subscribe` is held as a watch failure and stated the same way. A later `configure` with a working registry recovers it.
- Because nothing throws out of `rejoin`, `configure` can no longer be left half applied, the poll fiber is not ended, the other listeners on `shownReading` still run, and a layout effect does not rethrow.
- The panel renders `Failed` as `qadi-gates-failed`, with the wording and `colors.error` of `ServicesPanel`'s `qadi-wiring-failed`: "The registry handed to the dock threw when it was read, so who is asking cannot be shown: {reason}". The 49-UI-SPEC copy table carries an amendment note.
- Rows while `Failed`: the choice is no claim. `QuestionRow.asking` is `ReadonlyArray<GateInstanceLike> | undefined`, and `undefined` means "could not be read". The row keeps its label and scope and renders no "asked, nothing mounted", no highlight and no instance rows. An empty list would print the false "nothing mounted"; the last good listing could name guards that are gone. `snapshot.instances` is the empty constant, so the lens points at nothing. ADR-QD-162 decision 5 is replaced (its first rationale was false: react's `changed()` swallows a listener's throw, and a poll tick ends the poll) and BEH-QD-583 and BEH-QD-584 say the same.
- Tests: `gateRegistryDouble.ts` gained `swallowListenerErrors` (react's behaviour), `failReads`, `mendReads`, `failSubscribe` and `reads`/`releases` counters. M37 (build), M38 (notification the registry swallows, a changed reason, the same throw publishes nothing, mending), M39 (poll tick: status stays `Live`, the diagnostics listener is called, the poll goes on), M40 (`subscribe` throws, a working registry replaces it), M41 (`configure` with throwing registries, the old subscription released once), a `joinQuestions` failed-read pair in `Gates.test.ts`, two panel tests, and a dock test that mounts with a throwing registry.
- Proof the tests bite: with the guarded read replaced by a bare `gatesNow?.instances()`, M37, M38, M39, M41 and the dock test fail (5 failures). With the `subscribe` try/catch removed, M40 and M41 fail. With the closed check removed from `rejoin`, M36 fails. Each was restored afterwards.
- Mutation run, `stryker.devtools.mjs` on `model/DockModel.ts` and `model/Gates.ts`: the first run left one survivor (the failure reason's comparison in `rejoin`), which `e4fc69d2` kills. Final scores: `DockModel.ts` 100 (109 killed, 0 survived), `Gates.ts` 100 (66 killed, 0 survived).

This is a robustness fix to a branch the reviewer called a logic gap, so I mark it **fixed: requires human verification** for the choice of "no claim" over "last good listing". It is a user-visible rendering decision.

### WR-02: `spec/appendices/react-integration.md` still says `useDevtoolsFeed()` returns the list

**Files modified:** `spec/appendices/react-integration.md` (Rev 1.3)
**Commit:** `2fdf190a`
**Applied fix:** The sentence now says `useDevtoolsFeed()` returns the registry itself as `gates` (read it with `gates.instances()`), citing BEH-QD-327 and BEH-QD-585. I searched `spec/`, `apps/website/src/content` and both package READMEs for "same list" and for `useDevtoolsFeed` beside gates, list, array or instances. No other stale claim was found (the website's `upgrading.md` and `devtools.md`, the READMEs, `overview.md` and ADR-QD-053 already say the registry).

### IN-01: INV-QD-343/344 cite phase SUMMARY negative controls as enforcement

**Files modified:** `spec/invariants.md` (Rev 1.140)
**Commit:** `755173ba`
**Applied fix:** INV-QD-343's Enforcement now cites M31 and P2 by what each asserts (a registry change reaches the rows at once; after every registry change and poll tick the rows equal an independent oracle read at that moment, so a poll-only join fails), `Gates.test.ts`, and M36 to M41 for the throwing registry. INV-QD-344's Implication cites `pnpm typecheck` and `GATE_DISPLAY`'s mapped type for devtools, and `DecisionOutcome.tst.ts` for react, in place of "the 49-03 negative control". INV-QD-343's statement also names the failure reason and the `Failed` view. No `NN-NN` SUMMARY citation remains in `spec/`.

### IN-02: `configure` after close still polls the new registry

**Files modified:** `packages/devtools/src/model/DockModel.ts`, `packages/devtools/test/model/DockModel.test.ts`
**Commit:** `0d9c2071` (shared with WR-01, see the note at the top)
**Applied fix:** `rejoin` returns at once when the model is closed. The guard sits in `rejoin` and not in the tail of `configure`, because a `reading` change after close reaches `rejoin` through the diagnostics store and would otherwise read the old registry. M36 closes the scope, configures a new registry and a new reading twice, and asserts that neither registry's `instances()` was called and the snapshot is unchanged. M35 still pins the subscription counts.

### IN-03: `GatesView.Listed` carries `instances`, which duplicates `QuestionsSnapshot.instances`

**Files modified:** `packages/devtools/src/model/Gates.ts`, `packages/devtools/test/model/Gates.test.ts`, `packages/devtools/test/model/DockModel.test.ts`, `packages/devtools/test/react/questionsPanelInput.ts`, `spec/behaviors/28-devtools-screens.md`
**Commit:** `0d9c2071` (shared with WR-01)
**Applied fix:** `Listed` is now `{}`, one constant like `Absent` and `Empty`. `snapshot.instances` states the list once, and `useLens` still receives the registry's own array (M31 asserts `first.instances === registry.instances()`). The two assertions that pinned both to be identical were removed; BEH-QD-583's listing is updated.

### IN-04: Panel tests build their input with the code under change

**Files modified:** `packages/devtools/test/react/questionsPanelInput.ts`
**Commit:** `459ac79d`
**Applied fix:** `panelInput` no longer calls `joinQuestions`. It writes the snapshot out with `Equal.equals` over policy and resource, in registry order, the grouping `Gates.ts` documents, so every call site in the three test files is unchanged. This was contained (one helper), so it was fixed and not skipped. The commit was made against the base API, before WR-01, so that tree is green on its own.

## Checks

Run in the main checkout, after all fixes:

- `pnpm exec vitest run --project devtools`: 64 files, 1512 tests pass.
- `pnpm exec vitest run --project react`: 34 files, 518 tests pass.
- `pnpm exec vitest run --project core packages/core/test/GateState.test.ts`: 5 tests pass.
- `pnpm typecheck`, `pnpm lint`, `pnpm circular`, `pnpm test:tstyche`, `pnpm spec:verify:strict`, `pnpm spec:examples`, `pnpm spec:website-examples`, `pnpm spec:api`, `pnpm spec:claims`: all exit 0.
- `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/DockModel.ts,packages/devtools/src/model/Gates.ts'`: `DockModel.ts` 100, `Gates.ts` 100.

## Not changed

- `ADR-QD-162` decision 5 still does not guard the function `subscribe` returns: an `unsubscribe` that throws propagates. The reviewer's finding was about `instances()` and `subscribe`; the ADR says so.
- `DiagnosticsStore.ts` and `DiagnosticsFeed.ts` still say, in their header comments, that gates "stay a plain prop". That text predates this phase and is not in the review.

---

_Fixed: 2026-11-16T09:15:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
