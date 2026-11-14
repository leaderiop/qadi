---
phase: "41"
slug: "one-guarded-value-to-text-function"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-14"
---

# Phase 41 — Validation Strategy

> Reconstructed from the plans and SUMMARYs after execution (validate-phase state B: no VALIDATION.md was seeded, since the phase skipped research).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest` (projects `core`, `devtools`); per-package Stryker (`stryker.config.mjs`, `stryker.devtools.mjs`) |
| **Config file** | root `vitest.config.ts` (coverage: core 95%, others 90%) |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/ValueText.test.ts packages/core/test/NonJsonLiteral.test.ts packages/core/test/Explanation.test.ts && pnpm exec vitest run --project devtools packages/devtools/test/model/NonJsonWitness.test.ts packages/devtools/test/model/ValueTextConsumers.test.ts packages/devtools/test/model/Remedies.test.ts packages/devtools/test/model/Filters.test.ts packages/devtools/test/model/SimulationForm.test.ts` |
| **Full suite command** | `pnpm test`, then `pnpm check:pr < /dev/null` at the phase gate |
| **Estimated runtime** | ~15 seconds (quick); `check:pr` about 2 minutes |

---

## Sampling Rate

- **After every task commit:** the quick-run files the task edits; `pnpm typecheck` when `src` changes
- **After every plan wave:** `pnpm typecheck && pnpm lint && pnpm circular`, `pnpm spec:api` once the export lands, the spec gates once records change
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green, the two Stryker compares
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 41-01-01 | 01 | 1 | WX-02, WX-05, WX-06 | T-41-01 | baseline committed alone, first; reserved ids free | mutation | two Stryker runs → `41-mutation-base.json`, then the writer's node check | ✅ | ✅ green |
| 41-01-02 | 01 | 1 | TEXT-02, WX-02 | T-41-02 | ADR-QD-154 before any code | spec | node order and content check; `node scripts/spec-revise.mjs --check && pnpm spec:verify:strict` | ✅ | ✅ green |
| 41-02-01 | 02 | 2 | TEXT-01, WX-06 | T-41-03 | `explain` throws on the base (14 `it.fails`) | unit | `pnpm exec vitest run --project core packages/core/test/NonJsonLiteral.test.ts` + reason check without `.fails` | ✅ | ✅ green |
| 41-02-02 | 02 | 2 | TEXT-01, WX-06 | T-41-03 | remedy, session command and policy reading throw on the base (21) | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/NonJsonWitness.test.ts` + reason check | ✅ | ✅ green |
| 41-02-03 | 02 | 2 | TEXT-03, WX-06 | T-41-04 | base outputs written out in four files | unit | vitest core Explanation + devtools Remedies/Filters/SimulationForm + no-edited-line check | ✅ | ✅ green |
| 41-03-01 | 03 | 3 | TEXT-02, WX-03, WX-04 | T-41-05, T-41-06, T-41-07 | tracer: `valueText` exported, named, form reads through it | unit | node shape check + `pnpm typecheck && pnpm lint && pnpm circular && pnpm spec:api` | ✅ | ✅ green |
| 41-03-02 | 03 | 3 | TEXT-02, TEXT-03 | T-41-05 | one 22-row rule table; one row per consumer | unit (tdd) | `pnpm exec vitest run --project core packages/core/test/ValueText.test.ts` + devtools `ValueTextConsumers.test.ts` + per-case report check | ✅ | ✅ green |
| 41-04-01 | 04 | 4 | TEXT-01, TEXT-04 | T-41-08, T-41-09, T-41-10 | `explain` cannot throw; core RED flips | unit (tdd) | vitest core NonJsonLiteral/Explanation/ValueText + RED-flip shape check | ✅ | ✅ green |
| 41-04-02 | 04 | 4 | TEXT-01, TEXT-04 | T-41-08, T-41-09, T-41-10 | remedy label cannot throw; devtools RED flips | unit (tdd) | vitest devtools NonJsonWitness/Remedies/ValueTextConsumers + RED-flip shape check | ✅ | ✅ green |
| 41-04-03 | 04 | 4 | TEXT-03, WX-04, WX-06 | T-41-08 | Filters through `valueText`; scoped grep | unit | vitest devtools Filters + scoped `JSON.stringify` grep + both suites + order check | ✅ | ✅ green |
| 41-05-01 | 05 | 5 | TEXT-04, WX-03 | T-41-12 | BEH-QD-541/542; BEH-QD-141/223 byte-identical | spec | node content check; `spec-revise --check && pnpm spec:verify:strict` | ✅ | ✅ green |
| 41-05-02 | 05 | 5 | WX-02, WX-07 | T-41-11 | changesets added, unconsumed; CCR-QD-432 complete | spec | node changeset and CCR row check; `pnpm spec:api` | ✅ | ✅ green |
| 41-06-01 | 06 | 6 | WX-02, WX-03, WX-04, WX-06 | T-41-13 | gates untouched; order; scope; surface; ids | integrity | six node checks; `pnpm spec:api && pnpm circular` | ✅ | ✅ green |
| 41-06-02 | 06 | 6 | WX-05 | T-41-14 | no score fell; ValueText.ts at 1 | mutation | two Stryker runs + comparison node check | ✅ | ✅ green |
| 41-06-03 | 06 | 6 | WX-01, WX-07 | T-41-15 | merge gate green; nothing released | gate | `pnpm check:pr < /dev/null` + release node check | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `41-mutation-base.json`, committed alone first (core `Explanation.ts`, `ValueText.ts` as new; devtools `Remedies.ts`, `Filters.ts`, `SimulationForm.ts`)
- [x] ADR-QD-154 before any code
- [x] RED files failing on the base for the stated reason (core 14, devtools 21)
- [x] Base outputs written out green in four test files

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

**Approval:** validated 2026-11-14 (every task has an automated verify, each recorded green in its SUMMARY; `pnpm check:pr` green on the final tree in 41-06; executor commits carry the `Claude Sonnet 5.5` trailer, which the plans' trailer checks accept)

## Validation Audit 2026-11-14

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
