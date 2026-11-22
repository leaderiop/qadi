---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 03
subsystem: testing
status: complete
tags: [red-first, plants, devtools, admission, untrusted-decode, hydration, wx-06, wx-07]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: the phase base and scratch tooling from plans 68-01 and 68-02
provides:
  - "TF26 to TF29, F31, F32, the notify hostile-value test, E11 to E13, U30, U31, H6 and H7, beside the tests of their shape"
  - "68-RED-EVIDENCE.md: the RED output and the plant evidence, committed before any source fix"
affects: [68-04, 68-07]

actuals:
  tokens: 4100
  tasks: 3
  commits: 3
plan_head_before: de5bac4b05d4654aec75720f7e12d8d13ca121f3
plan_head_after: c87079d29c36ff9f0033e0a73d75b37dc83a5407
commits: 3

tech-stack:
  added: []
  patterns:
    - "a green pin is accepted only after it is seen failing under a plant of the source it reads; each plant is reversed by a trap on every exit path"

key-files:
  created:
    - .planning/phases/QD-68-hygiene-and-recorded-close-outs/68-RED-EVIDENCE.md
  modified:
    - packages/devtools/test/model/TimelineFeed.test.ts
    - packages/devtools/test/model/DiagnosticsFeed.test.ts
    - packages/devtools/test/model/ExternalStore.test.ts
    - packages/core/test/Admission.test.ts
    - packages/core/test/UntrustedDecode.test.ts
    - packages/react/test/UntrustedSeams.test.ts

key-decisions:
  - "The six test files gain lines only; the planned SHA-256 of each file matched after the patches applied, and `git diff --numstat` shows 0 removed lines for each"
  - "requirements-completed stays empty: the orchestrator reserves every HYGN and WX tick for the milestone audit and plan 68-15"

requirements-completed: []

coverage:
  - id: D1
    description: "TF26, TF27 and TF29 fail on the unchanged tree for the reason named; TF28, F31, F32 and the notify test pass there and each fails under its plant"
    requirement: "WX-06"
    verification:
      - kind: other
        ref: "bash <S>/red-check.sh devtools: red-check: devtools passed"
        status: pass
    human_judgment: false
  - id: D2
    description: "E11 to E13 fail on the unchanged tree; U30, U31, H6 and H7 pass there and each fails under its plant"
    requirement: "WX-06"
    verification:
      - kind: other
        ref: "bash <S>/red-check.sh core: red-check: core passed"
        status: pass
    human_judgment: false
  - id: D3
    description: "the RED and plant evidence is committed alone, before any source commit of the phase"
    requirement: "WX-06"
    verification:
      - kind: other
        ref: "the plan's Task 3 verify command"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-11-21
---

# Phase QD-68 Plan 03: The behaviour tests of the phase, RED before the fixes Summary

**Fourteen tests added on the unchanged tree: TF26, TF27, TF29 and E11 to E13 fail for the reason named, and the other eight each fail under a plant of the source they read.**

## Performance

- **Duration:** 2 min (about 97 s of executor time, most of it two vitest runs)
- **Started:** 2026-11-21T05:24:21Z
- **Completed:** 2026-11-21T05:26:30Z
- **Tasks:** 3
- **Files modified:** 7 (six test files, one evidence file), 371 added lines, none removed

## Accomplishments

- OI-11 is pinned and still open for 68-04: TF26 fails on `expected { started: 1, finalized: +0 } to deeply equal { started: 1, finalized: 1 }`
  (the old read is not superseded), TF27 on `expected { reads: 1 } to deeply equal { reads: 2 }`, TF29 on
  `expected Error: timeline boom to equal Error: status boom`. TF28, F31 and F32 pin the states the docs describe after a
  throwing publish and pass on the base.
- OI-12 is pinned: the `notify` test throws, through `notify`, a value whose every trap throws, alone and beside another, and gets it
  back by identity with no trap read; it passes on the base and fails under `plant-es`.
- OI-13 is pinned: H6 (two unknown envelope keys, `MalformedPayload`) and H7 (an unknown key under a kept value of an entry,
  `MalformedEntry`) pass on the base and fail under `plant-h` and `plant-h7`.
- admit's single read (OI-10) is RED: E11, E12 and E13 fail on the unchanged tree (a policy, a `maxDepth` and a subject each read
  more than once); U30 and U31 pin the two accessor readings of the `ignore` projection and pass on the base.
- `68-RED-EVIDENCE.md` holds the verbatim red-check output, the first assertion line of each of the six RED tests and the eight plants,
  committed before any source change.

OI-11, OI-12 and OI-13 are not fixed here: this plan writes the tests, and the source fixes follow in 68-04. Of the three,
the tests of OI-12 and OI-13 are green on the base and guard behaviour; only OI-11's tests are RED.

## Task Commits

1. **Task 1: devtools feeds' tests (tracer)** - `2b79b7f5` (test)
2. **Task 2: admit, decoder and hydration tests** - `045b00bf` (test)
3. **Task 3: the red and characterisation evidence** - `c87079d2` (docs)

**Plan metadata:** the `docs(68-03): complete tests-first plan` commit that follows this file.

## Files Created/Modified

- `packages/devtools/test/model/TimelineFeed.test.ts` - TF26 to TF29
- `packages/devtools/test/model/DiagnosticsFeed.test.ts` - F31, F32
- `packages/devtools/test/model/ExternalStore.test.ts` - the hostile thrown-value test
- `packages/core/test/Admission.test.ts` - E11 to E13
- `packages/core/test/UntrustedDecode.test.ts` - U30, U31
- `packages/react/test/UntrustedSeams.test.ts` - H6, H7
- `.planning/phases/QD-68-hygiene-and-recorded-close-outs/68-RED-EVIDENCE.md` - RED and plant evidence

## Decisions Made

None beyond the plan. The tracer gate (Task 1, automated verify only, `end-of-phase` mode) was met by re-running the plan's
verify on the committed tree; it passed, so the expansion to Task 2 went ahead.

## Deviations from Plan

None - plan executed exactly as written.

Two points that are not deviations. The plan's Task 1 step 2 names the JSON report as the place to read the failure messages, and the
report is a single line, so `grep -F` over it matches by content, which is what the plan's verify does; the per-test first lines
in the evidence file were read with a small scratch script (`msgs.mjs` in the scratch directory, not committed). The report of the
RED run for TF27 prints `expected { reads: 1 } to deeply equal { reads: 2 }`, as the plan's interface note records.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. No source under `packages/*/src` was touched; `git diff --quiet <B> HEAD -- ":(glob)packages/*/src/**"` holds, and no plant
is applied (T-68-06).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

68-04 can fix OI-11 against TF26, TF27 and TF29 (RED now) and 68-07 can state admit's single read against E11 to E13 (RED now).
The test commits precede every source commit of the phase. Nothing blocks.

## Self-Check: PASSED

- `68-RED-EVIDENCE.md` and the six test files exist; `git rev-list --count` from the plan's recorded head to HEAD is 3.
- Commits `2b79b7f5`, `045b00bf` and `c87079d2` are ancestors of HEAD.
- The three task verifies passed on the committed tree; the six test files show 0 removed lines against the phase base.

---
*Phase: QD-68-hygiene-and-recorded-close-outs*
*Completed: 2026-11-21*
