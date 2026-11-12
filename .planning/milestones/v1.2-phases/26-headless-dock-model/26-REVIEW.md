---
phase: 26-headless-dock-model
reviewed: 2026-11-11T00:00:00Z
depth: standard
files_reviewed: 36
files_reviewed_list:
  - .changeset/dock-model.md
  - .changeset/simulation-session.md
  - .changeset/simulator-session-only.md
  - features/features/devtools-simulator/devtools-simulator.steps.test.ts
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/ExplorerSession.ts
  - packages/devtools/src/model/HeldChoice.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/index.ts
  - packages/devtools/src/react/PolicyExplorer.tsx
  - packages/devtools/src/react/QuestionsPanel.tsx
  - packages/devtools/src/react/RoleViewer.tsx
  - packages/devtools/src/react/ServicesPanel.tsx
  - packages/devtools/src/react/Simulator.tsx
  - packages/devtools/src/react/useDockModel.ts
  - packages/devtools/src/react/useDockSession.ts
  - packages/devtools/src/react/useExplorerSession.ts
  - packages/devtools/src/react/useSimulationSession.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/model/ExplorerSession.test.ts
  - packages/devtools/test/model/HeldChoice.test.ts
  - packages/devtools/test/model/SimulationSession.test.ts
  - packages/devtools/test/react/DevtoolsDock.test.tsx
  - packages/devtools/test/react/useSimulationSession.test.tsx
  - packages/devtools/test/surface.test.ts
  - packages/devtools/test/surface.tst.ts
  - spec/behaviors/28-devtools-screens.md
  - spec/behaviors/29-devtools-simulator.md
  - spec/decisions/047-a-headless-devtools-model.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/README.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
  necessity: 2
status: issues_found
---

# Phase 26: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 36
**Status:** issues_found

## Summary

Iteration 2. The only change since iteration 1 is `0e340791` (WR-01), and it is correct.

- **The fix is comment-only and resolves WR-01.** It changed three doc-comment citations (`HeldChoice.ts`, `ExplorerSession.ts`, `SimulationSession.ts`) and no code.
  - The citations now read `ARCH-74, BEH-QD-466`.
  - `BEH-QD-466` resolves in `spec/behaviors/28-devtools-screens.md:918`, "A choice from a list has one shape". That heading is the record for the shared `HeldChoice` arms and the single cell both sessions embed, which is what the three comments describe.
  - The spec change history (line 13) also names `ARCH-74`, so both IDs resolve.
- **No planning-only IDs remain in shipped source.** A grep of `HeldChoice.ts` and `ExplorerSession.ts` for `DMOD-` and `D-08`/`D-09` returns nothing. A grep of the phase diff of `packages/devtools/src` for added `DMOD-` or `D-nn` citations also returns nothing. The `D-nn` citations left in `SimulationSession.ts` predate the phase base, as the fix report says.
- **No regression.** A comment-only diff cannot change behaviour, types or exports. The house-rule scan finds nothing new: no `as`, `!`, `any`, `switch`, `class`, `Date.now` or `console` was added.
- **Everything iteration 1 cleared still stands.** That covers cross-store consistency, held-choice pinning, unchanged-configure no-ops, lifetime and fail-closed behaviour. No source file under `packages/` has changed since the review, so the earlier trace is still valid.

IN-01 to IN-03 are re-stated unchanged. Each was re-checked against current source and still holds. None is promoted.

## Info

### IN-01: `useDockSnapshot`, `useExplorerSnapshot` and `useHeldChoiceSnapshot` pass a constant `undefined` run to `useRunningStore`

**File:** `packages/devtools/src/react/useDockSession.ts:15`, `packages/devtools/src/react/useExplorerSession.ts:16` and `:20`
**Category:** necessity
**Issue:** All three call `useRunningStore(store, undefined, [store])`. With `run` fixed at `undefined`, the hook's `useEffect` returns immediately and does nothing. Each wrapper is `useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)` plus a no-op effect that re-runs when `store` changes. This is provable from the repo: the third argument is the only varying input, and `useRunningStore.ts` documents "An absent `run` starts nothing". Before this phase these were the owning hooks that forked a run, so the parameter was real. Now the fork machinery is unreachable from these three callers.
**Fix:** Call `useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)` directly in the three readers, as `useSimulationSnapshot` already does. `useRunningStore` then keeps only `useDiagnostics` as a caller.

### IN-02: `DevtoolsDock`'s `nothing` default duplicates `DockModel`'s own empty-source handling, and its comment is stale

**File:** `packages/devtools/src/react/DevtoolsDock.tsx:41-45`, `:130`
**Category:** necessity
**Issue:** `makeDockModel` and `configure` already treat an omitted source as `undefined` and read `NO_SOURCE` (`DockModel.ts:83`, `:121`), with M15 (d) pinning that behaviour. A module-scope `nothing` in `DevtoolsDock` repeats the same default, and `UseDockModelInput.source` is required only to carry it. The comment above it still says "`useTimeline` holds its source by identity", but `DevtoolsDock` no longer uses `useTimeline`. The model's `configure` diff does that now.
**Fix:** Make `UseDockModelInput.source` optional (`Source | undefined`), drop `nothing` and its import, and let the model own the default. If `nothing` stays, fix its comment to name `useDockModel`'s identity diff.

### IN-03: Test titles and a header comment point at removed DOM code by line number

**File:** `packages/devtools/test/model/DockModel.test.ts:15-17` and the 11 `it.effect` titles carrying `was DevtoolsDock l.N` (plus the `M11` and `M14` titles)
**Issue:** Titles such as "M5 (was DevtoolsDock l.1026)" cite line numbers in a test file that this phase shortened by about 237 lines, so the references already point at nothing. The header says the DOM duplicates are dropped "once this one is green (26-05)", a to-do that has been done. Test titles are what a failing run prints, and a stale line number sends a reader to the wrong place.
**Fix:** Keep the stable case label (`M5`) and a short behaviour description, and drop the `was DevtoolsDock l.N` parentheticals and the "26-05" remark. The provenance belongs in the phase's own records.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
