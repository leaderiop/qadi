---
phase: 21-port-request-derivation
plan: 04
subsystem: core
tags: [tdd, green, port-span, portSpan, PoseOf, ARCH-69]

requires:
  - phase: 21-port-request-derivation
    provides: 21-01's red PortRequest.tst.ts pose assertion; 21-03's derived key and defect
provides:
  - PoseOf and portSpan (package-private, PortSpanEncode.ts): a span pose that must state every question member but interpreter
  - five span literals built with portSpan; PortRequest.tst.ts fully green
  - exact encoded-question rows for every port, full and sparse request (PortSpan.test.ts)
affects: [21-05]

phase_base: ba38f367
plan_head_before: 4eafa8bbacf40cd4c076c7fcce31236001df5ec6
plan_head_after: b9c807e373b179c7dd660445a08490fea9fa0918
commits: 1

actuals:
  tokens: 3600
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "A span literal is wrapped in portSpan({...}), a typed identity: pose must return PoseOf<question>, so an omitted member is TS2322 where the pose is written"

key-files:
  created: []
  modified:
    - packages/core/src/PortSpanEncode.ts
    - packages/core/src/AttributeResolver.ts
    - packages/core/src/RelationshipResolver.ts
    - packages/core/src/DecisionHistory.ts
    - packages/core/src/SignatureHistory.ts
    - packages/core/src/CustomPredicate.ts
    - packages/core/test/PortSpan.test.ts

key-decisions:
  - "PoseOf is a non-homomorphic mapped type over Exclude<keyof Fields, 'interpreter'>, so every member is a required key typed Type | undefined; member types come from the struct's SpanValue leaves, so INV-QD-044 is unchanged"
  - "portSpan is generic over question, answer, Args, outcome and the disclose return (constrained to SpanType of the answer), so each port's disclose is accepted as written (attribute's takes one parameter) and its return type is kept exact"

requirements-completed: [PREQ-05, WX-04, WX-06]

duration: 12 min
completed: 2026-11-11
status: complete
---

# Phase 21 Plan 04: A port's span question names every member Summary

`portSpan` is a typed identity that holds each port's `pose` to `PoseOf` its span question, so a pose that forgets a member no longer compiles; the five span literals use it and their runtime attributes are unchanged.

## What changed

- `PortSpanEncode.ts`: `PoseOf<S>` (every question member but `interpreter`, each a required key `| undefined`) and `portSpan(span)` returning its argument.
- The five spans (`attributeSpan`, `relationshipSpan`, `actedSpan`, `customSpan`, `signatureSpan`) are wrapped in `portSpan({...})`. Every `pose` and `disclose` body is untouched. The two explicit `SpanType<typeof …Question>` return annotations on the history ports' `pose` were dropped (the wrapper types them stricter) and their now-unused `SpanType` imports removed.
- The relationship `pose` keeps its widened parameter (`resourceId: ResourceId | undefined`, D-07): `StatesEveryRelationshipMember` in `PortRequest.tst.ts` still assigns to it.
- `PortSpan.test.ts`: a table typed `{ readonly [K in PortName]: … }` with one exact `qadi.*` record per port for a full request and one for a request with its optional members absent (attribute and custom-predicate requests have no optional member, so their sparse row is their full one). The relationship sparse row omits only `depth`: the description types `resourceId` as required, and the undefined-`resourceId` pose is pinned by `PortRequest.tst.ts` instead.

## Verification

- RED was already committed by 21-01: `PortRequest.tst.ts` failed on "a pose with a member left out is not this port's pose" (`DropsSignerRole` was assignable) before this plan.
- Task 2's rows were written and run green on the pre-Task-1 tree (30 tests), so they pin today's values; they stay green after.
- `pnpm exec tstyche PortRequest`: 5 tests, 12 assertions pass. `tstyche PortSpan Ports PortServing PortWire`: 4 files, 22 tests pass unchanged.
- Spot-check, signature pose with `signerRole: query.signerRole` deleted, `tsc -b packages/core`:
  `SignatureHistory.ts(151,3): error TS2322 … Property 'signerRole' is missing in type '{ subjectId; scope; resourceId; meaning }' but required in type '{ readonly meaning …; readonly signerRole: string | undefined; … }'`. Restored; `tsc -b` clean.
- Five files contain `portSpan({` (baseline 0).
- `pnpm vitest run --project core`: 62 files, 2055 tests pass. `pnpm typecheck` (both graphs) clean. `pnpm lint`: house-style 445 files clean; oxlint prints only warnings in files this plan did not touch.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Sparse relationship row cannot state `resourceId: undefined`**
- **Found during:** Task 2 (`pnpm typecheck`; vitest does not type-check)
- **Issue:** `RelationshipCheck.resourceId` is required, and the row reaches `pose` through the description's `Args`, so an absent `resourceId` is not expressible there.
- **Fix:** The sparse row omits `depth` only. The widened `resourceId` is still covered at the type level by `PortRequest.tst.ts`.
- **Files modified:** `packages/core/test/PortSpan.test.ts`
- **Commit:** b9c807e3

**Total deviations:** 1 auto-fixed (1 blocking). **Impact:** none on scope.

Tasks 1 and 2 are one commit, as the plan directs (`feat(21-04): a port's span question names every member`).

## Known Stubs

None.

## Threat Flags

None. T-21-09 (a typed pose admitting a non-`SpanValue`): `PoseOf` reads member types from `Fields[K]["Type"]`, which `SpanFields` constrains to `SpanValue`. T-21-10: an omission is now a compile error (spot-check above) and the encoded attributes are pinned.

## Next Phase Readiness

Ready for 21-05. With 21-02 (question), 21-03 (key, defect) and this plan (pose), every in-module restatement of a request field is derived or compiler-checked.

## Self-Check: PASSED

- `packages/core/src/PortSpanEncode.ts` exports `PoseOf` and `portSpan`: FOUND.
- Commit b9c807e3 is an ancestor of HEAD: FOUND.
- Five `portSpan({` call sites: FOUND (5).
