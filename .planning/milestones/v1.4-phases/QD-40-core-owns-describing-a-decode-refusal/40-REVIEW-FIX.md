---
phase: QD-40-core-owns-describing-a-decode-refusal
fixed_at: 2026-11-14T15:00:00Z
review_path: .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-REVIEW.md
iteration: 2
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 40: Code Review Fix Report

**Fixed at:** 2026-11-14T15:00:00Z
**Source review:** .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 1
- Fixed: 1
- Skipped: 0

## Fixed Issues

### IN-01: `thrownName` is undocumented and reads a foreign value without hardening

**Files modified:** `packages/devtools/src/model/Source.ts`, `packages/devtools/test/model/Source.test.ts`
**Commit:** 0c4f5545
**Applied fix:** `thrownName` now has a one-line doc comment and is total. The body is wrapped in `try`/`catch`, so a revoked `Proxy` (where `instanceof` throws) or a throwing `name` getter yields `"unknown"`. A non-string `name` falls back to `typeof thrown`. It still returns only a name or a type, never a message. Three table-driven tests in `Source.test.ts` cover a revoked proxy, a throwing `name` getter, and a non-string `name`. Each asserts that the next good record is still delivered, that exactly one log line is written, that `qadi.thrown` is `"unknown"` or `"object"`, and that the sender-like text is absent from the log. No `as`, `!`, `any`, `switch` or `Record<string, unknown>` was used. Not a logic-class finding, though the catch-all return value is a judgment call.

## Verification

- Ran in the main checkout (`workflow.use_worktrees` is `false`, so no worktree was created).
- `pnpm exec vitest run --project devtools packages/devtools/test/model/Source.test.ts`: 44 passed.
- `pnpm typecheck`: pass.
- `pnpm lint`: exit 0 (existing warnings only, none in the touched files).
- `pnpm run build`: pass.
- Stryker was not run; each new branch (`catch`, the `typeof name === "string"` guard, both ternary arms) has a test that fails if the branch is removed.

**Commit trailer used:** `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (not the Opus 5.5 line, because that is not this model).

---

_Fixed: 2026-11-14T15:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
