---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
plan: 03
subsystem: testing
tags: [characterisation, devtools, diagnostics, tape, identity]
requires:
  - phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
    provides: 83-pinned-check.mjs (holds the born file from its adding commit) and 83-check.mjs from plans 01 and 02
provides:
  - DiagnosticsFeed.characterisation.test.ts, rows FC1 to FC11, green on the phase base and importing nothing from the module the rename moves
affects: [83-04, 83-05, 83-06, 83-07, 83-08, 83-09, 83-10, 83-11]
phase_base: bc02e8e625eed08227910dfdfd4544ae66ed23ca
plan_head_before: 0794d1d63f719b76285c4f17fb07c4418107863e
plan_head_after: 7b81f71b18aaa87d509f88f2d074edeaaa6ca509
actuals:
  tokens: 6500
  tasks: 2
  commits: 1
tech-stack:
  added: []
  patterns: [publish tape recording status tag, sampled flag, reading same-or-new and the moved fields, identity only]
key-files:
  created:
    - packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts
  modified:
    - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-RED-EVIDENCE.md
key-decisions:
  - "FC11 reads the questions store through a destructured `questions` binding, so the file never spells `.questions`, which the plan keeps out of the characterisation"
requirements-completed: []
duration: 15min
completed: 2026-11-25
status: complete
---

# Phase 83 Plan 03: The feed's publishes characterised on the base Summary

A tape recorder over a real feed under `TestClock` pins ten transitions of the diagnostics feed (status tag, sampled flag,
reading identity and which of `wiring`, `activity`, `hydration`, `portCalls` moved), and one dock row pins the
supplied-questions publish; green on the base, seen failing without the run guard and without the per-field keep.

## What was done

- **Task 1 (tracer) and Task 2, one commit `7b81f71b`.** `DiagnosticsFeed.characterisation.test.ts` imports only the root
  barrel, `DiagnosticsFeed.ts` (`diagnosticsOff`), `DockModel.ts` (`makeDockModel`) and test helpers (`collectorDouble`,
  `dockModelFixtures`' `askingIds`, `helpers`); nothing from `DiagnosticsStore.ts`, and no `reading.questions` read. The
  commit holds exactly that file and `83-RED-EVIDENCE.md`.
- **Measured tapes on the base** (the first `Live` moves `hydration` and `portCalls` over the empty reading, `wiring` and
  `activity` keep their references; `Starting` shows the empty reading itself; `Off` after `Live` moves the same two back;
  `restart()` over an unchanged world publishes `Starting` and `Live` over the same reading object; a stale run's sample is
  dropped so only `Starting` is heard until the newest run samples).
- **FC11 counts measured on the base:** the shown reading (`model.diagnostics`) published once and the questions store once,
  as the plan expected; the store lists the one supplied question (`Rows`, one row).
- **Seen failing**, each under a copy-backed scratch edit restored with `cp` (`git diff --quiet HEAD -- packages scripts`
  held): run guard (line 191 of `DiagnosticsFeed.ts`) deleted fails FC9 only; `keep` in `DiagnosticsStore.ts` returning
  `next` fails FC2, FC3, FC4, FC7, FC8, FC9 and FC10. Both are in `83-RED-EVIDENCE.md` with their assertion lines.
- Checks after the commit: `83-check.mjs commit`, `trailers` (6 plan commits, one Claude trailer each), `scan-ids` and
  `scan-forbidden` pass; `83-pinned-check.mjs` prints `pinned: 6 files hold their base text, 1 of 2 born files held`.
  `tsc -p tsconfig.test.json --noEmit` and oxlint are clean.

## Deviations from Plan

None - plan executed exactly as written. The base line numbers the plan cites held: the run guard is line 191 of
`DiagnosticsFeed.ts` and `keep` is line 161 of `DiagnosticsStore.ts`; FC11's counts are the one-each D-15 expects. The two
tasks share one commit, as the plan's single output line states.

## Known Stubs

None.

## Threat Flags

None. No shipped source changed; no package was installed.

## Self-Check: PASSED
