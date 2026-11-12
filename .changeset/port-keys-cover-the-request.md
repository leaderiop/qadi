---
"@qadi/core": minor
"@qadi/devtools": patch
---

A port's request key now covers every argument the port receives, and two requests share a key exactly when every argument is `Equal.equals` (ADR-QD-094, ARCH-65). `relationshipResolverPort.key` includes the clamped `depth`, and `customPredicatePort.key` includes the resource and the whole subject (roles, permissions, attributes). Devtools' capture and replay no longer answer a depth-1 relationship ask with a depth-3 capture, a custom predicate on one resource with another resource's answer, or a what-if that dropped a role with the answer given to the original subject (a stale allow).

The key is no longer JSON text. JSON keyed a `Date` like its ISO string, `NaN` and `±Infinity` like `null`, `{ a: undefined }` like `{}`, a `Set` like an array and a `Map` like its entry pairs, and threw on a bigint or a cycle, so a replay or a `replyTable` could answer one question with another's answer. Every port now keys through one kind-tagged, deterministic, stack-safe encoding that agrees with `Equal.equals` (the identity `Question` and `DecisionCache` already used) over primitives, `Date`, `RegExp`, arrays, plain objects, `Set` and `Map`; a subclass of one of those containers keys as its base class. One limit: an object marked `Equal.byReference` keys by its structure, because a replay cannot preserve identity.

**Breaking:** `PortDescription.key` returns `Result<string, KeyRefusal>` instead of `string`. A request holding a value outside the domain (a cycle, a function, a symbol, a throwing getter, a value that implements `Equal` itself, any other class instance) is refused with a typed `KeyRefusal` (`Circular | Unkeyable | Unreadable`, with the path where it sits) instead of throwing or colliding. Every key's text changes, and `CapturedAnswers` maps key with them; no key was ever persisted or sent on a wire, so nothing needs migrating. Migration: match the `Result` (`Result.match(port.key(args), { onSuccess, onFailure })`) and use the success text as a map key, never the `Result` itself.

New: `KeyRefusal`, `UnkeyableKind` and `describeKeyRefusal` (one sentence per refusal).

`replyTable` matches a request by its key's text; a request whose key is refused fails with the port's own typed error (cause: `describeKeyRefusal`) and is never answered from the table, and an entry whose key is refused is left out. `signatureHistoryFromSignatures` fails a refused query with `SignatureHistoryUnavailable` instead of answering an empty list.

The key text changed again for four ports (ARCH-69, ADR-QD-133): `attributeResolverPort`, `relationshipResolverPort`, `decisionHistoryPort` and `signatureHistoryPort` now key as `canonicalKey` over their wire question, derived by `makePortDescription` rather than listed by hand, so a field the question carries can no longer be left out of the key. `customPredicatePort`'s key is unchanged. The text is in-process only, so nothing needs migrating; `PortDescription`'s type is unchanged.
