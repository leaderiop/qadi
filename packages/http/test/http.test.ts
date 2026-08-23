/**
 * `packages/http`'s single test seam: one real HTTP request/response round
 * trip per scenario through `HttpRouter.toWebHandler`, black-box through the
 * actual public boundary — the same "test the boundary, not the mechanism"
 * philosophy `packages/promise/test/facade.test.ts` uses for a Promise
 * boundary instead of a network one. No test here reaches into
 * `HttpApiMiddleware` internals or walks `endpoint.annotations` directly.
 *
 * One app, mixing an `HttpApi` endpoint (`RequirePermission`) and a bare
 * `HttpRouter` route (`addGuardedRoute`), is enough to cover every scenario
 * in `.scratch/qadi-http/spec.md`'s Testing Decisions in a single fixture.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import {
  AttributeResolver,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  decisionCacheLayer,
  guard,
  gte,
  hasAttribute,
  hasPermission,
  makeSubject,
  permission,
  permissionKey,
} from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import { assert, describe, it } from "@effect/vitest";
import {
  ENFORCEMENT_ERROR_TAGS,
  PermissionRegistryLive,
  PermissionRegistryRoute,
  PublicEndpoint,
  RequiredPermission,
  RequirePermission,
  RequirePermissionLive,
  SubjectExtractionFailed,
  addGuardedRoute,
  publicEndpoint,
  registerApi,
  requiresPermission,
  subjectExtractorBearer,
  toResponse,
} from "../src/index.ts";

const readPermission = permission("document", "read");
const readPolicy = hasPermission(readPermission);

const writePermission = permission("document", "write");
const writePolicy = hasAttribute("clearance", gte(1));

const ALICE_TOKEN = "alice-token";
const BOB_TOKEN = "bob-token";

const alice = makeSubject({ id: "alice", permissions: [permissionKey(readPermission)] });
const bob = makeSubject({ id: "bob" });

const lookupSubject = (token: string): Effect.Effect<AuthSubject> => {
  if (token === ALICE_TOKEN) return Effect.succeed(alice);
  if (token === BOB_TOKEN) return Effect.succeed(bob);
  return Effect.die(new Error(`unknown token: ${token}`));
};

const DocumentsGroup = HttpApiGroup.make("documents").add(
  HttpApiEndpoint.get("read", "/documents").pipe((endpoint) =>
    endpoint.annotate(
      RequiredPermission,
      requiresPermission(endpoint, { permission: readPermission, policy: readPolicy }),
    ),
  ),
  // Declared public, which is now something you have to say. It exercises
  // `RequirePermissionLive`'s pass-through and `registerApi`'s
  // skip-when-absent path.
  HttpApiEndpoint.get("list", "/documents/public").pipe((endpoint) =>
    endpoint.annotate(PublicEndpoint, publicEndpoint("the public document index")),
  ),
  // Annotated with NEITHER, which is the wiring mistake that used to serve the
  // endpoint unguarded.
  HttpApiEndpoint.get("forgotten", "/documents/forgotten"),
);

const Api = HttpApi.make("test").add(DocumentsGroup).middleware(RequirePermission);

const DocumentsHandlers = HttpApiBuilder.group(Api, "documents", (handlers) =>
  handlers
    .handle("read", () => Effect.void)
    .handle("list", () => Effect.void)
    .handle("forgotten", () => Effect.void),
);

const ApiRoutes = HttpApiBuilder.layer(Api).pipe(
  Layer.provide(DocumentsHandlers),
  Layer.provide(RequirePermissionLive),
);

/**
 * The `HttpRouter`-sourced half of the fixture: a bare route, never declared
 * through `HttpApi`, guarded by `addGuardedRoute`. Its handler re-checks the
 * same permission against the same resource before "writing" — the
 * defense-in-depth shape the spec's `DecisionCache` scenario exercises.
 */
const WriteRoute = addGuardedRoute(
  "POST",
  "/documents/write",
  writePermission,
  writePolicy,
  () => Effect.succeed({}),
)((_authorized, resource) =>
  guard(
    writePermission,
    writePolicy,
  )(resource, () => Effect.void).pipe(
    Effect.as(HttpServerResponse.text("written")),
    Effect.catchTag(ENFORCEMENT_ERROR_TAGS, (error) => Effect.succeed(toResponse(error))),
  ),
);

/**
 * A second `HttpRouter` route reusing `writePermission`, so the registry
 * has to merge into an existing permission's descriptor array rather than
 * only ever creating a fresh one.
 */
const WriteRoute2 = addGuardedRoute(
  "POST",
  "/documents/write2",
  writePermission,
  writePolicy,
  () => Effect.succeed({}),
)(() => Effect.succeed(HttpServerResponse.text("written")));

const attributeResolverCalls: Array<string> = [];
const CountingAttributeResolver = Layer.succeed(AttributeResolver, {
  resolve: (subjectId, attribute) => {
    attributeResolverCalls.push(`${subjectId}:${attribute}`);
    // Alice clears; Bob doesn't — gives the write route a real denial to
    // test, rather than every subject trivially passing `writePolicy`.
    return Effect.succeed(subjectId === "alice" ? 5 : 0);
  },
});

const RegistryLayer = registerApi(Api).pipe(Layer.provideMerge(PermissionRegistryLive));

const EvaluationServicesTest = Layer.mergeAll(
  CountingAttributeResolver,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
);

// Composed through named intermediate steps, deliberately: chaining every
// `Layer.provideMerge` inline in one expression made TypeScript silently
// infer `any` for the whole thing (no diagnostic — just every downstream
// usage losing its type), an instantiation-depth failure mode particular to
// this shape of long `.pipe()` chain, not anything wrong with any one step.
const RoutesLayer = Layer.mergeAll(ApiRoutes, WriteRoute, WriteRoute2, PermissionRegistryRoute);
const WithRegistry = RoutesLayer.pipe(Layer.provideMerge(RegistryLayer));
const WithSubjects = WithRegistry.pipe(Layer.provideMerge(subjectExtractorBearer(lookupSubject)));
const WithEvaluation = WithSubjects.pipe(Layer.provideMerge(EvaluationServicesTest));
const WithCache = WithEvaluation.pipe(Layer.provideMerge(decisionCacheLayer()));
const AppLayer = WithCache.pipe(Layer.provideMerge(HttpServer.layerServices));

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

describe("@qadi/http", () => {
  it.effect("an allowed request reaches the handler", () =>
    Effect.gen(function* () {
      const { handler } = HttpRouter.toWebHandler(AppLayer);
      const response = yield* Effect.promise(() =>
        handler(new Request("http://localhost/documents", { headers: bearer(ALICE_TOKEN) })),
      );
      assert.strictEqual(response.status, 204);
    }));

  it.effect("an endpoint DECLARED public passes through unenforced", () =>
    Effect.gen(function* () {
      const { handler } = HttpRouter.toWebHandler(AppLayer);
      const response = yield* Effect.promise(() => handler(new Request("http://localhost/documents/public")));
      assert.strictEqual(response.status, 204);
    }));

  it.effect("AN ENDPOINT DECLARING NEITHER IS REFUSED, not served", () =>
    Effect.gen(function* () {
      // This used to be a 204. ADR-QD-036 rejected "annotate-and-forget" in as
      // many words — "it inverts this library's fail-closed posture ... by
      // making the *absence* of a permission requirement mean 'unguarded'" —
      // and the code shipped it anyway, with a test asserting it was correct.
      // Absence is now refusal; being public has to be said out loud.
      const { handler } = HttpRouter.toWebHandler(AppLayer);
      const response = yield* Effect.promise(() =>
        handler(new Request("http://localhost/documents/forgotten", { headers: bearer(ALICE_TOKEN) })),
      );
      // 500, not 403: this is a wiring mistake in the service, and reporting it
      // as a permissions problem would send someone to audit the wrong thing.
      assert.strictEqual(response.status, 500);
    }));

  it.effect("a denied request never reaches the handler, and gets 403", () =>
    Effect.gen(function* () {
      const { handler } = HttpRouter.toWebHandler(AppLayer);
      const response = yield* Effect.promise(() =>
        handler(new Request("http://localhost/documents", { headers: bearer(BOB_TOKEN) })),
      );
      assert.strictEqual(response.status, 403);
    }));

  it.effect("an unauthenticated request is anonymous, and denied by default", () =>
    Effect.gen(function* () {
      const { handler } = HttpRouter.toWebHandler(AppLayer);
      const response = yield* Effect.promise(() => handler(new Request("http://localhost/documents")));
      assert.strictEqual(response.status, 403);
    }));

  it.effect("the registry reflects both the HttpApi endpoint and the HttpRouter route", () =>
    Effect.gen(function* () {
      const { handler } = HttpRouter.toWebHandler(AppLayer);
      const response = yield* Effect.promise(() => handler(new Request("http://localhost/__permissions")));
      assert.strictEqual(response.status, 200);
      const body = (yield* Effect.promise(() => response.json())) as ReadonlyArray<{
        readonly permission: string;
        readonly endpoints: ReadonlyArray<{
          readonly method: string;
          readonly path: string;
          readonly group?: string;
        }>;
      }>;

      const byPermission = new Map(body.map((entry) => [entry.permission, entry.endpoints]));
      assert.deepStrictEqual(byPermission.get("document:read"), [
        { method: "GET", path: "/documents", group: "documents" },
      ]);
      // `group: undefined` has no JSON representation — it round-trips as an
      // absent key, not as `group: undefined`. Two entries: `WriteRoute` and
      // `WriteRoute2` share `writePermission`, exercising the registry's
      // merge-into-an-existing-key path, not only its create-fresh-key one.
      assert.deepStrictEqual(byPermission.get("document:write"), [
        { method: "POST", path: "/documents/write" },
        { method: "POST", path: "/documents/write2" },
      ]);
    }));

  it.effect("a denied write request never reaches the handler, and gets 403", () =>
    Effect.gen(function* () {
      const { handler } = HttpRouter.toWebHandler(AppLayer);
      const response = yield* Effect.promise(() =>
        handler(new Request("http://localhost/documents/write", { method: "POST", headers: bearer(BOB_TOKEN) })),
      );
      assert.strictEqual(response.status, 403);
    }));

  it.effect("a defense-in-depth recheck inside the handler hits DecisionCache", () =>
    Effect.gen(function* () {
      attributeResolverCalls.length = 0;
      const { handler } = HttpRouter.toWebHandler(AppLayer);
      const response = yield* Effect.promise(() =>
        handler(new Request("http://localhost/documents/write", { method: "POST", headers: bearer(ALICE_TOKEN) })),
      );
      assert.strictEqual(response.status, 200);
      // One evaluation for addGuardedRoute's own guard call, then a cache hit
      // for the handler's re-check — not a second full evaluation.
      assert.deepStrictEqual(attributeResolverCalls, ["alice:clearance"]);
    }));

  it.effect("A CREDENTIAL STORE OUTAGE IS 502, NOT 403", () =>
    Effect.gen(function* () {
      // INV-QD-006 at the boundary that had no way to express it. `extract`
      // returned `Effect<AuthSubject>` with a `never` error channel, so an
      // implementor could only `Effect.die` — escaping the middleware's
      // catchTag entirely, and turning an authorization path into a defect —
      // or degrade to `anonymous`, which renders an outage as a denial and
      // sends an operator to audit permissions during an incident.
      const brokenStore = subjectExtractorBearer(() =>
        Effect.fail(new SubjectExtractionFailed({ reason: "token service unreachable" })),
      );
      const app = WithRegistry.pipe(
        Layer.provideMerge(brokenStore),
        Layer.provideMerge(EvaluationServicesTest),
        Layer.provideMerge(decisionCacheLayer()),
        Layer.provideMerge(HttpServer.layerServices),
      );
      const { handler } = HttpRouter.toWebHandler(app);

      // Through the HttpApi middleware...
      const viaMiddleware = yield* Effect.promise(() =>
        handler(new Request("http://localhost/documents", { headers: bearer(ALICE_TOKEN) })),
      );
      assert.strictEqual(viaMiddleware.status, 502);

      // ...and through the bare-router adapter, which declares a `never` error
      // channel and so had to grow the same arm.
      const viaRoute = yield* Effect.promise(() =>
        handler(
          new Request("http://localhost/documents/write", {
            method: "POST",
            headers: bearer(ALICE_TOKEN),
          }),
        ),
      );
      assert.strictEqual(viaRoute.status, 502);
    }));

  it.effect("a lowercase bearer scheme is a credential, not an anonymous request", () =>
    Effect.gen(function* () {
      // RFC 7235 §2.1 makes auth-scheme a case-insensitive token. The prefix
      // was compared with `startsWith("Bearer ")`, so a legal `bearer …` had
      // its credential silently discarded and was served as anonymous — which
      // denied, so it looked like a permissions problem rather than a parsing
      // one.
      const { handler } = HttpRouter.toWebHandler(AppLayer);
      const response = yield* Effect.promise(() =>
        handler(
          new Request("http://localhost/documents", {
            headers: { authorization: `bearer ${ALICE_TOKEN}` },
          }),
        ),
      );
      assert.strictEqual(response.status, 204);
    }));

  it("requiresPermission throws at construction time on a duplicate requirement", () => {
    const endpoint = HttpApiEndpoint.get("duplicate", "/duplicate").pipe((e) =>
      e.annotate(RequiredPermission, requiresPermission(e, { permission: readPermission, policy: readPolicy })),
    );
    assert.throws(
      () => requiresPermission(endpoint, { permission: writePermission, policy: writePolicy }),
      /already has a permission requirement/,
    );
  });
});
