---
phase: 32-evaluation-options-and-services-stated-once
reviewed: 2026-11-12T14:35:00Z
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
  warning: 0
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase 32: Code Review Report

**Reviewed:** 2026-11-12T14:35:00Z
**Depth:** standard (iteration 2 re-review of the iteration 1 fixes)
**Files Reviewed:** 18
**Status:** clean

## Summary

Both iteration 1 fixes verified; no new defect introduced.

**WR-01 (commit 36972599), `EvaluationServices.ts` header.** Every claim checks against the import graph:
- `Evaluate.ts` imports `Lifecycle.ts` (`Evaluate.ts:15`), so declaring the types in `Evaluate.ts` would make `Lifecycle.ts` import back. A cycle, which madge counts even when type-only (ADR-QD-037).
- `Lifecycle.ts` is not re-exported from `index.ts`, so public types declared there would need a barrel re-export (ADR-QD-099).
- `Question.ts` imports only `Policy`, `Resource`, `AuthSubject` and `effect/Types` (`Question.ts:12-16`) and states "imports no evaluation code", so it cannot take `Ports.ts`-reading types.

The header keeps a one-line summary first, with the ADR citations in the paragraph after it. The module is still `import type` only. The earlier false "back edge" claim is gone.

**IN-01 (commit 4d5d9258), `Lifecycle.tst.ts` literal-remainder pin.** `{ readonly concurrency?: Concurrency; readonly evaluationId?: string }` matches `EvaluateOptions` in `Question.ts:46-92` exactly. `concurrency?: Concurrency` and `evaluationId?: string` both carry the same `readonly` and optional modifiers. The `Concurrency` import is `import type { Concurrency } from "effect/Types"`, the same specifier `Question.ts` uses. It sits in alphabetical position and is type-only, as `verbatimModuleSyntax` requires. The new test uses `.toBe`, which is strict, and does not duplicate the `Omit` assertion.

House rules hold for both commits: no `as`, `!`, `any`, `switch`, `Effect.fnUntraced` or async/await. `scripts/check-house-style.mjs` reports 466 files clean (3 declared switches).

Checks, run from the repo root with no source modified:
- `pnpm typecheck`: pass.
- `pnpm circular`: no circular dependency.
- `pnpm test:tstyche`: 49 files, 246 tests, 502 assertions, all passed.
- `vitest run --project core`: 64 files, 2155 tests, all passed.

## Accepted / carried (not counted in findings)

- WR-02: AGENTS.md's "Doc-comment shape" places ADR citations after the summary line, and no ADR id sits on a summary line.
- IN-02: covered by `EvaluationShapes.tst.ts` through the barrel.
- IN-03: carried debt for Phase 36.
- IN-04: correct as written.

---

_Reviewed: 2026-11-12T14:35:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
