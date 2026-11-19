---
phase: QD-53-one-module-owns-the-value-a-leaf-compares
plan: 04
subsystem: core
tags: [operand, own-property, FieldMatch, HasResourceAttribute, readAttribute]
plan_head_before: f040b3daf7e2af5ab44e9dac740cb9a837979a24
plan_head_after: 2bdf1c8456ae926ebd60da8f3710faaaf3ea462c
requires:
  - phase: QD-53
    provides: "53-03 Operand.ts (ownValue, isOwnKey, getByPath) and the Matcher.ts Operand import"
provides:
  - "Matcher.ts FieldMatch, Walk.ts HasResourceAttribute and PortAccess.ts readAttribute read through Operand.ts"
affects: [53-05, 53-06, 53-07]
actuals:
  tokens: 1500
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: ["Matcher.ts binds ownValueLocal beside getByPathLocal", "readAttribute asks isOwnKey then reads ownValue, so an own undefined stays the subject's answer"]
key-files:
  created: []
  modified:
    - packages/core/src/Matcher.ts
    - packages/core/src/Walk.ts
    - packages/core/src/PortAccess.ts
key-decisions:
  - "readAttribute does two own-property checks per subject read (isOwnKey, ownValue): keeps own undefined distinct from no key with no bare read outside Operand.ts and no allocation"
requirements-completed: [OPND-03]
coverage:
  - id: D1
    description: "FieldMatch, HasResourceAttribute and readAttribute read a decoded key only through Operand.ts; behaviour unchanged, tests unedited"
    requirement: OPND-03
    verification:
      - kind: command
        ref: "pnpm exec vitest run --project core (79 files, 2542 tests)"
        status: pass
      - kind: unit
        ref: "packages/core/test/PortAccess.test.ts#an own key, even one holding undefined, never reaches the resolver"
        status: pass
    human_judgment: false
duration: 3min
completed: 2026-11-18
status: complete
---

# Phase 53 Plan 04: The three evaluation-path readers move onto Operand.ts Summary

**FieldMatch, `HasResourceAttribute` and `readAttribute` now read through `Operand.ts` (`ownValueLocal`, `ownValue`, `isOwnKey`), and the comments that pointed at each other are gone; behaviour is unchanged and no test was edited.**

## Task Commits

1. **Task 1: Matcher.ts FieldMatch through ownValueLocal** - `ccda163a` (refactor); `Matcher/Operand/Predicate/LeafMatrix` tests: 253 pass
2. **Task 2: Walk.ts HasResourceAttribute through ownValue** - `aff20dc6` (refactor); `Evaluate/Predicate/Explanation/LeafMatrix/SubjectSet` tests: 432 pass
3. **Task 3: PortAccess.ts readAttribute through isOwnKey and ownValue** - `2bdf1c84` (refactor); whole core suite 79 files, 2542 tests pass

Each commit carries one src file and ends with the Co-Authored-By trailer.

## Verification

- Each task's static check passed (no code line names `Object.hasOwn`, no bare read, the mirroring comments gone, the `absenceOf` note kept, the three switches and three `fnUntraced` composites intact).
- `pnpm typecheck` exits 0; `node scripts/check-house-style.mjs`: "544 file(s) clean (3 declared switch(es))".
- The 53-02 characterisation ("an own key, even one holding undefined, never reaches the resolver") passes unedited.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. T-53-12 and T-53-13 mitigated: every read goes through Operand.ts and the pinned inherited-name and own-undefined tests pass.

## Next Phase Readiness

Ready for 53-05 (`FieldPath.ts` `projectAt` and `Decision.ts` through Operand.ts, plus the OPND-03 reader check). OPND-03 is shared with 53-05, so it stays Pending until `requirements.ready-ids` says otherwise.

## Self-Check: PASSED

- `ccda163a`, `aff20dc6`, `2bdf1c84` are ancestors of HEAD; `commits:` measured from the ledger (`git rev-list --count f040b3da..HEAD` = 3).
