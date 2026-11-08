---
phase: "06"
slug: "dehydration-in-engine"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-08"
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 (`happy-dom` environment for `@qadi/react`) with `@effect/vitest`; tstyche 7 for type-level pins |
| **Config file** | `vitest.config.ts` (projects `packages/*`), `packages/react/vitest.config.ts`; tstyche reads `*.tst.ts` |
| **Quick run command** | `pnpm vitest run --project react packages/react/test/HydrationPayload.test.ts packages/react/test/HydrationEngine.test.ts` (2 files and 41 tests at HEAD, about 0.5 s) |
| **Full suite command** | `pnpm check:pr` (the merge gate without mutation) |
| **Estimated runtime** | quick: about 1 s. Whole react project: about 2 s (20 files, 344 tests at HEAD). `pnpm check:pr`: more than 10 minutes, run in the background |

---

## Sampling Rate

- **After every task commit:** run the task's `<automated>` command. Every code task includes the hydration suites, `pnpm typecheck` and `pnpm spec:api`; Task 06-01-02 adds `pnpm lint` and `pnpm circular`.
- **After every plan wave:** `pnpm vitest run --project react && pnpm tstyche packages/react/test/Hydration.tst.ts && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api && pnpm spec:verify:strict`.
- **Before `/gsd-verify-work`:** `pnpm check:pr` must be green (plan 06-02, Task 3).
- **Max feedback latency:** about 10 s for the per-task commands, except 06-02 Task 3 (`pnpm check:pr`).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | HYD-01, HYD-02, HYD-04 | T-06-01, T-06-02, T-06-03 | The foreign entry never reaches the payload or a seed. The trace is withheld by default. The ForeignSubject count and the one report survive the move. The bytes and signature are pinned before any source edit | golden + type pin + round trip (tracer) | `pnpm vitest run --project react packages/react/test/HydrationPayload.test.ts packages/react/test/HydrationEngine.test.ts packages/react/test/HydrationCounts.test.ts packages/react/test/Hydration.test.ts packages/react/test/DeveloperSignals.test.ts && pnpm tstyche packages/react/test/Hydration.tst.ts` plus the grep gates and `pnpm typecheck && pnpm spec:api` | ✅ (tests extended) | ✅ green |
| 06-01-02 | 01 | 1 | HYD-02, HYD-03, XC-03, XC-04 | T-06-01, T-06-05 | The payload builders are reachable only through `dehydrateWith`. Nothing new is exported from `@qadi/react` | unit + gate | `pnpm vitest run --project react && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api` plus the grep gates | ✅ | ✅ green |
| 06-02-01 | 02 | 2 | XC-02 | T-06-06 | Spec wording keeps subject binding, withholding and the count-only default warning | doc gate | `node scripts/spec-revise.mjs --check` plus the grep gates | ✅ | ✅ green |
| 06-02-02 | 02 | 2 | XC-02 | T-06-07 | Registries, links, test paths, CCRs and revisions agree | doc gate | `pnpm spec:verify:strict` | ✅ | ✅ green |
| 06-02-03 | 02 | 2 | XC-01, XC-04, XC-05 | all | The whole merge gate minus mutation, including the newsroom example and the hydration BDD feature | gate | `pnpm check:pr` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements: vitest, `@effect/vitest`, `happy-dom` and tstyche are installed and configured. D-04's pins come first, inside the wave-1 tracer (06-01 Task 1, Step A), committed on their own against unmodified `packages/react/src` before any source change. No Stryker config mutates `Hydration.ts` or `HydrationEngine.ts` (`stryker.react.mjs` mutates `DecisionOutcome.ts` and `QuestionBook.ts` only), so no mutation baseline is needed.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags
- [x] Feedback latency under 10 s for per-task checks (except `pnpm check:pr`, by nature)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-08 (validate-phase). 06-02-03 note: on this host `pnpm check:pr` stopped at `pnpm example`'s `playwright install --with-deps` (sudo needs a terminal). Every remaining step passed when run by hand: e2e 30/30, spec:website-examples, website, spec:publish. Re-run the literal gate on a host with the Playwright system deps installed.

## Validation Audit 2026-11-08

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
