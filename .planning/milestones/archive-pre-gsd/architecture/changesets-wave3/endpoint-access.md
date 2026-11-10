---
"@qadi/http": minor
---

**Breaking.** An endpoint's access declaration is read once, from the endpoint's own annotations, by both `RequirePermission` and `registerApi` (`endpointAccess`, BEH-QD-320). The registry used to read the API-, group- and endpoint-level merge, so a group requirement over an endpoint-level `publicEndpoint` was listed in `/__permissions` as guarded while the middleware served it to anyone; that disagreement is gone.

- A `RequiredPermission` or `PublicEndpoint` on a group or an API is now refused instead of ignored: the middleware answers 500 for every endpoint under the group and logs the group, and `registerApi` fails with the new `MisplacedAccessDeclaration`, so its type is now `Layer<never, MisplacedAccessDeclaration, PermissionRegistry>`.
- `requiresPermission` no longer accepts a group or an API (`AnnotatedEndpoint` also requires `method` and `path`).
- Added `endpointAccess`, `EndpointAccess`, `misplacedDeclarations`, `AccessDeclarationKey` and `MisplacedAccessDeclaration`.

Migration: move the declaration to each endpoint, or write it once with `HttpApiGroup.annotateEndpoints(RequiredPermission, requiresPermission(endpoint, …))`, which lands in each endpoint's own annotations. Handle the new error in the layer that composes `registerApi`, or `Layer.orDie` it at the top of the application.
