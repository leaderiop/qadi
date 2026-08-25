import "server-only";
/**
 * The whole HTTP surface, as one Effect `HttpRouter`.
 *
 * Next's Route Handlers speak Web `Request`/`Response`, and so does
 * `HttpRouter.toWebHandler` — so `@qadi/http` mounts inside Next with no adapter
 * and no bridge. That seam is the entire "Effect as the backend" story: the file
 * in `app/api/[[...route]]/route.ts` is a dozen lines, and everything below is
 * ordinary Effect that would run unchanged behind `HttpServer.serve`.
 *
 * **Composed through named intermediate steps.** Chaining every
 * `Layer.provideMerge` into one expression makes TypeScript silently infer `any`
 * for the whole thing — no diagnostic, just every downstream use losing its
 * type. `packages/http/test/http.test.ts` records the same failure and the same
 * remedy; it is a property of this shape of long `.pipe()` chain, not of any one
 * step in it.
 *
 * **Paths have no `/api` prefix here.** Next mounts this at `/api/[[...route]]`
 * and the route handler strips the prefix before calling in, because
 * `decisionStreamRoute` mounts `/__decisions` at a fixed path and a router that
 * had to know it was behind a prefix would be a router that could not be lifted
 * out and served directly.
 */
import * as Effect from "effect/Effect";
import * as Headers from "effect/unstable/http/Headers";
import * as HttpRouter from "effect/unstable/http/HttpRouter";
import * as HttpServer from "effect/unstable/http/HttpServer";
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest";
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import {
  AttributeResolver,
  DecisionHistory,
  decodeRecord,
  makeResourceId,
  RelationshipResolver,
} from "@qadi/core";
import type { ActedResult, RelatedResult } from "@qadi/core";
import {
  addGuardedRoute,
  decisionStreamRoute,
  permissionRegistryRoute,
  PermissionRegistryLive,
  SubjectExtractor,
} from "@qadi/http";
import { articleById } from "../domain/articles.ts";
import { canReadArticle, canReadDevtools } from "../domain/policies.ts";
import { readArticle, readDevtools } from "../domain/permissions.ts";
import { AppLayer, feed, ring } from "./layer.ts";
import { userFromCookieHeader } from "./session.ts";

/**
 * Identity from the session cookie, and from nothing else.
 *
 * Not a bearer token, because the browser half of this example is a page rather
 * than an API client and a cookie is what it has. Not a header a caller can set
 * either: the extractor reads exactly one cookie, and a request without it is
 * **anonymous**, which every policy here denies.
 */
const subjects: Layer.Layer<SubjectExtractor> = Layer.succeed(SubjectExtractor, {
  extract: (request) =>
    Effect.succeed(
      userFromCookieHeader(Option.getOrNull(Headers.get(request.headers, "cookie"))).subject,
    ),
});

const json = (body: unknown) =>
  HttpServerResponse.text(JSON.stringify(body), { contentType: "application/json" });

/**
 * The session's subject, for the three port routes.
 *
 * These endpoints answer **only** about whoever the cookie names. A caller may
 * put any `subjectId` in the query string — the browser's resolvers do, because
 * that is the shape the port hands them — and it is read for the log and never
 * as identity. An endpoint that answered about whoever it was asked about would
 * be a subject-enumeration API with an authorization library bolted to the side.
 */
const askingSubject = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  return userFromCookieHeader(Option.getOrNull(Headers.get(request.headers, "cookie"))).subject;
});

/** The request's query string. The base is a placeholder; only the path matters. */
const query = (request: HttpServerRequest.HttpServerRequest, key: string): string | undefined =>
  new URL(request.url, "http://newsroom.invalid").searchParams.get(key) ?? undefined;

const AttributePort = HttpRouter.add(
  "GET",
  "/ports/attribute",
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const subject = yield* askingSubject;
    const attribute = query(request, "attribute") ?? "";

    // A resolver failure becomes a 503, never a 200 carrying `undefined`. The
    // browser turns a non-2xx into an `AttributeResolveError`, which denies —
    // an outage must not be readable as "the answer was no" (INV-QD-005).
    return yield* AttributeResolver.resolve(subject.id, attribute).pipe(
      Effect.map((value) => json({ value })),
      Effect.catchTag("AttributeResolveError", () =>
        Effect.succeed(
          HttpServerResponse.text("the attribute store did not answer", { status: 503 }),
        )),
    );
  }),
);

const RelationshipPort = HttpRouter.add(
  "GET",
  "/ports/relationship",
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const subject = yield* askingSubject;
    const depth = query(request, "depth");

    const related: RelatedResult = yield* RelationshipResolver.check({
      subjectId: subject.id,
      relation: query(request, "relation") ?? "",
      resourceId: makeResourceId(query(request, "resourceId") ?? ""),
      // Present-and-undefined, not absent: `RelationshipCheck.depth` is a
      // required key holding `number | undefined`, so a conditional spread does
      // not typecheck under `exactOptionalPropertyTypes`.
      depth: depth === undefined ? undefined : Number(depth),
    }).pipe(
      // `Unknown`, not `Unrelated`. The port is three-valued so a broken far end
      // cannot be read as a denial someone might then trust.
      Effect.catchTag("RelationshipResolveError", () => Effect.succeed<RelatedResult>("Unknown")),
    );

    return json({ related });
  }),
);

const HistoryPort = HttpRouter.add(
  "GET",
  "/ports/history",
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const subject = yield* askingSubject;
    const resourceId = query(request, "resourceId");

    const answer: ActedResult = yield* DecisionHistory.hasActed({
      subjectId: subject.id,
      event: query(request, "event") ?? "",
      resourceId: resourceId === undefined ? undefined : makeResourceId(resourceId),
    }).pipe(
      Effect.catchTag("DecisionHistoryUnavailable", () => Effect.succeed<ActedResult>("Unknown")),
    );

    return json({ answer });
  }),
);

/**
 * A guarded article route, and why `/edge/middleware` has something to show.
 *
 * `addGuardedRoute` mints an `Authorized<P>` witness the handler cannot
 * fabricate, and registers the path in the permission registry so
 * `/__permissions` can list it. Nothing `proxy.ts` does can reach this: the
 * decision is taken here, in the handler's own layer, from the policy.
 */
const ArticleRoute = addGuardedRoute(
  "GET",
  "/articles/:id",
  readArticle,
  canReadArticle,
  () =>
    Effect.gen(function* () {
      const params = yield* HttpRouter.params;
      // A resource the policy cannot match is still a resource: an unknown id
      // denies through `canReadArticle` rather than 404-ing before the decision,
      // so "no such article" and "not yours" are indistinguishable to a caller
      // probing for ids.
      return articleById(params["id"] ?? "") ?? { id: params["id"] ?? "" };
    }),
)((_authorized, article) => Effect.succeed(json(article)));

/** The past, for a dock that opened after the decisions were made. */
const BacklogRoute = addGuardedRoute(
  "GET",
  "/backlog",
  readDevtools,
  canReadDevtools,
  () => Effect.succeed({}),
)(() => Effect.map(ring.snapshot, json));

/**
 * The edge aggregator's receiving half.
 *
 * A serverless invocation cannot keep a ring — the process ends and takes it
 * with it — so it forwards each record before returning and this ingests it,
 * stamped `Edge` rather than with this process's own environment
 * ([BEH-QD-188](../../../../spec/behaviors/24-decision-sink.md)).
 *
 * A malformed body is a 400 and nothing else. `decodeRecord` validates untrusted
 * input, and an aggregator that half-built a record from a bad frame would be
 * the defect the wire codec exists to prevent.
 *
 * Unguarded, which is a demo's licence and not a pattern: a real aggregator
 * authenticates its emitters. Said out loud, because `/__decisions` deliberately
 * has no unguarded variant and this would otherwise look like a precedent.
 */
const IngestRoute = HttpRouter.add(
  "POST",
  "/aggregator/ingest",
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const body = yield* request.json.pipe(Effect.result);
    if (body._tag === "Failure") {
      return HttpServerResponse.text("not JSON", { status: 400 });
    }

    const record = yield* decodeRecord(body.success).pipe(Effect.result);
    if (record._tag === "Failure") {
      return HttpServerResponse.text("not a decision record", { status: 400 });
    }

    yield* ring.ingest(record.success, "Edge");
    return HttpServerResponse.empty({ status: 204 });
  }),
);

const Routes = Layer.mergeAll(
  AttributePort,
  RelationshipPort,
  HistoryPort,
  ArticleRoute,
  BacklogRoute,
  IngestRoute,
  decisionStreamRoute(readDevtools, canReadDevtools, feed.stream),
  permissionRegistryRoute(readDevtools, canReadDevtools),
);

const WithRegistry = Routes.pipe(Layer.provideMerge(PermissionRegistryLive));
const WithSubjects = WithRegistry.pipe(Layer.provideMerge(subjects));
const WithApp = WithSubjects.pipe(Layer.provideMerge(AppLayer));
export const ApiLayer = WithApp.pipe(Layer.provideMerge(HttpServer.layerServices));
