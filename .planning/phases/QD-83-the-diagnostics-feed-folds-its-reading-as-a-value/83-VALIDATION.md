---
phase: "QD-83"
slug: "the-diagnostics-feed-folds-its-reading-as-a-value"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-25"
---

# Phase QD-83 — Validation Strategy

> Every requirement (DIAG-01..04, WX-01..07) was cross-referenced to a test or a gate, and the tests were run green on 2026-11-25 at head 13763f9f (after the code review fixes):
> - `pnpm exec vitest run --project devtools` over `Diagnostics.test.ts`, `DiagnosticsFeed.characterisation.test.ts`, `DiagnosticsFeed.superseded.test.ts`, `DiagnosticsFeed.test.ts`, `DockModel.reading.test.ts`: 5 files, 77 tests passed;
> - `pnpm exec tstyche` over `Diagnostics.tst.ts` and `surface.tst.ts`: 2 files, 22 tests, 39 assertions passed (first pass; the second pass runs inside `pnpm check:pr`);
> - `pnpm check:pr < /dev/null` exit 0 (17 of 18 steps, mutation skipped by design; 6628 unit tests, BDD 568, examples 43; strict traceability PASS 21 FAIL 0; api-surface 942 exports), `pnpm spec:package` exit 0 (9 packages, 527 runtime exports). Cited, not re-run;
> - `83-mutation.mjs compare` exit 0 on the re-taken close (DiagnosticsFeed 59/59 with 14 ignored, Diagnostics 32/32 with 6 ignored, DockModel 65/65 with 12 ignored; base DiagnosticsFeed 60/60/14, DiagnosticsStore 57/57/6, DockModel 65/65/12; the drops are killed mutants in deleted code). Stryker was not re-run here.
>
> The review fixes added the raw-sample test (WR-01, in `Diagnostics.test.ts`) and SR1 (WR-02, `DiagnosticsFeed.superseded.test.ts`); each was seen failing in `83-REVIEW-FIX.md`. No validation gap needed a new test, so no test file was added by this audit.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (project `devtools`), `@effect/vitest`, happy-dom; tstyche (two passes); Stryker for mutation |
| **Config file** | `packages/devtools/vitest.config.ts`, `stryker.devtools.mjs` |
| **Quick run command** | `pnpm exec vitest run --project devtools packages/devtools/test/model/Diagnostics.test.ts packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts packages/devtools/test/model/DiagnosticsFeed.superseded.test.ts packages/devtools/test/model/DiagnosticsFeed.test.ts packages/devtools/test/model/DockModel.reading.test.ts < /dev/null` (from the repo root only) |
| **Full suite command** | `pnpm exec vitest run --project devtools < /dev/null`; the phase gate is `pnpm check:pr < /dev/null` plus `pnpm spec:package` and `83-mutation.mjs compare` |
| **Estimated runtime** | about 1 second for the quick run; `pnpm check:pr` about 15 to 20 min |

---

## Sampling Rate

- **After every task commit:** run the quick run command.
- **After every plan wave:** `pnpm exec vitest run --project devtools < /dev/null`, `pnpm test:tstyche` and `pnpm lint`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null`, `pnpm spec:package` green and `83-mutation.mjs compare` exit 0.
- **Max feedback latency:** 60 seconds.

---

## Per-Task Verification Map

| Task ID | Requirement | Automated Command | Status |
|---------|-------------|-------------------|--------|
| 83-01 T1 | WX-05, WX-06 | `83-mutation.mjs` base record (`83-mutation-base.json`), rename-aware scorer | green |
| 83-01 T2 | WX-05, WX-06 | base gate lines compared with fresh runs; `83-earlier-checks.mjs` | green |
| 83-01 T3 | WX-04, WX-06, WX-07 | `node 83-check.mjs --self-test`; `no-store`, `single-fold`, `stale-path` fail on the base tree (`83-RED-EVIDENCE.md`) | green |
| 83-02 T1 | DIAG-01, WX-06 | `node 83-pinned-check.mjs`, planted failure seen | green |
| 83-02 T2 | DIAG-01, WX-06 | phase 81's checks from a scratch copy with the rename declared; seen failing once | green |
| 83-03 T1 | DIAG-01, WX-06 | `pnpm exec vitest run --project devtools packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts` (FC2 green on the base) | green |
| 83-03 T2 | DIAG-01, WX-06 | FC1..FC11 green on the base, seen failing under two scratch edits | green |
| 83-04 T1-T3 | DIAG-04, WX-04 | three `git mv`, typecheck, devtools suite, `83-check.mjs stale-path`; the rename commit pure | green |
| 83-05 T1 | DIAG-03, WX-06 | `Diagnostics.tst.ts` "the reading carries no questions field" and `surface.tst.ts` "the root's Diagnostics holds exactly the four sampled fields", RED on the renamed base | green |
| 83-05 T2 | DIAG-03, WX-03 | pins green after the removal; Breaking `@qadi/devtools` changeset | green |
| 83-05 T3 | DIAG-03, WX-03 | 0.13 upgrade entry, `spec/overview.md` rows, `node scripts/check-package-install.mjs` (gate 14 packed consumer's refusal) | green |
| 83-06 T1 | DIAG-02, WX-06 | `Diagnostics.test.ts` `foldReading` rows seen RED, then green | green |
| 83-06 T2 | DIAG-02, WX-04 | `surface.tst.ts` root refuses `foldReading`, seen failing under a scratch barrel export | green |
| 83-07 T1 | DIAG-01, DIAG-02, WX-06 | `runDiagnostics` sink pins seen RED, store deleted, characterisation rows FC1..FC11 and `DiagnosticsFeed.test.ts` F1..F33 green | green |
| 83-07 T2 | DIAG-02, WX-06 | `surface.tst.ts` root refuses `DiagnosticsSink`, seen failing under a scratch barrel export | green |
| 83-08 T1-T2 | DIAG-04, WX-02 | `bash spec/scripts/verify-traceability.sh --strict` (`FAIL: 0`); ADR-QD-196 written, ADR-QD-173, ADR-QD-169, ADR-QD-047 amended | green |
| 83-09 T1-T3 | WX-02, DIAG-03, DIAG-04 | BEH-QD-751..755, INV-QD-411, INV-QD-412, CCR-QD-475 complete; `node scripts/spec-revise.mjs --check`; strict traceability | green |
| 83-10 T1 | WX-05, WX-06 | Stryker close run; `node 83-mutation.mjs compare` exit 0 | green |
| 83-10 T2 | WX-04, WX-05, WX-06, WX-07, DIAG-01, DIAG-03 | `83-check.mjs` close scans, budgets, earlier checks, edge evidence | green |
| 83-11 T1 | WX-01, WX-03 | `pnpm check:pr < /dev/null` exit 0, then `pnpm spec:package` exit 0 | green |
| 83-11 T2 | WX-03, WX-07, DIAG-01..04 | REQUIREMENTS checkboxes; nothing tagged or released; trailers | green |
| 83-RF-WR01 | DIAG-02 | `Diagnostics.test.ts` "the sample the poll hands the sink carries exactly the four fields it reads" (raw sample, commit `dc6b23c0`) | green |
| 83-RF-WR02 | DIAG-01 | `DiagnosticsFeed.superseded.test.ts` SR1 (commit `cd1e4d0a`); `83-pinned-check.mjs` still holds | green |
| 83-RF-other | DIAG-03, WX-02 | WR-03 comment (`4de493c1`), IN-01 changeset/upgrade (`b5221c9f`), IN-04 wrap (`6348a589`), CCR row (`d01fae8c`), IN-01 iter 2 (`9f081401`); IN-02, IN-03 declined with reasons | green |

*Status: green on every row. The red-first output for each new check and test is in `83-RED-EVIDENCE.md` or `83-REVIEW-FIX.md` (WX-06).*

## Requirement coverage

| Req | Status | Evidence |
|-----|--------|----------|
| DIAG-01 | COVERED | `DiagnosticsFeed.characterisation.test.ts` FC1..FC11 (Off by identity, Starting, Live, first-sample fold, repeat publishes nothing, per-field identity, sampled/unsampled stop, restart, superseded sample FC9, dock questions FC11), green on the base and after; `DiagnosticsFeed.test.ts` F1..F33 (F33 the superseded sample, F16/F28/F29 token guard, F20 `isUnsampled`); `DiagnosticsFeed.superseded.test.ts` SR1; `83-pinned-check.mjs` |
| DIAG-02 | COVERED | `Diagnostics.test.ts` `foldReading` (6 value tests: "returns the previous reading itself for a structurally equal fresh sample", "has a row for every field of the reading", "gives only the field that moved a new reference, for each field", "decides each field by structural equality, not by reference", ...); `runDiagnostics` "the sample the poll hands the sink carries exactly the four fields it reads", "only the field that changed gets a new reference"; `surface.tst.ts` root refuses `foldReading` and `DiagnosticsSink`; `83-check.mjs no-store` and `single-fold`; DiagnosticsFeed 59/59, Diagnostics 32/32 |
| DIAG-03 | COVERED | `Diagnostics.tst.ts` "the reading carries no questions field", "a supplied reading carries its questions"; `surface.tst.ts` "the root's Diagnostics holds exactly the four sampled fields", "the root's DiagnosticsReading carries questions"; `DockModel.reading.test.ts` MR1, MR2; FC11; gate 14 packed consumer; Breaking changeset and 0.13 upgrade entry; DockModel 65/65 |
| DIAG-04 | COVERED | `83-check.mjs stale-path`; the pure rename commit; AGENTS.md §6 `NOT_CALLABLE_PIN_BUDGET` and `scripts/check-house-style.mjs` budget moved together (house-style gate inside `check:pr`); ADR-QD-196 (amends ADR-QD-173; ADR-QD-169 and ADR-QD-047 amended), strict traceability PASS 21 FAIL 0 |
| WX-01 | COVERED (process) | `pnpm check:pr < /dev/null` exit 0 at 13763f9f |
| WX-02 | COVERED (process) | reserved numbers only (ADR-QD-196, BEH-QD-751..755, INV-QD-411, INV-QD-412, CCR-QD-475); `next-id.mjs` never run; strict traceability |
| WX-03 | COVERED (process) | `check-api-surface.mjs` 942 exports; gate 14 probe in `scripts/check-package-install.mjs`; `pnpm spec:package` green |
| WX-04 | COVERED (process) | house-style gate in `check:pr`; `83-check.mjs` scans |
| WX-05 | COVERED | `83-mutation-close.json` against `83-mutation-base.json`, `compare` exit 0; devtools coverage gate inside `check:pr` |
| WX-06 | COVERED | `83-RED-EVIDENCE.md` (every pin and check seen failing once); `83-REVIEW-FIX.md` for WR-01 and SR1 |
| WX-07 | COVERED (process) | `83-check.mjs` id scans and trailers; nothing pushed, merged, tagged or released |

## Wave 0 Requirements

- [x] `DiagnosticsFeed.characterisation.test.ts`: DIAG-01, green on the base, held by `83-pinned-check.mjs`.
- [x] `Diagnostics.test.ts` `foldReading` rows and `Diagnostics.tst.ts` / `surface.tst.ts` pins: DIAG-02, DIAG-03, RED first, recorded in `83-RED-EVIDENCE.md`.
- [x] `83-mutation-base.json`: Stryker base recorded before any source edit.
- [x] `83-check.mjs`, `83-pinned-check.mjs`, `83-mutation.mjs`, each shown failing once.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | n/a | Every behaviour is reached by a headless test, a type test or a gate | n/a |

*Everything has automated verification.*

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s per file
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-25
