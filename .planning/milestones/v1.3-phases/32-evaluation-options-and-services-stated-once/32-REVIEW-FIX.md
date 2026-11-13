---
phase: 32-evaluation-options-and-services-stated-once
fixed_at: 2026-11-12T00:00:00Z
review_path: .planning/phases/32-evaluation-options-and-services-stated-once/32-REVIEW.md
iteration: 1
findings_in_scope: 6
fixed: 2
skipped: 4
status: partial
---

# Phase 32: Code Review Fix Report

**Fixed at:** 2026-11-12
**Source review:** .planning/phases/32-evaluation-options-and-services-stated-once/32-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 6
- Fixed: 2
- Skipped: 4 (WR-02, IN-02, IN-03 by orchestrator decision; IN-04 no change needed)

`workflow.use_worktrees` is `false`, so edits and commits were made in the main checkout on `arch-wave-8`. Gates ran in the main checkout.

## Fixed Issues

### WR-01: `EvaluationServices.ts` header gives a cycle reason that is false for `Lifecycle.ts`

**Files modified:** `packages/core/src/EvaluationServices.ts`
**Commit:** 36972599
**Applied fix:** Reworded the module header. The one-line summary is unchanged. The paragraph now gives three reasons:
- Declaring the types in `Evaluate.ts` would make `Lifecycle.ts` import back, a cycle madge counts even for type-only edges (ADR-QD-037).
- Declaring them in `Lifecycle.ts` would put public types in a package-private module outside the barrel, which would force a re-export (ADR-QD-099).
- They are not in `Question.ts` because they read the port registry (`Ports.ts`) and `Question.ts` imports no evaluation code.

The `Question.ts` reason is stated as a design rule, not a cycle. I checked it: temporarily adding `import type { PortServices } from "./Ports.ts"` to `Question.ts` and running `pnpm circular` reported no cycle. The change was reverted with `git checkout --`. ADR ids sit in the paragraph after the summary line.

### IN-01: `decideQuestion` options pin compares the type to its own derivation

**Files modified:** `packages/core/test/Lifecycle.tst.ts`
**Commit:** 4d5d9258
**Applied fix:** Kept the existing `Omit` assertion. Added a second assertion in the same test that compares `Parameters<typeof decideQuestion>[1]` to the literal `{ readonly concurrency?: Concurrency; readonly evaluationId?: string } | undefined`, with `Concurrency` imported from `effect/Types`. I checked it is not vacuous by flipping `evaluationId` to `number`, which made the file fail, then restored it.
- `tstyche` on `Lifecycle.tst.ts`: 3 tests, 5 assertions, all pass (was 4 assertions).
- Full `pnpm test:tstyche`: 49 files, 246 tests, 502 assertions pass (was 501).

## Skipped Issues

### WR-02: New doc comments cite decision ids, against the phase's own rule

**File:** `packages/core/src/EvaluationServices.ts:6`, `packages/core/src/Lifecycle.ts:15-18`, `packages/core/test/Lifecycle.tst.ts:8`
**Reason:** No change. AGENTS.md's "Doc-comment shape" rule puts ADR citations in the paragraph(s) after the one-line summary, which is the established codebase style (see `Walk.ts`). The phase's "no plan or decision ids" rule means plan ids and discuss-phase `D-NN` ids, not ADR numbers.
**Check:** I confirmed that no ADR, CCR, INV or `D-NN` id sits on the first (summary) line of any doc comment in the phase's changed source files or in `Lifecycle.tst.ts` and `EvaluationShapes.tst.ts`. Nothing needed moving.
**Original issue:** The new headers name ADR-QD-037, ADR-QD-099 and ADR-QD-105 against the phase's "no decision ids" rule.

### IN-02: First `Lifecycle.tst.ts` test reads `QuestionOptions` from the module under check

**File:** `packages/core/test/Lifecycle.tst.ts:17-21`
**Reason:** `QuestionOptions`' literal key set is pinned independently, through the barrel, by `EvaluationShapes.tst.ts`. `Lifecycle.ts` is package-private, so `Lifecycle.tst.ts` must import src modules directly.
**Original issue:** `keyof EvaluateOptions` is checked against `keyof QuestionOptions | ...`, both from `Question.ts`, so a key added to `QuestionOptions` leaves it green.

### IN-03: Carried debt, not a defect of this phase

**File:** `packages/core/src/DecisionSink.ts:15`
**Reason:** Carried debt recorded in CCR-QD-423 for Phase 36.
**Original issue:** The comment "`Evaluate.ts` already documents a deliberate cardinality objection" and ADR-QD-081's historical wording are unrelated to these three types.

### IN-04: `evaluationId` doc was reworded, not moved verbatim

**File:** `packages/core/src/Question.ts:65-70`
**Reason:** No change needed. The reworded `evaluationId` doc is correct, and 32-02-SUMMARY already records the choice.
**Original issue:** D-01 says the comments move verbatim, but the "where the cache is read below" pointer was reworded.

## Verification

Run from the repo root in the main checkout, after both commits: `pnpm typecheck && pnpm lint && pnpm circular && pnpm test:tstyche`. All exited 0. No runtime code was touched, so vitest `--project core` was not run.

---

_Fixed: 2026-11-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
