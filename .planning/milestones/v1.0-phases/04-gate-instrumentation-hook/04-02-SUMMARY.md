---
phase: 04-gate-instrumentation-hook
plan: 02
subsystem: react
tags: [react, effect, atoms, gate-registry, instrumentation, ARCH-49]

requires:
  - phase: 04-01
    provides: "useGates in GateWriter.ts and the GateScopeContext writer"
provides:
  - "useQuestionsAs as the single expression useGates(kind, questions).results"
  - "hooks.rerender.test.tsx: the D-07 pin on usePolicies across equal re-renders"
  - "GateWriter.kinds.test.tsx: one table over all eight gate kinds, and the per-entry precision pin"
affects: [04-03, 04-04]

plan_head_before: 950dfdec7b4f2aeb2ddae27bb547008b43177d50
plan_head_after: 76db6b7b014c68cd068c04fe27c0e9f9375a7665

actuals:
  tokens: 4000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A spread copy of a real atom set, with opener properties that record calls, counts hook-level lookups without counting the atom set's own closure-local ones"

key-files:
  created:
    - packages/react/test/hooks.rerender.test.tsx
    - packages/react/test/GateWriter.kinds.test.tsx
  modified:
    - packages/react/src/hooks.ts

key-decisions:
  - "usePolicies does not re-create its group atom or its registrations across equal re-renders, so GateWriter.ts needs no Equal-keyed structural memo (D-07)"
  - "The one per-entry atom lookup lives in useGates, memoised on the group, rather than the group atom standing in as each entry's identity (D-03, BEH-QD-068)"

requirements-completed: [GATE-02, GATE-03, GATE-04, GATE-05, XC-04, XC-05]

coverage:
  - id: D1
    description: "usePolicies with inline, equal-but-distinct policies creates one group atom, looks up no further decision and notifies the registry never, across equal re-renders"
    requirement: "GATE-04"
    verification:
      - kind: unit
        ref: "packages/react/test/hooks.rerender.test.tsx#instrumented: no second group atom, no further decision lookup, no registry notification"
        status: pass
      - kind: unit
        ref: "packages/react/test/hooks.rerender.test.tsx#uninstrumented: no second group atom and no further decision lookup"
        status: pass
    human_judgment: false
  - id: D2
    description: "useQuestionsAs is a thin caller of useGates; hooks.ts holds no identity machinery and no atom-set opener call"
    requirement: "GATE-03"
    verification:
      - kind: command
        ref: "grep non-comment identity machinery and atoms.decision(s)( in hooks.ts and useGate.ts == 0; pnpm vitest run --project react (361 passed)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Every gate kind registers once through the one hook, with its element only for Can and Cannot and /<name> only for the grouped hooks"
    requirement: "GATE-02"
    verification:
      - kind: unit
        ref: "packages/react/test/GateWriter.kinds.test.tsx#every gate kind registers once through the one hook"
        status: pass
    human_judgment: false
  - id: D4
    description: "Changing one entry of a grouped hook re-registers that entry alone"
    requirement: "GATE-02"
    verification:
      - kind: unit
        ref: "packages/react/test/GateWriter.kinds.test.tsx#changing one entry re-registers that entry alone"
        status: pass
    human_judgment: false
  - id: D5
    description: "The pre-existing React suite passes with no tracked test file modified"
    requirement: "GATE-05"
    verification:
      - kind: command
        ref: "pnpm vitest run --project react (361 passed); git status shows no modified tracked test file"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-11-08
status: complete
---

# Phase 04 Plan 02: Grouped hooks onto useGates Summary

**`useQuestions` and `usePolicies` now read through `useGates` as a one-expression body, and two new test files pin that `usePolicies` never re-creates its group atom or registrations and that every gate kind registers once through the one hook.**

## Performance

- **Duration:** about 5 min (wall clock)
- **Completed:** 2026-11-08T04:53:07Z
- **Tasks:** 3
- **Files:** 3 (2 created, 1 modified)

## Accomplishments

- `hooks.ts`'s `useQuestionsAs` is `useGates(kind, questions).results`. The `GateIdentity`, id and ref hooks, registration hook, writer lookup and both atom-set opener calls are gone from it. `hooks.ts` shrank by 71 lines (59 net).
- The D-07 question is answered by a test written first and run against the code before the move.
- One table asserts the per-kind facts for all eight `GateKind`s; a separate pin asserts per-entry precision.

## D-07 finding

**No re-creation.** `usePolicies` builds a fresh record every render, and the atom set's structural keying plus `useGates`' group-keyed memo mean nothing is re-created. Measured by `hooks.rerender.test.tsx` across three equal re-renders (ticks 1 to 3) with both policies built inline each render:

| Measure | Value |
| ------- | ----- |
| Distinct group atoms returned by `decisions` | 1 |
| `decision`-opener calls, delta across the re-renders | 0 (2 calls at first mount, one per entry, still 2 after) |
| Registry notifications, delta across the re-renders | 0 (2 at settle, still 2 after) |
| Instance ids after the re-renders | unchanged |
| Hook-level `decisions` calls (cost, not asserted) | 4 in total: one structural lookup per render, tick 0 through tick 3 |

Both the instrumented and the uninstrumented test passed against the pre-move code, so the pin's commit (`e173f4a`) touches no file under `packages/react/src`. **`GateWriter.ts` did not change**: the `Equal`-keyed structural memo D-07 names was not needed.

## D-03 reasoning (for ADR-QD-111 in plan 04-03)

No `QadiAtoms` member returns the entry atoms the `decisions` opener reads, and widening `QadiAtoms` would be a breaking change, which D-09's patch changeset rules out. Using the group atom itself as each entry's identity would re-register every sibling whenever one entry changes, which breaks BEH-QD-068 (spec/behaviors/09-react.md:433-441): a grouped hook "MUST unregister exactly an instance whose name is dropped". So `useQuestionsAs` stops looking up atoms at all (D-03), and the one per-entry `decision` lookup lives in `useGates`, memoised on the group, so an equal re-render performs none. Each entry's identity stays its own decision atom from the question book's structural lookup, so a changed entry re-registers with its current policy and resource and its siblings are left alone. The precision pin in `GateWriter.kinds.test.tsx` asserts it: after `docId` changes, the `/admin` registry instance is the same object (`toBe`) and the `/doc` id is unchanged.

## Task Commits

1. **Task 1: pin usePolicies across equal re-renders (D-07)** - `e173f4a` (test)
2. **Task 2: useQuestions and usePolicies read through useGates** - `9c9ebaa` (refactor)
3. **Task 3: every gate kind registers once through useGates** - `76db6b7` (test)

## TDD notes

- Task 1 is a characterization pin, not a red-green: it was written to answer D-07 and run against the unmoved code, where both tests passed (the plan's expected finding). The target tests executed (2 tests discovered, 2 passed), so this is a valid pin and not a vacuous one.
- Task 2 is a behaviour-preserving refactor guarded by Task 1's pin plus the untouched suite (every pre-existing test, including the grouped-registration tests in `GateRegistry.test.tsx` and the `usePolicies` tests in `hooks.test.tsx`, passed unedited).
- Task 3 added pins over already-correct behaviour, so there was no RED to observe.

## Verification Results

- `pnpm vitest run --project react`: 23 files, 361 tests passed (349 from before this plan, plus 2 in `hooks.rerender.test.tsx` and 10 in `GateWriter.kinds.test.tsx`).
- `pnpm typecheck`, `pnpm circular` (no cycle), `node scripts/check-house-style.mjs` (403 files clean), `pnpm spec:api` (862 exports documented): all exit 0.
- Non-comment identity machinery in `hooks.ts` and `useGate.ts`: 0 (baseline 17). Non-comment `atoms.decision(s)(` calls there: 0 (baseline 4).
- `git status -- packages/react/test packages/react/src` shows only the files this plan committed; no pre-existing test file modified.
- The coverage threshold (90%) is checked by `pnpm coverage` in plan 04-04; not run here, as the plan assigns it there.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. T-04-06 is mitigated by Task 1's pin (no re-creation found, so no structural memo was needed) and T-04-07 by Task 3's precision pin.

## Issues Encountered

None. `.planning/config.json` and `.planning/state.json` were already modified or untracked before this plan began and are not part of its commits.

## Next Phase Readiness

Ready for 04-03: the findings above, the D-03 reasoning and the unchanged `GateWriter.ts` are the inputs ADR-QD-111 needs.

## Self-Check: PASSED

- FOUND: packages/react/test/hooks.rerender.test.tsx
- FOUND: packages/react/test/GateWriter.kinds.test.tsx
- FOUND commits: e173f4a, 9c9ebaa, 76db6b7
