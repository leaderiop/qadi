---
"@qadi/audit": minor
---

**Breaking.** `AuditDecisionSinkLive`'s layer is now `Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>`, where its error was `never`. Building it with an option that cannot work fails with `InvalidAuditSinkOption`, naming the option and the value received. Refused: a `failureThreshold` that is not a positive whole number (`NaN` built a breaker that never opened), a `resetTimeoutMs` that is not a finite, positive, whole number of milliseconds, and a `storeCallTimeout` that is not a positive duration (zero timed every store call out at once). `Duration.infinity` is still accepted as no deadline. This is also a runtime break: `failureThreshold: Infinity` (a breaker that never opens) and `resetTimeoutMs: Duration.infinity` (a breaker that never leaves Open) were accepted and are now refused, as is any value past `Number.MAX_SAFE_INTEGER`. Pass `Number.MAX_SAFE_INTEGER` for either to keep the effect; the sink has no option to run without its breaker. A composition that passes no options, or valid ones, behaves as before; code that annotates the layer, or an `Effect` that provides it, with an error of `never` must widen it.

The breaker's rules are now one transition function. Its status, announcements and `transitionsTotal` are unchanged. `InvalidAuditSinkOption` is exported.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
