---
phase: 29-restated-facts
plan: 03
subsystem: spec-and-gate
tags: [ccr, adr-amendment, changesets, merge-gate, mutation]

requires:
  - phase: 29-01
    provides: phase_base, d02_fallback no, the twelve-file mutation baseline
  - phase: 29-02
    provides: HydrationPayload.test.ts as the TIDY-02 guard, FAILURE_IS_NOT_A_DENIAL
provides:
  - "ADR-QD-094 amendment: a port's name and span are stated once in PortName.ts; a description's span is its own port's"
  - "CCR-QD-419 in the register; the PortName.tst.ts traceability row"
  - "three changesets: @qadi/core minor, @qadi/react patch, @qadi/devtools patch"
  - "29-mutation-after.json: every baselined file at or above its base"
affects: []

actuals:
  tokens: 6000
  tasks: 3
  commits: 4
plan_head_before: c5e126db5afb71fc11361dac6c5dda0e11b45034
plan_head_after: 058bbd294681b394332562d8c2a5c77bbad7fbb3

tech-stack:
  added: []
  patterns:
    - "an aggregate-free per-file mutation comparison; a drop is closed with a test, never a config edit"

key-files:
  created:
    - .changeset/port-name-leaf.md
    - .changeset/hydration-withheld-fields.md
    - .changeset/failure-sentence-constant.md
    - .planning/phases/29-restated-facts/29-mutation-after.json
  modified:
    - spec/decisions/094-a-port-is-described-once.md
    - spec/traceability.md
    - spec/README.md
    - packages/react/test/HydrationEngine.test.ts

key-decisions:
  - "No new ADR: ADR-QD-141 stays unused; the narrowing is an ADR-QD-094 amendment"
  - "HydrationEngine.test.ts traceability row not extended: TIDY-02's guard is HydrationPayload.test.ts (per 29-02)"

requirements-completed: [WX-01, WX-02, WX-03, WX-04, WX-05, WX-06]

duration: 25 min
completed: 2026-11-12
status: complete
---

# Phase 29 Plan 03: Record and merge gate Summary

**ADR-QD-094 amended (no new ADR), CCR-QD-419 and three changesets recorded, `pnpm check:pr` green with no gate edited, and all twelve baselined files at or above their mutation base after one surviving mutant in `HydrationEngine.ts` was killed with a test.**

## Performance

- **Duration:** about 25 min (mostly waiting on gates and Stryker)
- **Tasks:** 3
- **Files modified:** 8 (4 spec/changeset/test edits plus 3 changesets and the after-scores JSON)

## Accomplishments

- ADR-QD-094 Rev 1.11 carries `## Amendment (2026-11-12, CCR-QD-419)`: the leaf `PortName.ts`, `PortDescription.span` as `PortSpanOf<N>`, and why deriving the span union from the descriptions was rejected. `spec/decisions/141-*` does not exist.
- `spec/traceability.md` Rev 1.153 gained the `packages/core/test/PortName.tst.ts` row (BEH-QD-227, ADR-QD-094).
- CCR-QD-419 (README Rev 1.155) names every file the phase changed, records that no behaviour, wire byte, rendered text or metric key changed, and that ADR-QD-141, BEH-QD-480..484 and INV-QD-302..303 stay unused. D-02's fallback was not taken (`d02_fallback: no`).
- Changesets: `@qadi/core` minor (new type `PortSpanOf`, matches the export), `@qadi/react` patch, `@qadi/devtools` patch.
- WX-06: no defect fixed, none claimed.

## Merge gate (WX-01)

- `pnpm check:fast`: all 13 steps passed.
- `pnpm check:pr`: exit 0, ending `ran 16 of 17 steps; "pnpm mutation" was skipped`. The final evidence is the run with stdin closed (`pnpm check:pr < /dev/null`, log `check-pr-29-03c.log` in the scratchpad), run after the last edit to any file.
- `astro check` (step `pnpm website`) showed an interactive "install @astrojs/check" prompt in both runs. With stdin open, the second run hung there and was killed by the orchestrator (exit 143); with stdin closed it moved on. This is a pre-existing environment quirk, out of scope; nothing was installed and no script or config was edited.
- No gate script, budget, threshold or Stryker config differs from the phase base (`git diff --name-only <phase_base> -- scripts AGENTS.md vitest.config.ts … stryker*.mjs .oxlintrc.json` is empty; the first-commit and parent checks passed).

## Mutation comparison (WX-05)

Three Stryker runs, one at a time. Base vs after, from reports newer than every src and test file of their package (react re-run after the test below):

| File | Base | After |
| ---- | ---- | ----- |
| core PortMetrics.ts | 1.0000 | 1.0000 |
| core PortDescription.ts | 1.0000 | 1.0000 |
| core PortServing.ts | 1.0000 | 1.0000 |
| core Ports.ts | 1.0000 | 1.0000 |
| core PortDerivation.ts | 0.9800 | 0.9800 |
| core PortAccess.ts | 1.0000 | 1.0000 |
| core PortDoubles.ts | 1.0000 | 1.0000 |
| core PortRemote.ts | 0.8365 | 0.8365 |
| react HydrationEngine.ts | 0.9619 | 0.9693 |
| devtools model/Verdict.ts | 1.0000 | 1.0000 |
| devtools react/Inspector.tsx | 0.6812 | 0.6812 |
| devtools react/Simulator.tsx | 0.5449 | 0.5449 |

`PortName.ts` has no mutant and is type-only; `packages/core/src/index.ts` changed only by an `export *` line; no `unbaselined`, `missing`, `stale`, `barrel` or `base` line. The comparison exited 0.

## Task Commits

1. **Task 1: ADR-094 amendment and traceability** - `e66748b1` (docs)
2. **Task 2: CCR-QD-419 and the changesets** - `c242c6f5` (docs)
3. **Task 3: kill the HydrationEngine survivor** - `94841eb0` (test); **after-scores** - `058bbd29` (chore)

## Decisions Made

None beyond the plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug, the plan's expected drop] HydrationEngine.ts score fell 0.9619 to 0.9605**
- **Found during:** Task 3 (first mutation comparison, `DROP packages/react/src/HydrationEngine.ts`)
- **Issue:** `ALLOW_WITHHELD`/`DENY_WITHHELD` are module-scope, so `ignoreStatic` dropped eight killed mutants and the survivors stayed.
- **Fix:** added "a payload naming no subject yet carrying entries is refused whole, its entries handed back" to `HydrationEngine.test.ts`, which kills the survivor on the subject-less branch (`entries.length > 0 ? refuse(...) : ...`); re-ran the react Stryker command so the report is fresh. No threshold, config or ignore comment touched.
- **Files modified:** `packages/react/test/HydrationEngine.test.ts`
- **Verification:** HydrationEngine at 0.9693; comparison exits 0; `check:pr` re-run green afterwards.
- **Committed in:** `94841eb0`

---

**Total deviations:** 1 auto-fixed (1 Rule 1, anticipated by the plan)
**Impact on plan:** none; the traceability row for `HydrationEngine.test.ts` was left unextended on purpose (its new case is not the TIDY-02 guard).

## Issues Encountered

- Task 1's `pnpm spec:verify:strict` failed on "CCR register coverage" until Task 2 added the CCR-QD-419 row, as the sequencing implies; it passed after Task 2 and in `check:fast`.
- The `astro check` stdin prompt described above.

## Known Stubs

None.

## User Setup Required

None.

## Next Phase Readiness

Phase 29 is complete: all three plans have summaries. Nothing blocks the next phase.

## Self-Check: PASSED

Created files exist (three changesets, `29-mutation-after.json`); commits `e66748b1`, `c242c6f5`, `94841eb0`, `058bbd29` are ancestors of HEAD.
