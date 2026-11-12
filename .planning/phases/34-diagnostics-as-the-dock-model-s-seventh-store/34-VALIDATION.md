---
phase: "34"
slug: "diagnostics-as-the-dock-model-s-seventh-store"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-12"
---

# Phase 34 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Drafted from `34-RESEARCH.md` § Validation Architecture; the per-task map is filled once the plans exist.

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
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, and `pnpm exec stryker run stryker.devtools.mjs` compared with the D-16 base (`DockModel.ts` at 100).
- **Max feedback latency:** ~95 seconds.

The poll is a discrete-event system. A test samples at least once between every pair of events it distinguishes:

- `Starting` and `Live` can both fire inside one synchronous tick, so transitions are recorded through `subscribe`, not read from the end state.
- `TestClock` steps at the interval boundary (`1999 ms`, then `1 ms`), and the test asserts after each `adjust`.
- "No further sampling after a stop" is observed over at least three intervals.

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| DIAG-01 | per-field `configure`: an inline literal never restarts; a changed `layer` / `collector` / `questions` / `intervalMillis` or a defined/`undefined` flip does; `reading` alone never restarts; the poll is forked from init | model, `TestClock` | `pnpm vitest run --project devtools packages/devtools/test/model/DiagnosticsFeed.test.ts` | ❌ W0 | ⬜ pending |
| DIAG-01 | the init fork does not block `runSync`; an async layer build leaves `Starting` until `adjust` | model | `pnpm vitest run --project devtools packages/devtools/test/model/DockModel.test.ts` | ✅ extend | ⬜ pending |
| DIAG-02 | the seventh store `{status, reading: mergeReading(...)}` publishes on a feed publish or a `reading` identity change; identity is kept when nothing is supplied; nothing is merged in `getSnapshot` | model | `pnpm vitest run --project devtools packages/devtools/test/model/DockModel.test.ts` | ✅ extend | ⬜ pending |
| DIAG-02 | merge precedence and identity (characterisation, green on the base) | model | `pnpm vitest run --project devtools packages/devtools/test/model/DiagnosticsStore.test.ts` | ✅ | ⬜ pending |
| DIAG-03 | `useDiagnostics` returns `{status, reading}`; `undefined` gives `Off`; one poll on an equal re-render; finalizer on unmount; a layer replacement restarts | React | `pnpm vitest run --project devtools packages/devtools/test/react/useDiagnostics.test.tsx` | ✅ edit | ⬜ pending |
| DIAG-04 | one `useStoreSnapshot`; no `useRunningStore` left | static + React | `pnpm vitest run --project devtools packages/devtools/test/surface.test.ts` plus a grep step | ✅ | ⬜ pending |
| DIAG-05 | a throwing source gives `Stopped{sampled:true}` with the reading identity kept and no more reads; a first-sample throw gives `Stopped{sampled:false}` and `noDiagnostics`; an interruption (restart, `undefined`, scope close) never gives `Stopped`; a restart by field change and by `restart()` passes through `Starting`; `undefined` resets to `noDiagnostics` and `Off`; a layer build failure stays `WiringRead.Failed` | model, `TestClock` | `pnpm vitest run --project devtools packages/devtools/test/model/DiagnosticsFeed.test.ts` | ❌ W0 | ⬜ pending |
| DIAG-05 | hidden `<Activity>` and rebuild: the scope closes, the model rebuilds, a fresh `Starting` then `Live`, and the reading is blank before the first sample | model + React | `pnpm vitest run --project devtools packages/devtools/test/model/DockModel.test.ts packages/devtools/test/react/useSimulationSession.test.tsx` | ✅ extend | ⬜ pending |
| DIAG-05 | the notice on Services and Questions: Starting / Stopped copy, `data-sampled`, the restart button, suppressed absence copy while unsampled, focus after restart | React | `pnpm vitest run --project devtools packages/devtools/test/react` | ✅ extend | ⬜ pending |
| DIAG-06 | all of the above under `TestClock` with no render; `DockModel.ts`'s mutation score stays at its base (100) | mutation | `pnpm exec stryker run stryker.devtools.mjs` | gate | ⬜ pending |
| D-15 | `useTimeline` stays green with its signature unchanged (start on mount, close on unmount) | React | `pnpm vitest run --project devtools packages/devtools/test/react/useTimeline.test.tsx` | ✅ | ⬜ pending |
| WX-01..07 | the milestone rules: gate green, records, changeset with **Breaking.**, upgrade guide, reserved ids, judging files untouched | spec + full | `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict && pnpm spec:api && pnpm spec:website-examples` and `pnpm check:pr < /dev/null` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/devtools/test/model/DiagnosticsFeed.test.ts`, covering DIAG-01, DIAG-02, DIAG-05 and DIAG-06
- [ ] `settleTurns` in `packages/devtools/test/helpers.ts` (the only copy is `packages/core/test/SharedComputation.test.ts:20-22`)
- [ ] characterisation pins on today's `useDiagnostics` (the poll starts, stops, and does not restart on an equal re-render), green before any `src` change (D-16)
- [ ] the mutation base from `stryker.devtools.mjs`, committed alone, before any `src` change (D-16)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The Activity hide/show rebuild renders `Starting` and then a fresh reading, in a real browser | DIAG-05 (D-06) | `happy-dom` does not run React's `<Activity>` visibility the way a browser does | Run the newsroom example, open the dock, hide and show the panel, and watch Services move from "Waiting for the first sample." to a reading |
| The amber Stopped notice is legible in light and dark, and focus lands on the screen root after restart | DIAG-05 (UI-SPEC backstop) | contrast and focus ring are visual | Force a throwing `questions` source, check both themes, press "Restart diagnostics", and confirm the focus ring on the screen |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
