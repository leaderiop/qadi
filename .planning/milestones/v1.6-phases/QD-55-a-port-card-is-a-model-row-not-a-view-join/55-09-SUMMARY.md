---
phase: QD-55-a-port-card-is-a-model-row-not-a-view-join
plan: 09
subsystem: devtools
tags: [phase-scan, check-pr, release-check, requirements, ARCH-102]
phase_base: 0c349d6fc46978fe546dcb4767b94c17cbf7b03c
requires: ["55-08"]
provides:
  - "the phase scan, D-08 grep, panel scan and D-15 comparison, all clean on the committed tree"
  - "pnpm check:pr green (16 of 17 steps, mutation skipped by design)"
  - "CARD-01..05 marked complete in .planning/REQUIREMENTS.md; WX-01..07 left Pending"
affects: []
tech-stack:
  added: []
  patterns: ["checks-only closing plan: scan scripts extracted verbatim from the plan's <automated> blocks"]
key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
key-decisions:
  - "WX-01..07 stay Pending because they span every v1.6 phase; only CARD-01..05 close with this phase"
requirements-completed: [WX-01, WX-02, WX-04, WX-05, WX-06, WX-07, CARD-01, CARD-02, CARD-03, CARD-04, CARD-05]
duration: 15min
completed: 2026-11-18
status: complete
commits: 0
plan_head_before: c0eb208e2ad7b82087c9673e9ebef32b5e798324
plan_head_after: c0eb208e2ad7b82087c9673e9ebef32b5e798324
actuals:
  tokens: 3000
  tasks: 2
  commits: 0
---

# Phase QD-55 Plan 09: The phase scan, check:pr and the release check

**The whole phase's diff and history pass the scan (scope, forbidden constructs, budgets, order, kept tests, ids), the join compares no port as a string, the panel computes nothing, the D-15 mutation comparison holds, `pnpm check:pr` exits 0, nothing was released, and CARD-01..05 are complete.**

No source, test, spec or script file changed in this plan; the only edit is `.planning/REQUIREMENTS.md`. The 0 commits above is the count of task commits (a checks-only plan); the `docs(55-09)` metadata commit follows.

## Phase scan

Run from the repository root against `phase_base` 0c349d6f:

```
phase scan clean
```

Exit 0. Every changed path was in the allow-list, no forbidden construct was added under packages/*/src, packages/*/test or the BDD step, the `switch (` and `Effect.fnUntraced(` counts were unchanged, and the order, kept-test, id and reservation-file checks all held.

## D-08

```
D-08: no port comparison in the join
```

Exit 0.

## Panel scan

```
the Services panel renders the store and computes nothing
```

Exit 0.

## D-15

```
packages/devtools/src/model/DockModel.ts 1 -> 1 (detected 123 -> 145; survivors +0 -0)
packages/devtools/src/model/Wiring.ts 1 -> 1 (detected 50 -> 48; survivors +0 -0)
packages/devtools/src/model/PortCards.ts 1 (detected 126; survivors 0; ignored 14)
static: all 14 ignored mutants of packages/devtools/src/model/PortCards.ts are Killed in .planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/55-mutation-static.json
WX-05 holds (D-15)
```

Exit 0.

## check:pr

`pnpm check:pr < /dev/null` on the committed tree, nothing else running, exit code 0. It printed 16 steps and ended with `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).`

1. pnpm typecheck
2. pnpm lint (`house-style: 549 file(s) clean (3 declared switch(es))`; the oxlint warnings it printed are in untracked `.codex/` hooks and a pre-existing `predicate-sql` test, none in this phase's files)
3. pnpm circular
4. pnpm test:tstyche
5. pnpm coverage (235 files, 5766 tests passed; statements 99.59%, thresholds held)
6. pnpm test:bdd (34 files, 568 tests passed)
7. pnpm spec:examples
8. pnpm spec:verify:strict
9. pnpm spec:gates
10. pnpm spec:claims
11. pnpm spec:api
12. pnpm spec:package
13. pnpm example
14. pnpm spec:website-examples
15. pnpm website
16. pnpm spec:publish (`9 package(s) and 6 document(s) agree on version (0.12.0)`)

The log is at `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/4f5f4e94-daaa-4e42-b8b8-92e68d5bdffb/scratchpad/ex55/checkpr.log`.

## Release check

```
nothing released; CARD-01..05 complete; WX rows Pending
```

Exit 0, run after the REQUIREMENTS.md edit. Branch `arch-wave-11`, no remote branch contains HEAD, no tag contains a phase commit, no changelog or version change, no changeset deleted, nothing staged.

## Deviations from Plan

None - plan executed exactly as written. The orchestrator's known deviations from earlier plans (55-03's verify range and amended RED commit, 55-05's narrowed M54, 55-06's `compare` argument) did not surface in the scan.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `.planning/REQUIREMENTS.md` marks CARD-01..05 `[x]` and `Complete`; WX-01..07 remain Pending (release check).
- All six plan verifies exited 0; no file outside `.planning/` changed.
