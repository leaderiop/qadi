---
phase: QD-58-a-stored-record-is-its-envelope-in-memory-too
plan: 09
subsystem: phase-close
tags: [scan, mutation, check-pr, release-check, requirements]
requires:
  - phase: QD-58
    provides: 58-01..58-08, the whole stored-envelope phase
provides:
  - 58-scan.mjs, the close scan, clean on the closing tree
  - the D-16 mutation comparison re-run green
  - pnpm check:pr green (16 of 17 steps, exit 0, coverage thresholds held)
  - STOR-01..STOR-04 complete in REQUIREMENTS.md
affects: []
actuals:
  tokens: 6000
  tasks: 2
  commits: 0
plan_head_before: 88062d98ecd1e973b26c1930ade6516054d4b1c7
plan_head_after: 88062d98ecd1e973b26c1930ade6516054d4b1c7
tech-stack:
  added: []
  patterns: ["a phase closes with a scan fixed before execution, judged over the whole diff and history"]
key-files:
  created:
    - .planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-scan.mjs
  modified:
    - .planning/REQUIREMENTS.md
key-decisions:
  - "The scan's one layout-sensitive substring check was made layout-free (orchestrator-authorised), rather than reformatting a source file"
requirements-completed: [STOR-01, STOR-02, STOR-03, STOR-04, WX-01, WX-02, WX-04, WX-05, WX-06, WX-07]
duration: 6min
completed: 2026-11-19
status: complete
---

# Phase QD-58 Plan 09: The phase close

**The close scan prints `phase scan clean`, the D-16 mutation comparison still holds, `pnpm check:pr` exits 0 and nothing was released, so STOR-01..STOR-04 are marked complete.**

`actuals.commits` is the measured count at SUMMARY write (`plan_head_before..HEAD` is 0): this plan makes no code commit, and its one commit is the `docs(58-09)` close commit that carries this file, `58-scan.mjs`, REQUIREMENTS.md and STATE/ROADMAP.

## Phase scan

`node .planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-scan.mjs`, from the repository root, `phase_base` `b6326514ae59c3ed335d940523d1e43639782be9`:

```
phase scan clean
```

Exit 0. The scan judged 23 commits since `phase_base`: scope, banned constructs net per file, the `switch` and `Effect.fnUntraced` counts, the frozen files, the commit order (`chore(58-01)` alone on `phase_base`, both `test(58-02|03)` before the one `feat(58-04)!`, the evidence commit last), the reservation, the ten ids, and the promised source.

## D-16

`node 58-mutation.mjs compare 58-mutation-static.json` (the static file exists), exit 0. Per file:

```
packages/core/src/DecisionLog.ts 0.9857142857142858 -> 1 (detected 69 -> 66; lost 11, rewritten 5, deleted 6; survivors +0 -1, moved 0)
packages/core/src/DecisionRecord.ts 1 -> 1 (detected 21 -> 17; lost 5, rewritten 0, deleted 5; survivors +0 -0, moved 0)
  static: all 1 new ignored mutant(s) of packages/core/src/DecisionRecord.ts are Killed in .../58-mutation-static.json
packages/core/src/DecisionStream.ts 0.9722222222222222 -> 0.9722222222222222 (survivors +0 -0, moved 0)
packages/core/src/SinkCodec.ts 0.9682539682539683 -> 0.968503937007874 (detected 122 -> 123; lost 3, rewritten 0, deleted 3; survivors +0 -0, moved 0)
  static: all 2 new ignored mutant(s) of packages/core/src/SinkCodec.ts are Killed in .../58-mutation-static.json
packages/devtools/src/model/Source.ts 1 -> 1 (survivors +0 -0, moved 0)
packages/devtools/src/model/Timeline.ts 1 -> 1 (detected 103 -> 107; lost 50, rewritten 4, deleted 46; survivors +0 -0, moved 0)
  static: all 4 new ignored mutant(s) of packages/devtools/src/model/Timeline.ts are Killed in .../58-mutation-static.json
packages/devtools/src/model/TimelineStore.ts 0.9696969696969697 -> 0.9696969696969697 (survivors +0 -0, moved 0)
packages/http/src/DecisionLogHttp.ts 1 -> 1 (survivors +0 -0, moved 0)
WX-05 holds (D-16)
```

The per-line `deleted` rows (the removed stamping, isolation and timeline helpers) are elided here; the full output is reproducible with the command above.

## check:pr

`pnpm check:pr < /dev/null` (alone, no Stryker or other vitest running, no unstaged change under `packages`, `features`, `spec`, `scripts`, `AGENTS.md`, `.changeset`, `apps`, `examples`), about two minutes, exit 0. `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).` Steps:

1. `pnpm typecheck`
2. `pnpm lint` (oxlint, `check-house-style.mjs`)
3. `pnpm circular`
4. `pnpm test:tstyche`: 63 files, 328 tests, 697 assertions passed
5. `pnpm coverage`: 241 files, 5927 tests passed; statements 99.6%, branches 98.43%, functions 99.48%, lines 99.83% (thresholds: core 95%, others 90%)
6. `pnpm test:bdd`: 34 files, 568 tests passed
7. `pnpm spec:examples`
8. `pnpm spec:verify:strict`
9. `pnpm spec:gates`
10. `pnpm spec:claims`
11. `pnpm spec:api`
12. `pnpm spec:package`
13. `pnpm example`: 7 files, 43 unit tests, 30 e2e tests passed
14. `pnpm spec:website-examples`
15. `pnpm website`
16. `pnpm spec:publish`: 9 packages and 6 documents agree on version 0.12.0

## Release check

```
nothing released; STOR-01..04 complete; WX rows Pending
```

Exit 0: on `arch-wave-11`, no remote branch contains HEAD, no tag contains a phase commit, no version or changelog file changed since `phase_base`, no changeset deleted or renamed, nothing staged outside the close. `pnpm changeset version` was not run; nothing was released, published, versioned or pushed. REQUIREMENTS.md marks STOR-01..04 `[x]` and `Complete`; WX-01..07 stay Pending and unchecked.

## Task Commits

1. **Task 1: the phase scan and the D-16 comparison** - no separate commit; `58-scan.mjs` lands in the close commit (plan output step)
2. **Task 2: check:pr, the release check, STOR-01..04 complete** - REQUIREMENTS.md lands in the close commit

## Deviations from Plan

**1. [Orchestrator-authorised - verify-script defect] The scan's layout-sensitive `has` check**
- **Found during:** Task 1
- **Issue:** the verbatim scan reported `packages/core/src/DecisionRecord.ts lacks export const storedRecordOrder: Order.Order<StoredRecord> = Order.mapInput(sinkRecordOrder`. The source holds exactly that definition, wrapped at the formatter's column: `Order.mapInput(\n  sinkRecordOrder,\n  (stored) => stored.record,\n)`. The substring check compares text with line breaks, so a wrapped call can never match. It was the only finding; every other check passed.
- **Fix:** in section 7 the `has` check also tries the source with whitespace after `(` removed and runs of whitespace collapsed (one added comment line and one added `const flat`; the `not` checks and every other section are unchanged). No source, test, spec or changeset file was edited. The verbatim block is kept at `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/4f5f4e94-daaa-4e42-b8b8-92e68d5bdffb/scratchpad/58-scan.verbatim.mjs` and the diff against it is those three lines.
- **Files modified:** `58-scan.mjs`
- **Commit:** the close commit

**Total deviations:** 1 (orchestrator-authorised, scan only). **Impact:** none on the verdict; the scan's meaning is unchanged, only line-wrapping no longer hides a present definition.

## Issues Encountered

None.

## Known Stubs

None.

## Self-Check: PASSED

- `58-scan.mjs` and this SUMMARY exist; `node --check` passes on the scan.
- Every sha cited (`phase_base`, `plan_head_before`) is an ancestor of HEAD.
- No file outside `.planning/` changed in this plan.
