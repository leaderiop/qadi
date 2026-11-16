---
phase: QD-51-policy-tag-arity-stated-once
fixed_at: 2026-11-16T16:41:12Z
review_path: .planning/phases/QD-51-policy-tag-arity-stated-once/51-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 51: Code Review Fix Report

**Fixed at:** 2026-11-16T16:41:12Z
**Source review:** .planning/phases/QD-51-policy-tag-arity-stated-once/51-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (WR-01 to WR-04, IN-01 to IN-06, `--all`)
- Fixed: 10
- Skipped: 0

Each finding has its own commit. WR-02 has a second commit: a test that keeps `Decision.ts`'s mutation score at or above the committed after-run (see "Mutation"). The tree is green at every commit.

The work ran in the main checkout. `workflow.use_worktrees` is `false` in `.planning/config.json`, so no worktree was created, and every check below ran in the main checkout.

These were not touched: `TraceShape.test.ts`, `51-BASE-EXPERIMENT.md`, `base-experiment/`, the two mutation JSONs, `scripts/`, the configs, the manifests, the lockfile, AGENTS.md, CHANGELOG.md and `spec/overview.md`. `foldTrace`, `renderTrace` and `diffTraces` keep their walks, and `childrenOf`'s runtime is unchanged. No export was added (api-surface still reports 932). `PolicyArity.ts` still imports nothing and stays out of `index.ts`.

## Fixed Issues

### WR-01: ADR-QD-164 says every "experiment, after" edit compiled on the base; three of them did not (or did not exist)

**Files modified:** `spec/decisions/164-policy-tag-arity-is-stated-once.md` (Rev 1.1), `spec/README.md` (Rev 1.237)
**Commit:** 6b007eea
**Applied fix:**
- The "experiment, after" table has a new column, "On the base (`base-experiment/moves.tsv`)". Each row quotes its `moves.tsv` row and its `tsc_exit` of 0. Example: `move Not Wrapper->Many`: `tsc_exit` 0.
- The three structural rows say "no counterpart: the base had no record, and `moves.mjs` measured none of the three".
- The closing sentence now says only what the evidence shows:
  - All 32 moves and all 3 arm edits compiled on the base.
  - After the change, the equivalent record edits and the two `Not` arm edits fail.
  - The structural rows have no base counterpart. The nearest base edit, deleting a tag from `leafTags`, does not compile either (`Decision.ts(439,3)`, TS2345). That result is attributed to the code review's run on a copy of the base, not to `moves.tsv`.
- The recorded experiment was not re-run or edited. The CCR-QD-442 row gained a "Review iteration 1" entry.

### WR-02: A non-exhaustive dispatch on the closed `Arity` union brings back the silent-widening class this phase removes

**Files modified:** `packages/core/src/Decision.ts`, `packages/core/src/PolicyArity.ts`, `spec/decisions/164-policy-tag-arity-is-stated-once.md` (Rev 1.2), `spec/invariants.md` (Rev 1.148), `spec/README.md` (Rev 1.238); then `packages/core/test/Decision.test.ts`
**Commits:** 11a7ecd1 (the fix), 2cd90675 (the mutation-score test)
**Applied fix:**
- **`Decision.ts`.** `traceChildrenOf` now dispatches through `traceChildrenByArity`, a closed per-arity table (ADR-QD-152 style):
  ```ts
  const traceChildrenByArity = {
    Leaf: () => [],
    Wrapper: (self) => self.children.slice(0, 1),
    Many: (self) => self.children,
  } as const satisfies { readonly [A in Arity]: (self: Trace) => ReadonlyArray<Trace> };
  ```
  Behaviour is the same for every union tag.
- **`PolicyArity.ts`.** `ChildrenOf`'s last branch is now `A extends "Many" ? … : never`.
- **Proof.** I added `"Pair"` to `Arity` temporarily and ran `tsc -p tsconfig.test.json`. It gave exit 1: `Decision.ts(426,12): error TS2741: Property 'Pair' is missing …` (plus TS7053 at the read). Then I restored the file, and `packages/core/src` was clean.
- **Spec.** ADR-QD-164 decision 5 and INV-QD-348's Source now describe the table and the fourth-word refusal.
- **`TraceShape.test.ts`** is unchanged and green.
- **Scan.** This fix makes `scan.mjs` report `Decision.ts changed the body of const traceChildrenOf =` (see "Checks").

### WR-03: `proofs.mjs`'s first row passes on any `git apply` failure

**Files modified:** `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/proofs.mjs`
**Commit:** df16b082
**Applied fix:** The row now passes only when `git apply --check` exits non-zero AND its stderr has a line matching `^error: patch failed: packages/core/src/Decision.ts:\d+$`. Any other failure prints its own first line and fails the row. That covers a missing patch (`can't open patch`), a corrupt patch, and git errors. I checked both cases:
- The real patch gives `1 true error: patch failed: packages/core/src/Decision.ts:435`.
- A missing patch gives `128 false error: can't open patch '/nonexistent.patch'`.

### WR-04: `proofs.mjs` and `moves.mjs` claim to restore on Ctrl-C, but the handlers cannot run

**Files modified:** `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/proofs.mjs`, `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/moves.mjs`
**Commit:** 6c50ffa6
**Applied fix:**
- **Restore on exit.** Both tools run `process.on("exit", restore)`. SIGINT, SIGTERM and SIGHUP each have a handler that calls `process.exit(128 + signo)`.
- **Child signals.** Every child goes through `run()`. It checks `spawnSync`'s `signal`, and a child killed by a signal ends the run with exit 1, restoring through the exit listener.
- **Prompt stop.** `spawnSync` holds a signal sent to the parent until the event loop yields, so each measurement is followed by `await tick()` (`setImmediate`). A caught signal therefore stops the run after the measurement in progress, not at the end of the script.
- **Headers.** They state the exit codes and that SIGKILL needs `git checkout -- packages/core/src`.

**Verification:** each reproduction ran the real `proofs.mjs`, waited until `packages/core/src/PolicyArity.ts` was modified while `tsc` was running, and then sent the signal:

| Signal sent to | Exit | stderr | `git status -- packages/core/src` after |
| --- | --- | --- | --- |
| The `tsc` child (SIGTERM) | 1 | `node_modules/.bin/tsc was killed by SIGTERM; restoring packages/core/src and stopping` | clean |
| The `proofs.mjs` parent only (SIGTERM) | 143 | (none) | clean |

I also checked the yield pattern on its own: a script with three `spawnSync("sleep", ["1"])` calls and a `tick` between them stopped after step 0 with exit 143 and ran its exit listener. `moves.mjs` was not run: it is the base experiment's tool, and its recorded output must not change.

### IN-01: The text after `@ts-expect-error` in the tstyche negatives is decorative

**Files modified:** `packages/core/test/PolicyArity.tst.ts`
**Commit:** 71384695
**Applied fix:** The review's premise is half right.
- Under `pnpm typecheck` (tsc), the directive consumes any error on its line.
- Under `pnpm test:tstyche` (tstyche 7.2.5, `checkSuppressedErrors` is on by default), the text after the directive must be a fragment of the one suppressed error's message, and a second error on the line fails.

I tested both:
- Changing the first directive's text to `is not assignable to type 'string'` made tstyche report `The diagnostic message did not match.`.
- Changing the third directive's text to `zzz unrelated` made tstyche exit 1, while `tsc` still exited 0.

So the message is already pinned, by tstyche, and a stricter pin was not needed. The file header now states both behaviours precisely, and that each directive sits on a line with exactly one erroring expression. BEH-QD-592's "checked `@ts-expect-error` negatives" is accurate, so it was left alone.

### IN-02: `POLICY_ARITY[tag]` is an unguarded own-property read; a foreign tag is unpinned

**Files modified:** `packages/core/test/PolicyArity.test.ts`, `packages/core/src/Decision.ts` (doc comment only), `spec/behaviors/18-explanation.md` (Rev 1.11), `spec/README.md` (Rev 1.239)
**Commit:** ad72f7b4
**Applied fix:** I chose the smaller change and added a pin, not a guard.
- **Why no guard is needed.** With WR-02's table, a tag outside the union has no arity, so the table has no row for it. That includes inherited names. `POLICY_ARITY["constructor"]` is `Object`, which turns into a key the table does not have, so the call throws when `foldTrace` opens the node, before any child is walked. The base's `Match.exhaustive` also threw on opening the node.
- **The pin.** A new `describe("a tag outside the union")` covers `Bogus`, `constructor`, `toString` and `__proto__`. Each tag is built with `JSON.parse`, as `Matcher.test.ts` does. Each test asserts that `foldTrace` throws and that a spied child arm ran 0 times.
- **Negative control.** I temporarily made the dispatch fall back to `Many` for a missing row, and all 4 tests failed. Then I restored the file.
- **Docs.** `traceChildrenOf`'s doc comment and BEH-QD-593 now state this behaviour.

### IN-03: `PolicyArity.test.ts` has one assertion that cannot fail and two coupled to unrelated output shape

**Files modified:** `packages/core/test/PolicyArity.test.ts`
**Commit:** 83feca20
**Applied fix:**
- **Removed.** The `assert.include([...], POLICY_ARITY[tag])` loop is gone, with a one-line note that the type owns this check. The test is now "names every tag exactly once".
- **`renderTrace`.** The test asserts only the child line count: `split("\n").length - 1 === 3`.
- **`diffTraces`.** The test asserts only `{ path, before, after }` of each change, equal to `[{ path: [0], before: true, after: false }]`.

**Shown to fail:**
- Changing `renderTrace`'s child loop bound to `i >= 1` (`Decision.ts:573`) failed all 16 render tests.
- The same change in `diffTraces` (`TraceDiff.ts:279`) failed all 16 diff tests.

Both files were restored afterwards.

### IN-04: The Many type refuses every fixed-length array literal, with an opaque error

**Files modified:** `packages/core/src/PolicyArity.ts` (doc comment), `packages/core/test/PolicyArity.tst.ts`, `spec/behaviors/25-inspection.md` (Rev 1.38), `spec/README.md` (Rev 1.240)
**Commit:** 27ca3a7c
**Applied fix:**
- `ChildrenOf`'s doc comment and BEH-QD-592 now say that a `Many` arm with a fixed number of children returns a non-literal array, e.g. `Array.of(a, b)`, because a literal `[a, b]` is a tuple and is refused with the same `never` error.
- One tstyche line pins this workaround: `Array.of<Policy>()` is assignable to `ChildrenOf<"Many", Policy>`.

### IN-05: ADR-QD-164 and the proof table cite a test file as the reader that refuses Leaf to Many

**Files modified:** `spec/decisions/164-policy-tag-arity-is-stated-once.md` (Rev 1.3), `spec/README.md` (Rev 1.241), `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/proofs.mjs`
**Commit:** 0b734928
**Applied fix:**
- **ADR.** "The Many type" and the table row now cite the `src` readers instead of `Policy.test.ts(1045,52)`:
  - `LeafNeeds.ts(165,3): error TS2353: … 'HasRole' does not exist in type …`
  - `leafCases`, `Walk.ts`, `Predicate.ts` and `Simplify.ts`
  
  I measured these with a temporary `HasRole: "Many"` edit.
- **Proof row.** Its expectation was `"any"`. It is now the fragment `'HasRole' does not exist in type '{ readonly HasActed: LeafNeedOf<`. The shorter fragment the review suggested also matches a test file, `test/LeafFixtures.ts(94,3)`, so I used one that only `LeafNeeds.ts` produces.
- **Result.** `proofs.mjs` now prints `LeafNeeds.ts(165,3)` for that row.

### IN-06: Tooling brittleness: a hard-coded TypeScript path, a dead fallback branch, survivors compared as a set

**Files modified:** `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/scan.mjs`, `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/mutation.mjs`
**Commit:** a9c63acd
**Applied fix:**
- **TypeScript resolution.** The review suggested resolving `typescript` with `createRequire(...).resolve("typescript")`. That cannot work here: the root's `typescript` is 7.0.2, the Go port, and it has no `transpileModule`. So `scan.mjs` now tries the root's `typescript` first, then every installed `node_modules/.pnpm/typescript@*`, newest first. It takes the first one that has `transpileModule`, which today is 6.0.3. If none has it, the scan reports that.
- **Dead branch.** The A1 `polImport` fallback is deleted. The import line is checked as the one literal it is, so the check is stricter, not weaker.
- **Multisets.** `mutation.mjs compare` now subtracts survivors as multisets. A self-check confirms it: `minus(["a","a","b"], ["a","b"])` gives `["a"]`.
- **Recorded result.** `compare` on the recorded JSONs prints the same result as before ("WX-05 holds"). The JSONs are unchanged.

## Mutation

`Decision.ts`, `Policy.ts` and `PolicyArity.ts` changed, so I ran `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Policy.ts,packages/core/src/Decision.ts,packages/core/src/PolicyArity.ts' < /dev/null` on its own:

| Run | `Decision.ts` | `Policy.ts` |
| --- | --- | --- |
| The committed after-run (the floor) | 0.963855 (160/166) | 0.986486 (146/148) |
| First run, after WR-02 | 0.961290 (149/155) | 0.986486 (146/148) |
| Second run, after 2cd90675 | **0.967742 (150/155)** | 0.986486 (146/148) |

- **Why the first run fell.** The deleted ternary's killed mutants left with it, and the survivor set was unchanged.
- **What fixed it.** Commit 2cd90675 adds a test in `Decision.test.ts` for `isAllowingTrace`/`isDenyingTrace`. It kills the one NoCoverage survivor, `isDenyingTrace`'s `!trace.allowed`, and flipping that line makes the test fail.
- **Survivors.** The second run has no new survivor compared with `51-mutation-after.json`, and one is gone (the `isDenyingTrace` mutant).
- **`PolicyArity.ts`** has no scored mutant (`ignoreStatic`), as before.
- **Not recorded.** The JSONs were not rewritten.

## Checks

All of these ran in the main checkout on the final tree (HEAD 2cd90675), and all passed:

| Check | Result |
| --- | --- |
| `pnpm exec vitest run --project core` | exit 0, 77 files, 2512 tests |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0; `house-style: 539 file(s) clean (3 declared switch(es))`. The only warnings are 2 existing ones in `packages/devtools/test/model/HeldChoice.test.ts` |
| `pnpm circular` | exit 0, no circular dependency |
| `pnpm test:tstyche` | exit 0, 60 files, 313 tests, 38 suppressed matched |
| `pnpm spec:verify:strict` | PASS 21, FAIL 0, SKIP 0 |
| `pnpm spec:examples` | exit 0, 116 blocks compile |
| `pnpm spec:api` | exit 0, 932 exports |
| `node scripts/check-house-style.mjs` | exit 0 |
| `tools/proofs.mjs` | exit 0, "every proof as expected"; the Leaf to Many row now shows `LeafNeeds.ts(165,3)`; `packages/core/src` clean afterwards |

`tools/scan.mjs` exits 1 with three findings. I did not change the checks. Each finding is caused by a review fix:

1. `outside the phase scope: packages/core/test/Decision.test.ts`. This is the mutation-floor test (2cd90675), which the brief required ("kill one with a test if needed"). `isDenyingTrace` belongs in `Decision.test.ts`.
2. `Decision.ts changed the body of const traceChildrenOf =`. This is WR-02: the brief allowed `traceChildrenOf` to change shape, and behaviour is the same for every union tag (`TraceShape.test.ts` unchanged and green).
3. `51-mutation-after.json does not follow the last src commit`. WR-02, IN-02 (comment) and IN-04 (comment) touched `src` after the recorded after-run, and the brief forbids rewriting the mutation JSONs. The fresh run's numbers are under "Mutation".

The other scan checks pass. With IN-06's resolution, the "Policy.ts emits the base's JavaScript" comparison now runs, under TypeScript 6.0.3.

---

_Fixed: 2026-11-16T16:41:12Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
