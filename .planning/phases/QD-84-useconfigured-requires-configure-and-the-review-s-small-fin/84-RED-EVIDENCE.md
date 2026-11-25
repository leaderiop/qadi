# Phase 84 RED evidence

Each line below is written when its failure is seen, from the command's own output, never reconstructed. A line of the
form `- check failed: <mode>: <first stderr line>` shows a run mode of `84-check.mjs` failing once; the lines indented
under it are the rest of that run's stderr. A test's failure lines use the `seen-failing` formats (`- failed: <title>`,
`- failed (<tag>): <title>`, `- red on the base: <title>`).

## 84-01 the check helper

- check failed: commit: 0 commits since phase_base have the subject: wrong subject
- check failed: unchanged: packages/devtools/src/model/LensSession.ts differs from phase_base
- check failed: scan-ids: packages/devtools/src/model/LensSession.ts:194 names a requirement id: const planted = value as Planted; // ADPT-01
- check failed: scan-forbidden: packages/devtools/src/model/LensSession.ts:194 uses an as cast: const planted = value as Planted; // ADPT-01
- check failed: seen-failing: no failure line in the evidence for: planted
- check failed: trailers: the message has 2 Co-Authored-By lines, not one
- check failed: no-adapter: configureDiagnostics named in packages/devtools/src/react/useDiagnostics.ts:19
  - configureDiagnostics named in packages/devtools/src/react/useDiagnostics.ts:44
  - configureDock named in packages/devtools/src/react/useDockModel.ts:22
  - configureDock named in packages/devtools/src/react/useDockModel.ts:30
  - configureTimeline named in packages/devtools/src/react/useTimeline.ts:44
  - configureTimeline named in packages/devtools/src/react/useTimeline.ts:71
  - useConfigured takes 3 parameters, not two
  - Configurable is declared 0 times, not once
  - useConfigured is called with 3 arguments at packages/devtools/src/react/useDiagnostics.ts:44
  - useConfigured is called with 3 arguments at packages/devtools/src/react/useDockModel.ts:30
  - useConfigured is called with 3 arguments at packages/devtools/src/react/useTimeline.ts:71
- check failed: no-restated-set: LensSession.ts declares move
  - LensSession.ts calls publish at line 151
  - LensSession.ts calls publish at line 173
  - toggle does not publish through store.set
  - hover does not publish through store.set
  - cancel does not publish through store.set
  - highlight does not publish through store.set
  - choose calls store.set 0 times, not once
- check failed: one-path: useLens takes 3 parameters, not two
  - useLens calls useStoreSnapshot 1 times, not twice
  - UseLens is not declared in useLens.ts
  - QuestionsPanel.tsx subscribes to the questions store itself at line 114
- check failed: one-ledger: useRef<StopLedger in packages/devtools/src/react/DevtoolsDock.tsx:117
  - useRef<StopLedger in packages/devtools/src/react/DevtoolsDock.tsx:124
  - src/react holds 2 useRef<StopLedger calls, not one
  - useStopNotice.ts does not exist
  - StopNoticeProps is declared 0 times, not once in StoppedBox.tsx
  - DiagnosticsNoticeProps is not an alias of StopNoticeProps
  - TimelineNoticeProps is not an alias of StopNoticeProps
  - DevtoolsDock.tsx calls useStopNotice 0 times, not twice
- check failed: records: BEH-QD-737 quotes "a click made with no ptr is placed by the control it was made on, not by a point it did not report" for packages/devtools/test/react/Lens.adapter.test.tsx, which holds no such test
- check failed: records --close: BEH-QD-756 has no heading in spec/behaviors/28-devtools-screens.md
  - BEH-QD-756 has no row in spec/traceability.md §1
  - BEH-QD-757 has no heading in spec/behaviors/28-devtools-screens.md
  - BEH-QD-757 has no row in spec/traceability.md §1
  - BEH-QD-758 has no heading in spec/behaviors/28-devtools-screens.md
  - BEH-QD-758 has no row in spec/traceability.md §1
  - BEH-QD-759 has no heading in spec/behaviors/28-devtools-screens.md
  - BEH-QD-759 has no row in spec/traceability.md §1
  - BEH-QD-760 has no heading in spec/behaviors/28-devtools-screens.md
  - BEH-QD-760 has no row in spec/traceability.md §1
  - INV-QD-413 has no heading in spec/invariants.md
  - INV-QD-413 has no row in spec/traceability.md §2
  - INV-QD-414 has no heading in spec/invariants.md
  - INV-QD-414 has no row in spec/traceability.md §2
  - spec/decisions/197-*.md does not exist
  - spec/decisions/index.yaml has no ADR-QD-197 entry
  - ADR-QD-197 has no row in spec/traceability.md §3
  - the Lens.adapter.test.tsx row does not name BEH-QD-758
  - the Lens.adapter.test.tsx row does not name INV-QD-414
  - the useConfigured.test.tsx row does not name BEH-QD-756
  - the LensSession.test.ts row does not name BEH-QD-757
  - the LensSession.test.ts row does not name INV-QD-413
  - spec/traceability.md §4 holds 0 rows for packages/devtools/test/react/Lens.questions.characterisation.test.tsx, not one
  - spec/traceability.md §4 holds 0 rows for packages/devtools/test/react/DockFrame.stops.characterisation.test.tsx, not one
  - spec/traceability.md §4 holds 0 rows for packages/devtools/test/react/useTimeline.inputs.characterisation.test.tsx, not one
  - spec/traceability.md §4 holds 0 rows for packages/devtools/test/react/useConfigured.tst.ts, not one
  - spec/README.md has no CCR-QD-476 row

## 84-02 the pinned-test check and the earlier-phase re-run

- check failed: pinned --all-applied: packages/devtools/test/react/Lens.adapter.test.tsx: 0 of 2 declared edits applied, not all
- check failed: pinned: packages/devtools/test/model/LensSession.test.ts: differs from its base text at line 399
- check failed: earlier: 83-pinned-check.mjs --all-applied: expected exit 0, got exit 1: packages/devtools/test/model/DockModel.characterisation.test.ts: differs from its base text at line 386

## 84-03 the lens over the questions store

- failed (stale-draw): LQ1 a highlight follows a guard the questions store republishes with another element
  - AssertionError: moved to the element the store now lists: expected [ '100' ] to deeply equal [ '300' ]
- failed (stale-draw): LQ3 a guard dropped from the store while it is highlighted leaves no overlay
  - AssertionError: gone once the store lists no guard: expected [ 'g1' ] to deeply equal []
- failed (captured-guards): LQ2 a pointer move and a click while picking resolve against the current list of the store
  - AssertionError: the guard registered while picking is hovered: expected [] to deeply equal [ 'g2' ]
- failed (second-subscription): LQ4 the panel holds one subscription to each store across the publishes
  - AssertionError: after mount: expected [ 1, 2 ] to deeply equal [ 1, 1 ]

## 84-03 the arm-before-publish pin on the base

- failed (arm-after-publish): a listener told of a pick can take its reveal
  - AssertionError: expected [ false ] to deeply equal [ true ]

## 84-04 the dock's two stop notices

- failed (shared-ledger): DS1 a diagnostics stop and a timeline stop are each announced once, across tab switches between their screens
  - AssertionError: the timeline stop on Log, mounted again: expected 'alert' to equal 'none'
- failed (shared-ledger): DS2 a second stop of one feed remounts only its own box, and the other stop is not announced again
  - AssertionError: expected 'alert' to equal 'none'
- failed (swapped-restarts): DS3 after a hidden-then-shown dock, Restart on each notice restarts the rebuilt feed of its own kind
  - AssertionError: expected 2 to be above 2

## 84-05 the timeline hook's per-render inputs

- failed (no-same-fields): TI1 a re-render with a fresh options object holding the same capacity and source publishes nothing from either store
  - Error: Maximum update depth exceeded (the feed re-reads and republishes on every render, so the hook re-renders without end)
- failed (no-same-fields): TI2 a re-render with no options after no options publishes nothing from either store
  - Error: Maximum update depth exceeded
- failed (configure-ignored): TI3 a re-render with a moved capacity publishes from the timeline store and moves the status
  - AssertionError: expected +0 to be above +0

## 84-05 the useConfigured double

- failed (no-tap): U1 the first commit a child makes reads the value already configured with the first inputs
  - AssertionError: expected [] to deeply equal [ 'first' ]
- failed (swallowed-throw): U2 a configure that throws on the first build closes the scope and reaches the boundary as itself
  - AssertionError: expected [ [] ] to deeply equal []
- failed (value-only-key): U3 a new inputs record configures once more and the same record configures nothing more
  - AssertionError: expected 2 to equal 3
- failed (first-inputs): U4 a value hidden, handed new inputs and shown again is rebuilt configured with them, also under StrictMode
  - AssertionError: expected 'first' to equal 'second'

## 84-06 the configurable constraint

- failed (configure-returns): the three values each have configure over their own inputs
  - Error: Type 'DockModel' is not assignable to type 'Configurable<DockModelInputs>'.
- failed (widened-return): the three hooks keep their return types
  - Error: Type 'DockModel | null | undefined' is not the same as type 'DockModel | undefined'.
- failed (loosened-constraint): a value with no configure is refused, and its twin with configure is accepted
  - Error: Unused '@ts-expect-error' directive. ts(2578)
- check failed: refusal Configurable: Unused '@ts-expect-error' directive. ts(2578)
- check failed: refusal ReactConfigurable: Unused '@ts-expect-error' directive. ts(2578)
