---
"@qadi/http": minor
---

The devtools routes take a `prefix`, and the host's client builds their address from the same rule (ARCH-66).

- `devtoolsPath(route, prefix?)`, with `DevtoolsRoute` (`"decisions" | "backlog" | "permissions"`) and `DevtoolsRouteOptions`, gives the path each devtools route answers at. Call it in your client with the prefix you mounted under, instead of writing `"/__decisions"` by hand. Its module imports nothing, so a browser bundle can import it from the root.
- `decisionStreamRoute`, `decisionBacklogRoute` (its options are now `DecisionBacklogOptions`), `permissionRegistryRoute` and `permissionRegistryRouteUnguarded` take `{ prefix }`. Under `{ prefix: "/devtools" }` the stream answers at `/devtools/__decisions`, and the default path is not served.
- `devtoolsRoutes(permission, policy, log, options?)` (with `DevtoolsRoutesOptions`) mounts the stream, the backlog and the registry under one guard and one prefix. It has no unguarded form. Mount the routes one by one when they need different guards.
- Under a prefix, `permissionRegistryRouteUnguarded`'s warning names the path it serves, for example `qadi/http: serving /devtools/__permissions unguarded — …`. At the root the line is unchanged.

Nothing is removed. With no `prefix`, every route answers where it did in 0.11.0, so upgrading needs no change.
