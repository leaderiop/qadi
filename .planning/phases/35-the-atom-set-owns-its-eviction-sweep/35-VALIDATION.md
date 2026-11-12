---
phase: "35"
slug: "the-atom-set-owns-its-eviction-sweep"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-12"
---

# Phase 35 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Drafted from `35-RESEARCH.md` § Validation Architecture before planning.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 with `@effect/vitest` (`it.effect`), React Testing Library on `happy-dom`, Playwright 1.65 (the e2e), Stryker |
| **Config file** | `packages/react/vitest.config.ts` (project `react`, setup `test/setupTests.ts`), `stryker.react.mjs`, `examples/nextjs-newsroom` Playwright config |
| **Quick run command** | `pnpm vitest run --project react packages/react/test/QuestionBook.test.ts packages/react/test/QadiAtoms.test.ts packages/react/test/v4-reactivity-smoke.test.ts packages/react/test/QadiProvider.test.tsx` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~1 second (quick run), ~3 seconds (react project), ~95 seconds (full gate, mutation skipped), plus the e2e (`pnpm build && pnpm --filter @qadi/example-nextjs build && pnpm --filter @qadi/example-nextjs test:e2e`, 30 tests) |

---

## Sampling Rate

- **After every task commit:** the quick run command, plus `pnpm typecheck && pnpm lint` on src tasks.
- **After every plan wave:** `pnpm vitest run --project react` (src waves: `pnpm build && pnpm vitest run`).
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green; the e2e recorded in `35-SPIKE.md` per candidate that passes the unit criteria, and again for the chosen mechanism.
- **Max feedback latency:** ~95 seconds.

The sweep is a discrete-event system: releases, signals, admissions, macrotask turns and a single fiber resume. A test samples between every pair of events it distinguishes, so each assertion sits at a named point:
- **Synchronously after the call returns.** This separates the dispose-then-reread window from what comes after it.
- **After one settle turn.** The release has run and the sweep has not.
- **After two or more turns.** The sweep has run. After an unmount, two or more `Effect.yieldNow` are needed; after `registry.dispose()`, one is enough.

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File Exists | Status |
|--------|----------|-----------|-------------------|-------------|--------|
| SWEEP-01 | spike evidence per candidate, each criterion, and the conclusion | process | `35-SPIKE.md` review plus the tests below | ❌ W0 | ⬜ pending |
| SWEEP-02a | dispose-reread smoke; sweep across invalidation and recompute; new pins for finalizer order and `dispose()`'s synchronous release (D-14) | unit | `pnpm vitest run --project react packages/react/test/v4-reactivity-smoke.test.ts packages/react/test/QadiAtoms.test.ts` | ✅ (pins added) | ⬜ pending |
| SWEEP-02b | the eviction suite driven by the mechanism; the book's signal seam (release to zero over capacity, admission over capacity, none at or under the bound) | graph + unit | `pnpm vitest run --project react packages/react/test/QadiAtoms.test.ts packages/react/test/QuestionBook.test.ts` | ✅ rewrite | ⬜ pending |
| SWEEP-02c | `examples/nextjs-newsroom` e2e unchanged | e2e | `pnpm build && pnpm --filter @qadi/example-nextjs build && pnpm --filter @qadi/example-nextjs test:e2e` | ✅ | ⬜ pending |
| SWEEP-02d | one sweep per pressure episode across N signals, N registries and N providers | unit + graph | `pnpm vitest run --project react packages/react/test/SweepScheduler.test.ts packages/react/test/QadiAtoms.sweep.test.ts` | ❌ W0 | ⬜ pending |
| SWEEP-02e | no second sweeper under StrictMode or across a hidden then shown Activity (provider inside the Activity) | RTL | `pnpm vitest run --project react packages/react/test/QadiProvider.sweep.test.tsx` | ❌ W0 | ⬜ pending |
| SWEEP-02f | no leaked fibers across many atom sets | unit | `pnpm vitest run --project react packages/react/test/SweepScheduler.test.ts` | ❌ W0 | ⬜ pending |
| SWEEP-03 | the bound holds with no provider (bare registry); the provider forks nothing; `sweepIntervalMillis` and `sweepEvictions` removed | graph + RTL + type | `pnpm vitest run --project react packages/react/test/QadiAtoms.sweep.test.ts packages/react/test/QadiProvider.test.tsx && pnpm typecheck` | ❌ W0 | ⬜ pending |
| SWEEP-04 | (fallback only) the no-provider and several-providers rules are pinned; the unmount pin is reconciled either way | RTL | `pnpm vitest run --project react packages/react/test/QadiProvider.test.tsx` | ✅ (characterisation first) | ⬜ pending |
| SWEEP-05 | AGENTS.md §13 and the house-rules §4 addendum; doc gates | gate | `pnpm lint && pnpm spec:gates && pnpm spec:api && pnpm spec:verify:strict` | ✅ | ⬜ pending |
| WX-05 | coverage (react at 90% or more); the mutation score of touched files does not fall | coverage + mutation | `pnpm coverage`; `pnpm exec stryker run stryker.react.mjs` (plus `--mutate packages/react/src/<file>` for unmeasured files) | ✅ | ⬜ pending |
| WX-01..07 | gate green, records, changeset with **Breaking.**, upgrade guide, reserved ids | spec + full | `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict && pnpm spec:api && pnpm spec:website-examples` and `pnpm check:pr < /dev/null` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] a settle helper (two or more `Effect.yieldNow`) for the react tests
- [ ] `packages/react/test/SweepScheduler.test.ts` (if the coalescer is extracted) for SWEEP-02d and SWEEP-02f
- [ ] `packages/react/test/QadiAtoms.sweep.test.ts` for SWEEP-02b, SWEEP-02d and SWEEP-03
- [ ] `packages/react/test/QadiProvider.sweep.test.tsx` for SWEEP-02e, with the provider inside `<Activity>`
- [ ] the characterisation commit on the phase base, before any src change (D-11)
- [ ] `35-mutation-base.json` as the first plan commit (D-17), with unmeasured files listed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Whether a sweep can evict a question whose render has not committed within one macrotask, at the bound | SWEEP-02 (research risk 5) | Only a real browser render under load shows a late commit; the e2e covers the common path | If the spike keeps the admission trigger, run the e2e and record the result in `35-SPIKE.md`; `live()` re-admission is the recovery |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
