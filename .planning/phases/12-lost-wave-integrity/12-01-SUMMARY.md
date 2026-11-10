---
phase: 12-lost-wave-integrity
plan: 01
subsystem: decision-stream
tags: [integrity, decision-log, sse, resume, test-first, lost-wave-port]
phase_base: f1041fe

requires: ["11-07"]
provides:
  - "`@qadi/core` `encodeDecisionStream` / `DecisionStreamFrame` / `EncodeDecisionStreamOptions`: the stream's order (backlog by cursor.seq, one synced, live) written once, codec-free (INT-01)"
  - "`/__decisions` is that stream through one package-private SSE writer (`sseText`) with http's own record encoder (`recordData`) (INT-02)"
  - "A reconnect during or after the backlog loses and repeats nothing (ROADMAP criterion 1)"
  - "`frame`, `syncedFrame`, `decisionFrames` removed from `@qadi/http` (option-a, Breaking)"
  - "Phase-base mutation scores (`12-mutation-base.json`, `12-mutation-base-{core,http,devtools,react}.json`) and `12-mutation-score.mjs record|compare`"
affects: [12-02, 12-05]

actuals:
  tokens: 120000
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns: ["transport-free frame seam: core orders, http writes SSE bytes, the caller encodes the record"]

key-files:
  created:
    - packages/core/src/DecisionStream.ts
    - packages/core/test/DecisionStream.test.ts
    - .planning/phases/12-lost-wave-integrity/12-base.txt
    - .planning/phases/12-lost-wave-integrity/12-mutation-score.mjs
    - .planning/phases/12-lost-wave-integrity/12-mutation-base.json
    - .planning/phases/12-lost-wave-integrity/12-mutation-base-core.json
    - .planning/phases/12-lost-wave-integrity/12-mutation-base-http.json
    - .planning/phases/12-lost-wave-integrity/12-mutation-base-devtools.json
    - .planning/phases/12-lost-wave-integrity/12-mutation-base-react.json
  modified:
    - packages/core/src/index.ts
    - packages/http/src/DecisionLogHttp.ts
    - packages/http/src/DecisionStreamRoute.ts
    - packages/http/test/decisionStream.test.ts
    - packages/http/test/DecisionLogHttp.test.ts
    - packages/http/test/DecisionLogHttp.tst.ts
    - packages/http/test/DecisionStreamRoute.tst.ts

key-decisions:
  - "12-01 T1 (D-54-c/e) answered in _DECISIONS.md: `option-a` — \"Cursor order on the wire, ordered by core's encoder; remove `frame`, `syncedFrame`, `decisionFrames` from `@qadi/http` (Breaking)\""
  - "D-54-a A (writer half here), D-54-d A (no reader-side synced check) taken per D-02"
  - "D-54-f premise moved (merged ARCH-50 + CONTEXT D-03): core's encoder is codec-free; `encodeRecord` comes from the caller, http keeps its refusal words and spans byte-identical. Not ported from 6c67e44: core-side encodeStoredRecordString use, `encodeDecisionBacklog`, the reworded `qadi:` logs"

patterns-established:
  - "A structural `{ readEntries: () => Effect.succeed(read) }` drives encodeDecisionStream in tests"

requirements-completed: []

coverage:
  - id: D1
    description: "Cut after any of 4 backlog frames (at reversed vs arrival), resume with that id: every record exactly once"
    requirement: INT-01
    verification:
      - kind: test
        ref: "decisionStream.test.ts > resume with Last-Event-ID > a reconnect loses nothing > a reconnect during the backlog loses no retained record (RED f29b1bf, green bd6c447)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reconnect after the whole prelude with the last backlog id: only synced {\"backlog\":0}"
    requirement: INT-01
    verification:
      - kind: test
        ref: "… > a reconnect after the backlog re-sends nothing the reader has (RED f29b1bf, green bd6c447)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Order owned by core; route = encodeDecisionStream | sseText; DecisionLogHttp.ts the only reportEncodeRefusal caller"
    requirement: INT-02
    verification:
      - kind: test
        ref: "core DecisionStream.test.ts (5); http DecisionLogHttp.test.ts 12-cell table unchanged; grep gates"
        status: pass
    human_judgment: false
---

# Phase 12 Plan 01: The decision stream's writer — Summary

The backlog of `/__decisions` now travels in cursor order, decided once by `@qadi/core`'s new `encodeDecisionStream`, so a
`Last-Event-ID` is always the reader's highest position and a reconnect during or after the prelude neither loses nor
repeats a record. `@qadi/http` keeps the record bytes and its refusal words (`recordData`) and writes SSE text in one place
(`sseText`); `frame`, `syncedFrame` and `decisionFrames` are gone (option-a). Port of lost ARCH-54 (`6c67e44`), order logic
only, onto merged ARCH-50's `DecisionLogHttp.ts`.

## Decision applied

`_DECISIONS.md`, row "12-01 T1 (D-54-c/e)": **`option-a`** — "Cursor order on the wire, ordered by core's encoder; remove
`frame`, `syncedFrame`, `decisionFrames` from `@qadi/http` (Breaking)". The checkpoint was not re-asked.

## Phase base and mutation base (XC-05)

`phase_base: f1041fe` (`12-base.txt`). Scores at the base, from Stryker runs scoped with `--mutate` to the touched files
(a per-file score does not depend on what else is mutated under `perTest`; the exact commands are in the
`12-mutation-score.mjs` header, and `compare` needs the same scope):

| File | Base | After 12-01 |
|---|---|---|
| packages/core/src/DecisionLog.ts | 92.41 | 92.41 |
| packages/core/src/DecisionStream.ts | absent | 100.00 |
| packages/core/src/HydrationMetrics.ts | 100.00 | (not re-run, untouched) |
| packages/http/src/DecisionLogHttp.ts | 100.00 | 100.00 |
| packages/http/src/DecisionStreamRoute.ts | 97.44 | 100.00 |
| packages/devtools/src/model/Source.ts | 97.20 | (untouched) |
| packages/devtools/src/model/Hydration.ts | 100.00 | (untouched) |
| packages/react/src/HydrationEvent.ts | absent | absent |

`node .planning/phases/12-lost-wave-integrity/12-mutation-score.mjs compare` passes. Per-package maps are in
`12-mutation-base-{core,http,devtools,react}.json` (Phase 11's shape; scores there are percentages, not fractions).

## Commits

| sha | subject |
|---|---|
| 62ba83d | chore(12-01): record phase base |
| f29b1bf | test(12-01): RED — a reconnect during or after the backlog loses or repeats records |
| bd6c447 | feat(12-01): core's encodeDecisionStream owns the stream's order; /__decisions is its SSE adapter |
| 569bfce | refactor(12-01): @qadi/http drops frame, syncedFrame and decisionFrames; tests assert the same bytes through core's encoder |

RED seen at f29b1bf, three tests failing for the stated reason: P1 "cut after 1: expected ['r4'] to deeply equal
['r1','r2','r3','r4']", P2 "expected ['backlog','backlog','backlog','synced'] to deeply equal ['synced']", and the
inverted order test "expected ['a@Server','b@Server',…] to deeply equal ['b@Server','a@Server',…]".

## Gate-13 diff for 12-05

`pnpm spec:api` is red with exactly 6 drifts, as the plan expects:
- missing (new `@qadi/core` exports): `DecisionStreamFrame`, `EncodeDecisionStreamOptions`, `encodeDecisionStream`
- stale (removed `@qadi/http` exports): `frame`, `syncedFrame`, `decisionFrames` (spec/overview.md rows ~553–555)

`@qadi/http` removal is Breaking (minor, 0.x): needs a changeset and an upgrading.md entry (12-05). `@qadi/core` gains
exports (minor). BEH-QD-314's "backlog in storedRecordOrder" no longer holds on the wire: 12-05 must amend it.

## Removed-name gates (option-a), `/usr/bin/grep`, non-comment lines

- `syncedFrame|decisionFrames` in packages/http/src: 4 → 0
- `export { frame }` in DecisionStreamRoute.ts: 1 → 0
- `frameEntries|frameEntry|export const frame ` in packages/http/src: 7 → 0
- `"synced"|toSorted|.sort(` in the two http files: 0
- `last-event-id|parseLogCursor` in DecisionStreamRoute.ts: 2 → 1 (the header passed as `after`)
- `reportEncodeRefusal(` callers in packages/http/src other than DecisionLogHttp.ts: 0

## Tests deleted or rewritten (XC-05)

No test was deleted. Every test of a removed name was re-driven:
- `describe("frame")` (7 tests) → `describe("one record's frame")`: bytes through `encodeDecisionStream` + `sseText`
  (`frameOf`), refusals through `recordData` directly. Live frames now carry `id: 1.1`. The regexes were updated to the
  real line order (`id:` before `event:`).
- "one record cannot end the feed": `frame("backlog")` / `decisionFrames(read)` → `sseOf(read)`; `syncedFrame(n)` →
  the literal SSE text (`syncedText`).
- "decisionFrames writes wire version 2" → "a frame is written as wire version 2". One assertion removed: the
  `framed[1]` equals `frame("message", cursor)(…)` check. Its subject no longer exists, and the frame's exact bytes are
  still pinned whole by the `deepStrictEqual` just above it.
- `DecisionLogHttp.test.ts` "sse backlog"/"sse live" rows: `encodeDecisionStream` over a structural fake with
  `recordData(options)`, data read back with `decodeStoredRecordString`. The table's 12 expectations are unchanged.
- Type pins: `decisionFrames(entries[, picked])` → `recordData()`, `recordData(picked)`, `recordData(stream)`.
  `frame`'s closed-event pin → `sseText` over `DecisionStreamFrame`: a record frame needs an id and a known event, and
  `synced` takes no id.

Added: P1, P2 (with `framesUntil`/`firstBacklogFrames`; `prelude` now reads through `framesUntil`); "a recheck that
passes leaves the stream open" (kills `DecisionStreamRoute.ts`'s survivor `() => Effect.void` → `() => undefined`, checked
by applying the mutant by hand); `packages/core/test/DecisionStream.test.ts` (5 tests: cursor order whatever readEntries
returns, per-record drop + synced count, empty read, `after` parsing, opening on first pull).

## Deviations

1. **[Rule 2: missing coverage] `packages/core/test/DecisionStream.test.ts` created here, not in 12-02.** Core's Stryker
   run uses only core's tests, so the new file scored 0 (18 NoCoverage) and `compare` failed. The 5 encoder tests bring it
   to 100. **12-02 should extend this file** (its plan says "write"). Its header names the round trip and the properties as
   12-02's work.
2. **[Rule 2] Added the passing-recheck test** so `DecisionStreamRoute.ts` does not drop below its base. Moving the
   framing code to core left its one pre-existing survivor over a smaller denominator: 38/39 → 30/31.
3. **Task 2's `decisionFrames` became a one-line wrapper over `encodeDecisionStream`, instead of staying on the old
   code.** The inverted order test reads through `framesOf` → `decisionFrames`, so it could not pass otherwise. Task 3
   then removed the wrapper.
4. Phase-base Stryker runs were **scoped** with `--mutate` to the touched files, not the whole configs. They give the
   same per-file scores and ran in minutes. The script also writes Phase-11-style per-package snapshots, as the
   orchestrator asked.
5. `encodeDecisionStream`'s live drop uses `Result.fromOption(frame, () => undefined)`. The first version passed
   `() => entry`, which left one equivalent survivor.

## Gate results

- Task 2 verify: http suites (decisionStream, decisionBacklog, DecisionLogHttp), tstyche (2 files), `pnpm typecheck`,
  `pnpm lint`, `pnpm circular`, all grep gates — green.
- Task 3 verify: whole http project (282 tests), tstyche, typecheck, lint (house-style 416 files clean), circular, synced/sort
  gate — green.
- Also run: `pnpm test` (160 files / 4099 tests) and `pnpm test:bdd` (562) green; `pnpm spec:api` red as expected (above).
- Not run: full `pnpm check:pr` (spec:api is known red until 12-05).

## Notes for the next plan

- 12-02: `packages/core/test/DecisionStream.test.ts` already exists. Extend it; do not recreate it. `DecisionStream.ts`
  imports the vocabulary from `./DecisionLog.ts` until 12-02 moves it.
- Changesets / upgrading.md / BEH-QD-314 amendment / overview rows: 12-05.
