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
  warning: 1
  info: 3
  total: 4
  necessity: 2
status: issues_found
---

# Phase 26: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 36
**Status:** issues_found

## Summary

The core of the phase holds up. I traced these paths and found no defect in `DockModel.ts`, `HeldChoice.ts`, the two sessions' use of the cell, or the React owner:

- **Cross-store consistency.** `push` and `spread` are the only writers of `shown` and `rail`, so the rail, explorer, simulation and dock session always read one timeline. A pause toggle publishes to the host without moving the rail. A resize pushes before the catalogue branch, and `inputs` is already updated by then, so `spread` sees the new catalogue.
- **A new head keeps a held choice.** The pin is conditional: `SimulationSession.pin()` skips pinning while `seeded` is set. `reseed(undefined)` and an orphan replay re-pin. `choosePolicy` out of a seeded state clears `seeded` even when `chosen.choose` returns false for an already-held value.
- **An unchanged configure dispatches nothing.** Each field is diffed by identity, and `setPorts` and `setList` guard identical input themselves.
- **Lifetime.** `FiberHandle.setUnsafe` installs the replacement and then interrupts the previous read. A closed handle interrupts a new fork at once, which I read in the installed `effect` source. A stale `configure` on a closed model, such as after an `Activity` re-show, is a no-op because its inputs equal what that model last saw. StrictMode builds the second model after closing the first.
- **Fail-closed.** `DockModel` adds no failure path that could read as a denial.
- **House rules.** No `as`, `!`, `any`, `switch`, `class`, `Date.now` or `console` was added in the diff.

What remains is maintainability debris: planning-only IDs cited from shipped source, stale comments and test titles that point at removed code, and two thin or redundant React layers. The known accepted deviation (`PolicyChoice` and `HeldChoice` drift enforced by use) was weighed and not re-raised.

## Warnings

### WR-01: Shipped source cites planning-only decision IDs that resolve nowhere in `spec/`

**File:** `packages/devtools/src/model/HeldChoice.ts:28`, `packages/devtools/src/model/ExplorerSession.ts:43`, `packages/devtools/src/model/SimulationSession.ts:69`
**Issue:** The doc comments cite `DMOD-04`, `D-08` and `D-09`. These are phase-planning identifiers. They have no entry in `spec/` (grep of `spec` for `DMOD-04` returns nothing), and `.planning/` is not a durable reference for a reader of the package. AGENTS.md's doc-comment shape expects the *why* to cite ADRs, invariants or `ARCH-nn` and `CCR-QD-nnn` ids that the spec resolves. The rationale each comment points at (two sessions embedding the publishing store would publish twice per command; the arms are `HeldChoice`'s own, not re-mapped) is sound, but a reviewer cannot follow the pointer.
**Fix:** Drop the bare IDs, or cite the durable anchors the spec does have (`ARCH-74`, `CCR-QD-416`, ADR-QD-047's amendment). For example, in `HeldChoice.ts` write "...publish twice per command, once from the store and once from its own snapshot (ARCH-74)".

## Info

### IN-01: `useDockSnapshot`, `useExplorerSnapshot` and `useHeldChoiceSnapshot` pass a constant `undefined` run to `useRunningStore`

**File:** `packages/devtools/src/react/useDockSession.ts:15`, `packages/devtools/src/react/useExplorerSession.ts:15` and `:18`
**Category:** necessity
**Issue:** All three call `useRunningStore(store, undefined, [store])`. With `run` fixed at `undefined`, the hook's `useEffect` returns immediately and does nothing. Each wrapper is `useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)` plus a no-op effect that re-runs when `store` changes. This is provable from the repo: the third argument is the only varying input, and `useRunningStore.ts` documents "An absent `run` starts nothing". Before this phase these were the owning hooks that forked a run, so the parameter was real. Now the fork machinery is unreachable from these three callers.
**Fix:** Call `useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot)` directly in the three readers, as `useSimulationSnapshot` already does. `useRunningStore` then keeps only `useDiagnostics` as a caller.

### IN-02: `DevtoolsDock`'s `nothing` default duplicates `DockModel`'s own empty-source handling, and its comment is stale

**File:** `packages/devtools/src/react/DevtoolsDock.tsx:41`
**Category:** necessity
**Issue:** `makeDockModel` and `configure` already treat an omitted source as `undefined` and read `NO_SOURCE` (`DockModel.ts:83`, `:121`), with M15 (d) pinning that behaviour. A module-scope `nothing` in `DevtoolsDock` repeats the same default, and `UseDockModelInput.source` is required only to carry it. The comment above it still says "`useTimeline` holds its source by identity", but `DevtoolsDock` no longer uses `useTimeline`. The model's `configure` diff does that now.
**Fix:** Make `UseDockModelInput.source` optional (`Source | undefined`), drop `nothing` and its import, and let the model own the default. If `nothing` stays, fix its comment to name `useDockModel`'s identity diff.

### IN-03: Test titles and a header comment point at removed DOM code by line number

**File:** `packages/devtools/test/model/DockModel.test.ts:15-18` and the `it.effect` titles at lines 242, 256, 272, 288, 306 and 349 (and the `M11`, `M14` titles)
**Issue:** Titles such as "M5 (was DevtoolsDock l.1026)" cite line numbers in a test file that this phase shortened by about 237 lines, so the references already point at nothing. The header says the DOM duplicates are dropped "once this one is green (26-05)", a to-do that has been done. Test titles are what a failing run prints, and a stale line number sends a reader to the wrong place.
**Fix:** Keep the stable case label (`M5`) and a short behaviour description, and drop the `was DevtoolsDock l.N` parentheticals and the "26-05" remark. The provenance belongs in the phase's own records.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
