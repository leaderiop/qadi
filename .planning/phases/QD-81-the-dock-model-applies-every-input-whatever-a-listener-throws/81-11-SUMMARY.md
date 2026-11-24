---
phase: QD-81
plan: 11
subsystem: testing
tags: [merge-gate, check-pr, spec-package, requirements, trailers, devtools, dock-model]
requires:
  - phase: QD-81
    provides: the mutation close of 81-10 and every earlier plan's commits
provides:
  - pnpm check:pr and pnpm spec:package green on the final tree
  - the mutation close re-measured on the head holding the reordered timeline tests
  - COLL-01 to COLL-06 complete in REQUIREMENTS.md
  - the plan-commit trailer scan
affects: []
key-files:
  created: []
  modified:
    - .planning/REQUIREMENTS.md
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-mutation-close.json
    - spec/decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md
key-decisions:
  - "Decided autonomously: the close record named a head whose TimelineFeed.test.ts 81-10 later reordered, so check:pr would have run on packages the close did not measure; the model group was re-closed on the new head (record close model --restart) instead of accepting the one-file difference"
  - "Decided autonomously: the two merge-gate references in ADR-QD-194 that check-dod-table refused are fixed in the ADR (the rail step named, the two gates named by their scripts), not by weakening the check"
requirements-completed: [WX-01, WX-03, WX-07, COLL-01, COLL-02, COLL-03, COLL-04, COLL-05, COLL-06]
duration: 95min
completed: 2026-11-25
status: complete
commits: 3
plan_head_before: b340b9d511d3bd1b6c9d2fb8051c619fc43fc73f
plan_head_after: 23b47d0bbe77b0567a543b5c2f42f4f6d26fa2af
actuals:
  tokens: 2000
  tasks: 2
  commits: 3
coverage:
  - id: D1
    description: "The one merge gate and gate 14 are green on the tree the mutation close measured"
    requirement: WX-01
    verification:
      - kind: command
        ref: "pnpm check:pr: exit 0, ran 17 of 18 steps, only pnpm mutation skipped; pnpm spec:package: exit 0, 9 packages pack, resolve and authorize"
        status: pass
    human_judgment: false
  - id: D2
    description: "COLL-01 to COLL-06 are complete and every plan commit is attributed once"
    requirement: COLL-01
    verification:
      - kind: command
        ref: "81-check.mjs commit, trailers; no commit outside .planning is not a plan commit; no forbidden file committed since phase_base"
        status: pass
    human_judgment: false
---

# Phase QD-81 Plan 11: The merge gate on the final tree and the requirements Summary

`pnpm check:pr` and `pnpm spec:package` pass on the tree the mutation close measured, COLL-01 to COLL-06 are marked complete by hand after the gate, and all 35 plan commits carry exactly one Claude trailer.

phase_base: e757ef370731c8388de9924e6ad1744cd6363e89

## Accomplishments

- **Status files**: `check-pr.status` 0 and `spec-package.status` 0. `check:pr` ended `run-check: ran 17 of 18 steps; "pnpm mutation" was skipped (release PRs run it).` `spec:package` ended `package-install: 9 package(s) pack, resolve and authorize (527 runtime export(s))`.
- **Heads**: `check:pr` ran on `b3280754` (written to `check-pr.head`); the close record's head is `b340b9d5`, and `git diff b340b9d5 b3280754 -- packages` is empty, so the gate ran on the packages the mutation close measured. Nothing outside `.planning/` changed after `b3280754`.
- **Devtools coverage line** (from the `check:pr` log): `packages/devtools/src/model` 99.85 statements, 99.47 branches, 99.86 functions, 99.94 lines; all files 99.67 / 98.69 / 99.6 / 99.83.
- **Mutation close re-measured**: the recorded close head `424ff7f7` predated 81-10's reorder of two timeline tests (`652184fd`), so `packages/` differed from the head `check:pr` would run on. The model group was re-run alone with the base invocation and re-recorded with `record close model --restart` on `b340b9d5`; `compare` passes (no open or Ignored mutant beyond the base; `SimulationSession.ts` 244/250, survived 6, the same six as its base, where the earlier close run held four of them, so that file's survivors move from run to run and none is new). Committed as `ac6719c2`.
- **Requirements**: COLL-01, 02, 03 and 05 became `[x]` and `Complete` in one commit holding only `REQUIREMENTS.md` (`23b47d0b`); COLL-04 and COLL-06 were already complete. No WX row changed; `requirements.mark-complete` was not used.
- **Trailer scan**: `81-check.mjs trailers` printed `trailers: 35 plan commits, each with one Claude trailer`. The rule: a plan commit's subject matches `^[a-z]+[(]81-[0-9]{2}[)]!?: `; the orchestrator's `docs(81): ...`, `docs(phase-QD-81): ...` and `docs(QD-81): ...` commits carry no plan number and are not scanned. Every commit since `phase_base` that touches a path outside `.planning/` is a plan commit, and no forbidden file (`config.json`, `state.json`, `.agents/`, `.codex/`, review-iteration files, `.review-diagnostics/`, the QD-68.1 `.gitkeep`) was committed in the range.

## Task Commits

1. `ac6719c2` docs(81-11): record the mutation close after the timeline test reorder
2. `b3280754` docs(81-11): the merge-gate references in the ADR name the command they mean
3. `23b47d0b` docs(81-11): COLL-01 to COLL-06 complete

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The recorded close head did not cover the packages `check:pr` ran on**
- **Found during:** Task 1
- **Issue:** the verify requires `git diff --quiet <close head> <check:pr head> -- packages`. 81-10 reordered two tests in `TimelineFeed.test.ts` after measuring the close, and judged a re-measure unnecessary; the plan's own truth says the close stands in for mutation on the same `packages/`.
- **Fix:** re-closed the `model` group (Stryker alone, stdin closed), `record close model --restart`, `compare` passes; committed as the plan's step 3 prescribes.
- **Files modified:** `81-mutation-close.json`
- **Commit:** ac6719c2

**2. [Rule 1 - Bug] `pnpm spec:gates` failed on ADR-QD-194's merge-gate references**
- **Found during:** Task 1, the first `check:pr` run
- **Issue:** `check-dod-table` refused `step 2` (read as a gate reference without a command) and `gates 13 and 14` (no command named in the paragraph), written in 81-07.
- **Fix:** "step 2" became "the rail step"; the consequence line names `scripts/check-api-surface.mjs` (gate 13) and `scripts/check-package-install.mjs` (gate 14) and is re-wrapped. `check:pr` then ran again from the start and passed.
- **Files modified:** `spec/decisions/194-a-run-of-calls-applies-every-call-whatever-one-throws.md`
- **Commit:** b3280754

**3. [Precondition and verify note] a first `check:pr` run was stopped**
- It was started before the close-head mismatch was noticed and was stopped (with its tstyche child) before Stryker ran; no result of it was used.

**Total deviations:** 2 auto-fixed (both bug), 1 note. **Impact:** none on scope; the only source-adjacent change is an ADR wording, and the mutation record now names a head whose `packages/` equal the gated tree.

## Known Stubs

None.

## Threat Flags

None.

## Next

Phase complete, ready for verification.

## Self-Check: PASSED
