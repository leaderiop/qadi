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
