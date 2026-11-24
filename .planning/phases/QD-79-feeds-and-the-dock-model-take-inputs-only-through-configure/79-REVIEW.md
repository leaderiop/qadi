---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
reviewed: 2026-11-24T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DiagnosticsStore.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/GatesFeed.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/useConfigured.ts
  - packages/devtools/src/react/useDiagnostics.ts
  - packages/devtools/src/react/useDockModel.ts
  - packages/devtools/src/react/useScoped.ts
  - packages/devtools/src/react/useTimeline.ts
  - packages/devtools/test/builtFeeds.ts
  - packages/devtools/test/model/ConfigureInputs.tst.ts
  - packages/devtools/test/model/ConfigureRule.test.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/DockModel.characterisation.test.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/model/ExternalStore.test.ts
  - packages/devtools/test/model/GatesFeed.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx
  - packages/devtools/test/react/DockRegistryReads.test.tsx
  - packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx
  - packages/devtools/test/react/useConfigured.test.tsx
  - packages/devtools/test/surface.tst.ts
  - scripts/check-package-install.mjs
  - spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md
  - spec/behaviors/28-devtools-screens.md
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase QD-79: Code Review Report

**Reviewed:** 2026-11-24
**Depth:** standard
**Files Reviewed:** 29
**Status:** clean

## Summary

Iteration 3 (final). I checked the iteration-2 fix (commit 4ac58dcd) against the shipped code, then re-read the
source files for anything the earlier iterations missed.

**The iteration-2 fix holds.**

- ADR-QD-192 decision 1 and BEH-QD-731 now agree with `makeTimelineFeed`. The code builds with `makeTimelineStore()`
  and starts no read, because `readSource` is reached only from `restart` and `configure`. A bare feed and one handed
  `{}` show the same timeline and `Reading` status, since the empty source publishes nothing and `READING` is one value.
- The ADR's "Alternatives considered" bullet now describes what shipped. It no longer lists as rejected the thing that
  was built.
- BEH-QD-731's requirement and its paragraph say the same thing. The `TimelineFeed.ts` doc comment matches both.
- `GatesFeed` has no build-time watch, publish or cadence. It builds `held = completeGatesInputs({})` and
  `snapshotOf(UNWATCHED, UNHANDED)`, and `configure` returns early on `sameFields(held, wanted) && watchFailure === undefined`.
  That is the exact text of ADR decision 5 and BEH-QD-733.

I found nothing else in ADR-QD-192 or BEH-QD-731 to BEH-QD-735 that contradicts the code:

- Decision 10's counts (2, 2, 3, 3, 0, 1, 0, 2, 1, and 2, 3, 2 once the layer builds) equal BEH-QD-735's counts and
  CR22's title.
- Every test id the BEH "Pinned by" paragraphs cite exists with the cited meaning: CR1 to CR24, U1 to U4, C1 to C11,
  G43, G44, UT4, UT5, and the two `surface.tst.ts` titles.
- The two `DockRegistryReads` titles also exist as cited.
- The barrels export none of `sameFields`, the normalisers, `effectiveCapacity` or `feedInputsOf`. This matches the ADR's
  "out of both barrels" and "export list unchanged".
- The dock holds one comparison of its own, `wanted.catalogue !== before.catalogue`, as decision 9 says.

**Source re-check, nothing new:**

- `DockModel.configure`: normalise, then assign `held`, then `timelineFeed.configure` inside `try`, with the rest in
  `finally`. Capacity is checked before anything moves, and the listener rethrow is preserved.
- `DiagnosticsFeed.configure`: `sameFieldsOrAbsent` over normalised options. `restart` reads `held`, which is the
  normalised record.
- `useConfigured`: the build configures before `setValue`. The layout effect's first run sees `value === undefined`
  and does nothing. `useScoped` closes the scope on a throw from the first `configure`.
- `DevtoolsDock`: the rest-spread into `useDockModel(inputs)` and a rebuilt `host` record are equivalent to the
  previous rest object, so there is no new re-render or configure cost.
- Edge reading of `GatesFeed.configure`: a failed watch with unchanged inputs retries once. A failed watch whose
  registry was removed clears via `watch(undefined)`. A quiet mend is read only by a `configure` that moves an input or
  by a tick whose questions changed. All three match the ADR and are pinned.

**Verification run.**

- `pnpm exec vitest run --project devtools packages/devtools/test/model packages/devtools/test/react` passed:
  1863 tests, all green.
- `node scripts/spec-revise.mjs --check` passed.
- `bash spec/scripts/verify-traceability.sh --strict` passed with 21 pass, 0 fail, 0 skip.
- No `as`, `!`, `any`, `switch`, `async` or module-scope `let` was added in the reviewed source.

All reviewed files meet quality standards. No issues found.

---

_Reviewed: 2026-11-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
