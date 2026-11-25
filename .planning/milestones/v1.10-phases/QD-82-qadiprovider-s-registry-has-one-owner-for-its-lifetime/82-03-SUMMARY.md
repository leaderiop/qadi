---
phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
plan: 03
subsystem: react-registry-lifetime-regression-tests
tags: [regression-test, activity, red-first, react, seed, sweep, hydration]
requires: [82-02]
provides:
  - LT9 to LT15 in QadiProvider.lifetime.test.tsx, each red on the phase base
  - the unmount test in edges.test.tsx rewritten to observe the release, red on the phase base
  - 82-RED-EVIDENCE.md section "what a recycle restores, on the base" with each red line and assertion line
affects: [82-04, 82-05, 82-06, 82-07, 82-08, 82-09, 82-10]
key-files:
  created:
    - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/deferred-items.md
  modified:
    - packages/react/test/QadiProvider.lifetime.test.tsx
    - packages/react/test/edges.test.tsx
    - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-RED-EVIDENCE.md
key-decisions:
  - "A short hide inside LT15 is two synchronous act calls (`flip`), not the awaited pair LT5 uses: the awaited pair crosses a macrotask in a cold run and turned the control into a long hide"
  - "LT11 clears its frame log after the re-render and just before the reveal, so a render of the hidden tree is never read as a frame the user saw; LT9 clears before the hide because its element is hoisted and nothing renders while hidden"
  - "LT12 states the rule (sweeps equal forks, each fork saw the sweeps before it, the gate's question is asked once and kept) and no step count; the episode after the reveal is the one P4 pins, copied"
  - "The rig takes the atom set as a parameter and returns the registry the tap was handed, so the seeded tests and the sweep test reuse one rig; LT1 to LT8 keep their bodies"
requirements-completed: [LEASE-03, LEASE-04, WX-06]
duration: 40min
completed: 2026-11-25
status: complete
commits: 3
plan_head_before: f25010576a844f10cec82b8ebb54dea6c8e97b96
plan_head_after: 57f3bff6e79c05cfec15e3e503f01d5c3d522fc1
actuals:
  tokens: 4200
  tasks: 3
  commits: 3
---

# Phase QD-82 Plan 03: what a recycle restores, pinned red on the base Summary

**Seven rendered lifetime tests (LT9 to LT15) and the unmount test made real, every one red on the phase base for the stated reason: a seeded allow never shown again as an authority, one mismatch report, one fork and one sweep per episode, the subject in the first frame, the accepted straggler, a host's own subscription, and the release observed through a `keepAlive` host atom.**

## Accomplishments

- LT9 (the tracer): a seeded allow for a question whose resolver never answers renders `allowed` while mounted, and across
  a long hide and reveal no frame a probe recorded reads `true` and the gate reads `pending`. Red on the base: the reveal
  meets the disposed registry (three caught errors). Pinned on an unanswered question because an answered one never reads
  its seed again.
- LT10 (no subject, a seed): `allowed` mounted, `pending` after the long hide; red on the base (two caught errors).
- LT11 (the superseded allow): atoms answering deny after 1 ms, a re-render committed while hidden, the provider element built
  in the parent's render. Red on the base because the first frame after the reveal reads the server's allow: frames
  `[true, false]`. It also asserts one hydration mismatch report in total.
- LT12 (the sweep across a long hide): `withSweepFork` and `makeSweepCounter` with the real sweep, the rule asserted and no
  step count; red on the base because the gate never renders again after the reveal.
- LT13 (the subject in the first frame): a reveal committed with a re-render, every rendered id recorded, one registry seen;
  red on the base because a second registry is handed to the tree.
- LT14 (the straggler): a read of the decision after an unmount and the release throws nothing, and a macrotask later the
  registry holds no node for it; red on the base because the registry is disposed.
- LT15 (a host subscription): a counting listener on the registry hears `before` and, across a short hide, `short`, and is
  not called by a set after a long hide; red on the base at that set (disposed registry), with the short-hide control inside
  the test passing on the base.
- `edges.test.tsx` `releases its registry after it unmounts` replaces the vacuous `disposes its registry when unmounted`: a
  `keepAlive` host atom seeded through `initialValues` reads `seeded` while mounted and must read `default` from the same
  registry after a real 50 ms macrotask. Red on the base (disposed registry). The file header names the release.
- The full react project on the base reads `15 failed | 650 passed (665)`: LT1 to LT4, LT6 to LT15 and the edges test; LT5
  and the 650 existing tests pass. `tsc -p tsconfig.test.json` and `oxlint` are clean on both test files.

## Task commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 | f5e03744 `test(82-03): a seeded allow is not shown again after a long hide` | `QadiProvider.lifetime.test.tsx`, `82-RED-EVIDENCE.md` |
| 2 | 1e003037 `test(82-03): what a recycle restores, its sweep and its first frame` | `QadiProvider.lifetime.test.tsx`, `82-RED-EVIDENCE.md` |
| 3 | 57f3bff6 `test(82-03): a straggling read, a host subscription and the unmount release observed` | `QadiProvider.lifetime.test.tsx`, `edges.test.tsx`, `82-RED-EVIDENCE.md` |

## Deviations from Plan

None - plan executed exactly as written. Inside the plan's latitude: LT15's short hide uses a synchronous `flip` of the
rig instead of the awaited `hide`/`show` pair, because the awaited pair is timing-fragile when the test is the first of a run
(see Issues Encountered), and the rig gained a `registry()` accessor and an atom-set parameter.

## Authentication Gates

None.

## Known Stubs

None. Only test files and planning evidence changed; `packages/react/src` equals `phase_base` at each commit and at the end.

## Threat Flags

None. No endpoint, auth path or schema changed.

## Issues Encountered

LT5 (82-02) fails when it is the first test a run executes (`-t "LT5 "`: 5 of 6 runs here, and 3 of 3 against the file as 82-02
committed it), and passes in every full-file run. The awaited `hide`/`show` pair crosses a macrotask in a cold run, so the
provider's deferral fires between them. It is out of this plan's scope (LT1 to LT8 stay as committed) and is logged in
`deferred-items.md` with the fix a later plan should apply if it runs LT5 alone. None of this plan's verifies runs LT5.

## Next Phase Readiness

Ready for 82-04. The tests the lease must turn green are LT1 to LT4, LT6 to LT15 and the edges unmount test; LT5 must stay
green. LT15's pass condition after the fix is the recycle's `reset()` detaching the listener at the timer, the very first
`set` after the long hide being a no-op for it; LT14's is a straggling read that recreates a node silently.

## Self-Check: PASSED

- FOUND: `packages/react/test/QadiProvider.lifetime.test.tsx`, `packages/react/test/edges.test.tsx`, `82-RED-EVIDENCE.md`, `deferred-items.md`, this file
- FOUND: commits f5e03744, 1e003037, 57f3bff6 on `arch-wave-15`
- The three task verifies pass (`seen-failing`, `scan-ids`, `scan-forbidden`, `commit` each printed its success line); `packages/react/src` equals `phase_base`
