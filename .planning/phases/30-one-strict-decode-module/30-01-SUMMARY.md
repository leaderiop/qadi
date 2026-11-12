---
phase: 30-one-strict-decode-module
plan: 01
subsystem: testing
tags: [characterisation, refusal-precedence, stryker, untrusted-decode]
phase_base: 055c859320f2396a6b2c97cecae2c455836a1603
plan_head_before: 055c859320f2396a6b2c97cecae2c455836a1603
plan_head_after: b56d5b387189ab0e458a16f6a50a5f08bd33bc31
status: complete

requires:
  - phase: 29-restated-facts
    provides: the fresh-report baseline writer this plan's Task 1 is ported from
provides:
  - 30-mutation-base.json, the per-file Stryker baseline for the 13 src files the phase changes
  - one refusal-precedence table per untrusted seam, green on the phase base
  - the seam inventory (below), each site classified
affects: [30-02, 30-03, 30-04, 30-05, 30-09]

actuals:
  tokens: 8100
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Refusal-precedence table: one describe per seam, one it per input, a `flips in 30-0N` marker in the title of every row a later plan changes"

key-files:
  created:
    - .planning/phases/30-one-strict-decode-module/30-mutation-base.json
    - packages/core/test/UntrustedSeams.test.ts
    - packages/react/test/UntrustedSeams.test.ts
    - packages/audit/test/UntrustedSeams.test.ts
  modified:
    - packages/devtools/test/model/ExplorerSession.test.ts

key-decisions:
  - "Characterisation pins what the base returns: the one row whose planned value was wrong (hydration `[]`) was corrected to the observed value"

requirements-completed: [DEC-02, WX-05, WX-06]

duration: 6 min
completed: 2026-11-12
---

# Phase 30 Plan 01: Baseline and refusal-precedence tables Summary

Per-file mutation baseline for the 13 files phase 30 changes, committed alone as the phase's first commit, then 76 refusal-precedence rows (core 41, react 17, audit 18) plus one paste-box pin, all green on the phase base with no src change.

phase_base: 055c859320f2396a6b2c97cecae2c455836a1603

## Commits

| Task | Commit | Message |
|---|---|---|
| 1 | `c7e52f9f` | chore(30-01): mutation baseline for the untrusted-decode files |
| 2 | `ead8f224` | test(30-01): core and devtools refusal-precedence tables on the phase base |
| 3 | `b56d5b38` | test(30-01): hydration and audit refusal-precedence tables on the phase base |

`commits: 3` is measured (`git rev-list --count 055c8593..HEAD`). The baseline commit's parent is `phase_base`; `chore(30-01)` is the phase's first `(30-0` commit and carries only the JSON.

## Reserved-number check

`ARCH-78`, `ADR-QD-143`, `CCR-QD-421`, `BEH-QD-486..490`, `INV-QD-305`, `INV-QD-306`: the grep over `spec packages .changeset AGENTS.md apps/website/src` printed nothing for each, and `spec/decisions` has no `143-` file. All free. `scripts/next-id.mjs` was not run.

## Seam inventory (DEC-02)

Every code line (comments excluded) matching `JSON.parse | Schema.decode* | fromJsonString | exceedsJsonDepth | onExcessProperty` in `packages/*/src` at the phase base. No site outside this table exists, so no unplanned seam.

| Site | Class | Reason |
|---|---|---|
| `Policy.ts:916` `PolicyFromJson = Schema.fromJsonString(Policy)` | seam, moves in 30-02 | the text decoder; removed (D-05) |
| `Policy.ts:1004` `decodePolicyUnknown`, `:1029` `JSON.parse`, `:1033` fallback decode, `:1035` and `:1060` `exceedsJsonDepth`; `:1002` `UNTRUSTED_DECODE_OPTIONS` | seam, moves in 30-02 | `fromJson` / `fromJsonValue` and the option object |
| `SinkCodec.ts:63` import, `:423` `decodeWire`, `:502` guard, `:519` `JSON.parse` | seam, moves in 30-03 | `decodeSinkRecord`, `decodeSinkRecordString` |
| `SinkCodec.ts:602` `JSON.parse` in `decodeStoredRecordString` (and `decodeStoredRecord`) | non-seam | reads the stored envelope with `ownValue` and hands `record` to `decodeSinkRecord`; guarding the envelope would refuse a deep unknown envelope key that ADR-QD-096 D-15-c says is ignored (row pinned in the core table) |
| `PortWireEncode.ts:18, :104, :106, :120, :138` | seam, moves in 30-03 | `decodeQuestion` / `decodeAnswer` |
| `PortRemote.ts:31, :123, :151` | seam, moves in 30-03 | the remote reply decode. These three sites are DEC-02's "three PortWireEncode decoders" (two in `PortWireEncode.ts`, the reply in `PortRemote.ts`) |
| `AuditArchive.ts:252` `decodeEnvelope` | seam, moves in 30-04 | archive envelope |
| `AuditEntry.ts:150` `decodeRow` | seam, moves in 30-04 | audit row (`record` unwalked) |
| `AuditEntry.ts:163` `recordJsonOf` | non-seam | lenient on purpose (ADR-QD-096 D-15-c); runs only after the strict read |
| `HydrationEngine.ts:46, :198-200, :440, :480` | seam, moves in 30-05 | payload, entry and policy decoders and both guards |
| `PortSpanEncode.ts:56, :59` | non-seam | span attributes, not an untrusted JSON seam (CONTEXT out of scope) |
| `SimulationForm.ts:70` `JSON.parse` | non-seam | the devtools form's own typed text (CONTEXT out of scope) |
| `DecodeDepthGuard.ts:36` | the primitive | definition; stays (D-10) |
| doc-comment mentions (`HydrationMetrics.ts`, `Errors.ts`, `FieldPath.ts`, `JsonHazard.ts`, `Decision.ts`, `SinkRecordFields.ts`, `Hydration.ts`, `HydrationEngine.ts` comments) | not code | comments |

## Baseline scores (`30-mutation-base.json`)

Fresh reports, one config at a time, each newer than every file under its package's `src` and `test`. Every run exited 0 (all above the 80 break threshold).

| File | Score |
|---|---|
| core `Policy.ts` | 0.9801 |
| core `Errors.ts` | 1.0000 |
| core `SinkCodec.ts` | 0.9278 |
| core `PortWireEncode.ts` | 0.6923 |
| core `PortRemote.ts` | 0.8365 |
| core `HydrationMetrics.ts` | 1.0000 |
| core `DecodeDepthGuard.ts` | 0.9474 |
| react `HydrationEngine.ts` | 0.9693 |
| react `HydrationEvent.ts` | 1.0000 |
| react `DeveloperSignals.ts` | 0.9663 |
| audit `AuditArchive.ts` | 0.9808 |
| audit `AuditEntry.ts` | 0.8000 |
| devtools `model/ExplorerSession.ts` | 0.9162 |

`PortWireEncode.ts` (0.6923) and `AuditEntry.ts` (0.8000) start low; 30-09 compares against these, not against a floor.

## Rows the base reported differently from the plan

| Row | Planned | Observed on the base |
|---|---|---|
| `hydrateDecisions([])` | `UnsupportedPayloadVersion` (planned on the belief that `Predicate.isObject` accepts an array) | `MalformedPayload`: the base refuses an array as not an object before the version check |
| the three exact excess-key sentences (`decodeQuestion`, `decodeAnswer`, remote reply) | "paste the observed string" | `Expected no excess property\n  at ["rloe"]`, pinned as a literal in all three |
| paste-box not-JSON sentence | `Expected a valid JSON string` | same, as expected |

Consequence for 30-05: the row "an array payload nested past the bound" is `MalformedPayload` on the base because the array is refused as not-an-object, not by the depth guard. It is marked `flips in 30-05` as the plan requires, but it flips to `PayloadTooDeep` only if the module's guard runs ahead of the object check there; if 30-05 keeps the object check first, that row stays `MalformedPayload` and its marker should be removed in the same commit.

## Flip rows marked (D-13)

| Plan | Rows |
|---|---|
| 30-02 | core: `Policy.fromJson("}{")` and the 60,000-deep text missing its final brace (SchemaError -> PolicyNotJson); devtools: the paste-box not-JSON sentence |
| 30-04 | audit: envelope extra key nested past the bound, `metadata` nested past the bound, nested past the bound with `archiveVersion: "2"` (Malformed -> TooDeep); row: extra row key nested past the bound (Malformed -> TooDeep) |
| 30-05 | react: extra envelope key nested past the bound, array payload nested past the bound (conditional, see above), nested past the bound with `version: 3`, `subjectId` nested past the bound (MalformedPayload -> PayloadTooDeep) |

## Gaps closed

- G1: the three "nests deeper than the decode bound" sentences (question, answer, reply) are pinned byte for byte, and each has a deeper-than-bound row (60,000 deep for the question and answer, no throw).
- G2: hydration's envelope nested past the bound (four rows) and the audit archive's envelope (three rows) now exist on the base.
- G3 stays for 30-02 (`fromJson`'s own pins).
- INV-QD-306 pins on the base: an entry 60,000 deep (hydration), an archive entry 60,000 deep (`EntryNotDecodable` index 0, `TooDeep`), a stored-record envelope key 60,000 deep (success, no throw).

## Deviations from Plan

None - plan executed exactly as written, apart from the one characterised value above (a corrected planned expectation, not a code deviation). One test-file adjustment worth knowing: the hydration 60,000-deep row passes the payload without the JSON round trip (`JSON.stringify` itself overflows at that depth) and types it as `ReturnType<typeof JSON.parse>`, the type a page's payload has, because `hydrateDecisions`' parameter is the well-formed `DehydratedDecisions`.

## Verification

- `pnpm vitest run --project core packages/core/test/UntrustedSeams.test.ts`: 41 passed
- `pnpm vitest run --project devtools packages/devtools/test/model/ExplorerSession.test.ts`: 47 passed
- `pnpm vitest run --project react packages/react/test/UntrustedSeams.test.ts`: 17 passed
- `pnpm vitest run --project audit packages/audit/test/UntrustedSeams.test.ts`: 18 passed
- Task 1 and Task 2 and Task 3 automated structure checks: pass; no file under `packages/*/src` changed
- `pnpm typecheck`, `oxlint` on the new files and `scripts/check-house-style.mjs`: clean

## Known Stubs

None.

## Threat Flags

None. Test-only plan; no new endpoint, auth path or trust boundary.

## Self-Check: PASSED

- FOUND: `.planning/phases/30-one-strict-decode-module/30-mutation-base.json`, `packages/{core,react,audit}/test/UntrustedSeams.test.ts`
- FOUND commits: `c7e52f9f`, `ead8f224`, `b56d5b38`

Ready for 30-02.
