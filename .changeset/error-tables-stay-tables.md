---
"@qadi/core": patch
---

Internal: the record wire's vocabulary (`EncodeRefusal`, `DecodeRefusal`, `OpaqueKind`, `UnrepresentableKind`, `WirePath`, `SinkRecordTag`, `WireVersion`, `WIRE_VERSIONS` and the readings of an `EncodeRefusal`) is declared in its own module instead of `Errors.ts`; no export changed (ADR-QD-102).
