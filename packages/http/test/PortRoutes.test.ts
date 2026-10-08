/**
 * The port route family and the client layer, end to end over
 * `HttpRouter.toWebHandler` (ARCH-31 T6, ADR-QD-NEXT).
 *
 * The client's `FetchHttpClient.Fetch` is provided as the web handler, so what
 * crosses is exactly an HTTP request and response. For every port in the
 * registry: answered, unavailable (503), another subject (403), malformed
 * (400), not served (404) and unencodable (500); the asker sees the port's own
 * error carrying the matching remote failure, and no server cause text.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Record from "effect/Record";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpRouter from "effect/http/HttpRouter";
import {
  anonymous,
  EvaluationIdLive,
  hasPermission,
  makeResourceId,
  makeSubject,
  makeSubjectId,
  permission,
  permissionKey,
  PORTS,
  portsLayer,
  PortReply,
  scriptedPort,
} from "@qadi/core";
import type {
  AnswerOf,
  ArgsOf,
  AuthSubject,
  DescriptionOf,
  PortName,
  PortServices,
  PortServing,
  PortServingOf,
  PortTypes,
} from "@qadi/core";
import { permissionRegistryRouteUnguarded } from "../src/PermissionRegistry.ts";
import { PORT_REPLY_STATUS, portRoutes, portRoutesUnguarded } from "../src/PortRoutes.ts";
import { remotePortsLayer } from "../src/RemotePorts.ts";
import { subjectExtractorBearer } from "../src/SubjectExtractor.ts";
import { stack } from "./fixtures/stack.ts";

const readPorts = permission("ports", "read");
const readPolicy = hasPermission(readPorts);
const aliceId = makeSubjectId("alice");
const bobId = makeSubjectId("bob");
const alice = makeSubject({
  id: "alice",
  roles: ["editor"],
  permissions: [permissionKey(readPorts)],
  attributes: {},
});
const bob = makeSubject({ id: "bob", roles: [], permissions: [], attributes: {} });
const doc = makeResourceId("doc-1");

const lookup = (token: string): Effect.Effect<AuthSubject> =>
  Effect.succeed(token === "alice-token" ? alice : bob);
const subjects = subjectExtractorBearer(lookup);

interface Case<K extends PortName> {
  readonly args: ArgsOf<PortTypes[K]>;
  readonly answer: AnswerOf<PortTypes[K]>;
  readonly other: ArgsOf<PortTypes[K]>;
  readonly serving: PortServingOf<K>;
  readonly unserved: PortServingOf<K> | undefined;
}

const CASES: { readonly [K in PortName]: Case<K> } = {
  AttributeResolver: {
    args: [aliceId, "clearance"],
    answer: { level: 3 },
    other: [bobId, "clearance"],
    serving: { attributes: ["clearance"] },
    unserved: { attributes: ["constructor"] },
  },
  DecisionHistory: {
    args: [{ subjectId: aliceId, event: "approved", resourceId: doc }],
    answer: "Acted",
    other: [{ subjectId: bobId, event: "approved", resourceId: doc }],
    serving: { events: ["approved"] },
    unserved: { events: ["rejected"] },
  },
  RelationshipResolver: {
    args: [{ subjectId: aliceId, relation: "owner", resourceId: doc, depth: 2 }],
    answer: "Related",
    other: [{ subjectId: bobId, relation: "owner", resourceId: doc, depth: 2 }],
    serving: { relations: ["owner"] },
    unserved: { relations: [] },
  },
  CustomPredicate: {
    args: ["isOwner", alice, { id: "doc-1" }, { strict: true }],
    answer: true,
    other: ["isOwner", bob, { id: "doc-1" }, { strict: true }],
    serving: { names: ["isOwner"] },
    unserved: { names: ["isEditor"] },
  },
  SignatureHistory: {
    args: [{ subjectId: aliceId, resourceId: doc }],
    answer: [{ signerId: aliceId, meaning: "approved", signedAt: 0 }],
    other: [{ subjectId: bobId, resourceId: doc }],
    serving: { signatures: "own-records" },
    unserved: undefined,
  },
};

type Form = "guarded" | "unguarded";

/** The route family over `store`, as a web handler. */
const serve = (store: Layer.Layer<PortServices>, serving: PortServing, form: Form) => {
  const routes =
    form === "guarded"
      ? portRoutes(readPorts, readPolicy, serving)
      : portRoutesUnguarded("test: answers only about the session's own subject", serving);
  return HttpRouter.toWebHandler(
    stack(routes, subjects, Layer.merge(store, EvaluationIdLive)),
    { disableLogger: true },
  );
};

/** A client layer whose `fetch` is `handler`, authenticated as `token`. */
const clientFor = (
  handler: (request: Request) => Promise<Response>,
  ports: ReadonlyArray<PortName>,
  token: string,
) =>
  remotePortsLayer({ baseUrl: "http://srv.test", ports }).pipe(
    Layer.provide(FetchHttpClient.layer),
    Layer.provide(
      Layer.succeed(FetchHttpClient.Fetch, (input, init) => handler(new Request(input, init))),
    ),
    Layer.provide(
      Layer.succeed(FetchHttpClient.RequestInit, { headers: { authorization: `Bearer ${token}` } }),
    ),
  );

const rendered = (error: unknown): string =>
  `${String(Reflect.get(Object(error), "message"))} ${JSON.stringify(error)}`;

const post = (handler: (request: Request) => Promise<Response>, port: PortName, body: string, token?: string) =>
  Effect.promise(() =>
    handler(
      new Request(`http://srv.test/__ports/${port}`, {
        method: "POST",
        body,
        headers: token === undefined ? {} : { authorization: `Bearer ${token}` },
      }),
    ),
  );

const routeCase = <K extends PortName>(d: DescriptionOf<K>, c: Case<K>) => {
  const answering = portsLayer({ [d.port]: scriptedPort(d, () => PortReply.answer(c.answer)).layer });

  const run = <A, E>(
    form: Form,
    store: Layer.Layer<PortServices>,
    serving: PortServing,
    args: ArgsOf<PortTypes[K]>,
    use: (effect: Effect.Effect<AnswerOf<PortTypes[K]>, unknown>) => Effect.Effect<A, E>,
  ) =>
    Effect.acquireUseRelease(
      Effect.sync(() => serve(store, serving, form)),
      ({ handler }) =>
        Effect.scoped(
          Effect.gen(function* () {
            const context = yield* Layer.build(clientFor(handler, [d.port], "alice-token"));
            const shape = Context.get(context, d.service);
            return yield* use(d.invoke(shape)(...args));
          }),
        ),
      ({ dispose }) => Effect.promise(dispose),
    );

  const servingOf = (declared: PortServingOf<K>): PortServing => ({ [d.port]: declared });

  for (const form of ["guarded", "unguarded"] as const) {
    describe(`${d.port}, ${form}`, () => {
      it.effect("answered", () =>
        run(form, answering, servingOf(c.serving), c.args, (ask) => ask).pipe(
          Effect.map((answer) => assert.deepStrictEqual(answer, c.answer)),
        ));

      it.effect("an outage is the port's own error, 503 on the wire, no server cause", () =>
        run(
          form,
          portsLayer({ [d.port]: scriptedPort(d, () => PortReply.fail("the-secret-store-is-down")).layer }),
          servingOf(c.serving),
          c.args,
          Effect.flip,
        ).pipe(
          Effect.map((error) => {
            assert.strictEqual(Reflect.get(Object(error), "_tag"), d.failure(c.args, "x")._tag);
            assert.include(rendered(error), "Unavailable");
            assert.notInclude(rendered(error), "the-secret-store-is-down");
          }),
        ));

      it.effect("a question about another subject is refused", () =>
        run(form, answering, servingOf(c.serving), c.other, Effect.flip).pipe(
          Effect.map((error) => assert.include(rendered(error), "SubjectMismatch")),
        ));

      it.effect("a question outside the declaration is refused", () =>
        c.unserved === undefined
          ? Effect.void
          : run(form, answering, servingOf(c.unserved), c.args, Effect.flip).pipe(
              Effect.map((error) => assert.include(rendered(error), "NotServed")),
            ));
    });
  }
};

describe("the port routes (ADR-QD-NEXT)", () => {
  const RUN: { readonly [K in PortName]: () => void } = {
    AttributeResolver: () => routeCase(PORTS.AttributeResolver, CASES.AttributeResolver),
    DecisionHistory: () => routeCase(PORTS.DecisionHistory, CASES.DecisionHistory),
    RelationshipResolver: () => routeCase(PORTS.RelationshipResolver, CASES.RelationshipResolver),
    CustomPredicate: () => routeCase(PORTS.CustomPredicate, CASES.CustomPredicate),
    SignatureHistory: () => routeCase(PORTS.SignatureHistory, CASES.SignatureHistory),
  };
  for (const run of Record.values(RUN)) run();
});

describe("what is on the wire", () => {
  const question = JSON.stringify({ subjectId: "alice", attribute: "clearance" });
  const store = portsLayer({
    AttributeResolver: scriptedPort(PORTS.AttributeResolver, () => PortReply.answer({ level: 3 })).layer,
  });
  const serving: PortServing = { AttributeResolver: { attributes: ["clearance"] } };

  it.effect("every reply is JSON, never cached, with the status the table says", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => serve(store, serving, "guarded")),
      ({ handler }) =>
        Effect.gen(function* () {
          const ok = yield* post(handler, "AttributeResolver", question, "alice-token");
          assert.strictEqual(ok.status, 200);
          assert.strictEqual(ok.headers.get("cache-control"), "no-store");
          assert.deepStrictEqual(yield* Effect.promise(() => ok.json()), {
            _tag: "Answered",
            answer: { value: { level: 3 } },
          });

          const malformed = yield* post(handler, "AttributeResolver", "not json at all", "alice-token");
          assert.strictEqual(malformed.status, 400);
          assert.strictEqual(malformed.headers.get("cache-control"), "no-store");
          assert.deepStrictEqual(yield* Effect.promise(() => malformed.json()), {
            _tag: "Refused",
            reason: "Malformed",
          });

          const wrongSubject = yield* post(
            handler,
            "AttributeResolver",
            JSON.stringify({ subjectId: "bob", attribute: "clearance" }),
            "alice-token",
          );
          assert.strictEqual(wrongSubject.status, 403);
          assert.deepStrictEqual(yield* Effect.promise(() => wrongSubject.json()), {
            _tag: "Refused",
            reason: "SubjectMismatch",
          });

          const notServed = yield* post(
            handler,
            "AttributeResolver",
            JSON.stringify({ subjectId: "alice", attribute: "constructor" }),
            "alice-token",
          );
          assert.strictEqual(notServed.status, 404);
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));

  it.effect("an unencodable answer is a 500 refusal that names nothing", () =>
    Effect.acquireUseRelease(
      Effect.sync(() =>
        serve(
          portsLayer({
            AttributeResolver: scriptedPort(PORTS.AttributeResolver, () => PortReply.answer(new Set(["a"]))).layer,
          }),
          serving,
          "guarded",
        ),
      ),
      ({ handler }) =>
        Effect.gen(function* () {
          const response = yield* post(handler, "AttributeResolver", question, "alice-token");
          assert.strictEqual(response.status, 500);
          assert.deepStrictEqual(yield* Effect.promise(() => response.json()), {
            _tag: "Refused",
            reason: "Unencodable",
          });
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));

  it.effect("a port not named in the declaration has no route", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => serve(store, serving, "guarded")),
      ({ handler }) =>
        Effect.gen(function* () {
          const response = yield* post(handler, "CustomPredicate", "{}", "alice-token");
          assert.strictEqual(response.status, 404);
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));

  it.effect("the status table is closed over every reply", () =>
    Effect.sync(() => {
      assert.strictEqual(PORT_REPLY_STATUS({ _tag: "Answered", answer: null }), 200);
      assert.strictEqual(PORT_REPLY_STATUS({ _tag: "Unavailable" }), 503);
      assert.strictEqual(PORT_REPLY_STATUS({ _tag: "Refused", reason: "Malformed" }), 400);
      assert.strictEqual(PORT_REPLY_STATUS({ _tag: "Refused", reason: "SubjectMismatch" }), 403);
      assert.strictEqual(PORT_REPLY_STATUS({ _tag: "Refused", reason: "NotServed" }), 404);
      assert.strictEqual(PORT_REPLY_STATUS({ _tag: "Refused", reason: "Unencodable" }), 500);
    }));
});

describe("the guarded form", () => {
  const store = portsLayer({
    AttributeResolver: scriptedPort(PORTS.AttributeResolver, () => PortReply.answer(1)).layer,
  });
  const serving: PortServing = { AttributeResolver: { attributes: ["clearance"] } };

  it.effect("denies a subject without the permission, before the port is read", () =>
    Effect.acquireUseRelease(
      Effect.sync(() => serve(store, serving, "guarded")),
      ({ handler }) =>
        Effect.gen(function* () {
          const body = JSON.stringify({ subjectId: "bob", attribute: "clearance" });
          assert.strictEqual((yield* post(handler, "AttributeResolver", body, "bob-token")).status, 403);
          assert.strictEqual((yield* post(handler, "AttributeResolver", body)).status, 403);
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));

  it.effect("is listed in the permission registry, every served path", () =>
    Effect.acquireUseRelease(
      Effect.sync(() =>
        HttpRouter.toWebHandler(
          stack(
            Layer.merge(
              portRoutes(readPorts, readPolicy, {
                AttributeResolver: { attributes: ["a"] },
                DecisionHistory: {},
              }),
              permissionRegistryRouteUnguarded("test: reading the registry"),
            ),
            subjects,
            Layer.merge(store, EvaluationIdLive),
          ),
          { disableLogger: true },
        ),
      ),
      ({ handler }) =>
        Effect.gen(function* () {
          const response = yield* Effect.promise(() => handler(new Request("http://srv.test/__permissions")));
          const registry = yield* Effect.promise(() => response.text());
          assert.include(registry, "/__ports/AttributeResolver");
          assert.include(registry, "/__ports/DecisionHistory");
          assert.notInclude(registry, "/__ports/CustomPredicate");
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));

  it.effect("mounts under the prefix a host chooses", () =>
    Effect.acquireUseRelease(
      Effect.sync(() =>
        HttpRouter.toWebHandler(
          stack(
            portRoutes(readPorts, readPolicy, serving, { prefix: "/ports" }),
            subjects,
            Layer.merge(store, EvaluationIdLive),
          ),
          { disableLogger: true },
        ),
      ),
      ({ handler }) =>
        Effect.gen(function* () {
          const response = yield* Effect.promise(() =>
            handler(
              new Request("http://srv.test/ports/AttributeResolver", {
                method: "POST",
                body: JSON.stringify({ subjectId: "alice", attribute: "clearance" }),
                headers: { authorization: "Bearer alice-token" },
              }),
            ),
          );
          assert.strictEqual(response.status, 200);
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));
});

describe("the unguarded form", () => {
  it.effect("answers an anonymous subject about itself, and only itself", () =>
    Effect.acquireUseRelease(
      Effect.sync(() =>
        serve(
          portsLayer({
            AttributeResolver: scriptedPort(PORTS.AttributeResolver, () => PortReply.answer("anon")).layer,
          }),
          { AttributeResolver: { attributes: ["clearance"] } },
          "unguarded",
        ),
      ),
      ({ handler }) =>
        Effect.gen(function* () {
          const own = yield* post(
            handler,
            "AttributeResolver",
            JSON.stringify({ subjectId: anonymous.id, attribute: "clearance" }),
          );
          assert.strictEqual(own.status, 200);
          const other = yield* post(
            handler,
            "AttributeResolver",
            JSON.stringify({ subjectId: "alice", attribute: "clearance" }),
          );
          assert.strictEqual(other.status, 403);
        }),
      ({ dispose }) => Effect.promise(dispose),
    ));
});
