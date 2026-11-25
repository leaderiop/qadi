---
phase: QD-78-timelinestore-owns-its-capacity
plan: 09
subsystem: host-facing-docs
tags: [changeset, overview, upgrade-guide, readme, ccr]
requires: [78-08]
provides:
  - the Breaking `@qadi/devtools` minor changeset, the only one added since the phase base
  - the overview rows of the store, the feed and the hook stating resize, the omitted and the refused capacity
  - the 0.13 upgrade section with a compiled After fence
  - the devtools README sentences, and the CCR-QD-470 row naming every host-facing document
affects: [78-10, 78-11]
key-files:
  created:
    - .changeset/devtools-timeline-store-owns-its-capacity.md
  modified:
    - spec/overview.md
    - spec/README.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - packages/devtools/README.md
decisions:
  - "The changeset has eight bullets, one per change, and ends with the link to the 0.13 upgrade section; the dock's whole-or-nothing rule is its own bullet"
  - "The upgrade guide's Before fence is a `ts` signature fragment and its After fence is a compiled `typescript` wrapper that forwards `resize`; the guide tells a host to call `configure`, not `feed.timeline.resize`, when the read should start again"
  - "The overview, the changeset, the guide and the README say an omitted capacity is `DEFAULT_TIMELINE_CAPACITY` and a refused capacity throws before anything moves, in the same words"
requirements-completed: []
metrics:
  duration: 25min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 952e0f9d
plan_head_after: 7211d23b42d5ff9386d60236cccf5175b82d8855
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
---

# Phase QD-78 Plan 09: tell hosts what broke and how to adapt Summary

A host upgrading reads the same rules in the Breaking changeset, the overview rows, the 0.13 guide section and the
devtools README: `TimelineStore` gains `resize`, the feed holds one store for its life, an omitted capacity and the
default are one bound, a refused capacity changes nothing, and the dock applies a capacity whole or not at all.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 (tracer) | `ba4dd177` | `.changeset/devtools-timeline-store-owns-its-capacity.md`, `spec/overview.md`, `spec/README.md` |
| 2 | `7211d23b` | `upgrading.md`, `packages/devtools/README.md`, `spec/README.md` |

## What shipped

- The changeset (`"@qadi/devtools": minor`, `**Breaking.**`): eight bullets covering `resize`, the feed's one store,
  the omitted capacity, the refused capacity in `configure`, the dock's whole-or-nothing rule, the zero-capacity
  timeline, `useTimelineStore` following `capacity`, and `clear` at the held bound.
- `spec/overview.md` Rev 1.139 to 1.140: the `TimelineStore`, `TimelineFeed` and `useTimeline` rows cite BEH-QD-726,
  BEH-QD-728 and BEH-QD-730. No export was added or removed.
- `upgrading.md`: `## 0.13: a timeline store owns its capacity`, a nine-row Change, Before and After table, a `ts`
  Before fence, a compiled `typescript` After fence, a paragraph on `configure` versus `resize`, the dock sentence, and
  the ADR-QD-191 link as the last line.
- `packages/devtools/README.md`: the feeds paragraph (one store, `resize`) and the `configure` paragraph (omitted
  capacity, refused capacity in the feed and the dock).
- `spec/README.md` Rev 1.361 to 1.363: the CCR-QD-470 row names the overview Rev 1.140, the changeset, the guide and the
  README, and still ends `Unused: none.`.

## Verification

- Task 1 automated verify: `VERIFY_OK` (every check of the plan's script, the strict traceability run excluded because
  it takes about three and a half minutes and ran separately on the same tree: `PASS: 21 FAIL: 0 SKIP: 0`).
- Task 2 automated verify: `VERIFY_OK` after the commit; before it, `check-website-doc-examples` (74 blocks compile),
  `check-doc-examples` (118 blocks), `check-api-surface` (`api-surface: 942 export(s) documented across 9 package(s)`,
  equal to the base fact), `spec-revise --check`, the strict traceability check (`PASS: 21 FAIL: 0`) and the
  plan-local wording scan of the added lines (no hit).
- `.changeset` additions since `phase_base`: exactly the one file.

## Deviations from Plan

None - plan executed as written. The two verify scripts were run as scripts in the scratchpad rather than inline
`bash -c`, with the strict traceability step run once separately (see Verification).

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: `.changeset/devtools-timeline-store-owns-its-capacity.md`
- FOUND: commits `ba4dd177` and `7211d23b` (ancestors of HEAD)
