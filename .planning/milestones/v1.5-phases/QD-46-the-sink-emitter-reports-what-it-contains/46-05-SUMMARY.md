---
phase: QD-46-the-sink-emitter-reports-what-it-contains
plan: 05
subsystem: spec/docs
tags: [adr, changeset, upgrade-guide, ARCH-93]
phase_base: 76e589e07ddfbfebb68eb759ef775881656b8164
plan_head_before: ff073c01d975e46cbf3c68343e18c517e75506e4
plan_head_after: f523bdc6c7647228db6e62bd658ec0013d2827ab
requires: ["46-04"]
provides:
  - "ADR-QD-159: the emitter contains and reports every cause once, with the classification table and the RED evidence"
  - "ADR-QD-044 amendment, index entry, traceability row, CCR-QD-437 row started"
  - "two changesets (@qadi/core minor, @qadi/audit patch) and the 0.13 upgrade entry"
affects: [46-06, 46-07]
tech-stack:
  added: []
  patterns: ["ADR shaped on ADR-QD-158; classification table copied from 46-classification.md by script, not retyped"]
key-files:
  created:
    - spec/decisions/159-the-sink-emitter-reports-what-it-contains.md
    - .changeset/sink-emitter-reports-failures.md
    - .changeset/audit-sink-names-itself.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/044-an-optional-decision-sink.md
    - spec/traceability.md
    - spec/README.md
    - spec/overview.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - apps/website/src/content/docs/docs/concepts/decision-lifecycle.md
    - apps/website/src/content/docs/docs/packages/core/services.md
key-decisions:
  - "ADR-QD-159 states the metric as declined and deferred (ADR-QD-123), the log-flood and log-forging consequences as accepted, and the change as not breaking"
  - "The CCR-QD-437 row lists only Task 1's files with their Revs; Task 2's files and the closing Used/Unused ids are 46-06's"
requirements-completed: [WX-02, WX-03, WX-07, EMIT-03]
duration: 14 min
completed: 2026-11-15
status: complete
commits: 2
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
---

# Phase 46 Plan 05: Record the decision and tell users Summary

ADR-QD-159 records that the emitter contains and reports every cause once, naming the sink, with the 13-row classification table and the RED numbers from 46-01 and 46-02; the two changesets, the 0.13 upgrade entry and the three prose places that describe a failing sink now say the same thing, with no export change.

## Commits

- `e322510b` `docs(46-05): ADR-QD-159, the sink emitter reports what it contains` (ADR, `index.yaml`, ADR-QD-044, `traceability.md`, `README.md`)
- `f523bdc6` `docs(46-05): a failing decision sink is reported once, in the changelog and the guides` (two changesets, `upgrading.md`, `decision-lifecycle.md`, `services.md`, `overview.md`)

No `packages/*/src`, package.json or CHANGELOG change; `changeset version` was not run.

## Revisions (before -> after)

| Document | Before | After |
| -------- | ------ | ----- |
| `spec/decisions/159-the-sink-emitter-reports-what-it-contains.md` | (new) | 1.0 |
| `spec/decisions/044-an-optional-decision-sink.md` | 1.2 | 1.3 (amendment) |
| `spec/traceability.md` | 1.188 | 1.189 |
| `spec/README.md` | 1.193 | 1.194 (CCR-QD-437 row started, after the CCR-QD-436 row) |
| `spec/overview.md` | 1.111 | 1.112 (DecisionSink paragraph only; no table edit) |

The CCR-QD-437 row cites 159 Rev 1.0, 044 Rev 1.3, traceability Rev 1.189 and README Rev 1.194, plus the phase's source and test files. It does not yet cite `spec/overview.md` Rev 1.112, `upgrading.md` and the two changesets: the plan assigns those and the closing Used/Unused ids to 46-06.

## Facts checked against the code at HEAD

The ADR's message, the four annotation keys (`qadi.sink`, `qadi.record_tag`, `evaluationId`, `qadi.cause`), `unnamed`, the `??` empty-name behaviour, the five names, the fan-out member line (`qadi: a fanned-out decision sink failed unexpectedly` with `qadi.sink` and `qadi.cause`), W4's removal and the log's doc correction were read from `SinkEmit.ts`, `DecisionSinkForwarding.ts` and `DecisionLog.ts` and match the plan's description. No BEH-QD-566..570, INV-QD-337/338 are cited as links (the one place the ADR's source comments name INV-QD-337/338 is `SinkEmit.ts`, not the ADR).

## Verification (exit codes)

`pnpm spec:verify:strict` 0 (21 pass, 0 fail), `node scripts/spec-revise.mjs --check` 0, `pnpm spec:gates` 0 (25 steps), `pnpm spec:api` 0, `pnpm spec:website-examples` 0 (the new `typescript` fence compiles), `node scripts/check-doc-examples.mjs` 0, `pnpm lint` 0. Both plan node checks print their success lines.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. T-46-13 mitigated: the message, keys and names are literals in the ADR and the changeset, and the fence compiles. T-46-14 mitigated: no 46-06 id is cited and no relative link is broken.

## Self-Check: PASSED

All created files exist; `e322510b` and `f523bdc6` are ancestors of HEAD; `git rev-list --count ff073c01..HEAD` is 2.
