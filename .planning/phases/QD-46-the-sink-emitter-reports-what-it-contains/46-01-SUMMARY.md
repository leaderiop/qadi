---
phase: QD-46-the-sink-emitter-reports-what-it-contains
plan: 01
subsystem: core/sink-emitter
tags: [evidence, mutation-baseline, red-tests, ARCH-93]
phase_base: 76e589e07ddfbfebb68eb759ef775881656b8164
plan_head_before: 76e589e07ddfbfebb68eb759ef775881656b8164
plan_head_after: 5c8b7e675e8fcb68fbf2ff61abdc2b8c18839af1
requires: []
provides:
  - "46-mutation-base.json: the Stryker baseline of the five source files this phase edits"
  - "SinkEmitReport.test.ts: E1-E11 and O1-O5, RED on the base (14 failed, 2 passed)"
affects: [46-03, 46-04, 46-07]
tech-stack:
  added: []
  patterns: ["RED rows through the public entry points (evaluate, enforce), counted with collectingLogger"]
key-files:
  created:
    - .planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-mutation-base.json
    - packages/core/test/SinkEmitReport.test.ts
  modified: []
key-decisions:
  - "A sink whose name getter throws is reported once as unnamed (E7); an empty-string name is annotated as given (E11)"
  - "Mutation baseline re-measured on the base, not copied from RESEARCH; scores match RESEARCH Q7 exactly"
requirements-completed: [EMIT-01, EMIT-02, WX-02, WX-05, WX-06]
duration: 22 min
completed: 2026-11-15
status: complete
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase 46 Plan 01: Evidence on the untouched base Summary

The mutation baseline of the five files this phase edits, committed alone as the phase's first commit, then 16 RED rows that show on the base a failing sink is reported by nothing and a throwing `record` is not contained at all.

## Commits

- `f94a273a` `chore(46-01): mutation baseline for the sink emitter and the shipped sinks` (only `46-mutation-base.json`)
- `5c8b7e67` `test(46-01): a sink that fails is reported once, through evaluate and enforce (RED)` (only `SinkEmitReport.test.ts`)

`phase_base` is `76e589e07ddfbfebb68eb759ef775881656b8164`, the parent of `f94a273a`. No `packages/*/src`, spec, script or changeset change.

## Reserved numbers

ARCH-93, ADR-QD-159, CCR-QD-437, BEH-QD-566 to BEH-QD-570, INV-QD-337 and INV-QD-338 are free at `phase_base` (whole-id git grep over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts prints nothing); no `spec/decisions/159-*` file exists. `scripts/next-id.mjs` was not run.

## Mutation base

Two Stryker runs, one after the other, each in the background, with the exact close invocations: core `pnpm exec stryker run --mutate '<the four core files>'` (51 s), audit `pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/AuditDecisionSinkLive.ts'` (21 s). Both exited 0 (above the break threshold). Writer: the plan's, run from the repo root; it accepted both reports.

```
{"measured":{"packages/core/src/DecisionLog.ts":0.927536231884058,"packages/core/src/DecisionSinkForwarding.ts":0.8064516129032258,"packages/core/src/EvaluationEnvironment.ts":1,"packages/core/src/SinkEmit.ts":1,"packages/audit/src/AuditDecisionSinkLive.ts":1},"unmeasured":{},"new":[],"deleted":{},"moved":{}}
```

| File | Score | (detected/scored) | Ignored (static) |
|---|---|---|---|
| `packages/core/src/DecisionLog.ts` | 0.927536231884058 | 64/69 | 3 |
| `packages/core/src/DecisionSinkForwarding.ts` | 0.8064516129032258 | 25/31 | 1 |
| `packages/core/src/EvaluationEnvironment.ts` | 1 | 6/6 | 2 |
| `packages/core/src/SinkEmit.ts` | 1 | 28/28 | 2 |
| `packages/audit/src/AuditDecisionSinkLive.ts` | 1 | 58/58 | 1 |

Survivors (the only ones; the other three files have none):

```
survivor packages/core/src/DecisionLog.ts:174:23 StringLiteral NoCoverage -> `` on: `qadi: a decision log's ${half} half failed`
survivor packages/core/src/DecisionLog.ts:175:27 ObjectLiteral NoCoverage -> {} on: { "qadi.cause": String(cause) }
survivor packages/core/src/DecisionLog.ts:173:21 ArrowFunction Survived -> () => undefined on: (cause) => Effect.logWarning(`qadi: a decision log's ${half} half failed`).pipe( Effect.annotateLogs
survivor packages/core/src/DecisionLog.ts:257:69 StringLiteral Survived -> "" on: "publish"
survivor packages/core/src/DecisionLog.ts:259:17 StringLiteral Survived -> "" on: "append"
survivor packages/core/src/DecisionSinkForwarding.ts:126:29 StringLiteral NoCoverage -> "" on: "qadi: a decision record could not be forwarded"
survivor packages/core/src/DecisionSinkForwarding.ts:127:33 ObjectLiteral NoCoverage -> {} on: { "qadi.cause": String(cause) }
survivor packages/core/src/DecisionSinkForwarding.ts:87:35 StringLiteral Survived -> "" on: "qadi.decisionSinkForwarding.refused"
survivor packages/core/src/DecisionSinkForwarding.ts:125:27 ArrowFunction Survived -> () => undefined on: (cause) => Effect.logWarning("qadi: a decision record could not be forwarded").pipe( Effect.annotate
survivor packages/core/src/DecisionSinkForwarding.ts:193:24 BooleanLiteral Survived -> false on: true
survivor packages/core/src/DecisionSinkForwarding.ts:193:13 ObjectLiteral Survived -> {} on: { discard: true }
```

## RED on the base

`pnpm exec vitest run --project core packages/core/test/SinkEmitReport.test.ts`, with `packages/*/src` equal to `phase_base`:

```
 Test Files  1 failed (1)
      Tests  14 failed | 2 passed (16)
```

Per row, what the base did:

- E1, E2, E4, E6, E7, E8, E11, O1, O2, O4: zero log lines (`expected +0 to equal 1`); the allow, or the typed error, was already unchanged.
- E3, O3 (self-interrupt): the decision is already unchanged on the base (`catchCause` recovers it, RESEARCH A1, Pitfall 3); only the count is RED (zero lines).
- E5 (`record` throws before returning an effect): `evaluate` is not contained. The exit is `Cause([Die(Error: thrown before an effect)])` (observed with a throwaway probe, deleted), so `Exit.isSuccess` fails (`expected false to be true`). This is a defect in INV-QD-035, not only a missing report; 46-03 suspends the call inside the containment.
- O5: zero lines where two are expected (`expected +0 to equal 2`).
- E9 (a throwing logger) and E10 (a recording sink, no sink at all, no warning) pass on the base, as planned: nothing logs there, so the logger is never called, and no line is produced when nothing fails.

The 14 and 2 match the plan's prediction; no row differs from the plan's table.

## Verification

- Task 1: all three automated verifies exit 0 (baseline JSON shape, `chore(46-01)` first plan commit carrying only the JSON, `phase_base` equals its parent and the ten ids are free).
- Task 2: RED run `14 failed | 2 passed`; 16 titles in order in the two describes, no import of `SinkEmit.ts` or `DecisionSinkForwarding.ts`, no `console`, no metric literal; `git diff phase_base -- packages/core/src packages/audit/src packages/testing/src` empty; `pnpm typecheck` exits 0; `pnpm lint` exits 0 (house-style: 514 files clean; the warnings are all in the untracked `.codex/` hooks, none in this file).

## Deviations from Plan

None - plan executed exactly as written.

The plan's step 1 creates the SUMMARY "with its front matter only"; it stayed untracked until this output step, so neither commit carries it.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `.planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-mutation-base.json`: found
- `packages/core/test/SinkEmitReport.test.ts`: found
- `f94a273a` and `5c8b7e67` are ancestors of `HEAD`
