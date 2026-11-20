---
"@qadi/devtools": patch
---

A feed listener that throws no longer stops the others: every listener is called, and then what they threw is rethrown, one value as itself and several as one `AggregateError`.
