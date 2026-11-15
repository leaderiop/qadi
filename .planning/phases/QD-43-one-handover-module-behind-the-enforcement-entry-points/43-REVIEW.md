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
  warning: 0
  info: 4
  total: 4
  necessity: 0
status: issues_found
---

# Phase 43: Code Review Report

**Reviewed:** 2026-11-15
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

Iteration 2 of the `--auto` fix loop. The iteration-1 warning WR-01 is fixed. Four Info items from iteration 1 remain; none is a defect.

**WR-01 verified against the source, not the commit message.**
- `packages/promise/src/index.ts:80` defines `HandoverFacadeOptions = Omit<FacadeOptions, "resource"> & { readonly resource?: never }`. It is used on `filter` (`:164`), `projected` (`:185`) and `filterProjected` (`:204`). `check`, `decide` and `assert` keep `FacadeOptions`, as D-03 requires.
- `exactOptionalPropertyTypes` is on (`tsconfig.base.json:27`). So `resource?: never` accepts only an absent key. A `FacadeOptions`-typed variable, whose `resource?: Resource` is not assignable to `never`, is now rejected, and so is a literal. Without that flag the `| undefined` would have let an explicit `undefined` through, which is harmless.
- The implementation bodies (`:250-255`) destructure `{ signal, ...options }` and pass `options` to core. This type-checks, and the facade stays branch-free per AGENTS.md §14.
- `Facade.tst.ts:33-40` adds negatives for `filter`, `filterProjected` and `projected` that pass a `declare const withResource: FacadeOptions`. The controls at `:43-49` (no options, `{ concurrency: 2 }`) show the negatives are not refusing everything.
- Run: `tstyche packages/promise/test/Facade.tst.ts` passes (10 assertions). `tsc -p packages/promise --noEmit` is clean.
- The docs (`index.ts:66-69,75-79`, README) now match the type. The non-exported alias appears in the exported `Qadi` interface; a same-module alias is legal under declaration emit. I did not check the emitted `.d.ts`: my emit attempt failed with TS5011 (rootDir not set).

No new defects were found in the iteration-2 diff. The remaining files are unchanged since iteration 1, and the Info items below are restated.

I did not run the vitest suites or the stryker/merge gate.

## Info

### IN-01: `Handover.ts` reuses the names `Verdict` and `Admitted`, which already mean something else in `@qadi/core`

**File:** `packages/core/src/Handover.ts:159-171`
**Issue:** `Verdict` is the closed `"Held" | "NotHeld" | …` type in `Compare.ts`, used by `Walk.ts` and `Matcher.ts`. `Admitted` is a class in `Admission.ts`. Handover's `Verdict`/`Admitted`/`Refused` are different types. They are package-private, so nothing clashes at compile time, but a grep for either name lands on two unrelated concepts.
**Fix:** Rename the handover pair, for example `HandoverVerdict` with `Released`/`Withheld`. Keep the `_tag` union closed.

### IN-02: `Handover.test.ts` header contradicts the file

**File:** `packages/core/test/Handover.test.ts:3-18` and `:571-585`
**Issue:** The header says the file reaches the entry points through the public `Qadi.*` surface only. It also calls the handover module one "that will sit behind them", although it now exists. The last `describe` imports `verdictOf` from `../src/Handover.ts` directly. The header's claim that every case is green on the base except one also fails: the file does not compile on the base, because `verdictOf` is absent there.
**Fix:** Reword the header. All but the last `describe` use the public surface; the last reads `verdictOf` directly because no entry point reports the verdict's tag. Drop "will sit behind" and the "green on the base" claim.

### IN-03: `resourceFree` doc overstates its monopoly

**File:** `packages/core/src/Handover.ts:214-221`
**Issue:** The doc says `resourceFree` and `decidedOn` are "the only place a resource enters or leaves enforcement options". `assert` and `enforce` pass `options.resource` straight to `ask` by design (D-03).
**Fix:** Say "the only place the value-handing entry points' options gain or lose a resource; `assert` and `enforce` keep `options.resource` by design (D-03)".

### IN-04: Ordering test relies on wall-clock, and `guard`'s arrow formatting is irregular

**File:** `packages/core/test/Handover.test.ts:431-445`; `packages/core/src/Qadi.ts:266-279`
**Issue:** "released order is input order under concurrency: unbounded" uses `it.live` and a real `Effect.sleep("30 millis")`. It is correct for any scheduling, but it can pass vacuously on a loaded runner. AGENTS.md §6/§10 prefer `TestClock` or a latch. Separately, `guard`'s `=>` is followed by a bare `{` outside the surrounding indentation.
**Fix:** Gate the slow item's handler on a `Deferred` that the other items complete. Re-indent the `guard` body.

---

_Reviewed: 2026-11-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
