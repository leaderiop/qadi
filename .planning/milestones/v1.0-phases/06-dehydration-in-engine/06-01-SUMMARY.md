---
phase: 06-dehydration-in-engine
plan: 01
subsystem: react-hydration
tags: [hydration, dehydration, effect-v4, react, ssr, refactor]

requires:
  - phase: 05
    provides: "ARCH wave 5 baseline; HydrationEngine.ts with hydrateWith, HydrationCounts.ts and DeveloperSignals.ts as the counting and console modules"
provides:
  - "dehydrateWith in HydrationEngine.ts: the dehydrate direction's owner, beside hydrateWith"
  - "DehydrateOptions declared in the engine, re-exported by name from Hydration.ts"
  - "dehydrateDecisions as a one-line delegation to dehydrateWith"
  - "dehydrateEntry and dehydratedPayload module-private to the engine"
  - "Byte-for-byte golden pins and tstyche pins of dehydrateDecisions' output and signature"
  - "Round-trip test through dehydrateWith then hydrateWith"
affects: [06-dehydration-in-engine records plan (ADR-QD-078 amendment, CCR-QD-390, spec rows, changeset)]

actuals:
  tokens: 6700
  tasks: 2
  commits: 3
plan_head_before: 08f305167a247f641e864d954c325fadfc20cc27
plan_head_after: a9972b51c790f8a5593855f61f9c95e644e2275f

tech-stack:
  added: []
  patterns:
    - "Pin first, refactor second: golden bytes and type pins committed green against unmodified source before the move (D-04)"
    - "Make a documented precondition structural by making the builders module-private (D-02)"

key-files:
  created: []
  modified:
    - packages/react/src/HydrationEngine.ts
    - packages/react/src/Hydration.ts
    - packages/react/src/QadiAtoms.ts
    - packages/react/test/HydrationPayload.test.ts
    - packages/react/test/Hydration.tst.ts
    - packages/react/test/HydrationEngine.test.ts

key-decisions:
  - "dehydrateWith resolves its dropped-entries reporter inside the drop branch (droppedEntriesReporter from DeveloperSignals.ts), exactly where dehydrateDecisions resolved it, rather than at the top as hydrateWith does. Observably identical, since the reporter only reads NODE_ENV, and it keeps the moved body a verbatim move."
  - "Option field names stay includeTrace and onDropped so DehydrateOptions' public type is unchanged."
  - "D-09 grep came back clean, so removing dehydrateEntry, dehydratedPayload and the mismatch-reporter wrapper is not breaking and needs no changeset entry beyond the patch the phase already plans."

patterns-established:
  - "Engine owns both directions of a payload; the public file holds names, doc comments and one-line delegations"

requirements-completed: [HYD-01, HYD-02, HYD-03, HYD-04, XC-03, XC-04, XC-05]

coverage:
  - id: D1
    description: "dehydrateDecisions emits the same JSON bytes as before, in the withheld and the disclosed mode"
    requirement: "HYD-02"
    verification:
      - kind: unit
        ref: "packages/react/test/HydrationPayload.test.ts#dehydrateDecisions' output is pinned byte for byte (ARCH-51)"
        status: pass
    human_judgment: false
  - id: D2
    description: "dehydrateDecisions' parameters, return type and DehydrateOptions are type-identical to before"
    requirement: "XC-03"
    verification:
      - kind: unit
        ref: "pnpm tstyche packages/react/test/Hydration.tst.ts#dehydrateDecisions' signature and options are pinned (ARCH-51)"
        status: pass
    human_judgment: false
  - id: D3
    description: "dehydrateWith filters to the first subject, counts ForeignSubject once, reports exactly the foreign entries once, and the JSON round trip through hydrateWith seeds exactly the kept entries"
    requirement: "HYD-01"
    verification:
      - kind: unit
        ref: "packages/react/test/HydrationEngine.test.ts#dehydrateWith and hydrateWith: both directions through the engine (ARCH-51)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Hydration.ts holds no filter, count or reporter call; the payload builders are private; the identity wrapper is gone"
    requirement: "HYD-03"
    verification:
      - kind: other
        ref: "grep -cE 'countDropped|droppedEntriesReporter|\\.filter\\(' packages/react/src/Hydration.ts => 0; git grep -l resolveMismatchReporter -- packages => empty; dehydrateEntry|dehydratedPayload only in HydrationEngine.ts"
        status: pass
      - kind: other
        ref: "pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-11-08
status: complete
---

# Phase 6 Plan 1: dehydrateWith in the engine Summary

**HydrationEngine.ts now owns both directions of the seed payload: `dehydrateWith` takes over the subject filter, the ForeignSubject count, the dropped-entry report, `includeTrace` and the versioned envelope, `dehydrateDecisions` is a one-line delegation, and the payload builders are module-private, with output and signature pinned before the move.**

## Performance

- **Duration:** about 6 min
- **Started:** 2026-11-08T05:48Z (approximate; start time was not captured at the first command)
- **Completed:** 2026-11-08T05:54Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- `dehydrateDecisions`' wire bytes (withheld and disclosed modes) and its type are pinned by tests that went green on unmodified source first, so the refactor is checked against today's behavior (D-04).
- `dehydrateWith(entries, options)` sits beside `hydrateWith` in the engine, with the EC-06 note, the "Said, not merely done" note and the "Counted here" note moved verbatim. A round trip (mixed subjects, dehydrate, JSON, hydrate) proves both directions through the engine's own interface (D-07).
- "Already filtered to one subject" is now structural: `dehydrateEntry` and `dehydratedPayload` are not exported, so no second caller can build a payload that skips the filter, count or report (D-02).
- The identity wrapper over `hydrationMismatchReporter` is deleted; `QadiAtoms.ts` calls the reporter from `DeveloperSignals.ts` directly, once per atom set (D-03).
- `HydrationCounts.ts` and `DeveloperSignals.ts` were not edited (D-05, D-06). Public surface unchanged: `pnpm spec:api` green, `DehydrateOptions` still exported by name from `Hydration.ts`.

## Task Commits

1. **Task 1, Step A: pin dehydrateDecisions output and signature** - `ebebe2d` (test). Touches only `packages/react/test/HydrationPayload.test.ts` and `packages/react/test/Hydration.tst.ts`; nothing under `packages/react/src`.
2. **Task 1, Steps B and C: dehydrateWith owns the dehydrate direction** - `e124896` (refactor). The round-trip test was written red first (`dehydrateWith is not a function`), then the implementation turned it green.
3. **Task 2: private payload builders, no identity wrapper** - `a9972b5` (refactor)

**Plan metadata:** committed separately as `docs(06-01): complete dehydrate-in-engine plan`.

## Files Created/Modified

- `packages/react/src/HydrationEngine.ts` - adds `dehydrateWith` and `DehydrateOptions`; `dehydrateEntry`/`dehydratedPayload` made private; wrapper deleted; header names both directions
- `packages/react/src/Hydration.ts` - `dehydrateDecisions` delegates to `dehydrateWith`; `DehydrateOptions` re-exported by name; header updated
- `packages/react/src/QadiAtoms.ts` - calls `hydrationMismatchReporter` directly with a one-line rationale comment
- `packages/react/test/HydrationPayload.test.ts` - byte-for-byte golden pins
- `packages/react/test/Hydration.tst.ts` - type-level pin of signature and options
- `packages/react/test/HydrationEngine.test.ts` - round trip through `dehydrateWith` and `hydrateWith`

## Decisions Made

- **Where `dehydrateWith` resolves its reporter:** inside the drop branch, via `droppedEntriesReporter` imported from `./DeveloperSignals.ts`, exactly where `dehydrateDecisions` did before. Resolving at the top (as `hydrateWith` does) is observably identical because the resolver only reads `NODE_ENV`; keeping it in the branch makes the moved body a verbatim move.
- **Option names unchanged** (`includeTrace`, `onDropped`), so `DehydrateOptions` keeps its public type.
- **D-09 grep output (Task 2, step 1)**, run before removing anything, `git grep -nE 'dehydrateEntry|dehydratedPayload|resolveMismatchReporter' -- packages apps examples features spec/overview.md`:

  ```
  packages/react/src/HydrationEngine.ts:235:export const dehydrateEntry = ...
  packages/react/src/HydrationEngine.ts:242:export const dehydratedPayload = (
  packages/react/src/HydrationEngine.ts:292:  return dehydratedPayload(
  packages/react/src/HydrationEngine.ts:294:    kept.map((entry) => dehydrateEntry(entry, includeTrace)))
  packages/react/src/HydrationEngine.ts:523:export const resolveMismatchReporter = (
  packages/react/src/QadiAtoms.ts:39:  resolveMismatchReporter,
  packages/react/src/QadiAtoms.ts:270:  const report = resolveMismatchReporter(options?.onHydrationMismatch);
  ```

  Only the engine and `QadiAtoms.ts` hit, nothing in `spec/overview.md`, a barrel, `@qadi/devtools`, `apps`, `examples` or `features`. The removal is therefore not breaking.

## Deviations from Plan

None - plan executed exactly as written.

Two small notes that are not deviations. The plan's baseline said the react project had 20 files and 344 tests at HEAD; it now runs 23 files and 366 tests (the plan's additions account for the new tests; the file count differs from the plan's stated baseline). The golden literals were written as template literals to keep each line readable; they contain no interpolation and are the bytes vitest printed from unmodified source.

## Issues Encountered

None. The pre-existing oxlint warnings (unused `_` parameters, `check-house-style.mjs:774`) are unrelated to this plan and were left alone.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path, file access or trust-boundary schema. `HydrationEngine.ts` stays out of the barrel and its exports narrowed (T-06-05).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Code for ARCH-51 is complete. Remaining for the phase per CONTEXT D-08, outside this plan's files: the ADR-QD-078 amendment (or ADR-QD-113), CCR-QD-390, the `spec/README.md` line, `spec/behaviors/19-hydration.md` rows, traceability, and `.changeset/dehydrate-in-engine.md` (patch for `@qadi/react`). `pnpm example` (the Next.js newsroom SSR gate) and `pnpm check:pr` were not run as part of this plan and are for the phase verification.

## Self-Check: PASSED

- Files: `packages/react/src/HydrationEngine.ts`, `Hydration.ts`, `QadiAtoms.ts`, and the three test files exist.
- Commits `ebebe2d`, `e124896`, `a9972b5` are ancestors of HEAD.
- `git diff ebebe2d HEAD -- packages/react/test/HydrationPayload.test.ts packages/react/test/Hydration.tst.ts` is empty (pins unchanged by the refactor).
- No (06-01) commit touches `HydrationCounts.ts` or `DeveloperSignals.ts`.
- `pnpm vitest run --project react` (23 files, 366 tests), `pnpm tstyche packages/react/test/Hydration.tst.ts`, `pnpm typecheck`, `pnpm lint`, `pnpm circular` and `pnpm spec:api` all pass.

---
*Phase: 06-dehydration-in-engine*
*Completed: 2026-11-08*
