---
phase: QD-37-a-scoped-run-that-a-newer-run-supersedes
plan: 04
subsystem: devtools
tags: [effect, vitest, fast-check, property, superseding-run, devtools]
phase_base: c52e0d653e84702d64d7e18ac6c4505182dfe34b
plan_head_before: 841fa502bb30d309b80eb001d2340895cd8d3d91
plan_head_after: 147ed59061576cc0954ada2491accc8dbfcff492
status: complete

requires: ["37-03"]
provides:
  - "packages/devtools/test/model/SupersedingRun.test.ts: the RUN-07 seeded interleaving property (PROPERTY describe)"
affects: [37-08, 37-09]

actuals:
  tokens: 4500
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns: ["weighted FastCheck.oneof command array + hand-written model + asyncProperty, seed 3701, floors after the property"]

key-files:
  created: []
  modified:
    - packages/devtools/test/model/SupersedingRun.test.ts

key-decisions:
  - "The property reaches the one 37-03 coverage gap (the false arm of `isCurrent(next.token)` in `drain`) through a fifth fork body, `NestStale`, and counts it in a ninth floor; no module row was added (the plan pins the file at 18 tests)"
  - "No module defect found: the laws held against SupersedingRun.ts as built, so there is no fix(37-04) commit"

requirements-completed: []

duration: 25 min
completed: 2026-11-14
---

# Phase 37 Plan 04: The seeded interleaving property Summary

One property over random begin, fork, land, stop and close interleavings (300 runs, seed 3701) checks the module against a hand-written model after every step: at most one run running, `isCurrent` per token, what `fork` answered, started runs in order, landed runs, heard failures, interrupted runs, runs that ended on their own, and that nothing starts, lands or is heard after close.

## Task commits

| Task | Commit | Message |
|---|---|---|
| 1 | 147ed590 | test(37-04): a seeded property over begin, fork, land, stop and close |
| 2 | none | throwaway rewrites only; nothing to commit (every rewrite was caught) |

## Floor counts observed (seed 3701, 300 runs, all at least 30)

| Floor | Observed |
|---|---|
| refused forks | 711 |
| runs replaced while running | 80 |
| stops while running | 57 |
| closes while running | 63 |
| landed results | 54 |
| stale lands (released after the token stopped being current) | 41 |
| held forks | 109 |
| held forks stale before they installed (the 37-03 coverage gap) | 49 |
| heard failures | 42 |

Weights as committed: `Begin` 7, `Fork` 10, `Land` 12, `Stop` 5, `Close` 5; fork token `fresh` (begin then fork) 3:1; body `Ok` 4, `Die` 6, `Never` 1, `Nest` 2, `NestStale` 2; array `minLength: 6, maxLength: 24`. The floors were never touched: the first draws missed several (stops 22, closes 1, replaced 18, stale lands 21), and each was fixed by weights and list length only.

## Rows proven able to fail (throwaway rewrites, never committed)

Each rewrite changed one module line, ran only `-t PROPERTY`, and the module was restored byte for byte and equals HEAD afterwards (script checked both).

| Rewrite | Law that caught it |
|---|---|
| `if (!isCurrent(token)) return false;` deleted | law 3: what fork answered (`[true,true,true]` vs model `[true,true,false]`) |
| `if (!isClosed) current = token;` to `current = token;` | law 2: isCurrent of token 0 (current after close) |
| `if (starting) {` to `if (false) {` | law 4: the started runs, in order (`[0,1,2]` vs `[0,1]`) |
| `if (isCurrent(next.token)) install(next.run);` to `install(next.run);` (extra, the 37-03 gap) | law 1: the running run equals the model's (`[2]` vs `[1]`) |

## Verification

- Devtools project: 1388 tests, all passed (1387 + the property); the file holds 18 tests.
- `pnpm typecheck` passes; `pnpm lint` reports nothing for the test file (its warnings are pre-existing and in the untracked `.codex/`); `node scripts/check-house-style.mjs`: 496 files clean, 3 declared switches. No `as`, `!`, `any`, `switch`, `try`, or fast-check `commands` in the file.

## Requirements

None marked complete in REQUIREMENTS.md: RUN-07 is still declared by 37-08, WX-04 by 37-02, 37-03, 37-05, 37-06 and 37-09 (shared-ID gate).

## Deviations from Plan

**1. [Rule 2 - coverage gap from 37-03] A fifth fork body and a ninth floor**
- **Found during:** Task 1 (project constraint carried over from 37-03's SUMMARY)
- **Issue:** the false arm of `if (isCurrent(next.token))` in `drain` is not equivalent to removing the check and no row reached it; the plan's body union (`Ok | Die | Never | Nest`) cannot reach it.
- **Fix:** added `NestStale` (the inner fork is held, then a bare `begin()` makes it stale before the start returns, so the outer run stays installed and running, not current) and a ninth floor, "held forks whose token went stale before they installed" (49). The plan's verify asks for at least eight floors, so nine passes it.
- **Also added:** a `fresh` flag on `Fork` (begin then fork, the pairing a store does) because without it most forks named a token `stop` had already superseded.
- **Files modified:** packages/devtools/test/model/SupersedingRun.test.ts
- **Commit:** 147ed590

The commit trailer follows the milestone rule (`Claude Opus 5.5`), not the harness attribution reminder.

## Known Stubs

None.

## Threat Flags

None. Test-only; T-37-09 is mitigated by nine floors at least 30 and four rewrites that each fail the property.

## Self-Check: PASSED

SupersedingRun.test.ts contains `seed: 3701`; commit 147ed590 is an ancestor of HEAD; `git status --porcelain -- packages/devtools/src` is empty.
