---
phase: "65"
slug: "only-admit-builds-an-admitted"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-22"
---

# Phase 65 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 with `@effect/vitest`; tstyche (type pins) |
| **Config file** | root vitest config; `tstyche.json` |
| **Quick run command** | `pnpm exec vitest run packages/core/test/Admission.test.ts packages/core/test/LeafMatrix.test.ts < /dev/null` then `node node_modules/tstyche/dist/bin.js --config tstyche.json packages/core/test/WalkEnvironment.tst.ts < /dev/null` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~3 s for the quick run; `check:pr` several minutes |

---

## Sampling Rate

- **After every task commit:** the quick run command
- **After every plan wave:** the quick run plus `node .planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs`, `node scripts/check-api-surface.mjs`, `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| ADMT-01 | `new Admitted(...)` is refused outside the class (TS2673) and a same-shape literal is not assignable (TS2741), each with a positive control | type pin | `node node_modules/tstyche/dist/bin.js --config tstyche.json packages/core/test/WalkEnvironment.tst.ts < /dev/null` (6 passed, 23 assertions, 2 suppressed matched); `node .planning/phases/QD-65-only-admit-builds-an-admitted/pin-codes.mjs` prints TS2673 and TS2741; RED on the base in `65-RED-EVIDENCE.md` | ✅ | ✅ green |
| ADMT-02 | Private constructor, private `nominal` member, `admit` is its static method exported as `admit`; call sites in `Walk.ts`/`Predicate.ts` unchanged | type pin + unit | the tstyche command above; `pnpm exec vitest run packages/core/test/Admission.test.ts < /dev/null` | ✅ | ✅ green |
| ADMT-03 | `"asked"` flags derived from the context `admit` builds; `"row"` row unchanged; E1-E13 and the leaf matrix pass | unit | `pnpm exec vitest run packages/core/test/Admission.test.ts packages/core/test/LeafMatrix.test.ts < /dev/null` (25 passed); E7-E9 RED on the base, E10 recorded as preserved behaviour (`65-RED-EVIDENCE.md`) | ✅ | ✅ green |
| ADMT-04 | No bench workload slower beyond its band | bench, recorded | `65-BENCH.md`: 35 workloads, 0 slower, geomean -0.51%, worst +1.6% vs 10% band. Not re-run; the later Phase 68 bench measures the current tree | n/a | ✅ green |
| WX-01 | Merge gate green | full | `pnpm check:pr < /dev/null`, recorded green: orchestrator run on `cc7fdc37` (`65-VERIFICATION.md`), 68.1-04, final run on `cd7cd3a1` (not re-run here) | n/a | ✅ green |
| WX-02/03 | Reserved ids only (ADR-QD-172 amended, CCR-QD-456, BEH-QD-661/662, INV-QD-375/376); traced; overview names every export (939) | spec gates | `bash spec/scripts/verify-traceability.sh --strict` (PASS 21, FAIL 0); `node scripts/check-api-surface.mjs` (939 exports); `node scripts/spec-revise.mjs --check`; `node scripts/check-dod-table.mjs` (26 steps, 153 references) | n/a | ✅ green |
| WX-04 | No forbidden construct in the diff | lint | `node scripts/check-house-style.mjs < /dev/null` (560 files clean, 3 declared switches, 66 type-test files, so `NOT_CALLABLE_PIN_BUDGET` holds) | n/a | ✅ green |
| WX-05 | Stryker score of touched files holds | mutation, recorded | `65-mutation-base.json` and `65-mutation-close.json`: `Admission.ts` 18/18 to 20/20, `Predicate.ts` 280/280, `Walk.ts` 260/273 unchanged. Not re-run | n/a | ✅ green |
| WX-07 | No plan, phase or requirement id in source or test titles | gate | `node scripts/check-house-style.mjs < /dev/null` (placeholder-id rule); grep scan in `65-VERIFICATION.md` | n/a | ✅ green |

*Status: ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The RED cases on the phase base are the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RED evidence recorded before the behaviour change | WX-06 | No command shows order of work | Cited evidence: `65-RED-EVIDENCE.md` (both pins and E7-E9 red on the base; each lock half and derivation variant shown failing once); `65-VERIFICATION.md` WX-06 row |
| Prose in doc comments and spec states only what the code holds | ADMT-02/03 (spec text) | No command parses sentence meaning | Cited evidence: `65-VERIFICATION.md` Truth 5 text-vs-code audit |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-22

## Validation Audit 2026-11-22

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
