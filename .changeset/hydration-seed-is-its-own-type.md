---
"@qadi/core": minor
"@qadi/react": minor
"@qadi/devtools": minor
---

**Breaking (`@qadi/react`).** A server-rendered decision is now its own type, not a fabricated `Allow`/`Deny`.

Hydration used to rebuild a seed into a core `Allow`/`Deny`, which needs a trace and a deny reason, so both were made up whenever the server withheld them: a single-node trace with the reason `"hydrated"` (which `<Can fallback={(deny) => deny.reason}>` rendered), and a root of `"AllOf"` for a payload with no trace. A seed is now a `SeededAllow` or `SeededDeny` carrying a tagged `disclosure` (`Withheld`, or `Disclosed` with the server's own trace and reason), and a decision atom holds a `ClientDecision = Allow | Deny | SeededAllow | SeededDeny`.

What changes for you:

- `DecisionResult`, `currentDecision`'s return type and `useDecisionSuspense` now name a `ClientDecision`. `isAllowed` from `@qadi/core` rejects one on purpose; read the verdict with the new `permits`, and tell a seed from this client's own evaluation with `isSeeded`.
- `DeniedNode`'s function receives `Deny | SeededDeny`. A `SeededDeny` has no `reason` or `trace` of its own, so narrow with `isSeeded` before reading either.
- **Fail-closed note.** Code comparing `decision._tag === "Allow"` keeps compiling and now treats a seeded allow as not allowed. That is never a grant — the page may flash again — but it is a behaviour change; move to `permits`.
- `HydrationMismatch.seeded` is a `SeededDecision`.
- The dehydrated payload is `version: 2`, and each entry nests a `decision` derived from `@qadi/core`'s new `DecisionWire`. `hydrateDecisions` still reads the format that predates `version` (typed `DehydratedDecisionsV1`, deprecated, removed in the next minor release), always seeding it `Withheld`. Any other version is dropped as `UnsupportedPayloadVersion`.
- `hydrateDecisions` never throws: a value that is not an envelope is dropped as `MalformedPayload`. A disclosed trace whose root is not the entry's own policy is dropped as `MalformedEntry`.
- `UnregisteredAtoms` is removed from the closed drop-reason union (`ClientHydrationDropReason`, `hydrationDropReasons`), and `UnsupportedPayloadVersion` and `MalformedPayload` are added. An exhaustive `Match` over the reasons stops compiling until it handles them.
- `QadiAtoms` gains `hydrate`, the seeding capability `hydrateDecisions` delegates to. A spread copy or wrapper of an atom set now seeds the same questions its original does, instead of being refused whole.
- `HydrateOptions.onDropped` receives `HydrationDrop<unknown>`: the entries are what failed to decode.

`@qadi/core` gains `DecisionWire`/`DecisionWireAllow`/`DecisionWireDeny`, `encodeDecision`/`decodeDecision` (the decision's wire form, moved out of `SinkCodec` — `SinkRecordWire`'s bytes are unchanged, but a `Deny` without a `reason`, or an `Allow` with one, is now refused on decode instead of being given an invented `"denied"`), `projectVisible` (the body of `project` after its verdict check) and `subjectEquivalence` (the structural subject equality `DecisionCache` already used). `@qadi/react`'s `subject` atom now uses it, so a nested attribute object that is equal by structure no longer re-runs every mounted decision.

`@qadi/devtools` reads the same five hydration metrics unchanged; its drop-reason table follows the new set.
