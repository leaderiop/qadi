---
"@qadi/core": minor
---

A projected read now decides against the value it projects. New `enforceLoaded` and `enforceProjectedLoaded` run the wrapped effect, evaluate the policy with the value it produced as the resource, and hand over that same value (whole, or projected); `filterProjected` and `filterStreamProjected` project each admitted item by its own decision (`filter` still returns items whole, now stated). **Breaking:** `enforceProjected` no longer accepts `options.resource` (`LoadedEnforceOptions` types it `never`) — it decided on that record and projected whatever the effect returned, so a mismatched pair leaked fields the decision withheld. A policy that reads the resource belongs on `enforceProjectedLoaded`; one that does not keeps `enforceProjected`. The loader runs before the decision on the loaded entry points, so gate it with `enforce(coarse)` first if a caller with no access must not reach it.
