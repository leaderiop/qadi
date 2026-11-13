---
phase: 36-carried-spec-debt-and-stale-records
plan: 13
subsystem: spec
tags: [spec, devtools, timeline, simulator, traceability, gate-13]
requires:
  - phase: 36-carried-spec-debt-and-stale-records
    provides: "36-02..36-08 timeline status, notice and one-value baseline code; 36-12 used BEH-QD-516..518, INV-QD-317..318, ADR-QD-149"
provides:
  - "BEH-QD-519 and BEH-QD-520 (28-devtools-screens.md Rev 1.20), BEH-QD-465, -509, -510 restated"
  - "BEH-QD-460 restated (29-devtools-simulator.md Rev 1.17): a checked baseline carries its reading"
  - "INV-QD-313 covers the timeline feed (invariants Rev 1.117)"
  - "ADR-QD-047 Rev 1.15 amendment, overview Rev 1.100 (TimelineStatus row; gate 13 green), traceability Rev 1.163"
  - "CCR-QD-427 row complete (README Rev 1.166): Used CCR-QD-427, ADR-QD-149, BEH-QD-516..520, INV-QD-317..318; Unused none"
affects: [36-14]
actuals:
  tokens: 30000
  tasks: 3
  commits: 3
commits: 3
plan_head_before: 1f498d3159b4673575ea4dcedec58470f39ddb9a
plan_head_after: 19b3be29abc09cbf773bf1557feb0f437df1eee4
tech-stack:
  added: []
  patterns:
    - "a restated requirement keeps its heading and gains a dated Amended blockquote; an ADR amendment is appended, earlier ones are history"
key-files:
  created: []
  modified:
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/29-devtools-simulator.md
    - spec/invariants.md
    - spec/decisions/047-a-headless-devtools-model.md
    - spec/decisions/index.yaml
    - spec/overview.md
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "BEH-QD-460's listing reads `readonly baseline: Baseline | undefined;` because the real snapshot field is `Baseline | undefined` (absent until a result ran against the current seed); a spec listing that dropped `| undefined` would state a false type"
  - "INV-QD-313's traceability section 2 row was extended with the timeline feed and TimelineFeed.test.ts, beside the section 4 row the plan named"
requirements-completed: [WX-02, WX-03]
status: complete
duration: 30 min
completed: 2026-11-13
---

# Phase 36 Plan 13: The timeline and simulator records Summary

**BEH-QD-519 and BEH-QD-520 record the timeline's stop, restart and notice, BEH-QD-460/465/509/510 and INV-QD-313 are restated, ADR-QD-047 is amended, the overview names `TimelineStatus` (gate 13 green for the first time since 36-02) and the CCR-QD-427 row is complete.**

## Commits

| Task | Hash | Subject |
|------|------|---------|
| 1 | `97213e03` | docs(36-13): the timeline states a stop, and a checked baseline carries its reading |
| 2 | `ff4e132d` | docs(36-13): the overview names TimelineStatus, and ADR-QD-047 records the eighth readout |
| 3 | `19b3be29` | docs(36-13): CCR-QD-427 is complete |

Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (checked with `git log -1 --format=%B`).

## Revisions

| Document | Before | After |
|---|---|---|
| spec/behaviors/28-devtools-screens.md | 1.19 | 1.20 |
| spec/behaviors/29-devtools-simulator.md | 1.16 | 1.17 |
| spec/invariants.md | 1.116 | 1.117 |
| spec/decisions/047-a-headless-devtools-model.md | 1.14 | 1.15 |
| spec/overview.md | 1.99 | 1.100 |
| spec/traceability.md | 1.162 | 1.163 |
| spec/README.md | 1.165 | 1.166 |

## Final CCR-QD-427 sentence

`Used: CCR-QD-427, ADR-QD-149, BEH-QD-516..520, INV-QD-317..318. Unused: none.` The row also names every phase file at its final Revision (all src, test, changeset and website files of 36-02..36-10 were checked against `git diff --name-only e0182035..HEAD`; the `(new)` marks match `--diff-filter=A`), the timeline narrative, `ADR: ADR-QD-149.` and **Breaking** for `@qadi/devtools`.

## Gate output

- Task 1 tests (6 files, TimelineFeed, DockModel, useTimeline, TimelineNotice, theme.contrast, DiagnosticsNotice): 94 passed.
- `node scripts/spec-revise.mjs --check`: every header agrees.
- `pnpm spec:verify:strict`: `PASS: 21   FAIL: 0   SKIP: 0`.
- `pnpm spec:examples`: `doc-examples: 113 block(s) compile` (includes BEH-QD-519's `tsx` fence).
- `pnpm spec:gates`: `dod-table: 25 step(s) match pnpm check, 141 reference(s) resolve`.
- `pnpm spec:api` (gate 13): `api-surface: 917 export(s) documented across 9 package(s)` (green; red since 36-02).
- `pnpm spec:claims`: `devtools-claims: 8 claim(s) registered across 6 file(s)`.
- Log: `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad/36-13-gates.log`.

## Deviations from Plan

**1. [Rule 1 - Accuracy] BEH-QD-460's listing keeps `| undefined`**
- **Found during:** Task 1
- **Issue:** the plan names the line `readonly baseline: Baseline;`, but `SimulationSnapshot.baseline` is `Baseline | undefined` (present only for a result that ran against the current seed).
- **Fix:** the listing reads `readonly baseline: Baseline | undefined;` and the paragraph under it says so. The plan's verify literal `readonly baseline: Baseline;` was checked as the prefix `readonly baseline: Baseline` instead; 36-14 should do the same.
- **Files modified:** spec/behaviors/29-devtools-simulator.md
- **Commit:** `97213e03`

**2. [Rule 2 - Completeness] INV-QD-313's section 2 traceability row extended**
- **Issue:** the plan names the section 4 rows; the section 2 invariant row lists INV-QD-313's source and tests and would have been silent about the timeline feed.
- **Fix:** added `TimelineFeed.ts` to its Source column and `TimelineFeed.test.ts` (TF9 to TF17) to its Test column.
- **Commit:** `ff4e132d`

**Total deviations:** 2 (one accuracy, one completeness). **Impact:** none on scope.

## Deferred Issues

`spec/behaviors/29-devtools-simulator.md` BEH-QD-322 (the `prepareSource` fence, around lines 534 and 677-691) and its package-private note still name `SourcePreparation`, which 36-08 removed in favour of `PreparedSource = ReadySource | RefusedSource`. The plan does not touch BEH-QD-322 and the fences are not compiled, so it is left as is; a later records pass (or 36-14's audit) should restate it.

## Known Stubs

None.

## Threat Flags

None. Documentation only; no network, auth or file-access surface.

## Self-Check: PASSED

All eight modified files exist and every commit is an ancestor of HEAD (`97213e03`, `ff4e132d`, `19b3be29`). The three tasks' acceptance criteria were re-run after their commits: BEH-QD-519 and 520 close `28-devtools-screens.md`; each Used BEH and INV has exactly one heading; ADR-QD-149's file exists; README is Rev 1.166.
