---
phase: 24-simulation-source-preparation
reviewed: 2026-11-11T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - .changeset/simulation-source-preparation.md
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/model/SimulationSource.ts
  - packages/devtools/src/react/Simulator.tsx
  - packages/devtools/test/model/SimulationSession.test.ts
  - packages/devtools/test/model/SimulationSource.prepare.test.ts
  - packages/devtools/test/surface.tst.ts
  - spec/README.md
  - spec/behaviors/29-devtools-simulator.md
  - spec/decisions/050-a-simulation-is-sealed.md
  - spec/decisions/index.yaml
  - spec/devtools-spec/02-screens.md
  - spec/overview.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 0
  info: 6
  total: 6
  necessity: 0
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Re-review after iteration 1. Both warnings from the previous review are fixed correctly and I found no regression.

**WR-01 (commit 1ad24867) is fixed.** `runEffect` now does `retire(); const mine = generation; yield* reap(); if (mine !== generation) return;`. Everything that matters is read after that last yield: `draft`, `sourceChoice`, `ports`, `capture`, `clock` and `pairs`. `prepareSource` is called after the yield too. A command that bumps `generation` during teardown (`setPorts` while `Running`, `choosePolicy`, `seed`/`replay`, `dispose`, or a newer `run`) now makes the older `runEffect` return instead of starting.

I checked each superseding command for a run left stuck in `Running`. `choosePolicy`, `reseed` and `setPorts` (when `Running`) set `Idle`. `dispose` sets `Idle` only if it was `Running`, otherwise the old `Ran`/`Broke` result stays, which is correct. A newer `run` owns the state itself. Commands that do not bump the generation (`setPorts` when not `Running`, `chooseSource`, `setClock`, `edit`) are read fresh after the yield, so the run uses the new values. That is what we want.

The new TestClock test passes. On the pre-fix ordering the second run would continue with the old recorder and write `capture`, so the test discriminates. The two test files pass (75 tests) and `tsc --noEmit -p packages/devtools` is clean.

The fix also closes the logged "replay/seed during `reap`" window. A replay now yields `Idle` deterministically. That leaves two stale artifacts, IN-04 and IN-06 below.

**WR-02 (commit 5977264c) is fixed.** `SOURCE_ORDER = Object.values<SourceChoice>({...} satisfies { readonly [K in SourceChoice]: K })`. I checked it with a scratch compile. A missing key gives TS2741, an extra or duplicate key gives TS2353, and a wrong value gives TS2322. So the doc comment's "TS2741" is accurate. Display order is property insertion order, which is guaranteed for non-integer string keys. `prepareSource` behaviour is unchanged.

IN-01 to IN-04 from the previous review still hold, with IN-04 changed (see below). Two new Info items follow.

No necessity findings. I did not load `necessity-review.md`, since none of the findings rest on that category.

## Info

### IN-01: `build()` constructs and discards a recorder on every commit while Live is chosen

**File:** `packages/devtools/src/model/SimulationSession.ts:276` (with `SimulationSource.ts:236-239`)
**Issue:** `build()` runs on every `commit()` and calls `prepareSource`. For a chosen `Live` that calls `ready()` and so `capturing(ports)` (five fresh maps plus a `decoratePorts` layer). `build()` uses only `options`, the refusal and `prepared.source`'s tag. The recorder and `captured` are thrown away. Nothing leaks or does I/O because layers are lazy, so this is wasted work, not a bug.
**Fix:** Split out a cheap `describeSources(have)` for `options` and the refusal, and keep `ready()` for the run path. Or accept the cost.

### IN-02: The CCR-QD-414 register row cites a stale revision for `spec/README.md`

**File:** `spec/README.md:352`
**Issue:** The row says `spec/README.md` Rev 1.148, but the header is Rev 1.149 (the second commit corrected the mutation comparison and bumped it).
**Fix:** Change the row to Rev 1.149, or word it as "added at Rev 1.148".

### IN-03: `Ready` is spelled twice

**File:** `packages/devtools/src/model/SimulationSession.ts:347` (and `SimulationSource.ts:186`)
**Issue:** `SimulationSource.ts` has a private `type Ready = Extract<PreparedSource, { readonly _tag: "Ready" }>`. `program`'s parameter in the session spells the same `Extract<...>` inline.
**Fix:** Export the type from `SimulationSource.ts` (not from `index.ts`) and use it in `program`.

### IN-04: The "replayed while that run was starting" test still accepts either outcome, but only one can now occur

**File:** `packages/devtools/test/model/SimulationSession.test.ts:466-467`
**Issue:** The assertion `after.run._tag === "Idle" || after.stale` and the comment "Either the run was dropped, or it is shown as answering another question" were written for the old window. After WR-01, `replay` during `reap` bumps `generation` and `runEffect` returns early, so the outcome is always `Idle`. The disjunction would also let a regression back to the old behaviour pass, because the `stale` branch is the old behaviour.
**Fix:**
```ts
assert.strictEqual(after.run._tag, "Idle");
assert.isUndefined(after.baseline);
```
and replace the "Either..." comment with "A replay during teardown supersedes the pending run."

### IN-05: The new comment overstates what is read after the last yield

**File:** `packages/devtools/src/model/SimulationSession.ts:371-373` (reads at 363-364)
**Issue:** The comment says "Everything below reads the session after this last yield". But `choice = policyChoice()` and `policy` are computed at 363-364, before `retire()` and the second `reap()`, and `seedOf(choice)` uses that stale `choice`. `setSightings` calls `pin()` and `commit()` without bumping `generation`, so the pinned policy can change during teardown and the run would then evaluate the old policy against the new `draft`. This is harmless in effect, because `stale` flags a result whose question no longer matches the current policy, and it predates the phase. But the comment is wrong as written.
**Fix:** Either move `policyChoice()` and `policyOf(choice)` below the `mine !== generation` check (keep the early `undefined` return for the no-run case), or narrow the comment to "the ports, capture, source, clock and draft are read after this last yield".

### IN-06: `deferred-items.md` still lists the run-start window as open

**File:** `.planning/phases/24-simulation-source-preparation/deferred-items.md:8-10`
**Issue:** The entry says a `replay`/`seed` during `reap` "does not drop the pending run" because `mine` is read after `reap()`. WR-01 reads `mine` before `reap()` and drops the run, so this item is resolved. The entry also steers a later reader (Phase 25's FiberHandle rewrite) toward a problem that no longer exists.
**Fix:** Mark it resolved by commit 1ad24867, or remove it, together with the IN-04 test tightening.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
