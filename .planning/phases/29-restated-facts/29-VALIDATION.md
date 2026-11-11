---
phase: "29"
slug: "restated-facts"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-11"
---

# Phase 29 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 (`@effect/vitest` in core; plain vitest + `@testing-library/react` in react and devtools); tstyche 7 |
| **Config file** | `vitest.config.ts` (projects `packages/*`; this phase uses `core`, `react`, `devtools`) |
| **Quick run command** | `pnpm vitest run --project core packages/core/test/Ports.test.ts && pnpm exec tstyche packages/core/test/PortName.tst.ts` (TIDY-01); `pnpm vitest run --project react packages/react/test/HydrationEngine.test.ts` (TIDY-02); `pnpm vitest run --project devtools packages/devtools/test/react` (TIDY-03) |
| **Full suite command** | `pnpm check:pr` (background; well over 10 minutes) |
| **Estimated runtime** | not measured at planning time |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` commands.
- **Wave 1 (29-01):** baseline JSON check; then per item its project, typecheck and lint (plus tstyche, madge and gate 13 for TIDY-01).
- **Wave 2 (29-02):** spec gates after the records; `pnpm check:pr` and the per-file mutation comparison last.
- **Max feedback latency:** under 60 s per task command; mutation runs are slower by nature.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | WX-05 | — | Baseline recorded before any src change; reserved numbers free | mutation | baseline JSON names PortMetrics.ts, PortDescription.ts, HydrationEngine.ts, Verdict.ts | ✅ | ⬜ pending |
| 29-01-02 | 01 | 1 | TIDY-01, WX-03 | T-29-01, T-29-03 | Identity in an import-free leaf; metrics byte-identical; a description cannot claim another port's span | unit + type + gates | `pnpm vitest run --project core && pnpm exec tstyche …PortName.tst.ts … && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api`; import-site grep 16 → 0 | ❌ W0 → `PortName.tst.ts` created in-task | ⬜ pending |
| 29-01-03 | 01 | 1 | TIDY-02 | T-29-02 | Withheld lists stated once; a decode guard under the untrusted options passes before and after | unit | `pnpm vitest run --project react && pnpm typecheck && pnpm lint`; deny-list literal count 2 → 1 | ✅ (guard added if missing) | ⬜ pending |
| 29-01-04 | 01 | 1 | TIDY-03 | T-29-04 | One sentence constant; literal assertions unedited | component | `pnpm vitest run --project devtools && pnpm typecheck && pnpm lint`; sentence in one src file; no devtools test diff | ✅ | ⬜ pending |
| 29-02-01 | 02 | 2 | WX-02 | T-29-05 | ADR-094 amended; ADR-QD-141 not created; traceability names the new pin | doc gate | `spec-revise --check && pnpm spec:verify:strict && pnpm spec:examples` | ✅ | ⬜ pending |
| 29-02-02 | 02 | 2 | WX-02, WX-03 | T-29-05 | CCR-QD-419; changeset bumps match the export | doc gate | CCR row count; changeset greps; bump vs `d02_fallback` check | ✅ | ⬜ pending |
| 29-02-03 | 02 | 2 | WX-01, WX-04, WX-05 | T-29-06 | Gate green and unweakened; mutation not lower | full gate | `pnpm check:pr`; no `scripts/`/config/Stryker edit since base; per-file Stryker comparison | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None blocking. `packages/core/test/PortName.tst.ts` is created by the task that needs it (29-01-02); the TIDY-02 decode guard is added in 29-01-03 only if no existing test covers it. Nothing to install. Shell checks run under `bash -c` or call `/usr/bin/grep`.

---

## Manual-Only Verifications

None. Every item is checked by an automated command.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (the tstyche pin is created in-task)
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
