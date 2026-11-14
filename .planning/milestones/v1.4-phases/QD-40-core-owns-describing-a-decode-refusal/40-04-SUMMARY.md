---
phase: QD-40-core-owns-describing-a-decode-refusal
plan: 04
subsystem: sink-wire-decode
tags: [decode-refusal, single-decode, schema-decodeTo, untrusted-decode-budget]
phase_base: eb5a94063ac2ba730eaff53ac7095b3e0add36ca
plan_head_before: 483383721aa325c6c2417fefd0998df95094cbfe
plan_head_after: 0cbdb70ab1f7c8ec3710423832ab84c6d47aa092
requires: [40-03]
provides:
  - "SinkCodec.ts: private SinkRecordWithJson (Schema.decodeTo pair), exported DecodedSinkRecord and decodeSinkRecordWithJson"
  - "decodeSinkRecord and decodeSinkRecordString read through the one decoder"
  - "UNTRUSTED_DECODE_BUDGET SinkCodec.ts at 2, its _NAMES entry and the AGENTS.md section 7a row"
affects: [40-05, 40-06, 40-07, 40-08, 40-09]
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: [counted Schema.decodeTo pair giving { json, record } from one strict decode]
key-files:
  created: []
  modified:
    - packages/core/src/SinkCodec.ts
    - packages/core/test/SinkCodec.test.ts
    - packages/core/test/SinkWire.tst.ts
    - scripts/check-house-style.mjs
    - AGENTS.md
key-decisions:
  - "The pair compiled in situ with the plan's literal getters, no annotation, no cast, no Schema.is: SchemaGetter.transform((json) => ({ json, record: json })) infers from the pipe"
  - "SinkCodec.ts 1 to 2 in the same commit as the token, with its comment, its _NAMES entry and the AGENTS.md row; UNTRUSTED_DECODE_TOKEN byte-identical to the base"
requirements-completed: [DREF-05, WX-04]
duration: ~8 min
completed: 2026-11-14
status: complete
commits: 2
---

# Phase 40 Plan 04: One strict decode gives the record and its JSON form Summary

`decodeSinkRecordWithJson` returns `{ record, json }` from one strict decode (`SinkRecordWithJson`, a counted `Schema.decodeTo`), and `decodeSinkRecord` and `decodeSinkRecordString` read through the same decoder with their signatures unchanged.

## In-situ typecheck (RESEARCH A5)

The plan's pair typechecked as written. With `SinkRecordWithJson` in place and `sinkWire` pointed at it, `pnpm typecheck` reported two TS2379 errors only, both in the old `decoded(...)` callers (the decoded value had gained the pair's shape), none in the pair itself. No explicit type argument, no getter-parameter annotation, no `as`, no `!`, no `Schema.is`. Reshaping `decoded` to take `{ json, record }` cleared both.

## Commits

- `fd822cee` feat(40-04): one strict decode gives the record and its JSON form, counted (SinkCodec.ts, SinkCodec.test.ts, check-house-style.mjs, AGENTS.md)
- `0cbdb70a` test(40-04): pin the single decode's types (SinkWire.tst.ts)

Each ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## What changed

- `SinkCodec.ts`: `SinkRecordWithJson = SinkRecordJson.pipe(Schema.decodeTo(Schema.Struct({ json: SinkRecordJson, record: SinkRecordWire }), { decode: SchemaGetter.transform((json) => ({ json, record: json })), encode: SchemaGetter.transform(({ json }) => json) }))`, read only through `untrustedDecoder(SinkRecordWithJson, { prepare: versionThenEnvelope })`. New `SchemaGetter` import (a submodule of the installed `effect`). `decoded` now takes `{ json, record }` and gives `DecodedSinkRecord`.
- Budget: `SinkCodec.ts` 1 to 2 with the one-sentence comment extension, `_NAMES` entry `["decodeStoredRecordString", "SinkRecordWithJson"]`, AGENTS.md section 7a row at 2 with the same sentence. `UNTRUSTED_DECODE_TOKEN` untouched; `node scripts/check-house-style.mjs` prints no `[untrusted-decode*]` line (498 files clean).
- Tests: five cases in `decodeSinkRecordWithJson: the record and its JSON form from one decode` (goldens read to their own text and to `decodeSinkRecord`'s record, unknown envelope key absent, reversed keys give schema order, explicit `undefined` keeps its key, four refusals equal `decodeSinkRecord`'s and the written-out values incl. 60,000-deep `TooDeep`). 40-02's Malformed table is byte-identical to its commit and its seven cases are green. Two tstyche pins; `SinkWire.tst.ts` runs 10 tests.

## Bench after the single decode

- decodeSinkRecord alone: 54,601.48 hz, mean 0.0184 ms (base: 120,796.63 hz, mean 0.0084 ms; ratio 0.452 by hz, mean 2.19x; a second run read 54,617.21 hz; `pnpm exec vitest bench --run --root packages/core UntrustedDecode --reporter=verbose` at `0cbdb70a`)
- Same run, `row decoder, then decodeSinkRecord`: 52,205.18 hz (not measured on the base in 40-02's SUMMARY).

The decode costs a little over twice what it did: the source walk validates `SinkRecordJson`, then the target walk decodes `record` from the same value, on top of the guard and the projection. This is a record for ADR-QD-153's revision in 40-07, not a gate; the ADR names the fallback (two decoders from one factory). Worth weighing there: the per-record cost is about 10 microseconds, on devtools' per-frame and audit's per-row paths.

## Deviations from Plan

**1. [Plan-verify defect] Task 1's shape regex requires the `decodeSinkRecordWithJson` signature on one line**
- **Found during:** Task 1 verify
- **Issue:** the third script matches `export const decodeSinkRecordWithJson = \(input: unknown\): Result\.Result<DecodedSinkRecord, SinkRecordNotDecodable> =>` with no line break; my first draft wrapped the parameter list at about ninety columns.
- **Fix:** wrote the signature on one line (117 columns; `decodeSinkRecord`'s own line is already 107). No behaviour change.
- **Files modified:** packages/core/src/SinkCodec.ts
- **Commit:** fd822cee

**Total deviations:** 1 plan-verify defect. **Impact:** none.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Flags

None. T-40-08: goldens, key order, unknown key and `undefined` key green. T-40-09: the decoder is `untrustedDecoder(SinkRecordWithJson, { prepare: versionThenEnvelope })` and the 60,000-deep refusal is green. T-40-10: no `Schema.encodeTo` in src, one `Schema.decodeTo` (SinkCodec.ts), the token pattern and every other budget row unchanged. T-40-11: measured above.

## Self-Check: PASSED

- `fd822cee` and `0cbdb70a` are ancestors of HEAD; `packages/core/src/SinkCodec.ts` and the four other plan files exist.
- Task 1 verifies (five new and seven 40-02 cases green with the table byte-identical; house style, `pnpm typecheck`, `pnpm lint` (no new warning; the packages/ warnings are pre-existing), `pnpm circular`, `pnpm run build`; the encodeTo/decodeTo/shape/budget-diff script; devtools Source (38) and audit AuditEntry, AuditEntryDifferential, UntrustedSeams (62)) exit 0. Task 2's tstyche run is 10 of 10 and the bench line is above.
