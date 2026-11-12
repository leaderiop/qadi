---
"@qadi/core": patch
---

`DecisionCache.clear` behaves as before: a computation still in flight when it runs never puts its answer back into the emptied cache, an ask made after it computes afresh, and requests already waiting on that computation still get their answer. The rule now lives in the internal single-flight module rather than in the cache.
