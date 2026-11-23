---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
plan: 06
subsystem: devtools
tags: [dock-model, tests, derived-store, spec-amendment]

requires:
  - phase: 72-05
    provides: "the dock model on three derived stores, the closed-model regression, BEH-QD-616 amended"
provides:
  - "DockModel.test.ts at 61 tests: one table-driven test per computed store and the store-list test"
  - "the store count as a failing test (a tenth member with subscribe and getSnapshot), shown failing"
  - "BEH-QD-615 without its ordinal, pinned by the per-store test; the DockModel.test.ts traceability row without the ordinals"
affects: [72-07, 72-08]

phase_base: 74f631ada0e04a6003e4dbf959db93ca161f6136
plan_head_before: ff41c7bacb6791d7f05a9bf423c7dbcf4203def2
plan_head_after: 6d2851c5

status: complete

actuals:
  tokens: 45000
  tasks: 2
  commits: 3

revisions-reached:
  "spec/behaviors/28-devtools-screens.md": "1.43"
  "spec/traceability.md": "1.250"

tech-stack:
  added: []
  patterns:
    - "a row table of { field, heard } effects looped with a fresh model per row, one list for the fields that move a store and one for those that must not"
    - "the store count is read from a built model: Object.entries kept by Predicate.hasProperty for subscribe and getSnapshot, against a list written once"

key-files:
  created: []
  modified:
    - packages/devtools/test/model/DockModel.test.ts
    - .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-RED-EVIDENCE.md
    - spec/behaviors/28-devtools-screens.md
    - spec/traceability.md

key-decisions:
  - "Pinned the order inside the rows themselves (a diagnostics listener reads the recomputed questions snapshot in the supplied-questions row, and the new wiring's state in the services wiring row) instead of a separate ordering test, so each per-store test states both its key and its order."
  - "Wrapped the M36 comment that 72-05 had to leave at 93 columns onto two lines, because this plan's width check diffs against phase_base and nothing requires the single-line form any more."

requirements-completed: []

duration: 9 min
completed: 2026-11-22
---

# Phase 72 Plan 06: One test per computed store and a store list that fails Summary

`DockModel.test.ts` now tests what is the dock's own: one table-driven test per computed store, the dock-specific rules unchanged, and a test of a built model that fails when a tenth store appears; BEH-QD-615 and the traceability row follow the deleted cases.

## What changed

- `DockModel.test.ts` (62 to 61 tests). Three tests, each a pair of row tables (`KeyRow`: a field name and an effect that builds a fresh model and answers how often the store heard), looped:
  - the diagnostics store: the feed's snapshot (a collector answer that differs on the next tick) and the supplied reading each notify once; a guard added to the registry and a new questions input with the same reading notify nothing.
  - the questions store: the gates feed's snapshot, the supplied questions and the unsampled flag each notify once; a configure moving only the wiring notifies nothing. In the supplied-questions row a diagnostics listener reads the recomputed questions snapshot.
  - the services store: the wiring, the activity, the call log and the unsampled flag each notify once; the hydration alone and the supplied questions alone notify nothing. In the wiring row a diagnostics listener reads the new wiring's state.
  - the store-list test lists the members of a built model with `subscribe` and `getSnapshot`, read with `Predicate.hasProperty`, against the nine names written once, in the model's order.
- The header's count sentences became one sentence pointing at BEH-QD-700 and the store-list test.
- M36 lost its held questions snapshot and the assertion on it (the join half); the registry half and its comment stay.
- Spec: BEH-QD-615's REQUIREMENT drops `It is the dock model's ninth store.`, its pinned-by names M48, the services per-store test, M53, M54 and the derived store's rules in `ExternalStore.test.ts`, under a dated amendment (1.43); the `DockModel.test.ts` row of the traceability matrix drops both ordinals and `M49 to M52`, names the per-store tests and cites BEH-QD-700 (1.250).

### Deleted titles

- `M49: the services store keeps its reference when only the hydration or the questions move`
- `M50: a new wiring alone recomputes the services view once`
- `M51: a new activity list alone recomputes the services view once`
- `M52: a new call log alone recomputes the services view once`
- `M55: a model whose scope closed recomputes no services view for a reading a later configure hands it`

### Added titles

- `the diagnostics store moves once per key field and not for gates or questions`
- `the questions store moves once per key field, before a diagnostics listener`
- `the services store moves once per key field, before a diagnostics listener`
- `the members with subscribe and getSnapshot are the stores BEH-QD-700 names`

M23, M27, M36 (registry half), M47, M48, M53, M54, J1 to J8, P1 and P2 are kept with every expected value unchanged. The closed-model behaviour of the services store (M55's subject) remains pinned by the characterisation's row on a new wiring after the scope closed.

## Verification

- `DockModel.test.ts`: 61 passed, 0 failed, titles unique. Devtools project: 71 files, 1704 passed (1705 less the five deleted plus the four added). `pnpm typecheck`, `pnpm test:tstyche` (370 passed, 2 skipped), oxlint on the file and house-style pass.
- The store-list test shown failing: with a throwaway tenth member `extra: { subscribe, getSnapshot }` in the working tree, the file run failed exactly that test (`expected [ Array(10) ] to deeply equal [ Array(9) ]`); the throwaway was reverted with `git checkout -- packages/devtools/src/model/DockModel.ts`, the tree held only the test file afterwards, and `72-RED-EVIDENCE.md` records the run and the 61 passed, 0 failed after the revert.
- `spec-revise --check`, `check-doc-examples.mjs` (118 blocks) and `verify-traceability.sh --strict` (PASS: 21, FAIL: 0, SKIP: 0) pass.
- Both plan `<verify>` scripts exit 0 (task 1 with the verification-only adjustment below).

## Commits

| Commit | Message |
| ------ | ------- |
| 17d35e85 | test(72-06): one test per computed store and a test of the store list |
| b8ff1de3 | docs(72-06): record the store-list test failing on a tenth store |
| 6d2851c5 | docs(72-06): BEH-QD-615 and the test map follow the trimmed dock tests |

## Deviations from Plan

Verification-only, no source, test or spec effect:

1. **[Verify misfire] Task 1's forbidden-construct grep matches the namespace import.** The plan requires `effect/Predicate` to be imported and house style requires the namespace form, `import * as Predicate from "effect/Predicate"`, whose text holds ` as P`, which the grep for ` as [A-Za-z{]` reports as an `as` assertion. Ran the equivalent check with import lines excluded from that one grep (everything else in the script unchanged); it exits 0.
2. **[Verify width] One 93-column comment line inherited from 72-05.** The width check diffs against `phase_base`, so M36's comment that 72-05 left single-line (a fixed-string requirement of that plan) counted as an added line; it is now wrapped onto two lines, which no later check forbids.

No Rule 1-3 deviations.

## Known Stubs

None.

## Threat Flags

None. T-72-13 (a dock-specific mutant's only killer deleted) is held by deleting only the generic-rule cases, with the kept list asserted in the verify; T-72-14 (a store added with no spec or test noticing) is held by the store-list test, shown failing on a tenth store.

## Self-Check: PASSED

- `packages/devtools/test/model/DockModel.test.ts`, `72-RED-EVIDENCE.md` (with `## The store-list test shown failing`), `spec/behaviors/28-devtools-screens.md` and `spec/traceability.md` exist and carry the changes above.
- Commits 17d35e85, b8ff1de3 and 6d2851c5 are ancestors of HEAD.
