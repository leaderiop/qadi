/**
 * The one constructor for routes a host declared unguarded: the warning text is
 * written once, and when it is logged is named at the call. Package-private, out
 * of the barrel (ADR-QD-099).
 *
 * `permissionRegistryRouteUnguarded` and `portRoutesUnguarded` each used to
 * hand-roll the same three things: a `reason` nobody reads, a
 * `qadi/http: serving <what> unguarded — <consequence>. Reason given: <reason>`
 * line, and no `PermissionRegistry.register`. Their cadences differ and both are
 * specified, so the cadence is a required, closed argument rather than a
 * property of how a handler body happens to be written (ARCH-61, porting lost
 * ARCH-57 L1b from `4b1ed49`).
 *
 * - `"every-request"` (BEH-QD-180, `/__permissions`): a local development choice
 *   that reaches production should be visible in the logs of the environment it
 *   is wrong in.
 * - `"once"` (ADR-QD-107, the port routes): a port route is hit on every client
 *   re-check, and a warning per request would bury the log it is meant to
 *   appear in. Once for the **family**: five served ports are one warning, not
 *   five, which is why the constructor takes the routes together.
 *
 * Neither cadence registers anything: an unguarded route names no permission.
 * The `reason` is never read for anything but the line.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as HttpRouter from "effect/http/HttpRouter";
import type { PathInput } from "effect/http/HttpRouter";
import type * as HttpServerResponse from "effect/http/HttpServerResponse";

/** When the warning is logged. Closed: a new cadence is a compile error here. */
export type Announce = "every-request" | "once";

/** What a host declared unguarded, and why. */
export interface DeclaredUnguarded {
  /** What is served, as the line names it: `"/__permissions"`, `"port routes"`. */
  readonly what: string;
  /** What being unguarded costs, as the line says it. */
  readonly consequence: string;
  /** The reason the host gave. Never read except to be logged. */
  readonly reason: string;
  readonly announce: Announce;
}

/** One route of an unguarded family. */
export interface UnguardedRouteSpec<E, R> {
  readonly method: "*" | "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";
  readonly path: PathInput;
  readonly handler: Effect.Effect<HttpServerResponse.HttpServerResponse, E, R>;
}

/** The line a declared-unguarded family logs, byte-identical to what each route wrote by hand. */
const warningOf = (declared: DeclaredUnguarded): string =>
  `qadi/http: serving ${declared.what} unguarded — ${declared.consequence}. ` +
  `Reason given: ${declared.reason}`;

/** What mounting routes with handler error `E` and requirement `R` requires. */
type Mounted<E, R> = Layer.Layer<never, never, Layer.Services<ReturnType<typeof HttpRouter.add<E, R>>>>;

/**
 * Mounts `routes` with no guard, announcing it as `declared.announce` says.
 *
 * `"once"` logs one warning when the layer is built, even for an empty family
 * (a host that declared nothing served still said it was unguarded);
 * `"every-request"` logs before each route's handler, so an empty family logs
 * nothing. The cadence is dispatched once per construction, never per request,
 * so `Match.value` costs nothing on the request path (AGENTS.md §5a).
 */
export const unguardedRoutes = <E, R>(
  declared: DeclaredUnguarded,
  routes: ReadonlyArray<UnguardedRouteSpec<E, R>>,
) => {
  const message = warningOf(declared);
  const mount = (announced: boolean): Mounted<E, R> =>
    routes.reduce<Mounted<E, R>>(
      (all, route) =>
        Layer.merge(
          all,
          HttpRouter.add(
            route.method,
            route.path,
            announced ? Effect.andThen(Effect.logWarning(message), route.handler) : route.handler,
          ),
        ),
      Layer.empty,
    );
  return Match.value(declared.announce).pipe(
    Match.when("once", () => Layer.merge(Layer.effectDiscard(Effect.logWarning(message)), mount(false))),
    Match.when("every-request", () => mount(true)),
    Match.exhaustive,
  );
};
