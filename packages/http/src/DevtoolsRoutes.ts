/**
 * Mounts the devtools surface (the decision stream, its backlog and the permission registry) under
 * one guard and one prefix.
 *
 * ARCH-66: a host that serves all three wrote three calls and repeated the guard pair and the
 * prefix in each, and mismatching one was not a compile error. This is one call, so the three
 * paths cannot drift apart and none can be mounted unguarded by accident: it has no unguarded
 * form (BEH-QD-202). Serving the registry with no guard stays the separate, explicit
 * `permissionRegistryRouteUnguarded`. The per-route constructors remain for a host that guards
 * the routes differently, as `examples/http-advanced` does.
 */
import * as Layer from "effect/Layer";
import type { DecisionLog, Permission, Policy } from "@qadi/core";
import { decisionBacklogRoute } from "./DecisionBacklogRoute.ts";
import { decisionStreamRoute } from "./DecisionStreamRoute.ts";
import type { DecisionStreamOptions } from "./DecisionStreamRoute.ts";
import { permissionRegistryRoute } from "./PermissionRegistry.ts";

/**
 * How `devtoolsRoutes` serves: `prefix` for all three routes, `onRefused` for the stream and the
 * backlog, `reauth` for the stream.
 */
export interface DevtoolsRoutesOptions extends DecisionStreamOptions {}

/**
 * Mounts `decisionStreamRoute`, `decisionBacklogRoute` and `permissionRegistryRoute`, each behind
 * `permission` and `policy`, at `devtoolsPath(route, options.prefix)`.
 *
 * `log` is anything that can `read` and `snapshot`, a `DecisionLog` or a structural fake, so the
 * routes cannot write to the log they serve. Throws at construction for a reauth interval that is
 * not positive, as `decisionStreamRoute` does.
 */
export const devtoolsRoutes = <P extends Permission>(
  permission: P,
  policy: Policy,
  log: Pick<DecisionLog, "read" | "readEntries" | "snapshot">,
  options?: DevtoolsRoutesOptions,
) =>
  Layer.mergeAll(
    decisionStreamRoute(permission, policy, log, options),
    decisionBacklogRoute(permission, policy, log, options),
    permissionRegistryRoute(permission, policy, options),
  );
