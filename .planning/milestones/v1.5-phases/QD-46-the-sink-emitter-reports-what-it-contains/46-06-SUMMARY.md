---
phase: QD-46-the-sink-emitter-reports-what-it-contains
plan: 06
subsystem: spec
tags: [behaviours, invariants, traceability, ARCH-93]
phase_base: 76e589e07ddfbfebb68eb759ef775881656b8164
plan_head_before: b2446a83aac0e5d04c35c44beaa99dcc1fbef56d
plan_head_after: eb1b7a04e270a4485c5b092231c34fe556e27157
requires: ["46-05"]
provides:
  - "BEH-QD-566 to BEH-QD-570 in the decision-sink behaviours, with a compiling named-sink example"
  - "BEH-QD-181, 182, 185, 187 amended"
  - "INV-QD-035 restated; INV-QD-337 and INV-QD-338 new"
  - "traceability rows for the new ids and both new test files; the CCR-QD-437 row closed"
affects: [46-07]
tech-stack:
  added: []
  patterns: ["behaviour text read against SinkEmit.ts, DecisionSinkForwarding.ts and DecisionLog.ts at HEAD; test ids (E, O, A, C, N, F) cited from the test files"]
key-files:
  modified:
    - spec/behaviors/24-decision-sink.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/decisions/159-the-sink-emitter-reports-what-it-contains.md
    - spec/README.md
key-decisions:
  - "BEH-QD-569 carries the classification table's W1 to W10 as one row each, W4 named as removed"
  - "The DecisionSink.test.ts and EvaluationEnvironment.test.ts rows cite ADR-QD-159 only; the edits to those test files are comments, so no new behaviour id is claimed for them"
requirements-completed: [EMIT-01, EMIT-02, EMIT-03, EMIT-04, WX-02]
duration: 25 min
completed: 2026-11-15
status: complete
commits: 2
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
---

# Phase 46 Plan 06: The behaviours and the invariants Summary

The normative spec now says what the code does: five new decision-sink behaviours, four amended, INV-QD-035 restated under its unchanged heading, two new invariants, and every id joined to ADR-QD-159 and the tests in traceability, with the CCR-QD-437 row closed.

## Commits

- `1f1d4671` `docs(46-06): the decision-sink behaviours report what the emitter contains` (`spec/behaviors/24-decision-sink.md`)
- `eb1b7a04` `docs(46-06): INV-QD-337 and INV-QD-338, INV-QD-035 restated, and the phase's traceability` (`invariants.md`, `traceability.md`, ADR-QD-159, `README.md`)

No `packages/*/src`, test, script or AGENTS.md change.

## Headings added

- `BEH-QD-566: A sink that fails is reported once, for every record it loses` (after BEH-QD-182)
- `BEH-QD-567: A sink may name itself, and a report names it or says unnamed` (with a `typescript` fence naming a sink `billing-audit`)
- `BEH-QD-568: A report cannot change an outcome`
- `BEH-QD-569: A shipped sink keeps only the reports that change behaviour or say something else` (after BEH-QD-187)
- `BEH-QD-570: A fan-out names the member that failed, and every member is isolated`
- `INV-QD-337: A contained sink failure is reported exactly once per lost record, naming the sink`
- `INV-QD-338: No report on the sink path can change an outcome or stop a later fan-out member`

Amended: BEH-QD-181 (the `name?` field in the fence, one sentence), BEH-QD-182 ("unrepresentable except through a type escape"; reported once, not swallowed), BEH-QD-185 (the log's two catches name the half), BEH-QD-187 (a throwing `send` is a send failure; a throwing `onFailure` is the emitter's; the member line names the member). INV-QD-035 keeps its heading and anchor.

## Final revisions

| Document | Before | After |
| -------- | ------ | ----- |
| `spec/behaviors/24-decision-sink.md` | 1.13 | 1.14 |
| `spec/invariants.md` | 1.127 | 1.128 |
| `spec/traceability.md` | 1.189 | 1.190 |
| `spec/decisions/159-the-sink-emitter-reports-what-it-contains.md` | 1.0 | 1.1 |
| `spec/README.md` | 1.194 | 1.195 |
| `spec/overview.md`, `spec/decisions/044-an-optional-decision-sink.md` | 1.112, 1.3 | unchanged |

The CCR-QD-437 row lists every file the phase changed with these Revs, the website pages and the two changesets, and ends `Used: ARCH-93, ADR-QD-159, CCR-QD-437, BEH-QD-566 to BEH-QD-570, INV-QD-337, INV-QD-338. Unused: none.`

## Verification (exit codes)

`pnpm spec:verify:strict` 0 (21 pass, 0 fail, 0 skip), `node scripts/spec-revise.mjs --check` 0, `pnpm spec:examples` 0 (116 blocks), `pnpm spec:gates` 0 (25 steps), `pnpm spec:api` 0, `node scripts/check-doc-examples.mjs` 0, `pnpm spec:website-examples` 0, `pnpm lint` 0. Both plan node checks print their success lines.

## Deviations from Plan

**1. [Rule 1 - Bug] The first Task 1 commit missed two required strings.** The plan's check wants the two log messages verbatim on one line; I had wrapped them across the REQUIREMENT fences, and the check failed after the commit had run. I added one line naming each message, re-ran the check, and amended the local, unpushed commit, so Task 1 is still one `docs(46-06)` commit.

**2. Traceability rows state less than the plan sketched.** The plan said to append new ids to the `DecisionSink.test.ts`, `EvaluationEnvironment.test.ts` and `AuditDecisionSinkLive.test.ts` rows. The first two files changed only in comments, so their rows cite ADR-QD-159 and say what the comment records, and the shadow sink's name is credited to `ShippedSinkReports.test.ts` row N4. The audit row names BEH-QD-567 because that file gained a real name test.

## Known Stubs

None.

## Self-Check: PASSED

Both commits are ancestors of HEAD, the five headings and two invariant headings are on disk, and the closing Used/Unused text and Revs are checked against the document headers by the plan's own script.
