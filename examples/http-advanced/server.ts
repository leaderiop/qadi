/**
 * Advanced `@qadi/http` usage with an Effect HTTP server.
 *
 * One application exercising every mechanism the package ships, wired the way
 * ADR-QD-036 intends them to compose:
 *
 *  1. `HttpApi` endpoints, each annotated with either a permission requirement
 *     (`requiresPermission`) or a deliberate public declaration
 *     (`publicEndpoint`). An endpoint annotated with neither is **refused** at
 *     "unguarded".
 *  2. The `RequirePermission` middleware, registered once on the whole API. It
 *     resolves the subject per request through the pluggable `SubjectExtractor`
 *     service and **provides `CurrentSubject`**, so handlers read who is asking
 *     without knowing how the credential arrived.
 *  3. Bare `HttpRouter` routes guarded by `addGuardedRoute` — same
 *     enforcement, same registry visibility, but with a per-request
 *     `loadResource`, so the policy is evaluated against the *real* resource
 *     and the handler receives the `Authorized` witness. A resource-scoped
 *     re-check inside the handler via `guard` is defense in depth.
 *  4. The `/__decisions` SSE route fed from `decisionSinkFeed`, with
 *     `reauth` — the stream re-extracts the subject and re-checks the policy on
 *     an interval, so a revocation mid-stream ends the connection.
 *  5. The `/__permissions` registry route, served **behind a policy**, merging
 *     endpoint annotations and bare routes into one audit topology.
 *  6. The 403/502 split at the wire: an unknown token resolves to `anonymous`
 *     (a denial, 403); a broken credential store fails with
 *     `SubjectExtractionFailed` (an outage, 502 — never a silent lockout).
 *
 * Run with Bun (resolves the workspace packages' `src` directly):
 *
 * ```sh
 * bun examples/http-advanced/server.ts
 * ```
 */
import * as NodeHttp from "node:http";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import type { AuthSubject } from "@qadi/core";
import {
  allOf,
  AttributeResolveError,
  AttributeResolver,
  CurrentSubject,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  decisionCacheLayer,
  decisionSinkFeed,
  EvaluationIdLive,
  guard,
  gte,
  hasAttribute,
  hasPermission,
  hasResourceAttribute,
  makeSubject,
  permission,
  permissionKey,
  RelationshipResolverNever,
  SignatureHistoryNone,
} from "@qadi/core";
import {
  ENFORCEMENT_ERROR_TAGS,
  PermissionRegistryLive,
  RequirePermissionLive,
  SubjectExtractionFailed,
  addGuardedRoute,
  decisionStreamRoute,
  permissionRegistryRoute,
  registerApi,
  subjectExtractorBearer,
  toResponse,
} from "@qadi/http";
import { Api, readPermission, readPolicy } from "./api.ts";

// ---------------------------------------------------------------------------
// Policies and permissions
// ---------------------------------------------------------------------------

const writePermission = permission("document", "write");
const adminPermission = permission("admin", "introspect");

const adminPolicy = hasPermission(adminPermission);

// Write access: the permission gate plus subject clearance plus a resource
// attribute, evaluated as one tree. `addGuardedRoute` evaluates this against
const writePolicy = allOf([
  hasPermission(writePermission),
  hasAttribute("clearance", gte(1)),
  hasResourceAttribute("minClearance", gte(1)),
]);

// ---------------------------------------------------------------------------
// Subjects — a token store standing in for whatever a deployment actually uses
// ---------------------------------------------------------------------------

const ALICE_TOKEN = "alice-token";
const BOB_TOKEN = "bob-token";
const ADMIN_TOKEN = "admin-token";

const subjects: Record<string, AuthSubject> = {
  [ALICE_TOKEN]: makeSubject({
    id: "alice",
    permissions: [permissionKey(readPermission), permissionKey(writePermission)],
  }),
  [BOB_TOKEN]: makeSubject({ id: "bob", permissions: [permissionKey(readPermission)] }),
  [ADMIN_TOKEN]: makeSubject({ id: "admin", permissions: [permissionKey(adminPermission)] }),
};

// Clearance "lives" in an attribute store, not in the policy — the policy only
// names what it needs.
const clearances: Record<string, number> = { alice: 5, bob: 0 };

/** Set `true` to see an outage answer 502 where a denial answers 403. */
let credentialStoreDown = false;

const lookupSubject = (token: string): Effect.Effect<AuthSubject, SubjectExtractionFailed> => {
  if (credentialStoreDown) {
    // The store broke. This is not "no credential" — that would be
    // `anonymous`, a subject the policy then denies (403). This failure is
    // INV-QD-006 at the HTTP boundary: an outage must surface as 502.
    return Effect.fail(new SubjectExtractionFailed({ reason: "token store unreachable" }));
  }
  // An unrecognized token is not an outage: the subject is `anonymous`, which
  // holds no permissions, so every guarded route denies it with 403.
  return Effect.succeed(subjects[token] ?? makeSubject({ id: `unknown:${token}` }));
};

// ---------------------------------------------------------------------------
// The HttpApi half — the shared contract from `api.ts`, handlers here
// ---------------------------------------------------------------------------

// An endpoint annotated with neither a permission requirement nor a public
// marker — the wiring mistake that used to serve itself unguarded — is
// refused instead:
//
//   HttpApiEndpoint.get("forgotten", "/documents/forgotten")  → 500 + log

const DocumentsHandlers = HttpApiBuilder.group(Api, "documents", (handlers) =>
  handlers
    .handle("read", () => Effect.void)
    .handle(
      "me",
      () =>
        Effect.gen(function* () {
          const subject = yield* CurrentSubject;
          return { subjectId: subject.id };
        }),
    )
    .handle("health", () => Effect.void),
);

const ApiRoutes = HttpApiBuilder.layer(Api).pipe(
  Layer.provide(DocumentsHandlers),
  Layer.provide(RequirePermissionLive),
);

// ---------------------------------------------------------------------------
// The bare-HttpRouter half — resource-scoped enforcement on plain routes
// ---------------------------------------------------------------------------

// A pretend document store. `loadResource` is where the real one goes; it runs
// per request, before the policy is evaluated, so matchers like
// `hasResourceAttribute` above see the actual resource.
const documents: Record<string, { minClearance: number; body: string }> = {
  "acme-42": { minClearance: 1, body: "quarterly report" },
};

const loadDocument = (request: HttpServerRequest.HttpServerRequest) =>
  Effect.sync(() => {
    // `request.url` is path-only on this server — give `new URL` a base.
    const id = new URL(request.url, "http://localhost").pathname.split("/").pop() ?? "";
    return documents[id] ?? { minClearance: 0, body: "" };
  });

const ReadOneRoute = addGuardedRoute(
  "GET",
  "/documents/:id",
  readPermission,
  readPolicy,
  loadDocument,
)((_authorized, document) => Effect.succeed(HttpServerResponse.jsonUnsafe(document)));

const WriteRoute = addGuardedRoute(
  "POST",
  "/documents/:id",
  writePermission,
  writePolicy,
  loadDocument,
)(
  // The route-level check already evaluated `writePolicy` against this exact
  // resource; the handler re-checks it through `guard` — defense in depth,
  // and `guard`'s obligation-discharging semantics. The `Authorized` witness
  // arrives as the first handler argument.
  (_authorized, resource) =>
    guard(writePermission, writePolicy)(resource, () => Effect.void).pipe(
      Effect.as(HttpServerResponse.text("written")),
      // A bare route has no schema-fixed error channel, so the enforcement
      // errors the inner guard can raise are answered here, through the
      // package's own 403/502 table.
      Effect.catchTag(ENFORCEMENT_ERROR_TAGS, (error) => Effect.succeed(toResponse(error))),
    ),
);

// ---------------------------------------------------------------------------
// Composition — named intermediate steps, deliberately: one long inline
// `.pipe(Layer.provideMerge(...))` chain can silently infer `any` past its
// instantiation-depth budget, with no diagnostic at the chain itself.
// ---------------------------------------------------------------------------

const AttributeServices = Layer.succeed(AttributeResolver, {
  resolve: (subjectId, attribute) => {
    if (process.env["RESOLVER_DOWN"] === "1") {
      // The attribute store is down. The middleware's declared
      // `AttributeResolveErrorResponse` schema encodes this as a real body,
      // so a client decodes a typed outage — never a fake denial.
      return Effect.fail(
        new AttributeResolveError({ attribute, cause: "attribute store unreachable" }),
      );
    }
    return Effect.succeed(attribute === "clearance" ? clearances[subjectId] : undefined);
  },
});

const EvaluationServices = Layer.mergeAll(
  AttributeServices,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
  SignatureHistoryNone,
);

const main = Effect.gen(function* () {
  // The feed is both halves of the decision pipeline: evaluations publish
  // into `feed.layer`'s `DecisionSink`, and `/__decisions` streams
  // `feed.stream` out as SSE frames.
  const feed = yield* decisionSinkFeed({ capacity: 1024, replay: 16 });

  const DecisionStream = decisionStreamRoute(readPermission, readPolicy, feed.stream, {
    // Mid-stream re-authorization: every 30s the route re-extracts the
    // subject from the same request and re-checks the policy. A revocation
    // ends the stream; a broken credential store ends it too.
    reauth: { interval: "30 seconds" },
  });

  const RegistryRoute = permissionRegistryRoute(adminPermission, adminPolicy);

  const RoutesLayer = Layer.mergeAll(
    ApiRoutes,
    ReadOneRoute,
    WriteRoute,
    DecisionStream,
    RegistryRoute,
  );

  // `registerApi` walks the built `HttpApi` once and pushes every
  // `RequiredPermission` annotation into the registry — the same store
  // `addGuardedRoute` writes to — so `/__permissions` reports both sources.
  const RegistryLayer = registerApi(Api).pipe(Layer.provideMerge(PermissionRegistryLive));

  const WithRegistry = RoutesLayer.pipe(Layer.provideMerge(RegistryLayer));
  const WithSubjects = WithRegistry.pipe(Layer.provideMerge(subjectExtractorBearer(lookupSubject)));
  const WithEvaluation = WithSubjects.pipe(Layer.provideMerge(EvaluationServices));
  const WithCache = WithEvaluation.pipe(Layer.provideMerge(decisionCacheLayer()));
  const AppLayer = WithCache.pipe(
    Layer.provideMerge(feed.layer),
    Layer.provideMerge(HttpServer.layerServices),
  );

  return { handler: HttpRouter.toWebHandler(AppLayer).handler };
});

// ---------------------------------------------------------------------------
// Serving — `toWebHandler` produces a web-standard Request => Response
// function; bridge it to `node:http` (any web-standard runtime works the same
// way). Request bodies are not forwarded here because the routes above read
// none; add them where your routes need one.
// ---------------------------------------------------------------------------

const port = Number(process.env["PORT"] ?? 3000);

Effect.runPromise(main).then(({ handler }) => {
  NodeHttp.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (typeof value === "string") headers.set(name, value);
    }
    try {
      const response = await handler(
        new Request(url, { method: req.method ?? "GET", headers }),
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body === null) {
        res.end();
      } else {
        void response.body.pipeTo(
          new WritableStream({
            write: (chunk) => {
              res.write(chunk);
            },
            close: () => {
              res.end();
            },
          }),
        );
      }
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  }).listen(port, () => {
    console.log(`listening on http://localhost:${port}`);
  });
});
