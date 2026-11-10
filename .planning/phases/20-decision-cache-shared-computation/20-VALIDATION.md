---
phase: "20"
slug: "decision-cache-shared-computation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-10"
---

# Phase 20 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest`; vitest bench for `packages/core/bench` |
| **Config file** | `vitest.config.ts` (project `core`); `packages/core/vitest.config.ts` (95% coverage, `benchmark.include: bench/**/*.bench.ts`) |
| **Quick run command** | `pnpm vitest run --project core packages/core/test/DecisionCache.test.ts -t "uninterruptible regime"` |
| **Bench command** | `pnpm bench --project core packages/core/bench/DecisionCache.bench.ts` (three runs per side, medians) |
| **Full suite command** | `pnpm check:pr` (background; well over 10 minutes) |
| **Estimated runtime** | not measured at planning time |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` commands.
- **Between 20-01 and 20-03:** the core project runs with `-t "^(?!.*uninterruptible regime)"`, because 20-01's test is intentionally RED until 20-03; 20-02 also asserts it is still RED (behaviour-preserving extraction).
- **After 20-03:** `pnpm vitest run --project core` with no exclusion.
- **Before verify-work:** `pnpm check:pr` green (20-04 Task 3).
- **Max feedback latency:** under 60 s per test task; bench tasks take about 30 s per run.

---

## Gate

`20-01-SUMMARY.md`'s `repro_outcome` decides the phase. `not-reproduced` (with `d01_final: stopped`, after A or a B whose variant also failed) skips 20-02 and 20-03 (their SUMMARYs say `skipped: not-reproduced`); 20-01 has then committed the uninterruptible-regime pin(s) green and rewritten the "open gap" comment in `DecisionCache.ts`, and 20-04 records the finding.

All shell checks run under `bash -c` or call `/usr/bin/grep` (the executor's `grep` is a ugrep alias). Preconditions check prior phases' SUMMARY files. The phase base is `phase_base` in `20-01-SUMMARY.md` (the parent of the phase's first commit).

**Mutation (XC-05):** `20-mutation-base.json` (20-01 Task 1, `DecisionCache.ts`) is compared per file in 20-04 Task 3; the new `SharedComputation.ts` must reach the core config's break threshold (80%).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | CACHE-01, XC-06 | T-20-01, T-20-03 | A never-cancelled joiner gets an answer (RED expected) | integration (RED) | `! pnpm vitest run --project core …DecisionCache.test.ts -t "uninterruptible regime"`; `repro_outcome` grep | ✅ | ⬜ pending |
| 20-01-02 | 01 | 1 | CACHE-01 | T-20-02 | A human decides only if not reproduced; a stop leaves green pins and a corrected comment | manual decision | `d01_outcome`/`d01_final` greps, pins green, comment phrase gone (conditional) | n/a | ⬜ pending |
| 20-02-01 | 02 | 2 | CACHE-04 | T-20-07 | Baseline measured | bench | `grep 'Bench before'` | ✅ | ⬜ pending |
| 20-02-02 | 02 | 2 | CACHE-02, XC-06 | T-20-04, T-20-06 | Regime with plain keys (RED then GREEN) | unit | `pnpm vitest run --project core …SharedComputation.test.ts && pnpm exec tsc -b packages/core` | ❌ W0 → created in-task | ⬜ pending |
| 20-02-03 | 02 | 2 | CACHE-02, CACHE-04 | T-20-04, T-20-05, T-20-07 | Delegation preserves behaviour; 20-01 still RED; no test line deleted | integration + bench | core minus the RED test; `! … -t "uninterruptible regime"`; numstat deletions 0; lint, circular | ✅ | ⬜ pending |
| 20-03-01 | 03 | 3 | CACHE-03, XC-06 | T-20-08, T-20-09 | Seam RED for joining an abandoned compute | unit (RED) | `! pnpm vitest run --project core …SharedComputation.test.ts -t "abandon"` | ✅ | ⬜ pending |
| 20-03-02 | 03 | 3 | CACHE-03, CACHE-04 | T-20-08, T-20-09, T-20-10 | Abandon-on-last-leave; every test green | unit + integration + bench | `pnpm vitest run --project core && pnpm typecheck && pnpm lint && pnpm circular`; numstat deletions 0 | ✅ | ⬜ pending |
| 20-04-01 | 04 | 4 | CACHE-01, XC-02 | T-20-12 | Regime stated on the branch taken | doc gate | `spec-revise --check && pnpm spec:verify:strict && pnpm spec:examples` | ✅ | ⬜ pending |
| 20-04-02 | 04 | 4 | XC-02 | T-20-11 | Change recorded; changeset iff shipped behaviour changed | doc gate | CCR row count; conditional changeset check | ✅ | ⬜ pending |
| 20-04-03 | 04 | 4 | XC-01, XC-03, XC-04, XC-05 | T-20-13 | Merge gate unmodified and green | full gate | `pnpm check:pr` (background); per-file mutation comparison | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None blocking. `SharedComputation.test.ts` is created by the task that needs it. Nothing to install.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Decide the phase's fate if the gap does not reproduce | CACHE-01 | D-01 makes it a human decision | Read 20-01 Task 2 and reply `A` or `B: <regime>` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are the one conditional checkpoint
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per test task
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
