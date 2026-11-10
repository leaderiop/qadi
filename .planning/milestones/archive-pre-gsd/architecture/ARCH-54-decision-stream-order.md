---
id: ARCH-54
title: The decision stream's protocol order has one owner — a transport-free module in core encodes a log read into frames and decodes frames back into a read; SSE bytes stay in http, the EventSource adapter in devtools, and a reconnect during the backlog stops losing records
strength: Worth exploring   # 2026-10-13 review, card 9. The card's named gap (no `synced{n}` check) is refuted in §1; the order investigation found a live data-loss defect (P1) the card did not name, which raises the case
status: superseded-by-phase-12
disposition: "ported by Phase 12 (ARCH-60; INT-01, INT-02) from rescue/wave5-1013 6c67e44; was `done` on the unmerged branch only (wave 6, 2026-11-10)"
evidence_verified_at: b655b3b
depends_on: []              # ARCH-11, ARCH-19, ARCH-28 are done and are built on, not redone
blocks: []
adrs_touched:
  - ADR-QD-097 (amend, Rev 1.4: the order D-11-f/D-11-g name is declared once in core as an encode/decode pair; backlog frames travel in cursor order, not `storedRecordOrder`; `@qadi/http`'s `frame`/`syncedFrame`/`decisionFrames` leave the surface. "The SSE framing stays in `@qadi/http`" (2026-10-07 amendment) is kept word for word — the byte encoding does not move)
  - ADR-QD-046 (read: SSE, guarded, no unguarded variant, `reauth` — all unchanged; the recheck is ARCH-47's)
  - ADR-QD-047 (read: the model keeps its source adapters, `mergeSources` and the timeline; one cross-reference sentence — the stream's order is core's, the `EventSource` adapter is the model's)
  - ADR-QD-036 (read: `@qadi/http` keeps both routes and their signatures; only three test-only functions leave)
  - ADR-QD-099 (constraint: the new core names are reachable only through the root barrel; the three http names become unimportable; gate 13 rows move in the same commit)
  - ADR-QD-095 / ADR-QD-096 (read: the record wire is versioned *inside* the envelope; the stream's framing — event names, `synced`, order — is not versioned and does not need to be for this change, §4)
  - ADR-QD-012 (constraint: the decoder's prelude wait is `Effect.sleep`/`Effect.timeoutOption`, so `TestClock` drives it)
  - ADR-QD-073 (constraint: the per-frame paths stay plain closures, never a named `Effect.fn`; `UNTRACED_BUDGET` unchanged)
  - ADR-QD-081 D-04-d (precedent: names removed without shims, one breaking `minor`)
  - ADR-QD-037 (constraint: madge; `DecisionStream.ts` imports `DecisionLog.ts`, never the reverse)
  - ADR-QD-038 (constraint: changesets only; no release without the user's explicit go-ahead)
packages: ["@qadi/core", "@qadi/http", "@qadi/devtools", "features (decision-log)", "spec", "apps/website (docs)"]
estimate: L   # complete path T0–T10 ≈ 3–4 days. Defect-only path (T1, shippable alone as a patch) ≈ ½ day (S)
---

# ARCH-54 — The decision stream's protocol order has one owner

## 1. Verified evidence (at `b655b3b`)

Checked on `main` at `b655b3b` (`git rev-parse --short HEAD`). Nothing in the repository was
edited. Probes live in
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/f10e9d09-77ac-4671-a5f3-770ae101c6fe/scratchpad/wave5/ARCH-54/`:

- **`probe-resume.mjs`** — a real `makeDecisionLog`, two records whose `at` order is the reverse
  of their arrival order, `@qadi/http`'s `decisionFrames` over `readEntries()`, then the connection
  "drops" after the first backlog frame and `readEntries(parseLogCursor(<that frame's id>))` is
  framed as the reconnect. Run against built `lib/`: `node probe-resume.mjs`.
- **`probe-reader-src.mts`** — the same writer, parsed with `effect/encoding/Sse`'s own parser,
  fed through `@qadi/devtools`' `sourceFromEventSource` with a scripted `open`, against **HEAD
  source** (the `bun` export condition resolves `@qadi/*` to `src/`). Run:
  `NODE_OPTIONS="--conditions=bun" <repo>/node_modules/.bin/tsx probe-reader-src.mts`.
- **`probe-fix.mts`** — `probe-reader-src.mts` with the backlog sorted by cursor before framing
  (the D-54-c candidate). Same run command.
- Baseline: `pnpm vitest run packages/http/test/decisionStream.test.ts packages/devtools/test/model/Source.test.ts packages/core/test/DecisionLog.test.ts`
  → 3 files, 109 tests, all green.

`probe-reader-src.mts` output (HEAD source):

```
frames seen: [ 'backlog#2:{"environment":"Serv', 'synced:{"backlog":0}' ]
reader backlog: [ 'started-first' ] (log holds 2: finished-first, started-first)
```

`probe-fix.mts` output: `reader backlog: [ 'started-first', 'finished-first' ]`.

| # | Claim (review card 9, or found here) | Verdict | At `b655b3b` |
| - | ------------------------------------ | ------- | ------------ |
| C1 | ARCH-28 moved the protocol's *words* into core, not its *order* | **CONFIRMED** | `packages/core/src/DecisionLog.ts` — `DecisionStreamEvent`, `DecisionRecordEvent`, `DecisionStreamSynced`, `formatLogCursor`, `parseLogCursor` (≈`:103-152`). The order (`backlog*` → one `synced{n}` → `message*`) is written by `packages/http/src/DecisionStreamRoute.ts` — `decisionFrames` (≈`:185-216`), with `frame` (≈`:138`) and `syncedFrame` (≈`:151`). |
| C2 | The reader is a second, separate state machine over the same order | **CONFIRMED** | `packages/devtools/src/model/Source.ts` — `sourceFromEventSource`: `awaitPrelude` (≈`:187`) collects frames until `synced`; `liveAfter` (≈`:195`) drops later `synced`s; a `message` before `synced` stays live (≈`:216`); the backlog is sorted by `storedRecordOrder` (≈`:217`); no prelude within `syncTimeout` (`DEFAULT_SYNC_TIMEOUT`, ≈`:95`) leaves it absent. Each rule is the writer's order restated. |
| C3 | No unit test joins writer and reader; only an acceptance scenario does | **CONFIRMED** | `grep -rln "@qadi/http" packages/devtools/test packages/devtools/package.json` and `grep -rln "@qadi/devtools" packages/http/test packages/http/package.json` → nothing. `Source.test.ts` hand-writes frames (`queueEvent("synced", '{"backlog":2}')`, ≈`:227`); `decisionStream.test.ts` splits response text on `"\n\n"` (≈`:930`, `:967`). The only join is `features/features/decision-log/decision-log.steps.test.ts` — `pipedEventSource`, five scenarios, none of which reconnects. |
| C4 | The reader never checks `synced{n}` against the backlog frames it got — "a correctness gap" | **CONFIRMED as fact, REFUTED as the gap** | True: `awaitPrelude` ends on `next.event === "synced"` and ignores `data`. But this was decided on purpose — ARCH-28 **D-28-e = A** ("a count mismatch inside one TCP connection is not a failure the reader can act on"). And the probe shows the count could not have caught the real loss: the lossy reconnect's `synced` says `{"backlog":0}`, which is *correct* for that connection — the reader cannot attribute frames to connections (`DecisionEventSource` has no open signal), so a total-count check would false-alarm on every legitimate resume and a per-connection one passes on the lossy resume. See D-54-d. |
| C5 | `frame`, `syncedFrame`, `decisionFrames` are public only to be testable; the only external user is `decisionStream.test.ts` | **CONFIRMED** | Doc comments: `frame` "Exported so the refusal can be tested directly", `decisionFrames` "Exported for the same reason `frame` is". `spec/overview.md` rows (≈`:610-612`) say the same. `git grep -n "decisionFrames\|syncedFrame" -- examples apps scripts features` → nothing; `packages/http/test/decisionStream.test.ts` is the only importer. |
| C6 | ARCH-19 and ARCH-28 already settled those three exports | **CHANGED — neither did** | ARCH-19 C5/§3: "`frame`/`decisionFrames`/`syncedFrame` are **not** decided here — ARCH-28 moves the frame vocabulary". ARCH-28 §3: "What http exports … is ARCH-19's question." ARCH-19's progress log: "ARCH-28 left `frame`/`decisionFrames`/`syncedFrame` in http, untouched". Each deferred to the other; the question is open and is D-54-e. ARCH-28 D-28-b = B (the frame *encoders* stay in http) is a decision about where `Sse.encoder.write` lives, and this plan keeps it (§3). |
| C7 | Core's vocabulary lives in `DecisionLog.ts` or a `DecisionStream*` module | **CONFIRMED (`DecisionLog.ts`)** | ARCH-28 D-28-a = A put it beside `LogCursor`. No `DecisionStream*.ts` exists in `packages/core/src`. |
| C8 | `DecisionBacklogRoute.ts` duplicates the stream route's refusal reporting | **CONFIRMED** | `packages/http/src/DecisionBacklogRoute.ts` — its own `reportRefused` (`Effect.fn("qadi.http.decisionBacklog.refused")`) beside `DecisionStreamRoute.ts`'s (`Effect.fn("qadi.http.decisionStream.refused")`); both wrap core's `reportEncodeRefusal` with a different message. ARCH-57 lists the same pair. See D-54-f. |
| C9 | Reconnect / `Last-Event-ID` semantics | **CONFIRMED, and defective (P1)** | `DecisionStreamRoute.ts` — `decisionStreamRoute` parses `last-event-id` with `parseLogCursor` and calls `log.readEntries(after)`; `DecisionLog.ts` — `readEntries` keeps `entry.cursor.seq > resumeAfter`. Every `backlog`/`message` frame's SSE `id` is its record's cursor. See P1. |
| P1 | **NEW — DEFECT: a reconnect during the prelude silently loses records.** | **CONFIRMED (probe, HEAD source)** | The backlog is sent in `storedRecordOrder` (by `at`) — `readEntries` returns `presented(entries)` (`DecisionLog.ts` — `presented`, `toSorted(byRecord)`), and BEH-QD-314 *requires* it. But a frame's `id` is a **position** (`<epoch>.<seq>`), and resume keeps only `seq > Last-Event-ID`. When `at` order ≠ arrival order, the reader's last-seen id is not its highest position: every record with a lower `seq` that had not been sent yet is skipped by the resume and never delivered. The reader reports nothing (no `onMalformed`, no error); its backlog is simply short. `at` is the evaluation's **start** time (`Lifecycle.ts` — `stamp = { evaluationId, at: startedAt }`) while the record is appended at the **end**, so any two overlapping evaluations that finish out of start order produce this; so does every `ingest`ed `Edge` record, whose `at` is another process's clock. A test pins the defective order: `decisionStream.test.ts` — "a reader receives the backlog, then synced, then live frames" asserts "The backlog is in `storedRecordOrder`, not arrival order". |
| P2 | NEW — after the prelude, a reconnect whose last id is a backlog frame re-sends records the reader has | **CONFIRMED (by reading), benign** | Same cause as P1: with no live frame yet, `Last-Event-ID` is the *latest-`at`* backlog frame, not the highest `seq`, so every higher-`seq` record is sent again. The timeline absorbs repeats (INV-QD-039), so nothing is wrong on screen, but BEH-QD-316's "a reconnect costs what was missed" is false. Fixed by the same change as P1. |
| P3 | NEW — a resume across eviction is silent | **CONFIRMED (by reading), out of scope** | A cursor older than the log's oldest retained record resumes after it; records evicted while disconnected are gone with no signal. This is the bounded log working as documented (BEH-QD-201, "a display buffer, not a retention policy"). Recorded in §3, not fixed. |

Reader-side rules re-checked against P1's fix (`probe-fix.mts`): `sourceFromEventSource` already
sorts its backlog by `storedRecordOrder`, and the timeline is a function of the *set* of records
(INV-QD-039), so sending the backlog in cursor order changes nothing a devtools user sees except
that the lost record now appears.

## 2. Goal and success criteria

Make the decision stream's **order** a deep module in core: one interface with two functions —
`encodeDecisionStream` (a log read → frames, in protocol order, each record frame carrying its
resume position) and `decodeDecisionStream` (frames as a reader received them → a read: a backlog,
or none, and a live stream). Every order rule — the prelude, the `synced` marker and its count,
what a frame before or after it means, the sync timeout, the wire order that makes a resume exact,
the presentation order a reader shows — lives behind that interface, with its locality in one file
and its leverage in both packages. The seam between core and each transport is a transport-free
frame value `{ event, id?, data }`: `@qadi/http` is an adapter that turns frames into SSE bytes
(`Sse.encoder.write` + `Stream.encodeText`) and `@qadi/devtools` is an adapter that turns
`EventSource` callbacks into frames. Because both ends now sit in one module, a round-trip property
(encode then decode gives back the log's read) and a resume property (cut the stream after any
record frame, resume from its id, and nothing retained is lost) sit beside the vocabulary — the
test that would have caught P1, and the one ARCH-28 said was missing when only acceptance caught a
rename. P1 is fixed first, as a test-first patch that can ship ahead of the refactor.

Success criteria:

1. **P1 fixed.** A route-level test cuts the prelude after every backlog frame of a log whose `at`
   order is the reverse of its arrival order, resumes with that frame's id, and finds every record
   exactly once across the two connections; it fails at `b655b3b` and passes after T1
   (`pnpm vitest run packages/http/test/decisionStream.test.ts -t "loses no retained record"`).
2. `packages/core/src/DecisionStream.ts` exists and exports `encodeDecisionStream`,
   `decodeDecisionStream`, `DecisionStreamFrame`, `ReceivedFrame`, `DecisionStreamRead` (and the
   moved vocabulary, D-54-b). `grep -n "DecisionStreamEvent\|DecisionStreamSynced" packages/core/src/DecisionLog.ts` → nothing (D-54-b = A).
3. `packages/core/test/DecisionStream.test.ts` holds the **round-trip property** and the **resume
   property** over generated logs (arbitrary `at` including `NaN`, arbitrary arrival order,
   refused records, `Edge` ingests), each ≥100 runs; both run in the core Stryker configuration's
   test directory.
4. `@qadi/http` has no protocol order of its own: `grep -n '"synced"\|"backlog"\|syncedFrame\|decisionFrames\|export const frame' packages/http/src/*.ts` → nothing; `DecisionStreamRoute.ts`'s
   body is `encodeDecisionStream(…)` mapped through one private SSE adapter.
5. `@qadi/devtools` has no protocol order of its own: `sourceFromEventSource` opens the
   `EventSource`, queues `{ event, data }` and calls `decodeDecisionStream`;
   `grep -n "awaitPrelude\|liveAfter\|storedRecordOrder" packages/devtools/src/model/Source.ts`
   matches only `mergeSources`' sort.
6. `frame`, `syncedFrame`, `decisionFrames` are not exported from `@qadi/http` (D-54-e = A):
   `node scripts/check-api-surface.mjs` passes with their rows removed and the new core rows added.
7. `grep -rn "reportEncodeRefusal" packages/http/src` → nothing (D-54-f = A): both read shapes are
   encoded, and their refusals reported, by core.
8. One new acceptance scenario, "A reconnect during the backlog loses nothing", in
   `features/features/decision-log/decision-log.feature`, passes through the real route, the
   platform SSE parser and `sourceFromEventSource`.
9. `pnpm check` passes.

## 3. Non-goals

- **The SSE byte encoding does not move.** `Sse.encoder.write` and `Stream.encodeText` stay in
  `@qadi/http` (ADR-QD-097's 2026-10-07 amendment; ARCH-28 D-28-b ≠ C). Core gains no import of
  `effect/encoding/Sse`; a frame is a plain record whose fields happen to map one-to-one onto an
  SSE event. That is the whole point of the seam.
- **The `EventSource` adapter does not move.** `DecisionEventSource`, `openEventSource`, the
  "no global `EventSource`" construction-time throw, `onDisconnect`, and the `DecodeRefusal` →
  `MalformedReason` mapping with its default warning stay in `@qadi/devtools` (ADR-QD-047).
- **No change to `decisionStreamRoute`'s or `decisionBacklogRoute`'s signatures**, guards, headers,
  `reauth`, or registration. The recheck (`recheck` in `DecisionStreamRoute.ts`) is ARCH-47's; the
  routes' `loadNoResource` argument is ARCH-57's.
- **No reader-side `synced` count check** unless D-54-d says otherwise (ARCH-28 D-28-e stands).
- **No eviction-gap signal (P3).** Telling a resuming reader "records between your cursor and my
  oldest were evicted" is a protocol extension (a field on `synced`); nothing asks for it yet, and
  the log is documented as a display buffer. Recorded as a follow-up in §9.
- **No protocol version.** §4 explains why the order change needs none.
- **`/__decisions/backlog` keeps `storedRecordOrder`.** It is one JSON array with no resume, so
  presentation order is right there; only the stream's prelude changes order.
- **`mergeSources`, the timeline, `sourceFromRecords`** — untouched.
- **ARCH-55's barrel shape.** If ARCH-55 lands first, the new module's names are added to its
  named barrel; this plan does not decide the barrel's form.

## 4. Constraints

| Constraint | Consequence here |
| --- | --- |
| AGENTS.md §1 | `DecisionStream.ts` uses `import * as Effect from "effect/Effect"` (Stream, Duration, Option, Result, Schema, Scope likewise) and `.ts` relative imports; http and devtools import `{ encodeDecisionStream }` / `{ decodeDecisionStream }` by name from `@qadi/core`; type-only imports are `import type`. |
| AGENTS.md §5 / ADR-QD-073 / `UNTRACED_BUDGET` | `decodeDecisionStream` is an exported effectful function → `Effect.fn("qadi.decisionStream.decode")`. The per-frame paths (frame one record, decode one frame) stay plain closures returning `Effect`/`Result` exactly as `decisionFrames`' `framed` and `Source.ts`'s `decodeFrame` are today: they run once per record, and a named span there costs ≈2.8 µs. The refusal branch keeps a named `Effect.fn` (it runs only on refusal). No `Effect.fnUntraced` anywhere: the budget stays at 3. |
| AGENTS.md §5a / `SWITCH_BUDGET` | Branching on a frame's `event` is a three-literal comparison, not `_tag` dispatch; keep `===` as `Source.ts` does today, or a module-scope `Match.type<DecisionStreamEvent>()`. Never a `switch`, never `Match.value` per frame. |
| AGENTS.md §6 | No `as`, no `!`, no `Date.now`. The wait is `Effect.timeoutOption` over `Effect.sleep`-based time (ADR-QD-012) so `TestClock` drives it; sorting by cursor reads `entry.cursor.seq`, never a parsed string. |
| AGENTS.md §9 / ADR-QD-099 | `export * from "./DecisionStream.ts"` in `packages/core/src/index.ts`, alphabetical (between `DecisionSinkForwarding.ts` and `DecisionWire.ts`) — or a named line if ARCH-55's named barrel has landed. No new subpath entry point. The three http names leave the barrel and so become unimportable. |
| AGENTS.md §10 / coverage | Core is held at 95%; the moved logic must be fully covered by core tests (the devtools tests that covered it move with it, §7). http and devtools stay ≥90% after losing code — they lose tests in proportion. |
| Stryker (`stryker.config.mjs`, gate 16) | Core's run pins its vitest `dir` to `packages/core`: every mutant in `DecisionStream.ts` must be killed by `packages/core/test/**`, so the refusal, timeout, chunk-straddle and resume tests **must** live in core, not be left behind in http/devtools. `ignoreStatic: true` means the moved schemas add no mutants. `stryker.http.mjs` (gate 21) and `stryker.devtools.mjs` (gate 17) lose mutants with the moved code; their scores must stay ≥80%. |
| ADR-QD-037 / gate 5 (`pnpm circular`) | `DecisionStream.ts` imports `DecisionLog.ts` (types `LogEntry`, `LogCursor`, `DecisionLog`), `DecisionRecord.ts` (`storedRecordOrder`, `StoredRecord`), `SinkCodec.ts`, `SinkWire.ts` (`DecodeRefusal`), `EncodeRefusalReport.ts`, `Errors.ts`. Nothing in core imports `DecisionLog.ts` but the barrel today, so moving the vocabulary out cannot create a cycle; `DecisionLog.ts` must not import `DecisionStream.ts`. Core never imports http or devtools (package graph). |
| Gate 13 (`check-api-surface.mjs`) | Same commit as the export change: new core rows; the vocabulary row's file column changes to `DecisionStream.ts`; the `frame`, `syncedFrame`, `decisionFrames` rows are deleted; devtools' `Source` row mentions `decodeDecisionStream`. |
| Gate 12 (`check-devtools-claims.mjs`) | `spec/devtools-spec/00-overview.md` (≈`:69`) describes the prelude; if edited, it must not introduce a statement of absence without a "Claims of absence" row. This plan only re-points the sentence at core. |
| Gate 9 / §12 fences | The behavior-doc signature blocks are ` ```ts ` (not compiled). If T8 adds a runnable ` ```typescript ` example of `decodeDecisionStream`, it must compile. |
| Gate 10 (`verify-traceability.sh --strict`) | New INV and BEH ids need their traceability rows and back-links in the same change; ADR-QD-097's Document ID stays `QADI-ADR-097`. |
| ADR-QD-095 / ADR-QD-096 (wire versioning) | **The stream itself is not versioned** — only the record inside each envelope is (`version: 2`). This change needs no version: a current devtools reading a fixed server sorts its backlog anyway and folds by set (INV-QD-039); an older devtools (≥0.11) reading a fixed server is identical; a fixed devtools reading an older server still loses on a mid-prelude reconnect (the fix is the writer's), which the changeset says. The only reader that could notice is a third party that relied on BEH-QD-314's `storedRecordOrder` for display; the changeset names it. |
| ADR-QD-081 D-04-d | Removing `frame`/`syncedFrame`/`decisionFrames` without shims is a breaking `minor` in the fixed group (0.x). |
| ADR-QD-038 / user memory "no new releases" | Changesets are written; nothing is versioned or published. A release needs the user's explicit "the release". |
| `SCHEMA_ERROR_BUDGET`, `ANY_BUDGET`, `HAS_CUSTOM_BUDGET`, `PORT_DOUBLE_BUDGET`, `DECISION_READ_BUDGET` | Untouched: no error class, no `any`, no `hasCustom`, no port double, no `AsyncResult` read. |

## 5. Decisions needed before work starts

### D-54-a — What core owns: the shape of the order module
- **A. Both directions, stream-level (recommended).**
  `encodeDecisionStream(log: Pick<DecisionLog, "readEntries">, options?: { after?: string; onRefused? }): Stream<DecisionStreamFrame>`
  opens the read when the stream is first pulled (so the route's "subscription lives in the
  response's scope" property is the module's), parses `after` (the transport's resume text) with
  `parseLogCursor`, orders the backlog by cursor (D-54-c), frames each record through
  `encodeStoredRecordString`, reports and drops refusals, counts what it sent into `synced`, then
  the live records. `decodeDecisionStream(frames: Stream<ReceivedFrame>, options?: { syncTimeout?; onUnreadable? }): Effect<DecisionStreamRead, never, Scope>`
  holds every reader rule now in `sourceFromEventSource`. Deepest: two functions hide the whole
  order, and the round-trip property is literally `decode(encode(log))`. The transports become
  thin adapters.
- **B. A pure fold in core, plumbing in each package.** Core exports a `step(state, input)` reducer
  (inputs: a frame or "timed out"; outputs: backlog / live records) and a writer that takes an
  already-opened `DecisionLogEntries`. Testable without Effect, but the interface is wider (state
  type, input union, output union) and each adapter re-implements the queue, the timeout and the
  scope handling around it — the order is in core, but the *handoff* to Effect is restated twice.
- **C. Status quo plus one contract test.** Keep both state machines; add a test package (or a
  core test that imports nothing from http/devtools by re-implementing both) that joins them.
  Cheapest; it fixes C3's test gap but not C1/C2's locality, and a third copy of the order lives in
  the test.
- **Recommendation: A.** `status: open`

### D-54-b — Where the module lives, and whether the vocabulary moves with it
- **A. New `packages/core/src/DecisionStream.ts`, taking the vocabulary and the cursor text with it
  (recommended).** `DecisionStreamEvent`, `DecisionRecordEvent`, `DecisionStreamSynced`,
  `formatLogCursor`, `parseLogCursor` move out of `DecisionLog.ts`; `LogCursor`, `LogEntry`,
  `DecisionLogEntries` stay (they are the log's read). With `export *` barrels no import site
  changes. ARCH-28 D-28-a rejected a new module because it "churns three public names' home for no
  behavior change"; there is now behavior to own (≈250 lines in two directions), so the reason no
  longer holds — this extends D-28-a rather than reopening it. `DecisionLog.ts` returns to being
  the log.
- **B. Add the two functions to `DecisionLog.ts`.** No new module, but a 350-line log module grows
  to ≈600 lines holding two concerns (retention and handoff; wire order), and the transport-free
  frame type sits beside `PubSub` plumbing.
- **C. New module, vocabulary stays in `DecisionLog.ts`.** The order module imports its own words
  from a sibling; the words and the order are split again, one level down.
- **Recommendation: A.** Coordinate with ARCH-55 (§9): this module is deep by construction and
  should not be on ARCH-55's merge list. `status: open`

### D-54-c — How P1 is fixed
- **A. Backlog frames travel in cursor order; the encoder sorts (recommended).** The protocol
  module sorts the read's backlog by `cursor.seq` (one read, one epoch) before framing, whatever
  order its `readEntries` returned — so a structural `DecisionLogReader` fake cannot reintroduce the
  defect. A frame's id is then monotone, `Last-Event-ID` is the reader's highest position, and a
  resume is exact (also fixes P2). Presentation order is the reader's: `decodeDecisionStream` sorts
  by `storedRecordOrder`, as `Source.ts` already does. `readEntries`/`read` are untouched.
  Verified by `probe-fix.mts`.
- **B. `readEntries` returns cursor order; `read` presents.** Same wire effect, and `readEntries`'
  order then matches its "only what followed it" contract. But the fix lives in the log, not the
  module that owns the order, so the protocol's correctness depends on its input's order — a
  property no type states — and the existing "read is readEntries without a cursor, mapped to
  records" test and contract change.
- **C. Keep `storedRecordOrder`; backlog frames carry no `id`, and `synced` carries the read's
  high-water cursor as its `id`.** A drop mid-prelude then resumes from the *previous* connection's
  last id (or none) and re-sends the whole backlog — no loss, but every mid-prelude reconnect
  re-reads up to `capacity` frames, and it reverses BEH-QD-316's "`synced` MUST carry none" and
  "every `backlog` frame MUST carry its cursor".
- **Recommendation: A.** `status: open` — **T1 needs only this decision**; it does not wait on the
  rest.

### D-54-d — Does the decoder check `synced{n}`?
- **A. No — ARCH-28 D-28-e stands, with a second reason (recommended).** Inside one connection TCP
  delivers every frame the writer sent, and the reader already reports each undecodable one
  (`onMalformed`). Across connections the reader cannot tell which frames belong to which (no open
  signal), and the probe shows the one real loss (P1) arrives with a *correct* per-connection
  count. The writer-side law — "`n` is the backlog frames this connection sent" — is pinned by the
  round-trip property instead (T4), where it can actually fail.
- **B. Per-connection check.** Add an optional `onOpen` to `DecisionEventSource`, feed an `Opened`
  input to the decoder, compare each connection's count, and on mismatch leave the backlog absent
  and report. Complete in form, but it adds a public member and a reporting path for a mismatch no
  test can produce from a real writer, and it would not have caught P1.
- **C. Drop `n` from the wire.** Changes a frame every reader parses, for nothing.
- **Recommendation: A.** `status: open`

### D-54-e — Do `frame`, `syncedFrame`, `decisionFrames` leave `@qadi/http`'s interface? (breaking)
- **A. Remove all three, without shims (recommended).** Their behavior is now core's
  `encodeDecisionStream`, which is public and frame-valued (testable without splitting strings).
  What remains in http is one private function, `sseText(frame)`. Follows ADR-QD-081 D-04-d and
  ARCH-19 D-19-c (`reauthCheck`, removed for the same "exists for tests" reason). No in-repo
  importer outside http's own test (C5).
- **B. Keep them as deprecated wrappers over core for one minor.** Non-breaking, but two surfaces
  per concept and gate-13 rows for each, layering rather than replacing.
- **C. Keep `decisionFrames` only, as "the route's body for a custom transport".** A custom
  transport is better served by `encodeDecisionStream`'s frame values than by SSE text.
- **Recommendation: A.** `status: open`

### D-54-f — Who owns encoding and refusal reporting for both read shapes (`reportRefused` ×2)
- **A. Core owns both (recommended).** The stream's refusal path moves into `encodeDecisionStream`
  with the rest of the order; the JSON backlog's per-record encode-or-report loop becomes core's
  `encodeDecisionBacklog(records, { onRefused? }): Effect<ReadonlyArray<StoredRecordJson>>` beside
  it, sharing one private refusal step. `@qadi/http` then has no `reportEncodeRefusal` call at all,
  and ARCH-57 drops its `reportRefused` item. Log messages become `qadi: a decision record could
  not be framed` / `qadi: a decision record could not be served in the backlog` (prefix `qadi/http:`
  → `qadi:`), and the two spans become `qadi.decisionStream.refused` / `qadi.decisionBacklog.refused` —
  an observable change the changeset names.
- **B. Only the stream's copy moves; the backlog route keeps its own.** Smaller, but one http
  module still restates "encode each, report and drop a refusal", and ARCH-57 still has an item.
- **C. Leave both to ARCH-57.** Then the stream's refusal path stays in http while the rest of its
  order moves — the module would not own "the count is what was actually sent".
- **Recommendation: A**, keeping the message texts' meaning and the `onRefused` contract
  (BEH-QD-311, BEH-QD-315) unchanged. `status: open`

## 6. Tasks

### T0 — Re-verify the evidence at the branch point
- **Status:** [x] done
- **Depends on:** —
- **Files:** none (read-only); probes in the scratch directory above
- **Steps:**
  1. `git checkout main && git pull && git checkout -b arch-54-decision-stream-order`; record `git rev-parse --short HEAD`.
  2. Re-run `probe-reader-src.mts` (command in §1). Expect `reader backlog: [ 'started-first' ]`. If it
     prints both records, P1 was fixed elsewhere — find the commit and re-scope T1.
  3. Re-check every symbol in §1's table by name (`grep -n "export const frame\|export const syncedFrame\|const reportRefused\|export const decisionFrames" packages/http/src/DecisionStreamRoute.ts`;
     `grep -n "export const DecisionStreamEvent\|const presented\|const readEntries" packages/core/src/DecisionLog.ts`;
     `grep -n "awaitPrelude\|liveAfter\|DEFAULT_SYNC_TIMEOUT" packages/devtools/src/model/Source.ts`).
  4. Check which siblings have landed and rebase targets: ARCH-47 (`recheck` / `authorizeRequest`
     in `DecisionStreamRoute.ts`), ARCH-55 (core barrel form; module merges), ARCH-57
     (`addGuardedRoute` loader; `reportRefused`). Note each in §10.
  5. `git grep -n "decisionFrames\|syncedFrame" -- ':!packages/http' ':!*.md' ':!.planning'` → expect nothing.
  6. `grep -n "storedRecordOrder" packages/http/test/decisionStream.test.ts` — list every test that
     asserts the wire backlog's order (at `b655b3b`: "a reader receives the backlog, then synced,
     then live frames").
  7. Baseline: `pnpm vitest run packages/http/test/decisionStream.test.ts packages/http/test/decisionBacklog.test.ts packages/devtools/test/model/Source.test.ts packages/core/test/DecisionLog.test.ts`.
- **Tests:** none added.
- **Verify:** the commands above.
- **Done when:** §10 has a T0 row naming the branch-point sha, P1's probe result, and which siblings landed.

### T1 — Test-first: a reconnect during the prelude loses no retained record (P1; shippable alone)
- **Status:** [x] done
- **Depends on:** T0, D-54-c
- **Files:** `packages/http/test/decisionStream.test.ts`, `packages/http/src/DecisionStreamRoute.ts`,
  `spec/behaviors/26-decision-stream.md`, `spec/invariants.md`, `spec/traceability.md`,
  `.changeset/decision-stream-resume-order.md` (*new*)
- **Steps:**
  1. In `describe("resume with Last-Event-ID")`, add **"a reconnect after any backlog frame loses no
     retained record (P1)"**: `TestClock.setTime(1_700)`; through `appLayer`, `log.ingest` three
     `obligations` records whose `at` is the reverse of their arrival — `("c", 3)`, `("b", 2)`, `("a", 1)`
     (seq 1, 2, 3). For each cut `k ∈ {1, 2, 3}`: `first = prelude(handler)`; keep its first `k`
     `backlog` frames; `resumed = prelude(handler, idOf(<k-th frame>))`; collect the evaluation ids of
     the kept frames and of `resumed`'s `backlog` frames (decode with `decodeStoredRecordString`, as
     the neighbouring test does); assert the multiset equals `{a, b, c}` — every record, once.
  2. Add **"backlog frames travel in cursor order, so the last id seen is the highest position"**:
     same log; assert `first`'s `backlog` ids are `["1700.1", "1700.2", "1700.3"]`.
  3. Run `pnpm vitest run packages/http/test/decisionStream.test.ts -t "loses no retained record"` →
     **red** at the branch point. Expected at `b655b3b` (wire order `a`·3, `b`·2, `c`·1 by `at`):
     k = 1 keeps `a` and resumes after seq 3 → nothing, so `b` and `c` are lost; k = 2 keeps `a`, `b`
     and resumes after seq 2 → `a` again, so `c` is lost and `a` repeats; k = 3 resumes after seq 1 →
     `b`, `a` repeat. Record the actual output in §10.
  4. Fix (D-54-c = A, interim home until T5): in `decisionFrames`, frame
     `read.backlog.toSorted((x, y) => x.cursor.seq - y.cursor.seq)` instead of `read.backlog`. Update
     the module doc comment ("oldest first in `storedRecordOrder`" → "in cursor order — the order of
     their ids, so `Last-Event-ID` is the reader's highest position; a reader presents them by
     `storedRecordOrder`") and `decisionFrames`' doc comment.
  5. Update the test that pins the defect — "a reader receives the backlog, then synced, then live
     frames": its comment and assertion become "The backlog is in cursor (arrival) order; a reader
     presents it by `storedRecordOrder`", expecting `["b@Server", "a@Server", "live@Server"]`.
  6. Spec, same commit: BEH-QD-314's first requirement — "one `event: backlog` frame per retained
     record, in `storedRecordOrder`" → "…in cursor order"; add to BEH-QD-316: "REQUIREMENT: Backlog
     frames MUST be sent in cursor order, so that resuming after any `id` a reader received loses no
     record the log still retains." Revision bump, change-history line citing CCR-QD-NEXT. Add
     **INV-QD-NEXT — "A resumed read loses no retained record"**: for every prefix of a connection
     ending at a record frame with id *c*, that prefix's records plus a read resumed after *c* hold
     every record the first read held that the log still retains. Source: the encoder's cursor
     order + `readEntries`' `seq > after`. Enforcement: this test now, T4's property later.
     Traceability rows for both.
  7. `.changeset/decision-stream-resume-order.md`: `"@qadi/http": patch` — "**Fix:** a devtools
     reader whose `/__decisions` connection dropped during the backlog and reconnected could
     silently miss records. Backlog frames are now sent in cursor order (each frame's `id`), so a
     `Last-Event-ID` resume is exact. A reader that displayed backlog frames in arrival order and
     relied on them being sorted by time must now sort them (`@qadi/devtools` already does)."
- **Tests:** the two above (new, red first); one assertion inverted (step 5).
- **Verify:** `pnpm vitest run packages/http/test/decisionStream.test.ts`; `pnpm vitest run packages/devtools/test/model/Source.test.ts`; `pnpm --filter @qadi/features test`; `bash spec/scripts/verify-traceability.sh --strict`; `pnpm typecheck`.
- **Done when:** both new tests green, the step-3 red run is recorded in §10, and this commit alone
  passes `pnpm check:pr` — it can merge and ship as a patch before T2.

### T2 — `DecisionStream.ts`: the vocabulary and the encoder in core
- **Status:** [x] done
- **Depends on:** T1, D-54-a, D-54-b, D-54-f
- **Files:** `packages/core/src/DecisionStream.ts` (*new*), `packages/core/src/DecisionLog.ts`,
  `packages/core/src/index.ts`, `packages/core/test/DecisionStream.test.ts` (*new*),
  `packages/core/test/DecisionLog.test.ts`, `packages/core/test/DecisionStream.tst.ts` (*new*),
  `packages/core/test/DecisionLog.tst.ts`
- **Steps:**
  1. Create `DecisionStream.ts` with a module doc comment: one-line summary ("The decision
     stream's order: a log read as frames, and frames back as a read"), then the why (ARCH-28 moved
     the words, this moves the order; ADR-QD-097 amendment; P1).
  2. Move, verbatim with their doc comments, `DecisionStreamEvent`, `DecisionRecordEvent`,
     `DecisionStreamSynced`, `formatLogCursor`, `parseLogCursor` (and the private `CURSOR` regex)
     from `DecisionLog.ts`. Leave `LogCursor`, `LogEntry`, `DecisionLogEntries` in `DecisionLog.ts`;
     remove its now-unused `Schema`/`Option` imports if nothing else uses them. Update the moved
     comment "Declared here, beside `LogCursor`" to "Declared here, beside the order that uses them".
  3. Declare the frame:
     ```ts
     export type DecisionStreamFrame =
       | { readonly event: DecisionRecordEvent; readonly id: string; readonly data: string }
       | { readonly event: "synced"; readonly id?: undefined; readonly data: string };
     ```
     (`id`: the record's position, `formatLogCursor(cursor)`, which a transport sends back to
     resume; `data`: the stored-record envelope text, or the `DecisionStreamSynced` JSON.)
  4. Add `encodeDecisionStream(log, options?)` — `log: Pick<DecisionLog, "readEntries">`,
     `options?: { readonly after?: string | undefined; readonly onRefused?: (refusal: SinkRecordNotEncodable) => void }`:
     `Stream.unwrap(Effect.map(log.readEntries(Option.getOrUndefined(Option.flatMap(Option.fromNullishOr(options?.after), parseLogCursor))), (read) => …))`.
     Inside: backlog sorted by `cursor.seq` (T1's rule moves here), each entry framed by a private
     plain closure `frameEntry(event)(entry)` →
     `Result.map(encodeStoredRecordString(entry.record), (data) => ({ event, id: formatLogCursor(entry.cursor), data }))`;
     a refusal goes to the private `refused` step (step 6) and is dropped; then
     `{ event: "synced", data: JSON.stringify(Schema.encodeSync(DecisionStreamSynced)({ backlog: sent })) }`;
     then `Stream.filterMapEffect(read.live, frameEntry("message"))`. Port `decisionFrames`' logic,
     not its strings.
  5. Add `encodeDecisionBacklog(records: ReadonlyArray<StoredRecord>, options?: { onRefused? }): Effect<ReadonlyArray<StoredRecordJson>>`
     (D-54-f = A): the loop from `decisionBacklogRoute`, in `storedRecordOrder` as given.
  6. One private refusal step, `Effect.fn("qadi.decisionStream.refused")` /
     `Effect.fn("qadi.decisionBacklog.refused")` (two names, one body helper) calling
     `reportEncodeRefusal(refusal, { message, onRefused })` with the D-54-f messages.
  7. Barrel: `export * from "./DecisionStream.ts";` between `DecisionSinkForwarding.ts` and
     `DecisionWire.ts` (or the ARCH-55 named form).
  8. Move the vocabulary tests from `DecisionLog.test.ts` (the `DecisionStreamEvent` golden,
     `Schema.is`, `DecisionStreamSynced` accept/refuse, `parseLogCursor`/`formatLogCursor` cases) to
     `DecisionStream.test.ts`; move the matching `DecisionLog.tst.ts` assertions to
     `DecisionStream.tst.ts`. Delete them from the old files (replace, don't layer).
  9. Port http's frame-level tests to frame values in `DecisionStream.test.ts` (list in §7): the
     refusal cases (cyclic `cause`, `BigInt`, `Error` cause, no-resource, `Edge`), "a refused record
     calls onRefused once and the next record is still framed", "a throwing onRefused…", "with no
     onRefused, the refusal is logged with its reason and path", "EncodeFailed logs an empty path",
     "wire version 2", "backlog, then synced, then live", "empty log → `synced` 0", "a record made
     while the prelude is sent arrives once, live", "resume: only what followed a cursor of this
     epoch; another epoch or junk → full backlog", T1's cursor-order assertion, and the
     `encodeDecisionBacklog` refusal cases from `decisionBacklog.test.ts`.
- **Tests:** `DecisionStream.test.ts` (ported + new); `DecisionStream.tst.ts`:
  `expect(encodeDecisionStream).type…` returns `Stream<DecisionStreamFrame, never, never>`;
  a `DecisionStreamFrame` with `event: "synced"` and an `id` string does not compile.
- **Verify:** `pnpm vitest run packages/core/test/DecisionStream.test.ts packages/core/test/DecisionLog.test.ts`; `pnpm test:tstyche`; `pnpm typecheck`; `pnpm circular`; `node scripts/check-house-style.mjs`.
- **Done when:** core compiles and its tests pass with the encoder in place; http still compiles
  against the moved names (barrel `export *`), untouched so far.

### T3 — `decodeDecisionStream`: the reader's order in core
- **Status:** [x] done
- **Depends on:** T2, D-54-d
- **Files:** `packages/core/src/DecisionStream.ts`, `packages/core/test/DecisionStream.test.ts`,
  `packages/core/test/DecisionStream.tst.ts`
- **Steps:**
  1. Declare `export interface ReceivedFrame { readonly event: DecisionStreamEvent; readonly data: string }`
     (a `DecisionStreamFrame` is one, structurally — the round-trip needs no mapping) and
     `export interface DecisionStreamRead { readonly backlog?: ReadonlyArray<StoredRecord>; readonly live: Stream.Stream<StoredRecord> }`
     with the absent-versus-empty doc paragraph moved from devtools' `SourceRead`.
  2. Add `export const DEFAULT_SYNC_TIMEOUT: Duration.Input = "2 seconds"` (moved from `Source.ts`).
  3. Add `decodeDecisionStream = Effect.fn("qadi.decisionStream.decode")(function* (frames: Stream.Stream<ReceivedFrame>, options?: { readonly syncTimeout?: Duration.Input; readonly onUnreadable?: (data: string, refusal: DecodeRefusal) => Effect.Effect<void> })`
     returning `DecisionStreamRead` in `Scope`. Port `sourceFromEventSource`'s `read` body:
     pull frames in the scope (`Stream.toPull`, or `Stream.runIntoQueue` into a scoped
     `Queue.unbounded` and `Queue.take` — choose by a 10-minute spike in the scratch dir and record
     it in §10); `awaitPrelude` with `Effect.timeoutOption(…, options?.syncTimeout ?? DEFAULT_SYNC_TIMEOUT)`;
     on timeout `{ live }` with every early frame first; on `synced`, decode early `backlog` frames
     into the backlog, sort by `storedRecordOrder`, keep early `message` frames live; the live half
     drops every later `synced` and decodes each frame through a plain `decodeFrame` closure that
     calls `decodeStoredRecordString` and, on failure, `onUnreadable(data, error.refusal)` (default:
     `Effect.void` — the devtools adapter supplies the warning, §3). `synced`'s data is not read
     (D-54-d = A); say so in the doc comment, citing D-28-e and P1.
  4. **Chunk straddle**: if pulling yields a chunk that holds `synced` and frames after it, the
     frames after `synced` must start the live half in order, not be dropped or treated as backlog.
     Write that test before choosing step 3's pull mechanism.
  5. Port the devtools prelude tests to `decodeDecisionStream` over `Stream.fromIterable`/a queue of
     `ReceivedFrame`s (list in §7), with `TestClock.adjust` for the timeout cases.
- **Tests:** ported prelude tests; new chunk-straddle test; new "a frame for an event outside
  `DecisionStreamEvent` cannot be constructed" in `.tst.ts`.
- **Verify:** `pnpm vitest run packages/core/test/DecisionStream.test.ts`; `pnpm test:tstyche`; `pnpm typecheck`.
- **Done when:** every reader rule in `Source.ts` has a core test against `decodeDecisionStream`,
  green.

### T4 — The round-trip and resume properties beside the vocabulary
- **Status:** [x] done
- **Depends on:** T3
- **Files:** `packages/core/test/DecisionStream.test.ts`
- **Steps:**
  1. A generator (FastCheck, as `DecisionLog.test.ts` imports it) of log histories: 0–40 records,
     each an `ObligationRecord` or a `DecisionRecord`, `at` from `{ finite integers, NaN }`,
     arrival order independent of `at`, an optional environment per record (`ingest(r, "Edge")`),
     and a small fraction built to be refused by the codec (a cyclic or `BigInt` `cause`, the shapes
     the ported refusal tests use).
  2. **Round-trip** (`it.effect.prop` or `FastCheck.assert` inside `it.effect`, ≥100 runs): make a
     log, ingest the history, then in one scope `decodeDecisionStream(encodeDecisionStream(log))`;
     ingest 0–5 more records; assert `backlog` deep-equals `(yield* log.read).backlog` minus the
     refused records (same records, `storedRecordOrder`), the first n live records equal what was
     ingested after, in order, and the `synced` frame's `backlog` equals the number of `backlog`
     frames the encoder emitted (pinning the writer-side law D-54-d relies on).
  3. **Resume** (≥100 runs): same generator; take the encoder's frames up to `synced`; for every cut
     after a record frame, resume `encodeDecisionStream(log, { after: frame.id })` up to its
     `synced`; assert the union of the cut prefix's records and the resumed backlog is exactly the
     retained, encodable records (as a multiset: no loss, and — with cursor order — no repeat).
     Run this against T1's interim `decisionFrames` before T5 deletes it, by reverting the sort
     locally: it must fail (record the counterexample in §10), proving the property would have
     caught P1.
  4. **Decode totality**: arbitrary `ReceivedFrame` sequences (any event, any data string) never
     fail or die `decodeDecisionStream`; every frame is either a record, reported unreadable, or a
     `synced`.
- **Tests:** three properties.
- **Verify:** `pnpm vitest run packages/core/test/DecisionStream.test.ts`; `pnpm coverage` (core ≥95%).
- **Done when:** the three properties pass at ≥100 runs and the reverted-sort run fails.

### T5 — `@qadi/http` becomes the SSE adapter only
- **Status:** [x] done
- **Depends on:** T2, D-54-e, D-54-f
- **Files:** `packages/http/src/DecisionStreamRoute.ts`, `packages/http/src/DecisionBacklogRoute.ts`,
  `packages/http/test/decisionStream.test.ts`, `packages/http/test/decisionBacklog.test.ts`
- **Steps:**
  1. In `DecisionStreamRoute.ts`, delete `frame`, `syncedFrame`, `reportRefused`, `decisionFrames`
     and the imports only they used (`Filter`, `Result`, `Schema`, `DecisionStreamSynced`,
     `encodeStoredRecordString`, `formatLogCursor`, `parseLogCursor`, `reportEncodeRefusal`, the
     `DecisionRecordEvent`/`LogCursor`/`LogEntry`/`StoredRecord`/`SinkRecordNotEncodable` types if unused).
  2. Add the private adapter: `const sseText = (frame: DecisionStreamFrame): string => Sse.encoder.write({ _tag: "Event", event: frame.event, id: frame.id, data: frame.data })`
     with a doc comment carrying the existing "the same encoder `HttpApiBuilder`'s `StreamSse`
     machinery calls" rationale (H6, ADR-QD-072).
  3. In `decisionStreamRoute`'s handler: `const frames = encodeDecisionStream(log, { after: request.headers["last-event-id"], onRefused: options?.onRefused }).pipe(Stream.map(sseText), Stream.encodeText);`
     Keep the `reauth` merge, `Stream.provideContext`, headers and the `reauth.interval` throw unchanged.
  4. Rewrite the module doc comment's "What a reader receives, in order" to point at core's
     `encodeDecisionStream` for the order and keep only what is http's: SSE, guarded, headers,
     `reauth`, why not a WebSocket.
  5. In `DecisionBacklogRoute.ts`: `const body = yield* encodeDecisionBacklog(yield* log.snapshot, options);`
     then the unchanged `HttpServerResponse.text(JSON.stringify(body), …)`; delete its `reportRefused`
     and the `encodeStoredRecord`/`reportEncodeRefusal`/`Result` imports. (Keep
     `Pick<DecisionStreamOptions, "onRefused">` as the options type.)
  6. Tests: delete `describe("frame")`, `describe("decisionFrames writes wire version 2")` and the
     `decisionFrames`-driven cases of "one record cannot end the feed" and "the backlog travels on
     the stream" — ported in T2. Keep, through the route's real response: anonymous/non-holder
     refusals, `text/event-stream` + headers, registration, all `reauth` tests, "through the route,
     a cyclic or BigInt cause ends no subscriber", "through the route: a permitted caller's response
     starts with the prelude", the three resume tests, T1's two tests. Replace string splitting with
     `effect/encoding/Sse`'s `makeParser` (one local helper `eventsOf(text)`), the parser the
     acceptance steps already use. `decisionBacklog.test.ts` keeps its route tests; its refusal-log
     message assertions change to the D-54-f text.
- **Tests:** as in step 6; no http test imports `frame`/`syncedFrame`/`decisionFrames`.
- **Verify:** `pnpm vitest run packages/http/test/decisionStream.test.ts packages/http/test/decisionBacklog.test.ts`; `pnpm typecheck`; `grep -rn "reportEncodeRefusal\|\"synced\"" packages/http/src` → nothing.
- **Done when:** http compiles with no protocol order of its own and its route tests pass.

### T6 — `@qadi/devtools`' `sourceFromEventSource` becomes the `EventSource` adapter only
- **Status:** [x] done
- **Depends on:** T3
- **Files:** `packages/devtools/src/model/Source.ts`, `packages/devtools/test/model/Source.test.ts`,
  `packages/devtools/test/model/Source.tst.ts`
- **Steps:**
  1. `read` becomes: allocate `Queue.unbounded<ReceivedFrame>()`; the unchanged
     `Effect.acquireRelease` that opens the source, registers one listener per
     `DecisionStreamEvent.literals` offering `{ event, data }`, wires `onError` → `onDisconnect`,
     and closes on release; then `return yield* decodeDecisionStream(Stream.fromQueue(frames), { syncTimeout: options.syncTimeout, onUnreadable: (data, refusal) => malformed(data, reasonOf(refusal), options.onMalformed) })`
     (with `malformed` returning `Effect<void>` instead of the filter `Result`).
  2. Delete `Frame`, `DEFAULT_SYNC_TIMEOUT`, `awaitPrelude`, `liveAfter`, `decodeFrame`, and the
     `storedRecordOrder`/`decodeStoredRecordString`/`Option`/`Result`/`Filter` imports they used
     (`mergeSources` keeps `storedRecordOrder`).
  3. `SourceRead`: keep the public name; declare it `export type SourceRead = DecisionStreamRead`
     so the absent-versus-empty contract is stated once (core's doc), and keep a one-line pointer
     comment. `Source.tst.ts` adds `expect<SourceRead>().type.toBe<DecisionStreamRead>()`.
  4. Rewrite `sourceFromEventSource`'s doc comment: what it adapts, the construction-time throw,
     `onMalformed`'s five reasons, `onDisconnect`; the order paragraphs become one sentence pointing at
     `decodeDecisionStream`.
  5. Tests: delete `describe("the prelude (ADR-QD-097)")` (ported in T3). Keep: environment off the
     wire, every `MalformedReason` mapping (not-json, too-deep, not-a-record, unsupported-version,
     inconsistent), default warning, connection error reported / not a crash, closed with the scope,
     the default `EventSource` tests, the no-global throw, and all of `mergeSources`,
     `sourceFromRecords`, "a DecisionLog used as a source". Keep **one** prelude smoke test ("a
     prelude becomes the backlog, in `storedRecordOrder`") to prove the adapter is wired to the
     decoder.
- **Tests:** as in step 5.
- **Verify:** `pnpm vitest run packages/devtools/test/model/Source.test.ts`; `pnpm test:tstyche`; `pnpm typecheck`; `pnpm coverage` (devtools ≥90%).
- **Done when:** `grep -n "awaitPrelude\|liveAfter" packages/devtools/src/model/Source.ts` → nothing; tests green.

### T7 — Acceptance: a reconnect during the backlog loses nothing
- **Status:** [x] done
- **Depends on:** T1 (the scenario passes from T1 on; it is placed here so it runs against the final adapters)
- **Files:** `features/features/decision-log/decision-log.feature`,
  `features/features/decision-log/decision-log.steps.test.ts`
- **Steps:**
  1. Add the scenario:
     ```gherkin
     Scenario: A reconnect during the backlog loses nothing
       Given a server decision log holding 3 decisions made in the reverse order of their start
       When a devtools reader connects over SSE and the connection drops after 1 backlog frame
       Then its backlog holds 3 records labelled "Server"
     ```
  2. Steps: extend `pipedEventSource` with an optional `dropAfter` count — after that many `backlog`
     events it cancels the body and re-requests with `last-event-id` set to the last event's `id`
     (the parser's `Event.id`), as a browser's `EventSource` does; the listener map is reused, so
     the reader sees one continuous source. The `Given` ingests records with `at` 3, 2, 1.
  3. `REQ-QD-033`'s traceability row gains INV-QD-NEXT (T1).
- **Tests:** the scenario.
- **Verify:** `pnpm --filter @qadi/features test`.
- **Done when:** the scenario passes; reverting T1's sort locally makes it fail (recorded in §10).

### T8 — Spec, ADR amendment, overview, traceability, CCR, docs, changeset
- **Status:** [x] done
- **Depends on:** T2–T7
- **Files:** `spec/decisions/097-a-decision-log-is-a-sink-and-its-own-history.md`,
  `spec/decisions/047-a-headless-devtools-model.md`, `spec/decisions/index.yaml` (if it carries
  revisions), `spec/behaviors/26-decision-stream.md`, `spec/behaviors/27-devtools-timeline.md`,
  `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`, the CCR log,
  `spec/devtools-spec/00-overview.md`, `apps/website/src/content/docs/docs/packages/devtools.md`,
  `apps/website/src/content/docs/docs/concepts/decision-lifecycle.md`,
  `apps/website/src/content/docs/docs/reference/upgrading.md`,
  `.changeset/decision-stream-order-in-core.md` (*new*)
- **Steps:** as listed in §8, item by item.
- **Tests:** none; gates 9–13 and 23 check the documents.
- **Verify:** `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/check-api-surface.mjs`; `node scripts/check-devtools-claims.mjs`; `node scripts/check-doc-examples.mjs`; `node scripts/check-website-doc-examples.mjs`.
- **Done when:** all five pass.

### T9 — Full gate
- **Status:** [x] done
- **Depends on:** T8
- **Files:** —
- **Steps:**
  1. `pnpm check` (includes all three Stryker runs this touches: gates 16, 17, 21).
  2. If a core mutant in `DecisionStream.ts` survives, add the killing test in `packages/core/test`
     (never in http/devtools — core's runner cannot see them).
- **Verify:** `pnpm check`
- **Done when:** green; mutation scores for core, devtools model and http each ≥80% and recorded in §10.

### T10 — Update the tracker
- **Status:** [x] done
- **Depends on:** T9
- **Files:** this plan; `.planning/architecture/README.md` (wave-5 table)
- **Steps:** set `status: done`, record each decision's outcome, add the §10 row with real CCR/ADR
  numbers, mark ARCH-57's `reportRefused` item superseded if D-54-f = A.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-54-*.md`
- **Done when:** the plan reads `done`.

## 7. Test strategy

**Replace, don't layer.** The order is tested once, in core, against its interface; each adapter
keeps only the tests of what it adapts.

| Test (today) | Fate |
| --- | --- |
| `DecisionLog.test.ts` — vocabulary golden, `Schema.is`, `DecisionStreamSynced` accept/refuse, cursor parse/format | **Move** to `DecisionStream.test.ts` (T2) |
| `DecisionLog.tst.ts` — the closed event union, `DecisionRecordEvent` | **Move** to `DecisionStream.tst.ts` |
| `DecisionLog.test.ts` — log, handoff, INV-QD-100 property, `readEntries(after)` | **Stay** (the log is unchanged) |
| `decisionStream.test.ts` — `describe("frame")` (6 cases) | **Move** to core as `encodeDecisionStream` frame-value cases; **delete** here |
| `decisionStream.test.ts` — "one record cannot end the feed" via `decisionFrames` (refused / throwing hook / default log / `EncodeFailed`) | **Move** to core; the route-level "cyclic or BigInt cause ends no subscriber" **stays** |
| `decisionStream.test.ts` — "decisionFrames writes wire version 2" | **Move** to core |
| `decisionStream.test.ts` — "the backlog travels on the stream" via `decisionFrames` | **Move** to core; "through the route: … starts with the prelude" **stays**, parsed with `Sse.makeParser` |
| `decisionStream.test.ts` — `/__decisions` guard, headers, registration, `reauth` | **Stay** unchanged |
| `decisionStream.test.ts` — "resume with Last-Event-ID" (3) + T1's two | **Stay** at the route (the header is the route's input); core gets the resume property |
| `decisionBacklog.test.ts` | **Stay** through the route; refusal message text updated (D-54-f); core gets `encodeDecisionBacklog` unit cases |
| `Source.test.ts` — "the prelude (ADR-QD-097)" (8 cases) | **Move** to core against `decodeDecisionStream`; one smoke test stays |
| `Source.test.ts` — environment, malformed reasons, default warning, connection, default `EventSource`, `mergeSources`, `sourceFromRecords` | **Stay** |
| `features/…/decision-log` | **Stay**, plus T7's scenario |

**New, in core** (`DecisionStream.test.ts`): the round-trip property (encode→decode is the log's
read; `synced`'s count is the backlog frames emitted), the resume property (no loss, no repeat,
for every cut — the test that fails on P1), decode totality over arbitrary frame sequences, the
chunk-straddle case, and `TestClock`-driven timeout cases.

**Differential**: the round-trip property is a differential between two implementations of
"the log's read" — `log.read` in process and `decode(encode(log))` across the frame seam — the same
thing the acceptance scenario "the reader over SSE sees what a reader in the process sees" checks
once, now checked over generated histories.

**Mutation**: `DecisionStream.ts` is under `stryker.config.mjs` (gate 16), whose runner sees only
`packages/core/test` — which is why every moved test lands there. Expected survivors to watch: the
`??` default on `syncTimeout` (killed by a test that omits it and adjusts the clock by exactly two
seconds), the cursor-sort comparator (killed by the resume property), the `synced` count
(killed by the round-trip's count assertion). `stryker.http.mjs` and `stryker.devtools.mjs` lose
the moved code and its tests together; re-check their scores at T9.

## 8. Spec and documentation updates

- **ADR-QD-097** — Rev 1.4, a dated amendment at the top (above the 2026-10-07 one), status line
  "amended 2026-10-NN (the protocol's order is core's)", change-history row. Draft:

  > **Amendment (2026-10-NN, the protocol's order is core's — ARCH-54, CCR-QD-NEXT):** the order
  > D-11-f and D-11-g name — one `backlog` frame per retained record, one `synced` (`{"backlog":n}`,
  > `n` the backlog frames actually sent), then `message` frames, every record frame's `id` its
  > cursor — and the reader's rules — a `message` before `synced` is live; a later `synced` is a
  > reconnect's and is ignored, its `backlog` frames live; no prelude within `syncTimeout` leaves
  > the backlog absent; the backlog is presented in `storedRecordOrder` — are declared once, in
  > `@qadi/core`'s `DecisionStream.ts`, as `encodeDecisionStream` (a log read to frames) and
  > `decodeDecisionStream` (frames to a read), with the 2026-10-07 vocabulary and the cursor text
  > beside them. A frame is a transport-free value `{ event, id?, data }`. **The SSE framing stays in
  > `@qadi/http`** — it is now only that — and the `EventSource` adapter in `@qadi/devtools`.
  > **Backlog frames travel in cursor order, not `storedRecordOrder`.** A frame's `id` is a resume
  > position and `Last-Event-ID` resumes after it; sending a later position before an earlier one
  > made a reconnect during the prelude skip every record between them, silently (P1). Presentation
  > order is the reader's (`decodeDecisionStream` sorts; the timeline is independent of arrival,
  > INV-QD-039). `/__decisions/backlog` keeps `storedRecordOrder`: it is not resumed. The reader
  > still does not check `n` (ARCH-28 D-28-e): within a connection it cannot differ, and across
  > connections it could not have revealed the loss. `@qadi/http`'s `frame`, `syncedFrame` and
  > `decisionFrames` are removed without aliases (ADR-QD-081 D-04-d). The stream is still not
  > versioned; only the record inside each envelope is (ADR-QD-096).

  Also edit D-11-h's "the INV-QD-039 order the log presents its backlog by" only via the amendment
  (the accepted text stays unedited, per the ADR's own rule).
- **ADR-QD-047** — one sentence in its 2026-10-08 amendment block or a new dated line: "The
  decision stream's order is `@qadi/core`'s (ADR-QD-097, 2026-10-NN); `sourceFromEventSource` is the
  model's `EventSource` adapter onto it." Revision bump.
- **`spec/behaviors/26-decision-stream.md`** — Rev bump. BEH-QD-311's signature block: replace
  `frame`/`decisionFrames` with `@qadi/core`'s `encodeDecisionStream` and `DecisionStreamFrame`
  (requirements unchanged: no record ends the feed; refusal reported; throwing hook reported;
  data is the envelope). BEH-QD-314: signature block loses `syncedFrame`, gains the core names; first
  requirement says cursor order (T1); the order requirements name core as their owner. BEH-QD-315:
  name `encodeDecisionBacklog`. BEH-QD-316: T1's requirement; the `readEntries` signature stays.
  **New BEH-QD-NEXT — "The stream's order is encoded and decoded in one place"**: REQUIREMENT
  `decodeDecisionStream(encodeDecisionStream(log))` holds the log's read (backlog in
  `storedRecordOrder`, live in arrival order); REQUIREMENT a transport carries frames and states no
  order of its own; REQUIREMENT the decoder never fails, and reports every unreadable record frame.
- **`spec/behaviors/27-devtools-timeline.md`** — BEH-QD-203's prelude paragraph (≈`:67-70`) points
  at `decodeDecisionStream` for the rules; `SourceRead` is `DecisionStreamRead`.
- **`spec/invariants.md`** — INV-QD-NEXT (T1); INV-QD-100's Implication: "A reader over SSE
  inherits the guarantee" gains "and a reconnect loses none of it (INV-QD-NEXT)"; INV-QD-100's
  Enforcement adds the round-trip property.
- **`spec/traceability.md`** — 26's row adds `packages/core/src/DecisionStream.ts`; 27's row
  unchanged files; new rows for `packages/core/test/DecisionStream.test.ts` (BEH-QD-311, 314, 315,
  316, BEH-QD-NEXT, INV-QD-NEXT, INV-QD-097, INV-QD-100) and `DecisionStream.tst.ts`; the
  `decisionStream.test.ts`, `DecisionLog.test.ts`/`.tst.ts`, `Source.test.ts` rows trimmed to what
  they still test; REQ-QD-033 adds INV-QD-NEXT.
- **`spec/overview.md`** (gate 13) — change-history line; core: the vocabulary row's file becomes
  `DecisionStream.ts` and absorbs `formatLogCursor`/`parseLogCursor` (removed from the `LogCursor`
  row); new rows `encodeDecisionStream`, `decodeDecisionStream`, `encodeDecisionBacklog`,
  `DecisionStreamFrame`, `ReceivedFrame`, `DecisionStreamRead`, `DEFAULT_SYNC_TIMEOUT`; http: delete
  `frame`, `syncedFrame`, `decisionFrames`; `decisionStreamRoute`'s row cites core for the order;
  devtools: `Source`/`SourceRead` row notes `SourceRead = DecisionStreamRead`.
- **CCR log** — CCR-QD-NEXT (T1, patch: P1) and CCR-QD-NEXT (T2–T8, the module), or one CCR if
  T1 does not ship separately.
- **`spec/devtools-spec/00-overview.md`** (≈`:69`) — the prelude sentence cites core's decoder; no
  new claim of absence (gate 12).
- **Website** — `packages/devtools.md` (≈`:34`): "a reconnecting `EventSource` reads the server's
  backlog again" → "resumes after the last record it received; across sources a record may still
  arrive twice"; `concepts/decision-lifecycle.md` (≈`:94`): one clause that the order is core's;
  `reference/upgrading.md`: a "Removed exports" row for `@qadi/http`'s three names (instead:
  `encodeDecisionStream` from `@qadi/core`) and one paragraph on cursor-ordered backlog frames.
- **Changesets** — T1's patch (above). T2–T8: `.changeset/decision-stream-order-in-core.md`,
  `"@qadi/core": minor`, `"@qadi/http": minor`, `"@qadi/devtools": minor`:
  "**Breaking (`@qadi/http`):** `frame`, `syncedFrame` and `decisionFrames` are removed; the
  decision stream's order is `@qadi/core`'s `encodeDecisionStream`/`decodeDecisionStream`, whose
  frames are values, not SSE text. New in `@qadi/core`: `encodeDecisionStream`,
  `decodeDecisionStream`, `encodeDecisionBacklog`, `DecisionStreamFrame`, `ReceivedFrame`,
  `DecisionStreamRead`, `DEFAULT_SYNC_TIMEOUT`. `@qadi/devtools`' `SourceRead` is now an alias of
  `DecisionStreamRead` (same shape). Refused-record warnings read `qadi: …` instead of
  `qadi/http: …`, and their spans are `qadi.decisionStream.refused`/`qadi.decisionBacklog.refused`.
  No wire change beyond T1's backlog order." **No release step** — versioning and publishing wait
  for the user's explicit go-ahead.

## 9. Risks and rollback

- **P1's fix changes a documented wire order.** A third-party reader that displays backlog frames
  in arrival order and relied on BEH-QD-314's `storedRecordOrder` now shows them by position. The
  in-repo readers are order-independent (§1). Mitigation: the T1 changeset says so. Rollback: revert
  the sort — which restores the loss, so prefer forward-fixing the reader.
- **Chunk straddle in the decoder (T3 step 4).** Moving from `Queue.take` to a pulled stream can
  drop or misfile frames that arrive in the same chunk as `synced`. Shows up as a live record
  missing after the prelude. Mitigation: the straddle test precedes the implementation choice;
  keeping the queue-based shape is an acceptable answer.
- **Coverage/mutation shift.** Moving code and its tests out of http and devtools can drop their
  coverage or Stryker scores below threshold if the tests moved faster than the code (or the
  reverse). Mitigation: T2/T3 move code and tests in the same commit per package; T9 reads all
  three scores.
- **Log and span renames (D-54-f).** A deployment alerting on `qadi/http: a decision record could
  not be framed` stops matching. Mitigation: changeset line; option B of D-54-f keeps the texts.
- **`SourceRead` alias (T6 step 3).** A consumer that declaration-merged into the `SourceRead`
  interface (unlikely) breaks. Rollback: keep it an interface that `extends DecisionStreamRead`.
- **Sibling conflicts (textual, same files):**
  - **ARCH-47** rewrites `recheck` in `DecisionStreamRoute.ts` onto the edge step. Independent of
    this plan's hunks (frames vs recheck); whichever lands second rebases. No decision depends on it.
  - **ARCH-57** makes `addGuardedRoute`'s loader optional (both routes' `loadNoResource` argument)
    and lists `reportRefused`'s near-duplication. Under D-54-f = A this plan **owns** that item and
    ARCH-57 drops it; the loader change is a one-line rebase either way.
  - **ARCH-55** may convert core's barrel to named exports and merge shallow modules. If it lands
    first, T2 step 7 adds named lines; `DecisionStream.ts` should be listed there as deep, not
    merged. If this lands first, ARCH-55 inherits one more `export *` line to name.
  - **ARCH-56** (metrics) and **ARCH-48/50/53** do not touch these files. **ARCH-46/51** touch core
    port modules only.
- **Follow-up, not in scope (P3):** an eviction gap on resume is invisible. If wanted later, a
  `synced` field (`{"backlog":n,"gap":true}`) is additive for `DecisionStreamSynced`'s decoders
  (unknown keys ignored) — but `DecisionStreamSynced` is a `Schema.Struct`, so confirm its
  unknown-key behaviour first.
- **Rollback of the refactor (T2–T8)** is one revert of that commit; T1 (the patch) stands alone
  and should not be reverted with it.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-13 | — | Plan written against `b655b3b`. P1 confirmed by `probe-reader-src.mts` (HEAD source) and fixed in `probe-fix.mts`; review card's `synced{n}` gap refuted (D-28-e + P1's correct per-connection count); ARCH-19/ARCH-28 export deferral found circular (C6). | planner |
| 2026-10-13 | T0-T10 | Implemented as one commit on wave5/architecture-deepenings (P1 test red at branch point: cut after frame 1 kept only `a`; sort-removed run fails the resume property and the acceptance scenario). check:pr green; Stryker DecisionStream.ts 97.12%. CCR-QD-388, BEH-QD-335, INV-QD-243, ADR-QD-097 Rev 1.4, ADR-QD-047 Rev 1.7; no new ADR. | implementer |
