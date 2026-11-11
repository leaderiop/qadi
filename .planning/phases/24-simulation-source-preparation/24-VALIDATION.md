---
phase: "24"
slug: "simulation-source-preparation"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-11"
---

# Phase 24 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest` (`it.effect`, `TestClock`); tstyche for `surface.tst.ts`; the BDD suite (`pnpm test:bdd`) drives `makeSimulationSession` |
| **Config file** | `vitest.config.ts` (projects `packages/*`; this phase uses `devtools`) |
| **Quick run command** | `pnpm vitest run --project devtools packages/devtools/test/model/SimulationSource.prepare.test.ts` |
| **Full suite command** | `pnpm check:pr` (background; well over 10 minutes) |
| **Estimated runtime** | not measured at planning time; per-task commands are single-project vitest runs, the mutation runs are scoped to two files |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` commands.
- **Wave 1 (24-01):** the session suite (green) and the new table file (red by design). No other suite is red.
- **Wave 2 (24-02):** Task 1 runs the two source suites only (the session suite still imports the deleted names); Task 2 runs the whole devtools project, BDD, `pnpm typecheck`, `pnpm lint`, tstyche and madge.
- **Before verify-work:** per-file mutation comparison and `pnpm check:pr` (24-03 Task 3).
- **Max feedback latency:** under 60 s per task except the two Stryker runs and the final gate.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 24-01-01 | 01 | 1 | WX-02, WX-05 | T-24-01 | Numbers free; mutation base; one recorder per Live run pinned | characterisation (green) | `pnpm vitest run --project devtools …/SimulationSession.test.ts`; base JSON names both files | ✅ | ✅ green |
| 24-01-02 | 01 | 1 | SRC-03, WX-06 | T-24-02, T-24-03 | The 12-row table and the capture test exist, red by absence | table (RED) | `! pnpm vitest run --project devtools …/SimulationSource.prepare.test.ts`; failure names `prepareSource` | ❌ W0 → created in-task | ✅ green |
| 24-02-01 | 02 | 2 | SRC-01, SRC-02 | T-24-04, T-24-05, T-24-06 | Availability written once; session inspects no source variant | table + unit (GREEN) | the two source suites; region greps (11→0, 3→0, 2→0, 2→0) | ✅ | ✅ green |
| 24-02-02 | 02 | 2 | SRC-03, WX-03, WX-04 | T-24-04 | Session tests stop restating availability; refusal and capture lifetime still pinned | unit + BDD + static | `pnpm vitest run --project devtools && pnpm test:bdd`; `pnpm typecheck && pnpm lint && pnpm test:tstyche && pnpm circular` | ✅ | ✅ green |
| 24-03-01 | 03 | 3 | SRC-01..03, WX-02, WX-03 | T-24-07 | Records name only what exists | doc gate | BEH/CCR greps; `spec-revise --check && pnpm spec:verify:strict && pnpm spec:examples && pnpm spec:claims && pnpm spec:api` | ✅ | ✅ green |
| 24-03-02 | 03 | 3 | WX-02 | T-24-07 | CCR row and changeset | doc gate | CCR row count; changeset grep | ✅ | ✅ green |
| 24-03-03 | 03 | 3 | WX-01, WX-04, WX-05 | T-24-08, T-24-09 | Gate unmodified and green; mutation per file not lower | full gate | per-file Stryker comparison; `pnpm check:pr` (background); no `scripts/`/threshold edit since the phase base | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None blocking. `SimulationSource.prepare.test.ts` is created by the task that needs it (24-01-02). Nothing to install. All shell checks run under `bash -c` or call `/usr/bin/grep` (the executor's `grep` is a ugrep alias).

---

## Manual-Only Verifications

None. The phase has no `checkpoint:decision`: 24-CONTEXT D-01..D-07 settle every choice, and nothing in it reopens a decision.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (the table test is created in-task)
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-11 — every task's automated command ran green on the final HEAD (devtools 1162, full suite 4519, `pnpm check:pr` exit 0); per-file mutation SimulationSession.ts 0.9644 ≥ 0.9619, SimulationSource.ts 0.9841 ≥ 0.9444 (24-mutation-after.json)

## Validation Audit 2026-11-11

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
