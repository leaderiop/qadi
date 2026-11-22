---
phase: "67"
slug: "no-equivalent-mutants-no-magic-race-bound"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-22"
---

# Phase 67 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 with `@effect/vitest` |
| **Config file** | root vitest config |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts packages/core/test/SharedComputation.test.ts < /dev/null` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~1 s for the quick run; `check:pr` several minutes |

---

## Sampling Rate

- **After every task commit:** the quick run command
- **After every plan wave:** the quick run plus `node scripts/check-house-style.mjs`, `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| MUTE-01 | Eviction is one `Chunk.splitAt` plus `HashMap.removeMany`, no unreachable branch; FIFO order and capacity validation (negative, `NaN`, fractional, `0`) unchanged | unit | quick run command (2 files, 60 passed): `DecisionCache.test.ts` "evicts the oldest completed entry once exceeded, insertion order (FIFO)", the capacity validation tests and "capacity: 0 is a legal, degenerate cache that retains nothing" | ✅ | ✅ green |
| MUTE-02 | Claim result dispatched through a closed arm table; every tag mutant killed; no `switch`; hit check stays in the one synchronous claim step | unit + gate | quick run command (race test shown RED with the hit check split, `67-RED-EVIDENCE.md`); `node scripts/check-house-style.mjs < /dev/null` (560 files clean, 3 declared switches); `67-DISPATCH.md` and `67-BENCH.md` hold the form's measurement | ✅ | ✅ green |
| MUTE-03 | Race test iterates until both orderings are seen at every budget, cap 512, margin 3, no number tied to `walk` | unit | `pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts -t "a joiner racing its owner" < /dev/null` (in the quick run); RED on the base with the hit check split: `kWalks: 2` at budgets 3, 4, 6 (`67-RED-EVIDENCE.md`) | ✅ | ✅ green |
| MUTE-04 | Stryker scores of `DecisionCache.ts`, `SharedComputation.ts`, `Lifecycle.ts` do not fall below Phase 61's; both named survivors gone | mutation, recorded + scorer | `node .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs --self-test < /dev/null` (17 passed) and `... compare < /dev/null` (exit 0: `DecisionCache.ts` 42/43 to 38/38, `Lifecycle.ts` 42/42, `SharedComputation.ts` 70/71 to 71/71, 0 new ignored). Stryker not re-run; records are `67-mutation-{base,close,static}.json` | ✅ | ✅ green |
| WX-01 | Merge gate green | full | `pnpm check:pr < /dev/null`, recorded green on the final run on `cd7cd3a1` (not re-run here) | n/a | ✅ green |
| WX-02/03 | Reserved ids only (CCR-QD-458, BEH-QD-166 amended, INV-QD-379; ADR named Unused); traced; overview names every export (no export added, `Claim`, `ClaimArm`, `Restore` module-private) | spec gates | `bash spec/scripts/verify-traceability.sh --strict` (PASS 21, FAIL 0); `node scripts/check-api-surface.mjs` (939 exports); `node scripts/spec-revise.mjs --check` (clean) | n/a | ✅ green |
| WX-04 | No forbidden construct in the diff | lint | `node scripts/check-house-style.mjs < /dev/null` (560 files clean, 3 declared switches, 66 type-test files) | n/a | ✅ green |
| WX-05 | Stryker score of touched files holds; coverage holds | mutation, recorded + full | `67-mutation.mjs compare` (above); coverage thresholds run inside `pnpm check:pr`, recorded green | n/a | ✅ green |
| WX-07 | No plan, phase or requirement id in source or test titles | gate | `node scripts/check-house-style.mjs < /dev/null` (placeholder-id rule); greps recorded in `67-VERIFICATION.md` WX-07 | n/a | ✅ green |

*Status: ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The RED race test on the phase base is the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RED evidence recorded before the behaviour change | WX-06 | No command shows order of work | Cited evidence: `67-RED-EVIDENCE.md` (race test committed `2b01cfa2` and shown RED before the source change); `67-VERIFICATION.md` WX-06 row |
| Prose in comments, BEH-QD-166 and INV-QD-379 states only what the code and measurements hold | MUTE-01/02 (text) | No command parses sentence meaning | Cited evidence: `67-VERIFICATION.md` Truth 5 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-22

## Validation Audit 2026-11-22

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
