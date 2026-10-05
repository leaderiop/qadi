---
"@qadi/core": minor
"@qadi/http": minor
"@qadi/audit": minor
"@qadi/devtools": minor
---

The decision-record codec owns the whole wire in both directions, so every sink makes one call and emits the same bytes (ADR-QD-095, INV-QD-096, INV-QD-097).

- **Four operations.** `encodeSinkRecord(record)` returns `Result<SinkRecordJson, SinkRecordNotEncodable>` and `encodeSinkRecordString(record)` the same as text; `decodeSinkRecord(input: unknown)` and `decodeSinkRecordString(text)` return `Result<SinkRecord, SinkRecordNotDecodable>`. None of them throws. A refusal names its reason and, outbound, the path it was found at: `EncodeRefusal` is `Circular`, `TooDeep`, `NonFinite`, `Unrepresentable`, `Opaque` or `EncodeFailed`; `DecodeRefusal` is `NotJson`, `TooDeep` or `Malformed`. Both errors join `QadiError` (`ACL019`, `ACL020`).
- **Breaking (`@qadi/core`):** `toWire`, `fromWireUnsafe`, `isJsonSafe`, `isRecordJsonSafe`, `encodeRecord`, `encodeRecordSync`, `decodeRecordWire`, `decodeRecord`, `EvaluationErrorSchema` and `SinkRecordWire` are removed. Use `encodeSinkRecord`/`encodeSinkRecordString` and `decodeSinkRecord`/`decodeSinkRecordString`; `SinkRecordJson` is the encoded wire's schema and type. `decisionSinkForwarding`'s `send` receives a `SinkRecordJson`, and a record that cannot be encoded never reaches it: `onFailure` receives the `SinkRecordNotEncodable` (with no `onFailure`, a log line distinct from a send failure's). `QadiError` gains two members, so an exhaustive match over it needs two more arms.
- **Breaking (`@qadi/http`):** `frame`'s failure value is the `SinkRecordNotEncodable`. A refused record drops only its own frame and is reported through the new `DecisionStreamOptions.onRefused`, or a warning naming the refusal, its path and the evaluation. `decisionFrames` (the route's body stream) is exported for tests.
- **Breaking (`@qadi/audit`):** `AuditEntry.record` is now the encoded JSON form (`SinkRecordJson`), so a store persists `JSON.stringify(entry)` as it is and gets exactly the bytes the decision stream and forwarding emit; a store reading `entry.record.failed` as a class instance must change. Read rows back with the new `decodeAuditEntry(input)`, which is depth-guarded and returns `Result<{ entry, record }, SinkRecordNotDecodable>`. `AuditEntryNotEncodable` gains `refusal`, and `reason` is now that refusal as a sentence.
- **Breaking (`@qadi/devtools`):** `MalformedReason` gains `"too-deep"`: a frame nested past the decode bound, which a current sender refuses to emit, so it means an older or foreign sender.

**Wire.** For the same record, decision-stream frames and audit rows now carry an `Error` cause as `{ name, message }` where they used to carry `{}`, matching forwarding byte for byte; any other cause is normalised through `Schema.Defect()` (a cycle dropped, a `bigint` as `"10n"`) instead of being refused. A property whose value is `undefined` now crosses as absent instead of refusing the record. `Decided` records are byte-identical to before.

**Fixed.**

- A resolver `cause` with a reference cycle (an HTTP client's error) or a `bigint` no longer ends every `/__decisions` subscriber's stream.
- Such a `Failed` record no longer reaches an audit store's `JSON.stringify` and throws, so an attribute-store outage no longer trips the audit breaker and drops the healthy rows after it.
- A policy about 5,000 levels deep no longer makes forwarding's encode throw and get reported as a send failure; it is refused as `TooDeep`.
- A record nested past what every receiver decodes (an evaluation under a raised `maxDepth`) is refused at the sender instead of being sent and then refused by every receiver.
- A `Map`, `Set`, `RegExp`, binary array, `URL` or `Error` inside a resource is refused with its path instead of being persisted and streamed as `{}`.
- A deeply nested stored audit row is refused as `TooDeep` by `decodeAuditEntry` instead of dying with a `RangeError`.
