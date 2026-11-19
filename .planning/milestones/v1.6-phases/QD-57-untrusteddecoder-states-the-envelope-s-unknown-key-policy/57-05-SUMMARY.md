---
phase: QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy
plan: 05
subsystem: core
tags: [unknown-key-policy, untrusted-decoder, envelope-keys, breaking-change, tracer]
requires: [57-04]
provides:
  - UnknownKeyPolicy ("refuse" | "ignore"), the required UntrustedDecoderOptions.unknownKeys and the required options of untrustedDecoder, read through the module-scope PROJECTION table
  - packages/core/src/EnvelopeKeys.ts, the package-private derivation of an input's declared top-level keys from the schema's encoded AST
  - the record wire stating ignore with checkVersion; every other decoder stating refuse
  - the UnknownKeyPolicy overview row (spec:api 936)
affects: [57-06, 57-07, 57-08, 57-09, 57-10, 57-11]
actuals:
  tokens: 23400
  tasks: 3
  commits: 1
plan_head_before: e378791f0a4c06affa35860ca55557c7b8778ea7
plan_head_after: 9d109babed8dfce1d30f295b819253b2e68de8c1
tech-stack:
  added: []
  patterns: ["a closed policy table indexed directly, never compared with ===", "declared keys read once at build from SchemaAST.toEncoded", "build-time throw for a schema with no derivable keys"]
key-files:
  created:
    - packages/core/src/EnvelopeKeys.ts
  modified:
    - packages/core/src/UntrustedDecode.ts
    - packages/core/src/SinkCodec.ts
    - packages/core/src/Policy.ts
    - packages/core/src/PortRemote.ts
    - packages/core/src/PortWireEncode.ts
    - packages/core/test/UntrustedSeams.test.ts
    - spec/overview.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - packages/audit/src/AuditEntry.ts
    - packages/audit/src/AuditArchive.ts
    - packages/react/src/HydrationEngine.ts
    - packages/audit/test/AuditEntryDifferential.test.ts
key-decisions:
  - "discriminantOf returns the set of _tag literals (or undefined) rather than a boolean, so the build-time check and the distinctness test read one value; selection itself is `members.find(m => m.literals.get('_tag') === tag) ?? first`, which needs no special case for a one-member union (D-21)"
  - "the build refusal reads: unknownKeys \"ignore\" needs a schema that is an object, or a union of objects each with a distinct literal _tag"
requirements-completed: [KEYP-01, KEYP-02, KEYP-04, WX-03, WX-04, WX-07]
duration: 22min
completed: 2026-11-18
status: complete
---

# Phase QD-57 Plan 05: untrustedDecoder states every envelope's unknown-key policy Summary

`untrustedDecoder` now takes a required, closed `unknownKeys` policy; the record wire states `ignore` (an unknown top-level key decodes however deep, a declared key keeps its guard) and every other decoder states `refuse` and answers as before.

## Accomplishments

- `UntrustedDecode.ts`: `UnknownKeyPolicy`, `unknownKeys` first in `UntrustedDecoderOptions`, `options` required, the `PROJECTION` table and `project`. The decode order is now project, guard (minus `unwalked`), `prepare` (receives the projection), strict decode. `UNTRUSTED_DECODE_BUDGET` is unchanged: the token count in the file stays 5.
- `EnvelopeKeys.ts` (new, imports `effect/Match` and `effect/SchemaAST` only, out of the barrel): `envelopeKeysOf(ast)` reads `SchemaAST.toEncoded(ast)` once and throws at build for a schema with no object member or an undiscriminated union.
- `SinkCodec.ts`: `DECISION_KEYS`, `OBLIGATIONS_KEYS`, `envelopeOf` and `versionThenEnvelope` deleted; `checkVersion` reads `version` from the projection; `sinkWire = untrustedDecoder(SinkRecordWithJson, { unknownKeys: "ignore", prepare: checkVersion })`. `ownValue`, `notAnEnvelope` and the stored reader are untouched (57-06 owns them).
- `Policy.ts`, `PortRemote.ts`, both `PortWireEncode.ts` decoders, `AuditEntry.ts` (`unwalked: ["record"]`), `AuditArchive.ts` (`unwalked: ["entries"]`) and `HydrationEngine.ts` (three decoders, `decodeEnvelope` keeping `unwalked` and `prepare`) state `refuse`.
- The `UnknownKeyPolicy` overview row and the amended `untrustedDecoder` / options rows; `spec-revise` bumped `spec/overview.md` 1.123 to 1.124; the website `upgrading.md` example states `{ unknownKeys: "refuse" }`.

## Task Commits

All three tasks land in one commit by design (the required option makes every call site a compile error until all state it):

1. **Tasks 1-3: the table, the derivation, the seams, the pins, the overview** - `9d109bab` (`feat(57-05)!`, thirteen files, the first `packages/*/src` commit since `phase_base`, after every `test(57-02)`, `test(57-03)` and `test(57-04)` commit)

**Plan metadata:** the `docs(57-05)` commit that carries this file.

## Evidence

- `spec:api`: `api-surface: 936 export(s) documented across 9 package(s)` (base 935). `spec:website-examples`: 67 blocks compile. `spec-revise --check` passes.
- Tracer (Task 1): the record wire's rows and U1..U16 (30 tests) pass; `tstyche UntrustedDecode.tst.ts` passes (7 tests, 23 assertions, the D-16 pin green).
- Whole core project outside the `(D-17)`/`(D-18)` titles: 2602 passed, 6 skipped. The six still-RED rows are exactly S10..S14 (D-17) and S15 (D-18), which 57-06 owns.
- Audit project 547 passed, React project 523 passed: A6, A7, A8, V8 (D-20) green and every 57-03 characterisation row unedited and passing (KEYP-04).
- `pnpm typecheck`, `pnpm lint` (exit 0; the warnings are in the untracked `.codex/` and pre-existing), `pnpm circular` and `house-style` (556 files clean, 3 declared switches) pass on the commit.

## Pins moved (D-01, D-20), and none other

- `packages/core/test/UntrustedSeams.test.ts` `:236`: "an unknown envelope key whose value is nested past the bound -> success, not walked (D-01)", asserting `Result.isSuccess(decodeSinkRecord(...))` (was `TooDeep`).
- `packages/audit/test/AuditEntryDifferential.test.ts`: the `deepExtra` half now asserts no refusal, title naming D-20; the `deepPolicy` half stays `TooDeep`.
- R3, R4, R5, R14 (D-01) and A6, A7, A8, V8 (D-20) went green by the source change alone.

## Deviations from Plan

None - plan executed exactly as written. No stop-and-report item: no refusal tag moved beyond D-01 and D-20, and no 57-03 characterisation row failed.

Note for 57-10's changeset: `untrustedDecoder`'s second argument and its `unknownKeys` field are now required, a breaking `@qadi/core` change recorded in the commit body.

## Known Stubs

None.

## Threat Flags

None beyond the plan's register. T-57-09 (the projection reads no value; R4 and U3 run 60,000 deep without a throw), T-57-10 (keys from `SchemaAST.toEncoded`; U10, U13, U14, U15 and U16 pass), T-57-11 (required option, closed table) and T-57-12 (`Object.entries` / `Object.fromEntries`; R13 and R14) are covered by passing tests.

## Flagged assumptions

- [edge KEYP-01/unclassified] read as "the record wire ignores an unknown top-level key however deep, including the version check's view of it, while every declared key keeps its guard"; proven by R3, R4, R5, R14 and R6 passing. Left unresolved in the edge report.
- [edge KEYP-02/unclassified] read as in 57-04; proven by U1..U16 and the D-16 type pins passing.

## Next Phase Readiness

Ready for 57-06: the stored-envelope reader (`StoredEnvelopeWire`, `storedWire`) is the last hand-written envelope; S10..S15 are the six RED rows it turns green.

## Self-Check: PASSED

- `packages/core/src/EnvelopeKeys.ts` exists; commit `9d109bab` is an ancestor of HEAD; the plan's Task 3 commit-shape script printed "one feat(57-05)! commit, thirteen files, first src commit, after every RED".
