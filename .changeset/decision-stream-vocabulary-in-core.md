---
"@qadi/core": minor
"@qadi/http": minor
"@qadi/devtools": minor
---

**Breaking (`@qadi/http`, `@qadi/devtools`):** the decision stream's protocol words are declared once, in `@qadi/core`. `DecisionStreamEvent` (`"backlog" | "synced" | "message"`), `DecisionRecordEvent` (`"backlog" | "message"`) and `DecisionStreamSynced` are new core exports; `@qadi/http` no longer exports `DecisionFrameEvent` or `DecisionStreamSynced`, and `@qadi/devtools` no longer exports `DecisionEventName`. Migration: import `DecisionRecordEvent`, `DecisionStreamSynced` and `DecisionStreamEvent` from `@qadi/core`. `DecisionStreamSynced` now refuses a `backlog` that is not a non-negative integer. The bytes on the wire are unchanged (ADR-QD-097 amendment).
