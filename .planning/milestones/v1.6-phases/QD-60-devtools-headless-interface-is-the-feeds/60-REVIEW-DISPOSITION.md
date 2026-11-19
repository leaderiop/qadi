# Phase 60: Review Disposition

| Iteration | Critical | Warning | Info | Outcome |
|-----------|----------|---------|------|---------|
| 1 | 0 | 3 | 4 | All seven fixed in `fix(60)` commits `2a71ccc3..caa3d0e9`. The README example reports each feed's state at once. `TimelineFeed.configure` is a no-op after its scope closes (RED test first). Every `Cause.pretty` reason carries the trust-boundary note. The packed probe proves a read. Mutation evidence was redone (`7c2cca54`). |
| 2 | 0 | 2 | 3 | All five fixed in `00729ec2`. BEH-QD-638 and the overview stop over-promising; the reused id TF20 became TF24; listener notes. Mutation evidence redone (`30c37544`). The scan now dates evidence by either file one run writes (`4afc44b2`). |
| 3 | 0 | 3 | 1 | All four fixed in `18059863`. BEH-QD-638 states a throwing release is swallowed. The README names every throw path. The poll's three refusal pins can now fail (`Params<F>`, proven by a deliberate break). The gates example reports both halves. Mutation evidence redone after the fix. |

Iteration 3 is `--auto`'s cap. No critical or warning finding is open.

**Deferred, with reasons. These are owner follow-ups:**

- **Isolating a throwing `subscribe` listener**, along with the related `try`/`finally` around the publish between `begin()` and `fork()`. This is the security audit's UF-2 and iterations 1 to 3's WR-03/WR-02.
  - `ExternalStore.notify` does not isolate listeners. A throwing listener escapes the publisher and can leave a feed's status wrong with nothing running.
  - The fix changes `ExternalStore`, which the React dock shares, and CONTEXT puts the dock's behaviour out of scope.
  - The docs now state the rule (a listener must not throw) and every consequence.
- **`packages/core/test/DecisionLog.tst.ts:30`** may carry the same pin shape that cannot fail (iteration 3's note). It is outside this phase.
