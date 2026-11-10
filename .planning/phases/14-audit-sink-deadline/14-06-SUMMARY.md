---
phase: 14-audit-sink-deadline
plan: 06
subsystem: spec
tags: [spec, adr, behaviours, invariants, traceability, ccr]

requires: ["14-03", "14-04", "14-05"]
provides:
  - "ADR-QD-126 (new, indexed): an audit store call has a deadline; the audit doubles answer from a script; amends ADR-QD-044 and ADR-QD-056"
  - "BEH-QD-379 (a store call is bounded) and BEH-QD-380 (the doubles' script) in spec/behaviors/33-audit-pipeline.md; BEH-QD-249's fence lists storeCallTimeout; BEH-QD-251 amended (D-04)"
  - "INV-QD-035 note; traceability rows; CCR-QD-404 registered (spec:verify:strict green again)"
affects: [14-07]

plan_head_before: eed88f5
actuals:
  tokens: 45000
  tasks: 2
  commits: 2

key-files:
  created:
    - spec/decisions/126-an-audit-store-call-has-a-deadline.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/044-an-optional-decision-sink.md
    - spec/decisions/056-audit-companion-package.md
    - spec/behaviors/33-audit-pipeline.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md

key-decisions:
  - "Route A (14-01 `d02_outcome: A`; `_DECISIONS.md`: `A interrupt remove` — 5 s overridable `storeCallTimeout` per store call; script union gains `Interrupt` (six modes); remove `failWith`/`failStageWith`/`failCommitWith` (Breaking)), quoted in ADR-QD-126. C (buffered sink) is recorded as deferred, not rejected, with what it adds and costs; no follow-up blocker (that was the C branch)"
  - "No new INV: INV-QD-035 gains a note that the audit sink cannot withhold a decision past its deadline, and says the bound is that sink's, not the invariant's (a caller's own hung sink still holds evaluation)"

requirements-completed: [AUD-05, XC-02]

duration: 20min
completed: 2026-11-10
status: complete
---

# 14-06 — Phase 14's spec records

## Decision applied

`_DECISIONS.md`, 14-01 T1: **`A interrupt remove`** — "5 s overridable `storeCallTimeout` per store call; script union
gains `Interrupt` (six modes); remove `failWith`/`failStageWith`/`failCommitWith` (Breaking)". Quoted verbatim in
ADR-QD-126's Decision section. Route A, so the ADR has no "Decided, not built" subsection; C is under Alternatives as
deferred.

## Ids

- Re-checked free at the phase base `b042e56` (`git grep -w` over `spec packages .changeset AGENTS.md`): ARCH-62,
  ADR-QD-126, CCR-QD-404, BEH-QD-379, BEH-QD-380 — no hits; no `spec/decisions/126-*` before this plan.
- Used: ADR-QD-126, CCR-QD-404, BEH-QD-379, BEH-QD-380 (ARCH-62 already cited by 14-03/14-05).
- Reserved and unused (stated in CCR-QD-404's row): BEH-QD-381–388, INV-QD-265–269.

## Task 1 — ADR-QD-126 and the two amendments (`375b3f7`)

- `spec/decisions/126-an-audit-store-call-has-a-deadline.md` (Document ID `QADI-ADR-126`, Rev 1.0): Context (the hang
  probe, ADR-QD-044 / BEH-QD-187 / INV-QD-035, the RED tests, the 11 hand layers and `driveExit.ts`'s table); Decision
  table D-02..D-07 incl. "not core's registry" and "legacy options removed (Breaking)", plus the `Duration.zero` pin;
  Consequences (hang reported as a failure — cites 14-04's Never rows; the uninterruptible-adapter limit; slow-but-healthy
  store now fails; worst case three deadlines per record); Alternatives (B, C deferred, joining core's registry, keeping
  the legacy options).
- `index.yaml` row appended. ADR-QD-044 Rev 1.2 and ADR-QD-056 Rev 1.13 amendment blockquotes, via `spec-revise.mjs`.

## Task 2 — behaviours, invariant, traceability, CCR (`1744e38`)

- `33-audit-pipeline.md` Rev 1.18: BEH-QD-249 fence gains `readonly storeCallTimeout?: Duration.Input;`; BEH-QD-251 gains a
  REQUIREMENT and the D-04 paragraph; new BEH-QD-379 (requirements, compiled fence
  `AuditDecisionSinkLive({ storeCallTimeout: "2 seconds", failureThreshold: 3 })` over a `Never` trail, the Never-row
  evidence, the latency bound, the `Duration.zero` pin, the uninterruptible-adapter limit) and BEH-QD-380 (the union, `call`
  indexing, `undefined` is Ok, Fail builds the port's error, call logs, a compiled fence, the three removed options and
  the two budgets, the forged-handle rule).
- `invariants.md` Rev 1.94: INV-QD-035 note.
- `traceability.md` Rev 1.136: §1 33's range `…, BEH-QD-379–380` with the new source files; INV-QD-035 row names the audit
  deadline and `AuditSinkDeadline.test.ts`; ADR-QD-126 §3 row (incl. `check-house-style.mjs`'s `PORT_DOUBLE_BUDGET` audit
  errors and `AUDIT_HAND_LAYER_BUDGET`); §4 rows added for `AuditSinkDeadline.test.ts`, `AuditPortReply.test.ts`,
  `AuditPortReply.tst.ts`; the doubles' tests, `Metrics.test.ts` and the exit-matrix row (with `driveExit.ts`) updated.
- `README.md` Rev 1.137: CCR-QD-404 row after CCR-QD-403, listing every doc and revision of the phase so far (overview
  1.81/1.82 from 14-02/14-05). 14-07 appends its own revisions and the changeset to this row.

## Deviations

- ADR-QD-044's amendment blockquote sits after the consequence it amends (beside the existing CCR-QD-189 amendment), not
  at the top of the body, matching how that ADR already carries amendments. ADR-QD-056's sits after the doubles paragraph.
- The traceability ADR row was not in the plan's list; `decisions -> traceability` in `spec:verify` requires one.
- No mutation run: this plan changes no source file. The final per-file compare is 14-07's (compare only files with
  mutants; `AuditPortReply.ts` has none).

## Gate results

- `node scripts/spec-revise.mjs --check --date 2026-11-10` ✓
- `pnpm spec:verify:strict` ✓ 21/21 (CCR register coverage green again); `pnpm spec:verify` ✓
- `pnpm spec:examples` ✓ 105 blocks (the two new fences compile); `pnpm spec:api` ✓ 886; `pnpm spec:claims` ✓;
  `pnpm spec:gates` ✓; `pnpm lint:style` ✓
- Plan greps ✓ (ADR-QD-126 in index/044/056, `QADI-ADR-126`, `## BEH-QD-379`, `## BEH-QD-380`, `CCR-QD-404`, `storeCallTimeout`)

## Deferred to 14-07

- The changeset: `@qadi/audit` minor for `storeCallTimeout`, Breaking for the removed `failWith`/`failStageWith`/
  `failCommitWith` (replacement `write: () => AuditPortReply.Fail({ cause })`; a commit Fail carries the staged entry).
- README and website `capabilities.md` mentions of `storeCallTimeout`; an overview row if gate 13 asks.
- The PROJECT.md Key Decisions row (D-05 revisits the v1.0 "audit doubles stay hand-written" line).
- The final per-file mutation compare and `pnpm check:pr`; append 14-07's revisions to CCR-QD-404's row.
