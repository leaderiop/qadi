---
"@qadi/devtools": minor
---

**Breaking.** The `SimulationClock` type is removed. Import `EvaluationClock` from `@qadi/core` instead; it has the same members, `"live" | "deterministic"`.

The simulation is now built on core's `evaluationEnvironment` with `shadow: "sinkAndCache"`. What it seals is unchanged.
