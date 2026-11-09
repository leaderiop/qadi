---
phase: 01-http-request-enforcement
plan: 03
subsystem: http
tags: [effect-v4, request-enforcement, table-driven-test, collecting-logger, vitest]
requires:
  - phase: 01-http-request-enforcement
    provides: "request-enforcement module with all five callers routed through it (plans 01, 02)"
provides:
  - "RequestEnforcement.test.ts: the caller x failure table, total by mapped type, 23 live cells"
  - "http.test.ts without the seven per-route log-only tests the table restates"
affects: [01-04, 01-05]
status: complete
requirements-completed: [ENF-06, ENF-01, ENF-03, XC-05]
commits: 2
plan_head_before: df0b950a64a3090075785a4320c8f90d5ce4fbdb
plan_head_after: 3dc4eaea683c650f939e825e0e032cf616d3c143
actuals:
  tokens: 6800
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns:
    - "mapped-type table over caller x column, with an explicit NotApplicable cell carrying its reason"
    - "enforcement-line filter by message prefix, so a duplicated line fails but construction-time warnings do not"
key-files:
  created:
    - packages/http/test/RequestEnforcement.test.ts
  modified:
    - packages/http/test/http.test.ts
key-decisions:
  - "Recheck success is non-vacuous: the extractor completes a Deferred on its second lookup, the driver awaits it, yields the fiber a few turns, then cancels the body and reads the lines"
  - "Guard and middleware rows run a real nested guard in the handler on every column (one the subject passes, or write permission for the handler-denial column), so the success cell also exercises the handler step"
completed: 2026-11-08
---

# Phase 1 Plan 03: The caller x failure table Summary

One table-driven suite now drives guard, middleware, stream recheck, guarded port and unguarded port through each of six failure columns over their real routes, asserting the projected result and the exact enforcement lines (level, text, `qadi.denial_site`) or their absence.

## Commits

| Commit | Message |
| ------ | ------- |
| `e2e268e` | test(01-03): one table drives every request-enforcement caller through every failure (ENF-06) |
| `3dc4eae` | test(01-03): drop the per-route log assertions the request-enforcement table restates (D-07) |

## The table

- Columns: extractionFailure, edgeDenial, edgeObligation, edgeOutage, handlerDenial, success. Rows: guard, middleware, streamRecheck, guardedPort, unguardedPort. `TABLE`, `DRIVERS` and `SCENARIOS` are mapped types over the caller and column lists, so a new caller or column is TS2741.
- **30 cells: 23 live, 7 not applicable.** A test pins the not-applicable set to exactly: streamRecheck x edgeObligation, streamRecheck x handlerDenial, guardedPort x handlerDenial, unguardedPort x edgeDenial, x edgeObligation, x edgeOutage, x handlerDenial, and requires each to carry a reason.
- Statuses (live): guard 502/403/403/502/403/200, middleware 502/403/403/502/403/204, guarded port 502/403/403/502/n.a./200, unguarded port 502/n.a./n.a./n.a./n.a./200. Recheck: closure `<Tag>, <class>` (`SubjectExtractionFailed, outage`; `AccessDenied, denied`; `AttributeResolveError, outage`) or `carried on`; connect status 200 is asserted inside the driver.
- Edge outage logs nothing on any row (the recheck row logs only its closure line). Extraction failure is one Error line on every row that extracts, the unguarded port included. Recheck extraction failure and edge denial log the edge line, then the closure line.
- All 23 live cells passed against today's behavior on the first run, apart from my own wrong guess of the obligation's code (the line is `ACL010`, not `ACL001`). No cell disagreed with what a route does, so Plans 01-02 changed no behavior.

## Removed tests, and the table cell that replaces each (Task 2)

All seven were `http.test.ts` tests whose only assertions were a status and log line(s).

| Removed test | Replaced by cell |
| ------------ | ---------------- |
| "a credential store outage logs the real reason server-side, through the RequirePermission middleware's own catchTag(...) arm" | middleware x extractionFailure |
| "a bare route's denial logs exactly one line, and answers 403" | guard x edgeDenial |
| "a bare route's extraction failure logs exactly one line, and answers 502" | guard x extractionFailure |
| "a handler-raised denial is logged once, as the handler's" | middleware x handlerDenial |
| "the log line says which step raised the denial" (sites `["edge", "handler"]`) | middleware x edgeDenial (site edge) and middleware x handlerDenial (site handler) |
| "an edge denial is still logged exactly once" | middleware x edgeDenial |
| "a bare route's handler-raised denial is answered 403 and logged once" | guard x handlerDenial |

Judgement calls a reviewer should check: the removed "a bare route's denial" test used `HasAttribute` and its reason text (`subject attribute 'clearance' did not match`), and the table's guard x edgeDenial uses `HasPermission` with a different reason text. The line's code, level, subject and site are the same; the reason string is core's, not the module's. The removed probe tests used `document:*` permissions where the table uses `devtools:*`, same format. The emptied "authorization step at the edge (characterization)" describe and its comment went with its two tests; the now-unused `Logger`, `References` imports and `probeWithLogger` helper were removed.

Kept on purpose: "a handler-raised denial is still projected to its redacted wire value", "the standing services reach the handler: its re-check hits the DecisionCache", every redaction and body-shape test, "a denial's server-side log names the stable code, subject and reason" (its `document:read` text is not a cell), "A CREDENTIAL STORE OUTAGE IS 502, NOT 403" (status-only, not a log assertion, so outside D-07's removal rule), the PortRoutes.test.ts ENF-03 regression test, and every `decisionStream.test.ts` and `AuthorizeRequest.test.ts` test.

## Verification

- `pnpm vitest run --project http packages/http/test/RequestEnforcement.test.ts`: 24 tests (23 cells plus the not-applicable pin), run three times, all pass.
- `pnpm vitest run --project http`: 11 files, 245 tests pass.
- `pnpm typecheck` and `pnpm lint` green (house-style clean; oxlint warnings are pre-existing and outside `packages/http`).
- Presence greps from Task 2 verify all hold (redacted-wire-value test, standing-services test, ENF-03 regression test).
- Full `pnpm vitest run --coverage`: 3830 tests pass; `packages/http/src` 99.65% lines, 96.07% branches, 99.29% functions (XC-05, floor 90%).

## Deviations from Plan

None - plan executed exactly as written. Within-scope choices: the table states exact statuses (200 or 204) where the plan said 2xx; the handler of the guard and middleware rows always runs a nested `guard`.

## Known Stubs

None.

## Threat Flags

None. Test-only change; no new endpoint, auth path or schema surface. T-01-09 (table is total, exact lines, not-applicable set pinned) and T-01-10 (only log-only tests removed, body and redaction tests kept and grep-checked) are mitigated.

## Self-Check: PASSED

- FOUND: packages/http/test/RequestEnforcement.test.ts
- FOUND commits e2e268e, 3dc4eae (ancestors of HEAD)
