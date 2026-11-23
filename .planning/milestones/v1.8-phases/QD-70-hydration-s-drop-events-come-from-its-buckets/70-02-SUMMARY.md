---
phase: QD-70-hydration-s-drop-events-come-from-its-buckets
plan: 02
subsystem: react-hydration
tags: [red-evidence, type-pins, tstyche, base-experiment]
phase_base: 3630e29865bbaed49126b214f0f6cc7006b6f4bc
requires: [70-01]
provides:
  - "70-RED-EVIDENCE.md: the base experiment for an entry, a payload and a dehydration row, and the type pins failing on the base"
  - "HydrationBuckets.tst.ts: six pins of the bucket records, the derivation and the payload producer record (red until 70-03/70-04)"
affects: [70-03, 70-04]
tech-stack:
  added: []
  patterns: ["throwaway table-row experiment restored with git checkout, logs and exit statuses kept in scratch"]
key-files:
  created:
    - .planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-RED-EVIDENCE.md
    - packages/react/test/HydrationBuckets.tst.ts
  modified: []
key-decisions:
  - "The throwaway-row helper `addrow.sh` and the probe copy `probe-base.test.ts` live in the scratch directory, outside the repository; 70-04 reuses the probe."
  - "The probe's last assertion casts the probe reason with `as` (throwaway, never committed); the committed pins use no `as`, `!` or `any`."
requirements-completed: []
duration: 15 min
completed: 2026-11-22
status: complete
commits: 3
plan_head_before: d1bb33632b93ae4642ea7d5843bacf0f14413d9b
plan_head_after: 26810d4d35a2b30617f10fa6f0e9d7363564c448
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
---

# Phase 70 Plan 02: The live defect failing on the base Summary

The defect is shown on the phase base two ways: a recorded experiment (an `entry`, a `payload` and a `dehydration` row
appended to core's table, then restored) and a tstyche file pinning the bucket records and the payload producer record
total, written on the base and red there.

## Experiments (outcome, one line each)

- `entry` row alone: `tsc -b tsconfig.json` exits 2, `HydrationEngine.ts(516,9): error TS2741: Property 'EntryProbe' is missing in type ... required in type 'Record<EntryDropReason, unknown[]>'` (the bucket record refuses it).
- `entry` row with a fourth bucket and the trace-disagreement branch pushing through it, no emission: `tsc -b` exits 0.
- Probe `a probe bucket's entries reach no event and no count` on that tree: passes (no reporter call, seeded delta 1, delta 0 under every reason, `EntryProbe` in `hydrationDropReasons`), the defect shown at run time.
- `payload` row alone: `tsc -b` exits 0; `grep PayloadProbe packages/react/src packages/devtools/src` finds nothing (exit 1).
- `dehydration` row alone: `tsc -b` exits 0; `grep DehydrationProbe` finds nothing (exit 1).
- Every experiment edit and the probe were removed; `git status --porcelain -- packages` was empty and `tsc -b` exited 0 on the restored tree (`exp-restore-1`, `exp-restore-2`).

## Type-pin RED

`pnpm test:tstyche HydrationBuckets` exits 1 on the base; its first error line is
`Error: Cannot find module '../src/HydrationBuckets.ts' or its corresponding type declarations. ts(2307)`, and a second
names the missing `PAYLOAD_PRODUCERS` export of `HydrationEngine.ts` (ts(2305)). `node scripts/check-house-style.mjs`
passes with 67 type-test files. The file holds six titled tests, exactly two checked `@ts-expect-error is missing in
type` directives (each with a positive twin) and no negative callable or constructable pin, so `NOT_CALLABLE_PIN_BUDGET`
and its AGENTS.md table are untouched.

**`tsc -p tsconfig.test.json` and `pnpm test:tstyche` stay red on `HydrationBuckets.tst.ts` until 70-04's first task**
(`HydrationBuckets.ts` arrives in 70-03, `PAYLOAD_PRODUCERS` in 70-04); no plan in between runs them whole.

## Task Commits

1. Task 1 (tracer): the entry experiment, evidence written; committed with Task 2 as the plan directs.
2. Task 2: `a15bdb77` docs(70-02): record the base experiment for every drop kind
3. Task 3: `bc209197` test(70-02): pin the drop bucket records and the payload producer record, red on the base
4. Task 3: `26810d4d` docs(70-02): record the type pins failing on the base

Tracer gate: Task 1's verify passes end to end (`the entry experiment is recorded`), and the experiment showed the
defect compiling and running clean; expansion followed.

## Deviations from Plan

None - every experiment row behaved as the plan predicted (entry: refused only at the bucket record, compiles with a
bucket, reaches no event; payload and dehydration: compile, nothing names them).

Verification-only note: Task 1's `<automated>` block, run verbatim, is a shell syntax error because the apostrophe in
the title `a probe bucket's ...` closes its own `bash -c '...'` quoting. The same script body, run without the `bash -c`
wrapper, exits 0 (`the entry experiment is recorded`); nothing it checks was weakened. Tasks 2 and 3 ran verbatim and exit 0.

## Known Stubs

None.

## Threat Flags

None.

## Issues Encountered

None. An unrelated `tsc -b` from another repository was running on the machine and was ignored.

## Self-Check: PASSED

- FOUND: 70-RED-EVIDENCE.md, HydrationBuckets.tst.ts
- FOUND: commits a15bdb77, bc209197, 26810d4d (ancestors of HEAD)
- `git diff --quiet 3630e298 -- packages/core/src packages/react/src` holds; `git status --porcelain -- packages spec scripts .changeset` empty.
