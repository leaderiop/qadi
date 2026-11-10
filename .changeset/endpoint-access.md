---
"@qadi/http": minor
---

**Breaking.** An endpoint's access declaration is read once, from the endpoint's own annotations, by `guardApi`'s access plan, which both the middleware and the registry use (BEH-QD-320). The registry used to read the API-, group- and endpoint-level merge, so a group requirement over an endpoint-level `publicEndpoint` was listed in `/__permissions` as guarded while the middleware served it to anyone; that disagreement is gone.

- A `RequiredPermission` or `PublicEndpoint` on a group or an API is now refused instead of ignored: `guardApi` fails to build with the new `MisplacedAccessDeclaration`, naming the group or the API.
- `requiresPermission` no longer accepts a group or an API (`AnnotatedEndpoint` also requires `method` and `path`).
- Added `AccessDeclarationKey` and `MisplacedAccessDeclaration`.

Migration: move the declaration to each endpoint, or write it once with `HttpApiGroup.annotateEndpoints(RequiredPermission, requiresPermission(endpoint, …))`, which lands in each endpoint's own annotations. Handle the new error in the layer that composes `guardApi`, or `Layer.orDie` it at the top of the application.
