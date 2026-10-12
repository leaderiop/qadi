---
"@qadi/core": minor
"@qadi/react": minor
"@qadi/devtools": patch
---

Every developer signal `@qadi/react` raises now goes through one module, and the meaning of each hydration drop reason is stated once, in `@qadi/core`.

`@qadi/react`: `QadiProvider` takes `onDeveloperSignal` (type `ProviderSignalReporter`), told `{ _tag: "InstrumentedInProduction" }`, `{ _tag: "AtomsReplaced" }` or `{ _tag: "UnwritableGateRegistry" }` (type `ProviderSignal`, a closed union). Supplying it replaces the development console warning for all three and runs in production, as `onHydrationMismatch` does; without it the warnings are unchanged. **Breaking, for a test double only:** `HydrationDrop` gains a required `wholePayload: boolean`, so a hand-built `HydrationDrop` literal must add it. The default warning for a payload refused whole now reads "hydrateDecisions refused the payload (N decision(s) in it): …" instead of "did not seed 0 decision(s)" beside a counter that read one, and `MalformedPayload`'s sentence now also names the structural depth guard. Every other console message is byte-identical.

`@qadi/core`: `hydrationDropMeaning(reason)` returns `{ summary, remedy }` for a `HydrationDropReason` (`HydrationDropMeaning`), and `isHydrationDropReason(word)` narrows a metric key to one. The console prints `remedy`; the devtools panel shows `summary`.

`@qadi/devtools`: the hydration panel reads each reason's sentence from `hydrationDropMeaning`; the text is unchanged.
