---
phase: 14-audit-sink-deadline
plan: 02
subsystem: audit
tags: [audit, test-doubles, scripted-port, closed-union]

requires: ["14-01"]
provides:
  - "`AuditPortReply` (Ok | Fail | Die | Interrupt | Never | Latch) and the three script types, public from `@qadi/audit`"
  - "`AuditTrailPortTest({ write })`, `AuditStagingPortTest({ stage, commit })` per-call scripts, with `calls`/`stageCalls`/`commitCalls` logs"
  - "The package-private interpreter `packages/audit/src/AuditPortReplyInterpreter.ts` (`answerReply`)"
affects: [14-03, 14-04, 14-05, 14-06, 14-07]

actuals:
  tokens: 70000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A Match arm returning a generic function: wrap it in an identity helper typed with the generic signature (`answer(f: AuditPortAnswer)`)"

key-files:
  created:
    - packages/audit/src/AuditPortReply.ts
    - packages/audit/src/AuditPortReplyInterpreter.ts
    - packages/audit/test/AuditPortReply.test.ts
    - packages/audit/test/AuditPortReply.tst.ts
  modified:
    - packages/audit/src/AuditTrailPortTest.ts
    - packages/audit/src/AuditStagingPortTest.ts
    - packages/audit/src/index.ts
    - packages/audit/test/AuditStagingPortTest.test.ts
    - spec/overview.md
    - .planning/phases/14-audit-sink-deadline/14-mutation-base.json

key-decisions:
  - "script_union six (from 14-01, `_DECISIONS.md`: `A interrupt remove`): the union carries `Interrupt`"
  - "A given script wins outright: when `write`/`stage`/`commit` is set, the legacy `failWith`/`failStageWith`/`failCommitWith` is never consulted"
  - "Commit of a never-issued handle: the script gets the entry of the most recent `stage` call (any reply); a scripted commit before any `stage` call dies, since there is no entry to answer with. Documented on the `commit` option"

requirements-completed: []

duration: 25min
completed: 2026-11-10
status: complete
---

# 14-02 — The audit doubles answer from a per-call script

## Decision applied

`_DECISIONS.md`, 14-01 T1: **`A interrupt remove`** — "5 s overridable `storeCallTimeout` per store call; script union
gains `Interrupt` (six modes); remove `failWith`/`failStageWith`/`failCommitWith` (Breaking)". 14-01's frontmatter
records `script_union: six`, `legacy_options: remove`. So this plan builds the six-mode union and keeps the legacy
options working; 14-05 removes them.

## Exported names (barrel: `export * from "./AuditPortReply.ts"`)

- `AuditPortReply` — type + `Data.taggedEnum` constructors: `Ok | Fail { cause } | Die { defect } | Interrupt | Never | Latch { latch }`.
- `AuditTrailScript = (entry, call) => AuditPortReply | undefined`
- `AuditStageScript = (entry, call) => AuditPortReply | undefined`
- `AuditCommitScript = (handle, entry, call) => AuditPortReply | undefined`
- `AuditTrailPortTestOptions.write`, handle `calls()`; `AuditStagingPortTestOptions.stage`/`.commit`, handle
  `stageCalls()`/`commitCalls()`.

The interpreter `answerReply: (reply) => <A, E>(ok, fail) => Effect<A, E>` lives in
`packages/audit/src/AuditPortReplyInterpreter.ts`, built once with `Match.type<AuditPortReply>().pipe(Match.tagsExhaustive(…))`;
it is not in `index.ts`. Nothing imports `@qadi/core`'s `PortReply`/`PortDescription`/`PortName` (ADR-QD-094).

## Tasks

1. **Tracer** — `AuditPortReply.ts`, the interpreter, the trail double scripted; `AuditPortReply.test.ts` covers
   every mode through the trail double (Never/Latch observed past `TestClock.adjust("1 hour")` via `timeoutOption`).
2. **Staging double** — RED first (10 new tests failed: `stageCalls is not a function`, missing handle→entry, etc.),
   then the implementation; a `Map` from issued handle to its entry makes commit's `Fail` carry the right entry
   (asserted by identity, T-14-06). Tests and implementation landed in one commit.
3. **Export + types + overview** — barrel line, `AuditPortReply.tst.ts` (4 tests, 10 assertions), overview rows
   (two new, two updated), `spec-revise.mjs … --date 2026-11-10` → overview 1.80 → 1.81.

## Commits

- `b5b8c94` feat(14-02): AuditPortReply scripts AuditTrailPortTest's write per call
- `aa0b5c6` feat(14-02): script AuditStagingPortTest's stage and commit per call
- `9f3ae54` feat(14-02): export AuditPortReply, pin its types, name it in spec/overview.md
- `222bf44` test(14-02): kill the staging double's two surviving mutants

## Deviations

- **Verify command fix (Rule 3):** the plan's `--exclude 'packages/audit/test/AuditSinkDeadline.test.ts'` does not
  match (the audit project's root is `packages/audit`), so the RED file still ran. Used
  `--exclude '**/AuditSinkDeadline.test.ts'` instead; later plans should do the same.
- **Mutation run:** `stryker.audit.mjs`'s dry run would include the RED file, so the scoped run used a temporary
  stryker config + vitest config that excluded it (both deleted after, nothing committed). Two survivors in
  `AuditStagingPortTest.ts` (`.at(-1)` → `.at(+1)`, the die message) were killed by tightening tests (`222bf44`).
- **Mutation base:** `AuditPortReplyInterpreter.ts` did not exist at b042e56; its first score (100) is recorded in
  `14-mutation-base.json` so later plans compare against it.
- `spec/overview.md` rows were added here (gate 13 requires them as soon as the export exists), although the hand-off
  listed them under 14-07; 14-07 only needs to revisit them when 14-05 removes the legacy options.

## Gate results

- `pnpm vitest run --project audit … AuditPortReply.test.ts AuditTrailPortTest.test.ts AuditStagingPortTest.test.ts` ✓
- `pnpm vitest run --project audit --exclude '**/AuditSinkDeadline.test.ts'` ✓ 19 files, 356 tests
- `pnpm exec tsc -p tsconfig.test.json` ✓; `pnpm exec oxlint packages/audit` ✓; `pnpm lint:style` ✓; `pnpm circular` ✓
- `pnpm exec tstyche packages/audit/test/AuditPortReply.tst.ts` ✓; `pnpm spec:api` ✓ (886 exports); `spec-revise --check` ✓
- Task 1 grep gate (no `switch`, `Match.tagsExhaustive` present, no core registry import) ✓
- XC-05 scoped Stryker: AuditTrailPortTest 100 (base 100), AuditStagingPortTest 100 (base 100),
  AuditPortReplyInterpreter 100 (new); AuditPortReply.ts has no mutants (types + static constructors).

## Deferred

- 14-03: `storeCallTimeout`; turn `AuditSinkDeadline.test.ts` GREEN (and move its hand ports onto `Never`/`Latch` scripts).
- 14-04: rewrite the 11 hand layers and `driveExit.ts`'s mode table onto the scripts.
- 14-05: remove `failWith`/`failStageWith`/`failCommitWith` (and the "script wins" branch, its tests and overview wording);
  extend `PORT_DOUBLE_BUDGET` to audit tests.
- 14-06: BEH/ADR/INV/CCR-QD-404/traceability records.
- 14-07: changeset (Breaking for the removed options, minor for the script + timeout), PROJECT.md decision row, final mutation compare.
