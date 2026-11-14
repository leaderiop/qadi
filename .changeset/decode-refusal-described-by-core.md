---
"@qadi/core": minor
---

`@qadi/core` now describes a decode refusal itself. `describeDecodeRefusal` gives one bounded sentence per `DecodeRefusal`, saying whose fix it is. `decodeRefusalAnnotations` and its `DecodeRefusalAnnotations` type give the one `qadi.refusal` log key, the refusal's tag and never what was sent. `decodeRefusalOf` turns an untrusted decoder's refusal into the sink wire's vocabulary. `decodeSinkRecordWithJson` returns a record and its JSON form from one strict decode, as `DecodedSinkRecord`. No wire byte and no refusal changes.
