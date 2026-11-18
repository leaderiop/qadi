---
phase: QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict
plan: 04
subsystem: core-leaf-verdict
tags: [leaf-verdict, walk, toPredicate, relationship, signature, custom, role, permission, action, attribute]
phase_base: afdd8d9cd9701405d426089a19dda17fbc921c90
plan_head_before: 335e51f6e2fc0c62ac872c1cde47a297ab097626
plan_head_after: 1732f03e040c51365e146e1bd1c83da88f951a95
requires: ["54-03"]
provides:
  - "every leaf arm of evaluateNode and every translator fold reads its LEAF_VERDICTS row through isHeld"
  - "RELATIONSHIP_DENIAL and SIGNATURE_DENIAL in Walk.ts, beside ACTED_DENIAL"
affects: [54-05, 54-06, 54-07, 54-08]
tech-stack:
  added: []
  patterns: ["row decides, walk picks the sentence by denial kind, translator folds isHeld"]
key-files:
  created: []
  modified:
    - packages/core/src/Walk.ts
    - packages/core/src/Predicate.ts
key-decisions:
  - "The custom arm keeps its one inline sentence (its row has one denial kind); only relationship and signature got tables"
  - "HasResourceAttribute has no row call in Predicate.ts: a resource-reading matcher compiles to a column predicate, which is translation, not a verdict"
requirements-completed: [VERD-02, VERD-03]
duration: 8 min
completed: 2026-11-18
status: complete
commits: 2
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
---

# Phase 54 Plan 04: Every remaining leaf reads its verdict row Summary

The relationship, custom, signature, role, permission, action and both attribute leaves now ask `LEAF_VERDICTS` through `isHeld` in the walk, and the translator folds the same rows for role, permission, action and `AskAttribute`; the walk keeps only its sentences.

## Commits

- `edbe65a2` `refactor(54-04): relationship, custom and signature read their verdict rows` (Walk.ts alone)
- `1732f03e` `refactor(54-04): role, permission, action and attribute leaves read their verdict rows` (Walk.ts and Predicate.ts alone)

Both end with the `Co-Authored-By: Claude Sonnet 5.5` trailer. No test file changed in this plan.

## Verification output

```
VERD-02: every leaf reads its verdict row; the walk keeps its reasons, the translator folds
VERD-01: the polarity map and the verdict rule are written once, in LeafNeeds.ts
```

Both exit 0. Task 1's second verify printed `relationship, custom and signature read their rows`.

- vitest `--project core` (whole suite): 80 files, 2563 passed. The four-file Task 1 run (LeafVerdict, LeafNeeds, Evaluate, PortAccess): 326 passed. LeafVerdict.test.ts, LeafNeeds.test.ts (constants count of 18), LeafMatrix.test.ts and Predicate.test.ts (INV-QD-018) ran unedited.
- tstyche: 61 files, 322 tests, 671 assertions passed.
- `pnpm typecheck`, `pnpm lint` (`house-style: 545 file(s) clean (3 declared switch(es))`), `pnpm circular` clean; `spec:api` prints `api-surface: 935 export(s) documented across 9 package(s)`.

## Comments reworded

- `Walk.ts:308` (evaluateNode doc): "a leaf tag's real comparison (`subject.roles.has(...)`, `judgeMatcher`)" now says "(its `LEAF_VERDICTS` row)".
- `Walk.ts:879` (the root `evaluate` doc): "does the real comparison — `subject.roles.has(...)`, `judgeMatcher` —" now says "reads its verdict row (`LEAF_VERDICTS`) —".
- The BEH-QD-045/INV-QD-029 comment moved from inside the `Match` arm onto `RELATIONSHIP_DENIAL`'s doc; the `Match.value` hoisting comment went with the dispatch. The `effect/Match` import is gone from Walk.ts.

## Deviations from Plan

None - plan executed exactly as written. Import lines for `LEAF_VERDICTS`/`absenceOf`/`errorOf`/`isHeld` were collapsed to one line in each file after the unused `holds…` names were dropped.

## Known Stubs

None.

## Threat Flags

None. No new surface; T-54-10..T-54-12 mitigations hold (every deny sentence is byte-identical, pinned by LeafVerdict.test.ts, and both interpreters fold the same rows).

## Self-Check: PASSED

- `packages/core/src/Walk.ts` and `Predicate.ts` exist and are modified as listed.
- `edbe65a2` and `1732f03e` are ancestors of HEAD; `git rev-list --count 335e51f6..HEAD` was 2 before this SUMMARY.
- `.planning/config.json` (pre-existing unrelated change) was never staged.
