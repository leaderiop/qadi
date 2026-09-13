---
"@qadi/http": minor
---

**Breaking:** `RequirePermission` now declares `requiredForClient: true`, so its full set of twelve enforcement-outcome schemas appears in a generated client's *static* error type for every endpoint it guards — automatically, with no per-endpoint `error:` declaration needed. Previously this required hand-declaring a subset of `RequirePermission`'s own schemas on each endpoint (the workaround `examples/http-advanced/api.ts` used to ship, now removed).

If you build a client via `HttpApiClient.make` against an API using `RequirePermission`, add `Effect.provide(passthroughClientLayer(RequirePermission))` to your layer graph. `passthroughClientLayer` is a new export — a fully generic, one-line forwarding implementation for any `requiredForClient` middleware with no real client-side behavior, not specific to `RequirePermission`.

No runtime behavior changes: `RequirePermission` enforces exactly as before. Only the generated client's static type, and what it now requires to compile, changed. See ADR-QD-075 for the full decision record, including the accepted `PublicEndpoint` over-approximation limitation.
