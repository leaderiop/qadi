---
"@qadi/core": patch
---

`DecisionCache.getOrCompute` no longer computes a key twice when a fiber is preempted between its hit check and its claim while the key's owner finishes. The hit check, the join and the claim are now one synchronous step. Before, the key was appended to the FIFO insertion order twice, so a later eviction removed a freshly recomputed entry and `capacity` was violated in spirit. Reproduced under a lowered `MaxOpsBeforeYield`; not observed at the default budget.

`DecisionCache` no longer hands an interruption to a request that was never cancelled (#64). When every caller waiting on a shared computation had gone and a port was holding that computation in an uninterruptible region, a new request for the same question could join it and receive the interruption meant for the callers who left. A computation everyone has left is now dropped in the same step, so a new request starts its own, and the dropped computation's result is never cached. The last caller to leave still waits for the port's uninterruptible region to end, as before.
