---
phase: 29-restated-facts
plan: 01
subsystem: core
tags: [ports, locality, mutation-baseline, tstyche, barrel]
phase_base: 50c7292d5da586ca7a25ce321dbfa838f8873b06
d02_fallback: no

requires:
  - phase: 21-28
    provides: port descriptions, scoped reads and session-only simulator this phase's files sit beside
provides:
  - "29-mutation-base.json: twelve per-file Stryker scores from fresh reports at the phase base"
  - "PortName.ts: a port's name and span stated once, in an import-free leaf with no metric"
  - "PortDescription.span is PortSpanOf<N>: a description cannot name another port's span"
affects: [29-02, 29-03]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2
plan_head_before: 50c7292d5da586ca7a25ce321dbfa838f8873b06
plan_head_after: 2bfc6cc1a28fd9433ae6b2cae50edc92d47845db

tech-stack:
  added: []
  patterns:
    - "one module-private interface keys both unions (PortName = keyof, PortSpanOf<N> = indexed access), so a sixth port is one row"

key-files:
  created:
    - packages/core/src/PortName.ts
    - packages/core/test/PortName.tst.ts
    - .planning/phases/29-restated-facts/29-mutation-base.json
  modified:
    - packages/core/src/PortMetrics.ts
    - packages/core/src/PortDescription.ts
    - packages/core/src/PortServing.ts
    - packages/core/src/index.ts
    - spec/overview.md

key-decisions:
  - "D-02 taken in full: span is PortSpanOf<N>, no generic .span read needed a cast, so the fallback was not used"
  - "PORT_NAMES_BY_NAME keeps its TS2741 doc in PortMetrics.ts; PortName's own doc moved to the leaf"

requirements-completed: [TIDY-01, WX-03, WX-04, WX-05, WX-06]

duration: 5 min
completed: 2026-11-12
status: complete
---

# Phase 29 Plan 01: Restated facts, port identity Summary

**A port's name and span now live in `PortName.ts`, an import-free leaf with one five-row table, and `PortDescription.span` is `PortSpanOf<N>` so a description can only claim its own port's span; the phase's mutation baseline for all twelve changed files was committed first.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-11-11T23:13:00Z
- **Completed:** 2026-11-11T23:18:00Z
- **Tasks:** 2
- **Files modified:** 22 (21 in the refactor commit, one baseline JSON)

## Accomplishments

- Baseline measured before any src change and committed alone as the phase's first commit (`dd158b25`, parent `50c7292d`).
- `PortName.ts` leaf: `PortName`, `PortSpanName`, `PortSpanOf`; `PortMetrics.ts` imports the name type and no longer declares either union; no metric id, description or registry key changed.
- Fifteen importers re-pointed by the plan's single `sed`; none was opened. `PortDescription.ts` was edited by hand for `PortSpanOf`.
- `PortName.tst.ts` pins the five names, the per-port spans, and that a description's `span` is its own port's (`{ span: "qadi.acted" }` is not assignable to `attributeResolverPort`'s).
- `spec/overview.md` row split per D-06, Rev 1.94 to 1.95 through `spec-revise`.
- WX-06: no defect, none claimed. The existing pins stayed green before and after (core: 62 files, 2084 tests).

## Reserved-number check

`ARCH-77`, `ADR-QD-141`, `CCR-QD-419`, `BEH-QD-480..484`, `INV-QD-302`, `INV-QD-303` all free (no hit in `spec`, `packages`, `.changeset`, `AGENTS.md`); no `spec/decisions/141-*` file.

## Where the failure sentence is (for 29-02)

`/usr/bin/grep -rlF "depended on failed" packages/devtools/src` printed exactly the two expected files:

- `packages/devtools/src/react/Inspector.tsx:178-179` (`FailurePanel`)
- `packages/devtools/src/react/Simulator.tsx:444-445` (`SimulatedFailure`; a JSX comment on :441-443 precedes it)

## Mutation baseline (twelve scores, `29-mutation-base.json`)

| File | Score |
|------|-------|
| core `PortMetrics.ts` | 1 (every mutant Ignored, module-scope) |
| core `PortDescription.ts` | 1 |
| core `PortServing.ts` | 1 (type-only, absent from the report) |
| core `Ports.ts` | 1 |
| core `PortDerivation.ts` | 0.98 |
| core `PortAccess.ts` | 1 |
| core `PortDoubles.ts` | 1 |
| core `PortRemote.ts` | 0.8365384615384616 |
| react `HydrationEngine.ts` | 0.961864406779661 |
| devtools `model/Verdict.ts` | 1 |
| devtools `react/Inspector.tsx` | 0.6811594202898551 |
| devtools `react/Simulator.tsx` | 0.5449438202247191 |

The devtools run exited 1 after "Final mutation score 60.54 under breaking threshold 80" with the report written, so it is a recorded number, not a failed baseline (the `--mutate` widening to the two `.tsx` panels is what pulls the aggregate below 80). Core (93.28) and react (96.19) exited 0. `PortName.ts` and `index.ts` are left out of the baseline by design (the leaf must stay type-only; the barrel is excluded by core's config).

## Task Commits

1. **Task 1: preconditions, reserved numbers, mutation baseline** - `dd158b25` (chore)
2. **Task 2: TIDY-01, PortName.ts** - `2bfc6cc1` (refactor)

**Plan metadata:** the docs commit that carries this file.

## Files Created/Modified

- `packages/core/src/PortName.ts` - the leaf: module-private `PortSpans` table, `PortName`, `PortSpanOf<N>`, `PortSpanName`
- `packages/core/src/PortMetrics.ts` - unions deleted, `import type { PortName }`, `PORT_NAMES_BY_NAME` doc keeps the TS2741 note
- `packages/core/src/PortDescription.ts` - `span: PortSpanOf<N>`
- `packages/core/src/PortServing.ts` - header now names `PortName.ts`
- `packages/core/src/index.ts` - `export * from "./PortName.ts"` between `PortMetrics.ts` and `PortRemote.ts`
- six other src modules and nine test files - one import line each
- `packages/core/test/PortName.tst.ts` - the tstyche pin
- `spec/overview.md` - rows and Change History

## D-02 fallback

Not taken (`d02_fallback: no`). After the change `pnpm typecheck` was clean: no generic read of `.span` (core derivations, `PortAccess.ts`, devtools `PortCalls.ts`) needed a cast, so `PortSpanOf` stays exported and the third tstyche assertion stays. 29-03's changeset for `@qadi/core` is therefore minor.

## Decisions Made

None beyond D-02 as written in 29-CONTEXT.

## Deviations from Plan

None - plan executed exactly as written. The plan's spec-revise date example used `$(date +%F)`; the orchestrator's instruction to pass `--date 2026-11-12` was followed, since the host clock is still on 2026-11-11 UTC.

## Issues Encountered

None. Pre-existing lint warnings (66, none in files touched here) are untouched.

## Known Stubs

None.

## Threat Flags

None. T-29-01 held: metric declarations untouched, `Ports.test.ts` description pins green. T-29-03 mitigated by `PortSpanOf<N>` and the tstyche rejection test.

## Verification run

- `pnpm vitest run --project core`: 62 files, 2084 tests passed
- `pnpm exec tstyche` on `PortName.tst.ts`, `Ports.tst.ts`, `PortSpan.tst.ts`: 18 tests passed
- `pnpm typecheck`, `pnpm lint` (house-style: 457 files clean), `pnpm circular`, `pnpm spec:api` (907 exports), `spec-revise --check`: green
- multi-line-aware import check: 0 lines (baseline at `30efe00c` was 18)

## Next Phase Readiness

29-02 can start: the devtools sentence locations are recorded above and the baseline already covers `HydrationEngine.ts`, `Verdict.ts`, `Inspector.tsx` and `Simulator.tsx`. 29-03 needs `phase_base` and `d02_fallback` from this file's frontmatter.

## Self-Check: PASSED

---
*Phase: 29-restated-facts*
*Completed: 2026-11-12*
