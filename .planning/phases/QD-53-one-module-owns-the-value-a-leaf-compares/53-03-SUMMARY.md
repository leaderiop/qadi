---
phase: QD-53-one-module-owns-the-value-a-leaf-compares
plan: 03
subsystem: core
tags: [operand, own-property, prototype-names, getByPath, tracer]
phase_base: 03bb6545a46e508e8377360469dd1cbcea958c9a
plan_head_before: 03bf8f0bd1e68a1e6ba211b81f4d535fdd9aeafb
plan_head_after: bfc64cec87b07b637d29fb775171d4b1d6c18571
requires:
  - phase: QD-53
    provides: "53-02 RED tests R1..R4 and the GREEN characterisation set"
provides:
  - "packages/core/src/Operand.ts: package-private ownValue, isOwnKey, getByPath"
  - "evaluatePredicate, attributeResolverFromRecord and customPredicateFromRecord read through it; every RED test from 53-02 is GREEN"
affects: [53-04, 53-05, 53-06, 53-07]
actuals:
  tokens: 4500
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: ["module-local binding of an imported hot read (getByPathLocal, ownValueLocal)", "Matcher.ts re-exports Operand.ts's getByPath in the `export { … } from` form gate 13 parses"]
key-files:
  created:
    - packages/core/src/Operand.ts
    - packages/core/test/Operand.test.ts
  modified:
    - packages/core/src/Matcher.ts
    - packages/core/test/Matcher.test.ts
    - packages/core/src/Predicate.ts
    - packages/core/src/AttributeResolver.ts
    - packages/core/src/CustomPredicate.ts
key-decisions:
  - "isOwnKey is `<A extends object>(data: A, key: string): key is keyof A & string`; getByPath's segment test is `!isOwnKey(current, part)`, a same-module call"
  - "Matcher.ts and Predicate.ts call module-local bindings of the imported reads, the getter cost ADR-QD-091 measured"
requirements-completed: [OPND-01, OPND-02, OPND-03, OPND-04]
coverage:
  - id: D1
    description: "A prototype-named column now denies in the reference interpreter and agrees with evaluate (R1, R2 GREEN, files unedited)"
    requirement: OPND-04
    verification:
      - kind: unit
        ref: "packages/core/test/Predicate.test.ts#a prototype-named column denies on both sides"
        status: pass
      - kind: unit
        ref: "packages/core/test/Predicate.test.ts#PROPERTY: the two interpreters agree on prototype names, row by row"
        status: pass
    human_judgment: false
  - id: D2
    description: "Operand.ts exists, import-free, three exports, outside the barrel; getByPath public and unchanged through Matcher.ts"
    requirement: OPND-02
    verification:
      - kind: unit
        ref: "packages/core/test/Operand.test.ts#Matcher.ts re-exports Operand.ts's getByPath"
        status: pass
      - kind: command
        ref: "pnpm circular && pnpm spec:api"
        status: pass
    human_judgment: false
  - id: D3
    description: "The two table fixtures answer undefined / fail as unregistered for a name they do not own (R3, R4 GREEN, files unedited)"
    requirement: OPND-01
    verification:
      - kind: unit
        ref: "packages/core/test/Layers.test.ts#attributeResolverFromRecord answers undefined for a name the table does not own"
        status: pass
      - kind: unit
        ref: "packages/core/test/CustomPredicate.test.ts#fails as unregistered, never dies, on a name the table does not own"
        status: pass
    human_judgment: false
duration: 5min
completed: 2026-11-18
status: complete
---

# Phase 53 Plan 03: Operand.ts and the first three readers Summary

**One package-private module, `Operand.ts` (`ownValue`, `isOwnKey`, `getByPath`), now owns the own-property read; `evaluatePredicate`, `attributeResolverFromRecord` and `customPredicateFromRecord` read through it, which turns all four RED tests from 53-02 GREEN with their files unedited.**

## Operand RED

`Operand.test.ts` was written first and run before `Operand.ts` existed:

```
 FAIL  |core| test/Operand.test.ts [ packages/core/test/Operand.test.ts ]
Error: Cannot find module '../src/Operand.ts' imported from /Users/mohammadalmechkor/Projects/Perso/qadi/packages/core/test/Operand.test.ts
 Test Files  1 failed (1)
      Tests  no tests
```

## RED to GREEN transitions

| Test | Became GREEN in | Commit |
|------|-----------------|--------|
| R1 "a prototype-named column denies on both sides" (`Predicate.test.ts`) | Task 1 | `1573cdbf` |
| R2 "PROPERTY: the two interpreters agree on prototype names, row by row" (`Predicate.test.ts`) | Task 1 | `1573cdbf` |
| R3 "attributeResolverFromRecord answers undefined for a name the table does not own" (`Layers.test.ts`) | Task 2 | `abf97eb6` |
| R4 "fails as unregistered, never dies, on a name the table does not own" (`CustomPredicate.test.ts`) | Task 3 | `bfc64cec` |

`git diff --name-only 837ffb6b HEAD` over `Predicate.test.ts`, `Layers.test.ts`, `CustomPredicate.test.ts` is empty: none of the 53-02 test files was edited.

## Task Commits

1. **Task 1 (tracer): Operand.ts, the re-export, evaluatePredicate** - `1573cdbf` (fix)
2. **Task 2: attributeResolverFromRecord through ownValue** - `abf97eb6` (fix)
3. **Task 3: customPredicateFromRecord through ownValue** - `bfc64cec` (fix)

## What changed

- `Operand.ts` (77 lines, no import): the D-08 header, private `isObject`, `ownValue`, `isOwnKey`, and `getByPath` (the Matcher.ts `indexOf` body with its segment test now `!isOwnKey(current, part)`).
- `Matcher.ts`: `getByPath` and its doc deleted (the "`readAttribute` and `FieldPath.ts` guard the same way" paragraph goes with no pointer); `import { getByPath }` and `export { getByPath } from "./Operand.ts"` beside the `Verdict` re-export; `getByPathLocal` in the Local block, read by `resolveRef`'s two path arms. `resolveRef` and `judgeMatcher` stay switches.
- `Matcher.test.ts`: the six-test `describe("getByPath")` moved to `Operand.test.ts` (calling the imported function); the describes at the old `:401` and `:414` stay and pass through the re-export.
- `Predicate.ts`: imports `getByPath, ownValue` from `./Operand.ts`; `ownValueLocal`; `Compare` and `MemberOf` read `ownValueLocal(row, p.column)`.
- `AttributeResolver.ts`, `CustomPredicate.ts`: `ownValue(table, attribute)` / `ownValue(table, name)`; one doc sentence each.

## Verification

- `vitest --project core test/Operand.test.ts test/Predicate.test.ts test/Matcher.test.ts`: 3 files, 248 tests pass. Layers/PortDefault/Ports/EvaluationEnvironment: 96 pass. Whole core suite: 79 files, 2542 tests pass; `--project testing`: 46 pass.
- Task 1 structural check printed "the tracer slice is in place"; Task 2 and 3 static checks passed.
- `pnpm typecheck`, `pnpm circular` ("No circular dependency found!"), `pnpm spec:api` (935 exports, 9 packages) and `node scripts/check-house-style.mjs` ("544 file(s) clean (3 declared switch(es))") all exit 0.
- `git diff --name-only <phase_base> HEAD -- 'packages/*/src'` lists the five source files above; no manifest, lockfile, barrel or entry-point change.

## Deviations from Plan

None - plan executed exactly as written. Two cosmetic re-wraps of the "Module-local bindings" comments in `Matcher.ts` and `Predicate.ts` keep lines near ninety columns.

## Known Stubs

None.

## Threat Flags

None. T-53-08, T-53-09, T-53-10 mitigated (R1..R4 GREEN); T-53-11: `index.ts` does not name Operand and the `exports` map is unchanged.

## Next Phase Readiness

Ready for 53-04 (`Matcher.ts` FieldMatch through `ownValueLocal`, `Walk.ts` `HasResourceAttribute`, `PortAccess.ts` `readAttribute`). `Matcher.ts` already imports `getByPath` from `./Operand.ts`; 53-04 widens that import to `ownValue` and adds `ownValueLocal`.

## Self-Check: PASSED

- `Operand.ts`, `Operand.test.ts` exist; `1573cdbf`, `abf97eb6`, `bfc64cec` are ancestors of HEAD, each ends with the Co-Authored-By trailer.
- `commits:` measured from the ledger: `git rev-list --count 03bf8f0b..HEAD` = 3 before this SUMMARY.
