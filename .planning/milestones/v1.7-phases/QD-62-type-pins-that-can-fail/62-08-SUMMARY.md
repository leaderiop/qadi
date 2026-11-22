---
phase: QD-62-type-pins-that-can-fail
plan: 08
subsystem: process
tags: [close-sweep, merge-gate, requirements, mutation-record]
phase_base: 4cab2e74afd9487e19d9f025dd7a6436e459ba5c
plan_head_before: 0261da35fff7ca55244a331e7bc6e6c11a5e0216
plan_head_after: 01e1c9e4c43dd4f2fbe2f6bfd12c744508490427
requires: [62-07]
provides:
  - "close scan: 13 of 13 checks green over phase_base..HEAD"
  - "pnpm check:pr green on the phase's final tree (16 of 17 steps)"
  - "62-mutation-base.json: empty mutation scope (WX-05)"
  - "REQUIREMENTS.md: PIN-01..05 Complete; WX-01..07 stay Pending"
affects: []
tech-stack:
  added: []
  patterns: ["one scratch scan proves every cross-cutting rule over the whole phase range"]
key-files:
  created:
    - .planning/phases/QD-62-type-pins-that-can-fail/62-mutation-base.json
  modified:
    - .planning/REQUIREMENTS.md
decisions:
  - "The close scan's leak check reads added word runs, not added whole lines (Rule 3 deviation below)"
requirements: [PIN-02, PIN-03, PIN-04, PIN-05]
metrics:
  duration: ~30min
  completed: 2026-11-20
status: complete
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
---

# Phase QD-62 Plan 08: Close sweep Summary

The whole phase range `phase_base..HEAD` passes all 13 close checks, `pnpm check:pr` is green on the final tree, the mutation record states an empty scope, and PIN-01..05 are Complete. WX-01..07 stay Pending because they span every v1.7 phase. Nothing was released, published, tagged or pushed, and Stryker was not run.

## Close scan

`node <S>/close-scan.mjs 4cab2e74afd9487e19d9f025dd7a6436e459ba5c` (scratch script, never committed):

```
ok   no packages/*/src change since phase_base
ok   no changeset added
ok   no tag on the phase's commits
ok   no release or version commit
ok   no forbidden construct added (15 code file(s) scanned)
ok   no decision id, plan id or phase number added outside .planning (933 added line(s))
ok   house-style clean, 66 type-test files
ok   budget table 28 rows, 85 callable, 9 constructable: 28 rows, 85, 9
ok   939 exports documented
ok   gate 11: 25 steps
ok   verify-traceability --strict
ok   both tstyche passes green on 66 files: exit 0, 2 pass(es) of 66
ok   no probe or flip copy left
close-scan: 13 of 13 check(s) green
```

## Diff review

Read `git diff 4cab2e74 -- '*.mjs' '*.ts' '*.tsx' ':(exclude).planning'` (15 files, 688 insertions, 23 deletions). Every added line holding `as`, `any`, `switch`, `async`/`await`, `!`, `Record<` or `Stryker` was inspected: each is an `import type * as X` rename, a comment or JSDoc text, a message string, or a `Record<string, { … }>` type in a JSDoc (not `Record<string, unknown>`). No file adds a construct split across lines or inside a regex literal that the per-line scan cannot see, and none adds `Stryker disable`.

| File | Reading |
| --- | --- |
| `packages/audit/test/AuditPortReply.tst.ts`, `AuditWriteOutcome.tst.ts` | positive twins only; `import type * as` rename |
| `packages/core/test/DecisionCache.tst.ts`, `DecisionLog.tst.ts`, `DecisionStream.tst.ts`, `PortAccess.tst.ts`, `Qadi.tst.ts`, `WalkEnvironment.tst.ts`, `Explanation.tst.ts`, `Matcher.tst.ts` | twins and the reason-stated DecisionLog pin; no forbidden construct |
| `packages/core/test/FloatingEffectPins.tst.ts` | characterisation; `any` and `as` appear only in comments and strings |
| `packages/devtools/test/model/DiagnosticsStore.tst.ts`, `packages/http/test/RequirePermission.tst.ts` | twins only |
| `scripts/check-house-style.mjs` | budget, table, control and drift checks; the one regex-literal reading is flagged with a `shortcut:` comment in the file |
| `scripts/run-tstyche.mjs` | two-pass runner; fixed argv, no shell |

## Edge coverage

| # | Requirement | Category | Disposition | Evidence |
| --- | --- | --- | --- | --- |
| 1 | PIN-02 | adjacency | explicit | 62-05 `red-drift.mjs`, `## RED evidence` |
| 2 | PIN-02 | empty | explicit | 62-05 K7, `## RED evidence` |
| 3 | PIN-02 | ordering | explicit | 62-05 K7, `## RED evidence` |
| 4 | PIN-04 | adjacency | explicit | 62-05 `red-control.mjs`, `## RED evidence` |
| 5 | PIN-04 | empty | explicit | 62-05 `red-control.mjs`, `## RED evidence` |
| 6 | PIN-04 | ordering | explicit | 62-05 K5, `## RED evidence` |
| 7 | PIN-05 | empty | explicit | 62-04 `red-pin-budget.mjs`, `## RED evidence` |
| 8 | PIN-05 | encoding | explicit | 62-04 `red-pin-budget.mjs`, `## RED evidence` |
| 9 | WX-01 | adjacency | explicit | `## Merge gate`: 16 of 17 steps; close scan gate 11 at 25 steps |
| 10 | WX-01 | empty | explicit | `## Merge gate`: exit status and the `ran 16 of 17 steps` line both read |
| 11 | WX-01 | ordering | explicit | close scan `gate 11: 25 steps` (`dod-table: 25 step(s) match pnpm check`) |
| 12 | WX-02 | adjacency | explicit | 62-07 `## Revisions written` |
| 13 | WX-02 | empty | explicit | 62-07 Task 1 verify, `## RED evidence` |
| 14 | WX-02 | encoding | explicit | 62-07 `## RED evidence` (checks 3a and 7) |
| 15 | WX-02 | ordering | explicit | 62-07 `## RED evidence` |
| 16 | WX-03 | adjacency | explicit | close scan `939 exports documented` |
| 17 | WX-03 | empty | explicit | close scan `no packages/*/src change` |
| 18 | WX-03 | encoding | explicit | close scan `no packages/*/src change`; `spec/overview.md` not in the diff |
| 19 | WX-03 | ordering | explicit | close scan `no packages/*/src change` |
| 20 | WX-04 | adjacency | explicit | close scan `no forbidden construct added` (module syntax blanked, exported declarations scanned) |
| 21 | WX-04 | empty | explicit | close scan, per-line comparison with each file's `phase_base` text; `## Diff review` |
| 22 | WX-04 | encoding | explicit | close scan, `blank` reads template interpolations as code |
| 23 | WX-04 | ordering | explicit | 62-04 Task 1 (budget and table in one commit), Task 2 `[not-callable-pin-table]` |
| 24 | WX-05 | boundary | explicit | `## Merge gate`: coverage step inside `check:pr` passes; no `packages/*/src` change |
| 25 | WX-05 | precision | explicit | no `packages/*/src` line changed; `check:pr` coverage step green |
| 26 | WX-05 | concurrency | explicit | `62-mutation-base.json` (empty scope); Stryker not run; `check:pr` ran alone |
| 27 | WX-06 | adjacency | explicit | 62-04..62-06 `## RED evidence` |
| 28 | WX-06 | empty | explicit | 62-01..62-07 `## RED evidence` |
| 29 | WX-06 | ordering | explicit | 62-01..62-07 `## RED evidence` (files hashed or porcelain-checked) |
| 30 | PIN-04 | concurrency | backstop | the checks read the tree once per run and keep no state; steps run one after another |
| 31 | PIN-05 | concurrency | backstop | the budget walk reads each file once per run |
| 32 | PIN-01 | assumption | assumption (flagged) | see Flagged for review |
| 33 | PIN-03 | assumption | assumption (flagged) | see Flagged for review |
| 34 | WX-07 | assumption | assumption (flagged) | see Flagged for review |

## Flagged for review

- **PIN-01**: the characterisation pins the reading of tstyche 7.2.5 (TypeScript 6.0.3) with @effect/language-service 0.87.5 only. Another version may read differently; the file is built to fail first when it does. Not verified against any other version.
- **PIN-03**: `Parameters<typeof makeDecisionLog>[0]` reads the one signature `makeDecisionLog` has. An added overload would make the pin read the last one only (62-03 `## Overloads` records the state at planning).
- **WX-07**: the leak scan catches a decision id, plan id or phase number in the spellings this repository uses (`D-NN`, `PIN-0N`/`WX-0N`, `62-0N`, `Phase 62`, `QD-62`); another spelling would pass it. "Nothing released" is checked by tags, added changesets and commit subjects, not against the registry.

## Merge gate

`pnpm check:pr < /dev/null` ran once, alone, after Task 1's commit: exit status 0. The log has 16 `[run-check N/16]` step lines, the last being `[run-check 16/16] pnpm spec:publish`, and ends:

```
publish-status: 9 package(s) and 6 document(s) agree on version (0.12.0)

run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).
```

## Requirements

PIN-01..PIN-05 are `- [x]` and `Complete` (PIN-01 was already ticked; PIN-02..05 ticked here, 4 checkboxes and 4 table rows). WX-01..WX-07 remain Pending. The orchestrator's earlier revert of 62-01's premature WX-04..07 and PIN-02 ticks (`ba490bfd`) is expected history, not a leak.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Leak check read added whole lines, not added words**
- **Found during:** Task 1, first close-scan run
- **Issue:** The scan printed `close-scan: 12 of 13 check(s) green`. The one FAIL was the leak check (974 added lines). The match was the single long Change History row in `spec/README.md`, which 62-07 prefixed with `1.259 … CCR-QD-453 registered`. Git counts the whole row as added, and the row's old text holds `ARCH-20 D-20-b superseded` (2 occurrences) and `D-01 approved` (1), all present at `phase_base`. No other file matched, and no token the phase added matched the leak pattern.
- **Fix:** Changed only the leak check's input: it now reads the added word runs of `git diff --word-diff=porcelain <phase_base> -- . ':(exclude).planning'` instead of `git diff -U0` added lines. The `LEAK` regex and every other check are unchanged. Authorised by the orchestrator after an independent check (933 added word runs, 0 matching `LEAK`).
- **Result:** `close-scan: 13 of 13 check(s) green` (933 added word runs scanned).
- **Files modified:** scratch `close-scan.mjs` only; nothing in the repository.
- **Commit:** none (scratch)

## Known Stubs

None.

## Deferred / out of scope

- `pnpm lint` reports one warning, `scripts/run-tstyche.mjs:40 eslint(no-control-regex)`, from the plan-verbatim colour regex. Lint exits 0.
- `scripts/spec-revise.mjs` drops the first positional argument when `--date` is omitted. Pre-existing; 62-07 worked around it and it was not fixed.

## Self-Check: PASSED

- `62-mutation-base.json` found, equals the plan's block with `phase_base` filled in.
- Commits `1bf8ab92` (mutation record) and `01e1c9e4` (PIN-01..05 complete) are ancestors of HEAD.
