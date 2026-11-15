---
phase: "45"
slug: "the-audit-circuit-breaker-as-one-transition-function"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-15"
---

# Phase 45 — Validation Strategy

> The per-phase validation contract for feedback sampling during execution. Seeded from `45-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 (`@effect/vitest` 4.1.2, `fast-check` 4.10.2), project `audit`; tstyche for type pins; Stryker (`stryker.audit.mjs` with `--mutate`) for the per-file comparison |
| **Config file** | root `vitest.config.ts`, `packages/audit/vitest.config.ts`, `tstyche.json`, `stryker.audit.mjs` |
| **Quick run command** | `pnpm exec vitest run --project audit packages/audit/test/CircuitBreaker.test.ts packages/audit/test/CircuitBreakerTable.test.ts packages/audit/test/CircuitBreakerTransition.test.ts packages/audit/test/CircuitBreakerOptions.test.ts` (from the repo root, never from `packages/audit`) |
| **Full suite command** | `pnpm check:pr < /dev/null` (all of `pnpm check` but `pnpm mutation`); fast loop `pnpm check:fast` |
| **Estimated runtime** | quick about 5 s; the audit project about 2 s; `check:fast` about 2 minutes; `check:pr` about 5 minutes |

---

## Sampling Rate

- **After every task commit:** the quick run command, plus `pnpm typecheck` after any `src` edit (it compiles `tsconfig.test.json`, where `driveExit.ts` and `Agreement.test.ts` meet the new layer type), and `pnpm circular` once new modules exist.
- **After every converted event:** `pnpm exec vitest run --project audit`.
- **After every plan wave:** `pnpm check:fast`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, and the Stryker comparer against `45-mutation-base.json` exits 0.
- **Max feedback latency:** 60 seconds.
- A task whose verify would run the not-yet-fixed `CircuitBreakerOptions.test.ts` excludes it by exact file path until the fixing task.

---

## Per-Task Verification Map

Filled per plan by the planner; the requirement map below is the contract.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| BRKR-01 | every generation/probe rule in one pure `step`; `generation + 1` written once | pure table + property; scoped grep | `pnpm exec vitest run --project audit packages/audit/test/CircuitBreakerTransition.test.ts`; added `generation + 1` lines under `packages/audit/src` since the base = 1 | ❌ W0 | ⬜ pending |
| BRKR-02 | one `Ref.modify` per event; hoisted matchers | adapter suite + structural scan | `pnpm exec vitest run --project audit`; `Match.value` count in `CircuitBreaker.ts` = 0; `Ref.modify` count = 1 | ✅ suite | ⬜ pending |
| BRKR-03 | bad options refused at construction, one row per value; `NaN` RED on the base | `it.effect` rows | `pnpm exec vitest run --project audit packages/audit/test/CircuitBreakerOptions.test.ts packages/audit/test/AuditSinkDeadline.test.ts` | ❌ W0 (RED on base) | ⬜ pending |
| BRKR-04 | stale generation, release stealing a newer claim, stale failure reopening a newer window, every legal transition; no fibers or clock | pure table (plain `it`) + adapter table | `CircuitBreakerTransition.test.ts`; `CircuitBreakerTable.test.ts` | ❌ W0 | ⬜ pending |
| BRKR-05 | the four regression tests unchanged and green | existing | `pnpm exec vitest run --project audit packages/audit/test/CircuitBreaker.test.ts`; `git diff <base> --stat -- packages/audit/test/CircuitBreaker.test.ts` empty | ✅ | ⬜ pending |
| WX-01 | the merge gate | full | `pnpm check:pr < /dev/null` | ✅ | ⬜ pending |
| WX-02 | only reserved ids (ARCH-92, ADR-QD-158, CCR-QD-436, BEH-QD-561..565, INV-QD-335..336) | git grep | no `-QD-NEXT` placeholder under `packages` or `spec` | ✅ | ⬜ pending |
| WX-03 | the overview names `InvalidAuditSinkOption` | gate 13 | `pnpm spec:api` | ✅ | ⬜ pending |
| WX-04 | nothing forbidden added; budgets unchanged | lint + scan | `pnpm lint`; `git diff <base> -- scripts/check-house-style.mjs` empty | ✅ | ⬜ pending |
| WX-05 | coverage holds; no per-file Stryker drop | coverage + mutation | `pnpm coverage`; `pnpm exec stryker run stryker.audit.mjs --mutate 'packages/audit/src/CircuitBreaker.ts,packages/audit/src/AuditDecisionSinkLive.ts'`, then the comparer | ❌ W0 base | ⬜ pending |
| WX-06 | tests come before the change | git order | the base JSON, the adapter table and the RED option rows precede the first `packages/audit/src` edit | n/a | ⬜ pending |
| WX-07 | Breaking recorded | file + gate | `.changeset/*.md` has `"@qadi/audit": minor` and **Breaking**; `upgrading.md` entry; `pnpm spec:website-examples` | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `45-mutation-base.json`: the base Stryker scores for `CircuitBreaker.ts` and `AuditDecisionSinkLive.ts`, committed alone
- [ ] `packages/audit/test/CircuitBreakerTable.test.ts`: the adapter-level transition table, green on the base
- [ ] `packages/audit/test/CircuitBreakerOptions.test.ts`: one row per bad value, runtime assertions only, RED on the base; RED output in the SUMMARY
- [ ] `packages/audit/test/CircuitBreakerTransition.test.ts`: the pure table and the seeded property (with `step`)

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
