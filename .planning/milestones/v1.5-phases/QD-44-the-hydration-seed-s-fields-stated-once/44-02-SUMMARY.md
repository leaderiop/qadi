---
phase: QD-44-the-hydration-seed-s-fields-stated-once
plan: 02
subsystem: react-hydration
tags: [hydration, schema, seed-fields, tdd-red, tracer]
requires: ["44-01"]
provides:
  - "SeededDecision.ts: ALLOW_WITHHELD, DENY_WITHHELD, AllowSeedFields, DenySeedFields; SeededAllow/SeededDeny typed by them plus subjectId"
  - "HydrationEngine.ts: AllowEntry/DenyEntry over the seed fields; rebuild is a spread"
  - "Hydration.tst.ts: constructor-input, key-set and required-key pins"
affects: [44-03, 44-04, 44-06]
tech-stack:
  added: []
  patterns: ["wire fields minus withheld, stated once as a Schema.Struct (ADR-QD-135 pattern)", "Data.TaggedClass typed by a struct's Type"]
key-files:
  created: []
  modified:
    - packages/react/src/SeededDecision.ts
    - packages/react/src/HydrationEngine.ts
    - packages/react/test/HydrationSeedFields.test.ts
    - packages/react/test/DecisionOutcome.test.ts
    - packages/react/test/DeveloperSignals.test.ts
    - packages/react/test/HydrationEvent.test.ts
    - packages/react/test/SeededQuestion.test.ts
    - packages/react/test/Hydration.tst.ts
decisions:
  - "A seeded allow whose payload had no visibleFields has no visibleFields key (D-03); a Breaking change to SeededAllow's instance type, worded by 44-04"
  - "The decoded entry is spread whole into the class; the class sets its own _tag, so _tag is not stripped first"
metrics:
  duration: "about 20 minutes"
  completed: 2026-11-15
status: complete
commits: 4
plan_head_before: 2030ed0afd33fe5e6e9c581808cf9d5dd45e8906
plan_head_after: 792c8f2a00809b5b03ae9f3f1517edeb34b72994
actuals:
  tokens: 5500
  tasks: 3
  commits: 4
---

# Phase 44 Plan 02: The hydration seed's fields stated once Summary

Each verdict's seed fields are now one `Schema.Struct` derived from core's wire minus the withheld keys; `SeededAllow`/`SeededDeny` are `Data.TaggedClass`es typed by it plus `subjectId`, the payload entries derive from the same structs, and `rebuild` is `new Seeded*({ ...d, subjectId })`.

## RED (Task 1)

The absent-key test and the tightened property (the `visibleFields` exemption removed) fail on `phase_base`'s two src files and pass at HEAD; the four golden tests pass on both. Hand-run and repeated by the second verify, which restores `phase_base`'s copies in a `finally`:

```
RED on phase_base src (2 failed, 4 passed), GREEN on HEAD (6 passed)
AssertionError: expected [ 'evaluationId', 'subjectId', ...(5) ] to not include 'visibleFields'
```

## Counts

| Measure | Before | After |
|---|---|---|
| hand-written seed field lines in `SeededDecision.ts` | 6 | 0 |
| withheld-list declarations in `HydrationEngine.ts` | 2 | 0 |
| `mapFields` in `HydrationEngine.ts` | 3 | 1 (the envelope) |
| field lines copied by name in `HydrationEngine.ts` | 9 | 1 (`entryAgrees`' claim, 44-03's) |

## Commits

- `fa66a429` test(44-02): a seed has no visibleFields key when the server sent none (RED)
- `17c77bdc` refactor(44-02): an allow seed's fields are the wire's, stated once (tracer)
- `4970ad2f` refactor(44-02): a denial seed's fields are the wire's, stated once
- `792c8f2a` test(44-02): seeds built without visibleFields, and the seed's type pinned to its fields

The plan's metadata commit follows, so `rev-list plan_head_before..HEAD` reads 5 after it; `commits:` counts the four task commits.

## Imports dropped

`SeededDecision.ts`: type imports `Obligation`, `VisibleFields`. `HydrationEngine.ts`: `DecisionWireAllow`, `DecisionWireDeny` (value imports), `AllowDisclosure`, `DenyDisclosure`. `Struct` stays imported in the engine (`dehydrateDecision`).

## Verification

`pnpm typecheck`, `pnpm lint`, `pnpm circular`, `pnpm test:tstyche` (275 tests), the whole react project (516 tests) pass. `git diff --quiet phase_base -- packages/core` and the three unchanged hydration test files, `index.ts` and `Hydration.ts` exit 0. Every golden string is untouched.

## Deviations from Plan

None - plan executed exactly as written. Note: `AllowDisclosure`/`DenyDisclosure` types in `Hydration.tst.ts` are imported from `../src/SeededDecision.ts` (the plan named `Hydration.ts`, which does not re-export them).

## Known Stubs

None.

## Threat Flags

None. No new endpoint, decoder or trust boundary; the decoder and `DehydratedEntryWire` are untouched.

## Self-Check: PASSED

- The four commits are ancestors of HEAD; `SeededDecision.ts` exports the four new names.
- Plan verifies 1 to 3 of each task ran green.
