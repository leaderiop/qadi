---
phase: "37"
slug: "a-scoped-run-that-a-newer-run-supersedes"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-14"
---

# Phase 37 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `37-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 + `@effect/vitest` 4.1.2 (`it.effect`, `TestClock`), happy-dom; fast-check 4.10.2 for the property |
| **Config file** | `packages/devtools/vitest.config.ts` (project `devtools`); root `vitest.config.ts` holds coverage thresholds |
| **Quick run command** | `pnpm exec vitest run --project devtools packages/devtools/test/model/SupersedingRun.test.ts` |
| **Full suite command** | `pnpm exec vitest run --project devtools` (then `pnpm check:pr < /dev/null` at the phase gate) |
| **Estimated runtime** | ~12 seconds (devtools project); `check:pr` several minutes |

---

## Sampling Rate

- **After every task commit:** the module test file or the one store test file touched, plus `pnpm typecheck` when source is edited
- **After every plan wave:** `pnpm exec vitest run --project devtools` and `pnpm lint:style`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, mutation compare green, scoped negative greps empty
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| RUN-01 | module owns the protocol; two-step `begin`/`fork` | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/SupersedingRun.test.ts` | ❌ W0 | ⬜ pending |
| RUN-02 | stores declare no `let generation`, `let closed`, `FiberHandle.make`/`.runtime` | grep (added lines) | `git diff <phase-base> -U0 -- packages/devtools/src/model \| /usr/bin/grep '^+' \| /usr/bin/grep -E 'let generation\|let closed\|FiberHandle\.(make\|runtime)'` empty | n/a | ⬜ pending |
| RUN-03 | supersede, close mid-run (defecting finalizer), stop in 4 states, interrupt vs failure, two instances | unit | module test file | ❌ W0 | ⬜ pending |
| RUN-04 | unconditional stop; no-run stop changes nothing, notifies nobody | unit + store pin | module test file; `SimulationSession.test.ts` | ❌ W0 | ⬜ pending |
| RUN-05 | newest run live after pre-fork (T1, T2) and in-prefix (T3, T4, T5) restarts, auto-restart on Stopped (T6) | store RED→GREEN | the three store test files | ❌ W0 (RED on base) | ⬜ pending |
| RUN-06 | root span; interruption never Stopped; session Broke on defect and self-interrupt | store (existing + new self-interrupt row) | `pnpm exec vitest run --project devtools packages/devtools/test/model/SimulationSession.test.ts` | partial | ⬜ pending |
| RUN-07 | seeded interleaving property (Phase 31 `SharedComputation.test.ts` form) | property | module test file `PROPERTY` describe | ❌ W0 | ⬜ pending |
| RUN-08 | ADR-QD-137 and AGENTS.md §10 corrected | doc gate | `node scripts/spec-revise.mjs --check`; `pnpm spec:verify:strict`; `/usr/bin/grep -n 'it.scoped' AGENTS.md` empty | n/a | ⬜ pending |
| WX-05 | store mutation scores do not fall | mutation | `pnpm exec stryker run stryker.devtools.mjs --mutate '<files>'` vs `37-mutation-base.json` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `37-mutation-base.json` — three stores measured at the base, committed alone and first
- [ ] Green-on-base characterisations: session self-interrupt reads `Broke`, timeline `["Reading","Stopped"]` ordering, session no-run stop pin
- [ ] RED store cases T1..T6 (each written in the plan that converts its store, never left RED at a plan boundary)
- [ ] `packages/devtools/test/model/SupersedingRun.test.ts` — module rows + property

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
