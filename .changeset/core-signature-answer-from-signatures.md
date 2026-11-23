---
"@qadi/core": minor
---

**Breaking.** `ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput` are removed: `decisionHistoryFromEvents` keys its rows through `decisionHistoryPort.key`, so nothing reads the classes, and `ActedAnywhereInput` typed only `ActedAnywhere`. Nothing replaces them for a host, which keys its own history set with `decisionHistoryPort.key` too; `ActedEventInput` stays. `SignatureHistoryUnavailable.subjectId` and `DecisionHistoryUnavailable.event` are optional, absent exactly when a request the port's key refuses held a value the member's schema refuses, so a sink record carrying either error may omit it and a decoder accepts it absent. `decisionHistoryFromEvents` fails a row or a request the key refuses with `DecisionHistoryUnavailable`, where it had answered `"NotActed"` or thrown, and `signatureHistoryFromSignatures` fails a refused request with `SignatureHistoryUnavailable`, where the read died.

`signatureAnswerFromSignatures` and `actedAnswerFromEvents` answer what the signature and history fixture ports, read for a leaf at a site over fixture rows, answer, as a `Result` with no Effect. Each fixture's layer and its judgement read one lookup, so they cannot answer differently.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
