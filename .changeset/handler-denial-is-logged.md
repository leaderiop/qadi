---
"@qadi/http": minor
---

A denial raised by a handler's own `guard` is now logged. Under `RequirePermission`, `guardRoute` and `addGuardedRoute` it was answered 403 and left no server-side line, contradicting the `logDenial` contract (one record per denial on every surface). The surface now logs it once through `logDenial`, and every denial line carries a `qadi.denial_site` log annotation, `"edge"` for the authorization step and `"handler"` for a handler's own `guard`; an edge denial is still logged exactly once. `guardRoute`'s and `addGuardedRoute`'s handler error channel widens from `never` to `HttpEnforcementFailure`, so a handler need not catch its own `guard`'s failure (an input widening: every existing handler still type-checks).
