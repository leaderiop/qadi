---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
plan: 04
subsystem: core
tags: [red-tests, unknown-key-policy, untrusted-decoder, key-derivation, type-pins, tstyche]
requires: [57-03]
provides:
  - the direct decoder pair under refuse and ignore and the declared-key derivation, rows U1..U16, ten of them RED by assertion on the base
  - every existing untrustedDecoder call in the core tests and the bench stating unknownKeys refuse
  - D-16's type contract pinned RED in UntrustedDecode.tst.ts
affects: [57-05, 57-07, 57-11]
actuals:
  tokens: 5300
  tasks: 2
  commits: 2
plan_head_before: f5a98d84a5545faf0afd30f45bbd69867585e802
plan_head_after: 1a826bda1a981658aacb59e2b49559e313a65e6d
tech-stack:
  added: []
  patterns: ["RED by option: the new option is passed everywhere before it exists, so typecheck fails on it and the run-time rows fail by assertion", "every decoder under test built inside its it body"]
key-files:
  created: []
  modified:
    - packages/core/test/UntrustedDecode.test.ts
    - packages/core/test/DecodeRefusal.test.ts
    - packages/core/test/DecisionWire.test.ts
    - packages/core/bench/UntrustedDecode.bench.ts
    - packages/core/test/UntrustedDecode.tst.ts
key-decisions:
  - "U12 pins the union's own measured message (`Expected { readonly \"_tag\": \"A\", ... } | { readonly \"_tag\": \"B\", ... }`), not the plan's `Missing key at _tag`: that message belongs to the sink record, whose input carries other keys; for a plain two-member TaggedStruct union the base answers with the union text"
  - "The build refusal 57-05 must raise matches /unknownKeys \"ignore\" needs/ for Schema.Unknown, an array schema and an undiscriminated union (U16)"
requirements-completed: [KEYP-02, KEYP-05, WX-06]
duration: 15min
completed: 2026-11-18
status: complete
---

# Phase QD-57 Plan 04: The unknownKeys option as failing tests

Sixteen `unknownKeys (KEYP-02, D-16)` rows pin the direct decoder under `refuse` and `ignore` and the declared-key derivation across a struct, a discriminated union, a `Suspend`, `encodeKeys` and a one-member union; D-16's type contract is pinned RED beside them. No `packages/*/src` file changed.

## Accomplishments

- U1..U16 in `packages/core/test/UntrustedDecode.test.ts`, every decoder built in its `it` body: the pair per input class (U1..U5), `unwalked` and `prepare` composing with `ignore` (U6..U9), the derivation (U10..U15) and the two build-time refusals (U16).
- Every `untrustedDecoder(` call in the four run-time files states `unknownKeys: "refuse"`; the options-omitted test became `decodes identically with { unknownKeys: refuse } and { unknownKeys: refuse, unwalked: [] }`.
- `UntrustedDecode.tst.ts` pins `UnknownKeyPolicy` exactly `"refuse" | "ignore"`, the option required and closed, and composing with `unwalked` and `prepare`.

## Task Commits

1. **Task 1: the direct decoder pair and the key derivation** - `092c15ba` (test)
2. **Task 2: D-16's type contract** - `1a826bda` (test)

**Plan metadata:** the `docs(57-04)` commit that carries this file.

## Files Created/Modified

- `packages/core/test/UntrustedDecode.test.ts` - the `unknownKeys (KEYP-02, D-16)` describe, the stated call sites, `answerOf` and `successOf`.
- `packages/core/test/DecodeRefusal.test.ts`, `packages/core/test/DecisionWire.test.ts`, `packages/core/bench/UntrustedDecode.bench.ts` - the stated policy, nothing else.
- `packages/core/test/UntrustedDecode.tst.ts` - the policy stated on every pin, the new D-16 test.

## RED on the base

The pre-existing rows pass at run time on the base (`-t '^(?!unknownKeys)'`):

```
 Test Files  3 passed (3)
      Tests  75 passed | 16 skipped (91)
```

The new describe (`-t '^unknownKeys'`), exactly the ten rows the plan names, each by an assertion (no resolve error, no throw, no `RangeError`):

```
 × U1 a shallow unknown key: refuse is Malformed, ignore decodes the declared key
 × U2 an unknown key past the bound: refuse is TooDeep, ignore decodes
 × U3 an unknown key 60,000 deep under ignore decodes, value and text, no throw
 × U6 ignore with unwalked: a deep unwalked slot and a deep unknown key decode, a deep walked declared key is TooDeep
 × U7 under ignore, prepare receives the projection without the unknown key
 × U10 a discriminated union keeps the keys of the member its _tag names
 × U13 encodeKeys: the declared key is the encoded name
 × U14 a Suspend of a struct keeps its keys
 × U15 a one-member union needs no discriminant
 × U16 under ignore, Schema.Unknown, an array schema and an undiscriminated union throw at build, and under refuse they build
      Tests  10 failed | 6 passed | 22 skipped (38)
```

Failure messages: `expected a Success` (U1, U2, U3, U7, U10, U13, U14, U15), `expected 'TooDeep' to equal 'Success'` (U6), `expected [Function] to throw an error` (U16). U4, U5, U8, U9, U11 and U12 pass on the base: they pin the answers `refuse` must keep.

`pnpm typecheck` fails on the base with 46 errors, every one `TS2353: Object literal may only specify known properties, and 'unknownKeys' does not exist in type 'UntrustedDecoderOptions<...>'`, in `UntrustedDecode.test.ts`, `DecodeRefusal.test.ts`, `DecisionWire.test.ts` and `UntrustedDecode.bench.ts`; none names anything else.

`pnpm exec tstyche packages/core/test/UntrustedDecode.tst.ts` fails on the base before it evaluates a pin, on the missing export:

```
fail ./packages/core/test/UntrustedDecode.tst.ts
Error: Module '"../src/UntrustedDecode.ts"' has no exported member 'UnknownKeyPolicy'. ts(2305)
Targets:    1 failed, 1 total
```

## Decisions Made

- Row U12 pins the measured union message for its own two-member `TaggedStruct` union, and asserts the two policies answer it identically; see `key-decisions`.
- U16's regex `/unknownKeys "ignore" needs/` is the contract for 57-05's build-time `throw`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] U12's message pin did not match the schema it runs on**
- **Found during:** Task 1
- **Issue:** the plan quotes `Missing key\n  at ["_tag"]` for an absent `_tag`. That is the sink record's message (R11 in 57-02), where the input carries the record's other keys. A plain `Schema.Union([TaggedStruct("A", ...), TaggedStruct("B", ...)])` answers `Expected { readonly "_tag": "A", ... } | { readonly "_tag": "B", ... }`, so the first run failed U12 on the base although the plan lists it as passing there.
- **Fix:** pinned the measured message, and added the cross-policy equality assertion that carries the intent (an absent `_tag` falls to the first member and answers the same under both policies).
- **Files modified:** `packages/core/test/UntrustedDecode.test.ts`
- **Verification:** U12 passes on the base; the ten named rows still fail.
- **Committed in:** `092c15ba`

**Total deviations:** 1 auto-fixed (1 bug in a plan-quoted message). **Impact on plan:** none on scope or contracts.

## Issues Encountered

- tstyche stops at the missing `UnknownKeyPolicy` export, so the type pins themselves are not evaluated until 57-05 adds it; the RED is by import, as the plan states.

## Known Stubs

None.

## Threat Flags

None. T-57-07 and T-57-08 are covered by U7, U4, U6, U10, U13, U14, U16 and the Task 2 pins as the register states.

## Flagged assumption

The coverage probe could not classify KEYP-02. It is read as one required, closed `unknownKeys` option on `untrustedDecoder`, whose `ignore` drops an undeclared top-level key before the guard, the declared keys read from the schema's encoded AST. This plan states it as failing tests; 57-05 proves it. Left unresolved in the edge report.

## Next Phase Readiness

57-05 can now add `UnknownKeyPolicy`, the required option and `EnvelopeKeys.ts` against a fixed target: U1..U16 and the tst pins turn green, the stated call sites already compile.
