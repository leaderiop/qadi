---
phase: QD-44-the-hydration-seed-s-fields-stated-once
plan: 01
phase_base: e7e896589864fc005144d433ae84054875f2a0f9
subsystem: react-hydration
tags: [hydration, mutation-baseline, property-test, golden, tdd-red]
requires: []
provides:
  - "44-mutation-base.json: Stryker baseline of HydrationEngine.ts and SeededDecision.ts on the untouched base"
  - "packages/react/test/HydrationSeedFields.test.ts: round-trip property (HYDF-03) and eight-string payload golden (HYDF-04), green on the base"
affects: [44-02, 44-03, 44-06]
tech-stack:
  added: []
  patterns: ["fast-check property over the real encodeDecision output", "byte golden of dehydrateWith"]
key-files:
  created:
    - .planning/phases/QD-44-the-hydration-seed-s-fields-stated-once/44-mutation-base.json
    - packages/react/test/HydrationSeedFields.test.ts
  modified: []
decisions:
  - "Golden literals from 44-RESEARCH.md held as written on the real base; no literal was edited"
metrics:
  duration: "about 10 minutes"
  completed: 2026-11-15
status: complete
commits: 2
plan_head_before: e7e896589864fc005144d433ae84054875f2a0f9
plan_head_after: 573f79e9bee09d5ad43e147e0bceae2ae36f2725
actuals:
  tokens: 2300
  tasks: 3
  commits: 2
---

# Phase 44 Plan 01: Hydration seed evidence on the untouched base Summary

Mutation baseline (HydrationEngine.ts 183/183, SeededDecision.ts 7/8), a fast-check round-trip property and an eight-string payload golden, all committed green on the base, plus the RED run showing the property catching a wire field `rebuild` drops.

## Reserved numbers (WX-02)

`ARCH-91`, `ADR-QD-157`, `CCR-QD-435`, `BEH-QD-556` to `BEH-QD-560`, `INV-QD-333`, `INV-QD-334` each matched nothing under `spec packages .changeset AGENTS.md CONTRIBUTING.md features apps/website/src examples scripts` at the base, and no `spec/decisions/157-*` exists. `node scripts/next-id.mjs` was not run.

## Mutation base

Command (the close repeats it): `pnpm exec stryker run stryker.react.mjs --mutate 'packages/react/src/HydrationEngine.ts,packages/react/src/SeededDecision.ts'`. 230 mutants, 1 min 35 s, final score 99.48, exit 0.

```
packages/react/src/HydrationEngine.ts 1 (183/183) ignored 18
packages/react/src/SeededDecision.ts 0.875 (7/8) ignored 21
survivor packages/react/src/SeededDecision.ts:119:18 BooleanLiteral NoCoverage -> true on: false
{"measured":{"packages/react/src/HydrationEngine.ts":1,"packages/react/src/SeededDecision.ts":0.875},"unmeasured":{},"new":[],"deleted":{},"moved":{}}
```

The one survivor is a `NoCoverage` boolean literal at `SeededDecision.ts:119:18`. Both scores are the floor the close (44-06) must meet unrounded.

## Golden

The eight literals in 44-RESEARCH.md "The payload golden" passed on the real base exactly as written (`Tests 5 passed`). Nothing was edited and no source was changed.

## RED on the base

`git status --porcelain -- packages/core/src/DecisionWire.ts` printed nothing before and after. Scratch field `scratch: Schema.String` in `common` plus `scratch: "x"` after each `trace: decision.trace,` in `encodeDecision`; reverted with `git checkout -- packages/core/src/DecisionWire.ts` in a `finally`.

```
under the scratch field: tsc -b exit 0, property exit 1
Error: Property failed after 1 tests
{ seed: 2026111501, path: "0:0:0:0:0:0:0:0", endOnFailure: true }
Counterexample: [{"evaluationId":" ","subjectId":"u1","durationMillis":0,"trace":{"policyTag":"HasRole","allowed":false,"reason":undefined,"children":[],"visibleFields":undefined,"obligations":[]},"reason":"denied","_tag":"Deny"},false]
Shrunk 7 time(s)
Caused by: AssertionError: expected undefined to deeply equal 'x'
- Expected: "x"
+ Received: undefined
```

Afterwards `git status --porcelain -- packages` printed nothing, `pnpm typecheck` exited 0 (rebuilding `lib/`; no `scratch` in `packages/core/lib/DecisionWire.js`) and the test file passed 5/5 again.

## Commits

- `ebfdaf4b` chore(44-01): mutation baseline for the hydration seed's fields (the JSON alone, phase's first plan commit, parent is `phase_base`)
- `573f79e9` test(44-01): a seed keeps every disclosed wire field, and the payload's bytes are pinned (the test file alone)

The plan's own metadata commit follows these two, so `rev-list phase_base..HEAD` reads 3 after it; the two task commits are what `commits:` counts.

## Deviations from Plan

None - plan executed exactly as written. One note: the plan's `<verify>` for the SUMMARY's `phase_base` front matter was satisfied by writing the sha at the start from `git rev-parse HEAD`, which the orchestrator also confirmed.

## Known Stubs

None.

## Threat Flags

None. No `packages/*/src`, spec, script or changeset file changed.

## Self-Check: PASSED

- 44-mutation-base.json, HydrationSeedFields.test.ts: found.
- ebfdaf4b and 573f79e9 are ancestors of HEAD.
- `git diff --quiet phase_base -- packages/core/src packages/react/src` clean; DecisionWire.ts clean.
