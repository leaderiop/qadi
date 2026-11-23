---
phase: QD-70-hydration-s-drop-events-come-from-its-buckets
verified: 2026-11-22T15:15:00Z
status: passed
score: 6/6 must-haves verified
covered_files:
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-01-PLAN.md"
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-01-SUMMARY.md"
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-02-PLAN.md"
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-02-SUMMARY.md"
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-03-PLAN.md"
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-03-SUMMARY.md"
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-04-PLAN.md"
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-04-SUMMARY.md"
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-05-PLAN.md"
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-05-SUMMARY.md"
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-06-PLAN.md"
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-06-SUMMARY.md"
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-07-PLAN.md"
  - ".planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-07-SUMMARY.md"
  - "packages/react/src/HydrationBuckets.ts"
  - "packages/react/src/HydrationEngine.ts"
  - "packages/react/src/HydrationEvent.ts"
  - "packages/react/test/HydrationBuckets.test.ts"
  - "packages/react/test/HydrationBuckets.tst.ts"
  - "packages/react/test/HydrationDropEvents.test.ts"
  - "packages/react/test/HydrationPayload.test.ts"
covered_digest: "v4:sha256:70ab61fd7293d379db6fdcd12b21fb1bdb6cad1ad49d190f4215b12339278308"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 70: Hydration's drop events come from its buckets Verification Report

**Phase Goal:** Every entry hydration drops is reported and counted, because the `EntriesDropped` and `LeftOut` events are derived from reason-keyed records, so a drop reason cannot gain a bucket without its event.
**Verified:** 2026-11-22
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A check RED on the base shows a bucket can exist without its event and compiles; GREEN now and shown failing once | VERIFIED | `HydrationBuckets.tst.ts` (11 pins) passes under `pnpm test:tstyche` (67 files, 359 passed). Independent experiment by this verifier: deleting the `UndecodablePolicy: []` row of `entryBuckets` gives `HydrationBuckets.ts(34,75): error TS2741: Property 'UndecodablePolicy' is missing in type ... required in type 'DropBuckets<EntryDropReason, unknown>'`. File restored; `git status` clean for packages. `70-RED-EVIDENCE.md` records the base experiment. |
| 2 | Hydrate side: one record keyed by `EntryDropReason`, `EntriesDropped` derived in one place, no direct `malformed.push` | VERIFIED | `planHydration` builds `drops = entryBuckets()`; the only pushes are `drops[...]` / `drops.MalformedEntry.push` (HydrationEngine.ts:599, 608, 613); the only `EntriesDropped(` call site in `packages/react/src` outside the event definition is inside the `dropEvents` callback (:622). Grep finds no `tooDeep`, `malformed` array, `undecodable` array, or `bucketOf`. |
| 3 | Dehydrate side: `LeftOut` derived the same way from a record keyed by its reason | VERIFIED | `planDehydration` uses `dehydrationBuckets()` typed `DropBuckets<DehydrationDropReason, DecisionEntry>`; the only `LeftOut(` call site is the `dropEvents` callback (:454). Subject check still runs first (foreign beats unencodable). |
| 4 | Events, order and counts identical to the base characterisation | VERIFIED | `HydrationDropEvents.test.ts` (written at b6434572 before the change): the diff from that commit to HEAD changes no expected value in any original row; only line wraps, retitles of the order rows, a constant derived from `hydrationDropReasons.length` in place of `9`, and added rows (both input orders). 122 tests across the five hydration test files pass (`vitest --project react`). |
| 5 | Payload refusal reason comes from `PAYLOAD_PRODUCERS`/`PAYLOAD_REASONS`; no `Match` mapper left; producer machinery pinned | VERIFIED | `payloadRefusalReason` removed; `refuse(PAYLOAD_REASONS[envelope.failure._tag], …)` and `PAYLOAD_REASONS.SubjectCheck` (:565, 578, 587). `Match` remains only for `entryDropReason` (unrelated). Producer record `satisfies { [R in PayloadRefusalReason]: PayloadProducer }`; inverse typed `ReasonRaisedBy<P>` (never for doubled or unnamed). Pinned by the tst file (OnlyMember, ReasonRaisedBy, two refused-directive pins) and driven at runtime by the conformance test in `HydrationPayload.test.ts` (one refusal per row, reason and `wholePayload` checked). |
| 6 | Spec text present, consistent with code, and plain about what the compiler does and does not enforce; no new `@qadi/react` barrel export | VERIFIED | See Spec below. `check-api-surface` reports `941 export(s)`; `packages/react/src/index.ts` exports no Hydration module other than the existing `./Hydration.ts`; `HydrationBuckets.ts` is package-private. |

**Score:** 6/6 truths verified (0 behavior-unverified; the behavior-dependent truths 2 to 5 each have exercised tests).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/react/src/HydrationBuckets.ts` | `DropBuckets`, `entryBuckets`, `dehydrationBuckets`, `dropEvents` | VERIFIED | 63 lines, substantive, imported by the engine; mapped type makes a missing key TS2741 and an extra key an excess-property error; key order is the emission order. |
| `packages/react/src/HydrationEngine.ts` | planners and payload producer record use the above | VERIFIED | Wired as above. |
| `packages/react/src/HydrationEvent.ts` | doc text updated | VERIFIED | `EntryDropReason` / `PayloadRefusalReason` docs cite ADR-QD-183. |
| `packages/react/test/HydrationBuckets.tst.ts` / `.test.ts` | type pins and runtime rows | VERIFIED | Pass. |
| `packages/react/test/HydrationDropEvents.test.ts` | 32-row characterisation | VERIFIED | Pass. |
| `.changeset/react-hydration-drop-buckets.md` | `@qadi/react` patch | VERIFIED | Present; no export change. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `planHydration` | `HydrationEvent.EntriesDropped` | `dropEvents(drops, …)` over `entryBuckets()` | WIRED |
| `planDehydration` | `HydrationEvent.LeftOut` | `dropEvents(drops, …)` over `dehydrationBuckets()` | WIRED |
| decoder failure `_tag` | `PayloadRefusalReason` | `PAYLOAD_REASONS[tag]` | WIRED |
| events | reporter and counters | unchanged `emitAll`/`emitHydration`; pinned by characterisation (reason counted before reporter runs, seeded/written not yet) | WIRED |

### Data-Flow Trace (Level 4)

Entries flow from the decoded envelope into `drops[...]` buckets, then through `dropEvents` into `HydrationEvent`s emitted by the unchanged `emitHydration`, which writes the metric and calls the reporter. The characterisation checks the metric deltas of all nine reasons per row. FLOWING.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Hydration tests | `pnpm exec vitest run --project react` on the five Hydration test files | 5 files, 122 tests passed | PASS |
| Type pins, all packages | `pnpm test:tstyche` | 67 files passed, 359 tests passed, 2 skipped (pre-existing) | PASS |
| API surface | `node scripts/check-api-surface.mjs` | 941 export(s) documented | PASS |
| House style | `node scripts/check-house-style.mjs` | 566 files clean, 3 declared switches | PASS |
| Totality is a compile error | delete one key of `entryBuckets`, `tsc --noEmit -p packages/react/tsconfig.src.json` | TS2741 at `HydrationBuckets.ts(34,75)`; file restored | PASS |
| Mutation close | `node .planning/phases/QD-70-.../70-mutation.mjs compare` from repo root | exit 0; engine 126/126, 0 survived, 0 new Ignored; `HydrationBuckets.ts` 14/14 | PASS (recorded measurement re-read; Stryker not run, as instructed) |
| Source unchanged since the green gate | `git diff 984fb6ed HEAD -- . ':!.planning'` | empty, so `pnpm check:pr` green at 984fb6ed (reported by the caller, not re-run) applies to HEAD | PASS |

### Probe Execution

No phase-declared probe scripts. Not applicable.

### Spec Consistency

- ADR-QD-183 (Rev 1.3) cites ADR-QD-152 and says its "a later phase shares the file" reason no longer applies (phases in flight have landed; the one later change, ARCH-118, edits the two reporter call sites and none of the planners or records). The payload-path decision (folded in via producers, without buckets) is recorded, with alternatives. Its Consequences bullet states plainly: a bucket is emitted and reported, the compiler does not check that code drops anything under a reason; a payload reason needs a named producer, and the compiler cannot check that a call site raises it, so the conformance test carries that.
- ADR-QD-152 amended (Rev 1.3, superseded Consequences bullet marked, old text kept).
- INV-QD-385 and INV-QD-386 present (invariants.md:4407, 4419) and agree with the code: eleven pins, key order, TS2741/TS1117 claims. INV-QD-045's enforcement restated; INV-QD-323 carries a CCR-QD-462 amendment note.
- BEH-QD-686 to 690 present in `spec/behaviors/19-hydration.md`; traceability rows for INV-QD-385/386, ADR-QD-183 and the five test files present; `CCR-QD-462` row present in README and `decisions/index.yaml` lists ADR-QD-183.
- No spec claim found overstating the compiler: each says a bucket no call site fills, or a producer nobody raises, compiles.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| DRPE-01 | SATISFIED | Truth 1 |
| DRPE-02 | SATISFIED | Truth 2 |
| DRPE-03 | SATISFIED | Truth 3 |
| DRPE-04 | SATISFIED | Truth 4 |
| DRPE-05 | SATISFIED | ADR-QD-183, INV-QD-045/385/386 |
| WX-01 | CONTRIBUTION OK | `check:pr` green at 984fb6ed (caller-reported), source identical to HEAD; gate scripts re-run here |
| WX-02 | CONTRIBUTION OK | ADR-QD-183, CCR-QD-462, BEH-QD-686..690, INV-QD-385/386 only; none of them run through `next-id.mjs` per plan records |
| WX-03 | CONTRIBUTION OK | no export added or removed; gate 13 reports 941 |
| WX-04 | CONTRIBUTION OK | house-style clean; added source lines contain no `as`, `!`, `any`, `switch`, `fnUntraced`, `async`, `console`, `process.env`, `Record<string, unknown>`, or `Stryker disable` |
| WX-05 | CONTRIBUTION OK | mutation base/close recorded, no survivor, no new Ignored; coverage thresholds are inside `check:pr` |
| WX-06 | CONTRIBUTION OK | characterisation written at b6434572 before the change; `70-RED-EVIDENCE.md`; verifier reproduced the failing compile |
| WX-07 | CONTRIBUTION OK | not grepped exhaustively here; house-style gate and the review rounds covered it |

WX rows are milestone-wide and stay Pending in REQUIREMENTS.md until the milestone closes. No orphaned requirements.

### Anti-Patterns Found

None blocking. No TBD/FIXME/XXX in the changed source. `PAYLOAD_PRODUCERS` is a runtime value read only as a type by the engine; this is documented in its doc comment and ADR-QD-183 (driven by the conformance test), not a stub.

### Human Verification Required

None.

### Gaps Summary

No gaps. Two honest limits, both already stated in the spec: the compiler does not check that a call site fills a bucket or raises a producer (the characterisation and conformance test do), and a regression in a not-yet-existing fourth reason cannot be exercised until core gains one (shown instead by the throwaway-row experiment and by this verifier's deleted-key compile).

---

_Verified: 2026-11-22_
_Verifier: Claude (gsd-verifier)_

## Re-verification (2026-11-23, milestone close sweep)

**Staleness:** `70: stale, verification d1580da2, 21 covered, 1 changed since` (`v18-stale.mjs`, run at `8752a052`).

| Cited file | Changed since `d1580da2` by |
| --- | --- |
| `packages/react/src/HydrationEngine.ts` | `b8566b76` refactor(71-04): resolve the hydration and mismatch reporters through the developer-signal table (Phase 71)<br>`42396c33` style(71): wrap the two reporter resolutions the phase added past the package's width (Phase 71) |

**What each change did to the truths:** both commits edit only the two reporter call sites, `dehydrateWith` (`leftOut:`) and `hydrateWith` (`dropped:`), which now read `reporterFor(SIGNALS.DehydrationDropped, "dehydrateDecisions", options?.onDropped)` and `reporterFor(SIGNALS.HydrationDropped, "hydrateDecisions", options?.onDropped)` in place of `hydrationDropReporter(…, saysXDropped)`; the second only wraps one call. The planners and the records are untouched, which is the reading the report already recorded ("the one later change edits the two reporter call sites and none of the planners or records"). Truth 2 (one `entryBuckets()` record, `EntriesDropped(` built only in the `dropEvents` callback) holds: `HydrationEngine.ts:628`. Truth 3 (`LeftOut(` only in the callback) holds: `:454`. Truth 5 (`PAYLOAD_REASONS[envelope.failure._tag]`, no `payloadRefusalReason`) holds: `:571`. Truth 4 (events, order, counts) holds: the characterisation passes with the reporter resolved through the table, which is the behaviour Phase 71 pinned as unchanged. Truths 1 and 6 concern `HydrationBuckets.ts`, `HydrationEvent.ts` and the barrel, none changed.

### Spot-checks re-run (Re-verification (2026-11-23, milestone close sweep))

Run on the tree at `8752a052`, one command at a time, in the foreground, with stdin closed. `pnpm check:pr` exited 0 at `a4741601` (17 of 18 steps, mutation skipped by design, which includes `pnpm test:tstyche` over `HydrationBuckets.tst.ts`); `git diff a4741601 HEAD -- . ':!.planning'` is empty.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| Buckets, drop-event characterisation, engine, events, payload conformance, counts | `pnpm exec vitest run packages/react/test/{HydrationBuckets,HydrationDropEvents,HydrationEngine,HydrationEvent,HydrationPayload,HydrationCounts}.test.ts --project react` | 6 files, 137 tests passed | PASS |
| One site per event, no leftover mapper | `grep -n "malformed.push\|EntriesDropped(\|LeftOut(\|payloadRefusalReason" packages/react/src/HydrationEngine.ts` | `LeftOut(` at `:454`, `EntriesDropped(` at `:628`, no `malformed.push`, no `payloadRefusalReason` | PASS |
| House style | `node scripts/check-house-style.mjs` | `585 file(s) clean (3 declared switch(es), 74 type-test file(s))` | PASS |
| Gate 13 | `node scripts/check-api-surface.mjs` | exit 0, `940 export(s) documented across 9 package(s)` (941 when verified; Phase 76 changed the `DecisionHistory` exports in `@qadi/core`, none in `@qadi/react`) | PASS |

**Digest:** `covered_digest: "v4:sha256:d26d4dbd8646c793bc58079db6e55b800dffddb57b21413b9e285cbff51b3789"` becomes `covered_digest: "v4:sha256:70ab61fd7293d379db6fdcd12b21fb1bdb6cad1ad49d190f4215b12339278308"`, over the same 21 covered files.

**Verdict:** passed
