---
phase: "QD-79"
slug: feeds-and-the-dock-model-take-inputs-only-through-configure
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-24"
---

# Phase QD-79 — Validation Strategy

> Every requirement (CONF-01..06, WX-01..07) was cross-referenced to a test or a gate, and the tests were run green on 2026-11-24:
> - the 13 devtools test files named below: 328 tests;
> - `pnpm test:tstyche`: 76 files, 413 passed, 2 skipped (the `FloatingEffectPins` pass-specific blocks), 897 assertions;
> - `79-mutation.mjs compare`: exit 0 against `79-mutation-close.json` (2d742ba9); Stryker was not re-run;
> - `pnpm check:pr`: green after the review on head 92cfd986.
>
> No new tests were needed. CR5, CR10, CR15 and CR21 (the "constructor takes inputs" equivalence cells) were retired by 79-12 when the constructors lost their argument; `79-RED-EVIDENCE.md` records their failing runs.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (project `devtools`), `@effect/vitest`, `@testing-library/react`, happy-dom; tstyche for type pins; Stryker for mutation |
| **Config file** | `packages/devtools/vitest.config.ts` (project `devtools`), `tsconfig.tstyche.json`, `stryker.devtools.mjs` |
| **Quick run command** | `npx vitest run --project devtools packages/devtools/test/<dir>/<file>` (from the repo root) |
| **Full suite command** | `pnpm check:pr < /dev/null` (plus `pnpm spec:package` for gate 14's packed consumer, and the mutation `compare`) |
| **Estimated runtime** | about 5 s per test file; tstyche about 20 s per pass; `pnpm check:pr` about 15 to 20 min |

---

## Sampling Rate

- **After every task commit:** run the touched test file with the quick run command.
- **After every plan wave:** run `npx vitest run --project devtools` and `pnpm test:tstyche`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null` must be green, `pnpm spec:package` must be green, and `79-mutation.mjs compare` must exit 0.
- **Max feedback latency:** 60 seconds per file.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 79-01-* | 01 | 1 | WX-05, WX-06 | scorer/record | `79-mutation.mjs --self-test` (32 passed); `79-mutation-base.json`, five groups | yes | green |
| 79-02-* | 02 | 2 | CONF-01, CONF-04 | characterisation, green on base (C1..C11) | `npx vitest run --project devtools packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx`; `79-characterisation-check.mjs` | yes | green |
| 79-03-* | 03 | 3 | CONF-02, CONF-03 | rule cells on the base (CR1..CR14), `builtFeeds.ts` | `npx vitest run --project devtools packages/devtools/test/model/ConfigureRule.test.ts` | yes | green |
| 79-04-* | 04 | 4 | CONF-02, CONF-03 | rule cells for the dock (CR16..CR22) | `npx vitest run --project devtools packages/devtools/test/model/ConfigureRule.test.ts` | yes | green |
| 79-05-* | 05 | 5 | CONF-02 | feed tests built bare and configured | `npx vitest run --project devtools packages/devtools/test/model/{TimelineFeed,DiagnosticsFeed,GatesFeed}.test.ts` | yes | green |
| 79-06-* | 06 | 6 | CONF-02 | dock tests built bare and configured | `npx vitest run --project devtools packages/devtools/test/model/{DockModel,DockModel.characterisation}.test.ts` | yes | green |
| 79-07-* | 07 | 7 | CONF-02, CONF-03 | unit, type | `npx vitest run --project devtools packages/devtools/test/model/{ConfigureRule,ExternalStore}.test.ts`; `pnpm test:tstyche` (`surface.tst.ts`) | yes | green |
| 79-08-* | 08 | 8 | CONF-03 | unit, type (G43, G44; `ConfigureInputs.tst.ts`) | `npx vitest run --project devtools packages/devtools/test/model/GatesFeed.test.ts`; `pnpm test:tstyche` | yes | green |
| 79-09-* | 09 | 9 | CONF-03, CONF-05 | unit (CR24), type | `npx vitest run --project devtools packages/devtools/test/model/ConfigureRule.test.ts`; `pnpm test:tstyche` | yes | green |
| 79-10-* | 10 | 10 | CONF-04 | hook (U1..U4) | `npx vitest run --project devtools packages/devtools/test/react/useConfigured.test.tsx` | yes | green |
| 79-11-* | 11 | 11 | CONF-04, CONF-05 | type, hook (UT4, UT5) | `pnpm test:tstyche` (`surface.tst.ts`); `npx vitest run --project devtools packages/devtools/test/react/useTimeline.test.tsx` | yes | green |
| 79-12-* | 12 | 12 | CONF-02, CONF-06 | unit, type (bare constructors) | `npx vitest run --project devtools packages/devtools/test/model/ConfigureRule.test.ts`; `pnpm test:tstyche`; gate 14 `scripts/check-package-install.mjs` bare-constructor aliases | yes | green |
| 79-13-* | 13 | 13 | CONF-06, WX-02 | docs gate | strict traceability, `scripts/check-doc-examples.mjs` (ADR-QD-192) | yes | green |
| 79-14-* | 14 | 14 | CONF-06, WX-02 | docs gate, unit (two registry-read cells for the failed-subscribe retry) | strict traceability; `npx vitest run --project devtools packages/devtools/test/react/DockRegistryReads.test.tsx` | yes | green |
| 79-15-* | 15 | 15 | CONF-06, WX-03 | docs gate | `scripts/check-api-surface.mjs`, website doc examples, changeset (Breaking) | yes | green |
| 79-16-* | 16 | 16 | WX-05 | mutation | `79-mutation-close.json`; `node 79-mutation.mjs compare` exit 0 | yes | green |
| 79-17-* | 17 | 17 | WX-01, WX-04, WX-07 | gate | `pnpm check:pr < /dev/null` (green at 92cfd986); `npx vitest run --project devtools packages/devtools/test/model/HeldChoice.test.ts` | yes | green |

*Status: green on every row. A first-run 79-RED-EVIDENCE entry exists for each new check (WX-06).*

## Requirement coverage

| Req | Status | Evidence |
|-----|--------|----------|
| CONF-01 | COVERED | `ConfigureFirstRender.characterisation.test.tsx` C1..C11 (plain and StrictMode; green on base, unedited), `79-characterisation-check.mjs`, `QuestionsPanel.feed.characterisation.test.tsx` |
| CONF-02 | COVERED | `ConfigureRule.test.ts` CR3, CR8, CR13, CR19 (a bare build equals an empty input); the feed and dock tests built bare through `builtFeeds.ts`; gate 14 bare-constructor aliases; `surface.tst.ts` |
| CONF-03 | COVERED | `ConfigureRule.test.ts` CR1, CR2, CR4, CR6, CR7, CR9, CR11, CR12, CR14, CR16..CR20, CR22, CR23 (one identity rule, omitted equals undefined, diagnostics on/off a distinct transition); G43 (re-watch after a failed watch is part of the rule), G44; `ConfigureInputs.tst.ts` (a new field cannot compile without being compared) |
| CONF-04 | COVERED | `useConfigured.test.tsx` U1..U4 (first commit, throw closes the scope, same record configures nothing, hidden `Activity` and StrictMode rebuild with current inputs); C7..C11; UT4, UT5 for `useTimeline`; `DockRegistryReads.test.tsx`. The React 19.2.4 floor is manual-only (below) |
| CONF-05 | COVERED | CR24 (one mapping onto the feeds, the diagnostics interval reaching the gates); `surface.tst.ts` and `ConfigureInputs.tst.ts` (`UseDockModelInput` gone, `DevtoolsDockProps` is `DockModelInputs` plus host props) |
| CONF-06 | COVERED | gate 14 packed consumer, `surface.tst.ts`, compiled README fence and ADR fences (`check-doc-examples.mjs`), website examples, changeset (Breaking), ADR-QD-192 |
| WX-01 | COVERED (process) | `pnpm check:pr < /dev/null` green at 92cfd986 |
| WX-02 | COVERED (process) | strict traceability, ADR-QD-192 and its CCR row, reserved numbers only |
| WX-03 | COVERED (process) | `check-api-surface.mjs`; gate 14 probes every changed `make*Feed` |
| WX-04 | COVERED (process) | house-style gate in `pnpm check:pr`; `HeldChoice.test.ts` |
| WX-05 | COVERED | `79-mutation-close.json`, `compare` exit 0; coverage thresholds in `check:pr` |
| WX-06 | COVERED | `79-RED-EVIDENCE.md`: a failing run for every new cell and the review fixes (IN-02, WR-01); `79-pinned-check.mjs` for the 15 pinned tests |
| WX-07 | COVERED (process) | house-style `[no-numbering-placeholder]` and title scans in `check:pr`; nothing released |

## Wave 0 Requirements

- [x] `ConfigureFirstRender.characterisation.test.tsx`: CONF-01, written and green on the base (79-02).
- [x] The Activity, StrictMode and first-configure-throw pins: CONF-04 (C2, C7..C11, U2, U4).
- [x] `packages/devtools/test/builtFeeds.ts`: the "build bare, then configure" helpers (79-03).
- [x] `79-mutation.mjs` with `79-mutation-base.json` (79-01).

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| The Activity pins on React 19.2.4 (the peer floor) | CONF-04 | The repo installs 19.3.1, and a React version matrix is not part of `pnpm check` | Deferred; recorded as a risk in ADR-QD-192 |

*Everything else has automated verification.*

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s per file
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-24
