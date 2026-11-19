---
phase: QD-55-a-port-card-is-a-model-row-not-a-view-join
plan: 02
subsystem: devtools
tags: [characterisation, services-panel, golden-markup, outerHTML, ARCH-102]
requires: [55-01]
provides:
  - "ServicesPanel.characterisation.test.tsx: sixteen whole-outerHTML cells of the Services panel, GREEN on the phase base"
affects: [55-03, 55-04, 55-05, 55-09]
actuals:
  tokens: 14500
  tasks: 2
  commits: 2
plan_head_before: 26e603c4fef6c09d95856f6e41418c23d84b704d
plan_head_after: 51e6ff48a95bf213d1becf00c9d7cf0390372442
tech-stack:
  added: []
  patterns: ["goldens produced on the base by a temporary capture copy, pasted as literals, capture deleted before commit"]
key-files:
  created:
    - packages/devtools/test/react/ServicesPanel.characterisation.test.tsx
  modified: []
key-decisions:
  - "Fixtures R9, A and C are top-level consts annotated ReadonlyArray<PortActivity> / ReadonlyArray<PortCall>, so 55-03's narrowing of PortActivity.port compiles the file unchanged"
requirements-completed: [CARD-01, WX-06]
duration: 6min
completed: 2026-11-18
status: complete
---

# Phase QD-55 Plan 02: Services panel characterisation on the base

**Sixteen cells pin the Services panel's whole `outerHTML` through the public dock (Services tab, `reading` and `diagnostics` props) against literals produced on the phase base, in two `test(55-02)` commits, before any src change.**

Note: per the executor brief, `REQUIREMENTS.md` is untouched; CARD-01 and WX-06 close with 55-09 and the milestone. `requirements-completed` copies the plan's ids per the template.

## Result

- Cells: vitest reports 10 tests after Task 1 and 16 after Task 2 (`Tests  16 passed (16)`), one per cell 1-16.
- Commits: `7b9db6c0` `test(55-02): pin every Services card without calls on the base` (cells 1-9, 13; 263 insertions) and `51e6ff48` `test(55-02): pin every Services call list and the real report on the base` (cells 10, 11, 12, 14, 15, 16; 206 insertions, 0 deletions).
- The file imports only `../../src/index.ts`, `../../src/react/index.ts`, `@qadi/core`, `effect/*`, `@effect/vitest` and `@testing-library/react`. No capture code remains. `tsc -p tsconfig.test.json`, `oxlint` and `check-house-style.mjs` are clean.
- No `packages/*/src` file, existing test or feature file changed since `phase_base`.

## Goldens that surprised

None contradicted the plan; three behaviours worth knowing, all read off the base ServicesPanel.tsx:

- Duration `1.25` renders `1.3 ms` (`toFixed(1)` on an exactly representable half rounds up): the base line is `ServicesPanel.tsx:248`.
- In the real report (cell 14) every required port except the retried AttributeResolver reads `not provided to this reader`, and the two optional ones `absent`, as `stateOf` (`:281-288`) gives.
- Cell 4 and cell 16 (Failed, Starting) render the starting notice followed by `qadi-wiring-failed`: the failed view ignores `unsampled` (`:91`), unlike NotHanded (`:83`).

## Deviations from Plan

None - plan executed exactly as written.

The call cells' fixtures (SMALL_REPORT, calls C) and imports were added as pure insertions so the second commit removes no line Task 1 wrote (verified: `206 0` numstat).

## Known Stubs

None.

## Self-Check: PASSED

- `packages/devtools/test/react/ServicesPanel.characterisation.test.tsx` exists; `7b9db6c0` and `51e6ff48` are ancestors of HEAD.
- All six plan verifies exit 0 (Task 1's three and Task 2's three), including exactly two `test(55-02)` commits, each the test file alone with the trailer.
