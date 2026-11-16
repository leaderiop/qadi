---
phase: QD-51-policy-tag-arity-stated-once
reviewed: 2026-11-16T18:00:00Z
depth: standard
iteration: 3
files_reviewed: 19
files_reviewed_list:
  - .changeset/policy-arity-stated-once.md
  - packages/core/src/Decision.ts
  - packages/core/src/Policy.ts
  - packages/core/src/PolicyArity.ts
  - packages/core/test/Decision.test.ts
  - packages/core/test/PolicyArity.test.ts
  - packages/core/test/PolicyArity.tst.ts
  - packages/core/test/TraceShape.test.ts
  - spec/README.md
  - spec/behaviors/18-explanation.md
  - spec/behaviors/25-inspection.md
  - spec/decisions/164-policy-tag-arity-is-stated-once.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/traceability.md
  - .planning/phases/QD-51-policy-tag-arity-stated-once/51-SECURITY.md
  - .planning/phases/QD-51-policy-tag-arity-stated-once/tools/mutation.mjs
  - .planning/phases/QD-51-policy-tag-arity-stated-once/tools/proofs.mjs
  - .planning/phases/QD-51-policy-tag-arity-stated-once/tools/scan.mjs
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase QD-51: Code Review Report

**Reviewed:** 2026-11-16T18:00:00Z
**Depth:** standard
**Iteration:** 3 of 3
**Files Reviewed:** 19
**Status:** clean

## Summary

Every iteration-2 fix is correct and complete, and the final pass over the phase's whole non-planning diff (`8d87d837..HEAD`) found no defect, so nothing is raised. `necessity` was not assessed beyond the new per-arity table, which has no impossible-state guard.

Verified against source rather than prose:

- **WR-01 (T-51-09).** `51-SECURITY.md` now describes the mechanism that exists. I probed `foldTrace` on a hand-built node with `Bogus`, `toString`, `__proto__` and `hasOwnProperty`. Each throws `TypeError: traceChildrenByArity[traceShapeOf(...)] is not a function`. The stack is `traceChildrenOf` called from `TreeFold.ts`'s `open`, so the throw precedes any child arm. The row's list of four pinned names (`Bogus`, `constructor`, `toString`, `__proto__`) matches `PolicyArity.test.ts`. The inherited-member read cannot land on a real row, because no `Object.prototype` value stringifies to `Leaf`, `Wrapper` or `Many`.
- **WR-02 (`proofs.mjs`).** A `compiles:` row passes only when the named file exists and vitest wrote a JSON report. That report must list the file under its resolved absolute path, with at least one `failed` assertion in it. I ran vitest with the same flags (`--project core --reporter=json --outputFile=...`) on `PolicyArity.test.ts`. The report shape (`testResults[].name` absolute, `assertionResults[].status`, `numFailedTests`) is what the script reads. A missing path, a crash or a collection error each fail the row with their own message. I did not run the script, because it rewrites `packages/core/src`.
- **IN-01 (foreign-tag `TypeError`).** The statement now agrees in BEH-QD-593, ADR-QD-164 (1.4), the changeset, the `traceChildrenOf` doc comment and the test comment. The test asserts a throw and that no child arm ran, not the class. I checked that a `?? "Many"` fallback would make the HasRole arm run first and fail `ran === 0`, so the stated guard is real.
- **IN-02 (`Array.of(a, b)`).** `PolicyArity.tst.ts` pins the accepted `Array.of(a, b)` against the refused literal `[a, b]`, with the message fragment `is not assignable to type 'never'`. `tstyche` reports 15 of 15 passed, 4 suppressed errors matched.
- **IN-03 (INV-QD-348, CCR-QD-442).** INV-QD-348's enforcement line now says that `Decision.test.ts`'s `foldTrace` tests are untouched and one guard test was added. The CCR-QD-442 row lists `Decision.test.ts`.

Final pass:

- `node_modules/.bin/tsc -p tsconfig.test.json` is clean.
- `vitest --project core` on `PolicyArity`, `TraceShape` and `Decision` passes (89 tests).
- `pnpm lint` (oxlint plus `check-house-style.mjs`: 539 files clean, 3 declared switches) passes.
- `pnpm circular` finds no cycle.
- `pnpm spec:gates` and `pnpm spec:verify:strict` pass (25 DoD steps; 21 of 21 traceability checks, revision headers agreeing with history).
- `PolicyArity.ts` imports nothing and is not re-exported by the barrel.
- Nothing in `packages/*/src` outside `PolicyArity.ts` restates an arity.
- `childrenOf`'s `satisfies ChildArms<Policy, typeof POLICY_ARITY>`, the derived `LeafPolicy` and the `traceChildrenByArity` table are consistent with the tstyche pins.

Not checked: Stryker and the post-fix mutation scores, which the orchestrator accepted as out of scope, and the full `pnpm check` (coverage, BDD, website, package install).

---

_Reviewed: 2026-11-16T18:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
