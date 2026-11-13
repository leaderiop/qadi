---
phase: 30-one-strict-decode-module
fixed_at: 2026-11-12T06:41:00Z
review_path: .planning/phases/30-one-strict-decode-module/30-REVIEW.md
iteration: 3
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 30: Code Review Fix Report

**Fixed at:** 2026-11-12
**Source review:** .planning/phases/30-one-strict-decode-module/30-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 2
- Fixed: 2
- Skipped: 0

Edits and commits ran in the main checkout (`workflow.use_worktrees` is `false`), on `arch-wave-8`. Stryker and `pnpm check:pr` ran there too.

## Fixed Issues

### WR-01: `DecodeDepthGuard.ts` mutation score fell from 94.74 to 92.59 (WX-05)

**Files modified:** `packages/core/src/DecodeDepthGuard.ts`
**Commit:** 2845d7ba
**Applied fix:** Replaced `while (stack.length > 0) { const frame = stack.pop(); if (frame === undefined) break; … }` with `for (let frame = stack.pop(); frame !== undefined; frame = stack.pop())`. The head is both the loop test and the `noUncheckedIndexedAccess` narrowing, so the two equivalent mutants are gone. No `as`, no `!`. Stryker (`pnpm exec stryker run --mutate packages/core/src/DecodeDepthGuard.ts`): 100.00 (23 killed, 0 survived), against the 0.9474 baseline. No baseline change and no new test needed.

### IN-01: `UntrustedDecode.ts`'s constant `"not JSON"` arm, and a thin mutation margin

**Files modified:** `packages/core/src/UntrustedDecode.ts`, `packages/core/test/UntrustedDecode.test.ts`
**Commit:** a460ebae
**Applied fix:** Took the margin option. Added a test that stubs `JSON.parse` to throw the non-Error `"boom"` once, restores the spy in `finally`, and asserts `decodeText("{}")` is `NotJson` with message `"not JSON"`. Reworded the comment from "cannot be reached" to say the arm is defensive. Stryker on `UntrustedDecode.ts`: 90.32 to 93.55 (29 killed, 2 survived). The two survivors are the equivalent line-179 `unwalked.size > 0` fast-path mutants noted in the review. Status: fixed. It removes code-adjacent branching only in comment and test, and no logic changed.

## Verification

Run in the main checkout, not an isolated worktree, so the numbers are reproducible from the tree.

`pnpm check:pr < /dev/null` finished green: 16 of 17 steps ran. Typecheck, lint, circular, tstyche, coverage (182 files, 4706 tests passed), BDD (568 passed), spec gates and the website build all passed. Final lines, verbatim:

```
[run-check 16/16] pnpm spec:publish

> qadi-monorepo@0.4.0 spec:publish /Users/mohammadalmechkor/Projects/Perso/qadi
> node scripts/check-publish-status.mjs

publish-status: 9 package(s) and 6 document(s) agree on version (0.11.0)

run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).
```

---

_Fixed: 2026-11-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
