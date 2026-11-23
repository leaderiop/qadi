---
phase: "74"
slug: "the-simulation-session-s-policy-choice-split-from-its-runs"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-23"
---

# Phase 74 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 with `@effect/vitest`; tstyche for type tests |
| **Config file** | root vitest config |
| **Quick run command** | `pnpm exec vitest run packages/devtools/test/model/SeededChoice.test.ts packages/devtools/test/model/HeldChoice.test.ts packages/devtools/test/model/SimulationSession.characterisation.test.ts packages/devtools/test/model/SimulationSession.runs.test.ts packages/devtools/test/model/SimulationSession.test.ts --project devtools < /dev/null` (5 files, 189 passed); `pnpm test:tstyche SeededChoice` (5 tests, 11 assertions) |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~1 s per quick run; `check:pr` several minutes |

---

## Sampling Rate

- **After every task commit:** the quick run commands
- **After every plan wave:** the quick runs plus `node scripts/check-house-style.mjs`, `node scripts/check-api-surface.mjs`, `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`, `node .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-characterisation-check.mjs`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| CHSE-01 | Seeding, replaying a row, choosing a policy, the menu and its order, and staleness through the real scoped session: 35 rows written green on the base (e25c8cfd); rows, titles and expected values held to that commit by the check (13 helpers moved to `simulationFixtures.ts`) | integration + check | `pnpm exec vitest run packages/devtools/test/model/SimulationSession.characterisation.test.ts --project devtools < /dev/null` (35 passed); `node .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-characterisation-check.mjs` (exit 0) and `--self-test` (49 passed) | ✅ | ✅ green |
| CHSE-02 | `SeededChoice.ts` beside `HeldChoice.ts` is pure: `seededChoice`, `withSightings`, `seedFrom`, `choose`; readings `policyChoice`, `policyOf`, `seedOf`, `seededFrom`, `menuOf`, `sightingAt`. Pin only when unseeded, orphan rule, menu order and its reverse lookup, same-policy no-op answering its input reference (including `seedFrom(undefined)` with no seed) | unit + type | `SeededChoice.test.ts` (35 passed, no scope); `pnpm test:tstyche SeededChoice` | ✅ | ✅ green |
| CHSE-03 | `SimulationSession.ts` holds one `let choice`; the run is set Idle only in `clearRun` (line 369), called from `reseed`, `choosePolicy` and `setPorts`; `stale` keeps its policy and seed disjuncts (BEH-QD-322) | integration + grep | `SimulationSession.test.ts` (80), `SimulationSession.runs.test.ts` (5); `/usr/bin/grep -nE '^\s*run = \{ _tag: "Idle"' packages/devtools/src/model/SimulationSession.ts` prints one line | ✅ | ✅ green |
| CHSE-04 | Choice rules tested as plain values; moved session cases live in `SeededChoice.test.ts`. The draft and resource text are assigned only in `writeDraft` (lines 463-464), so the `edit` comment is true | unit + grep | `SeededChoice.test.ts`; `/usr/bin/grep -nE '^\s*(draft\|resourceText) = ' packages/devtools/src/model/SimulationSession.ts` prints only lines inside `writeDraft` | ✅ | ✅ green |
| CHSE-05 | ADR-QD-187 records the split; ADR-QD-137 and ADR-QD-150 untouched; ADR-QD-047 v1.11 holds | spec gates | `node scripts/spec-revise.mjs --check`; `bash spec/scripts/verify-traceability.sh --strict` (21 pass) | ✅ | ✅ green |
| Mutation | `SeededChoice.ts` 122/122 (11 ignored, none unexamined); `HeldChoice.ts` 63/63; `SimulationSession.ts` 4 survivors, each the base's (the `stale` disjuncts and the line-402 guard), none open that the base did not have; recorded at 1ae6035b | mutation, recorded | `node .planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-mutation.mjs compare` (exit 0, against `74-mutation-close.json`) | ✅ | ✅ green |
| WX-01 | Merge gate (contribution) | full | `pnpm check:pr < /dev/null`, 17/18 steps green on 6b706712, mutation skipped by design | n/a | ✅ green (milestone-wide row) |
| WX-02/03 | Reserved ids only (ADR-QD-187, CCR-QD-466 and the phase's BEH/INV rows); no export added or removed | spec gates | `node scripts/check-api-surface.mjs` (941 exports); `bash spec/scripts/verify-traceability.sh --strict` | n/a | ✅ green (contribution) |
| WX-04 | No forbidden construct added | lint | `node scripts/check-house-style.mjs < /dev/null` (578 files clean) | n/a | ✅ green (contribution) |
| WX-05 | Stryker score of touched files holds | mutation, recorded | `74-mutation-base.json`, `74-mutation-close.json`. Not re-run | n/a | ✅ green (contribution) |
| WX-06 | Characterisation written green on the base; each `clearRun` call and each moved rule shown red once | recorded | `74-RED-EVIDENCE.md` | n/a | ✅ green (contribution) |
| WX-07 | No decision, plan or phase id in source or titles; nothing released | gate | `node scripts/check-house-style.mjs < /dev/null` | n/a | ✅ green (contribution) |

*Status: ✅ green · ❌ red · ⚠️ flaky*

WX-01 to WX-07 span the whole milestone; this table records Phase 74's contribution, not their completion.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The characterisation and the RED evidence on the phase base are the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| `stale`'s policy and seed disjuncts are kept though no public command reaches them (every policy or seed change clears the run first) | CHSE-03 | Equivalent mutants (lines 317, 319 survive `false`), the same survivors the base had; kept by BEH-QD-322, not by a test | Read `snapshot` in `SimulationSession.ts`; see `74-07-SUMMARY.md` |
| RED evidence recorded before the behaviour change | WX-06 | No command shows order of work | Cited evidence: `74-RED-EVIDENCE.md`; 74-01 and 74-04 summaries |
| Nothing released or published | WX-07 | Absence of an action | Cited evidence: `74-07-SUMMARY.md` |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-23

## Validation Audit 2026-11-23

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
