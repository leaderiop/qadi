---
phase: "QD-82"
slug: "qadiprovider-s-registry-has-one-owner-for-its-lifetime"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-25"
---

# Phase QD-82 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Seeded from `82-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (project `react`), `@effect/vitest`, happy-dom, `@testing-library/react`; Stryker for mutation |
| **Config file** | `packages/react/vitest.config.ts`, `stryker.react.mjs` |
| **Quick run command** | `pnpm exec vitest run --project react packages/react/test/RegistryLease.test.ts packages/react/test/QadiProvider.lifetime.test.tsx < /dev/null` (from the repo root only) |
| **Full suite command** | `pnpm exec vitest run --project react < /dev/null`; the phase gate is `pnpm check:pr < /dev/null` plus `pnpm spec:package` and `82-mutation.mjs compare` |
| **Estimated runtime** | ~4 seconds for the React suite; `pnpm check:pr` about 15 to 20 min |

---

## Sampling Rate

- **After every task commit:** Run the quick run command.
- **After every plan wave:** Run `pnpm exec vitest run --project react < /dev/null` and `pnpm lint`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` and `pnpm spec:package` green; `82-mutation.mjs compare` exit 0.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

To be filled by the planner per task. These are the requirement-level rows from research.

| Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|-----------------|-----------|-------------------|-------------|--------|
| LEASE-01 | A long hide and reveal throws nothing and renders the client's decision | rendered, RED on base | `pnpm exec vitest run --project react packages/react/test/QadiProvider.lifetime.test.tsx < /dev/null` | ❌ W0 | ⬜ pending |
| LEASE-02 | The lease's rule holds over every state; no open mutant | headless unit + mutation | `pnpm exec vitest run --project react packages/react/test/RegistryLease.test.ts < /dev/null`; `stryker.react.mjs` close | ❌ W0 | ⬜ pending |
| LEASE-03 | Released exactly once on unmount; none used after release; no leak | rendered | `edges.test.tsx` (rewritten `:257`) and the lifetime file | ✅ / ❌ W0 | ⬜ pending |
| LEASE-04 | No superseded seed is resurrected; subject re-seeded before reads; sweep bound holds | rendered | lifetime file | ❌ W0 | ⬜ pending |
| LEASE-05 | Records match the code | spec gates | `pnpm spec:verify:strict`, `pnpm spec:package` | ✅ | ⬜ pending |
| WX-01..07 | Gate green, reserved ids, no export change, house style, mutation, RED-first, no plan-local ids | gate / process | `pnpm check:pr < /dev/null`; `82-check.mjs`; `82-mutation.mjs` | ❌ W0 | ⬜ pending |

Per task (each `<verify><automated>` is a committed script call or a vitest run from the repo root; `<D>` is the phase
directory):

| Task | Requirement | Automated command (core) | Expected at HEAD before the task |
|------|-------------|--------------------------|----------------------------------|
| 82-01 T1 | WX-05, WX-06 | `node <D>82-mutation.mjs --self-test`; the react Stryker base run; `record base react` | fails: no `phase_base` |
| 82-01 T2 | WX-05, WX-06 | gate lines compared with fresh runs; `81-archived-checks.mjs` compared | fails: no `base-facts.txt` |
| 82-01 T3 | LEASE-02, WX-04, WX-07 | `node <D>82-check.mjs --self-test`; `single-owner` fails with its seven reasons | fails: no `82-check.mjs` |
| 82-02 T1 | LEASE-01 | `pnpm exec vitest run --project react packages/react/test/QadiProvider.lifetime.test.tsx` red; `seen-failing` | fails: no lifetime file |
| 82-02 T2 | LEASE-03, WX-06 | the same run, LT2 to LT8 red, LT5 green and failing under scratch | fails: LT2 missing |
| 82-02 T3 | LEASE-01 | the ORDER lines in `82-RED-EVIDENCE.md`; harness absent | fails: no order section |
| 82-03 T1 | LEASE-04 | `-t "LT9 "` red; `seen-failing` | fails: LT9 missing |
| 82-03 T2 | LEASE-04 | `-t "LT1[0-3] "` red | fails: LT10 missing |
| 82-03 T3 | LEASE-03 | LT14, LT15 and `edges.test.tsx` "releases its registry after it unmounts" red | fails: LT14 missing |
| 82-04 T1 | LEASE-02 | `pnpm exec vitest run --project react packages/react/test/RegistryLease.test.ts` (9 passed after, red before) | fails: no lease |
| 82-04 T2 | LEASE-02, WX-05 | `stryker.react.mjs` mutate list; `single-owner` leaves five reasons | fails: lease not mutated |
| 82-05 T1 | LEASE-01, LEASE-03, LEASE-04 | `pnpm exec vitest run --project react`; `single-owner` passes; typecheck | fails: `single-owner` reasons |
| 82-05 T2 | WX-06 | the three variants' failing titles recorded | fails: no variants section |
| 82-05 T3 | LEASE-02 | lease-only Stryker run; `82-mutation.mjs probe lease` exits 0 | fails: no probe log |
| 82-06 T1-T2 | LEASE-05, WX-02 | `node scripts/spec-revise.mjs --check`; `bash spec/scripts/verify-traceability.sh --strict` (`FAIL: 0`) | fails: no ADR-QD-195 |
| 82-07 T1-T2 | LEASE-05, WX-02 | the same, plus `node scripts/check-doc-examples.mjs` | fails: BEH-QD-746 missing |
| 82-08 T1-T2 | LEASE-05, WX-02, WX-03 | `node scripts/check-api-surface.mjs` equal to the base; the CCR row names every changed doc | fails: no changeset |
| 82-09 T1 | WX-05 | two Stryker close runs alone; `node <D>82-mutation.mjs compare` | fails: no close logs |
| 82-09 T2 | WX-04, WX-06, WX-07 | the four `82-check.mjs` scans; archived checks equal; ancestry | fails: no close facts |
| 82-10 T1 | WX-01, WX-03 | `pnpm check:pr < /dev/null` exit 0, then `pnpm spec:package` exit 0 | fails: not run |
| 82-10 T2 | LEASE-01..05, WX-07 | the REQUIREMENTS checkboxes and rows; no tag, CHANGELOG or version change; `trailers` | fails: unchecked |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `packages/react/test/QadiProvider.lifetime.test.tsx`: RED on the base first, output recorded in `82-RED-EVIDENCE.md`.
- [ ] `packages/react/test/RegistryLease.test.ts`: a headless matrix with a fake defer that really cancels, plus one test on the default defer.
- [ ] `stryker.react.mjs`: add the module. The base is recorded before any source edit, over the four existing files.
- [ ] `edges.test.tsx:257`: the host-atom observable, shown failing once with the release skipped.
- [ ] `82-check.mjs` and `82-mutation.mjs`, each shown failing once.

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
