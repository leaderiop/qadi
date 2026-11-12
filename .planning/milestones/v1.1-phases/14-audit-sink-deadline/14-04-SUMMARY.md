---
phase: 14-audit-sink-deadline
plan: 04
subsystem: audit
tags: [audit, test-doubles, scripted-port, exit-matrix, mutation]

requires: ["14-02", "14-03"]
provides:
  - "No audit test builds an `AuditTrailPort`/`AuditStagingPort` layer by hand (`Layer.succeed(Audit(Trail|Staging)Port` in packages/audit/test: 11 → 0)"
  - "`driveExit.ts` scripted by `AuditPortReply` values; `Mode`/`failOrDie`/`healthyEntry` deleted"
  - "Hung-store rows in the exit matrix (3) and the lost-label table (4), each expecting what its `Fail` twin expects"
  - "No `failWith`/`failStageWith`/`failCommitWith` call in the four files this plan owns, so 14-05 can remove the options without touching them"
affects: [14-05, 14-06, 14-07]

plan_head_before: 1169dd4
actuals:
  tokens: 70000
  tasks: 3
  commits: 3

key-files:
  created:
    - .planning/phases/14-audit-sink-deadline/14-04-assert-base.txt
  modified:
    - packages/audit/test/driveExit.ts
    - packages/audit/test/AuditWriteExits.test.ts
    - packages/audit/test/Metrics.test.ts
    - packages/audit/test/AuditDecisionSinkLive.test.ts

key-decisions:
  - "script_union six (14-01, `_DECISIONS.md`: `A interrupt remove`): `Interrupt` exists, so the self-interrupting adapter (:476) is scripted too. No hand layer remains, so 14-05's allow-list starts empty"
  - "driveExit sets `storeCallTimeout: \"5 seconds\"` explicitly and, only when a reply is `Never`/`Latch`, forks the record, adjusts the TestClock by 6 s and joins; the non-hanging path is unchanged"
  - "The JSON-text store (:260) is a `write` script that runs `JSON.stringify(entry)` and answers `Fail({ cause })` on a throw, so the store still fails (and the breaker still counts) exactly when the hand layer did; the rows are `written().map(JSON.stringify)`"
  - "The per-call latch test (:497) keys latches by the script's `call` index, as the hand layer keyed them by attempt count"

requirements-completed: []

duration: 20min
completed: 2026-11-10
status: complete
---

# 14-04 — Every broken audit store in the tests is a reply script

## Decision applied

`_DECISIONS.md`, 14-01 T1: **`A interrupt remove`**: "5 s overridable `storeCallTimeout` per store call; script union
gains `Interrupt` (six modes); remove `failWith`/`failStageWith`/`failCommitWith` (Breaking)". With `script_union: six`,
the `:476` self-interrupting adapter is `write: () => AuditPortReply.Interrupt()`. **No hand layer is left.**

## What moved

| Was | Now |
|-----|-----|
| `driveExit.ts` `Mode`, `failOrDie`, trail + staging `Layer.succeed`, `healthyEntry`, `rows` array | `ExitSpec.stage/write/commit: AuditPortReply`; `AuditTrailPortTest({ write })` (target → `spec.write`, anything else → `Fail({ cause: "trip" })`); `AuditStagingPortTest({ stage, commit })`; `rows` = `trail.written().filter(isTarget).length` |
| Row specs `"ok"`/`"fail"`/`"die"` | `Ok()`, `Fail({ cause: "offline" \| "stage offline" \| "commit offline" })` (the hand layer's causes), `Die({ defect: new Error("port bug") })` |
| Metrics.test.ts `brokenTrail` (`Effect.die`) and 4 `failWith` | `write: () => Die(...)` / `write: () => Fail({ cause: "offline" })` (one conditional on `fail-` ids) |
| Sink test :260 JSON-text store | `write` script: `JSON.stringify(entry)`, a throw → `Fail({ cause })` |
| :316 half-open probe | `call < 5 ? Fail : call === 5 ? Latch(probeStarted) : Ok` |
| :390 + :398 hanging stage | trail `call < 5 ? Fail : Ok`; staging `stage: probe → Latch(stageStarted)` |
| :444 failed-probe pair | typed `[label, AuditPortReply]` table (`Fail` / `Die`); `call < 5 ? Fail : call === 5 ? reply : Ok` (the `as const` went with it) |
| :476 self-interrupting adapter | `write: () => Interrupt()` |
| :497 per-call caller latches | `write: (_e, call) => started[call] ? Latch : Ok` |
| :643 dying trail | `write: () => Die({ defect: new Error("trail bug") })` |
| 11 `failWith` + 2 `failStageWith` in the sink test | `write`/`stage` scripts returning `Fail` with the same cause |
| hand-kept `writeAttempts` (6 tests) | `calls().length` |

The tracer layer at the old :810 is not an audit port and is unchanged.

### New hung-store rows

- AuditWriteExits.test.ts: `unwired, write never settles` → `WriteFailed.NotWired`; `wired, commit never settles` →
  `Written.CommitFailed`; `wired, stage never settles, write ok` → `Written.StageFailed`. Each runs the same assertions
  as its `Fail` twin (path, hook calls, rows, every writes/staging label, lost count, log line), and they pass, so a
  hang is reported the way a failure is (T-14-11).
- Metrics.test.ts lost-label table: `unwired, write never settled` → `write_failed/not_wired`;
  `wired, stage never settled and write failed` → `write_failed/failed`; `wired, staged, write never settled` → none;
  `written, commit never settled` → none.

## Spot-check mutations (local, each reverted; `packages/audit/src` clean afterwards)

| Mutation | Moved test(s) that failed |
|----------|---------------------------|
| M1 stage unbounded | exit row `stage never settles`; lost row `stage never settled and write failed` |
| M2 commit unbounded | exit row `commit never settles`; lost row `commit never settled` |
| M3 write unbounded | exit row `write never settles`; lost rows `write never settled` (unwired, wired) |
| M4 a self-interrupt is not recorded as a failure (`CircuitBreaker.attempt`) | `an adapter that interrupts itself … trips the breaker` |
| M5 a defect is not recorded as a failure | `half-open probe whose write fails with a defect`; Metrics `trips on a write defect (ticket #47)` |
| M6 a probe claim is not released on failure exit (`withPermit`) | both interrupted-probe tests (:316, :390) |
| M7 the raw (cyclic-cause) record reaches the store (`encodeAuditEntry`) | `five poisoned Failed records do not trip the breaker for a JSON-text store` |
| M8 a caller's interruption is recorded as a failure | `a caller's interruption of a Closed-state write is not a store failure` |

## Assertion counts (Task 3.1)

```
packages/audit/test/AuditDecisionSinkLive.test.ts 82 -> 82
packages/audit/test/Metrics.test.ts 22 -> 22
packages/audit/test/driveExit.ts 0 -> 0
packages/audit/test/AuditWriteExits.test.ts 16 -> 16
```

The matrix files' counts are lines in a loop, so the 7 new rows add test cases (378 vs 371) rather than lines.

## Mutation (XC-05, Task 3.2)

`pnpm exec stryker run stryker.audit.mjs --mutate <the six files>`. Done in 23 s; 299 killed, 34 survived, 4 no coverage.

```
packages/audit/src/AuditDecisionSinkLive.ts 98.04 100.00 ok
packages/audit/src/AuditTrailPortTest.ts 100.00 100.00 ok
packages/audit/src/AuditStagingPortTest.ts 100.00 100.00 ok
packages/audit/src/CircuitBreaker.ts 80.51 80.51 ok
packages/audit/src/AuditPortReplyInterpreter.ts 100.00 100.00 ok
```

`AuditPortReply.ts` produces no mutants (types plus one `Data.taggedEnum()` call; 14-02 recorded the same), so Stryker
leaves it out of `files` and the one-liner prints `missing` and exits 1 when it is listed. That is not a drop. The
comparison above is the same one-liner over the five files that have mutants. 14-06/14-07 reuse the one-liner, so
they should list only those five, or treat a file with no mutants as passing.

## Commits

- `8b90958` test(14-04): drive the exit matrix with reply scripts; add the hung-store rows
- `cb0d0cd` test(14-04): describe every broken store in the sink test with a reply script

## Deviations

- **Order:** Metrics.test.ts's `brokenTrail` and `failWith` calls (Task 2 items) were converted in the Task 1 commit,
  since Task 1 already rewrote that file's row table.
- **[Rule 3, verify command]** The Task 3 one-liner, run as written, exits 1 on `missing packages/audit/src/AuditPortReply.ts`
  (no mutants, see above). It was run again over the five files that have mutants, and that run exits 0.
- The lost-label table gained 4 `Never` rows, not 3. A `Never` stage has no `Fail` twin there on its own, so it is paired with a failed
  write, like the existing `stage and write failed` row. A `Never` write was added both unwired and wired-and-staged, matching
  the table's two write-failure rows.

## Gate results

- `pnpm vitest run --project audit packages/audit/test/AuditWriteExits.test.ts packages/audit/test/Metrics.test.ts` ✓ 41 tests
- `pnpm vitest run --project audit` ✓ 20 files, 378 tests
- `pnpm exec tsc -p tsconfig.test.json` ✓; `pnpm lint:style` ✓ (428 files clean); `pnpm exec oxlint packages/audit` ✓
- Task 1 grep gate ✓ (no `export type Mode`, no `failOrDie`, no hand layer in driveExit, `AuditPortReply.Never` in the matrix)
- Task 2 grep gate ✓: hand layers in the four files 0 (≤ 1 allowed), no `failWith`-family call; packages/audit/test as a whole: 0 hand layers
- Task 3 assertion-count gate ✓; mutation comparison ✓ (above)

## Deferred

- **14-05:**
  - Remove `failWith`/`failStageWith`/`failCommitWith` and the "script wins" branch. They are still used, and only by
    the doubles' own tests: `AuditTrailPortTest.test.ts` (:24-64), `AuditStagingPortTest.test.ts` (:63-99, :301-312),
    `AuditPortReply.test.ts` (:162-168).
  - Extend `PORT_DOUBLE_BUDGET` to `packages/audit/test` with an **empty** allow-list: no hand layer remains. Update
    AGENTS.md §6 in the same change.
- **14-06:**
  - BEH-QD-379/380, the BEH-QD-251 amendment, the INV-QD-035 note, ADR-QD-126, CCR-QD-404 and traceability. These can cite the new
    `Never` exit rows as evidence that a hang has the same outcome as a failure.
  - Record the `Duration.zero` pin and the uninterruptible-adapter limit.
- **14-07:**
  - The changeset: minor for `storeCallTimeout`, Breaking for the removed options.
  - The README and website `capabilities.md` mention, overview rows if gate 13 needs them, and the PROJECT.md D-05 decision row.
  - The final per-file mutation compare (mind the `AuditPortReply.ts` "missing" note above), then `pnpm check:pr`.
