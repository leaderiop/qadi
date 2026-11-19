---
"@qadi/http": minor
---

**Breaking.** The decision routes take a `DecisionLogReader`, whose element type is `@qadi/core`'s `StoredRecord`, now `{ environment, record }`: a reader built from flat records no longer typechecks. No `@qadi/http` source changed, and the bytes the routes write are the same.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
