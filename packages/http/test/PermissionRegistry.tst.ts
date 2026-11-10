/**
 * `addGuardedRoute`'s `loadResource` is optional, as `authorizeRequest`'s is
 * (ARCH-61, porting lost ARCH-57 L1a from `4b1ed49`): omitted, the handler
 * receives `Resource`, evaluation runs against `NO_RESOURCE`, and the route
 * requires exactly what a five-argument call with `loadNoResource` requires.
 * The five-argument form still hands the handler the loader's own type.
 */
import { expect, test } from "tstyche";
import * as Effect from "effect/Effect";
import type * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type * as Layer from "effect/Layer";
import type { Authorized, Resource, StandingEvaluationServices } from "@qadi/core";
import { hasPermission, permission } from "@qadi/core";
import { loadNoResource } from "../src/NoResource.ts";
import type { PermissionRegistry } from "../src/PermissionRegistry.ts";
import { addGuardedRoute } from "../src/PermissionRegistry.ts";
import type { SubjectExtractor } from "../src/SubjectExtractor.ts";

const readPermission = permission("document", "read");
const readPolicy = hasPermission(readPermission);

interface Doc extends Resource {
  readonly title: string;
}

const ok = () => Effect.succeed(HttpServerResponse.empty());

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
