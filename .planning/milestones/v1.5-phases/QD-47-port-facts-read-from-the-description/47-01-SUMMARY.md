---
phase: QD-47-port-facts-read-from-the-description
plan: 01
subsystem: testing
tags: [stryker, mutation-baseline, red-test, devtools-wiring, ports]
phase_base: 9f2051228ef4d577262891a4e7882a8683b7754e
plan_head_before: 9f2051228ef4d577262891a4e7882a8683b7754e
plan_head_after: eff51e788e8c2aab08835832c1325f38a0672630
commits: 2
requires: []
provides:
  - "47-mutation-base.json: Stryker baseline of the six measurable touched files at the phase base"
  - "WiringDefaulted.test.ts: seven RED rows for a hand-written wrapper around a fail-closed default"
affects: [47-03, 47-04, 47-07]
tech-stack:
  added: []
  patterns: ["RED committed on the untouched base before any packages/*/src edit"]
key-files:
  created:
    - .planning/phases/QD-47-port-facts-read-from-the-description/47-mutation-base.json
    - packages/devtools/test/model/WiringDefaulted.test.ts
  modified: []
key-decisions:
  - "Scores are stored unrounded as measured on a fresh run of both Stryker configs; no config was edited."
requirements-completed: [PFCT-02, WX-02, WX-05, WX-06]
actuals:
  tokens: 6500
  tasks: 2
  commits: 2
status: complete
---

# Phase 47 Plan 01: Mutation baseline and RED rows Summary

The phase's evidence is on the untouched base: a Stryker baseline of the six measurable touched files (committed alone, first), and seven RED rows showing `wiringReport` decides `defaulted` from a display name, not from what a port wraps.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `57c743ce` | `chore(47-01): mutation baseline for the port derivations and the devtools wiring and call rows` |
| 2 | `eff51e78` | `test(47-01): a hand-written wrapper around a fail-closed default is reported by what it wraps (RED)` |

`phase_base` (`9f205122`, "docs(47): create phase plan") is the parent of the `chore(47-01)` commit.

## Reserved numbers

ARCH-94, ADR-QD-160, CCR-QD-438, BEH-QD-571 to BEH-QD-575, INV-QD-339 and INV-QD-340 are all free at `phase_base` (whole-id `git grep -E` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples, scripts printed nothing; no `spec/decisions/160-*`). `node scripts/next-id.mjs` was not run.

## Mutation base

Two fresh runs on the untouched tree, one after the other, with the exact invocations the close (47-07) repeats:

- `pnpm exec stryker run --mutate 'packages/core/src/PortDerivation.ts,packages/core/src/PortDescription.ts,packages/core/src/PortDoubles.ts,packages/core/src/Ports.ts'` (exit 0, 26 s)
- `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/Wiring.ts,packages/devtools/src/model/PortCalls.ts'` (exit 0, 36 s)

Writer output:

```
packages/core/src/PortDerivation.ts 0.98 (49/50) ignored 14
survivor packages/core/src/PortDerivation.ts:172:45 ObjectLiteral Survived -> {} on: { permits }
packages/core/src/PortDescription.ts 1 (16/16) ignored 10
packages/core/src/PortDoubles.ts 1 (36/36) ignored 0
packages/core/src/Ports.ts 1 (16/16) ignored 9
packages/devtools/src/model/PortCalls.ts 1 (49/49) ignored 10
packages/devtools/src/model/Wiring.ts 1 (63/63) ignored 10
```

```json
{"measured":{"packages/core/src/PortDerivation.ts":0.98,"packages/core/src/PortDescription.ts":1,"packages/core/src/PortDoubles.ts":1,"packages/core/src/Ports.ts":1,"packages/devtools/src/model/PortCalls.ts":1,"packages/devtools/src/model/Wiring.ts":1},"unmeasured":{"packages/devtools/src/react/ServicesPanel.tsx":"not instrumentable: stryker.devtools.mjs mutates packages/devtools/src/model/**/*.ts only; its call-row reading moves into model/PortReading.ts, measured as new"},"new":["packages/core/src/PortDefault.ts","packages/devtools/src/model/PortReading.ts"],"deleted":{},"moved":{}}
```

Scores match RESEARCH Q8 exactly. The one survivor, `PortDerivation.ts:172:45` (`{ permits }` to `{}`, ObjectLiteral), is pre-existing on the base. `ServicesPanel.tsx` is unmeasured (reason in the JSON); `PortDefault.ts` and `PortReading.ts` are listed as new.

## RED on the base

`pnpm exec vitest run --project devtools packages/devtools/test/model/WiringDefaulted.test.ts` on the untouched src (`git diff --quiet 9f205122 -- packages/core/src packages/devtools/src packages/testing/src` clean):

```
     × AttributeResolver: a spreading wrapper named audited AttributeResolver reads defaulted 7ms
     × DecisionHistory: a spreading wrapper named audited DecisionHistory reads defaulted 1ms
     × RelationshipResolver: a spreading wrapper named audited RelationshipResolver reads defaulted 1ms
     × CustomPredicate: a spreading wrapper named audited CustomPredicate reads defaulted 1ms
     × SignatureHistory: a spreading wrapper named audited SignatureHistory reads defaulted 1ms
     × R6: an unnamed spreading wrapper around the default reads defaulted 1ms
     × R7: a fresh object named after the default reads as a real adapter (D-04) 0ms
...
 Test Files  1 failed (1)
      Tests  7 failed (7)
```

Per row on the base (every failure is at `WiringDefaulted.test.ts:40`-style `defaulted` assertions; no name assertion failed, no load or type error):

| Row | name (as asserted, passes) | `defaulted` on the base | Failure |
|-----|----------------------------|-------------------------|---------|
| five `forEveryPort` rows | `audited <port>` | `false` | `AssertionError: expected false to be true` |
| R6 | `undefined` | `false` | `AssertionError: expected false to be true` |
| R7 | `AttributeResolverNone (audited)` | `true` | `AssertionError: expected true to be false` |

No row's base behaviour differed from the plan's expectation, so none was corrected.

## Verification

- Task 1 verifies: JSON key set, `measured` six files in [0, 1], `unmeasured`/`new`/`deleted`/`moved` as required; first `(47-0` commit is `chore(47-01):` and carries only the JSON; `phase_base` equals that commit's parent (checked true); ten reserved ids free at `phase_base`.
- Task 2 verifies: RED `7 failed (7)` with both assertion messages; one `test(47-01): ... (RED)` commit carrying only the test file; `pnpm typecheck` exit 0; `pnpm lint` exit 0 (warnings only in untracked, pre-existing `.codex/` hook files); house-style "517 file(s) clean".
- No `packages/*/src`, spec, script, changeset, or Stryker config change in this plan.

## Deviations from Plan

None - plan executed exactly as written. Stryker's frontline note: both runs exited 0 (score above the break threshold), so the "exit 1 after a below-threshold line" allowance was not needed.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/QD-47-port-facts-read-from-the-description/47-mutation-base.json`
- FOUND: `packages/devtools/test/model/WiringDefaulted.test.ts`
- FOUND: `57c743ce`, `eff51e78` (ancestors of HEAD)
