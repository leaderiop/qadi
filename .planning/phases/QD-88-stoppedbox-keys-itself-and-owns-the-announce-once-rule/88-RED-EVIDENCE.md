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
