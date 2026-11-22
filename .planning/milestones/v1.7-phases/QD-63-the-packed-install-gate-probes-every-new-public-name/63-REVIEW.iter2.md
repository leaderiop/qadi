---
phase: QD-63-the-packed-install-gate-probes-every-new-public-name
reviewed: 2026-11-20T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - scripts/check-package-install.mjs
  - spec/README.md
  - spec/decisions/033-the-packed-artifact-is-the-product.md
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase QD-63: Code Review Report (iteration 2)

**Reviewed:** 2026-11-20
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

I read `git show 81847868 f4398b04` and the current script.

**WR-01 is resolved.** `REFUSED_SHAPE_PROBES` now holds `["DiagnosticsOptions", "schedule"]`, and `TYPE_ONLY_PROBES` holds `GateInstanceLike` and `GateRegistryLike`. The fixture directive text was reworded to `schedule is not an option, a cadence is a number`. The old wording said `Schedule`, and the guard's `includes` is case-sensitive, so the reword was required, and it was done. Deleting the `noSchedule` literal together with its directive now fails `unrefused`. Deleting the typed `gateRegistry` literal fails `untyped`.

**WR-02 is only half resolved.** The code is unchanged, as intended, and the limit is now recorded. The comment's mitigation claim is wrong (see WR-01 below).

**Fix side effects:** no new crash path. The new entries flow through the same `seen`-guarded comparisons, and the load, read and parse failures still go through `fail()`. No new false green was found beyond the lexical acceptances already filed as IN-02. The ADR and README prose now matches the script's lists exactly. The pairings (`DecisionCacheShape`/`getOrCompute`, `DiagnosticsOptions`/`schedule`) and the three type-only names agree. The script's own header was not updated to match (see IN-01 below).

## Warnings

### WR-01: The `shortcut:` comment claims a mitigation that cannot catch the case it names

**File:** `scripts/check-package-install.mjs:870`
**Issue:** The comment reads: "a call written but never run (an uninvoked arrow, a shadowed name) passes here; the probes' own expect() assertions catch a dead probe". That is false for the first case.

- `expect` throws only when it executes (lines 515-519).
- A probe inside an uninvoked arrow has its `expect(...)` calls inside that same arrow. They never run, so the consumer exits 0 and the guard passes.
- A feed call parked in `const _x = () => makeNewFeed();` has no assertion at all.
- Nothing catches a dead probe. Only a probe that runs and gives a wrong answer is caught.

A maintainer who reads the comment will believe dead probes are covered, which is the false assurance the guard exists to remove. The limit itself is acceptable, and the `shortcut:` form is right, but the stated mitigation is not accurate.

**Fix:** State the real limit. For example:

```js
// shortcut: a call that is written but never run (an uninvoked arrow, a shadowed name) passes here, and the probe's expect() calls do not run either; upgrade to reachability analysis (require the call under a `yield*` inside the Effect.runPromise'd generator) if one slips through.
```

Wrap it to the file's roughly 90-column convention. The line is currently about 230 columns.

## Info

### IN-01: The script header and the `REFUSED_SHAPE_PROBES` doc still carry the overstated "directive on another property" claim that the ADR dropped

**File:** `scripts/check-package-install.mjs:65-67` (header), `:96-101` (`REFUSED_SHAPE_PROBES` doc)
**Issue:** `f4398b04` removed this claim from ADR-QD-033 and CCR-QD-454, citing 63-REVIEW IN-01. The script's header says a refusal cannot be "stood in for by a directive on another property". The `REFUSED_SHAPE_PROBES` doc says "a directive on another property would otherwise stand in for it". `holdsDirective` (`:850-860`) is a text match: `startsWith("// @ts-expect-error") && includes(member)`. A directive anywhere in the declaration whose text names the member satisfies it. The guard enforces "a directive naming the member", not "a directive on the member". The code comments now disagree with the prose that was corrected.
**Fix:** Reword both comments to "a directive in the declaration that names the member". Alternatively, attach the check to the `PropertyAssignment` whose `name.text === member`, which makes the old wording true. This is the only prose the script does not back.

---

_Reviewed: 2026-11-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
