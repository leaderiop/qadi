---
phase: QD-41-one-guarded-value-to-text-function
reviewed: 2026-11-14T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - packages/core/src/ValueText.ts
  - packages/core/src/Explanation.ts
  - packages/core/src/index.ts
  - packages/devtools/src/model/Remedies.ts
  - packages/devtools/src/model/Filters.ts
  - packages/devtools/src/model/SimulationForm.ts
  - packages/core/test/ValueText.test.ts
  - packages/core/test/NonJsonLiteral.test.ts
  - packages/core/test/Explanation.test.ts
  - packages/devtools/test/model/NonJsonWitness.test.ts
  - packages/devtools/test/model/ValueTextConsumers.test.ts
  - packages/devtools/test/model/Remedies.test.ts
  - .changeset/core-value-text.md
  - .changeset/devtools-remedy-label-without-json.md
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase QD-41: Code Review Report (iteration 2)

**Reviewed:** 2026-11-14
**Depth:** standard
**Files Reviewed:** 14
**Status:** clean

## Summary

Re-review after fix commit 781f08e4.

WR-01 is resolved. The label rule (bigint as digits and `n`, JSON text, the fixed words for an object with no text, `undefined` otherwise) now exists only in `valueLabel` (`packages/core/src/ValueText.ts`). Both `NO_JSON_FORM` copies are gone from `src`. The only remaining occurrences are test pins, which is intentional. `Explanation.refText`, the `Contains` arm and `Remedies.render` all read through `valueLabel`. `null` is handled correctly: `valueText(null)` is `"null"`, so it never reaches the object-words branch. `export * from "./ValueText.ts"` is in the barrel in alphabetical position.

WR-03 is resolved. In `matcherTextCases.In`, `valueText(m.values) ?? listText(m.values)`:
- A throwing `get` trap or a revoked proxy makes `valueText` return `undefined`.
- `listText`'s `values.map` then throws and is caught.
- The fallback is `valueLabel(values)`, which is total, so the result is the fixed words. Both cases are pinned in `ValueText.test.ts`.
- The pinned element-wise outputs (`[1n]`, `[1n,"a"]`, `[<words>]`) are preserved.
- The try/catch wraps only the walk, not evaluation, so it does not mask real faults.

No new defects were found in the fix.
- `Filters.ts` and `SimulationForm.ts` consume `valueText`, and their behaviour is unchanged (undefined contributes nothing, or is refused).
- The `SimulationForm` module doc was updated for its new core import.
- The changesets match the exported surface.

I ran the core suite (`ValueText`, `NonJsonLiteral`, `Explanation`: 114 passed) and the devtools `test/model` suite, and both passed.

Skipped items from iteration 1 (WR-02, IN-01, IN-03) were not re-raised. The fix did not make them worse.

All reviewed files meet quality standards. No issues found.

---

_Reviewed: 2026-11-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
