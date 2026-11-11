---
phase: 21-port-request-derivation
plan: 02
subsystem: core
tags: [tdd, green, port-wire, QuestionOf, ARCH-69]

requires:
  - phase: 21-port-request-derivation
    provides: 21-01's red PortRequest.tst.ts and the pinned wire-byte goldens
provides:
  - QuestionOf<Q> and presentMembers in PortWireEncode.ts
  - five toQuestion bodies that name every member of their question, no conditional spread
affects: [21-03, 21-04, 21-05]

phase_base: ba38f367
plan_head_before: 07787584
plan_head_after: a5ccd9f9
commits: 1

actuals:
  tokens: 4000
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "An absent question member is written undefined; portWire drops it (presentMembers) before Schema.encodeUnknownResult"

key-files:
  created: []
  modified:
    - packages/core/src/PortWireEncode.ts
    - packages/core/src/RelationshipResolver.ts
    - packages/core/src/DecisionHistory.ts
    - packages/core/src/SignatureHistory.ts
    - packages/core/src/CustomPredicate.ts

key-decisions:
  - "QuestionOf is a homomorphic mapped type with -? and an optionality test by key (Record<never, never> extends Pick<Q, K>); an 'as K' key remap was refused by house-style's no-type-assertion rule and is not needed"

requirements-completed: [PREQ-04, PREQ-05, WX-04, WX-06]

duration: 10 min
completed: 2026-11-11
status: complete
---

# Phase 21 Plan 02: A port's wire question names every member Summary

`PortWireSpec.toQuestion` now returns `QuestionOf<Q>`, so a question that leaves a member out is a compile error, and `portWire` drops the `undefined` members before the strict encode so the wire bytes are unchanged.

## What changed

- `PortWireEncode.ts`: exported `QuestionOf<Q>` (an optional member becomes a required key typed `| undefined`, a required one is unchanged) and `presentMembers` (fresh copy without `undefined` members, never mutates). `encodeQ` is `Schema.encodeUnknownResult(spec.question)` applied to `presentMembers(question)`. The decode path and the answer path are untouched.
- Relationship, DecisionHistory, SignatureHistory: each `toQuestion` writes every member (`depth`, `resourceId`, `meaning`, `signerRole` as `x.y`, possibly `undefined`). CustomPredicate: the long return-type annotation is gone (inference suffices), the `Result.flatMap`/`Result.map` refusal path is as it was, and `resource`/`params` are written as `resourceJson`/`paramsJson`. The now-unused `EncodeRefusal` import was removed. Attribute needed no change.
- `fromQuestion` bodies are not touched (their spreads decide a served request's absent-vs-undefined member, per 21-CONTEXT).

## TDD (GREEN for 21-01's RED)

- RED: 21-01 (`464544e3`, `b4f97956`): the question assertions in `PortRequest.tst.ts` failed because a question missing a member type-checked.
- GREEN: `a5ccd9f9`. `PortRequest.tst.ts`: 3 question tests pass, the 2 pose tests are skipped by `--only question` (they stay red until 21-04). Core vitest, `-t "^(?!.*ARCH-69)"`: 62 files, 2039 passed, 8 skipped; 21-01's wire-byte goldens and PortConformance's wire rows pass unchanged. `pnpm typecheck` (build graph and `tsconfig.test.json`), `node scripts/check-house-style.mjs` and `oxlint` are clean (oxlint reports only pre-existing `@qadi/react` warnings).
- REFACTOR: none.
- One commit for both plan tasks, as the plan asked (Task 1 does not compile without Task 2).

## TS2741 spot-check

Deleted `signerRole: query.signerRole,` from `signatureWire.toQuestion`, ran `pnpm exec tsc -b packages/core`, restored the file:

```
error TS2322 ... Property 'signerRole' is missing in type '{ subjectId: SubjectId; resourceId: ResourceId | undefined; meaning: string | undefined; }' but required in type 'QuestionOf<{ readonly subjectId: ...; readonly resourceId?: ...; readonly meaning?: string; readonly signerRole?: string; }>'
```

The code is TS2322 at the `toQuestion` property with the missing-property explanation nested (TS2741 is the bare form); the effect the plan wants, a compile error naming the member, holds.

## Deviations from Plan

**1. [Rule 3 - Blocking] House-style rule refused `as K` in QuestionOf**
- **Found during:** Task 1 verification (`check-house-style`, `[no-type-assertion]`)
- **Fix:** dropped the `as K` key remap; plain `[K in keyof Q]-?` keeps the added `| undefined` (shown by the tstyche pass and the spot-check above).
- **Commit:** a5ccd9f9

Otherwise none; the plan ran as written.

## Known Stubs

None.

## Self-Check: PASSED

All five modified files exist, commit `a5ccd9f9` is on `arch-wave-7`, no added conditional spread in any `toQuestion` body (grep count 0 for each of the four modules).
