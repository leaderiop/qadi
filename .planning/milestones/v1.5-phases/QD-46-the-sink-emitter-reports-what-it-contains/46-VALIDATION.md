---
phase: "46"
slug: "the-sink-emitter-reports-what-it-contains"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: true) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
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

Plans: 46-01 (WX-05/WX-06 base evidence, EMIT-01/02 RED), 46-02 (EMIT-03 characterisation + RED, classification W0..W10), 46-03 (EMIT-01/02/04 emitter), 46-04 (EMIT-03 shipped sinks), 46-05 (WX-02/03/07 records), 46-06 (EMIT-04 spec, WX-02), 46-07 (WX-01/04/05/06 close). Re-run 2026-11-15 at 95551d93: core 6 files 143/143 (SinkEmitReport, ShippedSinkReports, DecisionSink, DecisionSinkForwarding, DecisionLog, EvaluationEnvironment); audit `AuditDecisionSinkLive.test.ts` 35/35; tstyche `DecisionSink.tst.ts` 5/5 (9 assertions); no `-QD-NEXT` under `packages`; `check-house-style.mjs` unchanged since `76e589e0`; both changesets present; the base JSON is the first phase commit and the RED tests precede `2efb6f47`, the first src commit. 46-07 recorded `pnpm check:pr < /dev/null` exit 0 at 61abad3f and Stryker after ≥ base for all five files (DecisionLog 0.9275→0.9857, DecisionSinkForwarding 0.8065→0.9118, the other three 1). The characterisation rows live in `packages/core/test/ShippedSinkReports.test.ts` (C1..C4), not in `DecisionSinkForwarding.test.ts`/`DecisionLog.test.ts` as first sketched.

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| EMIT-01 | One warning with the fixed text and annotations `qadi.sink`, `qadi.record_tag`, `evaluationId` and `qadi.cause`, through `evaluate`, for each of die, throw, self-interrupt and the named type escape; plus an `Obligations` record through `enforce`; named and unnamed sinks | `it.effect` table | `pnpm exec vitest run --project core packages/core/test/SinkEmitReport.test.ts` | ✅ | ✅ green |
| EMIT-02 | The decision is unchanged (equal to the no-sink baseline); a throwing logger still leaves the decision unchanged (D-04) | `it.effect` | same file | ✅ | ✅ green |
| EMIT-03 | Forwarding's outer catch is removed and a throwing `onFailure` gives one warning; `decisionSinkAll`'s member warning names the member; the `isolate` halves are pinned; each shipped sink has a `name`; no failure is reported twice | `it.effect` | `pnpm exec vitest run --project core packages/core/test/ShippedSinkReports.test.ts packages/core/test/DecisionSinkForwarding.test.ts packages/core/test/DecisionLog.test.ts packages/core/test/DecisionSink.test.ts` and `pnpm exec vitest run --project audit` | ✅ | ✅ green |
| EMIT-04 | One read of the sink per evaluation; `DecisionSinkShape["name"]` is optional `string \| undefined`; INV-QD-035 restated | lint + tstyche + spec | `pnpm lint` (`[sink-read-once]`); `pnpm test:tstyche`; `pnpm spec:verify:strict` | ✅ | ✅ green |
| WX-01 | The merge gate | full | `pnpm check:pr < /dev/null` | ✅ | ✅ green |
| WX-02 | Only reserved ids are used (ARCH-93, ADR-QD-159, CCR-QD-437, BEH-QD-566..570, INV-QD-337..338) | git grep | no `-QD-NEXT` placeholder under `packages` or `spec` | ✅ | ✅ green |
| WX-03 | The overview is unaffected (no export added) | gate 13 | `pnpm spec:api` | ✅ | ✅ green |
| WX-04 | Nothing forbidden is added, and the budgets are unchanged | lint + scan | `pnpm lint`; `git diff <base> -- scripts/check-house-style.mjs` empty | ✅ | ✅ green |
| WX-05 | Coverage holds, and no touched file's Stryker score drops | coverage + mutation | `pnpm coverage`; the two `--mutate` runs, then the comparer against `46-mutation-base.json` | ✅ | ✅ green |
| WX-06 | Tests come before the change | git order | the base JSON, the classification table and the RED tests precede the first `packages/*/src` edit | n/a | ✅ green |
| WX-07 | The changes are recorded (not Breaking) | file | `.changeset/*.md` with `"@qadi/core": minor` and `"@qadi/audit": patch` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `46-mutation-base.json`: the base scores for `SinkEmit.ts`, `DecisionSinkForwarding.ts`, `DecisionLog.ts` and `AuditDecisionSinkLive.ts`, from the two Stryker runs, committed alone as the phase's first commit
- [x] the per-warning classification table (W0..W10), committed with the RED tests (D-12)
- [x] `packages/core/test/SinkEmitReport.test.ts`: the EMIT-01/02 tables, RED on the base, with the RED output in the SUMMARY
- [x] characterisation and pin tests (landed in `ShippedSinkReports.test.ts` C1..C4 and N/A/F rows)
- [x] the tstyche pin for `DecisionSinkShape["name"]`

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-15

## Validation Audit 2026-11-15

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
