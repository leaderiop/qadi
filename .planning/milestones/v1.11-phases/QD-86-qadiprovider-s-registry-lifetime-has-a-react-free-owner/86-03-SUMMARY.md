---
phase: QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner
plan: 03
subsystem: testing
tags: [react, check-script, earlier-checks, ledger, registry-owner, red-evidence]

phase_base: 41c53c65c3ceb60f974650dd374f391c81db56e7
plan_head_before: 6d0b7a746194da3df6f2a64e82f18f81b357411f
plan_head_after: 9fa99f13560e2c8e07ada551e3158518511c8f9a
commits: 2

requires:
  - phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
    provides: 82-check.mjs, whose single-owner judge the provider move changes
  - phase: QD-85-the-dock-s-hydration-block-is-a-model-row
    provides: 85-earlier-checks.mjs (the file ported) and the 85 checks the ledger re-runs
provides:
  - 86-earlier-checks.mjs, the ledger of 20 earlier-phase runs measured on the phase base, with the one expected after-state written first
  - 86-RED-EVIDENCE.md `## 86-03 the earlier-checks ledger`, the ledger seen failing once
affects: [QD-86 plan 08 (the close runs this ledger on the finished tree), QD-86 plan 04 (the provider move)]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a ledger row chosen by whether a file equals its phase_base text, so an expected change is written before it happens"

key-files:
  created:
    - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-earlier-checks.mjs
  modified:
    - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-RED-EVIDENCE.md

key-decisions:
  - "The 82 single-owner row is chosen by the provider's text against git show phase_base, never by what the run printed, so a changed answer on an unmoved provider still fails"
  - "The 82 base row is the exit 0 and printed base measured on the tree, not the ancestry exit 1 the plan expected (measured in plan 01 too)"

patterns-established:
  - "judgeLedger compares exit and line separately, so a matching exit with another line and a matching line with another exit each fail"

requirements-completed: []

coverage:
  - id: D1
    description: "86-earlier-checks.mjs: 20 rows (19 labels), the base and moved single-owner pair, directory search by name prefix, 21-case self-test"
    requirement: WX-06
    verification:
      - kind: other
        ref: "node 86-earlier-checks.mjs (exit 0, all rows) and --self-test (21 passed); Task 1 verify"
        status: pass
    human_judgment: false
  - id: D2
    description: "The ledger seen failing once under a scratch edit of stryker.react.mjs"
    requirement: WX-06
    verification:
      - kind: other
        ref: "Task 2 verify: 86-RED-EVIDENCE.md `## 86-03 the earlier-checks ledger`, stryker.react.mjs restored"
        status: pass
    human_judgment: false

duration: 10min
completed: 2026-11-25
status: complete
---

# Phase 86 Plan 03: The earlier-checks ledger Summary

**A scratch-copy ledger holds Phase 82's and Phase 85's 19 checks to the line each prints on the phase base, with Phase 82's `single-owner` carrying a second, expected row (`QadiProvider.tsx does not build one lease`) that applies once the provider moves.**

## Performance

- **Duration:** about 10 min
- **Tasks:** 2 (tracer, auto)
- **Files created:** 1 (and this summary); 1 appended
- **Commits:** 2

## Accomplishments

- `86-earlier-checks.mjs` copies `82-check.mjs`, `82-mutation.mjs` and their records to `<S>/p82/`, and `85-check.mjs`,
  `85-pinned-check.mjs`, `85-mutation.mjs`, `85-earlier-checks.mjs` and their records to `<S>/p85/`, finds each earlier
  directory by `QD-82-` / `QD-85-` under `.planning/phases/` and `.planning/milestones/*-phases/`, runs each copy from the
  repository root, and compares exit status and line with the row. It never writes into or runs from an earlier directory.
- 20 rows, 19 labels: the two `single-owner` rows (`when: "base"` exit 0 with the single-owner success line;
  `when: "moved"` exit 1 with `QadiProvider.tsx does not build one lease`), `82-check.mjs base`, ten `85-check.mjs` tree
  modes, `85-pinned-check.mjs`, and six self-tests. The row is picked by comparing the provider with
  `git show 41c53c65:packages/react/src/QadiProvider.tsx`.
- The self-test (21 cases) drives planted runs: a match passes; a matching exit with another line fails; a matching line
  with another exit fails; `base` is picked for an unchanged provider and `moved` for a changed one; a directory under
  `.planning/phases` and one under a `*-phases` milestone folder both resolve, and a folder not ending `-phases` does not.
- On the tree every run matches (exit 0). Seen failing once: under a scratch edit dropping `RegistryLease.ts` from
  `stryker.react.mjs`'s `mutate`, the first stderr line is `82-check.mjs single-owner: expected exit 0, got exit 1:
  stryker.react.mjs does not mutate RegistryLease.ts`; restored with `cp`, the ledger passes again.

## Task Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 (tracer) | `832799ce` | `chore(86-03): add the earlier-checks ledger` |
| 2 | `9fa99f13` | `docs(86-03): record the ledger seen failing` |

## Deviations from Plan

**1. [Measured, not as expected] `82-check.mjs base` exits 0 and prints the recorded base**
- **Found during:** Task 1 (as plan 01 already recorded)
- **Issue:** the plan's truths and `<interfaces>` say it exits 1 on ancestry (Phase 82's base was squash-merged as
  `ac7578f3`). From a scratch copy it prints `16f09f776fbb9c8c8c2b9b9452e7cf6994a727e3` (read from the copied
  `82-01-SUMMARY.md`) and exits 0: the archived `base` mode checks no ancestry. The tree-only `85-check.mjs base` also
  exits 0 (`2741584f...`).
- **Fix:** the row is the measured exit 0 and printed base; the header says why. Nothing was widened: the plan's claim
  described a check this archived script does not make.
- **Commit:** `832799ce`

**Total deviations:** 1 (a measured difference from the plan's expectation). **Impact:** none on what the
ledger proves; the one expected change (82 `single-owner`) is the one the plan named.

## Issues Encountered

None. Phase 85's `scan-ids`, `scan-forbidden` and `three-predicates` rows read the tree against Phase 85's base, so they
are the ones most likely to move when the provider and owner land; if one does, plan 08 explains it rather than widening
its row.

## Known Stubs

None.

## Threat Flags

None. T-86-07 holds: the scripts run from `<S>`, nothing under `.planning/milestones/` or Phase 85's directory changed
(Task 1 verify), and T-86-08 holds: each run is compared with a measured row, the one expected change is written before the
move, and the ledger was seen failing.

## Next Phase Readiness

Ready for plan 04. `packages/react/src` and `stryker.react.mjs` equal `phase_base` (plus nothing else); once the provider
forwards to the owner, `node 86-earlier-checks.mjs` must pass on the `moved` row and every other row unchanged.

## Self-Check: PASSED

- Files: `86-earlier-checks.mjs`, `86-RED-EVIDENCE.md` and this summary exist.
- Commits `832799ce` and `9fa99f13` are ancestors of HEAD; the Task 1 and Task 2 verify commands passed.
