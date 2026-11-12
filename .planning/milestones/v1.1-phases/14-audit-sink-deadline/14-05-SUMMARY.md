---
phase: 14-audit-sink-deadline
plan: 05
subsystem: audit
tags: [audit, test-doubles, house-style, budget, breaking]

requires: ["14-04"]
provides:
  - "`AuditTrailPortTest`/`AuditStagingPortTest` without `failWith`/`failStageWith`/`failCommitWith`: the reply scripts are the one way to make a call misbehave"
  - "`PORT_DOUBLE_BUDGET` counts `new AuditWriteError(`/`new AuditStagingError(` in tests, class names read from the audit port modules"
  - "`AUDIT_HAND_LAYER_BUDGET` (empty): a hand-built `AuditTrailPort`/`AuditStagingPort` layer in a test fails `pnpm lint:style`"
affects: [14-06, 14-07]

plan_head_before: 7269fb8
actuals:
  tokens: 45000
  tasks: 2
  commits: 3

key-files:
  created: []
  modified:
    - packages/audit/src/AuditTrailPortTest.ts
    - packages/audit/src/AuditStagingPortTest.ts
    - packages/audit/src/AuditPortReply.ts
    - packages/audit/test/AuditTrailPortTest.test.ts
    - packages/audit/test/AuditStagingPortTest.test.ts
    - packages/audit/test/AuditPortReply.test.ts
    - spec/overview.md
    - scripts/check-house-style.mjs
    - AGENTS.md

key-decisions:
  - "legacy_options remove (14-01, `_DECISIONS.md`: `A interrupt remove`): the three options and the \"script wins\" branch are deleted; Breaking against 0.11.0"
  - "The hand-layer rule is its own test-scope budget beside `portDoubleLines`, not a RULES entry, so the shipped doubles' own `Layer.succeed(AuditTrailPort, …)` in src is not flagged"

requirements-completed: [AUD-04, XC-04]

duration: 15min
completed: 2026-11-10
status: complete
---

# 14-05 — A broken audit store in a test is a reply script, and the gate says so

## Decision applied

`_DECISIONS.md`, 14-01 T1: **`A interrupt remove`**: "5 s overridable `storeCallTimeout` per store call; script union
gains `Interrupt` (six modes); remove `failWith`/`failStageWith`/`failCommitWith` (Breaking)". 14-01 records
`legacy_options: remove`, so this plan ran the `remove` branch.

## Task 1 — the legacy options are gone

Baseline (`git grep` outside `.planning`): the two doubles, their two tests, `AuditPortReply.test.ts` (script-wins
test), `AuditPortReply.ts`'s header comment, and two `spec/overview.md` rows. README, website, examples, features
and the rest of `spec/` had no mention.

- Doubles: options, their two `failure` lines per call and the "wins over …" doc sentences deleted; each script's
  doc now says "`undefined`, or no script at all, is `Ok`". The `if (options?.x !== undefined)` structure is kept.
- Tests deleted, each covered by an existing script test first:

  | Deleted | Covered by |
  |---------|-----------|
  | trail `failWith fails the write instead of recording it` | `AuditPortReply.test.ts` `Fail fails with the port's error … records nothing` |
  | trail `failWith returning undefined … lets that write through` | `call counts 0, 1, 2 …` (Fail, Ok, Die → `written() == [b]`) |
  | staging `failStageWith fails stage without minting a handle` | `a scripted Fail stage … issues no handle` |
  | staging `failCommitWith fails commit, leaving the handle staged` | `a scripted Fail commit carries the entry …` (`staged() == [a, b]`, `committed() == []`) |
  | staging + trail "script wins" tests | the branch no longer exists |

- Kept and renamed: the "options present" tests now pass `{}` (the `options?.write` / `options?.stage` / `options?.commit`
  guard). The trail and staging tests no longer import the error classes.
- `AuditPortReply.ts` header: "once took only a `failWith`-style callback" → "a callback returning a hand-built error".
- `spec/overview.md` rows for both option types say the scripts are the one way; `spec-revise` 1.81 → 1.82.

Audit suite 378 → 372 tests (6 deleted), all green.

## Task 2 — the gate

- `readAuditPortErrorClassNames()` reads `/export class (\w+) extends Data\.TaggedError\(/g` from
  `AuditTrailPort.ts` (→ `AuditWriteError`) and `AuditStagingPort.ts` (→ `AuditStagingError`); an empty parse exits 1
  with `[port-error-list]` (proven on a scratch copy pointed at `AuditPortReply.ts`: rc 1, message names the file).
  `PORT_ERROR_CONSTRUCTION` is the union with core's outage names.
- Final `PORT_DOUBLE_BUDGET` audit entries:
  - `packages/audit/test/helpers.ts: 1` (unchanged, core resolver error)
  - `packages/audit/test/AuditWriteOutcome.test.ts: 1` — "A staging error as a value: the `CommitFailed` cause the
    outcome carries." No other audit test was reported, so 14-04 missed none.
- `AUDIT_HAND_LAYER_BUDGET = {}` with `/\bLayer\.(succeed|sync|effect)\(\s*Audit(Trail|Staging)Port\b|\bAudit(Trail|Staging)Port\.of\(/`,
  collected in the same test-scope branch as `portDoubleLines`, checked in both directions after `PORT_DOUBLE_BUDGET`.
  The `port-double-budget` failure message now also names the audit script form.
- Probe: `packages/audit/test/__probe__.test.ts` with `Layer.succeed(AuditTrailPort, …)`, `AuditStagingPort.of(…)` and
  two hand-built errors → `pnpm lint:style` failed with `[port-double-budget]` (lines 7, 10) and
  `[audit-hand-layer-budget]` (lines 6, 9), 2 violations. Probe deleted. Reverse direction proven on a scratch copy
  declaring `AuditWriteOutcome.test.ts: 1` in `AUDIT_HAND_LAYER_BUDGET` → "declares 1 … found 0". Scratch copies deleted.
- AGENTS.md §6: the `PORT_DOUBLE_BUDGET` paragraph keeps its sentences and gains the audit errors and
  `AUDIT_HAND_LAYER_BUDGET` (ARCH-62, ADR-QD-126). The script's header comment names the ninth budget.

## Commits

- `1824499` feat(14-05)!: remove the audit doubles' failWith, failStageWith and failCommitWith
- `fe8284b` feat(14-05): refuse a hand-built audit port layer or error in tests

## Deviations

- `AuditPortReply.ts`'s header comment and `spec/overview.md` were not in the plan's file list; both named the removed
  options (the plan's Task 1 verify grep covers `packages/audit/src`, and the hand-off asked for the overview wording).
- AGENTS.md cites ADR-QD-126 before 14-06 writes it (the plan asks for that citation).

## Gate results

- `pnpm vitest run --project audit` ✓ 20 files, 372 tests
- `pnpm exec tsc -p tsconfig.test.json` ✓; `pnpm exec oxlint packages/audit` ✓
- Task 1 grep: no `failWith|failStageWith|failCommitWith` in `packages/audit/src`, `packages/audit/test`,
  `packages/audit/README.md`, `apps/website/src/content` ✓ (none anywhere tracked outside `.planning`)
- `pnpm lint:style` ✓ (428 files), red on the probe ✓, probe gone ✓; `AUDIT_HAND_LAYER_BUDGET` in the script and
  AGENTS.md ✓; `AuditTrailPort.ts` in the script ✓
- `pnpm spec:gates` ✓ (25 steps, 139 references); `pnpm spec:api` ✓ (886 exports); `spec-revise --check` ✓
- `pnpm spec:verify:strict`: 20 pass, 1 fail — "CCR register coverage" got an extra `404`. Pre-existing since 14-02
  (overview 1.81 already cited CCR-QD-404); 14-06 registers CCR-QD-404, which clears it.
- XC-05 (`stryker.audit.mjs --mutate` the two doubles + interpreter): AuditTrailPortTest 100 (base 100, 17/17),
  AuditStagingPortTest 100 (base 100, 46/46), AuditPortReplyInterpreter 100 (base 100). `AuditPortReply.ts` has no
  mutants (comment-only change).

## Deferred

- **14-06:** CCR-QD-404 (also clears the `spec:verify:strict` CCR-coverage failure) and ADR-QD-126 (now cited by
  AGENTS.md §6); record the removal of the three options in the CCR/ADR.
- **14-07:** the changeset must mark `@qadi/audit` **major/Breaking** for removing `AuditTrailPortTestOptions.failWith`
  and `AuditStagingPortTestOptions.failStageWith`/`failCommitWith`, naming the replacement
  (`write: () => AuditPortReply.Fail({ cause })`, `stage`/`commit` likewise; the double builds the error from the
  call's entry, so the callers stop constructing `AuditWriteError`/`AuditStagingError`). Note the semantic change for
  `failCommitWith` users: a `commit` script's `Fail` carries the entry staged under the handle. Overview rows for the
  options are already updated (1.82).
