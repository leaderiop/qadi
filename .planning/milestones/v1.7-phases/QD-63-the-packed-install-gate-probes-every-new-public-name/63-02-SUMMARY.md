---
phase: QD-63-the-packed-install-gate-probes-every-new-public-name
plan: 02
subsystem: build-gate
tags: [gate-14, package-install, consumer-fixture, makeGatesFeed, makeDiagnosticsFeed, DecisionCacheShape]
phase_base: 11dc168f4d8a8b295aef16f2d04b762c503d1ba8
plan_head_before: 0e0167caca6006980468949b7fcec86e998b51b2
plan_head_after: fc282f7290540cfca97257f7127347628252975b
requires: [63-01]
provides:
  - "check 4's consumer fixture probes makeGatesFeed, makeDiagnosticsFeed and DecisionCacheShape through the packed .d.ts"
  - "two @ts-expect-error pins: DiagnosticsOptions refuses a schedule; the pre-0.13 DecisionCacheShape literal is refused"
  - "the first green gate 14 of the phase, with the probe guard satisfied"
affects: [63-03, 63-04, 63-05]
tech-stack:
  added: []
  patterns:
    - "a feed read synchronously, or after a bounded Effect.yieldNow loop with no clock, inside one closed Effect.scoped"
    - "a host cache typed by the packed DecisionCacheShape wrapping decisionCacheLayer() via Layer.effect + Layer.provide"
key-files:
  created: []
  modified:
    - scripts/check-package-install.mjs
key-decisions:
  - "Unwatched is asserted only on the feed built with no registry; the feed under test reports Read with 1 then 2 instances"
  - "The pre-0.13 directive sits directly above the one line using compute as an Effect, the line TS2345 is reported on"
requirements-completed: []
duration: 20min
completed: 2026-11-20
status: complete
commits: 3
actuals:
  tokens: 2600
  tasks: 3
  commits: 3
---

# Phase QD-63 Plan 02: The three probes, gate 14 green Summary

Check 4's consumer fixture now compiles and runs `makeGatesFeed` over a one-instance structural registry, `makeDiagnosticsFeed` to `Live` within a 200-turn yield loop, and a `DecisionCacheShape` host cache wrapping `decisionCacheLayer()`, with a `@ts-expect-error` for `schedule` and one for the pre-0.13 shape; gate 14 is green, 524 runtime exports.

## What was built

All changes are in `scripts/check-package-install.mjs` (RESEARCH's probed blocks, verbatim):

- Devtools import is a sorted multi-line list gaining `type DiagnosticsOptions`, `type GateInstanceLike`, `type GateRegistryLike`, `makeDiagnosticsFeed`, `makeGatesFeed`; the `@qadi/core` list gains `AttributeResolver`, `DecisionCache`, `decisionCacheLayer`, `type DecisionCacheShape`, `gte`, `hasAttribute`.
- Gates probe: no registry reads `Unwatched`; the registry literal reads `Read` with 1 instance, subscribes once, follows to 2, and the listener set is empty after the scope closes.
- Diagnostics probe: no options reads `Off`; `{}` reaches `Live` with `hydration` set; the `schedule` literal is refused (TS2353 under its directive).
- Host cache: `Allow,Allow`, lookups `miss,hit`, one resolver call, `size` 1. The pre-0.13 literal is refused (TS2345 under its directive).
- No file under `packages/*/src` changed (`git diff --quiet 11dc168f -- 'packages/*/src'` holds).

## Gate runs

Each run is the real `node scripts/check-package-install.mjs`; the count shows the new probe compiled and ran.

| Run | Exit | Failure or success lines |
| --- | --- | --- |
| Before (precondition, at `0e0167ca`) | 1 | the three 63-01 guard lines (`makeDiagnosticsFeed, makeGatesFeed`, type-only, refused-shape); `package-install: 3 failure(s) across 9 package(s).` |
| Task 1, `a5f1ab5d` | 1 | `  the consumer fixture never calls makeDiagnosticsFeed: every make*Feed the packed @qadi/devtools root exports must be probed`; the type-only line; the refused-shape line; `package-install: 3 failure(s) across 9 package(s).` |
| Task 2, `70676684` | 1 | the type-only line `  the consumer fixture never uses DecisionCacheShape as a type: every type-only probe name must be a type reference outside a refused literal`; the refused-shape line `  the consumer fixture never refuses a literal typed DecisionCacheShape: every refused-shape probe name must annotate a declaration holding a @ts-expect-error that names its refused member`; `package-install: 2 failure(s) across 9 package(s).` |
| Task 3, `fc282f72` | 0 | `package-install: 9 package(s) pack, resolve and authorize (524 runtime export(s))` |

The 524 count is unchanged from the base because no package changed.

## Task commits

| Task | Commit | Files |
| --- | --- | --- |
| 1 (tracer) | `a5f1ab5d` | `scripts/check-package-install.mjs` |
| 2 | `70676684` | `scripts/check-package-install.mjs` |
| 3 | `fc282f72` | `scripts/check-package-install.mjs` |

The tracer's feedback gate was the task's own verify: gate 14 re-run end to end with exactly the expected three lines, then expansion.

## Deviations from Plan

None - plan executed exactly as written; every observed exit, line and count matched its expected cell.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or file surface; the fixture adds no clock, timer, `any`, `switch`, `async`, assertion or interpolation (each verify's hygiene grep on the added lines was empty), and every feed is built inside a closed `Effect.scoped`.

## Self-Check: PASSED

- `scripts/check-package-install.mjs` and this SUMMARY exist; commits `a5f1ab5d`, `70676684` and `fc282f72` are ancestors of HEAD; the six cut anchors and five edit targets each occur once, in order; `git diff --quiet 11dc168f -- 'packages/*/src'` holds; the scratch logs lived under `$TMPDIR/qd63-red` and were deleted; no `.scratch/qd63-*` path was created.
