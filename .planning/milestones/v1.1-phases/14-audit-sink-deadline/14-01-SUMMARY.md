---
phase: 14-audit-sink-deadline
plan: 01
subsystem: audit
tags: [audit, decision-sink, circuit-breaker, deadline, red-test, mutation-base]

phase_base: b042e56
d02_outcome: A
script_union: six
legacy_options: remove
decision_date: 2026-11-10
decision_reason: "A interrupt remove — 5 s overridable `storeCallTimeout` per store call; script union gains `Interrupt` (six modes); remove `failWith`/`failStageWith`/`failCommitWith` (Breaking)"
mutation_baseline:
  packages/audit/src/AuditDecisionSinkLive.ts: 98.04
  packages/audit/src/AuditTrailPortTest.ts: 100
  packages/audit/src/AuditStagingPortTest.ts: 100
  packages/audit/src/CircuitBreaker.ts: 80.51

requires: ["13-13"]
provides:
  - "The recorded D-02/D-05/D-06 outcome every later Phase 14 plan branches on"
  - "Phase base `14-base.txt` (b042e56) and the scoped audit mutation base `14-mutation-base.json`"
  - "`packages/audit/test/AuditSinkDeadline.test.ts`: five RED regression tests for a store call that never settles"
affects: [14-02, 14-03, 14-04, 14-05, 14-06, 14-07]

actuals:
  tokens: 4000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Observe a possibly-hung effect only through `Effect.forkChild(Effect.timeoutOption(eff, \"1 hour\"))` + `TestClock.adjust`, never by joining an unbounded fiber"

key-files:
  created:
    - .planning/phases/14-audit-sink-deadline/14-base.txt
    - .planning/phases/14-audit-sink-deadline/14-mutation-base.json
    - packages/audit/test/AuditSinkDeadline.test.ts
  modified: []

key-decisions:
  - "D-02 = A: a 5 s overridable `storeCallTimeout` per store call (stage, write, commit separately); C (buffered sink) stays deferred"
  - "D-05 = six: the doubles' script is the closed union `Ok | Fail | Die | Interrupt | Never | Latch`"
  - "D-06 legacy options = remove: `failWith`, `failStageWith`, `failCommitWith` are removed (Breaking)"

requirements-completed: [AUD-01, AUD-02, AUD-03, XC-06]

duration: 15min
completed: 2026-11-10
status: complete
---

# 14-01 — The deadline route is decided and a hung store call is pinned RED

`phase_base: b042e56` (`14-base.txt`, written by this plan).

## Task 1 — checkpoint:decision (pre-answered)

`.planning/phases/_DECISIONS.md` answers 14-01 T1 (D-02/D-05/D-06) as:

> `A interrupt remove` — 5 s overridable `storeCallTimeout` per store call; script union gains `Interrupt` (six modes); remove `failWith`/`failStageWith`/`failCommitWith` (Breaking)

So every later plan runs as written for **A**: 14-03 adds `AuditDecisionSinkOptions.storeCallTimeout?: Duration.Input`
(default 5 s, `Duration.infinity` the opt-out) and applies it to stage, write and commit separately; 14-02 builds the
six-mode script; 14-05 removes the three legacy options and its changeset says **Breaking**. No buffer is built
and no follow-up blocker is raised (that was the C branch).

## Task 2 — preconditions, ids, mutation base

- Phase 13 closed: every `13-NN-PLAN.md` has its `13-NN-SUMMARY.md`.
- Reserved ids free at b042e56: `ADR-QD-126`, `CCR-QD-404`, `BEH-QD-379`, `INV-QD-265`, `ARCH-62` have no hit in
  `spec`, `.changeset` or `packages`; no `spec/decisions/126-*` file.
- Scoped Stryker on the untouched tree (`pnpm exec stryker run stryker.audit.mjs --mutate
  packages/audit/src/AuditDecisionSinkLive.ts,…AuditTrailPortTest.ts,…AuditStagingPortTest.ts,…CircuitBreaker.ts`),
  301 mutants, dry run green, then MUTATION-RECORD into `14-mutation-base.json`:

  | File | Score | Killed | Survived | NoCoverage |
  |------|------:|-------:|---------:|-----------:|
  | AuditDecisionSinkLive.ts | 98.04 | 50 | 1 | 0 |
  | AuditStagingPortTest.ts | 100 | 28 | 0 | 0 |
  | AuditTrailPortTest.ts | 100 | 12 | 0 | 0 |
  | CircuitBreaker.ts | 80.51 | 157 | 34 | 4 |

  Survivors (file:line mutator):
  - `AuditDecisionSinkLive.ts:142` ObjectLiteral (`WrittenStaging.CommitFailed({ cause })` → `{}`)
  - `CircuitBreaker.ts`: NoCoverage 303 ArrayDeclaration, 303 BooleanLiteral, 324 ArrayDeclaration, 324 BooleanLiteral;
    Survived 258 ArithmeticOperator, 265 ArithmeticOperator, 298 ObjectLiteral, 299 ArithmeticOperator,
    303 ArrowFunction, 324 ArrowFunction, 327 ArithmeticOperator, 351 ConditionalExpression,
    374 ConditionalExpression ×2, 374 LogicalOperator, 375 BooleanLiteral, 376 ArithmeticOperator,
    378 ConditionalExpression, 383 ConditionalExpression, 387 ConditionalExpression ×4, 387 LogicalOperator,
    387 EqualityOperator ×2, 387 StringLiteral, 406 StringLiteral, 412 ObjectLiteral,
    414 ConditionalExpression ×3, 414 LogicalOperator, 414 EqualityOperator, 414 StringLiteral,
    417 ConditionalExpression ×2, 417 LogicalOperator.

  `reports/` output is not committed.

## Task 3 — RED regression tests (D-01, XC-06)

`packages/audit/test/AuditSinkDeadline.test.ts`, five `it.effect` tests. Ports are hand-written
`Layer.succeed(AuditTrailPort | AuditStagingPort, …)` for now (14-03/14-04 move them onto the scripted doubles);
every record or evaluation is forked under `Effect.timeoutOption("1 hour")` and settled by `TestClock.adjust`, so the
run takes ~3 s. No new option is passed: the clock is advanced 6 s, past A's 5 s default.

`pnpm vitest run --project audit packages/audit/test/AuditSinkDeadline.test.ts` on b042e56 → `Tests 5 failed (5)`:

1. `a trail write that never settles does not stall evaluate` — `evaluate settled with the decision it gives without a sink (INV-QD-035): expected undefined to equal 'Allow'`
2. `with failureThreshold 1, the first hung write opens the breaker and later records are Skipped` — `expected [] to deeply equal [ 'WriteFailed/NotWired', 'Skipped/NotWired', 'Skipped/NotWired' ]`
3. `a hung half-open probe settles and reopens the breaker` — `expected [ 'WriteFailed/NotWired' ] to deeply equal [ 'WriteFailed/NotWired', 'WriteFailed/NotWired' ]`
4. `a hung stage settles as StageFailed and the write still happens` — `expected [] to deeply equal [ 'Written/StageFailed' ]`
5. `a hung commit settles as CommitFailed after a successful write` — `expected [] to deeply equal [ 'Written/CommitFailed' ]`

Each fails on its settle assertion, not on an import or type error: `tsc -p tsconfig.test.json` 0, `oxlint` 0,
`pnpm lint:style` clean.

## Task Commits

1. **Task 1** — no commit (pre-answered checkpoint, recorded here)
2. **Task 2** — `29cf2a3` test(14-01): phase base b042e56 and the scoped audit mutation base
3. **Task 3** — `e50a254` test(14-01): RED a store call that never settles stalls the sink

## Deviations from Plan

- Task 2's commit carries the `test(…)` type although it holds only planning artifacts (`docs(…)` would have fit
  better); left as is rather than rewriting history.
- The test file's comment first tripped `check-house-style.mjs`'s `no-type-assertion` rule (a backtick-quoted list
  read as an `as`); reworded before commit.

## Gate results

- Plan verify, Task 2: Phase 13 closed ✓; frontmatter keys ✓; `14-mutation-base.json` has four numeric scores ✓;
  reserved ids absent ✓; no `packages/` change at the time of the Stryker run ✓.
- Plan verify, Task 3: suite exits non-zero ✓; `Tests  5 failed (5)` ✓; last commit touching the file starts
  `test(14-01): RED` and changes nothing in `packages/audit/src` ✓.

## Next plan

14-02 builds the six-mode script (`Ok | Fail | Die | Interrupt | Never | Latch`). Its verify must exclude
`AuditSinkDeadline.test.ts` (RED until 14-03). Deferred to later plans: BEH-QD-379/380, the BEH-QD-251 amendment,
INV-QD-035 note, ADR-QD-126, CCR-QD-404, traceability (14-06); `spec/overview.md` rows for the reply type (14-02/14-07);
the `@qadi/audit` changeset (minor for `storeCallTimeout`, Breaking for the removed options) and the PROJECT.md
decision row (14-07).
