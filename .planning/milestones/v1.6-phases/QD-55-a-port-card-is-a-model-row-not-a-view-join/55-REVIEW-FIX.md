---
phase: QD-55-a-port-card-is-a-model-row-not-a-view-join
fixed_at: 2026-11-18T19:00:00Z
review_path: .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase QD-55: Code Review Fix Report

**Fixed at:** 2026-11-18
**Source review:** .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1 (WR-01 only, by instruction; IN-01..03 left alone)
- Fixed: 1
- Skipped: 0

## Fixed Issues

### WR-01: `PortCards.tst.ts` per-port record pins credit a misspelling they cannot detect

**Files modified:** `packages/devtools/test/model/PortCards.tst.ts`
**Commit:** 6eb2522c
**Applied fix:**
- Kept both `keyof … toBe<PortName>` pins.
- Replaced the two `Omit<…> & { misspelt }` assertions with `not.toHaveProperty("AttributeResolvr")` and `not.toHaveProperty("SignatureHistry")`.
- Added `not.toBeAssignableFrom<Partial<ActivityByPort>>()` and its `CallsByPort` twin, so "every port present" is named.
- Retitled the test "the per-port records have exactly the registry's keys, all required" and commented each pair.

Note: the file's header doc comment and the "Pinned by" lines in INV-QD-355 / BEH-QD-611 still say the pin proves a misspelt port is a compile error. That remains true via the `keyof` pins, so no spec edit was made (out of scope).

## Proof that each new pin can fail

A scratch file `packages/devtools/test/model/ScratchProof.tst.ts` was placed beside the real test, because it must be inside the tsconfig's reach to import `@qadi/core`. It was deleted afterwards, and the commit contains only `PortCards.tst.ts`.

`pnpm exec tstyche packages/devtools/test/model/ScratchProof.tst.ts` gave `Tests: 3 failed, 3 total`, `Assertions: 3 failed`:
- `not.toHaveProperty("AttributeResolvr")` against `ActivityByPort & { AttributeResolvr: undefined }` failed (a misspelt extra key is caught).
- `keyof (that record) toBe<PortName>` failed (the `keyof` pin catches the misspelling too).
- `not.toBeAssignableFrom<Partial<Loose>>` against a record with every key optional failed (the `Partial` pin catches optionality).

## Verification

Run in the main checkout (`workflow.use_worktrees` is `false`, so no worktree was created), from the repo root:

`pnpm exec tstyche packages/devtools/test/model/PortCards.tst.ts < /dev/null` passed with 3 tests and 11 assertions (TypeScript 6.0.3, `./tsconfig.test.json`).

---

_Fixed: 2026-11-18_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
