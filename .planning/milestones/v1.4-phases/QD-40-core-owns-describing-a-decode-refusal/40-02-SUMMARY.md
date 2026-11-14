---
phase: QD-40-core-owns-describing-a-decode-refusal
plan: 02
subsystem: sink-wire-decode
tags: [characterisation, decode-refusal, devtools-drop-words, audit-differential, base-experiment]
phase_base: eb5a94063ac2ba730eaff53ac7095b3e0add36ca
requires: [40-01]
provides:
  - "Source.test.ts: the five onMalformed drop words, one frame each, green on the base"
  - "SinkCodec.test.ts: seven whole Malformed messages decodeSinkRecord gives, green on the base"
  - "AuditEntryDifferential.test.ts: decodeAuditEntry's output over existing fixtures, values written from the base run"
  - "the base-side new-refusal experiment and the base bench, recorded below"
affects: [40-03, 40-04, 40-05, 40-06, 40-07, 40-08, 40-09]
tech-stack:
  added: []
  patterns: [characterisation written on the untouched base, expected values copied as literals from a base run]
key-files:
  created:
    - packages/audit/test/AuditEntryDifferential.test.ts
  modified:
    - packages/devtools/test/model/Source.test.ts
    - packages/core/test/SinkCodec.test.ts
key-decisions:
  - "The core table and the audit differential are the oracles 40-04 and 40-06 must leave byte-identical and green; the devtools table is the only one 40-05 rewrites, by the upgrade map"
requirements-completed: [DREF-01, DREF-05, WX-06]
plan_head_before: 6888affbe70e03ccd3a8f668cd51a41630fb78bb
plan_head_after: 1069afe5d72667a885b1d9c25b2699520d28f8ab
commits: 3
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
duration: ~9 min
completed: 2026-11-14
status: complete
---

# Phase 40 Plan 02: Characterisation on the base Summary

Three single-file test commits pin, green on the untouched base, the five devtools drop words, the seven whole `Malformed` messages `decodeSinkRecord` gives, and the audit entry's keys, text, refusals and Retention equality; the new-refusal experiment and the bench were run on the base and reverted.

## New refusal on the base

- edit: added `Throwaway: Record<never, never>;` to the `DecodeRefusal` `Data.TaggedEnum` in `packages/core/src/SinkWire.ts` (after `NotJson`), on top of `038ea477`
- tsc files with errors: 1 file, `packages/devtools/src/model/Source.ts` (`:221:24`, TS2345, `reasonOf`'s `Match.tagsExhaustive` handler object no longer assignable, `Throwaway` unhandled); `pnpm exec tsc -p tsconfig.test.json`
- exhaustive reads outside tsc: `examples/nextjs-newsroom/src/server/api.ts:129` (`refusedBecause`, a `Match.type<DecodeRefusal>()`, outside `tsconfig.test.json`); the other `git grep -n "Match.type<DecodeRefusal>" -- examples packages` line is `packages/devtools/src/model/Source.ts:220`, the one tsc already names
- reverted: `git checkout -- packages/core/src/SinkWire.ts`, `git status --porcelain -- packages` empty afterwards

## Bench on the base

- decodeSinkRecord alone: 120,796.63 hz, mean 0.0084 ms (ran on `2356dc4e`, whose `packages/*/src` equals `phase_base`; `pnpm exec vitest bench --run --root packages/core UntrustedDecode --reporter=verbose`; the planning reading was 119,701.35 hz, mean 0.0084 ms)

## Pins

| File | Describe | Cases | Commit |
|------|----------|-------|--------|
| `packages/devtools/test/model/Source.test.ts` | `what onMalformed receives, one frame per drop` | 5 (`not-json`, `too-deep`, `not-a-record`, `unsupported-version`, `inconsistent`) | `038ea477` |
| `packages/core/test/SinkCodec.test.ts` | `the Malformed message decodeSinkRecord gives, written out` | 7 | `2356dc4e` |
| `packages/audit/test/AuditEntryDifferential.test.ts` | `decodeAuditEntry's output, written out over existing fixtures` | 8 (the file's only describe) | `1069afe5` |

Whole-file counts on the base: Source.test.ts 38, SinkCodec.test.ts 163, AuditEntryDifferential 8, all green.

Base values worth knowing for the later plans (all literals in the tests):

- Every `Malformed` message from `decodeSinkRecord` has the shape `<issue>\n  at [<path>]` (two-space indent), for example `Missing key\n  at ["outcome"]`, `Expected no excess property\n  at ["policy"]["permision"]`; `decodeAuditEntry` returns the identical message for the same record.
- The entry's record keys are in schema order whatever the row's order: `_tag, version, evaluationId, at, subjectId, policy, outcome` for a Decision (with `resource` between `policy` and `outcome` when passed, an explicit `undefined` keeping its own key), `_tag, version, evaluationId, at, outcome, obligationIds` for an obligation record.
- A key-reversed twin is `Equal` to the original with the same hash; an explicit-`undefined` `resource` twin is neither.
- A 60,000-deep value is `TooDeep({ maxDepth: 256 })` both as a policy and under an unknown envelope key.

## Commits

- `038ea477` test(40-02): the five drop words onMalformed receives, one frame each
- `2356dc4e` test(40-02): the Malformed messages decodeSinkRecord gives, written out
- `1069afe5` test(40-02): the audit entry's output, written out over existing fixtures

Each ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; the commit-shape check passes (the phase's first five plan commits are the baseline, the ADR and these three, one file each). No `packages/*/src`, `scripts/` or `AGENTS.md` change: `git diff --name-only eb5a9406 -- packages/*/src` is empty.

## Deviations from Plan

**1. [Plan detail] The 60,000-deep case is `it.effect`, not `it`**
- **Found during:** Task 3
- **Issue:** the plan names `it("a record nested 60,000 deep …", …, 60_000)`; the case builds its row through `encodeAuditEntry` (an Effect), so a plain `it` would need an extra run wrapper.
- **Fix:** `it.effect(title, fn, 60_000)`; the title is the plan's, unchanged, and the verify matches by title.
- **Files modified:** packages/audit/test/AuditEntryDifferential.test.ts
- **Commit:** 1069afe5

**2. [Plan detail] A float case reaches the decision's `durationMillis` through a typed `DecisionRow` interface**
- **Found during:** Task 3
- **Issue:** the helpers' `Allow` has `durationMillis: 1`, so the 2.5 needs the row's `outcome.decision` spread; a `JSON.parse` result is `any` and the row must stay `unknown`-typed without `as`.
- **Fix:** a small `DecisionRow` interface the parse is annotated with (no cast, no `Record<string, unknown>`); the other cases use `{ readonly record: object }`.
- **Files modified:** packages/audit/test/AuditEntryDifferential.test.ts
- **Commit:** 1069afe5

**Total deviations:** 2 plan details, none behavioural. **Impact:** none; every verify passes unmodified.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- The three test files exist; `038ea477`, `2356dc4e` and `1069afe5` are ancestors of HEAD; `git status --porcelain -- packages scripts AGENTS.md` shows only the new differential before its commit and nothing after.
- Task 1 verifies (devtools describe green with exactly five titles, then the base-diff, experiment-record check), Task 2 verifies (seven titles, literals, bench line) and Task 3 verifies (eight titles, `pnpm typecheck`, `pnpm lint` house-style 497 files clean, commit-shape) exit 0.
