---
phase: QD-85-the-dock-s-hydration-block-is-a-model-row
reviewed: 2026-11-25T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/HydrationView.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/QuestionsPanel.tsx
  - packages/devtools/src/react/useStoreSnapshot.ts
  - packages/devtools/test/model/ConfigureRule.test.ts
  - packages/devtools/test/model/DockModel.listeners.test.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/model/HydrationView.test.ts
  - packages/devtools/test/model/HydrationView.tst.ts
  - packages/devtools/test/react/DockFrame.renders.test.tsx
  - packages/devtools/test/react/QuestionsPanel.hydration.characterisation.test.tsx
  - packages/devtools/test/react/QuestionsPanel.test.tsx
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
  necessity: 1
status: issues_found
---

# Phase 85: Code Review Report

**Reviewed:** 2026-11-25
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed the diff against `2741584f` for all 13 files, with `ExternalStore.ts` (`makeDerivedStore`, `sameFields`), `DiagnosticsFeed.ts` (status identity, `isUnsampled`) and `Diagnostics.ts` (`keep`, `mergeReading`) read for context. The change is sound. I found no correctness, security or house-rule defects.

What I traced and found correct:

- The activity-precedence rule is preserved: counts present give Counts whatever the status, otherwise unsampled gives Pending, else Unwired. The three predicates (questions, services, hydration) were not flattened.
- The derived store's key is `{ hydration, unsampled }` and `sameFields` compares it by identity. `Diagnostics.keep` holds `hydration`'s identity across unchanged samples, so an identical poll publishes nothing.
- `useDiagnosticsStatus` is safe. `Live`'s identity is held across unchanged samples (`DiagnosticsFeed.ts:195`), `mergedOf` passes `fed.status` through unchanged, and `subscribe` is the store's own stable function. Only the `getSnapshot` closure is fresh per render, which `useSyncExternalStore` accepts.
- The hydration store is built after `services` and subscribes to `shownReading` in the same position. No `configure` step was added, so the `AggregateError.errors` order BEH-QD-742 pins is intact. DL22 pins the services-then-hydration order.
- The plural and boundary rules moved verbatim: `rechecked === 0` or `=== 1`, `count > 0`, and `unaccounted === 1`. The `HydrationView.test.ts` rows (V5..V16) hit each boundary.
- `QuestionsPanel` is package-private (not in `src/react/index.ts`), so changing the type of its `hydration` prop is not a public-API break.
- Rendering uses React text nodes only, so a foreign drop reason holding markup stays text (H9 and the panel test pin it).

Two minor items follow.

## Info

### IN-01: `QuestionsPanel`'s optional `hydration` prop and `NO_HYDRATION` fallback serve no production caller, and the fallback changes what a standalone panel says

**Category:** necessity
**File:** `packages/devtools/src/react/QuestionsPanel.tsx:78,91-97,119`
**Issue:** The only production caller is `DevtoolsDock.tsx:254`, which always passes `props.model.hydration`. `QuestionsPanel` is not exported from `src/react/index.ts`. So the `?` on `hydration?: ReadableStore<HydrationView> | undefined` and the `NO_HYDRATION`/`UNWIRED` constants are reachable only from tests that omit the prop. The fallback also differs from the base. A panel rendered with no `hydration` and a Starting or unsampled-Stopped `diagnostics` used to show "no counts read yet." (`isUnsampled(diagnostics.status)`). It now always shows the "Pass `diagnostics={{}}`" advice, which the removed inline comment called wrong in that state ("it was passed, and nothing has been read yet"). The doc comment states the new behaviour, so it is deliberate. But no real render path can reach the state, and the fallback contradicts the rule the model now owns. This is a "generality without instantiation" case. It is not a bug in the dock.
**Fix:** Make the prop required (`readonly hydration: ReadableStore<HydrationView>`), drop `NO_HYDRATION` and `UNWIRED`, and have `panelInput` or the tests that omit it supply `storeOf(HydrationView.Unwired())`. That removes a second place where "no counts" is decided.

### IN-02: The scope sentence is ungrammatical at 1, and the all-clear is ungrammatical at one reason; both are now pinned by tests

**Category:** quality
**File:** `packages/devtools/src/model/HydrationView.ts:75,90` (pinned by `test/model/HydrationView.test.ts` V14, and by H5 in `QuestionsPanel.hydration.characterisation.test.tsx`)
**Issue:** At a shortfall of one the sentence reads "1 dehydrated entry have no seeding counted in this process." The verb should be "has", and only the noun is pluralised. D-08 sanctioned "0 dehydrated entries" as correct English, but it did not address the "1 ... have" case, and V14 and H5 now lock the wrong verb in. The all-clear's "All {n} reasons" is wrong at n = 1, as the panel test's own "All 1 reasons are watched." shows. In production the reason list is fixed, so only the first item is user-visible. It was already like this on the base, and the byte oracle forces any change to land with an oracle edit.
**Fix:** In a later wording change, pick the verb with the same `unaccounted === 1` branch (`has` or `have`) and the noun with the count. Update V14 and H5 together, and say so in the CCR row, because H5 is a held byte oracle.

---

_Reviewed: 2026-11-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
