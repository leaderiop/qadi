---
phase: "QD-82"
slug: "qadiprovider-s-registry-has-one-owner-for-its-lifetime"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-25"
---

# Phase QD-82 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Seeded from `82-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (project `react`), `@effect/vitest`, happy-dom, `@testing-library/react`; Stryker for mutation |
| **Config file** | `packages/react/vitest.config.ts`, `stryker.react.mjs` |
| **Quick run command** | `pnpm exec vitest run --project react packages/react/test/RegistryLease.test.ts packages/react/test/QadiProvider.lifetime.test.tsx < /dev/null` (from the repo root only) |
| **Full suite command** | `pnpm exec vitest run --project react < /dev/null`; the phase gate is `pnpm check:pr < /dev/null` plus `pnpm spec:package` and `82-mutation.mjs compare` |
| **Estimated runtime** | ~4 seconds for the React suite; `pnpm check:pr` about 15 to 20 min |

---

## Sampling Rate

- **After every task commit:** Run the quick run command.
- **After every plan wave:** Run `pnpm exec vitest run --project react < /dev/null` and `pnpm lint`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` and `pnpm spec:package` green; `82-mutation.mjs compare` exit 0.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

To be filled by the planner per task. These are the requirement-level rows from research.

| Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|-----------------|-----------|-------------------|-------------|--------|
| LEASE-01 | A long hide and reveal throws nothing and renders the client's decision | rendered, RED on base | `pnpm exec vitest run --project react packages/react/test/QadiProvider.lifetime.test.tsx < /dev/null` | ❌ W0 | ⬜ pending |
| LEASE-02 | The lease's rule holds over every state; no open mutant | headless unit + mutation | `pnpm exec vitest run --project react packages/react/test/RegistryLease.test.ts < /dev/null`; `stryker.react.mjs` close | ❌ W0 | ⬜ pending |
| LEASE-03 | Released exactly once on unmount; none used after release; no leak | rendered | `edges.test.tsx` (rewritten `:257`) and the lifetime file | ✅ / ❌ W0 | ⬜ pending |
| LEASE-04 | No superseded seed is resurrected; subject re-seeded before reads; sweep bound holds | rendered | lifetime file | ❌ W0 | ⬜ pending |
| LEASE-05 | Records match the code | spec gates | `pnpm spec:verify:strict`, `pnpm spec:package` | ✅ | ⬜ pending |
| WX-01..07 | Gate green, reserved ids, no export change, house style, mutation, RED-first, no plan-local ids | gate / process | `pnpm check:pr < /dev/null`; `82-check.mjs`; `82-mutation.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/react/test/QadiProvider.lifetime.test.tsx`: RED on the base first, output recorded in `82-RED-EVIDENCE.md`.
- [ ] `packages/react/test/RegistryLease.test.ts`: a headless matrix with a fake defer that really cancels, plus one test on the default defer.
- [ ] `stryker.react.mjs`: add the module. The base is recorded before any source edit, over the four existing files.
- [ ] `edges.test.tsx:257`: the host-atom observable, shown failing once with the release skipped.
- [ ] `82-check.mjs` and `82-mutation.mjs`, each shown failing once.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
