---
phase: QD-69-one-total-thrown-value-to-message-module
plan: 05
subsystem: http-react-devtools
tags: [thrown-value, total-functions, reporter-containment, capture]
phase_base: 19fe6244bc8b3494823732b1fbf87f3947852fd8
plan_head_before: d4475d289017c57e69d5303956ceeb59d527247f
plan_head_after: a80a83b4344e0295043d57e2bc7b074d1bfc5d3c
requires: [69-04]
provides:
  - "@qadi/http transport, @qadi/react errorLine and @qadi/devtools renderError read a caught value through thrownMessage"
affects: [69-06, 69-07]
actuals:
  tokens: 12000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: ["one guarded read per try", "typed field reader fieldOf over Reflect.get(Object(error), key)"]
key-files:
  created: []
  modified:
    - packages/http/src/RemotePorts.ts
    - packages/react/src/DeveloperSignals.ts
    - packages/devtools/src/model/Capture.ts
    - packages/devtools/test/model/Capture.test.ts
key-decisions:
  - "react: namedLine reads an Error's message once into an unknown const inside one try and renders the name through thrownMessage; errorLine is namedLine(error) ?? thrownMessage(error), so a non-string message never prints the name twice (D-16)"
  - "devtools: renderError is thrownMessage(fieldOf(error, \"cause\") ?? fieldOf(error, \"reason\") ?? error); the error's own string message is thrownMessage's first read, so no separate message branch exists (D-15)"
  - "a null cause now reads as no cause, where it read null (visible change, to be named in the CCR row and devtools changeset by 69-07)"
requirements-completed: []
status: complete
duration: ~15 min
completed: 2026-11-22
---

# Phase 69 Plan 05: http, react and devtools through thrownMessage Summary

The three copies outside core now render a caught value through `thrownMessage`; the seven outside-core RED cases (H1, S1 to S3, C1 to C3) pass. (Requirement checkboxes stay untouched on purpose: 69-09 marks THRW-01..05 complete.)

## Results

- Task 1: `PortRoutes.test.ts` red-check `0 failed as named, 64 passed`; whole http project 307 passed; typecheck and oxlint clean.
- Task 2: `DeveloperSignals.test.ts` red-check `0 failed as named, 35 passed`; whole react project 535 passed; no line of the react test removed or changed since `phase_base`; typecheck, oxlint and house-style clean.
- Task 3: `Capture.test.ts` red-check `0 failed as named, 55 passed`. Since 69-02's RED commit the only removed line of `Capture.test.ts` is the old placeholder pin, now `a value that could not be described`. `pnpm typecheck` and `pnpm lint` exit 0.
- Negative gates over `packages/*/src`: inline Error-or-String ternary lines 6 at `phase_base`, 0 now; `instanceof Error) return <name>.message` lines 2 at `phase_base`, 0 now; old angle-bracketed placeholder lines in `packages` outside `lib/` 4 at `phase_base`, 0 now.
- Visible devtools change: a custom predicate failure is captured and replayed with its `reason` (C2); a failure with no text of its own records an empty message, not its tag (C3); a `null` cause reads as no cause.

## Task commits

| Task | Commit | What |
| --- | --- | --- |
| 1 (tracer) | 9ae07ce9 | `transport` builds `RemotePortFailure.Transport({ message: thrownMessage(error) })` |
| 2 | 6a99532e | `namedLine` and `errorLine` in `DeveloperSignals.ts` |
| 3 | a80a83b4 | `fieldOf` and `renderError` in `Capture.ts`; the moved placeholder pin |

## Deviations from Plan

### Verification-only

**1. [Verification] Task 3's "whole devtools project passes" step cannot hold before 69-06**
- **Found during:** Task 3
- **Issue:** `pnpm exec vitest run --project devtools` reports 5 failures, all the feed RED cases 69-03 left on purpose for 69-06 (`DiagnosticsFeed`, `DiagnosticsStore`, `ExplorerSession` x2, `TimelineFeed`: each a "value that cannot be rendered" placeholder case). None touches `Capture.ts`; every other file (66 of 70) and 1668 of 1673 tests pass.
- **Fix:** none; they are fixed by the feeds switching to `causeMessage` in 69-06. The Task 3 verify's whole-project step therefore fails until then; the other steps were run by hand (see Results).
- **Commit:** n/a

Otherwise: plan executed as written. No new `as`, `!`, `any`, `switch`, ambient `console`/`process.env` or suppression comment.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- 9ae07ce9, 6a99532e and a80a83b4 are ancestors of HEAD; `RemotePorts.ts`, `DeveloperSignals.ts`, `Capture.ts` and `Capture.test.ts` exist.
