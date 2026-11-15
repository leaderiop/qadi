---
phase: QD-46-the-sink-emitter-reports-what-it-contains
verified: 2026-11-15T16:15:00Z
status: passed
score: 8/8 must-haves verified
covered_files:
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-01-PLAN.md"
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-01-SUMMARY.md"
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-02-PLAN.md"
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-02-SUMMARY.md"
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-03-PLAN.md"
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-03-SUMMARY.md"
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-04-PLAN.md"
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-04-SUMMARY.md"
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-05-PLAN.md"
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-05-SUMMARY.md"
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-06-PLAN.md"
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-06-SUMMARY.md"
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-07-PLAN.md"
  - ".planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-07-SUMMARY.md"
  - "packages/audit/src/AuditDecisionSinkLive.ts"
  - "packages/core/src/DecisionLog.ts"
  - "packages/core/src/DecisionSink.ts"
  - "packages/core/src/DecisionSinkForwarding.ts"
  - "packages/core/src/EvaluationEnvironment.ts"
  - "packages/core/src/SinkEmit.ts"
  - "packages/core/src/SinkReport.ts"
  - "packages/core/test/ShippedSinkReports.test.ts"
  - "packages/core/test/SinkEmitReport.test.ts"
covered_digest: "v4:sha256:9c5a9b6c8178a33e471758ba53953df68fe5636b4ad01e8adada8625b965be5a"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 46: The sink emitter reports what it contains Verification Report

**Phase Goal:** A decision sink that fails or dies is contained (INV-QD-035) and reported with exactly one warning, so a user-written sink can no longer lose records with no log.
**Verified:** 2026-11-15
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A sink that dies, throws, self-interrupts, leaks a typed failure, or throws before returning an effect is contained and yields exactly one Warn line, decision unchanged (EMIT-01, EMIT-02) | VERIFIED | `SinkEmit.ts` wraps `Effect.suspend(() => sink.value.record(record))` in `Effect.catchCause` and calls `reportSinkFailure`. `SinkEmitReport.test.ts` rows E1-E15 (through `evaluate`) and O1-O5 (through `enforce`) assert exactly one line. I ran the file with the other three core files: 97 passed. |
| 2 | The report carries exactly four keys (`qadi.sink`, `qadi.record_tag`, `evaluationId`, `qadi.cause`), and nothing about subject, resource, policy or action | VERIFIED | `SinkReport.ts` `reportSinkFailure` annotates exactly those four keys. Report rows assert the exact key set. |
| 3 | The report cannot change an outcome (a throwing logger, `name` getter, cause rendering or record field getter is contained) | VERIFIED | `sinkName` and `handedOver` are guarded. The whole report sits inside `Effect.catchCause(() => Effect.void)`. Rows E7, E9, E13, E14 and E15 pin each case. An outer interrupt (E12) ends as an interrupt with nothing reported. |
| 4 | `DecisionSinkShape` has an optional `name`, and the sink is still read once (EMIT-04) | VERIFIED | `DecisionSink.ts` has `readonly name?: string \| undefined`. `SinkEmit.ts` has one `serviceOption(DecisionSink)` read. `check-house-style.mjs` is clean (`sink-read-once`). The tstyche pin passes (5 tests). |
| 5 | Shipped sinks keep only the reports that add something, and each names itself (EMIT-03) | VERIFIED | Forwarding's outer catch is removed, and `send` is suspended. `decisionSinkAll` reports through the shared `reportSinkFailure` with `qadi.sink`. DecisionLog's `isolate` is kept and its doc corrected. Names are `decisionSinkForwarding`, `decisionSinkAll`, `decisionLog`, `evaluationEnvironment.shadow` and `AuditDecisionSinkLive`. `ShippedSinkReports.test.ts` passes, and the audit file passes 35 of 35. |
| 6 | Spec, ADR, INV and BEH are recorded, and INV-QD-035 is restated (EMIT-04, WX-02, WX-03) | VERIFIED | BEH-QD-566..570, INV-QD-337/338, ADR-QD-159 and the CCR-QD-437 row (with Used/Unused) all exist. `pnpm spec:verify:strict` passes (21 PASS, 0 FAIL). `pnpm spec:api` passes. `spec-revise --check` passes. |
| 7 | Public changes are recorded without a release (WX-07) | VERIFIED | Both changesets are present (`@qadi/core` minor, `@qadi/audit` patch). The upgrade guide is edited. The diff touches no `package.json`, CHANGELOG, script or AGENTS.md. |
| 8 | Evidence discipline (WX-04, WX-05, WX-06): no forbidden constructs, no mutation-score drop, RED before GREEN | VERIFIED | The added `packages/*/src` lines match no forbidden construct. The git log shows `test(46-01) RED`, `test(46-02)` and `test(46-02) RED` before the first src commit, `feat(46-03)`. Mutation after vs base (unrounded): SinkEmit 1/1, EvaluationEnvironment 1/1, AuditDecisionSinkLive 1/1, DecisionLog 0.9857 vs 0.9275, DecisionSinkForwarding 0.9 vs 0.8065, and SinkReport.ts is new at 1. Base `.json` has one commit (`f94a273a`). |

**Score:** 8/8 truths verified (0 present but behavior-unverified)

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/core/src/SinkEmit.ts` | VERIFIED | Substantive and wired: `evaluate` and `discharge` reach it through `sinkEmitter`. |
| `packages/core/src/SinkReport.ts` | VERIFIED | New and package-private. Imported by `SinkEmit.ts` and `DecisionSinkForwarding.ts`. |
| `packages/core/src/DecisionSink.ts` | VERIFIED | Optional `name` field with documentation. |
| `packages/core/src/DecisionSinkForwarding.ts` | VERIFIED | Names added, outer catch removed, member report shared. |
| `packages/core/src/DecisionLog.ts` | VERIFIED | `name: "decisionLog"`, `isolate` doc corrected. |
| `packages/core/src/EvaluationEnvironment.ts` | VERIFIED | Shadow sink named. |
| `packages/audit/src/AuditDecisionSinkLive.ts` | VERIFIED | `name: "AuditDecisionSinkLive"`. |
| `packages/core/test/SinkEmitReport.test.ts` and `ShippedSinkReports.test.ts` | VERIFIED | Both pass (97 tests across the four core files I ran). |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| `SinkEmit.sinkEmitter` | `SinkReport.reportSinkFailure` and `handedOver` | WIRED | The record's `_tag` and `evaluationId` are captured before the sink runs. |
| `decisionSinkAll` member | `SinkReport.reportSinkFailure` | WIRED | The same four keys as the emitter line. |
| shipped sinks | emitter | WIRED | A sink the emitter reports is not also reported by the sink, and `C1`-`C4` pin the count. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Core sink tests | `vitest run --project core` on SinkEmitReport, ShippedSinkReports, DecisionSink, EvaluationEnvironment | 97 passed | PASS |
| Audit sink | `vitest run --project audit` on AuditDecisionSinkLive | 35 passed | PASS |
| Type pin | `tstyche DecisionSink.tst.ts` | 5 passed | PASS |
| House style | `node scripts/check-house-style.mjs` | 516 files clean | PASS |
| Spec gates | `pnpm spec:verify:strict`, `pnpm spec:api`, `spec-revise --check` | all pass | PASS |

I did not re-run the full `pnpm check:pr`. The reported exit 0 (5305 unit tests) is a claim I did not reproduce. I also did not re-run Stryker or reproduce the RED state on the base. That state rests on the SUMMARY output (14 of 16 failed, 12 of 16 failed, audit 1 failed) and on the commit order, which I did check.

### Requirements Coverage

| Requirement | Source Plans | Status | Evidence |
|-------------|--------------|--------|----------|
| EMIT-01 | 46-01, 46-03, 46-06 | SATISFIED | Truths 1-3. |
| EMIT-02 | 46-01, 46-03, 46-06 | SATISFIED | E1-E5 and O1-O5 cover a dying and a failing sink through `evaluate`. RED on the base per the commit order. |
| EMIT-03 | 46-02, 46-04, 46-05, 46-06 | SATISFIED | Truth 5. |
| EMIT-04 | 46-03, 46-06 | SATISFIED | Truth 4 and the INV-QD-035 restatement. |
| WX-01 | 46-07 | SATISFIED | The reported `check:pr` exit 0 is not independently re-run (see the note above). Individual gates re-run. |
| WX-02 | 46-01, 46-05, 46-06, 46-07 | SATISFIED | Reserved ids used and the CCR row states Used/Unused. |
| WX-03 | 46-05 | SATISFIED | `spec:api` passes and no new export. |
| WX-04 | 46-07 | SATISFIED | Truth 8. |
| WX-05 | 46-01, 46-07 | SATISFIED | Truth 8. No file scores lower than its base. |
| WX-06 | 46-01, 46-02, 46-07 | SATISFIED | Truth 8. |
| WX-07 | 46-05, 46-07 | SATISFIED | Truth 7. |

All 11 phase IDs are declared in the plan frontmatter and marked Complete in REQUIREMENTS.md. There are no orphaned requirements.

### Anti-Patterns Found

None. There are no debt markers in the added source lines, no stubs, and no new forbidden constructs. The 3 declared switches are unchanged.

### Human Verification Required

None.

### Gaps Summary

No gaps. DecisionSinkForwarding's `forEach` `{ discard: true }` survivor is a documented equivalent mutant and not a gap.

---

_Verified: 2026-11-15_
_Verifier: Claude (gsd-verifier)_
