---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
reviewed: 2026-11-16T16:00:00Z
depth: standard
iteration: 3
files_reviewed: 21
files_reviewed_list:
  - .changeset/leaf-needs-stated-once.md
  - packages/core/bench/Evaluate.bench.ts
  - packages/core/src/LeafNeeds.ts
  - packages/core/src/PortAccess.ts
  - packages/core/src/Predicate.ts
  - packages/core/src/Walk.ts
  - packages/core/test/LeafFixtures.ts
  - packages/core/test/LeafMatrix.test.ts
  - packages/core/test/LeafNeeds.test.ts
  - packages/core/test/LeafNeeds.tst.ts
  - packages/core/test/Predicate.test.ts
  - spec/README.md
  - spec/behaviors/05-evaluator.md
  - spec/behaviors/10-actions.md
  - spec/behaviors/30-port-calls.md
  - spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/traceability.md
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/ab.sh
  - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/analyze.mjs
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
  necessity: 0
status: issues_found
---

# Phase QD-50: Code Review Report (iteration 3)

**Reviewed:** 2026-11-16T16:00:00Z
**Depth:** standard
**Files Reviewed:** 21 (the same scope as iteration 2)
**Status:** issues_found

## Summary

I checked each iteration-2 fix against the source and re-read the phase's whole non-planning diff (`git diff 5ab8d0c0..HEAD -- . ':!.planning'`) plus `bench/ab.sh` and `bench/analyze.mjs`. All four iteration-2 fixes are correct and complete, and nothing they touched broke the runtime. One minor Info item remains. No Critical or Warning finding.

**WR-01 and IN-02 (closed tag lists in `LeafNeeds.ts`) hold.**
- **One classification per leaf.** `LeafPolicy` has ten leaf tags (`Policy.ts:205-256`). `ReadsAction` (1), `ReadsResource` (1) and `ReadsNothing` (8) cover all ten exactly once, and `AsksAlways` (1), `AsksByScope` (3) and `AsksNever` (6) cover all ten exactly once. Each tag's classification matches its `LEAF_NEEDS` row and the fixtures in `LeafFixtures.ts`.
- **A new leaf fails to compile.** A tag in no list gets `never` from `OwnOf`/`ResourceIdOf`, so the `LeafNeed & { own: never }` row accepts no value and the `satisfies` line is TS2322. A new leaf is also TS2741 for the missing row, so two errors point at it. `LeafNeeds.tst.ts` proves the `never` through `LeafNeedOfVariant` on two hypothetical variants. It is a real proof, not a restatement: the fixer's loosening checks (default back to `"Nothing"` or `"Never"`) failed 4 and 1 assertions, and the free-union column failed 6.
- **No casts.** `LeafNeeds.ts` has no `as` other than `as const`, no `!`, `any`, `switch` or `Record<string, unknown>`.
- **Runtime unchanged.** The `LeafNeeds.ts` diff since `c7270bf7` is types and doc comments only. `absenceOf`, `errorOf`, `isMatcherLeaf` and `isActionLeaf` are line-for-line the same, and the `LEAF_NEEDS` value is unchanged. D-01 is untouched, so no re-measurement is needed.
- **Spec text matches.** INV-QD-345 (Source, Implication, Enforcement), ADR-QD-163 decision 1 and Consequences, BEH-QD-588 and BEH-QD-590 now claim what the compiler guarantees: every leaf is classified, and the classification is right only by `LeafMatrix.test.ts` and `LeafNeeds.test.ts`. The wording no longer says `own` is derived from the variant.

**WR-02 (`ab.sh`) holds.**
- **The flags are right.** `applied=1` is set before `git apply` and cleared in the failure branch. `reverted=1` is set before `git apply -R` and cleared only when `src_clean` passes. `cleanup` always ends with a state check: it either leaves src clean or prints the reason and `exit 5` with the EXIT trap cleared, so the message is printed once.
- **I ran the script**, not only read it, against a throwaway git repo with a fake `pnpm` on the PATH, under `/bin/bash` 3.2:

| Scenario | Result |
| --- | --- |
| Two clean rounds | exit 0, src clean |
| TERM during the patched run | exit 143, src clean |
| The bench run dirties src | exit 5, "packages/core/src is not clean" |
| The bench run fails | exit 4 |

  `bash -n` passes. `analyze.mjs` is unchanged since iteration 1.
- **Residual window.** A terminal SIGINT also reaches the `git apply` child. If it tore the patch halfway, `git apply -R` fails and the script exits 5 with "could not revert; left patched". That is a loud failure, which is what WR-02 asked for.

**IN-01 (`Evaluate.bench.ts`) holds.**
- **Comment-only since the measurements.** `git log` shows two commits on the file since the base: `3d6c3228` (50-02, the workloads and their `assert`s, before the bench gate) and `c6760496`. `git diff c7270bf7..HEAD` on it is the four lines of the `leafHeavyPlain` doc comment. No executed token changed after 50-02, so the file still runs what `bench/gate/` and `bench/after/` measured.
- **The comment matches ADR-QD-163 Rev 1.4/1.7.** Both workloads supply both inputs through `leafRequest`, so `absenceOf` returns before it walks a reference.

**Spec and traceability.** The CCR-QD-441 row (`spec/README.md:378`) lists every revision the fixes made, and each file's header revision matches its change history.

| File | Revision |
| --- | --- |
| ADR-QD-163 | Rev 1.1 to 1.7 |
| `05-evaluator.md` | Rev 1.12 to 1.15 |
| `10-actions.md` | Rev 1.3 |
| `30-port-calls.md` | Rev 1.10 |
| `invariants.md` | Rev 1.143 to 1.146 |
| `traceability.md` | Rev 1.208 to 1.211 |
| `README.md` | Rev 1.235 |

The row also lists `LeafNeeds.tst.ts` and no new id. `spec/decisions/index.yaml` is unchanged since iteration 2. The iteration-1 spec text on `HasAttribute`'s missing-both outcome (BEH-QD-586, INV-QD-346) still matches `absenceOf` and the characterisation cells.

**Tests and rules.**
- **Tests pass.** `LeafNeeds.tst.ts` has 6 tests and 24 assertions, all passing. `vitest --project core` on `LeafNeeds`, `LeafMatrix` and `Predicate` gives 123 passing tests.
- **Frozen files.** `LeafMatrix.test.ts` and `LeafFixtures.ts` have exactly one commit since the base, `f6322ff9` (50-02). `LeafNeeds.test.ts` and `Predicate.test.ts` are unchanged since iteration 2, so the agreement property and the pinned strings are as I reviewed them. They read `f.own` and `f.refs` from the fixtures and pin literals, not values derived from the code under test.
- **House rules.** `node scripts/check-house-style.mjs` reports 536 files clean with 3 declared switches. `scripts/` has no commit since the base, so no budget moved. `LeafNeeds` is not on the barrel (`packages/core/src/index.ts`).
- **Not re-run.** `pnpm typecheck` was green at the fixer's last commit, and `src` has had no change since. I did not re-run it, the benches, or Stryker.

**Necessity.** I did not read `necessity-review.md`. The only candidate, the `resourceId` column that nothing in `packages/*/src` reads, was resolved by D-06 and is now documented as declarative in `LeafNeed.resourceId`. `necessity` is 0.

## Info

### IN-01: A tag listed in two classification lists silently takes the first, and nothing checks the lists are disjoint

**File:** `packages/core/src/LeafNeeds.ts:56-90` (`OwnOf`, `ResourceIdOf`)

**Issue:** Both types are conditional chains. A tag that appears in `ReadsAction` and `ReadsNothing` gets `"Action"`, and one in `AsksAlways` and `AsksNever` gets `"Always"`. The lists are described as closed and "one per value", and the ADR/INV text relies on that, but disjointness is by convention. A duplicate is a type-level error nowhere. It can only arise from an edit that adds a tag without removing it from its old list, and `LeafMatrix.test.ts` or `LeafNeeds.test.ts` would then fail on that leaf (the row would be forced to the wrong `own`/`resourceId`, and the behaviour would disagree with the oracle). So it is caught, later and by a test failure, not at the classification. It is not a defect today: every tag is in exactly one list per column (checked above).

**Fix:** Optional. Two type-only lines in `LeafNeeds.ts` make it a compile error at the lists, with no runtime effect and no re-measurement:

```ts
type Disjoint<A, B> = [Extract<A, B>] extends [never] ? true : never;
const _ownListsDisjoint: [
  Disjoint<ReadsAction, ReadsResource>,
  Disjoint<ReadsAction, ReadsNothing>,
  Disjoint<ReadsResource, ReadsNothing>,
] = [true, true, true];
```

(with the same for the three `Asks*` lists), or leave it and add a sentence to the `OwnOf` doc comment that the lists must be disjoint and the first match wins.

---

_Reviewed: 2026-11-16T16:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Iteration: 3_
