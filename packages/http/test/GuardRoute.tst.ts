/**
 * Pins `addGuardedRoute`'s typing contract, both directions of the
 * `CurrentSubject` rule and the closed error channel, read from the returned
 * layer's services (ARCH-75). `HttpRouter.add` reports requirements and errors as
 * `Request.From<kind, T>` markers, which distribute over a union, so an extract by
 * kind says exactly which requirement or error survived.
 *
 * The `CurrentSubject`-exclusion finding is from
 * `.scratch/qadi-http/issues/16-http-integration-tests.md`: the route must
 * discharge `CurrentSubject` from a wrapped handler's own open `R` — the
 * defense-in-depth shape a handler calling `guard`/`enforce` again produces —
 * without also discharging it from `loadResource`'s `LR`, which runs outside the
 * scope that actually provides it. A prior version narrowed only
 * `EvaluationServices`, leaving the handler's `R` untouched; a later,
 * over-corrected version might narrow the whole union instead, silently promising
 * a discharge `loadResource` never gets. These tests were first written on the
 * package-private `guardRoute`, which `addGuardedRoute` absorbed; the rule is now
 * pinned on the function callers actually use.
 *
 * `loadResource` is optional (ARCH-61, porting lost ARCH-57 L1a from `4b1ed49`):
 * omitted, the handler receives `Resource`, evaluation runs against `NO_RESOURCE`,
 * and the route requires exactly what a five-argument call with `loadNoResource`
 * requires. The five-argument form still hands the handler the loader's own type.
 */
import { expect, test } from "tstyche";
import * as Effect from "effect/Effect";
import type * as HttpRouter from "effect/http/HttpRouter";
import type * as HttpServerRequest from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type * as Layer from "effect/Layer";
import type { Authorized, CurrentSubject, Resource, StandingEvaluationServices } from "@qadi/core";
import { hasPermission, permission } from "@qadi/core";
import { addGuardedRoute } from "../src/GuardRoute.ts";
import { loadNoResource } from "../src/NoResource.ts";
import type { PermissionRegistry } from "../src/PermissionRegistry.ts";
import type { HttpEnforcementFailure } from "../src/QadiHttpError.ts";
import type { SubjectExtractor } from "../src/SubjectExtractor.ts";
import type { UnguardedRouteSpec } from "../src/UnguardedRoute.ts";

const readPermission = permission("document", "read");
const readPolicy = hasPermission(readPermission);

interface Doc extends Resource {
  readonly title: string;
}

const ok = () => Effect.succeed(HttpServerResponse.empty());

declare const loadResourceClean: (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<{}, never, never>;

declare const loadResourceNeedingSubject: (
  request: HttpServerRequest.HttpServerRequest,
) => Effect.Effect<{}, never, CurrentSubject>;

// Models the defense-in-depth shape: a handler whose own body calls
// `guard`/`enforce` again, so its declared `R` genuinely includes
// `CurrentSubject` before `addGuardedRoute` ever touches it.
declare const handlerNeedingSubject: (
  authorized: Authorized<typeof readPermission>,
  resource: {},
) => Effect.Effect<HttpServerResponse.HttpServerResponse, never, CurrentSubject>;

// A handler whose own `guard` may deny: the route answers and logs the denial
// itself (ARCH-45 I3), so the handler's error channel may carry the closed
// `HttpEnforcementFailure` union, and the route's own stays `never`.
declare const handlerThatMayDeny: (
  authorized: Authorized<typeof readPermission>,
  resource: {},
) => Effect.Effect<HttpServerResponse.HttpServerResponse, HttpEnforcementFailure, CurrentSubject>;

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

test("the four-argument form hands the handler a Resource", () => {
  addGuardedRoute("GET", "/x", readPermission, readPolicy)((_authorized, resource) => {
    expect(resource).type.toBe<Resource>();
    return ok();
  });
});

test("the five-argument form keeps the loader's resource type", () => {
  addGuardedRoute("GET", "/x", readPermission, readPolicy, () => Effect.succeed<Doc>({ title: "t" }))(
    (_authorized, resource) => {
      expect(resource).type.toBe<Doc>();
      return ok();
    },
  );
});

test("a four-argument handler cannot claim a narrower resource", () => {
  // No loader ran, so there is no `Doc` to hand the handler.
  expect(addGuardedRoute("GET", "/x", readPermission, readPolicy)).type.not.toBeCallableWith(
    (_authorized: Authorized<typeof readPermission>, _resource: Doc) => ok(),
  );
  expect(addGuardedRoute("GET", "/x", readPermission, readPolicy)).type.toBeCallableWith(
    (_authorized: Authorized<typeof readPermission>, _resource: Resource) => ok(),
  );
});

test("both forms require the registry, the standing services and the extractor, and nothing more", () => {
  const omitted = addGuardedRoute("GET", "/x", readPermission, readPolicy)(ok);
  const named = addGuardedRoute("GET", "/x", readPermission, readPolicy, loadNoResource)(ok);
  expect<Layer.Services<typeof omitted>>().type.toBe<Layer.Services<typeof named>>();
  expect<Layer.Services<typeof named>>().type.toBe<
    | HttpRouter.HttpRouter
    | PermissionRegistry
    | HttpRouter.Request.From<"Requires", StandingEvaluationServices | SubjectExtractor>
  >();
});
