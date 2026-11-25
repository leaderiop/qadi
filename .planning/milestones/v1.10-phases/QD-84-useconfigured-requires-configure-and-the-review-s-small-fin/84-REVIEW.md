---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
reviewed: 2026-11-25T10:40:00Z
depth: standard
iteration: 3
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
  warning: 0
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase QD-84: Code Review Report (iteration 3)

**Reviewed:** 2026-11-25T10:40:00Z
**Depth:** standard
**Files Reviewed:** 25
**Status:** clean

## Summary

Iteration 3 is scoped to the fixes in commit `98d8a1d8` for iteration 2's IN-01 (header) and IN-02 (property-versus-method pin). Both were verified against source and by running the checks. Nothing the commit changed is wrong, and the fix introduced no defect. The remaining files were reviewed in iterations 1 and 2 and are unchanged by this commit. Its only code change is `useConfigured.tst.ts`; the rest is spec text.

**Fourth refusal fails for the reason its fragment names.**
- `useConfigured(() => Effect.succeed(configurable), wideInputs)` has `I = number | string` and `A = { x: number; configure: (inputs: number) => void }`.
- `A` does not satisfy `Configurable<number | string>`, because the property `configure` is checked contravariantly under `strictFunctionTypes`. The resulting message chain contains "Types of parameters 'inputs' and 'inputs' are incompatible", which is the fragment after the directive.
- `node scripts/run-tstyche.mjs packages/devtools/test/react/useConfigured.tst.ts` passes both passes (`floatingEffect` off, then on). Each pass reports `Suppressed: 4 matched` and 6 of 6 tests.

**The twin differs only in the argument under test.**
- The refused call and the twin use the same build thunk and the same `configurable`.
- Only the inputs change, from `wideInputs: number | string` to `narrowInputs: number`.
- Both are `declare const`, so no narrowing or literal widening can change what `I` is inferred as.

**A method-signature `Configurable` would accept the refused call.**
- I reproduced this in a standalone `tsc --strict` scratch file with a property-form and a method-form constraint, using the same shapes.
- The property form refuses `wide`.
- The method form accepts it and also accepts `narrow`.
- The source's own `configure` being a function property does not matter, because TypeScript picks strict or bivariant checking from the target signature's declaration kind.
- `84-RED-EVIDENCE.md` independently records this test failing with TS2578 when the member was changed to a method signature, and only this test, so the other three still refuse under the method form.

**The same scratch file supports "the first three are refused in either form".**
- A value with no `configure` gives TS2741 under both forms.
- A weak-type mismatch gives "has no properties in common" under both forms.
- A `{ source: 1 }` mismatch gives the ordinary type error under both forms.

**Spec text states each refusal exactly.**
- BEH-QD-756 (revision 1.80), ADR-QD-197 decision 1 (revision 1.4) and the `useConfigured.tst.ts` row of `spec/traceability.md` (revision 1.329) all list four refusals: no `configure`; another value's inputs; a source that is a number; narrower `configure` inputs.
- All three attribute the weak-type message ("has no properties in common") to the second refusal, and the ordinary mismatch to the first and third.
- All three say only the fourth is refused by the property form alone.
- The BEH-QD-756 "Pinned by" list names the fourth test by its exact title.
- No stale "three refusals" wording remains outside change history. I grepped `spec`, `.changeset` and `packages/devtools`.
- The header of `useConfigured.tst.ts` matches the four pins.

**Gates run, all green:**
- `scripts/check-house-style.mjs` (617 files clean, 78 type-test files)
- `spec/scripts/verify-traceability.sh --strict` (21 pass, 0 fail; revision equals the newest history entry)
- `scripts/check-dod-table.mjs`
- `scripts/check-devtools-claims.mjs`
- `scripts/check-doc-examples.mjs` (119 blocks compile)

All reviewed files meet quality standards. No issues found.

---

_Reviewed: 2026-11-25T10:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
