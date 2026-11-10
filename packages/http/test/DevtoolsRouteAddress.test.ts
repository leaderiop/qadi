/**
 * Where the devtools routes answer: one address rule, `devtoolsPath`, for the
 * routes and the client that connects to them (ARCH-66).
 *
 * The round trip mounts the decision stream, its backlog and the permission
 * registry under `/x/devtools` and reaches each at the path `devtoolsPath` gives
 * for that prefix, the way a host's client does. The default paths are 404 on
 * that router (one mount each, not two), and a denied subject is still a 403 at
 * every prefixed path: a prefix moves a route, it never unguards one.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  EvaluationServicesNone,
  ObligationRecord,
  hasPermission,
  makeDecisionLog,
  makeSubject,
  permission,
  permissionKey,
} from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import { collectingLogger } from "@qadi/testing";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpRouter from "effect/http/HttpRouter";
import {
  decisionBacklogRoute,
  decisionStreamRoute,
  devtoolsPath,
  permissionRegistryRoute,
  permissionRegistryRouteUnguarded,
  subjectExtractorBearer,
} from "../src/index.ts";
import type { DevtoolsRoute } from "../src/index.ts";
import { stack } from "./fixtures/stack.ts";

const readPermission = permission("devtools", "read");
const readPolicy = hasPermission(readPermission);
const alice = makeSubject({ id: "alice", permissions: [permissionKey(readPermission)] });
const bob = makeSubject({ id: "bob" });
const lookupSubject = (token: string): Effect.Effect<AuthSubject> =>
  Effect.succeed(token === "alice-token" ? alice : bob);

const PREFIX = "/x/devtools";

/** The three devtools routes under `/x/devtools`, served by one web handler over a log holding one record. */
const prefixedSurface = Effect.gen(function* () {
  const log = yield* makeDecisionLog({ environment: "Server" });
  yield* log.ingest(new ObligationRecord({ evaluationId: "e-1", at: 1, outcome: "Discharged", obligationIds: [] }));
  const routes = Layer.mergeAll(
    decisionStreamRoute(readPermission, readPolicy, log, { prefix: PREFIX }),
    decisionBacklogRoute(readPermission, readPolicy, log, { prefix: PREFIX }),
    permissionRegistryRoute(readPermission, readPolicy, { prefix: PREFIX }),
  );
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

describe("devtoolsPath", () => {
  it("with no prefix, each route answers where it always has", () => {
    assert.strictEqual(devtoolsPath("decisions"), "/__decisions");
    assert.strictEqual(devtoolsPath("backlog"), "/__decisions/backlog");
    assert.strictEqual(devtoolsPath("permissions"), "/__permissions");
  });

  it("a prefix goes in front of every route", () => {
    assert.strictEqual(devtoolsPath("decisions", PREFIX), "/x/devtools/__decisions");
    assert.strictEqual(devtoolsPath("backlog", PREFIX), "/x/devtools/__decisions/backlog");
    assert.strictEqual(devtoolsPath("permissions", PREFIX), "/x/devtools/__permissions");
  });

  it("trailing slashes on the prefix are dropped, so no path holds //", () => {
    assert.strictEqual(devtoolsPath("decisions", "/x/"), "/x/__decisions");
    assert.strictEqual(devtoolsPath("decisions", "/x//"), "/x/__decisions");
    assert.strictEqual(devtoolsPath("decisions", "/"), "/__decisions");
    assert.strictEqual(devtoolsPath("backlog", "/"), "/__decisions/backlog");
  });
});

describe("the devtools routes under a prefix (ARCH-66)", () => {
  it.effect("a permitted reader reaches the stream, the backlog and the registry at the prefixed paths", () =>
    Effect.gen(function* () {
      const { handler } = yield* prefixedSurface;

      const stream = yield* get(handler, devtoolsPath("decisions", PREFIX), "alice-token");
      assert.strictEqual(stream.status, 200);
      assert.include(stream.headers.get("content-type") ?? "", "text/event-stream");
      const text = yield* prelude(stream);
      assert.include(text, '"evaluationId":"e-1"');
      assert.isTrue(text.endsWith('event: synced\ndata: {"backlog":1}\n\n'));

      const backlog = yield* get(handler, devtoolsPath("backlog", PREFIX), "alice-token");
      assert.strictEqual(backlog.status, 200);
      assert.include(backlog.headers.get("content-type") ?? "", "application/json");
      const elements: unknown = yield* Effect.promise(() => backlog.json());
      assert.strictEqual(Array.isArray(elements) ? elements.length : -1, 1);

      const registry = yield* get(handler, devtoolsPath("permissions", PREFIX), "alice-token");
      assert.strictEqual(registry.status, 200);
      const rows: ReadonlyArray<{
        readonly permission: string;
        readonly endpoints: ReadonlyArray<{ readonly method: string; readonly path: string }>;
      }> = yield* Effect.promise(() => registry.json());
      // The registry lists each route at the path it is mounted at, not the default.
      assert.deepStrictEqual(
        rows.find((row) => row.permission === permissionKey(readPermission))?.endpoints.map((e) => e.path),
        [devtoolsPath("decisions", PREFIX), devtoolsPath("backlog", PREFIX), devtoolsPath("permissions", PREFIX)],
      );
    }));

  it.effect("the default paths are not served on a prefixed router", () =>
    Effect.gen(function* () {
      const { handler } = yield* prefixedSurface;
      for (const path of ["/__decisions", "/__decisions/backlog", "/__permissions"]) {
        assert.strictEqual((yield* get(handler, path, "alice-token")).status, 404, path);
      }
    }));

  it.effect("a subject without the permission, or none, is refused at every prefixed path", () =>
    Effect.gen(function* () {
      const { handler } = yield* prefixedSurface;
      const routes: ReadonlyArray<DevtoolsRoute> = ["decisions", "backlog", "permissions"];
      for (const route of routes) {
        const path = devtoolsPath(route, PREFIX);
        assert.strictEqual((yield* get(handler, path, "bob-token")).status, 403, path);
        assert.strictEqual((yield* get(handler, path)).status, 403, path);
      }
    }));

  it.effect("the unguarded registry answers at the prefixed path, and its warning still names the route", () =>
    Effect.gen(function* () {
      const { lines, layer: logger } = collectingLogger();
      const app = stack(
        permissionRegistryRouteUnguarded("test fixture", { prefix: PREFIX }),
        subjectExtractorBearer(lookupSubject),
        EvaluationServicesNone,
      ).pipe(Layer.provideMerge(logger));
      const { handler } = HttpRouter.toWebHandler(app, { disableLogger: true });

      assert.strictEqual((yield* get(handler, devtoolsPath("permissions", PREFIX))).status, 200);
      assert.strictEqual((yield* get(handler, "/__permissions")).status, 404);
      assert.deepStrictEqual(
        lines.map((line) => line.message),
        [
          [
            "qadi/http: serving /__permissions unguarded — the full authorization topology is public. " +
              "Reason given: test fixture",
          ],
        ],
      );
    }));
});
