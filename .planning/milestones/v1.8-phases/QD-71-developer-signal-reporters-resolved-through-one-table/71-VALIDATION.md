---
phase: "71"
slug: "developer-signal-reporters-resolved-through-one-table"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-22"
---

# Phase 71 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 with `@effect/vitest`; tstyche for type tests |
| **Config file** | root vitest config |
| **Quick run command** | `pnpm exec vitest run packages/react/test/DeveloperSignalReporters.test.tsx packages/react/test/DeveloperSignals.test.ts packages/react/test/GateRegistry.store.test.ts --project react < /dev/null` (3 files, 104 passed); `pnpm test:tstyche DeveloperSignals` (7 tests, 15 assertions) |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~1 s per quick run; `check:pr` several minutes |

---

## Sampling Rate

- **After every task commit:** the quick run commands
- **After every plan wave:** the quick runs plus `node scripts/check-house-style.mjs`, `node scripts/check-api-surface.mjs`, `node scripts/spec-revise.mjs --check`, `bash spec/scripts/verify-traceability.sh --strict`
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| SIGR-01 | A throwing `onIdCollision` on `makeGateRegistry` is named `onIdCollision` (development and production); a throwing `onGateIdCollision` on `makeQadiAtoms` is named `onGateIdCollision`. RED on the base (`71-RED-EVIDENCE.md`) | unit | `pnpm exec vitest run packages/react/test/GateRegistry.store.test.ts --project react < /dev/null` | ✅ | ✅ green |
| SIGR-02 | One table states environment, frequency and option name per signal; every reporter resolves through it; `ReporterName` is derived from it (compile-time pins) and each row's condition holds only in its environment | unit + type | `DeveloperSignals.test.ts`; `pnpm test:tstyche DeveloperSignals` | ✅ | ✅ green |
| SIGR-03 | The production-once rule is a row of the table (once per process); the one remaining module-scope latch is the recorded exception, and any other module-scope mutable state in `packages/react/src` fails the gate | unit + gate | `DeveloperSignals.test.ts` (production once, development silent); `node scripts/check-house-style.mjs < /dev/null` (`MODULE_STATE_BUDGET`, AST scan) | ✅ | ✅ green |
| SIGR-04 | Every reporter's events, text and frequency unchanged (35-row characterisation through the entry points, written green on the base; its expected values unchanged, its layout edited in code review) | unit | `pnpm exec vitest run packages/react/test/DeveloperSignalReporters.test.tsx --project react < /dev/null` | ✅ | ✅ green |
| SIGR-05 | ADR-QD-184 extends ADR-QD-041 and ADR-QD-052; INV and traceability rows restated | spec gate | `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/spec-revise.mjs --check` | ✅ | ✅ green |
| WX-01 | Merge gate (contribution) | full | `pnpm check:pr < /dev/null`, recorded green on 02daf4f9 | n/a | ✅ green (milestone-wide row) |
| WX-02/03 | Reserved ids only; no export added or removed | spec gates | `node scripts/check-api-surface.mjs`; `bash spec/scripts/verify-traceability.sh --strict` | n/a | ✅ green (contribution) |
| WX-04 | No forbidden construct added | lint | `node scripts/check-house-style.mjs < /dev/null` (569 files clean) | n/a | ✅ green (contribution) |
| WX-05 | Stryker score of touched files holds | mutation, recorded | `71-mutation-base.json`, `71-mutation-close.json` (re-closed after code review). Not re-run | n/a | ✅ green (contribution) |
| WX-06 | Characterisation and RED pins written on the base; each new check shown failing once | recorded | `71-RED-EVIDENCE.md` (includes planted module-scope `let` in `QadiAtoms.ts` and `DeveloperSignals.ts`) | n/a | ✅ green (contribution) |
| WX-07 | No decision, plan or phase id in source or titles; nothing released | gate | `node scripts/check-house-style.mjs < /dev/null` | n/a | ✅ green (contribution) |

*Status: ✅ green · ❌ red · ⚠️ flaky*

WX-01 to WX-07 span the whole milestone; this table records Phase 71's contribution, not their completion.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The characterisation and the RED evidence on the phase base are the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RED evidence recorded before the behaviour change | WX-06 | No command shows order of work | Cited evidence: `71-RED-EVIDENCE.md`; 71-01 summary |
| Nothing released or published | WX-07 | Absence of an action | Cited evidence: `71-08-SUMMARY.md` |

`MODULE_STATE_BUDGET` has no source-scoped test of `scripts/`; its failure was shown by the planted-`let` experiments in `71-RED-EVIDENCE.md` and the code-review fix reports (`71-REVIEW-FIX.iter1.md`, `iter2.md`), and it runs on every `node scripts/check-house-style.mjs`.

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
