/**
 * `devtoolsRoutes`: the decision stream, its backlog and the permission registry
 * mounted by one call, under one guard pair and one prefix (ARCH-66).
 *
 * The call has no unguarded form (BEH-QD-202): a denied subject is refused at
 * all three paths. Its options reach the routes they belong to: `prefix` all
 * three, `reauth` the stream, `onRefused` the stream and the backlog.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  Allow,
  Decided,
  DecisionRecord,
  EvaluationServicesNone,
  hasPermission,
  makeDecisionLog,
  makeSubject,
  makeSubjectId,
  permission,
  permissionKey,
} from "@qadi/core";
import type { AuthSubject, SinkRecordNotEncodable } from "@qadi/core";
import { collectingLogger } from "@qadi/testing";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/http/HttpRouter";
import { SubjectExtractionFailed, devtoolsPath, devtoolsRoutes, subjectExtractorBearer } from "../src/index.ts";
import type { DevtoolsRoute, DevtoolsRoutesOptions } from "../src/index.ts";
import { stack } from "./fixtures/stack.ts";

const readPermission = permission("devtools", "read");
const readPolicy = hasPermission(readPermission);
const alice = makeSubject({ id: "alice", permissions: [permissionKey(readPermission)] });
const bob = makeSubject({ id: "bob" });
const lookupSubject = (token: string): Effect.Effect<AuthSubject> =>
  Effect.succeed(token === "alice-token" ? alice : bob);

const PREFIX = "/x/devtools";
const ROUTES: ReadonlyArray<DevtoolsRoute> = ["decisions", "backlog", "permissions"];

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
      }),
    }),
  });

/** The devtools surface over a log holding `records`, served by one web handler. */
const surface = (options?: DevtoolsRoutesOptions, records: ReadonlyArray<DecisionRecord> = [decision("d-1")]) =>
  Effect.gen(function* () {
    const log = yield* makeDecisionLog({ environment: "Server" });
    for (const record of records) yield* log.ingest(record);
    const routes = devtoolsRoutes(readPermission, readPolicy, log, options);
    return HttpRouter.toWebHandler(stack(routes, subjectExtractorBearer(lookupSubject), EvaluationServicesNone));
  });

const get = (handler: (request: Request) => Promise<Response>, path: string, token?: string) =>
  Effect.promise(() =>
    handler(
      new Request(
        `http://srv.test${path}`,
        token === undefined ? undefined : { headers: { authorization: `Bearer ${token}` } },
      ),
    ),
  );

/** A stream response's text up to and including its `synced` frame; then the connection is closed. */
const prelude = (response: Response) =>
  Effect.gen(function* () {
    const body = response.body;
    if (body === null) return "";
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    while (!text.includes("event: synced")) {
      const chunk = yield* Effect.promise(() => reader.read());
      if (chunk.done) break;
      text += decoder.decode(chunk.value);
    }
    yield* Effect.promise(() => reader.cancel());
    return text;
  });

describe("devtoolsRoutes", () => {
  it.effect("one call serves the stream, the backlog and the registry under the prefix", () =>
    Effect.gen(function* () {
      const { handler } = yield* surface({ prefix: PREFIX });

      const stream = yield* get(handler, devtoolsPath("decisions", PREFIX), "alice-token");
      assert.strictEqual(stream.status, 200);
      const text = yield* prelude(stream);
      assert.include(text, '"evaluationId":"d-1"');
      assert.isTrue(text.endsWith('event: synced\ndata: {"backlog":1}\n\n'));

      const backlog = yield* get(handler, devtoolsPath("backlog", PREFIX), "alice-token");
      assert.strictEqual(backlog.status, 200);
      const elements: unknown = yield* Effect.promise(() => backlog.json());
      assert.strictEqual(Array.isArray(elements) ? elements.length : -1, 1);

      const registry = yield* get(handler, devtoolsPath("permissions", PREFIX), "alice-token");
      assert.strictEqual(registry.status, 200);
      const rows: ReadonlyArray<{
        readonly permission: string;
        readonly endpoints: ReadonlyArray<{ readonly path: string }>;
      }> = yield* Effect.promise(() => registry.json());
      assert.deepStrictEqual(
        rows.find((row) => row.permission === permissionKey(readPermission))?.endpoints.map((e) => e.path),
        ROUTES.map((route) => devtoolsPath(route, PREFIX)),
      );

      for (const path of ["/__decisions", "/__decisions/backlog", "/__permissions"]) {
        assert.strictEqual((yield* get(handler, path, "alice-token")).status, 404, path);
      }
    }));

  it.effect("with no options it answers at the default paths", () =>
    Effect.gen(function* () {
      const { handler } = yield* surface();
      const stream = yield* get(handler, "/__decisions", "alice-token");
      assert.strictEqual(stream.status, 200);
      yield* prelude(stream);
      assert.strictEqual((yield* get(handler, "/__decisions/backlog", "alice-token")).status, 200);
      assert.strictEqual((yield* get(handler, "/__permissions", "alice-token")).status, 200);
    }));

  it.effect("every route is guarded: a subject without the permission, or none, is refused at all three", () =>
    Effect.gen(function* () {
      const { handler } = yield* surface({ prefix: PREFIX });
      for (const route of ROUTES) {
        const path = devtoolsPath(route, PREFIX);
        assert.strictEqual((yield* get(handler, path, "bob-token")).status, 403, path);
        assert.strictEqual((yield* get(handler, path)).status, 403, path);
      }
    }));

  it.effect("onRefused reaches the stream and the backlog", () =>
    Effect.gen(function* () {
      const refused: Array<string> = [];
      const onRefused = (refusal: SinkRecordNotEncodable) => void refused.push(refusal.evaluationId);
      const { handler } = yield* surface({ prefix: PREFIX, onRefused }, [
        decision("bad", { tags: new Set(["x"]) }),
        decision("good"),
      ]);
      const backlog = yield* get(handler, devtoolsPath("backlog", PREFIX), "alice-token");
      const elements: unknown = yield* Effect.promise(() => backlog.json());
      assert.strictEqual(Array.isArray(elements) ? elements.length : -1, 1);
      assert.deepStrictEqual(refused, ["bad"]);
      const text = yield* prelude(yield* get(handler, devtoolsPath("decisions", PREFIX), "alice-token"));
      assert.include(text, 'data: {"backlog":1}');
      assert.deepStrictEqual(refused, ["bad", "bad"]);
    }));

  it.effect("reauth reaches the stream: a failed recheck ends it", () =>
    Effect.gen(function* () {
      const { lines, layer: logger } = collectingLogger();
      let extractions = 0;
      const flaky = subjectExtractorBearer(() =>
        Effect.suspend(() => {
          extractions += 1;
          return extractions === 1
            ? Effect.succeed(alice)
            : Effect.fail(new SubjectExtractionFailed({ reason: "token service unreachable" }));
        }),
      );
      const log = yield* makeDecisionLog({ environment: "Server" });
      const routes = devtoolsRoutes(readPermission, readPolicy, log, {
        prefix: PREFIX,
        reauth: { interval: "1 hour" },
      });
      const app = stack(routes, flaky, EvaluationServicesNone).pipe(Layer.provideMerge(logger));
      const { handler } = HttpRouter.toWebHandler(app, { disableLogger: true });
      const response = yield* get(handler, devtoolsPath("decisions", PREFIX), "alice-token");
      assert.strictEqual(response.status, 200);
      yield* Effect.promise(async () => {
        try {
          await response.text();
        } catch {
          // The failed recheck ends the body; how the platform reports that is not this test's concern.
        }
      });
      assert.deepStrictEqual(
        lines.map((line) => line.message),
        [
          ["qadi/http: subject extraction failed — token service unreachable"],
          ["qadi/http: /__decisions recheck ended the stream (SubjectExtractionFailed, outage)"],
        ],
      );
    }));

  it.effect("a reauth interval that is not positive throws at construction, as decisionStreamRoute does", () =>
    Effect.gen(function* () {
      const log = yield* makeDecisionLog({ environment: "Server" });
      assert.throws(
        () => devtoolsRoutes(readPermission, readPolicy, log, { reauth: { interval: 0 } }),
        "decisionStreamRoute: reauth.interval must be a positive duration, got 0ms.",
      );
    }));
});
