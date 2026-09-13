/**
 * A client-side passthrough for any `HttpApiMiddleware` that declares
 * `requiredForClient: true` but has no real client-side behavior, plus the
 * matching helper for deriving that middleware's `clientError` union.
 *
 * `HttpApiClient.make` refuses to build against an `HttpApi` guarded by such
 * a middleware until `HttpApiMiddleware.ForClient<Id>` is discharged from its
 * context — `RequirePermission` is one example (ADR-QD-075), attaching its
 * credential by decorating the underlying `HttpClient` rather than through
 * middleware, so every consumer needs the exact same one-line forwarding
 * implementation. This is that implementation, written once and generic over
 * any `HttpApiMiddleware.AnyId`, rather than copied per middleware.
 */
import type * as Context from "effect/Context";
import type * as Schema from "effect/Schema";
import * as HttpApiMiddleware from "effect/unstable/httpapi/HttpApiMiddleware";

/**
 * The decoded union a middleware's `clientError` type parameter should be,
 * derived from the same `error:` schema array passed to
 * `HttpApiMiddleware.Service`'s options — one source, not a second,
 * hand-copied list a future edit to the schema array can silently miss.
 *
 * `RequirePermission`'s `RequirePermissionClientError` is this helper applied
 * to its own `REQUIRE_PERMISSION_ERROR_SCHEMAS`; any future `@qadi/http`
 * middleware adopting `requiredForClient` reuses this the same way, rather
 * than re-deriving the `(typeof schemas)[number]["Type"]` formula by hand.
 */
export type ClientErrorOf<Schemas extends ReadonlyArray<Schema.Top>> = Schemas[number]["Type"];

// The seven `any`s below (ANY_BUDGET in scripts/check-house-style.mjs) are
// `effect`'s own constraint shape for "any middleware service", not something
// this helper introduces — confirmed by trying `unknown` in their place
// first: `HttpApiMiddleware<Provides, E, Requires>`'s `Provides` position
// rejects a concrete middleware's real `Provides` type (e.g.
// `RequirePermission`'s `CurrentSubject`) once it's `unknown` rather than
// `any`, because `unknown` doesn't uniquely bypass variance checking the way
// `any` does. `.oxlintrc.json` scopes a `no-explicit-any` override to this
// file alone for exactly this reason (ADR-QD-075) rather than relaxing the
// rule workspace-wide.
export const passthroughClientLayer = <A extends HttpApiMiddleware.AnyId>(
  tag: Context.Key<
    A,
    | HttpApiMiddleware.HttpApiMiddleware<any, any, any>
    | HttpApiMiddleware.HttpApiMiddlewareSecurity<any, any, any, any>
  >,
) => HttpApiMiddleware.layerClient(tag, (opts) => opts.next(opts.request));
