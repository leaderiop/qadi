---
phase: 21-port-request-derivation
fixed_at: 2026-11-11T00:00:00Z
review_path: .planning/phases/21-port-request-derivation/21-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 6
skipped: 0
status: all_fixed
---

# Phase 21: Code Review Fix Report

**Fixed at:** 2026-11-11
**Source review:** .planning/phases/21-port-request-derivation/21-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 6
- Skipped: 0

Phase 22 reworked the same modules after this review, so every finding was located by content. Each still applied.

## Fixed Issues

### WR-01: Absent and `undefined` optional members share a key; docs said otherwise

**Files modified:** `packages/core/src/PortDescription.ts`, `packages/core/src/SignatureHistory.ts`, `packages/core/test/PortDescription.test.ts`
**Commit:** f0977945
**Applied fix:** Reworded `PortDescription.key`, `signatureHistoryPort`'s doc and the `ARBITRARIES` comment to the real law: two requests share a key exactly when they ask the same wire question, and an absent optional member equals one stated `undefined`. Added a test pinning it (absent equals `meaning: undefined`, differs from `meaning: "approve"`). `spec/` already states the law correctly ("two requests share a key exactly when they ask the same question", "an absent member dropped" in INV-QD-286, BEH-QD-440, ADR-QD-133), so no spec edit or revision entry was needed.

### WR-02: A derived `key` could throw

**Files modified:** `packages/core/src/PortDerivation.ts`, `packages/core/test/PortDescription.test.ts`
**Commit:** 1d1b7a44, 7144dfba (the second adds a `depth: undefined` member the first commit's test fixture lacked, which failed `tsc -p tsconfig.test.json`)
**Status:** fixed: requires human verification
**Applied fix:** `makePortDescription`'s `key` now reads the question inside `Result.try` (`effect/Result`, checked against the v4 API and its existing use in `PortKey.ts`) and maps a throw to `KeyRefusal.Unreadable({ path: [], message })`, then flat-maps into `canonicalKey`. No `as`, no `!`. Added a test with a throwing getter on a `RelationshipCheck`, asserting an `Unreadable` refusal; it fails on the pre-fix code with the thrown `boom`. The devtools capture path was not edited, but its suite was run anyway.

### IN-01: The key law test was tautological

**Files modified:** `packages/core/test/PortDescription.test.ts`
**Commit:** 0dc2f228
**Applied fix:** Added one independent oracle per derived port: a hand-written expected question object for a fixed request, compared to `key` through `canonicalKey`. Also retitled the property test to say the schema encode adds nothing.

### IN-02: `portWire` no longer ties the encoded value to the question type

**Files modified:** `packages/core/src/PortWireEncode.ts`
**Commit:** 9d131cfa
**Applied fix:** One comment at the `encodeUnknownResult` call stating that the strict question schema is the check on `presentMembers`. `presentMembers` was not retyped, because a retype would need an `as`.

### IN-03: Duplicate "full" and "sparse" rows in the span test

**Files modified:** `packages/core/test/PortSpan.test.ts`
**Commit:** 44024836
**Applied fix:** `sparse` is optional in the `CASES` type, absent for `AttributeResolver` and `CustomPredicate`, and the loop skips it when absent.

### IN-04: Over-long lines

**Files modified:** `packages/core/src/SignatureHistory.ts`, `packages/core/src/PortDerivation.ts`
**Commit:** f9e9511c
**Applied fix:** Hand-wrapped `pairKey`'s declaration, the `onFailure` arm and the `encodeSpan` call.

## Verification

Run in the main checkout (`workflow.use_worktrees` is false), after the final edit:

- `pnpm typecheck`: pass
- `pnpm vitest run --project core`: 62 files, 2070 tests pass
- `pnpm vitest run --project devtools`: 43 files, 1160 tests pass
- `pnpm test:tstyche`: 218 tests pass
- `node scripts/check-house-style.mjs`: 446 files clean
- `node scripts/check-api-surface.mjs`: 900 exports documented
- `pnpm spec:verify:strict` and `pnpm spec:gates`: not run, `spec/` untouched

---

_Fixed: 2026-11-11_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
