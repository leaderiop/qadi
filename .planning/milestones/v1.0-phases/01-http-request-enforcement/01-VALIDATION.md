---
phase: "01"
slug: "http-request-enforcement"
status: draft
nyquist_compliant: true
wave_0_complete: false
created: "2026-11-08"
---

# Phase 01 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest` (runtime), tstyche 7 (type level) |
| **Config file** | `vitest.config.ts` (projects `packages/*`), `packages/http/vitest.config.ts` (project `http`), `tstyche.config.json` |
| **Quick run command** | `pnpm vitest run --project http <file>` and `pnpm exec tstyche <file.tst.ts>` |
| **Full suite command** | `pnpm check:pr` |
| **Estimated runtime** | quick: ~1-3 s per file (measured 0.4 s for AuthorizeRequest.test.ts, 2.4 s for two tstyche files); full: well over 10 minutes (example app, website build, package install) |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` command (http test file(s), tstyche file(s), `pnpm typecheck && pnpm lint && pnpm circular`, plus `pnpm spec:api` / spec gates where the task touches surface or spec).
- **After every plan wave:** `pnpm vitest run --project http && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api` (all measured at about 1 s each on the planning tree).
- **Before `/gsd-verify-work`:** `pnpm check:pr` green (Plan 05 Task 2).
- **Max feedback latency:** under 60 s for every per-task command; only Plan 05 Task 2 runs the full gate.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | ENF-02, ENF-03 | T-01-01, T-01-02, T-01-04 | Unguarded port route logs an extraction failure once and never reads the port; export set unchanged | integration (HTTP round trip) + gates | `pnpm vitest run --project http packages/http/test/PortRoutes.test.ts packages/http/test/AuthorizeRequest.test.ts packages/http/test/http.test.ts && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api` + grep gates | ✅ (test added red first in the task) | ⬜ pending |
| 01-01-02 | 01 | 1 | ENF-01, ENF-04 | T-01-03 | guardRoute's projection and logs unchanged; module types pinned | type (tstyche) + integration | `pnpm exec tstyche packages/http/test/RequestEnforcement.tst.ts packages/http/test/GuardRoute.tst.ts packages/http/test/AuthorizeRequest.tst.ts && pnpm vitest run --project http` + grep gates | ❌ W0 — created by this task (tst written first) | ⬜ pending |
| 01-02-01 | 02 | 2 | ENF-05 | T-01-05 | Registered and checked endpoint keys come from one function | integration | `pnpm vitest run --project http packages/http/test/GuardApi.test.ts packages/http/test/endpointAccess.test.ts packages/http/test/http.test.ts && pnpm exec tstyche packages/http/test/GuardApi.tst.ts` + member-key grep | ✅ | ⬜ pending |
| 01-02-02 | 02 | 2 | ENF-01, ENF-04 | T-01-06, T-01-07 | Middleware bodies stay redacted; client error typing unchanged | integration + type | `pnpm vitest run --project http packages/http/test/http.test.ts packages/http/test/RequirePermissionClient.test.ts … && pnpm exec tstyche packages/http/test/RequirePermission.tst.ts …` + grep | ✅ | ⬜ pending |
| 01-02-03 | 02 | 2 | ENF-01 | T-01-07, T-01-08 | Recheck still ends the stream on any failure with identical lines | integration + type | `pnpm vitest run --project http && pnpm exec tstyche packages/http/test/DecisionStreamRoute.tst.ts` + criterion-2 grep | ✅ | ⬜ pending |
| 01-03-01 | 03 | 3 | ENF-06 | T-01-09 | Every caller × failure: exact log lines and projected result | integration (table-driven) | `pnpm vitest run --project http packages/http/test/RequestEnforcement.test.ts && pnpm typecheck && pnpm lint` | ❌ W0 — created by this task | ⬜ pending |
| 01-03-02 | 03 | 3 | ENF-06, XC-05 | T-01-10 | No response-shape assertion lost while pruning | integration | `pnpm vitest run --project http && pnpm typecheck && pnpm lint` + kept-test presence greps | ✅ | ⬜ pending |
| 01-04-01 | 04 | 3 | XC-02 | T-01-11 | — | doc gate | file/grep checks for ADR-QD-108, index entry, ADR-036 amendment, D-01..D-09 citations | ❌ W0 — created by this task | ⬜ pending |
| 01-04-02 | 04 | 3 | XC-02 | T-01-11 | — | doc gate | greps + `pnpm spec:examples` | ✅ | ⬜ pending |
| 01-04-03 | 04 | 3 | XC-02 | T-01-11 | — | doc gate | `pnpm spec:verify:strict && pnpm spec:examples` | ✅ | ⬜ pending |
| 01-05-01 | 05 | 4 | XC-02, XC-03 | T-01-13 | Export set unchanged | doc gates | `pnpm spec:verify:strict && pnpm spec:api && pnpm spec:gates && pnpm spec:examples` + greps | ✅ | ⬜ pending |
| 01-05-02 | 05 | 4 | XC-01, XC-04, XC-05 | T-01-12 | Merge gate unmodified and green | full gate | `pnpm check:pr` + phase greps + ENF-03 test by name | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/http/test/PortRoutes.test.ts` — the ENF-03 regression case, added red at the start of 01-01-01 (D-06)
- [ ] `packages/http/test/RequestEnforcement.tst.ts` — written first in 01-01-02, fails to compile until `enforceRequest` exists
- [ ] `packages/http/test/RequestEnforcement.test.ts` — created by 01-03-01

Existing infrastructure (vitest projects, tstyche, `collectingLogger`, `stack` fixture) covers everything else; nothing to install.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
