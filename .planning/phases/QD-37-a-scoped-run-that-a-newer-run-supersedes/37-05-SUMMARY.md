---
phase: QD-37-a-scoped-run-that-a-newer-run-supersedes
plan: 05
subsystem: devtools
tags: [effect, re-entrancy, superseding-run, diagnostics, devtools]
phase_base: c52e0d653e84702d64d7e18ac6c4505182dfe34b
plan_head_before: c57cb8980a685e5077bf0d52fb0af62896e4daad
plan_head_after: 254bb6c638f2030ccc6a1db24bcdc817af6aaf37
status: complete

requires: ["37-04"]
provides:
  - "DiagnosticsFeed.ts on makeSupersedingRun; F28 and F29"
affects: [37-06, 37-09]

actuals:
  tokens: 3000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["begin / Starting publish / fork(token, run, { onFailure }) with the module re-checking the token"]

key-files:
  created: []
  modified:
    - packages/devtools/src/model/DiagnosticsFeed.ts
    - packages/devtools/test/model/DiagnosticsFeed.test.ts

key-decisions:
  - "DiagnosticsFeed keeps only its Starting publish, the isCurrent-guarded accept, the Stopped mapping and its closed guards; the protocol block is gone"

requirements-completed: [RUN-02, RUN-05, RUN-06, WX-04, WX-06]

duration: 10 min
completed: 2026-11-14
---

# Phase 37 Plan 05: The diagnostics feed on the superseding run Summary

The diagnostics feed now runs through `makeSupersedingRun`, and a restart from inside its `Starting` notification or from inside a question source's first sample leaves the newest run sampling instead of a stale one.

## RED evidence (unconverted DiagnosticsFeed.ts, commit 6feb79ee)

`DiagnosticsFeed.test.ts`: 2 failed, 27 passed (F1 to F27 green). Each failed on an `AssertionError`.

- F28 (pre-fork, subscriber reconfigures inside its Starting notification): `expected 3 to equal +0`, `calls.a` was 3 (the stale run polled `qa` for 4 s). `calls.b` was 1 per the research reproduction (the assertion on `calls.a` fails first).
- F29 (in-prefix, a source whose first sample reconfigures the feed): `expected 3 to equal 1`, `calls.a` was 3; `calls.b` 1 per the research reproduction.

## GREEN evidence (commit 254bb6c6)

F28 and F29 pass with `DiagnosticsFeed.test.ts` byte-identical to the RED commit. Full devtools project: 1390 tests, all passed (1388 after 37-04 plus F28 and F29). `pnpm typecheck`, `pnpm lint` (house-style: 496 files clean, 3 declared switches) and `pnpm circular` pass. The shape check (begin, then the `Starting` publish, then `fork`; no `let generation`, `let closed`, `FiberHandle`, `addFinalizer`, `hasInterruptsOnly`, `Exit.`) passes. F24's dying release and the React diagnostics tests stay green unchanged (D-08, D-09). Mutation of `DiagnosticsFeed.ts` was not measured here; 37-09 compares against 0.9279.

## Task commits

| Task | Commit | Message |
|---|---|---|
| 1 | 6feb79ee | test(37-05): a restart from inside the diagnostics feed leaves the newest run sampling (RED) |
| 2 | 254bb6c6 | fix(37-05): the diagnostics feed runs through the superseding run, and a restart from inside it leaves the newest run sampling |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or file surface.

## Self-Check: PASSED

DiagnosticsFeed.ts and DiagnosticsFeed.test.ts exist; commits 6feb79ee and 254bb6c6 are ancestors of HEAD, each carries only its named file.
