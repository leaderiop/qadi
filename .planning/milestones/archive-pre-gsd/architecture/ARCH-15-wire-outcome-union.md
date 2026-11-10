---
id: ARCH-15
title: Make a decision record's outcome an exclusive union on the wire, so a malformed record is a decode failure, not a fabricated error
strength: Speculative   # from the 2026-10-05 architecture review ("Parked — exclusive outcome union on the wire … needs its own ADR")
status: implemented   # branch arch/deepening-10, 6b21bc9..fd9cffe; T14 deferred to the final integration gate
evidence_verified_at: e0ee958
depends_on: [ARCH-09]    # lands inside ARCH-09's single inbound/outbound operations; §6 "Fallback without ARCH-09" covers the other path
blocks: []
adrs_touched:
  - ADR-QD-NEXT (new, T3: the sink wire is versioned, its outcome is exclusive, its envelope tolerates unknown keys)
  - ADR-QD-002 (amend: its last paragraph defers "a future version discriminator on the envelope … would need its own ADR" — ADR-QD-NEXT is that ADR for the sink wire; Policy decoding itself is unchanged and stays strict)
  - ADR-QD-060 (amend: records that dropping `code` from the error wire in 0.5.0 was an unversioned break, and the v1 reader's tolerance of it, D-15-g)
  - ADR-QD-056 (amend: `AuditEntry`'s persisted form is a closed union of wire versions; `decodeAuditEntry` is the sanctioned re-parse path)
  - ADR-QD-044, ADR-QD-045, ADR-QD-046 (read: the sink, its topologies, the SSE feed — every topology carries the versioned record; no amendment)
  - ADR-QD-078 (read: the hydration payload's `version` convention, reused verbatim; retention differs, D-15-d)
  - ADR-QD-028 (read: hydration; the payload does not embed `SinkRecordWire`, so untouched)
  - ADR-QD-008 / INV-QD-010 (read: every error has an injective stable code — `UnsupportedWireVersion` gets one)
  - ADR-QD-003 (read: `_tag` is the one discriminant — the outcome union uses `_tag`)
  - ADR-QD-012 (read: nothing here reads a clock)
  - ADR-QD-037 (read: madge circular-import gate — new error lives in `Errors.ts`)
  - ADR-QD-051 (read: span naming for the new `Effect.fn`s)
  - ADR-QD-025 (read: mutation gates 16, 17, 20, 21)
packages: [core, audit, http, devtools, examples/nextjs-newsroom, features]
estimate: L   # Phase A (T0–T11, T14) ≈ 5 engineer-days; Phase B (T12) ≈ ½ day one minor later; Phase C (T13) ≈ ½ day one minor after that
---

# ARCH-15 — Make a decision record's outcome an exclusive union on the wire, so a malformed record is a decode failure, not a fabricated error

> **Reconciled with ARCH-09 (orchestrator, 2026-10-05).** This plan was written before ARCH-09 was on disk.
> Where this plan and ARCH-09 disagree, ARCH-09's choices win. Read the rest of this plan through these mappings:
> - **Operation names.** "ARCH-09's outbound operation" means `encodeSinkRecord` / `encodeSinkRecordString` (D-09-a).
>   "ARCH-09's inbound operation" means `decodeSinkRecord` / `decodeSinkRecordString`. All four are pure and return `Result`.
>   The fallback name `encodeRecordForWire` is used only on the §6 fallback path.
> - **Error surface (D-15-e).** If ARCH-09 is taken, there is no separate `UnsupportedWireVersion` class. It becomes a variant
>   `UnsupportedVersion: { readonly version: unknown }` of ARCH-09's closed `DecodeRefusal` union, inside
>   `SinkRecordNotDecodable` (D-09-b), added as a full-union edit. A malformed outcome maps to `DecodeRefusal.Malformed`.
>   The standalone error class with its own ACL code is the §6 fallback only.
> - **Devtools `MalformedReason` (D-15-f).** ARCH-09 D-09-f already moves it to `"not-json" | "too-deep" | "not-a-record"`.
>   This plan's end state is therefore the full closed union `"not-json" | "too-deep" | "not-a-record" | "unsupported-version"`,
>   mapped by ARCH-09's module-scope `reasonOf` `Match.tagsExhaustive` over `DecodeRefusal`.
> - **`decodeAuditEntry` (D-15-h).** ARCH-09 T-task D-09-d creates it with the shape
>   `(input: unknown) => Result<{ entry; record }, SinkRecordNotDecodable>`. This plan keeps that shape, and does not
>   introduce an `Effect.fn` variant. It only widens `AuditEntry.record`'s encoded type to the closed v1 | v2 union.
> - **SSE frames.** ARCH-11 D-11-e wraps each frame as `{ environment, record }`. The `version` key lives inside `record`,
>   never on the frame envelope. Decode order: frame envelope (ARCH-11), then `decodeSinkRecord` on `record` (ARCH-09 + this plan).
> - **ACL codes.** ARCH-03 took `ACL018`. ARCH-09 and this plan number theirs at merge, in landing order.

## 1. Verified evidence (at `e0ee958`)

Everything below was re-read on branch `arch/integration` in worktree
`W=.claude/worktrees/agent-adb672833eb753a12` at `e0ee958`. The installed
`effect` is `4.0.0` (`node_modules/.pnpm/effect@4.0.0`).

**How the claims were settled.** Throwaway scripts live in the session
scratchpad, `…/scratchpad/arch15/`:

- `probe1.mts` drives today's `decodeRecord`, `AuditEntry`, `frame` and
  `encodeAuditEntry` with hand-edited wire records.
- `Proto.mts` prototypes the v2 shape. `tsc -p tsconfig.check.json --noEmit`
  over it (extends the worktree's `tsconfig.base.json`) exits 0.
- `probe2.mts` runs the v2 decode matrix.
- `Proto2.mts` and `probe9.mts` prototype a v1 codec at the Schema level.

They run as
`cd $W/packages/core && NODE_OPTIONS="--conditions=bun" …/node_modules/.bin/tsx <probe>.mts`.

**Probe caveat.** A scratch file named `.ts` loaded through tsx's CJS path and
got a second copy of every `@qadi/core` module, so schema identity checks
failed (`P.DecisionWireV1.fields.policy === core.Policy` was `false`). The
cause is in the probe, not the library. Renaming the file to `.mts` fixed it
(`true`). Every probe result below comes from the single-instance runs.

Every scenario below becomes a real test in §6 (T0, T1, T2, T5–T9). Nothing
depends on the scratch files.

### C1. The Decision variant carries two optional outcome fields, not a union — **CONFIRMED**

The Decision member is `packages/core/src/SinkCodec.ts:97-118`, inside
`SinkRecordWire` (`:96-126`). It declares `decided: Schema.optional(DecisionWire)`
(`:116`) and `failed: Schema.optional(EvaluationErrorSchema)` (`:117`).
`SinkRecordWire.Type` therefore admits four states: decided only, failed only,
both, and neither. Only the first two are meaningful.

`toWire` (`:277-300`) writes exactly one of the two (`:295-297`), so anything
this module encodes is well formed. The in-memory model is already exclusive:
`DecisionOutcome = Decided | Failed` (`DecisionRecord.ts:55`), held by
`DecisionRecord.outcome` (`:111`).

### C2. Ticket 155: a record naming both outcomes silently prefers `decided` — **CONFIRMED**

`fromWireUnsafe` (`SinkCodec.ts:347-390`) tests `wire.decided !== undefined`
first (`:377-378`). Its own comment (`:371-376`) calls this "an artifact of
check order, not a decision".

Probe P1 takes a valid v1 `Decided` record, adds a `failed` field, and gets
`decoded: outcome=Decided Allow`. The current behaviour is pinned as correct by
`SinkCodec.test.ts:645`, which reads "a record naming BOTH outcomes silently
prefers `decided` (ticket 155: pins current behavior)".

### C3. Ticket 96: a record naming neither outcome fabricates `MissingResource`/`ACL004` — **CONFIRMED** (one detail **CHANGED**)

The code is at `SinkCodec.ts:381-387`. Probe P2 strips `decided` and gets
`outcome=Failed MissingResource("<malformed record: no outcome>")`. Bucketed by
code, that is indistinguishable from a resolver-wiring failure. The conflation
note (`:327-345`) names the problem and defers it because `EvaluationError` is
a closed union with an `ERROR_CODES` entry and an `@qadi/http` arm per member.

The behaviour is pinned by `SinkCodec.test.ts:614`.

**CHANGED detail that matters:** this is not only code, it is a normative
requirement. `spec/behaviors/25-inspection.md` under BEH-QD-200 (`:547` onward)
reads: "REQUIREMENT: A decision record naming neither outcome MUST decode to a
`Failed` that says so." Reversing it is a spec change with a CCR (AGENTS.md
§11), not just a code fix. T1 carries that change.

The ARCH-09 review's suggestion of a dedicated `MalformedWireRecord` member of
`EvaluationError` is **not** needed. Once the outcome is exclusive, a malformed
outcome is a `Schema.SchemaError` like any other malformed input. No fake
evaluation error has to exist, so the closed `EvaluationError` union and
`@qadi/http`'s exhaustive `Match` are untouched.

### C4. GH-01: a newer sender's extra envelope field makes an older receiver reject the whole record — **CONFIRMED**, and it has **already happened once**

The doc comment at `SinkCodec.ts:418-442` names the gap. The cause is
`decodeSinkRecordWireUnknown = Schema.decodeUnknownEffect(SinkRecordWire, UNTRUSTED_DECODE_OPTIONS)`
(`:443`). It applies `onExcessProperty: "error"` to the whole envelope, not
only to the embedded `Policy`.

Probe P3 adds `traceparent: "00-abc"` at the top level and gets
`DECODE FAIL: Expected no excess property at ["traceparent"]`.

**New finding: the same strictness already broke one real version boundary.**
ADR-QD-060 shipped in `@qadi/core` 0.5.0 (`packages/core/CHANGELOG.md:79`, under
`## 0.5.0`). It deleted the error wire's `code` field (`SinkCodec.ts:61-66`).
`@qadi/audit` has existed since 0.3.0 (`packages/audit/CHANGELOG.md:144`), so a
`Failed` row persisted by 0.3.x or 0.4.x carries `failed.code`.

Probe P5 adds `failed.code: "ACL004"` to a valid record and gets
`DECODE FAIL: Expected no excess property at ["failed"]["code"]`. Today's
`decodeRecord` cannot read a pre-0.5 audit row, and nothing records that. D-15-g
decides whether the v1 reader tolerates it.

### C5. `subjectId` absent falls back to `UNKNOWN_SUBJECT` (PH-03) — **CONFIRMED**

The sentinel is `SinkCodec.ts:80-93`, the field is optional at `:111`, and the
fallback is `:365`. Probe P4 removes `subjectId` and gets
`subjectId="<unknown subject: wire version skew>"`.

This is the one place the module already tolerates version skew, and only in the
backward direction: an older sender omitting a field. C4 is the forward
direction, and it is not tolerated.

### C6. `DecisionWire` is already a tagged `Allow | Deny` union, and ARCH-05's versioning convention exists in code — **CONFIRMED**

`DecisionWire.ts:38-65` defines `DecisionWireAllow`, `DecisionWireDeny`, and
their `Schema.Union`. ARCH-05 D-05-e is implemented.

ARCH-05 D-05-c is implemented in `packages/react/src/HydrationEngine.ts`:

- `PAYLOAD_VERSION = 2` and `version: Schema.Literal(PAYLOAD_VERSION)` (`:120-126`).
- An absent `version` means the legacy v1 reader (`:422-430`, `Object.hasOwn(payload, "version")`).
- Any other value drops as `UnsupportedPayloadVersion` (`:426-427`).
- The v1 types are `@deprecated` and "Removed in the next minor release" (`:165-182`).

ARCH-15 reuses this convention exactly: a `version` key, absent meaning v1,
unknown meaning a named failure. It differs only in retention (D-15-d).

**REFUTED (brief's "react hydration if it embeds records"):** the hydration
payload does not embed `SinkRecordWire`. Its entries derive from
`DecisionWireAllow`/`DecisionWireDeny` (`HydrationEngine.ts:95-115`), and
ARCH-15 does not change `DecisionWire`. `@qadi/react` has no task in this plan.

### C7. Consumers at `e0ee958` — **CONFIRMED** by `grep -rnE 'SinkRecordWire|decodeRecordWire|decodeRecord\b|fromWireUnsafe|encodeRecordSync|encodeRecord\b|\btoWire\b|EvaluationErrorSchema' packages examples features` (excluding `lib/`, CHANGELOGs)

| Consumer | Direction | Site | What it does today |
| -------- | --------- | ---- | ------------------ |
| `core/src/DecisionSinkForwarding.ts` | out | `:76` | `Effect.sync(() => encodeRecordSync(toWire(record)))` → `send(encoded: unknown)` (`:32`) |
| `http/src/DecisionStreamRoute.ts` (`frame`) | out | `:130-141` | `isRecordJsonSafe` guard, then `JSON.stringify(toWire(record))` (`:137`), with **no** Schema encode |
| `audit/src/AuditEntry.ts` | out, and persisted | `:55-58`, `:79-93` | `AuditEntry = Struct({ record: SinkRecordWire, sequenceNumber? })`. `encodeAuditEntry` returns `{ record: toWire(record) }` (`:91`), which the caller's store serializes. |
| `audit/src/Retention.ts`, `SequenceIntegrity.ts`, `AuditArchive.ts` | read persisted | `Retention.ts:18` (`entry.record.at`); `AuditArchive.ts` (`ARCHIVE_VERSION = "1"`) | Read envelope fields only (`at`, `sequenceNumber`). None reads the outcome. |
| `devtools/src/model/Source.ts` (`decodeFrame`) | in | `:213-226` | `decodeRecord`; any failure → `MalformedReason "not-a-record"` (`:222-223`, closed union at `:240`) |
| `examples/nextjs-newsroom/src/server/api.ts` (`IngestRoute`) | in | `:196-226` | `decodeRecord`; failure → `400 "not a decision record"` (`:215-218`) |
| `examples/nextjs-newsroom/app/api/edge/decide/route.ts` | out (demo JSON body) | `:115` | `wire: toWire(new DecisionRecord(…))` inside `Response.json` |
| `features/` BDD | — | — | **None.** No feature exercises the sink wire. `spec/traceability.md` §5 has no row for BEH-QD-199/200. |
| `devtools/src/model/Capture.ts` | — | — | In-process only; never touches the wire (the brief listed it, and it is not a consumer). |
| Tests | both | `core/test/SinkCodec.test.ts` (golden `:1065-1130`, untrusted `:487-680`, properties `:802-938`); `core/test/DecisionSinkForwarding.test.ts:292`; `devtools/test/model/Source.test.ts:113,273`; `devtools/test/react/useTimeline.test.tsx:21`; `http/test/decisionStream.test.ts:528,549`; `audit/test/AuditEntry.test.ts:17-24,127-150` | |

`fromWireUnsafe` has no production caller outside `SinkCodec.ts`. Only
`SinkCodec.test.ts:624,657,863` call it.

### C8. A malformed outcome surfacing as a decode failure is covered by devtools' existing reason — **CONFIRMED**

`decodeFrame` maps **every** `decodeRecord` failure to `"not-a-record"`
(`Source.ts:222-223`). The doc comment (`:229-238`) already describes that
reason as "a protocol mismatch, usually a `@qadi/core` on the far side that does
not agree with this one about the wire form".

An unsupported **version** is a different fix: upgrade the panel. D-15-f
decides whether it gets its own reason.

### C9. `Schema` `ParseOptions` cannot be scoped to one nested position — **CONFIRMED**; one Schema-native workaround exists, and it has a cost

The struct parser reads `options.onExcessProperty` from the call's options
(`effect/src/SchemaAST.ts:2920`, the fast-path guard at `:3038`). No
per-schema `parseOptions` annotation exists: `grep parseOptions` in
`Schema.ts`, `SchemaAST.ts` and `SchemaParser.ts` finds only call-level
plumbing. The `SinkCodec.ts:431-441` comment is accurate.

`StructWithRest` with an index signature makes unknown keys "covered", so they
are not excess (`SchemaAST.ts:2926-2934`). But it adds
`{ readonly [k: string]: unknown }` to `SinkRecordWire.Type`. That is a widened
type leaking to every consumer (user memory: no `Record<string, unknown>` as a
widened type). D-15-c compares the options.

### C10. New defect: `AuditEntry`, the documented re-parse schema, admits malformed outcomes and silently strips a typo inside the embedded `Policy` — **CONFIRMED**

ADR-QD-056 (`:89-101`) and `AuditEntry.ts:1-21` say an `AuditEntry` "is durably
persisted … and re-parsed later, possibly by a different process". `@qadi/audit`
exports the schema but **no decode function**. The one re-parse in the
repository is `Schema.decodeUnknownEffect(AuditEntry)(…)` with default options
(`AuditEntry.test.ts:131,146`).

Probe P6, with `Schema.decodeUnknownEffect(AuditEntry)`, default options:

| Row | Result |
| --- | ------ |
| P6a: record with neither `decided` nor `failed` | **OK**, keys `_tag,evaluationId,at,subjectId,policy` |
| P6b: both | **OK** |
| P6c: unknown envelope key | OK (stripped) |
| P6d: pre-0.5 `failed.code` | OK (stripped) |
| P6e: `policy: {…, "permision": "x"}` | **OK**, and the decoded policy has the typo silently removed |
| P6f: unknown policy tag | FAIL |

P6e is exactly the silent-drop defect ADR-QD-002 exists to prevent, and
BEH-QD-199's second REQUIREMENT forbids it for `decodeRecord`. P6a combined with
`fromWireUnsafe` reproduces ticket 96 on the audit path.

The rolling-deploy consequence matters for the versioning decision. A reader
at ≤ 0.9 that decodes a **v2** row with `AuditEntry` gets a record with no
outcome **silently**, because default options strip `version`/`outcome` as
excess. So audit writers must not flip to v2 until readers have upgraded
(D-15-b, D-15-h). T2 fixes the strict-decode gap on its own.

### C11. The SSE and audit outbound paths stringify the wire **Type**, without Schema encode — **CONFIRMED** (ARCH-09's territory)

`DecisionStreamRoute.ts:137` and `AuditEntry.ts:91` serialize `toWire(record)`
directly. Only `DecisionSinkForwarding.ts:76` runs `encodeRecordSync`. So
"what is on the wire" is today a property of whichever caller serializes, not
of the codec.

ARCH-15 needs the bytes to be chosen by a version-aware encoder. ARCH-09's
single outbound operation is that encoder (§4, §6 sequencing). Without ARCH-09,
T6 has to touch all three callers.

### C12. New spec drift: BEH-QD-199 still requires a wire-embedded error `code` — **CONFIRMED stale**

`25-inspection.md` BEH-QD-199 reads: "REQUIREMENT: An `EvaluationError` MUST
cross carrying its tag and its stable code". ADR-QD-060 deleted `code`
(`SinkCodec.ts:61-66`). Probe P0's `Failed` wire is
`"failed":{"_tag":"MissingResource","attribute":"owner"}`, with no `code`.

The prose below that requirement half-acknowledges this ("the `code` a sender
writes is for logging … discarded"), but the REQUIREMENT line was never
corrected. T10 fixes it.

### C13. The target shape works in `effect@4.0.0` and type-checks without `as` — **CONFIRMED by prototype**

`Proto.mts` (tsc clean) defines:

- `OutcomeWire = Schema.Union([TaggedStruct("Decided", { decision: DecisionWire }), TaggedStruct("Failed", { error: EvaluationErrorSchema })])`;
- a v2 Decision struct with `version: Schema.Literal(2)` and `outcome: OutcomeWire`;
- a projection onto the schema's own declared keys (`Object.keys(Struct.fields)`), so the envelope ignores unknown keys;
- a strict decode with `UNTRUSTED_DECODE_OPTIONS`;
- a dispatch on `Object.hasOwn(input, "version")`.

`probe2.mts` results:

| Input | Result |
| ----- | ------ |
| v1 decided / failed | OK |
| v1 both / neither | FAIL `MalformedRecordOutcome` (prototype class; D-15-e prefers a `SchemaError`, see below) |
| v1 or v2 + unknown envelope key | **OK** |
| v1 or v2 + policy typo | FAIL `["policy"]["permision"]` |
| v2 + `outcome.decision.ttl` | FAIL `["outcome"]["decision"]["ttl"]` |
| v2 outcome missing | FAIL `Missing key ["outcome"]` |
| v2 `{_tag:"Decided"}` with no decision | FAIL `["outcome"]["decision"]` |
| v2 `Failed` carrying a stray `decision` | FAIL excess `["outcome"]["decision"]` |
| v2 + a legacy `decided` key | OK (legacy key ignored as an unknown envelope key) |
| `version: 3`, or `version: "2"` | FAIL `UnsupportedWireVersion` |
| `5` | FAIL `Expected object` |

Encoding the v2 Type through `Schema.encodeSync` gives `…"version":2,…,"outcome":{"_tag":"Failed","error":{…}}`.

`Proto2.mts` (tsc clean) goes one step further and expresses v1 as a **Schema
codec whose Type is the v2 Type**. It is
`V1Bytes.pipe(Schema.decodeTo(Schema.toType(DecisionV2), SchemaTransformation.transformEffect({ decode, encode })))`.
Its decode fails with `new SchemaIssue.InvalidValue({ message }, v1)` when the
v1 bytes name both outcomes or neither.

`probe9.mts` results:

- v1 bytes decode to the v2 Type.
- "neither" fails `a decision record names no outcome` and "both" fails `… both outcomes`, both as **`SchemaError`**.
- The v1 policy typo still fails.
- `Schema.Union([DecisionV2, DecisionV1])` reads both byte formats.
- The same Type encodes to v1 bytes through `DecisionV1` and to v2 bytes through `DecisionV2`.

So the v1 writer for Phase A (D-15-b) is just `Schema.encode` with the v1 codec,
not a second projection to keep in sync. APIs used:
`SchemaTransformation.transformEffect` (`SchemaTransformation.ts:437`),
`Schema.decodeTo` (`Schema.ts:5465`), `Schema.toType` (`Schema.ts:2500`), and
`SchemaIssue.InvalidValue` (`SchemaIssue.ts:747`).

### C14. v1 byte identity depends on schema field order — **CONFIRMED** (constraint for T5)

In probe9, the prototype's v1 codec listed `policy` before `subjectId`, and the
re-encoded v1 bytes came out
`{"_tag","evaluationId","at","policy",…,"subjectId","failed"}`. The goldens at
`SinkCodec.test.ts:1094,1111,1129` pin
`_tag, evaluationId, at, subjectId, policy, …, decided`.

The v1 codec must declare its fields in today's order, `SinkCodec.ts:98-117`.
T0's goldens catch any drift.

### C15. Baseline test run — **CONFIRMED green, with the known tooling caveat**

`cd $W && ./node_modules/.bin/vitest run packages/core/test/SinkCodec.test.ts packages/core/test/DecisionWire.test.ts packages/core/test/DecisionSinkForwarding.test.ts packages/devtools/test/model/Source.test.ts packages/audit/test/AuditEntry.test.ts packages/http/test/decisionStream.test.ts`
passes 6 files and 136 tests.

**Caveat:** the parent checkout's `/Users/…/qadi/node_modules/.bin/vitest`
fails in all four files tried with
`TypeError: Cannot read properties of undefined (reading 'config')`. The cause
is two vitest instances, the same thing ARCH-07 C9 found. Use the worktree's
own `./node_modules/.bin/vitest` or `pnpm exec vitest` from the repo root, as
every Verify line below does.

### C16. ARCH-09's interface is not yet on disk — **UNVERIFIED** (assumption stated)

`ARCH-09` is being planned in parallel, and no file exists in
`.planning/architecture/` yet. Per the review notes
(`…/scratchpad/review.txt:50-87`), it gives `SinkCodec` one outbound operation
(`record → encoded JSON value | refusal`) and one inbound operation
(`text/unknown → record | reason`). It also moves `toWire`, `isJsonSafe` and
`encodeRecordSync` out of the interface, and makes all three senders and
devtools thin adapters.

This plan assumes those two operations exist and lands its changes **inside**
them. If ARCH-09 names them differently, substitute the names. Every task gives
the fallback for ARCH-09 not taken (§6 "Fallback without ARCH-09").

## 2. Goal and success criteria

**Goal.** Deepen `SinkCodec`'s inbound and outbound operations. The wire
representation of a decision record's outcome becomes the same closed
`Decided | Failed` union the in-memory `DecisionRecord.outcome` already is. The
wire contract also gains an explicit version, so it can change without breaking
a mixed fleet.

Today the module's interface lets four outcome states through where two are
meaningful. It turns the two meaningless ones into a silently chosen decision
(both) or a fabricated resolver error (neither). It also rejects any envelope
key it does not know, which turns every additive change into a rolling-deploy
outage (GH-01).

After the change:

- **v2 bytes.** The outcome is
  `outcome: { _tag: "Decided", decision } | { _tag: "Failed", error }` under
  `version: 2`.
- **Version dispatch.** One inbound operation reads v1 (no `version` key)
  forever and v2 strictly. It refuses any other version as
  `UnsupportedWireVersion`.
- **Lenient envelope, strict content.** Unknown top-level envelope keys are
  ignored. Everything nested (`Policy`, `Trace`, the outcome) stays strict, per
  ADR-QD-002.
- **Malformed means failed.** A malformed outcome in either version is a
  `Schema.SchemaError`, never a record.
- **One versioned writer.** A single outbound operation writes the version the
  rollout phase selects (D-15-b, D-15-j).

`@qadi/audit` re-parses persisted rows through the same inbound operation
(`decodeAuditEntry`). That closes C10.

**Depth and leverage.** Every consumer stops caring about wire versions: devtools
`Source`, the example aggregator, audit readers, and any future reader. "Which
outcome did the sender mean" becomes a property of the type, not of the reader's
check order. The `fromWireUnsafe` fallback arm and the `UNKNOWN_SUBJECT` path
move entirely into the v1 reader, so the v2 rebuild is one exhaustive `Match`
with no defensive arms.

**Locality.** The version policy lives in one module, `SinkCodec.ts`, and one
ADR. It is not split across the hydration engine, an audit doc comment and
GH-01's comment.

**Success criteria** (each checkable):

1. **No "neither" fabrication.**
   `grep -n '<malformed record: no outcome>' packages/core/src/SinkCodec.ts` prints
   nothing. A v1 or v2 record with neither outcome fails `decodeRecord` with a
   `SchemaError` (T1, T5 tests in `SinkCodec.test.ts`).
2. **No silent "both" preference.** A v1 record naming both outcomes fails
   `decodeRecord`. A v2 `outcome` naming both is structurally impossible: excess
   key → `SchemaError` (T1, T5).
3. **GH-01 closed.** A record of either version with an extra top-level key
   decodes. A record with an extra key inside `policy`, `outcome` or `decided`
   still fails (T4, T5).
4. **Version dispatch.**
   - A record with `version: 3`, or a non-numeric `version`, fails with
     `UnsupportedWireVersion`.
   - Devtools reports it as `"unsupported-version"` if D-15-f(i) is chosen.
   - The example aggregator answers `400` with a distinct body (T5, T8).
5. **v1 is read forever.** The v1 goldens (`SinkCodec.test.ts:1065-1130`, plus
   T0's new `Failed`/`Obligations` goldens) decode to records equal to the
   originals under the final code. A pre-0.5 row with `failed.code` decodes if
   D-15-g(i) is chosen (T0, T5).
6. **One record, two byte formats, same meaning.** A property test over
   generated records holds:
   `decode(encode(r, {version: 1}))` equals `decode(encode(r, {version: 2}))`,
   and both equal `r` (T5).
7. **Audit re-parse is strict and versioned.** `decodeAuditEntry` refuses
   P6a/P6b/P6e and reads v1 and v2 rows (T2, T7).
8. **Gates.**
   - `node scripts/check-house-style.mjs` passes with `SCHEMA_ERROR_BUDGET`
     (`packages/core/src/Errors.ts: 12`, `scripts/check-house-style.mjs:439-441`),
     `UNTRACED_BUDGET`, `SWITCH_BUDGET`, `ANY_BUDGET` and `HAS_CUSTOM_BUDGET`
     unchanged.
   - `madge --circular` (gate 5) passes.
   - `node scripts/check-api-surface.mjs` (gate 13) passes, with every new or
     removed export reflected in `spec/overview.md`.
9. **Mutation.** `pnpm exec stryker run` (core, gate 16),
   `stryker run stryker.audit.mjs` (gate 20), `stryker.devtools.mjs` (gate 17)
   and `stryker.http.mjs` (gate 21) each stay ≥ 80% (break threshold), and none
   drops below the scores recorded at integration (`README.md`: core 93.32,
   devtools 96.96, audit 86.92, http 97.97) unless the CCR explains it.
10. `pnpm check` is green end to end (T14).

## 3. Non-goals

- **The outbound/inbound consolidation itself.** That covers guard, projection
  and Schema encode in one operation, plus removing `toWire`, `isJsonSafe` and
  `encodeRecordSync` from the interface. That is ARCH-09. This plan edits inside
  those operations and does not re-plan them.
- **A dedicated `MalformedWireRecord` member of `EvaluationError`.** C3 shows it
  is unnecessary once the outcome is exclusive: a malformed record is not an
  evaluation, so it does not need an evaluation error.
- **Changing `DecisionWire`, `TraceSchema`, `Obligation` or the `Policy`
  schema.** Their content stays strict exactly as today. ADR-QD-002's "readers
  upgrade before writers" for policy shapes is unchanged.
- **Hydration payloads.** `@qadi/react` does not embed `SinkRecordWire` (C6).
- **Cryptographic integrity or gap markers for audit rows.** ADR-QD-056's
  Negative consequences (`:249-262`) need their own grilling session. Adding
  `version` to a row is not a hash chain.
- **Transport-level negotiation**, such as an SSE `event:` name or an HTTP
  header. BEH-QD-199 says the wire shape "lives beside the record it describes
  rather than inside whichever transport carries it first". Audit rows have no
  transport at all. D-15-b rejects this.
- **Converting `decodeRecord`/`decodeRecordWire` from arrows to `Effect.fn`.**
  This is an existing AGENTS.md §5 deviation. If ARCH-09's inbound operation is
  an `Effect.fn`, this plan inherits that. Otherwise it is left as is. New
  functions this plan adds (`decodeAuditEntry`) are `Effect.fn`.
- **Fixing the root-checkout vitest double-instance problem** (C15).

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1 (submodule imports, `.ts` extensions, `import type`) | New imports are `import * as SchemaIssue from "effect/SchemaIssue"`, `import * as SchemaTransformation from "effect/SchemaTransformation"` and `import * as Predicate from "effect/Predicate"`. Cross-package code uses named imports from `@qadi/core`. |
| AGENTS.md §4 (`Data.TaggedError` default; `SCHEMA_ERROR_BUDGET`; array-form `catchTag`) | `UnsupportedWireVersion` is a `Data.TaggedError`. It crosses no codec: a receiver raises it about bytes it received, and nothing serializes it. So `SCHEMA_ERROR_BUDGET` stays at 12. Malformed outcomes are `Schema.SchemaError`, not a new class. Devtools and the example dispatch with `Effect.catchTag(["UnsupportedWireVersion"], …)` or `Match`, never object-form `catchTags`. |
| ADR-QD-008 / INV-QD-010 (every error has an injective stable code) | `UnsupportedWireVersion` joins `QadiError` (`Errors.ts:376-386`) and `ERROR_CODES` (`:395-414`) with a fresh code `ACL0NN`, assigned at landing. ARCH-03 took `ACL018`. The `satisfies Record<QadiError["_tag"], …>` at `:414` makes forgetting it a compile error. `Tokens.test.ts:272`'s injectivity test covers it automatically. It is **not** an `EvaluationError` or `EnforcementError`, so `@qadi/http`'s `ENFORCEMENT_ERROR_WIRE` table is untouched. |
| ADR-QD-037 (madge counts `import type`) | `UnsupportedWireVersion` is declared in `Errors.ts`, which does not import `SinkCodec.ts`. `SinkCodec.ts` already imports `Errors.ts` values (`:34-44`), so declaring it in `SinkCodec.ts` and type-importing it into `Errors.ts` would form a cycle. |
| AGENTS.md §5 / ADR-QD-073 (`Effect.fn`, `UNTRACED_BUDGET`) | No `Effect.fnUntraced`. `decodeAuditEntry` is `Effect.fn("qadi.audit.decodeAuditEntry")`, mirroring `encodeAuditEntry` (`AuditEntry.ts:79`). ADR-QD-051: the span says what was asked, so annotate `qadi.wire.version` (`1 \| 2`). |
| AGENTS.md §5a (`Match`, not `switch`; `SWITCH_BUDGET`) | The v2 rebuild of `outcome` is a module-scope `Match.type<OutcomeWire>().pipe(Match.tagsExhaustive({ Decided, Failed }))`, the same shape as `decodeDecision` (`DecisionWire.ts:100-120`). The version dispatch is a three-way branch on an `unknown` (absent, `2`, other). It is **not** a `_tag` dispatch, so `if` chains are allowed, the same as `HydrationEngine.ts:422-430`. No new `switch`. |
| AGENTS.md §6 (no `as`/`!`/`any`) and user memory (no widened `Record<string, unknown>`) | The prototype type-checks with none (C13). The envelope projection takes the `Predicate.isObject`-narrowed input and returns `unknown` into the decoder, so it never names a widened record type. `StructWithRest` is rejected because it leaks an index signature into `SinkRecordWire.Type` (D-15-c). |
| User memory: closed unions over widening | `WireVersion = 1 \| 2` is a closed literal union. `MalformedReason` becomes the full closed `"not-json" \| "not-a-record" \| "unsupported-version"` if D-15-f(i) is chosen. `AuditEntry.record`'s persisted type is the closed union of both byte formats (D-15-h), not `unknown`. |
| ADR-QD-002 and BEH-QD-199 REQUIREMENT 2 (an excess property inside the embedded `Policy` is refused) | Leniency applies **only** to the envelope's top-level keys, by projecting onto declared keys **before** a strict decode. Nested positions keep `UNTRUSTED_DECODE_OPTIONS`. `SinkCodec.test.ts:768-800` stays green unchanged. |
| AGENTS.md §7 (schema-first for wire types; `Schema.Union([...])` takes an array) | `OutcomeWire`, `SinkRecordWire` (v2) and `SinkRecordWireV1` are schemas. Types derive with `typeof X.Type`. The v1 codec's Type **is** the v2 Type (C13), so there is one in-memory wire type, not two. |
| AGENTS.md §9 (barrels) | New public exports go through `packages/core/src/index.ts` (it already re-exports `SinkCodec.ts`): `OutcomeWire`, `SinkRecordWireV1`, `WireVersion`, `WIRE_VERSIONS`, and `UnsupportedWireVersion` (via `Errors.ts`). The envelope-projection helper stays module-private. |
| AGENTS.md §10 (coverage: core 95%, others 90%) | The v1 reader, dispatch, projection and outbound version switch are each covered at the `SinkCodec.test.ts` interface, the test surface. Adapters only test their mapping. |
| AGENTS.md §11, §12, §15 (spec normative; doc fences; gates 9/13) | BEH-QD-199 and BEH-QD-200 change in the same PR as code. Any `typescript` fence added to `25-inspection.md` must compile (gate 9). Every export change lands in `spec/overview.md`. |
| AGENTS.md §16 (`pnpm publish`; `tsconfig.build.json`) | No new package, so neither file changes. |
| ADR-QD-078 (hydration payload `version` convention) | Same spelling (`version`), same "absent means v1", same "unknown is a named failure, not a malformed one". Different retention (D-15-d), because sink records are persisted and hydration payloads are not. |
| ADR-QD-056 (audit) | `AuditTrailPort.write`'s parameter type changes shape (D-15-h). That is breaking for adapters, so it gets a changeset `minor` (pre-1.0 breaking) and an ADR-QD-056 amendment. |
| Sequencing with ARCH-09 | `depends_on: [ARCH-09]`. T5/T6 edit ARCH-09's inbound and outbound operations. T0–T3 do not depend on ARCH-09. |
| Sequencing with ARCH-05 | No file overlap. ARCH-05 owns `DecisionWire.ts` and `HydrationEngine.ts`, which this plan only reads. |

## 5. Decisions needed before work starts

### D-15-a — Wire shape of a decision record's outcome

| Option | Shape | For | Against |
| ------ | ----- | --- | ------- |
| **(i) Nested tagged union (recommended)** | `outcome: { _tag: "Decided", decision: DecisionWire } \| { _tag: "Failed", error: EvaluationError }` on the `Decision` envelope | Mirrors `DecisionRecord.outcome` one-for-one (`DecisionRecord.ts:30-55`). "Both" and "neither" become unrepresentable in the Type. Rebuild is one exhaustive `Match`. The `ObligationRecord` variant already calls its field `outcome`, so the name is consistent. | A wire-format change: needs D-15-b's version and rollout. |
| (ii) Lift the outcome into the envelope `_tag` | `_tag: "Decided" \| "Failed" \| "Obligations"` | Flattest bytes. | The wire `_tag` stops matching the in-memory `SinkRecord` tags (`"Decision" \| "Obligations"`, ADR-QD-003). Every consumer that switches on wire `_tag` breaks, including `isRecordJsonSafe`/`toWire`'s `Match` over `SinkRecord`. |
| (iii) Keep two optionals, add an "exactly one" Schema check | Bytes unchanged | No version needed. It fixes the decode-side defect (this is T1). | The Type still admits four states, so every consumer of `SinkRecordWire.Type` (`AuditEntry` readers, `fromWireUnsafe`) still handles cases that cannot be meant. GH-01 is not addressed. It is a minimal patch layered on a shallow interface. |

**Recommendation: (i).** (iii) ships first anyway as T1: it is a test-first fix
that needs no wire change and can ship alone. (i) then replaces it.

`status: decided (2026-10-05, (i) — recommended default)`

### D-15-b — Version marker and rollout across a mixed fleet

The receiver at ≤ 0.9 is strict on envelope keys (C4). So any v2 record (new
keys `version`, `outcome`) reaching an old receiver is **rejected**: devtools
drops it as `not-a-record`, the example aggregator answers 400, and an old audit
reader using `AuditEntry` silently gets a record with no outcome (C10). Nothing
ARCH-15 does can change already-deployed receivers. The rollout order is the only
lever.

| Option | Plain-words shape | For | Against |
| ------ | ----------------- | --- | ------- |
| **(i) `version: 2` envelope key, absent = v1, expand/contract over two minors (recommended)** | **Phase A (next minor, 0.10):** readers understand v1 and v2, and writers keep writing **v1**. **Phase B (0.11):** writers default to v2, and senders that know they face older receivers keep `wireVersion: 1` (D-15-j). **Phase C (0.12):** the v1 writer and the `wireVersion` option are removed. The v1 reader stays (D-15-d). | Matches ADR-QD-078's convention (C6). It is fail-closed in every pairing (matrix below). It honours ADR-QD-002's "readers upgrade before writers". It gives future content changes a mechanism (`version: 3`). | Three releases to finish. A deployment that skips 0.10 entirely reproduces the hazard. The changeset and release notes must say "upgrade every reader to ≥ 0.10 before any writer to ≥ 0.11". |
| (ii) Shape-sniffing, no version key (`outcome` present → v2; `decided`/`failed` present → v1) | | One fewer key. | No mechanism for the next content change. "Neither key present" is ambiguous between versions. GH-01's generic fix (unknown keys ignored) would make a future v3 key silently ignorable by v2 readers, which is exactly wrong for content. |
| (iii) Single-release flip (read and write v2 in 0.10) | | Fastest. | Every ≤ 0.9 receiver rejects every record for the length of the deploy: devtools goes blank, aggregators 400, old audit tooling silently loses outcomes. |
| (iv) Transport negotiation (SSE event name, HTTP header) | | Old receivers never see v2. | It is per transport, audit rows have none, and BEH-QD-199 puts the shape beside the record. It is rejected as wrong, not as expensive. |

Pairing matrix for (i). "OK" means the record decodes with the sender's meaning.

| Receiver ↓ / Sender → | ≤ 0.9 (v1) | 0.10 Phase A (writes v1) | 0.11 Phase B, default (writes v2) | 0.11 with `wireVersion: 1` |
| --------------------- | ---------- | ------------------------ | --------------------------------- | -------------------------- |
| ≤ 0.9 (strict v1) | OK | OK | **refused** (excess `version`/`outcome`) | OK |
| 0.10+ | OK (v1 reader) | OK | OK | OK |

**Recommendation: (i).**

`status: decided (2026-10-05, (i) — recommended default; all three phases landed in one release at the user's direction — see ADR-QD-903 "The staged rollout, landed together" and §10)`

### D-15-c — Lenient envelope, strict content: how

| Option | Mechanism | For | Against |
| ------ | --------- | --- | ------- |
| **(i) Project onto declared keys, then one strict decode (recommended)** | `Object.fromEntries(Object.entries(input).filter(([k]) => KEYS.has(k)))`, where `KEYS = new Set(Object.keys(<variant>.fields))` is derived from the schema, then `decodeUnknownEffect(…, UNTRUSTED_DECODE_OPTIONS)` | One decode call per record, so each nested position is walked once. The key list cannot drift from the schema. Verified (C13, probe2). Nested strictness is untouched. | A per-variant key set: the `_tag` (`Decision`/`Obligations`) must be read before projecting, which is trivial. |
| (ii) Two-pass decode | The envelope is decoded with `policy`/`outcome` as `Schema.Unknown` under default options, then each is decoded strictly | No pre-projection. | Two or three decode calls per record. The two passes can disagree about what "envelope" means. It is the shape the `SinkCodec.ts:436-441` comment sketches, but more code than (i) for the same result. |
| (iii) `StructWithRest` + index signature | Unknown keys are "covered" (C9) | One Schema. | Leaks `{ readonly [k: string]: unknown }` into `SinkRecordWire.Type` and everything typed by it. Rejected (user memory). |
| (iv) Default `ParseOptions` for the whole decode | | Trivial. | Loosens the embedded `Policy`, violating BEH-QD-199 REQUIREMENT 2 and ADR-QD-002. This is the P6e defect, deliberately reintroduced. Rejected as wrong. |

**Sub-question: are the ignored keys observable?**

- (a) Silent.
- (b) **`Effect.logDebug("qadi: ignored unknown wire envelope keys")` annotated with the key names only (recommended).** Never the values, which may carry anything. A debug log is enough to diagnose skew and adds no metric declaration (user memory: `Metric` registry keying).
- (c) A counter metric.

**Recommendation: (i) + (b).**

`status: decided (2026-10-05, (i) — recommended default; sub-question answered (a) silent, not (b): ARCH-09 made the codec pure `Result` (D-09-a), so it has no logger — recorded as a consequence in ADR-QD-903)`

### D-15-d — How long the v1 reader lives

| Option | For | Against |
| ------ | --- | ------- |
| **(i) Permanently, inside the one inbound operation (recommended)** | Audit rows are durable compliance records: ADR-QD-056 has a store "re-parse later, possibly a different process". A v1 row from 2026 must still read in 2030. The reader is about 30 lines plus a frozen schema, all at the `SinkCodec.test.ts` interface. One entry point serves both live and archival input. | The v1 schema can never change. Pin that with T0's goldens and a "FROZEN" doc comment. |
| (ii) Two entry points: live paths drop v1 after N minors, and an archive-only reader is permanent | Live paths eventually refuse stale senders. | Two inbound operations re-create the "which decode do I call" problem ARCH-09 removes. A stale live sender is still a valid sender of a valid record. |
| (iii) Drop v1 after N minors, as ARCH-05 does for hydration | Consistent with ADR-QD-078. | Hydration payloads are ephemeral (cached HTML), but sink records are persisted. Old audit rows would become unreadable by the library that wrote them. Rejected as wrong. |

**Recommendation: (i).** The ADR should state the difference from ADR-QD-078
explicitly, so a later reader does not "harmonize" the two.

`status: decided (2026-10-05, (i) — recommended default)`

### D-15-e — Error surface of the inbound operation

| Option | Shape | For | Against |
| ------ | ----- | --- | ------- |
| **(i) `PolicyDecodeTooDeep \| Schema.SchemaError \| UnsupportedWireVersion` (recommended)** | A malformed outcome in **either** version is a `SchemaError`. In v1 it comes from the transformation's `SchemaIssue.InvalidValue` (C13), and in v2 it is structural. `UnsupportedWireVersion` is a new `Data.TaggedError` with `{ received: unknown; supported: ReadonlyArray<WireVersion> }`. | The same malformation fails the same way in both versions. Devtools' existing `not-a-record` covers it with no new reason (C8). A version mismatch has a different fix (upgrade the reader), so it gets a different error. | One new public error and code. |
| (ii) Also a `MalformedRecordOutcome` class (the prototype's first try) | | More specific. | v1 would fail with a class and v2 with a `SchemaError` for the same defect. Two errors for one meaning. |
| (iii) One `WireRecordRejected { reason: "TooDeep" \| "Malformed" \| "UnsupportedVersion" }` | | One error to match. | That is ARCH-09's "reason" design space. If ARCH-09 adopts a reason union, ARCH-15 **adds** `UnsupportedVersion` to that closed union rather than layering a second error. |

**Recommendation: (i), mapped into ARCH-09's reason union if ARCH-09 lands one.**

`status: decided (2026-10-05, (i) as reconciled — `DecodeRefusal.UnsupportedVersion { version, supported }`, a full-union edit; no new error class, no ACL code)`

### D-15-f — Devtools: does an unsupported version get its own drop reason?

- **(i) Yes (recommended).** `MalformedReason = "not-json" | "not-a-record" | "unsupported-version"`, a full closed union. `decodeFrame` maps `UnsupportedWireVersion` to it. The two problems have different fixes ("the far side is malformed" versus "upgrade this panel"), which is the reasoning `Source.ts:229-238` already gives for separating `not-json`. Widening a closed union a consumer branches on is breaking for exhaustive consumers, so the changeset says so.
- (ii) Fold it into `not-a-record`. No union change, but the reader loses the distinction.

**Recommendation: (i).**

`status: decided (2026-10-05, (i) — recommended default; the four-value union)`

### D-15-g — Pre-0.5 rows carrying `failed.code` (C4's latent break)

- **(i) The v1 reader tolerates exactly `failed.code` (recommended).** Before the strict decode, the projection step also drops `failed.code` when `failed` is an object. That is that one key, at that one position, and it is documented as the ADR-QD-060 artifact. Rows written by `@qadi/audit` 0.3.x/0.4.x then read again. An excess key anywhere else under `failed` is still refused.
- (ii) Do not tolerate it. Pre-0.5 `Failed` rows stay unreadable through `decodeRecord`, as they silently are today.

T0 must also settle whether a pre-0.5 **rendered** `cause` (a string, from the
deleted `renderCause`) decodes through `Schema.Defect()`. It is expected to,
since a string is a valid `Defect` encoding (`SinkCodec.ts:52-59`), but it is
**UNVERIFIED** and T0 pins it.

**Recommendation: (i).**

`status: decided (2026-10-05, (i) — recommended default; T0 settled the UNVERIFIED point: a rendered string cause decodes as that string)`

### D-15-h — `@qadi/audit`'s persisted row and its re-parse path

| Option | Shape | For | Against |
| ------ | ----- | --- | ------- |
| **(i) The persisted row is the encoded union; `decodeAuditEntry` is the sanctioned reader (recommended)** | `AuditEntry = Struct({ record: Schema.Union([SinkRecordWire, SinkRecordWireV1]), sequenceNumber? })`. Its **Encoded** type, which is what a store holds, is `v2 bytes \| v1 bytes`, a closed union. `encodeAuditEntry(record, { wireVersion })` returns that encoded form. `AuditTrailPort.write` receives it. `decodeAuditEntry(unknown) → Effect<DecodedAuditEntry, …>` (new, `Effect.fn`) runs the core inbound operation on `record`, so it gets the depth guard, the lenient envelope, strict content and both versions. It returns `{ record: SinkRecord; sequenceNumber? }`. | It is honest about what is on disk. Phase A writes v1 rows, so old audit tooling is unharmed (C10). C10 is closed for every row. `Retention`, `SequenceIntegrity` and `AuditArchive` read only `at`/`sequenceNumber`, which both formats carry. | `AuditTrailPort.write`'s parameter changes shape, which is breaking for store adapters (`minor`). If ARCH-09 already made the row "encoded JSON", this is only the widening to two versions. |
| (ii) Keep `AuditEntry.record: SinkRecordWire` (now v2) | | Smaller diff. | Phase A cannot write v1 rows, so old readers silently lose outcomes (C10). Rejected for Phase A. |
| (iii) Store `record: unknown`; only `decodeAuditEntry` interprets it | | Maximally forward-compatible. | The row type tells adapters nothing, so the schema-derived row of ADR-QD-056 is lost. |

**Sub-decision on `AuditArchive.archiveVersion`:** keep `"1"`. Entries are
self-describing (`version` absent or `2`), and the bundle's own shape does not
change. The ADR states this so nobody bumps it reflexively.

**Recommendation: (i).**

`status: decided (2026-10-05, (i) — recommended default; `decodeAuditEntry` keeps ARCH-09's `Result<{ entry, record }>` shape; `archiveVersion` stays "1")`

### D-15-i — `subjectId` in v2

- **(i) Required in v2 (recommended).** Every sender that can write v2 has had `subjectId` since before 0.9. The `UNKNOWN_SUBJECT` fallback (`SinkCodec.ts:80-93`, PH-03) moves into the v1 reader, the only place the skew it describes can occur. The v2 Type gets `subjectId: string`, not `string | undefined`.
- (ii) Optional in v2 as well. It keeps the fallback in two places for no sender that exists.

**Recommendation: (i).**

`status: decided (2026-10-05, (i) — recommended default)`

### D-15-j — Who chooses the version a sender writes

- **(i) A `DEFAULT_WIRE_VERSION` constant per phase, plus a `wireVersion?: WireVersion` option on the outbound operation, exposed on the three sender adapters (recommended).** The adapters are `decisionSinkForwarding({ send, onFailure, wireVersion })`, `decisionStreamRoute(…, { wireVersion })` (via `DecisionStreamOptions`), and `AuditDecisionSinkLive({ wireVersion })` → `encodeAuditEntry`. Phase A defaults to 1. Phase B defaults to 2 and still accepts 1. Phase C removes the option and the v1 encode path. An operator with lagging receivers can then hold v1 deliberately for one release, instead of discovering the matrix's "refused" cell in production.
- (ii) No option, only the phase default. That is simpler, but the only remedy for a lagging receiver is to stay on 0.10.

**Recommendation: (i).** (ii) is the minimal path, and the option is cheap
because the v1 codec gives the v1 writer for free (C13).

`status: decided (2026-10-05, (i) — recommended default; added in T6, defaulted to 2 in T12, removed in T13, all in this change)`

## 6. Tasks

**Phasing.**

- **Phase A**, one release: T0–T11 and T14. Readers become v1+v2, writers stay v1.
- **Phase B**, the next minor: T12.
- **Phase C**, the minor after that: T13.

**Fallback without ARCH-09.** Where a task says "ARCH-09's inbound operation",
edit `decodeRecordWire`/`decodeRecord` (`SinkCodec.ts:479-495`) and
`fromWireUnsafe` (`:347-390`). Where it says "ARCH-09's outbound operation",
add an exported `encodeRecordForWire(record, options?: { readonly wireVersion?: WireVersion }): unknown`
to `SinkCodec.ts`. It is `toWire` → `Schema.encodeSync(codecFor(version))`, and
T6 switches all three senders (`DecisionSinkForwarding.ts:76`,
`DecisionStreamRoute.ts:137`, `AuditEntry.ts:91`) and the example route to it.
That is a slice of ARCH-09's outbound work, so record in the CCR that ARCH-09
then deletes the old exports.

### T0 — Characterize today's wire before changing it (tests only)
- **Status:** [x] done (6b21bc9) — fixtures in `test/fixtures/sinkWireV1.ts`; characterization pinned at `899465c`, the ARCH-09 head, not `e0ee958`
- **Depends on:** —
- **Files:** `packages/core/test/SinkCodec.test.ts`, `packages/core/test/fixtures/sinkWireV1.ts` (*new*: exported JSON string literals), `packages/audit/test/AuditEntry.test.ts`
- **Steps:**
  1. Create `fixtures/sinkWireV1.ts`. Export `V1_DECIDED_ALLOW`, `V1_DECIDED_ALLOW_ALL_FIELDS` and `V1_DECIDED_DENY` as the three literals now inlined at `SinkCodec.test.ts:1094,1111,1129`, unchanged. Add new literals captured from `JSON.stringify(encodeRecordSync(toWire(r)))` at `e0ee958`:
     - `V1_FAILED_MISSING_RESOURCE`;
     - `V1_FAILED_ATTRIBUTE_ERROR_CAUSE` (an `Error("db down")` cause → `{name,message}`);
     - `V1_OBLIGATIONS`;
     - `V1_DECISION_FULL_ENVELOPE` (with `resource`, `action`, `cache`);
     - `V1_PRE05_FAILED_WITH_CODE`, hand-written: the `V1_FAILED_MISSING_RESOURCE` bytes plus `"code":"ACL004"` inside `failed`, and a second variant whose `cause` is a plain rendered string.
  2. Point the existing golden `describe` (`:1065`) at the fixture constants. Rename it `"v1 bytes: a decided record encodes byte-identically to 1caf04c"`. Add encode goldens for the new `Failed` and `Obligations` fixtures.
  3. Add `describe("v1 characterization at e0ee958 (replaced by T1/T4/T5)")`, pinning each of these as an assertion:
     - P3: an unknown envelope key fails.
     - P5: `failed.code` fails.
     - P7: an excess key inside `decided` fails.
     - The rendered-string-cause variant: assert what actually happens. This settles D-15-g's UNVERIFIED point.
     - Leave the existing `:614` and `:645` tests (P2, P1) where they are.
  4. In `AuditEntry.test.ts`, add `describe("AuditEntry default decode (characterization, replaced by T2)")` pinning P6a, P6b and P6e: each decodes OK, and P6e's decoded policy has no `permision` key.
- **Tests:** ≈12 new assertions, all green at `e0ee958`. They are the before-picture every later task flips deliberately.
- **Verify:** `cd $W && ./node_modules/.bin/vitest run packages/core/test/SinkCodec.test.ts packages/audit/test/AuditEntry.test.ts`
- **Done when:** both files are green, and the three original goldens are byte-identical through the fixture constants.

### T1 — A v1 record naming both outcomes, or neither, is a decode failure (test-first defect fix; tickets 96 and 155)
- **Status:** [x] done (56ee24a) — red then green; the refusal is ARCH-09's `DecodeRefusal.Malformed` (message "names no outcome"/"names both outcomes"), not a bare `SchemaError`. Deviated: `AuditEntry` decoded alone still accepts both/neither (`Schema.toEncoded` drops the check), so the flipped audit pins assert through `decodeAuditEntry`
- **Depends on:** T0. Not the ADR: no wire bytes change, and only BEH-QD-200's REQUIREMENT changes, with its own CCR.
- **Files:** `packages/core/test/SinkCodec.test.ts`, `packages/core/src/SinkCodec.ts`, `spec/behaviors/25-inspection.md`, `spec/README.md` (CCR register)
- **Steps:**
  1. Replace the two pinning tests (replace, don't layer). `:614` "neither becomes a Failed that says so" becomes `it.effect("a record naming neither outcome is refused, not given an invented error")`. It asserts `decodeRecord(V1 without decided)` fails, `Result.isFailure`, with `failure._tag === "SchemaError"`, and that its message contains `"names no outcome"`. `:645` becomes the "both" twin, with `"names both outcomes"`. Run both and confirm they **fail** (today P1/P2 decode successfully).
  2. In `SinkCodec.ts`, give the Decision member (`:97-118`) a check: `.check(Schema.makeFilter((wire) => (wire.decided === undefined) !== (wire.failed === undefined) || (wire.decided === undefined ? "a decision record names no outcome" : "a decision record names both outcomes")))`. Confirm `makeFilter`'s return protocol at `effect/src/Schema.ts:6533`, which accepts `boolean | string` (message). If it does not, return a `SchemaIssue.InvalidValue`. Wire bytes are unchanged, and the check also applies to `AuditEntry`'s embedded `SinkRecordWire`.
  3. A `Schema` check does not narrow the TypeScript type, so `fromWireUnsafe` still sees four states. Do not fabricate, throw or `as` the fourth state away. Instead, make the fabricating arm impossible to reach by type, with a type predicate (user memory: a predicate, not a cast):
     - Declare the closed type
       `type ExclusiveDecisionWire = Omit<DecisionWireV1Type, "decided" | "failed"> & ({ readonly decided: DecisionWire; readonly failed?: undefined } | { readonly decided?: undefined; readonly failed: EvaluationError })`
       and `type ExclusiveSinkRecordWire = ExclusiveDecisionWire | ObligationsWireType`.
     - Add a module-private `isExclusive = (wire: SinkRecordWire): wire is ExclusiveSinkRecordWire => wire._tag === "Obligations" || (wire.decided === undefined) !== (wire.failed === undefined)`.
     - `fromWireUnsafe`'s parameter becomes `ExclusiveSinkRecordWire`. Its outcome selection is `wire.decided !== undefined ? new Decided(…) : new Failed({ error: wire.failed })`, which is total by type with no fallback arm.
     - `decodeRecord` becomes `decodeRecordWire(input).pipe(Effect.filterOrFail(isExclusive, …), Effect.map(fromWireUnsafe))`. The `filterOrFail` branch is unreachable after the schema check, so make its failure a `Schema.SchemaError` built from the same `SchemaIssue.InvalidValue` message, keeping the error union unchanged. If `Effect.filterOrFail`'s v4 signature makes that awkward, use `Effect.flatMap` with `isExclusive(wire) ? Effect.succeed(wire) : Effect.fail(…)`.

     Record the shape in the CCR. T5 deletes all of this when the v2 Type makes exclusivity structural.
  4. Rewrite the conflation note (`:327-345`) to say tickets 96 and 155 are fixed at decode, citing `CCR-QD-NEXT`. Rewrite `:371-387`'s ticket comments to match.
  5. Spec: in `25-inspection.md` BEH-QD-200, replace "REQUIREMENT: A decision record naming neither outcome MUST decode to a `Failed` that says so." with "REQUIREMENT: A decision record naming neither outcome, or both, MUST be refused by `decodeRecord`; it MUST NOT decode to a record." Rewrite the paragraph under it: a fabricated error was indistinguishable by code (`ACL004`) from a real resolver failure. Add a change-history row and a `CCR-QD-NEXT` row in `spec/README.md`.
- **Tests:** the two rewritten tests go from red to green. The whole of `SinkCodec.test.ts`, including the `:802` round-trip property and the `:874` `encodeRecordSync` property, stays green: generated records always have exactly one outcome. Also add `AuditEntry.test.ts`: `Schema.decodeUnknownEffect(AuditEntry)` of P6a and P6b now **fails**. This flips T0's P6a/P6b pins, so delete those two pins.
- **Verify:** `cd $W && ./node_modules/.bin/vitest run packages/core/test/SinkCodec.test.ts packages/audit/test/AuditEntry.test.ts packages/devtools/test/model/Source.test.ts && node scripts/check-house-style.mjs && bash spec/scripts/verify-traceability.sh --strict`
- **Done when:** both tests failed before step 2 and pass after it. The 136 baseline tests (C15) minus the two replaced pins are green. `grep -n '<malformed record: no outcome>' packages/core/src/SinkCodec.ts` prints nothing.

### T2 — `@qadi/audit` gains a strict re-parse, `decodeAuditEntry` (test-first defect fix, C10)
- **Status:** [x] done (deviated: cf816e2) — ARCH-09 had already landed `decodeAuditEntry` (Result, depth-guarded, strict) and BEH-QD-905, so T2 is the P6e/both/neither tests through it and a BEH-QD-905 requirement; no new BEH, no `Effect.fn`
- **Depends on:** T0 (T1 recommended first, for the both/neither part)
- **Files:** `packages/audit/test/AuditEntry.test.ts`, `packages/audit/src/AuditEntry.ts`, `packages/audit/src/index.ts` (it already `export *`s `AuditEntry.ts`; verify), `spec/behaviors/33-audit-pipeline.md`, `spec/overview.md` (`@qadi/audit` table `:596-598`)
- **Steps:**
  1. Write `describe("decodeAuditEntry")` first:
     - "a typo'd field inside the embedded policy is refused, not silently dropped" (P6e) → fails `SchemaError` at `["record"]["policy"]["permision"]`;
     - "a row nested past MAX_DECODE_DEPTH fails PolicyDecodeTooDeep";
     - "a real row decodes to the SinkRecord it was encoded from": `decodeAuditEntry(JSON.parse(JSON.stringify(yield* encodeAuditEntry(r))))` gives `{ record, sequenceNumber }`, with `record` equal to `r` up to optional normalisation, per BEH-QD-200's existing "Optional fields normalise" note;
     - "sequenceNumber survives".

     Confirm the first two fail (no such export).
  2. Implement `export const decodeAuditEntry = Effect.fn("qadi.audit.decodeAuditEntry")(function* (input: unknown) { … })`:
     - depth-guard `input` with `exceedsJsonDepth(input, MAX_DECODE_DEPTH)`;
     - decode `{ record: Schema.Unknown, sequenceNumber: Schema.optional(Schema.Number) }` with `UNTRUSTED_DECODE_OPTIONS`;
     - run `decodeRecord(row.record)` from `@qadi/core`, or ARCH-09's inbound operation;
     - return `{ record, sequenceNumber }`.

     Export `DecodedAuditEntry` as an interface `{ readonly record: SinkRecord; readonly sequenceNumber?: number | undefined }`. The error type is `PolicyDecodeTooDeep | Schema.SchemaError`, widened by T5 to include `UnsupportedWireVersion`.
  3. Delete T0's P6e pin (replace, don't layer). Keep `AuditEntry.test.ts:127-150`'s raw `Schema.decodeUnknownEffect(AuditEntry)` round-trip test, renamed "the AuditEntry schema itself round-trips (use decodeAuditEntry for untrusted rows)".
  4. Spec: add **BEH-QD-NEXT** (in `33-audit-pipeline.md`), "A persisted row is re-parsed as untrusted": REQUIREMENT: `decodeAuditEntry` MUST apply the same validation `decodeRecord` applies. Add a doc comment on `AuditEntry` pointing callers to `decodeAuditEntry`. Add the `spec/overview.md` row for `decodeAuditEntry` and `DecodedAuditEntry`.
- **Tests:** four new tests, red → green, at the `decodeAuditEntry` interface.
- **Verify:** `cd $W && ./node_modules/.bin/vitest run --project audit && node scripts/check-api-surface.mjs`
- **Done when:** P6e is refused through `decodeAuditEntry`, the audit project is green, and gate 13 passes.

### T3 — Write ADR-QD-NEXT: the sink wire is versioned, its outcome is exclusive, its envelope tolerates unknown keys
- **Status:** [x] done (94f840e) — ADR-QD-903; amends ADR-QD-002, -056, -060
- **Depends on:** T0; D-15-a…j decided
- **Files:** `spec/decisions/NNN-the-sink-wire-is-versioned-and-its-outcome-exclusive.md` (*new*), `spec/decisions/index.yaml`, amendment notes in `spec/decisions/002-schema-derived-policy-adt.md`, `060-schema-taggederror-for-the-nine-wire-crossing-errors.md` and `056-audit-companion-package.md`, `spec/README.md` (CCR register)
- **Steps:**
  1. Use ADR-QD-078's Document Control header (`078-…md:1-14`), status "Accepted — amends ADR-QD-002, ADR-QD-056, ADR-QD-060".
  2. **Context.** Cover C1–C5 and C10 with file:line, and the GH-01 comment verbatim in substance. Include that the wire has already broken once unversioned (ADR-QD-060's `code`).
  3. **Decision.** One paragraph per D-15 outcome:
     - the outcome union (a);
     - the `version: 2` key and the three-phase rollout, with D-15-b's pairing matrix copied in (b);
     - projection-then-strict-decode, "envelope" defined as exactly the top-level keys of a `SinkRecordWire` member, ignored keys logged at debug by name (c);
     - the v1 reader permanent and frozen, and why this differs from ADR-QD-078 (d);
     - the error surface, with `UnsupportedWireVersion` and its code (e);
     - devtools' third reason (f);
     - `failed.code` tolerance (g);
     - the audit row union and `decodeAuditEntry`, `archiveVersion` unchanged (h);
     - `subjectId` required in v2 (i);
     - `wireVersion` (j).

     State the rule for the future: **additive optional envelope metadata needs no version bump; any change to content (outcome, decision, error, policy, trace) or to a required envelope field does.**
  4. **Alternatives considered.** The rejected options from §5, each with its reason. Mark (iv) in D-15-b and (iii)/(iv) in D-15-c as *wrong*, not merely expensive.
  5. **Consequences.** Breaking changes (core: the `SinkRecordWire` Type, `fromWireUnsafe`'s input, `decodeRecord`'s error union; audit: the row shape; devtools: `MalformedReason`). The readers-before-writers release note. Phase B and C follow-ups filed as tracked items.
  6. Amendment notes (short "Amended by ADR-QD-NEXT" lines):
     - ADR-QD-002's last paragraph: "the sink wire's version discriminator is ADR-QD-NEXT; `Policy` decoding is unchanged";
     - ADR-QD-060: "the removal of `code` was an unversioned wire change; the v1 reader tolerates it";
     - ADR-QD-056 `:89-101`: "persisted rows are a closed union of wire versions; re-parse with `decodeAuditEntry`".
  7. Add the `index.yaml` entry.
- **Tests:** none. Gate 10 (`verify-traceability.sh --strict`) checks cross-references.
- **Verify:** `bash spec/scripts/verify-traceability.sh --strict && node scripts/check-doc-examples.mjs`
- **Done when:** the ADR is merged as Accepted, with every D-15 decision recorded in it and in §5 here as `decided`.

### T4 — Ignore unknown top-level envelope keys; keep every nested position strict (GH-01)
- **Status:** [x] done (deviated: 045ab4b) — no debug log of ignored keys (D-15-c(a)): the codec is pure
- **Depends on:** T1, T3 (D-15-c)
- **Files:** `packages/core/test/SinkCodec.test.ts`, `packages/core/src/SinkCodec.ts`, `spec/behaviors/25-inspection.md`
- **Steps:**
  1. Tests first:
     - "a record with an unknown top-level key decodes (a newer sender mid rolling-deploy)" (flips T0's P3 pin; delete the pin);
     - "an unknown key inside policy is still refused" (exists at `:768-800`, unchanged);
     - "an unknown key inside decided is still refused" (T0's P7 pin, kept as the real test);
     - "an unknown key inside failed is still refused";
     - "the ignored keys are logged at debug, by name, never by value", using a test `Logger` that captures annotations: assert the key name is present and the value string is absent.
  2. Implement module-private `envelopeOf(input: { readonly [key: string]: unknown }, keys: ReadonlySet<string>): unknown`, as prototyped in `Proto.mts` (C13). Build the key sets from the schema at module scope: `const DECISION_V1_KEYS = new Set(Object.keys(DecisionV1Fields))`, and the same for `Obligations`.
  3. In ARCH-09's inbound operation (fallback: `decodeRecordWire`, `:479-484`), the order is:
     1. the depth guard (unchanged, first);
     2. if not `Predicate.isObject(input)`, decode as-is so the `SchemaError` is unchanged;
     3. read `input["_tag"]` and pick the key set (`"Obligations"` gives the Obligations set; anything else gives the Decision set, and an unknown `_tag` then fails in the decode as today);
     4. compute the ignored keys, then `Effect.logDebug` when there are any;
     5. strict decode of the projection.
  4. Delete the GH-01 "Known gap" comment (`:418-442`). Replace it with a short comment citing ADR-QD-NEXT.
  5. Spec: add a BEH-QD-199 REQUIREMENT: "`decodeRecord` MUST ignore a top-level envelope key it does not declare, and MUST still refuse an undeclared key at any nested position."
- **Tests:** four new tests and one flipped pin. The `:768` describe stays unchanged.
- **Verify:** `cd $W && ./node_modules/.bin/vitest run packages/core/test/SinkCodec.test.ts packages/devtools/test/model/Source.test.ts`
- **Done when:** GH-01's probe P3 decodes, P7b (policy typo) still fails, and coverage of `SinkCodec.ts` stays ≥ 95%.

### T5 — The v2 wire: exclusive `outcome`, `version: 2`, a frozen v1 codec reading into the same Type, and `UnsupportedWireVersion`
- **Status:** [x] done (deviated: 8132bc1) — v1→v2 upgrade is a pure function (the plan's named fallback, walking the policy once by construction; not measured) instead of `Schema.decodeTo`; `UnsupportedVersion` is a `DecodeRefusal` member; the wire schemas stay module-private per ARCH-09, so `OutcomeWire`/`SinkRecordWireV1` are not exported and `SinkRecordJson` becomes the closed v1|v2 union; devtools' `reasonOf` arm landed here to keep the build compiling
- **Depends on:** T4, ARCH-09 (inbound operation) or the fallback, D-15-a/b/d/e/g/i
- **Files:** `packages/core/src/SinkCodec.ts`, `packages/core/src/Errors.ts`, `packages/core/src/index.ts` (check that the re-exports cover the new names), `packages/core/test/SinkCodec.test.ts`, `packages/core/test/fixtures/sinkWireV2.ts` (*new*), `packages/core/test/Tokens.test.ts` (only if it hard-codes a code count)
- **Steps:**
  1. **Errors.ts.**
     - Add `export class UnsupportedWireVersion extends Data.TaggedError("UnsupportedWireVersion")<{ readonly received: unknown; readonly supported: ReadonlyArray<WireVersion> }> {}`.
     - Add `export type WireVersion = 1 | 2` and `export const WIRE_VERSIONS: ReadonlyArray<WireVersion> = [1, 2]`.
     - Add it to `QadiError` (`:376`) and to `ERROR_CODES` with `"UnsupportedWireVersion": "ACL0NN"`, next free at landing.

     `WireVersion` lives in `Errors.ts` because the error's field needs it and `Errors.ts` cannot import `SinkCodec.ts` (ADR-QD-037). `SinkCodec.ts` re-exports nothing, since the barrel already exports both.
  2. **Schemas.**
     - `OutcomeWire = Schema.Union([Schema.TaggedStruct("Decided", { decision: DecisionWire }), Schema.TaggedStruct("Failed", { error: EvaluationErrorSchema })])`, exported, with `type OutcomeWire`.
     - `DecisionV2 = Schema.Struct({ _tag: Literal("Decision"), version: Literal(2), evaluationId, at, subjectId: Schema.String, policy: Policy, resource?, action?, cache?, outcome: OutcomeWire })` (D-15-i: `subjectId` required).
     - `ObligationsV2 = Schema.Struct({ _tag: Literal("Obligations"), version: Literal(2), …today's fields })`.
     - `SinkRecordWire = Schema.Union([DecisionV2, ObligationsV2])`, so v2 is now *the* `SinkRecordWire`.
  3. **The frozen v1 codec** (C13, `Proto2.mts`).
     - `DecisionV1Bytes` is today's Decision struct with fields in **exactly** today's order (`SinkCodec.ts:98-117`, C14), plus T1's check.
     - `DecisionV1 = DecisionV1Bytes.pipe(Schema.decodeTo(Schema.toType(DecisionV2), SchemaTransformation.transformEffect({ decode: upgradeV1, encode: downgradeToV1 })))`.
       - `upgradeV1` fills `subjectId` with `UNKNOWN_SUBJECT` when absent, so PH-03 lives only here. It sets `version: 2` and builds `outcome`. If both or neither are present, it fails with `SchemaIssue.InvalidValue`; that is defensive, since T1's check runs first.
       - `downgradeToV1` drops `version` and splits `outcome` back into `decided`/`failed`.
     - `ObligationsV1` is the same pattern, adding and dropping `version` only.
     - `SinkRecordWireV1 = Schema.Union([DecisionV1, ObligationsV1])`, exported. Doc comment: "**FROZEN.** Read permanently (ADR-QD-NEXT, D-15-d); written only while `wireVersion: 1` exists (Phase A/B)".
     - If `Schema.toType` does not stop the `Policy` being walked twice on decode, the fallback is the Effect-level upgrade verified in `probe2` (`Proto.mts` `upgradeV1`). Pin with a test that counts `Policy` decodes, or measure with `pnpm bench` if a decode bench exists. Record the choice in the CCR.
  4. **D-15-g.** In the v1 branch's projection (T4's `envelopeOf`), also drop `failed.code` when `failed` is an object. Build the copy without `failed.code` as `Object.fromEntries(Object.entries(failed).filter(([k]) => k !== "code"))`, so there is no `as`.
  5. **Inbound dispatch** (ARCH-09's inbound operation; fallback: `decodeRecordWire`). It is plain `if`s on `unknown`, the same as `HydrationEngine.ts:422-430`:
     - not an object → strict decode as-is (`SchemaError`);
     - `!Object.hasOwn(input, "version")` → project with the v1 key sets, then decode with `SinkRecordWireV1`;
     - `input["version"] === 2` → project with the v2 key sets, then decode with `SinkRecordWire`;
     - anything else → `Effect.fail(new UnsupportedWireVersion({ received: input["version"], supported: WIRE_VERSIONS }))`.

     Every decode uses `UNTRUSTED_DECODE_OPTIONS`. The return type is `Effect<SinkRecordWire.Type, PolicyDecodeTooDeep | Schema.SchemaError | UnsupportedWireVersion>`. The Type is v2 for both versions.
  6. **Rebuild.**
     - `fromWireUnsafe` takes the v2 Type only.
     - Its `Decision` arm uses a module-scope `const rebuildOutcome: (o: OutcomeWire) => DecisionOutcome = Match.type<OutcomeWire>().pipe(Match.tagsExhaustive({ Decided: (o) => new Decided({ decision: decodeDecision(o.decision) }), Failed: (o) => new Failed({ error: o.error }) }))`.
     - `subjectId: makeSubjectId(wire.subjectId)`, with no fallback.
     - Delete the both/neither arms, `UNKNOWN_SUBJECT`'s use there (the constant moves next to `upgradeV1`), and the conflation note.
  7. **`toWire`** now projects to the v2 Type: `version: 2`, `outcome: toOutcomeWire(record.outcome)`, where `toOutcomeWire` is a module-scope `Match.tagsExhaustive` over `Decided | Failed`. The bytes a sender emits are decided by T6, not by `toWire`.
  8. Write v2 goldens in `fixtures/sinkWireV2.ts` for the same records as T0's v1 fixtures, and pin them.
- **Tests** (at the `SinkCodec` interface; replace, don't layer):
  - every T0 v1 fixture decodes, through the new code, to a record deep-equal to the original `SinkRecord`;
  - every v2 fixture decodes the same way;
  - v2 malformations: outcome missing; `{_tag:"Decided"}` with no decision; `Failed` with a stray `decision`; an unknown outcome `_tag` (each a `SchemaError`, from probe2);
  - `version: 3`, `version: "2"` and `version: null` each fail `UnsupportedWireVersion` with that exact `received` and `supported: [1, 2]`;
  - v2 with no `subjectId` fails, while v1 with no `subjectId` decodes to `UNKNOWN_SUBJECT` (keep `:500`'s test, scoped to v1);
  - `V1_PRE05_FAILED_WITH_CODE` decodes (D-15-g(i)), and `failed.code2` still fails;
  - **property** (extends `:802`): for generated records `r`, `decode(Schema.encode(SinkRecordWireV1)(toWire(r)))` and `decode(Schema.encode(SinkRecordWire)(toWire(r)))` are both `Equal`-equal to `r`. This is INV-QD-NEXT-b (§8);
  - **property:** for generated malformed v1 records (fast-check `oneof` over "drop both", "keep both", "add unknown nested key"), `decodeRecord` never succeeds and never dies. This is INV-QD-NEXT-a;
  - the `ERROR_CODES` injectivity test (`Tokens.test.ts:272`) passes unchanged.
- **Verify:** `cd $W && ./node_modules/.bin/vitest run --project core && node scripts/check-house-style.mjs && pnpm circular && pnpm test:tstyche`
- **Done when:** the core project is green, `fromWireUnsafe` has no fallback arm, and `grep -n "UNKNOWN_SUBJECT" packages/core/src/SinkCodec.ts` shows it used only by `upgradeV1`.

### T6 — One versioned outbound path; the senders take `wireVersion` (Phase A default 1)
- **Status:** [x] done (deviated: de8b3ee) — `frame` keeps its `Filter` signature; `decisionFrames` takes `wireVersion`
- **Depends on:** T5, ARCH-09 (outbound operation) or the fallback, D-15-j
- **Files:** `packages/core/src/SinkCodec.ts`, `packages/core/src/DecisionSinkForwarding.ts`, `packages/http/src/DecisionStreamRoute.ts`, `packages/audit/src/AuditEntry.ts`, `packages/audit/src/AuditDecisionSinkLive.ts` (options type and the `encodeAuditEntry` call), `examples/nextjs-newsroom/app/api/edge/decide/route.ts`, and the tests `packages/core/test/DecisionSinkForwarding.test.ts`, `packages/http/test/decisionStream.test.ts`, `packages/audit/test/AuditDecisionSinkLive.test.ts`, `packages/core/test/SinkCodec.test.ts`
- **Steps:**
  1. In `SinkCodec.ts`: `export const DEFAULT_WIRE_VERSION: WireVersion = 1` (Phase A), with a comment naming Phases B and C and ADR-QD-NEXT.
  2. Add a `{ readonly wireVersion?: WireVersion }` option to ARCH-09's outbound operation (fallback: `encodeRecordForWire`). Encode with `Schema.encodeSync(version === 1 ? SinkRecordWireV1 : SinkRecordWire)(toWire(record))`. Keep it total, as `encodeRecordSync`'s doc argues (`:395-416`). The v1 codec's `encode` is a pure `Effect.succeed`.
  3. `decisionSinkForwarding({ send, onFailure, wireVersion })` passes it through. `DecisionStreamOptions` gains `wireVersion`, and `frame` becomes `frameWith(wireVersion)`, or ARCH-09's adapter does. `AuditDecisionSinkLive` options gain `wireVersion` and pass it to `encodeAuditEntry(record, { wireVersion })`.
  4. The example edge route uses the outbound operation with the default. Its response body then shows exactly what a forwarder would send.
- **Tests:**
  - Forwarding: `send` receives exactly `V1_*` fixture bytes by default and `V2_*` bytes with `wireVersion: 2`. Both decode through `decodeRecord`. Extend `DecisionSinkForwarding.test.ts:292`.
  - SSE: the default frame's `data:` equals the v1 golden, and `wireVersion: 2` equals the v2 golden. Extend `decisionStream.test.ts:528`.
  - Audit: see T7.
- **Verify:** `cd $W && ./node_modules/.bin/vitest run packages/core packages/http packages/audit && pnpm --filter @qadi/example-nextjs check`
- **Done when:** with no option set, every sender's bytes equal the v1 goldens byte for byte, which proves Phase A writes v1. With `wireVersion: 2` they equal the v2 goldens.

### T7 — `AuditEntry`'s persisted row is the closed union of both byte formats (D-15-h)
- **Status:** [x] done (deviated: fcc3ec0) — also fixed `decodeAuditEntry` refusing rows the core reader accepts (it re-decoded the whole row strictly); the row's fields now decode strictly and the record leniently after the strict read
- **Depends on:** T2, T5, T6
- **Files:** `packages/audit/src/AuditEntry.ts`, `packages/audit/src/AuditTrailPort.ts`, `packages/audit/src/AuditTrailPortTest.ts`, `packages/audit/src/AuditStagingPort.ts`, `packages/audit/src/AuditStagingPortTest.ts` (only if they name the row type), `packages/audit/src/Retention.ts`, `packages/audit/src/SequenceIntegrity.ts`, `packages/audit/src/AuditArchive.ts` (doc only), the audit tests that read `entry.record.*`, `apps/website/src/content/docs/docs/packages/audit/capabilities.md:23`
- **Steps:**
  1. `AuditEntry = Schema.Struct({ record: Schema.Union([SinkRecordWire, SinkRecordWireV1]), sequenceNumber: Schema.optional(Schema.Number) })`.
     - Export `type AuditEntry = typeof AuditEntry.Encoded`: the persisted row, a closed union of v2 bytes and v1 bytes. Keep the exported name `AuditEntry` for the row.
     - Export `type AuditEntryDecoded = typeof AuditEntry.Type` only if a consumer needs it. Otherwise `DecodedAuditEntry` from T2 is the decoded view.
  2. `encodeAuditEntry(record, options?: { readonly wireVersion?: WireVersion })`: guard, then the outbound operation, then `{ record: encoded, sequenceNumber: undefined }`.
  3. `decodeAuditEntry` (T2) now inherits v1+v2, the lenient envelope, and `UnsupportedWireVersion`. Widen its error type.
  4. Fix compile errors where code read `entry.record.failed` (`AuditEntry.test.ts:21-23`): narrow on `"version" in entry.record`, or better, assert through `decodeAuditEntry`. `Retention.ts:18` (`entry.record.at`) and `SequenceIntegrity.ts` read fields both formats carry, and should compile unchanged. Confirm.
  5. `AuditArchive.ts`: add a doc line saying `archiveVersion` stays `"1"` because entries are self-versioning (D-15-h).
  6. Website `capabilities.md`: add a paragraph on versioned rows and on `decodeAuditEntry` as the re-parse path. Any code fence must compile (gate 22).
- **Tests:**
  - "an archive mixing v1 and v2 rows decodes every row via decodeAuditEntry";
  - "a row written by 0.9 (T0 fixture) decodes";
  - "a pre-0.5 row with failed.code decodes";
  - "Phase A's AuditDecisionSinkLive writes v1 rows by default; wireVersion: 2 writes v2", in `AuditDecisionSinkLive.test.ts`;
  - INV-QD-051 (`Agreement.test.ts`) stays green unchanged.
- **Verify:** `cd $W && ./node_modules/.bin/vitest run --project audit && node scripts/check-website-doc-examples.mjs`
- **Done when:** the audit project is green, and `pnpm exec stryker run stryker.audit.mjs` is ≥ 80% and not below 86.92 without explanation.

### T8 — Devtools and the example name an unsupported version separately (D-15-f)
- **Status:** [x] done (9af9d8a) — the stale `renderCause` references were already gone (ARCH-09)
- **Depends on:** T5
- **Files:** `packages/devtools/src/model/Source.ts`, `packages/devtools/test/model/Source.test.ts`, `packages/devtools/test/react/useTimeline.test.tsx:21` (only if it builds frames by hand), `examples/nextjs-newsroom/src/server/api.ts:215-218`, `spec/behaviors/27-devtools-timeline.md` (BEH-QD-203, the source's drop reasons)
- **Steps:**
  1. `MalformedReason = "not-json" | "not-a-record" | "unsupported-version"`. Update the doc comment (`:229-238`) with the third problem and its fix ("upgrade this panel's `@qadi/core`").
  2. In `decodeFrame` (`:213-226`):
     ```
     const decoded = yield* Effect.result(decodeRecord(parsed.success));
     if (Result.isFailure(decoded))
       return yield* malformed(frame, decoded.failure._tag === "UnsupportedWireVersion" ? "unsupported-version" : "not-a-record", …)
     ```
     If `decoded.failure` is a union with `SchemaError`, whose `_tag` is `"SchemaError"`, prefer a module-scope `Match.type<…>().pipe(Match.tag("UnsupportedWireVersion", () => "unsupported-version" as const), Match.orElse(() => "not-a-record" as const))`, so that a fourth error type is a deliberate edit. (`as const` is allowed by the house-style rule.)
  3. Also fix the stale `renderCause` reference at `Source.ts:259` and `Capture.ts:247` (review note), which now cites nothing. Change it to "the same shape `Schema.Defect()` uses". It is one line each, in files this task already opens.
  4. Example `IngestRoute`: `UnsupportedWireVersion` → `400 "unsupported wire version"`. Other decode failures stay `400 "not a decision record"`. Use `Effect.catchTag(["UnsupportedWireVersion"], …)` array form, or `Match` on the `Result` failure.
- **Tests (`Source.test.ts`):**
  - "a v2 frame decodes";
  - "a v1 frame from an older server decodes";
  - "a frame naming both outcomes is dropped as not-a-record";
  - "a version-3 frame is dropped as unsupported-version";
  - "a frame with an unknown envelope key decodes".

  Each one goes through `sourceFromEventSource`, the same as `:273`'s depth test.
- **Verify:** `cd $W && ./node_modules/.bin/vitest run --project devtools && pnpm exec stryker run stryker.devtools.mjs && pnpm --filter @qadi/example-nextjs check`
- **Done when:** the devtools project is green, and the model's mutation score is ≥ 80% (96.96 at integration).

### T9 — Acceptance scenarios for wire versions (BDD)
- **Status:** [x] done (4660867) — REQ-QD-901 (9xx branch numbering); `@qadi/features` gains `@qadi/audit` as a workspace dependency, lockfile hand-edited to the one link because `pnpm install` would have re-resolved the `latest` catalog to effect 4.0.1
- **Depends on:** T5–T8
- **Files:** `features/features/wire-versions/wire-versions.feature` (*new*, tagged `@wire-versions @REQ-QD-NEXT`), `features/features/wire-versions/wire-versions.steps.test.ts` (*new*, following `features/features/hydration-counts/hydration-counts.steps.test.ts`'s layout), `spec/traceability.md` §5
- **Steps:**
  1. Scenarios:
     - "A record from an older process is read"
     - "A record from this version is read"
     - "A newer sender's extra envelope field is ignored"
     - "A record naming both outcomes is refused, and no error is invented"
     - "A record naming neither outcome is refused"
     - "A record of an unknown version is refused as unsupported, not as malformed"
     - "An audit row written by 0.9 reads back through decodeAuditEntry"
     - "A sender pinned to wire version 1 writes what an older reader accepts"
  2. Use the public interface only: `decodeRecord`, the outbound operation, `decodeAuditEntry`, `sourceFromEventSource`, and the T0/T5 fixture literals copied in as step data.
  3. Add a `spec/traceability.md` §5 row: `REQ-QD-NEXT | features/features/wire-versions/wire-versions.feature | BEH-QD-199, BEH-QD-200, BEH-QD-NEXT (audit re-parse), INV-QD-NEXT-a, INV-QD-NEXT-b`.
- **Tests:** eight scenarios.
- **Verify:** `pnpm --filter @qadi/features test && bash spec/scripts/verify-traceability.sh --strict`
- **Done when:** all scenarios pass and gate 10 passes.

### T10 — Spec: behaviors, invariants, traceability, overview (gate 13), CCR
- **Status:** [x] done (bacefa9) — INV-QD-904 (a), INV-QD-905 (b); CCR-QD-904
- **Depends on:** T3–T9
- **Files:** `spec/behaviors/25-inspection.md`, `spec/behaviors/33-audit-pipeline.md`, `spec/behaviors/27-devtools-timeline.md`, `spec/behaviors/24-decision-sink.md` (BEH-QD-187/188 forwarding: the `wireVersion` option), `spec/behaviors/23-http.md` (only if it documents `DecisionStreamOptions`; else skip), `spec/invariants.md`, `spec/traceability.md`, `spec/overview.md`, `spec/README.md`
- **Steps:**
  1. **BEH-QD-199.**
     - Correct the stale REQUIREMENT (C12) to "An `EvaluationError` MUST cross carrying its tag, and MUST be rebuilt from the tag".
     - Add the version REQUIREMENTs: v1 and v2 both read; any other version refused as `UnsupportedWireVersion`; the envelope lenient and content strict (T4's requirement).
     - Update the `ts` signature block to `decodeRecord: (input: unknown) => Effect<SinkRecord, PolicyDecodeTooDeep | SchemaError | UnsupportedWireVersion>`, and add `SinkRecordWireV1`, `OutcomeWire`, `WireVersion`.
     - If a `typescript` example is added, it must compile (gate 9).
  2. **BEH-QD-200.** T1's change is already in. Add: "A v2 record cannot name both outcomes: `outcome` is one tagged value".
  3. **INV-QD-NEXT-a**, "A decoded decision record has exactly the one outcome its sender sent". Enforcement: T5's malformed-record property plus T1's tests. Source: `SinkCodec.ts` `OutcomeWire`/`upgradeV1`.
  4. **INV-QD-NEXT-b**, "A record decodes to the same `SinkRecord` whichever wire version carried it". Enforcement: T5's two-version round-trip property.
  5. **Traceability.** Update `:268`'s `SinkCodec.test.ts` row (BEH-QD-199, BEH-QD-200, INV-QD-NEXT-a/b, ADR-QD-NEXT, "golden v1 and v2 bytes"), add a row for `fixtures/sinkWireV1.ts`/`sinkWireV2.ts`, add rows for the audit and devtools tests, and add §5's REQ row (T9).
  6. **`spec/overview.md`** (gate 13):
     - `:273` `SinkRecordWire` now "v2"; new rows for `SinkRecordWireV1` ("FROZEN v1 codec: v1 bytes ↔ v2 Type"), `OutcomeWire`, `WireVersion`, `WIRE_VERSIONS` and `DEFAULT_WIRE_VERSION`;
     - `:279`'s codec row text;
     - the core Errors table gains `UnsupportedWireVersion`;
     - `@qadi/audit` gains `decodeAuditEntry`/`DecodedAuditEntry` (T2) and the `AuditEntry` row text "persisted row: closed union of wire versions";
     - devtools `:675`'s `MalformedReason`;
     - add a Change History row.

     If ARCH-09 removed exports, rebase on its rows.
  7. **CCR.** `spec/README.md` register: one `CCR-QD-NEXT` row listing every file and revision. T1 and T2 may have their own earlier CCR rows if they ship separately.
- **Tests:** none (spec).
- **Verify:** `node scripts/check-api-surface.mjs && bash spec/scripts/verify-traceability.sh --strict && node scripts/check-doc-examples.mjs && node scripts/check-dod-table.mjs`
- **Done when:** gates 9, 10, 11 and 13 pass.

### T11 — Changesets and release notes (Phase A)
- **Status:** [x] done (1ce3eaa; rewritten in T12/T13 to the landed state)
- **Depends on:** T5–T10
- **Files:** `.changeset/sink-wire-versioned.md` (*new*), plus `.changeset/sink-wire-exclusive-outcome.md` and `.changeset/audit-decode-entry.md` (*new*) if T1/T2 ship ahead
- **Steps:**
  1. Bump `@qadi/core`, `@qadi/audit`, `@qadi/devtools` and `@qadi/http` as `minor`, pre-1.0 breaking. The fixed group in `.changeset/config.json` bumps the rest.
  2. Body:
     - **Breaking:** `SinkRecordWire`'s Type, `fromWireUnsafe`'s input, `decodeRecord`'s error union, the `AuditEntry` row type and `AuditTrailPort.write`'s parameter, and `MalformedReason` gaining a member.
     - **Rollout, in bold:** "Upgrade every *reader* of decision records (devtools panels, aggregators, audit tooling) to this version before any *writer* moves to the next minor. This release still writes wire version 1."
     - Link ADR-QD-NEXT.
- **Tests:** none.
- **Verify:** `pnpm changeset status` and `node scripts/check-package-install.mjs` (gate 14)
- **Done when:** the changeset lists every package, and gate 14 installs and authorizes through the packed packages.

### T12 — Phase B (next minor): writers default to wire version 2
- **Status:** [x] done (deviated: d2876ed) — same release as Phase A, at the user's direction
- **Depends on:** T11 released
- **Files:** `packages/core/src/SinkCodec.ts` (`DEFAULT_WIRE_VERSION = 2`), the default-bytes tests in T6/T7 (swap which fixture is "default"), `.changeset/sink-wire-v2-default.md` (*new*), and the ADR-QD-NEXT Phase log line
- **Steps:**
  1. Flip the constant.
  2. Swap the default-bytes assertions to v2, and keep the `wireVersion: 1` assertions.
  3. Release note: "Writers now default to wire v2. A deployment with readers older than 0.10 sets `wireVersion: 1` on `decisionSinkForwarding`, `decisionStreamRoute` and `AuditDecisionSinkLive` until they upgrade."
- **Tests:** flipped defaults.
- **Verify:** `pnpm check`
- **Done when:** released.

### T13 — Phase C (the minor after): remove the v1 writer and the `wireVersion` option; keep the v1 reader
- **Status:** [x] done (deviated: fd9cffe) — same release; `downgradeToV1` and the v1 encoder deleted rather than kept, since no Schema codec needs an `encode` in the function design; the two-version property rebuilds v1 bytes in the test
- **Depends on:** T12 released
- **Files:** `SinkCodec.ts` (the outbound operation loses its option; `DEFAULT_WIRE_VERSION` deleted), `DecisionSinkForwarding.ts`, `DecisionStreamRoute.ts`, `AuditDecisionSinkLive.ts`, `AuditEntry.ts` (the `encodeAuditEntry` option), their tests, `spec/overview.md`, the changeset
- **Steps:**
  1. Delete the option and its tests (replace, don't layer).
  2. `SinkRecordWireV1` stays exported for decoding. Its doc comment changes to "read-only". `downgradeToV1` stays, because the codec needs an `encode`, but it is reachable only through `Schema.encode(SinkRecordWireV1)`, which T0's goldens keep testing as the frozen format.
  3. `AuditEntry`'s row union is unchanged: persisted v1 rows live forever.
- **Tests:** the option tests are deleted. The v1 goldens and the v1 decode tests stay.
- **Verify:** `pnpm check`
- **Done when:** released, and `grep -rn "wireVersion" packages/*/src` prints nothing.

### T14 — Full gate and mutation runs (Phase A)
- **Status:** [~] deferred to final integration gate
- **Depends on:** T0–T11
- **Files:** none, unless a gate fails
- **Steps:**
  1. Run `pnpm check` from the worktree root. It covers gates 1–24 per `spec/process/definitions-of-done.md:25-48`. Note that `pnpm coverage` and Stryker dry runs time out at 5 s in `FieldPath.test.ts` on this machine (README "Open items"). Run with `--testTimeout=60000` where the README says to, and record it.
  2. Run the four relevant mutation configs on their own, with scores recorded in the CCR:
     - `pnpm exec stryker run` (core, gate 16; `SinkCodec.ts` and `Errors.ts` are in `stryker.config.mjs:81` `mutate`);
     - `pnpm exec stryker run stryker.audit.mjs` (gate 20);
     - `pnpm exec stryker run stryker.devtools.mjs` (gate 17);
     - `pnpm exec stryker run stryker.http.mjs` (gate 21).
  3. ADR-QD-076's `ignoreStatic: true` skips module-scope initializers. The key sets (`DECISION_V1_KEYS`, …), `WIRE_VERSIONS` and the `Match.type` dispatchers are module-scope, so behaviour must be killed through the functions that read them, as the T4/T5 tests do.
- **Tests:** —
- **Verify:** as in the steps.
- **Done when:** everything is green, every mutation score is ≥ 80% and not below its integration score without a CCR note, and §10 has a row.

## 7. Test strategy

**The interface is the test surface.** Almost every new assertion lives in
`packages/core/test/SinkCodec.test.ts`, against the inbound and outbound
operations. Adapters (`Source`, forwarding, SSE `frame`, `encodeAuditEntry`,
`decodeAuditEntry`, the example ingest route) get only tests of their own
mapping: which version they write, and which reason or status a failure becomes.

**Survive unchanged:**

- `SinkCodec.test.ts` `:113-232` (round-trips), `:234-270` (normalisation),
  `:272-376` (error variants), `:378-485` (literals), `:682-766` (depth),
  `:768-800` (policy strictness, which is the ADR-QD-002 regression guard), and
  `:940-1056` (`isJsonSafe`). `isJsonSafe` may move under ARCH-09; follow it there.
- `DecisionWire.test.ts`, all of it.
- `audit/test/Agreement.test.ts` (INV-QD-051) and `CircuitBreaker` tests.

**Move or rename:**

- The v1 goldens (`:1065-1130`) move behind `fixtures/sinkWireV1.ts` and become
  **the permanent v1 contract**: decode tests forever, encode tests until
  Phase C, then `Schema.encode(SinkRecordWireV1)` tests.
- `:500`'s "no subjectId" test is scoped to v1.

**Deleted as redundant (replace, don't layer):**

- `:614` (neither → `MissingResource`) and `:645` (both → prefer `decided`),
  replaced in T1.
- T0's characterization pins P3 (T4), P5 (T5), and P6a/P6b/P6e (T1/T2), each
  deleted in the task that flips it.

**Property and differential coverage:**

- *Two-version differential* (INV-QD-NEXT-b): for every generated record, v1
  bytes and v2 bytes decode to `Equal`-equal records. This extends the
  `:802`/`:874` generators.
- *Malformation property* (INV-QD-NEXT-a): generated v1 records with
  both/neither/nested-excess never decode and never die.
- *Golden pins*: exact bytes for both versions. They catch field-order drift
  (C14) and accidental Phase-B behaviour in Phase A.

**Mutation (Stryker):** gates 16 (core), 17 (devtools model), 20 (audit) and 21
(http). The version dispatch's three branches, the projection's filter, the
`failed.code` strip and the `outcome` `Match` arms each need a killing test. T5's
list targets each one: for example, `version: null` kills a `!== undefined`
mutant that `version: 3` alone would not.

**BDD:** one new feature (T9) with REQ traceability. Today there is none for the
sink wire (C7).

## 8. Spec and documentation updates

- **ADR-QD-NEXT** (T3, *new*). It amends ADR-QD-002 (the deferred version
  discriminator, for the sink wire only), ADR-QD-056 (persisted row union and
  `decodeAuditEntry`) and ADR-QD-060 (unversioned `code` removal, v1
  tolerance). It reads ADR-QD-044/045/046/078. `index.yaml` gets an entry.
- **BEH-QD-199** (`25-inspection.md:471`). Correct the stale `code` REQUIREMENT
  (C12). Add REQUIREMENTs for versions, envelope leniency with content
  strictness, and `UnsupportedWireVersion`. Update the signature block (T4, T10).
- **BEH-QD-200** (`:547`). The "neither outcome MUST decode to a `Failed`"
  REQUIREMENT is **reversed** (T1).
- **BEH-QD-NEXT** (`33-audit-pipeline.md`). Persisted rows are re-parsed as
  untrusted by `decodeAuditEntry`, and rows are a closed union of wire versions
  (T2, T7).
- **BEH-QD-187/188** (`24-decision-sink.md`): forwarding's `wireVersion`
  option. **BEH-QD-203** (`27-devtools-timeline.md`): the third drop reason (T8).
- **INV-QD-NEXT-a** (exactly the sent outcome) and **INV-QD-NEXT-b** (same
  record from either version) (T10).
- **Traceability.** Test rows for `SinkCodec`, the fixtures, audit and devtools,
  plus REQ-QD-NEXT in §5 (T9, T10).
- **`spec/overview.md` (gate 13).** Every added, renamed or removed export
  listed in T10 step 6, plus a Change History row.
- **CCR-QD-NEXT** rows in `spec/README.md`. T1 and T2 may each carry their own
  if shipped ahead.
- **Changesets** (T11, T12, T13) with the readers-before-writers instruction.
- **Website.** `apps/website/src/content/docs/docs/packages/audit/capabilities.md`
  (T7), checked by gate 22.
- **Code doc comments.** Delete the GH-01 "Known gap" comment and the
  conflation note. Rewrite `UNKNOWN_SUBJECT`'s doc (v1-only). `DecisionWire.ts:4`
  ("`SinkCodec.ts` embeds it in `SinkRecordWire`'s `decided` field") becomes
  "… in `OutcomeWire`'s `Decided` member". `AuditEntry.ts:13-20` points to
  `decodeAuditEntry`.

## 9. Risks and rollback

| Risk | Detection signal | Mitigation / rollback |
| ---- | ---------------- | --------------------- |
| A deployment skips Phase A and goes straight from ≤ 0.9 to ≥ 0.11. Old readers then reject or silently empty every v2 record. | Devtools panels show only `not-a-record` drops, the aggregator logs 400s, and old audit tooling sees records with no outcome. | The release notes for T11/T12 state the order in bold. Phase B keeps `wireVersion: 1` as the escape. Rollback: set `wireVersion: 1` on every sender. No code change is needed. |
| The v1 codec's field order differs from today, so Phase A's "v1" bytes are not byte-identical. | T0's goldens fail in T5/T6. | Declare `DecisionV1Bytes` fields in `SinkCodec.ts:98-117` order (C14). The goldens block the merge. |
| `Schema.toType` in the v1 `decodeTo` still walks `Policy` twice. | A decode-count test or bench shows 2× walks. Wall-clock regresses on the devtools SSE path. | Fall back to the Effect-level upgrade verified in `probe2` (T5 step 3). |
| Envelope leniency is mistaken for content leniency in a later edit (for example, someone widens the projection to nested objects). | `SinkCodec.test.ts:768-800` and T4's "unknown key inside `decided`/`failed`" tests fail. | These tests are the ADR-QD-002 guard. Mutation gate 16 also kills a mutant that skips the strict decode. |
| `MalformedReason` gaining a member breaks a host's exhaustive `switch`/`Match`. | That host's typecheck fails on upgrade. | This is intended (closed union). The changeset marks it breaking. Rollback: none needed, because the host adds an arm. |
| `AuditTrailPort.write`'s row type change breaks store adapters. | Adapter typecheck fails. | The changeset marks it breaking. Both byte formats share `_tag`, `evaluationId`, `at` and `subjectId`. Adapters that index on those compile unchanged. |
| `UnsupportedWireVersion`'s code collides with another plan's new code (ARCH-03 took `ACL018`). | `Tokens.test.ts:272` injectivity fails. | Assign `ACL0NN` at landing, the same as CCR/ADR numbers. |
| ARCH-09 is not taken, or lands with different operation names. | T5/T6 cannot find "the inbound/outbound operation". | Use §6's fallback. T6 then touches the three senders directly. Record it in the CCR. |
| Pre-0.5 rows carry other legacy differences besides `failed.code`, such as a differently rendered `cause`. | T0 step 3's rendered-cause pin. | If it fails, extend D-15-g's strip list, which needs an explicit decision, or document those rows as unreadable in the ADR. Never loosen nested strictness globally. |
| Rollback of the whole of Phase A. | — | Revert T4–T11. T1 and T2 are independent defect fixes and can stay: no wire bytes changed. v2 bytes were never written by default in Phase A, so no persisted data depends on the reverted code. |

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-05 | — | plan written | Claude (planning agent) |
| 2026-10-05 | T0–T13 | Implemented on `arch/deepening-10` (6b21bc9..fd9cffe), reconciled with ARCH-09: `UnsupportedVersion` is a `DecodeRefusal` member, wire schemas stay private, `decodeAuditEntry` keeps its `Result` shape. Numbering: ADR-QD-903, CCR-QD-904, INV-QD-904/905, REQ-QD-901 (no new BEH: BEH-QD-905 gained requirements; no ACL code). | Claude (implementation agent) |
| 2026-10-05 | T12–T13 | **Deviation, at the user's direction:** Phases B and C, planned as "one minor later" and "two minors later", land in the same release as Phase A. Every writer writes v2 and there is no `wireVersion` option, so in a fleet with separately deployed readers an earlier-release reader refuses v2 records (devtools `not-a-record`, aggregators 400, old `decodeAuditEntry` refusal, old raw-schema readers silently outcome-less). Readers must upgrade before writers; recorded in ADR-QD-903 ("The staged rollout, landed together"), the changeset (in bold) and CCR-QD-904. | Claude (implementation agent) |
| 2026-10-05 | T4, T5 | D-15-c(b) not taken (pure codec, no logger); the v1 upgrade is a pure function, not `Schema.decodeTo` (no measurement — `pnpm bench` is broken on this branch). v2 nests the trace one level deeper, so a trace at the very edge of `MAX_DECODE_DEPTH` is refused where v1 carried it (ADR-QD-903 Consequences). | Claude (implementation agent) |
| 2026-10-05 | T14 | `[~]` deferred to the final integration gate (full `pnpm check`, coverage, Stryker gates 16/17/20/21). Ran instead: typecheck, lint, circular, tstyche, full `vitest run` (113 files, 2837 tests), BDD (32 files, 518), spec gates 9/10/11/12/13/22, example typecheck and tests. | Claude (implementation agent) |
