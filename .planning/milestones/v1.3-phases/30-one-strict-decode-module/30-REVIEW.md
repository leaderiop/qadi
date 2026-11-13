---
phase: 30-one-strict-decode-module
reviewed: 2026-11-12T00:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - packages/core/src/JsonShape.ts
  - packages/core/src/DecodeDepthGuard.ts
  - packages/core/src/UntrustedDecode.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/src/FieldPath.ts
  - packages/core/src/Policy.ts
  - packages/core/src/PortWireEncode.ts
  - packages/core/src/PortRemote.ts
  - packages/core/src/HydrationMetrics.ts
  - packages/core/src/Errors.ts
  - packages/core/src/index.ts
  - packages/core/test/UntrustedDecode.test.ts
  - packages/core/test/UntrustedDecode.tst.ts
  - packages/core/test/UntrustedSeams.test.ts
  - packages/core/test/DecodeDepthGuard.test.ts
  - packages/audit/src/AuditArchive.ts
  - packages/audit/src/AuditEntry.ts
  - packages/react/src/HydrationEngine.ts
  - packages/react/src/HydrationEvent.ts
  - packages/react/src/DeveloperSignals.ts
  - packages/devtools/src/model/ExplorerSession.ts
  - packages/devtools/src/model/SimulationForm.ts
  - scripts/check-house-style.mjs
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
  necessity: 1
status: issues_found
---

# Phase 30: Code Review Report

**Reviewed:** 2026-11-12
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Iteration 3 (the last of the auto fix loop). Scope: the two iteration-2 fix commits (`1358a661`, `4aa9b56d`) on top of the already-reviewed phase diff.

**Both iteration-2 findings are resolved in source.**

- **IN-02 (duplicate `isPlainObject`) resolved.** `JsonShape.ts` is an import-free leaf holding the one predicate. `DecodeDepthGuard.ts:15`, `UntrustedDecode.ts:28`, `SinkCodec.ts:79` and `FieldPath.ts:40` import it. `FieldPath.ts`'s copy and `DecodeDepthGuard.ts`'s export are deleted. The only remaining same-named predicate is `JsonHazard.ts:68`, which is a different check (a prototype test). `JsonShape.ts` is not in the barrel. ADR-QD-143 (rev 1.2) and the `UntrustedDecode.ts` header match the real import list. `DecodeDepthGuard.ts` is again the depth walk only, so its header and the AGENTS.md budget row are accurate. No cycle: the leaf has no imports.
- **IN-01 (unreachable `String(error)`) resolved.** `UntrustedDecode.ts:199-202` now falls back to a constant, so the `SyntaxError: ` prefix can no longer reappear. The comment states why the arm exists.

Checks run by the reviewer: `node scripts/check-house-style.mjs` is clean (465 files). Vitest over `UntrustedDecode`, `UntrustedSeams`, `SinkCodec` and `FieldPath` (core) passed, 253 tests. Stryker was run on both touched files (commands in the findings). No source was modified.

The fixes introduce no behavioural defect. The one real finding is the WX-05 mutation-score drop the orchestrator observed, which I reproduced and traced to equivalent mutants.

## Warnings

### WR-01: `DecodeDepthGuard.ts` mutation score fell from 94.74 to 92.59 (WX-05)

**File:** `packages/core/src/DecodeDepthGuard.ts:22-24`
**Issue:** Reproduced with `pnpm exec stryker run --mutate packages/core/src/DecodeDepthGuard.ts --reporters clear-text` (the root `stryker.config.mjs` is `@qadi/core`'s). The result is 24 killed, 1 timeout, 2 survived, 0 no-coverage, so 25/27 = 92.59. The baseline in `30-mutation-base.json` is 0.9473684 (= 18/19).

The two survivors are both in the loop head, and both are **equivalent mutants**. No test can kill them:

1. `22:10 EqualityOperator`: `while (stack.length > 0)` to `while (stack.length >= 0)`. On an empty stack `stack.pop()` returns `undefined`, and the very next line (`if (frame === undefined) break;`) exits the loop. The observable result is identical, which is why all 312 covering tests pass.
2. `24:9 ConditionalExpression`: `if (frame === undefined) break;` to `if (false) break;`. The line is only reachable while `stack.length > 0`, so `frame` is never `undefined`. The line exists only to narrow `Array.prototype.pop()`'s `T | undefined` under `noUncheckedIndexedAccess`. The `if` is dead at runtime, so removing it changes nothing.

Why the score dropped: the commit that moved `isPlainObject` out (`1358a661`, and `22d2f24d` before it) took about eight well-killed predicate mutants out of this file. The two equivalent survivors, which were already there, now weigh more of the total. `JsonShape.ts` scores 100.00 on its own, so the combined score across the two files did not fall. The per-file rule does, though. WX-05 says close a drop with a test, and no test is possible here. The honest close is to delete the equivalent mutants by restructuring the loop. Re-baselining is not allowed.

**Test that would kill them:** none exists. Both are equivalent. The existing property and boundary tests in `UntrustedDecode.test.ts` ("is TooDeep exactly when exceedsJsonDepth..." and the 255/256/257/258 draws) already kill every non-equivalent mutant in the file.

**Fix:** Fold the `undefined` narrowing into the loop head, so there is no separate length test and no unreachable guard. No `as` or `!` is needed.

```ts
for (let frame = stack.pop(); frame !== undefined; frame = stack.pop()) {
  if (frame.depth > maxDepth) return true;
  if (Array.isArray(frame.value)) {
    for (const item of frame.value) stack.push({ value: item, depth: frame.depth + 1 });
  } else if (isPlainObject(frame.value)) {
    for (const key of Object.keys(frame.value)) {
      stack.push({ value: frame.value[key], depth: frame.depth + 1 });
    }
  }
}
return false;
```

Every mutant this form creates is killable by the existing suite. `frame !== undefined` to `true` makes `frame.depth` throw a `TypeError` once the stack drains, which any non-too-deep decode hits. To `false` skips the walk, so every TooDeep test fails. The operator and block mutants fail the same tests. I did not run Stryker on this form, because the review is read-only. The fixer should re-run the single-file Stryker command above and confirm the file is at or above 94.74.

## Info

### IN-01: `UntrustedDecode.ts`'s constant `"not JSON"` arm, and a thin mutation margin

**File:** `packages/core/src/UntrustedDecode.ts:199-202`
**Category:** necessity
**Issue:** Reproduced with `pnpm exec stryker run --mutate packages/core/src/UntrustedDecode.ts --reporters clear-text`: 90.32 (28 killed, 2 survived, 1 no-coverage). The floor for a new file is 0.9, since the file has no baseline entry. The margin is under a third of a point, so any one further survivor in this file breaches the floor.

The three non-killed mutants:

- `202:90 NoCoverage` is the `"not JSON"` literal turned into `""`. This is the arm the fixer added.
- `179:5` has two survivors, `true && isPlainObject(input)` and `unwalked.size >= 0 && ...`. Both are equivalent. `unwalked.size > 0` is only a fast path, and with an empty set `Object.fromEntries(Object.entries(input).filter(...))` produces a copy that behaves identically. These existed before the iteration-2 commits.

Is the constant arm the cleanest cast-free option? Yes among the forms that stay on `Result.try({ try, catch })`, but it is not the only form and it has a known cost. A `catch` binding is `unknown`, so any message read needs a narrowing, and a narrowing is a branch. I checked the alternatives:

- `Result.try(() => JSON.parse(text))` (the single-argument overload) has error type `unknown`, so it needs the same narrowing downstream.
- `String(error)` is arm-free but brings the `SyntaxError: ` prefix back (WR-01 of iteration 1).
- Routing through `Schema.fromJsonString(Schema.Unknown)` is arm-free and cast-free. It changes the `NotJson` message to the schema issue's text, which breaks the three pins that assert the exact `JSON.parse` message. It is also a second parse path in a module whose point is one. Rejected.

So no form has zero branches. Keeping the arm is acceptable. If the 0.9 margin matters, the arm can be made killable instead of unkillable: a test that stubs the parser to throw a non-`Error` and asserts the constant message. For example, in `UntrustedDecode.test.ts`, spy `JSON.parse` to `throw "boom"` and assert `decodeText("{}")` fails with `NotJson` and `message === "not JSON"`, then restore the spy. That covers line 202 and kills the literal mutant. It does assert on an arm the comment calls unreachable, which is why this is Info and judgment-based, not a requirement. The `UntrustedDecode.ts` comment ("cannot be reached") and a covering test would then disagree, so reword it to "a defensive arm" if the test is added.

Separately, `packages/devtools/src/model/SimulationForm.ts:64-70` (`parseJson`) still uses `String(error)` and says in its doc comment that only a `SyntaxError` is thrown. That is a different seam. It builds a `refused(...)` string, not the decoder's `NotJson`, so the prefix behaviour is not pinned the way WR-01 pinned it. Noted for consistency only, not a defect.

**Fix:** Keep as is, or add the stubbed-parser test above. No source change is required.

---

_Reviewed: 2026-11-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
