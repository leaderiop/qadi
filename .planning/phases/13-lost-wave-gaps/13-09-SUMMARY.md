---
phase: 13-lost-wave-gaps
plan: 09
subsystem: core-test-pins
tags: [core, evaluate, subject-set, decision-cache, decision-sink, lifecycle, tstyche, lost-wave-port]

phase_base: 0925c2f
requires: ["13-05"]
provides:
  - "`Evaluate.test.ts`: \"a missing resource wins over a missing action on HasResourceAttribute\" (GAP-07)"
  - "`SubjectSet.test.ts`: `describe(\"under a decision cache and a sink\")`, three tests ported from lost `4b1ed49` (GAP-09, test half)"
  - "`packages/core/test/Lifecycle.tst.ts`: `LifecycleOptions` = `EvaluateOptions` less `QuestionOptions`, both directions (orphan O3 of `4b1ed49`; GAP-10)"
affects: [13-11, 13-12]

actuals:
  tokens: 40000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - packages/core/test/Lifecycle.tst.ts
  modified:
    - packages/core/test/Evaluate.test.ts
    - packages/core/test/SubjectSet.test.ts

requirements-completed: [GAP-07, GAP-09, GAP-10]
---

# 13-09 — Three core pins: guard precedence, a batch under cache and sink, `LifecycleOptions`

`phase_base: 0925c2f`. Tests only; `git diff --stat b332826 HEAD -- packages/core/src` is empty.

## Decisions applied

No `checkpoint:decision` in this plan; `_DECISIONS.md` has no 13-09 row. CONTEXT D-01 (test first): each pin is a pin
of current behavior, so it was shown GREEN on the base and RED against a deliberate local mutation, then reverted.
None was RED on the base, so no live defect was found.

## Re-anchoring

- `Walk.ts` guards: still `:353-360` (`case "HasResourceAttribute"`), resource guard at `:354`, action guard at `:357`.
- `Evaluate.test.ts` `MissingAction` cases: `:1331-1384`; the pin sits after "a matcher referencing action() without one
  fails rather than denying".
- `LifecycleOptions` is at `Lifecycle.ts:60` (plan said `:151`); `EvaluateOptions` still `Evaluate.ts:26`.
- `DecisionCache.ts` has no key function: the key is the `Question` passed to `getOrCompute` at `Lifecycle.ts:131`. The
  Task 2 mutation was made there instead (see Deviations).

## Base GREEN runs

```
Task 1: Tests  1 passed | 217 skipped (218)      (Evaluate.test.ts -t "a missing resource wins over a missing action")
Task 2: Tests  3 passed | 36 skipped (39)        (SubjectSet.test.ts -t "under a decision cache and a sink")
Task 3: Tests: 2 passed, 2 total; Assertions: 3 passed   (tstyche Lifecycle.tst.ts)
```

## Mutation RED outputs (not committed; `packages/core/src` clean after each)

Task 1, the two `if` blocks in `Walk.ts` swapped:
```
FAIL |core| test/Evaluate.test.ts > the action dimension > a missing resource wins over a missing action on HasResourceAttribute
AssertionError: expected 'MissingAction' to equal 'MissingResource'
Expected: "MissingResource"
Received: "MissingAction"
```

Task 2, cache keyed on `subject.id` only (`Lifecycle.ts:131`: `getOrCompute({ ...question, subject: { id: question.subject.id } } as never, answer)`):
```
FAIL |core| test/SubjectSet.test.ts > under a decision cache and a sink > two subjects with one id and different roles each get their own decision
AssertionError: expected [ 'Allow', 'Allow' ] to deeply equal [ 'Allow', 'Deny' ]
Tests  1 failed | 2 passed | 36 skipped (39)
```

Task 3, `readonly probe?: boolean` added to `EvaluateOptions` only:
```
fail ./packages/core/test/Lifecycle.tst.ts
  + EvaluateOptions is QuestionOptions plus LifecycleOptions
  × LifecycleOptions names exactly the fields EvaluateOptions adds
Error: Type 'keyof EvaluateOptions' is not the same as type 'keyof QuestionOptions | keyof LifecycleOptions'.
```
The assignability test stays green for an optional extra field, as expected; the `keyof` test is the one that catches it.

## Deviations

1. **[Plan premise]** Task 2's mutation was planned "in `DecisionCache.ts`'s key function"; there is none (the cache
   keys on whatever `Question` it is handed). The equivalent mutation was made at the single `getOrCompute` call in
   `Lifecycle.ts:131`.
2. **[Ids]** The `Lifecycle.tst.ts` doc cites "ARCH-61; ports orphan O3 of lost commit 4b1ed49" rather than the plan's
   "ARCH-61 (lost ARCH-57 O3)", so the lost id is not given its lost-wave meaning (orchestrator rule). The SubjectSet
   describe's doc comment likewise cites `4b1ed49`.

## Mutation (XC-05)

No source file is touched by this plan (tests only), so no file's Stryker score can drop; Stryker was not run. The new
tests can only add kills (the Task 1 and Task 2 mutations above are new kills in `Walk.ts` and `Lifecycle.ts`).

## Gate results

- Task 1 verify: pin passes, `Walk.ts` unchanged → OK.
- Task 2 verify: 3 tests pass, `packages/core/src` unchanged → OK.
- Task 3 verify: tstyche passes, `packages/core/src` unchanged, `pnpm typecheck` green → OK.
- `pnpm vitest run --project core --coverage --coverage.include='src/**/*.ts'`: 59 files, 1956 tests pass; All files 99.05 / 96.97 / 99.22 / 99.75 (≥ 95%).
- `pnpm test:tstyche`: 41 files, 190 tests, 358 assertions pass.
- `pnpm lint`: house-style 424 files clean (3 declared switches); warnings only, pre-existing.
- `pnpm spec:api`: the same 10 expected drifts (6 core metrics, 4 devtools types).
- `pnpm spec:verify`: 18 pass, 3 expected fails (ADR-QD-123 index/traceability; CCR register drift now listing 399–402).
- No changeset: tests only, no public change.

## For Plan 13-11

- INV-QD-016 (`spec/invariants.md`, "Nothing is memoised across elements"): correct the text for the cache case. Its
  Source/Enforcement must name the decision cache (entries keyed on the whole subject, INV-QD-033; equal subjects share
  one walk, each still gets its own evaluation id, INV-QD-025) and cite `SubjectSet.test.ts`'s
  `describe("under a decision cache and a sink")`.
- Traceability rows:
  - `packages/core/test/SubjectSet.test.ts` (new describe) → INV-QD-016, INV-QD-033, INV-QD-025.
  - `packages/core/test/Evaluate.test.ts` (precedence pin) → INV-QD-011 / the `MissingResource`/`MissingAction`
    behavior row it already traces to.
  - `packages/core/test/Lifecycle.tst.ts` → ADR-QD-037 (the restatement it pins).
- CCR-QD-402 register row (shared with 13-08): add 13-09's half — GAP-07 precedence pin, the cache-and-sink batch tests
  and orphan O3's `Lifecycle.tst.ts`, ported from lost `4b1ed49`.

## Ids

- Used: CCR-QD-402 (shared with 13-08; register row is 13-11's). No new id.
- Cited with merged meanings: INV-QD-011, INV-QD-016, INV-QD-025, INV-QD-033, ADR-QD-037.
- Left free: ADR-QD-121, 122, 124, 125; BEH-QD-360..367, 369..378; INV-QD-255, 256, 258, 260..264; CCR-QD-403.

## Commits

| sha | subject |
|---|---|
| ae664a3 | test(13-09): a missing resource wins over a missing action on HasResourceAttribute |
| ab5a966 | test(13-09): a batch under a decision cache and a sink (ported from 4b1ed49) |
| 04332fa | test(13-09): LifecycleOptions is EvaluateOptions less QuestionOptions |
