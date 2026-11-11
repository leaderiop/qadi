---
"@qadi/devtools": minor
---

The simulator is a view of its session, and a session owns its runs in a scope. `makeSimulationSession` now returns an `Effect` that needs a `Scope`: a newer run or a superseding command (choosing a policy, a re-seed, a replay, a change of ports) interrupts the run in flight at once, so a superseded Live run stops asking the application's resolvers before the command returns, and closing the scope interrupts it and leaves the session inert. `run(kind)` is a command (it returns `void`; there is no Effect to fork). `reap`, `hasRetired` and `dispose` are removed. `SimulationSessionView` is `{ session, snapshot }`, and `useOwnedSimulationSession` and `useSimulationSession` return `undefined` until their session exists (they build it in a scope the component owns and close it on unmount).

`SimulationSession` gains `setAction(text)` (an empty text removes the action) and `choosePolicyAt(position)` (the select's `selectedIndex`, chosen from `snapshot.policyMenu`); its snapshot gains `policyMenu`, `cost` and `baselineReading`, and a finished run carries its `reading`. New types: `PolicyMenu`, `PolicyMenuOption`, `SweepCost`, `BaselineReading`, `RecordOutcome`, `ObligationState`. The screen computes none of what it shows, so what the dropdown lists, the cost line, the baseline sentence and a result's reading are now under the model's mutation gate.

The session interface has not been released yet (it arrives in the same release as `simulation-session.md`), so no released consumer is broken.
