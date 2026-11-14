---
phase: QD-40-core-owns-describing-a-decode-refusal
plan: 01
subsystem: sink-wire-decode
tags: [decode-refusal, mutation-baseline, adr, spec-records]
phase_base: eb5a94063ac2ba730eaff53ac7095b3e0add36ca
plan_head_before: eb5a94063ac2ba730eaff53ac7095b3e0add36ca
plan_head_after: 251ccd1a7aee0a7a1a2be60721c38720e5acfc77
requires: []
provides:
  - 40-mutation-base.json (SinkCodec.ts, SinkWire.ts, Source.ts, AuditEntry.ts at the phase base)
  - ADR-QD-153 (the compatibility decision, the describer's placement, the counted single decode), with its index.yaml entry, its traceability row and the CCR-QD-431 row
affects: [40-02, 40-03, 40-04, 40-05, 40-06, 40-07, 40-08, 40-09]
tech-stack:
  added: []
  patterns: [baseline committed alone on the untouched base, decision recorded before code]
key-files:
  created:
    - .planning/phases/QD-40-core-owns-describing-a-decode-refusal/40-mutation-base.json
    - spec/decisions/153-core-owns-describing-a-decode-refusal.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "ADR-QD-153 records the user's amended single-decode decision: Schema.decodeTo, counted, SinkCodec.ts 1 to 2, the AuditEntry.ts row retired, the total unchanged, Schema.encodeTo named and rejected"
  - "ADR-QD-153 records the Breaking devtools surface: onMalformed(frame, refusal: DecodeRefusal), qadi.refusal plus qadi.frame, qadi.reason, MalformedReason and reasonOf deleted with no alias, the five-word map with not-a-record collapsing into Malformed"
requirements-completed: [DREF-01, WX-02, WX-05]
duration: ~4 min
completed: 2026-11-14
status: complete
commits: 2
---

# Phase 40 Plan 01: Baseline and ADR-QD-153 Summary

Mutation baseline of the four files the phase edits, committed alone as the phase's first commit, then ADR-QD-153 recording the compatibility decision and the counted single decode before any `packages/*/src` change.

## Reserved numbers

ARCH-87, ADR-QD-153, CCR-QD-431, BEH-QD-536 to 540 and INV-QD-325 to 326 were each free at `phase_base` (`git grep -E "<id>([^0-9]|$)"` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts printed nothing; no `spec/decisions/153-*` file). `node scripts/next-id.mjs` was never run. This plan uses ARCH-87, ADR-QD-153 and CCR-QD-431; the CCR-QD-431 row names only those, and 40-08 completes it with the unused numbers.

## Mutation base

Three invocations, run one at a time (core, then devtools, then audit), each exit 0 above its break threshold:

- `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/SinkCodec.ts,packages/core/src/SinkWire.ts'` (199 mutants instrumented, 161 scored, 38 ignored)
- `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/Source.ts'`
- `pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/AuditEntry.ts'`

Printed by the writer:

- `packages/core/src/SinkCodec.ts 0.9751552795031055 (157/161) ignored 38`
  - survivor 328:9 ConditionalExpression, 326:10 EqualityOperator, 391:7 ConditionalExpression, 395:7 ConditionalExpression
- `packages/core/src/SinkWire.ts 1 (0/0) ignored 0`: no mutant at all, so Stryker lists no entry for the file (see Deviations)
- `packages/devtools/src/model/Source.ts 1 (71/71) ignored 10`
- `packages/audit/src/AuditEntry.ts 0.9130434782608695 (21/23) ignored 11`
  - survivor 162:57 ObjectLiteral, 207:7 ConditionalExpression
- `{"measured":{"packages/core/src/SinkCodec.ts":0.9751552795031055,"packages/core/src/SinkWire.ts":1,"packages/devtools/src/model/Source.ts":1,"packages/audit/src/AuditEntry.ts":0.9130434782608695},"unmeasured":{},"new":[],"deleted":{}}`

The AuditEntry.ts survivor at 207:7 is the `malformed(json.failure.message)` branch the plan deletes in 40-06; the 162:57 one sits in audit's `asDecodeRefusal`, also deleted there.

## ADR-QD-153

Revision 1.0 (2026-11-14), status `Accepted — amends ADR-QD-095 and ADR-QD-143`. `spec/traceability.md` Rev 1.171, `spec/README.md` Rev 1.175. `node scripts/spec-revise.mjs --check` and `pnpm spec:verify:strict` (21 PASS, 0 FAIL) are green.

## Commits

- `bc19d65e` chore(40-01): mutation baseline for the decode refusal and the single decode (the JSON alone, parent is `phase_base`)
- `251ccd1a` docs(40-01): ADR-QD-153, core owns describing a decode refusal (four spec files)

## Deviations from Plan

**1. [Rule 3 - Blocking] The verbatim baseline writer refused a file with no mutant at all**
- **Found during:** Task 1, step 4
- **Issue:** `SinkWire.ts` is module-scope types and constants only (`Data.taggedEnum`), so Stryker instrumented no mutant in it and the JSON report has no `files` entry for it. The writer's `missing <file> in <report>` branch then exits 1, though the plan's own WX-05 boundary says a file with no scored mutant reads 1, and the QD-38 baseline recorded it as `(0/0)`. The report holds the other file only (199 mutants = 161 scored + 38 ignored, all in SinkCodec.ts).
- **Fix:** ran the same writer with that one branch replaced by a default of an empty mutant list (printed `no mutant at all in ... reads 1`); every other refusal (stale report, another file mutated, config reporting elsewhere, file not in the mutate set) is unchanged. No Stryker config was edited.
- **Files modified:** none beyond the baseline JSON
- **Commit:** bc19d65e

**Total deviations:** 1 auto-fixed (Rule 3). **Impact:** none; the baseline holds exactly the four files, `unmeasured`, `new` and `deleted` empty.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- 40-mutation-base.json, the ADR file, index.yaml, traceability.md and README.md exist; both commits are ancestors of HEAD; `git status --porcelain -- packages scripts AGENTS.md` is empty; both tasks' automated verifies exit 0.
