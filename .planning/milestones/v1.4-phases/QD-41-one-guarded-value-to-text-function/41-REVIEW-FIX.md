---
phase: QD-41-one-guarded-value-to-text-function
fixed_at: 2026-11-14T00:00:00Z
review_path: .planning/phases/QD-41-one-guarded-value-to-text-function/41-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 3
skipped: 3
status: partial
---

# Phase QD-41: Code Review Fix Report

**Fixed at:** 2026-11-14
**Source review:** .planning/phases/QD-41-one-guarded-value-to-text-function/41-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 3 (one commit, 781f08e4)
- Skipped: 3 (orchestrator dispositions: no change)

Verification ran in the main checkout (`workflow.use_worktrees` is false): `pnpm typecheck`, `pnpm lint`, `pnpm circular`, `pnpm spec:api`, `pnpm spec:verify:strict`, `node scripts/spec-revise.mjs --check`, `vitest --project core` (2287 passed) and `--project devtools` (1437 passed) all green.

## Fixed Issues

### WR-01: The label rule is written twice, in core and in devtools

**Files modified:** `packages/core/src/ValueText.ts`, `packages/core/src/Explanation.ts`, `packages/devtools/src/model/Remedies.ts`, `packages/core/test/ValueText.test.ts`, `spec/overview.md`, `spec/decisions/154-one-value-to-text-function-exported-by-core.md`, `spec/behaviors/18-explanation.md`, `spec/behaviors/29-devtools-simulator.md`, `spec/README.md`, `.changeset/core-value-text.md`, `.changeset/devtools-remedy-label-without-json.md`
**Commit:** 781f08e4
**Applied fix:** New public `valueLabel(value: unknown): string` beside `valueText`, which declares the fixed words once. `Explanation.literalText` and both `NO_JSON_FORM` constants are gone. `explain` and `Remedies.render` (strings bare, else `valueLabel`) read through it. The label rule rows are one table in `ValueText.test.ts`. The spec row, ADR-QD-154 (Rev 1.1), BEH-QD-541 (Rev 1.21), BEH-QD-542 (Rev 1.9), the CCR-QD-432 row and both changesets are updated, with revisions bumped through `spec-revise.mjs --date 2026-11-14`. Every existing label pin passed unchanged.

### WR-03: The `In` fallback can still throw, and its text differs from the main path

**Files modified:** `packages/core/src/Explanation.ts`, `packages/core/test/ValueText.test.ts`
**Commit:** 781f08e4 (same commit as WR-01, since both change the same lines)
**Status:** fixed: requires human verification
**Applied fix:** A new `listText` keeps the pinned element-by-element output (`[1n]`, `[1n,"a"]`, `[<fixed words>]`). The walk sits in a `try`, and a list that cannot be walked becomes `valueLabel(list)`, the fixed words. Tests cover a revoked-proxy list and a list with a throwing `get` trap. The try/catch is not a catch-all around evaluation: `valueLabel` is total, so the walk itself is the only thing that can throw. A walk with no `try` is not possible, because `Array.isArray` and `.length` throw on a revoked proxy. The alternative, `valueLabel` on the whole list, would have changed three pinned outputs, so I kept element-wise. Say if you want the whole-list form.

### IN-02: Dead branch in `render`/`literalText` ordering invites misreading

**Files modified:** `packages/core/src/ValueText.ts`
**Commit:** 781f08e4
**Applied fix:** A one-line comment in `valueLabel` says `null` has text (`"null"`) and so never reaches the object words.

## Skipped Issues

### WR-02: A label D-07 requires unchanged was changed

**File:** `packages/core/src/Explanation.ts`, `packages/devtools/src/model/Remedies.ts`
**Reason:** skipped per orchestrator: no change. The one changed label (an object whose `toJSON` gives nothing, now the fixed words) was decided at plan time and recorded in ADR-QD-154 and BEH-QD-541. The project prefers the more correct label over byte compatibility.
**Original issue:** The label changed for a case that never threw, and the base-pinned tests were rewritten.

### IN-01: Two distinct non-JSON witnesses on one attribute are collapsed to one remedy

**File:** `packages/devtools/src/model/Remedies.ts`
**Reason:** skipped per orchestrator: no change. This is documented behaviour in BEH-QD-541.
**Original issue:** The second witness with no JSON form is dropped by the label dedupe.

### IN-03: `valueText` is a generic name in core's flat namespace

**File:** `packages/core/src/index.ts:59`
**Reason:** skipped per orchestrator: no change, deliberate (D-13). The `spec/overview.md` rows for `valueText` and the new `valueLabel` exist, and gate 13 passes.
**Original issue:** A generic export name leaks into the flat barrel.

---

_Fixed: 2026-11-14_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
