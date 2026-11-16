---
phase: QD-51-policy-tag-arity-stated-once
plan: 02
subsystem: characterisation
tags: [trace-shape, foldTrace, base-experiment, ARTY-01, ARTY-02, WX-06]
phase_base: 8d87d837beab28e8d0610eab8b6c274d45152374
plan_head_before: 2380e7e3
plan_head_after: 4288068ada56d24d8b0c6092309cace48769404e
commits: 2
requires: [51-01]
provides:
  - "packages/core/test/TraceShape.test.ts: every tag's trace shape through foldTrace, green on the base (19 tests)"
  - "51-BASE-EXPERIMENT.md, base-experiment/moves.tsv, base-experiment/not-to-many.patch: the recorded base experiment"
affects: [QD-51-03, QD-51-05]
key-files:
  created:
    - packages/core/test/TraceShape.test.ts
    - .planning/phases/QD-51-policy-tag-arity-stated-once/51-BASE-EXPERIMENT.md
    - .planning/phases/QD-51-policy-tag-arity-stated-once/base-experiment/moves.tsv
    - .planning/phases/QD-51-policy-tag-arity-stated-once/base-experiment/not-to-many.patch
  modified: []
decisions:
  - "The table's EXPECTED is hand-written and never reads the arity record; the file imports only @effect/vitest, Decision.ts and Policy.ts"
metrics:
  duration: ~15 min
  completed: 2026-11-16
  tasks: 2
  files: 4
status: complete
---

# Phase QD-51 Plan 02: Trace-shape table and base experiment Summary

An all-tags trace-shape table through `foldTrace`, green on the base, and the recorded base experiment showing that on the base a moved arity compiles (32 of 32 moves compile, the table catches 32 of 32, Decision.test.ts 8 of 32).

## Results

- `TraceShape.test.ts`: 19 tests, 19 green on the base (16 per-tag, wrapper-with-no-child, many-with-no-child, key-set). `tsc -p tsconfig.test.json` exit 0, `pnpm lint` exit 0 (house-style clean).
- Harness matrix line: 32 / 32 / 8 (32 of 32 single-tag moves compile; TraceShape fails on 32 of 32; Decision.test.ts on 8 of 32: `HasRole` x2, `Not` x2, `AllOf` x2, `Rules` x2). Control row all 0. The three `childrenOf` arm edits compile and fail only at runtime (Policy 5/1/2, Explanation 9/0/15 tests).
- Experiment 1 (`Not` Wrapper->Many, the roadmap's edit): `node_modules/.bin/tsc -p tsconfig.test.json` `tsc_exit` 0; TraceShape fails 1, Decision 1 on it. `not-to-many.patch` passes `git apply --check`.
- `pnpm check:pr < /dev/null`: exit 0, 16 of 16 steps run, `pnpm mutation` skipped by design (release PRs run it). Output: scratchpad `checkpr-51-02.txt`.
- No `packages/*/src` change since `phase_base`; `packages` clean after the harness and after `check:pr`; `scripts/check-house-style.mjs` unchanged.

## Commits

- dfb137ea: `test(51-02): every policy tag's trace shape, pinned on the base`
- 4288068a: `docs(51-02): the base experiment — an arity move compiles on the base`

## Deviations from Plan

None - plan executed exactly as written. The plan's second Task 1 verify (imports, no arity-record mention, no src change) was checked by an equivalent inline script; the file was wrapped by hand rather than copied verbatim from the sketch (the sketch had unwrapped long lines).

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: packages/core/test/TraceShape.test.ts
- FOUND: 51-BASE-EXPERIMENT.md, base-experiment/moves.tsv, base-experiment/not-to-many.patch
- FOUND commits: dfb137ea, 4288068a
