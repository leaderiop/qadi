---
phase: QD-65-only-admit-builds-an-admitted
plan: 02
subsystem: core
tags: [admission, nominal-brand, private-constructor, tstyche]
phase_base: d1ac1df0629e95797f406c5c46da364e6542dce2

requires:
  - phase: QD-65-only-admit-builds-an-admitted
    provides: 65-01's two construction pins (red on the base) and pin-codes.mjs
provides:
  - Admitted with a private constructor and a declared private nominal member
  - admit as Admitted's static method, exported detached as admit
  - the construction lock's two halves, each shown necessary
affects: [QD-65-03, QD-65-06]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2
plan_head_before: af1428a7ec4518b0d725d822ced5ac9dab8254bb
plan_head_after: 85ce6854ee4edb546fa8527bec90b17559f30dfa
commits: 2

tech-stack:
  added: []
  patterns:
    - "a nominal brand is a `declare private readonly` member, which has no run-time slot, beside a private constructor"
    - "a static method exported detached (`export const admit = Admitted.admit`) names its class, never `this`"

key-files:
  created: []
  modified:
    - packages/core/src/Admission.ts
    - .planning/phases/QD-65-only-admit-builds-an-admitted/65-RED-EVIDENCE.md

key-decisions:
  - "None beyond the plan; the class is the one the plan probed, byte for byte"

requirements-completed: [ADMT-01, ADMT-02, WX-04, WX-06]

duration: 10min
completed: 2026-11-20
status: complete
---

# Phase 65 Plan 02: Only admit builds an Admitted Summary

**`Admitted` has a private constructor and a declared private `nominal` member, and `admit` is its static method exported detached as `admit`, so neither a constructor call nor a same-shape object literal compiles outside `admit` while both call sites stay as they were.**

## Accomplishments

- `Admission.ts` is the planned file, SHA-256 `dbe35421d9726510ee55e9bf7902e6fb32184172d5d1f3c554126434f178e71e`; lines 1 to 68 are unchanged, `SUPPLIED` and the matcher-context literal are unchanged.
- 65-01's two pins pass in both tstyche passes on `WalkEnvironment.tst.ts`: `Tests:      6 passed, 6 total`, `Suppressed: 2 matched, 2 total`. The whole type-test run is `Tests:      349 passed, 1 skipped, 350 total` then `Tests:      348 passed, 2 skipped, 350 total`. `pnpm typecheck` exits 0 (65-01's two TS2578 are gone).
- `pin-codes.mjs` reads exactly:

  ```text
  TS2673 62: new Admitted("asked", policy, subject, { action: true, resource: true }, matcherContext, 7);
  TS2741 68: const forged: Admitted<"asked"> = {
  ```

- Each half is necessary (`variants.mjs`, scratch): `public constructor: TS2741`, `no nominal member: TS2673`; the file was restored byte for byte.
- The emitted `Admission.d.ts` holds `private readonly nominal;`, `private constructor();` and `export declare const admit: typeof Admitted.admit;`; no code line of the emitted `Admission.js` names `nominal` (its one match is the class doc the build keeps).
- E7, E8 and E9 still fail with `AssertionError: expected undefined to equal`, the other 19 tests of `Admission.test.ts` and `LeafMatrix.test.ts` pass: the lock does not touch the double read, which 65-03 removes.
- `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))` and `api-surface: 939 export(s) documented across 9 package(s)` are unchanged; `Walk.ts`, `Predicate.ts`, `index.ts` and `scripts/` are byte-identical to `phase_base`; oxlint is clean on `Admission.ts`. No `this` in a code line of `Admission.ts`.

## Task Commits

1. **Task 1 (tracer): the class, both pins green, both call sites** - `8f96a747` (fix)
2. **Task 2: each half shown necessary, emitted shapes read, evidence recorded** - `85ce6854` (docs)

The tracer gate was the task's own `<verify>`, run end to end after the commit: it passed. Task 2's `<verify>` passed whole.

## Files Created/Modified

- `packages/core/src/Admission.ts` - the class, the static method and the detached export
- `.planning/phases/QD-65-only-admit-builds-an-admitted/65-RED-EVIDENCE.md` - `## The construction lock's halves`

## Deviations from Plan

None - plan executed exactly as written. (One of my own runs of step 2 passed `--tsconfig tsconfig.test.json` unsplit from zsh and tstyche refused the option; the plan's verify runs under `bash -c` and splits it, and the re-run in bash passed.)

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. T-65-04 (a construction path left open) is mitigated and shown by both halves; T-65-05 (a `this` in the detached method) is mitigated by naming `Admitted` in the body.

## Next Phase Readiness

Ready for 65-03: the double read of the question's resource and action remains (E7 to E9 red), `SUPPLIED` and the matcher-context literal are as at `phase_base`.

## Self-Check: PASSED

`packages/core/src/Admission.ts` and `65-RED-EVIDENCE.md` exist; commits `8f96a747` and `85ce6854` are on `arch-wave-12` after `phase_base`; both task verifies exited 0.
