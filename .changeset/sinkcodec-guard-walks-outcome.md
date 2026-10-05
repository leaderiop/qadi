---
"@qadi/core": patch
---

A decision record whose resolver error carries a circular or `BigInt` cause, or whose resource holds a `Map`, `Set`, `RegExp` or binary array, is now refused by `isRecordJsonSafe` instead of crashing the decision stream for every subscriber, or poisoning the audit store and tripping its circuit breaker. The guard used to walk `resource` and `policy` only. A plain `Error` cause is still accepted.
