---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
plan: 02
subsystem: react-developer-signals
tags: [regression-pair, type-pins, red-on-base, developer-signals, reporters]
phase_base: d147287a94a3bb3cad176e4f99bad7a0b76d8939
requires: ["71-01"]
provides:
  - "GateRegistry.store.test.ts: a four-row regression pair, a throwing collision reporter named by the option it was passed through (red on makeGateRegistry, green through makeQadiAtoms)"
  - "DeveloperSignals.tst.ts: six type pins fixing the API of the signal table (SIGNALS, SignalTable, SignalTag, ReporterName, reporterFor)"
  - "71-RED-EVIDENCE.md: both shown failing on the base, verbatim"
affects: [71-03]
tech-stack:
  added: []
  patterns: ["a whole-line console assertion that carries the received lines in its message, because the JSON report elides an array diff", "type pins refusing through an argument-taking helper so every refusal has a positive twin"]
key-files:
  created:
    - packages/react/test/DeveloperSignals.tst.ts
  modified:
    - packages/react/test/GateRegistry.store.test.ts
    - .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: the regression rows compare the console as one joined string and put the received lines in the assertion message (`saidOnly`), because vitest's JSON report prints a whole-array mismatch as `[ Array(1) ]` and the plan's own check needs the received line `the onGateIdCollision reporter you supplied threw` in the failure message."
  - "Decided autonomously: the missing-row and second-latch refusals go through a one-parameter helper (`takeTable`) so every directive sits on a call statement with a positive twin and no `expect` compares a value with its own annotation; their directive fragment is therefore `is not assignable to` (the first line of an argument error), not `is missing in type`. Directive text is documentary (TypeScript checks only that an error occurs), and 71-03 adjusts a fragment only if the compiler's wording differs."
patterns-established:
  - "Pins written against the API a later plan builds: the file fails on the base for its missing exports, and each pin is shown failing for its own reason by gutting the guarantee after the API exists."
requirements-completed: []
duration: 12 min
completed: 2026-11-22
status: complete
commits: 4
plan_head_before: ae3553842b61ed0254f187946d23aa918950d588
plan_head_after: 459f57e8bdec02bfb3fad2ecbc9e55400ddf8289
actuals:
  tokens: 9000
  tasks: 2
  commits: 4
---

# Phase 71 Plan 02: Regression pair and type pins, red on the base Summary

The defect and the missing guarantees fail on the phase base before any source changes: a throwing `onIdCollision` passed to `makeGateRegistry` is announced under `onGateIdCollision`, and the API of the developer-signal table (`SIGNALS`, `SignalTable`, `SignalTag`, `ReporterName`, `reporterFor`) is pinned by a type-test file that cannot compile until 71-03 builds it.

## Accomplishments

- `GateRegistry.store.test.ts`: one new describe, "a throwing collision reporter is named by the option it was passed through", with four rows (`makeGateRegistry` and `makeQadiAtoms`, each in development and production). Each registers `x` twice, compares the one console line whole and the listed ids (`x`, `x~1`). On the base the two `makeGateRegistry` rows fail (received `[qadi] the onGateIdCollision reporter you supplied threw …`), the two `makeQadiAtoms` rows pass; the file's other 22 tests are untouched and pass (26 total, 24 passed).
- `DeveloperSignals.tst.ts`: six pins with the plan's exact titles. The table is total (written-out tag union, `keyof typeof SIGNALS` and `SignalTag`); a table missing `AtomsReplaced` and one with `AtomsReplaced` latching once per process are not assignable to `SignalTable` (type pin plus a `@ts-expect-error` on a call statement, positive twin `SIGNALS`); `ReporterName` equals the written-out five-option union including `onIdCollision`; a call pairing `GateIdCollision` with `dehydrateDecisions` and one handing the dehydrate reporter to the hydrate row are refused, each with positive twins asserting the exact returned type. No negative `toBeCallableWith`/`toBeConstructableWith` pin, so `NOT_CALLABLE_PIN_BUDGET` and its table are unchanged; no `.skip`, `.only`, `.todo`, tstyche directive, `as`, `!` or `any`.
- `71-RED-EVIDENCE.md`: `## The regression pair on the base` (command, status, failing titles, received line verbatim) and `## The type pins on the base` (command, status, first ten log lines).

## Verification

- Task 1 verify (`regression pair red on the base`): exit 0.
- Task 2 verify (`type pins red on the base`): exit 0. `pnpm test:tstyche DeveloperSignals` exits 1 in both passes (five errors each: four missing exports and `ReporterName` declared locally but not exported); house-style reads `567 file(s) clean (3 declared switch(es), 68 type-test file(s))`.
- Oxlint clean on both files. `git status --porcelain -- packages spec scripts .changeset` empty; no `packages/*/src` file and not `DeveloperSignalReporters.test.tsx` changed.
- Not run, by design: full `pnpm typecheck` and `pnpm test:tstyche` (the new type-test file fails until 71-03).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The first form of the regression assertion could not show the received line**
- **Found during:** Task 1 step 2
- **Issue:** `expect(run.lines).toEqual([threw(…)])` fails, but vitest's JSON report reduces both arrays to `[ Array(1) ]` and a string comparison truncates the received line to 40 characters, so neither the evidence nor the plan's verify (which requires `the onGateIdCollision reporter you supplied threw` in the failure message) could see it.
- **Fix:** a local `saidOnly(lines, option)` compares `lines.join("\n")` with the expected line (a single line holds no newline, so zero or two lines fail too) and carries `JSON.stringify(lines)` in the assertion message.
- **Files modified:** `packages/react/test/GateRegistry.store.test.ts`
- **Commit:** 2c6f6726

**2. [Rule 1 - Bug] Directive fragment for the missing-row pin differs from the plan's wording**
- **Found during:** Task 2
- **Issue:** the plan names `is missing in type` for the missing-row statement and forbids an `expect` comparing a value with its own annotation; an annotated assignment then needs a use (`noUnusedLocals` is on).
- **Fix:** the statement is a call, `takeTable(withoutAtomsReplaced)`, whose compiler message starts `Argument of type … is not assignable to parameter of type`; the fragment is `is not assignable to`, for this pin and the second-latch pin alike. Recorded as a possible 71-03 adjustment; nothing checks the text.
- **Files modified:** `packages/react/test/DeveloperSignals.tst.ts`
- **Commit:** 4687ab38

**Total deviations:** 2 (both in how a pin is written; no expectation of the plan changed). **Impact:** none on scope.

## Known Stubs

None.

## Threat Flags

None. T-71-04 is mitigated by the regression pair comparing the whole line per entry point, committed red on the base; T-71-05 by written-out expected types, positive twins and no negative callable pin (71-03 guts each guarantee and records the pin failing).

## Commits

- `2c6f6726` test(71-02): pin the option a throwing collision reporter is announced under, red on the base
- `fb612f8b` docs(71-02): record the regression pair red on the base
- `4687ab38` test(71-02): pin the developer-signal table and its derived names, red on the base
- `459f57e8` docs(71-02): record the type pins red on the base

## Self-Check: PASSED

Created and modified files exist (`DeveloperSignals.tst.ts`, `GateRegistry.store.test.ts`, `71-RED-EVIDENCE.md`), the four commits are ancestors of HEAD, and both task verifies exit 0.
