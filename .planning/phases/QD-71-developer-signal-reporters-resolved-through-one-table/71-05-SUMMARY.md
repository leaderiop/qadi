---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
plan: 05
subsystem: house-style-gate
tags: [module-state-budget, house-style, agents-md, process-latch]
phase_base: d147287a94a3bb3cad176e4f99bad7a0b76d8939
requires: ["71-04"]
provides:
  - "scripts/check-house-style.mjs: MODULE_STATE_BUDGET (one entry, DeveloperSignals.ts: 1), MODULE_STATE_BUDGET_NAMES, MODULE_STATE_DECLARATION, the per-line count and the checks [module-state], [module-state-names], [module-state-table]"
  - "AGENTS.md section 6: the module-state paragraph and the `| Module-scope state | Count | Why |` table the gate reads back"
  - "AGENTS.md section 13: the no-module-state sentence corrected in place to name the latch, with a pointer to the evidence document's section 7"
  - "spec/process/house-rules-evidence.md section 7 (Revision 1.4): the superseded sentence and why it changed"
  - "71-RED-EVIDENCE.md: the budget shown failing on five planted changes"
affects: [71-06, 71-08]
tech-stack:
  added: []
  patterns: ["a budget counted per file in library source only, with a names guard and an AGENTS.md table checked against it (the shape of UNTRUSTED_DECODE_BUDGET)", "module scope read as a column-0 let or var, so a module-scope const (a cache, a lookup table) is never counted"]
key-files:
  created: []
  modified:
    - scripts/check-house-style.mjs
    - AGENTS.md
    - spec/process/house-rules-evidence.md
    - .planning/phases/QD-71-developer-signal-reporters-resolved-through-one-table/71-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: the table's count cell is a plain `1` (as the plan's verify reads it) and the gate's row parser accepts the count with or without backticks, so either spelling is read the same way."
  - "Decided autonomously: the names guard accepts const, let, var or function declarations of the named identifier (the latch is a `let`), where the untrusted-decode guard accepts only const and function."
  - "Decided autonomously: no CCR id appears in AGENTS.md or spec text (the register row lands in 71-06); the new prose cites ADR-QD-184, and the revision entry cites ARCH-118 and ADR-QD-184."
patterns-established:
  - "A new piece of process state is a reviewed edit to the budget and the section 6 table together; a count moving or a rename fails in both directions."
requirements-completed: []
duration: 18 min
completed: 2026-11-22
status: complete
commits: 3
plan_head_before: 4d3f97f463d5dfaa1832363dd285557d32c31b5d
plan_head_after: ce67cbe19e2e78f3c1ab24d347e2a0afbdb0ca28
actuals:
  tokens: 9500
  tasks: 2
  commits: 3
---

# Phase 71 Plan 05: The module-state budget and the corrected AGENTS.md section 13 Summary

`check-house-style.mjs` now counts every module-scope `let` or `var` in library source against `MODULE_STATE_BUDGET` (today exactly the production-instrumentation latch in `DeveloperSignals.ts`), with a names guard and an AGENTS.md section 6 table checked back against it, and section 13's claim that no module-scope state is left is corrected in place with the old sentence kept in the evidence document's section 7.

## Accomplishments

- Task 1 (tracer): the budget, its names entry, the column-0 declaration token and the line map; the count runs beside the untrusted-decode scan under the same `!isTestFile && rel.startsWith("packages/")` guard. Three checks follow the untrusted-decode ones: `[module-state]` (a budgeted file's count differing, and an unbudgeted file with any), `[module-state-names]` (a listed declaration gone) and `[module-state-table]` (header missing, a row the budget does not match, a budget file with no row). The header comment gained its twelfth budget. AGENTS.md section 6 gained the paragraph and the one-row table, and says a module-scope `const` is not counted, so `Policy.ts`'s depth memo and the lookup tables need no row.
- The budget was shown passing on the tree (`house-style: 567 file(s) clean (3 declared switch(es), 68 type-test file(s))`, DoD line unchanged) and failing on five plants, none committed: a `let` in `QadiAtoms.ts`, a second `let` in `DeveloperSignals.ts` (found 2 at 339, 504), the latch turned `const` (found 0), the latch renamed (`[module-state-names]`) and the table row's count changed to 2 (`[module-state-table]`). Each first stderr line is in `71-RED-EVIDENCE.md` under `## The module-state budget shown failing`.
- Task 2: AGENTS.md section 13's sentence now says one piece of module-scope state is left, counted, the latch in `DeveloperSignals.ts` (ADR-QD-184, `MODULE_STATE_BUDGET` in section 6), with the registry and the hydration seed lookup still the atom set's; the bullet ends with a pointer to `spec/process/house-rules-evidence.md` section 7. That document gained section 7 (the superseded sentence as a blockquote, why it was false, what replaced it), Revision 1.3 to 1.4.

## Verification

- Task 1 verify (plan's `<automated>` extracted verbatim): exit 0, `the module-state budget passes and fails as stated`. It checked the budget text, the table (exactly the one latch row, inside section 6), house-style (567 files) and the DoD line, the five plant logs and statuses, no plant left in the tree, the evidence section, the two commits' file sets and trailers, and that `package.json` and the DoD table equal `phase_base`.
- Task 2 verify (extracted verbatim): exit 0, `section 13 names the one piece of module-scope state`. It covered section 13's wording and pointer, section 7 before the footer at Revision 1.4, `spec-revise --check`, house-style, the DoD line, `verify-traceability.sh --strict` (`PASS: 21   FAIL: 0   SKIP: 0`), the commit's file set and trailer, and a clean tree under `packages spec scripts AGENTS.md .changeset`.

## Deviations from Plan

None - plan executed exactly as written. One verification-only note: both verify scripts were extracted from the plan file and run after their commits rather than before, since they check the commit they follow.

## Known Stubs

None.

## Threat Flags

None. T-71-12 is held by `[module-state]` failing on any unbudgeted file (shown on the planted `let` in `QadiAtoms.ts`); T-71-13 by both directions plus `[module-state-names]` and `[module-state-table]`, each shown failing; T-71-14 by section 13 corrected in place and the old sentence kept in the evidence document's section 7.

## Commits

- `3012af56` chore(71-05): count module-scope let and var in library source against a stated budget
- `9a2dcf67` docs(71-05): record the module-state budget failing on each planted change
- `ce67cbe1` docs(71-05): name the one piece of module-scope state where AGENTS.md said there was none

## Self-Check: PASSED

`scripts/check-house-style.mjs`, `AGENTS.md`, `spec/process/house-rules-evidence.md`, `71-RED-EVIDENCE.md` and this summary exist, the three commits are ancestors of HEAD, and both task verifies exit 0.
