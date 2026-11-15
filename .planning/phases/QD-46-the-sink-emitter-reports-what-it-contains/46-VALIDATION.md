---
phase: "46"
slug: "the-sink-emitter-reports-what-it-contains"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-15"
---

# Phase 46 — Validation Strategy

> The validation contract for feedback sampling during this phase's execution. Seeded from `46-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 (`@effect/vitest` 4.1.2), projects `core` and `audit`; tstyche for type pins; Stryker (`stryker.config.mjs` for core, `stryker.audit.mjs` for audit, each with `--mutate`) for the per-file comparison |
| **Config file** | root `vitest.config.ts`, `packages/core/vitest.config.ts`, `packages/audit/vitest.config.ts`, `tstyche.json`, `stryker.config.mjs`, `stryker.audit.mjs` |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/SinkEmitReport.test.ts packages/core/test/DecisionSink.test.ts packages/core/test/DecisionSinkForwarding.test.ts packages/core/test/DecisionLog.test.ts`. Run it from the repo root, never from `packages/core`. |
| **Full suite command** | `pnpm check:pr < /dev/null` (all of `pnpm check` except `pnpm mutation`); fast loop `pnpm check:fast` |
| **Estimated runtime** | quick about 5 s; the core project about 20 s; `check:fast` about 2 minutes; `check:pr` about 5 minutes |

---

## Sampling Rate

- **After every task commit:** the quick run command, plus `pnpm typecheck` after any `src` edit.
- **After the emitter edit:** `pnpm exec vitest run --project core`.
- **After every plan wave:** `pnpm check:fast`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, and the Stryker comparison against `46-mutation-base.json` exits 0.
- **Max feedback latency:** 60 seconds.
- Until its fixing task, a task's verify leaves the not-yet-fixed RED file out, naming it by exact path.

---

## Per-Task Verification Map

Each plan fills in its own tasks; the requirement map below is the contract.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| EMIT-01 | One warning with the fixed text and annotations `qadi.sink`, `qadi.record_tag`, `evaluationId` and `qadi.cause`, through `evaluate`, for each of die, throw, self-interrupt and the named type escape; plus an `Obligations` record through `enforce`; named and unnamed sinks | `it.effect` table | `pnpm exec vitest run --project core packages/core/test/SinkEmitReport.test.ts` | ❌ W0 (RED on base) | ⬜ pending |
| EMIT-02 | The decision is unchanged (equal to the no-sink baseline); a throwing logger still leaves the decision unchanged (D-04) | `it.effect` | same file | ❌ W0 (decision half green, warning half RED) | ⬜ pending |
| EMIT-03 | Forwarding's outer catch is removed and a throwing `onFailure` gives one warning; `decisionSinkAll`'s member warning names the member; the `isolate` halves are pinned; each shipped sink has a `name`; no failure is reported twice | `it.effect` | `pnpm exec vitest run --project core packages/core/test/DecisionSinkForwarding.test.ts packages/core/test/DecisionLog.test.ts packages/core/test/DecisionSink.test.ts` and `pnpm exec vitest run --project audit` | ❌ W0 (characterisation green, names RED) | ⬜ pending |
| EMIT-04 | One read of the sink per evaluation; `DecisionSinkShape["name"]` is optional `string \| undefined`; INV-QD-035 restated | lint + tstyche + spec | `pnpm lint` (`[sink-read-once]`); `pnpm test:tstyche`; `pnpm spec:verify:strict` | ✅ | ⬜ pending |
| WX-01 | The merge gate | full | `pnpm check:pr < /dev/null` | ✅ | ⬜ pending |
| WX-02 | Only reserved ids are used (ARCH-93, ADR-QD-159, CCR-QD-437, BEH-QD-566..570, INV-QD-337..338) | git grep | no `-QD-NEXT` placeholder under `packages` or `spec` | ✅ | ⬜ pending |
| WX-03 | The overview is unaffected (no export added) | gate 13 | `pnpm spec:api` | ✅ | ⬜ pending |
| WX-04 | Nothing forbidden is added, and the budgets are unchanged | lint + scan | `pnpm lint`; `git diff <base> -- scripts/check-house-style.mjs` empty | ✅ | ⬜ pending |
| WX-05 | Coverage holds, and no touched file's Stryker score drops | coverage + mutation | `pnpm coverage`; the two `--mutate` runs, then the comparer against `46-mutation-base.json` | ❌ W0 base | ⬜ pending |
| WX-06 | Tests come before the change | git order | the base JSON, the classification table and the RED tests precede the first `packages/*/src` edit | n/a | ⬜ pending |
| WX-07 | The changes are recorded (not Breaking) | file | `.changeset/*.md` with `"@qadi/core": minor` and `"@qadi/audit": patch` | ❌ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `46-mutation-base.json`: the base scores for `SinkEmit.ts`, `DecisionSinkForwarding.ts`, `DecisionLog.ts` and `AuditDecisionSinkLive.ts`, from the two Stryker runs, committed alone as the phase's first commit
- [ ] the per-warning classification table (W0..W10), committed with the RED tests (D-12)
- [ ] `packages/core/test/SinkEmitReport.test.ts`: the EMIT-01/02 tables, RED on the base, with the RED output in the SUMMARY
- [ ] characterisation and pin tests in `DecisionSinkForwarding.test.ts` and `DecisionLog.test.ts`
- [ ] the tstyche pin for `DecisionSinkShape["name"]`

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
