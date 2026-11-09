---
phase: 04-gate-instrumentation-hook
plan: 04
subsystem: verification
tags: [verification, merge-gate, check-pr, react, ARCH-49]

requires:
  - phase: 04-01
    provides: "useGates tracer, single gateWriterFor call site in QadiProvider"
  - phase: 04-02
    provides: "Grouped hooks on useGates, hooks.rerender.test.tsx"
  - phase: 04-03
    provides: "ADR-QD-111, CCR-QD-388, .changeset/gate-hook.md"
provides:
  - "Phase 4 success criteria 1 to 4 rechecked as one batch, before and after the merge gate"
  - "Proof no pre-existing React test file was modified by any phase-4 commit"
  - "pnpm check:pr results: every step green, with one environmental caveat on the Playwright dependency install (see Deviations)"
affects: []

plan_head_before: 9c83b8e7176d0c3218eaa190e96afb27e21eceb2
plan_head_after: 9c83b8e7176d0c3218eaa190e96afb27e21eceb2

actuals:
  tokens: 0
  tasks: 2
  commits: 0

tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "The Playwright step of `pnpm example` was run as `pnpm test:e2e` directly, because `playwright install --with-deps chromium` needs sudo and the executor has no terminal; the chromium build was already cached"

requirements-completed: [XC-01, XC-04, XC-05, GATE-01, GATE-05]

coverage:
  - id: D1
    description: "ROADMAP Phase 4 success criteria 1 to 4 hold across every phase-4 commit"
    requirement: "GATE-01"
    verification:
      - kind: command
        ref: "Task 1 batch (gateWriterFor( call sites = 1, identity lines = 0, opener calls = 0, comm check empty, no config file touched, house-style and circular green, React project 361 passed)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The merge gate minus mutation is green with no gate, budget or threshold moved"
    requirement: "XC-01"
    verification:
      - kind: command
        ref: "pnpm check:pr steps 1-12 green; step 13 (example) green when its Playwright browser-dependency install is skipped; steps 14-16 run individually and green"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-08
status: complete
---

# Phase 04 Plan 04: Phase gate Summary

**Phase 4's success criteria hold as one batch against its own commits, and `pnpm check:pr` is green in every step, with the Playwright browser-dependency install the one step that had to be run around the sudo prompt.**

## Performance

- **Duration:** about 3 min of wall clock (check:pr itself ran in roughly 90 seconds)
- **Tasks:** 2
- **Files changed:** 0 (a verification plan; no `fix(04-04)` commit was needed)

## Task 1: batch output (first run, before check:pr)

```
C1  gateWriterFor( non-comment call sites in packages/react/src: 1
    packages/react/src/QadiProvider.tsx:237:    () => (instrument ? gateWriterFor(gates) : undefined),
    in QadiProvider.tsx: 1                                  (baseline at HEAD was 3)
C2  identity-machinery lines in useGate.ts + hooks.ts: 0    (baseline 17)
    atom-set opener calls in useGate.ts + hooks.ts: 0       (baseline 4)
C3  packages/react/test/hooks.rerender.test.tsx exists
C4  phase-4 commits ADDED these React test files:
      GateWriter.kinds.test.tsx, GateWriter.useGates.test.tsx, hooks.rerender.test.tsx
    phase-4 commits MODIFIED these React test files:
      GateWriter.useGates.test.tsx   (also added by a phase-4 commit)
    comm check (modified and not added): prints nothing
    React project: Test Files 23 passed (23), Tests 361 passed (361)
C5  phase-4 commits touching check-house-style.mjs, vitest.config.ts,
    packages/react/vitest.config.ts, stryker.react.mjs, .oxlintrc.json: none
    node scripts/check-house-style.mjs: 403 file(s) clean (3 declared switch(es)), exit 0
    pnpm circular: No circular dependency found
```

Pre-existing React test files: 25 tracked files under `packages/react/test` other than the three phase-4 additions (28 in total). None of the 25 appears among the files any phase-4 commit touched. The only test files phase 4 touched are the three it added.

The second run, after check:pr, printed the same output (only wall-clock timings differ). The React count at the end is **361 tests in 23 files**.

## Task 2: `pnpm check:pr`

The run-check steps, 16 in all (`--skip-mutation` removes mutation):

| Step | Result |
| ---- | ------ |
| 1 typecheck, 2 lint, 3 circular, 4 test:tstyche | pass |
| 5 coverage | pass: 156 files, 3945 tests; all files 99.06% statements; `core/src` 98.96%, `react/src` 99.3% (thresholds 95% and 90% not touched) |
| 6 test:bdd, 7 spec:examples | pass |
| 8 spec:verify:strict | PASS: 21 FAIL: 0 SKIP: 0 |
| 9 spec:gates, 10 spec:claims, 11 spec:api, 12 spec:package | pass |
| 13 example | typecheck, unit tests and `next build` passed; `playwright install --with-deps chromium` failed (sudo); `pnpm test:e2e` run directly afterwards: 30 passed |
| 14 spec:website-examples | 40 blocks compile |
| 15 website | 45 pages built |
| 16 spec:publish | 9 packages and 6 documents agree on version 0.11.0 |

Tail of the first `pnpm check:pr` run, where it stopped at step 13:

```
Installing dependencies...
Switching to root user to install dependencies...
sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper
Failed to install browsers
run-check: `pnpm example` failed (exit 1).
```

## Records checked

- ADR-QD-111 exists (`spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md`) and CCR-QD-388 has its README row. No substitute numbers were used.
- `.changeset/gate-hook.md` exists.
- Final React test count: 361 tests in 23 files.

## Files changed by `fix(04-04)` commits

None. There were no `fix(04-04)` commits, and no file was edited in this plan.

## Deviations from Plan

**1. [Rule 3 - Blocking issue, environmental] Playwright dependency install needs sudo**
- **Found during:** Task 2, step 13 of `pnpm check:pr`.
- **Issue:** `pnpm example` runs `playwright install --with-deps chromium`. On this Fedora host Playwright falls back to Ubuntu's apt dependency list and asks for a sudo password; the executor has no terminal. This is an environment limit, not a defect in the phase's code. The chromium, headless-shell and ffmpeg builds are already in `~/.cache/ms-playwright`.
- **Fix:** After `pnpm check:pr` stopped at step 13, I ran the rest of that step myself and then the three steps after it, individually: `pnpm test:e2e` in `examples/nextjs-newsroom` (30 of 30 passed, including the lens, SSR and uninstrumented-guard specs), then `pnpm spec:website-examples`, `pnpm website`, `pnpm spec:publish`. No test, gate, budget, timeout or threshold was changed.
- **Consequence for XC-01:** every check in `pnpm check:pr` has passed, but one uninterrupted `pnpm check:pr` exit 0 was not observed on this host. A run on a machine with the Playwright system dependencies (or CI) will confirm it with one command. This is called out so the verifier can decide; I do not consider the phase code at risk.
- **Files modified:** none.

**Total deviations:** 1 (environmental, no files changed). **Impact:** the gate evidence is complete by step, not by single exit code.

## Known Stubs

None.

## Threat Flags

None. T-04-09 is mitigated: no phase-4 commit touched the house-style script, either vitest config, `stryker.react.mjs` or `.oxlintrc.json`, and `node scripts/check-house-style.mjs` is green. T-04-10 is mitigated: the newsroom e2e suite and gate 14's packed-artifact install both passed.

## Issues Encountered

The sudo prompt above. `.planning/config.json` (modified) and `.planning/state.json` (untracked) were dirty before the phase and are left out of commits.

## Next Phase Readiness

Phase 4 is complete. All four plans have summaries.

## Self-Check: PASSED

- FOUND: .changeset/gate-hook.md
- FOUND: spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md
- FOUND: CCR-QD-388 row in spec/README.md
- Commits: 0 in this plan (verification only, no code changes; `git status` shows only the two pre-existing dirty paths)
