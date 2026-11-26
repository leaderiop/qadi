---
phase: "89"
slug: "one-admission-step-for-a-host-s-audit-batch"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
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
| 89-01-T2/T3 | 01 | 0 | ADMIT-01 | — | winner and spans on every fault pair; laziness; batch-read defects | unit + property | `pnpm vitest run packages/audit/test/AdmissionOrder.characterisation.test.ts packages/audit/test/BatchReadOnce.test.ts` | ✅ | ✅ green |
| 89-05-T1 | 05 | 2 | ADMIT-02 | — | one order, terms called once, rows read once into a fresh array | unit | `pnpm vitest run packages/audit/test/HostBatch.test.ts` | ✅ | ✅ green |
| 89-05/06 | 05–06 | 2–3 | ADMIT-02 | — | every entry point calls the step first; step is plain and package-private | check script | `node 89-check.mjs entry-points-first` and `admission-step` | ✅ | ✅ green |
| 89-07-T2 | 07 | 4 | ADMIT-03 | — | enums are fragments plus own members; brand is nominal | type | `pnpm test:tstyche packages/audit/test/HostBatch.tst.ts` (5 tests, 13 assertions) | ✅ | ✅ green |
| 89-08-T1/T2 | 08 | 5 | ADMIT-04 | — | each entry point refuses what the step refuses; order rows removed | unit | `pnpm vitest run packages/audit/test/ForeignRows.test.ts packages/audit/test/Retention.test.ts` | ✅ | ✅ green |
| 89-10-T1..T3 | 10 | 7 | ADMIT-05 / WX-02 | — | ADR-QD-202/190/110, BEH-QD-781..785, INV-QD-423/424, traceability | check script | `node 89-check.mjs records --close` and `pnpm spec:verify:strict` (21 pass) | ✅ | ✅ green |
| 89-09-T2 | 09 | 6 | WX-05 | — | no touched file's score falls; HostBatch.ts 21/22, `taken.filter` survivor equivalent; coverage 100% | mutation + coverage | `node 89-mutation.mjs …` (`89-mutation-close.json`) | ✅ | ✅ green |
| 89-09-T1 | 09 | 6 | WX-06 | — | every new check seen failing | scratch variants | `89-RED-EVIDENCE.md` via `89-check.mjs seen-failing` | ✅ | ✅ green |
| 89-09-T3 | 09 | 6 | WX-03 | — | patch changeset for @qadi/audit; no export added | changeset | `.changeset/audit-batch-admitted-once.md`; gate 13 in `pnpm check:pr` | ✅ | ✅ green |
| all | — | — | WX-04 / WX-07 | — | no forbidden form, no plan ids in added lines | check script | `node 89-check.mjs scan-forbidden` and `scan-ids` | ✅ | ✅ green |
| 89-11 | 11 | 8 | WX-01 | — | merge gate green | full suite | `pnpm check:pr < /dev/null` (exit 0 at 1ad87644, per close) | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `packages/audit/test/AdmissionOrder.characterisation.test.ts` — ADMIT-01 (green on the base; declared regions)
- [x] `packages/audit/test/HostBatch.test.ts` — ADMIT-02/04 (seen RED: module not found)
- [x] `packages/audit/test/HostBatch.tst.ts` — ADMIT-03 (seen failing on V1 to V4, V6)
- [x] `packages/audit/test/hostBatchFaults.ts` — the shared fault table
- [x] `89-mutation-base.json` — taken on the phase base
- [x] `89-check.mjs`, `89-pinned-check.mjs`, `89-mutation.mjs`, `89-earlier-checks.mjs` with `--self-test`; `89-RED-EVIDENCE.md`

No framework install.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-26 (Nyquist audit, autonomous)

## Validation Audit 2026-11-26

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Re-run at audit: the five audit test files (172 rows), `HostBatch.tst.ts`, `entry-points-first`, `admission-step`, `records --close`, `scan-ids`, `scan-forbidden`, `spec:verify:strict`, and `89-pinned-check.mjs --all-applied` all green. `pnpm check:pr` not re-run; exit 0 at HEAD per the close plan.
