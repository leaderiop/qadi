---
phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
plan: 05
subsystem: devtools
tags: [devtools, stop-ledger, table-test, fast-check, tdd]

phase_base: 892c4d36bf0f639a5219c53e7c39563533ea8b7e
plan_head_before: caf45f64146a0690465fcb63f8291d65a3536ce3
plan_head_after: ca9afeeb5282bedd9fe88461f1d3a34f1a84466b
commits: 1
status: complete

requires:
  - phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
    provides: 88-check.mjs (vitest, suite, commit, trailers modes), 88-pinned-check.mjs, the evidence file and its line forms
provides:
  - packages/devtools/src/model/StopLedger.ts (StopLedger, noStops, stoppedKey, announcesStop, recordStop), React-free, in neither barrel
  - packages/devtools/test/model/StopLedger.test.ts (L1 to L6, LAW1 to LAW3), written and seen red before the module existed
  - 88-RED-EVIDENCE.md, section 88-05 (the red run with HEAD and test blob, three module variants)
affects: [QD-88 plans 06 to 10]

actuals:
  tokens: 9000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "a table test as an array of closed rows, one `it` per row, with the laws looping over every row"

key-files:
  created:
    - packages/devtools/src/model/StopLedger.ts
    - packages/devtools/test/model/StopLedger.test.ts
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-05-SUMMARY.md
  modified:
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-RED-EVIDENCE.md

key-decisions:
  - "LAW3 draws its stops with `FastCheck.constantFrom(a, b, aAgain)` and not indices into an array, so no indexed read can be undefined."

patterns-established:
  - "a test born red with its module absent is committed with the module in one commit, tied to the red run by the recorded HEAD and test blob"

requirements-completed: []

coverage:
  - id: D1
    description: "The ledger transition is one pure module with a table test seen red first"
    verified_by: "88-RED-EVIDENCE.md `red before` entry; L1 to L6 and LAW1 to LAW3 pass; tsc -p tsconfig.test.json exits 0"
  - id: D2
    description: "Each law was seen failing under a module variant"
    verified_by: "88-RED-EVIDENCE.md: fresh-spread (L2, L6, LAW2), no-plus-one (L1, L3, L4, L5, LAW1, LAW3), always-plus-one (L2, L6, LAW1, LAW3)"
---

# Phase 88 Plan 05: The stop ledger Summary

**`model/StopLedger.ts` states the ledger transition as five pure exports (`StopLedger`, `noStops`, `stoppedKey`, `announcesStop`, `recordStop`) behind a nine-row table test that was run red with the module absent and committed with it, byte for byte as it ran.**

## Performance

- **Started:** 2026-11-25T23:26Z; **Completed:** 2026-11-25T23:33Z (about 7 minutes)
- **Tasks:** 2 (one tracer, one auto tdd); one task commit, as the plan states
- **Files created:** 3 (module, table test, this summary); 1 modified (the evidence file). No src file imports the module yet; plan 06 wires it.

## Accomplishments

- **Tracer (Task 1):** the table test written first. Run with the module absent, the report's one test file failed on `Failed to resolve import "../../src/model/StopLedger.ts"`. The run is recorded as `- red before: packages/devtools/test/model/StopLedger.test.ts` with scratch state `absent at HEAD caf45f64146a0690465fcb63f8291d65a3536ce3; test blob b439973b79b7355949e7611653c62ab5a3e21d86`. Nothing committed. The task's verify passed.
- **Module (Task 2):** written to the table, nothing in the test touched. `suite --partial --passing L1 L2 L3 L4 L5 L6 LAW1 LAW2 LAW3` reports 0 failing rows. The module imports nothing, holds no JSX, no directive, no `as`, no module-scope `let`, and is named by neither barrel. `pnpm exec tsc -p tsconfig.test.json --noEmit` and `oxlint` exit 0; `node scripts/check-house-style.mjs` is clean.
- **Variants seen failing** (each on a copy-backed module restored with `cp`):
  - `fresh-spread` (`recordStop` returns `{ ...ledger }` for the known stop): L2, L6, LAW2 (3 rows).
  - `no-plus-one` (the key reads `ledger.count` in both branches): L1, L3, L4, L5, LAW1, LAW3 (6 rows).
  - `always-plus-one` (the key is always `ledger.count + 1`): L2, L6, LAW1, LAW3 (4 rows).
- `88-earlier-checks.mjs` exits 0 with the module added; `88-pinned-check.mjs` reports `3 of 3 born files held`.

## Task Commits

1. Tasks 1 and 2: `ca9afeeb5282bedd9fe88461f1d3a34f1a84466b` `feat(88-05): add the stop ledger` (the module, the table test and the evidence file)

## Deviations from Plan

### Auto-fixed Issues

None.

### Choices the plan left open (decided autonomously)

- **LAW3's generator** is `FastCheck.array(FastCheck.constantFrom(a, b, aAgain), { maxLength: 30 })` and not indices into `[a, b, aAgain]`: the same space of sequences, with no indexed read to guard.
- **The failing-row lists per variant** are written in full, one `failed (<tag>)` line per failing row, so the evidence holds more rows than the three the plan requires. The variants fail more rows than the plan's behavior list names (`no-plus-one` also fails L1, L3, L4, L5 because the key's `+ 1` branch is the first-stop and new-stop answer in every one of them); the required rows are all present.

### Plan defects

None. Both verifies ran as written.

### Auth gates

None.

## Issues Encountered

- **`state.advance-plan` ran twice.** After the first call advanced STATE.md from `Plan: 5 of 10` to `Plan: 6 of 10`, a diagnostic call piped to `head -0` ran the verb a second time, leaving `Plan: 7 of 10`. The correct position after plan 05 is `Plan: 6 of 10`. Per the run rule it was not hand-edited; the orchestrator must repair the `Plan:` line in STATE.md (`completed_plans: 35` and the ROADMAP `5/10` are correct). `state.record-session` also ran twice, which is idempotent.

## Next Phase Readiness

- Plan 06 imports the module from `StoppedBox.tsx` and `useStopNotice.ts` and deletes the ledger declarations in `StoppedBox.tsx`; `88-check.mjs ledger-module` still exits 1 until then, as planned.
- The table test is held from `ca9afeeb`: a surviving mutant in plan 08 goes into a new `StopLedger.mutants.test.ts`, not into this file.

## Known Stubs

None.

## Threat Flags

None. T-88-07 is mitigated by the table, the two laws and the property, each seen failing under a variant; T-88-08 by the record type, which holds only `stop` and `count`.

## Self-Check: PASSED

- Files found: StopLedger.ts, StopLedger.test.ts, 88-RED-EVIDENCE.md, this summary.
- Commit found as an ancestor of HEAD: ca9afeeb.
- The committed test blob equals the recorded `test blob`; the recorded HEAD `caf45f64` is the commit's parent.
