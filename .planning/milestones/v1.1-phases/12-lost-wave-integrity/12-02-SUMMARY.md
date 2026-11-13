---
phase: 12-lost-wave-integrity
plan: 02
subsystem: decision-stream
tags: [integrity, decision-log, sse, resume, property-test, lost-wave-port]

requires: ["12-01"]
provides:
  - "`@qadi/core` `decodeDecisionStream` / `ReceivedFrame` / `DecisionStreamRead`: the reader's rules (prelude up to synced, sync timeout, early message live, later synced skipped, backlog in storedRecordOrder), codec-free via `decodeRecord` (INT-01)"
  - "Round-trip and resume properties (fast-check, 100 runs each) joining encodeDecisionStream and decodeDecisionStream; the resume property fails with the encoder's cursor sort removed"
  - "`@qadi/devtools` `sourceFromEventSource` is the EventSource adapter only, over decodeDecisionStream; exported signature unchanged (INT-02)"
  - "Acceptance: a reconnect during the backlog loses nothing, through the real route, the platform SSE parser and sourceFromEventSource"
  - "Stream vocabulary (DecisionStreamEvent, DecisionRecordEvent, DecisionStreamSynced, formatLogCursor, parseLogCursor) declared in DecisionStream.ts; DecisionLog.ts imports nothing from it (D-54-b A)"
affects: [12-05]

actuals:
  tokens: 110000
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns: ["fc.assert(fc.asyncProperty(..., (x) => Effect.runPromise(...))) inside it.effect + Effect.promise (as audit's SignatureLedger.test.ts)", "property frames kept finite (a log whose live half is Stream.empty) so no mutant can hang on the sync timeout"]

key-files:
  created:
    - packages/core/test/DecisionStream.tst.ts
  modified:
    - packages/core/src/DecisionStream.ts
    - packages/core/src/DecisionLog.ts
    - packages/core/test/DecisionStream.test.ts
    - packages/core/test/DecisionLog.test.ts
    - packages/core/test/DecisionLog.tst.ts
    - packages/devtools/src/model/Source.ts
    - packages/devtools/test/model/Source.test.ts
    - packages/devtools/test/model/Source.tst.ts
    - features/features/decision-log/decision-log.feature
    - features/features/decision-log/decision-log.steps.test.ts

key-decisions:
  - "No checkpoint in this plan. 12-01's `_DECISIONS.md` answer stands: `option-a` — \"Cursor order on the wire, ordered by core's encoder; remove `frame`, `syncedFrame`, `decisionFrames` from `@qadi/http` (Breaking)\""
  - "D-54-a A (reader half here), D-54-b A (vocabulary moves), D-54-d A (synced's count not read; documented on decodeDecisionStream), D-03 (codec stays the caller's: devtools' decodeFrame(onMalformed) is decodeRecord). Not ported from 6c67e44: core-side decodeFrame/warnUnreadable/onUnreadable, exported DEFAULT_SYNC_TIMEOUT (module-private here), SourceRead = DecisionStreamRead alias (SourceRead kept as is; DecisionStreamRead is assignable to it, pinned)"

patterns-established:
  - "A negative tstyche `toBeCallableWith` on a function returning an Effect is vacuous (the Effect LSP's floatingEffect diagnostic makes every call 'not callable'): pin through `Parameters<typeof f>[n]` with type arguments instead"

requirements-completed: []

coverage:
  - id: D1
    description: "Round trip: decode(encode(log)) = retained encodable records in storedRecordOrder; synced count = backlog frames sent (100 runs, 0–40 arrivals, at any integer or NaN, Edge, codec-refused, capacity 1–48)"
    requirement: INT-01
    verification:
      - kind: test
        ref: "core DecisionStream.test.ts > the order, written and read back (ARCH-60) > round trip"
        status: pass
    human_judgment: false
  - id: D2
    description: "Resume: cut after every record frame, reconnect with its id, the reader's backlog is every retained encodable record once (100 runs); fails without the encoder sort"
    requirement: INT-01
    verification:
      - kind: test
        ref: "core DecisionStream.test.ts > … > resume (counterexample with sort removed: at 1 then 0, cut after frame 1 → ['r1@Server'])"
        status: pass
    human_judgment: false
  - id: D3
    description: "devtools is the EventSource adapter over decodeDecisionStream; reconnect acceptance through the real stack"
    requirement: INT-02
    verification:
      - kind: test
        ref: "decision-log.feature > A reconnect during the backlog loses nothing; Source.test.ts adapter tests; Source.tst.ts signature pin"
        status: pass
    human_judgment: false
---

# Phase 12 Plan 02: The decision stream's reader — Summary

The reader's half of `/__decisions` is core's now: `decodeDecisionStream` reads frames back as a backlog (or none) and
a live stream, with the prelude, sync-timeout, early-message and repeated-`synced` rules that `@qadi/devtools` used
to restate. Two fast-check properties join it to 12-01's `encodeDecisionStream`, an acceptance scenario proves a
mid-backlog reconnect through the real stack loses nothing, and the stream vocabulary moved into `DecisionStream.ts`.

## Decision applied

No `checkpoint:decision` in 12-02. The phase's one stream decision, `_DECISIONS.md` row "12-01 T1 (D-54-c/e)":
**`option-a`** — "Cursor order on the wire, ordered by core's encoder; remove `frame`, `syncedFrame`, `decisionFrames`
from `@qadi/http` (Breaking)". The resume property and the acceptance scenario are its proof.

## Commits

| sha | subject |
|---|---|
| 1f41e08 | test(12-02): RED — decodeDecisionStream's prelude rules and the round-trip and resume properties |
| ff067c7 | feat(12-02): core's decodeDecisionStream reads the stream's order back |
| 838bf9f | test(12-02): acceptance — a reconnect during the backlog loses nothing |
| 0554656 | refactor(12-02): sourceFromEventSource is the EventSource adapter over core's decodeDecisionStream |
| 57a5a47 | refactor(12-02): the stream vocabulary moves into DecisionStream.ts, with its tests |
| a9f99e1 | test(12-02): keep the touched files' mutation scores at or above the phase base |

## RED evidence (XC-06)

- Task 1: at 1f41e08, 13 of 18 tests in `DecisionStream.test.ts` failed (decodeDecisionStream not exported).
- Resume property with the encoder's `toSorted((a, b) => a.cursor.seq - b.cursor.seq)` removed: fails, shrunk to
  `arrivals [{at:1},{at:0}], capacity 2` — "cut after frame 1 of 2: expected ['r1@Server'] to deeply equal
  ['r1@Server','r0@Server']". Restored → passes. (The round-trip property passes either way, as it should: the
  decoder sorts for presentation.)
- Acceptance: already green after 12-01's writer fix (563/563). With the sort removed from core's source and
  `lib/` rebuilt (`tsc -b packages/core`), it failed: the reader held `['back-2']` of `back-0..2`. Restored and
  rebuilt → 563/563.

## Exports for 12-05 (gate 13)

`pnpm spec:api` now shows 9 drifts (12-01's 6 plus 3):
- missing, new here: `ReceivedFrame`, `DecisionStreamRead`, `decodeDecisionStream` (all `packages/core/src/DecisionStream.ts`)
- missing, from 12-01: `DecisionStreamFrame`, `EncodeDecisionStreamOptions`, `encodeDecisionStream`
- stale, from 12-01: `frame`, `syncedFrame`, `decisionFrames`
- Not flagged by the gate but wrong after the move: `spec/overview.md` rows ~300–301 say `formatLogCursor`,
  `parseLogCursor`, `DecisionStreamEvent`, `DecisionRecordEvent`, `DecisionStreamSynced` live in `DecisionLog.ts`;
  they are declared in `DecisionStream.ts` now (same barrel names, no consumer change).
- `@qadi/devtools`: no export changed (`sourceFromEventSource` signature pinned in `Source.tst.ts`). Patch changeset.

## Deleted / moved tests (XC-05)

Deleted from `packages/devtools/test/model/Source.test.ts`, each with a pointer comment to its core cover in
`DecisionStream.test.ts` > "decodeDecisionStream — the prelude (ADR-QD-097)":

| Deleted devtools test | Core cover |
|---|---|
| a prelude becomes the backlog, in storedRecordOrder | a prelude becomes the backlog, presented in storedRecordOrder whatever order it arrived in |
| synced with zero backlog frames is an empty backlog… | synced with no backlog frames is an empty backlog, not an absent one |
| a message before synced is live… | a message before synced is live, not backlog, and the wait for the prelude continues |
| message frames with no prelude wait out syncTimeout… | no synced within syncTimeout: the backlog is absent and the frames seen arrive live, in order |
| a timeout keeps the backlog frames that did arrive… | the same test (its first frame is a backlog frame) |
| a reconnect's backlog frames arrive live, and its synced is ignored | frames in the same chunk as synced start the live half in order; a later synced is skipped |

Kept (adapter behaviour): the silent-server test, retitled "opens the connection at once and hands syncTimeout to the
decoder" (it is what kills a dropped `syncTimeout` forwarding), and "a backlog frame that does not decode is reported"
(onMalformed through `decodeRecord`). Every other adapter test is unchanged (33 tests in the file).

Moved in Task 3: "formats and parses a cursor, strictly" and the three "protocol words (ARCH-28)" tests from
`DecisionLog.test.ts`, and the `DecisionStreamEvent`/`DecisionRecordEvent` pin from `DecisionLog.tst.ts`, into the
`DecisionStream` files.

## Mutation (XC-05)

`node .planning/phases/12-lost-wave-integrity/12-mutation-score.mjs compare` passes, with the scoped runs in its header
(core and devtools re-run here; http unchanged since 12-01):

| File | Base | After 12-01 | After 12-02 |
|---|---|---|---|
| packages/core/src/DecisionLog.ts | 92.41 | 92.41 | 92.75 |
| packages/core/src/DecisionStream.ts | absent | 100.00 | 97.22 |
| packages/devtools/src/model/Source.ts | 97.20 | — | 100.00 |
| packages/core/src/HydrationMetrics.ts | 100.00 | — | 100.00 |

DecisionStream.ts's two survivors are `Stream.toQueue(frames, { capacity: "unbounded" })`'s option (`{}` and `""`):
equivalent, any capacity delivers the same frames in the same order. It was 100 after 12-01 because only the encoder
existed then.

## Deviations

1. **[Rule 2: coverage] Mutation hardening commit (a9f99e1).** Moving the vocabulary (and its killed mutants) out of
   `DecisionLog.ts` dropped it to 91.30 over the same six pre-existing survivors; asserting the capacity error's full
   text brings it to 92.75. Decoder survivors were killed by asserting what `decodeRecord` is offered, and
   `Option.getOrElse(synced, () => false)` became `Option.exists(synced, (preluded) => preluded)` (the old form had an
   equivalent mutant).
2. **Type pins through `Parameters<…>` instead of `toBeCallableWith`.** A negative `toBeCallableWith` on a function
   returning an Effect passed vacuously (checked: it also "passed" with valid arguments), because of the Effect LSP's
   floatingEffect diagnostic. The pins now assert assignability to the options type, and each was checked to fail
   when flipped.
3. **`Source.tst.ts` gained two pins** (the exported `sourceFromEventSource` type, and `DecisionStreamRead` assignable
   to `SourceRead`), so "same exported signature" is checked rather than asserted.
4. **Property generator also varies `capacity` (1–48)**, so eviction is exercised; "retained" is the log's snapshot.
5. The acceptance step's stand-in `EventSource` builds its request with `new Headers(...)`, not a widened
   `Record<string, string>`.

## Gate results

- Task 1 verify (core DecisionStream suite, tstyche, typecheck, lint, circular, both greps): green.
- Task 2 verify (devtools Source suite, tstyche, `pnpm test:bdd` 563, typecheck, lint, circular, the four greps:
  prelude names 9 → 0, `storedRecordOrder` lines 4 → 3, scenarios 5 → 6): green.
- Task 3 verify (core DecisionLog + DecisionStream suites, both tstyche files, typecheck, lint, circular, vocabulary
  lines in DecisionLog.ts 7 → 0, no `./DecisionStream.ts` import): green.
- Plan verification: `vitest --project core` 1944, `--project devtools` 983, `--project http` 282 — all green.
- `pnpm spec:api` red, 9 drifts, as expected until 12-05. Full `pnpm check:pr` not run (gate 13 known red).

## Notes for the next plan

- 12-05: the 9 gate-13 drifts above, plus overview rows ~300–301 (module now `DecisionStream.ts`); BEH/INV for the
  reader moving to core and the reconnect scenario (`@REQ-QD-033` feature, new scenario "A reconnect during the
  backlog loses nothing"); ADR-QD-047's text ("the reader restates the order") if it says so; changesets: core minor
  (new exports), devtools patch.
- `DecisionStream.ts` imports `LogCursor`/`LogEntry`/`DecisionLog` types from `./DecisionLog.ts`; the reverse import
  does not exist.
