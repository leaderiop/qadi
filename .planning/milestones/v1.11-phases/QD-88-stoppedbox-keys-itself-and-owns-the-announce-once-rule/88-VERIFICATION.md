---
phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
verified: 2026-11-26T01:55:00Z
status: passed
score: 11/11 must-haves verified
covered_files:
  - .changeset/devtools-stop-box-keys-itself.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-01-PLAN.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-01-SUMMARY.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-02-PLAN.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-02-SUMMARY.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-03-PLAN.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-03-SUMMARY.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-04-PLAN.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-04-SUMMARY.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-05-PLAN.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-05-SUMMARY.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-06-PLAN.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-06-SUMMARY.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-07-PLAN.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-07-SUMMARY.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-08-PLAN.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-08-SUMMARY.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-09-PLAN.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-09-SUMMARY.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-10-PLAN.md
  - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-10-SUMMARY.md
  - packages/devtools/src/model/StopLedger.ts
  - packages/devtools/src/react/DiagnosticsNotice.tsx
  - packages/devtools/src/react/StoppedBox.tsx
  - packages/devtools/src/react/TimelineNotice.tsx
  - packages/devtools/src/react/useStopNotice.ts
  - spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md
  - spec/decisions/201-a-stop-notices-box-keys-itself-and-owns-the-announce-once-rule.md
covered_digest: "v4:sha256:f537e2f826ac56c4fa2faaf6cc9e12f0a7c1cb5c15770789b78a867de4d8bcd4"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 88: `StoppedBox` keys itself and owns the announce-once rule — Verification Report

**Phase Goal:** `StoppedBox` derives its own key and owns the announce-once ledger, so callers stop computing `stoppedKey` from a ref during render and stop threading the ledger through private bindings, while a stop is still announced once per stop.
**Verified:** 2026-11-26 at HEAD `b05f25b6` (phase base `892c4d36`, planning head `947bb0a3`)
**Status:** passed
**Re-verification:** No — initial verification

Judged against the decided intent of `88-CONTEXT.md` (D-06 "remove the ref read", not the roadmap's "relocate"; D-07 the
ledger stays in `useStopNotice`, called per feed by `DockFrame`, so `DevtoolsDock.tsx` is unchanged; the roadmap's line
numbers predate Phase 87 and were re-read at HEAD). The roadmap's "the box writes the ledger" holds as "the box records
through the per-feed reducer's dispatch at commit"; the ledger is held above the screens, as SC2 itself requires.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1 / SBOX-01: a characterisation written on the base pins announce-once (once per stop, silent on a tab switch, kept under StrictMode), with TN14, D7 and the `DockFrame` stop characterisation | ✓ VERIFIED | `DockFrame.announce.characterisation.test.tsx` (A1-A5, each plain and `[StrictMode]`) committed `22840399` and `useStopNotice.test.tsx` (H1-H3, C1) committed `fb404767`, both before the refactor `e0a5c709`; `git log` shows neither touched since. DS1-DS3, D7/D8, R1/R2 last edited before the phase (`b20c2311` and earlier). TN14 kept (retitled within its declared region, re-homed to LAW2 + A3 in ADR-QD-201's audit). `88-pinned-check.mjs --all-applied` exit 0: "130 files hold their base text, 3 of 3 born files held, 5 of 5 declared edits applied". All rows green in the HEAD suite run. |
| 2 | SC2 / SBOX-02: `StoppedBox` derives its own key (outer wrapper over a keyed inner body) | ✓ VERIFIED | `StoppedBox.tsx:93-98`: `StoppedBox` renders `<StoppedBody key={stoppedKey(props.notice.announced.ledger, props.notice.status)} {...props} />`; `StoppedBody` (100) is module-private (not exported). |
| 3 | SC2: callers no longer call `stoppedKey` or thread the ledger through private bindings | ✓ VERIFIED | `TimelineNotice.tsx:25-46` and `DiagnosticsNotice.tsx:74-107`: each arm takes `notice` whole and passes `notice={notice}`; no `key=`, no `Binding`, no `stoppedKey` import (grep: `stoppedKey` imported only by `StoppedBox.tsx`). `88-check.mjs box-keys-itself` exit 0. |
| 4 | SC2: the ledger stays above the screens, one per feed, outliving tab switches | ✓ VERIFIED | `useStopNotice.ts:19` holds `useReducer(recordStop, noStops)` per call; `DevtoolsDock.tsx` unchanged across the phase (`git diff 892c4d36..HEAD` empty), so `DockFrame` still calls it once per feed. Behaviour: A1/A2 (both feeds, tab switches, StrictMode), DS1-DS3 green. |
| 5 | SC3 / SBOX-03: the ledger transition is a pure function with a table test | ✓ VERIFIED | `model/StopLedger.ts`: `recordStop`, `stoppedKey`, `announcesStop`, no React import, no JSX. `test/model/StopLedger.test.ts` L1-L6, LAW1-LAW2 over the table, LAW3 a fast-check property; red-before-module run recorded in `88-RED-EVIDENCE.md` (§88-05, "Failed to resolve import …StopLedger.ts"). `88-mutation.mjs compare` exit 0: `StopLedger.ts 12/12, survived 0, no coverage 0, ignored 4` (the four static mutants examined by hand). |
| 6 | SC3: the alert is decided at mount and recorded at commit, never written during render; no render-phase ref read | ✓ VERIFIED | `StoppedBox.tsx:113` `useState(() => announcesStop(announced.ledger, status))` reads a prop, not a ref; `114-116` `useLayoutEffect(() => { announced.record(status); }, [announced.record, status])`. No `useRef`/`.current` on the four stop-path files (the one `.current` hit is `event.currentTarget`). Behaviour: H1 (a thrown-away render announces nothing) and A1-A5 `[StrictMode]` green; C1 green (at most one extra commit). |
| 7 | SC3: no module-scope ledger | ✓ VERIFIED | `noStops` is a `const` frozen-shape literal; no `let`/`var` in the touched files; `88-check.mjs scan-forbidden` and `ledger-module` exit 0; `MODULE_STATE_BUDGET` unchanged (AGENTS.md not in the phase diff). |
| 8 | SC4 / SBOX-04: ADR-QD-201 new, ADR-QD-197 amended (1.5), BEH-QD-776..780, INV-QD-421..422, traceability and CCR-QD-480 record the change, consistent with the code | ✓ VERIFIED | `spec/decisions/201-…md` decisions 1-8 match the code verbatim (reducer, memo deps `[status, onRestart, ledger, record]`, wrapper key, `useState` initializer, block-body layout effect keyed on `record`); audit table with `Tests removed: 0`. ADR-QD-197 Rev 1.5 amendment on decision 4. BEH-QD-776..780 at `28-devtools-screens.md:4417-4567`; BEH-QD-759 restated for the reducer; BEH-QD-509 links 776/777 (1557). INV-QD-421/422 at `invariants.md:4916/4928`. Traceability rows 109-113, 311-312, 501, 688-700; `index.yaml` ADR-QD-201 entry and 197 status; CCR-QD-480 row `spec/README.md:417`. `88-check.mjs records --close` exit 0. |
| 9 | SC4: the unmeasured React files are listed in `UNMEASURED` and each proved with a scratch variant | ✓ VERIFIED | `88-mutation.mjs:66-71` lists `StoppedBox.tsx`, `useStopNotice.ts`, `TimelineNotice.tsx`, `DiagnosticsNotice.tsx`, each with its pinning rows and variants (V1-V10, H3, VN1, VN2); each variant's failing rows recorded in `88-RED-EVIDENCE.md` §88-07. |
| 10 | Barrels and public surface unchanged; the ledger module imported in src only by the box and the hook | ✓ VERIFIED | `git diff 892c4d36..HEAD` on `src/index.ts`, `src/react/index.ts` empty. `grep StopLedger packages/*/src`: importers are `StoppedBox.tsx:20` and `useStopNotice.ts:14` only. `surface.tst.ts` refuses the six new names from both entries. Patch changeset `.changeset/devtools-stop-box-keys-itself.md` ("No export changes."). |
| 11 | Cross-cutting WX-01..07 hold (gate green, reserved ids only, no forbidden forms, coverage/mutation, characterisation first, no ids in source/tests, nothing released) | ✓ VERIFIED | `pnpm check:pr` exit 0 on `b965d953` (orchestrator-reported; only `88-REVIEW-DISPOSITION.md` changed after it, confirmed by `git diff --stat b965d953..HEAD`). `scan-ids`, `scan-forbidden`, `trailers` (45 commits) exit 0. `88-earlier-checks.mjs` exit 0 (the 85/86 `scan-ids` and 87 pinned reports are in its expected ledger, each explained). No tag; branch has no upstream and no `origin/arch-wave-16`; no `package.json`/`CHANGELOG` change; no `.planning/milestones`, `config.json`, root `README.md`, `.agents`, `.codex` path in any phase commit. |

**Score:** 11/11 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/devtools/src/model/StopLedger.ts` | pure ledger: `StopLedger`, `noStops`, `stoppedKey`, `announcesStop`, `recordStop` | ✓ VERIFIED | 50 lines, React-free, measured by Stryker, imported by box and hook |
| `packages/devtools/src/react/StoppedBox.tsx` | wrapper keys module-private body; alert at mount; record at commit | ✓ VERIFIED | 145 lines; `AnnouncedStops<S>` beside `StopNoticeProps<S>` |
| `packages/devtools/src/react/useStopNotice.ts` | per-feed `useReducer` + memo | ✓ VERIFIED | 24 lines; called by `DockFrame` per feed |
| `packages/devtools/src/react/TimelineNotice.tsx`, `DiagnosticsNotice.tsx` | notice passed whole, no key, no `Binding` | ✓ VERIFIED | both use hoisted `Match.tagsExhaustive`, unchanged dispatch |
| `packages/devtools/test/model/StopLedger.test.ts` | table + laws | ✓ VERIFIED | L1-L6, LAW1-LAW3 |
| `packages/devtools/test/react/DockFrame.announce.characterisation.test.tsx`, `useStopNotice.test.tsx` | base characterisation | ✓ VERIFIED | born on base, held byte for byte |
| `spec/decisions/201-…md` | ADR-QD-201 | ✓ VERIFIED | consistent with code |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `DockFrame` | `useStopNotice` | one call per feed | WIRED | `DevtoolsDock.tsx` unchanged; signature `useStopNotice(status, onRestart)` unchanged |
| `useStopNotice` | `recordStop` | `useReducer(recordStop, noStops)` | WIRED | `useStopNotice.ts:19` |
| notices | `StoppedBox` | `notice={notice}` | WIRED | `TimelineNotice.tsx:32`, `DiagnosticsNotice.tsx:84` |
| `StoppedBox` | `StoppedBody` | `key={stoppedKey(…)}` | WIRED | `StoppedBox.tsx:95` |
| `StoppedBody` | ledger | `announcesStop` at mount, `announced.record` in layout effect | WIRED | `StoppedBox.tsx:113-116` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `StoppedBody` | `alert` | `announced.ledger` from the per-feed reducer state | Yes (reducer advances on each committed new stop; A1-A5, N9, N12 assert `data-announce`/`role`) | ✓ FLOWING |
| `StoppedBox` | key | `stoppedKey(ledger, status)` | Yes (A3, A5, N12, DS2 remount/identity rows) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Devtools suite on HEAD (one full run) | `bash -c 'pnpm exec vitest run --project devtools < /dev/null'` | 109 files, 2087 tests passed, exit 0 | ✓ PASS |
| Box keys itself | `node 88-check.mjs box-keys-itself` | exit 0 | ✓ PASS |
| Ledger module shape and importers | `node 88-check.mjs ledger-module` | exit 0 | ✓ PASS |
| Records | `node 88-check.mjs records --close` | exit 0 | ✓ PASS |
| Id scan / forbidden forms / trailers | `node 88-check.mjs scan-ids` / `scan-forbidden` / `trailers` | exit 0 each (45 commits trailed) | ✓ PASS |
| Pinned tests | `node 88-pinned-check.mjs --all-applied` | exit 0 | ✓ PASS |
| Earlier phases' checks | `node 88-earlier-checks.mjs` | exit 0 | ✓ PASS |
| Mutation close | `node 88-mutation.mjs compare` | exit 0, 12/12 killed, 4 ignored examined | ✓ PASS |

No `.vitest/` directory was left behind.

### Probe Execution

Step 7c: no `scripts/*/tests/probe-*.sh` declared by the phase; the phase's own check scripts above stand in and were run in this process.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SBOX-01 | 88-01 | base characterisation of announce-once | ✓ SATISFIED | Truth 1 |
| SBOX-02 | 88-06 | box keys itself; no caller key or binding; ledger per feed above screens | ✓ SATISFIED | Truths 2-4 |
| SBOX-03 | 88-05, 88-06 | pure transition with table test; mount/commit; no module-scope ledger | ✓ SATISFIED | Truths 5-7 |
| SBOX-04 | 88-07, 88-09 | ADR/BEH/INV/traceability; UNMEASURED + scratch variants | ✓ SATISFIED | Truths 8-9 |
| WX-01..07 | all | cross-cutting | ✓ SATISFIED | Truths 10-11 |

No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | none (no TBD/FIXME/XXX/TODO, no `as`/`!`/`any`/`switch`, no `useRef`/`.current` on the stop path) | — | — |

### Human Verification Required

None. The announced alert, its test ids and DOM attributes are unchanged (UI hint: no), and every behaviour-dependent truth
(StrictMode, a discarded render, no remount on the record's commit, per-feed isolation) is exercised by a named test that
passed in the HEAD run.

### Gaps Summary

None. The code removes both render-phase ref reads (the callers' key and the box's `useState` initializer), the box derives
its own key through a wrapper, the notices hand the notice whole with no `Binding`, the per-feed ledger is a `useReducer`
over the pure, mutation-measured `recordStop`, and the spec records match the code. All phase checks and the devtools suite
pass on HEAD, and nothing was released.

---

_Verified: 2026-11-26T01:55:00Z_
_Verifier: Claude (gsd-verifier)_
