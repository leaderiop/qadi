---
phase: QD-37-a-scoped-run-that-a-newer-run-supersedes
plan: 03
subsystem: devtools
tags: [effect, vitest, superseding-run, re-entrancy, devtools]
phase_base: c52e0d653e84702d64d7e18ac6c4505182dfe34b
plan_head_before: e18f590bf6ee7919d3c8e2f9b3c206fa95067f6e
plan_head_after: 13f92e54ced55288b9aacaa1833821687555611b
status: complete

requires: ["37-02"]
provides:
  - "packages/devtools/test/model/SupersedingRun.test.ts: R1 to R17 through the module interface only"
affects: [37-04, 37-05, 37-06, 37-09]

actuals:
  tokens: 4800
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["Scope.makeUnsafe + Scope.provide + Scope.close for a test that ends its scope", "throwaway module rewrite per row to prove it can fail"]

key-files:
  created:
    - packages/devtools/test/model/SupersedingRun.test.ts
  modified: []

key-decisions:
  - "No module defect found: R1 to R17 passed against the module as built in 37-02, so there is no fix(37-03) commit"

requirements-completed: [RUN-01, RUN-03, RUN-04, RUN-05, WX-04]

duration: 8 min
completed: 2026-11-14
---

# Phase 37 Plan 03: The superseding run's interface rows Summary

R1 to R17 now pin the module's whole contract through `makeSupersedingRun` alone: supersede, close with a dying release, stop in four states, interrupt versus failure, two instances, the held fork, the return value and the `Effect.runSync` build.

## Task commits

| Task | Commit | Message |
|---|---|---|
| 1 | 28ca315a | test(37-03): the superseding run, supersede, close, stop and failure rows (R1 to R10) |
| 2 | 13f92e54 | test(37-03): the superseding run, held forks, the return contract and the synchronous build (R11 to R17) |

No `fix(37-03)` commit: every row was green on first run against the module from 37-02. The module is byte-identical to `c2e17206` (`git diff packages/devtools/src` clean).

## Evidence

- **R11 log as observed:** `["OUTER:start","OUTER:prefix-end","INNER:start","OUTER:interrupted"]`, `forked` is `[true]`, then `INNER:done` last and no `OUTER:done`, the inner token current.
- **Devtools project:** 1387 tests, all passed (1370 + R1 to R17).
- **`pnpm typecheck`, `pnpm lint`** (house-style: 496 files clean, 3 declared switches) and **`pnpm coverage`** pass. Module line from the coverage run: `SupersedingRun.ts` 100 statements, 93.33 branches, 100 functions, 100 lines; the one unexercised branch is line 101, the false arm of `if (isCurrent(next.token))` in `drain` (a held fork whose token went stale before it installed).

## Rows proven able to fail (throwaway rewrites, never committed)

Each rewrite changed one module line, ran only that row, and the module was restored byte for byte after the run (script checked equality).

| Row | Rewrite | Result |
|---|---|---|
| R1 | removed the `isCurrent(token)` guard in `fork` | fails |
| R2 | `install(next.run)` replaced by `Effect.runFork(next.run)` | fails |
| R3 | deleted the finalizer's `current = undefined;` (plan mandated) | fails |
| R4 | `begin` assigns `current` after close | fails |
| R5 | `stop` throws when no run is live | fails |
| R6 | `stop` only calls `begin()` | fails |
| R7 | `stop`'s run opens a span | fails |
| R8 | `stop` throws after close | fails |
| R9 | `!Cause.hasInterruptsOnly(...)` replaced by `true`; separately `isCurrent(token) &&` dropped | both fail |
| R10 | `isClosed` hoisted to module scope | fails |
| R11 | `if (starting) {` turned into `if (false) {` (plan mandated) | fails |
| R12, R13 | `drain` loop made single-pass (`next = undefined`) | both fail |
| R14 | R4's rewrite | fails |
| R15 | `begin` also installs `Effect.void` | fails |
| R16 | held fork returns `false` | fails |
| R17 | build suspends on `Effect.sleep` | fails |

## Requirements

Only RUN-01 was marked complete in REQUIREMENTS.md: RUN-03, RUN-04, RUN-05 and WX-04 are still declared by sibling plans without a SUMMARY (shared-ID gate).

## Deviations from Plan

None - plan executed exactly as written. The shape check's `as` regex also matches `import * as X` lines (the 37-02 note); it was applied with import lines excluded, and `node scripts/check-house-style.mjs` is clean. The commit trailer follows the milestone rule (`Claude Opus 5.5`), not the harness attribution reminder.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or file surface. T-37-06, T-37-07 and T-37-08 mitigations are the rows above and the two mandated rewrites.

## Self-Check: PASSED

SupersedingRun.test.ts exists; commits 28ca315a and 13f92e54 are ancestors of HEAD; the module is unchanged.
