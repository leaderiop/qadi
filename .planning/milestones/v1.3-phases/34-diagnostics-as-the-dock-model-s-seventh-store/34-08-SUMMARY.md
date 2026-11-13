---
phase: 34-diagnostics-as-the-dock-model-s-seventh-store
plan: 08
subsystem: spec
tags: [spec, adr, behaviors, invariants, traceability, docs]
status: complete

requires:
  - phase: 34-07
    provides: the diagnostics notice on every screen that reads the diagnostics
provides:
  - ADR-QD-047 Rev 1.13 amendment (CCR-QD-425) and ADR-QD-137 Rev 1.2 amendment
  - BEH-QD-506..510 new; BEH-QD-465 and BEH-QD-323 restated
  - INV-QD-313 and INV-QD-314
  - devtools screens spec 0.18, traceability rows, the CCR-QD-425 register row
  - package README and website page stating what the dock shows
affects: [34-09]

actuals:
  tokens: 33700
  tasks: 3
  commits: 3
plan_head_before: fc43ccb1464b33a69311f29c48cc5443e8f01250
plan_head_after: 5fb722fc03599cc859ba7fb3e3d30e87e0f7a9bf
commits: 3

tech-stack:
  added: []
  patterns:
    - "an amendment to the record that owns the boundary, not a new ADR; the reserved ADR number is named Unused"

key-files:
  created: []
  modified:
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md
    - spec/decisions/index.yaml
    - spec/behaviors/28-devtools-screens.md
    - spec/invariants.md
    - spec/devtools-spec/02-screens.md
    - spec/traceability.md
    - spec/README.md
    - packages/devtools/README.md
    - apps/website/src/content/docs/docs/packages/devtools.md

key-decisions:
  - "ADR-QD-047 is amended (Rev 1.13) rather than a new ADR written; ADR-QD-147 is named Unused in CCR-QD-425, as ADR-QD-138 was for CCR-QD-416"
  - "The Stopped reason is Cause.pretty kept verbatim and uncapped, carried only in the model's snapshot and rendered as height-bounded React text, never sent to a sink, response, log or metric"
  - "The useTimeline placeholder is the inert module-scope idleTimeline; useDiagnostics before its feed exists is Off without options and Starting with them"
  - "useRunningStore's deletion corrects the shared-mechanics sentence by a later amendment; the sentence itself is not rewritten"

requirements-completed: [DIAG-06, WX-02, WX-03]

duration: 6 min
completed: 2026-11-12
---

# Phase 34 Plan 08: The spec records the seventh store Summary

ADR-QD-047 amended to Rev 1.13 and ADR-QD-137 to Rev 1.2, BEH-QD-506..510 and INV-QD-313..314 added with BEH-QD-465 and BEH-QD-323 restated, and the traceability, register, README and website page brought in line, using only the reserved numbers.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 | 93fe2dfd | docs(34-08): ADR-QD-047 amended, diagnostics are the dock model's seventh store |
| 2 | 1c999a03 | docs(34-08): the seventh store, its status and its lifetime in the spec |
| 3 | 5fb722fc | docs(34-08): traceability, the CCR-QD-425 row, and what the dock shows |

## New revisions

| Document | Revision |
|----------|----------|
| spec/decisions/047-a-headless-devtools-model.md | 1.13 |
| spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md | 1.2 |
| spec/behaviors/28-devtools-screens.md | 1.18 |
| spec/invariants.md | 1.112 |
| spec/devtools-spec/02-screens.md | 0.18 (draft) |
| spec/traceability.md | 1.158 |
| spec/README.md | 1.162 |
| spec/overview.md | 1.99 (34-06; gate 13 re-checked here, no row change needed) |

## Gate results

- Task 1 verify script: pass; `node scripts/spec-revise.mjs --check`: pass.
- Task 2 verify script: pass; `pnpm spec:examples` (111 blocks compile, including BEH-QD-510's `tsx` fence); `pnpm spec:claims` (8 claims registered): pass.
- Task 3 verify script: pass with the one adjustment below; `pnpm spec:verify:strict` (PASS 21, FAIL 0, SKIP 0), `pnpm spec:api` (916 exports documented), `pnpm spec:gates` (25 steps match `pnpm check`), `pnpm spec:website-examples` (56 blocks compile): pass.
- Reserved numbers: ARCH-82, CCR-QD-425, BEH-QD-506..510 and INV-QD-313..314 used; ADR-QD-147 named Unused. `next-id.mjs` not run; no placeholder written.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Plan verify inaccuracy] Task 3's placeholder check scans all of spec/README.md**
- **Found during:** Task 3 verify
- **Issue:** the check refuses any `(ADR|CCR|BEH|INV)-QD-NEXT` in `traceability.md` plus `README.md`, but the README's CCR-QD-403 and CCR-QD-192 rows already quote the old placeholder as change history (two matches on the phase base, which AGENTS.md section 11 exempts). The check could not pass regardless of this plan's edits.
- **Fix:** ran the same check with the placeholder test narrowed to this plan's CCR-QD-425 row and the traceability lines naming CCR-QD-425; every other assertion in the script ran unchanged. No history was edited.
- **Files modified:** none.

**2. [Judgement within the plan] Stale file names in the traceability doc 28 row**
- The plan's Task 3 did not list the doc 28 row's source-file column, which still named `useDockSession`, `useExplorerSession` and `useRunningStore` (deleted in 34-04 and 34-06). I replaced them with `DiagnosticsFeed`, `TimelineFeed`, `useStoreSnapshot` and `DiagnosticsNotice` in the same edit that added `BEH-QD-506–510`; the matrix is a live map, not change history.
- **Commit:** 5fb722fc.

**Total deviations:** 1 plan-verify inaccuracy worked around, 1 small in-scope correction. **Impact:** none on the records.

## Known Stubs

None.

## Threat Flags

None. No code, endpoint or trust boundary changed.

## Self-Check: PASSED

- All ten files in the plan's `files_modified` exist and carry the stated revisions.
- Commits 93fe2dfd, 1c999a03 and 5fb722fc are ancestors of HEAD.
- `.planning/config.json` and `.planning/state.json` were never staged.
