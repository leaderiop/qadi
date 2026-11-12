---
phase: "29"
slug: "restated-facts"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
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
- **Wave 1 (29-01):** baseline JSON check (all twelve files the phase changes); then TIDY-01's core project, tstyche, typecheck, lint, madge and gate 13.
- **Wave 2 (29-02):** per item (TIDY-02, TIDY-03) its project, typecheck and lint.
- **Wave 3 (29-03):** spec gates after the records; `pnpm check:pr` and the per-file mutation comparison last.
- **Max feedback latency:** under 60 s per task command; mutation runs are slower by nature.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 29-01-01 | 01 | 1 | WX-05 | — | Baseline recorded from fresh reports before any src change, for every src file the phase changes; reserved numbers free | mutation | baseline JSON holds exactly the twelve (8 core, HydrationEngine.ts, Verdict.ts, Inspector.tsx, Simulator.tsx); the `chore(29-01)` commit is the phase's first and carries the JSON alone | ✅ | ✅ green |
| 29-01-02 | 01 | 1 | TIDY-01, WX-03 | T-29-01, T-29-03 | Identity in an import-free leaf; metrics byte-identical; a description cannot claim another port's span | unit + type + gates | `test -f …PortName.tst.ts && pnpm vitest run --project core && pnpm exec tstyche …PortName.tst.ts … && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api`; multi-line-aware import check 18 lines → 0 | ❌ W0 → `PortName.tst.ts` created in-task | ✅ green |
| 29-02-01 | 02 | 2 | TIDY-02 | T-29-02 | Withheld lists stated once; a decode guard under the untrusted options passes before and after | unit | `pnpm vitest run --project react && pnpm typecheck && pnpm lint`; deny-list literal count 2 → 1 | ✅ (existing guard: `HydrationPayload.test.ts`, no test added) | ✅ green |
| 29-02-02 | 02 | 2 | TIDY-03 | T-29-04 | One sentence constant; literal assertions unedited | component | `pnpm vitest run --project devtools && pnpm typecheck && pnpm lint`; "depended on failed" only in `model/Verdict.ts`, both panels render the constant; no devtools test diff from the guarded baseline commit | ✅ | ✅ green |
| 29-03-01 | 03 | 3 | WX-02 | T-29-05 | ADR-094 amended; ADR-QD-141 not created; traceability names the new pin | doc gate | `spec-revise --check && pnpm spec:verify:strict && pnpm spec:examples` | ✅ | ✅ green |
| 29-03-02 | 03 | 3 | WX-02, WX-03 | T-29-05 | CCR-QD-419; changeset bumps match the export | doc gate | CCR row count; changeset greps; bump vs `d02_fallback` check | ✅ | ✅ green |
| 29-03-03 | 03 | 3 | WX-01, WX-04, WX-05 | T-29-06 | Gate green and unweakened; mutation not lower | full gate | `pnpm check:pr`; no `scripts/`/config/Stryker edit since a guarded `phase_base`; per-file comparison over core, react and devtools (fresh reports, `missing`, `DROP`, `unbaselined`, `base missing/extra`, `no phase base`, the type-only leaf and the export-star barrel checked) | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None blocking. `packages/core/test/PortName.tst.ts` is created by the task that needs it (29-01-02); the TIDY-02 decode guard is added in 29-02-01 only if no existing test covers it. Nothing to install. Shell checks run under `bash -c` or call `/usr/bin/grep`.

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

**Approval:** validated 2026-11-12. All seven tasks green: 29-01 dd158b25/2bfc6cc1, 29-02 47d08a41/d4813a15, 29-03 e66748b1/c242c6f5/94841eb0/058bbd29. Final `pnpm check:pr` (stdin closed) exit 0, 16 of 17 steps; per-file mutation comparison clean (HydrationEngine.ts 0.9619 → 0.9693, every other file at its base).

## Validation Audit 2026-11-12

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
