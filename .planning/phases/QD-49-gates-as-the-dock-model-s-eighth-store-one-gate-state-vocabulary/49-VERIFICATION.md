---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
verified: 2026-11-16T09:50:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-01-PLAN.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-01-SUMMARY.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-02-PLAN.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-02-SUMMARY.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-03-PLAN.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-03-SUMMARY.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-04-PLAN.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-04-SUMMARY.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-05-PLAN.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-05-SUMMARY.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-06-PLAN.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-06-SUMMARY.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-07-PLAN.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-07-SUMMARY.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-08-PLAN.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-08-SUMMARY.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-09-PLAN.md"
  - ".planning/phases/QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary/49-09-SUMMARY.md"
  - "packages/core/src/GateState.ts"
  - "packages/core/src/index.ts"
  - "packages/devtools/src/index.ts"
  - "packages/devtools/src/model/DockModel.ts"
  - "packages/devtools/src/model/Gates.ts"
  - "packages/devtools/src/react/DevtoolsDock.tsx"
  - "packages/devtools/src/react/QuestionsPanel.tsx"
  - "packages/devtools/src/react/useDockModel.ts"
  - "packages/react/src/DecisionOutcome.ts"
  - "packages/react/src/DevtoolsFeed.ts"
  - "packages/react/src/GateWriter.ts"
covered_digest: "v4:sha256:228257f2cc8f8cd7a329c19dd872e2de602b34e7795ed1f60b756eedc038e6a7"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 49: Gates as the dock model's eighth store, one gate-state vocabulary - Verification Report

**Phase Goal:** The gate registry is the dock model's eighth store, so `QuestionsPanel` renders one snapshot in which each question and the instances asking it come from the same moment, and the five gate-state words are stated once in core so react and devtools cannot drift.
**Verified:** 2026-11-16 (HEAD 1edf97ad, phase base 76330fbd)
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Five gate-state words stated once in `@qadi/core`; react's `GateRenderState` and devtools' `GATE_DISPLAY` derive from it; type-level test ties them; devtools has no `@qadi/react` dependency | VERIFIED | `packages/core/src/GateState.ts`: module-private `GATE_STATE_TABLE`, `GateState = keyof typeof`, `isGateState` via `Object.hasOwn`, `gateStates` in worst-news-first order, exported through `core/src/index.ts`. `react/src/GateWriter.ts`: `GateRenderState = GateState`. `devtools/src/model/Gates.ts`: `GATE_DISPLAY: { readonly [K in GateState]: DisplayState }`, `GATE_STATES = gateStates`, `displayOfGateState` uses `isGateState`. `react/test/DecisionOutcome.tst.ts` pins `DecisionOutcome["_tag"]` to `GateState` both ways (`Exclude` to `never` each direction); `core/test/GateState.tst.ts` pins the union and that the table is not importable. `packages/devtools/package.json` has no `@qadi/react` match. `pnpm test:tstyche`: 293/293 tests, 613 assertions. |
| 2 | A state this build does not know is still shown as `Unrecognised`, never an answer | VERIFIED | `displayOfGateState` returns `"Unrecognised"` for anything failing `isGateState` (so inherited names like `toString` too); `GateInstanceLike.state` stays `string` (D-05); `Gates.test.ts` unknown-state rows and the panel characterisation test pass. |
| 3 | Registry's structural `subscribe`/`instances` is a `makeDockModel` store; model produces joined question x instance rows; `QuestionsPanel` renders one snapshot with no `gates` prop join and no per-row `instancesAsking` join in the view | VERIFIED | `DockModel.ts`: `DockModelInputs.gates?: GateRegistryLike`, a `questions` store built from `joinQuestions` and recomputed by `rejoin()` on both the diagnostics publish and the registry notify, subscribed in model scope and released by a finalizer. `QuestionsPanel.tsx` takes only `questions` (the store), reads it with `useStoreSnapshot`, renders through `Match.tagsExhaustive`; `/usr/bin/grep` finds `instancesAsking`/`gateGroups` nowhere in `packages/devtools/src` outside `model/Gates.ts`; no `gates` prop on the panel. `DevtoolsDock` passes `gates` to `useDockModel` and `props.model.questions` to the panel. Header recount in `DockModel.ts` (eight stores, `sightings` a thunk) per D-11. |
| 4 | The join is tested headlessly through the dock model; gates change while questions poll and rows come from one moment, no render | VERIFIED | `DockModel.test.ts` P2 (line ~1577): fast-check generated command sequences (add/remove/change guard, ask, poll tick) over a registry double and a polled question source, each snapshot and each notification checked against an independent `Equal.equals` oracle read at that moment, including that `instances` is the registry's own array. Lifetime tests (dock finalizer; stopped after close) in the same file; VALIDATION records they fail when the finalizer leaks. Whole devtools suite 1519/1519. |
| 5 | Instrumentation off: nothing registered or rendered (§13), react suite passes untouched, panel output unchanged for existing inputs | VERIFIED | Only two react test files changed vs base (`DecisionOutcome.tst.ts`, `DevtoolsFeed.test.tsx`), exactly the D-03/D-18 named exceptions; react suite 518/518, includes the uninstrumented-registers-nothing tests. `QuestionsPanel.characterisation.test.tsx` (twelve cells, committed on the base before any `src` edit: `e4a5359d` precedes `4048669e`) passes against the new panel. The one intended copy change (gates-absent advice, D-12a) is asserted in `QuestionsPanel.gates.test.tsx` and named in ADR-QD-162. |

**Score:** 5/5 truths verified, 0 behavior-unverified.

### Review-driven addition (beyond the plans)

The `GatesView.Failed { reason }` arm judged against the goal and D-decisions: it serves the goal (a registry that throws cannot tear the one snapshot or escape into the host). In `DockModel.ts`: `instances()` read is guarded (`readGates`), `subscribe`/release throws are caught in `watchGates`, a closed model runs no host code, a failed watch is retried by `configure`, the registry is swapped before `remerge()`, and `reasonOf`/`keyOf` are themselves total. Rows carry `asking: undefined` while failed (no "nothing mounted" claim). The panel renders `qadi-gates-failed` with the wording and colour of `qadi-wiring-failed`. No decision D-01..D-19 is contradicted: the dock's `gates` is still a closed registry-only input, the join lives in the model, and the view stays a pure render. ADR-QD-162 Rev 1.5, BEH-QD-583/584 and INV-QD-343 state it (confirmed present).

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/core/src/GateState.ts` | VERIFIED | substantive, exported, read by react and devtools |
| `packages/devtools/src/model/Gates.ts` (`GateRegistryLike`, `joinQuestions`, `GatesView`, `QuestionsView`, `QuestionsSnapshot`) | VERIFIED | `GateRegistryLike` re-exported from the named devtools barrel |
| `packages/devtools/src/model/DockModel.ts` | VERIFIED | `questions` store wired to `configure`, finalizer and diagnostics subscription |
| `packages/devtools/src/react/QuestionsPanel.tsx`, `DevtoolsDock.tsx`, `useDockModel.ts` | VERIFIED | wired end to end; data flows from the registry through `joinQuestions` to render (Level 4 FLOWING) |
| `packages/react/src/DevtoolsFeed.ts` | VERIFIED | `gates` is the provider's effective registry |
| Records: `spec/decisions/162-...md` (Rev 1.5, in `index.yaml`), CCR-QD-440, BEH-QD-581..585, INV-QD-343..344, traceability, `spec/overview.md` rows, three changesets, website `upgrading.md`/`devtools.md`/`hooks.md`, READMEs | VERIFIED | all present; no ids beyond the reserved ones (no BEH-QD-586+, INV-QD-345, ADR-QD-163 appear); changesets: core minor, react minor Breaking, devtools minor Breaking |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| `QadiProvider` registry | `useDevtoolsFeed().gates` | `useQadiContext().gates` | WIRED |
| `DevtoolsDock gates` | `useDockModel` -> `makeDockModel`/`configure` | identity-diffed input | WIRED |
| registry `subscribe` / diagnostics publish | `rejoin` -> `questions.set(joinQuestions(...))` | model scope, finalizer release | WIRED |
| `model.questions` | `QuestionsPanel` | `useStoreSnapshot` | WIRED |

### Behavioral Spot-Checks and Gates (run by the verifier at HEAD)

| Check | Result |
|-------|--------|
| `vitest --project core` | 73 files, 2417 tests pass |
| `vitest --project react` | 34 files, 518 tests pass |
| `vitest --project devtools` | 64 files, 1519 tests pass |
| `pnpm typecheck` | exit 0 |
| `pnpm test:tstyche` | 293 tests, 613 assertions pass |
| `scripts/check-house-style.mjs` | 532 files clean, 3 declared switches (budget unchanged) |
| `pnpm spec:api` (gate 13) | 932 exports documented |
| `pnpm spec:gates`, `spec:claims`, `spec:verify:strict` | pass (25 steps match, 8 claims, 21 PASS / 0 FAIL) |
| Stryker `stryker.devtools.mjs --mutate DockModel.ts,Gates.ts` re-run at HEAD | DockModel.ts 100.00 (123 killed, 0 survived), Gates.ts 100.00 (66/66) |

The full `pnpm check:pr` was not re-run by the verifier; the orchestrator's report of exit 0 (coverage 99.57% statements, 98.39% branches) is carried as stated. The react and core Stryker runs were not re-run.

### Probe Execution

No probes declared by the plans. Step skipped.

### Requirements Coverage

All twelve IDs from the phase's plans appear in `.planning/REQUIREMENTS.md` (checked `[x]` and traced "Complete") and none is orphaned.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| GATE-01 | SATISFIED | Truth 1 |
| GATE-02 | SATISFIED | Truth 2 |
| GATE-03 | SATISFIED | Truth 3 |
| GATE-04 | SATISFIED | Truth 4 |
| GATE-05 | SATISFIED | Truth 5 |
| WX-01 | SATISFIED | orchestrator-reported `check:pr` exit 0 at HEAD; the suites, typecheck, tstyche and spec gates above re-run green here |
| WX-02 | SATISFIED | ADR-QD-162, CCR-QD-440, BEH-QD-581..585, INV-QD-343..344 and traceability present; nothing past the reserved ids appears; `next-id.mjs` use is not observable, but no unreserved id exists |
| WX-03 | SATISFIED | `spec/overview.md` rows for `GateState`/`gateStates`/`isGateState`/`GateRegistryLike`; gate 13 passes |
| WX-04 | SATISFIED | house-style clean with budgets unchanged; the added source diff uses `Match`, no new `any`/`switch`/`fnUntraced`/async/console/clock; only `as const satisfies` (the const assertion of the ADR-QD-152 pattern) |
| WX-05 | SATISFIED | see below |
| WX-06 | SATISFIED | git order: mutation base `53e36fad`, panel characterisation `e4a5359d`/`79a18dd5`, then RED vocabulary `8d88068a`, RED store `36053a33`, RED feed `7b9f3ef7`, each before its `feat` commit |
| WX-07 | SATISFIED | the two Breaking changesets (react, devtools) and the 0.13 upgrade entry exist; nothing released |

**WX-05 judgement.** Committed evidence `49-mutation-after.json` (taken at the 49-09 close, commit `b60ba39c`) against `49-mutation-base.json`: DockModel.ts 1 -> 1, Gates.ts 1 -> 1, DecisionOutcome.ts 1 -> 1, DevtoolsFeed.ts 0.7778 -> 0.7778 (equal to base, not lower), GateWriter.ts 0.9796 -> 0.9796 (equal), GateState.ts new at 1. That JSON predates the review fixes, which rewrote much of `DockModel.ts` and `Gates.ts`; the verifier therefore re-ran Stryker on those two files at HEAD and measured 100/100, confirming the fixers' uncommitted report independently. The react-side files were not touched by review fixes after the 49-09 measurement as far as `git log` shows for those files' tests; their committed numbers stand. Coverage thresholds are the orchestrator's `check:pr` figures. A drop would have been closed with a test, and none exists.

### Anti-Patterns

No `TBD`/`FIXME`/`XXX` in any file the phase touched. No stub or hollow data path found. One pre-existing stray JSDoc block above `interface Grouping` in `Gates.ts` is on the base too; not introduced here.

### Human Verification Required

None required for the verdict. The panel's appearance is covered by `49-UI-REVIEW.md` (22/24, warnings inherited from the base).

### Advisory

- The `qadi-gates-failed` arm (colour `colors.error`, copy modelled on `qadi-wiring-failed`) was added by review after the UI audit, so the audit did not look at it. It is rendered under tests and mirrors an existing pattern; a quick visual glance the next time someone opens the dock is sensible but not a gate.
- Stryker numbers for the react files and `GateState.ts` rest on the 49-09 committed JSON, not a fresh run.

### Gaps Summary

None. The phase goal is observable in the code: the five words live once in core and both consumers are typed from it; the registry is the dock model's eighth store, joined with the polled questions in one synchronous step and rendered by the panel as a single snapshot; the join is proved headlessly by a property test against an independent oracle; and the review's failure arm extends the same guarantee to a throwing host registry without breaking any locked decision.

---

_Verified: 2026-11-16_
_Verifier: Claude (gsd-verifier)_
