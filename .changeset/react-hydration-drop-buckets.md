---
"@qadi/react": patch
---

Hydration's drop reports are now derived from where each dropped entry is collected, on both the hydrate and the dehydrate side, so a drop reason `@qadi/core`'s table gains no longer compiles in `@qadi/react` until it has a bucket, every bucket is reported and counted, and a whole-payload reason does not compile until what raises it is named (no type checks that code drops anything under a reason); the events a page sees, their order and their counts are unchanged.
