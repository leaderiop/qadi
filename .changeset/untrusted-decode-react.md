---
"@qadi/react": minor
---

**Breaking.** `PayloadRefusalReason` gains `PayloadTooDeep`: a hydration payload nested past `MAX_DECODE_DEPTH` outside its entries (an extra key, a field or an array payload holding such a value) is now dropped as `PayloadTooDeep`, where it was `MalformedPayload`. A payload that is shallow but malformed is still `MalformedPayload`, and an entry or policy nested too deep is still `EntryTooDeep`.

Migration: handle `PayloadTooDeep` in any exhaustive reading of a payload refusal's `reason` (an `onDropped`-style hook or a `Match.tagsExhaustive`); treat it as `MalformedPayload` unless you want the distinction.
