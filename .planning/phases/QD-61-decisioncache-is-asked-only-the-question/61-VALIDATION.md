---
phase: "61"
slug: "decisioncache-is-asked-only-the-question"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-19"
---

# Phase 61 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `61-RESEARCH.md` § Validation Architecture and CONTEXT D-01..D-15.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest` (project `core`); tstyche; Stryker via `stryker.config.mjs` (with `--mutate`, never edited) |
| **Config file** | `packages/core/vitest.config.ts`; root `vitest.config.ts`; `tstyche.json`; `stryker.config.mjs` |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts packages/core/test/Lifecycle.test.ts packages/core/test/SharedComputation.test.ts < /dev/null` |
| **Type tests** | `pnpm exec tstyche packages/core/test/DecisionCache.tst.ts < /dev/null` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | quick < 1 s; core project ~10 s |

---

## Sampling Rate

- **After every task commit:** the quick run, tstyche on the new file, and `node scripts/check-house-style.mjs`.
- **After every plan wave:**
  1. `pnpm exec vitest run --project core < /dev/null`
  2. `pnpm typecheck`
  3. `pnpm test:tstyche`
  4. `pnpm lint`
  5. `pnpm circular`
- **Before `/gsd-verify-work`:**
  1. `pnpm check:pr < /dev/null`
  2. the scoped Stryker run, alone, never beside vitest or check:pr
  3. the mutation compare
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by the planner from the plans' `<verify>` blocks) | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement → test map (from research):
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CASK-02 | `getOrCompute` refuses a computation; positive controls | type | `pnpm exec tstyche packages/core/test/DecisionCache.tst.ts` | ❌ Wave 0 (new) |
| CASK-02 | The layer walks the question it is given; Lifecycle hands over only the question | unit | quick run (`Lifecycle.test.ts` wrapper) | ✅ (edit) |
| CASK-03 | One entry for two concurrencies; concurrency reaches the walk | unit | quick run (`DecisionCache.test.ts`) | ✅ (add 1–2 tests) |
| CASK-04 | Coalescing and interruption through a question alone | unit | quick run | ✅ (only `:1113` rewritten) |
| WX-05 | Scores do not fall | mutation | Q7 command + `61-mutation.mjs compare` | ❌ Wave 0 (harness copy) |


---

## Wave 0 Requirements

- [ ] `packages/core/test/DecisionCache.tst.ts` (CASK-02, RED on the base)
- [ ] `61-mutation.mjs` + `61-mutation-base.json`, measured on the untouched tree (D-05 step 1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | — | — |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
