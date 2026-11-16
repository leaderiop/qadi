---
phase: QD-51-policy-tag-arity-stated-once
fixed_at: 2026-11-16T16:55:47Z
review_path: .planning/phases/QD-51-policy-tag-arity-stated-once/51-REVIEW.md
iteration: 2
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 51: Code Review Fix Report

**Fixed at:** 2026-11-16T16:55:47Z
**Source review:** .planning/phases/QD-51-policy-tag-arity-stated-once/51-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 5 (WR-01, WR-02, IN-01 to IN-03, `--all`)
- Fixed: 5
- Skipped: 0

Each finding has its own commit, and the tree is green at every commit.

The work ran in the main checkout. `workflow.use_worktrees` is `false` in `.planning/config.json`, so no worktree was created. Every check below ran in the main checkout.

These were not touched: `TraceShape.test.ts`, `51-BASE-EXPERIMENT.md`, `base-experiment/`, the two mutation JSONs, `scripts/`, the configs, the manifests, the lockfile, AGENTS.md, CHANGELOG.md, `spec/overview.md` and `tools/scan.mjs`. No runtime code changed: the only `src` edit is a doc comment in `Decision.ts`. No export was added (api-surface still reports 932), and no new id was used.

## Fixed Issues

### WR-01: `51-SECURITY.md` T-51-09 describes the foreign-tag behaviour of code that no longer exists

**Files modified:** `.planning/phases/QD-51-policy-tag-arity-stated-once/51-SECURITY.md`
**Commit:** 1a68e58f
**Applied fix:**
- The register row and the Accepted Risks Log entry now describe the current mechanism. A foreign tag has no row in `POLICY_ARITY` or in `traceChildrenByArity`. `foldTrace` throws a `TypeError` in `traceChildrenOf` when `TreeFold.ts`'s `open` opens the node, before any child's arm runs.
- The base threw `Match.exhaustive`'s `absurd` error on the same `open` path, from its `traceShapeOf`. Only the error's class and message changed. Both are fail-closed, never an allow.
- The status now reads "closed (accepted; foreign tags throw a TypeError at traceChildrenOf, pinned)".
- The frontmatter still says `status: verified` and `threats_open: 0`. The audit trail has a new line for this review-driven correction.

**What I ran:** `tsx` on `foldTrace(node(tag, [node("HasRole")]), arms)`, at HEAD and at 8d87d837 (in a temporary worktree, since removed).
- At HEAD, for `Bogus`, `constructor`, `toString`, `__proto__` and `hasOwnProperty`, it threw `TypeError: traceChildrenByArity[traceShapeOf(...)] is not a function` at `traceChildrenOf (Decision.ts:438)`. The call chain was `open (TreeFold.ts:106)` < `walk` < `foldTreeBy` < `foldTrace`. The `HasRole` arm never ran.
- At the base, it threw `Error: effect/match/Match/exhaustive: absurd`, from `matcher.ts:706`. The call chain was `traceChildrenOf (Decision.ts:444)` < `open (TreeFold.ts:106)`.

### WR-02: `proofs.mjs`'s runtime-refusal row passes whenever vitest exits non-zero, not only when a test fails

**Files modified:** `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/proofs.mjs`
**Commit:** 12b8d129
**Applied fix:** `failing(test)` now returns `{ ok, why }` and passes only when all three of these hold:
- the file exists;
- vitest's JSON report (`--reporter=json --outputFile=<tmp>`) has a `testResults` entry whose `name` is that file's resolved path;
- `numFailedTests > 0`, with at least one failed assertion in that file.

Each other case fails the row with its own message in the Error column:
- no such test file;
- vitest wrote no report;
- the report is not JSON;
- vitest did not run the file;
- vitest ran the file with no failing test.

**Demonstration:** I ran a scratch copy of the script on the `AllOf: () => []` edit with four paths:

| Path | Row | Message |
| --- | --- | --- |
| `packages/core/test/Nonexistent.test.ts` | NO | `no such test file: packages/core/test/Nonexistent.test.ts` |
| `packages/core/test/policy.test.ts` (wrong case; exists on a case-insensitive filesystem) | NO | `vitest did not run packages/core/test/policy.test.ts (exit 1)` |
| `packages/core/test/PolicyArity.tst.ts` (a file vitest does not collect) | NO | `vitest did not run packages/core/test/PolicyArity.tst.ts (exit 1)` |
| `packages/core/test/Policy.test.ts` | yes | `vitest: 2 failing test(s) in packages/core/test/Policy.test.ts` |

Afterwards I deleted the scratch copy and ran the real script once (see Checks). `packages/core/src` was clean afterwards.

### IN-01: BEH-QD-593 and the changeset say nothing about the error class a foreign tag now raises

**Files modified:** `spec/behaviors/18-explanation.md` (Rev 1.12), `spec/decisions/164-policy-tag-arity-is-stated-once.md` (Rev 1.4), `packages/core/src/Decision.ts` (doc comment only), `packages/core/test/PolicyArity.test.ts` (comment only), `.changeset/policy-arity-stated-once.md`, `spec/README.md` (Rev 1.242)
**Commit:** f86abd3e
**Applied fix:**
- **BEH-QD-593.** The fold throws at the same point as the base's `Match.exhaustive`, but the error is now a `TypeError`. Callers should not rely on its class. Both are fail-closed defects. The test pins the throw and that no arm runs, not the class, so a `?? "Many"` or `Object.hasOwn` fallback would fail it.
- **ADR-QD-164.** A paragraph under Decision 5 covers:
  - what a foreign tag reads (`undefined` or an inherited member, so no row);
  - the `TypeError` in `traceChildrenOf` at `open`, before any arm;
  - the base's `absurd` error, thrown on the same path one call deeper, from `traceShapeOf`;
  - that both are fail-closed;
  - why the guard exists implicitly, and what would remove it;
  - what "a tag outside the union" (iteration-1 IN-02) pins.
- **The changeset.** One sentence: for a non-`Policy` tag, `foldTrace` still throws before any arm runs, but the error is now a `TypeError`.
- **Comments.** `traceChildrenOf`'s doc comment and the test's comment carry the same one-clause correction.
- **CCR-QD-442 row.** It gained a "Review iteration 2" entry. No runtime guard was added.

### IN-02: The IN-04 tstyche line for `Array.of` pins nothing beyond the line above it

**Files modified:** `packages/core/test/PolicyArity.tst.ts`
**Commit:** 8f23790e
**Applied fix:** I removed the redundant `Array.of<Policy>()` line. It is replaced by its own test, built on module-level `declare const a: Policy` and `declare const b: Policy`:
- `const viaOf: ChildrenOf<"Many", Policy> = Array.of(a, b)` is accepted, and its type is asserted.
- `const literal: ChildrenOf<"Many", Policy> = [a, b]` is refused under `// @ts-expect-error is not assignable to type 'never'`. tstyche checks that message: suppressed went from 38 to 39 matched.

### IN-03: INV-QD-348 says `Decision.test.ts` is "untouched", and the CCR-QD-442 row does not list it

**Files modified:** `spec/invariants.md` (Rev 1.149), `spec/README.md` (Rev 1.243)
**Commit:** ea7e8501
**Applied fix:**
- **INV-QD-348's Enforcement.** It now says that `Decision.test.ts`'s `foldTrace` tests are untouched. It also says that one test was added there for `isAllowingTrace` and `isDenyingTrace`: iteration-1 WR-02's mutation floor, commit `2cd90675`.
- **The CCR-QD-442 row.** Its file list now includes `packages/core/test/Decision.test.ts` ("one test for the two trace guards, review iteration 1 WR-02"), and it has an IN-03 entry.

## Mutation

I did not re-run Stryker. No runtime code in `Decision.ts`, `Policy.ts` or `PolicyArity.ts` changed in this iteration: the one `src` edit is a doc comment (IN-01). Iteration 1's scores stand: `Decision.ts` 0.967742, `Policy.ts` 0.986486.

## Checks

All of these ran in the main checkout on the final tree (HEAD ea7e8501):

| Check | Result |
| --- | --- |
| `pnpm exec vitest run --project core` | exit 0, 77 files, 2512 tests |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0; `house-style: 539 file(s) clean (3 declared switch(es))`. The only warnings are in the untracked `.codex/hooks/` |
| `pnpm circular` | exit 0, no circular dependency |
| `pnpm test:tstyche` | exit 0, 60 files, 314 tests, 39 suppressed matched |
| `pnpm spec:verify:strict` | exit 0, PASS 21, FAIL 0, SKIP 0 |
| `pnpm spec:examples` | exit 0, 116 blocks compile |
| `pnpm spec:api` | exit 0, 932 exports documented across 9 packages |
| `node scripts/check-house-style.mjs` | exit 0, 539 files clean, 3 declared switches |
| `tools/proofs.mjs` | exit 0, "every proof as expected" (16 rows). The `AllOf: () => []` row now reads `vitest: 2 failing test(s) in packages/core/test/Policy.test.ts`, and `packages/core/src` was clean afterwards |

`tools/scan.mjs` exits 1 with the same three findings iteration 1 reported. I ran it in a temporary worktree at the pre-fix head 51f45254 and got the same three lines. I did not change the checks.

1. `outside the phase scope: packages/core/test/Decision.test.ts`. This is iteration 1's mutation-floor test (2cd90675).
2. `Decision.ts changed the body of const traceChildrenOf =`. This is iteration 1's WR-02 per-arity table. The block the check compares starts at the `const`, so this iteration's doc-comment edit is not part of it.
3. `51-mutation-after.json does not follow the last src commit`. Iteration 1's src commits, and now this iteration's IN-01 doc-comment commit, come after the recorded after-run, and the brief forbids rewriting the mutation JSONs.

---

_Fixed: 2026-11-16T16:55:47Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
