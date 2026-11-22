---
"@qadi/devtools": minor
---

**Breaking.** `sourceFromEventSource`'s `onMalformed(frame, refusal)` receives `@qadi/core`'s `DecodeRefusal` as decoded, not a word. Each word maps to a tag:

- `not-json` → `NotJson`
- `too-deep` → `TooDeep`
- `not-a-record` → `Malformed`
- `unsupported-version` → `UnsupportedVersion`
- `inconsistent` → `Inconsistent`

`not-a-record` named both a bare record and a record the wire does not describe; both are now `Malformed`. A bare record's `message` is the decoder's own, a missing `environment`, and a record the wire does not describe carries the record decoder's. Match on `refusal._tag`, or show `describeDecodeRefusal(refusal)`.

**Breaking.** `MalformedReason` is removed, with no alias. The default warning keeps its message, `qadi/devtools: a frame was not a decision record`, and is annotated `qadi.refusal` (the tag) instead of `qadi.reason`; a log query filtering on `qadi.reason` filters on `qadi.refusal` by tag.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
