---
phase: QD-38-the-sink-wire-version-stated-once
plan: 02
subsystem: sink-wire
tags: [sink-codec, wire-version, tstyche, retype]
requires: [38-01]
provides:
  - "WIRE_VERSION, the one statement of the record wire's version (new public export of @qadi/core)"
  - "WIRE_VERSIONS and WireVersion derived from it"
  - "isReadVersion, a module-private Schema.is guard over the read set"
  - "packages/core/test/SinkWire.tst.ts, five type pins"
affects: [38-03, 38-04]
tech-stack:
  added: []
  patterns: ["derive the read set and its type from the one write-version constant", "Schema.is(Schema.Literals(set)) as a membership guard over unknown"]
key-files:
  created:
    - packages/core/test/SinkWire.tst.ts
  modified:
    - packages/core/src/SinkWire.ts
    - packages/core/src/SinkCodec.ts
decisions:
  - "Decoder membership is isReadVersion = Schema.is(Schema.Literals(WIRE_VERSIONS)), not WIRE_VERSIONS.some(...): Stryker's .some to .every mutant is indistinguishable over a one-element set"
metrics:
  duration: ~15 minutes
  completed: 2026-11-14
status: complete
commits: 2
plan_head_before: b1e2247a872dec80ecfdad65372f33f2066790ae
plan_head_after: 0bbf0f10f9aef10e784fb77b1f103beeecd4d2df
actuals:
  tokens: 2500
  tasks: 3
  commits: 2
requirements-completed: [WIRE-01, WIRE-02, WIRE-03, WX-04, WX-06]
---

# Phase 38 Plan 02: The sink wire version stated once Summary

`SinkWire.ts` now declares `export const WIRE_VERSION = 2 as const;` and derives `WIRE_VERSIONS` and `WireVersion` from it; the codec's two schema literals, its encoder and its decoder's read check all read them, and the private copy is gone. Bytes and refusals are unchanged, and a tstyche pin plus the byte goldens go red on a one-line retype.

## Commits

- `94b9c960` refactor(38-02): state the sink wire version once, in SinkWire.ts (SinkWire.ts, SinkCodec.ts only)
- `0bbf0f10` test(38-02): pin the sink wire version types (SinkWire.tst.ts alone)

`plan_head_before` is the `docs(38-01)` commit `b1e2247a` (no per-plan ledger file was written before the first commit; the base is the head at plan start).

## Evidence

- Code-only scan of `packages/core/src/Sink*.ts` (comment lines skipped) for `Literal(2)`, `version: 2`, `= 2`, `2 as const`, `[2]`: exactly one hit, `packages/core/src/SinkWire.ts: export const WIRE_VERSION = 2 as const;` (seven at the base).
- vitest (SinkCodec, SinkCodecAgreement, DecisionSink, UntrustedSeams): all green, SinkCodec.test.ts 153 cases; no existing core test or fixture changed since the `test(38-01)` commit. AuditEntry.test.ts: 36 passed.
- `pnpm typecheck`, `pnpm lint` (house-style 496 files clean, 3 declared switches), `pnpm circular`: pass.
- tstyche: `pnpm exec tstyche SinkWire.tst` 1 file, 5 tests passed; `pnpm test:tstyche` 52 files, 259 tests, 519 assertions passed.

## Retype-to-3 after the conversion

- edit: `SinkWire.ts` `export const WIRE_VERSION = 2 as const;` changed to `= 3 as const;`, nothing else; `git diff --stat` one file, one line.
- tsc -b: exit 0. Every package's source compiles; the codec needed no edit because it derives.
- tsc test graph: exit non-zero, five errors, all TS2322 "Type '2' is not assignable to type '3'", at `SinkCodec.test.ts` lines 1971, 1988, 1995, 2002, 2009 (the written-out rows' `supported: [2]`).
- tstyche: 1 file failed, 5 of 5 tests failed, 5 of 5 assertions failed.
- vitest: 97 passed, 56 failed of 153. The six golden cases of `v2 bytes: the writer writes the version-2 goldens` all failed (the encoder now writes `"version":3`); the five written-out rows all failed; of the 26 cases whose name mentions a round trip, 25 passed and one failed (`an obligation row's identity keys survive a round trip as typed values`, which decodes a hand-written `"version":2` row, not the encoder's output, so it refuses with `supported:[3]`). The other failures are further cases that feed hand-written `"version":2` JSON to the decoder, which now reads only 3.
- reverted: `git checkout -- packages/core/src/SinkWire.ts`; `tsc -b` exit 0; tstyche 5 of 5 passed; `git status --porcelain -- packages` empty.

At the base the same retype compiled with half the codec left at 2 and the encoder wrote bytes its own decoder refused; now it is one edit, the codec moves with it, and the tstyche pin and the byte goldens name it.

## Deviations from Plan

None - plan executed exactly as written. Gate 13 (`check-api-surface.mjs`) is expected red until 38-03 names `WIRE_VERSION` in `spec/overview.md`; it was not run.

## Known Stubs

None.

## Threat Flags

None. `isReadVersion` compares literals strictly (T-38-03); the encoder, schema literal and read set share one constant and the goldens and round trip pass unedited (T-38-04).

## Self-Check: PASSED

- SinkWire.tst.ts, SinkWire.ts, SinkCodec.ts exist; commits `94b9c960` and `0bbf0f10` are ancestors of HEAD.
