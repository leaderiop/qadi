---
phase: "QD-87"
slug: "one-scoped-run-that-states-its-stop"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-25"
---

# Phase QD-87 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Built from `87-RESEARCH.md` §Validation
> Architecture; the planner fills the per-task map from the plans.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 (project `devtools`, happy-dom, `@effect/vitest`), fast-check, tstyche, Stryker 10.1.1 over `src/model/**` |
| **Config file** | `vitest.config.ts`, `packages/devtools/vitest.config.ts`, `stryker.devtools.mjs` |
| **Quick run command** | `bash -c 'pnpm exec vitest run --project devtools <file> < /dev/null'` |
| **Full suite command** | `bash -c 'pnpm exec vitest run --project devtools < /dev/null'` (97 files, 2002 tests on the base) |
| **Phase gate** | `pnpm check:pr < /dev/null`, `pnpm spec:package < /dev/null`, `87-mutation.mjs compare` |
| **Estimated runtime** | ~17 s (devtools suite); ~215 s (scoped Stryker run) |

---

## Sampling Rate

- **After every task commit:** the one to three vitest files the task touches, plus the matching `87-check.mjs` mode
- **After every plan wave:** the full devtools suite, `pnpm test:tstyche`, `87-pinned-check.mjs`, `pnpm circular`, `node scripts/check-house-style.mjs`
- **Before `/gsd-verify-work`:** `pnpm check:pr` and `pnpm spec:package` green; mutation `compare` green
- **Max feedback latency:** 30 seconds per task (the scoped Stryker run is a plan-level step, not a per-task one)

---

## Requirement → Test Map (from research; task ids filled by the planner)

| Requirement | Behavior | Test Type | File | Base |
|-------------|----------|-----------|------|------|
| STOP-01 | session dies in its ports layer: `Broke.message` is `causeMessage`'s (`Error: the layer exploded`, not `Cause([Die(...)])`); hostile die gives the placeholder | unit | `test/model/SimulationSession.stop.test.ts` (new) | RED |
| STOP-01 | each feed's status tape and today's self-interrupt; D-17 throw plus superseding command | characterisation | `test/model/StatedRun.characterisation.test.ts` (new) | green |
| STOP-02 | the module: publish-then-fork, rethrow once by identity, token-guarded sink, closed guard, stop, stale run states nothing, model property | unit + property | `test/model/StatedRun.test.ts` (new) | new module |
| STOP-03 | the prologue: closed first, refused capacity throws before anything moves, identity gate, `held` before steps, nested configure, gates' failed-watch exception | unit + held | `test/model/ConfigurePrologue.test.ts` (new); held `ConfigureRule.test.ts`, `GatesFeed.test.ts` | new module |
| STOP-04 | timeline / diagnostics self-interrupt reads `Stopped`; every outside interruption never does; session `Ran` survives a throwing `Ran` listener; SR1 | unit | `test/model/TimelineFeed.stop.test.ts`, `test/model/DiagnosticsFeed.stop.test.ts` (new); held `SimulationSession.runs.test.ts` | RED / green |
| STOP-05 | Simulator `Broke` is a labelled, focusable `<pre>` with `StoppedBox`'s reason style; `StoppedBox` byte-identical | component | `test/react/Simulator.broke.test.tsx` (new) | RED / green |
| WX-01..07 | gate, ids, changesets, forbidden forms, coverage and mutation, seen-failing, no release | script + gate | `87-check.mjs`, `87-pinned-check.mjs`, `87-mutation.mjs`, `87-earlier-checks.mjs` | Wave 0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `87-check.mjs`, `87-pinned-check.mjs`, `87-mutation.mjs`, `87-earlier-checks.mjs`, each with a self-test and each mode seen failing once
- [ ] `87-mutation-base.json` on a clean tree before any edit (scoped `stryker.devtools.mjs` over the five touched model files)
- [ ] `87-RED-EVIDENCE.md` with each RED row's base failing text and one scratch variant per new check
- [ ] the new test files written on the base before any `src` edit

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s per task
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
