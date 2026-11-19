---
phase: QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict
plan: 03
subsystem: core-leaf-verdict
tags: [leaf-verdict, acted, tracer, toPredicate, evaluate]
phase_base: afdd8d9cd9701405d426089a19dda17fbc921c90
plan_head_before: 93f0389935eb1dfc2ead4cb02951037596628764
plan_head_after: e1fe7c0ad044bd4415f8fd5ad9e1200ee8b1128e
requires: ["54-02"]
provides:
  - "LEAF_VERDICTS, isHeld, LeafVerdictRows, LeafVerdictOf, LeafVerdicts and the five outcome types in LeafNeeds.ts, package-private"
  - "the acted leaf read through its row in both evaluate (ACTED_DENIAL) and toPredicate (isHeld fold)"
affects: [54-04, 54-05, 54-06, 54-07, 54-08]
tech-stack:
  added: []
  patterns: ["one closed record keyed by leaf tag, checked by satisfies", "walk chooses the sentence by denial kind, translator folds isHeld"]
key-files:
  created: []
  modified:
    - packages/core/src/LeafNeeds.ts
    - packages/core/src/Walk.ts
    - packages/core/src/Predicate.ts
    - packages/core/test/LeafNeeds.test.ts
    - packages/core/test/LeafNeeds.tst.ts
key-decisions:
  - "LEAF_VERDICTS is `satisfies LeafVerdicts` without `as const`: the rows are contextually typed from the closed signatures, and every row's return is already a closed outcome type, so `as const` kept nothing"
  - "Role and permission rows take (leaf, subject), the reverse of holdsRole/holdsPermission's (subject, leaf), matching 54-04's call shape"
  - "HasRelationship's row passes Unrelated and Unknown through unchanged (`related === \"Related\" ? \"Held\" : related`), so a new RelatedResult member is a compile error against the closed RelationshipOutcome"
requirements-completed: [VERD-01, VERD-02, VERD-03, WX-03]
duration: 9 min
completed: 2026-11-18
status: complete
commits: 3
actuals:
  tokens: 14000
  tasks: 2
  commits: 3
---

# Phase 54 Plan 03: The verdict record, with the acted leaf through it Summary

`LEAF_VERDICTS` (ten closed rows, one per leaf tag) now sits beside `LEAF_NEEDS` with `isHeld` and five outcome types, package-private; the acted leaf runs through it in both interpreters, so the polarity map and the answer comparison are written once in `LeafNeeds.ts`.

## LEAF_VERDICTS RED

`pnpm exec vitest run --project core LeafNeeds < /dev/null` at `2540e6cc`, before any source change (15 passed, 6 failed):

```
FAIL |core| test/LeafNeeds.test.ts > LEAF_VERDICTS > has one row per leaf tag (a missing row is TS2741, an extra one TS2353)
TypeError: Cannot convert undefined or null to object
FAIL |core| test/LeafNeeds.test.ts > LEAF_VERDICTS > gives the two acted rows opposite polarities, and Unknown is never Held (ADR-QD-020)
TypeError: Cannot read properties of undefined (reading 'HasActed')
FAIL |core| test/LeafNeeds.test.ts > LEAF_VERDICTS > answers a relationship, a custom predicate and a signature
TypeError: Cannot read properties of undefined (reading 'HasRelationship')
FAIL |core| test/LeafNeeds.test.ts > LEAF_VERDICTS > answers a role, a permission and an action from the subject and the request
TypeError: Cannot read properties of undefined (reading 'HasRole')
FAIL |core| test/LeafNeeds.test.ts > LEAF_VERDICTS > gives the two attribute rows the matcher's own verdict (D-04)
TypeError: Cannot read properties of undefined (reading 'HasAttribute')
FAIL |core| test/LeafNeeds.test.ts > LEAF_VERDICTS > isHeld is true for Held only, and agrees with holds over the five verdicts
TypeError: isHeld is not a function
```

## Commits

- `2540e6cc` `test(54-03): unit test of the leaf verdict record, RED by import` (LeafNeeds.test.ts alone; new lines only)
- `734c4c18` `refactor(54-03): every leaf's answer has one verdict row; the acted leaf reads it in both interpreters` (LeafNeeds.ts, Walk.ts, Predicate.ts alone; the phase's first src commit)
- `e1fe7c0a` `test(54-03): pin the leaf verdict rows' types` (LeafNeeds.tst.ts alone)

Every commit ends with the `Co-Authored-By: Claude Sonnet 5.5` trailer.

## VERD-01 check (Task 1, second verify)

```
VERD-01: the polarity map and the verdict rule are written once, in LeafNeeds.ts
```

Exit 0; the 12 offender and count lines 54-01 recorded at `phase_base` are gone. The third verify (record whole and private, `actedRow(` three times in code, budgeted constructs intact) printed `the record is whole and private; the acted arm reads it`, exit 0.

## Test counts

- vitest `--project core LeafNeeds LeafVerdict LeafMatrix Predicate Evaluate`: 9 files, 438 passed. `LeafNeeds` alone: 21 passed (15 before, +6 in describe `LEAF_VERDICTS`).
- `LeafVerdict.test.ts` (54-02) and the INV-QD-018 agreement passed unedited, so no decision and no deny reason moved.
- tstyche: 61 files, 322 tests, 671 assertions passed (the base file's `expect<` count plus 7 new pins; every base `test(...)` kept).
- `pnpm typecheck`, `pnpm lint` (`house-style: 545 file(s) clean (3 declared switch(es))`), `pnpm circular` all clean; `pnpm -s spec:api` prints `api-surface: 935 export(s) documented across 9 package(s)`, the base's count.

## Typing choices

- `export const LEAF_VERDICTS = { … } satisfies LeafVerdicts`, no `as const` and no explicit parameter annotations: `satisfies` contextually types each arrow from `LeafVerdictRows`, and every row's return type is already a closed literal union, so `as const` would keep nothing.
- `actedRow` is a function declaration (not a `const`) so `actedRow(` appears exactly three times in code (declaration plus the two rows), as the plan's check counts it; it is called exactly twice at module load.
- `LeafVerdictRows` is an exported interface, `LeafVerdictOf<Tag extends string>` maps an unlisted tag to `never`, and `LeafVerdicts` is the mapped record over `LeafTag`; `LeafTag` stayed private.
- Walk: `ACTED_DENIAL: Record<Exclude<ActedOutcome, "Held">, (subject, event) => string>` holds the three base sentences character for character; `evaluateActed` reads `LEAF_VERDICTS[policy._tag](answer)` once. Predicate: `Plan`'s `AskActed` lost `wanted`; `run` folds `isHeld(LEAF_VERDICTS[p.leaf._tag](answer))`.

## Deviations from Plan

None - plan executed exactly as written. Both acted rows share one type, so `LEAF_VERDICTS[policy._tag]` with the two-tag union is callable without a cast.

## Known Stubs

None.

## Threat Flags

None. The record is package-private (`index.ts` names none of it) and the T-54-06..T-54-09 mitigations are in place: the Unknown branch is written once in `actedRow` and pinned under both rows, a missing row is TS2741, both interpreters fold `isHeld` of the same row, and no export was added.

## Self-Check: PASSED

- `packages/core/src/LeafNeeds.ts`, `Walk.ts`, `Predicate.ts`, `packages/core/test/LeafNeeds.test.ts` and `LeafNeeds.tst.ts` exist and are modified as listed.
- `2540e6cc`, `734c4c18` and `e1fe7c0a` are ancestors of HEAD; `git rev-list --count 93f03899..HEAD` is 3.
- `.planning/config.json` (pre-existing unrelated change) was never staged.
