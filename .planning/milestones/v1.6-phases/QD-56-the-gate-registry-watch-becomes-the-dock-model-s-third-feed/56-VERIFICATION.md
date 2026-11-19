---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
verified: 2026-11-18T22:15:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-01-PLAN.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-01-SUMMARY.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-02-PLAN.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-02-SUMMARY.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-03-PLAN.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-03-SUMMARY.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-04-PLAN.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-04-SUMMARY.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-05-PLAN.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-05-SUMMARY.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-06-PLAN.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-06-SUMMARY.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-07-PLAN.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-07-SUMMARY.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-08-PLAN.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-08-SUMMARY.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-09-PLAN.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-09-SUMMARY.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-10-PLAN.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-10-SUMMARY.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-11-PLAN.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-11-SUMMARY.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-12-PLAN.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-12-SUMMARY.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-13-PLAN.md"
  - ".planning/phases/QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed/56-13-SUMMARY.md"
  - "packages/devtools/src/model/DiagnosticsFeed.ts"
  - "packages/devtools/src/model/DiagnosticsStore.ts"
  - "packages/devtools/src/model/DockModel.ts"
  - "packages/devtools/src/model/Gates.ts"
  - "packages/devtools/src/model/GatesFeed.ts"
  - "packages/devtools/test/model/DockModel.test.ts"
  - "packages/devtools/test/model/GatesFeed.test.ts"
  - "packages/react/src/DevtoolsFeed.ts"
covered_digest: "v4:sha256:d6c7bf9560be8aaa443d8c4c162395c1715789c39e48b74bd17d218ef6b7fcec"
behavior_unverified: 0
overrides_applied: 0
re_verification: false
---

# Phase 56: The gate-registry watch becomes the dock model's third feed - Verification Report

**Phase Goal:** The gate-registry watch is a scoped feed module shaped like the timeline and diagnostics feeds, so `DockModel` composes three feeds and no longer holds the watch's subscription, guarded reads, failure keying and finalizer inline.
**Verified:** 2026-11-18
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The user's `questions`-thunk decision is recorded in ADR-QD-169, which applies ADR-137, leaves ADR-162 intact; on "yes", `questions` leaves `DiagnosticsDockOptions` and the Breaking change is recorded | VERIFIED | `spec/decisions/169-...md` exists (Status: "amends ADR-QD-047; applies ADR-QD-137; keeps ADR-QD-162, ADR-QD-150"; Context records owner decision D-01). `git diff 88f0ca26..HEAD -- spec/decisions/162-*.md 137-*.md` is empty. `DiagnosticsDockOptions` (DiagnosticsFeed.ts:77) no longer carries `questions` (comment at :73-74 says so; `DiagnosticsStore.ts` samples none); `FeedOwnedKey = "layer" \| "questions"` in `packages/react/src/DevtoolsFeed.ts:100`. Two Breaking changesets exist (`.changeset/devtools-questions-is-a-dock-input.md`, `react-feed-hands-questions.md`, both `minor`, both "**Breaking.**") and the 0.13 section of `upgrading.md` was extended. |
| 2 | One package-private scoped feed owns the watch (subscription, guarded reads, failure keying, re-subscribe on `configure`, finalizer release) with one snapshot + `subscribe`; `DockModel` composes three feeds and calls `joinQuestions`; no mutable gate-watch state in `DockModel.ts` | VERIFIED | `GatesFeed.ts` (249 lines): `makeGatesFeed = Effect.fn("qadi.devtools.makeGatesFeed")` with `Scope.Scope` requirement; `Effect.addFinalizer` releases the held subscription (a throwing release swallowed, called once); `watch()` guards `subscribe`; `readRegistry` guards `instances` and keys failures by name+message with a total `stated()`; `configure` re-subscribes on identity change or `watchFailure`; snapshot `{registry, asked}` plus `subscribe`/`getSnapshot`. `DockModel.ts` calls `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed` and `joinQuestions`; a grep for `reasonOf\|keyOf\|readGates\|watchGates\|\.instances(\|Cause\.` in DockModel.ts/Gates.ts finds none; the only `let`s that touch the join are `closed` and `lastJoin` (a pure memo of the feeds' snapshots, kept by D-08/INV-QD-357 wording), and the only `.subscribe` calls are on feeds/stores. `GatesFeed` is imported only by `DockModel.ts` and appears in neither barrel (`index.ts` and `react/index.ts` count 0). `spec:api` still prints 935 exports across 9 packages. |
| 3 | The watch's cases (M31-M47, P2) run against the feed alone with `gateRegistryDouble.ts`; `DockModel.test.ts` keeps one test showing the join moves first | VERIFIED | `GatesFeed.test.ts` (934 lines) has G31..G47 (every one tagged "twin of M<n>", including G42 b) and GP2, plus T1..T10 for the thunk. Throwing `instances` (G38/G39), throwing `subscribe` (G37/G40/G41), swapped registry (G33/G41), throwing release (G42/G42 b), closed scope (G33/G35/G36), one failure from two paths published once (G38/T2/G47) are all present. `DockModel.test.ts` carries J1 ("the join moves first on either side, so a host listener reads a joined snapshot") plus J2..J8, M32/M32 b/M34/M36/M47/P2 (model-level join/close cases). The 14 watch-only M cases (M31, M33, M35, M37..M46) were deleted only with twins present (56-07-SUMMARY lists each). 127 tests across the five relevant files pass when I ran them. |
| 4 | The questions panel's observable behaviour is unchanged, pinned by characterisation written on the phase base and green before and after; lifetime stays the scope | VERIFIED | `QuestionsPanel.characterisation.test.tsx`: `git diff 88f0ca26..HEAD` is empty (unedited). `QuestionsPanel.feed.characterisation.test.tsx` was created on the base (commits 9270c5f2, eb4990e5, both before any source change; first source change is 67bcccb6) and is only added to, never edited. Its single seam `questionsProp.ts` is the one line that moved with the thunk (ADR-QD-169). The one deliberate change (a throwing thunk is stated, poll stays Live) is `QuestionsPanel.thunk.test.tsx`, committed RED first (ecc7d463) and green after. The lifetime is the scope (`Effect.addFinalizer` plus `makeSupersedingRun`, ADR-137/150); a closed feed runs no host code (`runs.closed()` guards `onRegistry`, `watch`, `configure`). |

**Score:** 4/4 truths verified (0 behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/devtools/src/model/GatesFeed.ts` | the scoped feed | VERIFIED | Substantive (249 lines, no stub), wired from `DockModel.ts` |
| `packages/devtools/src/model/DockModel.ts` | composes three feeds | VERIFIED | 325 lines; pure `joinInputOf` over `JoinKey`; hoisted `Match.type` matchers; no watch state |
| `packages/devtools/test/model/GatesFeed.test.ts` | twins G31..G47, GP2, T1..T10 | VERIFIED | present, passes |
| `packages/devtools/test/gateRegistryDouble.ts` | registry double | VERIFIED | present (145 lines), used by the feed tests |
| `packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx` | base characterisation | VERIFIED | present, created pre-change, passes |
| `packages/devtools/test/react/QuestionsPanel.thunk.test.tsx` | D-03 RED then green | VERIFIED | RED commit precedes feed commit; passes |
| `spec/decisions/169-...md`, BEH-QD-616..620, INV-QD-357/358, CCR-QD-447 | records | VERIFIED | all present in spec files, traceability and README |
| `.changeset/*` + `upgrading.md` 0.13 | Breaking notes | VERIFIED | two minor Breaking changesets, nothing versioned (no `package.json`/CHANGELOG diff since base) |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `DockModel` | `GatesFeed` | `makeGatesFeed({gates, questions, intervalMillis})` in build; `gatesFeed.configure(...)` before `diagnosticsFeed.configure` and `remerge` in `configure` | WIRED |
| `GatesFeed` snapshot | `joinQuestions` | `gatesFeed.subscribe(rejoin)` registered before any host listener; `keyNow()` reads `getSnapshot()` | WIRED |
| `useDevtoolsFeed` | `DevtoolsDock` | returns `questions: atoms.asked` beside `gates`; `DevtoolsDock`/`useDockModel` pass it to `DockModelInputs.questions` | WIRED |
| poll | thunk | removed: `DiagnosticsOptions`/`DiagnosticsDockOptions` take no `questions`; pinned by tstyche (`DiagnosticsStore.tst.ts`, `DevtoolsFeed.tst.ts`) | WIRED (negative) |

### Data-Flow Trace (Level 4)

| Artifact | Variable | Source | Real data | Status |
|----------|----------|--------|-----------|--------|
| `DockModel.questions` | `QuestionsSnapshot` | `joinQuestions(joinInputOf(key))` over `gatesFeed.getSnapshot()` (registry's own `instances()` array, thunk's answer) | yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Feed alone, model, characterisation, thunk RED-turned-green | `pnpm exec vitest run --project devtools` on the five files | 5 files, 127 tests passed | PASS |
| Orchestrator regression gate | `vitest run --project core --project devtools` | 149 files, 4203 tests passed (cited) | PASS |
| Full gate | `pnpm check:pr` exit 0 at b60fd763; `git diff --name-only b60fd763..HEAD` shows only `.planning/` | cited and the diff confirmed | PASS |
| Public API count | `pnpm -s spec:api` | 935 exports across 9 packages (unchanged) | PASS |

### Probe Execution

SKIPPED: no probe scripts are declared for this phase.

### Mutation (WX-05)

`56-mutation.mjs compare 56-mutation-static.json` re-run: DiagnosticsFeed 0.947 -> 0.989 (survivors +0, -4); DiagnosticsStore, DockModel, Gates 1 -> 1; `GatesFeed.ts` score 1, survivors 0, 4 ignored all Killed in the static run. Prints "WX-05 holds (D-11)". Stryker not re-run (by instruction).

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| GFED-01 | one scoped feed owns the watch | SATISFIED | `GatesFeed.ts`, truth 2 |
| GFED-02 | `DockModel` composes three feeds, no gate-watch state | SATISFIED | `DockModel.ts` scan, truth 2 |
| GFED-03 | watch cases against the feed alone; model keeps the join test | SATISFIED | G31..G47, GP2; J1; truth 3 |
| GFED-04 | panel behaviour unchanged, characterised on the base | SATISFIED | truth 4 |
| GFED-05 | user decision recorded in ADR-QD-169 | SATISFIED | truth 1 |
| WX-01..07 | milestone-wide, left Pending | PHASE'S PART DONE | WX-02: ADR/BEH/INV/CCR present and gated; WX-03: `spec:api` 935 unchanged, feed out of the barrels; WX-04: feed uses `Effect.fn`, `Match.tagsExhaustive`, no `async`/`Date`/`console`/`as`, no cycle (check:pr); WX-05: mutation compare holds; WX-06: RED-first order verified from commit history; WX-07: two Breaking changesets, nothing versioned; WX-01: nothing released |

No orphaned requirements: every GFED row maps to a plan in this phase.

### Anti-Patterns Found

None blocking. No TBD/FIXME/XXX in the modified model files. The empty `catch {}` blocks in `GatesFeed.ts` are deliberate and commented (a throwing release is not stated; the stated-value fallback is total). The six code-review Info findings (0 critical, 0 warning) each have a recorded disposition in `56-REVIEW-DISPOSITION.md` (IN-01 accepted T-56-18; IN-02 pinned by characterisation; IN-03/04 behaviour-neutral cleanup; IN-05/06 cosmetic).

### Human Verification Required

None. The two optional manual checks in `56-VALIDATION.md` (a long failure reason wrapping; the failure paragraph carrying no `aria-live`) are UI backstops the plan already marked optional, and neither is a must-have.

### Gaps Summary

No gaps. One bookkeeping observation for the orchestrator, not a goal gap: `.planning/ROADMAP.md` line 396 still shows `- [ ] **Phase 56**` in the phase list (the Plans line already reads 13/13 executed); the checkbox and a "completed" date will need updating when the phase closes, as phases 54 and 55 were.

---

_Verified: 2026-11-18_
_Verifier: Claude (gsd-verifier)_
