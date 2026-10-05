/**
 * `/__decisions/backlog` — the log's retained records as JSON, and the refusal
 * that comes first: it publishes decisions, so it is guarded with no unguarded
 * variant, exactly as `/__decisions` is.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  Allow,
  Decided,
  DecisionRecord,
  EvaluationServicesNone,
  ObligationRecord,
  decodeStoredRecord,
  hasPermission,
  makeDecisionLog,
  makeSubject,
  makeSubjectId,
  permission,
  permissionKey,
} from "@qadi/core";
import type { AuthSubject, DecisionLog, SinkRecordNotEncodable } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as References from "effect/References";
import * as Result from "effect/Result";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServer from "effect/http/HttpServer";
import { decisionBacklogRoute } from "../src/DecisionBacklogRoute.ts";
import { PermissionRegistryLive, permissionRegistryRouteUnguarded } from "../src/PermissionRegistry.ts";
import { subjectExtractorBearer } from "../src/SubjectExtractor.ts";

const readPermission = permission("devtools", "read");
const readPolicy = hasPermission(readPermission);
const alice = makeSubject({ id: "alice", permissions: [permissionKey(readPermission)] });
const bob = makeSubject({ id: "bob" });
const lookupSubject = (token: string): Effect.Effect<AuthSubject> =>
  Effect.succeed(token === "alice-token" ? alice : bob);
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

const decision = (evaluationId: string, resource?: Record<string, unknown>) =>
  new DecisionRecord({
    evaluationId,
    at: 1_000,
    subjectId: makeSubjectId("alice"),
    policy: readPolicy,
    ...(resource === undefined ? {} : { resource }),
    outcome: new Decided({
      decision: new Allow({
        evaluationId,
        subjectId: makeSubjectId("alice"),
        durationMillis: 1,
        trace: { policyTag: "HasPermission", allowed: true, children: [], obligations: [] },
        visibleFields: undefined,
        obligations: [],
      }),
    }),
  });

/** The route over a fresh log holding what `fill` puts in it, as a web handler. */
const serve = (
  fill: (log: DecisionLog) => Effect.Effect<void>,
  onRefused?: (refusal: SinkRecordNotEncodable) => void,
) =>
  Effect.gen(function* () {
    const log = yield* makeDecisionLog({ environment: "Server" });
    yield* fill(log);
    const route = decisionBacklogRoute(
      readPermission,
      readPolicy,
      log,
      onRefused === undefined ? undefined : { onRefused },
    );
    const withRegistry = route.pipe(Layer.provideMerge(PermissionRegistryLive));
    const withSubjects = withRegistry.pipe(Layer.provideMerge(subjectExtractorBearer(lookupSubject)));
    const withServices = withSubjects.pipe(Layer.provideMerge(EvaluationServicesNone));
    return withServices.pipe(Layer.provideMerge(HttpServer.layerServices));
  });

const get = (handler: (request: Request) => Promise<Response>, path: string, token?: string) =>
  Effect.promise(() =>
    handler(new Request(`http://localhost${path}`, token === undefined ? undefined : { headers: bearer(token) })),
  );

describe("/__decisions/backlog", () => {
  it.effect("refuses an anonymous caller, and one without the permission", () =>
    Effect.gen(function* () {
      const { handler } = HttpRouter.toWebHandler(yield* serve((log) => log.ingest(decision("secret"))));
      assert.strictEqual((yield* get(handler, "/__decisions/backlog")).status, 403);
      assert.strictEqual((yield* get(handler, "/__decisions/backlog", "bob-token")).status, 403);
    }));

  it.effect("a permitted caller gets every retained record, each decodable by decodeStoredRecord", () =>
    Effect.gen(function* () {
      const layer = yield* serve((log) =>
        Effect.gen(function* () {
          yield* log.ingest(decision("srv-1"));
          yield* log.ingest(
            new ObligationRecord({ evaluationId: "edge-1", at: 900, outcome: "Discharged", obligationIds: [] }),
            "Edge",
          );
        }),
      );
      const { handler } = HttpRouter.toWebHandler(layer);
      const response = yield* get(handler, "/__decisions/backlog", "alice-token");

      assert.strictEqual(response.status, 200);
      assert.include(response.headers.get("content-type") ?? "", "application/json");
      assert.strictEqual(response.headers.get("cache-control"), "no-store");
      const body: unknown = yield* Effect.promise(() => response.json());
      assert.isTrue(Array.isArray(body));
      const decoded = (Array.isArray(body) ? body : []).map((element) => decodeStoredRecord(element));
      assert.isTrue(decoded.every(Result.isSuccess));
      // In `storedRecordOrder`, each with its producer's label.
      assert.deepStrictEqual(
        decoded.map((r) => (Result.isSuccess(r) ? `${r.success.evaluationId}@${r.success.environment}` : "")),
        ["edge-1@Edge", "srv-1@Server"],
      );
    }));

  it.effect("a refused element is dropped and reported, the rest are served", () =>
    Effect.gen(function* () {
      const refused: Array<SinkRecordNotEncodable> = [];
      const layer = yield* serve(
        (log) =>
          Effect.gen(function* () {
            yield* log.ingest(decision("bad", { tags: new Set(["x"]) }));
            yield* log.ingest(decision("good"));
          }),
        (refusal) => void refused.push(refusal),
      );
      const { handler } = HttpRouter.toWebHandler(layer);
      const response = yield* get(handler, "/__decisions/backlog", "alice-token");
      const body: unknown = yield* Effect.promise(() => response.json());

      assert.strictEqual(Array.isArray(body) ? body.length : -1, 1);
      assert.strictEqual(refused.length, 1);
      assert.strictEqual(refused[0]?.evaluationId, "bad");
      assert.strictEqual(refused[0]?.refusal._tag, "Opaque");
    }));

  it.effect("with no onRefused, each refusal is logged with its reason and path, and left out", () =>
    Effect.gen(function* () {
      const logs: Array<{ message: unknown; annotations: Record<string, unknown> }> = [];
      const hostile = {
        get boom(): unknown {
          throw new Error("getter exploded");
        },
      };
      const layer = yield* serve((log) =>
        Effect.gen(function* () {
          yield* log.ingest(decision("opaque", { tags: new Set(["x"]) }));
          yield* log.ingest(decision("throws", { nested: hostile }));
          yield* log.ingest(decision("good"));
        }),
      );
      const capture = Logger.layer([
        Logger.make((o) => {
          logs.push({ message: o.message, annotations: o.fiber.getRef(References.CurrentLogAnnotations) });
        }),
      ]);
      const { handler } = HttpRouter.toWebHandler(layer.pipe(Layer.provideMerge(capture)));
      const response = yield* get(handler, "/__decisions/backlog", "alice-token");
      const body: unknown = yield* Effect.promise(() => response.json());

      assert.strictEqual(Array.isArray(body) ? body.length : -1, 1);
      const refusals = logs.filter((l) => String(l.message).includes("could not be served in the backlog"));
      assert.deepStrictEqual(
        refusals.map((l) => [l.annotations["evaluationId"], l.annotations["qadi.refusal"], l.annotations["qadi.path"]]),
        [
          ["opaque", "Opaque", "resource.tags"],
          ["throws", "EncodeFailed", ""],
        ],
      );
    }));

  it.effect("an empty log is an empty array", () =>
    Effect.gen(function* () {
      const layer = yield* serve(() => Effect.void);
      const { handler } = HttpRouter.toWebHandler(layer);
      const response = yield* get(handler, "/__decisions/backlog", "alice-token");
      assert.strictEqual(yield* Effect.promise(() => response.text()), "[]");
    }));

  it.effect("it is listed by /__permissions", () =>
    Effect.gen(function* () {
      const backlog = yield* serve(() => Effect.void);
      const { handler } = HttpRouter.toWebHandler(Layer.merge(backlog, permissionRegistryRouteUnguarded("test")));
      const response = yield* get(handler, "/__permissions");
      const body: ReadonlyArray<{
        readonly permission: string;
        readonly endpoints: ReadonlyArray<{ readonly method: string; readonly path: string }>;
      }> = yield* Effect.promise(() => response.json());
      const entry = body.find((row) => row.permission === permissionKey(readPermission));
      assert.deepStrictEqual(entry?.endpoints, [{ method: "GET", path: "/__decisions/backlog" }]);
    }));
});
