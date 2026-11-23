---
"@qadi/http": minor
---

**Breaking.** `SignatureHistoryUnavailableResponse` and `DecisionHistoryUnavailableResponse` carry `subjectId` and `event` only when the error has them, following `@qadi/core`'s optional members, so a client that reads either member unconditionally finds it absent for a request the port's key refused.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
