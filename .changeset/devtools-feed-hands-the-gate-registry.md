---
"@qadi/react": minor
---

**Breaking.** `useDevtoolsFeed().gates` is now the provider's gate registry (`GateRegistry`: the provider's `gates` prop, else `atoms.gates`), not the array of guard instances it was. `<DevtoolsDock {...feed} />` is unchanged, because the dock's `gates` prop takes the registry now. Code that read the array reads `feed.gates.instances()`.

No guard renders differently, and `useGateInstances` is unchanged for a component that wants the list itself. `GateRenderState` is now `@qadi/core`'s `GateState`, the same five words.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
