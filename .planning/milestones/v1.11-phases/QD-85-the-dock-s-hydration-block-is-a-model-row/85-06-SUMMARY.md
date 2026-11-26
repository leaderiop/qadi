---
phase: QD-85-the-dock-s-hydration-block-is-a-model-row
plan: 06
subsystem: devtools
tags: [dock-model, hydration-store, identity-pins, seen-failing]
requires:
  - phase: QD-85
    provides: "85-05: model.hydration with the shared shownInputOf key reader; 85-03: the pinned-file check"
provides:
  - "M58, M59 and M60 in DockModel.test.ts: the hydration store publishes only when a key field changes identity, and the one equal-content republish (the unsampled flip) is pinned"
  - "DL22 in DockModel.listeners.test.ts: a services and a hydration listener that both throw in one configure are reported services first inside the last step's nested AggregateError"
  - "85-RED-EVIDENCE.md: the 85-06 section, each of M58, M59, M60 and DL22 seen failing under a scratch edit of the store"
affects: [85-07, 85-09, 85-10]
tech-stack:
  added: []
  patterns:
    - "A derived store's identity rule pinned by one test per key field, each seen failing under the edit that breaks only it"
key-files:
  created: []
  modified:
    - packages/devtools/test/model/DockModel.test.ts
    - packages/devtools/test/model/DockModel.listeners.test.ts
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: DL22 also throws a timeline listener, the DL19 shape, so the configure's outer AggregateError exists and the test reads the last step's nested aggregate [services, hydration] rather than a bare step error"
  - "Decided autonomously: M60 asserts the Off to Live reference moves (notStrictEqual) as well as that both ends are Equal.equals, as the plan's wording states, where M54 pins only the second"
  - "Decided autonomously: M58 drives a live collector double with no supplied reading, so the sampled hydration is what the poll folds; the equal polls keep the reading's reference through foldReading"
requirements-completed: []
status: complete
duration: 15min
completed: 2026-11-25
commits: 2
plan_head_before: f9ddcc2169f6bda56cf67d4f8da4a9d41e6cb44f
plan_head_after: 5a772b5749260ce72237fb296ed0596e1ae88c52
actuals:
  tokens: 5000
  tasks: 2
  commits: 2
coverage:
  - id: D1
    description: "A poll whose reading equals the last publishes nothing from model.hydration and keeps the snapshot reference; other counts publish once; an identical configure publishes nothing"
    requirement: HYDV-03
    verification:
      - kind: test
        ref: "packages/devtools/test/model/DockModel.test.ts#M58"
        status: pass
    human_judgment: false
  - id: D2
    description: "With counts handed to the model, the Starting to Live flip publishes the hydration store once with equal views, and a Stopped that had sampled publishes nothing while Off to Live moves the reference with equal ends"
    requirement: HYDV-03
    verification:
      - kind: test
        ref: "packages/devtools/test/model/DockModel.test.ts#M59"
        status: pass
      - kind: test
        ref: "packages/devtools/test/model/DockModel.test.ts#M60"
        status: pass
    human_judgment: false
  - id: D3
    description: "A services listener and a hydration listener that both throw in one configure are reported in build order inside the last step's nested AggregateError"
    requirement: HYDV-03
    verification:
      - kind: test
        ref: "packages/devtools/test/model/DockModel.listeners.test.ts#DL22"
        status: pass
    human_judgment: false
  - id: D4
    description: "Each of M58, M59, M60 and DL22 was seen failing under a scratch edit of the store that breaks exactly the rule it pins"
    requirement: WX-06
    verification:
      - kind: other
        ref: ".planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-RED-EVIDENCE.md#85-06"
        status: pass
    human_judgment: false
---

# Phase QD-85 Plan 06: The hydration store's identity pinned Summary

The hydration store's notification rule is now four tests: an unchanged reading publishes nothing (M58), the unsampled flag
is compared by identity so the one equal-content republish is pinned rather than hidden (M59, M60), and the store's place in
the configure's aggregate is its build order (DL22). No source file changed; `DockModel.ts` was scratch-edited four ways and
restored with `cp` each time.

## Accomplishments

- **M58** (tracer): a live collector double answering the same empty log, settled past its first sample; several intervals of
  `TestClock` produce zero notifications and the same snapshot reference. A configure handing `{ hydration: suppliedHydration }`
  publishes once as `Counts` with 2 dehydrated and 1 seeded; the identical configure again publishes nothing.
- **M59**: with counts handed over, the `Starting` to `Live` flip publishes once, `Equal.equals(before, after)` holds and the
  reference differs, because the key reads the unsampled flag by identity.
- **M60**: with counts handed over, `Live` to a `Stopped` that had sampled publishes nothing and keeps the reference; `Off` to
  `Live` passes through `Starting`, so the reference moves and both ends are equal.
- **DL22**: a throwing timeline, services and hydration listener in one configure give an outer `AggregateError` of
  `[timelineBoom, nested]` whose nested errors are exactly `[servicesBoom, hydrationBoom]`.
- Seen failing, each restored with `cp`: a key that copies the counts fails M58 (an identical configure republished); a key that
  also carries the status object fails M60; an unsampled flag of `hydration === undefined && isUnsampled(status)` fails M59 (and
  M60); building the hydration store before services fails DL22.
- Verified: the three model test files (111 tests), `85-pinned-check.mjs`, `tsc -p tsconfig.test.json` and `pnpm lint`
  (house style clean) pass; `git status -- packages/devtools/src` is clean.

## Task Commits

1. **Task 1 (tracer): M58 and its seen-failing line** - `test(85-06): pin the hydration store's identity` (`f788ac62`)
2. **Task 2: M59, M60, DL22 and their seen-failing lines** - `test(85-06): pin the hydration store's place in the aggregate` (`5a772b57`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The rows had to be one-line `it.effect("ID: ` heads**
- **Found during:** Task 2 verify read-through
- **Issue:** The plan's verifies grep `it.effect("M58: ` on one line, and the first draft broke after `it.effect(`.
- **Fix:** The three rows were reformatted like M57 and DL21; the two commits were re-made (local, unpushed, before anything
  built on them) so the test file is right in both.
- **Files modified:** `packages/devtools/test/model/DockModel.test.ts`
- **Commit:** `f788ac62`, `5a772b57`

**Total deviations:** 1 auto-fixed (blocking). **Impact:** none on the plan's shape.

The tracer feedback gate re-ran the task's `<verify>` end to end and passed: tracer verified, expanding.

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None. T-85-11 is pinned by DL22.

## Issues Encountered

None.

## Next Phase Readiness

Ready for 85-07: the hydration store's publish rule is pinned, so the panel can switch to `model.hydration`.

## Self-Check: PASSED

- `DockModel.test.ts`, `DockModel.listeners.test.ts`, `85-RED-EVIDENCE.md` exist and hold M58, M59, M60, DL22 and their four
  `- failed:` lines.
- Commits `f788ac62` and `5a772b57` are ancestors of HEAD; both end with the one `Co-Authored-By` line.
- `git status --porcelain -- packages/devtools/src` is clean; no `.vitest/` directory is left.
