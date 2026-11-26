---
phase: QD-85-the-dock-s-hydration-block-is-a-model-row
verified: 2026-11-25T15:45:00Z
status: passed
score: 7/7 must-haves verified
covered_files:
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-01-PLAN.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-01-SUMMARY.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-02-PLAN.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-02-SUMMARY.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-03-PLAN.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-03-SUMMARY.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-04-PLAN.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-04-SUMMARY.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-05-PLAN.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-05-SUMMARY.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-06-PLAN.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-06-SUMMARY.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-07-PLAN.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-07-SUMMARY.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-08-PLAN.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-08-SUMMARY.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-09-PLAN.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-09-SUMMARY.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-10-PLAN.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-10-SUMMARY.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-11-PLAN.md
  - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-11-SUMMARY.md
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/HydrationView.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/QuestionsPanel.tsx
  - packages/devtools/src/react/useStoreSnapshot.ts
covered_digest: "v4:sha256:c53c183be1a4786f1e4852944c5e93cd2dc7e26460bae9b3f273a6faf27dc53a"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 85: The dock's hydration block is a model row — Verification Report

**Phase Goal:** The dock model serves the hydration block as one pure view, so the Pending / Unwired / Counts decision and each "unsampled" decision are made in one place, `QuestionsPanel` renders the view's tag and decides nothing, and `DockFrame` no longer subscribes to the whole merged reading to pass one field along.
**Verified:** 2026-11-25
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | HYDV-01: a characterisation written on the base pins every hydration block state (Pending, Unwired, Counts + rate, raised-drops filter, scope text, activity-over-status, "0 dehydrated entries") | ✓ VERIFIED | `QuestionsPanel.hydration.characterisation.test.tsx` holds H1–H13 as whole-`outerHTML` goldens through the public dock (singular/plural rate, no rate, 0/1/6 entries, client-seeded-more, raised vs zero drop, markup-as-text, all-zero, supplied counts under Starting / stopped-unsampled / Live). Added at base commit 31d0227e, before any `src` change; `85-RED-EVIDENCE.md` records each seen failing. The two older byte oracles (`QuestionsPanel.characterisation`, `.feed.characterisation`) are untouched by the phase (`git diff c2e74af0..HEAD` shows no change) and pass on the new code. Ran in my own process: 15 files / 308 tests pass. |
| 2 | HYDV-02: pure view returning a closed tagged union, beside `portCards`, under `src/model/`, tabled, no JSX in `model/` | ✓ VERIFIED | `packages/devtools/src/model/HydrationView.ts` (118 lines): `HydrationView = Data.TaggedEnum<{Pending, Unwired, Counts}>` plus a closed `HydrationDropsView = None | Raised`. `hydrationView` is `hydration !== undefined ? Counts : unsampled ? Pending : Unwired`. Rate (singular/zero-absent), no-drops text, raised filter and both scope branches are composed in the file. Imports only `effect/Data` and `./Hydration.ts`. `HydrationView.test.ts` (165 lines) and `HydrationView.tst.ts` (4 type pins pass under tstyche). `85-check.mjs no-react-in-model` passes. |
| 3 | HYDV-03: the model serves the view keyed per field; the three "unsampled" predicates stay distinct | ✓ VERIFIED | `DockModel.ts:429` `hydration = makeDerivedStore({parents:[shownReading], key → {hydration: reading.hydration, unsampled}, compute: hydrationView})`, exposed on `DockModel.hydration` (`:247`, `:477`). Questions guard unchanged (`supplied === undefined && isUnsampled(status)`, `:409`). Services keeps its unguarded flag, now through the shared `shownInputOf` (`:336`) that hydration also reads. Activity precedence lives only in `hydrationView`. `85-check.mjs three-predicates` passes. `DockModel.test.ts` M59 and neighbours pin identity (a Starting→Live flip with counts publishes the store once) and the store's place in the aggregate. |
| 4 | HYDV-04 (panel): `QuestionsPanel` renders the view's tag and decides nothing, every `data-testid` unchanged | ✓ VERIFIED | `QuestionsPanel.tsx`: reads `useStoreSnapshot(hydration ?? NO_HYDRATION)`, renders through a module-scope `Match.type<HydrationView>().pipe(Match.tagsExhaustive(...))` (`hydrationBlock`, `dropsBlock`). No `isUnsampled`/`unaccountedEntries` in the file (grep: none). The goldens and oracles above pin every test id byte for byte. `85-check.mjs panel-decides-nothing` passes. |
| 5 | HYDV-04 (frame): `DockFrame` no longer subscribes to the whole merged reading; keeps only status | ✓ VERIFIED | `DevtoolsDock.tsx:110` now `useDiagnosticsStatus(model.diagnostics)` (a `getSnapshot` picking `.status`, `useStoreSnapshot.ts`); the `shown` reading, the `Diagnostics` import and `Screen`'s `shown` prop are gone; `Screen` passes `props.model.hydration`. `DockFrame.renders.test.tsx` R1 counts profiler commits: a poll moving only the reading commits nothing under the dock; R2 is the control; R3 pins the block following the store. Passes in my run. `frame-reads-status` check passes. |
| 6 | HYDV-05: ADR-QD-198 and the BEH/INV/traceability records move with the phase | ✓ VERIFIED | `spec/decisions/198-the-hydration-block-is-a-model-row.md` (195 lines) plus `index.yaml` row; ADR-QD-185 and ADR-QD-168 carry dated notes; BEH-QD-761..765 and INV-QD-415..416 written in `28-devtools-screens.md` / `invariants.md`; BEH-QD-699 renamed "five computed stores", BEH-QD-700/735/741/742/743/218 restated; `traceability.md` rows for all new ids; CCR-QD-477 row in `spec/README.md`. `85-check.mjs records --close` passes. |
| 7 | Rendered bytes and every `data-testid` unchanged for every status × reading combination | ✓ VERIFIED | See truths 1 and 4; no oracle file was edited, all pass. One non-production difference noted under Anti-Patterns (info). |

**Score:** 7/7 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/devtools/src/model/HydrationView.ts` | pure view | ✓ VERIFIED | 118 lines, real logic, wired into `DockModel.ts` |
| `packages/devtools/src/model/DockModel.ts` | `hydration` derived store | ✓ VERIFIED | store built, exposed, in the model's shape |
| `packages/devtools/src/react/QuestionsPanel.tsx` | renders tag only | ✓ VERIFIED | exhaustive Match, no decisions |
| `packages/devtools/src/react/DevtoolsDock.tsx` / `useStoreSnapshot.ts` | frame reads status | ✓ VERIFIED | `useDiagnosticsStatus` |
| `.changeset/devtools-the-hydration-block-is-a-model-row.md` | devtools patch | ✓ VERIFIED | `@qadi/devtools: patch`, "No export changes." |
| `spec/decisions/198-...md`, BEH/INV/traceability/README rows | records | ✓ VERIFIED | see truth 6 |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `DockModel.hydration` | `hydrationView` | `makeDerivedStore.compute` | WIRED |
| `shownReading` | hydration key | `shownInputOf`, shared with `services` | WIRED |
| `DevtoolsDock Screen` | `QuestionsPanel` | `hydration={props.model.hydration}` | WIRED |
| `QuestionsPanel` | `HydrationView` tag | `useStoreSnapshot` then `Match.tagsExhaustive` | WIRED |
| `DockFrame` | diagnostics status | `useDiagnosticsStatus` | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| `QuestionsPanel` hydration block | `HydrationView` | `reading.hydration` of the merged shown reading (feed + host-supplied) via `hydrationView` | Yes; H1–H13 goldens drive it end to end through the public dock | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Panel, frame, view, model, configure-rule and dock tests | `npx vitest run packages/devtools/test/react/QuestionsPanel packages/devtools/test/react/DockFrame packages/devtools/test/model/HydrationView packages/devtools/test/model/DockModel packages/devtools/test/model/ConfigureRule packages/devtools/test/react/DevtoolsDock` | 15 files, 308 tests passed | ✓ PASS |
| Type pins | `npx tstyche packages/devtools/test/model/HydrationView.tst.ts` | 4 passed, 16 assertions | ✓ PASS |
| Phase checks | `85-check.mjs` scan-ids, scan-forbidden, no-react-in-model, three-predicates, panel-decides-nothing, frame-reads-status, records --close, trailers, --self-test | all pass (33 plan commits with the one trailer; self-test 245) | ✓ PASS |
| Pinned tests unchanged | `85-pinned-check.mjs --all-applied` | 18 files hold base text, 1/1 born, 1/1 declared edit applied | ✓ PASS |
| Mutation not fallen | `85-mutation.mjs compare` | DockModel.ts 65/65 → 72/72; HydrationView.ts 41/41 (survived 0, no-coverage 0, ignored 0) | ✓ PASS |

`pnpm check:pr` (exit 0 at 7ebeb0c2 per `85-11-SUMMARY.md` Gate facts) was not re-run in full. I confirmed `git diff 7ebeb0c2 HEAD` over `packages spec scripts .changeset AGENTS.md features` is empty, so the gated tree equals HEAD for everything the gate reads.

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh`.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| HYDV-01 | 85-01 (plus 85-03 for pinned checks) | ✓ SATISFIED | truth 1 |
| HYDV-02 | 85-04 | ✓ SATISFIED | truth 2 |
| HYDV-03 | 85-05, 85-06 | ✓ SATISFIED | truth 3 |
| HYDV-04 | 85-07, 85-08 | ✓ SATISFIED | truths 4, 5 |
| HYDV-05 | 85-09 | ✓ SATISFIED | truth 6 |
| WX-01 | 85-11 | ✓ SATISFIED (this phase's share) | `check:pr` exit 0, 17 of 18 steps (mutation skipped by design on non-release PRs), tree unchanged since |
| WX-02 | 85-09 | ✓ SATISFIED | only ADR-QD-198, CCR-QD-477, BEH-QD-761..765, INV-QD-415..416 used; `scan-ids` and `records --close` pass |
| WX-03 | 85-10 | ✓ SATISFIED | `spec:api` 942 exports (unchanged; nothing exported); gate 14 unmoved; devtools patch changeset per wave policy |
| WX-04 | all | ✓ SATISFIED | `scan-forbidden` passes (no `as`, `!`, `any`, `switch`, `fnUntraced`, `async`, ambient console/env/clock, `Record<string, unknown>`, Stryker disable, module `let`; no budget file moved) |
| WX-05 | 85-01, 85-10 | ✓ SATISFIED | mutation compare above, no score fell; devtools coverage model 99.85 / react 99.26 statements, above 90 |
| WX-06 | all | ✓ SATISFIED | RED evidence recorded; characterisation committed on base before the change |
| WX-07 | all | ✓ SATISFIED | scan-ids clean; trailers pass; no release/push/merge (git log shows only phase commits) |

No orphaned requirements: REQUIREMENTS.md maps exactly HYDV-01..05 to Phase 85, and all five appear in the plans' frontmatter. The Pending checkboxes are expected and are not a gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `QuestionsPanel.tsx` | 77, 94 | Optional `hydration` prop with a `NO_HYDRATION` fallback that always reads `Unwired` | ℹ️ Info | No production caller omits it (`DevtoolsDock` always passes the store). A panel rendered alone with no `hydration` and an unsampled status now shows Unwired where the base showed Pending. Recorded and deferred as IN-01 in `85-REVIEW-DISPOSITION.md` (several tests render the panel without it). The panel is not a public export. |
| `HydrationView.ts` | 85, 102 | "1 dehydrated entry have", "All 1 reasons" | ℹ️ Info | Pre-existing wording pinned on purpose by the byte-identical contract (D-08). Deferred as IN-02. |

No debt markers (TBD/FIXME/XXX), stubs or hardcoded-empty rendering in the changed source.

### Human Verification Required

None. The block is covered by byte goldens, store identity tests and a render-count test; no visual or external-service behavior is claimed beyond that.

### Gaps Summary

No gaps. The goal is achieved in the codebase: the Pending/Unwired/Counts decision, the activity-over-status precedence and each count-dependent sentence live only in `HydrationView.ts`; the dock model serves them as its own identity-keyed derived store; the panel renders the tag and decides nothing; and the frame subscribes to the poll's status alone. The three unsampled predicates remain separate. Rendering is byte-identical across the pinned oracles. Spec records, changeset and gates are in place.

---

_Verified: 2026-11-25T15:45:00Z_
_Verifier: Claude (gsd-verifier)_
