---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
plan: 02
subsystem: testing
tags: [red-tests, derived-store, type-pins, tstyche, dock-model, devtools]

requires:
  - phase: 72-01
    provides: "phase_base, the mutation base, the characterisation, 72-RED-EVIDENCE.md"
provides:
  - "the regression test of a closed model's diagnostics store, red on the base"
  - "describe(makeDerivedStore): 16 rules in ExternalStore.test.ts, red on the base"
  - "ExternalStore.tst.ts: one positive twin and three refusals of the derived store's key and parents"
  - "three more sections of 72-RED-EVIDENCE.md"
affects: [72-04, 72-05]

phase_base: 74f631ada0e04a6003e4dbf959db93ca161f6136
plan_head_before: f22e2194
plan_head_after: 2ce657fd09138a1cb1a9044d04360a90006540a3

actuals:
  tokens: 14500
  tasks: 2
  commits: 6

tech-stack:
  added: []
  patterns:
    - "a refused call held in a const read by expect, so no Effect floats under either tstyche pass"
    - "a RED test committed alone, then its evidence recorded alone"

key-files:
  created:
    - packages/devtools/test/model/ExternalStore.tst.ts
  modified:
    - packages/devtools/test/model/DockModel.test.ts
    - packages/devtools/test/model/ExternalStore.test.ts
    - .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-RED-EVIDENCE.md

key-decisions:
  - "The regression title is wrapped in the multi-line it.effect form: the plan fixes the title, and on one line it is 91 columns"
  - "The cause line recorded for the type pins is the missing-export error; tstyche's first printed error is a directive-message mismatch that follows from it"

requirements-completed: []  # DERV-02, DERV-04, WX-06, WX-07 stay Pending by instruction; only 72-08 marks requirements

duration: ~25min
completed: 2026-11-22
status: complete
---

# Phase 72 Plan 02: The regression and the derived store's rules, red on the base Summary

**One regression test of a closed model's diagnostics store, sixteen rules of `makeDerivedStore` and four type pins of its key and parents, all committed and recorded failing on `phase_base` before any `packages/*/src` file changes.**

## RED window

- `DockModel.test.ts`: one test fails (`a model whose scope closed merges no reading a later configure hands it`)
  from `060735e1` until 72-05's first task.
- `ExternalStore.test.ts` (16 rows) and `ExternalStore.tst.ts` (4 tests): fail from `37fe4c60` and `c8190954` until
  72-04's first task. Until then whole-suite `pnpm typecheck`, `pnpm test:tstyche` and the devtools vitest project are
  red on these files, so no plan in between runs them whole.

## Accomplishments

- Task 1 (tracer): the regression through `makeDockModel` (a model built in a scope, the scope closed, a later
  `configure` handing it a reading). On the base 62 titles run, 61 pass and exactly it fails: the base merges the
  reading and tells the diagnostics listener.
- Task 2: `describe("makeDerivedStore")` with the 16 rows as tabled (15 old rows still pass, the 16 new fail because
  the export is missing), and `ExternalStore.tst.ts` (positive twin compared with the written-out
  `Effect.Effect<DerivedStore<number>, never, Scope.Scope>` and three `@ts-expect-error` refusals, each call in a
  `const` read by `expect`; no `toBeCallableWith`).

## Task Commits

1. `060735e1` test(72-02): a closed model merges no reading a later configure hands it
2. `08e1688a` docs(72-02): record the closed-model regression red on the base
3. `37fe4c60` test(72-02): the rules of a store derived from parent stores
4. `c8190954` test(72-02): the key a derived store accepts
5. `b19fb0bd` docs(72-02): record the derived store tests red on the base
6. `2ce657fd` test(72-02): wrap the closed-model regression title within the line limit

## Verification

- Task 1 verify (`regression red on the base`): exit 0, run after commit 6 (it failed before it, see below).
- Task 2 verify (`derived store tests red on the base`): exit 0.
- Both verify bodies were run from copies of the plans `<automated>` scripts saved in the scratch directory, with the
  `bash -c '...'` wrapper removed; nothing was weakened.
- `pnpm exec oxlint` on the two test files: clean. No `packages/*/src` file differs from `phase_base`.

## Deviations from Plan

**1. [Rule 1 - Bug] The regression test's title line passed 90 columns**
- **Found during:** Task 1 verify, run after Task 2 (the verify's last width check)
- **Issue:** the fixed title in `it.effect("...", () =>` is 91 columns on one line.
- **Fix:** the multi-line `it.effect(\n title,\n () =>\n Effect.gen(...)\n)` form already used elsewhere in the file;
  same title, same body. The behaviour was re-run: 62 tests, exactly that one failing.
- **Files modified:** `packages/devtools/test/model/DockModel.test.ts`
- **Commit:** `2ce657fd` (a follow-up commit, so the already-recorded evidence head `060735e1` stays valid)

Two notes that are not deviations:

- Several derived-store titles are longer than 90 columns on one line, so those rows use the same multi-line form.
- The failure line of the first derived-store row is `TypeError: yield* (...) is not iterable`: the engine's wording
  for calling the missing export as the operand of `yield*`. The span row reports `is not a function`. Both are
  recorded in the evidence file.

## Known Stubs

None.

## Threat Flags

None. The plan adds test files and planning records; no endpoint, auth path or trust-boundary schema.

## Next Phase Readiness

Ready for 72-03. 72-04 builds `makeDerivedStore`, `DerivedStore`, `ReadableStore` and `Parent`, turns the 16 rules green
and guts each type guarantee once; if tstyche reports a directive fragment unmatched against the real messages, 72-04's
evidence records the final texts. 72-05 turns the regression test green.

## Self-Check: PASSED

- Files exist: `ExternalStore.tst.ts`, the three edited files, the evidence file with its three new sections.
- Commits `060735e1`, `08e1688a`, `37fe4c60`, `c8190954`, `b19fb0bd`, `2ce657fd` are on `arch-wave-13`;
  `git rev-list --count f22e2194..HEAD` was 6 before this summary's commit.
