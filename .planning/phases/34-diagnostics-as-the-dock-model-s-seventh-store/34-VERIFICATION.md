---
phase: 34-diagnostics-as-the-dock-model-s-seventh-store
verified: 2026-11-12T19:40:00Z
status: human_needed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-01-PLAN.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-01-SUMMARY.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-02-PLAN.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-02-SUMMARY.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-03-PLAN.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-03-SUMMARY.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-04-PLAN.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-04-SUMMARY.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-05-PLAN.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-05-SUMMARY.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-06-PLAN.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-06-SUMMARY.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-07-PLAN.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-07-SUMMARY.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-08-PLAN.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-08-SUMMARY.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-09-PLAN.md"
  - ".planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-09-SUMMARY.md"
  - "packages/devtools/src/model/DiagnosticsFeed.ts"
  - "packages/devtools/src/model/DockModel.ts"
  - "packages/devtools/src/model/TimelineFeed.ts"
  - "packages/devtools/src/react/DevtoolsDock.tsx"
  - "packages/devtools/src/react/DiagnosticsNotice.tsx"
  - "packages/devtools/src/react/useDiagnostics.ts"
  - "packages/devtools/src/react/useDockModel.ts"
  - "packages/devtools/src/react/useStoreSnapshot.ts"
covered_digest: "v4:sha256:eb448f20b074a36de9b3c3d505350114ad95a0ea6f897727b0fbc95368711df0"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Hide and show the dock through React `<Activity>` in a real browser"
    expected: "After the show the Services screen reads Starting, then a fresh reading (the model is rebuilt on hide and show, so the reading blanks until the next poll; ADR-QD-047 Rev 1.13)"
    why_human: "The jsdom/happy-dom runner pins the rebuild (DiagnosticsLifetime.test.tsx) but cannot confirm Activity's real hide/show effect timing in a browser"
  - test: "Open the Services screen with a throwing `questions` source in light and dark themes"
    expected: "The amber Stopped notice is legible (contrast) in both themes"
    why_human: "Colour contrast and visual legibility are not observable in a DOM test"
  - test: "Click 'Restart diagnostics' on the Stopped notice, with a screen reader running"
    expected: "Focus visibly lands on the screen root, and the screen reader announces each stop exactly once"
    why_human: "Visible focus ring and assistive-technology announcement are not observable in the test runner"
---

# Phase 34: Diagnostics as the dock model's seventh store Verification Report

**Phase Goal:** The dock forks nothing from a React effect: the diagnostics poll runs in the model's scope, the "supplied reading wins per field" merge is a model store, and ARCH-74's rule ("one owned-model hook, and it forks nothing") finally holds.
**Verified:** 2026-11-12
**Status:** human_needed (all automated truths verified; three browser checks remain)
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `makeDockModel` takes `diagnostics` and `reading` through `configure`, compared per field; the poll runs on the model's own `FiberHandle`; nothing is forked from a React effect; the hand-written deps list and its `eslint-disable` are deleted | VERIFIED | `DockModel.ts:115` `yield* makeDiagnosticsFeed(inputs.diagnostics)`; `configure` (l.145-157) calls `diagnosticsFeed.configure(next.diagnostics)` then `remerge()`. `DiagnosticsFeed.ts` holds `FiberHandle.make` and compares `layer/collector/questions/intervalMillis` by identity (l.~213-222). `grep forkIn\|runFork\|runSync\|FiberHandle\|Effect.fork` over `packages/devtools/src/react` hits only `useScoped.ts` (scope build and the scope-close `runFork`, which is not a poll). `useDockModel`'s one `useLayoutEffect` only calls `model.configure`. `useRunningStore.ts`, `useDockSession.ts`, `useExplorerSession.ts` are deleted; the only `eslint-disable` left in `src/react` is `useScoped.ts:45` (`[]` deps on a mount-once scope, which predates the phase, and is not the poll's deps list). Model tests F12/F13/M23/M24 pin per-field comparison and no restart on a fresh literal. |
| 2 | The merged reading is computed in the model on change and exposed as a store; `DevtoolsDock` merges nothing; `useDiagnostics` is a thin adapter over the same scoped feed; `DiagnosticsDockOptions` is declared in the model | VERIFIED | `DockModel.ts:116-130`: `shownReading` is an `ExternalStore<DiagnosticsSnapshot>` set in `remerge` via `mergedOf` -> `mergeReading`; it is not computed in `getSnapshot`. `DevtoolsDock.tsx:166` only destructures `useStoreSnapshot(model.diagnostics)`; no `mergeReading` call in `src/react` (one doc mention). `useDiagnostics.ts` is `useScoped(makeDiagnosticsFeed)` + `configure` + `useStoreSnapshot`, returning `{status, reading}`. `DiagnosticsDockOptions` is declared at `model/DiagnosticsFeed.ts` and re-exported type-only from the React entry. M21/M28 pin identity when nothing is supplied. |
| 3 | One store-snapshot hook, and no constant-`undefined` run passed to `useRunningStore` | VERIFIED | `useStoreSnapshot.ts` holds the single `useSyncExternalStore` call in `src/`; `useRunningStore` has no references left in `packages` or `apps` (`grep -rl` empty, source and docs). `useSimulationSession`, `useTimeline`, `PolicyExplorer`, `RoleViewer`, `DevtoolsDock` all read through it. `useStoreSnapshot.test.tsx` is new. |
| 4 | A poll defect shows as a failed state (tested with a throwing source); an interruption never does; Activity and `diagnostics` undefined-and-back are stated and pinned | VERIFIED (browser confirmation is human item 1) | `DiagnosticsFeed.ts` `Effect.onExit`: `Stopped` only when `mine === generation && Exit.isFailure && !Cause.hasInterruptsOnly`; `off()`, restart, and the scope close (finalizer bumps `generation`, `closed=true`) cannot produce it. Tests: F4/F5 (throwing `questions` -> Stopped, with `sampled` true or false), F8/F9/F10/F17/F24 (replace, release-dies, undefined, scope close -> no Stopped), F6/F7 (restart resumes), M18, M25 (undefined -> Off and back -> Starting then Live). Activity: `DiagnosticsLifetime.test.tsx` mounts `<Activity>`; ADR-QD-047 Rev 1.13 l.387/426 states the rebuild and the blanked reading. |
| 5 | Model tests cover start, restart, stop and merge under `TestClock` with no render; ADR-QD-047 amended, BEH-QD-465 and BEH-QD-323 restated; `DockModel.ts` keeps its mutation score | VERIFIED | `test/model/DiagnosticsFeed.test.ts` (F1-F27, `it.effect`, F14/F15 pin the 1999/2000 ms and 499/500 ms cadence on `TestClock`), `DockModel.test.ts` (M18-M28), `TimelineFeed.test.ts`. `34-mutation-after.json`: `DockModel.ts` 1.0 (base 1.0), `DiagnosticsStore.ts` 1.0, `TimelineFeed.ts` 1.0, `DiagnosticsFeed.ts` 0.928 with 8 survivors each named in `34-mutation-survivors.json`. Spec: ADR-QD-047 Rev 1.13 present with change-history row; BEH-QD-506..510 at `spec/behaviors/28-devtools-screens.md` l.1137/1201/1263/1298/1356; BEH-QD-465 (l.835) and BEH-QD-323 (l.572) restated; INV-QD-313 and 314 in `spec/invariants.md` (l.3636, 3650). |

**Score:** 5/5 truths verified (0 behavior-unverified; the Activity browser check is recorded as a human item, not a gap).

### Requirement-level checks (from the task brief)

| Check | Status | Evidence |
|-------|--------|----------|
| `useDiagnostics` Breaking recorded | VERIFIED | `.changeset/dock-diagnostics-feed.md` ("**Breaking.** `useDiagnostics` returns `{ status, reading }`"); `apps/website/src/content/docs/docs/reference/upgrading.md` l.519 "0.12: `useDiagnostics` returns `{ status, reading }`", with before/after code. |
| ADR-QD-147 named Unused, CCR-QD-425 present | VERIFIED | ADR-QD-047 l.455 "ADR-QD-147 was reserved for it and is left unused (CCR-QD-425)"; `spec/README.md:362` CCR-QD-425 row. No `ADR-QD-147` file or index entry. |
| Reserved ids only, no placeholders | VERIFIED | Added lines under `spec`, `packages`, `apps`, `.changeset` since the base contain zero `QD-NEXT`. IDs (BEH 506-510, INV 313-314, CCR 425) match the roadmap reservation. |
| Stopped is visible, interruption is not | VERIFIED | See truth 4. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Devtools suite (model, React, surface) | `pnpm exec vitest run --project devtools --coverage.enabled=false` | 55 files, 1320 tests passed | PASS |
| Merge gate | `p34-checkpr.log` tail | `run-check: ran 16 of 17 steps` (mutation skipped by design), `exit=0` | PASS (log read; not re-run) |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| DIAG-01 to DIAG-06 | SATISFIED | Truths 1-5 above (scoped poll, merge store, one snapshot hook, adapter hook, visible Stopped, tests and records). |
| WX-01 to WX-07 (house rules, gates, records, mutation, changeset, example) | SATISFIED | `pnpm check:pr` exit 0 on HEAD `07d9b8de` (house-style, spec gates, `spec:verify:strict`, coverage, example tests); mutation scores above; changeset present; no `QD-NEXT`. WX items depend on the gate log, which I read but did not re-run. |

### Anti-Patterns Found

None blocking. `TODO/FIXME/XXX` scan was not repeated across the diff beyond the gate's `check-house-style` pass. Info only:
- `useScoped.ts:45` retains an `eslint-disable` (`[]` deps, mount-once scope). It predates the phase and is not the poll's hand-written deps list the goal names.
- IN-01 and IN-05 (`TimelineFeed` untokened accept and silent fiber death on a throwing source) are pre-existing, dispositioned `skipped`, and carried to Phase 36. Not gaps here.
- `DiagnosticsFeed.ts` 0.928 mutation: 8 survivors, each reasoned in `34-mutation-survivors.json`. The roadmap bar is on `DockModel.ts` (met at 1.0).

### Deviations (checked, accepted)

34-02 extra F21-F23/M28 (more tests), 34-05 D3 shape, 34-06's one `export { DiagnosticsStatus }` (TS2300 otherwise), 34-07's `VerdictTreatment.test.tsx` prop insertion, 34-08's `QD-NEXT` scan exempting pre-existing history rows. None weakens a success criterion.

### Human Verification Required

1. **Activity hide/show.** Hide and show the dock through React `<Activity>` in a real browser. Expected: Starting, then a fresh reading. Why human: the runner cannot confirm real browser Activity timing.
2. **Stopped notice legibility.** View the amber Stopped notice in light and dark themes. Expected: legible contrast in both. Why human: visual.
3. **Focus and announcement.** After "Restart diagnostics", focus visibly lands on the screen root; a screen reader announces each stop once. Why human: assistive tech and focus ring are not observable in the runner.

### Gaps Summary

No gaps. The goal is achieved in code: no fork or poll lives in a React effect, the poll runs on a `FiberHandle` in the model's scope, the merge is the seventh store computed on change, `useRunningStore` is gone, and the records are in place. Status is `human_needed` solely because of the three browser checks.

---

_Verified: 2026-11-12_
_Verifier: Claude (gsd-verifier)_
