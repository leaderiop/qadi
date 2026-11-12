---
phase: 28-gate-registry-dependency
verified: 2026-11-11T23:45:00Z
status: passed
score: 3/3 roadmap truths verified (plus 11/11 supporting checks)
covered_files:
  - ".planning/phases/28-gate-registry-dependency/28-01-PLAN.md"
  - ".planning/phases/28-gate-registry-dependency/28-01-SUMMARY.md"
  - ".planning/phases/28-gate-registry-dependency/28-02-PLAN.md"
  - ".planning/phases/28-gate-registry-dependency/28-02-SUMMARY.md"
  - ".planning/phases/28-gate-registry-dependency/28-03-PLAN.md"
  - ".planning/phases/28-gate-registry-dependency/28-03-SUMMARY.md"
  - ".planning/phases/28-gate-registry-dependency/28-04-PLAN.md"
  - ".planning/phases/28-gate-registry-dependency/28-04-SUMMARY.md"
  - ".planning/phases/28-gate-registry-dependency/28-05-PLAN.md"
  - ".planning/phases/28-gate-registry-dependency/28-05-SUMMARY.md"
  - "packages/react/src/GateRegistry.ts"
  - "packages/react/src/GateWriter.ts"
  - "packages/react/src/useGate.ts"
  - "packages/react/test/GateWriter.reconcile.test.ts"
  - "packages/react/test/GateWriter.test.tsx"
covered_digest: "v4:sha256:e77b4bb38ba0b82516ac5b5ca57b4462e4118891336327ddddab044153a07f2d"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 28: Gate registry dependency Verification Report

**Phase Goal:** The gate reconcile is testable without React, and the human has decided how far ADR-QD-111 reopens.
**Status:** passed. **Re-verification:** No, initial.

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 28-01's SUMMARY records A, B or C | VERIFIED | `28-01-SUMMARY.md` frontmatter: `d01_outcome: A`, `use_gate_registration: delete`. `_DECISIONS-v1.2.md` row "28-01 T1 (D-01)" reads `A` with the matching reason; the plan's resume signal names that table. |
| 2a | Under A: `reconcile` tested against a fake writer, no React | VERIFIED | `reconcile` is exported from `packages/react/src/GateWriter.ts:210`. That file imports only `import type` from `@qadi/core` and `./DecisionOutcome.ts`, with no `useEffect` or React import (grep). `GateWriter.reconcile.test.ts` imports `vitest` and `@qadi/core` only, with no `renderHook`, and has 12 cases. RED then GREEN: `reconcile` is absent at `8b03a02c^` (grep empty), test commit `8b03a02c` precedes `212dcf48` (feat). |
| 2b | Under A: `GateAtoms` is `Pick<QadiAtoms, …>` | VERIFIED | `useGate.ts:158`: `export type GateAtoms = Pick<QadiAtoms, "decision" | "decisions">;`. Hooks live in `useGate.ts`; `GateScopeContext` there too. |
| 2c | `pnpm circular` green; `QadiAtoms.ts` closure does not reach `useGate.ts` | VERIFIED | `pnpm circular`: "No circular dependency found" (209 files). `QadiAtoms.ts` imports `GateRegistry.ts` (-> `DeveloperSignals.ts`, `GateWriter.ts`, itself type-only imports) and no `useGate.ts`. `useGate.ts` imports `QadiAtoms.ts` as a type. |
| 3 | `useGateRegistration` deleted, tests moved onto `useGateRegistrations` | VERIFIED | `/usr/bin/grep -rnE "useGateRegistration\b"` over packages, examples, apps and features (excluding lib/node_modules/dist): no hits. `GateWriter.test.tsx` imports `useGateRegistrations` from `useGate.ts`; 7 cases, the same count as at the base (`9b44e6b5`). |

## Supporting checks

| Check | Status | Evidence |
|-------|--------|----------|
| Public surface unchanged | VERIFIED | `pnpm spec:api`: 906 exports documented, pass. No change in `index.ts`. Changeset `.changeset/gate-write-side.md` is `@qadi/react` patch, internal only. |
| ADR-QD-140 exists | VERIFIED | `spec/decisions/140-a-gates-write-side-is-a-leaf-below-the-atom-set.md`; `index.yaml` entry "Accepted — amends ADR-QD-111, ADR-QD-080". |
| ADR-QD-111 / ADR-QD-080 dated amendments, status strings | VERIFIED | Both documents' Status row reads "amended by ADR-QD-140"; `index.yaml` lines 280 and 372 agree. ADR-111 has "Amendment (2026-11-11, CCR-QD-418, ARCH-76)" and Change History 1.1. |
| CCR-QD-418, changeset, invariant and traceability updates | VERIFIED | CCR-QD-418 referenced in `spec/invariants.md` and ADR-111; `spec/traceability.md`, `spec/README.md` and `spec/invariants.md` in the diff. `node scripts/spec-revise.mjs --check`: every Revision matches its newest Change History entry. |
| React project tests | VERIFIED | `pnpm vitest run --project react`: 25 files, 416 tests passed. |
| No gate, threshold or script edit | VERIFIED | `git diff --name-only 9b44e6b5 HEAD` outside `.planning` and `spec` lists only `.changeset/gate-write-side.md` and `packages/react/{src,test}` files. No script, config, budget or package.json change. |
| WX-04 style | VERIFIED | Grep of added `packages/react/src` lines found no `as` casts, `any`, `switch`, `fnUntraced`, `async`/`await`, `console`, `process.env`, clock calls or debt markers (hits were prose only). |
| WX-05 mutation not lower | VERIFIED (from recorded JSON; Stryker not re-run per instruction) | Base vs after: GateWriter 0.826 to 0.980, GateRegistry 0.964 to 0.964, useGate 0.800 to 0.824, QadiProvider 0.75 to 0.75, hooks 0.806 to 0.806, MissingQadiProviderError 0.4 to 0.4, aggregate 0.824 to 0.850. None lower. |
| WX-06 RED before GREEN | VERIFIED | Behavior change is a refactor plus a new unit; the reconcile tests were RED on import before `212dcf48`. The stale-handle regression test came after the split with mutation evidence. |
| WX-01 | Accepted from orchestrator | `pnpm check:pr` exit 0 twice, `pnpm spec:verify:strict` PASS 21 / FAIL 0, build and tests green. Not re-run here. |

## Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| GATE-01 | SATISFIED | Truth 1 |
| GATE-02 | SATISFIED | Truth 2a |
| GATE-03 | SATISFIED | Truths 2b, 2c. The requirement's wording ("registry's types live in `GateRegistry.ts`") differs slightly from outcome A: the types live in the leaf `GateWriter.ts` with `GateRegistry.ts` re-exporting the public ones. The human decided A with that exact shape (`_DECISIONS-v1.2.md`), so this is the recorded intent, not a gap. |
| GATE-04 | SATISFIED | Truth 3 |
| WX-01..WX-06 | SATISFIED | Supporting checks above |

No orphaned requirements.

## Anti-Patterns

None blocking. The review's 6 info items (IN-01..IN-06) are open by disposition and were not re-litigated; none touches a must-have.

## Human Verification Required

None.

## Gaps Summary

None. The reconcile is React-free and tested without rendering, the write side is a leaf below the registry, `GateAtoms` is derived from `QadiAtoms`, `useGateRegistration` is gone, the amendments are recorded, and the gates are untouched.

---

_Verified: 2026-11-11T23:45:00Z_
_Verifier: Claude (gsd-verifier)_
