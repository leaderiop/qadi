---
"@qadi/core": minor
---

**Breaking.** `untrustedDecoder(schema, options)` takes a required options object, and its `unknownKeys` is required: `UnknownKeyPolicy`, a new export, is `"refuse" | "ignore"`. It says what the decoder does with a top-level key its schema does not declare. A call that passed no options passes `{ unknownKeys: "refuse" }`, and one that passed `unwalked` or `prepare` adds `unknownKeys: "refuse"` beside it; either keeps every answer it gave. `"ignore"` is for a decoder whose input is a versioned envelope that a newer producer may extend.

A record (`decodeSinkRecord`, `decodeSinkRecordString` and `decodeSinkRecordWithJson`), and so an audit row or an archive entry that carries one, whose record has an unknown top-level key nested past the decode bound now decodes. It was `TooDeep`. With `version: 3` it is `UnsupportedVersion`. An unknown key inside the policy is still refused.

`decodeStoredRecord` and `decodeStoredRecordString` keep every refusal tag and now carry the strict decoder's messages in place of their own:

- not an object: `Expected object`
- a bare record, `{}`, or a record with no `environment`: `Missing key` at `["environment"]`
- an `environment` that is not a string: `Expected string` at `["environment"]`
- an `environment` and no `record`: `Missing key` at `["record"]`

An `environment` nested past the bound is now `TooDeep`, where it was `Malformed`.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
