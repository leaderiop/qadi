---
phase: QD-59-admission-produces-the-one-walk-environment
fixed_at: 2026-11-19T06:50:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-59-admission-produces-the-one-walk-environment/59-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 59: Code Review Fix Report

**Fixed at:** 2026-11-19
**Source review:** 59-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (WR-01, WR-02, IN-01, IN-02)
- Fixed: 4
- Skipped: 0

All four fall out of the same edits to `Admitted`, so they share one commit, `4da12142`. WR-01 and WR-02 are design (logic) fixes: **fixed: requires human verification**.

**Verification ran in the main checkout** (`workflow.use_worktrees` is false), so the numbers are reproducible from the tree you are looking at: `pnpm -s typecheck` clean; `pnpm exec vitest run --project core` 82 files, 2645 tests passed; `pnpm test:tstyche` 64 files, 332 tests passed; `check-house-style.mjs`, `check-dod-table.mjs`, `spec-revise.mjs --check` clean; `spec:api` 933. Stryker, bench and check:pr were not run (the orchestrator re-runs mutation and check:pr).

## Fixed Issues

### WR-01: A row-sourced environment typechecks as a walk environment

**Files modified:** `packages/core/src/Admission.ts`, `packages/core/src/Walk.ts`, `packages/core/test/WalkDepthGuard.test.ts`
**Commit:** 4da12142
**Applied fix:** `Admitted<Source extends RowSource = RowSource>` replaces `Admitted<Resource extends boolean>`. `supplied` is `SuppliedBy[Source]`, a closed two-key interface (`asked: Supplied`, `row: Supplied<true>`), so there is no `as` and no conditional. `Admitted` also stores `readonly source: Source`. Without that field `Admitted<"row">` would still be assignable to `Admitted<"asked">`, because `Supplied<true>` is assignable to `Supplied`, so the discriminating field is what makes the types disjoint. `admit` is now one generic overload, `admit<Source extends RowSource>(q, rowSource: Source): Result<Admitted<Source>, …>`, over a `RowSource` implementation signature; the two earlier overloads collapsed. `Walk.ts`'s `Evaluation.admitted` is `Admitted<"asked">`, and `WalkDepthGuard.test.ts` builds its environment with `"asked"`. `resource ?? NO_RESOURCE` is untouched, as instructed.

### WR-02: `Admitted` no longer binds the policy it admitted

**Files modified:** `packages/core/src/Admission.ts`, `packages/core/src/Walk.ts`, `packages/core/src/Predicate.ts`
**Commit:** 4da12142
**Applied fix:** `Admitted` gained `readonly policy: Policy`, set by `admit` from `question.policy`. `walk` starts from `admitted.success.policy`. `compileTree` is now `compileTree(admitted: Admitted<"row">)` and folds `admitted.policy`, so the separate `policy` parameter beside the proof is gone. `toPredicate` calls `compileTree(admitted.success)`. Recursive child calls still pass the child node. The `Predicate.ts` doc comment now says the proof carries the policy it admitted and that `compileTree` walks that one. No brand was added, as instructed.

### IN-01: Unreachable `throw` in the `WalkDepthGuard.test.ts` helper

**Files modified:** `packages/core/test/WalkDepthGuard.test.ts`
**Commit:** 4da12142
**Applied fix:** The assert-then-throw pair became `Result.getOrThrow(admit(...))`. One failure path, no dead branch.

### IN-02: Tautological tstyche pin; no pin on the accepted row source

**Files modified:** `packages/core/test/WalkEnvironment.tst.ts`
**Commit:** 4da12142
**Applied fix:**
- `Environment["admitted"]` is pinned to `Admitted<"asked">`, which names the accepted row source and no longer compares the middle tuple slot with itself.
- The `keyof Admitted` pin now lists `source` and `policy`.
- A new test asserts `Admitted<"row">` is not assignable to `Environment["admitted"]` (so `evaluateNode` refuses it), and the reverse for `Admitted<"asked">` to `Admitted<"row">`.
- It also pins `supplied.resource` as `true` or `boolean` per source, and `admit`'s return type per source.
- `compileTree` is module-private, so it has no direct negative. The `"asked"` to `"row"` non-assignability pin covers its parameter type.

## Other edits

- **ADR-QD-172, Decision item 3 (D-13), stays at Rev 1.0.** It is rewritten for the new type: the row source is in the type, so a `"row"` environment cannot reach the walk, and the environment carries the admitted policy. The old text described `Admitted<Resource extends boolean>` and the two overloads, which are no longer true.
- **Stale `Admitted<true>` references.** One in `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` (line 294) and one in `spec/behaviors/16-predicates.md` (line 424) became `Admitted<"row">`. They would otherwise have contradicted the code.

## Not done

- No Stryker, bench or `check:pr` run. The orchestrator re-runs mutation, so the `Admission.ts`, `Predicate.ts` and `Walk.ts` mutation numbers in ADR-QD-172's `## Mutation` table are likely stale: `Admission.ts` gained a `source` argument, `Predicate.ts` and `Walk.ts` changed call lines.
- `.planning/config.json` has a pre-existing uncommitted modification and was not staged.

---

_Fixed: 2026-11-19_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
