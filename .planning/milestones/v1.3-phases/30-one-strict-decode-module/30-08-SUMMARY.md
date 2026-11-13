---
phase: 30-one-strict-decode-module
plan: 08
subsystem: docs
tags: [changesets, upgrading, untrusted-decode, breaking]
plan_head_before: 51b3c4e30bd03e17795ed8fab59a8cd28964fa6e
plan_head_after: 6b0c2cec1e268b12eff3067fc9ac5d5c654df780
status: complete

requires:
  - phase: 30-02 .. 30-06
    provides: the final names and removed exports
provides:
  - four changesets, two upgrading sections, three package-doc sentences
affects: [30-09]

actuals:
  tokens: 5000
  tasks: 2
  commits: 2

key-files:
  created:
    - .changeset/untrusted-decode-core.md
    - .changeset/untrusted-decode-react.md
    - .changeset/untrusted-decode-audit.md
    - .changeset/untrusted-decode-devtools.md
  modified:
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - apps/website/src/content/docs/docs/packages/react/hydration.md
    - apps/website/src/content/docs/docs/packages/audit/capabilities.md
    - packages/audit/README.md

key-decisions:
  - "MAX_DECODE_DEPTH is unchanged versus 0.11.0 (DEFAULT_MAX_DEPTH 64 x 4 = 256); said so in the changeset and upgrading"
  - "UNTRUSTED_DECODE_OPTIONS and exceedsJsonDepth are treated as released names: both were exported by @qadi/core@0.11.0"

requirements-completed: [WX-02, WX-07]

duration: 8 min
completed: 2026-11-12
---

# Phase 30 Plan 08: Changesets and upgrading entries Summary

Every public break of Phase 30 is recorded in a changeset and in two new 0.12 upgrading sections, with its migration; nothing is versioned or released.

## Commits

| Task | Commit | Message |
|---|---|---|
| 1 | `be1f9943` | docs(30-08): changesets for the untrusted decoder's breaks |
| 2 | `6b0c2cec` | docs(30-08): upgrading entries and package docs for the untrusted decoder's breaks |

`commits: 2` measured from `51b3c4e3`.

## Changesets

- `@qadi/core` minor, **Breaking.**: `PolicyFromJson` removed; `UNTRUSTED_DECODE_OPTIONS` removed and `exceedsJsonDepth` unexported (both released in 0.11.0); `fromJson` gains `PolicyNotJson` (ACL021); `MAX_DECODE_DEPTH` unchanged at 256, now declared in `UntrustedDecode.ts`; `ClientHydrationDropReason`/`hydrationDropReasons` gain `PayloadTooDeep`; additive exports `untrustedDecoder`, `UntrustedRefusal`, `UntrustedValueRefusal`, `UntrustedDecoder`, `UntrustedDecoderOptions`, `UnwalkedKey`.
- `@qadi/react` minor, **Breaking.**: `PayloadRefusalReason` gains `PayloadTooDeep` (was `MalformedPayload`, including an array payload nested past the bound).
- `@qadi/audit` minor, **Breaking.**: `ArchiveRefusal.TooDeep`; `decodeAuditEntry` row too-deep is `DecodeRefusal.TooDeep`.
- `@qadi/devtools` patch: the paste box says "The text is not JSON".

## Upgrading headings (appended after the last 0.12 section, core first)

1. ``## 0.12: untrusted JSON is decoded through `untrustedDecoder` `` (Removed/Instead table; Before is a ```ts fence, After is a compiled ```typescript fence)
2. `## 0.12: a payload or an archive nested past the decode bound is reported as too deep` (one compiled ```typescript fence for `ArchiveRefusal`)

Compiled ```typescript fences: two (the `untrustedDecoder` After and the `ArchiveRefusal` match); the Before fence names removed exports so it is ```ts.

## Package docs

`hydration.md` (PayloadTooDeep sentence), `capabilities.md` and `packages/audit/README.md` ("nests past the decode bound" in `readAuditArchive`'s refusals). The README's `decodeAuditEntry` sentence is unchanged.

## Verification

- Task 1 verify (bumps, names, no version/CHANGELOG change since phase base): ok
- `pnpm spec:website-examples` (52 blocks compile), `pnpm spec:publish`: green; upgrading headings/doc-sentence check: ok; reserved-ids check: ok
- `pnpm lint`: house-style clean (oxlint warnings pre-existing)
- CCR-QD-421 row already names these eight files; no spec edit.

## Deviations from Plan

None - plan executed exactly as written (the upgrading After fences were made ```typescript beyond the plan's minimum, and compile).

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: the four changesets; commits `be1f9943`, `6b0c2cec`
