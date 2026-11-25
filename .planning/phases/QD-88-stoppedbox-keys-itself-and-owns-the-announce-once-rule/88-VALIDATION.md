---
phase: "QD-88"
slug: "stoppedbox-keys-itself-and-owns-the-announce-once-rule"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-25"
---

# Phase QD-88 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Built from `88-RESEARCH.md` §Validation
> Architecture. The planner fills the per-task map from the plans.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1.0 (project `devtools`, happy-dom, `@effect/vitest`), fast-check, tstyche for `surface.tst.ts`, Stryker over `src/model/**` |
| **Config file** | `vitest.config.ts` (coverage: model 95%, `src/react/**` 90%), `stryker.devtools.mjs`, `tsconfig.tstyche.json` |
| **Quick run command** | `bash -c 'pnpm exec vitest run --project devtools <file ...> < /dev/null'` |
| **Full suite command** | `bash -c 'pnpm exec vitest run --project devtools < /dev/null'` (109 files, 2086 tests with the prototype and the declared edits) |
| **Phase gate** | `pnpm check:pr < /dev/null`, `88-mutation.mjs` close, `88-earlier-checks.mjs` matching its ledger |
| **Mutation invocation** | `pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/StopLedger.ts < /dev/null` (alone, repo root, clean tree) |
| **Estimated runtime** | ~11 s (devtools suite); a few minutes (the one-file Stryker run) |

---

## Sampling Rate

- **After every task commit:** the touched test files, `pnpm exec tsc -p tsconfig.test.json --noEmit < /dev/null`, and the matching `88-check.mjs` mode
- **After every plan wave:** the full devtools suite, `node scripts/check-house-style.mjs`, `pnpm test:tstyche`, the 88 scripts' self-tests and `88-pinned-check.mjs`
- **Before `/gsd-verify-work`:** `pnpm check:pr` green, the mutation close recorded, `88-earlier-checks.mjs` matching its ledger
- **Max feedback latency:** 30 seconds per task (the Stryker run is a plan-level step)

---

## Requirement → Test Map (from research; task ids filled by the planner)

| Requirement | Behavior | Test Type | File | Base |
|-------------|----------|-----------|------|------|
| SBOX-01 | each feed's stop is announced once, silent on revisits, kept under StrictMode, not remounted by its own record (A1-A5) | component (dock seam) | `test/react/DockFrame.announce.characterisation.test.tsx` (new) | green |
| SBOX-01 | a render thrown away announces nothing (H1); restart followed while the status stays (H2); the notice value is stable (H3); a shown stop adds at most one commit | component (hook) | `test/react/useStopNotice.test.tsx` (new) | green |
| SBOX-01 | DS1-DS3, D7, D8, TN1-TN10, TN13, R1, R2 | component | held unedited | green |
| SBOX-02 | no `key=` on a `StoppedBox`, no `Binding`, no `useRef`/`.current` on the stop path, the ledger module imported only by the box and the hook | script | `88-check.mjs` shape judge | Wave 0 |
| SBOX-03 | the transition, the key, the alert decision, both laws and the property row | unit table + property | `test/model/StopLedger.test.ts` (new) | RED (no module) |
| SBOX-03 | every mutant of `model/StopLedger.ts` killed (4 static ones `EXAMINED`) | mutation | `88-mutation.mjs` | close |
| SBOX-04 | ADR-QD-201, BEH-QD-776..780, INV-QD-421..422, traceability, surface refusals, `UNMEASURED` with scratch variants | scripts, tstyche, spec gates | `88-check.mjs records`, `pnpm test:tstyche`, `pnpm check:pr` | records plan |
| WX-01..07 | gate, ids, changeset, forbidden forms, coverage and mutation, seen-failing, no release | script + gate | `88-check.mjs`, `88-pinned-check.mjs`, `88-mutation.mjs`, `88-earlier-checks.mjs` | Wave 0 |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `88-check.mjs`, `88-pinned-check.mjs`, `88-mutation.mjs`, `88-earlier-checks.mjs`, each with a self-test and each mode seen failing once
- [ ] `88-mutation-base.json` on a clean tree before any edit
- [ ] `88-RED-EVIDENCE.md` with the table test's RED run and one scratch variant per new check (V1-V10, H3's variant, the surface refusal)
- [ ] both characterisation files committed on the base, with the base `test/helpers.ts`

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s per task
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
