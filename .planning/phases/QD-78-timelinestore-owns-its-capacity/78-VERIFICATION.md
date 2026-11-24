---
phase: QD-78-timelinestore-owns-its-capacity
verified: 2026-11-24T09:30:00Z
status: passed
score: 6/6 must-haves verified
covered_files:
  - ".changeset/devtools-timeline-store-owns-its-capacity.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-01-PLAN.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-01-SUMMARY.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-02-PLAN.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-02-SUMMARY.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-03-PLAN.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-03-SUMMARY.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-04-PLAN.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-04-SUMMARY.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-05-PLAN.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-05-SUMMARY.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-06-PLAN.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-06-SUMMARY.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-07-PLAN.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-07-SUMMARY.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-08-PLAN.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-08-SUMMARY.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-09-PLAN.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-09-SUMMARY.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-10-PLAN.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-10-SUMMARY.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-11-PLAN.md"
  - ".planning/phases/QD-78-timelinestore-owns-its-capacity/78-11-SUMMARY.md"
  - "packages/devtools/src/model/DockModel.ts"
  - "packages/devtools/src/model/Timeline.ts"
  - "packages/devtools/src/model/TimelineFeed.ts"
  - "packages/devtools/src/model/TimelineStore.ts"
  - "packages/devtools/src/react/useTimeline.ts"
  - "packages/devtools/test/model/DockModel.test.ts"
  - "packages/devtools/test/model/Timeline.test.ts"
  - "packages/devtools/test/model/TimelineFeed.test.ts"
  - "packages/devtools/test/model/TimelineStore.test.ts"
  - "packages/devtools/test/react/useTimeline.test.tsx"
  - "packages/devtools/test/surface.tst.ts"
  - "spec/decisions/191-a-timeline-store-owns-its-capacity.md"
covered_digest: "v4:sha256:78cade29a87dad63fb51436b5ddb50d56e6547ff016cd86714924c0ed7d28936"
behavior_unverified: 0
overrides_applied: 0
---

# Phase QD-78: `TimelineStore` owns its capacity - Verification Report

**Phase Goal:** A `TimelineStore` owns its capacity through a `resize(capacity)` command. As a result, `makeTimelineFeed` returns its one store, and three workarounds for a captured capacity are gone: the mirror store, the six-member forwarder and the abandoned subscription.
**Verified:** 2026-11-24 at HEAD `038af3d3` (`packages/` and `spec/` are byte-identical to `35c45e60`, the clean review iteration)
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | TRSZ-01: `TimelineStore.resize(capacity): boolean` validates before changing anything, is a no-op for the same effective capacity, empties at the new bound, releases the pause, publishes once | VERIFIED | `TimelineStore.ts` `resize`: `emptyTimeline({ capacity })` first (throws before any field moves); `next.capacity === timeline.capacity` returns `false`; otherwise `timeline = next; frozen = undefined; view.publish(next); return true`. `publish`, not `set`. `clear` now builds from `timeline.capacity` (D-12), with no captured `options`. `TimelineStore.test.ts` pins each rule without a scope or source; `78-RED-EVIDENCE.md` records nine resize tests each shown failing once against an edit of `resize`. |
| 2 | TRSZ-02: the feed returns its one store; the forwarder, mirror `view`, `push` listener and the subscription left on a dropped store are deleted; `idleTimeline` gains the member | VERIFIED | `TimelineFeed.ts` read in full. `makeTimelineFeed` builds `const timeline = makeTimelineStore(...)` once and returns it as `timeline`. No `inner`, `view`, `push`, `bounded` or forwarder remains. `idleTimeline` has `resize: () => false` and stays inert (D-07), pinned by TF36. The added-lines scan finds no new forbidden construct. |
| 3 | TRSZ-03: the host's store keeps one identity; `try { resize } finally { readSource }` and the `reads.closed()` guard stay; TF4/14/26/27/29 unedited; a throwing capacity change leaves the feed's inputs unchanged | VERIFIED | `configure`: closed guard first, `effectiveCapacity(next.capacity)` (which calls `emptyTimeline`) throws before `inputs = next`; then `try { resized = timeline.resize(capacity) } finally { if (resized \|\| source changed) readSource(...) }`. The diff of `TimelineFeed.test.ts` against the phase base removes only one import line, so TF4, TF14, TF26, TF27 and TF29 are untouched (all five titles present). TF30 and TF31 (RED on base, green now) pin no half-applied inputs. TF33 was the one rewritten test, with the reason recorded in `78-RED-EVIDENCE.md`. TF34 pins identity across two capacity changes. |
| 4 | TRSZ-04: ADR-QD-191 records the command (or amends ADR-QD-137), `spec/overview.md` and a `@qadi/devtools` changeset cover the new member | VERIFIED | `spec/decisions/191-a-timeline-store-owns-its-capacity.md` exists with an index entry; ADR-QD-137 carries a dated amendment (`137-...md:158`, index status line); CCR-QD-470 row at `spec/README.md:407`; BEH-QD-726 to 730 exist in `27-` and `28-devtools-*.md` and in traceability; INV-QD-401 and 402 in `invariants.md` and traceability; `spec/overview.md:874` and `:927` carry `resize`; `.changeset/devtools-timeline-store-owns-its-capacity.md` is `"@qadi/devtools": minor`, opens **Breaking**; the 0.13 upgrade-guide rows exist (`upgrading.md:1219-1224`). `verify-traceability.sh --strict`: PASS 21, FAIL 0. `check-api-surface.mjs`: 942 exports documented. |
| 5 | Decisions D-02, D-03, D-08, D-12, D-13 (the behaviour changes) are honoured | VERIFIED | D-02: `effectiveCapacity` makes omitted and default one bound (`TimelineFeed.ts:110`, TF33). D-03: `Timeline.ts` `bound(self, entries)` returns `self` when `sameElements(kept, self.entries)`, so a zero-capacity store's `view.set` is skipped (after review fix WR-01 `f3afbc5c`, an over-bound timeline is still emptied). D-08: `useTimelineStore` runs `store.resize(capacity)` in a `useLayoutEffect`, never in render. D-12: see truth 1. D-13: `DockModel.configure` calls `effectiveCapacity` before `inputs = next`, then `try { timelineFeed.configure } finally { catalogue, roles, ports, gates, diagnostics, shownReading }`; M55 and M56 were RED on the base and are green. The capacity rule stays stated once, in `emptyTimeline`. |
| 6 | WX-01..07 cross-cutting rules hold | VERIFIED | See the requirements table. |

**Score:** 6/6 truths verified (0 behavior-unverified; every state-transition and cleanup truth has a passing behavioural test).

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `verify.artifacts` over all 11 plans | VERIFIED | `all_passed: true` for every plan (30 artifacts exist and are substantive). |
| `TimelineStore.ts`, `TimelineFeed.ts`, `Timeline.ts`, `DockModel.ts`, `useTimeline.ts` | VERIFIED | Wired as described above and read in full or by diff. |
| `78-mutation-base.json`, `78-mutation-close.json`, `78-mutation.mjs`, `78-RED-EVIDENCE.md` | VERIFIED | Present; `78-mutation.mjs compare` exits 0. |

### Key Link Verification

`verify.key-links` reported 7 links as not verified. All are tool artifacts, and each was checked by hand:

| Link | Why the tool failed | Manual check |
|------|---------------------|--------------|
| `78-mutation.mjs` to `stryker.devtools.mjs --mutate` | Pattern text not in the script | The script drives Stryker per group and `compare` reads the recorded JSON; the close record exists and compares. |
| `TimelineFeed.ts` to `TimelineStore.ts` (`timeline.resize(capacity)`) | The pattern's parentheses were read as a regex group | `resized = timeline.resize(capacity);` is present in `configure`. |
| `TimelineStore.ts` to `Timeline.ts` (`emptyTimeline({ capacity })`) | Same | `const next = emptyTimeline({ capacity });` is present. |
| `DockModel.ts` to `TimelineFeed.ts` (`effectiveCapacity(next.capacity)`) | Same | Present at `DockModel.ts:300`. |
| `TimelineStore.test.ts` to `TimelineStore.ts` | The pattern is not valid RE2 | Nine resize tests exist and pass. |
| `useTimeline.ts` to `TimelineStore.ts` (`store.resize(capacity)`) | Same | Present in the layout effect. |
| `Timeline.ts` to `TimelineStore.ts` (`next === timeline`) | The plan text predates the final shape | The store skips the notify through `view.set`'s identity check, and `bound` returns `self`. |
| `78-mutation-close.json` to base (`compare`) | Pattern not in a JSON file | `compare` exits 0. |

### Data-Flow Trace (Level 4)

Not applicable beyond wiring: there is no rendered data source. Records flow `readSource` to `marking.accept` to `timeline.accept` to `view.set`, and `useTimeline` reads `feed.timeline` through `useStoreSnapshot`.

### Behavioural Spot-Checks

| Behaviour | Command | Result | Status |
|-----------|---------|--------|--------|
| The devtools suite | `npx vitest run --project devtools` | 76 files, 1819 tests passed | PASS |
| Mutation close against base | `node 78-mutation.mjs compare` | exit 0; Timeline 106/106, TimelineStore 39/39, TimelineFeed 41/41, DockModel 72/72; 0 survived, 0 no-coverage, 0 new Ignored | PASS |
| House style | `node scripts/check-house-style.mjs` | 590 files clean | PASS |
| API surface (gate 13) | `node scripts/check-api-surface.mjs` | 942 exports documented | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict` | PASS 21, FAIL 0, SKIP 0 | PASS |
| Merge gate | `pnpm check:pr`, log `$TMPDIR/qd78/check-pr-2.log` | last line `EXIT:0`; "ran 17 of 18 steps"; 6460 tests, 568 features | PASS, as established by the orchestrator and confirmed by the log tail |

The added-line scan of `packages/*/src`, `packages/*/test`, `features` and `examples` since the phase base (`de13eb7f`) found no `as`, `any`, `switch`, `fnUntraced`, `async` or `await`, `console`, `process.env`, `Record<string, unknown>`, `Stryker disable`, module-scope `let`, D-number, phase number, plan id or requirement id.

### Probe Execution

None declared by any plan. Step skipped.

### Requirements Coverage

The union of the `requirements:` fields in the eleven PLAN files is TRSZ-01, TRSZ-02, TRSZ-03, TRSZ-04, WX-01 to WX-07. That matches the phase's ID list exactly. `REQUIREMENTS.md` maps each to Phase 78 (WX-* to "All v1.9 phases") and marks each Complete. No orphaned requirement.

| Requirement | Status | Evidence |
|-------------|--------|----------|
| TRSZ-01 | SATISFIED | Truth 1 |
| TRSZ-02 | SATISFIED | Truth 2 |
| TRSZ-03 | SATISFIED | Truth 3 |
| TRSZ-04 | SATISFIED | Truth 4 |
| WX-01 | SATISFIED | `pnpm check:pr < /dev/null` exit 0 at the final source tree |
| WX-02 | SATISFIED | Only ADR-QD-191, CCR-QD-470, BEH-QD-726 to 730 and INV-QD-401 and 402 were used; `scripts/next-id.mjs` was never run (plan prohibitions, and the records are all in the reserved range) |
| WX-03 | SATISFIED | `spec/overview.md` rows updated; gate 13 passes (942); gate 14 ran inside `check:pr` |
| WX-04 | SATISFIED | Added-line scan clean; `UNTRUSTED_DECODE_BUDGET` and the other budgets did not move (house-style clean) |
| WX-05 | SATISFIED | Mutation `compare` exits 0 with no survived or no-coverage mutant and no new Ignored one; coverage thresholds are part of `check:pr` |
| WX-06 | SATISFIED | `78-RED-EVIDENCE.md`: eight tests RED on the unchanged base, five characterisations green there, each new check shown failing once after the change |
| WX-07 | SATISFIED | Scan above; nothing released, tagged or pushed in the phase commits |

### Anti-Patterns Found

None. Debt-marker, empty-implementation and stub scans over the five changed `src` files and the added test lines found nothing relevant. `idleTimeline`'s `resize: () => false` is the specified inert stand-in (D-07), not a stub.

### Prior-Phase Regression

Phase 77 is the only prior phase in this milestone. Its audit suite runs inside `check:pr` (exit 0), and `git diff 35c45e60 HEAD -- packages spec` is empty, so the sole later commit changed only planning records.

### Review, Security and Validation

- Code review: iteration 1 found one warning (WR-01); it was fixed in `f3afbc5c` and iteration 2 was clean (0 findings). `78-REVIEW-FIX.md` records 1 fixed and 2 no change needed.
- `78-SECURITY.md`: `status: verified`, `threats_open: 0`.
- `78-VALIDATION.md`: `status: validated`, `nyquist_compliant: true`.

### Human Verification Required

None. The phase touches `useTimeline.ts` but changes no rendered markup, styling or layout (the ROADMAP carries `**UI hint**: no`), and the hook's behaviour is pinned by `useTimeline.test.tsx`.

### Gaps Summary

No gaps. The goal holds in code: `resize` is a store command that validates before it mutates, the feed returns its single store, and the mirror, the forwarder, the `push` listener and the orphaned subscription are deleted. A rejected capacity leaves the feed, the dock and the hand-fed hook untouched, and the host's store keeps its identity across a capacity change.

Minor notes, none blocking:
- `effectiveCapacity` is an `export function` in `TimelineFeed.ts` shared by the feed and the dock. It is not in the package barrel, so gate 13 needs no row, and it keeps the capacity rule stated once in `emptyTimeline`.
- Seven `verify.key-links` entries fail only because the plans wrote regex-special patterns; they were checked by hand above.

---

_Verified: 2026-11-24_
_Verifier: Claude (gsd-verifier)_
