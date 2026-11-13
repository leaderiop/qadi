---
phase: 14-audit-sink-deadline
plan: 03
subsystem: audit
tags: [audit, decision-sink, circuit-breaker, deadline, timeout]

requires: ["14-01", "14-02"]
provides:
  - "`AuditDecisionSinkOptions.storeCallTimeout?: Duration.Input` (default 5 s, `Duration.infinity` opts out), applied to stage, write and commit separately"
  - "`packages/audit/test/AuditSinkDeadline.test.ts` GREEN on scripted doubles: 14-01's five regressions plus ten boundary tests"
affects: [14-04, 14-05, 14-06, 14-07]

plan_head_before: fa6d970
actuals:
  tokens: 60000
  tasks: 3
  commits: 2

key-files:
  created: []
  modified:
    - packages/audit/src/AuditDecisionSinkLive.ts
    - packages/audit/test/AuditSinkDeadline.test.ts

key-decisions:
  - "Route A (14-01 `d02_outcome: A`, `_DECISIONS.md`: `A interrupt remove` — 5 s overridable `storeCallTimeout` per store call): the option is optional; no caller changes"
  - "One private `bounded(call, entry, StoreError)` builds the port's error in one place from the error class, rather than one `onTimeout` arrow per call site: `WriteFailed`/`StageFailed` carry no cause, so per-site arrows would have been unkillable mutants"
  - "The timeout cause is `new Cause.TimeoutError(\"audit store call did not settle within <Duration.format>\")`; the input is decoded once with `Duration.fromInputUnsafe`, the same contract `CircuitBreaker.ts`'s `Duration.toMillis(resetTimeoutMs)` already has"

requirements-completed: [AUD-01, AUD-02, AUD-03, XC-06]

duration: 30min
completed: 2026-11-10
status: complete
---

# 14-03 — Every audit store call has a deadline, and a deadline is a failed attempt

## Decision applied

`_DECISIONS.md`, 14-01 T1: **`A interrupt remove`** — "5 s overridable `storeCallTimeout` per store call; script union
gains `Interrupt` (six modes); remove `failWith`/`failStageWith`/`failCommitWith` (Breaking)". 14-01's frontmatter
records `d02_outcome: A`, `script_union: six`.

## Final option shape

```ts
readonly storeCallTimeout?: Duration.Input; // default Duration.seconds(5); Duration.infinity opts out
```

Beside `resetTimeoutMs` in `AuditDecisionSinkOptions`, with the doc comment the plan asked for: summary line, then
ARCH-62/ADR-QD-126, the default and opt-out, deadline = failed attempt vs. caller interruption (BEH-QD-251), and the
`Effect.timeoutOrElse` limit shared with core's `…TimingOut` ports (an uninterruptible adapter is waited for; T-14-09).

- `stage`: `Effect.exit(bounded(stagingPort.stage(entry), entry, AuditStagingError))` → `StageFailed`.
- `commit`: the thunk is `bounded(stagingPort.commit(handle), entry, AuditStagingError)` → `CommitFailed { cause }`.
- `write`: `admitted.attempt(bounded(trailPort.write(entry), entry, AuditWriteError))` — inside `attempt`'s argument,
  so `CircuitBreaker.ts` records the deadline like any typed failure. `CircuitBreaker.ts` is unchanged.

## `Duration.zero` (observed, pinned)

Effect 4.1.2 starts the store call (a `Latch` reply's latch is open afterwards) and the record settles at once as
`WriteFailed`, with no clock adjustment. Pinned in
`storeCallTimeout: Duration.zero (pinned, not chosen): the call starts, then fails at once`.

## Tasks

1. **Route** — `d02_outcome: A`; optional option with a 5 s default. No caller list (that is route B only).
2. **Bound the three calls** — first moved 14-01's hand-written ports onto `AuditTrailPortTest({ write })` /
   `AuditStagingPortTest({ stage | commit })` scripts (`Never`; the probe test scripts `call < failureThreshold ? Fail : Never`)
   and re-ran: still `Tests 5 failed (5)`, same five assertion messages as 14-01. Then the source change: all five GREEN.
   Added: the commit-cause test (the `AuditStagingError` is for the staged entry, its cause `Cause.isTimeoutError` with
   message `audit store call did not settle within 2s`) and a healthy store under the default and a 1 ms deadline →
   `Written/Committed`. The write's own `AuditWriteError` is not observable (`WriteFailed` carries no cause); it is
   built by the same `bounded` line the commit test exercises.
3. **Boundaries** — caller interruption of a `Latch` write inside the deadline is not counted (`failureThreshold: 1`,
   next record `Written`); caller interruption of a half-open probe releases the claim (`WriteFailed, Skipped, Written`
   after the next reset window); `Interrupt` reply is a failed attempt (`WriteFailed`, then `Skipped`);
   `Duration.infinity` leaves a `Never` write pending past one hour; `Duration.zero` pinned as above; stage and commit
   deadlines change only the staging status and leave the breaker closed.

## Commits

- `a2fba33` feat(14-03): bound every audit store call by storeCallTimeout (default 5 s)
- `afdc461` test(14-03): pin the deadline's boundaries

## Deviations

- **[Rule 1 — mutation]** The plan's `bounded(call, onTimeout: () => E)` with one arrow per call site was replaced by
  `bounded(call, entry, StoreError)`, constructing `new StoreError({ entry, cause })` once. Same behaviour; it avoids
  two arrow/object-literal mutants per uncaused outcome (`WriteFailed`, `StageFailed`) that no test could observe.
- The `TimeoutError` message uses `Duration.format` on the decoded deadline (the plan allowed either a formatter or a
  fixed message).

## Gate results

- `pnpm vitest run --project audit` (nothing excluded) ✓ 20 files, 371 tests; `AuditSinkDeadline.test.ts` 15/15.
- `pnpm exec tsc -p tsconfig.test.json` ✓; `pnpm lint:style` ✓ (428 files clean); `pnpm exec oxlint packages/audit` ✓.
- Plan grep gate ✓: `storeCallTimeout` ≥ 3, `Effect.timeoutOrElse` ≥ 1, `git diff --quiet HEAD -- CircuitBreaker.ts`;
  key link `admitted.attempt(bounded` present.
- XC-05 scoped Stryker (`stryker.audit.mjs --mutate AuditDecisionSinkLive.ts,CircuitBreaker.ts`):

  | File | Base | Now | |
  |------|-----:|----:|--|
  | AuditDecisionSinkLive.ts | 98.04 (50/51) | 100 (58/58) | up: the base's line-142 `CommitFailed({ cause })` survivor is now killed |
  | CircuitBreaker.ts | 80.51 | 80.51 | unchanged (157 killed, 34 survived, 4 no coverage) |

## Deferred

- 14-04: move the 11 hand-written layers in the other audit tests (incl. `AuditDecisionSinkLive.test.ts`'s
  `Effect.never`/`Latch`/`Effect.interrupt` layers) and `driveExit.ts`'s mode table onto the scripts.
- 14-05: remove `failWith`/`failStageWith`/`failCommitWith` and the "script wins" branch; extend `PORT_DOUBLE_BUDGET`.
- 14-06: BEH-QD-379/380 (deadline behaviour, incl. the `Duration.zero` pin and the uninterruptible-adapter limit),
  the BEH-QD-251 amendment, INV-QD-035 note, ADR-QD-126, CCR-QD-404, traceability.
- 14-07: README / website `capabilities.md` mention of `storeCallTimeout`, `spec/overview.md` if the option needs a row,
  the changeset (minor for `storeCallTimeout`, Breaking for the removed options), PROJECT.md decision row, final
  per-file mutation compare, `pnpm check:pr`.
