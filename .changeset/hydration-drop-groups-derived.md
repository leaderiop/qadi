---
"@qadi/react": patch
---

`PayloadRefusalReason` and `EntryDropReason` are now read off `@qadi/core`'s drop-reason table with `HydrationDropReasonOf` instead of being written out. Their members are unchanged, and a new per-entry reason in core does not compile until the engine has a bucket for it.
