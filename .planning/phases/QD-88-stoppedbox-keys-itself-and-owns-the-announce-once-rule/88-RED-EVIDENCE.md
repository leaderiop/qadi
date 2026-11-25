# Phase 88 RED evidence

The base is the one `88-mutation-base.json` records (`phase_base` 892c4d36bf0f639a5219c53e7c39563533ea8b7e). Every line below comes from a real run with stdin closed, each scratch edit made on a copy-backed file and restored with `cp`. The line forms: `- red before: <title or file>` followed by an indented `  - failed on: <the first failing text as vitest printed it>` and, for a test file run before the module it imports exists, an indented `  (scratch state: <the module> absent at HEAD <sha>; test blob <sha>)`; `- failed (<tag>): <title>` followed by an indented `  (scratch edit: <the edit>; <n> row(s) failed under it)`; `- variant <id>: <what it changes>` followed by indented `  - failed: <title>` lines; `- check failed: <mode>: <first stderr line>`.

## 88-01 announce-once through the dock

- failed (base V1): A1 [plain] each feed stop is announced once and silent on every revisit across tab switches
  (scratch edit: delete the ledger write from the box layout effect in StoppedBox.tsx (the effect keeps its dependency list and records nothing); 8 row(s) failed under it)
- failed (base V1): A1 [StrictMode] each feed stop is announced once and silent on every revisit across tab switches
  (scratch edit: delete the ledger write from the box layout effect in StoppedBox.tsx (the effect keeps its dependency list and records nothing); 8 row(s) failed under it)
- failed (base V1): A2 [plain] a second stop after Restart alerts again on its own feed only
  (scratch edit: delete the ledger write from the box layout effect in StoppedBox.tsx (the effect keeps its dependency list and records nothing); 8 row(s) failed under it)
- failed (base V1): A2 [StrictMode] a second stop after Restart alerts again on its own feed only
  (scratch edit: delete the ledger write from the box layout effect in StoppedBox.tsx (the effect keeps its dependency list and records nothing); 8 row(s) failed under it)
- failed (base V1): A3 [plain] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  (scratch edit: delete the ledger write from the box layout effect in StoppedBox.tsx (the effect keeps its dependency list and records nothing); 8 row(s) failed under it)
- failed (base V1): A3 [StrictMode] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  (scratch edit: delete the ledger write from the box layout effect in StoppedBox.tsx (the effect keeps its dependency list and records nothing); 8 row(s) failed under it)
- failed (base V1): A4 [plain] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  (scratch edit: delete the ledger write from the box layout effect in StoppedBox.tsx (the effect keeps its dependency list and records nothing); 8 row(s) failed under it)
- failed (base V1): A4 [StrictMode] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  (scratch edit: delete the ledger write from the box layout effect in StoppedBox.tsx (the effect keeps its dependency list and records nothing); 8 row(s) failed under it)
- failed (base write-in-hook): A1 [plain] each feed stop is announced once and silent on every revisit across tab switches
  (scratch edit: make useStopNotice.ts write every status it is handed into the ledger during render, so the stop is recorded before any box shows it; 10 row(s) failed under it)
- failed (base write-in-hook): A1 [StrictMode] each feed stop is announced once and silent on every revisit across tab switches
  (scratch edit: make useStopNotice.ts write every status it is handed into the ledger during render, so the stop is recorded before any box shows it; 10 row(s) failed under it)
- failed (base write-in-hook): A2 [plain] a second stop after Restart alerts again on its own feed only
  (scratch edit: make useStopNotice.ts write every status it is handed into the ledger during render, so the stop is recorded before any box shows it; 10 row(s) failed under it)
- failed (base write-in-hook): A2 [StrictMode] a second stop after Restart alerts again on its own feed only
  (scratch edit: make useStopNotice.ts write every status it is handed into the ledger during render, so the stop is recorded before any box shows it; 10 row(s) failed under it)
- failed (base write-in-hook): A3 [plain] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  (scratch edit: make useStopNotice.ts write every status it is handed into the ledger during render, so the stop is recorded before any box shows it; 10 row(s) failed under it)
- failed (base write-in-hook): A3 [StrictMode] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  (scratch edit: make useStopNotice.ts write every status it is handed into the ledger during render, so the stop is recorded before any box shows it; 10 row(s) failed under it)
- failed (base write-in-hook): A4 [plain] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  (scratch edit: make useStopNotice.ts write every status it is handed into the ledger during render, so the stop is recorded before any box shows it; 10 row(s) failed under it)
- failed (base write-in-hook): A4 [StrictMode] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  (scratch edit: make useStopNotice.ts write every status it is handed into the ledger during render, so the stop is recorded before any box shows it; 10 row(s) failed under it)
- failed (base write-in-hook): A5 [plain] the commit that records a stop does not mount its box again
  (scratch edit: make useStopNotice.ts write every status it is handed into the ledger during render, so the stop is recorded before any box shows it; 10 row(s) failed under it)
- failed (base write-in-hook): A5 [StrictMode] the commit that records a stop does not mount its box again
  (scratch edit: make useStopNotice.ts write every status it is handed into the ledger during render, so the stop is recorded before any box shows it; 10 row(s) failed under it)
- failed (base remount-after-commit): A1 [plain] each feed stop is announced once and silent on every revisit across tab switches
  (scratch edit: give the -stopped div in StoppedBox.tsx a key read from a local state that the box own layout effect sets once after mount; 4 row(s) failed under it)
- failed (base remount-after-commit): A1 [StrictMode] each feed stop is announced once and silent on every revisit across tab switches
  (scratch edit: give the -stopped div in StoppedBox.tsx a key read from a local state that the box own layout effect sets once after mount; 4 row(s) failed under it)
- failed (base remount-after-commit): A5 [plain] the commit that records a stop does not mount its box again
  (scratch edit: give the -stopped div in StoppedBox.tsx a key read from a local state that the box own layout effect sets once after mount; 4 row(s) failed under it)
- failed (base remount-after-commit): A5 [StrictMode] the commit that records a stop does not mount its box again
  (scratch edit: give the -stopped div in StoppedBox.tsx a key read from a local state that the box own layout effect sets once after mount; 4 row(s) failed under it)

## 88-01 the stop notice hook

- failed (base record-in-render): H1 a render that is thrown away announces nothing, so the stop alerts when it is first shown
  (scratch edit: move the ledger write in StoppedBox.tsx from its layout effect into its render body; 1 row(s) failed under it)
- failed (base memo-on-status): H2 a notice follows its feed restart while the status stays the same stop
  (scratch edit: key the memo in useStopNotice.ts on the status alone; 1 row(s) failed under it)
- failed (base no-memo): H3 the notice is one value across a re-render that changes nothing it holds, and a new value for a new stop
  (scratch edit: return a fresh props object from useStopNotice.ts on every render; 1 row(s) failed under it)
- failed (base two-commits): C1 a newly shown stop adds at most one commit over a live source
  (scratch edit: add to StoppedBox.tsx a layout effect with no dependency list that bumps a local counter until it reaches 2, two extra commits per shown stop; 1 row(s) failed under it)

## 88-02 the phase check

- check failed: base: phase_base is not an ancestor of HEAD
- check failed: commit: 0 commits since phase_base have the subject: chore(88-02): no commit has this subject
- check failed: unchanged: packages/devtools/test/react/useStopNotice.test.tsx differs from phase_base
- check failed: seen-failing: no failure line in the evidence for: a title with no failure line
- check failed: vitest: the report names no test file
- check failed: suite: planted row fails and is not red before
- check failed: scan-ids: packages/devtools/test/react/useStopNotice.test.tsx:145 names a requirement id: // SBOX-01 planted
- check failed: scan-forbidden: packages/devtools/test/react/useStopNotice.test.tsx:145 uses an as cast: const planted = value as Planted;
- check failed: trailers: the message has 0 Co-Authored-By lines, not one
- check failed: box-keys-itself: packages/devtools/src/react/StoppedBox.tsx reads .current: no render reads a ref
- check failed: ledger-module: packages/devtools/src/model/StopLedger.ts is missing
- check failed: records: BEH-QD-759 names packages/devtools/test/react/NoSuchFile.test.tsx, which does not exist

## 88-03 the pinned-test check

- check failed: pinned held: packages/devtools/test/react/DiagnosticsNotice.test.tsx: differs from its base text after the region N12, at line 225
- check failed: pinned born: packages/devtools/test/react/useStopNotice.test.tsx: differs from the commit that added it at line 79
- check failed: pinned region: packages/devtools/test/react/TimelineNotice.test.tsx: differs from its base text between the regions ledger and TN14, at line 261
- check failed: pinned held src: packages/devtools/src/react/DevtoolsDock.tsx: differs from its base text at line 268
- check failed: pinned kept: packages/devtools/test/react/DiagnosticsNotice.test.tsx: the region N9 dropped a kept line: assert.isNull(silent.getAttribute("role"));
- check failed: pinned all-applied: packages/devtools/test/helpers.ts: its declared edit is not applied

## 88-04 the earlier-phase checks

- check failed: earlier checks: packages/devtools/test/react/DiagnosticsNotice.test.tsx: differs from phase_base and no commit since it has one of its explaining subjects
