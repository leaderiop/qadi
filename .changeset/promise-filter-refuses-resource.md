---
"@qadi/promise": minor
---

**Breaking.** `filter` and `filterProjected` refuse `resource` in their options (`Omit<FacadeOptions, "resource">` with `resource?: never`, so a `FacadeOptions` variable is refused too), as `projected` does: each item is the resource of its own decision, so a second one cannot be written.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
