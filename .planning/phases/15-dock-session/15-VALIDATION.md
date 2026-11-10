---
phase: "15"
slug: "dock-session"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: false
created: "2026-11-10"
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 (project `devtools`, jsdom + Testing Library for `test/react`), `@effect-cucumber/vitest` for the acceptance suite |
| **Config file** | `vitest.config.ts` (projects), `packages/devtools/vitest.config.ts`, `features/vitest.config.ts` |
| **Quick run command** | `pnpm vitest run --project devtools <file>` from the repo root |
| **Full suite command** | `pnpm check:pr` |
| **Estimated runtime** | quick: 1–5 s per file (the 1348-line dock test is the slowest). Full: many minutes |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` command.
- **After every plan wave:** `pnpm vitest run --project devtools && pnpm exec tsc -p tsconfig.test.json && pnpm lint:style && pnpm circular`.
- **Before `/gsd-verify-work`:** `pnpm check:pr` green (15-04 Task 3).
- **Max feedback latency:** about 10 s per task, except the scoped Stryker runs (15-01 Task 1, 15-02 Task 2, 15-04 Task 3) and `pnpm check:pr`.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | DOCK-01, XC-05, XC-06 | T-15-01 | Phase 14 closed; mutation base written; replay of the same row seen not to re-seed on the base | regression (RED) | `pnpm vitest run --project devtools packages/devtools/test/react/DevtoolsDock.test.tsx` expecting 2 failed | ✅ | ⬜ pending |
| 15-01-02 | 01 | 1 | DOCK-04 | T-15-02, T-15-03 | `replay` always re-seeds; `seed` re-run keeps the form | unit | `pnpm vitest run --project devtools packages/devtools/test/model/SimulationSession.test.ts` | ✅ | ⬜ pending |
| 15-01-03 | 01 | 1 | DOCK-01, DOCK-05 | T-15-01, T-15-02 | Dock replays through the session; timeline change keeps the replay | regression (GREEN) | `pnpm vitest run --project devtools` | ✅ | ⬜ pending |
| 15-02-01 | 02 | 2 | DOCK-02, DOCK-03 | T-15-04..06 | Pair-whole-then-filter; count-whole; no-op commands silent | unit (no render) | `pnpm vitest run --project devtools packages/devtools/test/model/DockSession.test.ts` | ❌ W0 | ⬜ pending |
| 15-02-02 | 02 | 2 | XC-05 | T-15-04 | New module meets the model mutation bar | mutation | Stryker on DockSession.ts + MUTATION-COMPARE (0 NoCoverage, ≥ 90) | ❌ W0 | ⬜ pending |
| 15-03-01 | 03 | 3 | DOCK-02, DOCK-05 | T-15-07, T-15-08 | Dock holds no `useState`; every dock test unchanged | integration | `pnpm vitest run --project devtools` + `grep -c useState` = 0 | ✅ | ⬜ pending |
| 15-03-02 | 03 | 3 | DOCK-01, DOCK-04 | T-15-01 | Replay fix pinned at the public session seam | BDD | `pnpm --filter @qadi/features exec vitest run features/devtools-simulator` | ✅ | ⬜ pending |
| 15-04-01 | 04 | 4 | XC-02 | T-15-10, T-15-11 | ADR-047 amendment, BEH-QD-389/390, fence matches code | doc gate | `node scripts/spec-revise.mjs --check && pnpm spec:examples` | ✅ | ⬜ pending |
| 15-04-02 | 04 | 4 | XC-02, XC-03 | T-15-09 | INV-QD-107 sources, traceability, claims, CCR | doc gate | `pnpm spec:verify:strict && pnpm spec:claims && pnpm spec:api` | ✅ | ⬜ pending |
| 15-04-03 | 04 | 4 | XC-01, XC-04, XC-05 | all | Whole merge gate minus mutation; mutation not lower | gate + mutation | MUTATION-COMPARE vs `15-mutation-base.json` + `pnpm check:pr` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/devtools/test/model/DockSession.test.ts` — created by 15-02 Task 1 before `DockSession.ts`.

The dock regression tests go into the existing `DevtoolsDock.test.tsx` (15-01 Task 1, RED before any source change). Everything else is installed and configured.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `pnpm check:pr` as one uninterrupted run | XC-01 | locally `pnpm example` may need sudo for `playwright install --with-deps` | run in CI or a shell with sudo |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency under 10 s for per-task checks (except Stryker and `pnpm check:pr`)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
