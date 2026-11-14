---
phase: QD-40-core-owns-describing-a-decode-refusal
plan: 03
subsystem: sink-wire-decode
tags: [decode-refusal, describer, annotations, house-style-exemption]
phase_base: eb5a94063ac2ba730eaff53ac7095b3e0add36ca
plan_head_before: 3b426e2173ac742dcdbdf804672cf0edf11a8153
plan_head_after: 97aa9508a53928ea9544b9bdef079787152c94d3
requires: [40-02]
provides:
  - "SinkWire.ts: decodeRefusalOf, describeDecodeRefusal, decodeRefusalAnnotations, DecodeRefusalAnnotations beside DecodeRefusal"
  - "SinkCodec.ts reads the one mapping; its private asDecodeRefusal is deleted"
  - "DecodeRefusal.test.ts: the sentence, hostile, boundary, annotation and mapping tables"
  - "the EXEMPTIONS entry for SinkWire.ts"
affects: [40-04, 40-05, 40-06, 40-07, 40-08, 40-09]
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: [module-scope Match.tagsExhaustive describer, typeof-only bounded description of sender data, tag-only annotations]
key-files:
  created:
    - packages/core/test/DecodeRefusal.test.ts
  modified:
    - packages/core/src/SinkWire.ts
    - packages/core/src/SinkCodec.ts
    - packages/core/test/SinkWire.tst.ts
    - scripts/check-house-style.mjs
key-decisions:
  - "The version is described by typeof alone (no property read, no array test, JSON.stringify only on a 40-code-unit string slice); a message is cut at 200 code units"
  - "decodeRefusalAnnotations returns exactly one key, qadi.refusal, the encode side's key; the exemption for it is the one house-style edit"
requirements-completed: [DREF-02, DREF-03, WX-04]
duration: ~9 min
completed: 2026-11-14
status: complete
commits: 3
---

# Phase 40 Plan 03: Core describes a decode refusal Summary

`SinkWire.ts` now holds the decode side's readers beside `DecodeRefusal`: the one `UntrustedRefusal` to `DecodeRefusal` mapping (`decodeRefusalOf`, read by `SinkCodec.ts`), a total bounded `describeDecodeRefusal`, and the tag-only `decodeRefusalAnnotations`.

## Commits

- `c615bd64` refactor(40-03): one mapping from an untrusted refusal to the wire's, in SinkWire.ts (the tracer: SinkWire.ts, SinkCodec.ts)
- `139d5dc2` feat(40-03): core describes a decode refusal and annotates it by tag (SinkWire.ts, DecodeRefusal.test.ts, check-house-style.mjs)
- `97aa9508` test(40-03): pin the decode refusal readers' types (SinkWire.tst.ts)

Each ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Cases per describe (DecodeRefusal.test.ts, 40 in all)

| Describe | Cases |
|----------|-------|
| `describeDecodeRefusal gives one sentence per refusal` | 6 |
| `describeDecodeRefusal shows any version without calling it` | 20 |
| `describeDecodeRefusal bounds what it shows` | 8 |
| `decodeRefusalAnnotations says which refusal, never what was sent` | 2 |
| `decodeRefusalOf is the one mapping` | 4 |

RED was observed first (the file against the Task 1 `SinkWire.ts`: 36 failed, 4 passed), then GREEN. `SinkWire.tst.ts` runs 8 tstyche tests with the one `@ts-expect-error` directive matched. The tracer's end-to-end proof: SinkCodec (174), devtools Source (38) and audit AuditEntry, AuditEntryDifferential, UntrustedSeams (62) all green with the 40-02 pins untouched.

## New refusal after the core change

- edit: added `Throwaway: Record<never, never>;` to the `DecodeRefusal` `Data.TaggedEnum` in `packages/core/src/SinkWire.ts`, after `NotJson`, on top of `97aa9508`
- tsc files with errors: `packages/core/src/SinkWire.ts` (`:194`, TS2345, `describeDecodeRefusal`'s handlers lack `Throwaway`) and `packages/devtools/src/model/Source.ts` (`:221`, `reasonOf`, which 40-05 deletes); `pnpm exec tsc -p tsconfig.test.json`
- reverted: `git checkout -- packages/core/src/SinkWire.ts`, `git status --porcelain -- packages` empty afterwards

## Deviations from Plan

**1. [Plan-verify defect] Task 2's `switch|Array.isArray` regex matched this plan's own comment**
- **Found during:** Task 2 verify
- **Issue:** the check scans `SinkWire.ts` with comments included, and the describer's doc comment said it avoids `Array.isArray` by name.
- **Fix:** reworded the comment to "no array test"; no code changed. The check then passes.
- **Files modified:** packages/core/src/SinkWire.ts
- **Commit:** 139d5dc2

**2. [Plan detail] `decodeRefusalOf` returns its own signature twice**
- The exported const is annotated with the union inline (as planned) and `Match.type<…>()` repeats it; no alias is exported. No behavioural effect.

**Total deviations:** 1 plan-verify defect, 1 plan detail. **Impact:** none.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Flags

None. T-40-05 (annotations): one key, sentinel property and one-key table green. T-40-06 (hostile version): the 19 version rows, the 1e6-character string and the `FastCheck.anything` bound under 400 characters green. T-40-07 (exemption): the rule's pattern line is byte-identical to the base, EXEMPTIONS holds five entries, the only added non-comment line is the SinkWire.ts one.

## Notes for later plans

- Gate 13 (`pnpm spec:api`) is red from `139d5dc2` until 40-07 names `decodeRefusalOf`, `describeDecodeRefusal`, `decodeRefusalAnnotations` and `DecodeRefusalAnnotations` in `spec/overview.md`; no verify here ran it.
- `SinkWire.ts` had no scored mutant at the base; the describer and `shownVersion` are scored now, and 40-09 closes any survivor.

## Self-Check: PASSED

- `packages/core/test/DecodeRefusal.test.ts` exists; `c615bd64`, `139d5dc2` and `97aa9508` are ancestors of HEAD; `git status --porcelain -- packages` is empty after the experiment.
- Task 1 verifies (decode suites, typecheck, lint, circular, build, the source-shape script), Task 2 verifies (40 cases green, house style, the base-diff and shape script) and Task 3's tstyche check exit 0.
