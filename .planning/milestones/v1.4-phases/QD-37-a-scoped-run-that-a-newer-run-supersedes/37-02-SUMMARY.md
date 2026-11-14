---
phase: QD-37-a-scoped-run-that-a-newer-run-supersedes
plan: 02
subsystem: devtools
tags: [effect, fiberhandle, re-entrancy, tracer, devtools]
phase_base: c52e0d653e84702d64d7e18ac6c4505182dfe34b
plan_head_before: 1fba5ebd4e06a568435414b0f3ac4a08f8a12206
plan_head_after: c2e172065e0caa4408fcb7f75a31d53248cbb3d3
status: complete

requires: ["37-01"]
provides:
  - "packages/devtools/src/model/SupersedingRun.ts: makeSupersedingRun, RunToken, ForkHooks, SupersedingRun (package-private)"
  - "TimelineFeed.ts on the module; TF21 to TF23"
affects: [37-03, 37-05, 37-06, 37-09]

actuals:
  tokens: 4500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["two-step begin / publish / fork superseding run", "held-fork slot drained until stable"]

key-files:
  created:
    - packages/devtools/src/model/SupersedingRun.ts
  modified:
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/test/model/TimelineFeed.test.ts

key-decisions:
  - "Module copied from the verified prototype (research Code Examples 1); TimelineFeed keeps only its closed guard on restart and the Stopped mapping"

requirements-completed: [RUN-01, RUN-06, WX-04, WX-06]
requirements-partial: [RUN-02, RUN-05]

duration: 12 min
completed: 2026-11-14
---

# Phase 37 Plan 02: The superseding-run module, tracer through the timeline feed Summary

One package-private module now owns the scoped run a newer run supersedes (token, handle, finalizer order, held fork, failure hook), and the timeline feed reads through it with its three re-entrancy defects repaired.

## RED evidence (unconverted TimelineFeed.ts, commit 3b02577b)

`TimelineFeed.test.ts`: 3 failed, 20 passed. Each failed on an `AssertionError`, not a type error or timeout.

- TF21 (pre-fork, subscriber reconfigures inside the Reading notification): `expected [] to deeply equal [ 'from-B' ]`, ids `[]`.
- TF22 (in-prefix, a read whose first step reconfigures the feed): `expected [] to deeply equal [ 'from-B' ]`, ids `[]` (the status assertion after it was not reached).
- TF23 (onExit, a subscriber restarts inside the Stopped of a read that died in its first step): `expected [] to deeply equal [ 'retry' ]`, ids `[]` after two reads.

## GREEN evidence (commit c2e17206)

TF21 to TF23 pass with `TimelineFeed.test.ts` byte-identical to the RED commit. Full devtools project: 58 files, 1370 tests, all passed (1362 existing + TF20 + TF21 to TF23 + SR1 to SR4 from 37-01). `pnpm typecheck`, `pnpm lint` (house-style: 494 files clean, 3 declared switches) and `pnpm circular` pass.

D-08 (synchronous prefix kept): no `yieldNow` and no `startImmediately` in the module; the 36 tests research counted as relying on the synchronous prefix (DiagnosticsFeed 21, DockModel 9, TimelineFeed TF9/TF10, four React tests) are all within the green 1370. The module is in neither barrel and has no `spec/overview.md` row.

## Task commits

| Task | Commit | Message |
|---|---|---|
| 1 | 3b02577b | test(37-02): a restart from inside the timeline feed leaves the newest read live (RED) |
| 2 | c2e17206 | feat(37-02): one module owns a run a newer run supersedes, and the timeline feed reads through it |

## Deviations from Plan

**1. [Rule 1 - plan verify defect] The Task 2 shape check's `as` regex flags every namespace import**
- **Found during:** Task 2 verify
- **Issue:** `/\bas\s+(?!const\b)[A-Za-z_({[]/` matches `import * as Cause`, which AGENTS.md section 1 mandates, so the script reports `module has as` for any module with a namespace import.
- **Fix:** none to src. Re-ran the same check with `import` lines excluded: no `as` in code; `check-house-style` also passes. 37-04 and 37-09, if they reuse that regex, should exclude import lines.
- **Files modified:** none

Otherwise the plan executed as written. The commit trailer follows the milestone rule (`Claude Opus 5.5`), not the harness attribution reminder.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or file surface.

## Self-Check: PASSED

SupersedingRun.ts exists; commits 3b02577b and c2e17206 are ancestors of HEAD; each carries only its named files.
