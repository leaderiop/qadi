---
phase: QD-55-a-port-card-is-a-model-row-not-a-view-join
plan: 04
subsystem: devtools
tags: [port-cards, model, CallsView, callsByPort, tstyche, PortName, ARCH-102]
requires: [55-03]
provides:
  - "PortCards.ts: CallsView (Hidden, Uncollected, Listed), CallRow, CallsByPort, callsByPort, SHOWN_PER_PORT and each row's calls"
  - "PortCards.test.ts: the fourteen call twins, the 20 per-port readings, the threshold, form and collection-state cases"
  - "PortCards.tst.ts: the two compile errors D-08 names"
affects: [55-05, 55-06, 55-07, 55-08, 55-09]
actuals:
  tokens: 26000
  tasks: 2
  commits: 3
plan_head_before: bfabaadb7a3e9dd21792595f4ebc3fc612ebe28f
plan_head_after: 02d9431e6a512ac940e354d4c2c9078ecf5c93dd
tech-stack:
  added: []
  patterns: ["interpreter label as a hoisted exhaustive Match, so a fourth interpreter is a compile error", "calls grouped once per log into a PortName-keyed record via a Map and tabulatePorts"]
key-files:
  created:
    - packages/devtools/test/model/PortCards.tst.ts
  modified:
    - packages/devtools/src/model/PortCards.ts
    - packages/devtools/test/model/PortCards.test.ts
key-decisions:
  - "Hidden covers both no collector while unsampled and a collector that saw nothing for a row, so the view never inspects an empty list or the unsampled flag"
  - "The hostile-tag twin builds its call with Object.assign so the type needs no cast"
requirements-completed: [CARD-02, CARD-03, CARD-04]
duration: 7min
completed: 2026-11-18
status: complete
---

# Phase QD-55 Plan 04: Every card's recent calls as model rows Summary

**Each `PortCardRow` now carries a closed `CallsView` (`Hidden`, `Uncollected`, `Listed { calls, earlier }`) whose `CallRow`s hold the text, interpreter label, duration and React key the panel used to compute, and a tstyche file pins that a misspelt port is a compile error in `PortActivity` and both per-port records.**

Note: per the executor brief, `REQUIREMENTS.md` is untouched; CARD-* close at 55-09. `requirements-completed` copies the plan's ids per the template.

## RED

The twins were committed alone (`78b1b793`, `PortCards.test.ts` only, one import line changed) before any `packages/devtools/src` change:

```
 ❯ |devtools| test/model/PortCards.test.ts (85 tests | 52 failed)
   ❯ portCards: recent calls (14)
     × a signature call says which resource it was about, or that it was about any
     × a call that ran more than once says how many times
     ...
   ❯ portCards: the calls a row holds, by collection state (6)
   ❯ portCards: the overflow threshold and the form of a call row (9)
   ❯ callsByPort (3)
   ❯ call rows read exactly as on the base (20)
 Test Files  1 failed (1)
      Tests  52 failed | 33 passed (85)
```

The 33 passing are 55-03's cases, untouched.

## D-08

The scoped grep over `PortCards.ts`'s added lines since `phase_base` printed nothing (its own line, `D-08: no port comparison in the join`, is the success message).

## Commits

1. `78b1b793` `test(55-04): every card's recent calls as model rows, RED` (PortCards.test.ts)
2. `aa6e3349` `feat(55-04): each card's recent calls are model rows` (PortCards.ts)
3. `02d9431e` `test(55-04): a misspelt port is a compile error in every port record` (PortCards.tst.ts)

## Counts and observations

- `PortCards.test.ts`: 33 -> 85 tests. 52 added: 14 call twins (titles kept), 20 readings (copied as data, each titled `${call._tag}: ${expected}`), 6 collection-state, 9 threshold and form, 3 `callsByPort`.
- `(1.25).toFixed(1)` observed as `1.3` (and `(12.34).toFixed(1)` as `12.3`, `(0).toFixed(1)` as `0.0`); the twin asserts the value from `toFixed` itself and pins `1.3`.
- Task 1's five-file run: 217 passed. `pnpm test:tstyche`: 62 files, 325 tests, 680 assertions. `pnpm typecheck`, `pnpm lint` and `pnpm circular` clean (lint warnings are in the untracked `.codex/` and a pre-existing `scripts/` line).
- The characterisation, `ServicesPanel.tsx`, both Services render tests, `PortReading.ts` and `PortCalls.ts` are unchanged.

## Deviations from Plan

None - plan executed exactly as written. Two choices inside the plan's room: the unrecorded-attempts and hostile-`_tag` twins were added beyond the listed cases, and the hostile call is built with `Object.assign(attributeCall(), { _tag: "__proto__" })` because the type must not be cast.

## Known Stubs

None.

## Threat Flags

None. T-55-09, T-55-10 and T-55-11 are mitigated as planned: `CallRow.text` is `describeCall`'s sentence plus only the attempts count, grouping goes through a `Map` and the five registry names, and the exhaustive matcher labels no unrecorded interpreter.

## Next

Ready for 55-05 (the panel over the store).

## Self-Check: PASSED

`PortCards.ts`, `PortCards.test.ts` and `PortCards.tst.ts` exist; `78b1b793`, `aa6e3349` and `02d9431e` are ancestors of HEAD.
