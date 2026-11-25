---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
plan: 02
subsystem: testing
tags: [check-scripts, pinned-tests, devtools, diagnostics, rename]
requires:
  - phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
    provides: 83-check.mjs (the base read) and 83-RED-EVIDENCE.md from plan 01
  - phase: QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws
    provides: 81-pinned-check.mjs, 81-check.mjs and 81-archived-checks.mjs, re-run from a scratch copy
provides:
  - 83-pinned-check.mjs holding six test files against the phase base and two born files against their adding commit
  - 83-earlier-checks.mjs re-running Phase 81's checks with the rename's import edits and the F2 flip declared in a scratch copy
affects: [83-03, 83-04, 83-05, 83-06, 83-07, 83-08, 83-09, 83-10, 83-11]
phase_base: bc02e8e625eed08227910dfdfd4544ae66ed23ca
plan_head_before: 5d744ecea1b25c1cf470923f16336f4331a5fa51
plan_head_after: 7362bf07c26b1042494319f8d3e30971dffc7c6c
actuals:
  tokens: 6700
  tasks: 2
  commits: 1
tech-stack:
  added: []
  patterns: [pure judges over text with a thin git reader, declared edits reverted only when the new line occurs once, earlier-phase checks run from a scratch copy with their PINNED lines replaced]
key-files:
  created:
    - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-pinned-check.mjs
    - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-earlier-checks.mjs
  modified:
    - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-RED-EVIDENCE.md
key-decisions:
  - "The F2 flip (DiagnosticsFeed.test.ts: reading.questions undefined becomes assert.isFalse(\"questions\" in reading), title unchanged) is declared in 83-pinned-check.mjs, in the scratch copy of 81-pinned-check.mjs and in the evidence; decided autonomously"
requirements-completed: []
duration: 15min
completed: 2026-11-25
status: complete
---

# Phase 83 Plan 02: The pinned-test check and the earlier-phase re-run Summary

Held-test check (self-test 28 cases) pinning the feed's tests to their base text apart from the rename's four import lines
and the one `F2` flip, plus a re-run of Phase 81's checks from a scratch copy that declares the same, each seen failing once.

## What was done

- **Task 1 (tracer).** `83-pinned-check.mjs` is `81-pinned-check.mjs` reshaped: `PINNED` holds `DiagnosticsFeed.test.ts`
  (flip `F2`, import `noDiagnostics`), `DockModel.test.ts` (two imports), `ConfigureRule.test.ts` and `test/builtFeeds.ts`
  (one import each) and the two characterisation files byte for byte. `BORN` holds `DiagnosticsFeed.characterisation.test.ts`
  and `DockModel.reading.test.ts` against the one commit that added each. `git diff -M --name-status <base>` is read once and a
  held file reported moved or deleted fails naming both paths. `--all-applied` also needs the `F2` flip to differ from its
  base, a `- flip F2: ` evidence line and both born files to exist and be committed. On the tree it prints `pinned: 6 files
  hold their base text, 0 of 2 born files held, 0 of 1 declared flips applied`, and `--all-applied` fails on the four reasons
  that are still true. Seen failing: a blank line appended to `DockModel.test.ts` gave `differs from its base text at line
  1833`; restored with `cp`.
- **Task 2.** `83-earlier-checks.mjs` copies Phase 81's `81-pinned-check.mjs`, `81-check.mjs`, its summary and its evidence
  into `$TMPDIR/qd83/p81/`, replaces the three `PINNED` lines (each must occur exactly once, else `cannot declare <file>`)
  and runs the copy, `81-check.mjs single-source` and Phase 81's own `81-archived-checks.mjs`. A pure `judgeEarlier` accepts
  exactly the base lines: every check exits 0 except `79-pinned-check.mjs` on `TF29`. Self-test 13 cases. On the tree it
  passes (`81-pinned-check.mjs: exit 0: pinned: 8 files hold their base text, 4 of 5 declared flips applied`, the `F2` flip
  being the one not yet applied). Seen failing: a blank line appended to `ConfigureRule.test.ts` made the scratch copy fail
  at line 919; restored with `cp`. Phase 81's directory and the archive are unchanged.
- Commit `7362bf07` holds exactly the three files, one trailer; `83-check.mjs commit` accepts it.

## Deviations from Plan

None - plan executed exactly as written. Two small additions beyond the plan's list: a born file that exists but has no
adding commit passes plain and fails under `--all-applied` (`no commit adds it`), and two adding commits for one file is a
reason. The commit trailer names the executing model (`Claude Sonnet 5.5`); `83-check.mjs`'s trailer rule accepts any Claude
name with the Anthropic address.

## Known Stubs

None.

## Threat Flags

None. Nothing outside `.planning/phases/QD-83-…/` changed; no package was installed.

## Self-Check: PASSED
