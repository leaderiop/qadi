/**
 * Pins the `CurrentSubject`-exclusion finding from
 * `.scratch/qadi-http/issues/16-http-integration-tests.md`: `guardRoute`
 * must discharge `CurrentSubject` from a wrapped handler's own open `R` —
 * the defense-in-depth shape a handler calling `guard`/`enforce` again
 * produces — without also discharging it from `loadResource`'s `LR`, which
 * runs outside the scope that actually provides it. A prior version
 * narrowed only `EvaluationServices`, leaving the handler's `R` untouched;
 * a later, over-corrected version might narrow the whole union instead,
 * silently promising a discharge `loadResource` never gets. Both directions
 * are pinned here so a future change to `GuardRoute.ts` fails a type test
 * instead of only surfacing in a real HTTP round trip, as it did originally.
 *
 * The same rule is pinned a second time on `addGuardedRoute`, because that is
 * what callers use (ARCH-75). It is read from the returned layer's services:
 * `HttpRouter.add` reports requirements and errors as `Request.From<kind, T>`
 * markers, which distribute over a union, so an extract by kind says exactly
 * which requirement or error survived.
 */
import { expect, test } from "tstyche";
import * as Effect from "effect/Effect";
import type * as HttpRouter from "effect/http/HttpRouter";
import type * as HttpServerRequest from "effect/http/HttpServerRequest";
import type * as HttpServerResponse from "effect/http/HttpServerResponse";
import type * as Layer from "effect/Layer";
import type { Authorized, CurrentSubject } from "@qadi/core";
import { hasPermission, permission } from "@qadi/core";
import { guardRoute } from "../src/GuardRoute.ts";
import { addGuardedRoute } from "../src/PermissionRegistry.ts";
import type { HttpEnforcementFailure } from "../src/QadiHttpError.ts";
import type { UnguardedRouteSpec } from "../src/UnguardedRoute.ts";

type RequirementsOf<T> = T extends Effect.Effect<infer _A, infer _E, infer R> ? R : never;
type ErrorOf<T> = T extends Effect.Effect<infer _A, infer E, infer _R> ? E : never;

const readPermission = permission("document", "read");
const readPolicy = hasPermission(readPermission);

declare const loadResourceClean: (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<{}, never, never>;

declare const loadResourceNeedingSubject: (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<{}, never, CurrentSubject>;

// Models the defense-in-depth shape: a handler whose own body calls
// `guard`/`enforce` again, so its declared `R` genuinely includes
// `CurrentSubject` before `guardRoute` ever touches it.
declare const handlerNeedingSubject: (
  authorized: Authorized<typeof readPermission>,
  resource: {},
) => Effect.Effect<HttpServerResponse.HttpServerResponse, never, CurrentSubject>;

test("guardRoute discharges CurrentSubject from the wrapped handler's own R", () => {
  const route = guardRoute(readPermission, readPolicy, loadResourceClean)(handlerNeedingSubject);
  type R = RequirementsOf<ReturnType<typeof route>>;

  expect<Extract<R, CurrentSubject>>().type.toBe<never>();
});

// A handler whose own `guard` may deny: the route answers and logs the denial
// itself (ARCH-45 I3), so the handler's error channel may carry the closed
// `HttpEnforcementFailure` union, and the route's own stays `never`.
declare const handlerThatMayDeny: (
  authorized: Authorized<typeof readPermission>,
  resource: {},
) => Effect.Effect<HttpServerResponse.HttpServerResponse, HttpEnforcementFailure, CurrentSubject>;

test("guardRoute accepts a handler whose own guard may deny, and answers every enforcement failure", () => {
  const route = guardRoute(readPermission, readPolicy, loadResourceClean)(handlerThatMayDeny);
  type E = ErrorOf<ReturnType<typeof route>>;

  expect<E>().type.toBe<never>();
});

test("guardRoute does NOT discharge CurrentSubject from loadResource's own LR", () => {
  const route = guardRoute(readPermission, readPolicy, loadResourceNeedingSubject)(handlerNeedingSubject);
  type R = RequirementsOf<ReturnType<typeof route>>;

  // `loadResource` runs outside `guardRoute`'s own `Effect.provide`, so a
  // caller whose resource loader genuinely depends on `CurrentSubject` must
  // still see it as a real, undischarged requirement.
  expect<Extract<R, CurrentSubject>>().type.toBe<CurrentSubject>();
});

type Requires<L extends Layer.Any> = Extract<Layer.Services<L>, HttpRouter.Request.From<"Requires", CurrentSubject>>;
type ErrorMarkers<L extends Layer.Any> = Extract<Layer.Services<L>, HttpRouter.Request.From<"Error", unknown>>;

test("addGuardedRoute discharges CurrentSubject from the handler's own R", () => {
  const route = addGuardedRoute("GET", "/x", readPermission, readPolicy, loadResourceClean)(
    handlerNeedingSubject,
  );
  const routeNoLoader = addGuardedRoute("GET", "/x", readPermission, readPolicy)(handlerNeedingSubject);

  expect<Requires<typeof route>>().type.toBe<never>();
  expect<Requires<typeof routeNoLoader>>().type.toBe<never>();
});

test("addGuardedRoute does NOT discharge CurrentSubject from the loader's own LR", () => {
  const route = addGuardedRoute("GET", "/x", readPermission, readPolicy, loadResourceNeedingSubject)(
    handlerNeedingSubject,
  );

  expect<Requires<typeof route>>().type.toBe<HttpRouter.Request.From<"Requires", CurrentSubject>>();
});

test("addGuardedRoute accepts a handler whose own guard may deny, and answers every enforcement failure", () => {
  const route = addGuardedRoute("GET", "/x", readPermission, readPolicy, loadResourceClean)(
    handlerThatMayDeny,
  );

  expect<ErrorMarkers<typeof route>>().type.toBe<never>();

  // Positive control, same extract: it does find an `"Error"` marker when one
  // is present, so the `never` above is not an extract that matches nothing.
  type Declared =
    | HttpRouter.Request.From<"Error", HttpEnforcementFailure>
    | HttpRouter.Request.From<"Requires", CurrentSubject>;
  expect<Extract<Declared, HttpRouter.Request.From<"Error", unknown>>>().type.toBe<
    HttpRouter.Request.From<"Error", HttpEnforcementFailure>
  >();
});

test("the guarded and the unguarded bare routes take the same methods", () => {
  expect<Parameters<typeof addGuardedRoute>[0]>().type.toBe<UnguardedRouteSpec<never, never>["method"]>();
});
