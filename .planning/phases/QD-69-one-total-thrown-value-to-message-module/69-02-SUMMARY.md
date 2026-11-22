---
phase: QD-69-one-total-thrown-value-to-message-module
plan: 02
subsystem: testing
tags: [red-tests, thrown-value, http, react, devtools, capture]
plan_head_before: a6add17e11dfed1dd3b21b2c36ea6350eb884fb1
plan_head_after: 90251ebad34f50702cdf348c065331ca8db39cdc
requires: [69-01]
provides:
  - "H1: a hostile HttpClientError reaches a remote port's caller as a defect, red on the base"
  - "S1 to S3: the reporter line, red once in each environment; two green pins P1 and P2"
  - "C1 to C3: the capture of a hostile cause, a failing custom predicate and a failure with no text, red on the base"
affects: [69-03, 69-05]
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: ["hostile fixtures declared once per file", "scriptedPort for every broken port; the http hostile is an HttpClient"]
key-files:
  created: []
  modified:
    - packages/http/test/PortRoutes.test.ts
    - packages/react/test/DeveloperSignals.test.ts
    - packages/devtools/test/model/Capture.test.ts
key-decisions:
  - "No source file changed; the no-cause capture case was rewritten in place (title, comment, one assertion) per the plan"
requirements-completed: [THRW-01, WX-06, WX-07]
status: complete
duration: ~15 min
completed: 2026-11-22
---

# Phase 69 Plan 02: http, react and capture RED cases Summary

Seven outside-core cases fail on the phase base for the reason each names, through each site's own entry; two reporter pins stay green. (Requirement checkboxes are left untouched on purpose: 69-09 marks THRW-01..05 complete.)

## RED runs (`red-check` lines)

- http, `PortRoutes.test.ts`: exit 1, `red-check: 1 failed as named, 63 passed`. H1 fails with `Error: message threw` raised at `RemotePorts.ts` `transport` (the unguarded `error.message`), so the read dies instead of failing with the port's own error.
- react, `DeveloperSignals.test.ts`: exit 1, `red-check: 6 failed as named, 29 passed`. S1 and S2 throw `toString threw` / `message threw` out of the containment; S3 gives `Error: 42` instead of `described`; each fails once per environment. P1 and P2 pass in both (checked by the verify). Every `TypeError: host boom` pin and `plain string` pin passes; the react test diff has no removed line.
- devtools, `Capture.test.ts`: exit 1, `red-check: 3 failed as named, 52 passed`. C1 (first value, the plain hostile object, records the old placeholder), C2 (`{ Broke, "isOwner" }` captured where `down` is wanted), C3 (`AttributeResolveError` recorded where an empty message is wanted).
- `pnpm typecheck`, `npx oxlint` on the three files and `node scripts/check-house-style.mjs` (560 files clean) are green; no `packages/*/src` file differs from `phase_base`; no decision, requirement or phase id in any added line.
- Tracer gate: Task 1's verify was re-run end to end after the commit and passed before Task 2 started.

## Task commits

| Task | Commit | What |
| --- | --- | --- |
| 1 (tracer) | 15462b30 | `test(69-02)`: H1 and `HostileClientError` in `PortRoutes.test.ts` |
| 2 | 90251eba | `test(69-02)`: S1 to S3, P1, P2 and C1 to C3 |

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. Test files only.

## Self-Check: PASSED

- The three test files exist; commits 15462b30 and 90251eba are ancestors of HEAD; both task verifies exited 0.
