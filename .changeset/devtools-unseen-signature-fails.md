---
"@qadi/devtools": minor
---

**Security fix:** a what-if replay no longer decides from a request its capture never saw, on any port. Before, a replay miss on `AttributeResolver`, `RelationshipResolver`, `DecisionHistory` or `CustomPredicate` answered the port's fail-closed default (`undefined`, `Unknown`, `Unknown`, `false`). That denied the leaf that asked, so under `not(...)` it became an allow the real store might not give. A miss now fails with the port's own typed error (`AttributeResolveError`, `RelationshipResolveError`, `DecisionHistoryUnavailable`, `CustomPredicateError`), under the leaf and under its negation alike, with a cause that says the request was not captured (ADR-QD-129). A port added to `@qadi/core`'s registry fails closed on a miss with no edit.

`SignatureHistory` already did this: a `hasSignature` node's `meaning` and `signerRole` are part of the signature request key, so a what-if that edits either asks a request the capture cannot answer. The empty list it used to answer denied `hasSignature` but granted `not(hasSignature(...))`; that request fails as `SignatureHistoryUnavailable`.

A request whose key `@qadi/core` refuses (a function or circular custom-predicate param, for example) is passed to the live port unrecorded during a capture, and fails with the port's typed error on replay.

What you will see: a Snapshot replay of a partial capture shows a failed row, "not captured", for every question the live run did not ask, where it used to show a decision.
