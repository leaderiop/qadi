---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
reviewed: 2026-11-25T10:15:00Z
depth: standard
files_reviewed: 25
files_reviewed_list:
  - packages/devtools/src/model/LensSession.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/DiagnosticsNotice.tsx
  - packages/devtools/src/react/QuestionsPanel.tsx
  - packages/devtools/src/react/StoppedBox.tsx
  - packages/devtools/src/react/TimelineNotice.tsx
  - packages/devtools/src/react/useConfigured.ts
  - packages/devtools/src/react/useDiagnostics.ts
  - packages/devtools/src/react/useDockModel.ts
  - packages/devtools/src/react/useLens.ts
  - packages/devtools/src/react/useStopNotice.ts
  - packages/devtools/src/react/useTimeline.ts
  - packages/devtools/test/react/DockFrame.stops.characterisation.test.tsx
  - packages/devtools/test/react/Lens.adapter.test.tsx
  - packages/devtools/test/react/Lens.questions.characterisation.test.tsx
  - packages/devtools/test/react/useConfigured.test.tsx
  - packages/devtools/test/react/useConfigured.tst.ts
  - packages/devtools/test/react/useTimeline.inputs.characterisation.test.tsx
  - packages/devtools/test/surface.tst.ts
  - .changeset/devtools-lens-reads-each-fact-once.md
  - spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md
  - spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md
  - spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md
  - spec/behaviors/28-devtools-screens.md
  - spec/invariants.md
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
  necessity: 0
status: issues_found
---

# Phase QD-84: Code Review Report

**Reviewed:** 2026-11-25T10:15:00Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** issues_found

## Summary

The source change is sound. I found no behavioural defect in it.

- `LensSession.ts`: `store.set` has exactly the semantics of the deleted `move`. `choose` still arms the reveal before it publishes, and it only reaches `set` with `next !== current`.
- `useLens` subscribes to the questions store first and the lens second. That is the order the panel used before. The handlers read `questions.getSnapshot()` at event time.
- `useStopNotice` keys its memo on `[status, onRestart]`. Each feed's `restart` is one closure per feed (`DiagnosticsFeed.ts:231`, `TimelineFeed.ts:192`), and `DockModel.diagnostics.restart` and `timelineStatus.restart` hand those closures through unchanged. So it is equivalent to the old `[status, model]` memo.
- `useConfigured` and the three hooks type-check with no type argument. I ran a scratch `tsc` and the refusals hold. A value with no `configure`, a mismatched input, and a build handed `{ source: 1 }` are all compile errors.

Verified by running them:
- `vitest` over the five new or changed React tests passes (18 tests).
- The full `scripts/run-tstyche.mjs` run passes.

Spec checks:
- Every quoted test title I checked exists verbatim: the `LensSession`, `Lens.adapter`, `GatesFeed` G43, `DockRegistryReads`, `Lens.dock` and `useConfigured.tst` titles, and the TN1-15, N1-15, C1-11 and U1-4 ranges.
- The base-revision line references in ADR-197 (`useDockModel.ts:30`, `useTimeline.ts:69-71`, `useDiagnostics.ts:44`, `DevtoolsDock.tsx:86`) are correct.

All the findings are claims in the spec records that the code does not back.

## Warnings

### WR-01: BEH-QD-756 says three refusals are pinned, and only one is

**File:** `spec/behaviors/28-devtools-screens.md` (BEH-QD-756, the paragraph "Three calls are refused and pinned as refusals")
**Issue:** The record says "Three calls are refused and pinned as refusals: a value with no `configure`, the diagnostics feed's build handed a timeline's inputs, and the timeline feed's build handed a source that is a number."
- `packages/devtools/test/react/useConfigured.tst.ts` holds exactly one `@ts-expect-error`, for the no-`configure` case.
- The other two were a one-off scratch check. ADR-QD-197 decision 1 says so ("A scratch file ... Three calls were refused").
- ADR-QD-197's alternatives section is accurate about this: "The refusal is one `@ts-expect-error`".
- The BEH requirement "a build handed inputs that are not the ones its `configure` takes, MUST be a compile error" therefore has no pin. This is spec section 11: a behaviour record must be pinned by tests.
- I confirmed with a scratch `tsc` that the two unpinned refusals do hold today. They are true but unprotected, and the record claims they are protected.

**Fix:** Either add the two refusals to `useConfigured.tst.ts`, each with an accepted twin and a message fragment, as the existing case has. Or reword the BEH to say one refusal is pinned and the mismatch refusal was checked once when the decision was made. Adding the pins is the more complete option, and it costs nothing in `NOT_CALLABLE_PIN_BUDGET` because they are `@ts-expect-error` pins:

```ts
// @ts-expect-error Argument of type '() => Effect<DiagnosticsFeed
useConfigured(makeDiagnosticsFeed, { source: timelineSource, capacity: 1 });
// twin
useConfigured(makeDiagnosticsFeed, undefined);
```

### WR-02: "The lens group of `stryker.devtools.mjs`" does not exist in that file

**File:** `spec/behaviors/28-devtools-screens.md` (BEH-QD-757, "Pinned by"), `spec/invariants.md` (INV-QD-413, **Enforcement**), `spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md` ("What enforces it", decision 2, and the alternatives entry "Keep `move`")
**Issue:** Three shipped records cite "the lens group of `stryker.devtools.mjs`" as an enforcement mechanism. `stryker.devtools.mjs` has no groups. It has one `mutate: ["packages/devtools/src/model/**/*.ts"]` and no mention of "lens".
- The only "lens" group is the phase-local script `.planning/phases/QD-84-.../84-mutation.mjs` (`GROUPS = { lens: ... }`).
- That script is not in `pnpm check` and will not exist for a later reader of `spec/`.
- Neither phrase appears in the base revision of BEH-28. They were introduced by this phase.

A reader following the reference to the shipped enforcement mechanism finds nothing.

**Fix:** Cite the real mechanism: "the devtools mutation run (`stryker.devtools.mjs`, which mutates `src/model/`, `LensSession.ts` included)". Drop "group". If the phase's measured record matters, cite it as a phase artifact, not as an enforcement point.

### WR-03: ADR-QD-197 says `LensSession.ts` is the only file under the mutation glob

**File:** `spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md` ("The mutation record" bullet in Consequences)
**Issue:** The text reads "Only `LensSession.ts` is under the devtools mutation run's `mutate` glob". The glob is `packages/devtools/src/model/**/*.ts`, so every model file is under it.
- The intended claim is that, of the files this decision edits, only `LensSession.ts` is mutated.
- As written it is false and contradicts `stryker.devtools.mjs`.
- INV-QD-414's version ("The hook is in `src/react`, which the mutation gate ... does not mutate") is correct.

**Fix:** Reword to "Of the files this decision edits, only `LensSession.ts` is under the devtools mutation run's `mutate` glob (`packages/devtools/src/model/**/*.ts`)".

## Info

### IN-01: First line of the `useConfigured.ts` header is about 115 columns

**File:** `packages/devtools/src/react/useConfigured.ts:3`
**Issue:** The hand-wrap convention is about 90 columns (AGENTS.md section 17). The edited summary line is "Builds a value that has `configure` in a scope and configures it with the latest inputs before anything reads it." It also reads as if the scope has `configure`.
**Fix:** Wrap it, and say what the value carries, for example:

```
 * Builds a value that has `configure` in a scope, and configures it with the latest
 * inputs before anything reads it.
```

### IN-02: The `Configurable` doc says it is exported for the type test alone

**File:** `packages/devtools/src/react/useConfigured.ts:20-26`
**Issue:** The comment says "Exported for `useConfigured.tst.ts` alone". `useConfigured` is itself exported and its signature names `Configurable<I>`. Declaration emit needs the type to be exported (TS4xxx otherwise), so it would be exported even with no test.
**Fix:** "The constraint `useConfigured` asks of its value. Exported because the hook's signature names it; kept out of both barrels (AGENTS.md section 9)."

### IN-03: Stray trailing comma in the generic of a `.ts` file

**File:** `packages/devtools/src/react/useStopNotice.ts:16`
**Issue:** `<S,>` is the `.tsx` disambiguation idiom. In a `.ts` file it is noise, and a reader may wonder why it is there. `StoppedBox.tsx`, where it is needed, is the model for it.
**Fix:** `export const useStopNotice = <S>(status: S, onRestart: () => void): StopNoticeProps<S> => {`

---

_Reviewed: 2026-11-25T10:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
