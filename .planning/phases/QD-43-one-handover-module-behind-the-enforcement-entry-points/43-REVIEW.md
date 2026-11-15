---
phase: QD-43-one-handover-module-behind-the-enforcement-entry-points
reviewed: 2026-11-15T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - packages/core/src/Handover.ts
  - packages/core/src/Qadi.ts
  - packages/core/test/Handover.test.ts
  - packages/core/test/Qadi.test.ts
  - packages/core/test/Qadi.tst.ts
  - packages/promise/src/index.ts
  - packages/promise/test/Facade.tst.ts
  - packages/promise/README.md
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
  necessity: 0
status: issues_found
---

# Phase 43: Code Review Report

**Reviewed:** 2026-11-15
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

The new `Handover.ts` and the ten adapters in `Qadi.ts` were checked against the base `Qadi.ts` (`712317c1`).

- **Discharge and denial.** `discharge` is moved unchanged. The deny and allow branches match the old `permitted` and `decideOne`: a denial becomes `AccessDenied` or a dropped item, an allow discharges before anything is released, and a binding obligation with no handler still fails with `UndischargedObligation` before release.
- **Decided value equals handed-over value.** For `guard`, `enforceLoaded`, `enforceProjectedLoaded` and the four `filter*` forms, `decidedOn` writes the positional value last, after stripping any runtime `resource`. `enforceProjected` now decides through `resourceFree`, so a runtime `resource` can no longer reach its decision. That closes the INV-QD-108 hole it had on the base.
- **Array and stream agreement.** All four collection forms go through one `handOver` and one `RELEASE` table. Only the collector differs: `keptInOrder` for the arrays, `Stream.filterMap` for the streams. Nothing diverges.
- **Facade.** The `@qadi/promise` facade stays branch-free.

I found no correctness, security or fail-closed defect. `tsc -p packages/core` is clean, and `tstyche` passes both `Qadi.tst.ts` and `Facade.tst.ts` (12 tests, 45 assertions). I did not run the vitest suites or the stryker/merge gate.

The one real weakness is that the facade's "refusal" of `resource` is only an excess-property check. It does not stop a non-literal options value from carrying a `resource` that is then silently dropped. The rest are naming and documentation drift.

## Warnings

### WR-01: `@qadi/promise` `filter`/`filterProjected` only refuse a literal `resource`; a typed variable still compiles and the resource is silently dropped

**File:** `packages/promise/src/index.ts:157` and `:197` (also the claim in the doc comments at `:147-151` and `:189-191`, and `packages/promise/test/Facade.tst.ts:27-33`)
**Issue:** The phase goal is that a second resource cannot be written and is no longer silently dropped. Core achieves this with `HandoverOptions`, whose `resource?: never` rejects any value that carries `resource`. The facade uses `Omit<FacadeOptions, "resource">`, which is weaker.

`Omit` removes the key from the target type. It does not forbid the key on the source. TypeScript rejects `{ resource: x }` only as an excess property on a fresh object literal. A `FacadeOptions`-typed variable is structurally assignable to `Omit<FacadeOptions, "resource">`, so this compiles:

```ts
declare const opts: FacadeOptions; // legitimately has `resource`, e.g. shared with `check`
qadi.filter(subject, policy, items, opts); // compiles; core then drops opts.resource at runtime
```

That is the silent-drop shape the phase set out to remove. Two further problems follow:
- The doc comments say "`options.resource` does not exist here (it is `Omit`ted)". That is true only for literals.
- `Facade.tst.ts` passes only because its negative cases are object literals. It pins the weak form, not the guarantee its header claims.

D-02 and the existing `projected` method both specify `Omit`, so this is consistent with the locked decision. It still delivers less than core's refusal.

**Fix:** Make the facade's option type refuse the key, as core does. For example, in `index.ts`:
```ts
type HandoverFacadeOptions = Omit<FacadeOptions, "resource"> & { readonly resource?: never };
// filter / filterProjected (and projected) take `options?: HandoverFacadeOptions`
```
Then add a tstyche negative that passes a `FacadeOptions`-typed variable (`declare const opts: FacadeOptions`) as well as the literal. If keeping `Omit` is a deliberate D-02 trade-off, reword the docs to say "refused as a literal" and note the variable case, so the claim matches the type.

## Info

### IN-01: `Handover.ts` reuses the names `Verdict` and `Admitted`, which already mean something else in `@qadi/core`

**File:** `packages/core/src/Handover.ts:159-171`
**Issue:** `Verdict` is already the closed `"Held" | "NotHeld" | …` type in `Compare.ts`. It is public through `Matcher.ts`, and `Walk.ts` and `Matcher.ts` use it. `Admitted` is already a class in `Admission.ts`, used by `Predicate.ts`. Handover's `Verdict`/`Admitted`/`Refused` are different types. They are package-private, so there is no compile clash. A reader grepping `Verdict` or `Admitted` in `packages/core/src` now lands on two unrelated concepts. This is the same grep-lands-on-two-exports confusion AGENTS.md §8 documents for `…Refused`.
**Fix:** Rename the handover pair to something unambiguous, for example `HandoverVerdict` with `Released`/`Withheld`, or `Admit`/`Deny`-free names. Keep the `_tag` union closed.

### IN-02: `Handover.test.ts` header contradicts the file

**File:** `packages/core/test/Handover.test.ts:3-18` and `:571-585`
**Issue:** The header says three things that the last `describe` falsifies:
- "this file reaches all of them through the public `Qadi.*` surface only … a test that imported it would pin its shape".
- "the module that will sit behind them" is written as a future module, though it now exists.
- "Every case is green on the base … except the one named defect case". The file also imports `verdictOf` from `../src/Handover.ts`, which does not exist on the base, so the whole file fails to compile there, not one case.

The trailing comment admits the direct import.
**Fix:** Reword the header: "all but the last `describe` go through the public surface; the last reads `verdictOf` directly, because no entry point reports the verdict's tag". Drop "will sit behind" and the "green on the base except one" claim, or limit it to the cases that actually run on the base.

### IN-03: `resourceFree` doc overstates its monopoly

**File:** `packages/core/src/Handover.ts:214-221`
**Issue:** The doc says `resourceFree` and `decidedOn` are "the only place a resource enters or leaves enforcement options". `assert` and `enforce` deliberately pass `options.resource` straight to `ask`, per D-03, without either helper. The claim is true for the value-handing entry points only. A later reader trusting it could assume `enforce` is also scrubbed.
**Fix:** Say "the only place the value-handing entry points' options gain or lose a resource; `assert` and `enforce` keep `options.resource` by design (D-03)".

### IN-04: Ordering test relies on wall-clock, and `guard`'s arrow formatting is irregular

**File:** `packages/core/test/Handover.test.ts:431-445`; `packages/core/src/Qadi.ts:266-279`
**Issue:**
- **Wall-clock test.** "released order is input order under concurrency: unbounded" uses `it.live` and a real `Effect.sleep("30 millis")`. AGENTS.md §10 and §6 prefer `TestClock` for determinism. The assertion is correct for any scheduling, but the test only discriminates completion order from input order if the 30 ms gap is honoured. A heavily loaded CI runner can degrade it to a vacuous pass. A latch (`Deferred`) that releases the fast items first would make the "slowest discharges first" premise exact.
- **Formatting.** `guard`'s `=>` is followed by a bare `{` at column 2, outside the surrounding indentation. It is harmless but reads as a mis-wrap next to the hand-wrapped neighbours.

**Fix:** Gate the first item's handler on a `Deferred` that the other items' handlers complete. Re-indent the `guard` body to match its siblings.

---

_Reviewed: 2026-11-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
