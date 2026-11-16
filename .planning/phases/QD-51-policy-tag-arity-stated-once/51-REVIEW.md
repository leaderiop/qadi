---
phase: QD-51-policy-tag-arity-stated-once
reviewed: 2026-11-16T16:25:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - .changeset/policy-arity-stated-once.md
  - packages/core/src/Decision.ts
  - packages/core/src/Policy.ts
  - packages/core/src/PolicyArity.ts
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
  - .planning/phases/QD-51-policy-tag-arity-stated-once/tools/mutation.mjs
  - .planning/phases/QD-51-policy-tag-arity-stated-once/tools/proofs.mjs
  - .planning/phases/QD-51-policy-tag-arity-stated-once/tools/scan.mjs
findings:
  critical: 0
  warning: 4
  info: 6
  total: 10
  necessity: 0
status: issues_found
---

# Phase QD-51: Code Review Report

**Reviewed:** 2026-11-16T16:25:00Z
**Depth:** standard
**Files Reviewed:** 17 (the 14 source, test and spec files plus the three committed phase tools; `moves.mjs` was read for the same restore claim)

## Summary

The core change holds up. I checked it by experiment, not by reading: I copied `packages/core` into the scratchpad, edited the copy, and ran `tsc`. The live tree was untouched.

- **Closure over `Policy["_tag"]`.** A missing tag fails in `childrenOf`'s `satisfies` (TS2741) and in `TagsOfArity`'s default (TS2344). A stray tag fails only in `TagsOfArity`'s default (TS2344), which is where the ADR says it is enforced. `keyof Rec` equal to `Tag` in the tstyche file is a second net.
- **Moves `ChildArms` cannot see.** The only one is Leaf to Many (an empty array is a valid Many). It is caught in `src`, not only in tests: `LeafNeeds.ts`, `Walk.ts`, `Predicate.ts` and `Simplify.ts` all fail.
- **The `{ readonly 0?: never }` trick works.** Removing it makes the tuple negative's `@ts-expect-error` unused (TS2578), so the test does guard it.
- **Emitted `.d.ts`.** It is stable and compiles. `TagsOfArity` and `ArityRecord` are not importable by a consumer (TS2459, because the file ends in `export {}`). Nothing leaks from the root, and the barrel test pins that `POLICY_ARITY` is not exported.
- **`traceShapeOf`.** It matches the base for all 16 tags. All 16 are covered by `TraceShape.test.ts`, which reads no record (`scan.mjs` checks that too).
- **Numbers.** ADR-QD-164's numbers agree with `moves.tsv` (8 of 32 caught by existing tests, 32 of 32 by the table, the three arm edits). They also agree with the mutation JSONs: Decision.ts 162/169 to 160/166, the deleted region with 2 detected and 1 survived, Policy.ts unchanged. Commit hashes resolve.
- **Targeted runs.** `PolicyArity.test.ts`, `TraceShape.test.ts` and `PolicyArity.tst.ts` are green.

The defects are in the evidence layer, not the type machinery. One ADR sentence overclaims against the base. Two tools state guarantees they do not provide. One closed-union dispatch is still non-exhaustive.

## Warnings

### WR-01: ADR-QD-164 says every "experiment, after" edit compiled on the base; three of them did not (or did not exist)

**File:** `spec/decisions/164-policy-tag-arity-is-stated-once.md:134`
**Issue:** The sentence is "On the base every one of these compiled (the matrix of 32 plus the three arm edits)."

The table above it holds record edits. Three rows are "`HasRole` removed", "an unknown tag added" and "an unknown arity word". The base experiment has no row for any of these. It measured 32 moves of `traceShapeOf`'s three lists plus three arm edits, and the base has no record to edit.

The nearest base equivalents do not compile. I took `git archive 8d87d837`, deleted `"HasRole"` from `leafTags`, and ran `tsc`. It fails at `Decision.ts(439,3)` with TS2345, because `Match.exhaustive` leaves `HasRole` unmatched. The ADR's own Context says "a new tag fails to compile everywhere", which contradicts this sentence.

The headline is true: all 32 moves and all 3 arm edits compiled on the base. But a reader takes "every one of these" to mean the table above, and that is not what `moves.tsv` shows. The same wording sits in INV-QD-347 ("all 32 single-tag moves did"). That one is accurate only because it says "moves".

**Fix:** Restate the sentence against the evidence:
```
On the base all 32 single-tag moves of `traceShapeOf` and all three `childrenOf` arm edits compiled
(`base-experiment/moves.tsv`). After, the equivalent record edits (rows 2 to 8) and the two arm edits
fail to compile; the three structural rows (removed, stray tag, unknown word) have no base
counterpart, because the base had no record, and a tag removed from `leafTags` already failed
`Match.exhaustive`. The last row is the one the type was never going to see.
```

### WR-02: A non-exhaustive dispatch on the closed `Arity` union brings back the silent-widening class this phase removes

**File:** `packages/core/src/Decision.ts:423` (also `packages/core/src/PolicyArity.ts:50`)
**Issue:** `traceChildrenOf` dispatches on `Arity` with `shape === "Leaf" ? [] : shape === "Wrapper" ? self.children.slice(0, 1) : self.children`. The last arm is an unconditional else. `ChildrenOf` has the same shape: its final branch is `ReadonlyArray<Child> & {…}` with no `A extends "Many"` guard.

A fourth `Arity` word, for example `"Pair"`, therefore compiles everywhere and `foldTrace` silently hands such a node every child. That is the "fold that silently drops or invents a child" that `PolicyArity.ts`'s header promises cannot happen. AGENTS.md §5a requires an `never`-guarded or `Match` dispatch for exactly this reason, and says to widen a closed union as a full union with every reader updated.

The base had the same ternary over `TraceShape`, and D-04 says the runtime is unchanged. So this is not a regression. But `Arity` is now the shared type, and its readers are not exhaustive over it. The plan's own proofs do not exercise adding an arity word (only an unknown one), so nothing would catch it.

**Fix:** Keep the runtime behaviour and make the dispatch total by type:
```ts
const CHILDREN_BY_ARITY: { readonly [A in Arity]: (self: Trace) => ReadonlyArray<Trace> } = {
  Leaf: () => [],
  Wrapper: (self) => self.children.slice(0, 1),
  Many: (self) => self.children,
};
const traceChildrenOf = (self: Trace): ReadonlyArray<Trace> =>
  CHILDREN_BY_ARITY[traceShapeOf(self.policyTag)](self);
```
In `ChildrenOf`, write the last branch as `A extends "Many" ? … : never`. Add a tstyche line showing that a fourth word is refused somewhere.

### WR-03: `proofs.mjs`'s first row passes on any `git apply` failure, so it cannot fail for the reason it claims

**File:** `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/proofs.mjs:72-78`
**Issue:** The row "the base experiment's patch cannot be applied" sets its pass condition to `apply.status !== 0`. A missing patch file, a wrong working directory, a corrupt patch or a git error all give a non-zero status, and all count as "as expected". The claim is that the edit no longer applies because its list is deleted (ADR §"The experiment, after", SUMMARY row 1). Only the printed first stderr line, which a human has to read, shows why.

The patch is also not in the same place as the other rows' evidence: it is the one row that never runs `tsc`. A stronger check is available, because `proofs.mjs` already restores the file afterwards.

**Fix:** Pin the reason, not just the status:
```js
const apply = cp.spawnSync("git", ["apply", "--check", patch], { encoding: "utf8" });
const reason = /patch failed: packages\/core\/src\/Decision\.ts/.test(apply.stderr);
row("the base experiment's patch (Not under Many in Decision.ts)", "-",
    `git apply --check exit ${apply.status}: ${apply.stderr.split("\n")[0].trim()}`,
    apply.status !== 0 && reason);
```
Also assert that `patch` exists first.

### WR-04: `proofs.mjs` and `moves.mjs` claim to restore on Ctrl-C, but their SIGINT handlers cannot run, and SIGTERM and SIGHUP are not handled

**File:** `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/proofs.mjs:52`, `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/moves.mjs:75` (header comment at line 6)
**Issue:** Both tools run `tsc` and `vitest` through `spawnSync`. A synchronous child call blocks the event loop, so a `process.on("SIGINT", …)` handler is never delivered until the script ends. I reproduced it: a script with such a handler and three `spawnSync("sleep", ["1"])` calls ignored `kill -INT`, ran all three steps, finished with exit 0, and never printed from the handler.

Consequences:
- The "restores every file it edits (also on Ctrl-C)" comment in `moves.mjs` is false. The handler is dead code.
- With Ctrl-C from a terminal, the child `tsc` or `vitest` gets the signal and dies. The script keeps going and prints rows with `tsc exit null`, and `proofs.mjs` prints spurious "NO" rows. It does not abort.
- A SIGTERM, SIGHUP (terminal closed) or a harness timeout leaves `Policy.ts` or `PolicyArity.ts` modified on disk. The next run refuses (exit 2, "not clean"), so there is no silent corruption, but a human must `git checkout` the file. The `finally` does not run on a signal kill.

**Fix:** Either drop the Ctrl-C claim and the dead handler, or make the restore real. Use `spawn` with async awaiting so the handler can run, or add `process.on("exit", restore)` plus handlers for SIGTERM and SIGHUP that call `restore()` synchronously. A synchronous `exit` listener does run on `process.exit()`, so wire the restore there. Say in the header that a hard kill needs `git checkout -- packages/core/src`.

## Info

### IN-01: The text after `@ts-expect-error` in the tstyche negatives is decorative; the directive passes for any error on that line

**File:** `packages/core/test/PolicyArity.tst.ts:123`, `129` and `136`
**Issue:** The directives read `// @ts-expect-error is not assignable to type 'never'` and so on. TypeScript ignores the trailing text. Neither `tsc` nor tstyche checks it, so each directive would pass for an unrelated error on the same line, such as a typo in `Moved<…>`. The header comment ("a checked `@ts-expect-error`") and BEH-QD-592 ("checked `@ts-expect-error` negatives") read as if the message were pinned.

It is mitigated: each negative has a positive control (the "arm as written is accepted" test, and the two directions together). I confirmed that removing `& { readonly 0?: never }` makes the first directive unused (TS2578). `proofs.mjs` does check the message against the real source. It is not a defect today, but the comment overstates the check.

**Fix:** Say "the directive consumes any error; the message is a note" in the header. Or pin the message with tstyche's `expect(...).type.toRaiseError("…")` for the three cases.

### IN-02: `POLICY_ARITY[tag]` is an unguarded own-property read, so a foreign tag falls through to Many and no test pins it

**File:** `packages/core/src/Decision.ts:413`
**Issue:** For a tag outside the union, which a hand-built `Trace` can carry, the base's `Match.exhaustive` threw at once. Now `POLICY_ARITY[tag]` returns `undefined`, or an inherited member for `"constructor"`, `"toString"` or `"__proto__"`. `traceChildrenOf` then falls to the Many branch and folds the foreign node's whole child subtree. The `MatchError` comes only when `traceStep` runs, one call later. A hostile foreign node with a cyclic or shared child can therefore raise a different error first.

The outcome is still a throw, never an allow. The plan accepted it as T-51-09, and RESEARCH Q5 probed five names. That probe is not a committed test, so the behaviour is unpinned, unlike every other tag. The sibling pattern in `FieldLattice.ts` reads its table through `Object.hasOwn` with a fail-closed row, as AGENTS.md §5a describes.

**Fix:** Either pin it with a test ("a foreign tag still throws `MatchError`, before any child's arm runs"), or read the record through a guard such as `Object.hasOwn(POLICY_ARITY, tag) ? POLICY_ARITY[tag] : undefined` and throw there. The second keeps the base's fail-early behaviour.

### IN-03: `PolicyArity.test.ts` has one assertion that cannot fail and two that couple to unrelated output shape

**File:** `packages/core/test/PolicyArity.test.ts:101`, `144`, `153-161`
**Issue:**
- Line 101: `assert.include(["Leaf", "Wrapper", "Many"], POLICY_ARITY[tag], tag)` can never fail at runtime. `as const satisfies … Arity` already forbids any other word at compile time, and a wrong-but-valid word is caught by the readers' lockstep, not here.
- Lines 144 and 153-161: `renderTrace`'s expected string hard-codes the `✓` glyph. The `diffTraces` expectation lists `label`, `beforeReason` and `afterReason` as explicit `undefined`, which `deepStrictEqual` distinguishes. The first RED expectation was wrong for exactly this reason (the 74917a4d deviation). A later change to the check mark, or to `diffTraces` omitting absent keys, fails these 32 tests with no arity involved.

**Fix:** Drop the line-101 assertion, since the type owns it. For render and diff, assert only the arity-relevant fact: the number of rendered child lines, and that `diffTraces(...)[0].path` equals `[0]` with `verdict` before and after matching `before` and `after`.

### IN-04: The Many type refuses every fixed-length array literal, which a future Many tag will meet as an opaque error

**File:** `packages/core/src/PolicyArity.ts:50-53`
**Issue:** `ReadonlyArray<Child> & { readonly 0?: never }` rejects any array literal with a first element. That is the intent for `[p.policy]`. But a future Many tag with fixed children, for example a binary `Xor` returning `[p.left, p.right]`, fails with "not assignable to type 'never'". The `PolicyArity.tst.ts` case `readonly [Policy, Policy]` not assignable to Many documents this limit. The error text names neither Many nor the tag, and the workaround (a spread or a non-literal array) appears nowhere.

**Fix:** Add one sentence to the `ChildrenOf` doc comment and to BEH-QD-592: "a Many arm returning a literal needs a non-literal array, e.g. `Array.of(a, b)`".

### IN-05: ADR-QD-164 and the proof table cite a test file as the reader that refuses Leaf to Many; the `src` readers refuse it first

**File:** `spec/decisions/164-policy-tag-arity-is-stated-once.md:93` and the proof table row for Leaf to Many; `proofs.mjs:36`
**Issue:** I made the `HasRole: "Many"` edit in the copy. It fails first in `src`: `LeafNeeds.ts(165,3)` TS2353, `Policy.ts(1187,3)` for `leafCases`, `Predicate.ts(395,75)`, `Walk.ts(323,28)` and `Simplify.ts(100,7)`. It fails in tests afterwards. The ADR and the SUMMARY cite only `Policy.test.ts(1045,52)`, because the proof prints `errors[0]` under `"any"`, and that line comes from the test graph. A reader concludes the refusal depends on a test file. A `tsc -p tsconfig.build.json` of `src` alone refuses it as well, and that is the stronger fact.

**Fix:** Cite `LeafNeeds.ts` (keyed by `LeafPolicy["_tag"]`) and `Walk.ts` as the readers. Make the proof row's expectation a message fragment from `src` (for example `"'HasRole' does not exist in type"`) rather than `"any"`.

### IN-06: Tooling brittleness: a hard-coded TypeScript path, a dead fallback branch, and survivor identity that is a set, not a multiset

**File:** `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/scan.mjs:133`, `scan.mjs:119-121`, `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/mutation.mjs:44-45`
**Issue:**
- `scan.mjs` requires `./node_modules/.pnpm/typescript@6.0.3/node_modules/typescript`. A dependency bump makes the whole "Policy.ts emits the base's JavaScript" check report a missing install, not the actual comparison.
- `scan.mjs` keeps an "A1 fallback" branch for an import that was never taken (`polImport`). It is dead and only widens what the scan accepts.
- `mutation.mjs compare` computes `added` and `gone` with `includes`, so two textually identical survivors (same mutator, replacement, mutated text and line text) count as one. A second identical survivor in the after-run would not be reported as new.

All three hold today, so the phase's evidence is intact. They would hide a regression.

**Fix:**
- Resolve TypeScript with `createRequire(...).resolve("typescript")`.
- Delete the fallback branch.
- Compare survivors as multisets, counting identities.

---

_Reviewed: 2026-11-16T16:25:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
