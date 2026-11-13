---
phase: 30-one-strict-decode-module
plan: 07
subsystem: spec
tags: [adr, spec, traceability, overview, bench, untrusted-decode]
plan_head_before: b6768cb4f20b1dc8f74e60e713f7c145bc11134d
plan_head_after: 1addd4c218ff61868f9e138f0fef3c161e8a6f62
status: complete

requires:
  - phase: 30-06
    provides: the narrowed @qadi/core surface and UNTRUSTED_DECODE_BUDGET the records describe
provides:
  - ADR-QD-143 and the two dated amendments (ADR-QD-096, ADR-QD-107)
  - BEH-QD-486..489, INV-QD-305, INV-QD-306, CCR-QD-421
  - spec/overview.md current with the code; gate 13 green
  - packages/core/bench/UntrustedDecode.bench.ts
affects: [30-08, 30-09]

actuals:
  tokens: 21000
  tasks: 2
  commits: 2

key-files:
  created:
    - packages/core/bench/UntrustedDecode.bench.ts
    - spec/decisions/143-untrusted-json-is-decoded-through-one-module.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md
    - spec/decisions/107-a-port-is-answered-remotely-through-its-description.md
    - spec/behaviors/08-serialization.md
    - spec/behaviors/19-hydration.md
    - spec/behaviors/25-inspection.md
    - spec/behaviors/33-audit-pipeline.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/overview.md
    - spec/README.md

key-decisions:
  - "ADR-QD-143 records why each of the four UNTRUSTED_DECODE_BUDGET rows exists, including the two non-seams (recordJsonOf, PortSpanEncode.ts)"
  - "BEH-QD-259 is restated so it describes the decoder, not a barrel export; exceedsJsonDepth is package-private"
  - "BEH-QD-490 left Unused: no behaviour needed splitting"

requirements-completed: [DEC-05, WX-02, WX-03]

duration: 40 min
completed: 2026-11-12
---

# Phase 30 Plan 07: Records for the untrusted decoder Summary

The spec now describes the code: ADR-QD-143 (with the measured cost of the double check), BEH-QD-486..489, INV-QD-305/306, the overview's names and module column, traceability, and the CCR-QD-421 row, all on reserved numbers only.

## Commits

| Task | Commit | Message |
|---|---|---|
| 1 | `50b6db11` | docs(30-07): ADR-QD-143 and its measurements; ADR-QD-096 and ADR-QD-107 amended |
| 2 | `1addd4c2` | docs(30-07): behaviours, invariants, traceability and overview for the untrusted decoder; CCR-QD-421 |

`commits: 2` measured (`git rev-list --count b6768cb4..HEAD`).

## Bench (D-15)

`packages/core/bench/UntrustedDecode.bench.ts`, run twice with the verbose reporter (plain `pnpm bench <file>` printed no per-benchmark table, only the pass count; `pnpm exec vitest bench --run --reporter=verbose <file>` prints it). Ratios are one pair within a run; absolute throughput moves about 30% (AGENTS.md section 5a).

| Pair | hz (first, second run) | Ratio |
|---|---|---|
| policy decoder alone vs entry decoder then policy decoder, 10 frames | 275k/256k vs 230k/210k | 1.19-1.22x |
| same, 60 frames | 52.9k/49.4k vs 50.2k/47.5k | 1.04-1.05x |
| strict decode with no guard vs `untrustedDecoder(Policy)`, 10 frames | 311k/287k vs 275k/254k | 1.13x |
| same, 60 frames | 58.8k/54.3k vs 53.1k/49.7k | 1.09-1.11x |
| `decodeSinkRecord` alone vs row decoder then `decodeSinkRecord` | 137k/137k vs 124k/125k | 1.10-1.11x |

No guard was dropped; the ratios are in ADR-QD-143 under Cost.

## Reserved numbers

| Number | Fate |
|---|---|
| ARCH-78, ADR-QD-143, CCR-QD-421 | used |
| BEH-QD-486, 487 (`08-serialization.md`), 488 (`19-hydration.md`), 489 (`33-audit-pipeline.md`) | used |
| BEH-QD-490 | **Unused** (named so in CCR-QD-421's row) |
| INV-QD-305, INV-QD-306 | used |

`node scripts/next-id.mjs` was not run. The plan's id-minting verify (every id added since the phase base is reserved or existed at the base) printed `[]` over 629 ids.

## Documents revised

| Document | Revision |
|---|---|
| `spec/decisions/143-...md` | 1.0 (new) |
| `spec/decisions/096-...md` | 1.3 -> 1.4 |
| `spec/decisions/107-...md` | 1.3 -> 1.4 |
| `spec/behaviors/08-serialization.md` | 1.2 -> 1.3 |
| `spec/behaviors/19-hydration.md` | 1.16 -> 1.17 |
| `spec/behaviors/25-inspection.md` | 1.22 -> 1.23 |
| `spec/behaviors/33-audit-pipeline.md` | 1.18 -> 1.19 |
| `spec/invariants.md` | 1.107 -> 1.108 |
| `spec/traceability.md` | 1.153 -> 1.154 |
| `spec/overview.md` | 1.95 -> 1.96 |
| `spec/README.md` | 1.156 -> 1.157 |

All dated 2026-11-12; `spec-revise --check` green.

## Carry-forwards closed

- 30-06's removals: `exceedsJsonDepth`, `UNTRUSTED_DECODE_OPTIONS` and `PolicyFromJson` gone from the overview; BEH-QD-259 restated (its listing names `untrustedDecoder` and `MAX_DECODE_DEPTH` in `UntrustedDecode.ts`; the "reachable from the barrel" requirement is replaced; the stale "other four hydrate-side reasons" is now "other six"). The leaf's six exports each have a row; `MAX_DECODE_DEPTH`'s module is `UntrustedDecode.ts`; `DEFAULT_MAX_DEPTH` is its own `Policy.ts` row.
- 30-05's ninth reason: `19-hydration.md` (count and an amendment naming the hydrate-side set), `overview.md` (nine reasons), INV-QD-045's note. `25-inspection.md`'s metric table needs no edit (it lists ids, not series).
- 30-02's `PolicyNotJson`: BEH-QD-057's `fromJson` channel, BEH-QD-487, the overview's error row and an Errors-section paragraph (`ACL021`).
- 30-06's budget: ADR-QD-143 records why each of the four budget rows exists.
- `ArchiveRefusal.TooDeep` in BEH-QD-254, BEH-QD-489 and the overview row.

## Verification (all green)

- `node scripts/check-api-surface.mjs` (gate 13): 911 exports documented across 9 packages
- `pnpm spec:examples`: 108 blocks compile
- `pnpm spec:verify:strict`: PASS 21, FAIL 0
- `pnpm spec:gates`, `pnpm spec:claims`, `node scripts/spec-revise.mjs --check`: green
- `pnpm lint`: house-style 463 files clean (oxlint warnings are pre-existing)
- `pnpm typecheck`: clean (run for Task 1; Task 2 touched no code)
- `pnpm bench`: Task 1's verify ran it; see above

## Deviations from Plan

**1. [Rule 3 - Blocking] The plan's overview verify cannot pass as written**
- **Found during:** Task 2 verify
- **Issue:** the fourth check requires every overview row containing `` `DEFAULT_MAX_DEPTH` `` to say `Policy.ts`, but the `RenderTraceOptions` row (`Decision.ts`) mentions it in prose, and every row containing `` `untrustedDecoder` `` to say `UntrustedDecode.ts`.
- **Fix:** tightened wording rather than weakening the check: the `RenderTraceOptions` row now reads "`DEFAULT_MAX_DEPTH` (`Policy.ts`) levels", the `MAX_DECODE_DEPTH` row says "four times the evaluation-time bound", and the codec row says "the untrusted decoder (`UntrustedDecode.ts`)".
- **Files modified:** `spec/overview.md`
- **Commit:** `1addd4c2`

**2. [Plan text corrected] Bench invocation** — `pnpm bench <file>` passes but prints no timings; the numbers came from `pnpm exec vitest bench --run --reporter=verbose`. The bench file imports `decodeSinkRecord` and the V2 fixture; the plan's (b) row decoder is a struct decoder with `record` unwalked, built in the bench because `AuditEntry.ts` lives in `@qadi/audit`.

**3. [Accuracy] The plan's inventory said the archive envelope had its guard "with entries left in"** — at the phase base the archive envelope had no guard at all (a deep excess key was `Malformed` only because the strict decode refused the key before recursing). ADR-QD-143's table says so.

**Total deviations:** 1 blocking (wording), 2 corrections. **Impact:** none on scope.

## Known Stubs

None.

## Threat Flags

None. Docs and a bench file only.

## Notes for 30-08 and 30-09

- CCR-QD-421's row already names 30-08's eight files; if 30-08 changes the set, edit that row (and `spec-revise` README) in the same commit.
- ADR-QD-143 says `UNTRUSTED_DECODE_OPTIONS` was published by `Policy.ts` (CCR-QD-139): 30-08's changeset should treat it as a released name, as 30-06 suggested confirming.

## Self-Check: PASSED

- FOUND: `packages/core/bench/UntrustedDecode.bench.ts`, `spec/decisions/143-untrusted-json-is-decoded-through-one-module.md`
- FOUND commits `50b6db11`, `1addd4c2` (ancestors of HEAD)
