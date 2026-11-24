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
