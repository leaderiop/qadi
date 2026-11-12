---
phase: "25"
slug: "session-only-simulator"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-11"
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 via `@effect/vitest` (`it.effect`, which provides the `Scope` a session is built in; `TestClock`) for the session; `@testing-library/react` for `Simulator.test.tsx` and `DevtoolsDock.test.tsx`; tstyche for `surface.tst.ts`; the BDD suite (`pnpm test:bdd`) drives `makeSimulationSession` |
| **Config file** | `vitest.config.ts` (projects `packages/*`; this phase uses `devtools`) |
| **Quick run command** | `pnpm vitest run --project devtools packages/devtools/test/model/SimulationSession.test.ts -t "ARCH-73"` |
| **Full suite command** | `pnpm check:pr` (background; well over 10 minutes) |
| **Estimated runtime** | not measured at planning time; per-task commands are single-project vitest runs, the Stryker runs are scoped to two files |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` commands.
- **Wave 1 (25-01):** the recorded answer (`d01_outcome: D`, from `_DECISIONS-v1.2.md`) and its SUMMARY greps only; no human wait.
- **Wave 2 (25-02):** the session suite; a JSON-reporter check that only ARCH-73 tests fail.
- **Wave 3 (25-03):** Task 1 runs every session test except the two "view's commands … / what the view shows …" describes (excluded by exact title) and the BDD simulator feature; Task 2 runs the whole devtools project with the same two describes excluded, plus `tsc -p tsconfig.test.json`, `lint:style` and madge; Task 3 runs the whole devtools project, BDD, `pnpm typecheck`, `pnpm lint`, tstyche, madge and `pnpm spec:api`.
- **Wave 4 (25-04):** `Simulator.test.tsx` (sessions in test-owned scopes) green on the view as 25-03 left it first, then the whole devtools project, BDD and the new StrictMode hook test after the view changes.
- **Before verify-work:** per-file mutation comparison and `pnpm check:pr` (25-05 Task 3).
- **Max feedback latency:** under 60 s per task except the Stryker runs and the final gate.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 25-01-01 | 01 | 1 | SIM-04, SIM-05, WX-02 | T-25-01..03 | The pre-answered D-01 (option D, overriding ARCH-20 D-20-b) is recorded machine-checkably; Phase 24 closed; numbers free | doc gate | `d01_outcome: D` / override / instruction / `public_changes_confirmed` greps; 25-01's commits touch only `.planning/` | ✅ | ✅ green |
| 25-02-01 | 02 | 2 | SIM-04, WX-05, WX-06 | T-25-04, T-25-06 | A superseded run is interrupted through the handle; closing the scope stops the run; no lifecycle members; the run span is a root (red); mutation base | unit (RED) | `! … SimulationSession.test.ts -t "ARCH-73"`; JSON check: only ARCH-73 fails (≥ 6); base JSON names both files | ✅ | ✅ green |
| 25-02-02 | 02 | 2 | SIM-02, SIM-03 | T-25-05 | Commands and readings stated with today's exact text, built with the scoped constructor (red) | unit (RED) | same two checks; ≥ 6 references to the new members | ✅ | ✅ green |
| 25-03-01 | 03 | 3 | SIM-04 | T-25-07, T-25-16 | Scoped constructor, FiberHandle-owned runs, `supersede()`; model tests and BDD converted | unit + BDD + static | session file with the two "view" describes excluded by title; BDD simulator feature; member greps (3→0), `FiberHandle.runtime(`/`getUnsafe(` present, no lifecycle calls in tests | ✅ | ✅ green |
| 25-03-02 | 03 | 3 | SIM-04, WX-04 | T-25-09, T-25-17 | React owns the scope (`useScoped`); no adapter forks a run or reap; dock frame renders once the session exists | DOM + type + static | devtools project minus the two describes; `tsc -p tsconfig.test.json && pnpm lint:style && pnpm circular`; fork greps (1 file→0), `useScoped` in no barrel | ✅ | ✅ green |
| 25-03-03 | 03 | 3 | SIM-02, SIM-03, SIM-05, WX-03 | T-25-08, T-25-09 | Readings in the snapshot; types exported type-only; overview names the scoped constructor | unit + BDD + type + doc gate | `pnpm vitest run --project devtools && pnpm test:bdd`; `pnpm typecheck && pnpm lint && pnpm test:tstyche && pnpm circular && pnpm spec:api && spec-revise --check`; six names in barrel and overview | ✅ | ✅ green |
| 25-04-01 | 04 | 4 | SIM-01, WX-05 | T-25-10, T-25-18 | DOM tests render a session they build in a scope they close; deletions only behind model tests | DOM | `… Simulator.test.tsx`; every `<Simulator` has `session=`; `Scope.close(` present, no `session.dispose` | ✅ | ✅ green |
| 25-04-02 | 04 | 4 | SIM-01..04, WX-04 | T-25-11, T-25-12, T-25-17 | The view computes nothing named; the failure sentence untouched; StrictMode-safe hook ownership pinned | DOM + BDD + static | `pnpm vitest run --project devtools && pnpm test:bdd`; Simulator greps (12→0, 1→0); sentence checks; `pnpm typecheck && pnpm lint && pnpm test:tstyche`; `useSimulationSession.test.tsx` green with `StrictMode` | ✅ | ✅ green |
| 25-05-01 | 05 | 5 | SIM-01..05, WX-02, WX-03 | T-25-13 | ADR-QD-137 records the override of D-20-b with the human's words; records name only what exists | doc gate | BEH/CCR/ADR-137 greps; no fence lists `reap`/`dispose`; `spec-revise --check && pnpm spec:verify:strict && pnpm spec:examples && pnpm spec:claims && pnpm spec:api` | ✅ | ✅ green |
| 25-05-02 | 05 | 5 | SIM-05, WX-02 | T-25-14 | CCR row, minor changeset, pending changesets describe the scoped constructor | doc gate | CCR row count; changeset greps | ✅ | ✅ green |
| 25-05-03 | 05 | 5 | WX-01, WX-04, WX-05 | T-25-15 | Gate unmodified and green; mutation per file not lower | full gate | per-file Stryker comparison; `pnpm check:pr` (background); no `scripts/`/threshold edit since the phase base | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None blocking. Every test file this phase edits exists. Nothing to install. All shell checks run under `bash -c` or call `/usr/bin/grep` (the executor's `grep` is a ugrep alias).

---

## Manual-Only Verifications

None. D-01 was answered before execution (`_DECISIONS-v1.2.md`: option D, a FiberHandle owned by a scoped session); 25-01
records it and continues. A **new** one-way decision not settled by `25-CONTEXT.md` is a blocker to return, per that file.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify (no checkpoint remains)
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none missing)
- [x] No watch-mode flags
- [x] Feedback latency < 60 s per task (the full gate runs once, at the end)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-11 — every task's automated command green on the final HEAD (ARCH-73 35/35; devtools 1193; full suite 4551; BDD 568; `pnpm check:pr` exit 0 at 25-05; lifecycle members 3→0, FiberHandle present, no session run/reap fork under `react/`, `useScoped` in no barrel; CCR-QD-415 one row; `spec-revise --check` green; no gate/threshold edit since 17fa6738); per-file mutation SimulationSession.ts 0.9694 ≥ 0.9641, Replay.ts 1.0 ≥ 1.0 (25-mutation-after.json). The visual preserve check stays a human judgment (25-04/25-05 D6): DOM tests pin strings and test ids, not pixels.

## Validation Audit 2026-11-11

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
