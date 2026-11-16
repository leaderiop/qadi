---
phase: QD-52-core-owns-the-predicate-compile-shell
fixed_at: 2026-11-16T18:46:27Z
review_path: .planning/phases/QD-52-core-owns-the-predicate-compile-shell/52-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 4
skipped: 1
status: partial
---

# Phase 52: Code Review Fix Report

**Fixed at:** 2026-11-16T18:46:27Z
**Source review:** .planning/phases/QD-52-core-owns-the-predicate-compile-shell/52-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (WR-01, IN-01 to IN-04, `--all`)
- Fixed: 4
- Skipped: 1 (IN-03, by the brief)

Each fix has its own commit, and the tree is green at every commit.

The work ran in the main checkout. `workflow.use_worktrees` is `false` in `.planning/config.json`, so no worktree was created. Every check below ran in the main checkout.

These were not touched:
- `scripts/`, the configs, the manifests, the lockfile, AGENTS.md and the CHANGELOG.md files
- the two mutation JSONs and `tools/scan.mjs`
- both `CompileShell.test.ts` characterisation files, which are still byte-identical to their `test(52-02)` commits

No runtime code changed. WR-01 changes a type only, and IN-01 and IN-02 change comments only. `compilePredicate` is still a plain function with no span. No export was added, and api-surface still reports 935. After `tsc -b`, both dialects' `lib/index.d.ts` still hash to the base values recorded in 52-01-SUMMARY.md (`09b6a5b9…` for sql, `8986d556…` for prisma).

## Fixed Issues

### WR-01: `rules` accepts a full `RenderRules` and silently ignores its `identifiers` and `maxInValues`

**Files modified:** `packages/core/src/RenderablePredicate.ts`, `packages/core/test/CompilePredicate.tst.ts` (new), `spec/decisions/165-core-owns-the-predicate-compile-shell.md` (Rev 1.1), `spec/behaviors/31-predicate-compilation.md` (Rev 1.11), `spec/overview.md` (Rev 1.121), `spec/README.md` (Rev 1.245), `.changeset/core-compile-predicate.md`
**Commit:** 6a146bf4
**Applied fix:**
- **Type.** `CompilePredicateOptions.rules` is now `Omit<RenderRules, "identifiers" | "maxInValues"> & { readonly identifiers?: never; readonly maxInValues?: never }`. Its field doc says that a value carrying either field is refused by type. The runtime is unchanged. Both dialects pass fresh literals without those fields, so they compile as before.
- **Pin.** `packages/core/test/CompilePredicate.tst.ts` follows `PolicyArity.tst.ts`'s pattern. It is covered by `tstyche.json` (default `*.tst.*` match) and by `tsconfig.test.json` (`packages/*/test/**/*.ts`). It has one positive and three `@ts-expect-error is not assignable to type 'never'` negatives:
  - a full `RenderRules` value (plus `type.not.toBeAssignableTo`)
  - a non-literal value that carries only `maxInValues`
  - a non-literal value that carries only `identifiers`
- **Shown to fail.** I restored the old `Omit`-only type temporarily. tstyche failed 3 of the 4 tests, then I restored the file.
- **Spec.** The signature listing changed in ADR-QD-165 and BEH-QD-596, and each now has a sentence explaining why. The `CompilePredicateOptions` row in `spec/overview.md` says a value carrying either field is refused by type. The `@qadi/core` changeset says the same. The CCR-QD-443 row has a "Review iteration 1: WR-01" entry before "Ids used". No new id.

### IN-01: Shipped source cites a planning-only decision id, and the comment describes the authoring process

**Files modified:** `packages/predicate-prisma/src/index.ts`
**Commit:** 9ff6599d
**Applied fix:** The body comment now reads: "`compiled` is counted only after `render` returns, so a renderer defect counts neither outcome (BEH-QD-597, ADR-QD-165)." "(D-06a)" and the sentence about how the comment was placed are gone. It is still a `//` body comment, and after `tsc -b` the prisma `lib/index.d.ts` hash is unchanged.

### IN-02: `compilePredicate`'s doc leaves out the `render` contract and the `outcomes` field

**Files modified:** `packages/core/src/RenderablePredicate.ts` (doc comments only)
**Commit:** 1bd1674e
**Applied fix:** Each doc comment opens with a one-line summary, and the reason follows it:
- **`render`:** "Prints a classified tree into the dialect's output." It runs once per run of the returned Effect, and only after classification succeeds, so per-run state (a parameter list, say) is allocated inside it. A throw from it is a defect and counts neither outcome.
- **`outcomes`:** "The dialect's own counter series, declared once in its package (ADR-QD-123)."
- **`identifiers` and `maxInValues`:** each says what it constrains and that `undefined` is the default too.
- **`rules`:** see WR-01.
- **`compilePredicate`:** a new paragraph says nothing runs until the returned Effect does, and a reused program calls `render` once per run.

I left the BEH alone. The review's fix asked only for the source doc, and core's "each run of the returned Effect counts once" test already pins the behaviour.

### IN-04: A core test title overstates what it pins

**Files modified:** `packages/core/test/CompilePredicate.test.ts`
**Commit:** 2404770b
**Applied fix:** The test is now "each of the dialect's five rules reaches toRenderable unchanged". It pins every dialect-supplied field. For each one, the field is flipped from `RULES` to a value that changes what `toRenderable` makes of a probe predicate:

| Field | Under `RULES` | Flipped |
| --- | --- | --- |
| `reservedColumns` | (n/a) | `ReservedColumn` refusal |
| `nullability` | `eq(a, null)` renders `IsNull` | `Declared` with nothing nullable refuses `NullOnNonNullableColumn` |
| `negation` | `Negate(eq(a, 1))`'s inner `Equals` has `nullGuard: "None"` | `ThreeValued` gives `"ExcludeNull"` |
| `finiteness` | `Gte a 3` has `finiteGuard: "ExcludeNonFinite"` | `Declared` with nothing floating gives `"None"` |
| `finiteExclusion` | (n/a) | `Inexpressible` refuses `NonFiniteColumn` |

**Shown to fail.** I patched `compilePredicate` five times in turn. Each time, `...options.rules` was followed by one field forced back to its `RULES` value (for example `negation: "TwoValued"`). All 5 runs failed the test (1 failed, 7 passed). Then `src` was restored, and `git status` showed only the test file changed.

## Skipped Issues

### IN-03: One new SQL test is redundant and carries an oxlint warning

**File:** `packages/predicate-sql/test/CompileShell.test.ts:158-162`
**Reason:** Skipped by the brief. This is a characterisation file and must stay byte-identical to its `test(52-02)` commit, because it is the phase's before/after evidence and `scan.mjs` section 6 checks this. The file was not edited.
**Original issue:** "one more than the default maxInValues refuses" repeats the REFUSALS row "TooManyValues past the default maxInValues". It also uses `new Array(1001).fill(1)`, which oxlint flags as `unicorn(no-new-array)` (a warning, not a lint failure).

## Mutation

Not run. No runtime code changed in `RenderablePredicate.ts` or in either dialect's `index.ts`:
- WR-01 changes a type.
- IN-01 and IN-02 change comments.
- IN-04 is a test.

So the brief's condition for the three Stryker invocations is not met.

## Checks

All of these ran in the main checkout on the final tree (HEAD 2404770b), and all passed:

| Check | Result |
| --- | --- |
| `pnpm exec vitest run --project core` | exit 0 (78 files) |
| `pnpm exec vitest run --project predicate-sql` | exit 0, 4 files, 103 tests |
| `pnpm exec vitest run --project predicate-prisma` | exit 0, 4 files, 95 tests |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0; `house-style: 542 file(s) clean (3 declared switch(es))`. The warnings are existing ones; the touched core files lint clean |
| `pnpm circular` | exit 0, no circular dependency |
| `pnpm test:tstyche` | exit 0, 61 files, 318 tests, 42 suppressed matched |
| `pnpm spec:verify:strict` | PASS 21, FAIL 0, SKIP 0 |
| `pnpm spec:examples` | exit 0, 116 blocks compile |
| `pnpm spec:api` | exit 0, 935 exports |
| `node scripts/check-house-style.mjs` | exit 0 |
| dialect `lib/index.d.ts` sha256 after `tsc -b` | both equal to 52-01-SUMMARY.md's base lines |

`tools/scan.mjs` exits 1 with four findings. I did not change the checks. Each finding is caused by a review fix the brief asked for:

1. `outside the phase scope: packages/core/test/CompilePredicate.tst.ts`. This is WR-01's type-level pin. The brief asked for a `.tst.ts` negative, and the scope list predates it.
2. `packages/core/src/RenderablePredicate.ts has 0 of: readonly rules: Omit<RenderRules, "identifiers" | "maxInValues">;`. Section 4 matches the old `rules` line literally. WR-01 changed it to `Omit<…> & { readonly identifiers?: never; readonly maxInValues?: never };`.
3. `packages/core/test/CompilePredicate.test.ts has 2 commits since the base; it must have one, test(52-03):`. IN-04 edited this test, as the brief required. The RED-by-import evidence is still the first commit, `test(52-03)`.
4. `52-mutation-after.json does not follow the last src commit`. WR-01 (type), IN-01 (comment) and IN-02 (comments) touched `src` after the recorded after-run. None of them changes runtime code, and the brief forbids rewriting the mutation JSONs.

The other scan checks pass. That includes the byte-identical characterisation files, the shell order in `compilePredicate`, `toRenderable` unchanged, the metric declarations, the ids, and the dialect declaration hashes.

---

_Fixed: 2026-11-16T18:46:27Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
