---
phase: "QD-80"
slug: the-highlight-lens-is-a-headless-session-instrument-resolved
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-24"
---

# Phase QD-80 — Validation Strategy

> Every requirement (LENS-01..05, WX-01..07) was cross-referenced to a test or a gate, and the tests were run green on 2026-11-24 at head 2eff29ae:
> - the 9 devtools test files named below: 170 tests; the 2 react files: 3 tests;
> - `pnpm test:tstyche`: 77 files, 415 passed, 2 skipped (the `FloatingEffectPins` pass-specific blocks), 900 assertions;
> - `80-characterisation-check.mjs` and `80-pinned-check.mjs`: both hold;
> - `pnpm check:pr < /dev/null` green (6550 tests, BDD 568, example 43), `pnpm spec:package` green;
> - mutation re-closed on 71b7b983: DockModel 69/69 vs base 69/69, LensSession 52/52, `80-mutation.mjs compare` exit 0; Stryker was not re-run here.
>
> No new tests were needed, so no new file enters the mutation scope.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (projects `devtools`, `react`), `@effect/vitest`, `@testing-library/react`, happy-dom; tstyche for type pins; Stryker for mutation |
| **Config file** | `packages/devtools/vitest.config.ts`, `tsconfig.tstyche.json`, `stryker.devtools.mjs` |
| **Quick run command** | `pnpm exec vitest run --project devtools <file> < /dev/null` (from the repo root only) |
| **Full suite command** | `pnpm check:pr < /dev/null` (plus `pnpm spec:package` and `80-mutation.mjs compare`) |
| **Estimated runtime** | under 5 s per test file; tstyche about 10 s; `pnpm check:pr` about 15 to 20 min |

---

## Sampling Rate

- **After every task commit:** run the touched test file with the quick run command.
- **After every plan wave:** run `pnpm exec vitest run --project devtools` and `pnpm test:tstyche`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null`, `pnpm spec:package` green and `80-mutation.mjs compare` exit 0.
- **Max feedback latency:** 60 seconds per file.

---

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|-------------|-----------|-------------------|-------------|--------|
| 80-01-* | 01 | LENS-02, LENS-05, WX-05..07 | check helper, mutation base | `80-check.mjs`; `80-mutation-base.json` | yes | green |
| 80-02-* | 02 | LENS-03, LENS-04, WX-06 | characterisation (4 flips) | `pnpm exec vitest run --project devtools packages/devtools/test/react/Lens.dock.characterisation.test.tsx`; `80-characterisation-check.mjs` | yes | green |
| 80-03-* | 03 | LENS-04, LENS-05, WX-06 | characterisation (react) | `pnpm exec vitest run --project react packages/react/test/{InstrumentToggle.characterisation,GateId.remount}.test.tsx` | yes | green |
| 80-04-* | 04 | LENS-03, WX-06 | regression, pinned tests | `pnpm exec vitest run --project devtools packages/devtools/test/react/{Lens.dock,QuestionsPanel.gates}.test.tsx`; `80-pinned-check.mjs` | yes | green |
| 80-05-* | 05 | LENS-01, LENS-04 | unit (headless session) | `pnpm exec vitest run --project devtools packages/devtools/test/model/LensSession.test.ts` | yes | green |
| 80-06-* | 06 | LENS-02 | unit (tenth store, store-list sweep) | `pnpm exec vitest run --project devtools packages/devtools/test/model/{DockModel,ConfigureRule}.test.ts` | yes | green |
| 80-07-* | 07 | LENS-03, LENS-04 | adapter, click, dock | `pnpm exec vitest run --project devtools packages/devtools/test/react/{Lens.adapter,Lens.click,Lens.dock,Lens}.test.*` | yes | green |
| 80-08-* | 08 | LENS-05 | type pin | `pnpm test:tstyche` (`packages/react/test/QadiProvider.tst.ts`, `@ts-expect-error` on `instrument`) | yes | green |
| 80-09-* | 09 | WX-02, LENS-02, LENS-04, LENS-05 | docs gate | strict traceability; ADR-QD-193 and amendments | yes | green |
| 80-10-* | 10 | WX-02, LENS-01, LENS-03..05 | docs gate | strict traceability; BEH-QD-736..740, INV-QD-405/406 | yes | green |
| 80-11-* | 11 | WX-02, WX-03, LENS-05 | docs gate | `scripts/check-api-surface.mjs`; compiled upgrade fence; changesets | yes | green |
| 80-12-* | 12 | WX-04..07, LENS-02 | mutation, scans | `80-mutation-close.json`; `node 80-mutation.mjs compare` exit 0; `80-check.mjs` scans | yes | green |
| 80-13-* | 13 | WX-01, WX-07 | gate | `pnpm check:pr < /dev/null`; `pnpm spec:package` | yes | green |
| 80-RF-* | review fixes (iter 1..3) | LENS-03, LENS-04, WX-05, WX-06 | unit, mutation | the files above; `80-RED-EVIDENCE.md` `## review fixes` | yes | green |

*Status: green on every row. A first-run 80-RED-EVIDENCE entry exists for each new check (WX-06).*

## Requirement coverage

| Req | Status | Evidence |
|-----|--------|----------|
| LENS-01 | COVERED | `LensSession.test.ts` (toggle, hover, choose consumed or not, cancel, highlight), under the mutation gate (52/52) |
| LENS-02 | COVERED | `DockModel.test.ts` store-list test with `lens`, the bare-model idle cell, the per-store sweep in `ConfigureRule.test.ts`; DockModel mutation 69/69 vs base 69/69 |
| LENS-03 | COVERED | `Lens.adapter.test.tsx`, `Lens.click.test.ts` (synchronous swallow), `Lens.dock.test.tsx` (listeners not re-added), `QuestionsPanel.gates.test.tsx` and `Lens.test.ts` held by `80-pinned-check.mjs`; `Lens.dock.characterisation.test.tsx` held by `80-characterisation-check.mjs` |
| LENS-04 | COVERED | `Lens.dock.characterisation.test.tsx` (pick kept across a tab switch, highlight ends picking, same hover same overlay), `LensSession.test.ts`, StrictMode cell in `Lens.dock.test.tsx`; ADR-QD-193 |
| LENS-05 | COVERED | `QadiProvider.tst.ts` (`instrument` is not a context field), `InstrumentToggle.characterisation.test.tsx` (toggle gives no re-render), `GateId.remount.test.tsx`; Breaking changeset, upgrade entry, overview row |
| WX-01 | COVERED (process) | `pnpm check:pr < /dev/null` exit 0 |
| WX-02 | COVERED (process) | strict traceability; ADR-QD-193, CCR-QD-472, reserved numbers only |
| WX-03 | COVERED (process) | `check-api-surface.mjs`; `pnpm spec:package` |
| WX-04 | COVERED (process) | house-style gate in `check:pr`; `80-check.mjs` forbidden scan |
| WX-05 | COVERED | `80-mutation-close.json`, `compare` exit 0; coverage thresholds in `check:pr` |
| WX-06 | COVERED | `80-RED-EVIDENCE.md`: a failing run per new check and per review fix; `80-characterisation-check.mjs`, `80-pinned-check.mjs` |
| WX-07 | COVERED (process) | `80-check.mjs` scan-ids; house-style placeholder rule; nothing released |

## Wave 0 Requirements

- [x] `Lens.dock.characterisation.test.tsx`: LENS-03, LENS-04, written and green on the base (80-02).
- [x] `InstrumentToggle.characterisation.test.tsx`, `GateId.remount.test.tsx`: LENS-05 (80-03).
- [x] `80-check.mjs`, `80-mutation.mjs` with `80-mutation-base.json` (80-01).

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keyboard-initiated click placement (Enter or Space on a focused guard) in real browsers | LENS-03 | happy-dom does not model where a keyboard click lands | Open the dock in Chrome, Firefox and Safari, press picking, press Enter on a focused guard, check it is picked once. Hover and choose from idle are reached headlessly only |
| React 19.2.4 (the peer floor) | LENS-03, LENS-04 | The repo installs 19.3.1; a React matrix is not in `pnpm check` | Deferred; recorded as a risk in ADR-QD-193 |

*Everything else has automated verification.*

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s per file
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-24
