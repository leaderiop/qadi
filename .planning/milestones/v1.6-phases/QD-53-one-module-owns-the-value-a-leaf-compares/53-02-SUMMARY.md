---
phase: QD-53-one-module-owns-the-value-a-leaf-compares
plan: 02
subsystem: testing
tags: [characterisation, red-tests, prototype-names, own-property, fast-check]
phase_base: 03bb6545a46e508e8377360469dd1cbcea958c9a
plan_head_before: 310c737049a2a5231cf10e4f8db1f0b9540f52b9
plan_head_after: 837ffb6be865db5da80300655f376cedf66010ef
requires:
  - phase: QD-53
    provides: "53-01 phase_base and the green base the characterisation tests pin"
provides:
  - "GREEN characterisation of the operand reads the move must keep (own undefined, project, ref paths)"
  - "Four RED tests stating the prototype-name defect in Predicate, the attribute fixture and the custom-predicate fixture"
affects: [53-03, 53-04, 53-05, 53-06]
actuals:
  tokens: 21000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: [JSON.parse builds own __proto__ fixtures, enumerated leaves with a seeded tree sample, RED checker over a JSON reporter]
key-files:
  created: []
  modified:
    - packages/core/test/PortAccess.test.ts
    - packages/core/test/FieldPath.test.ts
    - packages/core/test/Evaluate.test.ts
    - packages/core/test/Predicate.test.ts
    - packages/core/test/Layers.test.ts
    - packages/core/test/CustomPredicate.test.ts
key-decisions:
  - "R2 enumerates every prototype-named leaf and samples only the tree over them, so no name depends on a seed"
  - "protoLayer omits DecisionHistory: the describe-level `acted` shadows the module one and no enumerated leaf asks history"
requirements-completed: [OPND-01, OPND-04, WX-06]
coverage:
  - id: D1
    description: "GREEN characterisation on the base: an own attribute (even undefined) skips the resolver, a missing key and an inherited name each reach it once, project keeps own undefined and skips an inherited name, ref paths read own keys only"
    requirement: WX-06
    verification:
      - kind: unit
        ref: "packages/core/test/PortAccess.test.ts#readAttribute consults the resolver only for a key the subject does not own"
        status: pass
      - kind: unit
        ref: "packages/core/test/FieldPath.test.ts#keeps an own key holding undefined and skips an inherited name"
        status: pass
      - kind: unit
        ref: "packages/core/test/Evaluate.test.ts#ResourceRef and SubjectRef paths read own keys only"
        status: pass
    human_judgment: false
  - id: D2
    description: "Four RED tests committed before any src change: R1 prototype-named column, R2 agreement property over the five names, R3 attributeResolverFromRecord, R4 customPredicateFromRecord"
    requirement: OPND-04
    verification:
      - kind: unit
        ref: "RED checker over packages/core/test/{Predicate,Layers,CustomPredicate}.test.ts: the four fail, 120 pass (expected RED)"
        status: pass
    human_judgment: false
duration: 6min
completed: 2026-11-18
status: complete
---

# Phase 53 Plan 02: Characterisation and RED tests Summary

**GREEN tests pin the own-key behaviour the operand move must keep, and four RED tests (reference-interpreter column, a 74-leaf agreement property over the five prototype names, and the two table fixtures) state the review's defect before any source change.**

## Performance

- **Duration:** about 6 min (2026-11-18T04:53:21Z to 04:58:53Z)
- **Tasks:** 2
- **Files modified:** 6 test files, 298 lines added, none removed; no `packages/*/src` file touched

## Characterisation

Commit `d91fda67`, `test(53-02): characterise the operand reads on the base`. All pass on the base
(`pnpm exec vitest run --project core test/PortAccess.test.ts test/FieldPath.test.ts test/Evaluate.test.ts`: 3 files, 334 tests):

- `PortAccess.test.ts`, describe "readAttribute consults the resolver only for a key the subject does not own": an own `clearance: undefined` and an own JSON.parse `constructor` give 0 resolver calls (`scriptedPort` counts them); a missing `clearance` and an inherited `constructor` each give one call `[[subject.id, name]]` and "resolved".
- `FieldPath.test.ts`: `project({a: undefined, b: 1}, ["a"])` keeps key `a`; `project({b: 1}, ["constructor", "b"])` keeps only `b`.
- `Evaluate.test.ts`, describe "a ref path that names an inherited member reads as absent": the four ref cases give false, false, true, false.

## RED

Commit `837ffb6b`, `test(53-02): RED — a prototype-named key reads as absent in every interpreter` (three files, additions only).
The plan's RED checker output:

```
RED on the base: the four fail, 120 pass
```

Each fails for the defect, not a suite error:

| Test | Base failure |
|------|--------------|
| R1 "a prototype-named column denies on both sides" (`Predicate.test.ts`) | `expected true to be false` on `evaluatePredicate` over `{id: "r1"}` |
| R2 "PROPERTY: the two interpreters agree on prototype names, row by row" (`Predicate.test.ts`) | see below |
| R3 "attributeResolverFromRecord answers undefined for a name the table does not own" (`Layers.test.ts`) | `constructor: expected [Function Object] to equal undefined` |
| R4 "fails as unregistered, never dies, on a name the table does not own" (`CustomPredicate.test.ts`) | `Fiber.runLoop: Not a valid effect: [object Object]` (the `constructor` crash the planning probe predicted) |

R2's first counterexample:

```
disagreement on {"policy":{"_tag":"HasResourceAttribute","attribute":"constructor","matcher":{"_tag":"Neq","ref":{"_tag":"LiteralRef","value":"x"}}},"row":{"id":"r1"},"predicate":{"_tag":"Compare","column":"constructor","op":"Neq","value":"x"}}: expected true to equal false
```

R2's non-vacuity asserts passed on the base: all 74 `protoLeaves` translate under both environments, all 17 `refusedLeaves` are refused with `PolicyNotTranslatable` under both, and each of the five names reaches a `"column":"<name>"` in at least one translated leaf. No shape was moved between the two sets and no name was dropped.

## Task Commits

1. **Task 1: GREEN characterisation** - `d91fda67` (test)
2. **Task 2: four RED tests** - `837ffb6b` (test)

## Decisions Made

- R2 enumerates every leaf (names x five column matchers plus two subject-attribute shapes, and nine paths x `eq`/`neq` over `subject(path)`) and uses the seeded sample (150 runs, seed 53) only for `allOf`/`anyOf`/`not` combinations over them, so coverage of each name never depends on the seed.
- `protoLayer` is `testLayer(protoSubject, { AttributeResolver: resolving })` with no `DecisionHistory` override: the describe-level `acted` arbitrary shadows the module-level layer, and no enumerated leaf asks history.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] protoLayer built without `DecisionHistory: acted`**
- **Found during:** Task 2 (typecheck)
- **Issue:** the plan's `protoLayer = testLayer(protoSubject, { AttributeResolver: resolving, DecisionHistory: acted })` cannot name the module-level `acted` layer from inside `describe("INV-QD-018 …")`, where an existing `const acted` (a fast-check arbitrary) shadows it (TS2739, TS2448).
- **Fix:** dropped the `DecisionHistory` override from `protoLayer`; no enumerated leaf contains a `HasActed`, and editing the existing shadowing line is prohibited.
- **Files modified:** `packages/core/test/Predicate.test.ts`
- **Verification:** `tsc -p tsconfig.test.json` clean; RED checker passes.
- **Committed in:** `837ffb6b`

**2. [Rule 3 - Blocking] `exits` typed `ReadonlyArray<Exit.Exit<unknown, unknown>>` in R4**
- **Found during:** Task 2 (typecheck)
- **Issue:** the two exits (`CustomPredicate.evaluate` and `evaluate`) have different success and error types, so the array literal's union broke `Cause.hasDies`/`Cause.squash` (TS2379).
- **Fix:** annotated the array as `Exit.Exit<unknown, unknown>`; the instance check on `CustomPredicateError` still narrows the error.
- **Files modified:** `packages/core/test/CustomPredicate.test.ts`
- **Committed in:** `837ffb6b`

---

**Total deviations:** 2 auto-fixed (both Rule 3, test typing only)
**Impact on plan:** none on scope; both are typing fixes inside the planned tests.

## Issues Encountered

None. `reports/53-red.json` (the checker's output) is gitignored. `pnpm lint` reports `house-style: 542 file(s) clean`; the oxlint warnings listed are in `.codex/hooks/` and are not touched by this plan.

## Known Stubs

None.

## Threat Flags

None. Only test files changed; no source, manifest or lockfile.

## Next Phase Readiness

Ready for 53-03 (tracer: `Operand.ts`, `getByPath` and `ownValueLocal`, and the two table builders reading through `ownValue`). R1 and R2 turn GREEN when `Predicate.ts` reads the row cell through `ownValueLocal`; R3 and R4 when the two builders read through `ownValue`. The four RED tests stay RED until then, by design, so a `pnpm check:pr` run now fails on them.

## Self-Check: PASSED

- The six modified test files exist; `d91fda67` and `837ffb6b` are ancestors of HEAD, each ends with the trailer, and `git diff --name-only phase_base HEAD -- 'packages/*/src'` is empty.
- Both task `<verify>` checkers exit 0 ("characterisation committed, additions only", "RED committed before any src change").
