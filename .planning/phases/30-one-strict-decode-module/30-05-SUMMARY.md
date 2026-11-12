---
phase: 30-one-strict-decode-module
plan: 05
subsystem: react
tags: [untrusted-decode, hydration, payload-too-deep, drop-reason]
phase_base: 055c859320f2396a6b2c97cecae2c455836a1603
plan_head_before: 98c129bb
plan_head_after: 56214374
status: complete

requires:
  - phase: 30-02
    provides: untrustedDecoder, UntrustedValueRefusal
provides:
  - PayloadTooDeep, a ninth hydration drop reason (Breaking, D-07)
  - hydrateDecisions' payload, entries and policies decoded only through the module
affects: [30-06, 30-07, 30-08, 30-09]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

key-files:
  modified:
    - packages/core/src/HydrationMetrics.ts
    - packages/core/test/HydrationMetrics.test.ts
    - packages/react/src/HydrationEvent.ts
    - packages/react/src/DeveloperSignals.ts
    - packages/react/src/HydrationEngine.ts
    - packages/react/test/UntrustedSeams.test.ts
    - packages/devtools/test/model/Hydration.test.ts
    - features/features/hydration-counts/hydration-counts.feature

key-decisions:
  - "An array payload nested past the bound flips to PayloadTooDeep: the module's guard runs before prepare (D-04), so the guard, not the object check, refuses it; a shallow array stays MalformedPayload"

requirements-completed: [DEC-02, DEC-04, DEC-06, DEC-07, WX-04, WX-06]

duration: 7 min
completed: 2026-11-12
---

# Phase 30 Plan 05: Hydration on the module, and PayloadTooDeep Summary

`hydrateDecisions` now decodes the payload (`entries` unwalked, version in `prepare`), each entry and each policy through `untrustedDecoder`, and a payload nested past the bound outside its entries is the new reason `PayloadTooDeep` instead of `MalformedPayload`.

## Commits

| Task | Commit | Message |
|---|---|---|
| 1 | `216bb1d3` | feat(30-05): PayloadTooDeep, and the hydration payload decodes through the untrusted decoder |
| 2 | `56214374` | refactor(30-05): hydration entries and policies decode through the untrusted decoder |

`commits: 2` measured from `98c129bb`.

## The four flipped rows

| Row | Old | New |
|---|---|---|
| excess envelope key holding a value nested past the bound | `MalformedPayload` | `PayloadTooDeep` |
| array payload nested past the bound | `MalformedPayload` | `PayloadTooDeep` |
| nested past the bound and `version: 3` | `MalformedPayload` | `PayloadTooDeep` |
| `subjectId` value nested past the bound | `MalformedPayload` | `PayloadTooDeep` |

Each is marked `flipped in 30-05 (D-07)` in the test title, and Task 1's commit body carries the `Flips:` line.

### The array row (30-01's open question)

Decided: it flips. `untrustedDecoder` runs guard, then `prepare`, then the strict decode (D-04/D-07), and the guard walks an array as it is, so `[nested(OVER)]` is refused as `TooDeep` before any object check. The old `MalformedPayload` came from the hand-written `!Predicate.isObject` test running first; that ordering is gone with the hand-built partial walk. A shallow array (`[]`) is unchanged: `Predicate.isObject` rejects arrays in effect 4.1.2, so `prepare` passes it through and the decode refuses it as `MalformedPayload`. This also corrects the plan text, which said a shallow array "stays `UnsupportedPayloadVersion`"; the base never did that (30-01 observed `MalformedPayload`), and `prepare` restates the base's actual test.

Two rows added: a valid envelope with `entries: []` seeds and drops nothing; a payload with no `entries` key is `MalformedPayload`. Task 2 added the boundary row (an entry the guard admits by one frame seeds; one frame deeper is `EntryTooDeep`).

## The new reason's text (`HydrationMetrics.ts`)

- summary: "a payload nested past the client's decode bound outside its entries, refused before any decode ran"
- remedy: "the payload nests deeper than this client will decode, outside its entries — a shape dehydrateDecisions never writes, so something between the server and the client changed it. Check any proxy, cache or script that touches the page's JSON"

`MalformedPayload`'s doc, summary-adjacent remedy and the `DeveloperSignals.ts` sentence lost the "nested past the depth guard" clause; its pinned remedy fragment became `unmodified`. `ClientHydrationDropReason` and `PayloadRefusalReason` are each written out as the full closed union; `hydrationDropReasons` has nine entries, so the tagged `qadi_hydration_dropped_total` frequency gains the series by preregistration with no id or description change.

## Tests outside `UntrustedSeams.test.ts` that changed

| File | Why |
|---|---|
| `packages/core/test/HydrationMetrics.test.ts` | `REASONS` and the meanings pin list gain `PayloadTooDeep`; count 8 to 9 |
| `packages/devtools/test/model/Hydration.test.ts` | reason count 8 to 9 (the plan's one devtools change) |
| `features/features/hydration-counts/hydration-counts.feature` | `Then all 8 drop reasons appear` became 9. Not in the plan's files list: the BDD run failed without it (Rule 3), found at Task 2's verify |

## Shape of the code

- `HydrationEngine.ts`: three module-scope decoders (envelope with `{ unwalked: ["entries"], prepare: checkVersion }`, entry, policy). `PayloadVersionRefusal` is a one-member `Data.taggedEnum`, so `prepare` fails without a cast. Two module-scope `Match.tagsExhaustive`: `payloadRefusalReason` (payload) and `entryDropReason` (shared by the entry and policy reads: `TooDeep` is `EntryTooDeep`, `Malformed` is the read's own bucket, passed in), so the policy read's unreachable `TooDeep` arm is the entry read's code.
- Removed: `decodeEnvelope`'s `Schema.decodeUnknownOption`, `{ ...payload, entries: [] }`, the separate version branch, the imports of `MAX_DECODE_DEPTH`, `UNTRUSTED_DECODE_OPTIONS`, `exceedsJsonDepth`. `Option` stays (the dehydrate side uses it). No raw decision read added or removed.

## Metric table / spec

`pnpm lint` (house-style, `[metric-table]` included) is green with no spec edit: the table lists metric ids, not series. The spec's "eight reasons" prose (`spec/behaviors/19-hydration.md` and friends) and ADR/BEH restatements are 30-07's.

## Deviations from Plan

**1. [Rule 3 - Blocking] hydration-counts.feature reason count** — Found during Task 2. The scenario asserted 8 reasons; the ninth made it fail. Changed `8` to `9`. File: `features/features/hydration-counts/hydration-counts.feature`. Commit `56214374`.

**2. [Plan text corrected] shallow array** — see above; the plan's "stays `UnsupportedPayloadVersion`" contradicted the base table, `prepare` keeps the base behaviour.

**Total deviations:** 1 auto-fixed (blocking), 1 plan-text correction. **Impact:** none on scope.

## Verification

- `pnpm vitest run --project core packages/core/test/HydrationMetrics.test.ts`: 23 passed
- `pnpm vitest run --project react`: 437 passed
- `pnpm vitest run --project devtools packages/devtools/test/model/Hydration.test.ts`: 15 passed; core, react, devtools together 3806 passed
- `pnpm test:bdd`: 568 passed
- `pnpm typecheck`, `pnpm lint` (house-style clean; oxlint warnings pre-existing), `pnpm circular`: clean
- The structure script prints `ok`; the `Flips:` grep matches Task 1's commit

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND commits `216bb1d3`, `56214374`
