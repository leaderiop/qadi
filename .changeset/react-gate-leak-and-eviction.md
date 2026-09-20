---
"@qadi/react": minor
---

Fixed a real leak in `GateRegistry`: its unmount cleanup compared the closed-over `GateInstance` by reference, but `updateGateState` replaces the stored instance with a new object on every render-state change — so a gate leaked (including its DOM element reference) after its very first state transition. Cleanup now tracks a stable per-registration token instead.

`QadiAtoms` gained bounded-count eviction for its long-lived question/decision bookkeeping (`maxTrackedQuestions`, `sweepEvictions`, run periodically by `QadiProvider`), replacing unbounded growth. A related desync — an evicted-then-re-asked question could silently vanish from `asked()`/devtools forever because `Atom.family` handed back its still-cached atom without re-registering — is also fixed.

`useProjected` now registers under its own name instead of being mislabeled `useDecision` in the devtools panel.
