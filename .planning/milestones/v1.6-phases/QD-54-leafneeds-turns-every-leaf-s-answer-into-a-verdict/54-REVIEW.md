---
phase: QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict
reviewed: 2026-11-18T15:20:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - packages/core/src/LeafNeeds.ts
  - packages/core/src/Walk.ts
  - packages/core/src/Predicate.ts
  - packages/core/test/LeafNeeds.test.ts
  - packages/core/test/LeafNeeds.tst.ts
  - packages/core/test/LeafVerdict.test.ts
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
  necessity: 0
status: issues_found
---

# Phase QD-54: Code Review Report

**Reviewed:** 2026-11-18T15:20:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Reviewed the diff since `afdd8d9c` for the six files. Necessity was assessed against `necessity-review.md`'s criteria from the task context only (the reference file was not read); no necessity findings.

Checked and found sound:

- Every deny sentence in `Walk.ts` is byte-identical to the base. The acted polarity maps correctly: `Performed` (answer `Acted` to a `HasNotActed` leaf) gives "has already performed", and `NotPerformed` gives "has not performed". The relationship and signature sentences, including the optional signer-role suffix, are unchanged.
- An acted `Unknown` is `Held` under neither row, so both polarities deny in both interpreters.
- `isHeld(outcome)` is the single test both interpreters apply. `toPredicate` still folds only constants; `AskActed` now derives its polarity from `p.leaf._tag` through the row, so the removed `wanted` field leaves no dead state.
- `Record<...>` in `Walk.ts` resolves to the global type despite the `effect/Record` namespace import. `tsc` is clean.
- `LEAF_VERDICTS`, `isHeld` and the outcome types are not exported through the barrel, and `LeafNeeds.test.ts` pins that.
- Ran `vitest --project core` on `LeafNeeds.test.ts` and `LeafVerdict.test.ts` (36 tests pass) and `scripts/check-house-style.mjs` (clean, 3 declared switches). `tsc -p packages/core --noEmit` is clean.

No bugs or security defects found.

## Info

### IN-01: New lines exceed the hand-wrap width

**File:** `packages/core/src/Predicate.ts:391`
**Issue:** AGENTS.md §17 says the codebase wraps by hand at about 90 columns. Two of the new `cases` arms exceed it: the `HasRole` arm at 391 is 112 characters and the `HasPermission` arm directly below it is longer. The `LeafVerdict.test.ts` and `LeafNeeds.test.ts` additions have a few similar lines, for example `LeafNeeds.test.ts`'s `assert.strictEqual(LEAF_VERDICTS.HasResourceAttribute(res, value, context), want, ...)`. Formatting is not a merge gate, so this is cosmetic, but it departs from the file's own style.
**Fix:** Wrap the arms in the same shape as the neighbouring ones:

```ts
HasRole: (p) =>
  planned({ _tag: "Constant", value: isHeld(LEAF_VERDICTS.HasRole(p, subject)) }),
HasPermission: (p) =>
  planned({ _tag: "Constant", value: isHeld(LEAF_VERDICTS.HasPermission(p, subject)) }),
```

---

_Reviewed: 2026-11-18T15:20:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
