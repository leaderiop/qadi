---
phase: QD-51-policy-tag-arity-stated-once
reviewed: 2026-11-16T17:10:00Z
depth: standard
iteration: 2
files_reviewed: 19
files_reviewed_list:
  - .changeset/policy-arity-stated-once.md
  - packages/core/src/Decision.ts
  - packages/core/src/Policy.ts
  - packages/core/src/PolicyArity.ts
  - packages/core/test/Decision.test.ts
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
  - .planning/phases/QD-51-policy-tag-arity-stated-once/51-SECURITY.md
  - .planning/phases/QD-51-policy-tag-arity-stated-once/tools/moves.mjs
  - .planning/phases/QD-51-policy-tag-arity-stated-once/tools/mutation.mjs
  - .planning/phases/QD-51-policy-tag-arity-stated-once/tools/proofs.mjs
  - .planning/phases/QD-51-policy-tag-arity-stated-once/tools/scan.mjs
findings:
  critical: 0
  warning: 2
  info: 3
  total: 5
  necessity: 0
status: issues_found
---

# Phase QD-51: Code Review Report (iteration 2)

**Reviewed:** 2026-11-16T17:10:00Z
**Depth:** standard
**Files Reviewed:** 20 (the source, test and spec files of the phase diff, `51-SECURITY.md`, and the four phase tools; `scan.mjs` and `mutation.mjs` were read for the iteration-1 fixes)

## Summary

All ten iteration-1 fixes are in place and none introduced a code defect. I checked each against the source and the recorded evidence, not against the fix report.

**Verified correct**

- **WR-02, the table.** `traceChildrenByArity` is `as const satisfies { readonly [A in Arity]: … }`. It is total over `Arity` by type, with no cast, and `ChildrenOf` ends in `A extends "Many" ? … : never`. The two rows that were ternary arms keep their bodies, so behaviour is identical for every union tag. `TraceShape.test.ts` is unchanged since iteration 1 and is green with `PolicyArity.test.ts` and `Decision.test.ts` (89 tests).
- **Foreign tag.** For `Bogus`, `constructor`, `toString` and `__proto__` the arity read is `undefined`, a function or `Object.prototype`. Each coerces to a key the table lacks, so `undefined(self)` throws a `TypeError` when `foldTreeBy` opens the node, before any child's arm runs. It is fail-closed: it throws and never allows. The differences from the base are in WR-01 and IN-01.
- **IN-01.** I read tstyche 7.2.5's `SuppressedService`. With `checkSuppressedErrors` (default on) the directive needs an argument (`directiveRequires`), allows exactly one error on the line (`onlySingleError`) and requires the message to contain the text (`messageDidNotMatch`). The header is right, and each of the three directives sits on one line with one erroring expression. `PolicyArity.tst.ts` is green (3 suppressed matched).
- **WR-04.** `process.on("exit", restore)`, the signal handlers, the `tick` yield and the per-child `signal` check cover every path I could find that leaves `src` edited. A SIGKILL is declared as uncovered. A caught signal exits 128+n, a child killed by a signal exits 1, and an uncaught throw restores through the `finally`. The `dirty()` check exits 3.
- **WR-03.** The `git apply --check` row requires the `^error: patch failed: packages/core/src/Decision.ts:\d+$` line, so a missing patch no longer passes.
- **IN-06.** `minus` in `mutation.mjs` is a correct multiset subtraction. `compare` on the recorded JSONs still prints "WX-05 holds" (exit 0). `scan.mjs` skips a TypeScript with no `transpileModule`.
- **Numbers.** "8 of 32 caught by existing tests, 32 of 32 by TraceShape, `tsc_exit` 0 on every move and arm row" agree with `base-experiment/moves.tsv` (counted from the file). INV-QD-348's "one test in `Decision.test.ts`" for `Not` Wrapper to Many agrees with its row (`Decision_failed` 1).
- **House rules.** No `as` outside `as const`, no `!`, `any` or `switch`. Imports are namespaces or named. `PolicyArity.ts` imports nothing and is not in the barrel. `node scripts/check-house-style.mjs` is clean (539 files, 3 declared switches) and `scripts/` has no diff from the phase base. `tsc -p tsconfig.test.json` exits 0.
- **New `Decision.test.ts` test.** It can fail: it asserts both guards on an allowing and a denying trace, and the expected pairs are written out, not read from the code.

What remains is one false accepted-risk statement, a proof row that can pass for the wrong reason, and three info items.

## Warnings

### WR-01: `51-SECURITY.md` T-51-09 describes the foreign-tag behaviour of code that no longer exists

**File:** `.planning/phases/QD-51-policy-tag-arity-stated-once/51-SECURITY.md:40` and `:56`
**Issue:** Both T-51-09 entries (the register row, status "closed (accepted; foreign tags throw Match.exhaustive at traceStep)", and the Accepted Risks Log) say a foreign tag "still throws the same `absurd` error at `traceStep`'s `Match.exhaustive` one call later, as on the base". After WR-02 this is false in two ways. I ran both forms:

- Base: `Match.exhaustive` threw `Error: effect/match/Match/exhaustive: absurd`.
- Now: `TypeError: traceChildrenByArity[...] is not a function`. It is raised in `traceChildrenOf` when `foldTreeBy` opens the node (`TreeFold.ts`'s `open`), so `traceStep`'s `Match.exhaustive` is never reached.

The "one call later" also did not describe the base: `traceShapeOf` itself was the `Match.exhaustive`, called from `traceChildrenOf` at open. The mitigation text matched the intermediate `?? Many` fall-through that WR-02 removed. The risk row is a verified security record, and "closed" rests on a mechanism that is gone. The behaviour is still fail-closed and is pinned by `PolicyArity.test.ts` ("a tag outside the union").

**Fix:** Rewrite both entries to the current mechanism, for example:
```
a foreign tag (`Bogus`, `toString`, `constructor`, `__proto__` are pinned in PolicyArity.test.ts) has no
row in `POLICY_ARITY` or in `traceChildrenByArity`, so `foldTrace` throws a TypeError when it opens the node,
before any child's arm runs. The base threw `Match.exhaustive`'s error at the same point; only the error's
class and message differ. It is never an allow.
```
Change the status text to "closed (accepted; foreign tags throw a TypeError at traceChildrenOf, pinned)".

### WR-02: `proofs.mjs`'s runtime-refusal row passes whenever vitest exits non-zero, not only when a test fails

**File:** `.planning/phases/QD-51-policy-tag-arity-stated-once/tools/proofs.mjs:76-77` and `:103-104` (the row at `:43`)
**Issue:** `failing` is `run("vitest", …).status !== 0`. The row "childrenOf arm: AllOf returns none (… Policy.test.ts's lockstep refuses it)" is accepted when `tsc` exits 0 and `failing(...)` is true. A mistyped or moved test path, a vitest crash, a configuration error or a collection error all exit non-zero too. I confirmed it: `vitest run --project core packages/core/test/Nonexistent.test.ts` exits 1. Such a run would be shown as `yes` in the table and copied into the SUMMARY as proof that the lockstep property refuses an empty `Many` arm. It is the same defect as iteration 1's WR-03, one row further down: a check that passes for any failure of the tool it uses.

**Fix:** Require an actual failed test, not just a non-zero exit:
```js
const failing = (test) => {
  const r = run("node_modules/.bin/vitest", ["run", "--project", "core", "--reporter=json", test]);
  try {
    return JSON.parse(r.stdout).numFailedTests > 0;
  } catch {
    return false;
  }
};
```
A path that matches no file then gives no JSON with failed tests, and the row reports `NO`.

## Info

### IN-01: BEH-QD-593 and the changeset say nothing about the error class a foreign tag now raises

**File:** `spec/behaviors/18-explanation.md:523`, `.changeset/policy-arity-stated-once.md:5`, `packages/core/src/Decision.ts:431-433` (and `spec/decisions/164-policy-tag-arity-is-stated-once.md`, which is silent)
**Issue:** The wording "the fold throws on opening it, before any child's arm runs, as the base's `Match.exhaustive` did" is true about when and that it throws. It does not say that the thrown value changed from `Error: effect/match/Match/exhaustive: absurd` to a `TypeError`. The changeset says "No public type, export or outcome changes". `foldTrace` is public and a caller-held trace may carry any tag, so the failure's class and message for such a trace changed. It is a throw both before and after, so the outcome is the same. The guard is also not stated anywhere: no code names this case. It exists because an absent table row is called as a function, so a later `?? "Many"` or an `Object.hasOwn` fallback in `traceShapeOf` would remove it. The pin in `PolicyArity.test.ts` protects that, but the spec does not say what the pin protects.

**Fix:** In BEH-QD-593, replace "as the base's `Match.exhaustive` did" with "at the same point as the base's `Match.exhaustive`; the error is now a `TypeError`, not that match's error, and callers should not rely on its class". Make the same one-clause correction in `traceChildrenOf`'s doc comment.

### IN-02: The IN-04 tstyche line for `Array.of` pins nothing beyond the line above it

**File:** `packages/core/test/PolicyArity.tst.ts:150-151`
**Issue:** The comment says "a fixed-size Many arm's way out: `Array.of(a, b)` is an array, not a tuple", but the assertion is `expect(Array.of<Policy>()).type.toBeAssignableTo<ChildrenOf<"Many", Policy>>()`. `Array.of<Policy>()` has type `Policy[]`, and line 148 already asserts `ReadonlyArray<Policy>` is assignable, so this line cannot fail unless that one does. It does not pin the documented workaround of a call with elements. The claim itself holds, since `Array.of<T>(...items: T[])` returns `T[]`.

**Fix:** Pin the call shape the documentation shows:
```ts
declare const a: Policy;
declare const b: Policy;
expect(Array.of(a, b)).type.toBeAssignableTo<ChildrenOf<"Many", Policy>>();
```

### IN-03: INV-QD-348 says `Decision.test.ts` is "untouched", and the CCR-QD-442 row does not list it

**File:** `spec/invariants.md:4034`, `spec/README.md:379` (the CCR-QD-442 row)
**Issue:** INV-QD-348's Enforcement says `Decision.test.ts` ("`foldTrace` at depth and width, sharing and cycles, INV-QD-090") is "untouched". Commit 2cd90675 added the `isAllowingTrace`/`isDenyingTrace` test to that file. The `foldTrace` tests in it are unchanged, which is probably what is meant, but the file is not. The CCR-QD-442 row lists "the phase's source and tests" and names six files; `packages/core/test/Decision.test.ts` is not among them, and the row's iteration-1 paragraph does not say that WR-02's mutation-floor test was added there. The brief asks that the row list every revision, and a reader of the row cannot learn that this test file changed.

**Fix:** In INV-QD-348 say "its `foldTrace` tests untouched". In the CCR row add `packages/core/test/Decision.test.ts` (one test for the two trace guards, WR-02) to the file list, and bump the revisions the two edits touch.

---

_Reviewed: 2026-11-16T17:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
