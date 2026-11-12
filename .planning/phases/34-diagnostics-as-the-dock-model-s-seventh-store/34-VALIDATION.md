---
phase: "34"
slug: "diagnostics-as-the-dock-model-s-seventh-store"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-12"
---

# Phase 34 — Validation Strategy

> Per-phase validation contract. Drafted from `34-RESEARCH.md` § Validation Architecture before planning, and audited after execution (State A): every requirement maps to an automated command that ran green.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 with `@effect/vitest` 4.1.2 (`it.effect`: `TestClock` and a scope), React Testing Library (`happy-dom`), tstyche (type pins), Stryker |
| **Config file** | `packages/devtools/vitest.config.ts` (project `devtools`, setup `test/setupTests.ts`), `stryker.devtools.mjs` |
| **Quick run command** | `pnpm vitest run --project devtools packages/devtools/test/model/DiagnosticsFeed.test.ts` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~95 seconds (full gate, mutation skipped); devtools project alone ~20 seconds |

---

## Sampling Rate

- **After every task commit:** the single new or edited test file, `pnpm vitest run --project devtools <file>`, plus `pnpm typecheck && pnpm lint` on src tasks.
- **After every plan wave:** `pnpm vitest run --project devtools` (src waves: `pnpm build && pnpm vitest run`).
- **After every src wave (2–7):** `pnpm build && pnpm vitest run` was green after each: 4772, 4780, 4783, 4786, 4789 and 4807 tests.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` was green on `380f8a91`: 192 files and 4807 tests, with coverage at 99.46 / 97.99 / 99.3 / 99.75 (devtools model 99.82 / 99.25 / 100 / 100). Stryker with `stryker.devtools.mjs` was compared with the base: `DockModel.ts` 1, `DiagnosticsStore.ts` 1, `TimelineFeed.ts` 1 (new), `DiagnosticsFeed.ts` 0.9388 (new; six survivors named in `34-mutation-survivors.json`). After the review fixes (`40cb480e`): `DiagnosticsFeed.ts` 0.9279 (103 killed, eight survivors, all named), `DockModel.ts` 1.
- **Max feedback latency:** ~95 seconds.

The poll is a discrete-event system. A test samples at least once between every pair of events it distinguishes:

- `Starting` and `Live` can both fire inside one synchronous tick, so transitions are recorded through `subscribe`, not read from the end state.
- `TestClock` steps at the interval boundary (`1999 ms`, then `1 ms`), and the test asserts after each `adjust`.
- "No further sampling after a stop" is observed over at least three intervals.

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| DIAG-01 | per-field `configure`: an inline literal never restarts; a changed `layer` / `collector` / `questions` / `intervalMillis` or a defined/`undefined` flip does; `reading` alone never restarts; the poll is forked from init | model, `TestClock` | `pnpm vitest run --project devtools packages/devtools/test/model/DiagnosticsFeed.test.ts` | ✅ | ✅ green |
| DIAG-01 | the init fork does not block `runSync`; an async layer build leaves `Starting` until `adjust` | model | `pnpm vitest run --project devtools packages/devtools/test/model/DockModel.test.ts` | ✅ | ✅ green |
| DIAG-02 | the seventh store `{status, reading: mergeReading(...)}` publishes on a feed publish or a `reading` identity change; identity is kept when nothing is supplied; nothing is merged in `getSnapshot` | model | `pnpm vitest run --project devtools packages/devtools/test/model/DockModel.test.ts` | ✅ | ✅ green |
| DIAG-02 | merge precedence and identity (characterisation, green on the base) | model | `pnpm vitest run --project devtools packages/devtools/test/model/DiagnosticsStore.test.ts` | ✅ | ✅ green |
| DIAG-03 | `useDiagnostics` returns `{status, reading}`; `undefined` gives `Off`; one poll on an equal re-render; finalizer on unmount; a layer replacement restarts | React | `pnpm vitest run --project devtools packages/devtools/test/react/useDiagnostics.test.tsx` | ✅ | ✅ green |
| DIAG-04 | one `useStoreSnapshot`; no `useRunningStore` left | static + React | `pnpm vitest run --project devtools packages/devtools/test/surface.test.ts` plus a grep step | ✅ | ✅ green |
| DIAG-05 | a throwing source gives `Stopped{sampled:true}` with the reading identity kept and no more reads; a first-sample throw gives `Stopped{sampled:false}` and `noDiagnostics`; an interruption (restart, `undefined`, scope close) never gives `Stopped`; a restart by field change and by `restart()` passes through `Starting`; `undefined` resets to `noDiagnostics` and `Off`; a layer build failure stays `WiringRead.Failed` | model, `TestClock` | `pnpm vitest run --project devtools packages/devtools/test/model/DiagnosticsFeed.test.ts` | ✅ | ✅ green |
| DIAG-05 | hidden `<Activity>` and rebuild: the scope closes, the model rebuilds, a fresh `Starting` then `Live`, and the reading is blank before the first sample | model + React | `pnpm vitest run --project devtools packages/devtools/test/model/DockModel.test.ts packages/devtools/test/react/useSimulationSession.test.tsx` | ✅ | ✅ green |
| DIAG-05 | the notice on Services and Questions: Starting / Stopped copy, `data-sampled`, the restart button, suppressed absence copy while unsampled, focus after restart | React | `pnpm vitest run --project devtools packages/devtools/test/react` | ✅ | ✅ green |
| DIAG-06 | all of the above under `TestClock` with no render; `DockModel.ts`'s mutation score stays at its base (100) | mutation | `pnpm exec stryker run stryker.devtools.mjs` | ✅ | ✅ green |
| D-15 | `useTimeline` stays green with its signature unchanged (start on mount, close on unmount) | React | `pnpm vitest run --project devtools packages/devtools/test/react/useTimeline.test.tsx` | ✅ | ✅ green |
| WX-01..07 | the milestone rules: gate green, records, changeset with **Breaking.**, upgrade guide, reserved ids, judging files untouched | spec + full | `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict && pnpm spec:api && pnpm spec:website-examples` and `pnpm check:pr < /dev/null` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `packages/devtools/test/model/DiagnosticsFeed.test.ts` (F1..F23), covering DIAG-01, DIAG-02, DIAG-05 and DIAG-06
- [x] `settleTurns` in `packages/devtools/test/helpers.ts`
- [x] characterisation pins `DiagnosticsLifetime.test.tsx` (H1..H3, K1..K5) and `TimelineLifetime.test.tsx` (L1..L4), green on the phase base `20089321` before any src change; K5, L3 and L4 were flipped in the commits that deliberately changed that behaviour
- [x] the mutation base `34-mutation-base.json`, committed alone as the phase's first plan commit (`5e6d08be`)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The Activity hide/show rebuild renders `Starting` and then a fresh reading, in a real browser | DIAG-05 (D-06) | `happy-dom` does not run React's `<Activity>` visibility the way a browser does | Run the newsroom example, open the dock, hide and show the panel, and watch Services move from "Waiting for the first sample." to a reading |
| The amber Stopped notice is legible in light and dark, and focus lands on the screen root after restart | DIAG-05 (UI-SPEC backstop) | contrast and focus ring are visual | Force a throwing `questions` source, check both themes, press "Restart diagnostics", and confirm the focus ring on the screen |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-12

---

## Plan-to-Test Map

| Plan | Requirements | Evidence (all green) |
|------|--------------|----------------------|
| 34-01 | WX-05, WX-06 | mutation base (DockModel 1, DiagnosticsStore 1); DiagnosticsLifetime 8, TimelineLifetime 4 on the base |
| 34-02 | DIAG-01, 02, 05, 06 | DiagnosticsFeed F1..F23 under TestClock; DockModel M18..M28; Stryker DockModel 100 |
| 34-03 | DIAG-04, WX-06, WX-07 | TimelineFeed TF1..TF8; useTimeline.test.tsx byte-identical and green; L3/L4 flipped; `spec:website-examples` |
| 34-04 | DIAG-04 | useStoreSnapshot S1..S3; one `useSyncExternalStore` call site left (node check) |
| 34-05 | DIAG-01, 02, 05 | DiagnosticsScreens D1..D3; K5 flipped; dock has no `useDiagnostics`/`mergeReading` |
| 34-06 | DIAG-03, 04, WX-03, 06, 07 | useDiagnostics.test.tsx; the example's typecheck and tests (42); `surface.tst.ts`; `spec:api` |
| 34-07 | DIAG-05 | DiagnosticsNotice N1..N10; DiagnosticsScreens D4..D11 |
| 34-08 | DIAG-06, WX-02, 03 | `spec-revise --check`, `spec:examples` (111), `spec:claims`, `spec:verify:strict` (21 / 0), `spec:api` (916), `spec:gates` |
| 34-09 | WX-01, 04, 05, 06 | gate integrity, WX-04 scan, commit order, test-edit shape; `34-mutation-after.json`; `pnpm check:pr` |

## Validation Audit 2026-11-12

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
