---
phase: QD-53-one-module-owns-the-value-a-leaf-compares
plan: 06
subsystem: core
tags: [mutation, stryker, D-14, WX-05, operand]
plan_head_before: c865ca0e1f44fdb165565ff466532907aee585d0
plan_head_after: 886f0dde918134123c1fb14fbe64b2a5a088b66f
requires:
  - phase: QD-53
    provides: "53-01 baseline, comparer and MOVED/RENAMED; 53-03..05 all readers on Operand.ts"
provides:
  - "53-mutation-after.json: scores, counts and survivor identities for the eight base files plus Operand.ts on the final tree"
  - "the D-14 verdict (WX-05 holds) and the per-file table 53-07 copies into ADR-QD-166"
affects: [53-07, 53-08]
actuals:
  tokens: 2500
  tasks: 2
  commits: 1
tech-stack:
  added: []
  patterns: ["measure with the base's invocation plus the new file; compare with the rule committed before the change"]
key-files:
  created:
    - .planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-mutation-after.json
  modified: []
key-decisions:
  - "No test was added: compare passed on the first run, Operand.ts has no survivor, and both survivors beside an edited line kept their exact text and stayed survivors, so none needed a RENAMED entry"
requirements-completed: [WX-05]
coverage:
  - id: D1
    description: "No touched file's Stryker score fell outside D-14's rule, measured with 53-01's invocation plus Operand.ts and judged by the committed comparer"
    requirement: WX-05
    verification:
      - kind: command
        ref: "node 53-mutation.mjs compare (exit 0, prints WX-05 holds (D-14))"
        status: pass
    human_judgment: false
duration: 12min
completed: 2026-11-18
status: complete
---

# Phase 53 Plan 06: The after-run, judged by D-14 Summary

**Stryker over the eight readers plus `Operand.ts` on the final tree (96.94 overall, one run, 1 min 42 s): only `Matcher.ts` fell, by exactly the 23 detected mutants that moved, with its survivor set unchanged, and `Operand.ts` detects 31 of 31; `compare` prints "WX-05 holds (D-14)".**

## Task Commits

1. **Task 1: The after-run on the final tree** - no commit by design (Stryker run and `after` writer; the JSON waits for Task 2).
2. **Task 2: Apply D-14, commit the after JSON** - `886f0dde` (chore). No `test(53-06)` commit: nothing needed closing. Nothing under `packages/` changed in this plan.

## Mutation after

Command (53-01's invocation with `,packages/core/src/Operand.ts` appended), run alone on the clean tree; Stryker exit 0,
overall 96.94, report written, 1 min 42 s:

```
pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/AttributeResolver.ts,packages/core/src/CustomPredicate.ts,packages/core/src/Decision.ts,packages/core/src/FieldPath.ts,packages/core/src/Matcher.ts,packages/core/src/PortAccess.ts,packages/core/src/Predicate.ts,packages/core/src/Walk.ts,packages/core/src/Operand.ts'
```

Printed by `node 53-mutation.mjs after` (score, `(detected/scored)`, ignored; survivors elided here, they are the
`survivors` arrays of `53-mutation-after.json`):

```
packages/core/src/AttributeResolver.ts 1 (22/22) ignored 35
packages/core/src/CustomPredicate.ts 0.972972972972973 (36/37) ignored 34
packages/core/src/Decision.ts 0.967741935483871 (150/155) ignored 17
packages/core/src/FieldPath.ts 0.9347826086956522 (172/184) ignored 6
packages/core/src/Matcher.ts 0.9748743718592965 (194/199) ignored 93
packages/core/src/Operand.ts 1 (31/31) ignored 3
packages/core/src/PortAccess.ts 1 (47/47) ignored 17
packages/core/src/Predicate.ts 1 (293/293) ignored 22
packages/core/src/Walk.ts 0.948051948051948 (292/308) ignored 16
wrote .planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-mutation-after.json
```

Survivors printed per file: CustomPredicate 1, Decision 5, FieldPath 12, Matcher 5, Walk 16 (13 Survived, 3 NoCoverage);
AttributeResolver, Operand, PortAccess and Predicate none.

## New-file survivors

None. `Operand.ts` has 31 detected, 0 survivors, 3 ignored. Nothing to name as equivalent, and no test was needed.

## Compare

Output of `node 53-mutation.mjs compare`, exit 0:

```
packages/core/src/AttributeResolver.ts 1 -> 1 (detected 22 -> 22; survivors +0 -0)
packages/core/src/CustomPredicate.ts 0.9459459459459459 -> 0.972972972972973 (detected 35 -> 36; survivors +0 -1)
  gone survivor StringLiteral | Survived | "" | "no predicate is registered under this name" | reason: "no predicate is registered under this name",
packages/core/src/Decision.ts 0.967741935483871 -> 0.967741935483871 (detected 150 -> 150; survivors +0 -0)
packages/core/src/FieldPath.ts 0.9347826086956522 -> 0.9347826086956522 (detected 172 -> 172; survivors +0 -0)
packages/core/src/Matcher.ts 0.9774774774774775 -> 0.9748743718592965 (detected 217 -> 194; survivors +0 -0)
packages/core/src/PortAccess.ts 1 -> 1 (detected 47 -> 47; survivors +0 -0)
packages/core/src/Predicate.ts 1 -> 1 (detected 293 -> 293; survivors +0 -0)
packages/core/src/Walk.ts 0.948051948051948 -> 0.948051948051948 (detected 292 -> 292; survivors +0 -0)
packages/core/src/Operand.ts 1 (31 detected, 0 survivors); detected mutants that left the fallen files: 23
WX-05 holds (D-14)
```

The two beside-edit survivors 53-01 left for this plan to decide: `FieldPath.ts` `if (key === undefined) continue;`
(now line 332) and `Decision.ts` `writable: true` / `configurable: true` (now lines 349-350). Their text did not
change, they are still survivors, and `compare` reports no added or gone survivor for either file, so neither needed a
`RENAMED` entry and neither was touched. The one `RENAMED` entry (`isFieldOf(` to `isOwnKey(`) matched the Decision.ts
survivor at `if (isOwnKey(data, field)) {`.

## D-14

For 53-07 to copy into ADR-QD-166. Scores are the unrounded stored values; "detected" is killed plus timeout.

| File | Base score | After score | Detected before -> after | Survivors unchanged (after `RENAMED`) |
|------|-----------|-------------|--------------------------|----------------------------------------|
| `AttributeResolver.ts` | 1 | 1 | 22 -> 22 | yes |
| `CustomPredicate.ts` | 0.9459459459459459 | 0.972972972972973 | 35 -> 36 | no: one fewer (the unregistered-name reason, killed by 53-02's test) |
| `Decision.ts` | 0.967741935483871 | 0.967741935483871 | 150 -> 150 | yes |
| `FieldPath.ts` | 0.9347826086956522 | 0.9347826086956522 | 172 -> 172 | yes |
| `Matcher.ts` | 0.9774774774774775 | 0.9748743718592965 | 217 -> 194 | yes |
| `PortAccess.ts` | 1 | 1 | 47 -> 47 | yes |
| `Predicate.ts` | 1 | 1 | 293 -> 293 | yes |
| `Walk.ts` | 0.948051948051948 | 0.948051948051948 | 292 -> 292 | yes |
| `Operand.ts` | none (new file) | 1 | 31 detected, 0 survivors | n/a |

Only `Matcher.ts` fell, and it is in `MOVED`: its survivor set is unchanged and the 23 detected mutants it lost are
fewer than the 31 `Operand.ts` detects (`getByPath` and its private `isObject` moved there). `CustomPredicate.ts` rose.
Every other score is equal, so the rule is met with no judgment: no non-`MOVED` file fell.

## Deviations from Plan

None - plan executed exactly as written. The compare passed on the first run, so the two improvement rounds were not
used. The baseline, `53-mutation.mjs` and `stryker.config.mjs` are unchanged since `chore(53-01)` (`fe1d4af6`), and the
`53-mutation-base.json` was not re-taken.

## Known Stubs

None. This plan creates one JSON file under `.planning/`.

## Threat Flags

None.

## Next Phase Readiness

Ready for 53-07: the `## D-14` table above is the before/after evidence for ADR-QD-166 (D-14, D-17); `## New-file
survivors` is empty, so the ADR names none.

## Self-Check: PASSED

- `53-mutation-after.json` exists and holds exactly the nine files under `counts`, `measured` and `survivors`.
- Commit `886f0dde` exists on `arch-wave-11`, carries only the after JSON, and ends with the trailer; nothing under
  `packages/` changed after it, and `git status --porcelain -- packages` is empty.
- `compare` exits 0 and prints "WX-05 holds (D-14)".
