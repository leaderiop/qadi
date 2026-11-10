/**
 * Every placement of an access declaration on the API tree is decided once, by the access plan
 * `guardApi` builds (ARCH-18, CCR-QD-196; ARCH-59): the composed application is either refused
 * when it is built, registering nothing, or what `/__permissions` lists is exactly what is
 * enforced. The differential below is the test that would have caught the registry listing a
 * group-required endpoint that the middleware served to anyone, and it goes through `guardApi`
 * and a request only, the interface, never the middleware alone.
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
import type { Permission, StandingEvaluationServices } from "@qadi/core";
import { collectingLogger } from "@qadi/testing";
import { EvaluationIdLive, hasPermission, makeSubject, permission, permissionKey, portsLayer } from "@qadi/core";
import { assert, describe, it } from "@effect/vitest";
import type { AnnotatedEndpoint, ApiGuardRefusal, SubjectExtractor } from "../src/index.ts";
import { stack } from "./fixtures/stack.ts";
import {
  EndpointAccess,
  MisplacedAccessDeclaration,
  PermissionRegistry,
  PermissionRegistryLive,
  PublicEndpoint,
  RequiredPermission,
  RequirePermission,
  endpointAccess,
  guardApi,
  permissionRegistryRouteUnguarded,
  misplacedDeclarations,
  publicEndpoint,
  requiresPermission,
  subjectExtractorBearer,
} from "../src/index.ts";

const readP = permission("document", "read");
const writeP = permission("document", "write");
const READ_KEY = permissionKey(readP);
const WRITE_KEY = permissionKey(writeP);

const subjects = {
  "read-token": makeSubject({ id: "reader", permissions: [READ_KEY] }),
  "write-token": makeSubject({ id: "writer", permissions: [WRITE_KEY] }),
} as const;

const required = (target: AnnotatedEndpoint, p: Permission = readP) =>
  requiresPermission(target, { permission: p, policy: hasPermission(p) });

/** A throwaway endpoint, so a group or API can be annotated with a value `requiresPermission` made. */
const decoy = HttpApiEndpoint.get("decoy", "/decoy");

const ep = <const Id extends string>(id: Id) => HttpApiEndpoint.get(id, `/${id}`);

const subjectsLayer = subjectExtractorBearer((token) =>
  token === "read-token"
    ? Effect.succeed(subjects["read-token"])
    : token === "write-token"
      ? Effect.succeed(subjects["write-token"])
      : Effect.die(new Error(`unknown token ${token}`)),
);
const servicesLayer = Layer.mergeAll(portsLayer({}), EvaluationIdLive);

/** What `observe` saw: the build was refused, or the served application's listing and enforcement. */
type Observed =
  | { readonly refused: ApiGuardRefusal; readonly registered: number }
  | {
      readonly refused: undefined;
      readonly listed: ReadonlyMap<string, string>;
      readonly enforced: ReadonlyMap<string, string | undefined>;
      readonly statuses: ReadonlyMap<string, number>;
    };

/**
 * Composes `routes` with `guard` exactly as an application does (`guard` provided into the
 * routes it guards) and either returns the refusal building it raised, with how many entries
 * the registry then held, or serves it and returns for each path the permission
 * `/__permissions` lists and the permission the requests demonstrably enforce.
 */
const observe = (
  guard: Layer.Layer<
    RequirePermission,
    ApiGuardRefusal,
    SubjectExtractor | StandingEvaluationServices | PermissionRegistry
  >,
  routes: Layer.Layer<
    never,
    never,
    RequirePermission | HttpRouter.HttpRouter | Layer.Success<typeof HttpServer.layerServices>
  >,
  paths: ReadonlyArray<string>,
  logger: Layer.Layer<never> = Layer.empty,
): Effect.Effect<Observed> =>
  Effect.gen(function* () {
    const composed = routes.pipe(Layer.provide(guard));
    const registry = yield* Effect.scoped(
      Layer.build(PermissionRegistryLive).pipe(Effect.map((ctx) => Context.get(ctx, PermissionRegistry))),
    );
    const built = yield* Effect.scoped(
      Layer.build(
        composed.pipe(
          Layer.provide(HttpRouter.layer),
          Layer.provide(Layer.succeed(PermissionRegistry, registry)),
          Layer.provide(subjectsLayer),
          Layer.provide(servicesLayer),
          Layer.provide(HttpServer.layerServices),
        ),
      ),
    ).pipe(Effect.result);
    if (Result.isFailure(built)) {
      return { refused: built.failure, registered: HashMap.size(yield* registry.snapshot) };
    }

    const app = stack(
      Layer.mergeAll(composed, permissionRegistryRouteUnguarded("test fixture")),
      subjectsLayer,
      servicesLayer,
    ).pipe(Layer.provideMerge(logger));
    const { handler, dispose } = HttpRouter.toWebHandler(app, { disableLogger: true });
    const status = (path: string, token?: string) =>
      Effect.promise(() =>
        handler(
          new Request(`http://localhost${path}`, token ? { headers: { authorization: `Bearer ${token}` } } : {}),
        ),
      ).pipe(Effect.map((r) => r.status));

    const listed = new Map<string, string>();
    const response = yield* Effect.promise(() => handler(new Request("http://localhost/__permissions")));
    const body: ReadonlyArray<{
      readonly permission: string;
      readonly endpoints: ReadonlyArray<{ readonly path: string }>;
    }> = yield* Effect.promise(() => response.json());
    for (const entry of body) for (const endpoint of entry.endpoints) listed.set(endpoint.path, entry.permission);

    const enforced = new Map<string, string | undefined>();
    const statuses = new Map<string, number>();
    for (const path of paths) {
      const anonymous = yield* status(path);
      statuses.set(path, anonymous);
      const asReader = yield* status(path, "read-token");
      const asWriter = yield* status(path, "write-token");
      enforced.set(
        path,
        anonymous === 204 || anonymous === 500
          ? undefined
          : asReader === 204 && asWriter === 403
            ? READ_KEY
            : asWriter === 204 && asReader === 403
              ? WRITE_KEY
              : undefined,
      );
    }
    yield* Effect.promise(() => dispose());
    return { refused: undefined, listed, enforced, statuses };
  });

/** The refusal narrowed to a misplaced declaration, or `undefined`. */
const misplacedOf = (observed: Observed) =>
  observed.refused instanceof MisplacedAccessDeclaration ? observed.refused : undefined;

const done = () => Effect.void;

// Case 1: a group annotated with a requirement.
const case1 = (logger: Layer.Layer<never>) => {
  const group = HttpApiGroup.make("g")
    .add(ep("a"), ep("b"))
    .annotate(RequiredPermission, required(decoy));
  const api = HttpApi.make("t").add(group).middleware(RequirePermission);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done).handle("b", done));
  return observe(guardApi(api), HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a", "/b"], logger);
};

// Case 2: a group-level requirement over an endpoint-level `publicEndpoint`.
const case2 = (logger: Layer.Layer<never>) => {
  const group = HttpApiGroup.make("g")
    .add(ep("a").pipe((e) => e.annotate(PublicEndpoint, publicEndpoint("probe"))))
    .annotate(RequiredPermission, required(decoy));
  const api = HttpApi.make("t").add(group).middleware(RequirePermission);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  return observe(guardApi(api), HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logger);
};

// Case 3: a group-level `publicEndpoint` alone.
const case3 = (logger: Layer.Layer<never>) => {
  const group = HttpApiGroup.make("g")
    .add(ep("a"))
    .annotate(PublicEndpoint, publicEndpoint("probe"));
  const api = HttpApi.make("t").add(group).middleware(RequirePermission);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  return observe(guardApi(api), HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logger);
};

// Case 4: an API-level requirement.
const case4 = (logger: Layer.Layer<never>) => {
  const api = HttpApi.make("t")
    .add(HttpApiGroup.make("g").add(ep("a")))
    .middleware(RequirePermission)
    .annotate(RequiredPermission, required(decoy));
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  return observe(guardApi(api), HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logger);
};

// Case 5: `annotateEndpoints`, the supported way to declare for a whole group.
const case5 = (logger: Layer.Layer<never>) => {
  const group = HttpApiGroup.make("g")
    .add(ep("a"))
    .annotateEndpoints(RequiredPermission, required(decoy));
  const api = HttpApi.make("t").add(group).middleware(RequirePermission);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  return observe(guardApi(api), HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logger);
};

// Case 6: a group requirement over an endpoint requirement of its own.
const case6 = (logger: Layer.Layer<never>) => {
  const group = HttpApiGroup.make("g")
    .add(ep("a").pipe((e) => e.annotate(RequiredPermission, required(e, writeP))))
    .annotate(RequiredPermission, required(decoy));
  const api = HttpApi.make("t").add(group).middleware(RequirePermission);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  return observe(guardApi(api), HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logger);
};

// Case 7: both keys on one endpoint.
const case7 = (logger: Layer.Layer<never>) => {
  const group = HttpApiGroup.make("g").add(
    ep("a").pipe((e) =>
      e.annotate(RequiredPermission, required(e)).annotate(PublicEndpoint, publicEndpoint("probe")),
    ),
  );
  const api = HttpApi.make("t").add(group).middleware(RequirePermission);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  return observe(guardApi(api), HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logger);
};

// Case 8: `.middleware` before `.add` — Effect applies it only to endpoints already added.
const case8 = (logger: Layer.Layer<never>) => {
  const group = HttpApiGroup.make("g").add(ep("a").pipe((e) => e.annotate(RequiredPermission, required(e))));
  const api = HttpApi.make("t").middleware(RequirePermission).add(group);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  // @ts-expect-error — the type already refuses this API; the runtime refusal is what this exercises.
  const guard = guardApi(api);
  return observe(guard, HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logger);
};

// Case 9: no middleware at all.
const case9 = (logger: Layer.Layer<never>) => {
  const group = HttpApiGroup.make("g").add(ep("a").pipe((e) => e.annotate(RequiredPermission, required(e))));
  const api = HttpApi.make("t").add(group);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  // @ts-expect-error — the type already refuses this API; the runtime refusal is what this exercises.
  const guard = guardApi(api);
  return observe(guard, HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logger);
};

// Case 10: the middleware is on one group only.
const case10 = (logger: Layer.Layer<never>) => {
  const g1 = HttpApiGroup.make("g1").add(ep("a").pipe((e) => e.annotate(RequiredPermission, required(e))));
  const g2 = HttpApiGroup.make("g2").add(ep("b").pipe((e) => e.annotate(RequiredPermission, required(e))));
  const api = HttpApi.make("t").add(g1).middleware(RequirePermission).add(g2);
  const h1 = HttpApiBuilder.group(api, "g1", (h) => h.handle("a", done));
  const h2 = HttpApiBuilder.group(api, "g2", (h) => h.handle("b", done));
  // @ts-expect-error — the type already refuses this API; the runtime refusal is what this exercises.
  const guard = guardApi(api);
  return observe(
    guard,
    HttpApiBuilder.layer(api).pipe(Layer.provide(h1), Layer.provide(h2)),
    ["/a", "/b"],
    logger,
  );
};

// Case 11: an endpoint that declares neither.
const case11 = (logger: Layer.Layer<never>) => {
  const group = HttpApiGroup.make("g").add(ep("a"));
  const api = HttpApi.make("t").add(group).middleware(RequirePermission);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  return observe(guardApi(api), HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logger);
};

const placements = [
  ["group-level requirement", case1, "MisplacedAccessDeclaration"],
  ["group requirement + endpoint public", case2, "MisplacedAccessDeclaration"],
  ["group-level public", case3, "MisplacedAccessDeclaration"],
  ["api-level requirement", case4, "MisplacedAccessDeclaration"],
  ["group.annotateEndpoints", case5, undefined],
  ["group requirement + endpoint requirement", case6, "MisplacedAccessDeclaration"],
  ["both keys on one endpoint", case7, undefined],
  ["middleware before add", case8, "RequirePermissionNotAttached"],
  ["no middleware", case9, "RequirePermissionNotAttached"],
  ["middleware on one group only", case10, "RequirePermissionNotAttached"],
  ["endpoint declares neither", case11, "AccessNotDeclared"],
] as const;

describe("every placement is decided once, by the access plan", () => {
  for (const [name, run, refusal] of placements) {
    it.effect(`${name}: refused at build, or listed under P if and only if P is enforced`, () =>
      Effect.gen(function* () {
        const observed = yield* run(Layer.empty);
        assert.strictEqual(observed.refused?._tag, refusal, name);
        if (observed.refused !== undefined) {
          // A refusal registers nothing, and nothing is served.
          assert.strictEqual(observed.registered, 0, name);
          return;
        }
        for (const [path, enforcedKey] of observed.enforced) {
          assert.strictEqual(observed.listed.get(path), enforcedKey, `${name} ${path}`);
        }
      }));
  }

  it.effect("an endpoint the middleware is not attached to is refused by guardApi, naming it", () =>
    Effect.gen(function* () {
      const observed = yield* case8(Layer.empty);
      assert.deepStrictEqual(
        observed.refused && "group" in observed.refused ? [observed.refused.group, observed.refused.endpoint] : undefined,
        ["g", "a"],
      );
    }));

  it.effect("middleware on one group only: guardApi refuses the whole API, naming the bare endpoint", () =>
    Effect.gen(function* () {
      const observed = yield* case10(Layer.empty);
      assert.deepStrictEqual(
        observed.refused && "group" in observed.refused ? [observed.refused.group, observed.refused.endpoint] : undefined,
        ["g2", "b"],
      );
    }));

  it.effect("an endpoint declaring neither is refused by guardApi, naming it", () =>
    Effect.gen(function* () {
      const observed = yield* case11(Layer.empty);
      assert.deepStrictEqual(
        observed.refused && "group" in observed.refused ? [observed.refused.group, observed.refused.endpoint] : undefined,
        ["g", "a"],
      );
    }));

  it.effect("a group requirement refuses the API, naming the group, before anything is served", () =>
    Effect.gen(function* () {
      const { lines, layer: logger } = collectingLogger();
      const observed = yield* case1(logger);
      assert.deepStrictEqual(
        [misplacedOf(observed)?.scope, misplacedOf(observed)?.identifier, misplacedOf(observed)?.key],
        ["group", "g", "RequiredPermission"],
      );
      // Nothing was served, so nothing was logged by a request either.
      assert.deepStrictEqual(lines, []);
    }));

  it.effect("a group requirement over a public endpoint is refused, not served and not listed", () =>
    Effect.gen(function* () {
      const observed = yield* case2(Layer.empty);
      // Served as 204 to anyone and listed as guarded, before ARCH-18.
      assert.deepStrictEqual(
        [misplacedOf(observed)?.scope, misplacedOf(observed)?.key],
        ["group", "RequiredPermission"],
      );
    }));

  it.effect("a group-level publicEndpoint is refused", () =>
    Effect.gen(function* () {
      const observed = yield* case3(Layer.empty);
      assert.deepStrictEqual([misplacedOf(observed)?.scope, misplacedOf(observed)?.key], ["group", "PublicEndpoint"]);
    }));

  it.effect("an api-level requirement is refused, naming the API", () =>
    Effect.gen(function* () {
      const observed = yield* case4(Layer.empty);
      assert.deepStrictEqual(
        [misplacedOf(observed)?.scope, misplacedOf(observed)?.identifier, misplacedOf(observed)?.key],
        ["api", "t", "RequiredPermission"],
      );
    }));

  it.effect("a group requirement over an endpoint requirement is refused rather than overridden", () =>
    Effect.gen(function* () {
      const observed = yield* case6(Layer.empty);
      assert.strictEqual(observed.refused?._tag, "MisplacedAccessDeclaration");
    }));

  it.effect("a group carrying both keys is reported by its first key, RequiredPermission", () =>
    Effect.gen(function* () {
      const group = HttpApiGroup.make("g")
        .add(ep("a"))
        .annotate(PublicEndpoint, publicEndpoint("probe"))
        .annotate(RequiredPermission, required(decoy));
      const api = HttpApi.make("t").add(group).middleware(RequirePermission);
      const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
      const observed = yield* observe(guardApi(api), HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"]);
      assert.strictEqual(misplacedOf(observed)?.key, "RequiredPermission");
    }));

  it.effect("group.annotateEndpoints is honored: listed and enforced", () =>
    Effect.gen(function* () {
      const observed = yield* case5(Layer.empty);
      assert.isUndefined(observed.refused);
      if (observed.refused === undefined) {
        assert.strictEqual(observed.listed.get("/a"), READ_KEY);
        assert.strictEqual(observed.enforced.get("/a"), READ_KEY);
      }
    }));

  it.effect("an endpoint carrying both keys is enforced and listed: the requirement wins", () =>
    Effect.gen(function* () {
      const observed = yield* case7(Layer.empty);
      assert.isUndefined(observed.refused);
      if (observed.refused === undefined) {
        assert.strictEqual(observed.statuses.get("/a"), 403);
        assert.strictEqual(observed.enforced.get("/a"), READ_KEY);
        assert.strictEqual(observed.listed.get("/a"), READ_KEY);
      }
    }));

  it("names the scope, identifier and key in a MisplacedAccessDeclaration's message", () => {
    const error = new MisplacedAccessDeclaration({ scope: "group", identifier: "g", key: "PublicEndpoint" });
    assert.strictEqual(
      error.message,
      'group "g" carries PublicEndpoint, which only an endpoint may declare. Declare it on each endpoint, ' +
        "or use HttpApiGroup.annotateEndpoints.",
    );
  });
});

describe("endpointAccess: the reader", () => {
  const requirement = required(decoy);
  const declaration = publicEndpoint("probe");
  const scopes = {
    none: Context.empty(),
    Required: Context.make(RequiredPermission, requirement),
    Public: Context.make(PublicEndpoint, declaration),
    both: Context.add(Context.make(RequiredPermission, requirement), PublicEndpoint, declaration),
  } as const;

  it("reads an endpoint's own annotations as one of three cases", () => {
    assert.strictEqual(endpointAccess(scopes.none)._tag, "Undeclared");
    assert.strictEqual(endpointAccess(scopes.Required)._tag, "Required");
    assert.strictEqual(endpointAccess(scopes.Public)._tag, "Public");
    // The stricter declaration wins when both are present.
    assert.strictEqual(endpointAccess(scopes.both)._tag, "Required");
  });

  it("carries the declaration it read", () => {
    const access = endpointAccess(scopes.Required);
    assert.isTrue(EndpointAccess.$is("Required")(access));
    assert.strictEqual(access._tag === "Required" ? access.requirement : undefined, requirement);
    const open = endpointAccess(scopes.Public);
    assert.strictEqual(open._tag === "Public" ? open.declaration : undefined, declaration);
  });

  it("reports a declaration on a scope that may not carry one, in key order", () => {
    assert.deepStrictEqual(misplacedDeclarations(scopes.none), []);
    assert.deepStrictEqual(misplacedDeclarations(scopes.Required), ["RequiredPermission"]);
    assert.deepStrictEqual(misplacedDeclarations(scopes.Public), ["PublicEndpoint"]);
    assert.deepStrictEqual(misplacedDeclarations(scopes.both), ["RequiredPermission", "PublicEndpoint"]);
  });

  it("is blind to a group or API: only the endpoint's own annotations are read", () => {
    const group = HttpApiGroup.make("g").add(ep("a")).annotate(RequiredPermission, requirement);
    const api = HttpApi.make("t").add(group).annotate(PublicEndpoint, declaration);
    const endpoint = group.endpoints["a"];
    assert.strictEqual(endpointAccess(endpoint.annotations)._tag, "Undeclared");
    assert.deepStrictEqual(misplacedDeclarations(group.annotations), ["RequiredPermission"]);
    assert.deepStrictEqual(misplacedDeclarations(api.annotations), ["PublicEndpoint"]);
  });
});
