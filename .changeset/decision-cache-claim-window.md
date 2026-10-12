---
"@qadi/core": patch
---

`DecisionCache.getOrCompute` no longer computes a key twice when a fiber is preempted between its hit check and its claim while the key's owner finishes. The hit check, the join and the claim are now one synchronous step. Before, the key was appended to the FIFO insertion order twice, so a later eviction removed a freshly recomputed entry and `capacity` was violated in spirit. Reproduced under a lowered `MaxOpsBeforeYield`; not observed at the default budget.
