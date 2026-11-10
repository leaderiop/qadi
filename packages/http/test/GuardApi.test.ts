/**
 * `guardApi` is the one layer that guards an `HttpApi`: building it registers what it enforces,
 * refuses what it cannot enforce, and the middleware it provides refuses what it did not register
 * (ARCH-36, INV-QD-180). The differential over every declaration placement is
 * `endpointAccess.test.ts`'s; this file is the layer's own contract.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as HttpApi from "effect/http-api/HttpApi";
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder";
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint";
import * as HttpApiGroup from "effect/http-api/HttpApiGroup";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServer from "effect/http/HttpServer";
import type { AuthSubject, Permission, StandingEvaluationServices } from "@qadi/core";
import { EvaluationIdLive, hasPermission, makeSubject, permission, permissionKey, portsLayer } from "@qadi/core";
import { collectingLogger } from "@qadi/testing";
import { assert, describe, it } from "@effect/vitest";
import type { SubjectExtractor } from "../src/index.ts";
import { stack } from "./fixtures/stack.ts";
import {
  AccessNotDeclared,
  PermissionRegistry,
  PermissionRegistryLive,
  PublicEndpoint,
  RequiredPermission,
  RequirePermission,
  guardApi,
  permissionRegistryRouteUnguarded,
  publicEndpoint,
  requiresPermission,
  subjectExtractorBearer,
} from "../src/index.ts";

const readP = permission("document", "read");
const writeP = permission("document", "write");

const reader: AuthSubject = makeSubject({ id: "reader", permissions: [permissionKey(readP)] });
const writer: AuthSubject = makeSubject({ id: "writer", permissions: [permissionKey(writeP)] });

const subjectsLayer = subjectExtractorBearer((token) =>
  token === "read-token"
    ? Effect.succeed(reader)
    : token === "write-token"
      ? Effect.succeed(writer)
      : Effect.die(new Error(`unknown token ${token}`)),
);

const done = () => Effect.void;

const GroupA = HttpApiGroup.make("a").add(
  HttpApiEndpoint.get("read", "/a").pipe((endpoint) =>
    endpoint.annotate(
      RequiredPermission,
      requiresPermission(endpoint, { permission: readP, policy: hasPermission(readP) }),
    ),
  ),
);
const GroupB = HttpApiGroup.make("b").add(
  HttpApiEndpoint.get("read", "/b").pipe((endpoint) =>
    endpoint.annotate(
      RequiredPermission,
      requiresPermission(endpoint, { permission: writeP, policy: hasPermission(writeP) }),
    ),
  ),
);

const ApiA = HttpApi.make("api-a").add(GroupA).middleware(RequirePermission);
const ApiB = HttpApi.make("api-b").add(GroupB).middleware(RequirePermission);
const A = {
  api: ApiA,
  group: GroupA,
  handlers: HttpApiBuilder.group(ApiA, "a", (h) => h.handle("read", done)),
};
const B = {
  api: ApiB,
  group: GroupB,
  handlers: HttpApiBuilder.group(ApiB, "b", (h) => h.handle("read", done)),
};

/** Everything a guarded API's layer needs, built into a web handler. */
const serve = <E>(
  routes: Layer.Layer<
    never,
    E,
    | HttpRouter.HttpRouter
    | PermissionRegistry
    | SubjectExtractor
    | StandingEvaluationServices
    | Layer.Success<typeof HttpServer.layerServices>
  >,
  logger: Layer.Layer<never> = Layer.empty,
) => {
  const app = stack(
    Layer.mergeAll(routes, permissionRegistryRouteUnguarded("test fixture")),
    subjectsLayer,
    Layer.mergeAll(portsLayer({}), EvaluationIdLive),
  ).pipe(Layer.provideMerge(logger));
  return HttpRouter.toWebHandler(app, { disableLogger: true });
};

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const snapshotOf = <E>(
  layer: Layer.Layer<RequirePermission, E, PermissionRegistry | SubjectExtractor | StandingEvaluationServices>,
) =>
  Effect.scoped(
    Layer.build(
      layer.pipe(
        Layer.provideMerge(PermissionRegistryLive),
        Layer.provide(subjectsLayer),
        Layer.provide(Layer.mergeAll(portsLayer({}), EvaluationIdLive)),
      ),
    ).pipe(Effect.flatMap((ctx) => Context.get(ctx, PermissionRegistry).snapshot)),
  );

describe("guardApi", () => {
  it.effect("registers every endpoint it enforces when it is built, with no registerApi anywhere", () =>
    Effect.gen(function* () {
      const snapshot = yield* snapshotOf(guardApi(A.api));
      assert.deepStrictEqual(HashMap.toEntries(snapshot), [
        [permissionKey(readP), [{ method: "GET", path: "/a", group: "a" }]],
      ]);
    }));

  it.effect("a guarded API served through it is enforced and /__permissions lists exactly it", () =>
    Effect.gen(function* () {
      const routes = HttpApiBuilder.layer(A.api).pipe(Layer.provide(A.handlers), Layer.provide(guardApi(A.api)));
      const { handler, dispose } = serve(routes);
      const status = (path: string, token?: string) =>
        Effect.promise(() =>
          handler(new Request(`http://localhost${path}`, token ? { headers: bearer(token) } : {})),
        ).pipe(Effect.map((r) => r.status));
      assert.strictEqual(yield* status("/a", "write-token"), 403);
      assert.strictEqual(yield* status("/a", "read-token"), 204);
      const listed = yield* Effect.promise(() => handler(new Request("http://localhost/__permissions")));
      assert.deepStrictEqual(
        yield* Effect.promise(() => listed.json()),
        [{ permission: permissionKey(readP), endpoints: [{ method: "GET", path: "/a", group: "a" }] }],
      );
      yield* Effect.promise(() => dispose());
    }));

  it.effect("refuses an API whose middleware was attached before the group, naming the endpoint", () =>
    Effect.gen(function* () {
      const late = HttpApi.make("late").middleware(RequirePermission).add(A.group);
      // @ts-expect-error — the type already refuses this API; the runtime refusal is what this exercises.
      const guard = guardApi(late);
      const built = yield* snapshotOf(guard).pipe(Effect.result);
      assert.isTrue(Result.isFailure(built));
      if (Result.isFailure(built)) {
        assert.strictEqual(built.failure._tag, "RequirePermissionNotAttached");
        assert.include(built.failure.message, 'endpoint "read" of group "a"');
      }
    }));

  it.effect("a refusal registers nothing: a prior registration is the only entry left", () =>
    Effect.gen(function* () {
      const late = HttpApi.make("late").middleware(RequirePermission).add(A.group);
      // @ts-expect-error — the type already refuses this API; the runtime refusal is what this exercises.
      const guard = guardApi(late);
      const registry = yield* Effect.scoped(
        Layer.build(PermissionRegistryLive).pipe(Effect.map((ctx) => Context.get(ctx, PermissionRegistry))),
      );
      // A scoped build closes with the scope, but the registry is a plain Ref-backed value.
      yield* registry.register(writeP, { method: "POST", path: "/pre", group: undefined });
      const built = yield* Effect.scoped(
        Layer.build(
          guard.pipe(
            Layer.provide(Layer.succeed(PermissionRegistry, registry)),
            Layer.provide(subjectsLayer),
            Layer.provide(Layer.mergeAll(portsLayer({}), EvaluationIdLive)),
          ),
        ),
      ).pipe(Effect.result);
      assert.isTrue(Result.isFailure(built));
      const snapshot = yield* registry.snapshot;
      assert.deepStrictEqual(HashMap.toEntries(snapshot), [
        [permissionKey(writeP), [{ method: "POST", path: "/pre", group: undefined }]],
      ]);
    }));
});

describe("the middleware guardApi provides", () => {
  it.effect("refuses an endpoint outside the API it was built for: 500, one log line, never served", () =>
    Effect.gen(function* () {
      const { lines, layer: logger } = collectingLogger();
      // `guardApi(A)` provided to the layer that serves B: B was never registered or vetted.
      const routes = HttpApiBuilder.layer(B.api).pipe(Layer.provide(B.handlers), Layer.provide(guardApi(A.api)));
      const { handler, dispose } = serve(routes, logger);
      const response = yield* Effect.promise(() =>
        handler(new Request("http://localhost/b", { headers: bearer("write-token") })),
      );
      assert.strictEqual(response.status, 500);
      assert.deepStrictEqual(
        lines.map((line) => line.message),
        [
          [
            'qadi/http: endpoint "read" of group "b" is not part of the HttpApi this RequirePermission was ' +
              "built for, so it was never registered and is refused. Provide guardApi(<that api>) to the " +
              "HttpApiBuilder.layer that serves it.",
          ],
        ],
      );
      const listed = yield* Effect.promise(() => handler(new Request("http://localhost/__permissions")));
      assert.deepStrictEqual(
        yield* Effect.promise(() => listed.json()),
        [{ permission: permissionKey(readP), endpoints: [{ method: "GET", path: "/a", group: "a" }] }],
      );
      yield* Effect.promise(() => dispose());
    }));

  it.effect("two APIs, each given its own guardApi, are both enforced and both listed", () =>
    Effect.gen(function* () {
      const routesA = HttpApiBuilder.layer(A.api).pipe(Layer.provide(A.handlers), Layer.provide(guardApi(A.api)));
      const routesB = HttpApiBuilder.layer(B.api).pipe(Layer.provide(B.handlers), Layer.provide(guardApi(B.api)));
      const { handler, dispose } = serve(Layer.mergeAll(routesA, routesB));
      const status = (path: string, token: string) =>
        Effect.promise(() => handler(new Request(`http://localhost${path}`, { headers: bearer(token) }))).pipe(
          Effect.map((r) => r.status),
        );
      assert.deepStrictEqual(
        [
          yield* status("/a", "read-token"),
          yield* status("/a", "write-token"),
          yield* status("/b", "write-token"),
          yield* status("/b", "read-token"),
        ],
        [204, 403, 204, 403],
      );
      const listed = yield* Effect.promise(() => handler(new Request("http://localhost/__permissions")));
      const body: ReadonlyArray<{ readonly permission: string }> = yield* Effect.promise(() => listed.json());
      assert.deepStrictEqual(body.map((entry) => entry.permission).sort(), [
        permissionKey(readP),
        permissionKey(writeP),
      ]);
      yield* Effect.promise(() => dispose());
    }));
});

/**
 * The plan is keyed by the group and endpoint *values* `guardApi` was given, not by their names:
 * an API value that reuses `ApiA`'s group `"a"` and endpoint `"read"` used to pass a name-string
 * membership check and be served with its own, unvetted declarations (SEC-05, SEC-06).
 */
describe("the plan is the API value it was built from", () => {
  const read = <const P extends `/${string}`>(path: P) => HttpApiEndpoint.get("read", path);
  const requiring = <const P extends `/${string}`>(path: P, p: Permission) =>
    read(path).pipe((endpoint) =>
      endpoint.annotate(RequiredPermission, requiresPermission(endpoint, { permission: p, policy: hasPermission(p) })),
    );
  const decoy = HttpApiEndpoint.get("decoy", "/decoy");
  const decoyRequirement = requiresPermission(decoy, { permission: readP, policy: hasPermission(readP) });
  const publicGroup = () =>
    HttpApiGroup.make("a").add(read("/b").pipe((e) => e.annotate(PublicEndpoint, publicEndpoint("probe"))));

  const Same = HttpApi.make("api-a").add(HttpApiGroup.make("a").add(requiring("/a", readP))).middleware(RequirePermission);
  const SamePublic = HttpApi.make("api-a").add(publicGroup()).middleware(RequirePermission);
  const SameWrite = HttpApi.make("api-a")
    .add(HttpApiGroup.make("a").add(requiring("/b", writeP)))
    .middleware(RequirePermission);
  const SameMisplacedGroup = HttpApi.make("api-a")
    .add(publicGroup().annotate(RequiredPermission, decoyRequirement))
    .middleware(RequirePermission);
  const SameApiDeclared = HttpApi.make("api-a")
    .add(publicGroup())
    .middleware(RequirePermission)
    .annotate(RequiredPermission, decoyRequirement);
  const SamePrefixed = ApiA.prefix("/v1");

  const MEMBERSHIP =
    'qadi/http: endpoint "read" of group "a" is not part of the HttpApi this RequirePermission was ' +
    "built for, so it was never registered and is refused. Provide guardApi(<that api>) to the " +
    "HttpApiBuilder.layer that serves it.";

  // Each row is served by its own `HttpApiBuilder.layer` with `guardApi(ApiA)` provided.
  const unvetted: ReadonlyArray<readonly [string, string, Parameters<typeof serve<unknown>>[0]]> = [
    [
      "the identical declaration",
      "/a",
      HttpApiBuilder.layer(Same).pipe(
        Layer.provide(HttpApiBuilder.group(Same, "a", (h) => h.handle("read", done))),
        Layer.provide(guardApi(A.api)),
      ),
    ],
    [
      "a public endpoint (B1)",
      "/b",
      HttpApiBuilder.layer(SamePublic).pipe(
        Layer.provide(HttpApiBuilder.group(SamePublic, "a", (h) => h.handle("read", done))),
        Layer.provide(guardApi(A.api)),
      ),
    ],
    [
      "a write requirement (B2)",
      "/b",
      HttpApiBuilder.layer(SameWrite).pipe(
        Layer.provide(HttpApiBuilder.group(SameWrite, "a", (h) => h.handle("read", done))),
        Layer.provide(guardApi(A.api)),
      ),
    ],
    [
      "a misplaced group declaration",
      "/b",
      HttpApiBuilder.layer(SameMisplacedGroup).pipe(
        Layer.provide(HttpApiBuilder.group(SameMisplacedGroup, "a", (h) => h.handle("read", done))),
        Layer.provide(guardApi(A.api)),
      ),
    ],
    [
      "an API-level requirement over a public endpoint (B4)",
      "/b",
      HttpApiBuilder.layer(SameApiDeclared).pipe(
        Layer.provide(HttpApiBuilder.group(SameApiDeclared, "a", (h) => h.handle("read", done))),
        Layer.provide(guardApi(A.api)),
      ),
    ],
    [
      "the same API under prefix",
      "/v1/a",
      HttpApiBuilder.layer(SamePrefixed).pipe(
        Layer.provide(HttpApiBuilder.group(SamePrefixed, "a", (h) => h.handle("read", done))),
        Layer.provide(guardApi(A.api)),
      ),
    ],
  ];

  for (const [name, path, routes] of unvetted) {
    it.effect(`reusing ApiA's names, ${name}: 500 per request, one log line each, only GET /a listed`, () =>
      Effect.gen(function* () {
        const { lines, layer: logger } = collectingLogger();
        const { handler, dispose } = serve(routes, logger);
        const statuses: Array<number> = [];
        for (const token of [undefined, "read-token", "write-token"]) {
          const response = yield* Effect.promise(() =>
            handler(new Request(`http://localhost${path}`, token ? { headers: bearer(token) } : {})),
          );
          statuses.push(response.status);
        }
        assert.deepStrictEqual(statuses, [500, 500, 500]);
        assert.deepStrictEqual(
          lines.map((line) => line.message),
          [[MEMBERSHIP], [MEMBERSHIP], [MEMBERSHIP]],
        );
        const listed = yield* Effect.promise(() => handler(new Request("http://localhost/__permissions")));
        assert.deepStrictEqual(
          yield* Effect.promise(() => listed.json()),
          [{ permission: permissionKey(readP), endpoints: [{ method: "GET", path: "/a", group: "a" }] }],
        );
        yield* Effect.promise(() => dispose());
      }));
  }

  it.effect("guardApi(P) on the layer serving P = ApiA.prefix('/v1') enforces /v1/a and lists exactly it", () =>
    Effect.gen(function* () {
      const P = ApiA.prefix("/v1");
      const routes = HttpApiBuilder.layer(P).pipe(
        Layer.provide(HttpApiBuilder.group(P, "a", (h) => h.handle("read", done))),
        Layer.provide(guardApi(P)),
      );
      const { handler, dispose } = serve(routes);
      const status = (token?: string) =>
        Effect.promise(() =>
          handler(new Request("http://localhost/v1/a", token ? { headers: bearer(token) } : {})),
        ).pipe(Effect.map((r) => r.status));
      assert.strictEqual(yield* status("read-token"), 204);
      assert.notStrictEqual(yield* status(), 204);
      const listed = yield* Effect.promise(() => handler(new Request("http://localhost/__permissions")));
      assert.deepStrictEqual(
        yield* Effect.promise(() => listed.json()),
        [{ permission: permissionKey(readP), endpoints: [{ method: "GET", path: "/v1/a", group: "a" }] }],
      );
      yield* Effect.promise(() => dispose());
    }));

  const declared = requiring("/a", readP);
  const forgotten = HttpApiEndpoint.get("forgotten", "/u");

  it.effect("an endpoint that declares neither fails guardApi's build with AccessNotDeclared, registering nothing", () =>
    Effect.gen(function* () {
      const api = HttpApi.make("u").add(HttpApiGroup.make("g").add(declared, forgotten)).middleware(RequirePermission);
      const registry = yield* Effect.scoped(
        Layer.build(PermissionRegistryLive).pipe(Effect.map((ctx) => Context.get(ctx, PermissionRegistry))),
      );
      yield* registry.register(writeP, { method: "POST", path: "/pre", group: undefined });
      const built = yield* Effect.scoped(
        Layer.build(
          guardApi(api).pipe(
            Layer.provide(Layer.succeed(PermissionRegistry, registry)),
            Layer.provide(subjectsLayer),
            Layer.provide(Layer.mergeAll(portsLayer({}), EvaluationIdLive)),
          ),
        ),
      ).pipe(Effect.result);
      assert.isTrue(Result.isFailure(built));
      if (Result.isFailure(built)) {
        assert.isTrue(built.failure instanceof AccessNotDeclared);
        if (built.failure instanceof AccessNotDeclared) {
          assert.deepStrictEqual([built.failure.group, built.failure.endpoint], ["g", "forgotten"]);
          assert.strictEqual(
            built.failure.message,
            'endpoint "forgotten" of group "g" declares neither a permission requirement nor publicEndpoint(...), ' +
              "so guardApi refuses it. Annotate it with RequiredPermission, or with PublicEndpoint if it is " +
              "meant to be reachable without authorization.",
          );
        }
      }
      const snapshot = yield* registry.snapshot;
      assert.deepStrictEqual(HashMap.toEntries(snapshot), [
        [permissionKey(writeP), [{ method: "POST", path: "/pre", group: undefined }]],
      ]);
    }));

  it.effect("precedence: a misplaced declaration, then an unattached endpoint, then an undeclared one", () =>
    Effect.gen(function* () {
      const tagOf = <E extends { readonly _tag: string }>(
        layer: Layer.Layer<RequirePermission, E, PermissionRegistry | SubjectExtractor | StandingEvaluationServices>,
      ) =>
        snapshotOf(layer).pipe(
          Effect.result,
          Effect.map((r) => (Result.isFailure(r) ? r.failure._tag : "built")),
        );
      const misplacedAndUndeclared = HttpApi.make("a")
        .add(HttpApiGroup.make("g").add(forgotten).annotate(RequiredPermission, decoyRequirement))
        .middleware(RequirePermission);
      assert.strictEqual(yield* tagOf(guardApi(misplacedAndUndeclared)), "MisplacedAccessDeclaration");
      const misplacedAndUnattached = HttpApi.make("b").add(
        HttpApiGroup.make("g").add(declared).annotate(RequiredPermission, decoyRequirement),
      );
      // @ts-expect-error — the type already refuses this API; the runtime refusal is what this exercises.
      assert.strictEqual(yield* tagOf(guardApi(misplacedAndUnattached)), "MisplacedAccessDeclaration");
      const unattachedAndUndeclared = HttpApi.make("c").add(HttpApiGroup.make("g").add(forgotten));
      // @ts-expect-error — the type already refuses this API; the runtime refusal is what this exercises.
      assert.strictEqual(yield* tagOf(guardApi(unattachedAndUndeclared)), "RequirePermissionNotAttached");
      const mixed = HttpApi.make("d")
        .add(HttpApiGroup.make("g1").add(forgotten))
        .middleware(RequirePermission)
        .add(HttpApiGroup.make("g2").add(HttpApiEndpoint.get("bare", "/bare")));
      // @ts-expect-error — the type already refuses this API; the runtime refusal is what this exercises.
      assert.strictEqual(yield* tagOf(guardApi(mixed)), "RequirePermissionNotAttached");
      assert.strictEqual(yield* tagOf(guardApi(HttpApi.make("e").add(HttpApiGroup.make("g").add(declared)).middleware(RequirePermission))), "built");
    }));
});
