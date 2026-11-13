---
phase: 30-one-strict-decode-module
plan: 04
subsystem: audit
tags: [untrusted-decode, audit-archive, audit-entry, archive-refusal]
phase_base: 055c859320f2396a6b2c97cecae2c455836a1603
plan_head_before: 2a5d47e6
plan_head_after: f6624f3b
status: complete

requires:
  - phase: 30-02
    provides: untrustedDecoder, UntrustedValueRefusal, MAX_DECODE_DEPTH
provides:
  - the archive envelope and the audit row decoded only through the module, partial walks as `unwalked`
  - ArchiveRefusal.TooDeep { maxDepth } (Breaking, D-07)
affects: [30-06, 30-07, 30-08]

actuals:
  tokens: 6000
  tasks: 2
  commits: 2

key-files:
  modified:
    - packages/audit/src/AuditArchive.ts
    - packages/audit/src/AuditEntry.ts
    - packages/audit/test/UntrustedSeams.test.ts

key-decisions:
  - "The row's too-deep maps to the existing DecodeRefusal.TooDeep, no new member (D-07)"

requirements-completed: [DEC-02, DEC-04, DEC-06, DEC-07, WX-04, WX-06]

duration: 6 min
completed: 2026-11-12
---

# Phase 30 Plan 04: The audit seams on the module Summary

`readAuditArchive` and `decodeAuditEntry` now decode only through `untrustedDecoder`, with `entries` and `record` as `unwalked` options; `ArchiveRefusal` is written out in full with `TooDeep { maxDepth }` first.

## Commits

| Task | Commit | Message |
|---|---|---|
| 1 | `d11bf58d` | feat(30-04): the archive envelope decodes through the untrusted decoder; ArchiveRefusal gains TooDeep |
| 2 | `f6624f3b` | feat(30-04): the audit row decodes through the untrusted decoder |

`commits: 2` measured from `2a5d47e6` (HEAD at start; the ledger file was not written).

## The four flipped rows

| Row | Old | New |
|---|---|---|
| `readAuditArchive`, excess envelope key nested past the bound | `Malformed` | `TooDeep { maxDepth: 256 }` |
| `readAuditArchive`, `metadata` field nested past the bound | `Malformed` | `TooDeep { maxDepth: 256 }` |
| `readAuditArchive`, nested past the bound with `archiveVersion: "2"` | `Malformed` | `TooDeep { maxDepth: 256 }` |
| `decodeAuditEntry`, excess row key nested past the bound | `DecodeRefusal.Malformed` | `DecodeRefusal.TooDeep { maxDepth: 256 }` |

Each has `Flips:` on its commit body and a `flipped in 30-04 (D-07)` marker in the test title. Every other row is unchanged, including the 60,000-deep entry (`EntryNotDecodable` index 0, `TooDeep`) and the lowest-index attribution row. No audit test outside `UntrustedSeams.test.ts` needed a `TooDeep` arm.

## Names

- `AuditArchive.ts`: `decodeEnvelope = untrustedDecoder(ArchiveEnvelope, { unwalked: ["entries"] }).decode`; `asArchiveRefusal` is a module-scope `Match.tagsExhaustive` over `UntrustedValueRefusal`.
- `AuditEntry.ts`: `decodeRow = untrustedDecoder(…, { unwalked: ["record"] }).decode`; `asDecodeRefusal` likewise, wrapped in `SinkRecordNotDecodable`. `recordJsonOf` stays the one lenient decode.

## Deviations from Plan

None - plan executed exactly as written. The "counted by name in 30-06's budget" half-sentence on `recordJsonOf` was left out of the doc, since the budget does not exist yet; 30-06 should name it when it writes `UNTRUSTED_DECODE_BUDGET`.

## Verification

- `pnpm vitest run --project audit`: 390 passed after each task
- `pnpm typecheck`, `pnpm lint` (house-style clean; remaining oxlint warnings are pre-existing, unrelated files), `pnpm circular`: clean
- The structure script prints `ok`; both `Flips:` greps pass

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND commits `d11bf58d`, `f6624f3b`
