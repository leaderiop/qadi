---
phase: QD-85-the-dock-s-hydration-block-is-a-model-row
plan: 03
subsystem: devtools
tags: [pinned-check, earlier-phase-check, ledger, red-evidence]
requires:
  - phase: QD-85
    provides: "85-01: the born hydration cells and the base facts; 85-02: 85-check.mjs, whose `base` mode both scripts read"
provides:
  - "85-pinned-check.mjs: eighteen held test files, one declared QuestionsPanel.test.tsx edit (an import and a region), and the born hydration cells held against their one adding commit"
  - "85-earlier-checks.mjs: Phase 84's checks and Phase 80's pinned check re-run from scratch copies against a thirteen-row ledger measured on the base"
  - "85-RED-EVIDENCE.md: the 85-03 section, three runs seen failing"
affects: [85-04, 85-05, 85-06, 85-07, 85-08, 85-09, 85-10, 85-11]
key-files:
  created:
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-pinned-check.mjs
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-earlier-checks.mjs
  modified:
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: the declared file's region is the span of whole lines from the one opening `describe(\"hydration, with nothing read\"` up to, not including, `describe(\"invalidate\"`, held as a prefix and a suffix of the file rather than located by markers in the current text, so the region may be rewritten or emptied entirely, its opening line included"
  - "Decided autonomously: an edit's `after` may be a list of accepted spellings, longest tried first, so the optional `ReadableStore` import line plan 85-07 may add is named by the edit and nothing else is accepted after the view import"
  - "Decided autonomously: the earlier-phase ledger compares the first stderr line that is not blank, not indented and not `node:`-prefixed (Node's stack header), so the Phase 80 row is its `Error: Cannot find module` line and not a version-dependent stack line; its `<root>` placeholder is the repository root from `git rev-parse --show-toplevel`"
  - "Decided autonomously: each pinned-check row's `holds` claim (that it holds QuestionsPanel.test.tsx) is verified against the copied script's text, and the claim that 85-pinned-check.mjs declares it against that script's text, so the header's statement cannot go stale"
  - "Decided autonomously: the earlier phases' directories are found under `.planning/phases/` and every `.planning/milestones/*-phases/` by name prefix, so the script survives archiving of this phase too"
requirements-completed: [HYDV-01, HYDV-04, WX-06, WX-07]
status: complete
duration: 20min
completed: 2026-11-25
commits: 2
plan_head_before: 5c95c206db82c01f09dc344ded1d3fc5ccdbb2ee
plan_head_after: e14f580bbc3461b650e2307d26348bf9cd36a359
actuals:
  tokens: 21000
  tasks: 2
  commits: 2
coverage:
  - id: D1
    description: "Eighteen held test files, the one declared QuestionsPanel.test.tsx edit and the born cells are each held by one committed command seen failing"
    requirement: HYDV-01
    verification:
      - kind: other
        ref: "node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-pinned-check.mjs --self-test"
        status: pass
    human_judgment: false
  - id: D2
    description: "Phase 84's checks and Phase 80's pinned check re-run from scratch copies and compared with a measured ledger"
    requirement: WX-06
    verification:
      - kind: other
        ref: "node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-earlier-checks.mjs --self-test"
        status: pass
    human_judgment: false
---

# Phase QD-85 Plan 03: The pinned-test and earlier-phase checks Summary

The test tree and the earlier phases around this one are now each held by one committed, self-tested command: eighteen test
files byte for byte, the single declared `QuestionsPanel.test.tsx` edit (an import and a region), the born hydration cells
against their one commit, and Phase 84's checks compared with a ledger of what they printed on this phase's base.

## Performance

- **Duration:** about 20 min
- **Completed:** 2026-11-25
- **Tasks:** 2
- **Files:** 2 created, 1 appended; nothing outside `.planning/` changed and nothing under `.planning/milestones/`

## Accomplishments

- `85-pinned-check.mjs` (self-test: 37 cases passed, oxlint clean, directory from `import.meta.url`) prints `pinned: 18 files
  hold their base text, 1 of 1 born files held, 0 of 1 declared edits applied` on the tree. `--all-applied` fails twice on the tree
  as it is: `0 of 1 declared edits applied` and `the region is not changed from the base`. A scratch probe against the real
  `QuestionsPanel.test.tsx` (import swapped for the view import and the `ReadableStore` line, region replaced) passed
  `--all-applied` with `1 of 1 declared edits applied`, and was restored from a copy.
- `85-earlier-checks.mjs` (self-test: 17 cases passed, oxlint clean) copies the earlier scripts to `<scratch>/qd85/p84` and
  `p80`, runs the thirteen ledger rows from the repository root with stdin closed and prints `<check>: exit <n>: <line>`. All
  thirteen match: `base` and `84-pinned-check.mjs` exit 1 on ancestry, `80-pinned-check.mjs` exits 1 on its missing module, the
  six tree-only modes and four self-tests exit 0.
- `85-RED-EVIDENCE.md` gained `## 85-03 the pinned and earlier checks` with three `- check failed:` lines, each from a run seen in
  this plan; the tree was clean under `packages` and `spec` afterwards and both checks pass again.

`⚡ Tracer verified end-to-end — expanding`: the Task 1 verify command passed after the commit and before Task 2.

## Task Commits

1. **Task 1: tracer, the pinned-test check and the earlier-phase re-run** - `afa89bdc` (chore)
2. **Task 2: both checks seen failing once** - `e14f580b` (docs)

## Decisions Made

Decided autonomously (owner's standing instruction): see `key-decisions` above.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan states the wrong reason for `80-pinned-check.mjs` in the ledger**
- **Found during:** Task 1 (reading `85-01-SUMMARY.md`'s base facts, then running the copy)
- **Issue:** the must-have says Phase 80's pinned check exits 1 on ancestry since `ac7578f3`. It does not: its copy reads
  `80-check.mjs` from `.planning/phases/QD-80-...`, a path that moved to `.planning/milestones/v1.9-phases/`, and fails with
  `Error: Cannot find module`. Only `84-check.mjs base` and `84-pinned-check.mjs` fail on ancestry.
- **Fix:** the ledger row holds the measured line (with the repository root as a `<root>` placeholder) and the header states both
  reasons. The row is the finding the plan's own rule asks to explain rather than widen.
- **Files modified:** `85-earlier-checks.mjs`
- **Commit:** `afa89bdc`

**2. [Rule 3 - Blocking] The Task 1 verify's milestone check trips on pre-existing untracked files**
- **Found during:** Task 1
- **Issue:** as in plan 85-01 (deviation 3), `git status --porcelain -- .planning/milestones` lists the untracked `*.iter*.md`
  review files that existed before the plan and which the run rules forbid staging.
- **Fix:** checked that nothing under `.planning/milestones/` is modified or staged (`git status --porcelain` with `??` entries
  filtered out prints nothing); the earlier checks only write to the scratch directory.

**Total deviations:** 2 (1 Rule 1, 1 Rule 3). **Impact:** none on the outputs.

## Known Stubs

None.

## Threat Flags

None. T-85-05 is mitigated by the scripts running only from scratch copies (the only paths written are under the scratch
directory) and nothing under `.planning/milestones/` being modified; T-85-06 by every ledger row being a measured line and the
self-test failing a changed exit, a changed line, a missing run and an unnamed run.

## Next Phase Readiness

Plan 85-04 may start: the held tests and Phase 84's checks are each one command, and `85-pinned-check.mjs --all-applied` is the
check plan 85-07 closes on when it edits `QuestionsPanel.test.tsx`.

## Self-Check: PASSED

`85-pinned-check.mjs`, `85-earlier-checks.mjs` and the `85-RED-EVIDENCE.md` section exist; both task commits (`afa89bdc`,
`e14f580b`) are ancestors of HEAD; both task verify commands pass.
