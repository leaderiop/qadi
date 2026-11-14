---
phase: "42"
slug: "a-seeded-question-builds-its-own-computing-atom"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-14"
---

# Phase 42 — Validation Strategy

> Per-phase validation contract, reconstructed from the plans' `<automated>` verify blocks and the SUMMARYs (state B).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 + `@effect/vitest` (project `react`); Stryker 10.1.1 (`stryker.react.mjs`, plus the core, devtools, audit and http configs for the milestone re-check) |
| **Config file** | root `vitest.config.ts` (react held at 90%) |
| **Quick run command** | `pnpm exec vitest run --project react packages/react/test/QadiAtoms.test.ts packages/react/test/HydrationEngine.test.ts packages/react/test/SeededQuestion.test.ts` |
| **Full suite command** | `pnpm test`, then `pnpm check:pr < /dev/null` at the phase gate |
| **Estimated runtime** | ~15 seconds (quick); `check:pr` about 5 minutes |

---

## Sampling Rate

- **After every task commit:** the quick-run files the task edits; `pnpm typecheck` and `pnpm circular` when `src` changes; `node scripts/check-house-style.mjs` when the budget moves
- **After every plan wave:** `check verify-schema-drift QD-42`, `check verify-codebase-drift`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, the phase Stryker compare, the milestone re-check, `pnpm example`
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 42-01-01 | 01 | 1 | SEED-01, WX-05 | T-42-01 | baseline committed alone, first (`17500850`); moved survivors named | mutation | `stryker.react.mjs --mutate` → `42-mutation-base.json`, then the shape check | ✅ | ✅ green |
| 42-01-02 | 01 | 1 | SEED-02, SEED-05, WX-02 | T-42-02 | evidence and 1b decision; ADR-QD-155 before any code | spec | node content and order checks; `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict` | ✅ | ✅ green |
| 42-02-01 | 02 | 2 | SEED-04, WX-06 | T-42-03, T-42-04 | seven real-runtime cases green on base; two trap cases red under `get(grantAtom)`, restored | unit (tdd) | vitest react JSON-report check + trap check | ✅ | ✅ green |
| 42-02-02 | 02 | 2 | WX-05, WX-06 | T-42-04 | two mutation-closing cases green on base | unit (tdd) | vitest react JSON-report check | ✅ | ✅ green |
| 42-03-01 | 03 | 3 | SEED-03 | T-42-05, T-42-06, T-42-07 | tracer: one question through `SeededQuestion.ts`; `seededIn(get.registry)`; `addFinalizer(live())` first; out of the barrel | unit | node shape check + `pnpm typecheck && pnpm circular` + vitest react | ✅ | ✅ green |
| 42-03-02 | 03 | 3 | WX-04 | T-42-08 | budget keys and the AGENTS.md §13 line follow the code | integrity | node diff check + `node scripts/check-house-style.mjs` | ✅ | ✅ green |
| 42-03-03 | 03 | 3 | SEED-03, SEED-04 | T-42-05 | nine cases on a real atom runtime; trap red on moved code | unit (tdd) | vitest react JSON-report + trap check | ✅ | ✅ green |
| 42-04-01 | 04 | 4 | WX-02 | T-42-11 | four comments comment-only (TS printer) | integrity | node printer check | ✅ | ✅ green |
| 42-04-02 | 04 | 4 | WX-02, WX-03 | T-42-09, T-42-10 | ADR-QD-149/140 amended; INV/BEH Source lines | spec | node record check; `pnpm spec:verify:strict` | ✅ | ✅ green |
| 42-04-03 | 04 | 4 | WX-03, WX-07 | T-42-09 | traceability, CCR-QD-433, react patch changeset | spec | node citation check (26); `pnpm spec:api` | ✅ | ✅ green |
| 42-05-01 | 05 | 5 | WX-01..WX-04, WX-06 | T-42-12 | gates untouched beyond the budget move; order; pins; ids | integrity | seven node checks; `pnpm spec:api && pnpm circular` | ✅ | ✅ green |
| 42-05-02 | 05 | 5 | WX-05, SEED-06 | T-42-13, T-42-14 | no score fell; moved module carries only its five base survivors; milestone 15 files at latest recorded score | mutation | five Stryker runs + comparers | ✅ | ✅ green |
| 42-05-03 | 05 | 5 | SEED-06, WX-01, WX-07 | T-42-15 | stale sweep; merge gate; example; nothing released | gate | sweep checks; `pnpm check:pr < /dev/null` (280 s); `pnpm example` (30/30); release check | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `42-mutation-base.json`, committed alone first (react `HydrationEngine.ts`, `QadiAtoms.ts`; `SeededQuestion.ts` moved)
- [x] ADR-QD-155 before any code
- [x] Real-runtime seam tests and the two trap tests in `packages/react/test/QadiAtoms.test.ts`, green on the base, red under the trap
- [x] Two mutation-closing tests, green on the base

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-14 (every task has an automated verify, each recorded green in its SUMMARY; `pnpm check:pr` green on the final tree in 42-05; plan-verify defects recorded only: prefix-count preconditions in 42-02 and 42-05 also count each plan's own SUMMARY and state commits, guarded facts checked directly)

## Validation Audit 2026-11-14

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
