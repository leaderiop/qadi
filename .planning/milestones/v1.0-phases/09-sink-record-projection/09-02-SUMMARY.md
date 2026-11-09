---
phase: 09-sink-record-projection
plan: 02
subsystem: core
tags: [sink-wire, json-refusal, leaf, ARCH-54, ADR-QD-116, ADR-QD-037, ADR-QD-095]
requires: []
provides:
  - "JsonRefusal.ts: the JSON encode-refusal vocabulary and its three readings, a leaf read by both wires"
affects: [09-03, 09-04]
tech-stack:
  added: []
  patterns: ["a wire's refusal vocabulary lives in a leaf of its own, so neither wire imports the other's module"]
key-files:
  created:
    - packages/core/src/JsonRefusal.ts
  modified:
    - packages/core/src/SinkWire.ts
    - packages/core/src/JsonHazard.ts
    - packages/core/src/PortWireEncode.ts
    - packages/core/src/AttributeResolver.ts
    - packages/core/src/CustomPredicate.ts
    - packages/core/src/Errors.ts
    - packages/core/src/SinkCodec.ts
    - packages/core/src/EncodeRefusalReport.ts
    - packages/core/src/index.ts
    - packages/core/test/EncodeRefusalReport.test.ts
    - packages/core/test/Errors.tst.ts
    - packages/core/test/SinkCodec.test.ts
    - scripts/check-house-style.mjs
key-decisions:
  - "A separate JsonRefusal.ts rather than folding into JsonHazard.ts: JsonHazard.ts is package-private and the moved names are public, so folding would need a named export in core's pure export * barrel or put wireHazard/toJson on the public surface"
  - "SinkWire.ts re-exports nothing: its own path is not importable (ADR-QD-099), and the root has the moved names through the barrel"
  - "UnrepresentableKind, encodeRefusalPath and the annotation type and function moved too, beyond D-04's list, because EncodeRefusal names UnrepresentableKind and SINK-02 leaves SinkWire exactly four names"
requirements-completed: [SINK-02, SINK-03, XC-03, XC-04]
status: complete
duration: 12 min
completed: 2026-11-09
commits: 3
plan_head_before: 999a5d4c895a567ccc720cfcf124cd4144836dfc
plan_head_after: 43bc14d206fbb10393cafccc5e7821142df6a65f
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
coverage:
  - deliverable: "JsonRefusal.ts holds the encode vocabulary, code identical to c3ce9d2, importing only effect"
    verification:
      - kind: command
        ref: "diff of c3ce9d2's SinkWire.ts WirePath..describeEncodeRefusal range against JsonRefusal.ts, doc comments and blanks ignored (empty)"
        status: pass
      - kind: test
        ref: "packages/core/test/EncodeRefusalReport.test.ts (per-variant sentence table, only its import line changed)"
        status: pass
    human_judgment: false
  - deliverable: "No port module or JsonHazard.ts imports SinkWire.ts; in packages/core/src only Errors.ts, SinkCodec.ts and the barrel do"
    verification:
      - kind: command
        ref: "grep -lF 'from \"./SinkWire.ts\"' over port modules (0, baseline 4) and over packages/core/src (Errors.ts SinkCodec.ts index.ts)"
        status: pass
      - kind: command
        ref: "pnpm circular"
        status: pass
    human_judgment: false
  - deliverable: "No export added or removed; gate 13 green with spec/overview.md untouched"
    verification:
      - kind: command
        ref: "pnpm spec:api (863 exports documented across 9 packages)"
        status: pass
    human_judgment: false
---

# Phase 9 Plan 02: Refusal vocabulary leaf Summary

The JSON encode-refusal vocabulary now lives in the leaf `JsonRefusal.ts`, read by both the record codec and the port wire, and `SinkWire.ts` keeps only `SinkRecordTag`, `WireVersion`, `WIRE_VERSIONS` and `DecodeRefusal`.

## Commits

| Commit | Message |
| ------ | ------- |
| 279dcf1 | refactor(09-02): move the JSON encode-refusal vocabulary into a JsonRefusal leaf |
| 24e10af | refactor(09-02): read the encode vocabulary from the leaf in the sink side and its tests |
| 43bc14d | refactor(09-02): SinkWire keeps only the record wire's words; the barrel exports the leaf |

## Accomplishments

- `JsonRefusal.ts` (new, imports only `effect/Data` and `effect/Match`) declares `WirePath`, `OpaqueKind`, `UnrepresentableKind`, `EncodeRefusal` (type and constructors), `encodeRefusalPath`, `EncodeRefusalAnnotations`, `encodeRefusalAnnotations`, the private `where`, and `describeEncodeRefusal`, in c3ce9d2's order with the code unchanged. `EncodeRefusal`'s first doc line now names the port wire too.
- `SinkWire.ts` dropped from 220 to the four record-wire names; it re-exports nothing and no longer imports `effect/Match`.
- The barrel gained `export * from "./JsonRefusal.ts";` between `./Identity.ts` and `./Matcher.ts`, so every moved name is still importable from `@qadi/core`'s root.
- The `no-refusal-annotation-outside-core` exemption and the rule's comment follow the annotation keys to `JsonRefusal.ts`; the old `SinkWire.ts` key is gone.

## Files whose sink wire import was retargeted (for plan 09-03's ADR-QD-116 and the CCR row)

Port side (now import `./JsonRefusal.ts`): `JsonHazard.ts`, `PortWireEncode.ts`, `AttributeResolver.ts`, `CustomPredicate.ts`. No module added by Phase 2, 7 or 8 imported the sink wire, so there are no others.

Sink side (split: encode names from the leaf, record-wire names stay on `SinkWire.ts`): `Errors.ts`, `SinkCodec.ts`; `EncodeRefusalReport.ts` moved wholly to the leaf.

Tests: `EncodeRefusalReport.test.ts` (all four names, import path only), `Errors.tst.ts`, `SinkCodec.test.ts` (split). `Decision.tst.ts` and `SinkCodecAgreement.test.ts` import `DecodeRefusal` only and stay.

Comments updated: `JsonHazard.ts` module doc, `PortWireEncode.ts` module doc, `EncodeRefusalReport.ts` module doc, `Errors.ts` (`SinkRecordNotEncodable` doc), `SinkWire.ts` module doc.

## Verification

- `pnpm vitest run --project core --project http --project audit --project devtools`: 124 files, 3433 tests green after Task 1 and after Task 3.
- `pnpm typecheck`, `pnpm test:tstyche` (162 tests), `node scripts/check-house-style.mjs` (408 files clean, 3 declared switches), `pnpm circular`, `pnpm spec:api` green.
- Port-side sink wire importers 0 (baseline 4); `packages/core/src` importers exactly `Errors.ts`, `SinkCodec.ts`, `index.ts` (baseline 8).
- The code-range diff against c3ce9d2 is empty; `EncodeRefusalReport.test.ts`'s diff touches an import line only.
- Tracer gate: `<verify>` is automated-only, re-run end to end and passed; expansion continued.

## Deviations from Plan

None - plan executed exactly as written. Two import-order touch-ups (placing the new leaf import in alphabetical position in `AttributeResolver.ts` and `CustomPredicate.ts`) are cosmetic.

## Known Stubs

None.

## Threat Flags

None. T-09-04 (annotation code byte-identical, exemption follows the keys, old key removed), T-09-05 (sentence table untouched), T-09-06 (walk and conversion changed in import lines only) and T-09-07 (barrel line and re-export removal in one task; gate 13 green) are mitigated as planned.

## Self-Check: PASSED

- FOUND: packages/core/src/JsonRefusal.ts
- FOUND: packages/core/src/SinkWire.ts, packages/core/src/index.ts
- FOUND commits: 279dcf1, 24e10af, 43bc14d (ancestors of HEAD)
