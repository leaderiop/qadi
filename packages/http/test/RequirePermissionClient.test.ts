/**
 * `RequirePermission`'s client-side error typing (ADR-QD-075), proved through
 * a real generated client rather than by inspecting types alone —
 * `effect/unstable/httpapi/HttpApiTest`'s in-memory client uses the same
 * request encoding, routing, response encoding, and client decoding as a
 * real `HttpApiClient`/`HttpApiBuilder` pair, without starting a server. This
 * is the seam `.scratch/qadi-http-client-errors/spec.md`'s Testing Decisions
 * names for the runtime half of this feature; `RequirePermission.tst.ts`
 * covers the static half.
 *
 * `packages/http/test/http.test.ts` is `packages/http`'s black-box seam for
 * every *server-side* enforcement scenario and stays untouched by this
 * feature — nothing here duplicates it. This file exists only because that
 * seam has no generated client in it at all (`HttpRouter.toWebHandler` plus
 * raw `fetch`), so it cannot exercise client-side decoding.
 *
 * The endpoint under test declares a `headers` schema carrying the bearer
 * credential, so each call attaches it per-request — standing in for
 * `examples/http-advanced/client.ts`'s `transformClient` decoration, which
 * `HttpApiTest.groups` has no equivalent hook for. Either way the credential
 * reaches `SubjectExtractor` as an ordinary `authorization` header;
 * `passthroughClientLayer(RequirePermission)` is what makes the client
 * compile and run at all, discharging `HttpApiMiddleware.ForClient<
 * RequirePermission>` from its context, exactly as a real consumer must.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Schema from "effect/Schema";
import * as HttpApi from "effect/unstable/httpapi/HttpApi";
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder";
import * as HttpApiEndpoint from "effect/unstable/httpapi/HttpApiEndpoint";
import * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup";
import * as HttpApiTest from "effect/unstable/httpapi/HttpApiTest";
import * as HttpServer from "effect/unstable/http/HttpServer";
import {
  AttributeResolveError,
  AttributeResolver,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  SignatureHistoryNone,
  allOf,
  gte,
  hasAttribute,
  hasPermission,
  makeSubject,
  obligation,
  obliged,
  permission,
  permissionKey,
} from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import { assert, describe, it } from "@effect/vitest";
import {
  RequiredPermission,
  RequirePermission,
  RequirePermissionLive,
  SubjectExtractionFailed,
  passthroughClientLayer,
  requiresPermission,
  subjectExtractorBearer,
} from "../src/index.ts";

const readPermission = permission("document", "read");
// Consults an attribute as well as the permission, matching
// `examples/http-advanced/api.ts`'s `mePolicy` — so the attribute resolver is
// only ever consulted once `hasPermission` already clears, letting the same
// fixture prove both "denied before evaluation" (anonymous) and "broke during
// evaluation" (alice, resolver down).
const readPolicy = allOf([hasPermission(readPermission), hasAttribute("clearance", gte(1))]);

// A binding obligation nobody discharges — `guard`'s own default, matching
// `RequirePermission.ts`'s `guard(permission, policy)(NO_RESOURCE, ...)` call,
// which passes no `onObligations` handler.
const deletePermission = permission("document", "delete");
const auditObligation = obligation("log-delete", { channel: "audit" });
const deletePolicy = obliged(auditObligation, hasPermission(deletePermission));

const ALICE_TOKEN = "alice-token";
const BROKEN_TOKEN = "broken-token";
const alice = makeSubject({
  id: "alice",
  permissions: [permissionKey(readPermission), permissionKey(deletePermission)],
});

const lookupSubject = (token: string): Effect.Effect<AuthSubject, SubjectExtractionFailed> => {
  if (token === ALICE_TOKEN) return Effect.succeed(alice);
  if (token === BROKEN_TOKEN) return Effect.fail(new SubjectExtractionFailed({ reason: "store down" }));
  return Effect.succeed(makeSubject({ id: "unknown" }));
};

const DocumentsGroup = HttpApiGroup.make("documents")
  .add(
    HttpApiEndpoint.get("read", "/documents", {
      success: Schema.Struct({ ok: Schema.Boolean }),
      headers: Schema.Struct({ authorization: Schema.optional(Schema.String) }),
    }).pipe((endpoint) =>
      endpoint.annotate(
        RequiredPermission,
        requiresPermission(endpoint, { permission: readPermission, policy: readPolicy }),
      ),
    ),
  )
  .add(
    HttpApiEndpoint.delete("delete", "/documents", {
      success: Schema.Struct({ ok: Schema.Boolean }),
      headers: Schema.Struct({ authorization: Schema.optional(Schema.String) }),
    }).pipe((endpoint) =>
      endpoint.annotate(
        RequiredPermission,
        requiresPermission(endpoint, { permission: deletePermission, policy: deletePolicy }),
      ),
    ),
  );

const Api = HttpApi.make("test").add(DocumentsGroup).middleware(RequirePermission);

// The attribute store: down or up, per call — a fresh layer per test rather
// than one shared, mutable module-level flag, so the two tests below cannot
// observe or interfere with each other's resolver state regardless of
// execution order or concurrency.
const attributeResolverTest = (down: boolean) =>
  Layer.succeed(AttributeResolver, {
    resolve: (_subjectId, attribute) =>
      down
        ? Effect.fail(new AttributeResolveError({ attribute, cause: "store down" }))
        : Effect.succeed(undefined),
  });

const DocumentsHandlers = HttpApiBuilder.group(Api, "documents", (handlers) =>
  handlers
    .handle("read", () => Effect.succeed({ ok: true }))
    .handle("delete", () => Effect.succeed({ ok: true })),
);

const makeClient = HttpApiTest.groups(Api, ["documents"]);

// `HttpApiTest.groups` resolves the server-side `RequirePermission`
// middleware and the platform services it needs from the ambient context at
// the point its effect runs, the same way `HttpApiBuilder.layer(Api)` would
// — not through `DocumentsHandlers` itself, which only builds the handler
// map. Chained the same way `http.test.ts`'s `AppLayer` is: each
// `provideMerge` discharges what's still outstanding and keeps it in the
// output for the next step, ending in a layer requiring nothing.
const testLayer = (resolverDown: boolean) =>
  DocumentsHandlers.pipe(
    Layer.provideMerge(RequirePermissionLive),
    Layer.provideMerge(subjectExtractorBearer(lookupSubject)),
    Layer.provideMerge(
      Layer.mergeAll(
        attributeResolverTest(resolverDown),
        RelationshipResolverNever,
        DecisionHistoryUnknown,
        EvaluationIdLive,
        CustomPredicateNone,
        SignatureHistoryNone,
      ),
    ),
    Layer.provideMerge(HttpServer.layerServices),
  );

describe("RequirePermission client-error typing", () => {
  it.effect(
    "a generated client decodes a denial as the real typed AccessDenied (AccessDeniedPublic's shape) through passthroughClientLayer",
    () =>
      Effect.gen(function* () {
        const client = yield* makeClient;
        // No credential header — anonymous, denied by `hasPermission` before
        // `readPolicy`'s attribute check is ever reached.
        const error = yield* client.documents.read({ headers: {} }).pipe(Effect.flip);
        // Before `AccessDeniedRefused` carried real fields (`RequirePermission`'s
        // brand/`AccessDeniedPublic` work), `RequirePermissionLive` answered an
        // empty 403 body that didn't match its own declared schema — the client
        // could only fail to decode it, surfacing as a generic `HttpClientError`.
        // Now the body actually matches `AccessDeniedRefused`
        // (`AccessDeniedPublic.pipe(HttpApiSchema.status(403))`), so the client
        // decodes it as the real, typed denial — `subjectId`/`policyTag`/`reason`,
        // never `trace`.
        assert.strictEqual(error._tag, "AccessDenied");
        // `readPolicy` is `allOf([hasPermission(...), hasAttribute(...)])`, so
        // the root node denying is the `AllOf`, not the leaf `HasPermission`.
        assert.strictEqual(error._tag === "AccessDenied" ? error.policyTag : undefined, "AllOf");
        assert.strictEqual("trace" in error, false);
      }).pipe(Effect.provide(Layer.mergeAll(passthroughClientLayer(RequirePermission), testLayer(false)))),
  );

  it.effect(
    "a generated client decodes an outage as the real typed AttributeResolveError through passthroughClientLayer",
    () =>
      Effect.gen(function* () {
        const client = yield* makeClient;
        const error = yield* client.documents
          .read({ headers: { authorization: `Bearer ${ALICE_TOKEN}` } })
          .pipe(Effect.flip);
        assert.strictEqual(error._tag, "AttributeResolveError");
      }).pipe(Effect.provide(Layer.mergeAll(passthroughClientLayer(RequirePermission), testLayer(true)))),
  );

  it.effect(
    "a generated client decodes an undischarged obligation as the real typed UndischargedObligation, tag-only",
    () =>
      Effect.gen(function* () {
        const logs: Array<unknown> = [];
        const client = yield* makeClient;
        // Alice holds `deletePermission`, so `hasPermission` allows — but
        // `deletePolicy`'s binding `auditObligation` is never discharged
        // (`guard` is called with no `onObligations`, matching
        // `RequirePermission.ts`'s own call), so evaluation fails with
        // `UndischargedObligation` rather than a denial.
        const error = yield* client.documents
          .delete({ headers: { authorization: `Bearer ${ALICE_TOKEN}` } })
          .pipe(Effect.flip, Effect.provide(Logger.layer([Logger.make((o) => logs.push(o.message))])));
        // Before this fix, `RequirePermissionLive` answered an empty 403 body
        // that didn't match `UndischargedObligationRefused`'s declared
        // `Schema.TaggedStruct("UndischargedObligation", {})` — the client
        // could only fail to decode it, surfacing as a generic
        // `HttpClientError`, exactly the way `AccessDenied` used to.
        assert.strictEqual(error._tag, "UndischargedObligation");
        // The schema is tag-only, deliberately — `subjectId`/`obligationIds`
        // are not reviewed for disclosure the way `AccessDeniedPublic`'s
        // fields are, so neither reaches the wire.
        assert.strictEqual("subjectId" in error, false);
        assert.strictEqual("obligationIds" in error, false);
        // `RequirePermissionLive`'s `tapErrorTag(["AccessDenied",
        // "UndischargedObligation"], logDenial)` runs before the hand
        // conversion above — this is the obligation half of that array; the
        // denial half is pinned server-side in `http.test.ts`.
        assert.deepStrictEqual(logs, [
          [`qadi/http: request denied (ACL010) — subject "alice": undischarged obligation(s) log-delete`],
        ]);
      }).pipe(Effect.provide(Layer.mergeAll(passthroughClientLayer(RequirePermission), testLayer(false)))),
  );

  it.effect(
    "a generated client decodes a subject-extraction outage as the real typed SubjectExtractionFailed, tag-only",
    () =>
      Effect.gen(function* () {
        const client = yield* makeClient;
        const error = yield* client.documents
          .read({ headers: { authorization: `Bearer ${BROKEN_TOKEN}` } })
          .pipe(Effect.flip);
        // Before this fix, the middleware answered an empty 502 body that
        // didn't match `SubjectExtractionRefused`'s declared
        // `Schema.TaggedStruct("SubjectExtractionFailed", {})`.
        assert.strictEqual(error._tag, "SubjectExtractionFailed");
        // Tag-only, same reasoning as `UndischargedObligationRefused` — the
        // real `reason` string stays server-side (it's logged, not returned).
        assert.strictEqual("reason" in error, false);
      }).pipe(Effect.provide(Layer.mergeAll(passthroughClientLayer(RequirePermission), testLayer(false)))),
  );
});
