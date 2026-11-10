---
phase: 13-lost-wave-gaps
plan: 12
subsystem: phase-close
tags: [merge-gate, mutation, rescue-branches, phase-close]

phase_base: 0925c2f
requires: ["13-01", "13-02", "13-03", "13-04", "13-05", "13-06", "13-07", "13-08", "13-09", "13-10", "13-11", "13-13"]
provides:
  - "`pnpm check:pr` green on Phase 13's final tree (XC-01)"
  - "Scoped Stryker scores of the final tree, compared per file against 0925c2f: none fell (XC-05)"
  - "`keep-wave5` carried out: the two `rescue/arch50-stash-*` branches deleted, `rescue/wave5-1013` kept (ROADMAP criterion 5)"
affects: [14]

actuals:
  tokens: 30000
  tasks: 4
  commits: 2

key-files:
  created:
    - .planning/phases/13-lost-wave-gaps/13-mutation-after.json
  modified:
    - .planning/phases/13-lost-wave-gaps/13-mutation-base.json
    - .planning/ROADMAP.md
    - .planning/STATE.md
    - .planning/REQUIREMENTS.md

requirements-completed: [GAP-01, GAP-02, GAP-03, GAP-04, GAP-05, GAP-06, GAP-07, GAP-08, GAP-09, GAP-10, GAP-12]
---

# 13-12: Phase 13 close (merge gate, mutation, rescue branches)

`phase_base: 0925c2f`. This is the phase's last plan; 13-13 ran before it, as ordered. No source or test file changed.

## Decisions applied

- **13-12 T3** (`_DECISIONS.md`): "`keep-wave5` | Delete `rescue/arch50-stash-a` and `rescue/arch50-stash-b`; keep
  `rescue/wave5-1013`". The checkpoint was answered there, so execution did not stop.
- **XC-05 ruling** (orchestrator): compare per file, as a ratio; a drop fails even when it comes from deleted killed mutants.

## Task 1: `pnpm check:pr` (exit 0, 2:02.89 wall)

`run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).`

| Step | Result |
|---|---|
| 1 typecheck | pass |
| 2 lint (oxlint + house style) | pass (2 pre-existing `no-unused-vars` warnings in `v4-reactivity-smoke.test.ts`) |
| 3 circular | pass |
| 4 test:tstyche | 41 files, 190 tests, 358 assertions |
| 5 coverage | 163 files, 4262 tests |
| 6 test:bdd | 34 files, 566 tests |
| 7 spec:examples | pass |
| 8 spec:verify:strict | PASS 21, FAIL 0, SKIP 0 |
| 9 spec:gates | pass |
| 10 spec:claims | pass |
| 11 spec:api | 882 exports documented across 9 packages |
| 12 spec:package | pass |
| 13 example | 7 files / 42 unit tests; next build; 30 Playwright e2e passed |
| 14 spec:website-examples | pass |
| 15 website | 45 pages built |
| 16 spec:publish | 9 packages and 6 documents agree on 0.11.0 |

Green on the first run; nothing needed fixing.

## Task 2: mutation (XC-05)

The base worktree step was skipped: 13-01 had already run it (`13-mutation-base.json`, 17 files). Bases for the files
the later plans touched were measured at `0925c2f` by those plans and recorded in their SUMMARYs (13-03/04
`SimulationForm.ts` 569/584; 13-05 `DecisionRecord`, `SinkEmit`, `PortMetrics`; 13-08 `DecisionStreamRoute`,
`DecisionBacklogRoute`; 13-10 `PortRemote`, `PortDescription`, `PortWire`, `TreeFold`, `Inspect`; 13-13 `Errors`,
`Role`, `Verdict`). Those 14 were added to `13-mutation-base.json` (now 31 files) so that one script compares them all.

The final-tree runs were scoped `--mutate` lists over every touched `src` file: core 13, http 7, devtools 10 and
audit 2, plus both compiler configs run whole. Script: `scratchpad/m1312.sh`. The plan's extractor wrote
`13-mutation-after.json` (36 files). The plan's verify printed `ok 31`, and no `qadi-base` worktree exists.

| File | base (0925c2f) | after |
|---|---|---|
| core DecisionCache.ts | .9479 | .9479 (91/96) |
| core Lifecycle.ts | .9565 | 1.0 (42/42) |
| core Predicate.ts | .9968 | .9968 (309/310) |
| core DecisionRecord.ts | 1.0 | 1.0 (21/21) |
| core SinkEmit.ts | 1.0 | 1.0 (17/17) |
| core PortMetrics.ts | no mutants | no mutants |
| core Errors.ts | 1.0 | 1.0 (1/1) |
| core Role.ts | .9299 | .9299 (146/157) |
| core PortRemote.ts | .8242 | .8242 (75/91) |
| core PortDescription.ts | 1.0 | 1.0 (8/8) |
| core PortWire.ts | .8 | .8 (4/5) |
| core TreeFold.ts | 1.0 | 1.0 (34/34) |
| core EvaluationMetrics.ts | new | no mutants (`ignoreStatic`) |
| http AuthorizeRequest.ts | .8889 | .9000 (18/20) |
| http PermissionRegistry.ts | 1.0 | 1.0 (25/25) |
| http PortRoutes.ts | .8929 | 1.0 (33/33) |
| http RequirePermissionMiddleware.ts | 1.0 | 1.0 (18/18) |
| http DecisionStreamRoute.ts | 1.0 | 1.0 (31/31) |
| http DecisionBacklogRoute.ts | 1.0 | 1.0 (8/8) |
| http UnguardedRoute.ts | new | 1.0 (11/11) |
| devtools Edits.ts | 1.0 | 1.0 (28/28) |
| devtools Remedies.ts | 1.0 | 1.0 (297/297) |
| devtools Replay.ts | 1.0 | 1.0 (55/55) |
| devtools SimulationEdit.ts | 1.0 | 1.0 (14/14) |
| devtools SimulationSession.ts | .9634 | .9644 (352/365) |
| devtools SimulationSource.ts | .9412 | .9444 (17/18) |
| devtools SimulationForm.ts | .9743 | .9819 (544/554) |
| devtools Inspect.ts | 1.0 | 1.0 (78/78) |
| devtools Verdict.ts | 1.0 | 1.0 (14/14) |
| devtools SimulationFields.ts | new | 1.0 (190/190) |
| audit CircuitBreaker.ts | .8051 | .8051 (157/195) |
| audit AuditWriteReport.ts | .9659 | .9659 (85/88) |
| predicate-sql index.ts | .9559 | .9559 (65/68) |
| predicate-sql CompileMetrics.ts | new | no mutants |
| predicate-prisma index.ts | .9237 | .9262 (113/122) |
| predicate-prisma CompileMetrics.ts | new | no mutants |

**Verdict: no file fell.** No fix was needed.

## Tasks 3–4: rescue branches (`keep-wave5`)

Before deleting, both stash branches still matched the plan:
- `rescue/arch50-stash-a` = `4b4c439c0b6d0ca804a8596ff03da57f1a92b74c`
- `rescue/arch50-stash-b` = `fc35d5e6e3d4c33beefd7074caa788a0bf572ee0`

Both contained `rescue/wave5-1013` (`merge-base --is-ancestor`). `git branch -D` removed them
(`Deleted branch rescue/arch50-stash-a (was 4b4c439).`, `… rescue/arch50-stash-b (was fc35d5e).`). Either one can be
restored with `git branch <name> <sha>` until gc prunes it.

Only local refs were touched: no push, no remote delete, no `git gc`. `git branch --list 'rescue/*'` after:

```
  rescue/wave5-1013     950977f ARCH-48: describe each simulation input field once, and sweep signatures
```

`rescue/wave5-1013` still reaches all six lost commits, so the deferred ARCH-51 `LeafNeeds.ts` review keeps `9cf0e5f`.

## Phase close

- ROADMAP: Phase 13 ticked; 13-12 ticked; progress row `13/13 | Complete | 2026-11-10`.
- REQUIREMENTS: GAP-01..10 and GAP-12 ticked. GAP-11 had been ticked by 13-13. 13-13 had reported GAP-10 as fully met.
  Traceability row `GAP-01..12 | Phase 13 | Complete`. XC-01 now records "Phase 13: green (13-12, 2026-11-10)", and the
  XC row reads "green for Phases 10, 11, 12, 13". The XC-* items stay unticked.
- STATE: `completed_phases` 3 → 4, `completed_plans` 27 → 28, 47%, and the position is now Phase 14.

## Deviations

1. **[Base file extended]** `13-mutation-base.json` was 13-01's 17 files. The 14 bases recorded later, at `0925c2f`, were
   added to it, so the plan's comparison script covers every touched file that has a base. The values were copied
   from those SUMMARYs, not re-measured.

## Commits

- `ee54996` test(13-12): Phase 13 mutation compare, final tree against 0925c2f
- docs(13-12): complete plan (this file and the planning ticks)

## For Phase 14

The base is this plan's final commit, `docs(13-12): complete plan`.
