---
phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
plan: 02
subsystem: react-registry-lifetime-regression-tests
tags: [regression-test, activity, red-first, react, commit-order]
requires: [82-01]
provides:
  - QadiProvider.lifetime.test.tsx, LT1 to LT8, red on the phase base for the stated reason
  - 82-RED-EVIDENCE.md sections holding each red line, the LT5 scratch failure and the observed base commit order
affects: [82-03, 82-04, 82-05, 82-06, 82-07, 82-08, 82-09, 82-10]
key-files:
  created:
    - packages/react/test/QadiProvider.lifetime.test.tsx
  modified:
    - .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-RED-EVIDENCE.md
key-decisions:
  - "The scenario tests share one rig built per test: a Host holding the scene above an Activity, a boundary recording caught errors, a console.error spy and a RegistryTap recording each distinct registry, so a hoisted element and a re-rendered one differ only in the view function"
  - "LT6, LT7 and LT8 are red on the base through a second registry (seen.size 2) with no thrown reveal, so their fixed outcome is the one-registry assertion, not an error absence"
  - "The commit order is recorded as observed and matches the research prototype; the one addition is that on a long-hide reveal the base's provider subject effect throws first, so React unmounts the tree and the provider's passive setup never runs"
requirements-completed: [LEASE-01, LEASE-03, WX-06, WX-07]
metrics:
  duration: 25min
  completed: 2026-11-25
status: complete
commits: 3
plan_head_before: 380fc0a715fbed960614f1032fa76e31ea453f90
plan_head_after: 1f0092db69a3ad8da7aae928948d6a2129862e2a
actuals:
  tokens: 23000
  tasks: 3
  commits: 3
---

# Phase QD-82 Plan 02: the long-hide reveal pinned red on the base Summary

**Eight rendered lifetime tests (LT1 to LT8) through the real `QadiProvider`, React 19.3.1's `<Activity>` and effect's `AtomRegistry`, seven red on the phase base for the stated reason and the eighth a control shown failing under a scratch edit, with the base's commit order recorded from an instrumented run.**

## Accomplishments

- LT1, the tracer: a hoisted provider with a gate and a `useSubject()` probe under an `<Activity>`, hidden past a real 50 ms
  macrotask and shown again. On the base the boundary above it catches three `registry is disposed` errors (two consumer
  subscriptions at `Hooks.js:63`, then the provider's subject effect at `QadiProvider.tsx:258`). It asserts the fixed outcome
  (no caught error, no `console.error`, `allowed`, `subject:u1`), not the base's error.
- LT2 (`useInvalidate`), LT3 (`useDevtoolsFeed`) and LT4 (StrictMode, with a host `keepAlive` atom still `seeded` after the
  double effect) fail on the base with four, four and six caught errors. LT6 (subject changed while hidden), LT7 (a re-render
  while hidden) and LT8 (an `atoms` swap while hidden, `["AtomsReplaced"]` once) fail on the base because a second registry
  is built (`seen.size` is 2); the reveal throws nothing there.
- LT5, the short-hide control, passes on the base (host `seeded`, one registry) and is shown failing once under a copy-backed
  scratch edit that disposes the registry in the effect's cleanup with no timer: three caught errors. Both sides of the
  timer are pinned (LT5 against LT1).
- `82-RED-EVIDENCE.md` holds `## the long-hide reveal on the base`, `## the scenario companions on the base` (each
  `- red on the base:` and the `- failed (scratch):` line, with the assertion line) and `## observed commit order on the base`
  with `ORDER mount`, `ORDER short hide and reveal` and `ORDER long hide and reveal`.
- The rule observed: setup runs children before the provider (layout then passive), cleanup runs the parent before its
  children, and the provider's passive setup is the last effect a good reveal runs. It matches the research prototype.

## Task commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 | 9e71d664 `test(82-02): a provider revealed after a long hide pins the decision and no error` | `QadiProvider.lifetime.test.tsx`, `82-RED-EVIDENCE.md` |
| 2 | cab1e0ce `test(82-02): the scenario companions of a long hide, one registry each` | `QadiProvider.lifetime.test.tsx`, `82-RED-EVIDENCE.md` |
| 3 | 1f0092db `docs(82-02): record the commit order observed on the base` | `82-RED-EVIDENCE.md` |

## Deviations from Plan

None - plan executed exactly as written. Inside the plan's latitude: the temporary log of Task 1 was applied to the real test
file and removed from a saved clean copy before the commit (the verify greps for `console.log`), and Task 3's
instrumentation also marked the provider's subject effect, which the plan did not ask for and which shows where the base
throws on reveal.

## Authentication Gates

None.

## Known Stubs

None. The only product file added is a test; `packages/react/src` equals `phase_base` (checked at each commit and after
every scratch edit) and no scratch file exists in the tree.

## Threat Flags

None. No endpoint, auth path or schema changed.

## Issues Encountered

None. The react project reports `7 failed | 651 passed (658)` on the base: the seven red lifetime tests, nothing else
(650 existing tests plus LT5). `tsc -p tsconfig.test.json` and `oxlint` are clean on the test file.

## Next Phase Readiness

Ready for 82-03. LT1 to LT4 and LT6 to LT8 are the tests the lease must turn green; LT5 must stay green. The recorded
commit order is what places the lease's `hold` in the provider's passive effect.

## Self-Check: PASSED

- FOUND: `packages/react/test/QadiProvider.lifetime.test.tsx`, `82-RED-EVIDENCE.md`, this file
- FOUND: commits 9e71d664, cab1e0ce, 1f0092db on `arch-wave-15`
- The three task verifies pass; `packages/react/src` equals `phase_base`; `git status --porcelain -- packages` prints nothing
