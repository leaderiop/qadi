---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
plan: 07
subsystem: core
tags: [mutation, stryker, static-evidence, d-12, wx-05]
requires: [57-06]
provides:
  - 57-mutation-after.json, the six touched files measured by the three unedited gate configs on the closing tree
  - 57-mutation-static.json, EnvelopeKeys.ts measured with ignoreStatic false
  - a passing D-12 compare (WX-05 mutation half)
affects: [57-08, 57-09, 57-10, 57-11]
actuals:
  tokens: 4000
  tasks: 2
  commits: 2
plan_head_before: 1a7ed4c7e19454f567047b97d33776c5abe987ca
plan_head_after: 03374795a91f06774f660768b6b3e9001b9f9fda
tech-stack:
  added: []
  patterns: ["evidence config spread from the gate config in the scratchpad, never the repository"]
key-files:
  created:
    - .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-mutation-after.json
    - .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-mutation-static.json
  modified:
    - packages/core/test/UntrustedDecode.test.ts
key-decisions:
  - "The five EnvelopeKeys.ts survivors of the first after-run were closed with tests (U17..U19), never a source rewrite or a re-baseline"
requirements-completed: [WX-05]
duration: 25min
completed: 2026-11-19
status: complete
---

# Phase QD-57 Plan 07: mutation after-run and static evidence Summary

The closing tree is measured by the unedited gate configs and judged by the rule 57-01 committed: `compare` prints `WX-05 holds (D-12)` with `EnvelopeKeys.ts` at 48/48 detected, no survivor and all 9 static-ignored mutants Killed.

## Accomplishments

- One test-only gap commit killed the five survivors the first after-run left in the new leaf; the three gate runs and the evidence run were then repeated on the final tree.
- `chore(57-07)` carries exactly the two JSON files; the script, base JSON and the three Stryker configs are unchanged since `chore(57-01)`; no `packages/*/src` or test commit follows it.

## Task Commits

1. **Gap:** `9687dc0b` `test(57-07): kill the EnvelopeKeys.ts discriminant and tag-lookup survivors` (`packages/core/test/UntrustedDecode.test.ts` only: U17, U18, U19)
2. **Evidence:** `03374795` `chore(57-07): mutation after-run and static evidence for D-12` (the two JSON files)

## Mutation after

Final runs, each alone in the background, `< /dev/null`; Stryker exit 0 each time. Wall times: core 32 s, audit 12 s, react 30 s, evidence 25 s.

core (`57-mutation.mjs after core`):

```
packages/core/src/EnvelopeKeys.ts 1 (48/48) ignored 9
packages/core/src/SinkCodec.ts 0.9682539682539683 (122/126) ignored 45
  survivor packages/core/src/SinkCodec.ts:322:10 EqualityOperator | Survived | stack.length >= 0 | stack.length > 0 | while (stack.length > 0) {
  survivor packages/core/src/SinkCodec.ts:324:9 ConditionalExpression | Survived | false | frame === undefined | if (frame === undefined) break;
  survivor packages/core/src/SinkCodec.ts:387:7 ConditionalExpression | Survived | false | Result.isFailure(before) | if (Result.isFailure(before)) return refuse(before.failure);
  survivor packages/core/src/SinkCodec.ts:391:7 ConditionalExpression | Survived | false | Result.isFailure(encoded) | if (Result.isFailure(encoded)) return refuse(encoded.failure);
packages/core/src/UntrustedDecode.ts 0.9428571428571428 (33/35) ignored 7
  survivor packages/core/src/UntrustedDecode.ts:215:5 ConditionalExpression | Survived | true | unwalked.size > 0 | unwalked.size > 0 && isPlainObject(input)
  survivor packages/core/src/UntrustedDecode.ts:215:5 EqualityOperator | Survived | unwalked.size >= 0 | unwalked.size > 0 | unwalked.size > 0 && isPlainObject(input)
wrote .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-mutation-after.json (core)
```

audit (`after audit`):

```
packages/audit/src/AuditArchive.ts 1 (53/53) ignored 14
packages/audit/src/AuditEntry.ts 1 (17/17) ignored 8
```

react (`after react`):

```
packages/react/src/HydrationEngine.ts 1 (169/169) ignored 36
```

The first core after-run (before the gap commit) read `EnvelopeKeys.ts 0.8958333333333334 (43/48)` with five survivors: line 49 `ArrayDeclaration` (`[]` to `["Stryker was here"]`), line 73 `key === TAG` to `true`, line 32 `ConditionalExpression` and `LogicalOperator`, line 51 `distinct.size === values.length` to `true`. The `SinkCodec.ts` and `UntrustedDecode.ts` lines were identical in both runs.

## Static evidence

Config (scratchpad `stryker57-static.config.mjs`, never in the repository):

```js
// Evidence only, never a gate run: the core gate config with ignoreStatic:false (Phase 57, D-12).
import base from "/Users/mohammadalmechkor/Projects/Perso/qadi/stryker.config.mjs";
export default {
  ...base,
  ignoreStatic: false,
  reporters: ["json", "clear-text"],
  jsonReporter: { fileName: "<scratchpad>/stryker57-static-report.json" },
};
```

Run with `--mutate packages/core/src/EnvelopeKeys.ts`; `57-mutation.mjs evidence` tally on the final tree: `packages/core/src/EnvelopeKeys.ts {"Killed":57}` (first run: `{"Survived":5,"Killed":52}`).

## D-12

```
packages/audit/src/AuditArchive.ts 0.9811320754716981 -> 1 (detected 52 -> 53; survivors +0 -1)
  gone survivor ObjectLiteral | Survived | {} | { message } | Malformed: ({ message }) => ArchiveRefusal.Malformed({ message }),
packages/audit/src/AuditEntry.ts 1 -> 1 (detected 17 -> 17; survivors +0 -0)
packages/core/src/SinkCodec.ts 0.9754601226993865 -> 0.9682539682539683 (detected 159 -> 122; survivors +0 -0)
packages/core/src/UntrustedDecode.ts 0.9354838709677419 -> 0.9428571428571428 (detected 29 -> 33; survivors +0 -0)
packages/react/src/HydrationEngine.ts 1 -> 1 (detected 169 -> 169; survivors +0 -0)
packages/core/src/EnvelopeKeys.ts 1 (detected 48; survivors 0; ignored 9)
static: all 9 ignored mutants of packages/core/src/EnvelopeKeys.ts are Killed in .../57-mutation-static.json
WX-05 holds (D-12)
```

`SinkCodec.ts` fell only as moved killed mutants (survivor set unchanged); the leaf's 48 detected plus its 9 proven static mutants and the decoder's gain of 4 cover the 37 detected mutants that left it.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - gap closure the plan prescribes] Five survivors in EnvelopeKeys.ts**
- **Found during:** Task 2 (first compare)
- **Issue:** the new leaf held five Survived mutants (discriminant detection and the `_tag` lookup)
- **Fix:** three tests, U17 (a member without a `_tag` literal), U18 (a non-literal `_tag` slot and a duplicated literal) and U19 (`_tag` not the first entry), all refusal/decode behaviour the leaf already had; Task 1 was repeated for core and the evidence run
- **Files modified:** `packages/core/test/UntrustedDecode.test.ts`
- **Commit:** `9687dc0b`

The executor also handed back once mid-run to wait on the first background Stryker run; the work resumed from the completion notice with no state lost.

**Total deviations:** 1 (test gap closure as the plan prescribes). **Impact:** none on scope; no source, script, base or config edit.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- 57-mutation-after.json, 57-mutation-static.json: FOUND; `chore(57-07)` `03374795` and `test(57-07)` `9687dc0b` are ancestors of HEAD.
- Script, base JSON and gate configs unchanged since `chore(57-01)`; no `stryker57-static` file in the repository.
