---
"@qadi/react": minor
"@qadi/devtools": patch
---

**Breaking (`@qadi/react`).** The gate registry is owned by the atom set, not the process.

Every instrumented `QadiProvider` used to write its guards into one module-scope map, so two atom sets listed each other's guards, and two hydrated React roots (which derive `useId` from tree position and so mint the same id) silently replaced a still-mounted guard of the other. Each atom set now owns a registry, `atoms.gates`, beside `atoms.asked()`, and registration is a handle only `@qadi/react` can reach. A colliding id is kept, disambiguated as `<id>~<n>`, and reported once (`onGateIdCollision`, or a development warning naming `identifierPrefix`); `data-qadi-gate` still carries React's own id.

Removed, with no shim: `gateInstances`, `subscribeGates`, `registerGate`, `updateGateState` and `clearGatesUnsafe`. Added: `makeGateRegistry`, `GateRegistry`, `GateRegistryOptions`, `useGateInstances`, `QadiAtoms.gates`, `QadiAtomsOptions.onGateIdCollision` and `QadiProviderProps.gates` (hand one registry to several atom sets; it must come from `makeGateRegistry()`). `QadiContextValue` gains `gates`. `QadiAtoms` gains a required `gates` member, so a hand-written `QadiAtoms` test double stops compiling.

Migration:

```ts
// before
useSyncExternalStore(subscribeGates, gateInstances, gateInstances);
// after, inside the provider
const gates = useGateInstances();
// after, outside it
useSyncExternalStore(atoms.gates.subscribe, atoms.gates.instances, atoms.gates.instances);
```

`clearGatesUnsafe()` in a test becomes "build a fresh atom set per test".

`@qadi/devtools` is unchanged in behaviour; its empty-state text now names `useGateInstances()`.
