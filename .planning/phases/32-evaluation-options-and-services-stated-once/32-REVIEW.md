---
phase: 32-evaluation-options-and-services-stated-once
reviewed: 2026-11-12T14:30:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - .changeset/evaluation-options-stated-once.md
  - packages/core/src/Evaluate.ts
  - packages/core/src/EvaluationServices.ts
  - packages/core/src/EvaluationServicesNone.ts
  - packages/core/src/GuardHealthCheck.ts
  - packages/core/src/Lifecycle.ts
  - packages/core/src/Qadi.ts
  - packages/core/src/Question.ts
  - packages/core/src/SubjectSet.ts
  - packages/core/src/index.ts
  - packages/core/test/DecisionSink.tst.ts
  - packages/core/test/Errors.tst.ts
  - packages/core/test/EvaluationShapes.tst.ts
  - packages/core/test/Lifecycle.tst.ts
  - packages/core/test/Ports.tst.ts
  - packages/core/test/Qadi.tst.ts
  - packages/core/test/Question.test.ts
  - packages/core/test/helpers.ts
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
  necessity: 0
status: issues_found
---

# Phase 32: Code Review Report

**Reviewed:** 2026-11-12T14:30:00Z
**Depth:** standard
**Files Reviewed:** 18
**Status:** issues_found

## Summary

The move is faithful. I diffed every changed file against the base (4a534545).

- **Shapes:** `EvaluateOptions` keeps `extends QuestionOptions`, `concurrency?: Concurrency` and `evaluationId?: string`, both readonly and optional. The doc text is verbatim except one deliberate edit (see IN-04).
- **Service sets:** `EvaluationServices` and `StandingEvaluationServices` are character-identical to the base.
- **Imports:** every moved-type import is `import type` with a `.ts` extension, and no importer still reads these types from `Evaluate.ts`.
- **Barrel:** the `EvaluationServices.ts` line sits correctly between `EvaluationMetrics.ts` and `EvaluationServicesNone.ts`.
- **House rules:** no `as`, `!`, `any`, `switch`, `fnUntraced` or async.

Gates run from the repo root, all green:

- `pnpm circular`: no circular dependency.
- `pnpm lint`: house-style clean, with only warnings in files outside this phase.
- `pnpm test:tstyche`: 49 files and 501 assertions pass.
- `pnpm typecheck`: passes.
- vitest `--project core` on `Question.test.ts`: 10 tests pass.

No pin is vacuous in a way that lets a shape change through. `EvaluationShapes.tst.ts` imports only from the barrel and spells out literal shapes. The remaining findings are one inaccurate new comment, a decision-id convention question and weaker-than-claimed Lifecycle pins.

## Warnings

### WR-01: `EvaluationServices.ts` header gives a cycle reason that is false for `Lifecycle.ts`

**File:** `packages/core/src/EvaluationServices.ts:3-5`
**Issue:** The header says "`Evaluate.ts` and `Lifecycle.ts` both name these, and `Evaluate.ts` imports `Lifecycle.ts`, so declaring them in either would make the other import back". That holds only for `Evaluate.ts`. `Evaluate.ts` already imports `Lifecycle.ts`, so declaring the types in `Lifecycle.ts` adds no back edge. The real reason `Lifecycle.ts` cannot host them is that it is package-private and out of the barrel (ADR-QD-099), while these types are public. The comment is new in this phase, so it misdirects the next reader, who will find the stated cycle argument does not reproduce.
**Fix:** State the accurate reason, for example: "Declaring them in `Evaluate.ts` would make `Lifecycle.ts` import back (madge counts a type-only edge); `Lifecycle.ts` is out of the barrel, so it cannot host public types."

### WR-02: New doc comments cite decision ids, against the phase's own rule

**File:** `packages/core/src/EvaluationServices.ts:6`, `packages/core/src/Lifecycle.ts:15-18`, `packages/core/test/Lifecycle.tst.ts:8`
**Issue:** The phase rule (CONTEXT, Claude's Discretion) is "no plan or decision ids in doc comments". Newly written text names ADR-QD-037 in `EvaluationServices.ts`'s header and ADR-QD-099 plus ADR-QD-037 in `Lifecycle.ts`'s header. It names ADR-QD-037 and ADR-QD-105 in `Lifecycle.tst.ts`'s header. The base text it replaced already cited ADR-QD-037, and the surrounding code cites ids widely. If the rule applies to rewritten comments, they now violate it. If the codebase convention is that ids are acceptable, the phase rule is wrong and should be dropped. Either way the two disagree.
**Fix:** Either drop the ids from these three new or rewritten headers and keep the one-line "why", or record that ids are allowed when they explain a structural constraint.

## Info

### IN-01: `decideQuestion` options pin compares the type to its own derivation

**File:** `packages/core/test/Lifecycle.tst.ts:25-29`
**Issue:** The test asserts `Parameters<typeof decideQuestion>[1]` equals `Omit<EvaluateOptions, keyof QuestionOptions> | undefined`, the same expression the source uses. It does fail if the source stops deriving or widens, so it is not vacuous. It never states the remainder, so D-11's "exactly that remainder" rests on the neighbouring `keyof` test plus `EvaluationShapes.tst.ts`.
**Fix:** Compare against the literal remainder: `{ readonly concurrency?: Concurrency; readonly evaluationId?: string } | undefined`.

### IN-02: First `Lifecycle.tst.ts` test reads `QuestionOptions` from the module under check

**File:** `packages/core/test/Lifecycle.tst.ts:17-21`
**Issue:** `keyof EvaluateOptions` is checked against `keyof QuestionOptions | ...`, both from `Question.ts`. A key added to `QuestionOptions` leaves it green. `EvaluationShapes.tst.ts` closes the gap by pinning the literal five-key set, so the result is covered, only redundantly and not independently.
**Fix:** None required. Optionally note in the header that the full key set is pinned in `EvaluationShapes.tst.ts`.

### IN-03: Carried debt, not a defect of this phase

**File:** `packages/core/src/DecisionSink.ts:15`
**Issue:** The comment "`Evaluate.ts` already documents a deliberate cardinality objection" is unrelated to these three types and was left alone. ADR-QD-081's historical wording is also carried. Both are already recorded for Phase 36.
**Fix:** None here.

### IN-04: `evaluationId` doc was reworded, not moved verbatim

**File:** `packages/core/src/Question.ts:65-70`
**Issue:** D-01 says the comments move verbatim. The base text said "where the cache is read below", which no longer resolves in `Question.ts`. It now reads "where `decideQuestion` reads the cache (`Lifecycle.ts`)". The edit is correct and necessary, and the comment it points at exists in `Lifecycle.ts`. The one-line summary rule still holds, and I am recording only the deviation from "verbatim".
**Fix:** None. Mention it in the SUMMARY if not already there.

---

_Reviewed: 2026-11-12T14:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
