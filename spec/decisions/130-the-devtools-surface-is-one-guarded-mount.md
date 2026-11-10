# ADR-QD-130 — The devtools surface has one address rule and one guarded mount

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-130                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-10                                     |
> | Status         | Accepted — reads ADR-QD-107, ADR-QD-099, ADR-QD-046 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-10): Initial (ARCH-66, CCR-QD-408) |

---

## Context

`@qadi/http` serves three routes for devtools: the decision stream (`/__decisions`), its
JSON backlog (`/__decisions/backlog`) and the permission registry (`/__permissions`). Each
mounted at a path literal of its own, and none took a prefix. The client half restated the
path by hand: the Next.js example's dock connected to `"/api/__decisions"`, so a host that
mounted the routes anywhere else broke its own client with no error. The same host gave
its port routes `prefix: "/ports"`, so it used two conventions for one kind of question.

The Next.js example also passed one guard pair, `(readDevtools, canReadDevtools)`, three
times, once per route. A mismatch between the three was not a compile error, and
[BEH-QD-202](../behaviors/26-decision-stream.md#beh-qd-202-the-stream-is-server-sent-events-and-it-is-guarded)
(the stream is always guarded) was kept by each call separately.

[ADR-QD-107](./107-a-port-is-answered-remotely-through-its-description.md) had already
solved the address half for port routes: `PortRouteAddress.ts` owns the prefix and the path
rule, and the route and the client both call it.

## Options

As the decision checkpoint (18-01, D-02) stated them:

- **A.** An address module only: each route constructor gains `prefix?`, and the client
  gets the path function.
- **B.** A, plus one mounting call that takes the guard pair, the log and `prefix?` and
  mounts all three.

## Decision

**B.** The phase's decision record answers D-02 with:

> `option-b` — Address rule plus one `devtoolsRoutes(...)` mounting call

1. **One address rule.** `DevtoolsRouteAddress.ts` exports `devtoolsPath(route, prefix?)`,
   `DevtoolsRoute` and `DevtoolsRouteOptions`. Every devtools route constructor takes
   `prefix` and mounts at `devtoolsPath(route, prefix)`; with no prefix the paths are the
   ones they always were
   ([BEH-QD-419](../behaviors/26-decision-stream.md#beh-qd-419-each-devtools-route-answers-at-one-address-and-its-client-derives-it)).
2. **Public, unlike `portPath`.** The client half is the host's own code (a dock, an
   acceptance step). `@qadi/devtools` takes a URL from its caller and has no `@qadi/http`
   dependency, and a host can import only a package's root
   ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)). The module imports nothing, so
   a browser bundle that imports `devtoolsPath` from the root pulls in no router.
3. **One guarded mount.** `devtoolsRoutes(permission, policy, log, options?)` mounts the
   three guarded constructors under one guard pair and one prefix. It has no unguarded form
   ([BEH-QD-420](../behaviors/26-decision-stream.md#beh-qd-420-one-guarded-call-mounts-the-devtools-surface)).
4. **The per-route constructors stay.** A host that guards the routes differently mounts
   them one by one: `examples/http-advanced` serves the stream and the registry under two
   guard pairs and no backlog.
5. **The unguarded registry's warning names the served path**, prefix included
   ([BEH-QD-180](../behaviors/23-http.md#beh-qd-180-the-registry-answers-which-permission-not-which-policy)).
   At the root its line is byte-identical to before.

## Consequences

- A host and its client agree on the address by construction
  ([INV-QD-285](../invariants.md#inv-qd-285-a-devtools-route-and-its-client-agree-on-one-address)).
  No other `@qadi/http` module spells a devtools path.
- Under a prefix the default paths are not served: a route is mounted once.
- A prefix moves a route and never unguards it: a denied subject gets 403 at every
  prefixed path.
- `@qadi/http` gains five public names (`devtoolsPath`, `DevtoolsRoute`,
  `DevtoolsRouteOptions`, `devtoolsRoutes`, `DevtoolsRoutesOptions`) and
  `DecisionBacklogOptions`. Nothing is removed and no default path changes, so the
  release is additive.
- The Next.js example still strips its `/api` base with its `unprefixed` rewrite: Next
  mounts every route family there, not only the devtools surface, so a prefix on these
  three alone would not remove it.

## Alternatives considered

- **A, the address module alone.** Rejected. Two examples assembled the same three calls by
  hand, and BEH-QD-202 is easier to keep with one guarded entry point than with three
  calls that must each be guarded alike.
- **A base-URL option on `@qadi/devtools`.** Rejected. `@qadi/devtools` already takes a
  URL, and building one would give it a dependency on `@qadi/http`'s routing that it does
  not have, for an address the host already knows.
- **An unguarded `devtoolsRoutes` form.** Rejected by BEH-QD-202: the stream and the
  backlog publish decisions and have no unguarded variant. Serving the registry open stays
  the separate, named `permissionRegistryRouteUnguarded`.
