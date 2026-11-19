---
phase: QD-53-one-module-owns-the-value-a-leaf-compares
plan: 05
subsystem: core
tags: [operand, own-property, projection, FieldPath, Decision, OPND-03]
plan_head_before: 6c8175a8e09d9a99e955552714b106c1ea4552e8
plan_head_after: 3d0f1d392639281065d7a2bf86c37d21d4a233df
requires:
  - phase: QD-53
    provides: "53-03/53-04 Operand.ts and the first six readers moved"
provides:
  - "FieldPath.ts projectAt and Decision.ts projection read through Operand.ts; OPND-03 checked across the eight files"
affects: [53-06, 53-07, 53-08]
actuals:
  tokens: 1200
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: ["projectAt asks isOwnKey then reads ownValue, keeping an own undefined", "Decision.ts imports isOwnKey and narrows field to keyof A & string"]
key-files:
  created: []
  modified:
    - packages/core/src/FieldPath.ts
    - packages/core/src/Decision.ts
key-decisions:
  - "isFieldOf deleted: its crossing text already lives on isOwnKey, and the call line reads exactly `if (isOwnKey(data, field)) {` for 53-mutation.mjs's RENAMED map"
requirements-completed: [OPND-03, OPND-04]
coverage:
  - id: D1
    description: "Every reader a decoded key reaches (eight files) goes through Operand.ts; behaviour unchanged, no test edited"
    requirement: OPND-03
    verification:
      - kind: command
        ref: "pnpm exec vitest run --project core (79 files, 2542 tests)"
        status: pass
      - kind: command
        ref: "the eight-file OPND-03 node check (output below)"
        status: pass
    human_judgment: false
  - id: D2
    description: "predicate-sql and predicate-prisma suites pass unedited with every reader moved"
    requirement: OPND-04
    verification:
      - kind: command
        ref: "pnpm exec vitest run --project predicate-sql --project predicate-prisma (8 files, 198 tests)"
        status: pass
    human_judgment: false
duration: 6min
completed: 2026-11-18
status: complete
---

# Phase 53 Plan 05: The last two readers move onto Operand.ts Summary

**`projectAt` (FieldPath.ts) and the field projection (Decision.ts) now ask `isOwnKey`/`ownValue` in Operand.ts, `isFieldOf` is deleted, and the eight-file OPND-03 check passes.**

## Task Commits

1. **Task 1: projectAt reads through Operand.ts** - `cefe9673` (refactor); FieldPath/Qadi/Decision/Operand tests: 152 pass. Module doc reworded so `getByPath` (`Operand.ts`) is named as the other dot-path reader, without "mirrors".
2. **Task 2: the projection asks Operand.ts whether a field is the record's own** - `3d0f1d39` (refactor); `isFieldOf` and its doc removed, line reads `if (isOwnKey(data, field)) {`.

Each commit carries one src file and ends with the Co-Authored-By trailer. The D-09 write guards (`Object.create(null)`, `Object.defineProperty`) are untouched.

## Verification

- `pnpm exec vitest run --project core`: 79 files, 2542 tests pass.
- `pnpm exec vitest run --project predicate-sql --project predicate-prisma`: 8 files, 198 tests pass, unedited (D-13).
- `pnpm typecheck`, `pnpm lint` (house-style: 544 files clean, 3 declared switches) and `pnpm circular` exit 0.
- `git diff 03bb6545 HEAD -- scripts AGENTS.md` is empty (no gate or budget moved, D-16).

## OPND-03

```
OPND-03: every reader reads through Operand.ts
```

(Walk, PortAccess, Matcher, FieldPath, Decision, Predicate, AttributeResolver, CustomPredicate: no code line calls `Object.hasOwn`, no bare decoded-key read, no mirroring comment, each imports `./Operand.ts`; Operand.ts imports nothing and exports exactly `getByPath, isOwnKey, ownValue`; `index.ts` names no Operand.)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. T-53-14 (write guards kept), T-53-15 (`isOwnKey` decides inclusion in both projections) and T-53-16 (eight-file check passes) mitigated.

## Next Phase Readiness

Ready for 53-06 (mutation after-run). OPND-03 and OPND-04 are shared with later plans; completion is governed by `requirements.ready-ids`.

## Self-Check: PASSED

- `cefe9673` and `3d0f1d39` are ancestors of HEAD; `commits:` measured from the ledger (`git rev-list --count 6c8175a8..HEAD` = 2).
