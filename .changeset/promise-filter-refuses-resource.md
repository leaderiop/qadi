---
"@qadi/promise": minor
---

**Breaking.** `filter` and `filterProjected` take `Omit<FacadeOptions, "resource">`, as `projected` already did: each item is the resource of its own decision, so a second one cannot be written.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
