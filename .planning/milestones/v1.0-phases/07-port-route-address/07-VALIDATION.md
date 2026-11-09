---
phase: "07"
slug: "port-route-address"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-08"
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest` |
| **Config file** | `vitest.config.ts` (projects `packages/*`), `packages/http/vitest.config.ts` (project `http`) |
| **Quick run command** | `pnpm vitest run --project http packages/http/test/PortRoutes.test.ts` |
| **Full suite command** | `pnpm check:pr` |
| **Estimated runtime** | quick: 0.9 s wall time (measured at HEAD c3ce9d2: 48 tests, 421 ms); spec gates: `pnpm spec:verify:strict` 3.6 s, `pnpm spec:gates` 0.2 s, `node scripts/spec-revise.mjs --check` 0.03 s; full: well over 10 minutes (example app, website build, package install), so it runs in the background |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` command:
  - code tasks: the PortRoutes test file, `pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api`, and the address grep gates;
  - record tasks: `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict` (plus `pnpm spec:gates`).
- **After wave 1:** `pnpm vitest run --project http && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api && pnpm spec:verify:strict`.
- **Before `/gsd-verify-work`:** `pnpm check:pr` green (07-03 Task 2).
- **Max feedback latency:** under 60 s for every per-task command. Only 07-03 Task 2 runs the full gate.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | ADDR-01, ADDR-03 | T-07-02, T-07-03, T-07-04 | A mismatched prefix fails closed as the port's own error. The guarded form still denies under a custom prefix. No new export | integration (HTTP round trip over `toWebHandler`) + gates | `pnpm vitest run --project http packages/http/test/PortRoutes.test.ts && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api`, plus the `/__ports`-once, deleted-constant, inline-template and import grep gates | ✅ (round trip written first, green on the pre-refactor tree as a characterization) | ✅ green |
| 07-01-02 | 01 | 1 | ADDR-02 | T-07-01 | A reply under a disagreeing status is read from its body. A proxy's HTML 502 is the port's own error, never an answer | integration (canned responses) + gates | `pnpm vitest run --project http packages/http/test/PortRoutes.test.ts && pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api`, plus the contract-reference greps | ✅ | ✅ green |
| 07-02-01 | 02 | 1 | XC-02, ADDR-02 | T-07-05 | — | doc gate | BEH heading and pointer greps, `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict` | ✅ | ✅ green |
| 07-02-02 | 02 | 1 | XC-02, XC-03 | T-07-05 | — | doc gate | CCR row, traceability and changeset greps, `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict && pnpm spec:gates` | ✅ | ✅ green |
| 07-03-01 | 03 | 2 | XC-03 | T-07-07 | Export set unchanged; records name what was built | gates + targeted tests | criterion-1 grep, `pnpm vitest run --project http packages/http/test/PortRoutes.test.ts -t "ARCH-52"`, CCR file-list completeness loop, `pnpm spec:examples && pnpm spec:api && pnpm spec:verify:strict && pnpm spec:gates` | ✅ | ✅ green |
| 07-03-02 | 03 | 2 | XC-01, XC-04, XC-05 | T-07-06 | The merge gate runs unmodified and is green | full gate | `pnpm check:pr`, plus the criterion-1 grep and the ARCH-52 tests by name | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None. `packages/http/test/PortRoutes.test.ts` already exists, and its helpers (`serve`, `clientFor`, `post`, `CASES`), the `stack` fixture, `scriptedPort` and `portsLayer` cover every new case. Nothing to install.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-08 (validate-phase audit: all six task commands re-run green at HEAD 154afa1; 07-03-02's `pnpm check:pr` stopped at step 13 on a host-only Playwright `--with-deps` sudo install, steps 13-16 then ran individually green, and the user accepted that evidence at the 07-03 checkpoint)

## Validation Audit 2026-11-08

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
