---
phase: "QD-88"
slug: "stoppedbox-keys-itself-and-owns-the-announce-once-rule"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
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

| Requirement | Behavior | Test Type | File | Base | Status |
|-------------|----------|-----------|------|------|--------|
| SBOX-01 | each feed's stop is announced once, silent on revisits, kept under StrictMode, not remounted by its own record (A1-A5) | component (dock seam) | `test/react/DockFrame.announce.characterisation.test.tsx` (new) | green | ✅ green |
| SBOX-01 | a render thrown away announces nothing (H1); restart followed while the status stays (H2); the notice value is stable (H3); a shown stop adds at most one commit | component (hook) | `test/react/useStopNotice.test.tsx` (new) | green | ✅ green |
| SBOX-01 | DS1-DS3, D7, D8, TN1-TN10, TN13, R1, R2 | component | held unedited | green | ✅ green |
| SBOX-02 | no `key=` on a `StoppedBox`, no `Binding`, no `useRef`/`.current` on the stop path, the ledger module imported only by the box and the hook | script | `88-check.mjs` shape judge | Wave 0 | ✅ green |
| SBOX-03 | the transition, the key, the alert decision, both laws and the property row | unit table + property | `test/model/StopLedger.test.ts` (new) | RED (no module) | ✅ green |
| SBOX-03 | every mutant of `model/StopLedger.ts` killed (4 static ones `EXAMINED`) | mutation | `88-mutation.mjs` | close | ✅ green |
| SBOX-04 | ADR-QD-201, BEH-QD-776..780, INV-QD-421..422, traceability, surface refusals, `UNMEASURED` with scratch variants | scripts, tstyche, spec gates | `88-check.mjs records`, `pnpm test:tstyche`, `pnpm check:pr` | records plan | ✅ green |
| WX-01..07 | gate, ids, changeset, forbidden forms, coverage and mutation, seen-failing, no release | script + gate | `88-check.mjs`, `88-pinned-check.mjs`, `88-mutation.mjs`, `88-earlier-checks.mjs` | Wave 0 | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Per-task map (filled from the plans)

| Task | Requirement | Automated verify (each task's `<verify>`) | Status |
|------|-------------|--------------------------------------------|--------|
| 88-01-T1 | WX-05 | base record judge, `88-mutation.mjs --self-test`, first-commit check | ✅ |
| 88-01-T2 | SBOX-01, WX-06 | vitest JSON over the dock file: ten A rows passing, each seen failing | ✅ |
| 88-01-T3 | SBOX-01, WX-06 | vitest JSON over both born files: fourteen rows, H1 to H3 and C1 seen failing; tsc | ✅ |
| 88-02-T1 | WX-04, WX-07 | `88-check.mjs --self-test` (incl. `commit` refusing the never-stage list), `base`, `scan-ids`, `scan-forbidden`, `trailers` | ✅ |
| 88-02-T2 | WX-02 | self-test; both shape modes exit 1 on the base; `records` both ways | ✅ |
| 88-02-T3 | WX-06 | twelve `check failed` lines; `commit` | ✅ |
| 88-03-T1 | SBOX-01 | `88-pinned-check.mjs` plain line; `--all-applied` exit 1 | ✅ | ✅ green |
| 88-03-T2 | WX-06 | self-test; five `check failed: pinned` lines; `commit` | ✅ |
| 88-04-T1 | WX-07 | `88-earlier-checks.mjs` on the tree; no earlier directory written | ✅ |
| 88-04-T2 | WX-06 | self-test; seen failing; `commit` | ✅ |
| 88-05-T1 | SBOX-03, WX-06 | table test on disk and uncommitted, module absent; `red before` entry with the current HEAD and the test blob | ✅ |
| 88-05-T2 | SBOX-03 | `suite --partial --passing` L1 to LAW3; three variant sections; tsc; one commit of test, module and evidence carrying the recorded blob, neither source file in its parent; pinned `3 of 3 born` | ✅ | ✅ green |
| 88-06-T1 | SBOX-02, SBOX-03 | whole-project `suite --green`; `box-keys-itself`; `ledger-module`; tsc; house style; pinned `4 of 5` | ✅ |
| 88-06-T2 | SBOX-02 | SB1 to SB4 passing; both Simulator style variants recorded | ✅ | ✅ green |
| 88-06-T3 | SBOX-04, WX-04 | twelve refusals; surface-refusal variant; pinned `--all-applied`; earlier checks; every mode | ✅ |
| 88-07-T1 | SBOX-04, WX-06 | V1 to V5 judged against the variant map | ✅ |
| 88-07-T2 | SBOX-04, WX-06 | V6 to V10, H3, VN1, VN2 judged; every `UNMEASURED` variant id proved | ✅ |
| 88-08-T1 | WX-05 | close record absolute; `compare`; probe seen failing; examined kinds | ✅ |
| 88-08-T2 | WX-03, WX-05 | one patch changeset; coverage; every phase check | ✅ |
| 88-09-T1 | WX-02 | ADR-QD-201 shape; index; CCR row; spec gates; `scan-ids` | ✅ |
| 88-09-T2 | SBOX-04, WX-02 | BEH-QD-776 to 780, INV-QD-421, 422 once each; `records`; spec gates | ✅ |
| 88-09-T3 | WX-02, WX-03 | `records --close`; spec gates; `spec:api`; unmoved docs | ✅ |
| 88-10-T1 | WX-01 | `pnpm check:pr` exit 0 on the recorded head | ✅ |
| 88-10-T2 | WX-07 | every phase check; no-release proofs; commit scope | ✅ |

---

## Wave 0 Requirements

- [x] `88-check.mjs`, `88-pinned-check.mjs`, `88-mutation.mjs`, `88-earlier-checks.mjs`, each with a self-test and each mode seen failing once
- [x] `88-mutation-base.json` on a clean tree before any edit
- [x] `88-RED-EVIDENCE.md` with the table test's RED run and one scratch variant per new check (V1-V10, H3's variant, the surface refusal)
- [x] both characterisation files committed on the base, with the base `test/helpers.ts`

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s per task
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-26 (autonomous run): every requirement maps to a test file or phase check that exists and passed at HEAD `4f62f53d` (devtools 109 files / 2087 tests; the three born files 23 tests; `88-check.mjs --self-test` 286; `box-keys-itself`, `ledger-module`, `records --close`, `scan-ids`, `scan-forbidden`, `trailers` exit 0; pinned 130 held, 3/3 born, 5/5 edits applied; earlier checks 87 self-tests green; mutation `compare` green, `StopLedger.ts` 12/12 killed, 4 ignored examined; `pnpm check:pr` exit 0 on `b1f6616f`, and `b1f6616f..4f62f53d` touches only `.planning/`).

## Validation Audit 2026-11-26

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
