---
id: ARCH-09
title: SinkCodec owns the whole outbound and inbound path, so every sink makes one call and gets the same wire
strength: Strong   # from the 2026-10-05 architecture review (candidate 02)
status: implemented   # branch arch/deepening-10, T1–T12 done; T13 (full gate + mutation) deferred to the final integration gate
evidence_verified_at: e0ee958
depends_on: []   # builds on ARCH-05 (DecisionWire.ts) and ARCH-02 (stack-safe, memoised policyDepth), both already on arch/integration
blocks: [ARCH-15]   # ARCH-15 changes the wire outcome shape; it should land inside this plan's inbound/outbound operations
adrs_touched:
  - ADR-QD-002 (read: schema and type are one definition at an untrusted input)
  - ADR-QD-037 (read: madge circular gate, type-only imports included — decides where the new errors live)
  - ADR-QD-044 (read: the optional sink; INV-QD-035)
  - ADR-QD-045 (amend: `send` receives a verified `SinkRecordJson`; an encode refusal reaches `onFailure`, never `send`)
  - ADR-QD-046 (amend: one record can never end the feed; a refused record is reported)
  - ADR-QD-047 (read: headless devtools model)
  - ADR-QD-051 (read: spans; this plan adds none on the per-record path)
  - ADR-QD-054 (read: a companion package owns its own errors — `AuditEntryNotEncodable` stays in audit)
  - ADR-QD-056 (amend: an audit row carries the encoded wire, byte-identical to SSE and forwarding; a guarded reader)
  - ADR-QD-060 (amend: `Schema.Defect()` now governs `cause` on every outbound path, not only forwarding)
  - ADR-QD-073 (read: UNTRACED_BUDGET — no new Effect.fnUntraced)
  - ADR-QD-076 (read: Stryker ignoreStatic — keep new logic out of module-load initializers)
  - ADR-QD-078 (read: DecisionWire is embedded, bytes unchanged)
  - ADR-QD-090 (read: policyDepth is stack-safe, memoised, and throws on a cycle)
packages:
  - "@qadi/core"
  - "@qadi/http"
  - "@qadi/audit"
  - "@qadi/devtools"
  - "examples/nextjs-newsroom (@qadi/example-nextjs)"
  - "apps/website (docs only)"
estimate: L   # T1–T2 ≈ ½ day; T3–T5 ≈ 2 days; T6–T10 ≈ 2 days; T11–T13 ≈ 1 day
---

# ARCH-09 — SinkCodec owns the whole outbound and inbound path, so every sink makes one call and gets the same wire

## 1. Verified evidence (at `e0ee958`)

Everything below was re-read in the `arch/integration` worktree
(`W=.claude/worktrees/agent-adb672833eb753a12`, HEAD `e0ee958`). Nine throwaway
probes ran from the session scratchpad
(`/private/tmp/claude-502/…/scratchpad/arch09/probe{1..10}.mts`), never from the
repo, with:

```sh
ln -sfn $W/packages/core/node_modules <scratch>/arch09/node_modules   # one effect instance
cd $W/packages/core && NODE_OPTIONS="--conditions=bun" \
  /Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/.bin/tsx <scratch>/arch09/probeN.mts
```

Every probe's scenario is re-stated as a real test in T1, so the scratch files
are not needed to reproduce anything.

**Baseline test run, green:**

```sh
cd $W && node_modules/.bin/vitest run packages/core/test/SinkCodec.test.ts \
  packages/core/test/DecisionSinkForwarding.test.ts packages/core/test/DecisionWire.test.ts \
  packages/http/test/decisionStream.test.ts packages/audit/test/AuditEntry.test.ts \
  packages/audit/test/AuditDecisionSinkLive.test.ts packages/devtools/test/model/Source.test.ts \
  packages/devtools/test/react/useTimeline.test.tsx
# Test Files 8 passed (8) — Tests 159 passed (159)
```

**Tooling caveat.** The brief's command — the *main checkout's*
`node_modules/.bin/vitest` run inside the worktree — fails all eight files with
`TypeError: Cannot read properties of undefined (reading 'config')` (two vitest
instances; the same failure ARCH-07 §1 C9 recorded for `pnpm --filter`). The
worktree's own `node_modules/.bin/vitest` works. Every Verify line below uses
`node_modules/.bin/vitest run …` from the checkout root.

### C1. `SinkCodec.ts`'s exported interface, and which names have a production consumer — **CONFIRMED**

`packages/core/src/SinkCodec.ts` has 11 `export` statements over 10 names
(`SinkRecordWire` is both a const and a type): `EvaluationErrorSchema` (:68-78),
`SinkRecordWire` (:96-128), `isJsonSafe` (:200-230), `isRecordJsonSafe`
(:261-268), `toWire` (:277-300), `fromWireUnsafe` (:347-390), `encodeRecord`
(:393), `encodeRecordSync` (:416), `decodeRecordWire` (:479-484), `decodeRecord`
(:494-495). All reach the public `@qadi/core` barrel (`index.ts:40`
`export * from "./SinkCodec.ts"`) and are listed in `spec/overview.md:273-281`.

Consumers outside the file (`grep -rnw <name> packages examples features apps`,
excluding `lib/`, `node_modules`, and SinkCodec.ts itself):

| Name | Production consumers (src / example) | Only tests or doc comments |
| ---- | ------------------------------------ | -------------------------- |
| `EvaluationErrorSchema` | — | — |
| `SinkRecordWire` | `audit/src/AuditEntry.ts:26,56` | `DecisionWire.ts:4,12` (comments) |
| `isJsonSafe` | — | `FieldPath.ts:282` (comment), `SinkCodec.test.ts`, `decisionStream.test.ts` |
| `isRecordJsonSafe` | `http/src/DecisionStreamRoute.ts:69,131`, `audit/src/AuditEntry.ts:26,82` | tests |
| `toWire` | `core/src/DecisionSinkForwarding.ts:24,76`, `http/src/DecisionStreamRoute.ts:70,137`, `audit/src/AuditEntry.ts:26,91`, `examples/…/app/api/edge/decide/route.ts:46,115` | 4 test files |
| `fromWireUnsafe` | — | `SinkCodec.test.ts` |
| `encodeRecord` | — | `SinkCodec.test.ts`; a comment in `DecisionSinkForwarding.ts:68` |
| `encodeRecordSync` | `core/src/DecisionSinkForwarding.ts:24,76` | `SinkCodec.test.ts` |
| `decodeRecordWire` | — | comments in `DecodeDepthGuard.ts:10`, `HydrationMetrics.ts:73`, `react/src/HydrationEngine.ts:212`; tests |
| `decodeRecord` | `devtools/src/model/Source.ts:24,222`, `examples/…/src/server/api.ts:35,215` | tests |

So the review's "5 with no outside consumer" is exactly right:
`EvaluationErrorSchema`, `isJsonSafe`, `fromWireUnsafe`, `encodeRecord`,
`decodeRecordWire`.

### C2. Each caller assembles a different subset of guard / projection / encode — **CONFIRMED, and there are two more callers than the review named**

| Caller | What it runs | Guard? | Schema encode? |
| ------ | ------------ | ------ | -------------- |
| `DecisionSinkForwarding.ts:76` | `Effect.sync(() => encodeRecordSync(toWire(record)))` | no | yes |
| `DecisionStreamRoute.ts:130-140` (`frame`) | `isRecordJsonSafe` → `JSON.stringify(toWire(record))` | resource + policy | **no** |
| `AuditEntry.ts:79-93` (`encodeAuditEntry`) | `isRecordJsonSafe` → `toWire`; the store `JSON.stringify`s (BEH-QD-250 prose, `33-audit-pipeline.md:73-77`) | resource + policy | **no** |
| `examples/…/app/api/edge/decide/route.ts:115` | `Response.json({ …, wire: toWire(record) })` | no | **no** |
| `examples/…/src/server/api.ts:181-187` (`/backlog`) | `JSON.stringify(ring.snapshot)` — raw `StoredRecord` class instances, not even the wire projection | no | no |

Inbound there are two decoders, each preceded by its own parse:
`devtools/src/model/Source.ts:213-226` (private `parseJson` :261-268, then
`decodeRecord`), and `examples/…/src/server/api.ts:209-216` (`request.json`, then
`decodeRecord`). The SSE route's own comment (:104-117) and `isRecordJsonSafe`'s
(`SinkCodec.ts:232-247`) both claim the guard covers "every caller-supplied
`unknown` value a `SinkRecord` can carry" — false, see C4.

### C3. SUSPECTED (a): an `Error` cause is `{}` on SSE and audit, `{name, message}` on forwarding — **CONFIRMED** (probe 1)

A `Failed` record carrying `AttributeResolveError({ attribute: "x", cause: new Error("db down") })`:

| Path | `failed.cause` on the wire | after `decodeRecord` |
| ---- | -------------------------- | -------------------- |
| forwarding (`encodeRecordSync(toWire(r))`) | `{"name":"Error","message":"db down"}` | an `Error`, message `db down` |
| SSE `frame(r)` | `{}` | the plain object `{}` |
| audit (`JSON.stringify(entry)`) | `{}` | `{}` |
| example edge route (`Response.json`) | `{}` | `{}` |

The cause is lost because `Schema.Defect()` (ADR-QD-060) acts only inside a
Schema encode, and only forwarding runs one. `JSON.stringify` of an `Error`
serialises its own *enumerable* properties, and `message`/`name` are not
enumerable. ADR-QD-060's Consequences ("`cause`'s wire representation
(`Schema.Defect()`) is a maintained library schema") is therefore true on one
path out of four.

`AuditEntry.test.ts:17-24` ("encodes a Failed record") uses
`failedRecord()` (`audit/test/helpers.ts:67-77`), whose error is
`MissingResource` — a class with no `cause` — so it cannot see this. **CONFIRMED.**

### C4. SUSPECTED (b): the guard never walks `outcome`, so a circular cause kills every SSE subscriber — **CONFIRMED** (probes 1, 2, 9)

`isRecordJsonSafe`'s `Decision` arm (`SinkCodec.ts:264-266`) walks `resource` and
`policy` only. For a `Failed` record whose cause is cyclic:

- `isRecordJsonSafe(r) === true`, then `frame(r)` throws `TypeError: Converting
  circular structure to JSON` (probe 1).
- Two subscribers on one `decisionSinkFeed`, each running
  `Stream.filterMap(feed.stream, frame)`: after `good, bad, good` is published,
  **both** subscribers' streams die with that `TypeError` (probe 2). The guard's
  stated purpose ("refusing just the one frame rather than the whole feed",
  `DecisionStreamRoute.ts:113-117`) fails for exactly this input.
- **Realistic trigger (probe 9):** an HTTP-client error — an `Error` whose own
  enumerable `config`/`request` properties point back into each other, which is
  the shape axios-style clients throw — used as an `AttributeResolveError`'s
  `cause`. `isRecordJsonSafe` is `true` and `frame` throws. One attribute-store
  outage from an HTTP-backed resolver ends every open `/__decisions` connection.
- A `BigInt` cause (`cause: 10n`) also passes the guard and throws in `frame`
  (`Do not know how to serialize a BigInt`), and also throws at the audit store's
  `JSON.stringify` and in the example edge route.
- Non-finite numbers in a cause (`NaN`, `{ n: Infinity }`) do not throw. They
  become `null` silently on **all** paths, forwarding included, because
  `Schema.Defect()`'s JSON formatter also normalises them (probe 2:
  `encodeRecordSync` output already holds `{ n: null }`). The guard's own "NaN is
  refused, not accepted" rule (`SinkCodec.ts:147-151`) never sees an outcome.

### C5. Found while settling C4: a poisoned cause trips the audit breaker and drops healthy rows — **CONFIRMED defect** (probe 10)

An `AuditTrailPort` that persists `JSON.stringify(entry)` inside `Effect.try`,
mapping a throw to `AuditWriteError` (the store BEH-QD-250's prose describes).
`AuditDecisionSinkLive({ failureThreshold: 5 })` is fed five `Failed` records
with the HTTP-client-style cause, then one healthy `Decided` record. Result: **0
rows persisted**. The five writes fail and trip the breaker. The `Decided` record
is then dropped with `WARN audit entry dropped: circuit breaker open and no
staging port wired { evaluationId: 'd99' }`. During an attribute-store outage,
every `Failed` record poisons the store and the audit trail stops recording the
decisions that *did* succeed. This is the worst consequence in this plan.

### C6. Found while settling: `encodeRecordSync` is not total — **CONFIRMED defect; the "provably total" doc claim is REFUTED** (probes 2, 3, 6)

`SinkCodec.ts:399-414` says `SinkRecordWire`'s encode "is provably total for
anything `toWire` produces", and `spec/overview.md:279` repeats it. For an
in-memory policy nested about 5,000 levels deep,
`encodeRecordSync(toWire(r))` throws `Error: Sync adapter can only throw schema
errors` (a `RangeError` inside `Schema.suspend`'s descent).
`Schema.encodeResult` throws `Result adapter can only return schema issues`, and
`Schema.encodeEffect` dies with `RangeError` (probe 6).

This is reachable through `evaluate` (probe 3). With a 6,000-deep `not` chain,
`evaluate(p, { maxDepth: 100000 })` succeeds, and `evaluate(p)` fails
`PolicyTooDeep`. In both cases `decisionSinkForwarding` sends nothing and calls
`onFailure` with that encode error. `onFailure` is documented as receiving
"the value `send` failed or died with" (BEH-QD-187), so an encode failure is
misreported as a delivery failure. The `PolicyTooDeep` record, which is exactly
the one an operator wants to see, never leaves the process. On the SSE path
`JSON.stringify` survives 5,000 levels but throws `RangeError` at 20,000 (probe
2), which again ends every subscriber.

### C7. Found while settling: the outbound and inbound paths disagree on depth — **CONFIRMED defect** (probe 4)

`decodeRecordWire` refuses any JSON nested past `MAX_DECODE_DEPTH` (=
`DEFAULT_MAX_DEPTH * 4` = 256, `Policy.ts:43,973`). Nothing on the outbound side
checks this, so a sender emits records that every receiver refuses:

| Policy (evaluated against a subject holding `doc:read`) | `evaluate` | forwarded | receiver `decodeRecord` |
| ------------------------------------------------------- | ---------- | --------- | ----------------------- |
| `not`×60, `maxDepth: 64` | Success | yes | ok |
| `allOf`×90, `maxDepth: 128` | Success | yes | ok |
| `allOf`×130, `maxDepth: 200` | Success | yes | **`PolicyDecodeTooDeep`** |
| `not`×250, `maxDepth: 300` | Success | yes | **`PolicyDecodeTooDeep`** |

A legitimate, successful evaluation under a raised `maxDepth` therefore produces
a record that devtools shows as `"not-a-record"` and the example aggregator
answers with a 400. The sender sees nothing wrong. Within the default
`maxDepth: 64` every record round-trips.

### C8. Found while settling: `isJsonSafe` accepts values that `JSON.stringify` silently empties — **CONFIRMED defect** (probe 5)

`isJsonSafe` treats any non-`Date` object as a container of `Object.values`
(`SinkCodec.ts:186-198`), so:

| Value | `isJsonSafe` | `JSON.stringify` |
| ----- | ------------ | ---------------- |
| `new Map([["a",1]])` | true | `{}` |
| `new Set([1])` | true | `{}` |
| `/x/` | true | `{}` |
| `new Uint8Array([1,2])` | true | `{"0":1,"1":2}` |
| object with a `Symbol` key only | true | `{}` |
| object with an own `toJSON` | false | `"replaced"` |

A resource such as `{ tags: new Set(["finance"]) }`, which is ordinary in ABAC,
is persisted to the audit trail as `{ tags: {} }` and streamed the same way,
with no refusal. That contradicts `AuditEntryNotEncodable`'s own doc ("a class
instance JSON cannot round-trip", `AuditEntry.ts:29-33`) and the guard's own
first line ("a value `JSON.stringify` can round-trip without lying").

### C9. Found while settling: the audit reader has no depth guard — **CONFIRMED defect** (probe 8)

`Schema.decodeUnknownEffect(AuditEntry)` on a stored row whose `record.policy`
is nested 60,000 levels deep dies with `RangeError: Maximum call stack size
exceeded`. This is the pattern `AuditEntry.test.ts:131,146` demonstrates for
reading rows back. `@qadi/audit` exports no guarded reader.

### C10. `devtools` `parseJson` and the stale `renderCause` references — **CONFIRMED**

`devtools/src/model/Source.ts:257-268` holds a private `parseJson` whose comment
(:258-259) says "the same shape `SinkCodec`'s `renderCause` uses". ADR-QD-060
deleted `renderCause` (`spec/decisions/060-…md`, Decision, third bullet).
`devtools/src/model/Capture.ts:247` (in `renderError`'s doc, :238-250) cites the
same deleted function. Both lines are at the positions the brief gives.

### C11. Does hydration (`HydrationEngine.ts`, `DecisionWire.ts`) encode records and need routing through SinkCodec? — **REFUTED (not needed)**

`react/src/HydrationEngine.ts` encodes `Decision`s, not `SinkRecord`s. It calls
`encodeDecision` (:237) and `encodePolicy`, and `dehydrateEntry` (:257-261)
copies `resource` raw. The payload travels to the browser as React Server
Component props (`examples/…/app/edge/mixed-payload/page.tsx:46` and others),
which React Flight serialises with native `Map`/`Set`/`BigInt`/`Date` support,
not as JSON. Routing it through a JSON-wire module would be wrong.
`DecisionWire.ts` is already embedded in `SinkRecordWire.decided`
(`SinkCodec.ts:116`), so it passes through whatever Schema encode the outbound
operation runs. That is a pure gain: `DecisionWire`'s bytes are pinned by
`SinkCodec.test.ts:1065-1130` ("byte-identical to 1caf04c"). The only hydration
changes are doc-comment references to `decodeRecordWire`
(`HydrationEngine.ts:212`, `spec/behaviors/19-hydration.md:603,615`).

### C12. Prior per-caller patches — **CONFIRMED**

- `7bce142` (#117, 2026-09-09) widened `encodeAuditEntry` from `isJsonSafe(resource)` to `isRecordJsonSafe`.
- `6444264` (#93, 2026-09-08) rewrote `DecisionStreamRoute.ts` (121 lines), including `frame`.
- `SinkCodec.ts`'s own history adds `cbc74ab` (iterative `isJsonSafe`), `ef0a0f4` (shared depth guard), `4690798` (exhaustive dispatch), `60c9758` (`encodeRecordSync`, #107) and `d435b30` (ADR-QD-060).
- The SSE test comment at `decisionStream.test.ts:548-555` names three more audit tickets (148, 154, 159) for the same gap.

Seven patches touch this pipeline, and each one fixed one caller.

### C13. Spec text that the code already contradicts — **CONFIRMED drift**

- BEH-QD-200 (`spec/behaviors/25-inspection.md:549-551`): "An error's `cause` MUST be rendered to a string". Since ADR-QD-060, forwarding writes `{name, message}` and the other paths write `{}`.
- BEH-QD-199 (`25-inspection.md:521-523`): "An `EvaluationError` MUST cross carrying its tag and its stable code". ADR-QD-060 dropped `code` from the wire.
- `spec/overview.md:279`: `encodeRecordSync` "already knows the encode cannot fail" (C6).
- There is no requirement anywhere that a refused SSE record is *reported*. `frame` drops it silently (`Result.fail(record)`, no log, no callback), unlike the "reported rather than silent" precedent in BEH-QD-187 and BEH-QD-204.

### C14. Where new errors can live without a cycle — **CONFIRMED constraint**

`Errors.ts` imports `type { PolicyDecodeTooDeep } from "./Policy.ts"` (:55), and
`SinkCodec.ts` imports value classes from `Errors.ts` (:34-44). madge counts
type-only imports (ADR-QD-037). So an error that must join `QadiError`/`ERROR_CODES`
(`Errors.ts:376-413`, last code `ACL018`) cannot be declared in `SinkCodec.ts`.
It has to be declared in `Errors.ts` itself. `SinkRecord`'s `_tag` cannot be
imported into `Errors.ts` either (`DecisionRecord.ts` imports `EvaluationError`
from it), so a tag literal declared there needs a tstyche equality test against
`SinkRecord["_tag"]` (`packages/core/test/Errors.tst.ts` exists).

### C15. Effect 4.0.0 facts this plan relies on

- `Schema.encodeResult` (`effect/src/Schema.ts:2106`) and `Schema.decodeUnknownResult` (:1668) exist.
- `Result.try` exists (`Result.ts:627`, `try_ as try`), and so does `Effect.fromResult` (`Effect.ts:2583`).
- A `Result` is **not** yieldable inside `Effect.gen`. `yield* Result.succeed(41)` dies with `Not a valid effect` (probe 5), so Effect-side callers use `Effect.fromResult`.
- `Schema.Defect()` (`Schema.ts:8973-9030`): the encoded side is `Schema.Json`. An `Error` encodes to `{name, message, cause?}`, cycles are dropped, and a `BigInt` becomes `"10n"`.
- `Schema.encode` leaves `undefined`-valued optional keys in its output (probe 7: `decided.trace.label`, `failed.expected`, and others). A walk over *encoded* output must therefore treat an `undefined` property as absence.
- `policyDepth` (`Policy.ts:1223-1235`) is memoised per policy object (`depthMemo`) and stack-safe, and it throws on a cycle (`TreeFold.ts:69`). For a record that came from `evaluate`, it costs nothing, because `evaluate` already computed it.

## 2. Goal and success criteria

**Goal.** Make `SinkCodec.ts` a deep module. Its interface becomes two operations,
each with a value form and a text form:

- Outbound: a record becomes a verified JSON-safe wire value, or a typed refusal.
- Inbound: text or untrusted `unknown` becomes a record, or a typed reason.

The guard, the projection, the Schema encode (so `Schema.Defect()` governs `cause`
everywhere), the depth bound, and the rebuild all become implementation. The
forwarding sink, the SSE route, the audit encoder, the devtools source, and the
example's routes become thin adapters, each making one call. Each adapter keeps
only what is really its own: where the bytes go, and how a refusal is reported.

The deletion test passes today in reverse. Five exports have no consumer, and
the three that do are each used as a different subset, which is exactly how C3–C8
arose. Every fix to the shared guard so far has been applied per caller
(C12).

After the change, the guard's rules have locality: they sit in one module,
against the encoded output, so they cannot miss a field. The interface carries
one invariant that callers can rely on: whatever the outbound operation emits,
the inbound operation accepts. That gives leverage to every current and future
sink. The inbound operation is also the single place where ARCH-15's exclusive
outcome union and any wire-version handling will land.

**Success criteria** (each checkable):

1. `grep -nE "^export" packages/core/src/SinkCodec.ts` lists exactly `SinkRecordJson` (const and type), `encodeSinkRecord`, `encodeSinkRecordString`, `decodeSinkRecord` and `decodeSinkRecordString` (names per D-09-a).
2. `grep -rnwE "toWire|fromWireUnsafe|isJsonSafe|isRecordJsonSafe|encodeRecordSync|decodeRecordWire|EvaluationErrorSchema|SinkRecordWire" packages/*/src examples/nextjs-newsroom/src examples/nextjs-newsroom/app apps/website/src spec/overview.md` prints nothing, except lines inside `SinkCodec.ts` (module-private names).
3. `grep -nE "JSON\.(stringify|parse)" packages/core/src/DecisionSinkForwarding.ts packages/http/src/DecisionStreamRoute.ts packages/audit/src/AuditEntry.ts packages/devtools/src/model/Source.ts` prints nothing. Each of those files names exactly one SinkCodec operation.
4. Every T1 test is green. The two-subscriber SSE test and the five-poisoned-records audit test would both fail at `e0ee958`.
5. The round-trip property (INV-QD-NEXT-a) holds over generated records, including hostile causes and resources. For every record, `encodeSinkRecordString(r)` is either a refusal, or a string that `decodeSinkRecordString` accepts and rebuilds equal to `r` modulo the documented normalisations.
6. The totality property (INV-QD-NEXT-b) holds over generated hostile values: `encodeSinkRecord`, `encodeSinkRecordString`, `decodeSinkRecord` and `decodeSinkRecordString` never throw.
7. `JSON.stringify(entry)` of an `encodeAuditEntry` result, the SSE frame's data line, and the value `send` receives are the same bytes for the same record (one adapter-agreement test per pair).
8. `node scripts/check-house-style.mjs` passes, with `SCHEMA_ERROR_BUDGET` (12), `SWITCH_BUDGET`, `UNTRACED_BUDGET`, `ANY_BUDGET` and `HAS_CUSTOM_BUDGET` unchanged. `pnpm circular` is green.
9. `node scripts/check-api-surface.mjs` (gate 13) is green, with removed names gone from `spec/overview.md` and new ones listed.
10. Mutation scores: core ≥ 93.32, http ≥ 97.97, audit ≥ 86.92, devtools ≥ 96.96 (the README's integration-branch numbers). If any score drops, the CCR explains why. All stay above the `break: 80` thresholds.
11. `pnpm check` is green end to end.

## 3. Non-goals

- **The wire's outcome shape.** `decided?`/`failed?` both-or-neither handling
  (tickets 96/155, `SinkCodec.ts:327-390`) is ARCH-15's, and so is any
  `MalformedWireRecord` tag. This plan moves that logic behind the inbound
  operation unchanged, and pins it through the new interface, so ARCH-15 edits
  one module.
- **Forward version skew (GH-01, `SinkCodec.ts:418-442`).** It also lands
  inside the inbound operation later. This plan does not change
  `UNTRUSTED_DECODE_OPTIONS` handling.
- **Hydration.** C11 shows it is a different envelope on a different serialiser.
- **`Date` fidelity.** A `Date` inside `resource`/`params` keeps today's
  behaviour: accepted, it crosses as an ISO string and decodes as a string. The
  plan names this normalisation in INV-QD-NEXT-a rather than changing it.
- **Lossless `cause`.** `Schema.Defect()`'s normalisations stay as they are: an
  `Error` keeps `name`/`message`/`cause`, a cycle is dropped, `BigInt` becomes
  `"10n"`, and `NaN` becomes `null`. Those are ADR-QD-060's chosen contract. A
  cause is diagnostic, and refusing a whole `Failed` record because of its cause
  would lose the outage record that matters most.
- **Converting `decisionSinkForwarding`'s `record` arrow or
  `AuditDecisionSinkLive.record` to `Effect.fn`.** Both are §5 deviations that
  predate this plan, and adding a span per record is an ADR-QD-051 decision.
- **A real transport for `send`.** ADR-QD-045 stands: core ships the seam, not
  the transport.
- **The example `/backlog` route's consumer.** No in-repo reader exists
  (`Dock.tsx:80` uses the client ring). T9 makes its body the wire form so it
  stops being a sixth, unguarded outbound path, and nothing more.

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1 (submodule imports, `.ts` extensions, `import type`) | `import * as Result from "effect/Result"` and `import * as Data from "effect/Data"` in the new code. Cross-package imports are named imports from `@qadi/core`. |
| AGENTS.md §4 (Data.TaggedError default; `SCHEMA_ERROR_BUDGET` = 12) | `SinkRecordNotEncodable` and `SinkRecordNotDecodable` are `Data.TaggedError`. They never cross a codec themselves, since a refusal is reported locally. So the budget and AGENTS.md §4's table do not change. No `Effect.orDie` anywhere: a refusal is a value. |
| AGENTS.md §5 / ADR-QD-073 (`Effect.fn`; `UNTRACED_BUDGET`) | Both operations are pure functions returning `Result` (D-09-a), so no `Effect.fn` is owed and no span is added per record. Adapters that report a refusal do so through an `Effect.fn("qadi.…")` invoked only on the refusal branch, so the happy path pays nothing. No `Effect.fnUntraced`. |
| AGENTS.md §5a (`Match`, not `switch`) | Refusal-reason dispatch (devtools `MalformedReason`, log annotations) uses `Match.tagsExhaustive` on the `Data.TaggedEnum`. The hazard walker is `if`/`typeof` over primitives, the same shape as today's `isJsonScalarSafe`, and has no `_tag` dispatch. `SWITCH_BUDGET` is unchanged. |
| AGENTS.md §6 (no `as`/`!`/`any`; no `new Date()`) | The walker returns typed refusals and the encoded value keeps `Schema.encodeResult`'s inferred `SinkRecordWire.Encoded` type, so there are no casts. `Date` handling uses `instanceof Date` and `Number.isNaN(d.getTime())` and constructs nothing. The `as const` in today's `toWire` (:280, :287) may stay, since it is exempt. |
| User memory: no `Record<string, unknown>` widening; closed unions | Refusal reasons are closed `Data.TaggedEnum`s with per-variant fields. Field-less variants use `Record<never, never>` (the `Selection.ts:17` idiom). `MalformedReason` gains its member as the full union `"not-json" \| "too-deep" \| "not-a-record"` (D-09-f), not `old \| "too-deep"`. |
| AGENTS.md §7 / ADR-QD-002 | `SinkRecordJson` is `Schema.toEncoded(SinkRecordWire)`, derived from the one schema and never hand-written. `SinkRecordWire` stays the single definition, now module-private. |
| AGENTS.md §9 (barrels) | `index.ts:40` stays `export * from "./SinkCodec.ts"`. With fewer exports, fewer names leak. The private walker is not exported. |
| AGENTS.md §10 (core coverage 95%, others 90%) | Every refusal variant and every inbound reason has a direct test (T3, T4). |
| AGENTS.md §11, §12, §15 (spec normative; `typescript` fences compile; gate 13) | BEH-QD-199/200/187/204/250, a new SSE requirement, two invariants, the ADR, traceability and overview change in the same change set as behaviour (T11). Signature listings in behaviour docs stay ` ```ts ` fences. Any runnable example uses ` ```typescript ` and must compile under `check-doc-examples.mjs`. |
| ADR-QD-037 (madge, type imports count) | The new errors and `SinkRecordTag` live in `Errors.ts` (C14). `SinkCodec.ts` keeps importing `Errors.ts`, `Policy.ts` (for `policyDepth` and `MAX_DECODE_DEPTH`) and `DecodeDepthGuard.ts`, all edges that already exist. No new module imports `SinkCodec.ts` from inside core. |
| ADR-QD-060 | The nine classes stay the schema. Their `cause` positions are now encoded through `Schema.Defect()` on every outbound path, which is the amendment. |
| ADR-QD-054 | `AuditEntryNotEncodable` stays `@qadi/audit`'s own error and gains a `refusal` field carrying core's typed reason. `@qadi/http` adds no error class: a refused frame is reported, not raised. |
| ADR-QD-056 / BEH-QD-250/251 | An encode refusal still never reaches staging or the trail, and the breaker still trips only on `write` failures. After T8, a record can no longer reach `write` in a form whose serialisation throws, which closes C5 at its cause. |
| ADR-QD-076 (`ignoreStatic`) | The walker, the depth pre-checks and the rebuild run per call. The only module-load code is the `Schema.encodeResult(SinkRecordWire)` and `decodeUnknownResult` closures and the `Match.type` dispatchers, the same static mass `SinkCodec.ts` already has. |
| Merge gate is `pnpm check` (AGENTS.md §15) | T13 runs it whole. Stryker configs `stryker.config.mjs` (core), `stryker.http.mjs`, `stryker.audit.mjs` and `stryker.devtools.mjs` (mutate `packages/devtools/src/model/**`) all cover touched files. |
| Changesets fixed group (`.changeset/config.json`) | All nine public packages bump together. T12 writes a patch changeset for T2 and a minor (pre-1.0 breaking) changeset for the refactor. |

## 5. Decisions needed before work starts

### D-09-a — The interface: shape and names of the two operations

| Option | Shape | For | Against |
| ------ | ----- | --- | ------- |
| **A. Four pure functions returning `Result`**: `encodeSinkRecord(record) → Result<SinkRecordJson, SinkRecordNotEncodable>`, `encodeSinkRecordString(record) → Result<string, …>`, `decodeSinkRecord(input: unknown) → Result<SinkRecord, SinkRecordNotDecodable>`, `decodeSinkRecordString(text) → Result<SinkRecord, …>` | One call per adapter, in the form the adapter needs. Forwarding and audit want a value, SSE and devtools want text. | The SSE `frame` is a synchronous `Filter`, so it can call it directly. A pure codec is testable with no runtime. The names do not collide with today's `encodeRecord`/`decodeRecord`, so T3/T4 can ship additively before any removal. "Value or text" is the only axis callers differ on. | Effect callers write `Effect.fromResult(...)`, since a `Result` is not yieldable (C15). Two functions per direction instead of one. |
| B. The same four, returning `Effect` | — | `yield*`-able. | Owes `Effect.fn` per §5, which adds a span or a budget question per record. The SSE `Filter` becomes `filterMapEffect` on every frame. The codec does no effects. |
| C. Value-only pair (`encodeSinkRecord`, `decodeSinkRecord`), callers stringify or parse | — | Two names. | SSE keeps its own `JSON.stringify` and devtools keeps its own `parseJson`, the very pieces the review flagged. "Not JSON" stops being a codec reason. |
| D. Keep `encodeRecord`/`decodeRecord` with new types | — | Familiar names. | Collides with today's `encodeRecord` (Effect over a wire value), so there is no additive staging and every caller breaks at once. |

**Recommendation: A**, with the module doc stating the invariant pair (INV-QD-NEXT-a/b).
The `Sink` in the names is deliberate. It names the record type the operations take and sets them apart from `encodeDecision` and `encodeAuditEntry`.

`status: decided (2026-10-05, A — recommended default)`

### D-09-b — Refusal and decode-failure types, and where they live

- **(i) Two `Data.TaggedError`s in `Errors.ts`**, each carrying a closed `Data.TaggedEnum` reason. Both join `QadiError` with new `ERROR_CODES` entries (`ACL0NN`, numbered at merge, after ARCH-03's `ACL018`):

  ```ts
  export type SinkRecordTag = "Decision" | "Obligations"; // tstyche: equals SinkRecord["_tag"]
  export type WirePath = ReadonlyArray<string | number>;
  export type EncodeRefusal = Data.TaggedEnum<{
    Circular: { readonly path: WirePath };
    TooDeep: { readonly path: WirePath; readonly maxDepth: number };
    NonFinite: { readonly path: WirePath };                    // NaN, ±Infinity, invalid Date
    Unrepresentable: { readonly path: WirePath; readonly kind: "function" | "symbol" | "bigint" | "undefined-element" };
    Opaque: { readonly path: WirePath; readonly kind: OpaqueKind; readonly brand: string };
    EncodeFailed: { readonly message: string };                // Schema rejected the record, or inspecting it threw
  }>;
  export type OpaqueKind = "Map" | "Set" | "WeakMap" | "WeakSet" | "RegExp" | "BinaryData" | "Promise" | "Error" | "BoxedPrimitive" | "CustomToJSON" | "OtherBuiltIn";
  export class SinkRecordNotEncodable extends Data.TaggedError("SinkRecordNotEncodable")<{
    readonly recordTag: SinkRecordTag; readonly evaluationId: string; readonly refusal: EncodeRefusal;
  }> {}
  export type DecodeRefusal = Data.TaggedEnum<{
    NotJson: Record<never, never>;
    TooDeep: { readonly maxDepth: number };
    Malformed: { readonly message: string };
  }>;
  export class SinkRecordNotDecodable extends Data.TaggedError("SinkRecordNotDecodable")<{
    readonly refusal: DecodeRefusal;
  }> {}
  ```
- (ii) Keep inbound's `PolicyDecodeTooDeep | Schema.SchemaError` and add only a `RecordNotJson`, with the outbound error as in (i). This is less churn for `decodeRecord`'s existing type. But the inbound reasons become three unrelated tags from two modules, and "too deep" stays named after `Policy` for a record.
- (iii) A refusal as a plain tagged value, not an `Error`. It would be lighter, but it could not join `QadiError`/`ERROR_CODES`, and adapters that log or forward it would lose `ACL` correlation.

**Recommendation: (i).** One reason union per direction lets every adapter map
reasons with one `Match.tagsExhaustive`. ARCH-15 can add an inbound reason as a
full-union edit in one place. Placement in `Errors.ts` is forced by C14.

`status: decided (2026-10-05, (i) — recommended default)`

### D-09-c — What the outbound operation refuses (the hazard walk's rules)

- **(i) Walk the whole *encoded* output.** The walk is iterative, with one mutable on-path `Set`, and tracks the path. It applies the rules below and refuses at the first hazard:

  | Value found | Verdict |
  | ----------- | ------- |
  | An object already on the current path | `Circular` |
  | Depth > `MAX_DECODE_DEPTH`, counted exactly as `exceedsJsonDepth` counts | `TooDeep` |
  | `NaN`, `±Infinity`, or an invalid `Date` | `NonFinite` |
  | `function`, `symbol`, `bigint`, or an `undefined` **array element** | `Unrepresentable` |
  | An `undefined` **property** | **accepted as absence**. JSON drops the key and decode reads it as absent. Required because Schema's own output has such keys (C15). This loosens today's rule for `resource`, for example `{ deletedAt: undefined }`. |
  | An object whose `Object.prototype.toString` brand is not `Object`/`Array`/`Date` (Map, Set, RegExp, typed arrays and other binary data, Promise, Error, boxed primitives) | `Opaque` |
  | An object with a callable `toJSON` other than `Date` | `Opaque{kind:"CustomToJSON"}` |
  | A valid `Date` | accepted. It crosses as an ISO string (named normalisation). |

  `cause` positions are never refused, because `Schema.Defect()` has already
  turned them into `Schema.Json`. Two pre-checks run before the encode so the
  encode cannot overflow (C6): `policyDepth` (memoised; a throw means a cycle,
  reported as `Circular`), and an iterative trace depth. The encode itself runs
  under `Result.try`, so a throw becomes `EncodeFailed` and never a defect.
- (ii) Minimal: keep per-field walks and add `outcome` to `isRecordJsonSafe`, which is T2's hotfix semantics. The next new field is missed again, `cause` stays `{}` on SSE and audit, and depth asymmetry (C7) and encode overflow (C6) remain.
- (iii) A literal round-trip check: `JSON.parse(JSON.stringify(encoded))` deep-compared to `encoded`. This is the most literal test of "round-trips without lying". It costs about 3× (stringify, parse, compare), cannot name a path cheaply, and still needs the depth and cycle pre-checks to avoid throwing.

**Recommendation: (i).** It is the only option that cannot miss a field, because
it checks what is actually emitted. The `undefined`-property loosening is
deliberate and named in BEH-QD-250's rewrite and INV-QD-NEXT-a. A property test
pins the agreement of `TooDeep` with `exceedsJsonDepth`.

`status: decided (2026-10-05, (i) — recommended default)`

### D-09-d — What an audit row carries

- **(B) `AuditEntry.record: SinkRecordJson`, the verified encoded wire.** `JSON.stringify(entry)` is then exactly the bytes SSE and forwarding emit. A new `decodeAuditEntry(input: unknown): Result<{ entry: AuditEntry; record: SinkRecord }, SinkRecordNotDecodable>` validates a stored row through core's guarded inbound operation and closes C9. `Retention`, `SequenceIntegrity` and `AuditArchive` keep working unchanged: they read only `record.at`, `record.evaluationId` and `sequenceNumber`, which are the same in the encoded form. This breaks store implementers who read `entry.record.failed` as a class instance.
- (A) Keep the Type-side row and document "a store MUST `Schema.encode(AuditEntry)` before persisting". There is no type change, but every store must remember a step, and BEH-QD-250's prose already assumes `JSON.stringify`. This is the per-caller pattern again, moved into user code.
- (C) Keep the Type-side `record` and add `json: SinkRecordJson` beside it. That gives two copies of one row that can disagree, which is layering.

**Recommendation: (B).** It is the only option where the store cannot get it wrong.

`status: decided (2026-10-05, (B) — recommended default)`

### D-09-e — How each adapter reports a refusal

- **(i)**
  - **Forwarding:** `onFailure` receives the `SinkRecordNotEncodable` (a plain domain value, consistent with CCR-QD-122). The default log has its own message, `qadi: a decision record could not be encoded for forwarding`, annotated with `qadi.refusal` (the reason tag), `qadi.path` and `evaluationId`, so it is never confused with a send failure.
  - **SSE:** the record is dropped from that one frame. A new optional `DecisionStreamOptions.onRefused?: (refusal: SinkRecordNotEncodable) => void` is called if supplied. Otherwise the route logs `qadi/http: a decision record could not be framed` with the same annotations.
  - **Audit:** `AuditEntryNotEncodable` gains `refusal: EncodeRefusal` (keeping `recordTag`, with `reason` derived from the refusal), and the `writesEncodeFailed` metric stays.
- (ii) As (i), but SSE stays silent. That keeps today's behaviour and breaks the "reported rather than silent" precedent (C13).
- (iii) Forwarding gets a separate `onRefused` instead of reusing `onFailure`. It is more explicit, but it is a second callback for "this record did not get delivered", and BEH-QD-187's "could not be delivered" already covers it.

**Recommendation: (i).**

`status: decided (2026-10-05, (i) — recommended default)`

### D-09-f — devtools `MalformedReason`

- **(i) Full closed union `"not-json" | "too-deep" | "not-a-record"`.** BEH-QD-204's own reasoning is that different problems need different fixes. After T6, a too-deep frame means an older or foreign sender, which is a third fix. This breaks consumers that switch exhaustively on `MalformedReason`. In-repo there is one: `examples/…/src/client/Dock.tsx:73`.
- (ii) Fold `TooDeep` into `"not-a-record"`. There is no type change, but the reader can no longer distinguish the cases.

**Recommendation: (i).**

`status: decided (2026-10-05, (i) — recommended default)`

### D-09-g — Ship a non-breaking hotfix first?

- **(i) Yes, T2 (patch).**
  - `isRecordJsonSafe` also walks `outcome`, so a cyclic or `BigInt` cause is refused instead of crashing SSE or poisoning the audit breaker.
  - `isJsonSafe` refuses the opaque built-ins of C8, except `Error`. Under T2's semantics every `Error` cause would otherwise be refused, so `Error` keeps its old treatment until T3.
  - Cost: until T8, an audit `Failed` record with a hostile cause is refused (counted in `writesEncodeFailed`) rather than persisted.
- (ii) No. Go straight to T3–T10, which leaves C4/C5 live for the length of the refactor.

**Recommendation: (i).** C5 drops healthy audit rows during an outage, so the
patch is worth shipping on its own. T2's code is then deleted by T10. That is
replacement, not layering.

`status: decided (2026-10-05, (i) — recommended default)`

## 6. Tasks

Order: T1 → T2 (ship) → T3 → T4 → T5 (bench, needs old and new side by side) → T6, T7, T8, T9 (any order) → T10 → T11 → T12 → T13.

### T1 — Write the red tests that pin every live defect at today's seams

- **Status:** [x] done (deviated: tests landed with the task that turned each green, as the plan's "Green after" column says; all ten were observed failing first on this branch for their stated reasons. #9 was first written against `Schema.decodeUnknownEffect(AuditEntry)` (the RangeError defect) since `decodeAuditEntry` did not exist yet, then rewritten on `decodeAuditEntry` in T8)
- **Depends on:** —
- **Files:** `packages/http/test/decisionStream.test.ts`, `packages/audit/test/AuditDecisionSinkLive.test.ts`, `packages/audit/test/AuditEntry.test.ts`, `packages/audit/test/helpers.ts`, `packages/core/test/SinkCodec.test.ts`, `packages/core/test/DecisionSinkForwarding.test.ts`
- **Steps:**
  1. Add a helper `failedWithCause(cause: unknown, evaluationId?)` to `audit/test/helpers.ts` and an equivalent local fixture in `decisionStream.test.ts`. Add `httpClientError()` there too: an `Error("Request failed with status code 503")` whose own enumerable `config`/`request` properties reference each other, as in probe 9.
  2. Write each test below and run it at `e0ee958`. Confirm it fails for the stated reason. Record the failing output in the PR description.
  3. Each test lands in the PR of the task that turns it green (column "Green after"). Until then it stays local, because a red test cannot merge.
- **Tests:**

  | # | File · name | Asserts | Green after |
  | - | ----------- | ------- | ----------- |
  | 1 | `decisionStream.test.ts` · "a Failed record whose cause is an HTTP-client error with a reference cycle does not end the feed: both subscribers receive the next record" | Two `Stream.filterMap(feed.stream, frame)` subscribers. Publish good, poisoned, good. Each collects exactly the two good frames, and neither stream fails. | T2 |
  | 2 | `decisionStream.test.ts` · "a BigInt cause does not end the feed" | Same as #1 with `cause: 10n`. | T2 |
  | 3 | `SinkCodec.test.ts` · "isJsonSafe refuses a Map, a Set, a RegExp and a typed array — JSON.stringify renders each as {} or an index object" | `isJsonSafe` returns false for each. | T2 |
  | 4 | `AuditDecisionSinkLive.test.ts` · "five poisoned Failed records do not trip the breaker for a JSON-text store; the next Decided record is written" | The store does `Effect.try(() => rows.push(JSON.stringify(entry)))`, with threshold 5. After 5 poisoned records and 1 `Decided`, the `Decided` row is persisted. | T2 (poisoned refused), still green after T8 (poisoned written, cause normalised) |
  | 5 | `AuditEntry.test.ts` · "a Failed record's Error cause survives the store's JSON.stringify as {name, message}" | `JSON.parse(JSON.stringify(entry)).record.failed.cause` deep-equals `{name:"Error", message:"db down"}`. | T8 |
  | 6 | `decisionStream.test.ts` · "an Error cause reaches the frame as {name, message} — the same bytes forwarding sends" | The data line equals what forwarding's `send` receives, `JSON.stringify`ed, for the same record. | T7 |
  | 7 | `DecisionSinkForwarding.test.ts` · "a record whose policy is 5,000 levels deep is refused as TooDeep and reported as a refusal, never as a send failure" | `send` is not called. `onFailure` receives a `SinkRecordNotEncodable` whose `refusal._tag === "TooDeep"` and whose path starts with `"policy"`. | T6 |
  | 8 | `DecisionSinkForwarding.test.ts` · "a successful evaluation the receiver would refuse (allOf×130, maxDepth 200) is refused at the sender instead" | `evaluate` succeeds, `send` is not called, and `onFailure` gets `TooDeep`. | T6 |
  | 9 | `AuditEntry.test.ts` · "decodeAuditEntry refuses a 60,000-deep stored row with a typed TooDeep, never a RangeError defect" | `Result.isFailure` holds with `refusal._tag === "TooDeep"`, and no throw. | T8 |
  | 10 | `AuditEntry.test.ts` · "a resource carrying a Set refuses instead of persisting {}" | `encodeAuditEntry` fails `AuditEntryNotEncodable`. | T2; after T8 also `refusal._tag === "Opaque"` |
- **Verify:** `node_modules/.bin/vitest run packages/http/test/decisionStream.test.ts packages/audit/test/AuditDecisionSinkLive.test.ts packages/audit/test/AuditEntry.test.ts packages/core/test/SinkCodec.test.ts packages/core/test/DecisionSinkForwarding.test.ts`. At `e0ee958` exactly the ten new tests fail, and the 159 baseline tests still pass.
- **Done when:** each of the ten tests exists and has been observed failing for its stated reason.

### T2 — Hotfix: walk `outcome` and refuse opaque built-ins in the existing guard (patch, non-breaking)

- **Status:** [x] done (deviated: the outcome walk reads the resolver error's `cause`, not `isJsonSafe(record.outcome)`: `cause` is not an own enumerable property of a `Schema.TaggedError`, so walking the outcome object never sees it, while `JSON.stringify` reaches it through `toJSON`. A `Decided` outcome's obligation attributes come from the policy's `obliged` nodes, which the policy walk already covers)
- **Depends on:** T1, D-09-g
- **Files:** `packages/core/src/SinkCodec.ts`, `packages/core/test/SinkCodec.test.ts`, `packages/http/src/DecisionStreamRoute.ts` (doc comment :104-117 only), `packages/audit/src/AuditEntry.ts` (doc only), `.changeset/sinkcodec-guard-walks-outcome.md` (*new*), `spec/behaviors/33-audit-pipeline.md` (BEH-QD-250 paragraph), `spec/README.md` (CCR row)
- **Steps:**
  1. In `isRecordJsonSafe`'s `Decision` arm (`SinkCodec.ts:264-266`), add `&& isJsonSafe(record.outcome)`. `outcome` is a `Data.TaggedClass`, and `isJsonSafe` already walks own enumerable values. A plain `Error` cause walks as `{}` (still lossy until T7/T8). An HTTP-client error's cycle is detected and the record refused.
  2. In `isJsonSafe`, add an opaque-brand check before treating an object as a container: `Object.prototype.toString.call(value)` ∈ {`[object Map]`, `[object Set]`, `[object WeakMap]`, `[object WeakSet]`, `[object RegExp]`, `[object Promise]`, `[object ArrayBuffer]`, `[object DataView]`} or `ArrayBuffer.isView(value)` → unsafe. `Error` is deliberately excluded (see D-09-g).
  3. Rewrite `isRecordJsonSafe`'s doc (:232-260) and the SSE comment (:104-117). The guard now walks `resource`, `policy` **and** `outcome`, and refuses opaque built-ins. Point at ARCH-09's coming outbound operation as the permanent fix.
  4. Changeset (patch, `@qadi/core`): "A decision record whose resolver error carries a circular or BigInt cause, or whose resource holds a Map, Set, RegExp or binary array, is now refused by `isRecordJsonSafe` instead of crashing the decision stream for every subscriber, or poisoning the audit store and tripping its circuit breaker."
  5. BEH-QD-250: add one sentence. The guard covers the outcome's error `cause` and refuses `Map`/`Set`/`RegExp`/binary data. Add a CCR-QD-NEXT row.
- **Tests:** T1 #1, #2, #3, #4 (refusal variant) and #10 turn green. Add to `SinkCodec.test.ts`:
  - "isRecordJsonSafe is false when a Failed record's cause has a reference cycle"
  - "… true for a plain Error cause"
  - "… false for a BigInt cause"
  - "… true for a Decided record whose obligations' attributes are safe"
- **Verify:** `node_modules/.bin/vitest run packages/core/test/SinkCodec.test.ts packages/http/test/decisionStream.test.ts packages/audit` and `node scripts/check-house-style.mjs`.
- **Done when:** those tests are green, the 159 baseline tests still pass, and the change ships as a patch.

### T3 — Build the outbound operation inside `SinkCodec.ts` (additive)

- **Status:** [x] done (deviated: a cyclic resource's path is `["resource","self","self"]`, not `["resource","self"]` — the walk is over the encoded output and the schema encode copies the resource's top level; an enumerable symbol key is refused as `Unrepresentable{kind:"symbol"}` (C8's case, absent from D-09-c's table); `UnrepresentableKind` is a named exported type)
- **Depends on:** T2, D-09-a, D-09-b, D-09-c
- **Files:** `packages/core/src/Errors.ts`, `packages/core/src/SinkCodec.ts`, `packages/core/test/SinkCodec.test.ts`, `packages/core/test/Errors.tst.ts`, `packages/core/test/Errors.test.ts` (if it enumerates `ERROR_CODES`; grep first), `spec/overview.md` (new rows only; old rows stay until T10)
- **Steps:**
  1. **`Errors.ts`.** Add `SinkRecordTag`, `WirePath`, `OpaqueKind`, `EncodeRefusal` (with its `Data.taggedEnum` constructor), `SinkRecordNotEncodable`, `DecodeRefusal` and `SinkRecordNotDecodable` exactly as in D-09-b. Add both classes to `QadiError` (:376-386) and to `ERROR_CODES` (:395-413) as `ACL0NN`, the next free codes at merge. Doc comments follow the house shape: one-line summary first, then the why (C14 for placement, the INV ids).
  2. **`SinkCodec.ts`, private projection.** Rename `toWire` to a module-private `project` (body unchanged, :277-300). Keep a temporary `export const toWire = project` so callers compile until T10.
  3. **Private `wireHazard(value: unknown, maxDepth: number): EncodeRefusal | undefined`.**
     - It is a single iterative walk over the encoded output. Each stack frame holds `{ value, children: ReadonlyArray<readonly [key: string | number, child: unknown]>, index, depth }`, and one mutable `onPath` set is added to on descent and removed from on backtrack, the same technique as `isJsonSafe` (:200-230).
     - Its depth counting matches `exceedsJsonDepth` (`DecodeDepthGuard.ts`): the root is at depth 0, each child is at +1, and a frame with `depth > maxDepth` is refused.
     - It applies D-09-c(i)'s table. `undefined` is skipped when it is an object property and refused when it is an array element. The opaque `kind` is derived from the brand by a module-scope lookup table (a frozen object literal, not a `switch`). Any unlisted non-`Object`/`Array`/`Date` brand maps to `"OtherBuiltIn"`.
     - The path is reconstructed from the stack only when a hazard is found, so the happy path allocates no path arrays.
  4. **Private `traceDepth(trace)`.** An iterative maximum depth over `children`.
  5. **`encodeSinkRecord(record)`**, in this order:
     1. `Result.try(() => policyDepth(record.policy))` for `Decision` records. A throw becomes `Circular{path:["policy"]}`, and a depth over `MAX_DECODE_DEPTH` becomes `TooDeep{path:["policy"], maxDepth}`.
     2. For `Decided`: `traceDepth(...) > MAX_DECODE_DEPTH` becomes `TooDeep{path:["decided","trace"]}`.
     3. `Result.try(() => encodeWire(project(record)))`, where `encodeWire = Schema.encodeResult(SinkRecordWire)` is hoisted to module scope. A thrown error or a `Failure(SchemaError)` becomes `EncodeFailed{message}`.
     4. `wireHazard(encoded, MAX_DECODE_DEPTH)`. Any hazard becomes a refusal.
     5. Otherwise succeed with the encoded value, typed `SinkRecordJson`.

     Every failure is wrapped as `new SinkRecordNotEncodable({ recordTag: record._tag, evaluationId: record.evaluationId, refusal })`.
  6. **`encodeSinkRecordString(record)`** is `Result.map(encodeSinkRecord(record), (json) => JSON.stringify(json))`. A comment states why this cannot throw: the value is cycle-free, at most 256 levels deep, has no `bigint`, and has no prototype `toJSON` other than `Date`'s.
  7. **`SinkRecordJson`.** Export `export const SinkRecordJson = Schema.toEncoded(SinkRecordWire)` and `export type SinkRecordJson = typeof SinkRecordWire.Encoded`.
  8. **Module doc.** Rewrite it: the one-line summary first, then the two operations, the invariant pair, the normalisations, and the ADR-QD-060 Defect note.
- **Tests (new `describe("encodeSinkRecord")` in `SinkCodec.test.ts`):**
  - **Golden:** for the three `Decided` fixtures at :1065-1130, `encodeSinkRecordString(r)` is byte-equal to the pinned literal.
  - **Defect normalisations pinned:**
    - An `Error` cause becomes `{name, message}`.
    - A cyclic cause is accepted with the cycle dropped.
    - A `BigInt` cause becomes `"10n"`.
    - `NaN` in a cause becomes `null`.
    - The HTTP-client error becomes `{name, message}`.
  - **Refusals, each with its exact path:**
    - A cyclic `resource` gives `Circular` at `["resource","self"]`.
    - `resource.tags` as a `Set` gives `Opaque{kind:"Set"}`.
    - A `HasCustom.params` holding a `BigInt` gives `Unrepresentable{kind:"bigint"}` at `["policy","params",…]`.
    - `NaN` in `resource` gives `NonFinite`.
    - An invalid `Date` gives `NonFinite`.
    - `[1, undefined]` gives `Unrepresentable{kind:"undefined-element"}`.
    - A `URL` gives `Opaque{kind:"CustomToJSON"}`.
    - An `Error` inside `resource` gives `Opaque{kind:"Error"}`.
  - **Accepted:**
    - `{ a: undefined }` arrives with the key absent.
    - A valid `Date` arrives as its ISO string.
    - A shared, non-cyclic child reached twice is accepted.
  - **Depth:**
    - A 5,000-deep policy gives `TooDeep` and no throw.
    - A cyclic policy gives `Circular`.
    - A hand-built 300-deep trace gives `TooDeep`.
    - The probe-4 `allOf`×130 record gives `TooDeep`.
    - The `allOf`×90 record succeeds.
  - **Totality (INV-QD-NEXT-b, fast-check):** over records whose `resource`, `params` and `cause` come from an arbitrary that mixes JSON values with cycles, functions, symbols, BigInts, `NaN`, Maps, Sets, throwing getters and throwing `toString`, `encodeSinkRecord` never throws.
  - **Agreement (fast-check):** for generated JSON values, `wireHazard(v, n)?._tag === "TooDeep"` iff `exceedsJsonDepth(v, n)`.
  - **Errors.tst.ts:** `expect<SinkRecordTag>().type.toBe<SinkRecord["_tag"]>()`.
  - **Code coverage:** `ERROR_CODES` keeps its exhaustiveness test, if `Errors.test.ts` has one.
- **Verify:** `node_modules/.bin/vitest run packages/core/test/SinkCodec.test.ts packages/core/test/Errors.test.ts`, then `pnpm exec tstyche packages/core/test/Errors.tst.ts`, `pnpm circular` and `node scripts/check-house-style.mjs`.
- **Done when:** every new test is green, old exports still work, and madge plus house-style are green.

### T4 — Build the inbound operation inside `SinkCodec.ts` (additive)

- **Status:** [x] done (deviated: the old `decodeRecord`/`decodeRecordWire` kept their own bodies until T10 deleted them, rather than being reimplemented over the new operation — mapping back to `SchemaError` would have needed an extra field on the closed `DecodeRefusal`)
- **Depends on:** T3, D-09-b
- **Files:** `packages/core/src/SinkCodec.ts`, `packages/core/test/SinkCodec.test.ts`
- **Steps:**
  1. Rename `fromWireUnsafe` to a module-private `rebuild` (body unchanged, including the ticket 96/155 fallbacks that ARCH-15 owns). Keep a temporary `export const fromWireUnsafe = rebuild` until T10.
  2. Hoist `const decodeWire = Schema.decodeUnknownResult(SinkRecordWire, UNTRUSTED_DECODE_OPTIONS)`.
  3. Write `decodeSinkRecord(input: unknown)`:
     - `exceedsJsonDepth(input, MAX_DECODE_DEPTH)` gives `TooDeep{maxDepth}`.
     - Otherwise `decodeWire(input)`. A failure gives `Malformed{message: String(issue)}`.
     - Otherwise `rebuild(wire)`.
     - Every failure is wrapped as `new SinkRecordNotDecodable({ refusal })`.

     No `Result.try` here: the depth guard is what makes Schema's recursion safe, and a throw past it would be a real library defect that should stay visible.
  4. Write `decodeSinkRecordString(text: string)`:
     - `Result.try(() => JSON.parse(text))`. A failure gives `NotJson`.
     - Otherwise run `decodeSinkRecord`.
  5. Reimplement the old `decodeRecord` (:494) as `Effect.fromResult(decodeSinkRecord(input))` with its error mapped back to today's types (`TooDeep` → `PolicyDecodeTooDeep`, `Malformed` → the original `SchemaError`; keep the issue on the refusal for that purpose). Callers are untouched until T9. Reimplement `decodeRecordWire` the same way. Both are deleted in T10.
  6. Module doc: add "ARCH-15 seam". The wire's outcome shape, the neither/both fallbacks and any future version handling live behind `decodeSinkRecord`, and no adapter observes them.
- **Tests:**
  - Each reason:
    - `"{"` gives `NotJson`.
    - A 60,000-deep JSON gives `TooDeep{maxDepth:256}` and no throw.
    - `{"_tag":"Nope"}` gives `Malformed`.
    - A typo'd embedded policy field gives `Malformed` (the CCR-QD-139 rule, now through the new interface).
  - Ported: "a Decision record with no subjectId still decodes to the UNKNOWN_SUBJECT sentinel", "a Deny with no reason is refused", "an Allow carrying a reason is refused".
  - Ticket 96/155 pins, ported through `decodeSinkRecordString` with hand-written JSON, so they stay pinned when `rebuild` goes private.
  - **Round-trip property (INV-QD-NEXT-a):** the existing generator at :802-870, extended with the T3 hostile arbitrary. Either `encodeSinkRecordString(r)` fails, or `decodeSinkRecordString(s)` succeeds with a value structurally equal to `r` after applying the named normalisations (cause per `Schema.Defect`, `Date` → ISO string, `undefined` property → absent).
  - **Totality (INV-QD-NEXT-b):** `decodeSinkRecordString` over `fc.string()` and over `fc.jsonValue()` never throws.
- **Verify:** `node_modules/.bin/vitest run packages/core/test/SinkCodec.test.ts packages/core/test/DecisionSinkForwarding.test.ts packages/devtools/test/model/Source.test.ts`
- **Done when:** the new tests are green and the old `decodeRecord` callers are unchanged and green.

### T5 — Measure the outbound cost before switching adapters

- **Status:** [x] done
- **Depends on:** T3 (old and new must coexist, so this runs before T10)
- **Files:** `packages/core/bench/SinkCodec.bench.ts` (*new*)
- **Steps:**
  1. Bench old against new on three records:
     - (a) a one-node `Decided` record;
     - (b) an `allOf`×64 `Decided` record (the default-limit worst case);
     - (c) a `Failed` record with an `Error` cause and a 20-key resource.
  2. The pairs are:
     - "SSE": `isRecordJsonSafe` + `JSON.stringify(toWire(r))` against `encodeSinkRecordString(r)`;
     - "forwarding": `encodeRecordSync(toWire(r))` against `encodeSinkRecord(r)`.
  3. Run `pnpm bench -- packages/core/bench/SinkCodec.bench.ts` 2–3 times on one machine, and record the mean ranges in the ADR's Consequences, as AGENTS.md §5 does for its tables.
  4. After T10, delete the "old" cases so the file only benches the current interface.
- **Tests:** none; this is a bench, not a gate.
- **Verify:** `pnpm bench -- packages/core/bench/SinkCodec.bench.ts`
- **Done when:** numbers are recorded in the ADR draft. If SSE's per-record cost on (b) more than doubles, the ADR names it and states why it is acceptable: the SSE path is off the decision path, because `decisionSinkFeed` publishes synchronously and framing runs on the subscriber's fiber.

### T6 — Forwarding becomes a thin adapter

- **Status:** [x] done
- **Depends on:** T3, D-09-e
- **Files:** `packages/core/src/DecisionSinkForwarding.ts`, `packages/core/test/DecisionSinkForwarding.test.ts`, `examples/nextjs-newsroom/src/server/forwarding.ts` (compile check only)
- **Steps:**
  1. Change `send`'s parameter type to `(encoded: SinkRecordJson) => Effect.Effect<void, unknown>`. This is narrower, but source-compatible for every caller that typed it `unknown`, by parameter contravariance.
  2. Write `record` as `Effect.sync(() => encodeSinkRecord(record))` piped through `Effect.flatMap(Result.match({ onFailure: reportRefusal, onSuccess: (json) => options.send(json).pipe(Effect.catchCause(reportSendFailure)) }))`.
     - `reportRefusal` is an `Effect.fn("qadi.decisionSinkForwarding.refused")`. It calls `onFailure(refusal)` when supplied, and otherwise logs `qadi: a decision record could not be encoded for forwarding` annotated with `qadi.refusal`, `qadi.path` and `evaluationId`.
     - `reportSendFailure` keeps today's body (:81-98).
     - Keep an outer `catchCause` as defence in depth for INV-QD-035, with the reason stated in a comment.
  3. Delete the `encodeRecordSync` comment (:68-75). Rewrite the `send` doc (:27-37) to say that `send` receives a value already verified to round-trip.
- **Tests:**
  - T1 #7 and #8 are green.
  - "hands each record onward, already encoded" (:22) now asserts deep-equality with `encodeSinkRecord(r)`'s success.
  - New: "a refusal is reported through onFailure as a SinkRecordNotEncodable, not a Cause".
  - New: "with no onFailure, a refusal logs its own message, distinct from a send failure", using the logger capture at :112-135.
  - "forward and ingest, end to end" (:273-305) now uses `decodeSinkRecord` on the receiving side.
- **Verify:** `node_modules/.bin/vitest run packages/core/test/DecisionSinkForwarding.test.ts packages/core/test/DecisionSink.test.ts` and `pnpm --filter @qadi/example-nextjs exec tsc --noEmit`
- **Done when:** green, and `grep -n "toWire\|encodeRecordSync" packages/core/src/DecisionSinkForwarding.ts` prints nothing.

### T7 — The SSE route becomes a thin adapter

- **Status:** [x] done (deviated: `decisionFrames`, the route's body stream, is exported so the route path is tested without a live SSE connection; T1 #1/#2 now expect the poisoned record to be framed with its cause normalised, per BEH-QD-200, rather than dropped)
- **Depends on:** T3, D-09-e
- **Files:** `packages/http/src/DecisionStreamRoute.ts`, `packages/http/test/decisionStream.test.ts`
- **Steps:**
  1. Change `frame`'s type to `Filter.Filter<SinkRecord, string, SinkRecordNotEncodable>`, and check the `effect/Filter` failure parameter at implementation time. Its body becomes `Result.map(encodeSinkRecordString(record), (data) => Sse.encoder.write({ _tag: "Event", event: "message", id: undefined, data }))`. The refusal becomes the filter's failure value.
  2. Add `readonly onRefused?: (refusal: SinkRecordNotEncodable) => void` to `DecisionStreamOptions` (:163-173). In `decisionStreamRoute`, replace `Stream.filterMap(stream, frame)` (:301) with `Stream.filterMapEffect(stream, (record) => Result.match(frame(record), { onSuccess: (s) => Effect.succeed(Result.succeed(s)), onFailure: (refusal) => reportRefused(refusal) }))`.
     - `reportRefused` is an `Effect.fn("qadi.http.decisionStream.refused")`. It calls `onRefused`, or logs `qadi/http: a decision record could not be framed` with `qadi.refusal`, `qadi.path` and `evaluationId`, then returns `Result.fail(refusal)`.
  3. Remove the `isRecordJsonSafe`/`toWire` imports (:69-70). Rewrite the frame doc (:104-129): one call, the guard lives in core, a refusal is reported and drops one frame, and the feed never ends because of a record.
- **Tests:**
  - T1 #1, #2 and #6 are green through the real route path as well as `frame`.
  - "frames through the platform's own SSE encoder" (:514-531) now expects `Sse.encoder.write({..., data: Result.getOrThrow(encodeSinkRecordString(record))})`. Use `Result.match` in the test rather than `getOrThrow` if house style forbids it in tests.
  - The two refusal tests (:533-576) keep their assertions, and each also asserts `refusal._tag`.
  - New: "a refused record calls onRefused once and the subscriber still receives the next record".
  - New: "with no onRefused, the refusal is logged with its reason and path".
- **Verify:** `node_modules/.bin/vitest run packages/http/test/decisionStream.test.ts packages/http/test/PermissionRegistry.test.ts` and `pnpm exec tstyche packages/http/test`
- **Done when:** green, and `grep -nE "JSON\.stringify|isRecordJsonSafe|toWire" packages/http/src/DecisionStreamRoute.ts` prints nothing.

### T8 — The audit encoder and a guarded audit reader become thin adapters (breaking for store implementers)

- **Status:** [x] done
- **Depends on:** T3, T4, D-09-d, D-09-e
- **Files:** `packages/audit/src/AuditEntry.ts`, `packages/audit/src/AuditTrailPort.ts` (`AuditWriteError.entry` type follows `AuditEntry`; check only), `packages/audit/test/AuditEntry.test.ts`, `packages/audit/test/AuditDecisionSinkLive.test.ts`, `packages/audit/test/helpers.ts`, `packages/audit/README.md`, `apps/website/src/content/docs/docs/packages/audit/capabilities.md`
- **Steps:**
  1. Set `AuditEntry = Schema.Struct({ record: SinkRecordJson, sequenceNumber: Schema.optional(Schema.Number) })`, with `type AuditEntry = typeof AuditEntry.Type`. That Type is the JSON form, because `SinkRecordJson` is `toEncoded`.
  2. Add `refusal: EncodeRefusal` to `AuditEntryNotEncodable`. Keep `recordTag`, and derive `reason` from a small `Match.tagsExhaustive` renderer over `EncodeRefusal`, for example "resource.tags: a Set has no JSON form".
  3. `encodeAuditEntry` stays `Effect.fn("qadi.audit.encodeAuditEntry")`. Its body becomes:
     ```ts
     yield* Effect.fromResult(encodeSinkRecord(record)).pipe(Effect.mapError(...))
     ```
     followed by `{ record: json, sequenceNumber: undefined }`.
  4. Add `decodeAuditEntry(input: unknown): Result.Result<{ readonly entry: AuditEntry; readonly record: SinkRecord }, SinkRecordNotDecodable>`:
     - `Predicate.hasProperty(input, "record")`, else `Malformed`.
     - `decodeSinkRecord(input.record)`, which is depth-guarded.
     - `Schema.decodeUnknownResult(AuditEntry, UNTRUSTED_DECODE_OPTIONS)(input)`, now safe because depth has been checked, mapping a failure to `Malformed`.
     - Return both.

     It is exported from the barrel.
  5. `AuditDecisionSinkLive.ts` needs no change, because it consumes `encodeAuditEntry` (:131). Re-read it to confirm that `entry.record.evaluationId` (:170, :186, :209) still type-checks.
  6. Update the README and the website capabilities page: "an audit row's `record` is the same JSON the decision stream and forwarding emit; read rows back with `decodeAuditEntry`".
- **Tests:**
  - T1 #4 (now: the five poisoned records are *written* with normalised causes and the breaker never trips), #5, #9 and #10 (`Opaque`).
  - "a real entry round-trips" (:88-…) becomes `JSON.stringify(entry)`, then `decodeAuditEntry(JSON.parse(...))`, then `record` equals the original modulo normalisations.
  - Every existing refusal test also asserts `error.refusal._tag`.
  - New: "an audit row, an SSE frame's data, and forwarding's send value are the same bytes for one record" (success criterion 7). It imports `encodeSinkRecordString` from `@qadi/core` and compares to `JSON.stringify(entry.record)`.
  - `Retention.test.ts`, `SequenceIntegrity.test.ts` and `AuditArchive.test.ts` pass unchanged. If their fixtures build entries with `toWire`, switch those to `encodeAuditEntry`.
- **Verify:** `node_modules/.bin/vitest run packages/audit` and `node scripts/check-website-doc-examples.mjs`
- **Done when:** green, and `grep -nE "toWire|isRecordJsonSafe|SinkRecordWire" packages/audit/src` prints nothing.

### T9 — devtools, the example app, and the stale `renderCause` references

- **Status:** [x] done (deviated: `Dock.tsx` needed no change — it interpolates `reason`, it does not dispatch on it; the done-when grep for `parseJson` still hits `react/Simulator.tsx`'s own, unrelated parser of user-typed JSON)
- **Depends on:** T3, T4, D-09-f
- **Files:** `packages/devtools/src/model/Source.ts`, `packages/devtools/src/model/Capture.ts`, `packages/devtools/test/model/Source.test.ts`, `packages/devtools/test/react/useTimeline.test.tsx`, `examples/nextjs-newsroom/app/api/edge/decide/route.ts`, `examples/nextjs-newsroom/src/server/api.ts`, `examples/nextjs-newsroom/src/client/Dock.tsx`, plus that example's own e2e and test files if they assert `/backlog`'s or the edge route's body (grep first)
- **Steps:**
  1. **`Source.ts`.**
     - `decodeFrame` (:213-226) becomes: `const decoded = decodeSinkRecordString(frame)`. On failure, call `malformed(frame, reasonOf(decoded.failure.refusal), onMalformed)`. `reasonOf` is a module-scope `Match.type<DecodeRefusal>().pipe(Match.tagsExhaustive({ NotJson: () => "not-json", TooDeep: () => "too-deep", Malformed: () => "not-a-record" }))`.
     - On success, call `stampRecord`.
     - Delete `parseJson` and its stale `renderCause` comment (:257-268). Remove the `Result.isFailure(parsed)` branch.
  2. Change `MalformedReason` (:240) to `"not-json" | "too-deep" | "not-a-record"`, and extend its doc (:228-239) with the third reason's fix.
  3. **`Capture.ts:247`.** Replace "The same shape `SinkCodec`'s `renderCause` uses, for the same reason" with self-contained reasoning. The wire side now carries `cause` through `Schema.Defect()` (ADR-QD-060); a capture keeps only a message string, because a replay rebuilds the class from the port.
  4. **Example edge route (:115).** `wire: toWire(…)` becomes `Result.match(encodeSinkRecord(record), { onSuccess: (json) => ({ wire: json }), onFailure: (e) => ({ wireRefused: e.refusal._tag }) })`, spread into the JSON body.
  5. **Example `IngestRoute` (:205-220).** Read `request.text`, then `decodeSinkRecordString(text)`. On failure, answer 400 with a body naming `refusal._tag` (replacing the two separate "not JSON"/"not a decision record" branches).
  6. **Example `BacklogRoute` (:181-187).** Map `ring.snapshot` to `{ records: [{ environment, record: json }], refused: n }` through `encodeSinkRecord`. Comment that there is no in-repo reader.
  7. **`Dock.tsx:73`.** If `onMalformed` dispatches on `reason`, add the `"too-deep"` arm.
- **Tests:**
  - `Source.test.ts`: `frameOf` (:113) uses `encodeSinkRecordString`, falling back to `assert.fail` on refusal. The depth test (:287-318) now expects `"too-deep"` instead of `"not-a-record"`. New: "a frame that is JSON but not a record still reports not-a-record".
  - `useTimeline.test.tsx:21` builds its frame with `encodeSinkRecordString`.
  - The example's own suite, through `pnpm example`.
- **Verify:** `node_modules/.bin/vitest run packages/devtools` and `pnpm example`
- **Done when:** green. `grep -n "parseJson\|renderCause" packages/devtools/src` prints nothing, and `grep -rn "toWire\|decodeRecord\b" examples/nextjs-newsroom/src examples/nextjs-newsroom/app` prints nothing.

### T10 — Shrink `SinkCodec`'s interface and delete the tests the new interface replaces

- **Status:** [x] done (criterion 3's grep hits doc comments only, no code)
- **Depends on:** T5, T6, T7, T8, T9
- **Files:** `packages/core/src/SinkCodec.ts`, `packages/core/test/SinkCodec.test.ts`, doc comments in `packages/core/src/DecodeDepthGuard.ts:10`, `packages/core/src/HydrationMetrics.ts:73`, `packages/core/src/FieldPath.ts:282`, `packages/core/src/DecisionWire.ts:4,12`, `packages/react/src/HydrationEngine.ts:212`, `packages/devtools/test/model/Source.test.ts:275`, `packages/react/test/Hydration.test.ts:491`, `packages/core/bench/SinkCodec.bench.ts`
- **Steps:**
  1. Remove `export` from `EvaluationErrorSchema` and `SinkRecordWire` (const and type). Delete the temporary `toWire` and `fromWireUnsafe` aliases. Delete `isJsonSafe` and `isRecordJsonSafe`, which `wireHazard` replaces, together with T2's changes. Delete `encodeRecord`, `encodeRecordSync`, `decodeRecordWire`, `decodeRecord` and the private `decodeSinkRecordWireUnknown`.
  2. Update every listed doc-comment reference to name `decodeSinkRecord` or `encodeSinkRecord`. Run `grep -rn "decodeRecordWire\|isJsonSafe\|encodeRecordSync\|toWire\|fromWireUnsafe" packages examples apps/website/src spec --include=*.ts --include=*.tsx --include=*.md` and fix every hit except change-history rows. Those rows record what was true and stay as written (AGENTS.md §15).
  3. **Replace, don't layer.** In `SinkCodec.test.ts`:
     - Delete the `isJsonSafe` and `isRecordJsonSafe` describes (:940-1063). Their cases now live as `encodeSinkRecord` refusal tests from T3; check each case has a counterpart before deleting.
     - Delete "encodeRecordSync never throws, and agrees with encodeRecord" (:874-…), which the T3 totality property replaces.
     - Rewrite the remaining `encodeRecord(toWire(r))`/`decodeRecord` round-trips (:113-470) on `encodeSinkRecordString`/`decodeSinkRecordString`.
     - Keep the golden tests on `encodeSinkRecordString`.
  4. Drop the bench's "old" cases (T5 step 4).
- **Tests:** the suite shrinks. Every success criterion's test still exists at the new interface, and the per-file coverage for `SinkCodec.ts` stays ≥ 95%.
- **Verify:** `node_modules/.bin/vitest run packages/core packages/http packages/audit packages/devtools packages/react`, `pnpm typecheck`, `pnpm circular`, `node scripts/check-house-style.mjs`, and the grep in success criterion 2.
- **Done when:** success criteria 1–3 hold.

### T11 — Spec, ADR, invariants, traceability, overview, CCR

- **Status:** [x] done
- **Depends on:** T10
- **Files:** `spec/decisions/NNN-sinkcodec-owns-both-directions.md` (*new*, ADR-QD-NEXT), `spec/decisions/index.yaml`, `spec/decisions/060-…md`, `spec/decisions/056-…md`, `spec/decisions/045-…md`, `spec/decisions/046-…md` (amendment notes and revision bumps), `spec/behaviors/25-inspection.md`, `spec/behaviors/24-decision-sink.md`, `spec/behaviors/26-decision-stream.md`, `spec/behaviors/27-devtools-timeline.md`, `spec/behaviors/33-audit-pipeline.md`, `spec/behaviors/19-hydration.md` (:603, :615 references), `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`, `spec/README.md`, `spec/behaviors/index.yaml` (if it lists ids)
- **Steps:**
  1. **ADR-QD-NEXT, "SinkCodec owns both directions of the record wire".**
     - Context: C2–C9 and C12.
     - Decision: D-09-a…g as decided.
     - Consequences: one wire on every path; the bench numbers from T5; the `undefined`-property loosening; the audit row break; ARCH-15 lands inside.
     - It amends ADR-QD-060 (Defect on every path), ADR-QD-056 (row form, reader), ADR-QD-045 (`send` type, refusal on `onFailure`) and ADR-QD-046 (a refusal is reported, a feed never ends because of one record).
     - Add the ADR to `index.yaml`.
  2. **BEH-QD-199** (`25-inspection.md:471-545`). Replace the ` ```ts ` listing with the four operations and `SinkRecordJson`. Replace "carrying its tag and its stable code" with "carrying its tag; the stable code is derived from `_tag` (ADR-QD-060)". Restate the decode requirement on `decodeSinkRecord`.
  3. **BEH-QD-200.** Rewrite "cause MUST be rendered to a string" as: "`cause` MUST cross through `Schema.Defect()`: an `Error` keeps `name`, `message` and `cause`, and any other value is normalised to JSON. A record MUST NOT be refused because of its cause." Add the outbound requirement: "`encodeSinkRecord` MUST refuse, with the path, any value that would not round-trip (D-09-c's table), MUST refuse anything `decodeSinkRecord` would refuse, and MUST NOT throw." Keep the "neither outcome" requirement, noting that ARCH-15 owns it.
  4. **BEH-QD-187.** Add: "an encode refusal MUST NOT reach `send` and MUST be reported through `onFailure` as a `SinkRecordNotEncodable`".
  5. **New BEH-QD-NEXT in `26-decision-stream.md`.** "One record MUST NOT end the feed for any subscriber; a refused record MUST be reported (`onRefused`, else a log) and MUST drop only its own frame."
  6. **BEH-QD-204.** Add `"too-deep"` as a third reason, with its fix.
  7. **BEH-QD-250.** The guard now covers the whole encoded record. Opaque built-ins are refused, and an `undefined` property is absence. The row's `record` is the encoded wire. Add a new BEH-QD-NEXT for `decodeAuditEntry`, the guarded reader.
  8. **Invariants.**
     - **INV-QD-NEXT-a**, "Whatever the outbound operation emits, the inbound operation accepts, and rebuilds equal to the original up to the named normalisations." Source `SinkCodec.ts`, test: the T4 property.
     - **INV-QD-NEXT-b**, "The record codec is total: neither direction throws, and a refusal affects only its own record." Tests: the T3 and T4 totality properties, T1 #1 and #4.
  9. **`traceability.md`.** Update rows :268-272 and :325, add rows for the new BEH/INV ids and for `Errors.tst.ts`, and add the ADR row.
  10. **`overview.md`.**
      - Core rows :273-281 become `SinkRecordJson` (schema and type), `encodeSinkRecord`/`encodeSinkRecordString`/`decodeSinkRecord`/`decodeSinkRecordString` (codec), and `SinkRecordNotEncodable`/`SinkRecordNotDecodable`/`EncodeRefusal`/`DecodeRefusal`/`OpaqueKind`/`WirePath`/`SinkRecordTag` (errors and types, `Errors.ts`).
      - Delete the removed names.
      - In the http row :491, `frame` now carries `SinkRecordNotEncodable`; add `onRefused` to the `DecisionStreamOptions` row if listed.
      - In the audit rows :597-598, add `decodeAuditEntry`.
      - The devtools row :675 stays and its text names the new reason.
      - Add a Change History entry.
  11. **`spec/README.md`.** Add a CCR-QD-NEXT register row listing every file above.
- **Tests:** none of their own. The gates are the test.
- **Verify:** `pnpm spec:examples`, `pnpm spec:verify:strict`, `pnpm spec:gates`, `pnpm spec:claims` and `node scripts/check-api-surface.mjs`
- **Done when:** all five are green.

### T12 — Changesets

- **Status:** [x] done (`spec:package`, gate 14, deferred to the final integration gate with T13)
- **Depends on:** T2 (patch), T11 (minor)
- **Files:** `.changeset/sinkcodec-guard-walks-outcome.md` (from T2), `.changeset/sinkcodec-one-call-each-way.md` (*new*)
- **Steps:**
  1. Write a minor changeset for `@qadi/core`, `@qadi/http`, `@qadi/audit` and `@qadi/devtools` (the fixed group bumps the rest). It needs a **Breaking** list:
     - **`@qadi/core`:** `toWire`, `fromWireUnsafe`, `isJsonSafe`, `isRecordJsonSafe`, `encodeRecord`, `encodeRecordSync`, `decodeRecordWire`, `decodeRecord`, `EvaluationErrorSchema` and `SinkRecordWire` are removed. Use `encodeSinkRecord`/`encodeSinkRecordString` and `decodeSinkRecord`/`decodeSinkRecordString`. `decisionSinkForwarding`'s `send` receives `SinkRecordJson`, and a refusal reaches `onFailure` as `SinkRecordNotEncodable`. `QadiError` gains two members, `ACL0NN`.
     - **`@qadi/http`:** `frame`'s failure value is now a `SinkRecordNotEncodable`. The new `DecisionStreamOptions.onRefused`.
     - **`@qadi/audit`:** `AuditEntry.record` is now the encoded JSON form. Stores persist `JSON.stringify(entry)` as-is. Readers use `decodeAuditEntry`. `AuditEntryNotEncodable` gains `refusal`.
     - **`@qadi/devtools`:** `MalformedReason` gains `"too-deep"`.
  2. Add a **Wire** note. For the same record, SSE frames and audit rows now carry an `Error` cause as `{name, message}`, where they used to carry `{}`, so they match forwarding byte for byte. `Decided` records are byte-identical to before.
  3. Add a **Fixed** list: C4, C5, C6, C7, C8 and C9, each in one line.
- **Tests:** none.
- **Verify:** `pnpm changeset status` and `node scripts/check-package-install.mjs`
- **Done when:** both changesets are present and `spec:package` (gate 14) is green.

### T13 — Full gate and mutation

- **Status:** [~] deferred to final integration gate
- **Depends on:** T1–T12
- **Files:** none (fix forward in the owning task's files)
- **Steps:**
  1. Run `pnpm check`. Coverage runs with `--testTimeout=60000` if the known `FieldPath.test.ts` timeout recurs (README open item); note it in the PR if so.
  2. Run Stryker per touched package:
     - `pnpm exec stryker run` (core: `SinkCodec.ts`, `Errors.ts`, `DecisionSinkForwarding.ts`);
     - `pnpm exec stryker run stryker.http.mjs`;
     - `pnpm exec stryker run stryker.audit.mjs`;
     - `pnpm exec stryker run stryker.devtools.mjs`.

     For every surviving mutant in `wireHazard`, the depth pre-checks or `reasonOf`, add a killing test, or record it in the CCR with the reason it is equivalent.
  3. Compare scores with success criterion 10.
- **Tests:** whatever Stryker shows is missing.
- **Verify:** `pnpm check`
- **Done when:** `pnpm check` is green, and the four mutation scores meet criterion 10 or the CCR explains any drop.

## 7. Test strategy

- **Survive unchanged:**
  - The golden byte tests for `Decided` records (`SinkCodec.test.ts:1065-1130`) move onto `encodeSinkRecordString`, with the same literals.
  - `DecisionWire.test.ts`.
  - `DecisionSink.test.ts` (INV-QD-035).
  - The rest of `AuditDecisionSinkLive.test.ts`, `CircuitBreaker.test.ts`, `Retention`, `SequenceIntegrity` and `AuditArchive`.
  - `Source.test.ts`'s backlog and merge tests.
- **Move to the new interface:**
  - Every round-trip, "the wire is untrusted", depth, excess-property and literal-coverage test in `SinkCodec.test.ts` (:113-800) is rewritten on `encodeSinkRecordString`/`decodeSinkRecordString`.
  - Every refusal test in `AuditEntry.test.ts` and `decisionStream.test.ts` keeps its scenario and also asserts `refusal._tag`.
  - The ticket 96/155 pins move from `fromWireUnsafe` to hand-written JSON through `decodeSinkRecordString`. ARCH-15 will then change *those* tests, at this interface.
- **Deleted as redundant (replace, don't layer):**
  - The `isJsonSafe` and `isRecordJsonSafe` describes. Each case gets a counterpart as an `encodeSinkRecord` refusal test in T3 first.
  - "encodeRecordSync never throws, and agrees with encodeRecord", which the totality property supersedes.
  - The `frame`-against-`toWire` equivalence assertions.
- **Properties (fast-check):**
  - the round trip (INV-QD-NEXT-a);
  - totality in both directions (INV-QD-NEXT-b);
  - `wireHazard`'s depth agreeing with `exceedsJsonDepth`;
  - the existing generated-policy round trip (:802), extended with hostile `resource`/`params`/`cause` arbitraries.
- **Differential:** one test (T8) asserts that the SSE data line, forwarding's `send` value (stringified) and an audit row's `record` (stringified) are identical for the same record, which is the "same wire" claim in the title.
- **Mutation:** `stryker.config.mjs` covers `SinkCodec.ts`/`Errors.ts`/`DecisionSinkForwarding.ts`. Under `ignoreStatic`, `wireHazard`, the pre-checks and `rebuild` are all per-call code and in scope. The opaque-brand lookup table is static, so its *contents* are pinned by the per-kind refusal tests, not by mutation. The http, audit and devtools configs cover their adapters. The adapters are thin enough that a surviving mutant there usually means a missing reporting test (`onRefused`, log annotations).

## 8. Spec and documentation updates

All of these are in T11 and T12. In summary:

- **New:**
  - ADR-QD-NEXT, which amends ADR-QD-045, ADR-QD-046, ADR-QD-056 and ADR-QD-060;
  - BEH-QD-NEXT (SSE: one record never ends the feed; refusals reported);
  - BEH-QD-NEXT (the `decodeAuditEntry` guarded reader);
  - INV-QD-NEXT-a (the round trip);
  - INV-QD-NEXT-b (totality);
  - CCR-QD-NEXT.
- **Changed:**
  - BEH-QD-199 (interface listing; `code` correction);
  - BEH-QD-200 (cause through Defect; outbound refusal rules);
  - BEH-QD-187 (a refusal goes to `onFailure`, never to `send`);
  - BEH-QD-204 (`"too-deep"`);
  - BEH-QD-250 (whole-record guard; row form);
  - the `19-hydration.md` references;
  - the `traceability.md` rows;
  - the `overview.md` tables (gate 13).
- **Docs:** `packages/audit/README.md` and `apps/website/…/audit/capabilities.md`.
- **Changesets:**
  - T2's patch;
  - the refactor's minor, with Breaking, Wire and Fixed sections.
- **AGENTS.md:** no change. §4's sentence "the class itself is the schema `SinkCodec` encodes/decodes" becomes true on every path, so it needs no edit.

## 9. Risks and rollback

| Risk | How it shows up | Rollback |
| ---- | --------------- | -------- |
| **Wire byte change for `Failed` records on SSE and audit.** `cause` changes from `{}` to `{name, message}`, and a downstream consumer that parsed `{}` breaks. | An external devtools build or log parser reports a type mismatch on `cause`. The in-repo devtools decodes either. | This is intended and named in the changeset. Reverting T7/T8 restores the old bytes. |
| **Audit store implementers read `entry.record.failed` as a class instance** (D-09-d B). | Their store fails to compile, or reads `cause.message` as `undefined`. | The Breaking note in the changeset. Revert T8 alone and keep T2's guard. |
| **SSE per-record cost** rises (Schema encode plus a whole walk, instead of a partial walk). | T5's bench numbers; feed lag under load. | Framing runs on the subscriber fiber, off the decision path. If unacceptable, add a size-bounded fast path (skip the walk for records whose projection has no `unknown` positions) as a measured follow-up, never by dropping the walk. |
| **`undefined`-property loosening** lets `{ deletedAt: undefined }` through where it used to be refused. | A test expecting refusal fails. Behaviour: the key arrives absent. | Named in BEH-QD-250 and INV-QD-NEXT-a. Absence and `undefined` read the same (BEH-QD-200 "Optional fields normalise"). |
| **`Opaque` refusals** start rejecting resources with `Set`/`Map` that used to persist silently as `{}`. | `writesEncodeFailed` rises, and SSE refusal logs appear. | This is the fix: the data was being lost. Callers convert to arrays or objects. Reverting T2 and T3's opaque rule would restore the silent loss and is not recommended. |
| **`TooDeep` at the sender** refuses records from evaluations run with `maxDepth` > ~127 over nested `allOf`/`anyOf`. | Forwarding `onFailure` and SSE refusal logs name `TooDeep` with a path. | Those records were already unreadable by every receiver (C7). The refusal makes the loss visible. Raising `MAX_DECODE_DEPTH` is a separate ADR, because it is tied to the stack bound. |
| **A throw inside `wireHazard` or a pre-check is masked** as `EncodeFailed` by `Result.try`. | A real library bug looks like a refusal. | `EncodeFailed.message` carries the thrown message, and the totality property plus Stryker keep the walker honest. The inbound side deliberately does not wrap, so its defects stay visible. |
| **`QadiError`/`ERROR_CODES` collisions** with parallel plans adding codes (ARCH-15 or others). | A merge conflict on `Errors.ts:395-413`. | Assign `ACL0NN` at merge (README convention). The second plan rebases. |
| **Overlap with the decision-log plan** (review candidate 08: ring, feed and environment), if it is planned in this wave. It edits `devtools/src/model/Source.ts` and `examples/…/server/api.ts`. | Conflicting edits to `decodeFrame` and `/backlog`. | Land ARCH-09 T9 first. The decision-log plan then consumes `decodeSinkRecordString` and needs no parse of its own. |
| **ARCH-15 lands first.** | ARCH-15 must edit `fromWireUnsafe`, `toWire` and four adapters itself. | This is why ARCH-09 lists ARCH-15 in `blocks`. ARCH-09 T4 pins the 96/155 behaviour at the new interface, so ARCH-15's diff is one module plus those tests. |

**Rollback granularity:**
- T2 is a self-contained patch.
- T3 and T4 are additive and can be reverted without touching adapters.
- T6–T9 are each one package's adapter and can be reverted independently while the old exports still exist.
- T10 (removal) is the only step that forces all adapters forward together, so revert T10 first if anything after it misbehaves.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-05 | — | plan written | Claude (planning agent) |
| 2026-10-05 | D-09-a…g | All seven decided at the recommended option: A, (i), (i), (B), (i), (i), (i) | Claude (implementation agent) |
| 2026-10-05 | T1–T2 | `dcf1edd`. Red tests #1–#4, #10 observed failing (SSE subscribers died with the cycle/BigInt TypeError; the JSON-text audit store persisted no healthy row; the Set was accepted); the hotfix walks the resolver `cause` and refuses opaque built-ins. Patch changeset, BEH-QD-250 sentence, CCR-QD-902 | Claude |
| 2026-10-05 | T3 | `3066c82`. `encodeSinkRecord`/`encodeSinkRecordString`, `wireHazard`, pre-checks; `SinkRecordNotEncodable`/`SinkRecordNotDecodable` (`ACL090`/`ACL091`, branch-local) with closed `EncodeRefusal`/`DecodeRefusal`; totality and depth-agreement properties; `Errors.tst.ts` pins `SinkRecordTag` | Claude |
| 2026-10-05 | T4 | `0846f40`. `decodeSinkRecord`/`decodeSinkRecordString`; tickets 96/155 pinned through hand-written JSON; round-trip (INV-QD-902) and totality (INV-QD-903) properties | Claude |
| 2026-10-05 | T5 | `24dd59a`. Bench, 3 runs, per-call minimum: forwarding new/old ≈1.8–1.9× (one node 1.6→3.0 µs, allOf×64 36–37→69–71 µs, Failed+20 keys 1.8→3.0–3.3 µs); SSE ≈2–3.7× (1.0→3.7, 30→89–91, 2.1–2.2→4.2–4.3 µs). SSE on (b) more than doubles — named and justified in ADR-QD-902 (framing is off the decision path). Walk optimised (no entry pairs or brand string for arrays/plain objects): (b) went from 3.4×/4.6× to 1.9×/3× | Claude |
| 2026-10-05 | T6 | `974e4fc`. Forwarding is one `encodeSinkRecord` call; refusals to `onFailure`/own log line; T1 #7/#8 observed failing first, now green | Claude |
| 2026-10-05 | T7 | `a4d69b5`. `frame` over `encodeSinkRecordString`; `onRefused`; `decisionFrames`; T1 #6 observed failing first | Claude |
| 2026-10-05 | T8 | `3d4b64f`. `AuditEntry.record` is `SinkRecordJson`; `decodeAuditEntry`; `AuditEntryNotEncodable.refusal`; T1 #5/#9 observed failing first; the five poisoned records are now written with causes normalised; same-bytes test | Claude |
| 2026-10-05 | T9 | `3777459`. devtools `decodeFrame` one call, `MalformedReason` three values via `reasonOf`; Capture.ts doc; example edge/ingest/backlog routes | Claude |
| 2026-10-05 | T10 | `eb8d3a8`. SinkCodec exports exactly the five names; old describes deleted with counterparts; doc references updated; bench keeps only the current interface | Claude |
| 2026-10-05 | T11 | `2f8d0b6`. ADR-QD-902 (amends 045/046/056/060), BEH-QD-187/199/200/204/250 revised, BEH-QD-904/905, INV-QD-902/903, traceability, overview, CCR-QD-903 (branch-local 9xx numbering — renumber at merge) | Claude |
| 2026-10-05 | T12 | `899465c`. Minor changeset (core, http, audit, devtools) with Breaking/Wire/Fixed | Claude |
| 2026-10-05 | T13 | Deferred to the final integration gate (`pnpm check`, Stryker, `spec:package`, `pnpm example`). Run here instead: typecheck, lint, circular, tstyche, `pnpm test` (all green except `predicate-sql/test/EngineAgreement.test.ts`, whose PGlite `layer` hook times out at 10 s under the machine's load — untouched by this plan), `test:bdd`, `spec:examples`, `spec:verify:strict`, `spec:api`, `spec:gates`, `spec:claims`, `spec:website-examples`, the example's own vitest suite and `tsc --noEmit` | Claude |
