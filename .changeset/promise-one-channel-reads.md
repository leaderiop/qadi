---
"@qadi/promise": minor
---

`Qadi` gains `projected(subject, policy, record)` and `filterProjected(subject, policy, items)`: the record is the resource, so a resource-reading policy decides against exactly what is returned projected. `projected` rejects `AccessDenied` on a denial. Both forward `@qadi/core`'s `enforceProjectedLoaded` and `filterProjected` with no branch of their own.
