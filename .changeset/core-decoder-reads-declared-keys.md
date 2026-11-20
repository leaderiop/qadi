---
"@qadi/core": patch
---

`untrustedDecoder`'s `ignore` projection reads only what the schema declares. It took an in-process value's own entries, which ran every own enumerable accessor, declared or not, before it kept the declared keys, so an undeclared accessor that threw was thrown out of `decodeSinkRecord`, `decodeSinkRecordWithJson` and `decodeStoredRecord`. It now reads the value's own key names, then copies each declared value, reading it once, and never reads an undeclared key's value. A union's `_tag` is read once more, to choose its member, so twice in all; a one-object schema such as the stored envelope chooses no member, so a declared `_tag` is read once, as a kept value, and an undeclared `_tag` accessor is never invoked. Under `refuse`, and below the top level, the depth guard and the decode still read own values, accessors included. The signature and every refusal are unchanged.
