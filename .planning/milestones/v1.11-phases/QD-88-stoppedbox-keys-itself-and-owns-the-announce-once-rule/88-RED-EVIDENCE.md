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

## 88-05 the stop ledger

- red before: packages/devtools/test/model/StopLedger.test.ts
  - failed on: Failed to resolve import "../../src/model/StopLedger.ts" from "packages/devtools/test/model/StopLedger.test.ts". Does the file exist?
  (scratch state: packages/devtools/src/model/StopLedger.ts absent at HEAD caf45f64146a0690465fcb63f8291d65a3536ce3; test blob b439973b79b7355949e7611653c62ab5a3e21d86)
- failed (fresh-spread): L2 the recorded stop again: the same key, silent, and recording returns the same ledger
  (scratch edit: recordStop returns { ...ledger } for the known stop; 3 row(s) failed under it)
- failed (fresh-spread): L6 the last stop of a ledger of count three: key three, silent, the same ledger
  (scratch edit: recordStop returns { ...ledger } for the known stop; 3 row(s) failed under it)
- failed (fresh-spread): LAW2 recording a recorded stop returns the same ledger, for every row
  (scratch edit: recordStop returns { ...ledger } for the known stop; 3 row(s) failed under it)
- failed (no-plus-one): L1 an empty ledger and a first stop: key one, announces, recorded with count one
  (scratch edit: the key reads ledger.count in both branches; 6 row(s) failed under it)
- failed (no-plus-one): L3 a second distinct stop: key two, announces, recorded with count two
  (scratch edit: the key reads ledger.count in both branches; 6 row(s) failed under it)
- failed (no-plus-one): L4 an equal-field stop that is a new identity announces, because a stop is its identity
  (scratch edit: the key reads ledger.count in both branches; 6 row(s) failed under it)
- failed (no-plus-one): L5 a ledger of count three and a new stop: key four, announces, recorded with count four
  (scratch edit: the key reads ledger.count in both branches; 6 row(s) failed under it)
- failed (no-plus-one): LAW1 the key is the same before and after the stop is recorded, for every row
  (scratch edit: the key reads ledger.count in both branches; 6 row(s) failed under it)
- failed (no-plus-one): LAW3 any sequence of stops: the count equals the number of changes and the key holds across each record
  (scratch edit: the key reads ledger.count in both branches; 6 row(s) failed under it)
- failed (always-plus-one): L2 the recorded stop again: the same key, silent, and recording returns the same ledger
  (scratch edit: the key is always ledger.count + 1; 4 row(s) failed under it)
- failed (always-plus-one): L6 the last stop of a ledger of count three: key three, silent, the same ledger
  (scratch edit: the key is always ledger.count + 1; 4 row(s) failed under it)
- failed (always-plus-one): LAW1 the key is the same before and after the stop is recorded, for every row
  (scratch edit: the key is always ledger.count + 1; 4 row(s) failed under it)
- failed (always-plus-one): LAW3 any sequence of stops: the count equals the number of changes and the key holds across each record
  (scratch edit: the key is always ledger.count + 1; 4 row(s) failed under it)

## 88-06 the simulator reason comparison

- failed (simulator style apart): SB4 the broken simulation pre has the stopped box reason style
  (scratch edit: the Simulator broken-run pre takes style={{ ...reasonStyle, padding: 9 }}; 1 row(s) failed under it, SB1 passing)
- failed (theme style moved): SB1 the stopped box shows its reason in a labelled focusable pre whose style is the reason style
  (scratch edit: the shared reasonStyle in theme.ts has maxHeight 97 in place of 96; 1 row(s) failed under it, SB4 passing)

## 88-06 the surface refusals

- variant surface-refusal: noStops exported from the root entry
  - failed: packages/devtools/test/surface.tst.ts(318,1): error TS2578: Unused '@ts-expect-error' directive.

## 88-07 the unmeasured stop path

- variant V1: StoppedBox.tsx: the body layout effect that records the stop removed
  - failed: N9 a stop alerts once, again for a new stop, and a strict-mode first render still alerts
  - failed: N12 a second stop on a mounted notice remounts it, so its alert is present on the new mount
  - failed: D7 a stop is alerted on the first screen that shows it and silent on every revisit
  - failed: A1 [plain] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A1 [StrictMode] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A2 [plain] a second stop after Restart alerts again on its own feed only
  - failed: A2 [StrictMode] a second stop after Restart alerts again on its own feed only
  - failed: A3 [plain] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: A3 [StrictMode] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: A4 [plain] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: A4 [StrictMode] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: DS1 a diagnostics stop and a timeline stop are each announced once, across tab switches between their screens
  - failed: DS2 a second stop of one feed remounts only its own box, and the other stop is not announced again
  - failed: TN4 a stop alerts once, and a move between timeline tabs keeps the same notice
  - failed: TN14 a notice mounted again for the stop already announced does not count it twice
  - failed: TN15 a notice handed the ledger of another feed records its stop there, and that stop is then silent on it
  (16 row(s) failed)
- variant V2: StoppedBox.tsx: the record called in the body render in place of the layout effect (no dock row fails; the two rows are the hook rows H1 and C1, the second because a dispatch during render adds a commit)
  - failed: H1 a render that is thrown away announces nothing, so the stop alerts when it is first shown
  - failed: C1 a newly shown stop adds at most one commit over a live source
  (2 row(s) failed)
- variant V3: StoppedBox.tsx: the wrapper key a constant 0
  - failed: N9 a stop alerts once, again for a new stop, and a strict-mode first render still alerts
  - failed: N12 a second stop on a mounted notice remounts it, so its alert is present on the new mount
  - failed: A2 [plain] a second stop after Restart alerts again on its own feed only
  - failed: A2 [StrictMode] a second stop after Restart alerts again on its own feed only
  - failed: A3 [plain] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: A3 [StrictMode] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: DS2 a second stop of one feed remounts only its own box, and the other stop is not announced again
  - failed: TN14 a notice mounted again for the stop already announced does not count it twice
  (8 row(s) failed)
- variant V4: useStopNotice.ts and StoppedBox.tsx: the hook hands a fixed handle and the body holds its own useReducer(recordStop, noStops)
  - failed: N9 a stop alerts once, again for a new stop, and a strict-mode first render still alerts
  - failed: N12 a second stop on a mounted notice remounts it, so its alert is present on the new mount
  - failed: D7 a stop is alerted on the first screen that shows it and silent on every revisit
  - failed: A1 [plain] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A1 [StrictMode] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A2 [plain] a second stop after Restart alerts again on its own feed only
  - failed: A2 [StrictMode] a second stop after Restart alerts again on its own feed only
  - failed: A3 [plain] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: A3 [StrictMode] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: A4 [plain] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: A4 [StrictMode] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: DS1 a diagnostics stop and a timeline stop are each announced once, across tab switches between their screens
  - failed: DS2 a second stop of one feed remounts only its own box, and the other stop is not announced again
  - failed: TN4 a stop alerts once, and a move between timeline tabs keeps the same notice
  - failed: TN14 a notice mounted again for the stop already announced does not count it twice
  - failed: TN15 a notice handed the ledger of another feed records its stop there, and that stop is then silent on it
  (16 row(s) failed)
- variant V5: DevtoolsDock.tsx: the diagnostics notice handed the timeline notice ledger handle, so both feeds share one ledger
  - failed: A1 [plain] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A1 [StrictMode] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A2 [plain] a second stop after Restart alerts again on its own feed only
  - failed: A2 [StrictMode] a second stop after Restart alerts again on its own feed only
  - failed: A4 [plain] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: A4 [StrictMode] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: DS1 a diagnostics stop and a timeline stop are each announced once, across tab switches between their screens
  - failed: DS2 a second stop of one feed remounts only its own box, and the other stop is not announced again
  (8 row(s) failed)
- variant V6: useStopNotice.ts: the memo dependencies without onRestart (no dock row fails)
  - failed: H2 a notice follows its feed restart while the status stays the same stop
  (1 row(s) failed)
- variant V7: StoppedBox.tsx: the alert computed on every render in place of the useState initializer
  - failed: N9 a stop alerts once, again for a new stop, and a strict-mode first render still alerts
  - failed: N12 a second stop on a mounted notice remounts it, so its alert is present on the new mount
  - failed: D4 a stopped poll is stated on Services with its reason, and a restart brings the screen back
  - failed: D7 a stop is alerted on the first screen that shows it and silent on every revisit
  - failed: D8 a stop that happened on a screen with no notice alerts on the first visit to one
  - failed: A1 [plain] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A1 [StrictMode] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A2 [plain] a second stop after Restart alerts again on its own feed only
  - failed: A2 [StrictMode] a second stop after Restart alerts again on its own feed only
  - failed: A3 [plain] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: A3 [StrictMode] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: A4 [plain] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: A4 [StrictMode] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: A5 [plain] the commit that records a stop does not mount its box again
  - failed: A5 [StrictMode] the commit that records a stop does not mount its box again
  - failed: DS1 a diagnostics stop and a timeline stop are each announced once, across tab switches between their screens
  - failed: DS2 a second stop of one feed remounts only its own box, and the other stop is not announced again
  - failed: DS3 after a hidden-then-shown dock, Restart on each notice restarts the rebuilt feed of its own kind
  - failed: 6 thunk handed, stopped before a sample
  - failed: 7 thunk handed, stopped after a sample
  - failed: TN3 the notice says what stopped, why, and how to start it again
  - failed: TN4 a stop alerts once, and a move between timeline tabs keeps the same notice
  - failed: TN6 a second stop after a restart alerts again
  - failed: TN7 a strict-mode first render still alerts
  - failed: TN8 a stop first seen on services alerts at the first timeline tab visited
  - failed: TN10 a hidden-then-shown dock rebuilds at Reading and alerts afresh on a new stop
  - failed: TN14 a notice mounted again for the stop already announced does not count it twice
  - failed: TN15 a notice handed the ledger of another feed records its stop there, and that stop is then silent on it
  - failed: H1 a render that is thrown away announces nothing, so the stop alerts when it is first shown
  (29 row(s) failed)
- variant V8: StoppedBox.tsx: the record effect keyed on [announced, status] in place of [announced.record, status] (invisible in the DOM; caught by the commit-limit row)
  - failed: C1 a newly shown stop adds at most one commit over a live source
  (1 row(s) failed)
- variant V9: useStopNotice.ts: the memo dependencies without ledger
  - failed: D7 a stop is alerted on the first screen that shows it and silent on every revisit
  - failed: A1 [plain] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A1 [StrictMode] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A2 [plain] a second stop after Restart alerts again on its own feed only
  - failed: A2 [StrictMode] a second stop after Restart alerts again on its own feed only
  - failed: A3 [plain] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: A3 [StrictMode] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: A4 [plain] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: A4 [StrictMode] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: DS1 a diagnostics stop and a timeline stop are each announced once, across tab switches between their screens
  - failed: DS2 a second stop of one feed remounts only its own box, and the other stop is not announced again
  - failed: TN4 a stop alerts once, and a move between timeline tabs keeps the same notice
  (12 row(s) failed)
- variant V10: model/StopLedger.ts: stoppedKey always ledger.count + 1
  - failed: L2 the recorded stop again: the same key, silent, and recording returns the same ledger
  - failed: L6 the last stop of a ledger of count three: key three, silent, the same ledger
  - failed: LAW1 the key is the same before and after the stop is recorded, for every row
  - failed: LAW3 any sequence of stops: the count equals the number of changes and the key holds across each record
  - failed: N9 a stop alerts once, again for a new stop, and a strict-mode first render still alerts
  - failed: N12 a second stop on a mounted notice remounts it, so its alert is present on the new mount
  - failed: D4 a stopped poll is stated on Services with its reason, and a restart brings the screen back
  - failed: D7 a stop is alerted on the first screen that shows it and silent on every revisit
  - failed: D8 a stop that happened on a screen with no notice alerts on the first visit to one
  - failed: A1 [plain] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A1 [StrictMode] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A2 [plain] a second stop after Restart alerts again on its own feed only
  - failed: A2 [StrictMode] a second stop after Restart alerts again on its own feed only
  - failed: A3 [plain] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: A3 [StrictMode] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: A4 [plain] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: A4 [StrictMode] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: A5 [plain] the commit that records a stop does not mount its box again
  - failed: A5 [StrictMode] the commit that records a stop does not mount its box again
  - failed: DS1 a diagnostics stop and a timeline stop are each announced once, across tab switches between their screens
  - failed: DS2 a second stop of one feed remounts only its own box, and the other stop is not announced again
  - failed: DS3 after a hidden-then-shown dock, Restart on each notice restarts the rebuilt feed of its own kind
  - failed: 6 thunk handed, stopped before a sample
  - failed: 7 thunk handed, stopped after a sample
  - failed: TN3 the notice says what stopped, why, and how to start it again
  - failed: TN4 a stop alerts once, and a move between timeline tabs keeps the same notice
  - failed: TN6 a second stop after a restart alerts again
  - failed: TN7 a strict-mode first render still alerts
  - failed: TN8 a stop first seen on services alerts at the first timeline tab visited
  - failed: TN10 a hidden-then-shown dock rebuilds at Reading and alerts afresh on a new stop
  - failed: TN14 a notice mounted again for the stop already announced does not count it twice
  - failed: TN15 a notice handed the ledger of another feed records its stop there, and that stop is then silent on it
  - failed: H1 a render that is thrown away announces nothing, so the stop alerts when it is first shown
  - failed: C1 a newly shown stop adds at most one commit over a live source
  (34 row(s) failed)
- variant H3: useStopNotice.ts: the useMemo removed, a new props object every render
  - failed: H3 the notice is one value across a re-render that changes nothing it holds, and a new value for a new stop
  (1 row(s) failed)
- variant VN1: TimelineNotice.tsx: the Stopped arm hands the box a fixed ledger ({ ...notice, announced: { ledger: noStops, record: () => undefined } }) in place of the notice
  - failed: A1 [plain] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A1 [StrictMode] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A2 [plain] a second stop after Restart alerts again on its own feed only
  - failed: A2 [StrictMode] a second stop after Restart alerts again on its own feed only
  - failed: A3 [plain] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: A3 [StrictMode] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert
  - failed: A4 [plain] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: A4 [StrictMode] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds
  - failed: DS1 a diagnostics stop and a timeline stop are each announced once, across tab switches between their screens
  - failed: DS2 a second stop of one feed remounts only its own box, and the other stop is not announced again
  - failed: TN4 a stop alerts once, and a move between timeline tabs keeps the same notice
  - failed: TN14 a notice mounted again for the stop already announced does not count it twice
  - failed: TN15 a notice handed the ledger of another feed records its stop there, and that stop is then silent on it
  (13 row(s) failed)
- variant VN2: DiagnosticsNotice.tsx: the same fixed ledger in the diagnostics arm
  - failed: N9 a stop alerts once, again for a new stop, and a strict-mode first render still alerts
  - failed: N12 a second stop on a mounted notice remounts it, so its alert is present on the new mount
  - failed: D7 a stop is alerted on the first screen that shows it and silent on every revisit
  - failed: A1 [plain] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A1 [StrictMode] each feed stop is announced once and silent on every revisit across tab switches
  - failed: A2 [plain] a second stop after Restart alerts again on its own feed only
  - failed: A2 [StrictMode] a second stop after Restart alerts again on its own feed only
  - failed: DS1 a diagnostics stop and a timeline stop are each announced once, across tab switches between their screens
  - failed: DS2 a second stop of one feed remounts only its own box, and the other stop is not announced again
  (9 row(s) failed)

## 88-08 the mutation close

- check failed: mutation probe: packages/devtools/src/model/StopLedger.ts:21 is new and Ignored: ObjectLiteral -> {}
- examined: ObjectLiteral {} x1: Killed by StopLedger.test.ts L1 to L6, LAW1 and LAW3 (noStops, line 21, made {})
- examined: ArrowFunction () => undefined x3: Killed by StopLedger.test.ts L1 to L6 (stoppedKey line 29, announcesStop line 37), and L1 to L6, LAW1 and LAW3 (recordStop line 45)
- the hand run: stryker.devtools.mjs spread with `ignoreStatic: false` through an untracked scratch config, run with `--mutate packages/devtools/src/model/StopLedger.ts --disableBail`: 16 mutants, 16 Killed, 0 Survived, 0 NoCoverage, 0 Timeout (the four static ones above plus the twelve the close holds). A first hand run of the same config timed out once on the line 45 arrow (the whole suite under load, a mutant that makes recordStop return undefined); the settled re-run killed it. A scratch vitest config narrowing `include` to StopLedger.test.ts was tried for the second run, and Stryker's vitest runner did not narrow it (the dock and diagnostics rows ran as well and are among the killers), so the second run is a whole-suite run too. Both scratch configs were removed, with `.stryker-tmp/`, before the record.
- the close run: the canonical invocation (`pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/StopLedger.ts --disableBail`, stdin closed, alone): 12 Killed, 4 Ignored, 100 percent, 50 seconds.

## Review fix: the mutation re-close

`StopLedger.ts` changed in the review-fix round in comments and wrapping only (WR-02 `dfcd36c8`, IN-03 `d276d397`, IN-06 `0769da68`): no expression moved, but the four static mutants moved lines (`noStops` 21 to 23, the three arrows 29, 37, 45 to 31, 39, 49) and `compare` read the module as differing from the close head.

- the close run: the canonical invocation (`pnpm exec stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/StopLedger.ts --disableBail`, stdin closed, alone) on head `4148848e`: 12 Killed, 0 Survived, 0 NoCoverage, 0 Timeout, 4 Ignored, 100 percent, 49 seconds. `record close ledger --restart` wrote the ledger group at `4148848e`; `compare` passed.
- examined again: the same four kinds (`ObjectLiteral {}` x1, `ArrowFunction () => undefined` x3), so `EXAMINED` is unchanged and only its line comments moved.
- the hand runs: stryker.devtools.mjs spread with `ignoreStatic: false` through an untracked scratch config writing its reports under `$TMPDIR/qd88`. With `--disableBail`, twice: 15 Killed and 1 Timeout each time, the Timeout being the `recordStop` arrow (line 49) made `() => undefined`, the mutant 88-08's first hand run also timed out on: with every killing test listed, a dock file that never settles under a reducer that returns `undefined` runs past the timeout after `StopLedger.test.ts` has already failed. Without `--disableBail` (Stryker stops at the first failing test): 16 mutants, 16 Killed (`noStops` and `stoppedKey` by A2, `announcesStop` by A1, `recordStop` by D4). The scratch config was removed after each run; `.stryker-tmp/` was absent after each.

## Review fix: the ledger-module field rule

`88-SECURITY.md` Observation 1: T-88-08's plan says `ledger-module` refuses any `StopLedger` field beyond `stop` and `count`, and `judgeLedgerModule` read no field. `ledgerFieldsOf` reads the declaration's members (an interface, or an alias of one object type; an `extends` clause or a widened alias is refused) and the mode refuses a member that is not `stop` or `count`, a missing one and one declared twice. The self-test gains 17 cases for it (302 passed).

- the scratch variant: `cp` of `packages/devtools/src/model/StopLedger.ts` to the scratchpad, then a third member `readonly reading: string;` after `readonly count: number;`.
- check failed: ledger-module: packages/devtools/src/model/StopLedger.ts: StopLedger holds reading, which is not one of count, stop (exit 1)
- the same variant under the mode as committed before this fix (`git show HEAD:<dir>/88-check.mjs` run from the scratchpad): exit 0, `ledger-module: the stop ledger is one React-free module only the box and the hook import`, so the variant was invisible to it.
- restored with `cp` from the scratchpad copy; `git status --porcelain -- packages` printed nothing, and `ledger-module` exits 0 on the real module.
