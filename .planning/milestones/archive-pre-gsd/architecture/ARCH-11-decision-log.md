---
id: ARCH-11
title: Fold ring, feed and environment label into one decision log that is both a sink and a readable history
strength: Worth exploring   # from the 2026-10-05 architecture review (candidate 08)
status: implemented      # branch arch/deepening-10; T14 (full gate + mutation) deferred to the final integration gate
evidence_verified_at: e0ee958
depends_on:
  - ARCH-09   # the wire task T5 only (and T6–T9, which consume T5). T1–T4 and T10's core half do not need it.
blocks: []
adrs_touched:
  - ADR-QD-012 (read: deterministic time and ids. The log reads no clock on the record path; T9's resume epoch is read from `Clock`, never `Date.now()`)
  - ADR-QD-031 (read: optional ports read through `Effect.serviceOption`; the log is still an optional `DecisionSink`)
  - ADR-QD-037 (read: madge circular-import gate; `DecisionLog.ts` → `DecisionRecord.ts`/`DecisionSink.ts` only)
  - ADR-QD-044 (read: an optional, write-only sink. Holds: the log *implements* the port, the port stays write-only)
  - ADR-QD-045 (amend: "ring + forwarder via `decisionSinkAll`" stops being the recipe for ring + feed; the topology is still a choice of sink)
  - ADR-QD-046 (amend: the SSE route gains a backlog prelude and an environment-carrying frame; "no protocol of ours" is no longer literally true)
  - ADR-QD-047 (amend: the devtools `Source` interface becomes one scoped `read`)
  - ADR-QD-048 (read: observed catalogue reads the timeline; unaffected)
  - ADR-QD-049 (read: the CLI shell is the reader `decisionBacklogRoute` serves; not written)
  - ADR-QD-060 (read: Schema-derived wire errors; the envelope embeds `SinkRecordWire` unchanged)
  - ADR-QD-073 (read: UNTRACED_BUDGET; no new `Effect.fnUntraced`)
  - ADR-QD-076 (read: Stryker skips static mutants; module-scope constants here are not mutated)
packages: [core, devtools, http, example-nextjs, features, website-docs]
estimate: XL   # T1–T4 ≈ 1½ days; T5–T8 ≈ 3 days (after ARCH-09); T9 ≈ 1 day; T10–T14 ≈ 2 days. L if D-11-f stops at the prelude and D-11-g is declined.
---

# ARCH-11 — Fold ring, feed and environment label into one decision log that is both a sink and a readable history

> **Reconciled with ARCH-09 and ARCH-15 (orchestrator, 2026-10-05).** ARCH-09 recommends inbound `decodeSinkRecord` /
> `decodeSinkRecordString` and outbound `encodeSinkRecord` / `encodeSinkRecordString` (D-09-a). Use those names wherever
> this plan says "inbound" or "outbound". Two corrections follow:
> - **T-task "Failures keep `MalformedReason`'s two values".** Superseded. After ARCH-09 D-09-f, `MalformedReason` is
>   `"not-json" | "too-deep" | "not-a-record"`, and after ARCH-15 D-15-f it also has `"unsupported-version"`. Map with ARCH-09's
>   `reasonOf` over `DecodeRefusal`; don't hand-write a two-value mapping.
> - **Frame envelope (D-11-e).** `{ environment, record }` is this plan's envelope. ARCH-15's `version` key lives inside
>   `record`. Decode the envelope first, then pass `record` to `decodeSinkRecord`.

## 1. Verified evidence (at `e0ee958`)

Everything below was re-read on branch `arch/integration` at `e0ee958`, in the
worktree `W=.claude/worktrees/agent-adb672833eb753a12`. Line numbers are at that
commit.

**How the claims were settled.** Two throwaway scripts in the session
scratchpad, run with the worktree's own `effect@4.0.0` and `src/` modules:

```sh
cd $W/packages/devtools && NODE_OPTIONS="--conditions=bun" \
  /Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/.bin/tsx <scratchpad>/arch11-probe.mts
cd $W/packages/devtools && NODE_OPTIONS="--conditions=bun" \
  /Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/.bin/tsx <scratchpad>/arch11-proto.mts
```

`arch11-probe.mts` reproduces the defects (P1–P5 below). `arch11-proto.mts` is
a 50-line prototype of the deepened module (subscribe-then-snapshot with a
sequence high-water mark). It ran clean. T1 and T3 rewrite every scenario as a
real test, so neither script is needed again.

Probe output, verbatim:

```
P1 backlog body keys[0]: _tag,at,environment,evaluationId,outcome,policy,subjectId
P1 backlog failed outcome JSON: {"error":{"_tag":"AttributeResolveError","attribute":"level","cause":{}},"_tag":"Failed"}
P1 decodeRecord(backlog[0]) -> Failure
P1 decodeRecord(backlog[1]) -> Failure
P1 decodeRecord(backlog[0] minus environment) -> Failure
P1 wire keys: _tag,at,decided,evaluationId,policy,subjectId | has environment: false
P1 decodeRecord(wire + environment) -> Failure (excess property rejected under UNTRUSTED_DECODE_OPTIONS)
P2 ring has 1 ingested row(s), env Edge | feed delivered: nothing
P3 reader saw: before,after | 'between' lost: true
P4 compareByAt vs isAfter: 0 disagreements in 400 8-record orderings
P5 DEFAULT_RING_CAPACITY 500 DEFAULT_FEED_CAPACITY 256 DEFAULT_TIMELINE_CAPACITY 500
PROTO read (backlog+live): before@Client,between@Client,edge-1@Edge,after@Client
PROTO second read backlog size: 4 (capacity 8, 4 records so far)
```

### C1. Every host wires `decisionSinkAll([ring.layer, feed.layer])` by hand, on the server and on the client — **CONFIRMED**

- Server: `examples/nextjs-newsroom/src/server/layer.ts:38` builds
  `decisionSinkRing({ environment: "Server", capacity: 500 })`. `:47` builds
  `decisionSinkFeed({ capacity: 256, replay: 32 })`. `:63` wires
  `decisionSinkAll([ring.layer, feed.layer])`. The header comment (`:5-10`)
  explains why it cannot be two merged layers (BEH-QD-187, merge-last-wins).
- Client: `examples/nextjs-newsroom/src/client/atoms.ts:25` builds the ring
  (`"Client"`, 300), `:28` builds the feed (128, replay 16), `:73` wires
  `decisionSinkAll([clientRing.layer, clientFeed.layer])`.
- `examples/nextjs-newsroom/src/server/processGlobal.ts:32-44` has to declare
  two interfaces, `Ring` and `Feed`, plus two global slots (`ringOnce`/`feedOnce`,
  `:66-67`), to keep the halves process-wide.
- The feed tells hosts to do this itself: `packages/core/src/DecisionSinkFeed.ts:40-44`
  ("without it, pair this with a `decisionSinkRing` through `decisionSinkAll`
  and serve the backlog separately"), as does BEH-QD-201's last paragraph.

### C2. `sourceFromFeed({ stream, environment, backlog: ring.snapshot })` reassembles the halves — **CONFIRMED**

`examples/nextjs-newsroom/src/client/Dock.tsx:77-81` passes `clientFeed.stream`,
`"Client"` and `clientRing.snapshot` back into one `Source`.
`packages/devtools/src/model/Source.ts:64-72` is `sourceFromFeed`. Its doc
comment at `:67` reads "Usually a paired `decisionSinkRing`'s `snapshot`."

### C3. The environment label is stated twice and nothing checks that the two agree — **CONFIRMED**

| Label | Stated at sink construction | Stated again at the reader |
| ----- | --------------------------- | -------------------------- |
| `"Server"` | `server/layer.ts:38` | `client/Dock.tsx:69` (`sourceFromEventSource`'s `environment`) |
| `"Client"` | `client/atoms.ts:25` (ring only; the feed takes no label) | `client/Dock.tsx:79` (`sourceFromFeed`'s `environment`) |

No type, test or gate connects either pair. The reader's label wins for every
live row. The sink's label wins for every backlog row. So a typo in either one
splits one process into two badges, and the timeline's pairing identity
(`Timeline.ts:165-174`, keyed on `environment`) then sees them as different
processes.

### C4. Two eviction bounds kept in step by a doc comment, and `replay` overlaps the backlog — **CHANGED** (the comments agree on the *policy*; the *numbers* differ, and a third bound is pinned by comment only)

- `DecisionSinkFeed.ts:18-21`: "Sliding rather than dropping … the same
  reasoning `decisionSinkRing` uses to evict, and the two agree so a reader sees
  one policy rather than two." That is agreement on newest-wins, not on size.
  The defaults are 500 and 256 (P5). The example's are 500/256 on the server
  and 300/128 on the client. A reader of one log therefore has two bounds, and
  which one applies depends on whether the row came through the backlog or the
  live stream.
- `packages/devtools/src/model/Timeline.ts:64-65`:
  `/** Matches DEFAULT_RING_CAPACITY, so a reader is not bounded twice by two numbers. */ export const DEFAULT_TIMELINE_CAPACITY = 500;`.
  This is a literal kept equal to core's by a comment. Nothing imports
  `DEFAULT_RING_CAPACITY`.
- Overlap: with `replay: 32` the first 32 live records repeat the newest 32
  backlog rows. The timeline absorbs this by design (INV-QD-039, identity
  returns the identical timeline), so it costs bandwidth and work, not
  correctness. The real problem is the opposite case (C9).

### C5. Stamping happens in four places — **CONFIRMED**

`stampRecord` (`packages/core/src/DecisionSinkRing.ts:84-94`) is called at:

1. `ring.record`, via `append` (`DecisionSinkRing.ts:146`, reached from `:153-158`).
2. `ring.ingest`, via the same `append` (`:177-180`), with the caller's label.
3. `sourceFromFeed` (`Source.ts:71`), with the reader's label.
4. `decodeFrame` (`Source.ts:225`), with the reader's label.

Places 1–2 stamp at the producer and places 3–4 stamp at the reader. That
asymmetry is C3's root cause.

### C6. INV-QD-039's ordering is written twice — **CONFIRMED** (and the two agree today)

`Source.ts:184-189` (`compareByAt`, a three-way comparator used by
`mergeSources`' sort) and `Timeline.ts:221-225` (`isAfter`, the predicate
`insert` uses). Both put `NaN` after every known time and keep two unknowns in
arrival order. P4 compared `mergeSources` against `ingestAll` on 400 generated
8-record orderings drawn from `{NaN, ±Infinity, -1, -0, 0, 1, 1, 2}`: zero
disagreements. The duplication is a locality problem. It is not yet a defect.
`Source.ts:178-182` says in prose that it "owes the same guarantee", which is
the only link between the two.

### C7. `/api/backlog` serves `JSON.stringify(ring.snapshot)` of `StoredRecord`, not `SinkRecordWire`; no codec, nothing decodes it — **CONFIRMED, and worse than stated**

- `examples/nextjs-newsroom/src/server/api.ts:181-187` is `BacklogRoute`, which
  ends in `Effect.map(ring.snapshot, json)`. `json` (`:68-69`) is
  `HttpServerResponse.text(JSON.stringify(body), …)`.
- P1: the body's keys are the in-memory class's (`outcome`, `environment`), not
  the wire's (`decided`/`failed`). `decodeRecord` rejects **every** row, with or
  without `environment`. An `EvaluationError`'s `cause` serializes as `{}`
  (`"store offline"` is lost), which is the lossy-`cause` failure the review
  attributes to the SSE and audit paths (ARCH-09's subject).
- Nothing consumes the route. `grep -rn "backlog" examples/nextjs-newsroom`
  finds only the route and the `layer.ts:9` comment that describes it.

### C8. So `sourceFromEventSource` can never have a backlog — **CONFIRMED**

`Source.ts:142-144` returns `{ live: … }` with no `backlog` key. The test
`Source.test.ts:409` ("has no backlog: a live feed cannot answer for the past")
pins this. A dock opened late sees the server's last `replay` records (32 in the
example) and nothing older, while the server's ring holds 500.

### C9. Found while settling C4: the documented ring + feed recipe loses records — **CONFIRMED latent defect** (D2)

`TimelineStore.ts:86-104` (`runSource`) reads `backlog` first and subscribes to
`live` afterwards. That order is deliberate, and its doc comment explains why.
With `replay: 0`, which is `decisionSinkFeed`'s default and exactly what
`DecisionSinkFeed.ts:43-44` recommends pairing with a ring, any record made
between the backlog read and the subscription is in neither. P3 makes three
decisions: `before`, then `between` (after the snapshot, before the subscribe),
then `after`. The reader sees `before,after`. The example escapes this only
because it sets `replay` (16/32), and only while the gap holds fewer records
than `replay`. That is not a property anything checks.

### C10. Found while settling C7: the example's "Edge row in the dock's Log" never appears — **CONFIRMED user-visible defect** (D1)

- `examples/nextjs-newsroom/src/client/Counters.tsx:102-105` tells the reader
  to "look for an **Edge** row in the dock's Log" after calling
  `/api/edge/decide`. `app/page.tsx:42` and `app/edge/double-count/page.tsx:26-28`
  say the same thing.
- The aggregator's receiving half (`api.ts:220`) calls `ring.ingest(record, "Edge")`.
  Ingest reaches the ring only. P2 shows the feed delivers nothing.
- The dock reads the server **only** over SSE (`Dock.tsx:67-76`), which is the
  feed (C8: no backlog). So an `Edge` row cannot reach the dock by any path.
  Even if ingest also published to the feed, the frame carries no environment
  (`SinkRecordWire` has none, P1) and `decodeFrame` would stamp it `"Server"`
  (`Source.ts:225`, the reader's label). The fix needs exactly the two things
  this plan adds: ingest that reaches the live stream, and a wire form that
  carries the producer's label.
- No e2e test covers it. `e2e/*.spec.ts` contains no `Edge` assertion.

### C11. Ring, feed and `decisionSinkAll` each pass the deletion test individually — **CONFIRMED**

- The feed hides the `publish`-vs-`publishUnsafe` trap (`DecisionSinkFeed.ts:83-94`).
  `publishUnsafe` skips `SlidingStrategy.handleSurplus` and keeps the stale
  backlog. Pinned by `DecisionSinkFeed.test.ts:91` ("the oldest record is
  dropped, not the newest").
- The ring hides `Chunk` head-eviction, capacity validation and the
  prototype-preserving stamp (`DecisionSinkRing.ts:62-94`, `:121-150`).
- `decisionSinkAll` (`DecisionSinkForwarding.ts:125-165`) hides merge-last-wins
  (BEH-QD-187) and per-member defect isolation (JA-02, `:141-160`). It stays
  necessary for log + forwarder (`app/api/edge/decide/route.ts` composes a
  forwarder). Only the ring + feed *pairing* is friction.

### C12. Stale claims found on the way — **CONFIRMED** (doc-only)

- **BEH-QD-201** (`spec/behaviors/26-decision-stream.md:47`) still says
  "`publishUnsafe` rather than `publish`, because the awaiting form would
  reintroduce exactly the blocking this removes." The code uses `publish`
  (`DecisionSinkFeed.ts:94`), and its comment (`:83-93`) explains that
  `publishUnsafe` inverted newest-wins. The spec is normative (AGENTS.md §11)
  and states the opposite of the code.
- `Source.ts:257-259` cites "`SinkCodec`'s `renderCause`". ADR-QD-060 deleted
  it, and `SinkCodec.ts:58` says so. The review flagged this as well.
- BEH-QD-185's ts-fence (`24-decision-sink.md:186-191`) omits `ingest`. BEH-QD-188
  documents it separately, so this is incomplete rather than wrong.

### C13. Consumers of the surface this plan replaces — **inventory**

`grep -rln` over `packages/*/src`, `examples`, `features`, `apps/website`,
`scripts` and `spec` at `e0ee958`:

| Symbol | Production consumers | Test / doc consumers |
| ------ | -------------------- | -------------------- |
| `decisionSinkRing` | example `layer.ts`, `atoms.ts` | `DecisionSink.test.ts:462-586`, `DecisionSinkForwarding.test.ts:273-345`, `react/test/QadiAtoms.test.ts:472`, `features/…/devtools-simulator.steps.test.ts:151,250`, website `services.md:87`, `decision-lifecycle.md:105` |
| `decisionSinkFeed` | example `layer.ts`, `atoms.ts`, `examples/http-advanced/server.ts:241` | `DecisionSinkFeed.test.ts`, `http/test/decisionStream.test.ts:110,184`, devtools `README.md:39-44`, website `devtools.md:44-49` |
| `decisionSinkAll` | example `layer.ts`, `atoms.ts`, edge route | `DecisionSinkForwarding.test.ts:154-271` — **stays** |
| `sourceFromFeed` | example `Dock.tsx` | `Source.test.ts:141-214`, devtools `README.md`, website `devtools.md` |
| `stampRecord` | `Source.ts:71,225` | fixtures: `devtools/test/helpers.ts:94,134`, three feature step files, `scripts/check-package-install.mjs:338,405` — **stays exported** as the prototype-safe constructor |
| `Source` (interface) | `TimelineStore.runSource`, `useTimeline.ts:41`, `DevtoolsDock.tsx:51,73`, `mergeSources` | `Source.test.ts`, `TimelineStore.test.ts`, `useTimeline.test.tsx`, `merged-sources` feature |
| `decisionStreamRoute(…, stream)` | example `api.ts:232`, `http-advanced/server.ts:243` | `decisionStream.test.ts` |

`examples/http-advanced` is in no gate. It has its own `tsconfig.json` and is
referenced by no `package.json` script or root `tsconfig`. T10 checks it by
hand.

### C14. Effect APIs this plan relies on exist in `effect@4.0.0` — **CONFIRMED**

`PubSub.sliding`, `PubSub.subscribe` (scoped), `PubSub.publish`,
`Stream.fromSubscription`, `Order.make`/`Order.isGreaterThan`
(`node_modules/.pnpm/effect@4.0.0/…/dist/{PubSub,Stream,Order}.d.ts`), and
`Sse.encoder.write` with `event`/`id` fields (already used at
`DecisionStreamRoute.ts:133-138`). The prototype exercised the first four.

### C15. Baseline test run — **green**

```sh
cd $W && node_modules/.bin/vitest run packages/core/test/DecisionSink.test.ts \
  packages/core/test/DecisionSinkFeed.test.ts packages/core/test/DecisionSinkForwarding.test.ts \
  packages/devtools/test/model/Source.test.ts packages/devtools/test/model/Timeline.test.ts \
  packages/devtools/test/model/TimelineStore.test.ts packages/http/test/decisionStream.test.ts \
  packages/devtools/test/react/useTimeline.test.tsx
#  Test Files  8 passed (8)   Tests  171 passed (171)
```

Two tooling notes:

- The main checkout's `vitest` binary
  (`/Users/…/qadi/node_modules/.bin/vitest`) fails to load this worktree's
  project configs (`TypeError: Cannot read properties of undefined (reading 'config')`).
  Use the worktree's own `$W/node_modules/.bin/vitest`, which is what the line
  above does.
- The first run with that binary hit `ENOSPC` (the data volume was full at about
  17:27). It passed on retry once space was freed.

The BDD suite (`pnpm --filter @qadi/features test`) and the example's
Playwright e2e were not run for this plan.

## 2. Goal and success criteria

**Goal.** Replace three shallow modules (`decisionSinkRing`, `decisionSinkFeed`,
and the host-side pairing of them through `decisionSinkAll` + `sourceFromFeed`)
with one **deep** module, the *decision log*. Its interface is small: one
environment label, one bound, one `layer` (the sink), `ingest`, `snapshot`,
`clear`, and one scoped `read` that hands back the backlog and the live stream
together, with each retained record exactly once. The implementation keeps every
trap the three shallow modules hid: sliding `publish`, `Chunk` eviction,
prototype-safe stamping, per-half defect isolation, and capacity validation. It
adds the sequencing that no host could get right (append before publish;
subscribe before snapshot; filter by high-water mark).

The **seam** for readers is the devtools `Source`. It becomes a single scoped
`read`, which a `DecisionLog` satisfies structurally, so an in-process log needs
no adapter. The SSE route is the second **adapter** behind the same seam, so the
seam is real rather than hypothetical. It serves the same `read` over HTTP:
backlog frames, a `synced` marker, then live frames. Each frame is an envelope
that carries the producer's environment through ARCH-09's codec. With that, the
EventSource reader gains a backlog, the label is stated once at the producer,
the ordering rule (INV-QD-039) lives in one `Order`, and stamping happens in one
place per process. **Leverage:** hosts wire one value. **Locality:** pairing
bugs (C9, C10) become impossible to write rather than conventions to remember.

**Success criteria**

1. `grep -rnE "decisionSinkRing|decisionSinkFeed|sourceFromFeed|DEFAULT_FEED_CAPACITY|DEFAULT_RING_CAPACITY" packages/*/src examples apps/website/src features scripts` finds nothing, and `spec/overview.md` lists none of them (gate 13, `node scripts/check-api-surface.mjs`).
2. `grep -rn "stampRecord(" packages/*/src` finds calls only in `packages/core/src/DecisionLog.ts` (the producer stamp) and `packages/core/src/SinkCodec.ts` (rebuilding a stored record from its envelope). There are none in `packages/devtools/src`.
3. `grep -rn "Number.isNaN" packages/devtools/src/model/Source.ts packages/devtools/src/model/Timeline.ts` finds nothing. The only NaN-last ordering is `storedRecordOrder` in `packages/core/src/DecisionRecord.ts`.
4. In `examples/nextjs-newsroom/src`, `"Server"` occurs exactly once (`server/layer.ts`), `"Client"` exactly once (`client/atoms.ts`), and `"Edge"` exactly once (`server/api.ts`), each as a producer label: `grep -rn '"Server"\|"Client"\|"Edge"' examples/nextjs-newsroom/src`. `decisionSinkAll` no longer appears in `layer.ts` or `atoms.ts`.
5. `DEFAULT_TIMELINE_CAPACITY` is defined as `DEFAULT_LOG_CAPACITY` imported from `@qadi/core`, not as a literal: `grep -n "DEFAULT_TIMELINE_CAPACITY =" packages/devtools/src/model/Timeline.ts`.
6. `packages/core/test/DecisionLog.test.ts` proves, among others: no record made between a reader's backlog and its live stream is lost (C9), `ingest` reaches live readers (C10), each retained record reaches a reader exactly once under concurrent writers, and the newest record wins on a full buffer. All pass.
7. `packages/http/test/decisionStream.test.ts` proves that the route emits the backlog prelude, then `synced`, then live, each frame carrying its producer's environment, and that an `Edge`-ingested record arrives labelled `Edge`.
8. `packages/devtools/test/model/Source.test.ts` proves that `sourceFromEventSource` has a backlog when the server sends a prelude, has none (absent, not empty) when the server is older, and never hangs past `syncTimeout`.
9. The example's Playwright suite asserts that after `edge-call`, a row labelled `Edge` appears in the dock's Log (T1's `test.fail` flipped to a pass). `GET /api/__decisions/backlog` returns a body whose every element decodes (D-11-f).
10. `pnpm check` passes, including gate 12 (`node scripts/check-devtools-claims.mjs`), gate 13 (`node scripts/check-api-surface.mjs`), gate 15 (`pnpm --filter @qadi/example-nextjs check`), and the core, devtools and http Stryker runs (gates 16, 17, 21) at or above 80%.

## 3. Non-goals

- **Making `DecisionSink` readable.** BEH-QD-181 and ADR-QD-044 keep the port
  write-only. The log is one *implementation* that also happens to be readable,
  which is exactly what ADR-QD-045 said reading back would be.
- **Changing `decisionSinkForwarding`'s wire.** A forwarder could carry its own
  environment in the same envelope, which would remove the aggregator's `"Edge"`
  argument. That changes ARCH-09's outbound surface and BEH-QD-188's "the
  aggregator names the label". It is recorded as a follow-up in §9 and not done
  here.
- **Durable history.** The log stays a display buffer (`DecisionSinkRing.ts:12-13`).
  A durable log is `@qadi/audit`'s job.
- **The CLI shell** (ADR-QD-049). `decisionBacklogRoute` gives it something to
  read. Writing it is separate.
- **Rewriting SinkCodec.** That is ARCH-09. This plan adds one envelope schema
  and its two operations *through* ARCH-09's pipeline (T5).
- **Deduplicating inside `mergeSources`.** BEH-QD-235 still forbids it. The
  exactly-once guarantee is per log reader. Across sources and reconnects, the
  timeline's identity rule still absorbs repeats.

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1 imports | `effect/PubSub`, `effect/Stream`, `effect/Chunk`, `effect/Order`, `effect/Scope` as namespaces. `.ts` relative imports. `import type` for `Scope`/`Stream` types. Devtools imports `DEFAULT_LOG_CAPACITY`/`storedRecordOrder` as named imports from `@qadi/core`. |
| §2/§3 `Context.Service` and layers | The log is a value holding a `layer`, like the ring is today, not a `Context.Service`. No `static layer`. If a `Context.Service` is ever wanted, it gets a separate `DecisionLogShape` interface per ADR-QD-010. D-11-a keeps it a value. |
| §4 errors | No new error classes. `SCHEMA_ERROR_BUDGET` is unchanged. Capacity misuse still **throws at construction** (ring and feed precedent) rather than failing the Effect. |
| §5 `Effect.fn` / `UNTRACED_BUDGET` | `layer.record` and `ingest` run once per decision. Today they are plain closures returning `Effect.sync` (`DecisionSinkRing.ts:154-158`) with no span. Keep that shape. Do **not** wrap them in `Effect.fn(name)` (≈2.8 µs/call, ADR-QD-073) or `Effect.fnUntraced` (budget). `read` is an `Effect` value, not a function. The http route's per-connection effect may use `Effect.fn`. |
| §5a `Match` / `SWITCH_BUDGET` | Stamping stays the hoisted `Match.type<SinkRecord>().pipe(Match.tagsExhaustive(…))` (`DecisionSinkRing.ts:84-91`), moved with it. SSE event names are a closed literal union matched with `Match.value`, once per frame, which is not a per-node path. No `switch`. |
| §6 forbidden | No `Date.now()` (T9's epoch comes from `Clock.currentTimeMillis`). No `as`/`!`/`any`. The fake `EventSource` in tests stays structural. No `Record<string, unknown>` as a widened type (user preference). The SSE `synced` payload gets its own `Schema.Struct`. |
| §7 schema | The envelope `StoredRecordWire` is schema-first, with `type` derived from it. |
| §9 barrels | `export * from "./DecisionLog.ts"` inserted alphabetically. `DecisionSinkFeed.ts`/`DecisionSinkRing.ts` lines removed. The internal `Entry`/high-water helpers stay unexported. |
| §10 coverage | Core 95%. The devtools model is at 95% (ADR-QD-047). http 90%. |
| §11/§12 spec | Behaviors 24, 26, 27, INV-QD-039, ADRs 045/046/047 change in the same change set (T12–T13). Any `typescript` fence in `spec/` that names a deleted export must compile (gate 9, `node scripts/check-doc-examples.mjs`). |
| §13 React | `@qadi/devtools/react`'s `useTimeline` stays a thin wrapper. No React state for records. |
| §15 gates | Gate 12 (`node scripts/check-devtools-claims.mjs`): any absence-phrase added to `spec/devtools-spec/` needs a "Claims of absence" row, and a removed one needs its row deleted. Gate 13 (`node scripts/check-api-surface.mjs`): every added or removed export updates `spec/overview.md`. Gate 14 (`node scripts/check-package-install.mjs`): `stampRecord` stays exported, so its consumer probe is unchanged. Gate 22 (`node scripts/check-website-doc-examples.mjs`): website `typescript` fences that name the deleted exports must be rewritten. |
| §16 publishing | No new package. `tsconfig.build.json` is unchanged. |
| ADR-QD-037 madge (gate 5, `madge --circular …`) | `DecisionLog.ts` imports only `DecisionRecord.ts` and `DecisionSink.ts`. `SinkCodec.ts` imports `StoredRecord` from `DecisionRecord.ts`, never from `DecisionLog.ts`. |
| ADR-QD-076 Stryker `ignoreStatic` | `DEFAULT_LOG_CAPACITY` and the hoisted `Match` are static and not mutated. The test suite must still kill mutants in `append`, `read` and the high-water filter. |
| INV-QD-035 | The log's `record` must not be able to change a decision. It is still wrapped by `evaluate`'s `catchCause`, and the log additionally isolates its two halves (append, publish) so a defect in one does not skip the other. |
| `DecisionSinkFeed.test.ts` header (`:1-12`) | No test may fork a collector that can wait forever. Mutants that kill publishing must fail fast. Use bounded `Stream.take`, `it.live` + `Effect.timeoutOption` only where live semantics are needed. |

## 5. Decisions needed before work starts

### D-11-a — Shape and home of the deep module

| Option | Shape | For | Against |
| ------ | ----- | --- | ------- |
| **A. New `packages/core/src/DecisionLog.ts`: `makeDecisionLog({ environment, capacity? }): Effect<DecisionLog>`** | `DecisionLog = { environment, capacity, layer, ingest, snapshot, clear, read }`, where `read: Effect<DecisionLogRead, never, Scope>` and `DecisionLogRead = { backlog: ReadonlyArray<StoredRecord>; live: Stream<StoredRecord> }`. Also `type DecisionLogReader = Pick<DecisionLog, "read">`. | One value per process. Every sequencing rule is internal. The prototype (`arch11-proto.mts`) already shows the handoff. `Effect`-returning like the feed, because a `PubSub` is allocated. | Hosts at module scope keep doing `Effect.runSync(makeDecisionLog(…))`, as they do for the feed today (`layer.ts:47`). |
| B. Keep ring and feed, add `pairRingAndFeed(ring, feed)` | A combinator over the two existing modules. | No break. | Layering, not deepening. Two labels and two bounds remain. The C9 handoff cannot be fixed without reaching into both modules' internals. |
| C. Make the port readable (`DecisionSink.read`) | — | — | Violates BEH-QD-181/ADR-QD-044, and every sink (forwarder, audit) would have to answer reads. Rejected. |

Fixed properties of A, settled here rather than left to implementation:

- `ingest(record, environment?)` reaches **both** the backlog and live readers.
  That is C10's fix. BEH-QD-188's "an ingested record respects capacity" still
  holds.
- `snapshot` and `read`'s `backlog` are presented in `storedRecordOrder` (D-11-h).
  Eviction stays by **arrival** (oldest arrival goes first), as the ring's does.
- Naming follows AGENTS.md §8: `make…` for a builder returning an Effect.

**Recommendation: A.** `status: decided (2026-10-05, A — recommended default)`

### D-11-b — What happens to `decisionSinkRing`, `decisionSinkFeed`, `DEFAULT_RING_CAPACITY`, `DEFAULT_FEED_CAPACITY` and `sourceFromFeed`

| Option | For | Against |
| ------ | --- | ------- |
| **A. Delete them in the same minor, marked Breaking in the changesets** | Replace, don't layer. No second way to wire the pairing that C9 shows is lossy. Precedent: ARCH-06's D-06-b/c removed the gate globals with no shim. Pre-1.0 (`0.8.x`). | Breaking for `@qadi/core` (two factories, two constants) and `@qadi/devtools` (`sourceFromFeed`). |
| B. Keep them one minor as `@deprecated` thin adapters over the log | Softer upgrade. | Two surfaces in `spec/overview.md`. The adapters would have to re-create the lossy `replay`-less recipe or silently change its meaning. Deprecations in this repo have historically lingered. |

**Recommendation: A.** `decisionSinkAll`, `decisionSinkForwarding`, `stampRecord`
and the `Stored*` types stay. `status: decided (2026-10-05, A — recommended default)`

### D-11-c — The devtools `Source` interface

| Option | Shape | For | Against |
| ------ | ----- | --- | ------- |
| A. Keep `{ backlog?: Effect<…>; live: Stream<…> }`; `sourceFromLog` hands off by a captured high-water mark | `backlog` records the high-water mark in a `Ref` that `live` reads. | `BEH-QD-203`'s shape survives. | The atomicity is a hidden handshake between two independently-run fields. It breaks if a consumer runs `live` without `backlog` or runs `backlog` twice. An SSE source would need two connections or shared mutable state. |
| **B. `Source = { read: Effect<SourceRead, never, Scope.Scope> }`, `SourceRead = { backlog?: ReadonlyArray<StoredRecord>; live: Stream<StoredRecord> }`** | One scoped read. A `DecisionLog` is assignable to `Source` as is: its `read` returns a non-optional `backlog`. | Atomic by type. The absent-vs-empty distinction (BEH-QD-203) survives as `backlog?`. SSE opens one connection, reads the prelude, and hands the rest of the same connection to `live`. Consumers are few (`runSource`, `useTimeline`, `DevtoolsDock`, `mergeSources`). | Breaking for anyone who built a `Source` by hand. BEH-QD-203/235 and ADR-QD-047 are amended. |

**Recommendation: B.** No `sourceFromLog` function is added. It would be an
identity, which fails the deletion test, so the log is passed as the `source`
itself. A tstyche test pins the assignability. `status: decided (2026-10-05, B — recommended default)`

### D-11-d — One bound

| Option | For | Against |
| ------ | --- | ------- |
| **A. One `capacity` (default `DEFAULT_LOG_CAPACITY = 500`) bounds both the retained backlog and the sliding lag buffer for live readers. `DEFAULT_TIMELINE_CAPACITY` is defined as `DEFAULT_LOG_CAPACITY`** | "A reader sees one policy" becomes true of the number, not just the direction (C4). One validation rule. | A host that wanted a short lag buffer and a long history (example server: 256 vs 500) gets one number. |
| B. Two numbers on the log (`capacity`, `lag`) | Same knobs as today. | Re-creates C4 inside the module. |

**Recommendation: A.** The validation is **positive integer**. The ring
accepted `0` ("keep nothing") and the feed rejected it (a zero-capacity `PubSub`
is dead). A log of zero is a sink that keeps and streams nothing, so `0` is
rejected like the feed's, with that reason given in the error. The timeline keeps
its own non-negative rule (`Timeline.ts:69-77`), because a view of zero is
coherent. `status: decided (2026-10-05, A — recommended default)`

### D-11-e — How the environment travels on the wire, and version skew

| Option | For | Against |
| ------ | --- | ------- |
| **A. A new envelope `StoredRecordWire = { environment: string; record: SinkRecordWire }` for every SSE frame and backlog element. The reader accepts a bare `SinkRecordWire` frame for one minor only when `legacyEnvironment` is supplied, and stamps it with that.** | `SinkRecordWire` (and therefore `decisionSinkForwarding` and audit) is untouched. An old reader receiving an envelope reports `not-a-record` loudly through `onMalformed` (BEH-QD-204) rather than dropping it silently. | One extra nesting level. |
| B. Optional `environment` field on `SinkRecordWire` itself | Flat. | GH-01 (`SinkCodec.ts:418-441`): `onExcessProperty: "error"` makes every older receiver **hard-reject** the record, including forwarders and audit stores that never asked for a label. It also leaks a reader concern into the forwarding wire. |
| C. Envelope in a named SSE event (`event: entry`) and keep bare `message` frames | Old readers keep working. | Old readers would *silently* stop seeing labels, or see nothing for named events. Doubling frames doubles bandwidth. Silence is the defect BEH-QD-204 exists to prevent. |

**Recommendation: A.** `status: decided (2026-10-05, A — recommended default)`

### D-11-f — How an SSE reader gets the backlog

| Option | For | Against |
| ------ | --- | ------- |
| A. Prelude on the same connection only: `event: backlog` frames, then `event: synced` (`data: {"backlog":n}`), then live `message` frames. The route runs `log.read` per connection, which is subscribe-then-snapshot. | One connection and one authorization (`guardRoute` once, `reauth` unchanged). Atomic with live. No fetch dependency in the devtools model. An old reader ignores named events and still gets live `message` frames (labelled envelopes, D-11-e A). | `EventSource`'s automatic reconnect re-sends the backlog. The timeline absorbs that (INV-QD-039), and D-11-g removes it. |
| B. A separate `GET /__decisions/backlog` JSON route only | Readable by `curl` and a future CLI (ADR-QD-049). | Not atomic with the live connection (C9's gap returns across HTTP). Two authorizations. The devtools model would need an HTTP client. |
| **C. Both: A for the dock, plus `decisionBacklogRoute` (JSON array of `StoredRecordWire`, same guard, registered with `PermissionRegistry`) for non-streaming readers** | A is the primary path. B gets one real consumer immediately: the example's dead `/api/backlog` (C7) is replaced by it and its e2e asserts every element decodes. The CLI gets a target. | One more route and one more test file. |

**Recommendation: C**, built in layers: T6 (prelude) is independent of T8 (JSON
route). The route is `decisionBacklogRoute(permission, policy, log: Pick<DecisionLog, "snapshot">)`
mounted at `/__decisions/backlog`. Like `decisionStreamRoute`, it has no
unguarded variant (BEH-QD-202's reasoning applies verbatim). `status: decided (2026-10-05, C — recommended default)`

### D-11-g — Resume on reconnect (`id:` + `Last-Event-ID`)

| Option | For | Against |
| ------ | --- | ------- |
| A. No resume. A reconnect gets the full backlog again. | No cursor in any interface. The timeline already dedupes. | Up to `capacity` redundant frames per reconnect, and each one costs a decode and an `ingest` scan (`Timeline.ts:110`, O(n) per record). |
| **B. Each frame carries `id: <epoch>.<seq>`. The route reads `Last-Event-ID`. When the epoch matches, the prelude holds only entries after `seq`. Otherwise it holds the full backlog. `epoch` is `Clock.currentTimeMillis` read once in `makeDecisionLog`. This is exposed as `readAfter(cursor)` plus `LogCursor`/`parseLogCursor` and a `readEntries` variant that carries cursors.** | Reconnect costs only what was missed. Deterministic under `TestClock` (ADR-QD-012). The epoch makes a restarted process's sequence numbers unambiguous. | A cursor concept in the log's interface. More protocol for ADR-QD-046 to record. |

**Recommendation: B, as its own last task (T9)**, so everything before it ships
without it. If declined, T9 is dropped and nothing else changes. `status: decided (2026-10-05, B — recommended default)`

### D-11-h — Where `StoredRecord` and the single ordering rule live

| Option | For | Against |
| ------ | --- | ------- |
| **A. Move `Stamped`, `StoredDecisionRecord`, `StoredObligationRecord`, `StoredRecord` and `stampRecord` from `DecisionSinkRing.ts` to `DecisionRecord.ts`, and add `storedRecordOrder: Order.Order<{ readonly at: number }>` there (NaN after every known time, unknowns equal)** | Both `DecisionLog.ts` and `SinkCodec.ts` import from the module that already owns `SinkRecord`, with no cycle. The order sits beside the `at` field it orders. Devtools `mergeSources` (a stable sort) and `Timeline.insert` (`Order.isGreaterThan(storedRecordOrder)`) share it. | `DecisionRecord.ts` grows by ~60 lines. |
| B. New `StoredRecord.ts` | Small file. | One more module whose only content is types and a constructor, which is shallow. |
| C. Keep the order in devtools (`model/Order.ts`) | Devtools-local. | The log's own `snapshot` ordering (D-11-a) needs it in core. |

**Recommendation: A.** `status: decided (2026-10-05, A — recommended default)`

### D-11-i — `decisionStreamRoute`'s input

| Option | For | Against |
| ------ | --- | ------- |
| **A. `decisionStreamRoute(permission, policy, log: DecisionLogReader, options?)`** | The route can serve a prelude because it can `read`. A test passes a structural fake. | Breaking for `@qadi/http` (the third parameter's type). |
| B. Overload: keep `Stream<SinkRecord>` *or* accept a reader | No break. | Two code paths and two frame formats in one route. The `Stream` path still cannot carry an environment or a backlog. Layering. |

**Recommendation: A.** `status: decided (2026-10-05, A — recommended default)`

## 6. Tasks

Order: T1 → T2 → T3 → T4 can land without ARCH-09. T5 waits for ARCH-09. T6–T9
follow T5. T10–T14 finish.

### T1 — Pin the pairing defects as failing tests, and correct two stale claims (test-first, no behavior change)
- **Status:** [x] done
- **Depends on:** —
- **Files:** `packages/core/test/DecisionSinkPairing.test.ts` *(new, deleted in T10)*, `examples/nextjs-newsroom/e2e/decision-log.spec.ts` *(new)*, `spec/behaviors/26-decision-stream.md`, `packages/devtools/src/model/Source.ts` (comment only)
- **Steps:**
  1. Create `DecisionSinkPairing.test.ts` with three `it.effect.fails`
     tests (or `it.effect` + `assert` wrapped in the `@effect/vitest`
     expected-failure form the repo already uses; check with
     `grep -rn "\.fails(" packages/*/test`). Each one documents one defect:
     - **"the documented ring+feed pairing loses a record made between backlog and live (C9)"**:
       build `decisionSinkRing` + `decisionSinkFeed()` (replay 0) under
       `decisionSinkAll`. Evaluate `before`. Read `ring.snapshot`. Evaluate
       `between`. Then `Stream.take(feed.stream, 1)` after evaluating `after`.
       Assert the union of ids contains `between`. Bound the collection with
       `Effect.timeoutOption("50 millis")` under `it.live`, per the
       `DecisionSinkFeed.test.ts:1-12` rule.
     - **"an ingested record reaches a live reader (C10)"**:
       `ring.ingest(obligationRecord, "Edge")`, then assert the feed delivers it.
       It fails, because nothing connects them.
     - **"the backlog a host serves decodes (C7)"**:
       `JSON.parse(JSON.stringify(yield* ring.snapshot))` then `decodeRecord`
       for each element must succeed. It fails (P1).
  2. Create `e2e/decision-log.spec.ts` with one `test.fail` (Playwright's
     expected-failure form): sign in as the chief editor (who holds
     `devtools:read`, `Dock.tsx:164-169`), open `/edge/double-count`, click
     `[data-testid=edge-call]`, wait for `[data-testid=edge-result]`, then
     expect the dock's Log to contain a row whose environment badge reads `Edge`
     within 5 s. Reuse `ssr.spec.ts`'s helpers for session and dock selectors.
  3. Correct BEH-QD-201's stale sentence (`26-decision-stream.md:47`, C12):
     replace "`publishUnsafe` rather than `publish`, because …" with the real
     reason `publish` is used (`DecisionSinkFeed.ts:83-93`). Keep the old text
     as a `>` blockquote under a "Corrected in CCR-QD-NEXT" line, per the
     house convention. Bump the document's revision row.
  4. Fix `Source.ts:257-259`'s `renderCause` reference to say "the same
     `try`/`catch` shape the codec's former `renderCause` used (deleted by
     ADR-QD-060)", or drop the clause.
- **Tests:** the three core tests and the one e2e test are expected failures.
  When T3/T11 fix the behavior, the expected-failure markers make them fail
  loudly, which forces their flip.
- **Verify:** `cd $W && node_modules/.bin/vitest run --project core packages/core/test/DecisionSinkPairing.test.ts`; `node scripts/check-doc-examples.mjs`; `bash spec/scripts/verify-traceability.sh --strict`; `pnpm --filter @qadi/example-nextjs test:e2e -- decision-log.spec.ts`
- **Done when:** all four tests are recorded as expected failures in green runs, BEH-QD-201 states what the code does, and the `renderCause` reference is gone.

### T2 — One ordering rule and one home for stored records (INV-QD-039 once)
- **Status:** [x] done
- **Depends on:** D-11-h
- **Files:** `packages/core/src/DecisionRecord.ts`, `packages/core/src/DecisionSinkRing.ts` (re-import only, deleted in T10), `packages/devtools/src/model/Source.ts`, `packages/devtools/src/model/Timeline.ts`, `packages/core/test/DecisionRecord.test.ts` *(new or extended; check `ls packages/core/test | grep DecisionRecord`)*, `packages/core/test/DecisionSink.tst.ts`
- **Steps:**
  1. Move `Stamped`, `StoredDecisionRecord`, `StoredObligationRecord`,
     `StoredRecord`, the hoisted `stampRecordMatch` and `stampRecord` verbatim
     from `DecisionSinkRing.ts:24-94` into `DecisionRecord.ts`, below
     `SinkRecord` (`:155`), keeping their doc comments. `DecisionSinkRing.ts`
     imports them from there. The barrel already re-exports both files, so no
     barrel edit is needed.
  2. Add to `DecisionRecord.ts`:
     ```ts
     import * as Order from "effect/Order";
     /**
      * The one order a stored record is read in (INV-QD-039): by `at`, an unknown
      * (`NaN`) time after every known one, two unknowns equal so a stable sort keeps
      * arrival order. …why: it was written twice, `Source.ts`'s `compareByAt` and
      * `Timeline.ts`'s `isAfter`, linked only by a comment.
      */
     export const storedRecordOrder: Order.Order<{ readonly at: number }> = Order.make((a, b) => {
       const aUnknown = Number.isNaN(a.at);
       const bUnknown = Number.isNaN(b.at);
       if (aUnknown || bUnknown) return aUnknown === bUnknown ? 0 : aUnknown ? 1 : -1;
       return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
     });
     ```
     Note `-0`/`0`: `<`/`>` treat them as equal, which matches today's
     `a.at - b.at` and `a > b`.
  3. `Source.ts`: delete `compareByAt` (`:173-189`) and sort with
     `(a, b) => storedRecordOrder(a, b)`. Keep the doc paragraph and point it at
     the export.
  4. `Timeline.ts`: delete `isAfter` (`:207-225`). In `insert` (`:198`), use
     `const after = Order.isGreaterThan(storedRecordOrder);` hoisted to module
     scope, and `entries.findIndex((existing) => after(existing, entry))`. Move
     the "a predicate rather than a comparator" paragraph to the hoisted const,
     rewritten as "the comparator is shared; this file asks only the
     greater-than question".
- **Tests:** add `describe("storedRecordOrder")` with (a) the closed grid from
  P4 (`{NaN, -Infinity, -1, -0, 0, 1, 2, Infinity}`) checked pairwise for
  totality, antisymmetry and transitivity, (b) "NaN after every known time",
  (c) "two NaNs compare equal, so a stable sort keeps arrival order".
  `Timeline.test.ts` and `Source.test.ts:619-665` (ordering, NaN rows) must stay
  green **unchanged**, which shows the refactor changed nothing. In
  `DecisionSink.tst.ts` (or a new `DecisionRecord.tst.ts`), assert that
  `StoredRecord` is still importable from `@qadi/core` with its `_tag`
  narrowing.
- **Verify:** `node_modules/.bin/vitest run --project core packages/core/test/DecisionRecord.test.ts && node_modules/.bin/vitest run --project devtools packages/devtools/test/model/Source.test.ts packages/devtools/test/model/Timeline.test.ts`; `pnpm circular`; `pnpm spec:api` (Source column for the moved types updated in T13; run here to see the expected STALE rows)
- **Done when:** success criterion 3 holds and both devtools suites are unchanged and green.

### T3 — Build `DecisionLog.ts`: a sink that is also a readable history
- **Status:** [x] done
- **Depends on:** T2, D-11-a, D-11-d
- **Files:** `packages/core/src/DecisionLog.ts` *(new)*, `packages/core/src/index.ts`, `packages/core/test/DecisionLog.test.ts` *(new)*, `packages/core/test/DecisionLog.tst.ts` *(new)*, `packages/core/test/DecisionSinkPairing.test.ts` (flip markers)
- **Steps:**
  1. Write the interface first, with doc comments in the house shape (summary
     line first, then the why):
     ```ts
     export const DEFAULT_LOG_CAPACITY = 500;
     export interface DecisionLogRead {
       readonly backlog: ReadonlyArray<StoredRecord>;
       readonly live: Stream.Stream<StoredRecord>;
     }
     export interface DecisionLog {
       readonly environment: string;
       readonly capacity: number;
       readonly layer: Layer.Layer<DecisionSink>;
       readonly ingest: (record: SinkRecord, environment?: string) => Effect.Effect<void>;
       readonly snapshot: Effect.Effect<ReadonlyArray<StoredRecord>>;
       readonly clear: Effect.Effect<void>;
       readonly read: Effect.Effect<DecisionLogRead, never, Scope.Scope>;
     }
     export type DecisionLogReader = Pick<DecisionLog, "read">;
     export const makeDecisionLog: (options: {
       readonly environment: string;
       readonly capacity?: number;
     }) => Effect.Effect<DecisionLog>;
     ```
  2. Implementation, following the prototype:
     - Validate `capacity` at call time (a throw, as both predecessors did): it
       must be a positive integer, and the message must say why zero is refused
       (D-11-d).
     - State: `let entries: Chunk.Chunk<Entry>` and `let seq = 0`, where
       `interface Entry { readonly seq: number; readonly stored: StoredRecord }`
       is not exported. Carry over the ring's comment on why a reassigned
       variable inside `Effect.sync` is atomic (`DecisionSinkRing.ts:136-139`).
     - `PubSub.sliding<Entry>({ capacity })`. Carry the feed's `publish`-not-`publishUnsafe`
       comment (`DecisionSinkFeed.ts:83-93`) verbatim onto the publish call.
     - `accept(record, environment)` = `Effect.sync(append)` **then**
       `PubSub.publish`. The order is load-bearing: append before publish means
       a reader that subscribes in between finds the record in its snapshot, and
       the high-water filter drops the duplicate. Publish before append would
       lose it. Say this in a comment. Wrap each half in `Effect.catchCause`
       with a `logWarning` (the `decisionSinkAll` member-isolation shape,
       `DecisionSinkForwarding.ts:155-159`), so a defect in one half does not
       skip the other.
     - `layer` = `Layer.succeed(DecisionSink, { record: (r) => accept(r, options.environment) })`.
     - `ingest` = `(r, env) => accept(r, env ?? options.environment)`.
     - `snapshot` = `Effect.sync` → entries' `stored`, stable-sorted by
       `storedRecordOrder`.
     - `clear` empties `entries`. It does not reset `seq`: a later reader's
       high-water mark must stay monotonic.
     - `read` = `Effect.gen`: `const sub = yield* PubSub.subscribe(pubsub)`,
       then **synchronously** snapshot `entries` and compute `hw` (the last
       entry's `seq`, or the current `seq` when empty, so that nothing published
       before an empty snapshot can leak in later). Return
       `{ backlog: sorted stored, live: Stream.fromSubscription(sub).pipe(Stream.filter((e) => e.seq > hw), Stream.map((e) => e.stored)) }`.
  3. Barrel: add `export * from "./DecisionLog.ts";` in alphabetical position
     (before `./DecisionRecord.ts`).
  4. Flip T1's two core expected-failure tests to plain tests rewritten against
     `makeDecisionLog`. They move into `DecisionLog.test.ts`, and
     `DecisionSinkPairing.test.ts` keeps only the codec one (C7), which T5
     flips.
- **Tests** (`DecisionLog.test.ts`). Port, don't copy, from the ring and feed
  suites (`DecisionSink.test.ts:462-586`, `DecisionSinkFeed.test.ts`), and add:
  - *stores, stamps, bounds:* "stores records and stamps the environment",
    "drops the oldest **arrival** once capacity is reached", "holds exactly
    `capacity`", "clear empties the backlog but not the sequence", "records
    failures as well as decisions", "a snapshot is a copy", "rejects 0,
    negative, fractional and NaN capacity, and names zero's reason",
    "defaults to `DEFAULT_LOG_CAPACITY`".
  - *live:* "a reader receives records made after `read`", "two readers each
    get their own copy", "publishing with no reader at all does not block the
    decision", "the newest record wins on a full lag buffer, not the oldest"
    (kills a `publishUnsafe` mutant, ported from `DecisionSinkFeed.test.ts:91`).
  - *the handoff (C9):* "a record made between `read`'s snapshot and the first
    live pull arrives live, once", "a record already in the backlog never
    arrives live again", and a **concurrency property**: `fc.assert` (or the
    repo's `it.prop`) over 1–40 writer fibers and 1–3 readers opened at random
    points. Each reader's `backlog ++ live` restricted to records made after
    the reader's oldest retained arrival equals that set exactly (as a
    multiset), with capacity large enough not to evict. Bound the live
    collection by count, not time.
  - *ingest (C10):* "an ingested record reaches a live reader with its own
    label", "an ingested record respects capacity", "ingest without a label
    falls back to the log's".
  - *order:* "the backlog is presented in `storedRecordOrder`, eviction is by
    arrival". Ingest `at: 3, 1, 2` with capacity 2 and assert the backlog is
    `[1, 2]` (oldest arrival `3` evicted, presented ordered).
  - *INV-QD-035:* "a log whose publish half dies still appends, and the
    decision is unchanged". Inject the defect through a `PubSub` that has been
    shut down: call `PubSub.shutdown` via a test-only path, or simulate it
    with a subscriber-side interrupt. If no non-invasive injection exists,
    assert only that `evaluate` with the log equals evaluate without it, as
    `DecisionSink.test.ts:343-418` does.
  - *determinism:* the whole suite runs under `it.effect` (`TestClock`). Only
    the C9 case that needs live semantics uses `it.live` + `timeoutOption`.
  - `DecisionLog.tst.ts`: `DecisionLog` is assignable to `DecisionLogReader`.
    `read`'s requirement is exactly `Scope.Scope`. `ingest`'s error channel is
    `never`.
- **Verify:** `node_modules/.bin/vitest run --project core packages/core/test/DecisionLog.test.ts packages/core/test/DecisionSinkPairing.test.ts`; `pnpm test:tstyche`; `pnpm lint`; `pnpm circular`
- **Done when:** success criterion 6 holds and the C9/C10 tests that failed in T1 now pass against the log.

### T4 — `Source` becomes one scoped `read`; the log is a source as is
- **Status:** [x] done
- **Depends on:** T3, D-11-c
- **Files:** `packages/devtools/src/model/Source.ts`, `packages/devtools/src/model/TimelineStore.ts`, `packages/devtools/src/model/Timeline.ts` (`DEFAULT_TIMELINE_CAPACITY`), `packages/devtools/src/react/useTimeline.ts` (doc only), `packages/devtools/src/react/DevtoolsDock.tsx` (`nothing`), `packages/devtools/test/model/Source.test.ts`, `packages/devtools/test/model/TimelineStore.test.ts`, `packages/devtools/test/react/useTimeline.test.tsx`, `packages/devtools/test/react/DevtoolsDock.test.tsx`, `packages/devtools/test/Source.tst.ts` *(new)*, `features/features/merged-sources/merged-sources.steps.test.ts`
- **Steps:**
  1. `Source.ts`: replace the interface with
     `interface SourceRead { readonly backlog?: ReadonlyArray<StoredRecord>; readonly live: Stream.Stream<StoredRecord> }`
     and `interface Source { readonly read: Effect.Effect<SourceRead, never, Scope.Scope> }`.
     Rewrite the module header: "A record log is two things, not one" becomes
     "two things, read together". Keep the absent-vs-empty paragraph on
     `backlog?`.
  2. `sourceFromRecords(records)` returns `{ read: Effect.succeed({ backlog: records, live: Stream.empty }) }`.
  3. Delete `sourceFromFeed` (`:52-72`).
  4. `sourceFromEventSource`: for now, `read` opens the connection inside the
     scope (move the `Stream.callback` resource into `read` via
     `Effect.acquireRelease` around `open`) and returns `{ live }` with
     `backlog` absent. The prelude comes in T7. Keep the construction-time
     `EventSource` check (`:114-123`).
  5. `mergeSources(sources)`: `read` = `Effect.forEach(sources, (s) => s.read)`.
     `backlog` is absent iff every part's is absent (BEH-QD-235). Otherwise
     concatenate the present parts and stable-sort with `storedRecordOrder`.
     `live` = `Stream.mergeAll(parts.map((p) => p.live), { concurrency: "unbounded" })`.
  6. `TimelineStore.runSource`: wrap the body in `Effect.scoped`. `const { backlog, live } = yield* source.read`,
     then accept the backlog, then `Stream.runForEach(live, …)`. Rewrite the
     doc comment: the backlog-then-live order is now atomic, because a source
     reads both at once.
  7. `Timeline.ts:64-65`:
     `export const DEFAULT_TIMELINE_CAPACITY = DEFAULT_LOG_CAPACITY;` imported
     from `@qadi/core`. Delete the "Matches DEFAULT_RING_CAPACITY" comment and
     point the doc at the import.
- **Tests:**
  - `Source.test.ts`: delete the `sourceFromFeed` block (`:141-214`). Its four
    properties (stamping, absent backlog key, obligation records, prototype
    preservation) now belong to `DecisionLog.test.ts` (T3) or are moot. Rewrite
    `sourceFromRecords` and `mergeSources` cases to call `Effect.scoped(source.read)`.
    Keep every assertion. Add "a `DecisionLog` used as a source hands the
    timeline its backlog then its live records, exactly once" (in-process
    integration through `runSource`).
  - `TimelineStore.test.ts`: the `runSource` cases are rewritten to the new
    shape, with the same assertions.
  - `Source.tst.ts`: `expect<DecisionLog>().type.toBeAssignableTo<Source>()`,
    and `expect<{ backlog: Effect.Effect<…> }>().type.not.toBeAssignableTo<Source>()`,
    which catches the old shape.
  - `merged-sources.steps.test.ts`: build producers with `sourceFromRecords` or
    a `makeDecisionLog`. "Producers that keep no history" become
    `{ read: Effect.succeed({ live: Stream.empty }) }`. All seven scenarios stay
    unchanged in the `.feature`.
- **Verify:** `node_modules/.bin/vitest run --project devtools`; `pnpm test:tstyche`; `pnpm --filter @qadi/features test`
- **Done when:** the devtools project and the merged-sources feature are green and the tstyche assignability holds.

### T5 — The stored-record envelope on the wire, through ARCH-09's codec
- **Status:** [x] done (deviated: names and excess keys)
- **Depends on:** ARCH-09 (its single outbound and inbound operations have landed), T2, D-11-e
- **Files:** `packages/core/src/SinkCodec.ts`, `packages/core/test/SinkCodec.test.ts`, `packages/core/test/DecisionSinkPairing.test.ts` (delete), `packages/core/test/SinkCodec.tst.ts` *(if ARCH-09 created one)*
- **Steps:**
  1. Read ARCH-09's landed interface first. This plan calls its two operations
     *outbound* (record → wire value, or refusal) and *inbound* (text or
     unknown → record, or a reason). Use the names as landed.
  2. Add, schema-first:
     `export const StoredRecordWire = Schema.Struct({ environment: Schema.String, record: SinkRecordWire }); export type StoredRecordWire = typeof StoredRecordWire.Type;`
  3. Add the stored variants **as members of ARCH-09's pipeline**, not a second
     pipeline. They are the same JSON-safety guard, the same Schema encode, and
     the same depth guard plus `UNTRUSTED_DECODE_OPTIONS` decode. The envelope
     has no excess-property leniency (GH-01 remains ARCH-09's call).
     - outbound stored: `StoredRecord` → `StoredRecordWire` encoded, or
       ARCH-09's refusal. `record` is projected exactly as outbound projects a
       `SinkRecord`. The `environment` is copied.
     - inbound stored: `unknown` → `StoredRecord`, or ARCH-09's reason union.
       Rebuild with `stampRecord(fromWire(record), environment)`, which is the
       second (and last) `stampRecord` call site in `src` (success criterion 2).
     - Compatibility (D-11-e, one minor): an inbound-stored call given
       `{ legacyEnvironment }` accepts a bare `SinkRecordWire` and stamps it with
       that label. Without it, a bare record is ARCH-09's "not a record"
       reason. Mark the option `@deprecated — remove in the minor after next`
       and add a §9 row to remove it.
  4. If ARCH-09 is **dropped**, implement the two stored operations on today's
     primitives (`isRecordJsonSafe` → `toWire` → `encodeRecordSync`;
     `decodeRecordWire` → `fromWireUnsafe`). Record that here and in §10, and
     leave ARCH-09 to absorb them later.
- **Tests** (`SinkCodec.test.ts`, new `describe("stored-record envelope")`):
  round-trip of a decision, a `Failed` (cause preserved per ARCH-09) and an
  obligations record with three labels; "the environment is the producer's and
  survives unchanged"; "an excess envelope key is refused"; "a bare record is
  refused without `legacyEnvironment` and stamped with it when given"; "a
  non-JSON-safe resource is refused, not thrown" (ARCH-09's refusal); a golden
  test pinning the encoded JSON of one envelope. Delete `DecisionSinkPairing.test.ts`
  and move its C7 test here as "a backlog served through the envelope decodes
  element by element", now passing.
- **Verify:** `node_modules/.bin/vitest run --project core packages/core/test/SinkCodec.test.ts`; `pnpm test:tstyche`; `pnpm circular`
- **Done when:** both stored operations exist inside ARCH-09's module, the golden test is pinned, and no test file named `DecisionSinkPairing` remains.

### T6 — `/__decisions` serves backlog, `synced`, then live, as labelled envelopes
- **Status:** [x] done
- **Depends on:** T3, T5, D-11-f, D-11-i
- **Files:** `packages/http/src/DecisionStreamRoute.ts`, `packages/http/test/decisionStream.test.ts`, `packages/http/test/DecisionStreamRoute.tst.ts` *(new if none exists)*
- **Steps:**
  1. Change the third parameter to `log: DecisionLogReader` (D-11-i).
  2. Per connection, inside the response stream's scope:
     `Stream.unwrapScoped(Effect.map(log.read, ({ backlog, live }) => …))`.
     Emit each backlog record as `Sse.encoder.write({ _tag: "Event", event: "backlog", id: undefined, data })`,
     then one `event: "synced"` frame whose data is the JSON of a
     `Schema.Struct({ backlog: Schema.Number })` (count of backlog frames
     *emitted*, after refusals), then each live record as `event: "message"`.
     The data is always outbound stored (T5). A refusal drops that one frame,
     as `frame` does today (`:130-140`).
  3. Replace `frame: Filter<SinkRecord, string>` with
     `frame: (event: SseEventName) => Filter<StoredRecord, string>`, where
     `type SseEventName = "backlog" | "message"` is a closed literal union.
     Keep it exported for the direct tests, as today (`:123-128`).
  4. `reauth` (`:307-317`) is unchanged and merges over the whole response
     stream. The prelude is subject to it too.
  5. Rewrite the module doc: the SSE section gains "what a reader receives,
     in order". The `decisionSinkFeed` references (`:115`, `:254`) now name the
     log.
- **Tests** (`decisionStream.test.ts`, replacing the `decisionSinkFeed` setup at
  `:110` and `:184` with `makeDecisionLog`):
  - "a reader receives the backlog, then `synced`, then live frames". Decode
    the response body's SSE events in order with `effect/encoding/Sse`'s
    decoder, if exported (check `Sse.decoder`/`makeParser`). Otherwise split
    on blank lines in the test only.
  - "an empty log still sends `synced` with `backlog: 0`".
  - "a record made while the prelude is being sent arrives once, live".
  - "an ingested `Edge` record is framed with `environment: \"Edge\"`" (C10, wire half).
  - "a frame the codec refuses is dropped and the rest of the stream continues"
    (port the existing refusal test).
  - The existing guard, anonymous-refusal and `reauth` tests stay green with only
    the setup line changed.
- **Verify:** `node_modules/.bin/vitest run --project http packages/http/test/decisionStream.test.ts`; `pnpm test:tstyche`
- **Done when:** success criterion 7 holds and every pre-existing `/__decisions` test passes with only its setup changed.

### T7 — `sourceFromEventSource` reads the prelude; the label comes off the wire
- **Status:** [x] done
- **Depends on:** T4, T5, T6
- **Files:** `packages/devtools/src/model/Source.ts`, `packages/devtools/test/model/Source.test.ts`
- **Steps:**
  1. `DecisionEventSource` becomes
     `{ onEvent: (event: "message" | "backlog" | "synced", handler: (data: string) => void) => void; onError; close }`.
     `openEventSource` (`:277-284`) registers one `addEventListener` per name.
  2. Options: remove `environment`. Add `legacyEnvironment?: string` (passed to
     inbound stored for bare frames, D-11-e) and `syncTimeout?: Duration.Input`
     (default `"2 seconds"`).
  3. `read`: open the connection in scope, route frames into one internal
     `Queue` tagged by event, and wait (`Effect.raceFirst` of three) for:
     `synced`, which makes the backlog the decoded `backlog` frames collected so
     far; the first `message` frame, an older server, which leaves the backlog
     **absent** and pushes that frame back onto live; or `syncTimeout` elapsing
     (`Effect.sleep`, so `TestClock` drives it), which also leaves it absent.
     `live` drains the remaining `message` frames. Every frame goes through
     inbound stored (T5). Failures keep `MalformedReason`'s two values
     (`not-json`, `not-a-record`), now taken from ARCH-09's reason union if it
     moved there.
  4. Delete `decodeFrame`, `parseJson` and `malformed` if ARCH-09 has moved
     their job into inbound. Otherwise keep `malformed` as the reporting shim.
     No `stampRecord` call remains in this file (success criterion 2).
- **Tests:** the fake (`Source.test.ts:20-80`) gains `onEvent` and a `queueEvent(name, data)` helper.
  - "a prelude becomes the backlog, in `storedRecordOrder`".
  - "`synced` with zero backlog frames is an empty backlog, not an absent one" (BEH-QD-203).
  - "a server that sends no prelude: the first message makes the backlog absent and is still delivered live".
  - "a silent old server: after `syncTimeout` the backlog is absent and the stream still runs" (`TestClock.adjust`).
  - "the environment is the frame's, not the reader's".
  - "a bare frame is stamped with `legacyEnvironment`, and is `not-a-record` without it".
  - The existing malformed, disconnect, close-on-scope and default-`EventSource` cases (`:216-548`), rewritten to `onEvent`.
  - Delete "has no backlog: a live feed cannot answer for the past" (`:409`). It is now false by design.
- **Verify:** `node_modules/.bin/vitest run --project devtools packages/devtools/test/model/Source.test.ts`
- **Done when:** success criterion 8 holds.

### T8 — `decisionBacklogRoute`: the backlog as JSON for readers that do not stream
- **Status:** [x] done
- **Depends on:** T3, T5, D-11-f (option C)
- **Files:** `packages/http/src/DecisionStreamRoute.ts` (or new `packages/http/src/DecisionBacklogRoute.ts` if the first file passes ~400 lines), `packages/http/src/index.ts`, `packages/http/test/decisionBacklog.test.ts` *(new)*
- **Steps:**
  1. `decisionBacklogRoute(permission, policy, log: Pick<DecisionLog, "snapshot">)`
     is built on `addGuardedRoute("GET", "/__decisions/backlog", …)`, like
     `decisionStreamRoute` (`:289-295`), so it registers with
     `PermissionRegistry`.
  2. Body: a JSON array of outbound-stored values, refused elements dropped,
     `content-type: application/json`, `cache-control: no-store`.
  3. Doc comment: there is no unguarded variant (BEH-QD-202's reasoning), it is
     not atomic with `/__decisions` (use the prelude for that), and the
     ADR-QD-049 CLI is the reader it is for.
- **Tests:** "refuses an anonymous caller"; "a permitted caller gets every
  retained record, each decodable by inbound stored"; "a refused element is
  dropped, the rest are served"; "it is listed by `/__permissions`" (port the
  registry assertion `decisionStream.test.ts` uses).
- **Verify:** `node_modules/.bin/vitest run --project http packages/http/test/decisionBacklog.test.ts`
- **Done when:** the route exists, is exported from the barrel, and its four tests pass.

### T9 — Resume on reconnect without re-sending the backlog
- **Status:** [x] done
- **Depends on:** T6, T7, D-11-g (option B)
- **Files:** `packages/core/src/DecisionLog.ts`, `packages/core/test/DecisionLog.test.ts`, `packages/http/src/DecisionStreamRoute.ts`, `packages/http/test/decisionStream.test.ts`
- **Steps:**
  1. `makeDecisionLog` reads `const epoch = yield* Clock.currentTimeMillis` once.
     Export `interface LogCursor { readonly epoch: number; readonly seq: number }`,
     `formatLogCursor`, and `parseLogCursor(text): Option.Option<LogCursor>`
     (strict `^\d+\.\d+$`, with no `as`).
  2. Add `readEntries(after?: LogCursor): Effect<{ backlog: ReadonlyArray<LogEntry>; live: Stream<LogEntry> }, never, Scope>`
     with `LogEntry = { cursor: LogCursor; record: StoredRecord }`. With a
     cursor whose `epoch` matches, the backlog holds only entries with
     `seq > after.seq`. Otherwise it holds the full backlog. `read` is
     `readEntries()` mapped to records, so there is one implementation.
  3. The route reads the `last-event-id` request header, parses it, and passes
     it to `readEntries`. Every `backlog`/`message` frame gets
     `id: formatLogCursor(entry.cursor)`. `synced` gets none.
- **Tests:** core: "a cursor from this log yields only what followed it";
  "a cursor from another epoch yields the full backlog"; "a malformed cursor
  is ignored"; "the epoch is the clock's" (`TestClock.setTime`). http: "a
  reconnect with `Last-Event-ID` receives only missed records, then `synced`".
- **Verify:** `node_modules/.bin/vitest run --project core packages/core/test/DecisionLog.test.ts && node_modules/.bin/vitest run --project http packages/http/test/decisionStream.test.ts`
- **Done when:** a reconnect receives zero frames it already had, when the process has not restarted.

### T10 — Delete the replaced exports and migrate every in-repo consumer (replace, don't layer)
- **Status:** [x] done
- **Depends on:** T3, T4, T6, D-11-b
- **Files:** delete `packages/core/src/DecisionSinkRing.ts`, `packages/core/src/DecisionSinkFeed.ts`, `packages/core/test/DecisionSinkFeed.test.ts`. Edit `packages/core/src/index.ts`, `packages/core/test/DecisionSink.test.ts` (delete `:462-586`), `packages/core/test/DecisionSinkForwarding.test.ts` (`:273-345` → log), `packages/react/test/QadiAtoms.test.ts:472`, `features/features/devtools-simulator/devtools-simulator.steps.test.ts:33,151,250`, `examples/http-advanced/server.ts:241-243`, `packages/devtools/README.md:15-80`, `apps/website/src/content/docs/docs/packages/devtools.md:20-63`, `apps/website/src/content/docs/docs/packages/core/services.md:86-90`, `apps/website/src/content/docs/docs/concepts/decision-lifecycle.md:88-120`, and comments that name the deleted modules: `packages/devtools/src/model/{Capture.ts:130,142, PortCalls.ts:205}`, `packages/devtools/src/react/ServicesPanel.tsx:236`, `packages/core/src/DecisionSinkForwarding.ts:4`, `packages/core/src/AttributeResolver.ts:34`
- **Steps:**
  1. Delete the two source files and their barrel lines. `decisionSinkAll` and
     `decisionSinkForwarding` are untouched.
  2. Migrate each consumer to `makeDecisionLog`. The forward-and-ingest
     end-to-end tests become "a record forwarded from one process arrives in
     another's log **and its live readers**", which strengthens C10's coverage.
  3. Website and README fences: rewrite to `makeDecisionLog` + passing the log
     as `source`. Fences marked `typescript` are compiled by gate 22
     (`node scripts/check-website-doc-examples.mjs`). Fix the source table
     (`devtools.md:60-63`, README `:53-57`): `sourceFromEventSource` now
     answers for the past when the server sends a prelude.
  4. `examples/http-advanced`: `const log = yield* makeDecisionLog({ environment: "Server", capacity: 1024 });`,
     `decisionStreamRoute(readPermission, readPolicy, log, { reauth: … })`, and
     `log.layer` wherever `feed.layer` was provided. Typecheck by hand, since
     no gate covers it (C13).
- **Tests:** no new tests. Moved and deleted tests are listed in §7.
- **Verify:** success criterion 1's grep; `pnpm typecheck`; `node_modules/.bin/vitest run --project core --project devtools --project react --project http`; `pnpm --filter @qadi/features test`; `node scripts/check-website-doc-examples.mjs`; `npx tsc --noEmit -p examples/http-advanced/tsconfig.json`
- **Done when:** success criterion 1 holds and every listed suite is green.

### T11 — Migrate `examples/nextjs-newsroom` to one log per process
- **Status:** [x] done
- **Depends on:** T6, T7, T8, T10
- **Files:** `examples/nextjs-newsroom/src/server/{layer.ts, processGlobal.ts, api.ts}`, `src/client/{atoms.ts, Dock.tsx, Counters.tsx}`, `README.md`, `e2e/decision-log.spec.ts`
- **Steps:**
  1. `processGlobal.ts`: replace the `Ring`/`Feed` interfaces and slots with
     one `log?: DecisionLog` slot (`import type { DecisionLog } from "@qadi/core"`)
     and `logOnce`. Use a **new** slot name so a dev server hot-reloading
     across this change cannot hand back a stale ring object (§9).
  2. `layer.ts`: `export const log = logOnce(() => Effect.runSync(makeDecisionLog({ environment: "Server", capacity: 500 })));`.
     `AppLayer` uses `log.layer`, with no `decisionSinkAll`. Rewrite the header
     comment: one value is the sink, the backlog and the feed.
  3. `api.ts`: delete `BacklogRoute` and the `json` helper if unused. Mount
     `decisionBacklogRoute(readDevtools, canReadDevtools, log)` and
     `decisionStreamRoute(readDevtools, canReadDevtools, log)`. `IngestRoute`
     calls `log.ingest(record.success, "Edge")`, which now reaches live readers.
  4. `atoms.ts`: `export const clientLog = Effect.runSync(makeDecisionLog({ environment: "Client", capacity: 300 }));`.
     `browserLayer` uses `clientLog.layer`.
  5. `Dock.tsx`: `makeSource = () => mergeSources([sourceFromEventSource({ url: "/api/__decisions", withCredentials: true, onMalformed }), clientLog])`.
     No environment strings. Update the header comment ("The source is two
     sources", `:13-17`).
  6. `Counters.tsx:102-105`: the copy is now true. Leave it, and add the
     `data-testid` the e2e test needs on the dock row if one is missing.
  7. Flip T1's Playwright `test.fail` to `test`. Add a second test: "the dock
     shows server decisions older than any replay window". As the chief
     editor, make 40 server decisions by visiting a guarded page 40 times (or
     calling `/api/articles/:id` 40 times), then open the dock page and expect
     ≥ 40 `Server` rows. Before this plan only 32 could arrive. Add a third:
     "`/api/__decisions/backlog` decodes", by fetching it with the chief
     editor's cookie in Playwright's `request` context and decoding each element
     with `@qadi/core`'s inbound stored in the test.
  8. README: the topology walkthrough names one log per process.
- **Tests:** the three e2e tests above. The example's vitest suite
  (`test/forwarding.test.ts`) stays green.
- **Verify:** success criterion 4's grep; `pnpm --filter @qadi/example-nextjs check` (gate 15: typecheck, vitest, build, e2e)
- **Done when:** success criteria 4 and 9 hold.

### T12 — Behaviors, invariants and the ADR
- **Status:** [x] done
- **Depends on:** T3–T9 (text reflects what landed; T9's paragraphs only if D-11-g = B)
- **Files:** `spec/behaviors/24-decision-sink.md`, `spec/behaviors/26-decision-stream.md`, `spec/behaviors/27-devtools-timeline.md`, `spec/behaviors/28-devtools-screens.md:240`, `spec/invariants.md`, `spec/decisions/NEXT-a-decision-log-is-a-sink-and-its-own-history.md` *(new, ADR-QD-NEXT)*, `spec/decisions/045-…md`, `046-…md`, `047-…md`, `050-…md:111` (amendment notes), `spec/decisions/index.yaml`
- **Steps:**
  1. **Behavior 24:** rewrite BEH-QD-185 as "A decision log is bounded by
     default, with one bound" (ts-fence of `makeDecisionLog`/`DecisionLog`,
     requirement: positive integer and why zero is refused, environment
     required). Rewrite BEH-QD-188 so `ingest` MUST reach live readers too.
     Add **BEH-QD-NEXT** "A reader sees each retained record once, across backlog and live"
     (requirements: no loss between snapshot and subscription; no duplicate;
     eviction by arrival, presentation by `storedRecordOrder`). BEH-QD-187's
     `decisionSinkAll` stays, and its example becomes log + forwarder. Keep
     superseded text as `>` blockquotes.
  2. **Behavior 26:** BEH-QD-201 is rewritten from "a feed buffers" to "the
     log's live half never blocks" (sliding `publish`, per-reader copies). The
     T1 correction stays in history. BEH-QD-202 gets the new parameter type and
     the reader-receives order. Add **BEH-QD-NEXT** "The backlog travels on the
     stream, and every frame names its producer" (prelude, `synced`, envelope,
     legacy frames), **BEH-QD-NEXT** for `decisionBacklogRoute`, and, if T9
     landed, **BEH-QD-NEXT** for resume.
  3. **Behavior 27:** BEH-QD-203's ts-fence becomes `Source`/`SourceRead`. Its
     third requirement ("environment stamped by the source, not read off a
     record") is replaced by "the environment is stamped once, by the producing
     log, and carried on the wire; a reader stamps only a legacy frame". Keep
     the old one as a blockquote. BEH-QD-235's backlog requirements refer to
     `SourceRead.backlog`. BEH-QD-205's capacity sentence names
     `DEFAULT_LOG_CAPACITY`.
  4. **Invariants:** INV-QD-039's Source paragraph names `storedRecordOrder`
     (`DecisionRecord.ts`) as the single order. Add **INV-QD-NEXT** "A log
     reader sees every retained record exactly once" (Source: `DecisionLog.ts`'s
     append-then-publish and subscribe-then-snapshot plus the high-water filter.
     Enforcement: T3's concurrency property).
  5. **ADR-QD-NEXT** "A decision log is a sink and its own history". Context:
     C1–C10. Decision: D-11-a…i as taken. Alternatives: D-11-a B/C, D-11-e B/C.
     Consequences, including the breaking exports. Amendment notes at the top
     of 045 (the pairing recipe is gone and the topology statement stands), 046
     (a minimal protocol now exists: prelude, `synced`, envelope, optional
     resume), 047 (`Source` is one scoped read), and 050:111 (the sealed
     simulation is checked against a log). Add an `index.yaml` entry.
  6. Run `node scripts/check-doc-examples.mjs`. Every `typescript` fence that
     names `makeDecisionLog` must compile against the landed code.
- **Tests:** none (spec).
- **Verify:** `node scripts/check-doc-examples.mjs`; `bash spec/scripts/verify-traceability.sh --strict`
- **Done when:** both gates pass and no behavior or ADR describes `decisionSinkRing`/`decisionSinkFeed` in the present tense outside a blockquote.

### T13 — Overview, traceability, devtools-spec claims gate, CCR, changesets
- **Status:** [x] done
- **Depends on:** T12, T10
- **Files:** `spec/overview.md`, `spec/traceability.md`, `spec/devtools-spec/00-overview.md`, `spec/devtools-spec/README.md` (claims table only if needed), `spec/devtools-spec/adr-draft-unified-stream.md`, `spec/devtools-spec/02-screens.md:304`, `spec/README.md` (CCR-QD-NEXT), `spec/roadmap.md` (if it describes the ring/feed in the present tense), `.changeset/arch-11-decision-log.md` *(new)*, `packages/core/CHANGELOG.md`/`packages/devtools/CHANGELOG.md`/`packages/http/CHANGELOG.md` (via changesets only)
- **Steps:**
  1. **`spec/overview.md`** (gate 13): remove rows `decisionSinkRing, DEFAULT_RING_CAPACITY` (`:249`),
     `decisionSinkFeed, DEFAULT_FEED_CAPACITY` (`:251`), and `sourceFromFeed`
     (`:676`). Change the Source column of `Stamped`, `StoredRecord`,
     `StoredDecisionRecord`, `StoredObligationRecord` and `stampRecord`
     (`:270-272`) to `DecisionRecord.ts`. Add `makeDecisionLog`,
     `DEFAULT_LOG_CAPACITY`, `DecisionLog`, `DecisionLogRead`,
     `DecisionLogReader`, `storedRecordOrder`, `StoredRecordWire` and its two
     operations, `decisionBacklogRoute`, `SourceRead`, and (T9)
     `LogCursor`/`LogEntry`/`formatLogCursor`/`parseLogCursor`. Bump the change
     history (1.32).
  2. **`spec/traceability.md`**: the behavior-24 and behavior-26 rows' Source
     lists swap `DecisionSinkFeed.ts`/`DecisionSinkRing.ts` for
     `DecisionLog.ts`. Add the new BEH and INV ids. §4 rows: delete
     `DecisionSinkFeed.test.ts` (`:270`), add `DecisionLog.test.ts`,
     `DecisionLog.tst.ts`, `Source.tst.ts` and `decisionBacklog.test.ts`, and
     update the `DecisionSink.test.ts` (`:263`) and
     `DecisionSinkForwarding.test.ts` (`:269`) BEH lists. Add an ADR-QD-NEXT §3
     row. §5: `merged-sources.feature` (`REQ-QD-030`) gains the new BEH id.
  3. **Devtools-spec and gate 12:** in `00-overview.md`, the topology table rows
     (`:87-88`) read "✅ in-process decision log" and "✅ decision log +
     seeded pairing", and the paragraph at `:65-72` names the log, its `ingest`
     reaching live readers, and the SSE prelude. Correct
     `adr-draft-unified-stream.md:62-65,79-83` with a dated correction plus
     blockquotes, not a rewrite. Fix `02-screens.md:304`'s `clear` reference.
     **Before writing, check every new sentence against `PHRASES` in
     `scripts/check-devtools-claims.mjs:58-72`.** If one needs an absence
     claim (for example, that a restarted process's log is not retained), add a
     row to the README's "Claims of absence" table with the reason. If an
     existing row stops matching, delete it. Then run the gate.
  4. **CCR-QD-NEXT** in `spec/README.md`, listing the exports removed and
     added, the defects C7/C9/C10 fixed, and C12's corrections.
  5. **Changeset** `.changeset/arch-11-decision-log.md`: `@qadi/core` minor,
     `@qadi/devtools` minor, `@qadi/http` minor. Each says **Breaking** and gives
     a migration snippet:
     `decisionSinkAll([ring.layer, feed.layer])` → `log.layer`;
     `sourceFromFeed({stream, environment, backlog})` → pass `log`;
     `decisionStreamRoute(p, policy, feed.stream)` → `(p, policy, log)`;
     `Source.backlog/live` → `Source.read`. Add a note that an older devtools
     reading a newer server reports `not-a-record` for every frame (D-11-e).
- **Tests:** none.
- **Verify:** `node scripts/check-api-surface.mjs`; `node scripts/check-devtools-claims.mjs`; `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/check-dod-table.mjs`
- **Done when:** gates 10–13 pass.

### T14 — Full gate, including mutation testing on core, the devtools model and http
- **Status:** [~] deferred to final integration gate
- **Depends on:** T1–T13
- **Files:** —
- **Steps:**
  1. `pnpm check`. If `pnpm coverage` or a Stryker dry run times out in
     `FieldPath.test.ts`, which is the known baseline issue in the tracker's
     open items, re-run coverage with `--testTimeout=60000` and record it in §10.
  2. Run the three relevant Stryker configs on their own first to read the
     survivors: `npx stryker run` (core: `DecisionLog.ts`,
     `DecisionRecord.ts`'s order and stamp, `SinkCodec.ts`'s envelope),
     `npx stryker run stryker.devtools.mjs` (`Source.ts`, `Timeline.ts`,
     `TimelineStore.ts`), and `npx stryker run stryker.http.mjs`
     (`DecisionStreamRoute.ts`, the backlog route).
  3. Each survivor in these files is killed with a test or recorded in §10 as
     equivalent, with the reason. Expect equivalents in the order's `-1`/`0`
     arms, which only `mergeSources`' sort tests distinguish (keep those tests),
     and in the `logWarning` messages.
- **Tests:** whatever step 3 adds.
- **Verify:** `pnpm check`
- **Done when:** `pnpm check` exits 0, the core/devtools/http mutation scores are ≥ 80% (at or above the tracker's 93.32 / 96.96 / 97.97 baseline, or the drop is explained in §10), and the merged-sources and devtools features pass.

## 7. Test strategy

**Survive unchanged:** `Timeline.test.ts` (INV-QD-039's forward/reversed/twice
product, the strongest evidence that T2 changed nothing), the `DecisionSink.test.ts`
blocks on record contents, failures, ordering, INV-QD-035, `evaluationId`, cache
and obligations (`:60-460`, `:588-799`), `DecisionSinkForwarding.test.ts`'s
forwarding and `decisionSinkAll` blocks (`:21-271`), `decisionStream.test.ts`'s
guard and `reauth` assertions (setup line only), the seven `merged-sources`
scenarios (steps only), and every devtools screen and pairing test that builds
timelines from fixtures through `stampRecord`.

**Move to the deepened interface (replace, don't layer):**

| From | To | Note |
| ---- | -- | ---- |
| `DecisionSink.test.ts` `describe("decisionSinkRing")` (`:462-586`, 10 tests) | `DecisionLog.test.ts` "stores, stamps, bounds" | `capacity 0 stores nothing` becomes "rejects 0" (D-11-d) |
| `DecisionSinkFeed.test.ts` (7 tests) | `DecisionLog.test.ts` "live" | the file is deleted |
| `DecisionSinkForwarding.test.ts` "forward and ingest, end to end" (`:273-345`) | same file, built on a log | gains "and its live readers" |
| `Source.test.ts` `sourceFromFeed` (`:141-214`, 5 tests) | `DecisionLog.test.ts` + one log-as-source test in `Source.test.ts` | stamping and prototype checks live where the stamp is |
| `Source.test.ts:409` "has no backlog" | deleted | false by design after T7 |
| T1's `DecisionSinkPairing.test.ts` | `DecisionLog.test.ts` (C9, C10) and `SinkCodec.test.ts` (C7) | the file is deleted in T5 |

**New property and differential coverage:**

- T2: algebraic laws of `storedRecordOrder` over a closed grid that includes
  `NaN`, `±Infinity` and `-0`.
- T3: a concurrency property that each reader's `backlog ++ live` is exactly
  the set of retained records (multiset equality), across random writer and
  reader interleavings. This is the guarantee C9 lacked.
- T5: an envelope golden plus round-trip for all record shapes.
- T6/T7: an in-process differential. The same log is read directly
  (`log.read`) and through the SSE route plus `sourceFromEventSource` with a
  fake that pipes the route's bytes. Both must yield the same `StoredRecord`
  multiset (`Equal.equals`). Put it in `packages/http/test/decisionStream.test.ts`,
  since http may depend on devtools only as a devDependency. Check
  `packages/http/package.json`. If adding the devDependency is unwanted, put the
  differential in `features/` as a step file instead.

**Mutation:** gates 16 (core), 17 (devtools model) and 21 (http) cover every
changed source file. `DecisionLog.ts` is new code on a concurrency path. The
handoff property plus the targeted "between" test must kill mutants that swap
append and publish, drop the `seq > hw` filter, or change `>` to `>=`. Check
each in T14's survivor list. The devtools suite's own rule
(`DecisionSinkFeed.test.ts:1-12`) applies: no test may hang under a mutant.

**Type-level:** `DecisionLog.tst.ts` (requirements, `never` error channels) and
`Source.tst.ts` (the log is a `Source`; the old two-field shape is not).

## 8. Spec and documentation updates

- Behaviors 24, 26, 27 and 28 (T12): BEH-QD-185, 188, 201, 202, 203, 205 and
  235 are rewritten, and three or four BEH-QD-NEXT ids are added. Superseded
  text stays as blockquotes.
- Invariants (T12): INV-QD-039's Source, plus one INV-QD-NEXT for exactly-once
  reading.
- ADR-QD-NEXT (new), and amendment notes on ADR-QD-045, 046, 047 and 050 (T12).
- `spec/overview.md` export tables (gate 13), `spec/traceability.md`
  §1/§2/§3/§4/§5, CCR-QD-NEXT in `spec/README.md` (T13).
- `spec/devtools-spec/00-overview.md`, `adr-draft-unified-stream.md`,
  `02-screens.md`, and the claims table if needed (gate 12, T13).
- `packages/devtools/README.md` and three website pages (gate 22, T10). The
  example README (T11).
- A changeset for core, devtools and http, all minor and marked Breaking (T13).
- T1 corrects BEH-QD-201's stale `publishUnsafe` sentence ahead of everything
  else, so the spec stops contradicting the code even if the rest of the plan
  stalls.

## 9. Risks and rollback

| Risk | How it shows up | Rollback |
| ---- | --------------- | -------- |
| The append-then-publish order is reversed later, or a refactor puts a `yield*` between `subscribe` and the snapshot | T3's "between" test and the concurrency property fail. Mutation survivors on those lines. | Revert to the T3 commit. The rule is commented at both sites. |
| ARCH-09 slips or lands with a different shape | T5 is blocked. T6–T9 wait. | T1–T4 ship alone: the log, the order, `Source.read`, with `sourceFromEventSource` still live-only. Or take T5 step 4's fallback on today's primitives. |
| Version skew in the separate-origin topology (old devtools, new server) | Every frame is reported as `not-a-record` through `onMalformed`. It is loud, not silent. | Upgrade both, or run the older server. The changeset states this. `legacyEnvironment` covers new readers of old servers. |
| `sourceFromEventSource`'s `read` waits too long on a silent old server | The panel is empty for `syncTimeout`. | It is configurable (default 2 s) and pinned by a `TestClock` test. |
| Next dev server hot reload hands an old `Ring` object from `globalThis.__qadiNewsroom` | Type or shape errors in dev only. | T11 uses a new slot name (`log`), so old slots are ignored. A full restart clears them. |
| A one-bound regression: the example's server had a 256 lag buffer and gets 500 | Slightly more memory per process (one `PubSub` of 500 entries, not per reader) | Accepted (D-11-d). `capacity` is the one knob. |
| Stream tests hang under Stryker mutants (the feed suite's documented failure) | The mutation run takes hours, not minutes. | Follow `DecisionSinkFeed.test.ts:1-12`: bounded `take`, `it.live` + `timeoutOption` only where needed. Check T14's timing against the 2026-10-04 baseline. |
| Playwright `Edge`-row test is flaky (forward is fire-and-forget in the edge route) | Intermittent e2e failure in gate 15. | Wait on `edge-result` first, then poll the Log with a 5 s timeout. Gate on the `forwardFailures.length === 0` text the page already renders. |
| `@qadi/http` gaining a devtools devDependency for the T6/T7 differential | Dependency-graph churn. | Put the differential in `features/` instead (§7). |

Two follow-ups, not part of this plan: drop `legacyEnvironment` (D-11-e) one
minor after release, and let `decisionSinkForwarding` carry its producer's
environment in the envelope so the aggregator's `"Edge"` label moves to the
producer (§3, ARCH-09's surface).

Overall rollback: T1 and T2 are independently safe. T3 adds a module and breaks
nothing until T10 deletes the old ones. Everything from T4 on is one breaking
release. To back out after release, revert the T4–T13 commits together and
publish a patch that restores `decisionSinkRing`/`decisionSinkFeed`/`sourceFromFeed`
from `e0ee958`. `DecisionLog.ts` can stay, since it is additive.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-05 | — | plan written | Claude (planning agent) |
| 2026-10-05 | T1 | `DecisionSinkPairing.test.ts` (3 `.fails`), `e2e/decision-log.spec.ts` (`test.fail`), BEH-QD-201 corrected (CCR-QD-905). Step 4 moot: ARCH-09 already removed `Source.ts`'s `renderCause` reference (only `SinkCodec.ts`'s accurate "the old `renderCause`" remains). E2E not run here (gate 15 deferred). | Claude (impl agent) |
| 2026-10-05 | T2 | Stored types + `stampRecord` moved to `DecisionRecord.ts`; `storedRecordOrder` added and read by `mergeSources` and `Timeline.insert` (`Order.isGreaterThan`). `DecisionRecord.test.ts` (grid laws), `DecisionSink.tst.ts` (StoredRecord via barrel). Source/Timeline suites unchanged and green (69). Overview Rev 1.35 started. | Claude (impl agent) |
| 2026-10-05 | T3 | `DecisionLog.ts` + barrel; `DecisionLog.test.ts` (24) and `DecisionLog.tst.ts`. `read`'s high-water mark is the current `seq` (append numbers and retains in one `Effect.sync`, so it equals the plan's "last entry's seq, or current seq when empty"). The concurrency property sets `Scheduler.MaxOpsBeforeYield` to 3–12 — without it no interleaving opens the append/publish window and the `seq > hw` mutants survived; below 3 the test runtime itself stalls. Hand-checked kills: `>=`, `true`, `hw - 1`, publish-before-append, `publishUnsafe`. INV-QD-035 asserted via evaluate-with = evaluate-without (no non-invasive PubSub-defect injection). | Claude (impl agent) |
| 2026-10-05 | T4 | `Source = { read }`, `SourceRead`; `sourceFromFeed` deleted; `mergeSources`/`runSource` scoped; `DEFAULT_TIMELINE_CAPACITY = DEFAULT_LOG_CAPACITY`. `sourceFromEventSource` keeps its connection in the live stream's own scope until T7 (no `acquireRelease` needed for a live-only read). `Source.tst.ts`; merged-sources steps on `sourceFromRecords`/`makeDecisionLog` (8/8). devtools 762/762. Example still names `sourceFromFeed` until T11 (gate 15 deferred). | Claude (impl agent) |
| 2026-10-05 | T5 | Envelope landed in `SinkCodec.ts` as `StoredRecordJson` (not `StoredRecordWire`: ARCH-09 made the record wire type private and named the public encoded side `SinkRecordJson`), with `encodeStoredRecord(String)`/`decodeStoredRecord(String)` and `DecodeStoredRecordOptions.legacyEnvironment` (@deprecated). **Deviation:** an unknown top-level envelope key is *ignored*, not refused — ARCH-15's ADR-QD-903 D-15-c settled GH-01 ("ARCH-09's call" in the plan) as top-level tolerance, and the frame envelope crosses the same rolling deploy; a missing/non-string `environment` or missing `record` is `Malformed`. Cause preservation tested via the v2 golden (a new `AttributeResolveError` construction would exceed `PORT_DOUBLE_BUDGET`). `DecisionSinkPairing.test.ts` deleted; C7 now passes in `SinkCodec.test.ts` (127). | Claude (impl agent) |
| 2026-10-05 | T6 | Route takes `DecisionLogReader`; body is `Stream.unwrap(log.read → decisionFrames(read))`. Exports `DecisionFrameEvent` (plan's `SseEventName`), `DecisionStreamSynced` (schema), `syncedFrame`. The plan's SSE-decoder question settled by reading the route's real response body through `toWebHandler` up to `synced` — it works, so the stale "no pattern for reading a body" comments were corrected. `DecisionStreamRoute.tst.ts` added. http decisionStream 32/32. | Claude (impl agent) |
| 2026-10-05 | T7 | `sourceFromEventSource`: `DecisionEventSource.onEvent` per `DecisionEventName`; `environment` option removed, `legacyEnvironment` (@deprecated) + `syncTimeout` (2 s) added; `read` opens the connection via `acquireRelease`, waits for synced/first message/timeout (`Effect.timeoutOption`), frames taken while waiting are kept (a timeout delivers them live; a reconnect's backlog frames arrive live, its `synced` ignored). `decodeFrame` is one `decodeStoredRecordString` call — no `stampRecord` in devtools (criterion 2). `MalformedReason` unchanged (four values, ARCH-09 `reasonOf`). The §7 differential landed as `features/features/decision-log` (REQ-QD-902, 5 scenarios) — real route bytes parsed by `Sse.makeParser`; `@qadi/features` gained `@qadi/http` (hand-edited lockfile + symlink, `--frozen-lockfile --offline` passes). devtools 770/770. | Claude (impl agent) |
| 2026-10-05 | T8 | New `packages/http/src/DecisionBacklogRoute.ts` (`DecisionStreamRoute.ts` was already ~430 lines), barrel export; optional `{ onRefused }` mirrors the stream route; `decisionBacklog.test.ts` (5: anonymous+unpermitted refused, every record decodes with labels in order, refused element dropped and reported, empty log is `[]`, listed by `/__permissions`). | Claude (impl agent) |
| 2026-10-05 | T9 | `LogCursor`/`LogEntry`/`DecisionLogEntries`/`formatLogCursor`/`parseLogCursor` (strict, safe-integer); `readEntries(after?)` is the one implementation and `read` maps it; `DecisionLogReader = Pick<DecisionLog, "read" \| "readEntries">` (the route needs cursors). `frame(event, cursor?)` writes `id:`; `decisionFrames` takes entries. Core +6 tests (epoch is the clock's, cursors on backlog and live, resume, other epoch → full, read = readEntries mapped, strict parse); http +3 through the real response (ids, resume after Last-Event-ID, bad/foreign header → full). | Claude (impl agent) |
| 2026-10-05 | T10 | Ring/feed sources, `DecisionSinkFeed.test.ts` and the ring `describe` deleted; consumers migrated (core forwarding test gains a live-reader assertion; devtools Simulation/SimulationSource/WhatIf/Replay/Wiring tests, react QadiAtoms, simulator steps, http-advanced (hand `tsc --noEmit` clean), devtools README, website devtools/services/decision-lifecycle + landing-content.js). Criterion 1 holds outside `examples/nextjs-newsroom` (T11). core+devtools+react+http 2561/2561, BDD 523/523, website examples 33 compile. | Claude (impl agent) |
| 2026-10-05 | T11 | `processGlobal` has one new `log` slot (`logOnce`); `layer.ts`/`atoms.ts` one log each; `api.ts` mounts `decisionStreamRoute`/`decisionBacklogRoute` over the log, ingest reaches live readers; `Dock.tsx` passes `clientLog` as a source. Criterion 4 holds (`"Server"`/`"Client"`/`"Edge"` once each). Counters copy unchanged (now true; existing `qadi-log-row`/`data-environment` suffice). E2E run here despite gate 15 being deferred: `next build` + Playwright 30/30 incl. the 4 new `decision-log.spec.ts` tests (Edge row, ≥40 Server rows, backlog decodes, backlog refused to a reader). Example vitest 14/14, `tsc --noEmit` clean. Also added a 403 test for the backlog route. | Claude (impl agent) |
| 2026-10-05 | T12 | Numbering (branch-local 9xx): ADR-QD-904, BEH-QD-906 (24), BEH-QD-907/908/909 (26), INV-QD-906, REQ-QD-902. Behaviors 24 (Rev 1.7), 26 (1.6), 27 (1.5), 28 (1.2); invariants 1.50; ADR-045 1.2, 046 1.3, 047 1.1, 050 1.2; index.yaml. Superseded text kept as blockquotes. Traceability (1.83) updated here too, since `spec:verify:strict` needs ADR-QD-904 traced and the deleted test file gone. `spec:examples` 84 compile, strict traceability 19/19. | Claude (impl agent) |
| 2026-10-05 | T13 | Overview Rev 1.35 (rows maintained per task since T2; final history entry); traceability Rev 1.83 (done in T12); devtools-spec `00-overview` 0.7, `adr-draft-unified-stream` 0.4, `02-screens` 0.9 with dated corrections — no new absence phrase, so the claims table is unchanged (gate 12: 8 claims); CCR-QD-905 row rewritten in full; `.changeset/arch-11-decision-log.md` (core/http/devtools minor, Breaking, migration snippets, skew note). `spec/roadmap.md` had no ring/feed mention. Gates 10–13 pass. | Claude (impl agent) |
| 2026-10-05 | T14 | Deferred to the orchestrator's final gate (`pnpm check`, coverage thresholds, Stryker core/devtools/http). Ran instead: `pnpm typecheck`, `pnpm lint`, `pnpm circular`, `pnpm test:tstyche` (55), full `vitest run` (115 files, 2883 tests), `pnpm test:bdd` (33 files, 523), `spec:examples` (84), `spec:website-examples` (33), `spec:verify:strict` (19/19), `spec:api` (823), `spec:gates`, `spec:claims`, http-advanced `tsc --noEmit`, example vitest 14/14 + `next build` + Playwright 30/30. Mutation note for T14: the key `DecisionLog.ts` mutants (`seq > hw` → `>=`/`true`, `hw - 1`, publish-before-append, `publishUnsafe`) were hand-checked killed in T3; the concurrency property depends on `Scheduler.MaxOpsBeforeYield` 3–12 to open the windows. | Claude (impl agent) |
