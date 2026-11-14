---
"@qadi/core": minor
---

`@qadi/core` now exports `WIRE_VERSION`, the record-wire version `encodeSinkRecord` writes, stated once. `WIRE_VERSIONS` (the versions `decodeSinkRecord` reads) and `WireVersion` are derived from it, and `WIRE_VERSIONS`'s type narrows from `ReadonlyArray<2>` to `readonly [2]`, which is source-compatible: every read it answered still type-checks. The bytes on the wire are unchanged.
