---
phase: QD-38-the-sink-wire-version-stated-once
plan: 01
subsystem: sink-wire
tags: [sink-codec, wire-version, characterisation, mutation-baseline]
phase_base: b1e8ecbf8a10c34830ae84e9c464aaa6cc6b61d3
requires: []
provides:
  - 38-mutation-base.json (SinkCodec.ts, SinkWire.ts at the phase base)
  - the read set written out as [2] in SinkCodec.test.ts
  - the base-side retype-to-3 record
affects: [38-02, 38-03, 38-04]
tech-stack:
  added: []
  patterns: [hand-written expected values beside constant-derived ones]
key-files:
  created:
    - .planning/phases/QD-38-the-sink-wire-version-stated-once/38-mutation-base.json
  modified:
    - packages/core/test/SinkCodec.test.ts
decisions:
  - "D-05's golden already exists and is recorded, not duplicated: V2_DECIDED_ALLOW and V2_OBLIGATIONS"
metrics:
  duration: ~10 minutes
  completed: 2026-11-14
status: complete
commits: 2
plan_head_before: b1e8ecbf8a10c34830ae84e9c464aaa6cc6b61d3
plan_head_after: 9284313df5b0c2257b2a37fd853c3536b330076f
actuals:
  tokens: 700
  tasks: 3
  commits: 2
requirements-completed: [WIRE-02, WIRE-03, WX-02, WX-05, WX-06]
---

# Phase 38 Plan 01: Baseline, golden and written-out read set Summary

The evidence is recorded on the untouched base: a Stryker baseline of the two files, the existing byte golden confirmed, five hand-written `supported: [2]` rows, and the retype-to-3 harm shown and reverted. No `packages/*/src` change is committed.

## Reserved numbers

ARCH-85, ADR-QD-151, CCR-QD-429, BEH-QD-526 to 530 and INV-QD-321 to 322 are free: every `git grep` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts printed nothing, and `spec/decisions` has no `151-*` file. `next-id.mjs` was not run.

## Mutation baseline (`cf854f3a`)

Invocation: `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/SinkCodec.ts,packages/core/src/SinkWire.ts'`, run alone, exit 0. Printed by the writer:

- `packages/core/src/SinkCodec.ts 0.9634146341463414 (158/164)`
- `packages/core/src/SinkWire.ts 1 (0/0)`, no scored mutant (module-scope expressions ignored under `ignoreStatic`)
- `{"measured":{"packages/core/src/SinkCodec.ts":0.9634146341463414,"packages/core/src/SinkWire.ts":1},"unmeasured":{},"new":[],"deleted":{}}`

Survivors (all Survived, none NoCoverage; all outside the version expressions):
- SinkCodec.ts:327:10 EqualityOperator
- SinkCodec.ts:329:9 ConditionalExpression
- SinkCodec.ts:330:9 EqualityOperator
- SinkCodec.ts:353:11 EqualityOperator
- SinkCodec.ts:392:7 ConditionalExpression
- SinkCodec.ts:396:7 ConditionalExpression

## D-05 golden (recorded, none added)

Hand-written single-quoted literals in `packages/core/test/fixtures/sinkWireV2.ts`, each hard-coding `"version":2` with the wire struct's key order, compared against `encodeSinkRecordString` under describe `v2 bytes: the writer writes the version-2 goldens`:
- `V2_DECIDED_ALLOW` (test `a decided record`): `_tag, version, evaluationId, at, subjectId, policy, outcome`
- `V2_OBLIGATIONS` (test `an obligation record`): `_tag, version, evaluationId, at, outcome, obligationIds`

The golden check script exited 0 on the base; no fixture reads a constant; no snapshot API is used.

## The read set, written out (`9284313d`)

Describe `the read set, written out: supported is [2], and version 2 decodes`, five cases (no version key, 1, 3, the string 2, and 2 decoding). Vitest on the base: 153 cases, all passed (148 plus five), the two goldens and the five rows green. `pnpm typecheck` and `pnpm lint` pass (house-style: 496 files clean).

## Retype-to-3 on the base

- edit 1: `SinkWire.ts:48` `export type WireVersion = 2;` changed to `= 3;`, nothing else.
- tsc after edit 1: two errors, both TS2322 "Type '2' is not assignable to type '3'": `SinkWire.ts(51,59)` (`WIRE_VERSIONS`'s `[2]`) and `SinkCodec.ts(453,7)` (the private constant). None at the two `Schema.Literal(2)` or the two `2 as const`.
- edit 2: the two edits the compiler asked for: `WIRE_VERSIONS` `[2]` to `[3]` and the codec's private `WIRE_VERSION` `= 2` to `= 3`.
- tsc after edit 2: exit 0, no errors. The codec compiles half-retyped.
- untouched literals: `SinkCodec.ts:146` and `:154` (`version: Schema.Literal(2)`), `:224` and `:226` (`version: 2 as const`) still say 2.
- vitest: 86 passed, 67 failed of 153. The six cases of `v2 bytes: the writer writes the version-2 goldens` all passed (the encoder still writes `"version":2`); the five written-out rows all failed.
- decoder on its own output: a round trip failed with `refused: {"version":2,"supported":[3],"_tag":"UnsupportedVersion"}`: the decoder refuses what the encoder wrote.
- reverted: `git checkout -- packages/core/src/SinkWire.ts packages/core/src/SinkCodec.ts`, `tsc -b` exit 0, `git status --porcelain -- packages` empty, `packages/core/src` equals the phase base.

## Deviations from Plan

### Auto-fixed Issues

None in code. One plan-verify defect noted, not a code change:

**1. [Verify defect] Task 2's "no plan or decision id in the test file" regex**
- **Found during:** Task 2
- **Issue:** `/\bD-\d{2}\b|\b38-0\d\b/` over the whole file matches two pre-existing comments/titles (`ARCH-11 D-11-e` at line 2065, `ADR-QD-096 D-15-c` at line 2152), which predate this plan.
- **Fix:** none made to existing lines (the plan says change no existing line); every other check in that script passed. The five added rows and their comment carry no such id.
- **Files modified:** none.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- 38-mutation-base.json, SinkCodec.test.ts and this file exist.
- Commits `cf854f3a` (chore, baseline alone) and `9284313d` (test, file alone) are the first two plan commits, each carrying one file.
