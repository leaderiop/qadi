---
"@qadi/testing": minor
---

**Breaking.** `TestLayerOptions.clock` takes `@qadi/core`'s `EvaluationClock`, so the deterministic clock is `clock: "deterministic"`, where it was `clock: "test"`. `"live"` is still the default.

`qadiReviewLayer` is now built on core's `evaluationEnvironment` with `shadow: "none"`. Its behaviour is unchanged and is now stated: an outer decision sink and an outer cache stay in effect.
