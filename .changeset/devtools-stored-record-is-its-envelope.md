---
"@qadi/devtools": minor
---

**Breaking.** `ingest(timeline, stored)` takes `@qadi/core`'s `StoredRecord` envelope, and a `Source`'s backlog and live stream carry envelopes, so code that built a flat record for them builds `new StoredRecord({ environment, record })` instead. The timeline's rows and `entryKey` are unchanged.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
