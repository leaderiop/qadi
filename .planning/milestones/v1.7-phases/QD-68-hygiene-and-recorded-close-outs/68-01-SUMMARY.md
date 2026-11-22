---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 01
subsystem: tooling
tags: [spec-revise, bench, ab-harness, mutation-scorer, compiler-comparison, staleness]

requires:
  - phase: QD-67-no-equivalent-mutants-no-magic-race-bound
    provides: the mutation scorer and the bench analyzer this plan generalises
provides:
  - "OI-18 fixed: spec-revise keeps its first positional argument without --date"
  - "OI-24 fixed forward: one shared A/B harness under scripts/bench/ with the arm order alternating by round"
  - "the bench workload file (Phase 65's 35 workloads, by name)"
  - "the phase's mutation scorer, compiler comparison and staleness check, each seen able to fail"
affects: [68-02, 68-03, 68-05, 68-08, 68-12, 68-13, 68-14, 68-15]

actuals:
  tokens: 12000
  tasks: 3
  commits: 3
plan_head_before: 3d66becb9034fb16ffd97ccd5966b92d972e3b8e
plan_head_after: 2cae04291dd50c9723c7d6107d7f3aaffc752e4a
commits: 3

tech-stack:
  added: []
  patterns:
    - "every extracted tool is checked against its planned SHA-256 and shown failing on a planted defect before it is relied on"

key-files:
  created:
    - scripts/bench/ab.sh
    - scripts/bench/analyze.mjs
    - .planning/phases/QD-68-hygiene-and-recorded-close-outs/bench/workloads.txt
    - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-mutation.mjs
    - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-compare.mjs
    - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-stale.mjs
  modified:
    - scripts/spec-revise.mjs

key-decisions:
  - "OI-24 is fixed forward: the Phase 59, 66 and 67 harness copies stay as the records of their runs; the new harness is not wired into pnpm check"

requirements-completed: [HYGN-07, WX-06]

coverage:
  - id: D1
    description: "OI-18: spec-revise bumps a document without --date (scratch ADR-QD-174 copy 1.2 -> 1.3); --check unchanged"
    requirement: "HYGN-07"
    verification:
      - kind: other
        ref: "Task 1 automated verify: base script exit 2 with its usage line, fixed script prints 1.2 -> 1.3, --check prints its one line"
        status: pass
    human_judgment: false
  - id: D2
    description: "OI-24: the shared A/B harness alternates the arm order by round; the analyzer gate is seen failing on three planted defects"
    requirement: "HYGN-07"
    verification:
      - kind: other
        ref: "node scripts/bench/analyze.mjs --self-test (14 passed) and --print-order 3 base final; Task 2 automated verify"
        status: pass
    human_judgment: false
  - id: D3
    description: "The mutation scorer, compiler comparison and staleness check are committed and each is seen able to fail"
    requirement: "WX-06"
    verification:
      - kind: other
        ref: "68-mutation.mjs --self-test (16 passed), 68-compare.mjs --self-test (14 passed), five planted defects; Task 3 automated verify"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-11-21
status: complete
---

# Phase QD-68 Plan 01: Tooling Summary

**OI-18 fixed (spec-revise kept its first argument only when `--date` was given), OI-24 fixed forward with one shared A/B bench harness that alternates the arm order by round, and the phase's mutation scorer, compiler comparison and staleness check committed, each shown failing on planted defects.**

## Performance

- **Duration:** about 25 min
- **Started:** 2026-11-21T04:55Z (approximate)
- **Completed:** 2026-11-21T05:20Z
- **Tasks:** 3
- **Files modified:** 7 (1 modified, 6 created)

## Accomplishments

- OI-18: `node scripts/spec-revise.mjs <doc> "<entry>"` with no `--date` bumps the document (scratch ADR-QD-174 copy 1.2 to 1.3). The base script printed its usage line and exited 2 on the same input. `--check` prints `spec-revise: every Revision matches its newest Change History entry` before and after.
- OI-24: `scripts/bench/ab.sh` is one parameterised harness; `--print-order 3 base final` prints `base-1 final-1 final-2 base-2 base-3 final-3`. `scripts/bench/analyze.mjs --self-test` prints `self-test: 14 passed`, and each of three planted gate defects (band widened by reference spread, geomean ignored, workload read by position) fails its named case. The Phase 59, 66 and 67 copies, `package.json` and the dod-table (`25 step(s)`) are unchanged.
- `bench/workloads.txt` holds Phase 65's 35 workloads (SHA-256 `e858c90a...`, as planned).
- `68-mutation.mjs --self-test` prints `self-test: 16 passed` (three plants m1 to m3 each fail a named case), `68-compare.mjs --self-test` prints `self-test: 14 passed` (two plants c1, c2 fail), and `68-stale.mjs` prints one line per Phase 62 to 67.

## Task Commits

1. **Task 1 (tracer): OI-18 spec-revise fix** - `564818c0` (fix)
2. **Task 2: shared A/B harness and workload file** - `585c33ea` (feat)
3. **Task 3: mutation scorer, compiler comparison, staleness check** - `2cae0429` (docs)

**Plan metadata:** the docs(68-01) commit that adds this SUMMARY, STATE.md and ROADMAP.md.

## Files Created/Modified

- `scripts/spec-revise.mjs` - OI-18: the positional filter leaves out `--date`'s value only when the flag is present.
- `scripts/bench/ab.sh` - shared interleaved A/B harness, arm order alternates by round.
- `scripts/bench/analyze.mjs` - bench gate: 5% per workload, +2% geomean, median of per-run minima, workloads by name.
- `.planning/phases/QD-68-hygiene-and-recorded-close-outs/bench/workloads.txt` - the gate's 35 workload keys.
- `.planning/phases/QD-68-hygiene-and-recorded-close-outs/68-mutation.mjs` - mutation scorer over the core and devtools Stryker groups.
- `.planning/phases/QD-68-hygiene-and-recorded-close-outs/68-compare.mjs` - compiler comparison (comments, line breaks, titles only).
- `.planning/phases/QD-68-hygiene-and-recorded-close-outs/68-stale.mjs` - HYGN-06 staleness check.

## Decisions Made

OI-24 fixed forward as the plan states: the earlier phases' copies stay untouched; the harness is not wired into `pnpm check`.

## Deviations from Plan

### Verify mechanics (no change to what was built or checked)

**1. [Rule 3 - Blocking] Task 1's verify ran the base `spec-revise.mjs` from scratch, not from a probe copy in `scripts/`**
- **Found during:** Task 1
- **Issue:** the plan's verify copies the base script to `scripts/spec-revise.base-probe.mjs` and removes it with `rm -f` inside `bash -c`; the harness's removal safety check refused that command, so it did not run.
- **Fix:** the same verify, with the base copy run from `<S>/spec-revise.base.mjs` and no `rm`. The base script only reaches its usage branch before using its root path, so the observed result (usage line, exit 2) is the same as recorded in the plan's probe.
- **Files modified:** none
- **Verification:** Task 1's verify printed `OI-18 fixed and committed`.

**Total deviations:** 1 (a verify-mechanics adjustment). **Impact:** none on committed content.

## Issues Encountered

`68-stale.mjs` run now ends `redo: 62 63 64 65 66` (Phase 67 current), as predicted at plan time. Note `scripts/spec-revise.mjs` appears as a changed cited file for Phases 64, 65 and 66 because of this plan's own OI-18 fix.

## Known Stubs

None.

## Threat Flags

None. No new network, auth, file-access or schema surface; the new scripts are phase and gate tooling that read the repository and write only to a caller-named output directory.

## Next Phase Readiness

Ready for 68-02. `<S>/phase_base` is `3d66becb9034fb16ffd97ccd5966b92d972e3b8e` (scratch, outside the repository, in `$TMPDIR/qd68`).

## Self-Check: PASSED

- Created files exist: `scripts/bench/ab.sh`, `scripts/bench/analyze.mjs`, `bench/workloads.txt`, `68-mutation.mjs`, `68-compare.mjs`, `68-stale.mjs` all present and at their planned SHA-256.
- Commits `564818c0`, `585c33ea`, `2cae0429` are ancestors of HEAD; `git rev-list --count 3d66becb..HEAD` is 3 before this SUMMARY's commit.
- `node scripts/check-dod-table.mjs`: `25 step(s) match pnpm check, 151 reference(s) resolve`.
