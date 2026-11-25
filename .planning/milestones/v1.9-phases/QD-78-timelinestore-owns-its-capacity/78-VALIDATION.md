---
phase: "QD-78"
slug: timelinestore-owns-its-capacity
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-24"
---

# Phase QD-78 — Validation Strategy

> This record was reconstructed from the plans, the summaries and the tests. Every behavioural requirement was cross-referenced to a test, and those tests were run green:
> - the five touched devtools test files: 176 tests;
> - `surface.tst.ts`: 7 tests and 14 assertions;
> - `pnpm check:pr`: green at 4cfb925b, with 6458 vitest tests.
>
> No new tests were needed: every requirement was already covered by a test the phase wrote first, RED on the base or characterised green there.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (project `devtools`), tstyche, Stryker |
| **Config file** | `vitest.config` project `devtools`, `tsconfig.tstyche.json`, `stryker.devtools.mjs` |
| **Quick run command** | `npx vitest run --project devtools packages/devtools/test/<dir>/<file>` |
| **Full suite command** | `pnpm check:pr` (type tests: `pnpm test:tstyche`) |
| **Estimated runtime** | about 5 s per file; tstyche about 18 s per file per pass |

## Sampling Rate

- **After every task commit:** the touched devtools test file.
- **After every plan wave:** `npx vitest run --project devtools`.
- **Before verify-work:** `pnpm check:pr` green. It was green at 4cfb925b, and `packages/` there is identical to the mutation close head 4d013fbf.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 78-01-* | 01 | 1 | WX-05, WX-06, WX-07 | scorer/record | `78-mutation.mjs` base record (`78-mutation-base.json`, 4 groups); `--self-test` | yes | green |
| 78-02-01 | 02 | 2 | TRSZ-01, TRSZ-03 | regression (RED on base) | `npx vitest run --project devtools packages/devtools/test/model/{Timeline,TimelineStore,TimelineFeed}.test.ts packages/devtools/test/react/useTimeline.test.tsx` | yes | green |
| 78-02-02 | 02 | 2 | TRSZ-03 | regression (RED on base: M55, M56) | `npx vitest run --project devtools packages/devtools/test/model/DockModel.test.ts` | yes | green |
| 78-03-* | 03 | 3 | TRSZ-02, TRSZ-03, WX-06 | characterisation (TF33–TF35, zero bound, UT5) | `npx vitest run --project devtools packages/devtools/test/model/TimelineFeed.test.ts packages/devtools/test/react/useTimeline.test.tsx` | yes | green |
| 78-04-* | 04 | 4 | TRSZ-01, TRSZ-02, TRSZ-03 | unit | `npx vitest run --project devtools packages/devtools/test/model/{TimelineStore,TimelineFeed}.test.ts` (TF4/14/26/27/29 unedited; TF36) | yes | green |
| 78-05-* | 05 | 5 | TRSZ-01, TRSZ-03 | unit (nine resize rules, each shown failing once) | `npx vitest run --project devtools packages/devtools/test/model/{TimelineStore,DockModel}.test.ts` | yes | green |
| 78-06-01/02 | 06 | 6 | TRSZ-01, TRSZ-02 | unit/hook | `npx vitest run --project devtools packages/devtools/test/model/Timeline.test.ts packages/devtools/test/react/useTimeline.test.tsx` | yes | green |
| 78-06-03 | 06 | 6 | TRSZ-01, TRSZ-02 | type test | `pnpm test:tstyche` (`surface.tst.ts`: `resize` signature, `Omit<…, "resize">` refused, `TimelineFeed["timeline"]`) | yes | green |
| 78-07-* | 07 | 7 | TRSZ-04, WX-02 | docs gate | `bash spec/scripts/verify-traceability.sh --strict` (ADR-QD-191, ADR-QD-137 Rev 1.4) | yes | green |
| 78-08-* | 08 | 8 | TRSZ-04, WX-02 | docs gate | strict traceability, `scripts/check-doc-examples.mjs`, `scripts/spec-revise.mjs --check` | yes | green |
| 78-09-* | 09 | 9 | TRSZ-04, WX-02, WX-03 | docs gate | `scripts/check-api-surface.mjs` (942), `scripts/check-website-doc-examples.mjs`, changeset | yes | green |
| 78-10-01 | 10 | 10 | WX-05 | mutation | `78-mutation-close.json`: 0 Survived, 0 NoCoverage in all four files; `compare` clean | yes | green |
| 78-10-02 | 10 | 10 | WX-04, WX-07 | scans | the close scans recorded in 78-10-SUMMARY | yes | green |
| 78-11-* | 11 | 11 | WX-01 | gate | `pnpm check:pr < /dev/null` (green at 4cfb925b) | yes | green |

## Requirement coverage

| Req | Status | Evidence |
|-----|--------|----------|
| TRSZ-01 | COVERED | `TimelineStore.test.ts` `describe("resizing")`: nine rules, each shown failing once; clear-at-current-bound; zero-capacity store notification; `surface.tst.ts` |
| TRSZ-02 | COVERED | `TimelineFeed.test.ts` TF34 (one store, one notification), TF36 (`idleTimeline.resize`); `surface.tst.ts` `TimelineFeed["timeline"]`; UT4/UT5 for the hand-fed hook |
| TRSZ-03 | COVERED | TF4/14/26/27/29 unedited; TF30/TF31 (a refused configure changes nothing); M55/M56 (the dock whole or not at all) |
| TRSZ-04 | COVERED (process) | strict traceability, API surface, both doc-example gates, changeset |
| WX-01..07 | COVERED (process) | gate commands and scans recorded in the 78-01, 78-10 and 78-11 summaries |

## Wave 0 Requirements

None. The test infrastructure existed. 78-02 and 78-03 wrote the failing and characterisation tests on the phase base before any source change, as `78-RED-EVIDENCE.md` records.

## Manual-Only Verifications

None. Every phase behaviour has an automated check.

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s per file
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-24
