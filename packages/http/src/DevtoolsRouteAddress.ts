/**
 * Where the devtools routes answer: one rule for the routes and for the client that connects to them.
 *
 * Before ARCH-66 the decision stream, its backlog and the permission registry each mounted at a
 * path literal of its own, no constructor took a prefix, and a host's client spelled the path
 * again by hand (`"/api/__decisions"`). A host that mounted the routes anywhere else broke its own
 * client, silently. Every devtools route constructor now builds its path here, and the client
 * calls the same function with the same prefix: the shape `PortRouteAddress.ts` gives port routes
 * (ADR-QD-107).
 *
 * Public, unlike `PortRouteAddress.ts`, because the client half is the host's own code (a dock, an
 * acceptance step), not `@qadi/devtools`, which takes a URL from its caller; a host can import only
 * `@qadi/http`'s root (ADR-QD-099). The module imports nothing, so a browser bundle that imports
 * `devtoolsPath` from the root (`sideEffects: false`) pulls in no router.
 */

/** A devtools route: the decision stream, its JSON backlog, or the permission registry. */
export type DevtoolsRoute = "decisions" | "backlog" | "permissions";

/** Where a host mounts a devtools route. */
export interface DevtoolsRouteOptions {
  /**
   * The path the route is mounted under, without a trailing slash: `"/api"` serves the stream at
   * `/api/__decisions`. Absent, the routes answer at the root (`/__decisions`).
   */
  readonly prefix?: `/${string}` | undefined;
}

/** Each route's path below the prefix. */
const SEGMENT: { readonly [R in DevtoolsRoute]: string } = {
  decisions: "__decisions",
  backlog: "__decisions/backlog",
  permissions: "__permissions",
};

/**
 * The path a devtools route answers at: `<prefix>/<segment>`, `/__decisions` and its siblings when
 * there is no prefix.
 *
 * Trailing slashes on the prefix are dropped, so `"/x/"` and `"/"` cannot produce a `//` in the
 * path, as `portPath` does for port routes. The return type is the one `HttpRouter.add` accepts,
 * so no route needs a cast.
 */
export const devtoolsPath = (route: DevtoolsRoute, prefix?: `/${string}`): `/${string}` => {
  const rest = (prefix ?? "/").slice(1).replace(/\/+$/, "");
  return rest === "" ? `/${SEGMENT[route]}` : `/${rest}/${SEGMENT[route]}`;
};
