---
"@qadi/core": patch
---

Internal: each sink record is projected from its question in one module (`SinkEmit.ts`'s `obligationRecordFor` joins the decision record's projections, so `Qadi.ts` builds no record), and the JSON encode-refusal vocabulary (`EncodeRefusal`, `OpaqueKind`, `UnrepresentableKind`, `WirePath`, `encodeRefusalPath`, `encodeRefusalAnnotations`, `EncodeRefusalAnnotations`, `describeEncodeRefusal`) is declared in its own leaf rather than the sink wire's module, so the remote port wire no longer depends on it. No export, record byte or refusal sentence changed (ARCH-54, ADR-QD-116).
