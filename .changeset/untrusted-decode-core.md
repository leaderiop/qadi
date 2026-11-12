---
"@qadi/core": minor
---

**Breaking.** Untrusted JSON is decoded through one module, `untrustedDecoder`, and the names that let a caller assemble that decode by hand are gone.

- `PolicyFromJson` is removed. Decode policy text with `fromJson` and a parsed value with `fromJsonValue`.
- `UNTRUSTED_DECODE_OPTIONS` is removed (it was exported from `Policy.ts` in 0.11.0, so it is a released name), and `exceedsJsonDepth` is no longer exported. To decode untrusted input, build `untrustedDecoder(schema, options?)` once at module scope: its `decode` (a parsed value) and `decodeText` (JSON text) return a `Result` that fails with an `UntrustedRefusal` (`NotJson`, `TooDeep` or `Malformed`), after the depth guard and before any strict decode.
- `fromJson` refuses text that is not JSON as the new `PolicyNotJson` (`ACL021`), where it was a `SchemaError`. Its error channel is `PolicyNotJson | PolicyDecodeTooDeep | SchemaError`; `fromJsonValue` is unchanged.
- `MAX_DECODE_DEPTH` keeps its value (256) and its export; it is now declared in `UntrustedDecode.ts`, not `Policy.ts`.
- `ClientHydrationDropReason` and `hydrationDropReasons` gain `PayloadTooDeep`, so `qadi_hydration_dropped_total` has a ninth series, preregistered at zero.
- New exports: `untrustedDecoder`, `UntrustedRefusal`, `UntrustedValueRefusal`, `UntrustedDecoder`, `UntrustedDecoderOptions` and `UnwalkedKey`.

Migration: replace `Schema.decodeUnknown*(PolicyFromJson, …)` with `fromJson(text)`; replace a hand-built `exceedsJsonDepth` plus strict decode with `untrustedDecoder(schema).decode`; add a `PolicyNotJson` arm to any `catchTag` or exhaustive match on `fromJson`'s failure; add `PayloadTooDeep` to any exhaustive match on a hydration drop reason.
