---
phase: 19-verdict-presentation
plan: 02
subsystem: devtools
tags: [outcome-reading, obligation-state, characterisation, INV-QD-006, INV-QD-004]

mutation_baseline:
  packages/devtools/src/model/Inspect.ts: 1.0 (78/78, 19-mutation-base.json)
mutation_after:
  packages/devtools/src/model/Inspect.ts: 1.0 (97/97, 19-mutation-after-02.json)

requires: [19-01]
provides:
  - "`readOutcome(policy, outcome, reported)`, `RecordOutcome` (Failed | Denied | Allowed) and `ObligationState` (NoneOwed | Unreported | Reported) in model/Inspect.ts (package-private)"
  - "test/react/Inspector.test.tsx: 10 characterisation pins of the Inspector"
affects: [19-03]

key-files:
  created:
    - packages/devtools/test/react/Inspector.test.tsx
    - .planning/phases/19-verdict-presentation/19-mutation-after-02.json
  modified:
    - packages/devtools/src/model/Inspect.ts
    - packages/devtools/src/react/Inspector.tsx
    - packages/devtools/src/react/Simulator.tsx
    - packages/devtools/test/model/Inspect.test.ts

requirements-completed: [VIEW-03, VIEW-04]
duration: ~20 min
completed: 2026-11-10
---

# Phase 19 Plan 02: One outcome reading Summary

**A decision's outcome and its obligation state are now read once, by `readOutcome` in `model/Inspect.ts`, into two closed unions. The Inspector and the Simulator match on its tag and only choose their own sentences. `allowOf`, `isAllowed` and the nested obligation ternary are gone.**

## Decisions applied

- `_DECISIONS.md` pre-answers no checkpoint for Phase 19, and this plan raised none.
- D-01: the Inspector pins (`cdb5a627`) were committed before any source change and passed on the base. They are byte-identical after the refactor.
- D-03: `RecordOutcome = Failed { error, obligation } | Denied { tree, obligation } | Allowed { tree, fields, duties, obligation }`. `ObligationState = NoneOwed | Unreported | Reported { outcome }`. Both are `Data.TaggedEnum`s, as `WiringRead` in `DiagnosticsStore.ts` is. `fields` is typed `Allow["visibleFields"]`, because core's `VisibleFields` is not on its root surface. `undefined` stays "every field" (INV-QD-004), and a test pins it.
- User preference: closed unions written in full. There is no widening and no `string` key.

## Plan output notes

- **Signature:** `readOutcome(policy, outcome, reported)`, not `readOutcome(record)`. The Simulator holds no `DecisionRecord`, only a `DecisionOutcome` and the question's policy. CONTEXT D-03 states it as "an outcome and a policy". The Inspector passes `entry.decision.policy, entry.decision.outcome, entry.obligations`. The Simulator passes `undefined` for the report, because a simulation discharges nothing. The function is package-private, so this is not a one-way decision.
- **Dispatch:** `readOutcome` uses `Match.value(...).pipe(Match.tagsExhaustive(...))` on the outcome tag and then on the decision tag (Allow/Deny). Its arms close over `policy` and `reported`, and it runs once per render. The screens use `Match.type<RecordOutcome>().pipe(Match.tagsExhaustive(...))`, built once at module scope: `outcomePanels` and `obligationLine` in Inspector, and `resultBody` and `resultGrant` in Simulator. `RecordOutcome.$match` was not used.
- **Precedence:** a report wins over the duty count. An arrived gate outcome is shown on an allow that listed no duties, and on a denied or failed row too, exactly as at HEAD. Pins cover all three cases.
- **Exact obligation texts pinned:**
  - Unreported: `Outcome not yet reported. An undischarged binding duty turns this allow into a refusal at the enforcement boundary.`
  - Reported: `` Gate outcome: ${outcome}. Per-duty state is not observable — a handler receives the whole set and reports once. `` The pins cover Refused, NotRequired, Discharged and HandlerFailed.
  - NoneOwed: **no panel and no state line.** At HEAD the ternary's `"None owed."` branch could never render, because `ObligationsPanel` returned `null` first whenever no duties and no report were present. The pin states what HEAD rendered, and the dead string was dropped with the ternary.
- The barrel is unchanged (`git diff 9483aac -- packages/devtools/src/index.ts` is empty). `inspectEntry`'s signature is unchanged, and it stays the public read of a row's tree.

## Deviations

- The signature is described above. It follows CONTEXT D-03's wording over the plan's `readOutcome(record)` shorthand.
- The plan asked for six or more pins, and Task 1 wrote 10. The four extras are: undefined fields show "every field"; a report on a no-duty allow; a report on a denied row; a report on a failed row. They pin the report-precedence behaviour that `readOutcome` had to keep.
- Task 2 has 8 tests. Beyond `<behavior>`, they include the Failed+report and Denied+report cases, which kill the `[]`/`reported` mutants.

## Commits

- `cdb5a627` test(19-02): pin the Inspector's outcome and obligation rendering
- `22ddee4c` test(19-02): one read of a record's outcome, red
- `f7bbea86` feat(19-02): readOutcome, the one read of an outcome and its obligation
- `02e9b3f9` refactor(19-02): Inspector and Simulator read the outcome only through readOutcome

## Gate results

- Task 1: `Inspector.test.tsx` 10/10 green on the unrefactored base.
- Task 2 RED: 8 tests failed with `TypeError: readOutcome is not a function`, and 37 passed. GREEN: `Inspect.test.ts` 45/45. `pnpm typecheck` green. The barrel diff since the phase base is empty.
- Task 3:
  - `pnpm vitest run --project devtools`: 43 files, 1160 tests passed. `pnpm typecheck`, `pnpm lint` (house-style: 443 files clean, no devtools warnings) and `pnpm circular` are green.
  - `allowOf` count is 0, and the `isAllowed` count over Inspector+Simulator is 0.
  - The pins are byte-identical to `cdb5a627`.
- Coverage: the devtools model (`--coverage.include='src/model/**/*.ts'`) is at 99.93 / 99.39 / 100 / 100.
- Mutation (XC-05): a scoped run (`stryker.devtools.mjs --mutate packages/devtools/src/model/Inspect.ts`) gave Inspect.ts 97/97 = 1.0, against a base of 1.0, so there is no drop (`19-mutation-after-02.json`). `react/` is outside the devtools Stryker scope.

## Deferred to 19-03

- Spec records:
  - INV-QD-006/INV-QD-004 notes, including the outcome reading as the one place a failure is kept tree-less and `undefined` fields stay "every field"
  - the devtools-spec statement for the verdict treatment
  - a sentence that Inspector and Simulator read outcome and obligation state only through `readOutcome`
  - BEH 429..438, INV 290..294, ADR-QD-131 or a stated reason for none, CCR-QD-409
- The `@qadi/devtools` patch changeset. This plan changed no visible output: the Inspector's DOM is pinned unchanged, and the Simulator's testids and texts are unchanged.
- The phase-wide mutation compare against `19-mutation-base.json`, and `pnpm check:pr`.
