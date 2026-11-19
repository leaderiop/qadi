---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
plan: 04
subsystem: devtools
tags: [gates-feed, registry-watch, questions-thunk, failure-policy, tdd, tracer]
requires: ["56-03"]
provides:
  - GatesFeed.ts, the package-private scoped module that owns the gate-registry watch and the questions thunk with one failure policy
  - GatesFeed.test.ts, fifteen cases (G31..G37 with G32 b, T1..T7) against the feed alone
  - the surface.tst.ts pin that keeps makeGatesFeed out of the barrel
affects: [56-05, 56-07, 56-13]
actuals:
  tokens: 14000
  tasks: 2
  commits: 3
plan_head_before: 62f279cec970dacf8fa9c5abd56b358a818c321a
plan_head_after: 6ff83418
tech-stack:
  added: []
  patterns: ["a feed shaped like the timeline and diagnostics feeds: subscribe/getSnapshot/configure over makeExternalStore, one superseding run for its cadence, a release finalizer registered before the run"]
key-files:
  created:
    - packages/devtools/src/model/GatesFeed.ts
    - packages/devtools/test/model/GatesFeed.test.ts
  modified:
    - packages/devtools/test/surface.tst.ts
key-decisions:
  - "The snapshot's own halves are the held state (previous Read/Failed reads come from the store), so no second copy of them can disagree"
  - "A failure key is kept beside the half only for Failed; a Read keeps its reference by array identity (registry) or Equal.equals (thunk)"
requirements-completed: [GFED-01, GFED-05, WX-04, WX-06]
duration: 6min
completed: 2026-11-18
status: complete
---

# Phase QD-56 Plan 04: The gates feed

One package-private scoped module now owns the dock's gate-registry watch and the questions thunk: both host reads are guarded, a throw from either is a stated `Failed` half in the snapshot (never a stop), and the thunk has its own cadence.

## RED by import

`pnpm exec vitest run --project devtools packages/devtools/test/model/GatesFeed.test.ts`, before `GatesFeed.ts` existed:

```
Error: Failed to resolve import "../../src/model/GatesFeed.ts" from "packages/devtools/test/model/GatesFeed.test.ts". Does the file exist?
 Test Files  1 failed (1)
      Tests  no tests
```

## Task Commits

1. Task 1, RED: `b3db1686` `test(56-04): the gates feed's first watch and thunk cases, RED by import` (GatesFeed.test.ts, surface.tst.ts).
2. Task 1, GREEN: `67bcccb6` `feat(56-04): the gates feed owns the registry watch and the questions thunk` (GatesFeed.ts alone; the phase's first src commit; 246 lines).
3. Task 2: `6ff83418` `test(56-04): the gates feed's lifetime and view twins of M32..M36` (GatesFeed.test.ts).

## What the feed does

- Snapshot `{ registry: Unwatched | Read{instances} | Failed{reason}, asked: Unhanded | Read{questions} | Failed{reason} }`; the registry's own array is held, never copied, and an unchanged half keeps its reference.
- `stated(thrown, fallback)` is total: `Cause.pretty(Cause.die(thrown))`, else the half's own fallback sentence (registry and questions have separate ones); the failure key is `name: message` for an `Error`, else the rendering.
- Release finalizer registered before `makeSupersedingRun()`, so on close the run's finalizer (interrupt, `closed()`) runs first.
- Cadence: `Effect.sleep(interval)` then `Effect.repeat(Effect.sync(tick), Schedule.spaced(interval))`; first tick one interval after the build or a `configure` that hands a new thunk or interval; a quiet tick reads nothing else.

## T3's hostile answer

A `Proxy` over an empty array whose `get` trap throws when the key is `length`. `Equal.equals(previousArray, proxy)` in the installed `effect` does read `length`, so the claim holds as written (no other trap needed): the compare throws inside the thunk's own `try` and `asked` is `Failed`. The unrenderable thrown value is the M46 Proxy (`get`, `getPrototypeOf`, `ownKeys` all throw); it reads exactly `The questions threw a value that could not be described.`

## Verification

- `GatesFeed.test.ts`: 9 passed after the feed, 15 passed after Task 2.
- Whole devtools project with `--exclude '**/QuestionsPanel.thunk.test.tsx'` (the D-03 test is RED by design until 56-07), nothing else excluded: 1619 passed.
- `pnpm typecheck` exit 0; `pnpm lint` exit 0, `house-style: 555 file(s) clean (3 declared switch(es))`, no finding in either edited file, every budget unchanged; `pnpm circular` no cycle; `pnpm test:tstyche` 325 tests passed (the `makeGatesFeed` pin holds).
- The only `packages/*/src` file changed since `phase_base` is `GatesFeed.ts`; neither barrel names the feed.

## Deviations from Plan

**1. [Rule 3 - Blocking] Two of the plan's own verify scripts could not pass as written**
- **Found during:** Task 1 verification.
- **Issue (a):** the house-rules script strips comments but not imports, and its `\bas\s+[A-Za-z_$([{]` matches `import * as Cause`, which AGENTS.md section 1 requires; it can never pass for a module that imports `effect` submodules. **(b):** `git diff --name-only <base> HEAD -- 'packages/*/src'` prints nothing for files below those directories (the pathspec matches the directory entry only), so the precondition's `test -z` passes vacuously and Task 2's `src.join(" ") !== "…GatesFeed.ts"` check cannot see the feed.
- **Fix:** ran the same construct list with import lines removed (clean), and checked the src-diff by listing `git diff --name-only <base> HEAD` and filtering to `packages/*/src` by prefix (only `GatesFeed.ts`). No source or gate was weakened.
- **Files modified:** none.

**Total deviations:** 1 (a plan verify-script defect, worked around, no code change). **Impact:** none on scope.

## Known Stubs

None.

## Threat Flags

None. T-56-04, T-56-05 and T-56-06 are mitigated as planned (T3, G37, G35, G36 pin them); T-56-18 stays accepted.

## Next

Ready for 56-05 (the remaining twins G38..G47, G42 b and GP2).

## Self-Check: PASSED

- `GatesFeed.ts` and `GatesFeed.test.ts` exist; `b3db1686`, `67bcccb6` and `6ff83418` are ancestors of HEAD; all three end with the trailer.
