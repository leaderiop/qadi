---
phase: QD-43-one-handover-module-behind-the-enforcement-entry-points
plan: 06
subsystem: spec
tags: [spec, adr, handover, amendments]
phase_base: 712317c10688ebce97b8b29b5a5c515b84a8d71b
plan_head_before: 036cce4f67d0160825e4248c3b4f201e2e0ae90a
plan_head_after: 73b591a7270cb7f45d564b4f353c08a71794b37c
requires: ["43-05"]
provides:
  - "ADR-QD-156 (Rev 1.0, Accepted, extends ADR-QD-104), indexed, traced and given the first CCR-QD-434 row"
  - "dated amendments to ADR-QD-104, 105, 019, 022 and 035"
affects: [43-07, 43-08]
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: ["amend an earlier ADR with a dated final section, never rewrite it"]
key-files:
  created:
    - spec/decisions/156-a-handed-over-value-is-decided-through-one-module.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
    - spec/decisions/104-a-projected-read-decides-against-the-value-it-projects.md
    - spec/decisions/105-an-obligation-is-discharged-against-the-question-it-answered.md
    - spec/decisions/019-obligations.md
    - spec/decisions/022-subject-set-evaluation.md
    - spec/decisions/035-witness-guard-primitive.md
key-decisions:
  - "ADR-QD-156 records Handover.ts as the one owner of options, verdict, discharge, resource scoping and release; guard adapts it directly; LoadedEnforceOptions becomes HandoverOptions with no alias"
requirements-completed: [HAND-06, WX-02]
status: complete
---

# Phase 43 Plan 06: One handover module, recorded Summary

ADR-QD-156 records that `Handover.ts` decides every handed-over value, and the five earlier decisions whose sentences it changes carry dated amendments.

## ADR-QD-156 sections

Context, Decision, Alternatives considered, Consequences, Related. The Decision names `HandoverOptions`, `EnforceOptions`, `ObligationDischarge`, `ObligationHandler`, `discharge`, `verdictOf`, `resourceFree`, `decidedOn`, `RELEASE`, `handOver`, plus `admittedOrDenied`, `accessDenied` and `keptInOrder` from `Qadi.ts`; each `Handover.ts` name was checked against the module's declarations. Registered in `index.yaml`, `spec/traceability.md` §3 (Rev 1.177 to 1.178) and a `CCR-QD-434` row in `spec/README.md` (Rev 1.182 to 1.183) right after CCR-QD-433. 43-07 completes that row.

## Amendments

| ADR | Revision before to after | What now reads differently |
| --- | --- | --- |
| 104 | 1.0 to 1.1 | `LoadedEnforceOptions` is `HandoverOptions`, the options of all eight value-handing entry points; `permitted` is `verdictOf`/`discharge`; resource set by `decidedOn`, `project` written once in `RELEASE` |
| 105 | 1.2 to 1.3 | `permitted`/`decideOne` passing the question to `discharge` is `verdictOf` in `Handover.ts` |
| 019 | none (no Document Control) | "All four route through one `permitted`" is ten entry points through `verdictOf`/`discharge` |
| 022 | none (no Document Control) | "one `permitted`" is `Handover.ts`; array and stream forms share `handOver` |
| 035 | 1.0 to 1.1 | `guard` takes `HandoverOptions` and adapts the module with `decidedOn` rather than calling `enforce` |

## Verification

- `pnpm spec:verify:strict`: `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)`.
- `spec-revise --check`: every Revision matches its newest Change History entry.
- `pnpm spec:gates`, `pnpm spec:claims` (8 claims registered), `pnpm spec:examples` (114 blocks compile): green.
- The plan's diff check against `phase_base` confirmed no line above an amendment changed except Revision and Change History rows.
- The reservations file still reads `{"CCR":443,"ADR":165,"BEH":600,"INV":350}`; `next-id.mjs` was not run.

## Commits

- `0ba56e31` docs(43-06): ADR-QD-156, a handed-over value is decided through one module
- `73b591a7` docs(43-06): ADR-QD-104, 105, 019, 022 and 035 amended for the handover module

## Deviations from Plan

**1. Precondition count.** Task 1's precondition expects exactly two `docs(43-05):` commits since `phase_base`; there are three (the two tasks plus the plan-completion docs commit). The intent, 43-05 complete, holds, so execution continued.

**2. INV-QD-108 anchor.** The existing traceability row for INV-QD-108 links `#inv-qd-106-...`, a stale anchor. The new ADR-QD-156 row and ADR text use the heading's real anchor, `#inv-qd-108-a-projected-value-is-the-evaluated-resource`; the old row was left alone (out of scope).

**3. Stale comment noted, not touched.** `packages/core/src/Qadi.ts`'s `guard` doc comment still says "`enforce` re-checking the policy"; `guard` no longer calls `enforce`. That is code from 43-03, left for the owner of that file.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Both commits exist on `arch-wave-10`, and `spec/decisions/156-a-handed-over-value-is-decided-through-one-module.md` exists.
