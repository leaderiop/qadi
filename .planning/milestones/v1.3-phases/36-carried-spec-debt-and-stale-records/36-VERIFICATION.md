---
phase: 36-carried-spec-debt-and-stale-records
verified: 2026-11-13T03:15:00Z
status: passed
score: 4/4 roadmap success criteria verified (12/12 requirement IDs satisfied)
covered_files:
  - ".changeset/devtools-timeline-status.md"
  - ".changeset/port-calls-description.md"
  - ".changeset/react-subject-and-seed.md"
  - ".changeset/simulator-session-only.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-01-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-01-SUMMARY.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-02-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-02-SUMMARY.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-03-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-03-SUMMARY.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-04-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-04-SUMMARY.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-05-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-05-SUMMARY.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-06-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-06-SUMMARY.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-07-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-07-SUMMARY.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-08-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-08-SUMMARY.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-09-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-09-SUMMARY.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-10-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-10-SUMMARY.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-11-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-11-SUMMARY.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-12-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-12-SUMMARY.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-13-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-13-SUMMARY.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-14-PLAN.md"
  - ".planning/phases/36-carried-spec-debt-and-stale-records/36-14-SUMMARY.md"
  - "apps/website/src/content/docs/docs/reference/upgrading.md"
  - "examples/nextjs-newsroom/e2e/ssr.spec.ts"
  - "examples/nextjs-newsroom/src/client/Divergent.tsx"
  - "packages/audit/src/AuditDecisionSinkLive.ts"
  - "packages/audit/src/CircuitBreaker.ts"
  - "packages/core/src/AttributeResolver.ts"
  - "packages/core/src/AuthSubject.ts"
  - "packages/core/src/DecisionSink.ts"
  - "packages/core/src/Explanation.ts"
  - "packages/core/src/Matcher.ts"
  - "packages/core/src/Policy.ts"
  - "packages/core/src/PortMetrics.ts"
  - "packages/core/src/PortName.ts"
  - "packages/core/src/RelationshipResolver.ts"
  - "packages/core/src/SecurityLabel.ts"
  - "packages/core/src/UntrustedDecode.ts"
  - "packages/core/test/DecisionCache.test.ts"
  - "packages/core/test/Ports.test.ts"
  - "packages/devtools/src/model/DockModel.ts"
  - "packages/devtools/src/model/Replay.ts"
  - "packages/devtools/src/model/SimulationSession.ts"
  - "packages/devtools/src/model/SimulationSource.ts"
  - "packages/devtools/src/model/TimelineFeed.ts"
  - "packages/devtools/src/model/TimelineStore.ts"
  - "packages/devtools/src/react/DevtoolsDock.tsx"
  - "packages/devtools/src/react/DiagnosticsNotice.tsx"
  - "packages/devtools/src/react/Simulator.tsx"
  - "packages/devtools/src/react/StoppedBox.tsx"
  - "packages/devtools/src/react/TimelineNotice.tsx"
  - "packages/devtools/src/react/focusRing.ts"
  - "packages/devtools/src/react/index.ts"
  - "packages/devtools/src/react/useDockModel.ts"
  - "packages/devtools/src/react/useScoped.ts"
  - "packages/devtools/src/react/useTimeline.ts"
  - "packages/devtools/test/helpers.ts"
  - "packages/devtools/test/model/DockModel.test.ts"
  - "packages/devtools/test/model/Replay.test.ts"
  - "packages/devtools/test/model/Replay.tst.ts"
  - "packages/devtools/test/model/SimulationSession.test.ts"
  - "packages/devtools/test/model/SimulationSource.prepare.test.ts"
  - "packages/devtools/test/model/TimelineFeed.test.ts"
  - "packages/devtools/test/react/DiagnosticsNotice.test.tsx"
  - "packages/devtools/test/react/Simulator.test.tsx"
  - "packages/devtools/test/react/TimelineNotice.test.tsx"
  - "packages/devtools/test/react/contrast.ts"
  - "packages/devtools/test/react/theme.contrast.test.ts"
  - "packages/devtools/test/react/useTimeline.test.tsx"
  - "packages/devtools/test/surface.test.ts"
  - "packages/devtools/test/surface.tst.ts"
  - "packages/http/src/GuardRoute.ts"
  - "packages/http/src/QadiHttpError.ts"
  - "packages/http/test/v4-http-smoke.test.ts"
  - "packages/react/src/GateWriter.ts"
  - "packages/react/src/HydrationEngine.ts"
  - "packages/react/src/QadiAtoms.ts"
  - "packages/react/test/GateRegistry.test.tsx"
  - "packages/react/test/GateWriter.test.tsx"
  - "packages/react/test/Hydration.lifetime.test.ts"
  - "packages/react/test/HydrationEngine.test.ts"
  - "packages/react/test/QadiProvider.seed.test.tsx"
  - "packages/react/test/QadiProvider.subject.test.tsx"
  - "packages/react/test/v4-reactivity-smoke.test.ts"
  - "spec/README.md"
  - "spec/behaviors/09-react.md"
  - "spec/behaviors/19-hydration.md"
  - "spec/behaviors/25-inspection.md"
  - "spec/behaviors/28-devtools-screens.md"
  - "spec/behaviors/29-devtools-simulator.md"
  - "spec/decisions/014-react-via-atoms.md"
  - "spec/decisions/039-a-seed-is-not-an-authority.md"
  - "spec/decisions/047-a-headless-devtools-model.md"
  - "spec/decisions/053-a-gate-can-be-found.md"
  - "spec/decisions/081-enforcement-error-classes-live-in-core.md"
  - "spec/decisions/103-a-question-is-opened-once.md"
  - "spec/decisions/123-a-metric-is-declared-once.md"
  - "spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md"
  - "spec/decisions/149-a-seed-is-held-by-its-question.md"
  - "spec/decisions/index.yaml"
  - "spec/invariants.md"
  - "spec/overview.md"
  - "spec/traceability.md"
  - "stryker.http.mjs"
covered_digest: "v4:sha256:225c208a1c11a1c6b1b0519cc4d1013ced2a50ae347fd8036be6b7027fa1be13"
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "spec/traceability.md behaviour 29 names model/Source.ts, not model/Sources.ts"
    reason: "The premise was wrong. Sources.ts was renamed SimulationSource.ts (dab09bc0), which the row already lists; model/Source.ts is behaviour 27's module and is already in that row. The stale Sources token is deleted instead of replaced. Decided as D-17 in 36-CONTEXT.md and recorded in CCR-QD-427."
    accepted_by: "user (36-CONTEXT.md D-17, chosen 2026-11-12)"
    accepted_at: "2026-11-12T00:00:00Z"
---

# Phase 36: Carried spec debt and stale records Verification Report

**Phase Goal:** The v1.2 spec debt and the stale records are cleared, after phases 30-35 have finished making their own corrections.
**Verified:** 2026-11-13
**Status:** passed
**Re-verification:** No, initial verification
**Verified at:** HEAD `341c1c15` (the tree the orchestrator's `pnpm check:pr` ran on)

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `spec/behaviors/29-devtools-simulator.md` has exactly one BEH-QD-219..221 block that keeps the fail-closed replay text and the intact tail prose, change-history fragment back in the header, stale fail-open copy deleted; `spec-revise.mjs --check` clean | VERIFIED | Headings at `:28` (219), `:78` (220), `:129` (221), one each (base had BEH-QD-219 at `:28` and `:190`). Header Change History row 1.16 records the removal. BEH-QD-221 keeps "A query the capture never saw MUST fail with the port's own typed error ... (BEH-QD-411)" and the tail prose (INV-QD-043, `CapturedAnswers` paragraph). No fail-open text remains in the file (grep). `node scripts/spec-revise.mjs --check` prints "every Revision matches its newest Change History entry". |
| 2 | `traceability.md` behaviour 29 no longer names `Sources.ts`; no live record claims the replay fail-open is undecided | VERIFIED (override) | Row 71 now lists `{...SimulationSource,HeldChoice,SimulationForm,Capture,...}.ts` with no `Sources`. `grep Sources spec/traceability.md` finds nothing outside the change-history row. The literal "names `model/Source.ts`" is not met by design: see the override (D-17). `.planning/MILESTONES.md:76` now strikes the line and says it was closed in v1.1 (ADR-QD-129 / CCR-QD-407); `PROJECT.md:49,202` and `STATE.md:339` already read as closed/stale. No other live claim found in `spec/`. |
| 3 | Every open v1.2 info finding in `_WAVE8-CONTEXT.md` re-verified at the base and fixed or recorded resolved; 24 IN-01 and 24 IN-03 fixed as tested code changes | VERIFIED | `36-LEDGER.md` has 37 rows, each with base evidence, disposition and a closing commit/reason. All 17 cited fix commits exist (`git cat-file`). 24 IN-01: `SimulationSession.ts:399` reads the dock's options through `describeSource` ("builds no recorder", `SimulationSource.ts:306-317`); `prepareSource` is called only on a run (`:529`). 24 IN-03: one exported `ReadySource` (`SimulationSource.ts:174`), no inline `Extract<` left. 25 IN-01: `baselineReading` is absent from `packages/*/src`; `reading` lives on `Baseline.Checked` (`SimulationSession.ts:113`). Resolved/refuted/exempt rows (24 IN-02/04/05/06, 26 IN-01, 27 IN-02, 28 IN-06, 29 IN-02) carry file:line or commit evidence. |
| 4 | Stale citations corrected (`v4-http-smoke.test.ts:106` `registerApi`; `stryker.http.mjs` comment placing code in `PermissionRegistry.ts`); 28 IN-06 narrowed and tested or closed with evidence | VERIFIED | `grep registerApi packages/http/test/v4-http-smoke.test.ts` finds nothing. `stryker.http.mjs:20-21` now says `GuardRoute.ts`'s `addGuardedRoute`. 28 IN-06: GR-S1, GR-S2, GW-S1 (identity-changing rerender under StrictMode) added in `7b80df02`, all three pass; `GateRegistry.test.tsx` runs green. |

**Score:** 4/4 truths verified, 0 behavior-unverified.

### Carried items (CONTEXT D-02, D-13..D-20), beyond the roadmap SCs

| Item | Status | Evidence |
|------|--------|----------|
| C1/C2 TimelineFeed late accept and silent death | VERIFIED | `TimelineFeed.ts`: per-read `generation` token guards `accept` (`mine !== generation` returns) and `Effect.onExit` sets `TimelineStatus.Stopped` unless interrupts-only; `closed` guards restart. RED tests landed before the fix (`3b5a9c60`, `c7e6ce8a` then `6cf983c0`). TF1..TF19 pass. |
| C3 subject atom keepAlive | VERIFIED | `QadiAtoms.ts:250-253` `Atom.keepAlive`; SUBJ1..SUBJ3 RED (`65d63e36`) before fix (`94f35dce`); `QadiProvider.subject.test.tsx` passes. |
| C4 focus ring and Restart contrast | VERIFIED (automated) | `StoppedBox.tsx`, `focusRing.ts`, `theme.contrast.test.ts` CT1..CT6 pin the token ratios; N14/N15, TN11..TN15 pin the rendered elements. Real-browser appearance is a manual backstop (below). |
| C5 stale wording | VERIFIED | `DecisionCache.test.ts` "generation" wording fixed; ADR-QD-081 amended; `DecisionSink.ts` and other comments corrected (`ec4a0384`); remaining `Evaluate.ts` mentions in src (`Resource.ts`, `Lifecycle.ts`, `Qadi.ts` import) are accurate. |
| C6 hydrated seed lost on a late mount | VERIFIED | `ce4dadbb`; ADR-QD-149 exists (`spec/decisions/149-a-seed-is-held-by-its-question.md`); `QadiProvider.seed.test.tsx` and `Hydration.lifetime.test.ts` pass. D-20 (seed covers the first check per ADR-QD-039) honored: the e2e pin and `Divergent.tsx` changed on user decision, not a deviation. |

### Requirements Coverage

Every ID in the phase requirement list appears in at least one PLAN `requirements:` field, and each maps to Phase 36 / All v1.3 phases in REQUIREMENTS.md. No orphans.

| Requirement | Source Plans | Status | Evidence |
|-------------|--------------|--------|----------|
| DEBT-01 | 36-11 | SATISFIED | SC 1 above (`8f35ead7`). |
| DEBT-02 | 36-11 | SATISFIED (override) | SC 2 above (`45c59daa`); premise departure recorded in CCR-QD-427. |
| DEBT-03 | 36-11 | SATISFIED | `b4b970ff`; MILESTONES/PROJECT/STATE read closed. |
| DEBT-04 | 36-01..13 | SATISFIED | Ledger and SC 3. |
| DEBT-05 | 36-03, 36-10 | SATISFIED | SC 4. |
| WX-01 | 36-14 | SATISFIED | `pnpm check:pr < /dev/null` exit 0 at HEAD `341c1c15`: tstyche 254 passed, vitest 200 files / 4917 tests, bdd 568, example 42, Playwright e2e 30 passed, gate 13 (`spec:api`) and `spec:publish` green (log read). |
| WX-02 | 36-11..13 | SATISFIED | Only reserved numbers appear in changed files: CCR-QD-427, ADR-QD-149, BEH-QD-519/520 (new, in CCR-QD-427's row), INV-QD-317/318; nothing at or above ADR-150, CCR-428, BEH-521 or INV-319. (That `next-id.mjs` was never run is not observable from the tree; no number outside the reserved set was minted.) |
| WX-03 | 36-13 | SATISFIED | `spec/overview.md` changed; gate 13 green. |
| WX-04 | 36-06, 36-09, 36-14 | SATISFIED | Added-line scan of `packages/*/src` diff for `as any`, `switch (`, `fnUntraced`, `await`, `console.`, `process.env`, clock APIs: no hits. 36-14's own scan agrees. |
| WX-05 | 36-01, 36-14 | SATISFIED | Compared `36-mutation-base.json` (13 files) to `36-mutation-after.json`: zero drops. Coverage 99.47 / 98.02 / 99.3 / 99.75, above the core 95 and others 90 thresholds. One named equivalent survivor (`TimelineNotice.tsx:40`). |
| WX-06 | 36-02..05, 36-08 | SATISFIED | Commit order: baseline, ledger, then each RED/characterisation test before its fix (TF9/status RED before `6cf983c0`; SUBJ and SD/HL pins before `94f35dce`/`ce4dadbb`; type-level RED inside `0cbd2f95`). |
| WX-07 | 36-08, 36-09 | SATISFIED | `.changeset/devtools-timeline-status.md` leads **Breaking** (`Baseline.Checked.reading`); upgrading.md gains "0.12: a checked baseline carries its own reading"; `@qadi/react` patch changeset; `port-calls-description.md` for the metric description. Nothing released or versioned. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase-touched tests pass | `vitest run` on TimelineFeed, QadiProvider.subject, QadiProvider.seed, GateRegistry, theme.contrast, SimulationSession | 6 files, 173 tests passed | PASS |
| Spec revisions consistent | `node scripts/spec-revise.mjs --check` | "every Revision matches its newest Change History entry" | PASS |
| Full gate | orchestrator's `pnpm check:pr` log, read (exit 0, 16 of 17 steps; mutation skipped by design) | all steps green | PASS |

### Anti-Patterns Found

None blocking. Debt-marker scan of phase-touched files found no unreferenced TBD/FIXME/XXX. Code review (`36-REVIEW.md`): 7 findings, 6 fixed, 1 skipped (IN-06, `focusRingProps.onFocus` on browsers without `:focus-visible`), recorded in `36-REVIEW-DISPOSITION.md` (open 0). `36-SECURITY.md`: 31 threats closed, 0 open. `36-VALIDATION.md`: validated, nyquist compliant. `36-UI-REVIEW.md`: 21/24.

### Manual backstops (recorded, not required for the phase goal)

The phase goal is the carried spec debt and stale records. These two are optional real-world confirmations of already-automated work, listed in `36-VALIDATION.md` and `36-14-SUMMARY.md`. They are not gating, so status stays `passed`. If the maintainer wants them gating, flip status to `human_needed`.

1. **UI visual backstop.** In Chromium and one more browser, open the example's dock. Keyboard-focus the Services screen root and the dock body: each shows a 2px accent ring. Make the timeline stop: the notice shows the amber tint, the reason verbatim and the hardened Restart button. Why manual: `:focus-visible` heuristics and tint rendering cannot be read in happy-dom. (Contrast ratios and ring props are already pinned by CT1..CT6 and N14/N15.)
2. **Seed assumption A1.** Whether React selective hydration mounts a gate after the provider's first macrotask in a real streaming Next render. Covered indirectly by the e2e SSR path (30 passed); recorded as an assumption.

### Gaps Summary

None. One literal deviation from requirement wording (DEBT-02 "names `model/Source.ts`") is a user-decided premise correction (D-17) recorded as an override and in CCR-QD-427. The roadmap's "no ADR" line for this phase is superseded by CONTEXT D-12/D-19, which minted ADR-QD-149 for the seed mechanism (reserved by hand; no other number beyond the reserved set).

---

_Verified: 2026-11-13_
_Verifier: Claude (gsd-verifier)_
