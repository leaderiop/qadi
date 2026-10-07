/**
 * An endpoint's access declaration is read once, over one scope, by both
 * readers (ARCH-18, CCR-QD-196): `RequirePermission` enforces it and
 * `registerApi` lists it, and for every placement of a declaration on the API
 * tree the two must agree. The differential below is the test that would have
 * caught the registry listing a group-required endpoint that the middleware
 * served to anyone.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as HashMap from "effect/HashMap";
import * as Result from "effect/Result";
import * as HttpApi from "effect/http-api/HttpApi";
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder";
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint";
import * as HttpApiGroup from "effect/http-api/HttpApiGroup";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServer from "effect/http/HttpServer";
import type { Permission } from "@qadi/core";
import {
  EvaluationIdLive,
  hasPermission,
  makeSubject,
  permission,
  permissionKey,
  portsLayer,
} from "@qadi/core";
import { assert, describe, it } from "@effect/vitest";
import type { AnnotatedEndpoint } from "../src/index.ts";
import {
  EndpointAccess,
  MisplacedAccessDeclaration,
  PermissionRegistry,
  PermissionRegistryLive,
  PublicEndpoint,
  RequiredPermission,
  RequirePermission,
  RequirePermissionLive,
  endpointAccess,
  misplacedDeclarations,
  publicEndpoint,
  registerApi,
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

/**
 * Serves `routes` through the real middleware stack and reads what
 * `registerApi(api)` recorded, returning for each path the permission the
 * registry lists and the permission the middleware demonstrably enforces.
 */
const observe = <Id extends string, Groups extends HttpApiGroup.Constraint>(
  api: HttpApi.HttpApi<Id, Groups>,
  routes: Layer.Layer<
    never,
    never,
    RequirePermission | HttpRouter.HttpRouter | Layer.Success<typeof HttpServer.layerServices>
  >,
  paths: ReadonlyArray<string>,
  logs: Array<unknown> = [],
) =>
  Effect.gen(function* () {
    const registryBuilt = yield* Effect.scoped(
      Layer.build(registerApi(api).pipe(Layer.provideMerge(PermissionRegistryLive))).pipe(
        Effect.flatMap((ctx) => Context.get(ctx, PermissionRegistry).snapshot),
      ),
    ).pipe(Effect.result);
    const listed = new Map<string, string>();
    if (Result.isSuccess(registryBuilt)) {
      for (const [key, descriptors] of HashMap.toEntries(registryBuilt.success)) {
        for (const d of descriptors) listed.set(d.path, key);
      }
    }

    const app = routes.pipe(
      Layer.provide(RequirePermissionLive),
      Layer.provideMerge(
        subjectExtractorBearer((token) =>
          token === "read-token"
            ? Effect.succeed(subjects["read-token"])
            : token === "write-token"
              ? Effect.succeed(subjects["write-token"])
              : Effect.die(new Error(`unknown token ${token}`)),
        ),
      ),
      Layer.provideMerge(Layer.mergeAll(portsLayer({}), EvaluationIdLive)),
      Layer.provideMerge(HttpServer.layerServices),
      Layer.provideMerge(Logger.layer([Logger.make((options) => logs.push(options.message))])),
    );
    const { handler, dispose } = HttpRouter.toWebHandler(app, { disableLogger: true });
    const status = (path: string, token?: string) =>
      Effect.promise(() =>
        handler(
          new Request(`http://localhost${path}`, token ? { headers: { authorization: `Bearer ${token}` } } : {}),
        ),
      ).pipe(Effect.map((r) => r.status));

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
    return {
      listed,
      enforced,
      statuses,
      registryError: Result.isFailure(registryBuilt) ? registryBuilt.failure : undefined,
    };
  });

const done = () => Effect.void;

// Case 1: a group annotated with a requirement.
const case1 = (logs: Array<unknown>) => {
  const group = HttpApiGroup.make("g")
    .add(ep("a"), ep("b"))
    .annotate(RequiredPermission, required(decoy));
  const api = HttpApi.make("t").add(group).middleware(RequirePermission);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done).handle("b", done));
  return observe(api, HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a", "/b"], logs);
};

// Case 2: a group-level requirement over an endpoint-level `publicEndpoint`.
const case2 = (logs: Array<unknown>) => {
  const group = HttpApiGroup.make("g")
    .add(ep("a").pipe((e) => e.annotate(PublicEndpoint, publicEndpoint("probe"))))
    .annotate(RequiredPermission, required(decoy));
  const api = HttpApi.make("t").add(group).middleware(RequirePermission);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  return observe(api, HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logs);
};

// Case 3: a group-level `publicEndpoint` alone.
const case3 = (logs: Array<unknown>) => {
  const group = HttpApiGroup.make("g")
    .add(ep("a"))
    .annotate(PublicEndpoint, publicEndpoint("probe"));
  const api = HttpApi.make("t").add(group).middleware(RequirePermission);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  return observe(api, HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logs);
};

// Case 4: an API-level requirement.
const case4 = (logs: Array<unknown>) => {
  const api = HttpApi.make("t")
    .add(HttpApiGroup.make("g").add(ep("a")))
    .middleware(RequirePermission)
    .annotate(RequiredPermission, required(decoy));
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  return observe(api, HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logs);
};

// Case 5: `annotateEndpoints`, the supported way to declare for a whole group.
const case5 = (logs: Array<unknown>) => {
  const group = HttpApiGroup.make("g")
    .add(ep("a"))
    .annotateEndpoints(RequiredPermission, required(decoy));
  const api = HttpApi.make("t").add(group).middleware(RequirePermission);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  return observe(api, HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logs);
};

// Case 6: a group requirement over an endpoint requirement of its own.
const case6 = (logs: Array<unknown>) => {
  const group = HttpApiGroup.make("g")
    .add(ep("a").pipe((e) => e.annotate(RequiredPermission, required(e, writeP))))
    .annotate(RequiredPermission, required(decoy));
  const api = HttpApi.make("t").add(group).middleware(RequirePermission);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  return observe(api, HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logs);
};

// Case 7: both keys on one endpoint.
const case7 = (logs: Array<unknown>) => {
  const group = HttpApiGroup.make("g").add(
    ep("a").pipe((e) =>
      e.annotate(RequiredPermission, required(e)).annotate(PublicEndpoint, publicEndpoint("probe")),
    ),
  );
  const api = HttpApi.make("t").add(group).middleware(RequirePermission);
  const handlers = HttpApiBuilder.group(api, "g", (h) => h.handle("a", done));
  return observe(api, HttpApiBuilder.layer(api).pipe(Layer.provide(handlers)), ["/a"], logs);
};

const placements = [
  ["group-level requirement", case1],
  ["group requirement + endpoint public", case2],
  ["group-level public", case3],
  ["api-level requirement", case4],
  ["group.annotateEndpoints", case5],
  ["group requirement + endpoint requirement", case6],
  ["both keys on one endpoint", case7],
] as const;

const groupRefusal = (group: string, endpoint: string, keys: string) =>
  `qadi/http: group "${group}" carries ${keys}, which only an endpoint may declare, so endpoint ` +
  `"${endpoint}" is refused. Declare it on each endpoint, or use HttpApiGroup.annotateEndpoints.`;

describe("endpointAccess: the registry and the middleware read one scope", () => {
  for (const [name, run] of placements) {
    it.effect(`${name}: listed under P if and only if P is enforced`, () =>
      Effect.gen(function* () {
        const observed = yield* run([]);
        for (const [path, enforcedKey] of observed.enforced) {
          assert.strictEqual(observed.listed.get(path), enforcedKey, `${name} ${path}`);
        }
      }));
  }

  it.effect("a group requirement over a public endpoint is refused, not served and not listed", () =>
    Effect.gen(function* () {
      const logs: Array<unknown> = [];
      const observed = yield* case2(logs);
      // Served as 204 to anyone and listed as guarded, before ARCH-18.
      assert.strictEqual(observed.statuses.get("/a"), 500);
      assert.isFalse(observed.listed.has("/a"));
      assert.include(logs.flat(), groupRefusal("g", "a", "RequiredPermission"));
    }));

  it.effect("a group requirement refuses every endpoint under it, and registerApi names the group", () =>
    Effect.gen(function* () {
      const logs: Array<unknown> = [];
      const observed = yield* case1(logs);
      assert.strictEqual(observed.statuses.get("/a"), 500);
      assert.strictEqual(observed.statuses.get("/b"), 500);
      assert.include(logs.flat(), groupRefusal("g", "a", "RequiredPermission"));
      assert.include(logs.flat(), groupRefusal("g", "b", "RequiredPermission"));
      assert.deepStrictEqual(observed.registryError?._tag, "MisplacedAccessDeclaration");
      assert.deepStrictEqual(
        observed.registryError && [
          observed.registryError.scope,
          observed.registryError.identifier,
          observed.registryError.key,
        ],
        ["group", "g", "RequiredPermission"],
      );
    }));

  it.effect("a group-level publicEndpoint is refused by both readers", () =>
    Effect.gen(function* () {
      const logs: Array<unknown> = [];
      const observed = yield* case3(logs);
      assert.strictEqual(observed.statuses.get("/a"), 500);
      assert.include(logs.flat(), groupRefusal("g", "a", "PublicEndpoint"));
      assert.deepStrictEqual(
        observed.registryError && [observed.registryError.scope, observed.registryError.key],
        ["group", "PublicEndpoint"],
      );
    }));

  it.effect("an api-level requirement is refused by registerApi, and the middleware cannot serve it", () =>
    Effect.gen(function* () {
      const observed = yield* case4([]);
      assert.deepStrictEqual(
        observed.registryError && [
          observed.registryError.scope,
          observed.registryError.identifier,
          observed.registryError.key,
        ],
        ["api", "t", "RequiredPermission"],
      );
      assert.strictEqual(observed.statuses.get("/a"), 500);
    }));

  it.effect("a group requirement over an endpoint requirement is refused rather than overridden", () =>
    Effect.gen(function* () {
      const observed = yield* case6([]);
      assert.strictEqual(observed.statuses.get("/a"), 500);
      assert.isDefined(observed.registryError);
    }));

  it.effect("group.annotateEndpoints is honored by both readers", () =>
    Effect.gen(function* () {
      const observed = yield* case5([]);
      assert.isUndefined(observed.registryError);
      assert.strictEqual(observed.listed.get("/a"), READ_KEY);
      assert.strictEqual(observed.enforced.get("/a"), READ_KEY);
    }));

  it.effect("an endpoint carrying both keys is enforced and listed: the requirement wins", () =>
    Effect.gen(function* () {
      const observed = yield* case7([]);
      assert.isUndefined(observed.registryError);
      assert.strictEqual(observed.statuses.get("/a"), 403);
      assert.strictEqual(observed.enforced.get("/a"), READ_KEY);
      assert.strictEqual(observed.listed.get("/a"), READ_KEY);
    }));
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

  it("names the scope, identifier and key in a MisplacedAccessDeclaration's message", () => {
    const error = new MisplacedAccessDeclaration({ scope: "group", identifier: "g", key: "PublicEndpoint" });
    assert.include(error.message, 'group "g" carries PublicEndpoint');
  });
});
