---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
fixed_at: 2026-11-16T14:13:13Z
review_path: .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-REVIEW.md
iteration: 2
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 50: Code Review Fix Report

**Fixed at:** 2026-11-16T14:13:13Z
**Source review:** .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 4 (WR-01, WR-02, IN-01, IN-02; `--all`)
- Fixed: 4
- Skipped: 0

Each finding has its own commit. WR-01 and IN-02 both edit `LeafNeedOf` and `LeafNeeds.tst.ts`. They were split into two commits, and the tree is green at each one.

The work ran in the main checkout. `workflow.use_worktrees` is `false` in `.planning/config.json`, so no worktree was created.

The hot path is unchanged. `absenceOf`'s runtime code, its check order and what it reads per call are byte-identical (D-01, ADR-QD-163). The `LeafNeeds.ts` diff since iteration 2 began (`c7270bf7`) touches only types and doc comments, and the emitted `LEAF_NEEDS` value does not change. `Evaluate.bench.ts` changed only in comment lines (see IN-01). `LeafMatrix.test.ts`, `LeafFixtures.ts`, `50-BENCH.md`, `bench/gate/`, `bench/after/` and `scripts/` were not touched.

## Fixed Issues

### WR-01: `LeafNeedOf`'s `own` is derived from two hard-coded tag names, so the guarantee does not hold for a new leaf

**Files modified:** `packages/core/src/LeafNeeds.ts`, `packages/core/test/LeafNeeds.tst.ts`, `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` (Rev 1.5), `spec/invariants.md` (Rev 1.145), `spec/behaviors/05-evaluator.md` (Rev 1.14), `spec/traceability.md` (Rev 1.210), `spec/README.md` (Rev 1.233)
**Commit:** af9a3d89
**Applied fix:**
- **Closed lists for `own`.** `own` now comes from `OwnOf<Tag>`, built from three closed tag lists: `ReadsAction`, `ReadsResource` and `ReadsNothing` (8 tags). A tag in none of them gets `never`, so any row for an unclassified leaf is TS2322 and cannot default to "reads nothing".
- **Why lists rather than fields.** No variant's shape shows which input it reads. `HasAttribute` and `HasResourceAttribute` have identical fields, and `HasAction`'s `action` field is the expected action, not proof that the leaf reads the request's action. So `own` uses the tag lists throughout. `matcher` is still read from the shape.
- **The new type.** `LeafNeedOfVariant<V>` is generic over a variant, and `LeafNeedOf<K>` is that type applied to `Extract<LeafPolicy, { _tag: K }>`. This lets a test build a leaf the policy does not have. It is exported from the package-private module only, which is still off the barrel.
- **`LeafNeeds.tst.ts`.** A new test, "a leaf no classification names has no row", builds two hypothetical variants as test-local types: `HasActionIn { actions }` and `HasResourceField { attribute, matcher }`. It asserts that `own` is `never` for both, and that the fail-open "Nothing" rows and an "Action" row are refused. The header now says that `own` is classified by tag.
- **Loosening check.** I set `OwnOf`'s default back to `"Nothing"`. The new test then failed 4 of its assertions (both `toBe<never>` and both "Nothing" rows), with 14 of 18 passing. The file was restored from a copy.
- **Spec.** ADR-QD-163 decision 1 and Consequences, INV-QD-345 (Source, Implication, Enforcement), BEH-QD-590 and the traceability row now claim exactly what the compiler guarantees. Every leaf must be classified before its row compiles. The classification itself is still hand-written: the compiler checks that one is made, and `LeafMatrix.test.ts`'s fixture per tag checks that it is right.

### WR-02: `ab.sh` can leave the prototype applied when a signal lands during `git apply`, and a signal during a failing revert loses the message

**Files modified:** `.planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/ab.sh`
**Commit:** c20e7cf3
**Applied fix:**
- **Forward apply.** `applied=1` is now set before `git apply "$PATCH"`, and cleared in the failure branch before `exit 3`.
- **Revert.** `cleanup` sets `reverted=1` before `git apply -R` and always ends with a `src_clean` check.
  - If src is clean, it clears `reverted`.
  - If src is dirty after a revert attempt, it prints `could not revert $PATCH; $SRC is left patched` and exits 5. This works even when a signal ended the first `cleanup` before the `||` would have run.
  - If src is dirty for any other reason, it prints `$SRC is not clean` and exits 5.
  - Both failure branches run `trap - EXIT` first, so the message prints once.
- **End of script.** The redundant final `src_clean` line is dropped, because `cleanup` now does that check. The header's exit-5 description now says "dirty after a run or at exit".

**Verification:** I made a minimal reproduction of the old and new patterns. It runs in a throwaway git repo with a real one-file patch, and a `sleep 2` is placed after the slow step. TERM was sent at 1 s; a background bash child ignores INT, and both signals use the same trap.

| Scenario | Old pattern | New pattern |
| --- | --- | --- |
| TERM during forward `git apply` | exit 143, src left patched, no message | exit 143, src clean |
| TERM during a failing `git apply -R` | exit 143, src left patched, no message | exit 5, "could not revert; src left patched" |
| Failing revert, no signal | exit 5, message | exit 5, message (printed once) |
| TERM during a successful revert | exit 143, src clean | exit 143, src clean |
| No signal | exit 0, src clean | exit 0, src clean |

On the real script:
- `bash -n` passes.
- Zero rounds exits 2 (usage).
- A missing patch exits 3.
- `packages/core/src` was clean afterwards.

No bench was run, and the committed runs are unaffected.

### IN-01: A comment the ADR calls inaccurate is left in the committed bench file

**Files modified:** `packages/core/bench/Evaluate.bench.ts` (comment only), `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` (Rev 1.7), `spec/README.md` (Rev 1.235)
**Commit:** c6760496
**Applied fix:** The `leafHeavyPlain` doc comment now says that both workloads supply both inputs, so the absence check never asks a matcher what it references. The two take the same path, and the delta they share is the table read with both inputs present. The ADR's note now says the comment was corrected by a comment-only edit that changed no workload, so the file still runs what the committed runs measured.

The bench diff is comment-only (`git diff -U0`):

```
@@ -356,2 +356,3 @@ const leafHeavy = allOf([
- * neither input: the control for `leafHeavy`, so the cost of reading the
- * references is told from the cost of the arms.
+ * neither input. The request supplies both inputs, so in neither workload does
+ * the absence check ask a matcher what it references: the two take the same
+ * path, and the delta they share is the table read with both inputs present.
```

### IN-02: Two names say "every row is its leaf's", but `resourceId` is not tied to the leaf at compile time

**Files modified:** `packages/core/src/LeafNeeds.ts`, `packages/core/test/LeafNeeds.tst.ts`, `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` (Rev 1.6), `spec/invariants.md` (Rev 1.146), `spec/behaviors/05-evaluator.md` (Rev 1.15), `spec/behaviors/30-port-calls.md` (Rev 1.10), `spec/traceability.md` (Rev 1.211), `spec/README.md` (Rev 1.234)
**Commit:** 95608c8e
**Applied fix:** I took the preferred option and constrained the column, so the existing title "every row of the table is its leaf's" is now true for the whole row.
- **The type.** `resourceId` now comes from `ResourceIdOf<Tag>`, built from three closed lists: `AsksAlways` (`HasRelationship`), `AsksByScope` (`HasActed`, `HasNotActed`, `HasSignature`) and `AsksNever` (the other six). An unlisted tag gets `never`.
- **The doc comment.** `LeafNeed.resourceId` now says the column is declarative: `readScoped` enforces the need and does not read this column. The type ties the column to the tag, and `LeafNeeds.test.ts` ties it to `readScoped`'s behaviour.
- **`LeafNeeds.tst.ts`.** New assertions:
  - A test pins `resourceId` per tag (`Always`, `ByScope` twice, `Never`).
  - A refused row: `HasActed` stating `resourceId: "Never"`.
  - `resourceId` is `never` for the hypothetical `HasActionIn`.
- **Loosening checks, both restored from a copy.**
  - Setting `ResourceIdOf`'s default back to `"Never"` failed 1 assertion (the hypothetical's `never`).
  - Typing the column as the free union `LeafNeed["resourceId"]` failed 6 assertions across 3 tests.
- **Spec.** INV-QD-345 (Source, Implication), BEH-QD-590, BEH-QD-588's prose, ADR-QD-163 decision 1 and Consequences, and the traceability row now include `resourceId` in the compile-time check. BEH-QD-588 also states that `readScoped` does not read the column.

## Verification

All of these ran in the main checkout (no worktree), from the repository root, after the last commit (c6760496):

- `pnpm exec vitest run --project core`: 75 files, 2438 tests passed
- `pnpm typecheck`: passed
- `pnpm lint`: exit 0. No diagnostic is in a file this fix touched; the warnings are in `.codex/` hooks and in unrelated devtools and react files.
- `pnpm circular`: no circular dependency
- `pnpm test:tstyche`: 59 files, 299 tests, 637 assertions passed. `LeafNeeds.tst.ts` now has 6 tests and 24 assertions.
- `pnpm spec:verify:strict`: 21 pass, 0 fail, 0 skip
- `pnpm spec:examples`: 116 blocks compile
- `pnpm spec:api`: 932 exports documented across 9 packages
- `node scripts/check-house-style.mjs`: 536 files clean, 3 declared switches. SWITCH_BUDGET and UNTRACED_BUDGET are unchanged.
- **Stryker**, run alone with no other vitest running: `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/LeafNeeds.ts' < /dev/null`.
  - Score: **98.11%**, with 52 killed, 1 survived and 0 with no coverage.
  - The one survivor is the argued-equivalent `isActionLeaf` mutant (`LEAF_NEEDS[leaf._tag].own === "Action"` replaced with `true`), unchanged from before.

No new BEH, INV, ADR or CCR id was used. Every spec revision is added to the existing CCR-QD-441 row in `spec/README.md`, under "Review iteration 2".

---

_Fixed: 2026-11-16T14:13:13Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
