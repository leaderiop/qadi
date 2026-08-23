---
"@qadi/core": minor
"@qadi/react": minor
---

Six questions the library could pose and could not answer.

Each was data it already computed and threw away, or a comparison nothing
implemented. All six were found by auditing a devtools design against the code;
none of them are devtools features, which is why they live in `@qadi/core`.

**`policyDepth(policy)`** — `maxDepth` is an evaluation input, so nothing on a
policy recorded how deep it was, and a caller bounding untrusted decoded input
had to re-walk the tree and guess at the convention. It counts the way the
evaluator counts, so `policyDepth(p) <= n` holds exactly when
`evaluate(p, { maxDepth: n })` does not raise — asserted against `evaluate` in
both directions, because a depth under-reported by one would declare safe
precisely the input a caller meant to reject.

**`permissionProvenance(role)`** — `flattenPermissions` holds the granting
role's name in its own closure and calls `keys.add` without it, so "inherited via
viewer" was unanswerable. Kept a separate function because the flatten runs
inside `makeSubject`, once per subject; the two are held in agreement instead, so
a screen cannot show a different permission set from the one that decides.

**`diffTraces` / `flippedAt`** — "which node flipped the verdict" had no
implementation at all; `isMismatch` compares verdicts and names nothing.
Differences are addressed by path, ordered parents-first, and a shape divergence
from short-circuiting is reported rather than descended past.

**`getOrCompute` reports its outcome**, and a `DecisionRecord` carries it. Cache
hit/miss was a process-global frequency shared by every cache in the process, so
an operator could see a rate and never learn about the decision in front of them.
Absence and `"miss"` are kept distinct: one says nothing was consulted, the other
says the cache was asked and did not have it. This does not weaken INV-QD-025 —
a hit still decides identically; only what an observer is told changed.

**Breaking**: `DecisionCacheShape.getOrCompute` returns `CacheLookup`
(`{ trace, outcome }`) rather than a bare `Trace`. Only custom `DecisionCache`
implementations are affected.

**`DecisionCacheShape.clear`** — a cache could be emptied only by discarding its
layer scope, which a tool running inside that scope cannot do. In-flight work is
left alone: those fibers are answering questions asked before the flush.

**`resolveRoleGraph` reports unknown parents.** The lenient drop is right and
stays — a partial catalogue is a normal deployment state, and failing closed
would deny everything rather than granting less. The silence was the defect: a
typo in one parent name granted fewer permissions than its author wrote, with
nothing said at any level. Reported once per resolve with every missing name, at
warning level or through `onUnknownParent`.

**`@qadi/react` threads the seeded evaluation id into its re-check.** The
mechanism shipped alongside `DecisionSink` and nothing used it, so a hydrated
decision and its client re-check still could not be joined. Read with `get.once`,
so the re-evaluation does not gain a dependency on the seed — the id is
correlation metadata, not an input to the decision.

See BEH-QD-189–194, INV-QD-037, INV-QD-038.
