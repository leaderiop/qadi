---
phase: QD-69-one-total-thrown-value-to-message-module
plan: 06
subsystem: devtools
tags: [thrown-value, total-functions, cause-rendering, feeds]
phase_base: 19fe6244bc8b3494823732b1fbf87f3947852fd8
plan_head_before: 59dba8ab3ba483d344a5bbfa3686adcc697efbac
plan_head_after: a9816585b9ca29e62fd3b676ebac6d7c36f6e3c0
requires: [69-05]
provides:
  - "every devtools site that renders an Effect Cause to text reads through causeMessage"
affects: [69-07, 69-08, 69-09]
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: ["named import of causeMessage from the @qadi/core root, placed between the effect imports and the relative ones"]
key-files:
  created: []
  modified:
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/src/model/DiagnosticsFeed.ts
    - packages/devtools/src/model/DiagnosticsStore.ts
    - packages/devtools/src/model/ExplorerSession.ts
    - packages/devtools/src/model/GatesFeed.ts
    - packages/devtools/test/model/GatesFeed.test.ts
    - packages/devtools/test/react/QuestionsPanel.thunk.test.tsx
    - packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx
    - spec/overview.md
key-decisions:
  - "GatesFeed: stated's reason is causeMessage(Cause.die(thrown)) and its hand-written guard around the pretty-printer is gone (one rule, one place); the key (name: message, else the reason) stays inside its try, with the caller's fallback only when reading the key throws, so two unreadable throws still compare equal (D-14)"
  - "The REGISTRY_FALLBACK and QUESTIONS_FALLBACK constants are kept as keys only and documented as never shown; what the panel shows for a throw that cannot be rendered is the one placeholder (D-03)"
  - "The DiagnosticsStatus overview row changes in the same commit as the diagnostics feed, so the overview never describes code the tree does not hold (Revision 1.132)"
requirements-completed: []
status: complete
duration: ~20 min
completed: 2026-11-22
---

# Phase 69 Plan 06: devtools feeds through causeMessage Summary

The timeline feed, diagnostics feed, diagnostics store, explorer (both exits) and gates feed now render a `Cause` with `causeMessage`; the five feed RED cases of 69-03 (F1, F2, F3, E1, E2) pass and the whole devtools project passes. (Requirement checkboxes stay untouched on purpose: 69-09 marks THRW-01..05 complete.)

## Results

- Task 1 (tracer): `TimelineFeed.test.ts` red-check `0 failed as named, 30 passed`; typecheck and oxlint clean; one commit holding exactly `TimelineFeed.ts`.
- Task 2: diagnostics, store and explorer suites red-check `0 failed as named, 110 passed`; `spec-revise --check` passes at Revision 1.132; `check-api-surface.mjs` reports 941 exports; typecheck and oxlint clean.
- Task 3: gates suites red-check `0 failed as named, 55 passed`; whole `--project devtools` run exit 0; typecheck and `pnpm lint` exit 0 (pre-existing warnings elsewhere only).
- `Cause.pretty(` call count over `packages/*/src`: seven at `phase_base`, one now, in `packages/core/src/ThrownMessage.ts`. No `packages/*/src` file renders a `Cause` by hand.
- The three task verifies from the plan were run to exit 0, in order, after their commits.

## The four moved pins

Each was a sentence naming the registry or the questions and is now the placeholder `a value that could not be described`; no other test line changed (the task verify counts 4 removed, 4 added):

1. `GatesFeed.test.ts` `T3`: `askedFailure(other)`.
2. `GatesFeed.test.ts` `G46`: `const sentence`.
3. `QuestionsPanel.thunk.test.tsx` `Q2`: `${QUESTIONS_FAILED}a value that could not be described`.
4. `QuestionsPanel.feed.characterisation.test.tsx` golden `"18 a registry that throws what cannot be described"`: only the sentence substring inside the HTML string.

## Visible devtools change

A throw the gates feed cannot render (a registry or questions thunk that throws a value with no readable string form) now reads as the one placeholder, `a value that could not be described`, not `The registry threw ...` or `The questions threw ...`. A throw that renders keeps its exact `Cause.pretty` text. A timeline or diagnostics run that dies with an unrenderable value is now stated as `Stopped`, a layer that fails to build with one as `Failed`, and `refusalOf` and `textOf` state the placeholder instead of throwing.

## Task commits

| Task | Commit | What |
| --- | --- | --- |
| 1 (tracer) | d9eaffc0 | `TimelineStatus.Stopped({ reason: causeMessage(cause) })`, doc comment |
| 2 | fe5821a7 | diagnostics feed, diagnostics store, explorer's two exits, overview row, Revision 1.132 |
| 3 | a9816585 | `GatesFeed` `stated`, `Failed` and fallback doc comments, the four moved pins |

## Deviations from Plan

None - plan executed exactly as written. No new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, ambient `console`/`process.env` or suppression comment; no source line, doc comment or test this plan wrote holds a decision, plan, requirement or phase id (the Revision note in `spec/overview.md` change history carries the ids the plan prescribed, which is exempt).

## Known Stubs

None.

## Threat Flags

None. T-69-17 and T-69-18 are mitigated (each site renders through `causeMessage`, pinned by F1 to F3, E1, E2); T-69-19 accepted (a throw that renders keeps its exact text).

## Self-Check: PASSED

- d9eaffc0, fe5821a7 and a9816585 are ancestors of HEAD; the nine modified files exist.
