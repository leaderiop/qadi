---
phase: QD-41-one-guarded-value-to-text-function
plan: 02
subsystem: value-to-text
tags: [red-tests, characterisation, explain, remedies, simulation-session]
plan_head_before: 479d5dd21a5688311b1a1bdde4e01682bdf1f0fb
plan_head_after: 8217de3f04e2b9dd7ab40d7e47d6625edcc9ffae
requires: [41-01]
provides:
  - packages/core/test/NonJsonLiteral.test.ts (14 expected failures on explain)
  - packages/devtools/test/model/NonJsonWitness.test.ts (21 expected failures at three levels)
  - the base's existing outputs written out green in Explanation, Remedies, Filters and SimulationForm tests
affects: [41-03, 41-04]
tech-stack:
  added: []
  patterns: [it.fails RED files flipped by the fix, characterisation appended in new describes]
key-files:
  created:
    - packages/core/test/NonJsonLiteral.test.ts
    - packages/devtools/test/model/NonJsonWitness.test.ts
  modified:
    - packages/core/test/Explanation.test.ts
    - packages/devtools/test/model/Remedies.test.ts
    - packages/devtools/test/model/Filters.test.ts
    - packages/devtools/test/model/SimulationForm.test.ts
key-decisions:
  - "RED cases are it.fails / it.effect.fails so the base stays green; each was also run without .fails in a temporary copy (deleted) to confirm the stated frame and error"
requirements-completed: []
requirements-advanced: [TEXT-01, TEXT-03, WX-06]
duration: ~25 min
completed: 2026-11-14
status: complete
commits: 3
---

# Phase 41 Plan 02: RED regression and base characterisation Summary

The throw is reproduced on the untouched base in core (`explain`) and devtools (the remedy table, three session commands, the rail and the inspector), as expected failures; then every output the phase must keep is written out green. No `packages/*/src` change (`git diff --stat 4035fcdd -- 'packages/*/src'` is empty).

## RED cases: base failure, first line

Run without `.fails` in a temporary copy, each case fails with the stated frame:

- `NonJsonLiteral.test.ts` (14 cases, all with an `Explanation.ts` frame): 9 x `TypeError: Do not know how to serialize a BigInt`, 3 x `TypeError: Converting circular structure to JSON`, 1 x `Error: SENTINEL-41 from toJSON`, 1 x `Error: SENTINEL-41 from a getter`.
- `NonJsonWitness.test.ts` (21 cases): 11 x BigInt `TypeError`, 8 x circular `TypeError`, 1 x `SENTINEL-41 from toJSON`, 1 x `SENTINEL-41 from a getter`. The 18 remedy, listed and edit cases fail with a `Remedies.ts` frame and no `Explanation.ts` frame; the unlisted-choice case and the two reading cases fail with an `Explanation.ts` frame and no `Remedies.ts` frame.

## Session command mapping

`setPolicy` is `choosePolicy(policy)`; `chooseSight` is `choosePolicy` of a listed sighting; an unlisted choice goes through `sightingFor` then `policyLabel`; a change of input is `edit(input)`. Each session case builds its own session in its own `it.effect` scope; both commands are synchronous and publish before returning.

## Characterisation (all passing on the base, none corrected)

- core `Explanation.test.ts`: 11 cases (function, `undefined`, symbol, `contains(fn)`, `[null,null]`, `[]`, `""`, `-0`, `NaN`, null-prototype, toJSON-gives-nothing).
- `Remedies.test.ts`: 7 cases (function, empty string, `-0`, null-prototype, resource number, size over a function, toJSON-gives-nothing).
- `Filters.test.ts`: 1 case (`big doc` keys only); `SimulationForm.test.ts`: 1 case (four refusals).
- The two outputs 41-04 changes on purpose, each pinned as a literal on its own line: core `explain` and the remedy label for `{ toJSON: () => undefined }` (both `undefined` today).
- No base output differed from the plan's expectation; no existing line of the four files was edited.

## Commits

- `ef78a2a9` test(41-02): an explanation of a literal with no JSON form throws (RED)
- `06787363` test(41-02): a remedy, a session command and a policy reading over a value with no JSON form throw (RED)
- `8217de3f` test(41-02): write out the labels, search text and refusals a value gets today

All three verify groups (6 scripts extracted from the plan) exit 0; `pnpm typecheck` is clean.

## Deviations from Plan

None - plan executed exactly as written. Requirements TEXT-01, TEXT-03 and WX-06 are advanced, not marked complete: the RED and the pins exist, and the change that satisfies them is 41-03 and 41-04. Commit trailer names `Claude Sonnet 5.5` (the executing model), accepted by the plan's trailer check.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Both new test files exist; the three commits are ancestors of HEAD; `git status --porcelain -- packages scripts spec .changeset AGENTS.md` is empty; the temporary `*.reason.test.ts` copies are gone.
