/**
 * The address of a port route, shared by the server and the client adapter: `<prefix>/<PortName>`.
 *
 * Before ARCH-52 (CCR-QD-391) `PortRoutes.ts` and `RemotePorts.ts` each declared the default
 * prefix and built the path inline, so the two agreed on the route by coincidence. If one had
 * changed, every remote read would have been a 404 with no reply body: the client reports that
 * as the port's own error, so the read still fails closed, but every re-check would be broken.
 * Both now build the path here, and a leaf module states the contract rather than either
 * adapter importing the other: `RemotePorts.ts` is what a browser bundles, and it must not
 * depend on the server's route code.
 *
 * The module is package-private: it is not in the barrel (ADR-QD-099). A host names its prefix
 * only through `PortRoutesOptions.prefix` and `RemotePortsOptions.prefix`.
 *
 * **The route contract both adapters rely on** (ADR-QD-107). The route is a `POST` with a JSON
 * question. The reply is the closed `PortWireReply`, as the JSON body, under every status. The
 * client reads the reply from the body whatever the status, and never reads an answer from a
 * status: a 503 whose body is `Unavailable` is an outage, a 200 whose body is a refusal is a
 * refusal, and a body that is not a reply at all (a proxy's HTML 502) is the port's own error,
 * never an answer. The status is chosen by `PORT_REPLY_STATUS` (`PortRoutes.ts`) and is only
 * for the layers in between (a proxy, a log, `curl`); the semantics live in the reply.
 */
import type { PortName } from "@qadi/core";

/** The prefix port routes mount at when a host names none. */
export const PORT_ROUTE_PREFIX = "/__ports";

/**
 * The path a port's route answers at: `<prefix>/<PortName>`.
 *
 * `prefix` is a host's `prefix` option, `undefined` for the default. The template-literal types
 * are those `HttpRouter.PathInput` and both options interfaces already use, so no call site
 * needs a cast.
 *
 * Trailing slashes on the prefix are dropped, so `"/x/"` and `"/"` cannot produce a `//` in the
 * path: both option docs say "without a trailing slash", and this is the one place that rule is
 * enforced rather than only stated. A proxy that collapses `//` would otherwise 404 every remote
 * read (the client reports a 404 as the port's own error).
 */
export const portPath = (prefix: `/${string}` | undefined, port: PortName): `/${string}` => {
  const rest = (prefix ?? PORT_ROUTE_PREFIX).slice(1).replace(/\/+$/, "");
  return rest === "" ? `/${port}` : `/${rest}/${port}`;
};
