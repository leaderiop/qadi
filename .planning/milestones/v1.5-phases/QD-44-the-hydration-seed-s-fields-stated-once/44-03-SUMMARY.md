---
phase: QD-44-the-hydration-seed-s-fields-stated-once
plan: 03
subsystem: react-hydration
tags: [hydration, closed-table, verdict-row, tdd-green]
requires: ["44-02"]
provides:
  - "HydrationEngine.ts: WireVerdict, WireOf, EntryOf, SeedOf, DisclosedOf, Row<V>, VERDICTS, rowOf, entryOf, seedOf, claimOf"
affects: [44-04, 44-06]
tech-stack:
  added: []
  patterns: ["closed mapped-type table read through one generic accessor (FieldLattice.ts / HYDRATION_DROP_TABLE pattern)"]
key-files:
  created: []
  modified:
    - packages/react/src/HydrationEngine.ts
decisions:
  - "The Allow/Deny branch is one VERDICTS row per wire verdict, read through the generic accessor rowOf; the table index is the dispatch, so neither a Match per function nor a switch is added (flagged in the plan)"
  - "entryAgrees' rule is kept verbatim: the Withheld and policyTag guards stay in the function, only the claim moved into the row"
metrics:
  duration: "about 10 minutes"
  completed: 2026-11-15
status: complete
commits: 1
plan_head_before: 47b3a1403ca005af7f7247a1f0575292ac0e2602
plan_head_after: 8897662c90188eb0eea4717969cd91425363a517
actuals:
  tokens: 4500
  tasks: 2
  commits: 1
---

# Phase 44 Plan 03: The Allow/Deny branch written once Summary

`HydrationEngine.ts` holds one closed `VERDICTS: { readonly [V in WireVerdict]: Row<V> }` table; `dehydrateDecision`, `rebuild` and `entryAgrees` read their verdict's row through `rowOf`, so a verdict without a row is a compile error and a wire field needs no edit here.

## Counts

| Measure | Before (after 44-02) | After |
|---|---|---|
| `_tag === "Allow"`/`"Deny"` comparisons in `HydrationEngine.ts` | 3 | 0 |
| fields copied by name from `d`/`decision` | 1 (`entryAgrees`' claim) | 0 |
| `switch` in the file | 0 | 0 |

## Names chosen

`WireVerdict` (`DecisionWire["_tag"]`), `WireOf`, `EntryOf` (both mapped types over `WireVerdict` using `Extract`), `SeedOf`, `DisclosedOf`, `Row<V>`, `VERDICTS`, `rowOf`, `entryOf`, `seedOf`, `claimOf`. The helper parameters are `X[V] & { readonly _tag: V }`; the compiler accepted the table with no assertion, so no checkpoint was needed.

## GREEN under the scratch field

`git status --porcelain -- packages/core/src/DecisionWire.ts` printed nothing before and after. The same three-line scratch edit as 44-01 (`scratch: Schema.String` in `common`, `scratch: "x"` after each `trace: decision.trace,`), reverted with `git checkout -- packages/core/src/DecisionWire.ts` in a `finally`:

```
under the scratch field: tsc -b exit 0, HydrationSeedFields exit 1
GREEN: the scratch field reaches the seed; only the byte golden moves; DecisionWire.ts reverted
```

The run reported `Tests  4 failed | 2 passed`: the four golden tests failed, each showing `"scratch":"x"` in the received payload (for example `"durationMillis":3,"scratch":"x","disclosure":{"_tag":"Withheld"}`), and the round-trip property and the absent-key test passed with no `Property failed`. This is the opposite of 44-01's RED line (`property exit 1`, `expected undefined to deeply equal 'x'`): the field now reaches the seed with no edit in `rebuild`, and the bytes move only when core's wire does. Afterwards `git status --porcelain -- packages` printed nothing, `pnpm typecheck` exited 0 (rebuilding `lib/`), and `HydrationSeedFields.test.ts` passed 6/6. Nothing from this task was committed.

## Commits

- `8897662c` refactor(44-03): the allow/deny branch is one table row per verdict

The plan's metadata commit follows, so `rev-list plan_head_before..HEAD` reads 2 after it; `commits:` counts the one task commit (Task 2 commits nothing by design).

## Verification

`pnpm typecheck`, the whole react project (516 tests), `pnpm test:tstyche` (275 tests), `pnpm lint` (house-style clean, 3 declared switches) and `pnpm circular` pass. Task 1's structural check passed. No test file was edited; `git diff --quiet 47b3a140 -- packages/core` exits 0.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, decoder or trust boundary; `entryAgrees`' two guards and both claims are verbatim (T-44-06).

## Self-Check: PASSED

- `packages/react/src/HydrationEngine.ts` contains `const VERDICTS: { readonly [V in WireVerdict]: Row<V> } =`.
- Commit `8897662c` is an ancestor of HEAD.
- `packages/core/src/DecisionWire.ts` is clean.
