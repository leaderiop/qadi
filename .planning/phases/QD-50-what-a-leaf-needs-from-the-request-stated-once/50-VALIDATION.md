---
phase: "50"
slug: "what-a-leaf-needs-from-the-request-stated-once"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-16"
---

# Phase 50 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 with `@effect/vitest`; fast-check for properties; tstyche for `*.tst.ts` |
| **Config file** | `vitest.config.ts` (root), `packages/core/vitest.config.ts`, `stryker.config.mjs`, `tsconfig.test.json` |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/LeafMatrix.test.ts packages/core/test/LeafNeeds.test.ts` |
| **Full suite command** | `pnpm exec vitest run --project core` then `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~1 second quick; ~5 seconds core; ~6 minutes `check:pr` |

---

## Sampling Rate

- **After every task commit:** Run the quick run command
- **After every plan wave:** Run `pnpm exec vitest run --project core` and `pnpm typecheck`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` must be green, and Stryker re-run with the base's invocation
- **Max feedback latency:** 10 seconds (quick run)

---

## Per-Task Verification Map

Filled by the planner from the PLAN files' `<verify>` blocks. Requirement → test map (from 50-RESEARCH.md "Validation Architecture"):

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| LEAF-01 | A/B numbers per workload; pursue or reject on the median of per-run minima (D-03a) | benchmark script (manual by design, ADR-QD-073: a timing threshold is a tool a reviewer runs, not a merge gate) | the committed A/B script and analysis under the phase dir; smoke `pnpm exec vitest bench --run packages/core/bench/Evaluate.bench.ts` | ❌ W0 | ⬜ pending |
| LEAF-02 | One row per leaf; the reader says what the rule says; resource-id rows tie to `readScoped` | unit + compile | quick run; `pnpm typecheck` (TS2741 on a missing row) | ❌ W0 `LeafNeeds.test.ts`, `LeafFixtures.ts` | ⬜ pending |
| LEAF-03 | Order rule preserved in every cell (D-05, D-14) | characterisation | `pnpm exec vitest run --project core packages/core/test/LeafMatrix.test.ts` | ❌ W0 `LeafMatrix.test.ts` | ⬜ pending |
| LEAF-04 | Port-free judgement written once; reasons byte-identical | unit | `Evaluate.test.ts` reason assertions + `LeafNeeds.test.ts` rows | partly ✅ | ⬜ pending |
| LEAF-05 | Exhaustive table test pins INV-QD-011; budgets unchanged | unit + gate | quick run; `pnpm lint` (check-house-style) | ❌ W0 | ⬜ pending |
| WX-05 | Mutation not below base (D-13 for `Walk.ts`) | mutation | `pnpm exec stryker run stryker.config.mjs --mutate '<Walk,Predicate,PortAccess,LeafNeeds>' < /dev/null` | base: research Q7 | ⬜ pending |
| WX-06 | Characterisation before change | commit order | git log order | — | ⬜ pending |
| WX-01..04, 07 | gates, ids, overview, banned constructs, breaks | gate | `pnpm check:pr < /dev/null` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/core/bench/Evaluate.bench.ts` — the leaf-heavy workloads, on the base, first commit
- [ ] the A/B script and its analysis committed under the phase directory (the session scratchpad is not durable)
- [ ] `50-mutation-base.json` — before any `src` edit
- [ ] `packages/core/test/LeafFixtures.ts` — fixtures and oracle
- [ ] `packages/core/test/LeafMatrix.test.ts` — characterisation, green on the base
- [ ] `packages/core/test/LeafNeeds.test.ts` — RED by import until `LeafNeeds.ts` exists

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Bench pursue/reject verdict | LEAF-01 | Timing depends on the host; ADR-QD-073 keeps timing thresholds out of the merge gate | Run the committed A/B script (3+3 interleaved) on a quiet host, record `uptime`, apply D-03a, write the numbers into ADR-QD-163 |
| No regression after the change | LEAF-01 / SC5 | Same | Re-run the A/B script with the final source against the phase base |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
