---
phase: 27-bare-route-module
plan: 03
subsystem: testing
tags: [spec, adr, beh, changeset, stryker, merge-gate]

requires:
  - phase: 27-bare-route-module
    provides: addGuardedRoute written once, PermissionRegistryRoute.ts, the nine-file Stryker baseline (27-01, 27-02)
provides:
  - BEH-QD-470 (the bare guarded route's CurrentSubject rule), traced to GuardRoute.tst.ts
  - ADR-QD-036 Rev 1.10 amendment and an ADR-QD-108 note recording the module shape and why it is not what ROUTE-01/ROUTE-03 literally said
  - CCR-QD-417 and a @qadi/http patch changeset
  - the phase's merge-gate and mutation evidence (pnpm check:pr exit 0; every file and the aggregate at 1.0)
affects: []

actuals:
  tokens: 14000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A span name a tracer filters on is pinned by a test that reads it back from collectingTracer (ADR-QD-051)"

key-files:
  created:
    - .changeset/bare-route-module.md
    - .planning/phases/27-bare-route-module/27-mutation-after.json
  modified:
    - spec/behaviors/23-http.md
    - spec/decisions/036-qadi-http-package-shape.md
    - spec/decisions/108-a-request-is-enforced-once-through-one-module.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - packages/http/test/AuthorizeRequest.test.ts

key-decisions:
  - "Both departures from the requirement wording (unguardedRoutes stays a private sibling because of the barrel; the /__permissions routes sit in PermissionRegistryRoute.ts because of the cycle) are recorded in CCR-QD-417 and ADR-QD-036, with their reasons"
  - "The aggregate mutation drop was fixed by killing the two span-name survivors in AuthorizeRequest.ts with tests, not by changing the baseline"

requirements-completed: [ROUTE-01, ROUTE-02, ROUTE-03, WX-01, WX-02, WX-03, WX-04, WX-05, WX-06]

duration: 14min
completed: 2026-11-11
status: complete
plan_head_before: 878a825a0b209eff68b5ebfaddf45f7df63368e2
plan_head_after: 010d9f1edc4ec210ecba4c6d772225c8716d0b9f
---

# Phase 27 Plan 03: Record the phase and prove the gate Summary

**BEH-QD-470, the ADR-QD-036 amendment and CCR-QD-417 record that `addGuardedRoute` is written once and why the module shape differs from the requirement wording in two places; `pnpm check:pr` exits 0 and Stryker reads 1.0 on every file of the ten, aggregate included.**

## Performance

- **Duration:** about 14 min of work (two `pnpm check:pr` runs of about 8 min each dominate the wall clock)
- **Started:** 2026-11-11T14:13Z
- **Completed:** 2026-11-11T14:28Z
- **Tasks:** 3
- **Files modified:** 7 changed plus 2 created

## Accomplishments

- `spec/behaviors/23-http.md` gains BEH-QD-470 (after BEH-QD-335): the handler's `CurrentSubject` is discharged, the loader's is not, the error channel is closed, and the rule is pinned on `addGuardedRoute` in `GuardRoute.tst.ts`. The paragraph that listed `guardRoute` among the unexported names now says it was removed in ARCH-75 (Rev 1.17).
- ADR-QD-036 Rev 1.10 carries the dated ARCH-75 amendment: `guardRoute` removed, `addGuardedRoute` written once in `GuardRoute.ts`, the `/__permissions` routes in `PermissionRegistryRoute.ts` because of the cycle (ADR-QD-037), `unguardedRoutes` a private sibling because of the barrel (ADR-QD-099). ADR-QD-108 Rev 1.3 has a one-line note answering its own "folding GuardRoute.ts" alternative.
- `spec/invariants.md` (Rev 1.106) and `spec/traceability.md` (Rev 1.151) name `addGuardedRoute`, `PermissionRegistryRoute.ts` and `GuardRoute.tst.ts`; the behaviour 23 row lists BEH-QD-470 and `PermissionRegistryRoute`; the stale `PermissionRegistry.tst.ts` row is replaced. `07-enforcement.md` and `26-decision-stream.md` needed no change (their `GuardRoute.ts` citations were still true; the one `PermissionRegistry` mention is the service, not the route).
- CCR-QD-417 in `spec/README.md` (Rev 1.153) lists the files, both deviations with reasons, and every number's fate; `.changeset/bare-route-module.md` is a `@qadi/http` patch.
- `pnpm spec:verify:strict` is green again (it was red on exactly the two checks this plan owned: the `PermissionRegistry.tst.ts` citation and the CCR register).
- `pnpm check:pr` exits 0, twice (before and after the new test): 16 of 17 steps, mutation skipped. Last run: tstyche 230 passed; vitest 176 files, 4582 tests; coverage All files 99.41 / 97.83 / 99.16 / 99.73 (http and core above their thresholds); BDD 568 tests; `spec:verify:strict` PASS 21, FAIL 0, SKIP 0; `spec:api`, `spec:package`, examples, website and `spec:publish` green.
- No file under `scripts/`, `AGENTS.md`, a vitest config, `stryker.http.mjs` or `.oxlintrc.json` changed since the phase base.

### Mutation comparison (WX-05)

Stryker on the nine baselined files plus `PermissionRegistryRoute.ts`, compared against `27-mutation-base.json`; no `missing`, `DROP`, `unbaselined` or `no phase base`.

| File | Base | After |
| ---- | ---- | ----- |
| GuardRoute.ts | 1.0 | 1.0 |
| PermissionRegistry.ts | 1.0 | 1.0 |
| UnguardedRoute.ts | 1.0 | 1.0 |
| PortRoutes.ts | 1.0 | 1.0 |
| DecisionStreamRoute.ts | 1.0 | 1.0 |
| DecisionBacklogRoute.ts | 1.0 | 1.0 |
| DevtoolsRoutes.ts | 1.0 | 1.0 |
| AuthorizeRequest.ts | 0.9 (18/20) | 1.0 (20/20) |
| NoResource.ts | 1.0 | 1.0 |
| PermissionRegistryRoute.ts (new) | n/a | 1.0 (15/15) |
| aggregate (nine at base, ten after) | 0.9856 (137/139) | 1.0 (138/138) |

## Task Commits

1. **Task 1: BEH-QD-470, ADR-036/108, citations, traceability** - `76cffc31` (docs)
2. **Task 2: CCR-QD-417 and the changeset** - `5d4d39f1` (docs)
3. **Task 3: merge gate and mutation comparison** - `010d9f1e` (test; the gate itself writes no files, the commit carries the span-name tests and `27-mutation-after.json`)

**Plan metadata:** the docs commit that carries this file and the STATE/ROADMAP update.

## Decisions Made

- The two requirement-wording departures are recorded rather than reversed: reversing either re-opens the export barrel or the import cycle.
- The aggregate drop (see Deviations) was closed by pinning two product-observability span names, not by touching the baseline.

## Reserved numbers

- Used: BEH-QD-470, CCR-QD-417, ARCH-75.
- Unused: ADR-QD-139 (no new decision; ADR-QD-036 amended), BEH-QD-471 to BEH-QD-474, INV-QD-298 and INV-QD-299.
- WX-06: no defect was found, so there is no red-first commit.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Aggregate mutation score read 0.98551 against a base of 0.98561**
- **Found during:** Task 3 (the first comparison printed `DROP __aggregate__`; every file was at or above its base)
- **Issue:** the phase deleted duplicated code (`guardRoute`, `buildGuardedRoute`, one of two method unions), so the nine files' mutant total fell by one while the two pre-existing survivors in `AuthorizeRequest.ts` (the span-name literals `qadi.http.authorizeRequest` and `qadi.http.enforceSubject`, both in the 27-01 baseline at 18/20) stayed: 136/138 against 137/139.
- **Fix:** two tests in `packages/http/test/AuthorizeRequest.test.ts` read each span name back through `collectingTracer`. These names are the product observability ADR-QD-051 names, so pinning them is meaningful, not a score trick. No threshold, baseline or disable comment changed.
- **Files modified:** `packages/http/test/AuthorizeRequest.test.ts`
- **Verification:** Stryker re-run: `AuthorizeRequest.ts` 20/20, aggregate 138/138; `pnpm check:pr` re-run, exit 0.
- **Committed in:** `010d9f1e`

---

**Total deviations:** 1 auto-fixed (1 bug-class gap in coverage of a baselined file)
**Impact on plan:** none on scope; two extra tests in a file the phase had already touched.

## Issues Encountered

- `scripts/spec-revise.mjs` needs `--date` (27-02's finding); passed it every time, script not edited.
- `packages/http/test/v4-http-smoke.test.ts:106` still cites `PermissionRegistry.ts`'s `registerApi`: a stale citation that predates this phase, out of scope, left as is.
- The first guardRoute-wording check failed on lines I had written (Change History rows and one sentence without a history word on the same line); reworded to carry "removed" on the line, then green.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 27 is complete: ROUTE-01..03 and WX-01..06 are recorded and evidenced. The orchestrator marks the requirement checkboxes.

## Self-Check: PASSED

- Files: `spec/behaviors/23-http.md` (contains `## BEH-QD-470`), `spec/README.md` (one `| CCR-QD-417 |` row), `.changeset/bare-route-module.md`, `27-mutation-after.json`, `packages/http/test/AuthorizeRequest.test.ts` all present.
- Commits `76cffc31`, `5d4d39f1`, `010d9f1e` are ancestors of HEAD.
- `node scripts/spec-revise.mjs --check`, `pnpm spec:verify:strict`, `pnpm check:pr` all exit 0.

---
*Phase: 27-bare-route-module*
*Completed: 2026-11-11*
