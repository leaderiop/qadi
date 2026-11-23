---
phase: "73"
slug: "one-pure-reconcile-for-gate-registration"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-23"
---

# Phase 73 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 with `@effect/vitest`; tstyche for type tests |
| **Config file** | root vitest config |
| **Quick run command** | `pnpm exec vitest run packages/react/test/GateRegistration.characterisation.test.tsx packages/react/test/GateWriter.reconcile.test.ts packages/react/test/GateWriter.test.tsx packages/react/test/GateWriter.useGates.test.tsx packages/react/test/GateWriter.kinds.test.tsx packages/react/test/GateRegistry.test.tsx packages/react/test/GateRegistry.store.test.ts --project react < /dev/null` (7 files, 124 passed); `pnpm test:tstyche GateWriter` (5 tests, 7 assertions) |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | ~2 s per quick run; `check:pr` several minutes |

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
| RECN-01 | Registration of `useGate`/`useGates` through the real `QadiProvider` (what registers, under which id, with what state, how many registry notifications per step, remount, StrictMode, unmount) pinned by 19 rows written green on the base; inputs, titles and expected values unchanged since 2680ab4d (header, imports and the moved `snapshotOf` helper edited in review) | integration | `pnpm exec vitest run packages/react/test/GateRegistration.characterisation.test.tsx --project react < /dev/null` (19 passed) | ✅ | ✅ green |
| RECN-02 | `reconcile(writer, live, wanted)` takes `wanted` as a `ReadonlyMap` keyed by gate id and `GateIdentity` has no id; one step keeps and updates, unregisters, then registers, returning a new map. Compile-time refusal of an array and of an id pinned by the type test | unit + type | `GateWriter.reconcile.test.ts` (17 passed); `pnpm test:tstyche GateWriter` | ✅ | ✅ green |
| RECN-03 | `useGateRegistrations` holds one ref, the writer-keyed teardown and one registration effect (ADR-QD-186 decision 7). `src/useGate.ts` contains no `join("\|")` and no `Record.values` (both greps empty) | unit + grep | `GateWriter.test.tsx` (hook, 8 tests); `/usr/bin/grep -n 'join("\|")\|Record.values' packages/react/src/useGate.ts` prints nothing | ✅ | ✅ green |
| RECN-04 | The update half runs without rendering in `GateWriter.reconcile.test.ts`: keep and update, an unchanged input twice only updates, an identity change unregisters then registers, and (added by this audit) a kept entry on a real registry notifies once for a new state and not for the same. `GateRegistry.test.tsx` no longer carries the moved cases; the registry's own rules stay in `GateRegistry.store.test.ts` | unit | `pnpm exec vitest run packages/react/test/GateWriter.reconcile.test.ts packages/react/test/GateRegistry.test.tsx --project react < /dev/null` | ✅ | ✅ green |
| RECN-05 | ADR-QD-186 extends ADR-QD-140 and ADR-QD-111 (dated amendments; note in ADR-QD-103); AGENTS.md section 13 unaffected | spec gates | `node scripts/spec-revise.mjs --check`; `bash spec/scripts/verify-traceability.sh --strict` (21 pass) | ✅ | ✅ green |
| Mutation | `GateWriter.ts` 83/83 and `useGate.ts` 44/45 (one survivor at line 98, `ConditionalExpression -> false`, the writer-undefined guard), none open that the base did not have; recorded at 9d328b26 | mutation, recorded | `node .planning/phases/QD-73-one-pure-reconcile-for-gate-registration/73-mutation.mjs compare` (exit 0, against `73-mutation-close.json`) | ✅ | ✅ green |
| WX-01 | Merge gate (contribution) | full | `pnpm check:pr < /dev/null`, 17/18 steps green on 86ce0b65, mutation skipped by design | n/a | ✅ green (milestone-wide row) |
| WX-02/03 | Reserved ids only (ADR-QD-186, CCR-QD-465, BEH-QD-701 to 705, INV-QD-391/392); no export added or removed | spec gates | `node scripts/check-api-surface.mjs`; `bash spec/scripts/verify-traceability.sh --strict` | n/a | ✅ green (contribution) |
| WX-04 | No forbidden construct added | lint | `node scripts/check-house-style.mjs < /dev/null` (574 files clean) | n/a | ✅ green (contribution) |
| WX-05 | Stryker score of touched files holds | mutation, recorded | `73-mutation-base.json`, `73-mutation-close.json`. Not re-run | n/a | ✅ green (contribution) |
| WX-06 | Characterisation written on the base; update half shown red once | recorded | `73-RED-EVIDENCE.md` | n/a | ✅ green (contribution) |
| WX-07 | No decision, plan or phase id in source or titles; nothing released | gate | `node scripts/check-house-style.mjs < /dev/null` | n/a | ✅ green (contribution) |

*Status: ✅ green · ❌ red · ⚠️ flaky*

WX-01 to WX-07 span the whole milestone; this table records Phase 73's contribution, not their completion.

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. The characterisation and the RED evidence on the phase base are the Wave 0 evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| RED evidence recorded before the behaviour change | WX-06 | No command shows order of work | Cited evidence: `73-RED-EVIDENCE.md`; 73-01 and 73-03 summaries |
| The hook's one ref holds nothing beyond its registrations; `reconcile` adds no handler of its own | RECN-03 | Absence; kept by review (stated in the hook's doc comment and BEH-QD-702), not a test or gate | Read `useGateRegistrations` and `reconcile` |
| Nothing released or published | WX-07 | Absence of an action | Cited evidence: `73-07-SUMMARY.md` |

The failure rule was removed in review: `reconcile` relies on the writer contract on `GateWriter`, and `GateRegistry.store.test.ts` pins that a throwing subscriber or collision reporter makes no writer call throw.

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
| Gaps found | 1 |
| Resolved | 1 |
| Escalated | 0 |
