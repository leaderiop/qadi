---
phase: 30-one-strict-decode-module
fixed_at: 2026-11-12T00:00:00Z
review_path: .planning/phases/30-one-strict-decode-module/30-REVIEW.md
iteration: 2
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 30: Code Review Fix Report

**Fixed at:** 2026-11-12
**Source review:** .planning/phases/30-one-strict-decode-module/30-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

Edited and committed in the main checkout (`workflow.use_worktrees` is `false`); no worktree was created. Gates ran in the main checkout.

## Fixed Issues

### IN-02: Byte-identical `isPlainObject` still lives in `FieldPath.ts`

**Files modified:** `packages/core/src/JsonShape.ts` (new), `packages/core/src/DecodeDepthGuard.ts`, `packages/core/src/FieldPath.ts`, `packages/core/src/SinkCodec.ts`, `packages/core/src/UntrustedDecode.ts`, `spec/decisions/143-untrusted-json-is-decoded-through-one-module.md`
**Commit:** 1358a661
**Applied fix:** `isPlainObject` now lives once in a new import-free, package-private leaf `JsonShape.ts` (not in the barrel). `DecodeDepthGuard.ts`, `UntrustedDecode.ts`, `SinkCodec.ts` and `FieldPath.ts` import it; `FieldPath.ts`'s copy is deleted. `DecodeDepthGuard.ts` is the depth walk only again, so its header and the `[untrusted-decode]` budget comment are accurate unchanged. `JsonHazard.ts`'s differently-behaving predicate is untouched. ADR-QD-143's import list for the decode leaf is corrected (rev 1.1 to 1.2 via `spec-revise.mjs`, dated 2026-11-12). No budget row or overview entry changes: no declaration moved out of a budgeted file, and `JsonShape.ts` exports nothing the barrel gate lists.

### IN-01: `decodeText`'s `String(error)` fallback is unreachable (necessity)

**Files modified:** `packages/core/src/UntrustedDecode.ts`
**Commit:** 4aa9b56d
**Status:** fixed: requires human verification
**Applied fix:** No cast-free form drops the narrowing (a `catch` binding is `unknown`). It is now `Predicate.isError(error) ? error.message : "not JSON"` with a comment that the constant arm exists for typing only, since `JSON.parse` throws only a `SyntaxError`. A constant fallback can no longer reintroduce the `SyntaxError: ` prefix that WR-01 removed. The unreachable arm adds one unkillable (no-coverage) mutant, the string literal.

## Verification

- `pnpm check:pr`: passed 16 of 17 steps (mutation is skipped on non-release PRs); `PASS: 21   FAIL: 0   SKIP: 0`; last lines: `publish-status: 9 package(s) and 6 document(s) agree on version (0.11.0)` and `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).`
- Stryker on the touched core files: `UntrustedDecode.ts` 90.32 (2 survivors, 1 no-cov), `JsonShape.ts` 100.00, `SinkCodec.ts` 96.34 (base 92.78), `DecodeDepthGuard.ts` 92.59 (base 94.74), `FieldPath.ts` 93.48.

---

_Fixed: 2026-11-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
