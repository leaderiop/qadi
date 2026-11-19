---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
plan: 06
subsystem: core
tags: [untrusted-decoder, stored-envelope, unknown-key-policy, house-style-budget]
requires: [57-05]
provides:
  - StoredEnvelopeWire and storedWire in SinkCodec.ts, the stored envelope read by untrustedDecoder with ignore and record unwalked
  - UNTRUSTED_DECODE_BUDGET at 1 for SinkCodec.ts, with AGENTS.md section 7a and the overview row moved in the same commit
affects: [57-07, 57-08, 57-09, 57-10, 57-11]
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
plan_head_before: fcb83ecfd057e11ce8934e9f8aa7877f7ef60949
plan_head_after: 2be5a75268b2f2f2748b322e87d4fe806a3d4ac9
tech-stack:
  added: []
  patterns: ["a decoder result adapted by one module-scope function (fromEnvelope) shared by the value and text entry points"]
key-files:
  created: []
  modified:
    - packages/core/src/SinkCodec.ts
    - packages/core/test/SinkCodec.test.ts
    - packages/devtools/test/model/Source.test.ts
    - scripts/check-house-style.mjs
    - AGENTS.md
    - spec/overview.md
key-decisions:
  - "checkVersion reads `version` with `Object.getOwnPropertyDescriptor(input, \"version\")?.value` inline, so ownValue is deleted from SinkCodec.ts and the own-property-only read is kept"
requirements-completed: [KEYP-03, KEYP-05, WX-04]
duration: 12min
completed: 2026-11-19
status: complete
---

# Phase QD-57 Plan 06: the stored record envelope is read by untrustedDecoder Summary

The stored `{ environment, record }` envelope is now read by `storedWire = untrustedDecoder(StoredEnvelopeWire, { unknownKeys: "ignore", unwalked: ["record"] })`, its hand reader (`notAnEnvelope`, `ownValue`, a `JSON.parse`) is deleted, and the untrusted-decode budget, AGENTS.md section 7a and the overview row moved with it in one commit.

## Accomplishments

- `SinkCodec.ts`: `StoredEnvelopeWire`, `storedWire` and a module-scope `fromEnvelope` that maps a refusal through `decodeRefusalOf`, hands `record` to `decodeSinkRecord` from its own root and stamps the result with `stampRecord` (the one call). `decodeStoredRecord` is `fromEnvelope(storedWire.decode(input))`, `decodeStoredRecordString` is `fromEnvelope(storedWire.decodeText(text))`. `StoredRecordJson`, `encodeStoredRecord*` and `DecisionRecord.ts` are untouched.
- The six 57-02 rows S10..S15 (D-17, D-18) pass, S1..S9 pass unedited: every refusal tag is kept except D-18's deep `environment`, now `TooDeep` naming 256.
- `UNTRUSTED_DECODE_BUDGET` gives `SinkCodec.ts` 1 (names `["SinkRecordWithJson"]`); AGENTS.md section 7a's row says 1 with the reason rewritten, and its recipe sentence names the required `unknownKeys` projection. `spec/overview.md` 1.124 to 1.125.

## Task Commits

Both tasks land in one commit by design (the plan's single-commit rule):

1. **Tasks 1-2: the decoder-read envelope, the moved pins, the budget, 7a and the overview row** - `2be5a752` (`feat(57-06)`, six files, after `feat(57-05)!`)

**Plan metadata:** the `docs(57-06)` commit that carries this file.

## Measured messages now pinned (D-17)

- `"text"`, `[1]`, `null` -> `Expected object`
- `{}`, `{ cursor: "x" }`, `{ record }`, a bare record -> `Missing key\n  at ["environment"]`
- `{ environment: 1, record }` -> `Expected string\n  at ["environment"]`
- `{ environment: "Edge" }` -> `Missing key\n  at ["record"]`

Moved pins: `SinkCodec.test.ts` `each envelope refusal names its own reason` and the bare-record `assert.include`; `Source.test.ts` `a bare record, not an envelope: Malformed`. No other assertion moved.

## Evidence

- Whole core project: 2608 passed (no RED row left); devtools `Source.test.ts` 44 passed.
- `pnpm lint` (house-style: 556 files clean, 3 declared switches; the `[untrusted-decode*]` checks pass), `pnpm typecheck`, `pnpm circular`, `spec-revise --check` and `spec:api` (936 exports) pass on the commit.
- Task 1's source/pin scan and Task 2's commit-shape script both print their success line.

## Deviations from Plan

None in outcome. One implementation note: the plan's scan forbids `ownValue` anywhere in `SinkCodec.ts`, but `checkVersion` still used it, so its own-property read is now inlined as `Object.getOwnPropertyDescriptor(input, "version")?.value` (same semantics: never an inherited value). No stop-and-report item: no tag moved beyond D-18, no characterisation row failed.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-57-13 (S15 and the 60,000-deep unknown key in S3, S4), T-57-14 (S13) and T-57-15 (S1..S9, SinkCodec and Source pins) are covered by passing tests.

## Flagged assumptions

- [edge KEYP-03/unclassified] read as "the stored record envelope is decoded through `untrustedDecoder` with `ignore` and `record` unwalked, its hand reader deleted, every tag kept except D-18's"; proven by S1..S15 and the scan. Left unresolved in the edge report.

## Next Phase Readiness

Ready for 57-07 (mutation after and static runs).

## Self-Check: PASSED

- `packages/core/src/SinkCodec.ts` exists; commit `2be5a752` is an ancestor of HEAD.
