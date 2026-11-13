---
phase: 30-one-strict-decode-module
plan: 03
subsystem: core
tags: [untrusted-decode, sink-codec, port-wire, property-test]
phase_base: 055c859320f2396a6b2c97cecae2c455836a1603
plan_head_before: 7c314845a4250b3b187730a5aa0aa71e47482656
plan_head_after: 903351b25737b2a4b281065defe01a5066652dc5
status: complete

requires:
  - phase: 30-02
    provides: the leaf untrustedDecoder and its refusal types
provides:
  - the module's FastCheck property, order tests and tstyche type pins
  - SinkCodec's two record decoders on the module, with prepare
  - the port question, answer and remote reply on the module, one sentence function
affects: [30-04, 30-05, 30-06, 30-07]

actuals:
  tokens: 16000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A seam's prepare carries what must precede the strict decode; a module-scope Match.tagsExhaustive maps the refusal into the seam's own vocabulary"

key-files:
  created:
    - packages/core/test/UntrustedDecode.test.ts
    - packages/core/test/UntrustedDecode.tst.ts
  modified:
    - packages/core/src/SinkCodec.ts
    - packages/core/src/PortWireEncode.ts
    - packages/core/src/PortRemote.ts

key-decisions:
  - "decodeStoredRecord stays outside the module: it hands record to the guarded decodeSinkRecord, and walking the envelope would refuse a deep unknown envelope key D-15-c ignores"

requirements-completed: [DEC-01, DEC-02, DEC-04, DEC-05, DEC-07, WX-04, WX-06]

duration: 14 min
completed: 2026-11-12
---

# Phase 30 Plan 03: The module's proofs, then the sink and port seams Summary

The module is proven by a fixed-seed FastCheck property over both sides of the 256 bound, order tests and tstyche pins; then `SinkCodec` (with `prepare`) and the port question, answer and remote reply decode only through `untrustedDecoder`, with the too-deep sentence written once.

## Commits

| Task | Commit | Message |
|---|---|---|
| 1 | `edf92a44` | test(30-03): the untrusted decoder's property, order and type pins |
| 2 | `41447cc2` | refactor(30-03): SinkCodec decodes through the untrusted decoder |
| 3 | `903351b2` | refactor(30-03): the port wire decodes through the untrusted decoder, one sentence |

`commits: 3` is measured (`git rev-list --count 7c314845..HEAD`; the ledger file was not created, the base is the HEAD at start, `7c314845`).

## Names

- `SinkCodec.ts`: `versionThenEnvelope` is the `prepare` (not-an-object passes through, other version -> `UnsupportedVersion`, else `envelopeOf`); `sinkWire = untrustedDecoder(SinkRecordWire, { prepare: versionThenEnvelope })`; `asDecodeRefusal` is the module-scope `Match.tagsExhaustive` with arms `NotJson`, `TooDeep`, `Malformed`, `UnsupportedVersion` (itself) into `DecodeRefusal`; `decoded` takes `Result<SinkRecordWire, DecodeRefusal>` and keeps `rebuild` -> `Inconsistent`. `malformed` was deleted.
- `PortWireEncode.ts`: `WireSubject = "question" | "answer" | "reply"` and `undecodableMessage(refusal)(subject)`; `TooDeep` -> the one template, `Malformed` -> its `message`. `PortRemote.ts` builds `replyDecoder = untrustedDecoder(PortWireReply)`.

## Leaf fix Task 1 forced

None. The only test failure on the first run was a test bug (a container leaf adds a frame, so the exact `depth > 256` assertion needs primitive leaves); fixed in the test, nothing loosened.

## Observation: NotJson.message

`NotJson.message` is `String(error)`, so it arrives as `SyntaxError: <parser text>`. The test pins `message` as containing the parser's own `error.message`, with a comment; the leaf is unchanged. A seam that renders it into a sentence (the paste box does) carries the `SyntaxError: ` prefix.

## Line-number drift

None that mattered; the `:1304` agreement property in `SinkCodec.test.ts` was found at `:1283` after 30-02's import re-point and stays green.

## Deviations from Plan

None - plan executed exactly as written. The ledger file (protocol 0c) was not written; `plan_head_before` is `7c314845`.

## Verification

- `pnpm vitest run --project core` 2145 passed; whole `pnpm vitest run` 4693 passed (181 files)
- `pnpm exec tstyche packages/core/test/UntrustedDecode.tst.ts`: 5 tests, 12 assertions pass
- `pnpm typecheck`, `pnpm lint` (house-style clean), `pnpm circular`: clean
- Both structure scripts print `ok` (SinkCodec.ts: one `JSON.parse`, in `decodeStoredRecordString`; the sentence written once across the two port files)
- `pnpm spec:api` not run; red until 30-07

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: `packages/core/test/UntrustedDecode.test.ts`, `packages/core/test/UntrustedDecode.tst.ts`; commits `edf92a44`, `41447cc2`, `903351b2`
