---
"@qadi/core": minor
---

One evaluation environment, built in one place. `evaluationEnvironment(options)` assembles it from already-built ports, an id prefix, a clock layer and a required `shadow`: `"none"` keeps an outer decision sink and cache in effect, `"sinkAndCache"` installs a discarding sink and a private cache per build.

- New exports: `evaluationEnvironment`, `EvaluationEnvironmentOptions`, `EvaluationShadowing` and the type-only `EvaluationClock` (`"live" | "deterministic"`), the clock word `@qadi/testing` and `@qadi/devtools` each map to a layer.
- No existing export changes.
