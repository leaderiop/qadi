---
phase: QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner
plan: 05
subsystem: react
tags: [react, qadi-provider, registry-owner, provider-forwards-only, red-evidence]

phase_base: 41c53c65c3ceb60f974650dd374f391c81db56e7
plan_head_before: 0e6faac0030f6d0d98f7b7981ff4ef66ca626dbc
plan_head_after: f9c51e0528ac05d9965a07abb11188998a4be77b
commits: 2

requires:
  - phase: QD-86 plan 04
    provides: makeRegistryOwner and its sixteen headless rows
  - phase: QD-86 plan 02
    provides: 86-check.mjs provider-forwards-only and owner-shape
  - phase: QD-86 plan 03
    provides: the earlier-checks ledger whose single-owner row moves
provides:
  - QadiProvider.tsx that builds one owner in render and forwards each commit, hold and release to it
  - 86-RED-EVIDENCE.md `## 86-05 the forwarding provider`, four scratch edits seen failing and the order swap run
affects: [QD-86 plans 06 to 08]

actuals:
  tokens: 2400
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a component that only forwards: one owner ref behind ??=, commit effect first, hold/release effect last"

key-files:
  created: []
  modified:
    - packages/react/src/QadiProvider.tsx
    - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-RED-EVIDENCE.md

key-decisions:
  - "The atoms-identity comment and the ticket-34 comment are one comment block above the commit effect, joined by an empty comment line, so the single effect carries both reasons"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "The provider builds one owner in render and its four effects forward: commit first on [owner, atoms, subject], the two instrumentation effects unchanged, hold and release last on [owner]"
    requirement: PREG-04
    verification:
      - kind: test
        ref: "pnpm exec vitest run --project react (44 files, 703 tests, green four runs in a row, no test edited); 86-check.mjs provider-forwards-only and owner-shape"
        status: pass
    human_judgment: false
  - id: D2
    description: "A provider hidden in Activity past a macrotask and shown again still renders its decision with no disposed-registry throw"
    requirement: PREG-01
    verification:
      - kind: test
        ref: "QadiProvider.lifetime.test.tsx rows LT1, LT4, LT5 and the owner characterisation C1 to C9, unedited"
        status: pass
    human_judgment: false
  - id: D3
    description: "provider-forwards-only seen failing on the rewired provider under four scratch edits"
    requirement: WX-06
    verification:
      - kind: other
        ref: "86-RED-EVIDENCE.md `## 86-05 the forwarding provider`"
        status: pass
    human_judgment: false

duration: 15min
completed: 2026-11-25
status: complete
---

# Phase 86 Plan 05: The provider forwards to the owner Summary

**`QadiProvider.tsx` now builds one `makeRegistryOwner` in render and only forwards: the commit effect first, the two instrumentation effects unchanged, hold and release last, with every lifetime branch left in the measured owner.**

## Performance

- **Duration:** about 15 min
- **Tasks:** 2 (tracer, auto)
- **Files modified:** 2 (and this summary)
- **Commits:** 2

## Accomplishments

- The provider lost `registryRef`, `atomsIdentityRef` and its effect, `latestRef` and its effect, `leaseRef`, the lease
  and the guarded subject write (84 lines out, 25 in). It keeps three refs (`signalRef`, `ownerRef`,
  `reportedInstrumented`), three memos and four effects. `AtomRegistry` is a type import, `RegistryLease.ts` is no longer
  imported, and the header paragraph now names `RegistryOwner.ts` and `RegistryLease.ts`.
- The whole react project is green with no test edited (44 files, 703 tests, four runs in a row, no flake seen),
  including the held `QadiProvider.lifetime.test.tsx` and the characterisation C1 to C9.
- `provider-forwards-only`, `owner-shape`, `scan-forbidden`, `scan-ids`, `86-pinned-check.mjs` (59 held files, 1 born
  file held), typecheck, `pnpm lint`, `pnpm circular` and `pnpm test:tstyche` pass; `index.ts` and `RegistryLease.ts` equal
  `phase_base`.
- The earlier-checks ledger exits 0 and now prints the moved row: `82-check.mjs single-owner: exit 1: QadiProvider.tsx does
  not build one lease`; every other line still matches its recorded row.
- `provider-forwards-only` was seen failing on the rewired provider under all four scratch edits; the order swap left
  all 11 files (97 tests) green, so the commit-before-hold order is held by the check alone while nothing throws.

## Task Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 (tracer) | `51259243` | `refactor(86-05): QadiProvider forwards its registry lifetime to the owner` |
| 2 | `f9c51e05` | `docs(86-05): record the forwarding check seen failing on the rewired provider` |

## Deviations from Plan

None. The plan executed as written; the "reword the seed and hold comments to name the owner" step was taken as the plan
states, and no phrase of a moved comment was stale beyond the deleted-ref wording the plan names.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None. T-86-15 holds (commit effect first, hold last, the check refuses any other order and was seen failing under the
swap), T-86-16 (the commit effect runs on `[owner, atoms, subject]` and writes unconditionally; SUBJ, LT, C4, C5, C9
green unedited), T-86-17 (one owner behind `??=`, never disposed; LT1 to LT18 green unedited).

## Next Phase Readiness

Ready for plan 06. The provider forwards, the owner is mutated by Stryker alone, and `QadiProvider.tsx` is not in a
`mutate` list.

## Self-Check: PASSED

- Files: `packages/react/src/QadiProvider.tsx`, `86-RED-EVIDENCE.md` and this summary exist.
- Commits `51259243` and `f9c51e05` are ancestors of HEAD, each with the one Co-Authored-By trailer; both task verifies
  passed; `git status --porcelain -- packages` is empty.
