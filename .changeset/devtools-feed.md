---
"@qadi/react": minor
"@qadi/devtools": patch
---

`useDevtoolsFeed(extra)` and `runtimeLayer(atoms, registry)`: hand the devtools dock everything it reads off the atom set in one call. `useDevtoolsFeed` returns `gates`, `onInvalidate` and a `diagnostics` (your `extra` plus a `layer` and `questions`) to spread onto `<DevtoolsDock {...feed} />`; the layer is the provider's own built runtime context, mounted for the dock's run, so the dock's wiring read sees the decision cache your guards filled and no stateful layer needs hoisting out of the atom set. Setting `layer` or `questions` in `extra` is a compile error. `DevtoolsFeed` and `DevtoolsDiagnosticsFeed` are exported types. `@qadi/devtools` gains no API (documentation and doc comments only), and still has no dependency on `@qadi/react` (ADR-QD-053, BEH-QD-327, ARCH-34).
