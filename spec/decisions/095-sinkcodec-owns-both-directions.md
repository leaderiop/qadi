# ADR-QD-095 — SinkCodec owns both directions of the record wire

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-902                                   |
> | Revision       | 1.3                                            |
> | Effective Date | 2026-10-05                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.3 (2026-10-07): the refusal vocabulary and the three readings of an `EncodeRefusal` move to the leaf `SinkWire.ts` (ARCH-27, CCR-QD-194)<br>1.2 (2026-10-07): D-09-e gains a third reporter: the audit pipeline logs or calls `onRefused`; core owns the path, the annotations, the sentence and the hook containment (CCR-QD-193)<br>1.1 (2026-10-07): the inbound side refuses a non-finite `at` and a non-integer `sequenceNumber` (CCR-QD-186) |

---

## Context

A `SinkRecord` leaves a process on four paths — `decisionSinkForwarding`'s `send`,
`@qadi/http`'s `/__decisions` stream, `@qadi/audit`'s `encodeAuditEntry`, and the
example app's edge and backlog routes — and enters on two, `@qadi/devtools`'
`Source` and the example aggregator. `SinkCodec.ts` exported the parts — a
projection (`toWire`), a guard (`isJsonSafe`, `isRecordJsonSafe`), a schema encode
(`encodeRecord`, `encodeRecordSync`), a decoder (`decodeRecordWire`, `decodeRecord`)
and an unvalidated rebuild (`fromWireUnsafe`) — and each caller assembled a
different subset. ARCH-09 verified, at `e0ee958`:

- **C3.** An `Error` cause crossed as `{name, message}` on forwarding (the only path
  running a schema encode, so the only one `Schema.Defect()` governed) and as `{}`
  on the stream, the audit row and the example route.
- **C4.** The guard walked `resource` and `policy`, never the outcome. A resolver
  `cause` with a reference cycle — the shape an axios-style HTTP client error has —
  passed it and threw out of the stream's framing, ending **every** subscriber's
  connection. A `bigint` cause did the same.
- **C5.** The same throw at an audit store's `JSON.stringify` counted as a write
  failure: five poisoned records tripped the breaker, and the healthy record after
  them was dropped. During an attribute-store outage the trail stopped recording
  the decisions that did succeed.
- **C6.** `encodeRecordSync` was documented as "provably total" and threw on a
  policy about 5,000 levels deep; forwarding then reported the encode failure to
  `onFailure` as though `send` had failed.
- **C7.** The inbound decode refused anything nested past `MAX_DECODE_DEPTH` (256);
  nothing outbound checked it, so an evaluation under a raised `maxDepth` emitted
  records every receiver refused.
- **C8.** The guard accepted `Map`, `Set`, `RegExp` and binary arrays, which
  `JSON.stringify` renders as `{}`: `{ tags: new Set(["finance"]) }` reached the
  audit trail as `{ tags: {} }`.
- **C9.** `@qadi/audit` had no guarded reader; decoding a stored row with the schema
  alone died with a `RangeError` on a deeply nested policy.
- **C12.** Seven earlier patches touched this pipeline, each fixing one caller.

## Decision

**`SinkCodec.ts` exports two operations, each with a value form and a text form, and
nothing else; the guard, projection, schema encode, depth bound and rebuild are its
implementation.** Every adapter makes one call and keeps only what is its own: where
the bytes go and how a refusal is reported.

| Decision | Chosen |
| -------- | ------ |
| D-09-a — interface | Four pure functions returning `Result`: `encodeSinkRecord` (→ `SinkRecordJson`), `encodeSinkRecordString`, `decodeSinkRecord` (`unknown` →), `decodeSinkRecordString`. `SinkRecordJson` is `Schema.toEncoded` of the one wire schema. No `Effect`, so no span per record and no `Effect.fn` owed; Effect callers use `Effect.fromResult` |
| D-09-b — refusal types | `SinkRecordNotEncodable` and `SinkRecordNotDecodable`, `Data.TaggedError`s in `Errors.ts` (which cannot import `SinkCodec.ts` without a cycle), each carrying a closed `Data.TaggedEnum`: `EncodeRefusal` (`Circular`, `TooDeep`, `NonFinite`, `Unrepresentable`, `Opaque`, `EncodeFailed`) and `DecodeRefusal` (`NotJson`, `TooDeep`, `Malformed`). Both join `QadiError` with stable codes (`ACL019`, `ACL020`, branch-local numbering). `SinkRecordTag` restates `SinkRecord["_tag"]`, pinned equal by a type test |
| D-09-c — what outbound refuses | One iterative walk over the *encoded* output, with the path reconstructed only on a hazard: a cycle, depth past `MAX_DECODE_DEPTH` counted as `exceedsJsonDepth` counts, `NaN`/`±Infinity`/invalid `Date`, a function, symbol, `bigint` or `undefined` array element, an enumerable symbol key, and any object whose brand is not `Object`/`Array`/`Date` or that has its own `toJSON`. An `undefined` property is absence. Two pre-checks (`policyDepth`, which throws on a cycle, and a bounded trace depth) keep the encode itself from overflowing; the encode and the walk run under `Result.try`, so a throw is an `EncodeFailed` refusal |
| D-09-d — the audit row | `AuditEntry.record` is `SinkRecordJson`, the encoded wire, so `JSON.stringify(entry)` is the bytes the stream and forwarding emit. `decodeAuditEntry(input)` returns `Result<{ entry, record }, SinkRecordNotDecodable>`, reading the record through the depth-guarded `decodeSinkRecord` first |
| D-09-e — reporting | Forwarding: `onFailure` receives the `SinkRecordNotEncodable`, else a log line "could not be encoded for forwarding". SSE: `DecisionStreamOptions.onRefused`, else "could not be framed". Both annotate `qadi.refusal`, `qadi.path`, `evaluationId`. Audit: `AuditEntryNotEncodable` gains `refusal`, and `reason` is that refusal as a sentence |
| D-09-f — devtools | `MalformedReason` is the closed union `"not-json" \| "too-deep" \| "not-a-record"`, mapped from `DecodeRefusal` by a module-scope `Match.tagsExhaustive` |
| D-09-g — a hotfix first | Yes: a patch walked the resolver `cause` and refused opaque built-ins in the old guard (CCR-QD-178), then the refactor replaced the guard |

**A cause is never a reason to refuse.** `Schema.Defect()` now governs `cause` on
every outbound path: an `Error` keeps `name`/`message`/`cause`, a cycle is dropped, a
`bigint` becomes `"10n"`, a non-finite number `null`. A cause is diagnostic, and
refusing a whole `Failed` record because of it would lose the outage record an
operator most wants.

**Inbound is the seam for the wire's shape.** The outcome's neither/both fallbacks
(tickets 96, 155) moved behind `decodeSinkRecord` unchanged and are pinned there
through hand-written JSON, so a change to the outcome shape, or a wire version
check (a `DecodeRefusal` variant, added as a full-union edit), is one module's edit.

## Consequences

**Positive.**

- One wire on every path: for one record, an audit row's `record`, a frame's data
  and forwarding's `send` value are the same bytes (pinned by a test). `Decided`
  records are byte-identical to before (the `1caf04c` golden literals).
- Two invariants the interface carries: what the outbound operation emits, the
  inbound operation accepts, up to the named normalisations
  ([INV-QD-096](../invariants.md#inv-qd-096-whatever-the-record-codec-emits-it-accepts));
  and neither direction throws, so one record never ends a feed, fails a decision
  or trips a breaker ([INV-QD-097](../invariants.md#inv-qd-097-the-record-codec-is-total)).
- C3–C9 closed at their cause, not per caller; a future field is covered because
  the walk reads what the encode emitted.

**Negative.**

- **Cost per record** (`packages/core/bench/SinkCodec.bench.ts`, measured three times
  on one heavily loaded machine on 2026-10-05; per-call minimum, which is the
  figure least disturbed by load). Against the old paths, the new outbound
  operation costs about **1.8–1.9×** forwarding's old schema encode (one node:
  1.6 → 3.0 µs; `allOf`×64: 36–37 → 69–71 µs; a `Failed` record with a 20-key
  resource: 1.8 → 3.0–3.3 µs) and **2–3.7×** the stream's old path, which ran no
  schema encode at all (1.0 → 3.7 µs; 30 → 89–91 µs; 2.1–2.2 → 4.2–4.3 µs). The
  stream's cost more than doubles; that is accepted because framing runs on each
  subscriber's fiber, after `decisionSinkFeed` has published synchronously, so it
  is off the decision path. Forwarding's runs inside the evaluation — about 35 µs
  more on a 64-deep policy, about 1.5 µs on a one-node one. The walk reads arrays
  and plain objects without allocating entry pairs or a brand string; before that
  change the `allOf`×64 ratios were 3.4× and 4.6×.
- **Breaking, 0.x minors.** `@qadi/core` removes `toWire`, `fromWireUnsafe`,
  `isJsonSafe`, `isRecordJsonSafe`, `encodeRecord`, `encodeRecordSync`,
  `decodeRecordWire`, `decodeRecord`, `EvaluationErrorSchema` and `SinkRecordWire`;
  `send` takes `SinkRecordJson`; `QadiError` gains two members. `@qadi/http`'s
  `frame` fails with `SinkRecordNotEncodable`. `@qadi/audit`'s `AuditEntry.record` is
  the encoded JSON form, so a store reading `entry.record.failed` as a class
  instance must change. `@qadi/devtools`' `MalformedReason` gains a member.
- **The `undefined`-property loosening.** `{ deletedAt: undefined }` in a resource
  used to be refused; it now crosses with the key absent, which every reader
  already treated the same as `undefined`.
- **New refusals.** A resource holding a `Set`, `Map` or `URL` used to persist
  silently as `{}`; it is now refused with its path. A record from an evaluation
  with `maxDepth` above roughly 127 over nested `allOf`/`anyOf` is refused at the
  sender as `TooDeep` — every receiver already refused it. Raising
  `MAX_DECODE_DEPTH` would be its own decision, tied to the stack bound.

## Alternatives considered

- **The same four returning `Effect`.** `yield*`-able, but owes `Effect.fn` and a
  span per record under AGENTS.md §5, and turns the stream's synchronous `Filter`
  into an effectful one on every frame for a codec that performs no effects.
- **A value-only pair.** Two names, but the stream keeps its own `JSON.stringify` and
  devtools its own parse — the per-caller pieces this decision removes.
- **Keep `isRecordJsonSafe` and add the outcome.** The hotfix (D-09-g) did exactly
  that; on its own it leaves `cause` as `{}` on two paths, the depth asymmetry (C7)
  and the encode overflow (C6), and the next field is missed again.
- **A literal round-trip check** (`JSON.parse(JSON.stringify(x))` compared to `x`).
  The most literal test, at about three times the cost, with no cheap path to name,
  and still needing the cycle and depth pre-checks to avoid throwing.
- **A store-side `Schema.encode` step for audit rows.** No type change, but every
  store must remember a step BEH-QD-250's prose already assumed was
  `JSON.stringify` — the per-caller pattern moved into user code.

> **Amended 2026-10-07 (CCR-QD-186).** The inbound side refuses what the outbound
> walk already refuses: `at` decodes as a finite number, so a stored `1e400`
> (which `JSON.parse` reads as `Infinity`) is `Malformed`, and an audit row's
> `sequenceNumber` is an integer, declared once for the row schema and the row
> decode. No encoder ever emitted either, so wire version 2 is unchanged
> (ADR-QD-096) and no valid row is refused.

> **Amended 2026-10-07 (CCR-QD-193, ARCH-25).** D-09-e named two reporters and left a
> third silent: `AuditDecisionSinkLive` built `AuditEntryNotEncodable.reason` and
> discarded it, recording only the `encode_failed` counter, so a refused record had
> no audit row and no `evaluationId` anywhere. It is a reporter now: its options
> gain `onRefused`, else a warning "could not be encoded for the audit trail", with
> the same three annotations. And no adapter re-derives a refusal's meaning: the
> path (`encodeRefusalPath`, a `Match.tagsExhaustive`, replacing three
> `"path" in refusal.refusal` checks that a new variant would have passed
> silently), the annotations (`encodeRefusalAnnotations`: `qadi.refusal`,
> `qadi.path`, `evaluationId`, never a value from the record, INV-QD-104), the
> sentence (`describeEncodeRefusal`, moved from `@qadi/audit` and byte-identical)
> and the hook-or-log choice (`reportEncodeRefusal`) are read through `@qadi/core`,
> and `no-refusal-annotation-outside-core` in `scripts/check-house-style.mjs`
> refuses the restated literals. Each adapter keeps its own message and its own
> hook, as D-09-e requires. A hook that throws is contained and logged
> ("an encode-refusal hook threw", with `qadi.cause`), never a defect: the stream
> and the backlog route previously ran it uncontained, so one throwing `onRefused`
> ended the feed and emptied the backlog response (INV-QD-097).
> `AuditEntryNotEncodable` gains `evaluationId`. `Errors.ts` still imports no
> `Effect` (ADR-QD-037): the three pure readings sit beside `EncodeRefusal` and
> the reporter is the new `EncodeRefusalReport.ts`.

## Related

Amends [ADR-QD-045](./045-the-topology-is-a-choice-of-sink.md) (`send` receives a
verified `SinkRecordJson`; an encode refusal reaches `onFailure`, never `send`),
[ADR-QD-046](./046-a-decision-feed-is-sse-and-guarded.md) (one record never ends the
feed; a refused record is reported),
[ADR-QD-056](./056-audit-companion-package.md) (an audit row carries the encoded
wire; `decodeAuditEntry` is the guarded reader) and
[ADR-QD-060](./060-schema-taggederror-for-the-nine-wire-crossing-errors.md)
(`Schema.Defect()` governs `cause` on every outbound path). Reads
[ADR-QD-002](./002-schema-derived-policy-adt.md),
[ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md),
[ADR-QD-054](./054-a-companion-package-may-compile-a-dialect.md),
[ADR-QD-078](./078-a-seed-is-its-own-type-and-the-payload-is-versioned.md),
[ADR-QD-090](./090-a-tree-is-folded-through-one-seam.md).
[INV-QD-096](../invariants.md#inv-qd-096-whatever-the-record-codec-emits-it-accepts),
[INV-QD-097](../invariants.md#inv-qd-097-the-record-codec-is-total);
[BEH-QD-187](../behaviors/24-decision-sink.md),
[BEH-QD-199](../behaviors/25-inspection.md),
[BEH-QD-200](../behaviors/25-inspection.md),
[BEH-QD-204](../behaviors/27-devtools-timeline.md),
[BEH-QD-250](../behaviors/33-audit-pipeline.md),
[BEH-QD-311](../behaviors/26-decision-stream.md#beh-qd-311-one-record-never-ends-the-feed-and-a-refused-one-is-reported),
[BEH-QD-312](../behaviors/33-audit-pipeline.md#beh-qd-312-a-stored-row-is-read-back-through-a-guard).

> **Amended 2026-10-07 (CCR-QD-194, ARCH-27).** D-09-b's reason for declaring the
> refusal types in `Errors.ts` ("which cannot import `SinkCodec.ts` without a
> cycle") still holds, but it did not need the vocabulary to live there. `EncodeRefusal`,
> `DecodeRefusal`, `OpaqueKind`, `UnrepresentableKind`, `WirePath`, `SinkRecordTag`,
> `WireVersion`, `WIRE_VERSIONS` and the three pure readings of an `EncodeRefusal`
> (`encodeRefusalPath`, `encodeRefusalAnnotations`, `describeEncodeRefusal`) are
> now declared in the leaf `SinkWire.ts`, which imports only `effect`, so both
> `Errors.ts` and `SinkCodec.ts` import it (ADR-QD-037, `pnpm circular` clean).
> `SinkRecordNotEncodable` and `SinkRecordNotDecodable` stay in `Errors.ts` with
> the rest of `QadiError`; the barrel exports every moved name, so no export changed.
