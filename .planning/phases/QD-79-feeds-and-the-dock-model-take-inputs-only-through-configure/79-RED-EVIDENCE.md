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
