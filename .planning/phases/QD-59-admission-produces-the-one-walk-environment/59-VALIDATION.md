---
phase: "59"
slug: "admission-produces-the-one-walk-environment"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-19"
---

# Phase 59 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `59-RESEARCH.md` § Validation Architecture and CONTEXT D-01..D-18.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest`; tstyche (`*.tst.ts`); Stryker for mutation; the phase's `bench/ab.sh` + `analyze.mjs` for the benchmark |
| **Config file** | root `vitest.config.ts`; `tstyche.json`; `stryker.config.mjs` (with `--mutate`, never edited) |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/Admission.test.ts packages/core/test/LeafMatrix.test.ts packages/core/test/RolesAndDepth.test.ts packages/core/test/Predicate.test.ts packages/core/test/DecisionCache.test.ts < /dev/null` (repo root) |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | quick ~5 s; core project ~10 s; one 3 + 3 bench run ~4 min |

---

## Sampling Rate

- **After every task commit:** run the quick command and `node scripts/check-house-style.mjs`.
- **After every plan wave:** run these in order:
  1. `pnpm exec tsc -b tsconfig.json && pnpm exec tsc -p tsconfig.test.json`
  2. `pnpm exec vitest run --project core < /dev/null`
  3. `pnpm test:tstyche`
  4. `pnpm lint`
  5. `pnpm circular`
- **Before `/gsd-verify-work`:**
  1. Run `pnpm check:pr < /dev/null`.
  2. Run the after-bench, a 3 + 3 run against the phase base, with `# gate: pass` required.
  3. Run the scoped Stryker run.
  4. Run the mutation compare.

  Never run Stryker or vitest beside the benchmark.
- **Max feedback latency:** ~30 seconds for the quick run.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by the planner from the plans' `<verify>` blocks) | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement → test map (from research):

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WENV-01 | the gate numbers (done in research: `# gate: pass` twice) | harness | `node <phase dir>/bench/analyze.mjs <dir> base proto` | ✅ `bench/gate`, `bench/gate-r2` |
| WENV-02 | `admit(q, "asked")` gives the env; `"row"` always supplies the resource (RED on base) | unit | `pnpm exec vitest run --project core packages/core/test/Admission.test.ts < /dev/null` | rows to add |
| WENV-02 | each interpreter's `supplied` outcome unchanged | unit (green on base) | `… LeafMatrix.test.ts packages/core/test/Predicate.test.ts` | ✅ |
| WENV-03 | depth/maxDepth swap cannot compile (RED on base) | tstyche | `pnpm exec tstyche packages/core/test/WalkEnvironment.tst.ts` | ❌ W0 |
| WENV-04 | depth agreement | unit | `… RolesAndDepth.test.ts` | ✅ |
| WENV-04 | budgets unchanged | gate | `node scripts/check-house-style.mjs` | ✅ |
| WENV-04 | the after-bench shows no workload slower | harness | the phase's `bench/ab.sh`, then `analyze.mjs`; the last line is `# gate: pass` | ✅ harness |
| WX-06 | cache-hit laziness (`admit` never runs on a hit) | unit | `… DecisionCache.test.ts` | ✅ |
| WX-05 | mutation not lower | harness | `node <phase dir>/59-mutation.mjs compare [static json]` | ❌ W0 |

---

## Wave 0 Requirements

- [ ] `59-mutation.mjs` and `59-mutation-base.json`, committed alone as the first commit after the bench plan, and never re-baselined.
- [ ] `packages/core/test/WalkEnvironment.tst.ts`, RED on the base.
- [ ] The RED rows in `Admission.test.ts`.

---

## Manual-Only Verifications

None.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
