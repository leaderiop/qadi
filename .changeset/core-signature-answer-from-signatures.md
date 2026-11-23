---
"@qadi/core": minor
---

**Breaking.** `ActedEvent`, `ActedAnywhere` and `ActedAnywhereInput` are removed: `decisionHistoryFromEvents` keys its rows through `decisionHistoryPort.key`, so nothing reads the classes, and `ActedAnywhereInput` typed only `ActedAnywhere`. Nothing replaces them for a host, which keys its own history set with `decisionHistoryPort.key` too; `ActedEventInput` stays. `SignatureHistoryUnavailable.subjectId` and `DecisionHistoryUnavailable.event` are optional, absent exactly when the request held a value the member's schema refuses (a subject id or an event that is not a string), whether or not the port's key refuses it, and the cause is the refusal's sentence when the key refuses the request and the store's own cause when it admits it, so a sink record carrying either error may omit it and a decoder accepts it absent. `decisionHistoryFromEvents` fails a row or a request the key refuses with `DecisionHistoryUnavailable`, where it had answered `"NotActed"` or thrown, and `signatureHistoryFromSignatures` fails a refused request with `SignatureHistoryUnavailable`, where the read died. A `null` or `undefined` row, a getter that throws and a proxy whose trap throws fail the same way in both fixtures, and in both judgements for a site's subject or resource, each with a cause that names the field and what was thrown, where each had thrown out of the fixture.

`signatureAnswerFromSignatures` and `actedAnswerFromEvents` answer what the signature and history fixture ports, read for a leaf at a site over fixture rows, answer, as a `Result` with no Effect. Each fixture's layer and its judgement read one lookup, so they cannot answer differently.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
