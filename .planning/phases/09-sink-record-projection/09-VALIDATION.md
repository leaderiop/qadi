---
phase: "09"
slug: "sink-record-projection"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: true
created: "2026-11-08"
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest` (root `vitest.config.ts`, projects `packages/*`); tstyche for `*.tst.ts` |
| **Config file** | `vitest.config.ts` (root, coverage thresholds), `packages/core/vitest.config.ts` (project `core`) |
| **Quick run command** | `pnpm vitest run --project core` |
| **Wave run command** | `pnpm vitest run --project core --project http --project audit --project devtools && pnpm typecheck && pnpm test:tstyche && node scripts/check-house-style.mjs && pnpm circular` |
| **Full suite command** | `pnpm check:pr` (run in the background: it takes more than 10 minutes) |
| **Estimated runtime** | quick: a few seconds (`DecisionSink.test.ts` plus `EncodeRefusalReport.test.ts` ran 50 tests in 0.3 s at planning time); wave: under a minute plus typecheck; full: more than 10 minutes |

---

## Sampling Rate

- **After every task commit:** run `pnpm vitest run --project core`, plus the task's grep and diff gates.
- **After every plan wave:** run the wave command above. After wave 1, also run `pnpm spec:api`.
- **Before `/gsd-verify-work`:** `pnpm check:pr` must be green (plan 09-04, Task 2).
- **Max feedback latency:** 10 seconds for the quick run.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | SINK-01 | T-09-01, T-09-03 | The obligation record is unchanged key for key (pinned green before the move); an emit still cannot change enforcement | unit (tracer: whole-record pin plus handler-question equality) | `pnpm vitest run --project core packages/core/test/DecisionSink.test.ts packages/core/test/Qadi.test.ts packages/core/test/Lifecycle.test.ts && pnpm vitest run --project audit`, plus the `new ObligationRecord` count gate (Qadi.ts 1 → 0, SinkEmit.ts 0 → 1) | ✅ (DecisionSink.test.ts exists) | ⬜ pending |
| 09-01-02 | 01 | 1 | SINK-01, XC-04 | T-09-02 | No resource content reaches the obligation row | unit (projection table) | `pnpm vitest run --project core && pnpm typecheck && node scripts/check-house-style.mjs` | ✅ | ⬜ pending |
| 09-02-01 | 02 | 1 | SINK-02, SINK-03 | T-09-04, T-09-06 | The annotation and walk code are unchanged; the exemption follows the keys to one file | unit + grep gate (4 → 0 port-side importers) + diff against c3ce9d2 | `pnpm vitest run --project core --project http --project audit --project devtools && pnpm typecheck && node scripts/check-house-style.mjs && pnpm circular` | ❌ new `JsonRefusal.ts` (created by the task) | ⬜ pending |
| 09-02-02 | 02 | 1 | SINK-02 | T-09-05 | `describeEncodeRefusal`'s sentences are unchanged; the test's diff touches import lines only | unit + tstyche + diff gate | `pnpm vitest run --project core packages/core/test/EncodeRefusalReport.test.ts packages/core/test/SinkCodec.test.ts packages/core/test/SinkCodecAgreement.test.ts packages/core/test/Errors.test.ts && pnpm test:tstyche && pnpm typecheck` | ✅ | ⬜ pending |
| 09-02-03 | 02 | 1 | SINK-02, SINK-03, XC-03 | T-09-07 | Every moved name is still exported from `@qadi/core`'s root | gate 13 + grep (8 → 3 importers) | `pnpm vitest run --project core --project http --project audit --project devtools && pnpm typecheck && pnpm test:tstyche && node scripts/check-house-style.mjs && pnpm circular && pnpm spec:api` | ✅ | ⬜ pending |
| 09-03-01 | 03 | 2 | XC-02 | T-09-08 | N/A (record) | doc gate | the CCR row, ADR file and index grep, then `node scripts/spec-revise.mjs --check` | ❌ new ADR file (created by the task) | ⬜ pending |
| 09-03-02 | 03 | 2 | XC-02 | T-09-08 | N/A (record) | doc gate | section-scoped awk greps, then `node scripts/spec-revise.mjs --check` | ✅ | ⬜ pending |
| 09-03-03 | 03 | 2 | XC-02 | T-09-08, T-09-09 | N/A (record) | doc gate | `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict` | ✅ | ⬜ pending |
| 09-04-01 | 04 | 3 | XC-02, XC-03 | T-09-10, T-09-11 | The changeset's "no export changed" claim is checked by gate 13 | gate 13 + doc gates | `pnpm spec:api && node scripts/spec-revise.mjs --check && pnpm spec:verify:strict` | ❌ new changeset (created by the task) | ⬜ pending |
| 09-04-02 | 04 | 3 | XC-01, XC-05 | T-09-12 | Fail-closed holds across the whole suite; coverage holds (core 95%, others 90%) | full merge gate | `pnpm check:pr` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers every phase requirement: the vitest projects, `DecisionSink.test.ts`'s `collecting()` sink, `testLayer`/`subjectWith` in `packages/core/test/helpers.ts` (sequential ids, `TestClock` at 0), `EncodeRefusalReport.test.ts`'s per-variant sentence table, and the spec gates. No test file needs scaffolding before Wave 1. Plan 09-01's tracer writes its characterization pin first, green on the unmodified tree (D-03), and its equality case fails to compile until `obligationRecord` exists.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags (`vitest run`, never `vitest` alone)
- [x] Feedback latency < 10 s for the quick run
- [ ] `nyquist_compliant: true` set in frontmatter (set by `/gsd-validate-phase` after execution)

**Approval:** pending
