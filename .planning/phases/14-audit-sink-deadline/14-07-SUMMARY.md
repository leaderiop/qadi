---
phase: 14-audit-sink-deadline
plan: 07
subsystem: docs
tags: [docs, changeset, mutation, phase-gate]

requires: ["14-06"]
provides:
  - "`storeCallTimeout` and the doubles' reply scripts documented in spec/overview.md (1.83), packages/audit/README.md and the website's capabilities page, with compiled fences"
  - "`.changeset/audit-sink-deadline.md`: `@qadi/audit` minor, with a Breaking paragraph for the three removed options"
  - "upgrading.md 0.12 entry with a before/after (the after fence compiles)"
  - "PROJECT.md Key Decisions row for D-05; v1.0 Out-of-Scope line amended"
  - "Phase 14 gate: MUTATION-COMPARE ok, `pnpm check:pr` exit 0"
affects: [15]

plan_head_before: 7a317ee
actuals:
  tokens: 40000
  tasks: 2
  commits: 2

key-files:
  created:
    - .changeset/audit-sink-deadline.md
  modified:
    - spec/overview.md
    - spec/README.md
    - packages/audit/README.md
    - apps/website/src/content/docs/docs/packages/audit/capabilities.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - .planning/PROJECT.md

key-decisions:
  - "Route A (`_DECISIONS.md` 14-01 T1: `A interrupt remove` — \"5 s overridable `storeCallTimeout` per store call; script union gains `Interrupt` (six modes); remove `failWith`/`failStageWith`/`failCommitWith` (Breaking)\"). No route-C blocker."
  - "New changeset, not an amendment: no pending changeset covered the audit sink deadline or the doubles (checked all eight `@qadi/audit` ones)."

requirements-completed: [AUD-01, AUD-02, AUD-03, AUD-04, AUD-05, XC-01, XC-03, XC-05]

duration: 40min
completed: 2026-11-10
status: complete
---

# 14-07 — Close Phase 14

## Decision applied

`_DECISIONS.md`, 14-01 T1: **`A interrupt remove`**, "5 s overridable `storeCallTimeout` per store call; script union
gains `Interrupt` (six modes); remove `failWith`/`failStageWith`/`failCommitWith` (Breaking)". Route A, so no
buffered-sink blocker.

## Task 1 — docs, changeset, decision row (`89185cc`)

- `spec/overview.md` 1.83: the `AuditDecisionSinkOptions` row names `storeCallTimeout` (5 s default, `Duration.infinity`,
  a reached deadline is a failed call, a failed write counts on the breaker). No other row needed (gate 13: 886 exports).
- `packages/audit/README.md`: new "A deadline on every store call" section (default, opt-out, breaker, staging failure,
  uninterruptible-adapter limit) and a script example under Testing; both `typescript` fences compile (`spec:examples` 107).
- Website `capabilities.md`: a "deadline on every store call" paragraph with a compiled fence (bounded and unbounded) and
  a new "Testing" section with a compiled script example.
- `upgrading.md`: "0.12: the audit doubles answer from a script, and a store call has a deadline" — a `ts` before
  (removed API, not compiled) and a `typescript` after that compiles; notes the 5 s default against 0.11's unbounded wait.
- `.changeset/audit-sink-deadline.md`: `"@qadi/audit": minor`; `storeCallTimeout`; `AuditPortReply` and the three script
  types public; **Breaking** paragraph: `failWith`/`failStageWith`/`failCommitWith` removed, replace
  `failWith: (entry) => new AuditWriteError({ entry, cause })` with `write: () => AuditPortReply.Fail({ cause })`, likewise
  `stage`/`commit`; the double builds the errors; a commit `Fail` carries the staged entry. Breaking judged against
  `@qadi/audit@0.11.0` (which had the three options).
- `spec/README.md` 1.138: CCR-QD-404's row gains overview 1.83, README 1.138, the audit README, capabilities, upgrading
  and the changeset.
- `.planning/PROJECT.md`: Key Decisions row for D-05 (ADR-QD-126); the v1.0 Out-of-Scope line gains "(Revisited in v1.1
  Phase 14: scripted, still not registry ports.)".

## Task 2 — phase gate

MUTATION-COMPARE (`stryker.audit.mjs --mutate` the six files; `AuditPortReply.ts` has 0 mutants, so it is absent from
the report and left out of the compare):

| File | Base (`14-mutation-base.json`) | Now | Killed/total | NoCov | Verdict |
|------|------|-----|------|------|------|
| AuditDecisionSinkLive.ts | 98.04 | 100.00 | 58/58 | 0 | ok |
| AuditTrailPortTest.ts | 100 | 100.00 | 17/17 | 0 | ok |
| AuditStagingPortTest.ts | 100 | 100.00 | 46/46 | 0 | ok |
| CircuitBreaker.ts | 80.51 | 80.51 | 157/195 | 4 | ok (equal) |
| AuditPortReplyInterpreter.ts | 100 | 100.00 | 6/6 | 0 | ok |

Script exit 0. CircuitBreaker's 34 survivors and 4 NoCoverage are the phase base's own (identical score); no survivor is
new in this phase.

`pnpm check:pr`: **exit 0**. Vitest 165 files / 4298 tests; 34 files / 566 tests; 7 files / 42 tests; tstyche 42 files /
194 tests; Playwright 30 passed.

## Requirements

- AUD-01/02/03: `AuditDecisionSinkLive.ts` `bounded(…)`, `AuditSinkDeadline.test.ts` (14-03).
- AUD-04: `AuditPortReply.ts`, the two doubles, `AuditPortReply.test.ts`, 14-04's rewrites, `driveExit.ts` (14-02/04/05).
- AUD-05: BEH-QD-251 amendment, BEH-QD-379 (14-06).
- XC-01: `pnpm check:pr` exit 0 (this plan). XC-02: ADR-QD-126, CCR-QD-404 (14-06). XC-03: overview 1.81–1.83, gate 13.
  XC-04: `PORT_DOUBLE_BUDGET`, `AUDIT_HAND_LAYER_BUDGET`, AGENTS.md §6 (14-05). XC-05: table above. XC-06: the five RED
  `AuditSinkDeadline` tests on `b042e56` (14-01).

## Commits

- `89185cc` docs(14-07): storeCallTimeout and the audit doubles' scripts in the docs, changeset and decision row
- (this file) docs(14-07): complete plan — Phase 14 complete

## Deviations

- `upgrading.md` was not in the plan's file list; the orchestrator asked for the 0.12 entry.
- `spec/README.md` was revised (1.138) because the CCR-QD-404 row changed, as the orchestrator asked.

## Gate results

- `spec-revise --check --date 2026-11-10` ✓; `spec:api` ✓ 886; `spec:website-examples` ✓ 47 blocks; `spec:examples` ✓ 107;
  `spec:verify:strict` ✓ 21/21; plan greps ✓; MUTATION-COMPARE ✓; `pnpm check:pr` ✓ exit 0.
