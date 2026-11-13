---
phase: "32"
slug: "evaluation-options-and-services-stated-once"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-12"
---

# Phase 32 — Validation Strategy

> Reconstructed from the executed plans and summaries (State B). Every requirement maps to an automated command that ran green.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | tstyche (type pins), vitest (`@effect/vitest`), cucumber BDD, Stryker |
| **Config file** | tstyche (via `package.json`), `vitest.config.ts` (workspace projects), `stryker.config.mjs` |
| **Quick run command** | `pnpm exec tstyche packages/core/test/EvaluationShapes.tst.ts packages/core/test/Lifecycle.tst.ts` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~89 seconds (full gate, mutation skipped) |

---

## Sampling Rate

- **After every task commit:** the task's `<automated>` command (tstyche pins, targeted vitest + typecheck/lint/circular, or the spec gates)
- **After every plan wave:** wave 1 test-only (pin 5/6 green on the base); wave 2 `pnpm build` + `pnpm vitest run` (4711 / 4711 green); wave 3 spec-only, spec gates green; wave 4 the merge gate
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green on `3f1cd943` (182 files / 4711 tests, BDD 568, examples 42); re-confirmed at validation: the two pins print 8 tests / 10 assertions passed
- **Max feedback latency:** ~89 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 32-01-01 | 01 | 1 | WX-05 | T-32-01 | Mutation base for the six touched files with mutants recorded on the untouched tree, in the phase's first commit, alone; no-mutant files refused if they appear | mutation | node check over `32-mutation-base.json` + first-commit check | ✅ | ✅ green |
| 32-01-02 | 01 | 1 | WX-06 | T-32-02 | `EvaluationShapes.tst.ts` imports only the barrel, pins the three shapes, 5 tests / 6 assertions on the base, second commit | type pin | node runner over tstyche output + `pnpm typecheck && pnpm lint` + commit-order check | ✅ | ✅ green |
| 32-02-01 | 02 | 2 | EOPT-01, EOPT-02, EOPT-04 | T-32-03 | One declaration of each type in its leaf; no re-export from `Evaluate.ts`; importers re-pointed; pin byte-identical and green | static + type pin + unit | structural node check + `pnpm exec tstyche …(6 pins)… && pnpm typecheck …` + `pnpm vitest run --project core` | ✅ | ✅ green |
| 32-02-02 | 02 | 2 | EOPT-03 | T-32-04 | `LifecycleOptions` deleted; `decideQuestion` options derived as `Omit<EvaluateOptions, keyof QuestionOptions>`; `ask` returns `EvaluationServices`; key set pinned once | static + type pin + unit | structural node check + `pnpm exec tstyche … && pnpm typecheck && pnpm lint && pnpm circular && pnpm vitest run --project core …` | ✅ | ✅ green |
| 32-03-01 | 03 | 3 | WX-02 | T-32-05 | ADR-QD-105 and ADR-QD-037 revision notes; `06-services.md` names `EvaluationServices.ts` | spec | `node scripts/spec-revise.mjs --check && pnpm spec:examples` + content check | ✅ | ✅ green |
| 32-03-02 | 03 | 3 | EOPT-04, WX-03, WX-07 | T-32-05 | Overview module column, traceability, CCR-QD-423 (unused ids named), patch changeset without Breaking; only reserved ids written | spec gates | `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims && node scripts/spec-revise.mjs --check` + reserved-id check | ✅ | ✅ green |
| 32-04-01 | 04 | 4 | WX-04, WX-06 | T-32-06 | No judging file changed; no forbidden token added; D-10 commit order held; every commit carries the trailer | static | three node scans over `phase_base..HEAD` | ✅ | ✅ green |
| 32-04-02 | 04 | 4 | WX-05 | T-32-07 | No touched file below base (all six unchanged: 1.0 ×4, Qadi 0.9730, GuardHealthCheck 0.7778; same four base survivors); new leaf carries no mutant | mutation | node compare over `32-mutation-base.json` / `32-mutation-after.json` | ✅ | ✅ green |
| 32-04-03 | 04 | 4 | WX-01 | T-32-SC | Merge gate on the final tree; constraint check | full | `pnpm check:pr < /dev/null` + constraint node check | ✅ | ✅ green |

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
