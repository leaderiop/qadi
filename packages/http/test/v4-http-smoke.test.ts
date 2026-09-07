/**
 * Canary for the `effect/unstable/http` and `effect/unstable/httpapi` APIs
 * `@qadi/http` is built on.
 *
 * Both modules are unstable by name, the same reasoning `@qadi/core`'s
 * `v4-api-smoke.test.ts` and `@qadi/react`'s `v4-reactivity-smoke.test.ts`
 * already carry for their own dependencies: an Effect v4 beta bump can rename
 * or reshape an unstable module without warning, and without a canary that
 * failure diffuses across this package's whole test suite rather than
 * pointing at the one API that moved. `@qadi/http` uses
 * `effect/unstable/http` and `effect/unstable/httpapi` more than either of
 * those two packages uses its own dependency, and had no canary of its own
 * before this.
 *
 * Every API exercised here is one `GuardRoute.ts`, `PermissionRegistry.ts`,
 * `RequirePermission.ts` or `DecisionStreamRoute.ts` actually calls. Pinning
 * more than that would make the canary noisy, and a noisy canary gets
 * skipped.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Stream from "effect/Stream";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import * as HttpApiMiddleware from "effect/unstable/httpapi/HttpApiMiddleware";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";

describe("effect/unstable/http API canary", () => {
  // -------------------------------------------------------------------------
  // HttpRouter.add / HttpRouter.toWebHandler — the bare-route mechanism
  // GuardRoute.ts and PermissionRegistry.ts's `addGuardedRoute` build on.
  // -------------------------------------------------------------------------

  it.effect("HttpRouter.add mounts a handler toWebHandler can drive", () =>
    Effect.gen(function* () {
      const layer = HttpRouter.add("GET", "/ping", HttpServerResponse.text("pong")).pipe(
        Layer.provideMerge(HttpServer.layerServices),
      );
      const { handler } = HttpRouter.toWebHandler(layer);

      const response = yield* Effect.promise(() => handler(new Request("http://localhost/ping")));
      const body = yield* Effect.promise(() => response.text());

      assert.strictEqual(response.status, 200);
      assert.strictEqual(body, "pong");
    }));

  // -------------------------------------------------------------------------
  // HttpServerRequest — reading a request from inside a route handler, the
  // way SubjectExtractor.extract and RequirePermission's middleware both do.
  // -------------------------------------------------------------------------

  it.effect("HttpServerRequest.HttpServerRequest is readable from a route handler", () =>
    Effect.gen(function* () {
      const layer = HttpRouter.add(
        "GET",
        "/echo-header",
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest;
          return HttpServerResponse.text(request.headers.authorization ?? "<none>");
        }),
      ).pipe(Layer.provideMerge(HttpServer.layerServices));
      const { handler } = HttpRouter.toWebHandler(layer);

      const response = yield* Effect.promise(() =>
        handler(new Request("http://localhost/echo-header", { headers: { authorization: "Bearer abc" } })),
      );
      const body = yield* Effect.promise(() => response.text());

      assert.strictEqual(body, "Bearer abc");
    }));

  // -------------------------------------------------------------------------
  // HttpServerResponse — the constructors QadiHttpError.ts and
  // DecisionStreamRoute.ts actually call: `.empty` (status-only, every
  // enforcement-error mapping), `.jsonUnsafe` (the `/__permissions`
  // payload), and `.stream` (the SSE feed).
  // -------------------------------------------------------------------------

  it("HttpServerResponse.empty carries only a status, no body", () => {
    const response = HttpServerResponse.empty({ status: 403 });
    assert.strictEqual(response.status, 403);
  });

  it("HttpServerResponse.jsonUnsafe encodes a plain value without a Schema", () => {
    const response = HttpServerResponse.jsonUnsafe([{ permission: "read", endpoints: [] }]);
    assert.strictEqual(response.status, 200);
  });

  it("HttpServerResponse.stream builds a response from a Stream of bytes", () => {
    const frames = Stream.make(new TextEncoder().encode("data: 1\n\n"));
    const response = HttpServerResponse.stream(frames, { contentType: "text/event-stream" });

    assert.strictEqual(response.status, 200);
  });

  // -------------------------------------------------------------------------
  // HttpApi / HttpApiGroup / HttpApiMiddleware — the annotation-carrying
  // shape RequirePermission.ts and PermissionRegistry.ts's `registerApi`
  // walk. `RequiredPermission`/`PublicEndpoint` are themselves plain
  // `Context.Service` annotations (ADR-QD-036), so this pins the same
  // mechanism with a local stand-in rather than importing this package's
  // own types, keeping the canary's failure surface to the v4 API alone.
  // -------------------------------------------------------------------------

  class Marker extends Context.Service<Marker, { readonly value: string }>()("smoke/Marker") {}

  it("HttpApiGroup/HttpApiEndpoint carry annotations HttpApi.reflect can read back", () => {
    const endpoint = HttpApiEndpoint.get("ping", "/ping").pipe((e) => e.annotate(Marker, { value: "found" }));
    const group = HttpApiGroup.make("smoke").add(endpoint);
    const api = HttpApi.make("smoke-api").add(group);

    const found: Array<string> = [];
    HttpApi.reflect(api, {
      onGroup: () => {},
      onEndpoint: ({ mergedAnnotations }) => {
        const marker = Context.getOption(mergedAnnotations, Marker);
        if (marker._tag === "Some") found.push(marker.value.value);
      },
    });

    assert.deepStrictEqual(found, ["found"]);
  });

  class SmokeMiddleware extends HttpApiMiddleware.Service<SmokeMiddleware, { requires: never }>()(
    "smoke/Middleware",
  ) {}

  it.effect("HttpApiMiddleware.Service wires a middleware through HttpApiBuilder end to end", () =>
    Effect.gen(function* () {
      const SmokeGroup = HttpApiGroup.make("smoke").add(HttpApiEndpoint.get("ping", "/ping"));
      const SmokeApi = HttpApi.make("smoke-api").add(SmokeGroup).middleware(SmokeMiddleware);

      const SmokeHandlers = HttpApiBuilder.group(SmokeApi, "smoke", (handlers) =>
        handlers.handle("ping", () => Effect.void),
      );
      // A middleware that just forwards — RequirePermissionLive's real
      // implementation additionally inspects annotations and guards, but the
      // wiring this pins is that a `Service`-shaped middleware reaches the
      // handler at all through `HttpApiBuilder.layer`.
      const MiddlewareLive = Layer.succeed(SmokeMiddleware, (httpEffect) => httpEffect);

      const ApiRoutes = HttpApiBuilder.layer(SmokeApi).pipe(
        Layer.provide(SmokeHandlers),
        Layer.provide(MiddlewareLive),
      );
      const layer = ApiRoutes.pipe(Layer.provideMerge(HttpServer.layerServices));
      const { handler } = HttpRouter.toWebHandler(layer);

      const response = yield* Effect.promise(() => handler(new Request("http://localhost/ping")));

      assert.strictEqual(response.status, 204);
    }));
});
