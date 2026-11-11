---
phase: "26"
slug: "headless-dock-model"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: false
created: "2026-11-11"
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 (project `devtools`; jsdom + Testing Library for `test/react`, plain `@effect/vitest` for `test/model`), fast-check for P1, `@effect-cucumber/vitest` for the acceptance suite, tstyche for `*.tst.ts` |
| **Config file** | `vitest.config.ts` (projects, coverage thresholds: `src/model/**` 95, `src/react/**` 90), `packages/devtools/vitest.config.ts`, `features/vitest.config.ts`, `stryker.devtools.mjs` |
| **Quick run command** | `pnpm vitest run --project devtools <file>` from the repo root |
| **Full suite command** | `pnpm check:pr` |
| **Estimated runtime** | quick: 1–5 s per model file; the dock test (1,430 lines, 76 cases → 63) is the slowest. Scoped Stryker: minutes. Full: many minutes |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` command.
- **After every plan wave:** `pnpm vitest run --project devtools && pnpm exec tsc -p tsconfig.test.json && pnpm lint:style && pnpm circular`
  (except after 26-01, whose only change is the RED test file: there `tsc -p tsconfig.test.json` is expected to fail on the missing module until 26-02).
- **Before `/gsd-verify-work`:** `pnpm check:pr` green (26-06 Task 3).
- **Max feedback latency:** about 10 s per task, except the scoped Stryker runs (26-01 T1, 26-02 T2, 26-03 T3, 26-06 T3), `pnpm coverage` (26-05) and `pnpm check:pr`.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 26-01-01 | 01 | 1 | WX-05 | T-26-03 | Phase 25 closed; base and per-file mutation base recorded before any source edit | precondition + mutation | phase-25 SUMMARY loop; node check of `26-mutation-base.json` | ✅ | ⬜ pending |
| 26-01-02 | 01 | 1 | DMOD-01, DMOD-02, WX-06 | T-26-01, T-26-02 | M1–M16 and P1 stated headlessly (M15/M16: source read in the model's scope, D-14); RED for the missing module only | model (RED) | `pnpm vitest run --project devtools packages/devtools/test/model/DockModel.test.ts` expecting `Test Files 1 failed` naming `DockModel.ts` | ❌ W0 | ⬜ pending |
| 26-02-01 | 02 | 2 | DMOD-01, DMOD-02, WX-04 | T-26-04..06 | One push for every store; `configure` diffs per field; capacity keeps choices; scoped constructor, no `dispose`/`read`, the read and a run live in the model's scope (M13, M15, M16; D-13, D-14) | model (GREEN) + grep | `pnpm vitest run --project devtools && pnpm exec tsc -p tsconfig.test.json && pnpm lint:style && pnpm circular` | ❌ W0 | ⬜ pending |
| 26-02-02 | 02 | 2 | WX-05 | T-26-05 | New module meets the model mutation bar | mutation | Stryker on `DockModel.ts` + MUTATION-COMPARE (0 NoCoverage, ≥ 90) | ❌ W0 | ⬜ pending |
| 26-03-01 | 03 | 3 | DMOD-04 | T-26-08 | One held-choice cell; the store is the cell plus a publish | unit | `pnpm vitest run --project devtools …/HeldChoice.test.ts …/RoleViewer.test.tsx` | ✅ | ⬜ pending |
| 26-03-02 | 03 | 3 | DMOD-04 | T-26-08 | Explorer embeds the cell; no re-mapped union in explorer or role viewer | unit + grep | explorer/PolicyExplorer/RoleViewer/DockModel tests + `resolveHeld(|pinHead(` = 0 | ✅ | ⬜ pending |
| 26-03-03 | 03 | 3 | DMOD-04, WX-05 | T-26-07, T-26-09 | Simulation embeds the cell, keeps the conditional pin; `PolicyChoice` = held arms ∣ Seeded; mutation not lower | unit + BDD + type + mutation | `pnpm vitest run --project devtools && pnpm --filter @qadi/features exec vitest run features/devtools-simulator && … && pnpm test:tstyche` + MUTATION-COMPARE (3 files) | ✅ | ⬜ pending |
| 26-04-01 | 04 | 4 | DMOD-01, DMOD-03, DMOD-05 | T-26-10..13 | One owned-model hook built through `useScoped` that forks nothing (no `useState`, `dispose`, `useEffect(`, `runFork` in it; D-14); four owned hooks gone; dock test untouched and green | integration + grep | `pnpm vitest run --project devtools` + `git diff <base> -- DevtoolsDock.test.tsx` empty + `useOwned` = 0 | ✅ | ⬜ pending |
| 26-04-02 | 04 | 4 | DMOD-03 | T-26-10 | `Screen` takes the model; 0 conditional spreads; layout effects only in `useDockModel.ts`, `useScoped.ts` and `useSimulationSession.ts` | integration + grep | as above + spread and `useLayoutEffect(` greps | ✅ | ⬜ pending |
| 26-05-01 | 05 | 5 | DMOD-02, WX-05 | T-26-14, T-26-15 | 13 DOM duplicates deleted after their model tests pass; 63 cases left; coverage held | integration + coverage | `pnpm vitest run --project devtools && … && pnpm coverage` + case count 63 + 13 titles absent | ✅ | ⬜ pending |
| 26-06-01 | 06 | 6 | WX-02 | T-26-16, T-26-17 | ADR-047 amendment, BEH-QD-465/466, BEH-QD-322/389 match the code | doc gate | `node scripts/spec-revise.mjs --check && pnpm spec:examples` + greps | ✅ | ⬜ pending |
| 26-06-02 | 06 | 6 | WX-02, WX-03 | T-26-16 | INV-QD-296, INV-QD-107 sources, traceability, overview, CCR, changesets | doc gate | `pnpm spec:verify:strict && pnpm spec:claims && pnpm spec:api` | ✅ | ⬜ pending |
| 26-06-03 | 06 | 6 | WX-01, WX-04, WX-05, WX-06 | T-26-18 | Whole merge gate minus mutation; mutation not lower; no gate edited | gate + mutation | MUTATION-COMPARE (5 files) vs `26-mutation-base.json` + config diff empty + `pnpm check:pr` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/devtools/test/model/DockModel.test.ts` — created RED by 26-01 Task 2 before `DockModel.ts` exists (26-02).

Everything else is installed and configured. The DOM regression net is the existing `DevtoolsDock.test.tsx`, unedited through
26-04 and reduced only in 26-05.

---

## Inventory sampling (DMOD-02)

| Class | Count | Where it is proved after the phase |
|-------|-------|------------------------------------|
| Model | 13 | `DockSession.test.ts` (4) and `DockModel.test.ts` M1–M3, M5–M9, M11 (9); deleted from the dock test in 26-05 |
| Wiring | 23 | `DevtoolsDock.test.tsx` (unchanged) |
| Layout | 40 | `DevtoolsDock.test.tsx` (unchanged) |

The full table is in `26-CONTEXT.md` `<inventory>`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `pnpm check:pr` as one uninterrupted run | WX-01 | locally `pnpm example` may need sudo for `playwright install --with-deps` | run in CI or a shell with sudo |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency under 10 s for per-task checks (except Stryker, `pnpm coverage` and `pnpm check:pr`)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
