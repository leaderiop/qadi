---
"@qadi/http": minor
---

**Breaking.** `guardApi` reads each endpoint's access once, when it is built, into one plan that it registers from and that its middleware only looks up; the middleware no longer reads annotations per request.

- An endpoint that declares neither a permission requirement nor `publicEndpoint` now fails `guardApi`'s layer build with the new `AccessNotDeclared`, naming the group and the endpoint. In 0.11.0 the middleware answered 500 on every request to it. `ApiGuardRefusal` is `MisplacedAccessDeclaration | RequirePermissionNotAttached | AccessNotDeclared`; when an API has more than one fault, a misplaced declaration is reported first, then an unattached endpoint, then an undeclared one.
- The middleware serves only the endpoint values of the `HttpApi` value `guardApi` was given. An endpoint of any other `HttpApi` value, including one that reuses the same group and endpoint names and a `prefix`ed copy of the same API, answers 500 with one error log line. Before, membership was by group and endpoint name, so such an endpoint was served under its own declarations, unvetted by `guardApi` and unlisted in `/__permissions`.

Migration: annotate every endpoint with `requiresPermission` or `publicEndpoint`, and pass `guardApi` the same `HttpApi` value `HttpApiBuilder.layer` serves, prefix included: `const Served = Api.prefix("/v1")`, then `HttpApiBuilder.layer(Served)` with `guardApi(Served)`.
