---
phase: "89"
slug: "one-admission-step-for-a-host-s-audit-batch"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-26"
---

# Phase 89 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Seeded from `89-RESEARCH.md` §Validation
> Architecture; the planner fills the task ids.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 + @effect/vitest 4.1.2 + fast-check 4.10.2; tstyche 7.2.5 for types |
| **Config file** | `packages/audit/vitest.config.ts` (project `audit`); `tsconfig.tstyche.json` and `tsconfig.test.json` |
| **Quick run command** | `pnpm exec vitest run --project audit < /dev/null` |
| **Type quick run** | `pnpm test:tstyche packages/audit/test/HostBatch.tst.ts < /dev/null` (both passes) |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Mutation** | `pnpm exec stryker run stryker.audit.mjs --mutate <the measured files> < /dev/null` |
| **Estimated runtime** | quick ~5 s; types ~4 s; mutation ~30 s; full suite several minutes |

---

## Sampling Rate

- **After every task commit:** the quick vitest line for the touched files, and `node scripts/check-house-style.mjs < /dev/null`.
- **After every plan wave:** `pnpm exec vitest run --project audit`, `pnpm test:tstyche`, `pnpm circular`, `pnpm typecheck`, `pnpm lint`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, `pnpm spec:api`, `pnpm spec:examples`, `pnpm spec:verify:strict`, the audit mutation run, and all four `89-*` scripts.
- **Max feedback latency:** 30 seconds per task (excluding the phase gate).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (planner fills) | | | ADMIT-01 | — | winner and spans on every fault pair; laziness | unit + property | `pnpm exec vitest run --project audit packages/audit/test/AdmissionOrder.characterisation.test.ts` | ❌ W0 | ⬜ pending |
| (planner fills) | | | ADMIT-02 | — | one order, terms called once, rows read once into a fresh array | unit | `pnpm exec vitest run --project audit packages/audit/test/HostBatch.test.ts` | ❌ W0 | ⬜ pending |
| (planner fills) | | | ADMIT-02 | — | every entry point calls the step first | check script | `node <phase dir>/89-check.mjs entry-points-first` and `admission-step` | ❌ W0 | ⬜ pending |
| (planner fills) | | | ADMIT-03 | — | enums are fragments plus own members; brand is nominal | type | `pnpm test:tstyche packages/audit/test/HostBatch.tst.ts` | ❌ W0 | ⬜ pending |
| (planner fills) | | | ADMIT-04 | — | each entry point refuses what the step refuses | unit | `pnpm exec vitest run --project audit packages/audit/test/ForeignRows.test.ts` | ✅ (declared edit) | ⬜ pending |
| (planner fills) | | | ADMIT-05 | — | records, revisions, ids | check script | `node <phase dir>/89-check.mjs records --close` and `pnpm spec:verify:strict` | ❌ W0 | ⬜ pending |
| (planner fills) | | | WX-05 | — | no touched file's score falls; HostBatch.ts all killed or recorded | mutation + coverage | `node <phase dir>/89-mutation.mjs …` | ❌ W0 | ⬜ pending |
| (planner fills) | | | WX-06 | — | every new check seen failing | scratch variants | recorded in `89-RED-EVIDENCE.md` via `89-check.mjs seen-failing` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/audit/test/AdmissionOrder.characterisation.test.ts` — ADMIT-01 (green on the base; declared regions)
- [ ] `packages/audit/test/HostBatch.test.ts` — ADMIT-02/04 (seen RED: module not found)
- [ ] `packages/audit/test/HostBatch.tst.ts` — ADMIT-03 (seen failing on V1 to V4, V6)
- [ ] `packages/audit/test/hostBatchFaults.ts` — the shared fault table
- [ ] `89-mutation-base.json` — taken on the phase base
- [ ] `89-check.mjs`, `89-pinned-check.mjs`, `89-mutation.mjs`, `89-earlier-checks.mjs` with `--self-test`; `89-RED-EVIDENCE.md`

No framework install.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
