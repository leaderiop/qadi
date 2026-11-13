---
phase: "33"
slug: "one-sealed-evaluation-layer"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-12"
---

# Phase 33 — Validation Strategy

> Reconstructed from the executed plans and summaries (State B). Every requirement maps to an automated command that ran green.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (`@effect/vitest`), tstyche (type pins), cucumber BDD, Stryker |
| **Config file** | `vitest.config.ts` (workspace projects), tstyche (via `package.json`), `stryker.config.mjs` |
| **Quick run command** | `pnpm vitest run --project core packages/core/test/EvaluationEnvironment.test.ts && pnpm vitest run --project testing packages/testing/test/QadiReviewLayer.test.ts && pnpm vitest run --project devtools packages/devtools/test/model/ReviewSimulationConformance.test.ts && pnpm exec tstyche packages/core/test/EvaluationEnvironment.tst.ts` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~91 seconds (full gate, mutation skipped) |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` commands: targeted vitest with exact counts, tstyche pins, structural node checks, `pnpm typecheck && pnpm lint` (plus `pnpm circular` on src tasks), or the spec gates.
- **After every plan wave:**
  - Wave 1 is test-only: both pins (4 + 4) were green on the untouched base.
  - Waves 2 and 3: `pnpm build` and `pnpm vitest run` gave 4726 / 4726 green after each.
  - Waves 4 and 5 are spec-only, and the spec gates were green.
  - Wave 6: Stryker and the merge gate.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` was green on `5ae5de9a`: 185 files and 4726 tests, with core coverage at 99.4 / 98.08 / 99.43 / 99.84.
- **Max feedback latency:** ~91 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 33-01-01 | 01 | 1 | WX-05 | T-33-01 | Mutation base classified by Stryker's own `mutate` globs (`measured: {}`; six touched files unmeasured, each with a reason; `EvaluationEnvironment.ts` under `new`), in the phase's first commit, alone | mutation | node check over `33-mutation-base.json` + first-commit check | ✅ | ✅ green |
| 33-01-02 | 01 | 1 | SEAL-03, WX-06 | T-33-02 | `QadiReviewLayer.test.ts`: an outer recording sink and an outer cache provided *around* the review layer receive every record and lookup; 4 tests green on the base | unit (pin) | node runner over `pnpm vitest run --project testing …` (exact count 4) + `pnpm typecheck && pnpm lint` | ✅ | ✅ green |
| 33-01-03 | 01 | 1 | SEAL-04, WX-06 | T-33-02 | `ReviewSimulationConformance.test.ts`: review and simulation agree on sequential prefixed ids, `durationMillis` 0 under the deterministic clock, and fail-closed unfed ports; 4 tests green on the base; commit order baseline → pin → pin | unit (pin) | node runner over `pnpm vitest run --project devtools …` (exact count 4) + commit-order check | ✅ | ✅ green |
| 33-02-01 | 02 | 2 | SEAL-01, SEAL-02 | T-33-03, T-33-04, T-33-06 | `evaluationEnvironment` with every option required; `shadow` closed union dispatched by `Match.exhaustive`; `sinkAndCache` installs a discarding sink and a per-build cache; simulation built on it; 171 seal and conformance tests unchanged and green | unit + type pin | structural node check + vitest runner (core 7, devtools 171) + `pnpm exec tstyche …EvaluationEnvironment.tst.ts` (6 tests / 10 assertions) + `pnpm circular && pnpm typecheck && pnpm lint` | ✅ | ✅ green |
| 33-02-02 | 02 | 2 | SEAL-01, SEAL-04 | T-33-05 | `qadiReviewLayer` and `helpers.ts` pass `shadow: "none"` explicitly; signatures unchanged; test dirs untouched since the conformance pin | unit | structural node check + `pnpm vitest run --project core --project testing` (2208) + `git diff --quiet` over the test dirs | ✅ | ✅ green |
| 33-03-01 | 03 | 3 | SEAL-05 | T-33-07 | `@qadi/testing`'s `clock` takes `EvaluationClock`; the two test files differ only by the exact `clock: "test"` → `clock: "deterministic"` substitution (39 + 4) | unit + diff shape | node check + line-diff shape check + `pnpm typecheck && pnpm lint` | ✅ | ✅ green |
| 33-03-02 | 03 | 3 | SEAL-05, SEAL-01 | T-33-08 | `SimulationClock` deleted; devtools reads `EvaluationClock`; each package maps the literal in one place; no `@qadi/testing` import in devtools src; no `effect/testing` in core src; devtools manifest unchanged | unit + type pin | node check + vitest (devtools 1232, testing 46) + `pnpm typecheck && pnpm lint && pnpm circular` + `surface.tst.ts` one-line diff | ✅ | ✅ green |
| 33-04-01 | 04 | 4 | WX-02 | T-33-09 | ADR-QD-146 (1.0), its index entry, ADR-QD-050 Rev 1.5 amendment | spec | content node check + `node scripts/spec-revise.mjs --check` | ✅ | ✅ green |
| 33-04-02 | 04 | 4 | SEAL-02, WX-02 | T-33-09 | INV-QD-042 restated on the builder; INV-QD-311/312; BEH-QD-501..505; BEH-QD-226 restated; devtools-spec prose on the new vocabulary | spec | content node check + `node scripts/spec-revise.mjs --check && pnpm spec:examples && pnpm spec:claims` | ✅ | ✅ green |
| 33-05-01 | 05 | 5 | WX-03, WX-07 | T-33-11 | Overview names the four new exports and drops `SimulationClock`; traceability rows; CCR-QD-424 with "Unused: none" | spec gates | content node check + `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict && pnpm spec:api && pnpm spec:gates` (914 exports; 21 / 0) | ✅ | ✅ green |
| 33-05-02 | 05 | 5 | WX-02, WX-07 | T-33-10 | Three `minor` changesets; `**Breaking.**` lead on exactly testing and devtools; the upgrading.md `## 0.12: one clock vocabulary` section with a compiled After fence; the website testing page | spec | changeset node check + `pnpm spec:website-examples` (53 blocks) | ✅ | ✅ green |
| 33-06-01 | 06 | 6 | WX-04, WX-06 | T-33-12 | No judging file changed since the base; no forbidden token added; commit order and test-edit shape hold over `a201e2fb..HEAD` | static | three node scans over the phase range | ✅ | ✅ green |
| 33-06-02 | 06 | 6 | WX-05 | T-33-13 | `EvaluationEnvironment.ts`: 8 mutants (6 killed, 2 ignored static), score 100.00, with no survivors; baseline in one commit, report fresh | mutation | node compare over `33-mutation-base.json` / `33-mutation-after.json` | ✅ | ✅ green |
| 33-06-03 | 06 | 6 | WX-01 | T-33-SC | Merge gate on the final tree; constraint check bounds 33-06's commits | full | `pnpm check:pr < /dev/null` + constraint node check | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-11-12
