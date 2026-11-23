---
phase: QD-69-one-total-thrown-value-to-message-module
plan: 03
subsystem: testing
tags: [red-tests, thrown-value, devtools, red-evidence]
phase_base: 19fe6244bc8b3494823732b1fbf87f3947852fd8
plan_head_before: 71744569b511e8f7edb6648607068736d7e32e50
plan_head_after: 0597ae8ae0425f2e6c38b1b9db6006b6868acd98
requires: [69-02]
provides:
  - "E1, E2: refusalOf and textOf throw from Cause.pretty for both hostile values, red on the base"
  - "F1 to F3: the timeline feed, the diagnostics feed and the diagnostics store never state a stop or a failed wiring for a hostile value, red on the base"
  - "69-RED-EVIDENCE.md: the phase's RED record (21 titles, 24 failed assertions) from vitest JSON reports"
affects: [69-04, 69-05, 69-06]
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: ["hostile fixtures declared once per describe", "evidence table generated from vitest JSON by a scratch script, never committed"]
key-files:
  created:
    - .planning/phases/QD-69-one-total-thrown-value-to-message-module/69-RED-EVIDENCE.md
  modified:
    - packages/devtools/test/model/ExplorerSession.test.ts
    - packages/devtools/test/model/TimelineFeed.test.ts
    - packages/devtools/test/model/DiagnosticsFeed.test.ts
    - packages/devtools/test/model/DiagnosticsStore.test.ts
key-decisions:
  - "Each hostile case loops over both fixtures inside one case and drives its site only through its own entry (refusalOf, textOf, makeTimelineFeed, makeDiagnosticsFeed, runDiagnostics)"
  - "A failing build is the handed layer's own Effect.fail(value), no hand-written port"
requirements-completed: [THRW-01, WX-06, WX-07]
status: complete
duration: ~20 min
completed: 2026-11-22
---

# Phase 69 Plan 03: devtools feed RED cases and the RED record Summary

Five devtools cases fail on the phase base for the reason each names, and the phase's twenty-one RED titles (twenty-four failed assertions) are recorded in one committed file before any source changes. (Requirement checkboxes stay untouched on purpose: 69-09 marks THRW-01..05 complete.)

## RED runs (`red-check` lines)

- `ExplorerSession.test.ts`: exit 1, `red-check: 2 failed as named, 47 passed`. E1 and E2 throw `Error: message threw` out of `Cause.pretty`; `text is the encoding, or why there is none` passes (checked by the verify).
- `TimelineFeed`, `DiagnosticsFeed`, `DiagnosticsStore`: exit 1, `red-check: 3 failed as named, 88 passed`. F1 and F2 fail `expected Stopped` (the status is never stated), F3 fails `expected Failed` (the run dies before the wiring is read).
- Evidence re-runs at HEAD (no source differs from `phase_base`): core `red-check: 9 failed as named, 602 passed`; http `1 failed as named, 63 passed`; react `6 failed as named, 29 passed`; capture `3 failed as named, 52 passed`; devtools feeds `5 failed as named, 135 passed`.
- `pnpm typecheck` and `npx oxlint` on the four touched files green; no `packages/*/src` file differs from `phase_base`.

`69-RED-EVIDENCE.md`: `/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-69-one-total-thrown-value-to-message-module/69-RED-EVIDENCE.md`

## Task commits

| Task | Commit | What |
| --- | --- | --- |
| 1 (tracer) | 7ceeb748 | `test(69-03)`: E1, E2 in `ExplorerSession.test.ts` |
| 2 | 8cc532a9 | `test(69-03)`: F1 to F3 in the three feed and store tests |
| 3 | 0597ae8a | `docs(69-03)`: `69-RED-EVIDENCE.md` |

Tracer gate: Task 1's verify was re-run end to end after its commit and passed before Task 2 started.

## Deviations from Plan

**1. [Rule 3 - Blocking] Task 3's verify uses an awk regex macOS awk rejects**
- **Found during:** Task 3 verify
- **Issue:** `awk "/^[|] packages[/]/ ..."` fails on macOS's awk (`nonterminated character class`), so the check for twenty-four rows could not run as written.
- **Fix:** ran the same verify with that one regex written `/^[|] packages\//`; everything else unchanged, it passed (`the RED record is committed`). The file itself holds 24 `| packages/` rows. The plan file was not edited.
- **Commit:** none (verification only)

Otherwise the plan executed as written.

## Known Stubs

None.

## Threat Flags

None. Test files and one evidence document only.

## Self-Check: PASSED

- The four test files and `69-RED-EVIDENCE.md` exist; commits 7ceeb748, 8cc532a9 and 0597ae8a are ancestors of HEAD; all three task verifies exited 0 (Task 3 with the awk note above).
