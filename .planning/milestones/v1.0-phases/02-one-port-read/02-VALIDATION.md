---
phase: "02"
slug: "one-port-read"
status: draft
nyquist_compliant: false
wave_0_complete: true
created: "2026-11-08"
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest` (root `vitest.config.ts`, projects `packages/*`); tstyche for `*.tst.ts` |
| **Config file** | `vitest.config.ts` (root, coverage thresholds), `packages/core/vitest.config.ts` (project `core`) |
| **Quick run command** | `pnpm vitest run --project core` |
| **Wave run command** | `pnpm vitest run --project core --project http --project devtools --project audit && pnpm typecheck` |
| **Full suite command** | `pnpm check:pr` |
| **Estimated runtime** | quick about 3 s (1832 tests at HEAD); wave about 5 s plus typecheck; full is minutes (coverage, BDD, website build) |

---

## Sampling Rate

- **After every task commit:** run `pnpm vitest run --project core`, plus the task's grep gates.
- **After every plan wave:** run the wave command above, plus `node scripts/check-house-style.mjs` and `pnpm circular`.
- **Before `/gsd-verify-work`:** `pnpm check:pr` must be green (plan 02-04, Task 3).
- **Max feedback latency:** 10 seconds for the quick run.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | PORT-01, PORT-03, PORT-04, PORT-05 | T-02-01, T-02-02 | No attribute value reaches a span; a served store that throws becomes the port's typed error | unit (tracer, e2e of local vs served) | `pnpm vitest run --project core && pnpm typecheck && pnpm test:tstyche && node scripts/check-house-style.mjs && pnpm circular` | ✅ (PortAccess.test.ts exists) | ⬜ pending |
| 02-01-02 | 01 | 1 | PORT-03, PORT-05, PORT-06, XC-04 | T-02-03, T-02-04 | A missing resource id still names its question, fails `MissingResourceId` and counts nothing; local and served spans are equal for every port | unit (per-port table) | `pnpm vitest run --project core --project http --project devtools --project audit && pnpm typecheck && node scripts/check-house-style.mjs` | ✅ | ⬜ pending |
| 02-02-01 | 02 | 2 | PORT-04 | T-02-05, T-02-06, T-02-07 | The requirement crosses strictly decoded; a throwing store is `Unavailable` | unit + in-process e2e (askRemotely to answerRemotely) | `pnpm vitest run --project core --project http --project devtools --project audit && pnpm typecheck && node scripts/check-house-style.mjs` | ✅ (PortRemote/PortConformance/PortServe tests exist) | ⬜ pending |
| 02-02-02 | 02 | 2 | PORT-01, PORT-02 | T-02-08 | The JSON wire encode/decode is unchanged | unit + grep gate (0 of 28 baseline lines) | `pnpm vitest run --project core --project http --project devtools --project audit && pnpm typecheck && pnpm test:tstyche && pnpm circular` | ✅ | ⬜ pending |
| 02-03-01 | 03 | 2 | XC-02 | T-02-09 | N/A (record) | doc gate | `node scripts/spec-revise.mjs --check` plus the ADR file and index grep | ❌ new ADR file (created by the task) | ⬜ pending |
| 02-03-02 | 03 | 2 | XC-02 | T-02-09 | N/A (record) | doc gate | `node scripts/spec-revise.mjs --check` plus the amendment grep | ✅ | ⬜ pending |
| 02-03-03 | 03 | 2 | XC-02, PORT-04 | T-02-09, T-02-10 | N/A (record) | doc gate | `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict` | ✅ | ⬜ pending |
| 02-04-01 | 04 | 3 | XC-02, XC-03 | T-02-12 | N/A (record) | gate 13 | `pnpm spec:api && node scripts/spec-revise.mjs --check` | ✅ | ⬜ pending |
| 02-04-02 | 04 | 3 | XC-02 | T-02-11 | The changeset states the true breaking scope and the skew | doc gate | `pnpm spec:website-examples` plus the changeset grep | ❌ new changeset (created by the task) | ⬜ pending |
| 02-04-03 | 04 | 3 | XC-01, XC-05 | T-02-13 | Fail-closed holds across the whole suite; coverage holds (core 95%, others 90%) | full merge gate | `pnpm check:pr` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements: vitest projects, `collectingTracer`/`isolatedMetrics` in `packages/core/test/helpers.ts`, `scriptedPort`/`PortReply`, and the spec gates. No test file has to be scaffolded before Wave 1. Plan 02-01's tracer writes its failing tests first, inside the task (RED, then GREEN).

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
