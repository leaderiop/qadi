---
phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
plan: 06
subsystem: devtools
tags: [devtools, stopped-box, stop-ledger, useReducer, announce-once, surface]

phase_base: 892c4d36bf0f639a5219c53e7c39563533ea8b7e
plan_head_before: 54db78358e9a4e53da7d5b63c2d9c8ddbbd9ed2e
plan_head_after: 590eeffb49155a50a0e2be26676d51b16229ddc2
commits: 3
status: complete

requires:
  - phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
    provides: model/StopLedger.ts (88-05), the born characterisation and hook rows (88-01), the phase checks (88-02 to 88-04)
provides:
  - StoppedBox as a keyed wrapper over a module-private StoppedBody that decides its alert at mount and records at commit
  - useStopNotice holding the per-feed ledger in useReducer(recordStop, noStops), no ref and no .current
  - both notices handing the box the notice whole, Binding and the stoppedKey import deleted
  - the declared test edits inside their regions, SB4 comparing the Simulator reason block with a rendered stopped box, six surface refusal pairs
affects: [QD-88 plans 07 to 10]

key-files:
  created: []
  modified:
    - packages/devtools/src/react/StoppedBox.tsx
    - packages/devtools/src/react/useStopNotice.ts
    - packages/devtools/src/react/TimelineNotice.tsx
    - packages/devtools/src/react/DiagnosticsNotice.tsx
    - packages/devtools/test/helpers.ts
    - packages/devtools/test/react/DiagnosticsNotice.test.tsx
    - packages/devtools/test/react/TimelineNotice.test.tsx
    - packages/devtools/test/react/Simulator.broke.test.tsx
    - packages/devtools/test/surface.tst.ts
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-RED-EVIDENCE.md

key-decisions:
  - "The ledger is React state per feed (useReducer), not a ref: nothing in render reads or writes it, the key and the alert are pure functions of props, the record is one dispatch at commit (D-06, D-07, D-08)"
  - "The box takes the notice whole; AnnouncedStops<S> beside StopNoticeProps<S> carries { ledger, record } (D-09, D-10)"

requirements-completed: []

actuals:
  tokens: 40000
  tasks: 3
  commits: 3

duration: ~35min
completed: 2026-11-26
---

# Phase 88 Plan 06: the stopped box keys itself and records its stop through the feed ledger Summary

**StoppedBox keys itself on the stop and owns the announce-once rule: the alert is decided at mount from the committed ledger, the stop is recorded at commit through a per-feed `useReducer`, and no stop-path file reads `.current`.**

## What changed

- `StoppedBox.tsx`: exported `StoppedBox` is a wrapper rendering `<StoppedBody key={stoppedKey(...)} {...props} />`; `StoppedBody` decides `useState(() => announcesStop(announced.ledger, status))` once and records with `useLayoutEffect(() => announced.record(status), [announced.record, status])`. `AnnouncedStops<S>` is declared beside `StopNoticeProps<S>`; `StoppedBoxProps<S>` takes `notice` in place of `status`, `onRestart` and `announced`. The JSX, copy, test ids, role, `data-announce`, `data-sampled` and focus target are untouched.
- `useStopNotice.ts`: `useReducer<StopLedger<S>, [S]>(recordStop, noStops)` and a memo over `[status, onRestart, ledger, record]`; no cast.
- `TimelineNotice.tsx`, `DiagnosticsNotice.tsx`: `Binding` and the `stoppedKey` import deleted, the Stopped arm takes the notice props whole and passes `notice={notice}`; no copy constant line touched.
- `DevtoolsDock.tsx` and both barrels are byte for byte as at `phase_base`.
- Tests (declared regions only): `helpers.ts`, `DiagnosticsNotice.test.tsx` (`Held` over the real hook; N9, N12), `TimelineNotice.test.tsx` (`Held`, `Either`; TN14, TN15 retitled), `Simulator.broke.test.tsx` (SB1 props, `timelineBox`, SB4 compares two rendered `style` attributes, SB1 is a stated golden, header states the file history), `surface.tst.ts` (twelve refusal lines, six names from both entries).

## Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 | e0a5c709 | refactor(88-06): the stopped box keys itself and records its stop through the feed ledger |
| 2 | 25dd8551 | test(88-06): compare the simulator reason block with the rendered stopped box |
| 3 | 590eeffb | test(88-06): refuse the stop ledger names from both entries |

## Check lines (as printed)

- `vitest: 2087 rows in 109 files, 0 failed` / `suite: 0 failing row(s), none allowed; 106 base and 3 born test files ran` (after Task 3, the whole devtools project)
- `box-keys-itself: the stopped box keys itself, decides its alert at mount and records at commit; the notices hand it the notice whole`
- `ledger-module: the stop ledger is one React-free module only the box and the hook import`
- `pinned: 130 files hold their base text, 3 of 3 born files held, 4 of 5 declared edits applied` (Task 1, Task 2); `... 5 of 5 declared edits applied` with `--all-applied` (Task 3)
- `scan-ids: no id or phase wording in added lines`, `scan-forbidden: no forbidden form in added lines`, `records: the pinned-by lists name tests that exist`
- `trailers: 17 commits since phase_base, each with the one trailer`
- `88-earlier-checks.mjs` exit 0 (87's pinned row reports `packages/devtools/test/helpers.ts: differs from its base text at line 14`, explained by the 88-06 commits; the 85 and 86 `scan-ids` lines about `DiagnosticsFeed.stop.test.ts:35` are the earlier checks' own recorded state)
- `pnpm test:tstyche`: 79 files, 429 tests passed (both passes); `tsc -p tsconfig.test.json` clean; `pnpm spec:api`: `api-surface: 942 export(s) documented across 9 package(s)`; `house-style: 640 file(s) clean`; `pnpm circular`: no circular dependency; oxlint clean on the touched files.
- Seen failing: SB4 alone under a Simulator style change, SB1 alone under a theme style change, the `noStops` refusal under a root export (`surface.tst.ts(318,1): error TS2578: Unused '@ts-expect-error' directive.`), all recorded in `88-RED-EVIDENCE.md`.

## Deviations from Plan

### Plan defects (verify as written)

**1. [Rule 3 - Blocking] The `<automated>` verify of Tasks 1 and 2 could not run as one `bash -c` script**
- **Found during:** Task 1 verify
- **Issue:** the verify embeds `rm -f "$R"` inside a `bash -c` string; the harness safety check refused the whole command ("could not check the script for dangerous removals"), nothing ran.
- **Fix:** ran every step of the verify as separate commands with identical arguments and the same expected output (the report path did not exist, so no removal was needed). Not worked around by re-issuing the removal.
- **Also:** `88-check.mjs commit` is a checker (it counts commits with the subject), not a committing command; the three commits were made with `git commit` and then confirmed with that mode, which printed `commit: <subject>` for each.

### Auto-fixed / decisions

**2. [Plan reading] `useStopNotice(` in `DiagnosticsNotice.test.tsx` carries no type argument**
- The pinned check's declared-edit predicate for that file is the text `useStopNotice(`; `Held`'s `status` prop is typed as the union, so inference gives `S = DiagnosticsStatus`. `TimelineNotice.test.tsx` keeps `useStopNotice<TimelineStatus>(` as its predicate demands.
- **Files:** packages/devtools/test/react/DiagnosticsNotice.test.tsx

**3. [Region placement] `Held`/`held` sit between `freshRef` and `noop`**, inside the `imports-and-handles` region, so they pass `() => undefined` as their own restart (the plan's stated harness form).

The pinned-check regions needed no change for any of the edits the plan required.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or file surface; both barrels unchanged and the twelve refusals hold the ledger names out of both entries (T-88-11).

## Self-Check: PASSED

- FOUND: packages/devtools/src/react/StoppedBox.tsx, useStopNotice.ts, TimelineNotice.tsx, DiagnosticsNotice.tsx, test/helpers.ts, DiagnosticsNotice.test.tsx, TimelineNotice.test.tsx, Simulator.broke.test.tsx, surface.tst.ts, 88-RED-EVIDENCE.md
- FOUND commits: e0a5c709, 25dd8551, 590eeffb (each an ancestor of HEAD)
