---
phase: "QD-81"
slug: the-dock-model-applies-every-input-whatever-a-listener-throws
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-25"
---

# Phase QD-81 — Validation Strategy

> Every requirement (COLL-01..06, WX-01..07) was cross-referenced to a test or a gate, and the tests were run green on 2026-11-25 at head daf7cd45 (after the three review-fix iterations):
> - the 11 devtools test files named below: 287 tests;
> - `81-pinned-check.mjs --all-applied` (8 files hold their base text, 4 of 4 flips), `81-check.mjs single-source`, `scan-ids`, `scan-forbidden`, `trailers` (37 plan commits): all hold;
> - `pnpm check:pr < /dev/null` exit 0 (17 of 18 steps; 6585 unit tests, BDD 568, examples 43), `pnpm spec:package` exit 0 (9 packages, 527 runtime exports);
> - `81-mutation.mjs compare` exit 0 on the recorded close (ExternalStore 84/84, DockModel 65/65, TimelineFeed 37/37, DiagnosticsFeed 60/60, SimulationSession 244/250 with the base's 6 survivors); no `packages/devtools/src` file changed after the close, so Stryker was not re-run here.
>
> The review fixes added `TimelineFeed.listeners.test.ts` (LF1..LF3) and DL18..DL20; each was seen failing once by a scratch source edit (recorded in `81-REVIEW-FIX.md`). No validation gap needed a new test.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (project `devtools`), `@effect/vitest`, happy-dom; Stryker for mutation |
| **Config file** | `packages/devtools/vitest.config.ts`, `stryker.devtools.mjs` |
| **Quick run command** | `pnpm exec vitest run --project devtools <file> < /dev/null` (from the repo root only) |
| **Full suite command** | `pnpm check:pr < /dev/null` (plus `pnpm spec:package` and `81-mutation.mjs compare`) |
| **Estimated runtime** | under 2 s per test file; `pnpm check:pr` about 15 to 20 min |

---

## Sampling Rate

- **After every task commit:** run the touched test file with the quick run command.
- **After every plan wave:** run `pnpm exec vitest run --project devtools packages/devtools/test/model`.
- **Before `/gsd-verify-work`:** `pnpm check:pr < /dev/null`, `pnpm spec:package` green and `81-mutation.mjs compare` exit 0.
- **Max feedback latency:** 60 seconds per file.

---

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|-------------|-----------|-------------------|-------------|--------|
| 81-01-* | 01 | COLL-03, WX-04..07 | check helpers, mutation base | `81-check.mjs` (self-test 125); `81-mutation.mjs` (self-test 28); `81-mutation-base.json`; `81-archived-checks.mjs` | yes | green |
| 81-02-* | 02 | COLL-01, COLL-02, COLL-04, COLL-05, WX-06 | regression (13 red on base) | `pnpm exec vitest run --project devtools packages/devtools/test/model/DockModel.listeners.test.ts` | yes | green |
| 81-03-* | 03 | COLL-05, WX-06 | regression (TF28/TF29/F31 flipped; TF37, SR6, G49 added) | `pnpm exec vitest run --project devtools packages/devtools/test/model/{TimelineFeed,DiagnosticsFeed,SimulationSession.runs,GatesFeed}.test.ts`; `81-pinned-check.mjs` | yes | green |
| 81-04-* | 04 | COLL-03, WX-04, WX-06 | unit (TDD, 8 red on base) | `pnpm exec vitest run --project devtools packages/devtools/test/model/ExternalStore{.callAll,}.test.ts` | yes | green |
| 81-05-* | 05 | COLL-03, COLL-05 | fix, regression | the 81-03 files; TF28, TF29, TF37, F31, SR6, G49 green | yes | green |
| 81-06-* | 06 | COLL-01..05 | fix, regression | `DockModel.listeners`, `DockModel`, `DockModel.characterisation`, `ConfigureRule` (CR22 restated from measured counts); `81-check.mjs single-source` | yes | green |
| 81-07-* | 07 | COLL-06, WX-02 | docs gate | strict traceability; ADR-QD-194, amendments to ADR-QD-177/185/191/192 | yes | green |
| 81-08-* | 08 | COLL-04, COLL-06, WX-02 | docs gate | strict traceability; BEH-QD-741..745, INV-QD-407/408, restated records | yes | green |
| 81-09-* | 09 | COLL-06, WX-02, WX-03 | docs gate | `check-doc-examples`, `check-website-doc-examples`, `check-api-surface.mjs` (942 exports, unchanged); patch changeset | yes | green |
| 81-10-* | 10 | COLL-04, WX-04..07 | mutation, scans | `81-mutation-close.json`; `81-mutation.mjs compare` exit 0; F33 closes the one new survivor; archived checks (TF29 the only 79-pinned failure) | yes | green |
| 81-11-* | 11 | WX-01, WX-03, COLL-01..06 | gate | `pnpm check:pr < /dev/null`; `pnpm spec:package` | yes | green |
| 81-RF-* | review fixes (iter 1..3) | COLL-01, COLL-02, COLL-03, COLL-05, COLL-06, WX-06 | unit, docs | DL10 (lens not called), DL18..DL20, TF37 two-read pin, `TimelineFeed.listeners.test.ts` LF1..LF3; spec records restated under CCR-QD-473 | yes | green |

*Status: green on every row. A first-run entry in `81-RED-EVIDENCE.md` or `81-REVIEW-FIX.md` exists for each new check and test (WX-06).*

## Requirement coverage

| Req | Status | Evidence |
|-----|--------|----------|
| COLL-01 | COVERED | `DockModel.listeners.test.ts` DL1..DL11 (a throwing listener on each store a `configure` notifies leaves every input applied and is rethrown; DL10 the lens, never notified; DL11 the store sweep), red on the base (81-02) |
| COLL-02 | COVERED | DL15 (record path: the simulation and the dock follow the timeline), DL20 (a throwing listener on a record ends the read, `Stopped`), `TimelineFeed.listeners.test.ts` LF1, LF2 |
| COLL-03 | COVERED | `ExternalStore.callAll.test.ts` (8 tests), DL12..DL14, DL18, DL19, LF3; `81-check.mjs single-source` (one collect loop, in `callAll`); `callAll` absent from both barrels |
| COLL-04 | COVERED | DL16 (rail published once each), CR22 restated from measured counts, M55 and M56 held unedited by `81-pinned-check.mjs`; DockModel mutation 65/65 |
| COLL-05 | COVERED | TF28, TF29 (flipped), TF37 (nested configure, two reads pinned), F31, SR6, G49, DL17; F33 pins the diagnostics stale-run guard |
| COLL-06 | COVERED (docs) | ADR-QD-194 1.3, amendments to ADR-QD-177/185/191/192, BEH-QD-741..745, INV-QD-407/408, CCR-QD-473; strict traceability 21/21 |
| WX-01 | COVERED (process) | `pnpm check:pr < /dev/null` exit 0 at daf7cd45 |
| WX-02 | COVERED (process) | reserved numbers only (ARCH-128, ADR-QD-194, CCR-QD-473, BEH-QD-741..745, INV-QD-407..408); `next-id.mjs` never run |
| WX-03 | COVERED (process) | no export changed (`check-api-surface.mjs` 942, `spec/overview.md` equal to the base); `pnpm spec:package` green |
| WX-04 | COVERED (process) | house-style gate in `check:pr`; `81-check.mjs scan-forbidden` |
| WX-05 | COVERED | `81-mutation-close.json`, `compare` exit 0; devtools coverage `src/model` 99.85 / 99.47 / 99.86 / 99.94 |
| WX-06 | COVERED | `81-RED-EVIDENCE.md`: every regression test red on the base, every new check seen failing once; review-fix tests seen failing in `81-REVIEW-FIX.md` |
| WX-07 | COVERED (process) | `81-check.mjs scan-ids`; house-style placeholder rule; nothing pushed, merged, tagged or released |

## Wave 0 Requirements

- [x] `DockModel.listeners.test.ts`: COLL-01, COLL-02, COLL-04, COLL-05, written and red on the base (81-02).
- [x] TimelineFeed, DiagnosticsFeed, SimulationSession.runs and GatesFeed regressions: COLL-05 (81-03).
- [x] `ExternalStore.callAll.test.ts`: COLL-03, test first (81-04).
- [x] `81-check.mjs`, `81-mutation.mjs` with `81-mutation-base.json`, `81-pinned-check.mjs` (81-01, 81-03).

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | Every behaviour in this phase is in the headless model and reached by a test | — |

*Everything has automated verification.*

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s per file
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-25
