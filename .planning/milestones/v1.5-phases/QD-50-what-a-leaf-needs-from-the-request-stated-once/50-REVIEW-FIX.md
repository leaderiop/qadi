---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
fixed_at: 2026-11-16T14:21:35Z
review_path: .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-REVIEW.md
iteration: 3
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 50: Code Review Fix Report

**Fixed at:** 2026-11-16T14:21:35Z
**Source review:** .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 1 (IN-01, `--all`)
- Fixed: 1
- Skipped: 0

The work ran in the main checkout. `workflow.use_worktrees` is `false` in `.planning/config.json`, so no worktree was created.

The hot path is unchanged. The fix is type-only plus doc comments. `absenceOf`'s runtime code, its check order and what it reads per call are the same (D-01, ADR-QD-163), and so is the `LEAF_NEEDS` value. esbuild's output for `LeafNeeds.ts` at HEAD~1 and at HEAD has the same hash (`9fd6b65e…`), so no re-measurement is needed. `Evaluate.bench.ts`, `LeafMatrix.test.ts`, `LeafFixtures.ts`, `50-BENCH.md`, `bench/gate/`, `bench/after/` and `scripts/` were not touched.

## Fixed Issues

### IN-01: A tag listed in two classification lists silently takes the first, and nothing checks the lists are disjoint

**Files modified:** `packages/core/src/LeafNeeds.ts`
**Commit:** d85df984
**Applied fix:**
- **The check.** `Disjoint<A, B, C>` is `unknown` when no tag is in two of the three lists and `never` when one is. It uses the repo's existing `[Extract<…>] extends [never] ? unknown : never` idiom (`FreeRefusalTag` in `UntrustedDecode.ts`). `ListsDisjoint` applies it to both columns: `ReadsAction`/`ReadsResource`/`ReadsNothing` for `own`, and `AsksAlways`/`AsksByScope`/`AsksNever` for `resourceId`.
- **Where it applies.** `LEAF_NEEDS` now satisfies `{ readonly [K in LeafTag]: LeafNeedOf<K> } & ListsDisjoint`. A duplicate tag turns the target into `never`, so the table is TS1360 at the `satisfies`. The check needs no runtime value and no unused binding. A dummy `const` would have changed the emitted JS, and an unused type alias is TS6196 under `noUnusedLocals`.
- **Doc comments.** `Disjoint`'s comment says why the check exists: `OwnOf` and `ResourceIdOf` are conditional chains, so without it the first list would win. `LEAF_NEEDS`'s comment now says that a tag in two lists of one column stops the table from compiling.
- **Proof.** I ran `tsc --noEmit -p packages/core/tsconfig.src.json` on temporary edits, then restored the file from a copy (`cmp` confirmed it matched):

| Temporary edit | Result |
| --- | --- |
| None (baseline) | rc 0 |
| `HasAction` also in `ReadsNothing` | `LeafNeeds.ts(175,12): error TS1360`, "does not satisfy the expected type 'never'" |
| `HasRelationship` also in `AsksNever` | `LeafNeeds.ts(175,12): error TS1360`, same message |
| Either duplicate, with `& ListsDisjoint` removed | The only error is TS6196 for the now-unused alias. The duplicate itself is not flagged, so the check is what catches it. |

- **Spec.** No spec edit. ADR-QD-163 decision 1 already says that each tag is "classified by name into one of three closed lists". That claim is now enforced by the compiler instead of by convention. No spec text describes how disjointness is enforced or says it is not.

## Verification

All of these ran in the main checkout (no worktree), from the repository root, after the commit (d85df984):

- `pnpm exec vitest run --project core`: 75 files, 2438 tests passed
- `pnpm typecheck`: passed
- `pnpm lint`: exit 0. The warnings are in `.codex/` hooks, not in `LeafNeeds.ts`.
- `pnpm circular`: no circular dependency
- `pnpm test:tstyche`: 59 files, 299 tests, 637 assertions passed
- `pnpm spec:verify:strict`: 21 pass, 0 fail, 0 skip
- `pnpm spec:examples`: 116 blocks compile
- `pnpm spec:api`: 932 exports documented across 9 packages
- `node scripts/check-house-style.mjs`: 536 files clean, 3 declared switches. SWITCH_BUDGET and UNTRACED_BUDGET are unchanged.
- **Stryker**, run alone with no other vitest running: `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/LeafNeeds.ts' < /dev/null`.
  - Score: **98.11%**, with 52 killed, 1 survived and 0 with no coverage.
  - The one survivor is the argued-equivalent `isActionLeaf` mutant (`LEAF_NEEDS[leaf._tag].own === "Action"` replaced with `true`). It is now at line 206 because the new types moved it down. It is unchanged from iteration 2.

No BEH, INV, ADR or CCR id was used, and no spec file was touched.

---

_Fixed: 2026-11-16T14:21:35Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
