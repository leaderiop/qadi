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
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import { hasPermission, permission } from "@qadi/core";
import { RequiredPermission, requiresPermission } from "../src/RequirePermission.ts";
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
