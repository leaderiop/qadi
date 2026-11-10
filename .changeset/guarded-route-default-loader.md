---
"@qadi/http": minor
---

`addGuardedRoute`'s `loadResource` is optional: the four-argument form evaluates against `NO_RESOURCE`, as `authorizeRequest` already does. Additive; the five-argument form is unchanged.
