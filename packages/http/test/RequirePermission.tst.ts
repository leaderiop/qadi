/**
 * Pins the two findings from
 * `.scratch/qadi-http/issues/16-http-integration-tests.md` that motivated
 * `AnnotatedEndpoint` and `registerApi`'s genericity: `HttpApiEndpoint.Top`/
 * `HttpApi.Top` are not supertypes of a plain, options-less endpoint or API
 * — the common case — so a parameter typed against either silently rejects
 * the most ordinary caller. A future "simplification" back to
 * `HttpApiEndpoint.Top`/`HttpApi.Top` would fail these tests instead of
 * only surfacing when someone actually builds an app with it, as it did
 * originally.
 */
import { expect, test } from "tstyche";
import * as Effect from "effect/Effect";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiClient from "effect/unstable/httpapi/HttpApiClient";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import * as HttpApiMiddleware from "effect/unstable/httpapi/HttpApiMiddleware";
import type * as HttpClient from "effect/unstable/http/HttpClient";
import { hasPermission, permission } from "@qadi/core";
import type { RequirePermissionClientError } from "../src/RequirePermission.ts";
import { RequiredPermission, RequirePermission, requiresPermission } from "../src/RequirePermission.ts";
import { passthroughClientLayer } from "../src/HttpApiMiddlewareClient.ts";
import { registerApi } from "../src/PermissionRegistry.ts";

const readPermission = permission("document", "read");
const readPolicy = hasPermission(readPermission);

// No `params`/`query` options — the common case, and exactly the shape that
// is not assignable to `HttpApiEndpoint.Top`.
const plainEndpoint = HttpApiEndpoint.get("read", "/documents");
const plainApi = HttpApi.make("test").add(HttpApiGroup.make("documents").add(plainEndpoint));

test("requiresPermission accepts a plain, options-less HttpApiEndpoint", () => {
  expect(requiresPermission).type.toBeCallableWith(plainEndpoint, {
    permission: readPermission,
    policy: readPolicy,
  });
});

test("registerApi accepts a plain, options-less HttpApi", () => {
  expect(registerApi).type.toBeCallableWith(plainApi);
});

test("the inline .annotate() pattern keeps the endpoint's literal identifier", () => {
  const annotated = plainEndpoint.pipe((endpoint) =>
    endpoint.annotate(
      RequiredPermission,
      requiresPermission(endpoint, { permission: readPermission, policy: readPolicy }),
    ),
  );

  // Widening back to `string` is exactly what broke `HttpApiBuilder.group`'s
  // handler exhaustiveness — see the doc comment on `requiresPermission`.
  expect<typeof annotated.identifier>().type.toBe<"read">();
});

// Pins ADR-QD-075: a generated client's static error type for a
// `RequirePermission`-guarded endpoint includes every enforcement outcome
// this middleware can produce, automatically — read off
// `HttpApiMiddleware.ClientError`, effect's own extraction of a middleware's
// declared `clientError`, rather than a per-endpoint `error:` array someone
// has to keep in sync by hand.
test("HttpApiMiddleware.ClientError<RequirePermission> is the full 12-tag union", () => {
  expect<HttpApiMiddleware.ClientError<RequirePermission>>().type.toBe<RequirePermissionClientError>();
});

const clientErrorApi = HttpApi.make("client-error-api")
  .add(
    HttpApiGroup.make("documents").add(
      plainEndpoint.pipe((endpoint) =>
        endpoint.annotate(
          RequiredPermission,
          requiresPermission(endpoint, { permission: readPermission, policy: readPolicy }),
        ),
      ),
    ),
  )
  .middleware(RequirePermission);

test("a client built against a RequirePermission-guarded API needs passthroughClientLayer to run with no further services", () => {
  const client = HttpApiClient.make(clientErrorApi, { baseUrl: "http://localhost:3000" });

  // `ForClient<RequirePermission>` is still outstanding — this is the exact
  // breaking change ADR-QD-075 ships (confirmed by a real compile in
  // `.scratch/qadi-http-client-errors/research-layerclient-wiring.md`), not
  // merely asserted here. `HttpClient.HttpClient` is a separate, expected
  // requirement of `HttpApiClient.make` itself (a real app provides it via
  // e.g. `FetchHttpClient.layer`) — unaffected by this middleware either way,
  // so it is the one requirement still present on both sides of this check.
  expect(client).type.not.toBeAssignableTo<Effect.Effect<unknown, unknown, HttpClient.HttpClient>>();

  const clientRunnable = client.pipe(Effect.provide(passthroughClientLayer(RequirePermission)));
  expect(clientRunnable).type.toBeAssignableTo<Effect.Effect<unknown, unknown, HttpClient.HttpClient>>();
});
