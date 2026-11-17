---
phase: QD-47-port-facts-read-from-the-description
plan: 07
subsystem: evidence
tags: [mutation, scope, merge-gate, release-check, ports]
phase_base: 9f2051228ef4d577262891a4e7882a8683b7754e
plan_head_before: b9ac311a3c58b22d504336b3e7eb3202f221a9e2
plan_head_after: 3d31e61bb1aef8e93867df478c6d68faae83445c
commits: 2
requires: [47-06]
provides:
  - "47-mutation-after.json: eight scores, none below base"
  - "scope, forbidden-construct, mark-reader, commit-order, trailer, id and held-line checks, all green on the final HEAD"
  - "pnpm check:pr green; nothing released, pushed or staged"
affects: []
tech-stack:
  added: []
  patterns: ["the comparer is the plan's verify, run from a file; evidence commits are located by the files they touch"]
key-files:
  created:
    - .planning/phases/QD-47-port-facts-read-from-the-description/47-mutation-after.json
  modified:
    - spec/README.md
key-decisions:
  - "The CCR-QD-438 row names the mutation evidence (47-06 left the sentence 'named by 47-07'); spec/README.md bumped 1.202 to 1.203."
requirements-completed: [WX-01, WX-02, WX-04, WX-05, WX-06, WX-07]
status: complete
actuals:
  tokens: 4000
  tasks: 3
  commits: 2
metrics:
  completed: 2026-11-16
---

# Phase 47 Plan 07: Close on evidence Summary

No touched file's Stryker score fell, the two new files score 1, and the merge gate's PR form, the scope, order and release checks are all green on the final HEAD.

## Mutation after

Four fresh runs (one per new file, then the base's two exact invocations), every one exit 0, no test edited, so no survivor round was needed.

| File | Base | After | (detected/scored) |
|---|---|---|---|
| packages/core/src/PortDerivation.ts | 0.98 | 0.98 | 49/50 |
| packages/core/src/PortDescription.ts | 1 | 1 | 16/16 |
| packages/core/src/PortDoubles.ts | 1 | 1 | 36/36 |
| packages/core/src/Ports.ts | 1 | 1 | 16/16 |
| packages/devtools/src/model/PortCalls.ts | 1 | 1 | 40/40 |
| packages/devtools/src/model/Wiring.ts | 1 | 1 | 50/50 |
| packages/core/src/PortDefault.ts (new) | new | 1 | 14/14 |
| packages/devtools/src/model/PortReading.ts (new) | new | 1 | 64/64 |

Survivor: `PortDerivation.ts:173:45 ObjectLiteral Survived -> {} on: { permits }`, the base's one pre-existing survivor (172:45 at the base, shifted one line by this phase). `PortCalls.ts` and `Wiring.ts` have fewer scored mutants than at the base (49 and 63 to 40 and 50): the 47-04 rework moved logic into `PortReading.ts`; both stay at 1. `ServicesPanel.tsx` is unmeasured by design (see the base JSON).

## New-file survivors

None: both new files score 1.

## Check output

Task 1 second verify: `after-scores committed once, alone; new-file survivors accounted for`.

Task 2 first verify: `37 files changed, all in scope; no forbidden construct added; the mark read only where allowed`.

Task 2 second verify: `located:` base JSON #0 `57c743ce`; RED adds `WiringDefaulted.test.ts` #1 `eff51e78`; characterisation adds `ServicesPanel.reading.test.tsx` #3 `027bc5a2`; captured-default row first edits `Capture.test.ts` #4 `c04552f6`; tracer adds `PortDefault.ts` #6 `368e3a1d`, which is also the first `packages/*/src` commit; then `22 commits in order; ids reserved and used; held lines intact; no scratch port`.

Task 3 release check: `nothing released, pushed or staged`.

## check:pr

`pnpm check:pr < /dev/null` exit 0 on `3d31e61b`, the last commit before this SUMMARY (`.planning/` only after it); tail:

```
[run-check 16/16] pnpm spec:publish
publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)
run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).
```

## Deviations from Plan

**1. [Rule 2 - Spec accuracy] CCR-QD-438 row names the mutation evidence.** 47-06 wrote "The mutation evidence is named by 47-07" into the row; this plan replaced it with the scores. `spec/README.md` is in the phase's list; bumped with `spec-revise.mjs` (1.202 to 1.203), `spec:verify:strict` 21 pass / 0 fail, `spec-revise --check` green. Commit `3d31e61b`. The row's "Rev 1.202" for `spec/README.md` itself is the revision it was written at (the usual trailing self-reference).

Otherwise none: the plan ran as written.

## Known Stubs

None.

## Commits

- `36af1977` chore(47-07): mutation after port facts are read from the description
- `3d31e61b` docs(47-07): CCR-QD-438 row names the mutation evidence

## Self-Check: PASSED

`47-mutation-after.json` exists and is committed once alone; both commits are ancestors of HEAD and carry the trailer.
