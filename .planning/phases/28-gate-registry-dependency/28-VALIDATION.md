---
phase: "28"
slug: "gate-registry-dependency"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-11"
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 (plain `vitest` in `@qadi/react`), `@testing-library/react` for hook lifecycle tests; tstyche 7 |
| **Config file** | `vitest.config.ts` (projects `packages/*`; this phase uses `react`) |
| **Quick run command** | `pnpm vitest run --project react packages/react/test/GateWriter.test.tsx packages/react/test/GateWriter.reconcile.test.ts` |
| **Full suite command** | `pnpm check:pr` (background; well over 10 minutes) |
| **Estimated runtime** | not measured at planning time |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` commands.
- **Wave 1 (28-01):** checkpoint, then SUMMARY greps.
- **Wave 2 (28-02):** react project, typecheck, lint, madge.
- **Wave 3 (28-03, A/B):** reconcile test red, then react project, typecheck, lint, madge.
- **Wave 4 (28-04, A):** typecheck, lint, madge, gate 13 after the move; full react project and tstyche before the commit.
- **Before verify-work:** `pnpm check:pr` green and the per-file plus aggregate mutation comparison (28-05 Task 3).
- **Max feedback latency:** under 60 s per task command; mutation runs are slower by nature.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | GATE-01, GATE-04 | T-28-01, T-28-03 | A human chooses A/B/C and confirms `useGateRegistration`'s fate | manual decision | — (checkpoint:decision, blocking-human) | n/a | ⬜ pending |
| 28-01-02 | 01 | 1 | GATE-01, WX-02 | T-28-02 | Outcome, reason, `use_gate_registration`, phase base recorded; numbers free | doc gate | SUMMARY frontmatter greps; commits touch only `.planning/` | ✅ | ⬜ pending |
| 28-02-01 | 02 | 2 | WX-05 | — | Baseline per file and aggregate | mutation | baseline JSON names GateWriter.ts, GateRegistry.ts, useGate.ts, `__aggregate__` | ✅ | ⬜ pending |
| 28-02-02 | 02 | 2 | GATE-04 | T-28-04 | Lifecycle tests on the production hook; wrapper removed | hook lifecycle | `pnpm vitest run --project react && pnpm typecheck && pnpm lint && pnpm circular`; no `useGateRegistration\b` under `delete` | ✅ | ⬜ pending |
| 28-03-01 | 03 | 3 | GATE-02, WX-06 | T-28-05 | (A/B) reconcile rules red against a fake writer, no rendering | unit (RED) | `! pnpm vitest run --project react …GateWriter.reconcile.test.ts`; no `renderHook`/react import | ❌ W0 → created in-task | ⬜ pending |
| 28-03-02 | 03 | 3 | GATE-02, WX-04 | T-28-06 | (A/B) React-free `reconcile`; no new effect | unit + project | `pnpm vitest run --project react && pnpm typecheck && pnpm lint && pnpm circular`; `useEffect` count ≤ 3 | ✅ | ⬜ pending |
| 28-04-01 | 04 | 4 | GATE-03, WX-03 | T-28-07, T-28-08 | (A) write side React-free; `GateAtoms` derived; no export change; no cycle | static + gates | `pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api`; import/`Pick<QadiAtoms` greps | ✅ | ⬜ pending |
| 28-04-02 | 04 | 4 | GATE-03 | T-28-07 | (A) tests changed only by imports | full project | `pnpm vitest run --project react && pnpm test:tstyche && …`; uncommitted test diff is imports only | ✅ | ⬜ pending |
| 28-05-01 | 05 | 5 | GATE-01, WX-02 | T-28-09 | Outcome recorded with the correction and the human's reason | doc gate | outcome-conditional ADR greps; `spec-revise --check && pnpm spec:verify:strict && pnpm spec:examples` | ✅ | ⬜ pending |
| 28-05-02 | 05 | 5 | WX-02 | T-28-09 | CCR-QD-418, patch changeset | doc gate | CCR row count; changeset grep | ✅ | ⬜ pending |
| 28-05-03 | 05 | 5 | WX-01, WX-04, WX-05 | T-28-10 | Gate green and unweakened; mutation not lower | full gate | `pnpm check:pr`; no `scripts/`/threshold edit since base; per-file + aggregate Stryker comparison | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None blocking. `packages/react/test/GateWriter.reconcile.test.ts` is created by the task that needs it (28-03-01). Nothing to install. Shell checks run under `bash -c` or call `/usr/bin/grep`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Choose how far ARCH-76 reopens ADR-QD-111, and confirm deleting `useGateRegistration` | GATE-01, GATE-04 | A human decision by design (it amends an accepted ADR) | Read 28-01 Task 1 and reply `A`, `B` or `C`; add `keep: <reason>` only to keep `useGateRegistration` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are the one checkpoint
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (the reconcile test is created in-task)
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
