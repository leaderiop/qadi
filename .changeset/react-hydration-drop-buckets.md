---
"@qadi/react": patch
---

Hydration's drop reports are now derived from where each dropped entry is collected, on both the hydrate and the dehydrate side, so a drop reason `@qadi/core`'s table gains no longer compiles in `@qadi/react` until it is collected and reported, and a whole-payload reason until what raises it is stated; the events a page sees, their order and their counts are unchanged.
