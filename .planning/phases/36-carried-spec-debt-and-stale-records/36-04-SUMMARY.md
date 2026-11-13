---
phase: 36-carried-spec-debt-and-stale-records
plan: 04
subsystem: testing
tags: [react, hydration, effect-reactivity, atom-registry, activity, vitest]

requires:
  - phase: 36-carried-spec-debt-and-stale-records
    provides: "36-03 (SUBJ1..SUBJ3 RED, registry-timing canaries)"
provides:
  - "SD1..SD5 (QadiProvider.seed.test.tsx), RED on the base: a seed is lost before a late gate reads it"
  - "HL1..HL7 (Hydration.lifetime.test.ts) on a bare registry: HL1 and HL2 RED, HL3..HL7 green traps for the rejected designs"
  - "SeedSlot { hold(decision) } (package-private, HydrationEngine.ts); HydrationSeedLookup returns it and SeededQuestion.seed is one, behaviour unchanged"
affects: [36-09, 36-12, 36-14]

actuals:
  tokens: 4100
  tasks: 3
  commits: 3

plan_head_before: f4c8048f9e75751a90aa7752ac7fefda8516cfac
plan_head_after: 8a6c2cb53e9b9cce1ac9fc8332e95745b6545ff4
commits: 3

tech-stack:
  added: []
  patterns:
    - "a real setTimeout turn after settle() waits out the registry's macrotask node removal; vi.useFakeTimers only where the pin is that no timer ends a seed (HL2)"
    - "a seam shape lands apart from the behaviour that uses it: the slot returns the old [seedAtom, decision] pair"

key-files:
  created:
    - packages/react/test/QadiProvider.seed.test.tsx
    - packages/react/test/Hydration.lifetime.test.ts
  modified:
    - packages/react/src/HydrationEngine.ts
    - packages/react/test/HydrationEngine.test.ts

key-decisions:
  - "HL6 builds its registry after settle(): the sweep must evict before the registry exists, otherwise the registry's removal task is the thing under test and the kept question reads undefined on the base"
  - "SD2 and SD5 build the atom set as Layer.merge(EvaluationServicesNone, Layer.succeed(AttributeResolver, ...)) plus EvaluationIdLive, so the resolver override wins over the standing none"

requirements-completed: []

coverage:
  - id: D1
    description: "The hydration seed lost on a late mount is pinned RED before its fix, in a provider (SD1..SD5) and on a bare registry (HL1, HL2)"
    requirement: "DEBT-04"
    verification:
      - kind: unit
        ref: "packages/react/test/QadiProvider.seed.test.tsx#SD1..SD5 (RED on the base by design)"
        status: pass
      - kind: unit
        ref: "packages/react/test/Hydration.lifetime.test.ts#HL1, HL2 (RED on the base by design)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The rejected designs are kept out by green pins: a registry never given a seed reads none, a spent seed is not read again, an unhydrated question leaves no node, eviction forgets a cold seed, two registries read their own seed"
    requirement: "WX-06"
    verification:
      - kind: unit
        ref: "packages/react/test/Hydration.lifetime.test.ts#HL3..HL7"
        status: pass
    human_judgment: false
  - id: D3
    description: "The SeedSlot seam is in place and the engine's seam tests use it with no behaviour change and no assertion change"
    requirement: "DEBT-04"
    verification:
      - kind: command
        ref: "pnpm typecheck && pnpm lint; pnpm vitest run --project react (fails exactly SUBJ1..3, SD1..5, HL1, HL2)"
        status: pass
    human_judgment: false
---

# Phase 36 Plan 04: Hydration seed RED pins and the SeedSlot seam Summary

**The hydration seed lost on a late mount is RED on the base in a provider and on a bare registry, the rejected designs' traps are pinned green, and a package-private `SeedSlot` seam is in place with behaviour unchanged.**

## Performance

- **Tasks:** 3 (two RED test commits, one tracer refactor commit)
- **Files:** 2 created, 2 modified

## Accomplishments

- `QadiProvider.seed.test.tsx` holds SD1..SD5. All five fail on the base with the gate rendering `pending`.
- `Hydration.lifetime.test.ts` holds HL1..HL7 on a bare `AtomRegistry`: HL1 and HL2 are RED, HL3..HL7 are green.
- `SeedSlot` is exported from `HydrationEngine.ts` only (not the barrel). `HydrationSeedLookup` returns it, `SeededQuestion.seed` is one, and `hold` returns the same `[seedAtom, decision]` pair the engine always wrote. No keepAlive, no change to `read`.

## Task Commits

1. **Task 1: SD1..SD5** - `db098fc0` (test)
2. **Task 2: HL1..HL7** - `371fae36` (test)
3. **Task 3: SeedSlot shape and engine seam migration** - `8a6c2cb5` (refactor)

## SD cases on the base

Each fails in `getByText(...)` with the rendered body being `pending`:

| Case | Setup | Failure on the base |
|---|---|---|
| SD1 | `subject={undefined}`, seeded deny, gate mounted after a 20 ms turn | `Unable to find an element with the text: denied` ... `pending` |
| SD2 | resolver `Effect.never`, subject known, seeded allow, late gate | `Unable to find an element with the text: allowed` ... `pending` |
| SD3 | `subject={undefined}`, Activity hidden then shown, provider outside | `Unable to find ... denied` ... `pending` |
| SD4 | `subject={undefined}`, gate unmounted then mounted after 20 ms | `Unable to find ... denied` ... `pending` |
| SD5 | resolver answers `suspended` after 1 ms, seeded allow, late gate, 200 ms wait | `Unable to find ... denied` ... `pending` |

## HL results on the base

| Case | Base | Why |
|---|---|---|
| HL1 a read after a macrotask | RED (`expected undefined to be 'SeededDeny'`) | the registry removed the unread seed node |
| HL2 an hour of fake time | RED (`expected undefined to be 'SeededDeny'`) | the fake-timer removal task runs and removes it |
| HL3 a registry never given a seed reads none | green | traps a seed held by the atom set alone |
| HL4 a spent seed is not read again | green | traps a naive keepAlive seed returning after the client answered |
| HL5 50 unhydrated questions leave the node count of one | green | traps a node pinned per question asked |
| HL6 eviction forgets a cold seed | green | traps a seed that outlives eviction |
| HL7 two registries, two seeds | green | traps a registry-independent store |

## Migrated seam sites (HydrationEngine.test.ts)

No assertion line changed; no case added or removed.

- `announces a disagreement once per registry`: two `registry.set(q.seed, allow)` became `AtomRegistry.make({ initialValues: [q.seed.hold(allow)] })` per registry.
- `reads the seed while the computed answer is still Initial`: the `registry.set(q.seed, allow)` after mount became the same `initialValues` form (the seed is now present at construction, before the mount).
- `recordingLookup`: returns `{ hold: (decision) => [atom, decision] }` over the recorded atom.
- The two refused-payload lookups and the throwing-reporter lookup: `SeedSlot` doubles `{ hold: (decision) => [Atom.make(undefined), decision] }`.

## React failing set after Task 3

`pnpm vitest run --project react`: 495 tests, 485 pass, 10 fail, exactly SUBJ1, SUBJ2, SUBJ3, SD1..SD5, HL1, HL2. `pnpm typecheck` exit 0; `pnpm lint` exit 0 (`house-style: 487 file(s) clean`, `DECISION_READ_BUDGET` unchanged).

## Deviations from Plan

None - plan executed exactly as written, with two measured setup details the plan left open:

- HL6 builds its registry after `settle()` (hydrate, settle, then the registry). Built before, the registry's own removal task ran during `settle()` and the kept question read `undefined` on the base; built after, the case is green on the base as the plan requires.
- SD2 and SD5 override the resolver with `Layer.merge(EvaluationServicesNone, Layer.succeed(AttributeResolver, ...))` plus `EvaluationIdLive`, which typechecks and takes effect.

## Known Stubs

None.

## Threat Flags

None. T-36-07 is mitigated in this plan by HL3 and HL7 (green on the base); T-36-08 by Task 3's verify (every base assertion line survives, the RED set is exactly as expected, the four untouched files are unchanged).

## Self-Check: PASSED

- Files exist: QadiProvider.seed.test.tsx, Hydration.lifetime.test.ts, HydrationEngine.ts, HydrationEngine.test.ts.
- Commits present: db098fc0, 371fae36, 8a6c2cb5.
- Task 3 verify (static and the react failing set) passed; QadiAtoms.ts, QuestionBook.ts, QadiProvider.tsx and index.ts unchanged.
