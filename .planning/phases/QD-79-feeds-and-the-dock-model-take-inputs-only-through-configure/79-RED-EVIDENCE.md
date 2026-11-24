# Phase 79 RED evidence

Each new check, shown failing once against a scratch edit that was reverted and never committed.

## 79-02 the first-render characterisation

The file is green on the phase base (`910cb7838ac562608880f8e3b067fb2cc4c014b3`, no source file changed). Each scratch edit was applied to `packages/devtools/src`, run with the JSON reporter, and restored with `git checkout -- packages/devtools/src`; `git status --porcelain -- packages/devtools/src` printed nothing afterwards.

- edit F1: the bare build configured one effect later (`useDockModel.ts` builds `makeDockModel()`, `useDiagnostics.ts` builds `makeDiagnosticsFeed()`, `useTimeline.ts` builds `makeTimelineFeed()`, each keeping its configure effect)
- failed: C1 a dock handed diagnostics and gates commits only its configured state
- failed: C2 the same dock under StrictMode commits no unconfigured state and subscribes twice
- failed: C3 a dock handed gates and no diagnostics commits Off with the gates listed
- failed: C4 a registry whose subscribe throws is read as failed in every commit and retried once
- failed: C5 useDiagnostics reads its options on every render, never Off between two Starting
- failed: C6 useTimeline reads a capacity of 50 as 0 entries at 500 then 1 at 50
- failed: C7 inputs swapped while the dock is hidden are the ones its first commit after the reveal holds
- failed: C8 hiding and showing in one rerender with new inputs holds the new inputs on the first commit
- failed: C9 three unsettled changes while hidden leave the first commit after the reveal on the last inputs
- failed: C10 a refused capacity commits no reader and reaches the boundary as the original error

- edit F2: a build closure held from the first render (`useDockModel.ts` holds the first render's eight inputs with `useState(() => ...)[0]` and builds the model from them)
- failed: C7 inputs swapped while the dock is hidden are the ones its first commit after the reveal holds
- failed: C8 hiding and showing in one rerender with new inputs holds the new inputs on the first commit
- failed: C9 three unsettled changes while hidden leave the first commit after the reveal on the last inputs

- edit F3: `useScoped.ts`'s catch rethrows without closing the scope (the `close()` call removed)
- failed: C11 a scoped build that throws closes its scope before the boundary receives the original error

## 79-03 the feed cells of the rule

The cells are in `packages/devtools/test/model/ConfigureRule.test.ts`, built through `packages/devtools/test/builtFeeds.ts`, and are written on the phase base (`910cb7838ac562608880f8e3b067fb2cc4c014b3`, no source file changed). On the base exactly the two gates no-op cells fail, on the registry read count: the code before ADR-QD-192 reads the registry on every configure. Every other cell is green on the base and is shown failing once by a scratch edit of a feed, run with the JSON reporter and restored with `git checkout -- packages/devtools/src`; `git status --porcelain -- packages/devtools/src` printed nothing afterwards. The scratch edits also fail the two gates cells that are red on the base; those are listed once, under the base run.

- red on the base: CR11 a fresh literal holding the same registry, thunk and interval reads the registry no more, calls the thunk no more and publishes nothing
- red on the base: CR12 an omitted questions thunk and interval and ones holding undefined are one input: nothing is read and nothing is published
- failed: CR11 a fresh literal holding the same registry, thunk and interval reads the registry no more, calls the thunk no more and publishes nothing
- failed: CR12 an omitted questions thunk and interval and ones holding undefined are one input: nothing is read and nothing is published

- edit R1: `TimelineFeed.ts`: a configure that always starts a read (the source and capacity comparison replaced by an unconditional `readSource`)
- failed: CR1 a fresh literal holding the same source and capacity publishes nothing and starts no read
- failed: CR2 an omitted capacity, an undefined one and the default are one bound, and an omitted source and an undefined one are one input

- edit R2: `TimelineFeed.ts`: a configure that ignores a moved source (the source comparison removed)
- failed: CR4 each input moved alone makes the feed react

- edit R3: `TimelineFeed.ts`: a configure that ignores a moved capacity (`resize` handed the bound already held)
- failed: CR4 each input moved alone makes the feed react
- failed: CR5 each input given at build and given through configure reaches the same state, while the constructor takes inputs

- edit R4: `TimelineFeed.ts`: an omitted capacity read as a bound of 1 instead of `DEFAULT_TIMELINE_CAPACITY` in `effectiveCapacity`
- failed: CR2 an omitted capacity, an undefined one and the default are one bound, and an omitted source and an undefined one are one input
- failed: CR3 a bare build reads what an empty input read, and configuring an empty input right after it publishes nothing

- edit R5: `TimelineFeed.ts`: a bare build whose timeline starts at a capacity of 5 instead of the default
- failed: CR3 a bare build reads what an empty input read, and configuring an empty input right after it publishes nothing

- edit R6: `DiagnosticsFeed.ts`: a configure that always restarts the poll (the per-field comparison replaced by `true`)
- failed: CR6 a fresh literal holding the same layer, collector and interval restarts nothing and publishes nothing
- failed: CR7 on a bare feed undefined publishes nothing, an empty object turns it on, a fresh empty object publishes nothing, and undefined turns it Off once

- edit R7: `DiagnosticsFeed.ts`: a configure that ignores a moved layer (the layer comparison removed)
- failed: CR9 each input moved alone restarts the poll once

- edit R8: `DiagnosticsFeed.ts`: a configure that ignores a moved collector (the collector comparison removed)
- failed: CR9 each input moved alone restarts the poll once

- edit R9: `DiagnosticsFeed.ts`: a configure that ignores a moved interval (the interval comparison removed)
- failed: CR9 each input moved alone restarts the poll once

- edit R10: `DiagnosticsFeed.ts`: a configure of `undefined` that does not turn the feed off (`off()` removed)
- failed: CR7 on a bare feed undefined publishes nothing, an empty object turns it on, a fresh empty object publishes nothing, and undefined turns it Off once

- edit R11: `DiagnosticsFeed.ts`: a bare build that starts a poll on empty options (`start(init ?? {})`)
- failed: CR7 on a bare feed undefined publishes nothing, an empty object turns it on, a fresh empty object publishes nothing, and undefined turns it Off once
- failed: CR8 a bare build reads Off by identity, as a build handed undefined does, and configuring undefined right after it publishes nothing

- edit R12: `DiagnosticsFeed.ts`: a configure of options over a feed that held none that never starts (`before === undefined` replaced by `false`)
- failed: CR6 a fresh literal holding the same layer, collector and interval restarts nothing and publishes nothing
- failed: CR7 on a bare feed undefined publishes nothing, an empty object turns it on, a fresh empty object publishes nothing, and undefined turns it Off once
- failed: CR9 each input moved alone restarts the poll once
- failed: CR10 each input given at build and given through configure reaches the same state, while the constructor takes inputs

- edit R13: `DiagnosticsFeed.ts`: an `off` that publishes a fresh object each time instead of `diagnosticsOff`
- failed: CR7 on a bare feed undefined publishes nothing, an empty object turns it on, a fresh empty object publishes nothing, and undefined turns it Off once
- failed: CR8 a bare build reads Off by identity, as a build handed undefined does, and configuring undefined right after it publishes nothing

- edit R14: `GatesFeed.ts`: a configure that ignores a moved registry (the registry comparison removed)
- failed: CR14 each input moved alone makes the feed react
- failed: CR15 each input given at build and given through configure reaches the same state, while the constructor takes inputs

- edit R15: `GatesFeed.ts`: a configure that ignores a moved questions thunk (the thunk comparison removed)
- failed: CR14 each input moved alone makes the feed react

- edit R16: `GatesFeed.ts`: a configure that ignores a moved interval (the interval comparison removed)
- failed: CR14 each input moved alone makes the feed react

- edit R17: `GatesFeed.ts`: a bare build that reads its registry as `Failed` when none was handed
- failed: CR13 a bare build reads unwatched and unhanded, as an empty input does, and nothing runs until it is handed something

## 79-04 the dock cells of the rule

The cells are in `packages/devtools/test/model/ConfigureRule.test.ts` (the `the dock model` block, after the feed cells, which are unchanged), built through `packages/devtools/test/builtFeeds.ts`, and are written on the phase base (`910cb7838ac562608880f8e3b067fb2cc4c014b3`, no source file changed). On the base exactly the two feed cells of 79-03 and the two dock no-op cells fail, on the registry read count: the code before ADR-QD-192 hands the gates feed the registry again on every dock configure. Every other dock cell is green on the base and is shown failing once by a scratch edit of `DockModel.ts`, run with the JSON reporter and restored with `git checkout -- packages/devtools/src`; `git status --porcelain -- packages/devtools/src` printed nothing afterwards. The scratch edits also fail the four cells that are red on the base; those are listed once, under the base run.

The first-configure counts of CR22 were measured on the base. With a layer that is still building the counts are the ones the research recorded (timeline 2, dock 2, explorer 3, simulation 3, roles 0, diagnostics 1, timelineStatus 0, questions 2, services 1). With a layer that builds at once the poll's `Live` adds one notification on each of the diagnostics, questions and services stores (2, 3 and 2); the cell pins both.

- red on the base: CR11 a fresh literal holding the same registry, thunk and interval reads the registry no more, calls the thunk no more and publishes nothing
- red on the base: CR12 an omitted questions thunk and interval and ones holding undefined are one input: nothing is read and nothing is published
- red on the base: CR16 a fresh literal holding the eight inputs notifies no store and reads no registry, thunk or source
- red on the base: CR17 an omitted input and one holding undefined are one input: nothing is notified and nothing is read
- failed: CR11 a fresh literal holding the same registry, thunk and interval reads the registry no more, calls the thunk no more and publishes nothing
- failed: CR12 an omitted questions thunk and interval and ones holding undefined are one input: nothing is read and nothing is published
- failed: CR16 a fresh literal holding the eight inputs notifies no store and reads no registry, thunk or source
- failed: CR17 an omitted input and one holding undefined are one input: nothing is notified and nothing is read

- edit K1: `DockModel.ts`: a configure that never hands the timeline feed the source
- failed: CR20 each input moved alone makes the store it reaches react
- failed: CR21 each input given at build and given through configure reaches the same state, while the constructor takes inputs
- failed: CR22 a reader subscribed to every store of a bare dock before its first configure hears 2, 2, 3, 3, 0, 1, 0, 2 and 1 notifications while the poll layer is still building, and one more on three stores once it has built

- edit K2: `DockModel.ts`: a configure that drops the ports (the `setPorts` call removed)
- failed: CR20 each input moved alone makes the store it reaches react
- failed: CR21 each input given at build and given through configure reaches the same state, while the constructor takes inputs

- edit K3: `DockModel.ts`: an omitted capacity read as a bound of 7 instead of `DEFAULT_TIMELINE_CAPACITY` in `configure`
- failed: CR18 an omitted capacity, an undefined one and the default are one bound: the timeline snapshot stays and no read starts
- failed: CR19 a bare build reads what an empty input read in every store, and configuring an empty input right after it notifies none

- edit K4: `DockModel.ts`: a bare build whose timeline starts at a capacity of 7 instead of the default
- failed: CR19 a bare build reads what an empty input read in every store, and configuring an empty input right after it notifies none

- edit K5: `DockModel.ts`: a catalogue change that does not hand the explorer its sightings (`explorer.setSightings` removed from `spread`)
- failed: CR21 each input given at build and given through configure reaches the same state, while the constructor takes inputs
- failed: CR22 a reader subscribed to every store of a bare dock before its first configure hears 2, 2, 3, 3, 0, 1, 0, 2 and 1 notifications while the poll layer is still building, and one more on three stores once it has built

- edit K6: `DockModel.ts`: a configure that ignores a moved catalogue (the comparison replaced by `false`)
- failed: CR20 each input moved alone makes the store it reaches react
- failed: CR21 each input given at build and given through configure reaches the same state, while the constructor takes inputs
- failed: CR22 a reader subscribed to every store of a bare dock before its first configure hears 2, 2, 3, 3, 0, 1, 0, 2 and 1 notifications while the poll layer is still building, and one more on three stores once it has built

- edit K7: `DockModel.ts`: a configure that hands the gates feed the registry it held before
- failed: CR20 each input moved alone makes the store it reaches react
- failed: CR21 each input given at build and given through configure reaches the same state, while the constructor takes inputs

- edit K8: `DockModel.ts`: a configure that hands the gates feed the questions thunk it held before
- failed: CR20 each input moved alone makes the store it reaches react
- failed: CR21 each input given at build and given through configure reaches the same state, while the constructor takes inputs

- edit K9: `DockModel.ts`: a configure that hands the diagnostics feed the options it held before
- failed: CR20 each input moved alone makes the store it reaches react
- failed: CR21 each input given at build and given through configure reaches the same state, while the constructor takes inputs
- failed: CR22 a reader subscribed to every store of a bare dock before its first configure hears 2, 2, 3, 3, 0, 1, 0, 2 and 1 notifications while the poll layer is still building, and one more on three stores once it has built

- edit K10: `DockModel.ts`: a configure that never refreshes the shown reading (`shownReading.refresh()` removed)
- failed: CR20 each input moved alone makes the store it reaches react

- edit K11: `DockModel.ts`: a configure that hands the timeline feed the capacity it held before
- failed: CR20 each input moved alone makes the store it reaches react
- failed: CR21 each input given at build and given through configure reaches the same state, while the constructor takes inputs
- failed: CR22 a reader subscribed to every store of a bare dock before its first configure hears 2, 2, 3, 3, 0, 1, 0, 2 and 1 notifications while the poll layer is still building, and one more on three stores once it has built

- edit K12: `DockModel.ts`: a catalogue change that dispatches one more command to the simulation (`simulation.setPairs(true)` after `spread`)
- failed: CR21 each input given at build and given through configure reaches the same state, while the constructor takes inputs
- failed: CR22 a reader subscribed to every store of a bare dock before its first configure hears 2, 2, 3, 3, 0, 1, 0, 2 and 1 notifications while the poll layer is still building, and one more on three stores once it has built

## 79-07 the rule and the timeline and diagnostics feeds

- edit E1: `ExternalStore.ts`: `sameFieldsOrAbsent` comparing two present records with `a === b`
- failed: sameFieldsOrAbsent compares two present records field by field

- edit E2: `ExternalStore.ts`: `sameFieldsOrAbsent` answering true when either side is absent
- failed: sameFieldsOrAbsent tells an absent input from an empty record on either side

- edit E3: `ExternalStore.ts`: `sameFields` answering false for every pair (the length comparison replaced by `false`)
- failed: sameFields holds for two fresh records with the same field values and fails when one field differs
- failed: sameFieldsOrAbsent compares two present records field by field

- edit E4: `ExternalStore.ts`: `sameFieldsOrAbsent` answering false for two absent inputs
- failed: sameFieldsOrAbsent holds for two absent inputs

- edit E5: `DiagnosticsFeed.ts`: a feed that holds and compares the raw options without normalising them (`completeDiagnosticsOptions` not applied to the held or the wanted options)
- failed: CR23 an omitted option and one holding undefined are one option: nothing restarts and nothing is published

- edit E6: `DiagnosticsFeed.ts`: a configure that returns on `held === wanted` instead of `sameFieldsOrAbsent(held, wanted)`
- failed: CR6 a fresh literal holding the same layer, collector and interval restarts nothing and publishes nothing
- failed: CR7 on a bare feed undefined publishes nothing, an empty object turns it on, a fresh empty object publishes nothing, and undefined turns it Off once
- failed: CR23 an omitted option and one holding undefined are one option: nothing restarts and nothing is published

- edit E7: `surface.tst.ts`: the DiagnosticsOptions pin kept at the narrow field types against the widened type
- failed: DiagnosticsOptions is a layer, a collector and an interval, and nothing else

## 79-08 the timeline feed rule is its one decision

- edit R1: `TimelineFeed.ts`: the `sameFields(held, wanted)` guard in `configure` replaced by `false`, after the second comparison was removed
- failed: CR1 a fresh literal holding the same source and capacity publishes nothing and starts no read
- failed: CR2 an omitted capacity, an undefined one and the default are one bound, and an omitted source and an undefined one are one input
- failed: CR18 an omitted capacity, an undefined one and the default are one bound: the timeline snapshot stays and no read starts
- failed: TF2 configuring the same source and capacity reads nothing again and notifies nothing
- failed: TF33 an omitted capacity and the default capacity are one bound: moving between them keeps the timeline and reads nothing again

## 79-08 the gates rule and the input pins

- red before the rule: G44 (twin of M44): a registry that mends without announcing stays Failed until something reads it again
- red before the rule: 13 a silent mend is not read by a re-render with unchanged inputs

- edit T1: `TimelineFeed.ts`: `readonly extra?: number | undefined` added to `TimelineFeedInputs`
- failed: tsc TS2322 packages/devtools/src/model/TimelineFeed.ts
- failed: a timeline feed compares a capacity and a source, each present and possibly undefined

- edit T2: `DiagnosticsStore.ts`: `readonly extra?: number | undefined` added to `DiagnosticsOptions`
- failed: tsc TS2741 packages/devtools/src/model/DiagnosticsFeed.ts
- failed: a diagnostics feed compares a layer, a collector and an interval, each present and possibly undefined

- edit T3: `GatesFeed.ts`: `readonly extra?: number | undefined` added to `GatesFeedInputs`
- failed: tsc TS2741 packages/devtools/src/model/GatesFeed.ts
- failed: a gates feed compares a registry, a thunk and an interval, each present and possibly undefined

## 79-09 the dock maps its inputs in one place

- edit D1: `DockModel.ts`: `feedInputsOf` reading the gates interval from nowhere (`intervalMillis: undefined`)
- failed: CR24 a complete dock record maps onto its feeds, the diagnostics interval reaching the gates, and without diagnostics the gates interval and the diagnostics record are absent

- CR16 and CR17 were already green at the start of this plan (the dock's configure reached each feed's own no-op after the feeds' rules); their RED run on the base is recorded in 79-04, and they stay green.

- edit T4: `DockModel.ts`: `readonly extra?: number | undefined` added to `DockModelInputs`
- failed: tsc TS2741 packages/devtools/src/model/DockModel.ts
- failed: a dock model compares eight inputs, each present and possibly undefined, and maps them onto its three feeds

## 79-10 the hook

Each scratch edit was applied to `packages/devtools/src/react/useConfigured.ts`, run with the JSON reporter against `packages/devtools/test/react/useConfigured.test.tsx`, and restored from a copy; `git status --porcelain -- packages/devtools/src` shows only the committed hook and the `useScoped.ts` comment afterwards. The four cells are green on the real hook.

- edit H1: fold (c), the build left bare (`useScoped(make)`), so only the change effect configures
- failed: U1 the first commit a child makes reads the value already configured with the first inputs
- edit H2: the build wraps `configure(built, inputs)` in a `try`/`catch` that swallows the throw
- failed: U2 a configure that throws on the first build closes the scope and reaches the boundary as itself
- edit H3: the change effect's dependencies are `[value]` only
- failed: U3 a new inputs record configures once more and the same record configures nothing more
- edit H4: the build reads its inputs from `useState(() => inputs)[0]`, the first render's closure
- failed: U4 a value hidden, handed new inputs and shown again is rebuilt configured with them, also under StrictMode

## 79-11 the dock props

The scratch edit was applied to `packages/devtools/src/model/DockModel.ts`, run with `pnpm test:tstyche`, and restored from a copy of the file taken before the edit (the whole change is uncommitted at that point, so a checkout of the source folder would have removed it); `git diff` shows only the intended change afterwards. The cell is green on the real type.

- edit P1: `DockModel.ts`: `readonly extra?: number | undefined` added to `DockModelInputs`
- failed: the dock takes eight model inputs and two host props, each accepting undefined

- edit P2: `scripts/check-package-install.mjs`: `extra: 1` added to the packed consumer's `dockProps` literal; gate 14 failed with `TS2353: Object literal may only specify known properties, and 'extra' does not exist in type 'DevtoolsDockProps'`, restored from a copy; the committed gate is green.

## 79-12 the bare constructors

The scratch edit was applied to `packages/devtools/src/model/GatesFeed.ts`, with the uncommitted task work in the tree, so it was restored from a copy taken just before the edit; `git diff` shows only the intended change afterwards.

- edit B1: `makeGatesFeed`'s generator given an optional parameter, `function* (_scratch?: number)`
- failed: `scripts/check-package-install.mjs` with `TS2322: Type 'true' is not assignable to type 'false'` on the packed consumer's `Parameterless<typeof makeGatesFeed>` constant
- failed: `surface.tst.ts`, each feed is built in a scope and fails with nothing (the `Parameters<typeof makeGatesFeed>` pin)
- edit B1 again, on the final alias form (orchestrator re-run, 2026-11-24, at d3c07e17): the packed consumer's `type GatesFeedIsBare = [Parameters<typeof makeGatesFeed>] extends [[]] ? true : false` with the scratch `function* (_scratch?: number)` built into `lib`
- failed: `scripts/check-package-install.mjs` exit 1, `.package-check/consumer.ts(213,7): error TS2322: Type 'true' is not assignable to type 'false'`; the file was restored from a copy and `lib` rebuilt from the committed source

## 79-14 the gate registry read counts (orchestrator-decided pin)

The new file `packages/devtools/test/react/DockRegistryReads.test.tsx` pins, through `useDockModel`, the `instances()` read counts ADR-QD-192 states: a healthy registry read once and subscribed once, and read twice and subscribed twice under StrictMode; a registry whose `subscribe` throws read never and subscribed twice, and three times under StrictMode; a re-render with a fresh inputs record holding the same fields reads and subscribes nothing; and one that moves an input of the gates feed reads the registry once. The exact counts held on the installed React, so the ADR states them and the file pins them. The scratch edit was applied to `packages/devtools/src/model/GatesFeed.ts`, run with `pnpm exec vitest run --project devtools packages/devtools/test/react/DockRegistryReads.test.tsx`, and restored from a copy taken just before it (the test file was committed first); `git status --porcelain -- packages/devtools/src` is empty afterwards.

- edit R1: `GatesFeed.ts`: the early return of `configure` made unreachable (`if (false && sameFields(held, wanted) && watchFailure === undefined) return;`), so a `configure` that moves nothing reads the registry
- failed: a healthy registry is read once under the hook and twice under StrictMode (`expected 2 to equal 1`, the build's second `configure` read it)
- failed: a re-render with a fresh inputs record holding the same fields reads nothing and subscribes nothing (`{ reads: 4, subscribes: 1 }` against `{ reads: 2, subscribes: 1 }`)
