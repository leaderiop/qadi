---
phase: 05-decision-log-over-http
plan: 01
subsystem: http
tags: [effect, sse, json, decision-log, refusal, tstyche, vitest]

requires:
  - phase: 01-http-request-enforcement
    provides: "DecisionStreamRoute.ts's recheck on enforceRequest/endStream, left untouched here"
provides:
  - "packages/http/src/DecisionLogHttp.ts: the package-private decision-log HTTP module (one refusal reporter, one encode-or-report, SSE and JSON framings)"
  - "DecisionBacklogRoute no longer imports DecisionStreamRoute (LOGH-03)"
  - "DecisionLogHttp.test.ts: one table, 3 framings x 4 scenarios = 12 cells (LOGH-04)"
  - "DecisionLogHttp.tst.ts: type pins that the public options shapes did not change (D-04)"
affects: [05-02, ARCH-50, CCR-QD-389]

plan_head_before: ea07f3e88d7f2ac248da2eb12c9a37e1fe8ba8cf
plan_head_after: 6873086357a1f7d5b8780b1847991d72604c0e8d

actuals:
  tokens: 7500
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A route's refusal words are parameters of one reportRefused factory, applied once per framing at module scope"
    - "encodeOrReport + keepEncoded: one encode-or-report over a Filter.FilterEffect, shared by every framing"
    - "Package-private module with a public name via a named re-export (as NO_RESOURCE through RequirePermission.ts)"

key-files:
  created:
    - packages/http/src/DecisionLogHttp.ts
    - packages/http/test/DecisionLogHttp.test.ts
    - packages/http/test/DecisionLogHttp.tst.ts
  modified:
    - packages/http/src/DecisionBacklogRoute.ts
    - packages/http/src/DecisionStreamRoute.ts

key-decisions:
  - "frame moves into DecisionLogHttp.ts and DecisionStreamRoute.ts re-exports it by name. The module builds the SSE encode-or-report on encodeStoredRecordString, which frame wraps; leaving frame in the stream route would make the two modules import each other, a cycle pnpm circular refuses. The re-export keeps the public name, the barrel and every ../src/DecisionStreamRoute.ts import path."
  - "syncedFrame stays in DecisionStreamRoute.ts: it carries no record and cannot be refused, and it belongs to the stream protocol (prelude, synced, live; ADR-QD-097)."
  - "DecisionLogServeOptions (onRefused only) is declared in the module and is not in the barrel. DecisionStreamOptions stays declared and exported in DecisionStreamRoute.ts as `extends DecisionLogServeOptions`, adding reauth. No export is added or removed (patch, D-07)."
  - "Per-route wording (D-01): one reportRefused factory taking { span, message }, applied once for JSON (qadi.http.decisionBacklog.refused, 'could not be served in the backlog') and once for SSE (qadi.http.decisionStream.refused, 'could not be framed'), byte-identical to HEAD. One shared wording was rejected: two route tests pin the lines and ADR-QD-095 D-09-e keeps each adapter's message."

patterns-established:
  - "Refusal tests are one table over framings x scenarios with the expectation on the scenario, so a framing that diverges fails its own cells"

requirements-completed: [LOGH-01, LOGH-02, LOGH-03, LOGH-04, XC-04, XC-05]

coverage:
  - id: D1
    description: "A refused record drops only its own element in every framing (SSE backlog, SSE live, JSON array), and every other record is served in order"
    requirement: LOGH-01
    verification:
      - kind: unit
        ref: "packages/http/test/DecisionLogHttp.test.ts#<framing> · one refused in the middle"
        status: pass
    human_judgment: false
  - id: D2
    description: "A refusal is reported exactly once in every framing, to onRefused or as one warning in the route's own words under its own span; a throwing onRefused is contained"
    requirement: LOGH-01
    verification:
      - kind: unit
        ref: "packages/http/test/DecisionLogHttp.test.ts#<framing> · no onRefused / onRefused throws / all encodable"
        status: pass
    human_judgment: false
  - id: D3
    description: "packages/http/src has exactly one refusal reporter, and nothing outside DecisionLogHttp.ts encodes or reports a refusal"
    requirement: LOGH-02
    verification:
      - kind: other
        ref: "Task 2 verify grep gates (const reportRefused count = 1; no encoder/reporter/route-words outside the module)"
        status: pass
    human_judgment: false
  - id: D4
    description: "DecisionBacklogRoute imports nothing from DecisionStreamRoute"
    requirement: LOGH-03
    verification:
      - kind: other
        ref: "grep -c 'from \"./DecisionStreamRoute.ts\"' packages/http/src/DecisionBacklogRoute.ts = 0; pnpm circular"
        status: pass
    human_judgment: false
  - id: D5
    description: "The public export set and the options shapes are unchanged; log text and span names are byte-identical, so the existing route tests pass unedited"
    requirement: LOGH-04
    verification:
      - kind: unit
        ref: "pnpm vitest run --project http (12 files, 257 tests, decisionStream.test.ts and decisionBacklog.test.ts unedited)"
        status: pass
      - kind: other
        ref: "pnpm exec tstyche packages/http/test/DecisionLogHttp.tst.ts packages/http/test/DecisionStreamRoute.tst.ts; pnpm spec:api"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-11-08
status: complete
---

# Phase 05 Plan 01: Decision log over HTTP, one module Summary

**One package-private `DecisionLogHttp.ts` now encodes the decision log as SSE frames or a JSON array and owns refusal reporting; both routes go through it, the backlog route no longer imports the stream route, and a 12-cell table pins that every framing refuses alike.**

## Performance

- **Duration:** about 4 min (start approximated from the STATE.md timestamp of 05:16Z; the start time was not captured)
- **Completed:** 2026-11-08T05:20:18Z
- **Tasks:** 2 (a tracer and an expansion), 4 commits
- **Files modified:** 5 (3 created, 2 modified)

## Accomplishments

- `DecisionLogHttp.ts` holds the one `reportRefused` factory, a generic `encodeOrReport` and `keepEncoded`, and the SSE and JSON framings built on them. The module is out of the barrel.
- `DecisionBacklogRoute.ts` is `jsonElements` over the log's snapshot. Its own reporter, loop and stream-route import are gone.
- `DecisionStreamRoute.ts` frames the backlog with `frameEntries` and filters live entries through `frameEntry`. It keeps `syncedFrame`, `recheck` and `endStream`, and re-exports `frame`.
- `DecisionLogHttp.test.ts` runs 3 framings (json, sse backlog, sse live) x 4 scenarios (all encodable, one refused in the middle, onRefused throws, no onRefused) = 12 cells. Each asserts the kept ids, the hook's refusals, the log lines and annotations, and the refusal-span count.

## Module surface as built (for Plan 02's CCR row)

Exports of `DecisionLogHttp.ts`, none in the barrel except `frame`, through `DecisionStreamRoute.ts`:

- `interface DecisionLogServeOptions { onRefused? }`
- `frame(event, cursor?)`, moved verbatim, with the one sentence about who reports a refusal changed to name `frameEntry`
- `frameEntry(event, options?)`: `Filter.FilterEffect<LogEntry, string, SinkRecordNotEncodable>`
- `frameEntries(event, entries, options?)`: `Effect<ReadonlyArray<string>>`
- `jsonElements(records, options?)`: `Effect<ReadonlyArray<StoredRecordJson>>`

Module-local: `reportRefused` (factory), `reportRefusedJson`, `reportRefusedSse`, `encodeOrReport`, `keepEncoded`. None of these is an `Effect.fn` per record. The per-record path stays a plain function and `Effect.fnUntraced` is not used, so `UNTRACED_BUDGET` is untouched.

## Task Commits

1. **Task 1 (tracer), RED:** `686695b` test(05-01): failing refusal table, JSON framing
2. **Task 1 (tracer), GREEN:** `9d44760` refactor(05-01): serve the backlog's JSON through the decision-log HTTP module
3. **Task 2, RED:** `094886e` test(05-01): failing SSE backlog and live cells
4. **Task 2, GREEN:** `6873086` refactor(05-01): frame the decision stream through the decision-log HTTP module

**Plan metadata:** the docs commit that follows this file.

## TDD notes

- **RED (Task 1):** the test imports `../src/DecisionLogHttp.ts`, which did not exist, so the suite failed with "Cannot find module". The plan asked for exactly this ("RED until the module exists"). A module-load failure would be INVALID_RED under the strict #3770 classifier, so it is a weaker RED than an assertion failure. I did not run `gsd_run check tdd-red-evidence`: the plan is `type: execute`, not `type: tdd`, so the gate is not enforced.
- **RED (Task 2):** a stronger RED. The 4 JSON cells passed and the 8 SSE cells failed with `frameEntry`/`frameEntries is not a function`, while the module already loaded.
- **GREEN commit prefix:** the plan prescribed `refactor(05-01)` for both green commits, because the change is behavior-preserving, so a `feat(05-01)` gate commit does not exist. A strict `feat(...)` after `test(...)` TDD gate check would report one missing.

## Decisions Made

See `key-decisions` above. All four were fixed at planning time and implemented as written.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] tstyche `toBeCallableWith` on `decisionFrames` fails on a floating Stream**
- **Found during:** Task 2 (Step 4, the pins)
- **Issue:** `expect(decisionFrames).type.toBeCallableWith(entries)` reported "Expression is not callable" because the Effect language service flags the call, which returns a `Stream`, as a floating effect. The same would happen on HEAD.
- **Fix:** assert on the call's result instead, `expect(decisionFrames(entries, picked)).type.toBe<Stream.Stream<string>>()`, with a comment saying why. The pin still proves that `decisionFrames` accepts a read and a declared `Pick<DecisionStreamOptions, "onRefused">`.
- **Files modified:** `packages/http/test/DecisionLogHttp.tst.ts`
- **Committed in:** `6873086`

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** test-only, with the same guarantee. No scope creep.

## Issues Encountered

- `pnpm lint` prints 6 oxlint warnings (`no-unused-vars` in `@qadi/react`, `no-useless-fallback-in-spread` in the features step definitions, and `prefer-string-starts-ends-with` in `scripts/check-house-style.mjs`). None is in a file this plan touched, so they are out of scope. House style reports clean.
- The task-start time was not captured at run start, so the duration is approximate.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or schema; the module builds no annotations (only core's reporter does), the route guards are untouched, and `pnpm spec:api` shows the export set unchanged.

## Next Phase Readiness

Ready for Plan 05-02. The module's names and the `frame`-moves and `syncedFrame`-stays decisions above are the facts its CCR row needs. Final table count: 12 cells.

## Self-Check: PASSED

- Files exist: `packages/http/src/DecisionLogHttp.ts`, `packages/http/test/DecisionLogHttp.test.ts`, `packages/http/test/DecisionLogHttp.tst.ts`.
- Commits `686695b`, `9d44760`, `094886e` and `6873086` are ancestors of HEAD, and `git rev-list --count` from the ledger base gives 4.
- Task 2's full automated verify passed: http vitest (12 files, 257 tests), tstyche (2 files, 9 tests), typecheck, lint, circular, spec:api and all grep gates.

---
*Phase: 05-decision-log-over-http*
*Completed: 2026-11-08*
