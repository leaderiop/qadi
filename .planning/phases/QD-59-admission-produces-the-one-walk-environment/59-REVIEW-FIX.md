---
phase: QD-59-admission-produces-the-one-walk-environment
fixed_at: 2026-11-19T07:05:00Z
review_path: .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-REVIEW.md
iteration: 2
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 59: Code Review Fix Report

**Fixed at:** 2026-11-19T07:05:00Z
**Source review:** .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

All three are in one commit, `1ac8bccc`, as the orchestrator asked. Edits ran in the main checkout, because `workflow.use_worktrees` is `false`.

## Fixed Issues

### WR-01: `admit`'s generic overload asserted `Supplied<true>` without checking it

**Files modified:** `packages/core/src/Admission.ts`, `spec/decisions/172-admission-produces-the-one-walk-environment.md`
**Commit:** 1ac8bccc
**Applied fix:** Changes to `Admission.ts`:
- Replaced `RESOURCE_SUPPLIED` and the overload with one table, `SUPPLIED: { [Source in RowSource]: (question) => SuppliedBy[Source] }`.
  - `asked` returns `{ action: question.action !== undefined, resource: question.resource !== undefined }`.
  - `row` returns `{ action: question.action !== undefined, resource: true }`.
- `admit` is now a single generic `const` arrow, `<Source extends RowSource>(…) => Result<Admitted<Source>, PolicyTooDeep>`. There is no overload and no wider implementation signature, and the body typechecks directly.

Changes to ADR-QD-172, still Rev 1.0:
- Decision 3 names `SUPPLIED`, says each row is checked against its type (TS2322 otherwise), and says `admit` has no overload.
- The "`"row"` overload" line in the Alternatives section now says an overload over a wider implementation is the same cast (ADR-QD-160 R7).
- The Consequences bullet names `SUPPLIED`.
- The bench note said the after-run measured the final code with a `RESOURCE_SUPPLIED` table. That is no longer exact. It now says the after-run measured the iteration-1 code, and that the merge into `SUPPLIED` is the same single lookup and was not re-benched, as instructed.

**Type check proved to bite:** Only in a scratch edit, not committed. I changed `row`'s `resource: true` to `resource: false` and ran `pnpm -s typecheck`. It failed with `packages/core/src/Admission.ts(64,64): error TS2322: Type 'false' is not assignable to type 'true'.` I then restored the file from a backup, confirmed `resource: true` was back, and re-ran typecheck clean.

**Status:** fixed: requires human verification. This is a type-level change, so the syntax checks do not show that the types mean what was intended. The TS2322 probe and the tstyche pins in `WalkEnvironment.tst.ts` (which are unchanged and pass) are the evidence.

### IN-01: stale "threaded as a parameter" comment in `Evaluate.test.ts`

**Files modified:** `packages/core/test/Evaluate.test.ts`
**Commit:** 1ac8bccc
**Applied fix:** Reworded the comment at lines 1448-1451 so it says `matcherContext` is built once by `admit` and read from the walk environment (`request.admitted`) at every node. Comment lines only.

### IN-02: module doc and tstyche title listed four parts of the environment, not six

**Files modified:** `packages/core/src/Admission.ts`, `packages/core/test/WalkEnvironment.tst.ts`
**Commit:** 1ac8bccc
**Applied fix:**
- The `Admission.ts` module doc now reads "the row source, the policy it admitted, the subject, what the request supplied, what its matchers see and the depth bound".
- The tstyche test title is now "the environment holds its row source, the admitted policy, the subject, what was supplied, the matcher context and the bound".

## Verification

Every command ran in the main checkout (the repo root), not an isolated worktree, so the numbers are reproducible from the tree.

- `pnpm -s typecheck`: clean.
- `pnpm exec vitest run --project core < /dev/null`: 82 files, 2645 tests passed.
- `pnpm test:tstyche`: 64 files, 332 tests, 715 assertions passed.
- `node scripts/check-house-style.mjs`: 560 files clean, 3 declared switches.
- `node scripts/check-dod-table.mjs`: 25 steps match `pnpm check`, 144 references resolve.
- `node scripts/spec-revise.mjs --check`: passed.
- `pnpm -s spec:api` (`scripts/check-api-surface.mjs`, gate 13): 933 exports, unchanged.

Not run, per instructions: Stryker, the bench, and `check:pr`.

`.planning/config.json` and the untracked `59-scan.mjs` change were not staged. Both were already modified before this run.

---

_Fixed: 2026-11-19T07:05:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
