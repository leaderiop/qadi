---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
fixed_at: 2026-11-16T13:57:52Z
review_path: .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 7
skipped: 1
status: partial
---

# Phase 50: Code Review Fix Report

**Fixed at:** 2026-11-16T13:57:52Z
**Source review:** .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (WR-01 to WR-03, IN-01 to IN-05, `--all`)
- Fixed: 7
- Skipped: 1 (IN-05, no change needed: D-06 requires the row)

Each fix has its own commit. IN-02 and IN-03 both edit `LeafNeeds.test.ts`, but they were split into two commits, and the tree is green at each one. The only skip is IN-05, a necessity finding that the locked decision D-06 answers. So `partial` means one deliberate no-change, not unfinished work.

The work ran in the main checkout. `workflow.use_worktrees` is `false` in `.planning/config.json`, so no worktree was created.

The hot path is unchanged. `absenceOf`'s runtime code, its check order and what it reads per call are byte-identical (D-01, ADR-QD-163). WR-01 is type-level only, and the emitted `LEAF_NEEDS` value does not change. `LeafMatrix.test.ts`, `LeafFixtures.ts`, `Evaluate.bench.ts`, `50-BENCH.md`, `bench/gate/` and `bench/after/` were not touched.

## Fixed Issues

### WR-01: A mis-specified `LeafNeeds` row is accepted by the compiler and fails open

**Files modified:** `packages/core/src/LeafNeeds.ts`, `packages/core/test/LeafNeeds.tst.ts` (new), `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` (Rev 1.1), `spec/invariants.md` (Rev 1.143), `spec/behaviors/05-evaluator.md` (Rev 1.12), `spec/traceability.md` (Rev 1.208), `spec/README.md` (Rev 1.228)
**Commit:** d9ef8c34
**Applied fix:**
- **The row type.** The new `LeafNeedOf<K>` is `LeafNeed &` a row whose fields are derived from `Extract<LeafPolicy, { _tag: K }>`:
  - `own` is `"Action"` for the `HasAction` variant, `"Resource"` for `HasResourceAttribute`, and `"Nothing"` otherwise.
  - `matcher` is `true` exactly when the variant extends `MatcherLeaf`, and `false` otherwise.
- **The table.** `LEAF_NEEDS` is now `as const satisfies { readonly [K in LeafTag]: LeafNeedOf<K> }`. The runtime value, `absenceOf`, `isMatcherLeaf` and `isActionLeaf` are unchanged; the guards are now sound by construction and were kept.
- **Proof.** I temporarily wrote four bad rows: `HasRole` as `own: "Action"` with `matcher: true`, `HasAttribute` as `matcher: false`, and `HasRelationship` as `own: "Resource"`. `tsc -p tsconfig.test.json` gave TS2322 on all four cells, and the file was restored.
- **`LeafNeeds.tst.ts`.** It pins the derived `own`/`matcher` per variant, refuses four mismatched rows with `type.not.toBeAssignableFrom`, and checks every table row against its leaf. It has 13 assertions. As a negative control, loosening `LeafNeedOf` to `LeafNeed | {...}` fails 12 of the 13.
- **Spec.** ADR-QD-163 decision 1 and Consequences, INV-QD-345 (Source, Implication, Enforcement) and BEH-QD-590 now state the TS2322 guarantee. The traceability file maps `LeafNeeds.tst.ts`.

### WR-02: `ab.sh` does not stop on INT/TERM; it reverts, then carries on benching

**Files modified:** `.planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/bench/ab.sh`
**Commit:** caff5b31
**Applied fix:**
- **Traps.** The script now sets `trap cleanup EXIT; trap 'exit 130' INT; trap 'exit 143' TERM`, so a signal ends the script and the EXIT trap is the one place that reverts.
- **Failed revert.** `cleanup` clears `applied` before it reverts, so it cannot retry. If `git apply -R` fails, it prints `ab.sh: could not revert <patch>; packages/core/src is left patched` and exits 5. The header's exit-code list now includes 5 for a failed revert and 130/143 for INT/TERM.
- **Signal timing.** Bash runs a trap only after the foreground command returns, so a signal ends the script after the bench run in progress finishes. The header says so.

**Verification:**
- `bash -n` passes.
- Zero rounds exits 2 (usage).
- A missing patch exits 3.
- A minimal reproduction of the trap pattern was run under Python's `subprocess`, because a non-interactive bash `&` child ignores SIGINT. Results:

  | Pattern | Signal | Result |
  | --- | --- | --- |
  | Old | INT or TERM | Ran all 5 iterations and exited 0 |
  | New | INT | Stopped after the iteration in progress, reverted once, exited 130 |
  | New | TERM | Stopped after the iteration in progress, reverted once, exited 143 |
  | New | Failing revert | Printed the message and exited 5 |

**Committed runs not affected:** neither bench run that ADR-QD-163 and 50-BENCH.md cite was affected. Both exited 0 and left src clean: `bench/gate/done.txt` and `bench/after/done.txt` both read `src restored to HEAD`, which the script writes only after its final `src_clean` check passes. Neither run received a signal.

### WR-03: BEH-QD-586 and INV-QD-346 state a `HasAttribute` outcome the code does not give

**Files modified:** `spec/behaviors/10-actions.md` (Rev 1.3), `spec/invariants.md` (Rev 1.144), `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` (Rev 1.2), `spec/README.md` (Rev 1.229)
**Commit:** 021f45ed
**Applied fix:**
- **BEH-QD-586's REQUIREMENT.** `HasAction` fails with `MissingAction`, and `HasResourceAttribute` with `MissingResource` whatever its matcher references. `HasAttribute` fails with `MissingAction` when its matcher references the action and with `MissingResource` when it references the resource. When it references neither it MUST NOT fail for either absence, and its matcher's own decision stands. These match the fixture cells `HasAttribute[no ref]` (Allow), `[ref action]`/`[nested ref action]` (`Action:-`), `[ref resource]`/`[nested ref resource]` (`Resource:department`) and all three `HasResourceAttribute` fixtures (`Resource:owner`).
- **INV-QD-346's Implication.** It is qualified the same way. It also drops the claim that the result holds "in both interpreters" for a missing resource: `toPredicate`'s resource is the row, so it now says `toPredicate` reports the same absence wherever both interpreters apply.
- **Grep of the other new text.** ADR-QD-163's "The check order" made the same unconditional claim ("`HasAttribute` ... asks the matcher: the action, then the resource" and "reports the leaf's own input"). It is now qualified by what the matcher references and by "for a leaf that has one". BEH-QD-587 to BEH-QD-590, INV-QD-345, the changeset and `LeafNeeds.ts`'s header carry no such claim.

### IN-01: ADR-QD-163's Context misdescribes the base's errors

**Files modified:** `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` (Rev 1.3), `spec/README.md` (Rev 1.230)
**Commit:** 344400a3
**Applied fix:** The Context now says the two matcher arms each built `new MissingAction({})` from the action test and `new MissingResource(...)` from their resource test. This was checked against `git show 5ab8d0c0:packages/core/src/Walk.ts`, lines 332, 340, 352 and 356.

### IN-02: `LeafNeeds.test.ts`'s header is stale

**Files modified:** `packages/core/test/LeafNeeds.test.ts`
**Commit:** 9ec37497
**Applied fix:** The "RED by import (D-14)" sentence is dropped. The no-absence test now selects its cells with the fixture's own `f.own === "Nothing" && f.refs === "none"` instead of `LEAF_NEEDS[...]`, so no expectation in that test is derived from the table under test.

### IN-03: The agreement property and the `HasAction` deny sentence are thinner than BEH-QD-586/589 claim

**Files modified:** `packages/core/test/LeafNeeds.test.ts`, `spec/behaviors/05-evaluator.md` (Rev 1.13), `spec/traceability.md` (Rev 1.209), `spec/README.md` (Rev 1.231)
**Commit:** 3d4ac0d1
**Applied fix:** A new `describe` in `LeafNeeds.test.ts` (the characterisation is untouched) has two tests.
- **The `HasAction("write")` cell.**
  - With action `read`, `evaluate` gives exactly `Deny: action is 'read', not 'write'` and `toPredicate` gives `PRED {"_tag":"False"}`.
  - With no action, both give `Action:write`.
- **The agreement property.** It runs over every fixture plus `HasAction("write")`, with the action both absent and present.
  - An `Action:` label on either side must equal the other side.
  - Wherever `toPredicate` compiles to a constant, `evaluate` allows exactly when the constant is `True`, and otherwise gives a `Deny: `.
  - The constant cells are counted exactly (18), so a fixture change that drops them is seen.
- **Negative controls, both restored with `git checkout`.**
  - Dropping the comma from `Walk.ts`'s `HasAction` reason fails the deny-cell test.
  - Inverting `toPredicate`'s `HasRole` constant (`!holdsRole`) fails the agreement property.
- **Spec.** BEH-QD-589's prose and the traceability row for `LeafNeeds.test.ts` name the new pins.

### IN-04: The leaf-heavy workloads never read the references they are described as measuring

**Files modified:** `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` (Rev 1.4), `spec/README.md` (Rev 1.232)
**Commit:** 3c545f18
**Applied fix:**
- **ADR-only fix.** The fix is in the ADR only, because the brief's hard rules freeze `packages/core/bench/Evaluate.bench.ts`.
- **What the ADR now says.** Both leaf-heavy workloads supply the action and the resource, so `absenceOf` returns before `referencesAction`/`referencesResource` runs and neither workload walks a matcher reference. The two take the same path and differ only in their matchers' own cost, so the delta they share is the table read on the present-inputs path. The reference walk runs only on the failing path, which neither workload measures.
- **The bench comment.** The ADR also records that the bench file's `leafHeavyPlain` comment ("the cost of reading the references is told from the cost of the arms") is inaccurate for the same reason. That comment is left as committed, because editing the file would make it no longer the file the committed runs measured.

## Skipped Issues

### IN-05: `LeafNeed.resourceId` has no reader in source

**File:** `packages/core/src/LeafNeeds.ts:34-37`
**Reason:** No change needed. D-06 (locked) requires the table to state the resource-id need while `readScoped` stays the one enforcement point, and BEH-QD-588 says "MUST state". The column is a declarative fact, tied to `readScoped`'s behaviour by the D-06 test in `LeafNeeds.test.ts` ("a row's resourceId is what readScoped does"). The review itself says "None required".
**Original issue:** `LEAF_NEEDS[...].resourceId` has no reader in `packages/*/src`. Its only consumer is the D-06 test.

## Verification

All of these ran in the main checkout (no worktree), from the repository root, after the last commit (3c545f18):

- `pnpm exec vitest run --project core`: 75 files, 2438 tests passed
- `pnpm typecheck`: passed
- `pnpm lint`: exit 0, with no diagnostics in any file this fix touched. Its warnings are all in `.codex/`/`.agents/` hook files.
- `pnpm circular`: no circular dependency
- `pnpm test:tstyche`: 59 files, 626 assertions passed, including the new `LeafNeeds.tst.ts`
- `pnpm spec:verify:strict`: 21 pass, 0 fail, 0 skip
- `pnpm spec:examples`: 116 blocks compile
- `pnpm spec:api`: 932 exports documented
- `node scripts/check-house-style.mjs`: 536 files clean, 3 declared switches. SWITCH_BUDGET and UNTRACED_BUDGET are unchanged.
- Stryker, run alone (no other vitest running): `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/LeafNeeds.ts'` scored **98.11%**, with 52 killed and 1 survived. The survivor is the argued-equivalent `isActionLeaf` mutant (`LEAF_NEEDS[leaf._tag].own === "Action"` replaced with `true`), the same as before.

No new BEH, INV, ADR or CCR id was used. Every spec revision is recorded in the existing CCR-QD-441 row in `spec/README.md`.

---

_Fixed: 2026-11-16T13:57:52Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
