---
phase: QD-81
plan: 04
subsystem: devtools-model
tags: [collect-and-rethrow, callAll, tdd, red-first, devtools]
requires:
  - phase: QD-81
    provides: 81-check.mjs (single-source, seen-failing, commit), 81-pinned-check.mjs, 81-RED-EVIDENCE.md
provides:
  - callAll(calls, message) in ExternalStore.ts, the one collect-and-rethrow rule, exported from the module only
  - notify and the derived store's parent release on callAll, both messages byte-identical
  - ExternalStore.callAll.test.ts, eight cases seen red on the base
affects: [81-05, 81-06, 81-10]
key-files:
  created:
    - packages/devtools/test/model/ExternalStore.callAll.test.ts
  modified:
    - packages/devtools/src/model/ExternalStore.ts
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: callAll takes Iterable<() => void> and is walked with for-of, so the live listener Set is read as it stands at each step (BEH-QD-656) and no copy is made"
  - "Decided autonomously: the red evidence records the runtime failure, TypeError callAll is not a function, because vitest loads the module and the missing named export surfaces at the first call, not at load"
requirements-completed: [COLL-03, WX-04, WX-06, WX-07]
duration: 8min
completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 949bb9189a3c895e83234b3c0ef405b0085ec639
plan_head_after: 42542389292f4bf25f4e6123338e801e3a02eeba
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
coverage:
  - id: D1
    description: "callAll runs every call, then rethrows one thrown value as itself (undefined and null included) or several as one AggregateError in call order; the same value twice is two errors; an AggregateError a call threw stays one error; a live set is read as it stands"
    requirement: COLL-03
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/ExternalStore.callAll.test.ts (eight tests, red on the base, green now)"
        status: pass
    human_judgment: false
  - id: D2
    description: "notify and the derived release run through callAll with the messages unchanged; ExternalStore.test.ts and surface.test.ts pass unedited"
    requirement: COLL-03
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/ExternalStore.test.ts; packages/devtools/test/surface.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "single-source reports only DockModel.ts holds a try"
    requirement: WX-04
    verification:
      - kind: command
        ref: "node 81-check.mjs single-source"
        status: pass
    human_judgment: false
---

# Phase QD-81 Plan 04: callAll, the one collect-and-rethrow rule Summary

`callAll(calls, message)` now states ADR-QD-177's rule once in `ExternalStore.ts`: every call runs, then one thrown value
is rethrown as itself and several as one `AggregateError` in call order, decided by count and never by type. The store's
`notify` (over the live listener `Set`) and the derived store's parent release both call it with their messages unchanged,
and it stays out of both barrels.

## Tasks

1. Tracer: the eight `callAll` tests were written first, committed red (`092de8fe`, `test(81-04): callAll, seen red`) with
   one `- red on the base:` line each in `81-RED-EVIDENCE.md` (`TypeError: callAll is not a function`). `callAll` and
   `notify` on it turned them green; `ExternalStore.test.ts` and `surface.test.ts` pass unedited.
2. The derived finalizer keeps `stopped = true` first, then `callAll(releases, ...)`. One commit holds exactly
   `ExternalStore.ts` (`42542389`, `feat(81-04): one collect-and-rethrow rule, callAll`).

## Verification

- `pnpm exec vitest run --project devtools packages/devtools/test/model`: 1490 passed, 18 failed. The 18 are exactly the
  tests 81-02 and 81-03 recorded red, whose fixes land in 81-05 and 81-06: DL3 to DL9 and DL12 to DL17
  (`DockModel.listeners.test.ts`), TF28, TF29 and TF37 (`TimelineFeed.test.ts`), F31 (`DiagnosticsFeed.test.ts`), SR6
  (`SimulationSession.runs.test.ts`).
- `node 81-check.mjs single-source`: its only reason is `DockModel.ts holds a try`.
- `81-pinned-check.mjs`, `scan-ids`, `scan-forbidden` pass; `tsc -p packages/devtools/tsconfig.src.json --noEmit` is clean.

## Deviations from Plan

None - plan executed exactly as written. The one wording the plan did not fix: the red evidence quotes a runtime
`TypeError`, not a load error, since the module loads and only the named import is missing.

## Known Stubs

None.

## Threat Flags

None. T-81-08 is mitigated by the eight cases (count-based decision, `undefined` and `null` pinned, no flattening).

## Self-Check: PASSED

- `packages/devtools/test/model/ExternalStore.callAll.test.ts` and `packages/devtools/src/model/ExternalStore.ts` exist.
- Commits `092de8fe` and `42542389` are on `arch-wave-15`.
