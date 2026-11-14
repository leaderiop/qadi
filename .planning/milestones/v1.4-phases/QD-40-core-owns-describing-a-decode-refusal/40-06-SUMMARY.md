---
phase: QD-40-core-owns-describing-a-decode-refusal
plan: 06
subsystem: audit-source
tags: [decode-refusal, audit, single-decode, house-style-budget]
phase_base: eb5a94063ac2ba730eaff53ac7095b3e0add36ca
plan_head_before: 372329f2
plan_head_after: fe561cf0
requires: [40-05]
provides:
  - "decodeAuditEntry decodes a row's record once, through decodeSinkRecordWithJson; the entry's record is that decode's json"
  - "recordJsonOf, audit's asDecodeRefusal and the malformed(json.failure.message) branch deleted; the row refusal is core's decodeRefusalOf"
  - "packages/audit/src/AuditEntry.ts out of UNTRUSTED_DECODE_BUDGET, its _NAMES entry and its AGENTS.md 7a row, in the same commit"
  - "INV-QD-325 sentinel in AuditEntry.test.ts"
affects: [40-07, 40-08, 40-09]
actuals:
  tokens: 6500
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: [one strict decode gives the record and its JSON form; one refusal mapping, in core]
key-files:
  created: []
  modified:
    - packages/audit/src/AuditEntry.ts
    - scripts/check-house-style.mjs
    - AGENTS.md
    - packages/audit/test/AuditEntry.test.ts
key-decisions:
  - "decodeAuditEntry keeps its order (record first, then row) and its no-record Malformed check; only the second, lenient decode and the local refusal mapping went"
requirements-completed: [DREF-05, DREF-06, WX-04]
duration: ~4 min
completed: 2026-11-14
status: complete
commits: 2
---

# Phase 40 Plan 06: Audit decodes a row's record once Summary

`decodeAuditEntry` takes the record and its JSON form from core's single strict decode, so the lenient `recordJsonOf` read and audit's copy of the refusal mapping are gone and `@qadi/audit` leaves the untrusted-decode budget.

## Commits

- `a781a2ee` refactor(40-06): audit reads a row's record once, through core's strict decode (AuditEntry.ts, check-house-style.mjs, AGENTS.md only)
- `fe561cf0` test(40-06): the entry's record is the strict decode's JSON form (AuditEntry.test.ts only)

Trailer: both end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (see Deviations).

## What changed

- `AuditEntry.ts`: `decodeAuditEntry` reads `decodeSinkRecordWithJson(input.record)`, returns its failure unchanged, then `decodeRow(input)` whose failure becomes `SinkRecordNotDecodable({ refusal: decodeRefusalOf(row.failure) })`; the entry is `{ record: decoded.success.json, sequenceNumber }`. `asDecodeRefusal`, `recordJsonOf` and the `Match`, `UntrustedValueRefusal`, `decodeSinkRecord` imports are deleted; `malformed` stays for the no-record row. Docs say the record is decoded once and the entry holds that decode's JSON form (ADR-QD-110, ADR-QD-153).
- `check-house-style.mjs`: the `recordJsonOf` comment and `AuditEntry.ts: 1` budget line, and the `_NAMES` entry, removed. `UNTRUSTED_DECODE_TOKEN` untouched. `AGENTS.md`: the `AuditEntry.ts` row of section 7a removed.
- `AuditEntry.test.ts`: describe `the entry's record is the strict decode's JSON form` with two cases (all four record kinds `s1`..`s4` round-tripped through `JSON.parse(JSON.stringify(entry))`, serialised text equal to `decodeSinkRecordWithJson(row.record).json` and the read record deep-equal to the original; and a version-2 row with an unknown envelope key and reversed keys reading to the strict decode's text, without the key and in schema order). Green on arrival, as planned.

## Counted untrusted-decode tokens

- `AuditEntry.ts`: 1 -> 0 (budget entry removed, not left at zero).
- `SinkCodec.ts`: 2 (unchanged by this plan, set in 40-04).

## Verification

- `pnpm exec vitest run --project audit packages/audit/test`: 22 files, 398 tests green, `AuditEntryDifferential.test.ts` included and unedited since its `test(40-02)` commit (verify script checks this).
- After Task 2: `AuditEntry.test.ts` 38 tests green (2 new).
- Plan verify scripts for both tasks exit 0; `pnpm typecheck`, `pnpm lint` (house-style: 498 files clean; only pre-existing warnings), `pnpm circular`, `pnpm run build` all pass.
- No other audit src file changed since the phase base; `Retention.ts` untouched.

## Deviations from Plan

**1. [Attribution] Commit trailer is `Claude Sonnet 5.5`, not `Claude Opus 5.5`**
- **Found during:** both commits
- **Issue:** plan and brief ask for `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; this executor runs as Sonnet 5.5 and the session's attribution instruction gives that line. Same choice as 40-05. The Opus line would misstate the author.
- **Fix:** Sonnet line as last line of both messages. If a uniform milestone trailer matters, amend `a781a2ee` and `fe561cf0` before anything is pushed.
- **Commit:** a781a2ee, fe561cf0

**Total deviations:** 1 attribution. **Impact:** none on behaviour.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Flags

None. T-40-15: the entry's record is `decodeSinkRecordWithJson`'s `json`, pinned by the unedited differential and the new text-equality sentinel. T-40-16: record still read first by core's guarded decoder, `decodeRow` still leaves `record` unwalked, TooDeep cases green. T-40-SC: no manifest or lockfile change.

## Self-Check: PASSED

- `a781a2ee` and `fe561cf0` are ancestors of HEAD; the four plan files exist; `git status --porcelain -- packages scripts AGENTS.md` is empty.
