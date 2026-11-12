---
"@qadi/core": patch
---

A sink record's fields are stated once (ARCH-71, ADR-QD-135). `DecisionRecord` and `ObligationRecord` listed their fields in five places (the class, the version-2 wire struct, `project`, `rebuild` and its hand re-application of the id brands), and a field dropped from `project` or `rebuild` compiled. Each record's fields are now one `Schema.Struct` in a package-private module; the record class's type and the wire struct both derive from it, so `encodeSinkRecord` only adds `version` and `decodeSinkRecord` only strips it. `failedRecord` and `decidedRecord` (internal) are one `decisionRecordFor`, and `SinkRecordTag` is derived from the record tags.

The wire is unchanged: the version-2 bytes are identical, no version moved, and no exported name was added or removed. `DecisionRecord`, `ObligationRecord`, `ObligationOutcome` and `CacheOutcome` keep their names, modules and types.

One thing a sink can see: a `DecisionRecord` that `evaluate` emits now omits an absent `resource`, `action` or `cache` instead of carrying it as an `undefined`-valued own key (`ObligationRecord` already did). `record.action` still reads `undefined`; only `Object.hasOwn(record, "action")`, key enumeration, or `Equal.equals` against a record built with an explicit `undefined` can tell. A record `evaluate` emits is now `Equal` to its own round trip through `decodeSinkRecord`.

A small record's `encodeSinkRecord` is 5 to 10 percent slower (0.2 to 0.4 us), from spreading the record in the projection; evaluation and large-policy encodes do not move.
