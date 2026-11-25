---
phase: "QD-77"
slug: an-audit-row-is-a-value-only-its-codec-makes
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-24"
---

# Phase QD-77 — Validation Strategy

> Reconstructed from the plans, summaries and tests; every behavioural requirement was cross-referenced to a test and the tests were run green (8 audit files, 185 tests; ArchiveFacts 19; tstyche 75 files). No new tests were needed.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 5.1 (project `audit`), tstyche, Stryker |
| **Config file** | `vitest.config` project `audit`, `tsconfig.tstyche.json`, `stryker.audit.mjs` |
| **Quick run command** | `npx vitest run --project audit packages/audit/test/<file>` |
| **Full suite command** | `pnpm check:pr` (type tests: `pnpm test:tstyche`) |
| **Estimated runtime** | ~5 s per file; tstyche ~20 s |

## Sampling Rate

- **After every task commit:** the touched audit test file
- **After every plan wave:** `npx vitest run --project audit` plus `pnpm test:tstyche`
- **Before verify-work:** `pnpm check:pr` green (green at 7a1a8e60)

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 77-01-* | 01 | 1 | WX-05, WX-06, WX-07 | scorer/record | `77-mutation.mjs` base record (`77-mutation-base.json`) | yes | green |
| 77-02-01 | 02 | 2 | AROW-01 | regression | `npx vitest run --project audit packages/audit/test/ArchiveWriterInputs.test.ts` | yes | green |
| 77-02-02 | 02 | 2 | AROW-04 | characterisation matrix | `npx vitest run --project audit packages/audit/test/AuditEntry.characterisation.test.ts` | yes | green |
| 77-02-03 | 02 | 2 | WX-06 | gate | gate 13 `scripts/check-api-surface.mjs` (shown failing once) | yes | green |
| 77-03-* | 03 | 3 | AROW-01..05 | unit/property | `npx vitest run --project audit packages/audit/test/{ArchiveRoundTrip,AuditArchive,AuditEntry,SequenceIntegrity,Retention,ArchiveFacts,UntrustedSeams}.test.ts` | yes | green |
| 77-04-01 | 04 | 4 | AROW-02 | type test | `pnpm test:tstyche` (`AuditEntry.tst.ts`, `@ts-expect-error` negatives + twin) | yes | green |
| 77-04-02 | 04 | 4 | AROW-01, AROW-05 | property | `npx vitest run --project audit packages/audit/test/ArchiveRoundTrip.test.ts` | yes | green |
| 77-05-* | 05 | 5 | AROW-06, WX-02 | docs gate | spec strict check (ADR-QD-190, amendments) | yes | green |
| 77-06-* | 06 | 6 | AROW-06, WX-02, WX-03 | docs gate | spec strict check, gate 13, changeset | yes | green |
| 77-07-01 | 07 | 7 | WX-05 | mutation | `77-mutation-close.json` (100% of valid mutants, 4 groups) | yes | green |
| 77-07-02 | 07 | 7 | WX-04, WX-07 | scans | close scans; re-scan of the diff vs base 4d0d3627 found no `as`/`any`/`switch`/`async`/`let`/plan ids in added code | yes | green |
| 77-07-03 | 07 | 7 | WX-01 | gate | `pnpm check:pr` (green at 7a1a8e60, not re-run) | yes | green |

## Requirement coverage

| Req | Status | Evidence |
|-----|--------|----------|
| AROW-01 | COVERED | ArchiveWriterInputs.test.ts, ArchiveRoundTrip.test.ts (NaN `now`, keyMaterial, writer-domain properties) |
| AROW-02 | COVERED | AuditEntry.tst.ts (4 nominal + 2 missing-member negatives), AuditEntry.test.ts byte/Equal checks |
| AROW-03 | COVERED | characterisation test: assign `sequenceNumber` through the decode route, bytes carry it |
| AROW-04 | COVERED | characterisation matrix incl. bad record + bad sequence + extra key; UntrustedSeams.test.ts |
| AROW-05 | COVERED | ArchiveFacts.test.ts, Retention.test.ts, record-domain round-trip property |
| AROW-06 | COVERED (process) | spec strict check, changeset |
| WX-01/02/04/05/07 | COVERED (process) | gate commands and scans recorded in SUMMARYs |

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

## Manual-Only Verifications

All phase behaviors have automated verification. The doc prose of ADR-QD-190 and the upgrade guide is reviewed by reading, gated structurally by the spec checks.

## Validation Sign-Off

- [x] All requirements have automated verification
- [x] No 3 consecutive tasks without automated verify
- [x] No watch-mode flags
- [x] `nyquist_compliant: true`

**Approval:** validated 2026-11-24
