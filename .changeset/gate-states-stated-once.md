---
"@qadi/core": minor
---

`@qadi/core` now states the five states a guard reports it rendered once, in one module-private table, and exports `GateState`, `gateStates` and `isGateState` read off it: `GateState` is the union (`Failed`, `Denied`, `Rechecking`, `Pending`, `Allowed`), `gateStates` lists them worst news first, and `isGateState` tests an own key, so an inherited name such as `toString` is not a state. `@qadi/react`'s `GateRenderState` is now this type, and `@qadi/devtools` reads its display from it, so a sixth state is a compile error in both. A state a devtools build does not recognise is still shown, as `Unrecognised`.
