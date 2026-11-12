/**
 * `answerRemotely` and `askRemotely` round-trip every port in memory, and a
 * remote outage fails where the store fails (ARCH-31 T5, INV-QD-241).
 *
 * `send` is wired straight to `answerRemotely` with `JSON.stringify`/`parse`
 * between, so what crosses is exactly what a transport carries. `CASES` is a
 * mapped type over `PortName`, so a port added without a case is a compile
 * error.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Record from "effect/Record";
import * as Result from "effect/Result";
import type * as Schema from "effect/Schema";
import type * as Tracer from "effect/Tracer";
import * as FastCheck from "fast-check";
import { AttributeResolverNone } from "../src/AttributeResolver.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import { currentSubjectLayer } from "../src/CurrentSubject.ts";
import type { CurrentSubject } from "../src/CurrentSubject.ts";
import { CustomPredicateNone } from "../src/CustomPredicate.ts";
import { DecisionHistoryUnknown } from "../src/DecisionHistory.ts";
import { evaluate } from "../src/Evaluate.ts";
import { evaluationIdSequential } from "../src/EvaluationId.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import * as M from "../src/Matcher.ts";
import * as P from "../src/Policy.ts";
import { PortReply } from "../src/PortDescription.ts";
import type { ReadSite } from "../src/PortDescription.ts";
import { recordingPort, scriptedPort } from "../src/PortDoubles.ts";
import type { PortName } from "../src/PortName.ts";
import { answerRemotely, askRemotely, remotePorts, servingFor } from "../src/PortRemote.ts";
import type { PortServing, PortServingOf } from "../src/PortServing.ts";
import { RemotePortFailure } from "../src/PortWire.ts";
import type { PortWireReply } from "../src/PortWire.ts";
import { askSignature, servePortRead } from "../src/PortAccess.ts";
import { forEveryPort, PORTS, portsLayer, tabulatePorts } from "../src/Ports.ts";
import type { AnswerOf, ArgsOf, DescriptionOf, PortServices, PortTypes, ServiceOf } from "../src/Ports.ts";
import { RelationshipResolverNever } from "../src/RelationshipResolver.ts";
import { SignatureHistory, SignatureHistoryNone } from "../src/SignatureHistory.ts";
import { collectingTracer, leafOf, policyArbitrary } from "./helpers.ts";

const aliceId = makeSubjectId("alice");
const bobId = makeSubjectId("bob");
const alice = makeSubject({ id: "alice", roles: ["editor"], permissions: [], attributes: { dept: "eng" } });
const bob = makeSubject({ id: "bob", roles: [], permissions: [], attributes: {} });
const doc = makeResourceId("doc-1");

interface Case<K extends PortName> {
  readonly args: ArgsOf<PortTypes[K]>;
  readonly answer: AnswerOf<PortTypes[K]>;
  /** The same question, about someone else. */
  readonly other: ArgsOf<PortTypes[K]>;
  readonly serving: PortServingOf<K>;
  /** The one name an allowlist admits for `args`, or `undefined` where the port has none. */
  readonly asked: string | undefined;
  /** A declaration that does not admit `args`, or `undefined` where a port has none to refuse. */
  readonly unserved: PortServingOf<K> | undefined;
}

const CASES: { readonly [K in PortName]: Case<K> } = {
  AttributeResolver: {
    args: [aliceId, "clearance"],
    answer: { level: 3 },
    other: [bobId, "clearance"],
    serving: { attributes: ["clearance"] },
    asked: "clearance",
    unserved: { attributes: ["constructor"] },
  },
  DecisionHistory: {
    args: [{ subjectId: aliceId, event: "approved", resourceId: doc }],
    answer: "Acted",
    other: [{ subjectId: bobId, event: "approved", resourceId: doc }],
    serving: { events: ["approved"] },
    asked: "approved",
    unserved: { events: ["rejected"] },
  },
  RelationshipResolver: {
    args: [{ subjectId: aliceId, relation: "owner", resourceId: doc, depth: 2 }],
    answer: "Related",
    other: [{ subjectId: bobId, relation: "owner", resourceId: doc, depth: 2 }],
    serving: { relations: ["owner"] },
    asked: "owner",
    unserved: { relations: [] },
  },
  CustomPredicate: {
    args: ["isOwner", alice, { id: "doc-1" }, { strict: true }],
    answer: true,
    other: ["isOwner", bob, { id: "doc-1" }, { strict: true }],
    serving: { names: ["isOwner"] },
    asked: "isOwner",
    unserved: { names: ["isEditor"] },
  },
  SignatureHistory: {
    args: [{ subjectId: aliceId, resourceId: doc, meaning: "approved", signerRole: "manager" }],
    answer: [{ signerId: aliceId, meaning: "approved", signedAt: 0 }],
    other: [{ subjectId: bobId, resourceId: doc, meaning: "approved", signerRole: "manager" }],
    serving: { signatures: "own-records" },
    asked: undefined,
    unserved: undefined,
  },
};

/**
 * What an error says, wherever it says it: a port with a `cause` field keeps
 * the remote failure there, and `CustomPredicateError` renders it into `reason`.
 */
const rendered = (error: unknown): string => `${String(Reflect.get(Object(error), "message"))} ${JSON.stringify(error)}`;

/** Through JSON text, the way a transport carries it. */
const overTheWire = (json: unknown): unknown => JSON.parse(JSON.stringify(json));

/** A port's question for `args`, as the asking half encodes it. */
const asQuestion = <K extends PortName>(d: DescriptionOf<K>, args: ArgsOf<PortTypes[K]>): Schema.Json =>
  Result.getOrThrow(d.wire.encodeQuestion(args));

const remoteCase = <K extends PortName>(d: DescriptionOf<K>, c: Case<K>) => {
  /** A `send` served by `store`, for a session about `session`. */
  const sendTo =
    (store: Layer.Layer<ServiceOf<PortTypes[K]>>, serving: PortServingOf<K>) =>
    (question: Schema.Json) =>
      answerRemotely(d, serving)(overTheWire(question)).pipe(
        Effect.provide(Layer.merge(store, currentSubjectLayer(alice))),
        Effect.map(overTheWire),
      );
  const answering = scriptedPort(d, () => PortReply.answer(c.answer)).layer;
  const ask = (
    send: (question: Schema.Json) => Effect.Effect<unknown, RemotePortFailure>,
    args: ArgsOf<PortTypes[K]>,
  ) => Effect.flatMap(Effect.sync(() => askRemotely(d, send)), (shape) => d.invoke(shape)(...args));

  describe(d.port, () => {
    it.effect("an answer round-trips", () =>
      Effect.gen(function* () {
        const answer = yield* ask(sendTo(answering, c.serving), c.args);
        assert.deepStrictEqual(answer, c.answer);
      }));

    it.effect("the port's own facet names the one name an allowlist admits", () =>
      Effect.sync(() => {
        assert.strictEqual(d.serving.asked(c.args), c.asked);
      }));

    it.effect("the shape is named for what it is", () =>
      Effect.sync(() => {
        assert.strictEqual(askRemotely(d, () => Effect.never).name, `${d.port} (remote)`);
      }));

    it.effect("an outage reaches the asker as the port's own error, with no server cause", () =>
      Effect.gen(function* () {
        const failing = scriptedPort(d, () => PortReply.fail("the-secret-store-is-down")).layer;
        const error = yield* Effect.flip(ask(sendTo(failing, c.serving), c.args));
        assert.strictEqual(error._tag, d.failure(c.args, "x")._tag);
        assert.include(rendered(error), "Unavailable");
        assert.notInclude(JSON.stringify(error), "the-secret-store-is-down");
        assert.notInclude(String(Reflect.get(error, "message")), "the-secret-store-is-down");
      }));

    it.effect("a store that dies is an outage, never a defect", () =>
      Effect.gen(function* () {
        const dying = scriptedPort(d, () => PortReply.die(new Error("the-secret-boom"))).layer;
        const error = yield* Effect.flip(ask(sendTo(dying, c.serving), c.args));
        assert.strictEqual(error._tag, d.failure(c.args, "x")._tag);
        assert.notInclude(JSON.stringify(error), "the-secret-boom");
      }));

    it.effect("a store that throws is answered Unavailable, never a defect", () =>
      Effect.gen(function* () {
        const throwing = scriptedPort(d, () => PortReply.throw(new Error("boom"))).layer;
        const reply = yield* answerRemotely(d, c.serving)(overTheWire(asQuestion(d, c.args))).pipe(
          Effect.provide(Layer.merge(throwing, currentSubjectLayer(alice))),
        );
        assert.deepStrictEqual(reply, { _tag: "Unavailable" });
      }));

    it.effect("a question about another subject is refused, not answered", () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(ask(sendTo(answering, c.serving), c.other));
        assert.strictEqual(error._tag, d.failure(c.args, "x")._tag);
        assert.include(rendered(error), "SubjectMismatch");
      }));

    it.effect("a question outside the declaration is refused", () =>
      Effect.gen(function* () {
        if (c.unserved === undefined) return;
        const error = yield* Effect.flip(ask(sendTo(answering, c.unserved), c.args));
        assert.include(rendered(error), "NotServed");
      }));

    it.effect("a malformed body is refused by the serving half, never thrown", () =>
      Effect.gen(function* () {
        for (const body of [undefined, null, 7, "q", [], {}, { subjectId: 5 }]) {
          const reply = yield* answerRemotely(d, c.serving)(body).pipe(
            Effect.provide(Layer.merge(answering, currentSubjectLayer(alice))),
          );
          assert.deepStrictEqual(reply, { _tag: "Refused", reason: "Malformed" });
        }
      }));

    it.effect("a transport failure is the port's error carrying it", () =>
      Effect.gen(function* () {
        const error = yield* Effect.flip(
          ask(() => Effect.fail(RemotePortFailure.Transport({ message: "no route" })), c.args),
        );
        assert.strictEqual(error._tag, d.failure(c.args, "x")._tag);
        assert.include(rendered(error), "Transport");
      }));

    it.effect("a reply that is not a reply is undecodable", () =>
      Effect.gen(function* () {
        for (const reply of [undefined, null, "ok", { _tag: "Answered" }, { _tag: "Answered", answer: { weird: 1, shape: [] } }]) {
          // An answer in the wrong shape is undecodable for every port that is not lenient about it;
          // the attribute port reads any `{ value? }`, so only a non-reply is asserted for it.
          const outcome = yield* Effect.result(ask(() => Effect.succeed(reply), c.args));
          if (d.port === "AttributeResolver" && typeof reply === "object" && reply !== null && "answer" in reply) continue;
          assert.isTrue(Result.isFailure(outcome), JSON.stringify(reply));
        }
      }));
  });
};

describe("a remote port (ADR-QD-107)", () => {
  const RUN: { readonly [K in PortName]: () => void } = {
    AttributeResolver: () => remoteCase(PORTS.AttributeResolver, CASES.AttributeResolver),
    DecisionHistory: () => remoteCase(PORTS.DecisionHistory, CASES.DecisionHistory),
    RelationshipResolver: () => remoteCase(PORTS.RelationshipResolver, CASES.RelationshipResolver),
    CustomPredicate: () => remoteCase(PORTS.CustomPredicate, CASES.CustomPredicate),
    SignatureHistory: () => remoteCase(PORTS.SignatureHistory, CASES.SignatureHistory),
  };
  for (const run of Record.values(RUN)) run();

  it.effect("an attribute with no JSON form is refused as unencodable", () =>
    Effect.gen(function* () {
      const store = scriptedPort(PORTS.AttributeResolver, () => PortReply.answer(new Set(["a"]))).layer;
      const reply = yield* answerRemotely(PORTS.AttributeResolver, { attributes: ["clearance"] })(
        overTheWire(PORTS.AttributeResolver.wire.encodeQuestion([aliceId, "clearance"]).pipe(Result.getOrThrow)),
      ).pipe(Effect.provide(Layer.merge(store, currentSubjectLayer(alice))));
      assert.deepStrictEqual(reply, { _tag: "Refused", reason: "Unencodable" });
    }));

  it.effect("a question the serving half receives names the session's subject, not the body's", () =>
    Effect.gen(function* () {
      // A custom predicate is handed the *session's* roles, whatever the client claims.
      let seen: ReadonlyArray<string> = [];
      const store = scriptedPort(PORTS.CustomPredicate, (_name, subject) => {
        seen = [...subject.roles];
        return PortReply.answer(true);
      }).layer;
      const claimed = makeSubject({ id: "alice", roles: ["admin"], permissions: [], attributes: {} });
      const question = Result.getOrThrow(
        PORTS.CustomPredicate.wire.encodeQuestion(["isOwner", claimed, undefined, undefined]),
      );
      yield* answerRemotely(PORTS.CustomPredicate, { names: ["isOwner"] })(overTheWire(question)).pipe(
        Effect.provide(Layer.merge(store, currentSubjectLayer(alice))),
      );
      assert.deepStrictEqual(seen, ["editor"]);
    }));
});

/**
 * What a declaration admits is decided by the port's own `serving` facet
 * (SERV-02, ADR-QD-114): a required allowlist declared empty admits nothing,
 * and an open port with no list admits any name. A required allowlist that is
 * missing, or not a list, admits nothing either (fail-closed, code review WR-01).
 */
describe("a declaration is admitted through the port's facet (SERV-02)", () => {
  const refused: PortWireReply = { _tag: "Refused", reason: "NotServed" };

  const answerWith = <K extends PortName>(
    d: DescriptionOf<K>,
    serving: PortServingOf<K>,
    store: Layer.Layer<ServiceOf<PortTypes[K]>>,
    args: ArgsOf<PortTypes[K]>,
  ) =>
    answerRemotely(d, serving)(overTheWire(asQuestion(d, args))).pipe(
      Effect.provide(Layer.merge(store, currentSubjectLayer(alice))),
    );

  it.effect("a required attribute list declared empty admits nothing, not even inherited names", () =>
    Effect.gen(function* () {
      for (const attribute of ["clearance", "constructor", "__proto__"]) {
        const store = recordingPort(PORTS.AttributeResolver, AttributeResolverNone);
        const reply = yield* answerWith(PORTS.AttributeResolver, { attributes: [] }, store.layer, [
          aliceId,
          attribute,
        ]);
        assert.deepStrictEqual(reply, refused);
        assert.strictEqual(store.calls.length, 0);
      }
    }));

  it.effect("a required predicate list declared empty admits nothing", () =>
    Effect.gen(function* () {
      const store = recordingPort(PORTS.CustomPredicate, CustomPredicateNone);
      const reply = yield* answerWith(PORTS.CustomPredicate, { names: [] }, store.layer, CASES.CustomPredicate.args);
      assert.deepStrictEqual(reply, refused);
      assert.strictEqual(store.calls.length, 0);
    }));

  // A declaration the type checker never saw, the way a host config loaded from
  // JSON arrives: `JSON.parse` is typed loosely, so no cast is needed to hand it
  // to a parameter that, in typed code, could not be built this way.
  const loaded = (text: string): PortServingOf<"AttributeResolver"> & PortServingOf<"CustomPredicate"> =>
    JSON.parse(text);

  it.effect("a required attribute list that is missing or not a list serves nothing", () =>
    Effect.gen(function* () {
      for (const text of ["{}", '{"attributes":null}', '{"attributes":"clearance"}']) {
        const store = recordingPort(PORTS.AttributeResolver, AttributeResolverNone);
        for (const attribute of ["clearance", "constructor", "__proto__"]) {
          const reply = yield* answerWith(PORTS.AttributeResolver, loaded(text), store.layer, [aliceId, attribute]);
          assert.deepStrictEqual(reply, refused);
        }
        assert.strictEqual(store.calls.length, 0);
      }
    }));

  it.effect("a required predicate list that is missing or not a list serves nothing", () =>
    Effect.gen(function* () {
      for (const text of ["{}", '{"names":null}', '{"names":"isOwner"}']) {
        const store = recordingPort(PORTS.CustomPredicate, CustomPredicateNone);
        const reply = yield* answerWith(PORTS.CustomPredicate, loaded(text), store.layer, CASES.CustomPredicate.args);
        assert.deepStrictEqual(reply, refused);
        assert.strictEqual(store.calls.length, 0);
      }
    }));

  it.effect("an open port with no list admits any name", () =>
    Effect.gen(function* () {
      const relationships = scriptedPort(PORTS.RelationshipResolver, () => PortReply.answer("Related")).layer;
      const related = yield* answerWith(
        PORTS.RelationshipResolver,
        {},
        relationships,
        CASES.RelationshipResolver.args,
      );
      assert.deepStrictEqual(related, { _tag: "Answered", answer: "Related" });
      const history = scriptedPort(PORTS.DecisionHistory, () => PortReply.answer("Acted")).layer;
      const acted = yield* answerWith(PORTS.DecisionHistory, {}, history, CASES.DecisionHistory.args);
      assert.deepStrictEqual(acted, { _tag: "Answered", answer: "Acted" });
    }));
});

/** The whole evaluation, with every listed port answered remotely by `store`. */
const remoteEvaluation = (
  store: Layer.Layer<PortServices>,
  serving: PortServing,
  ports: ReadonlyArray<PortName>,
) => {
  const handlers = tabulatePorts<{
    readonly [K in PortName]: (body: unknown) => Effect.Effect<PortWireReply, never, PortServices | CurrentSubject>;
  }>((d) => {
    const declared = serving[d.port];
    return (body) =>
      declared === undefined
        ? Effect.succeed({ _tag: "Refused", reason: "NotServed" })
        : answerRemotely(d, declared)(body);
  });
  const send = (port: PortName, question: Schema.Json) =>
    handlers[port](overTheWire(question)).pipe(
      Effect.provide(Layer.merge(store, currentSubjectLayer(alice))),
      Effect.map(overTheWire),
    );
  return Layer.mergeAll(
    currentSubjectLayer(alice),
    evaluationIdSequential(),
    remotePorts(send, ports),
  );
};

describe("a signature question asked remotely (PORT-04)", () => {
  const records = [{ signerId: aliceId, meaning: "approved", signerRole: "manager", signedAt: 0 }];
  const store = scriptedPort(PORTS.SignatureHistory, () => PortReply.answer(records)).layer;
  const send = (question: Schema.Json) =>
    answerRemotely(PORTS.SignatureHistory, { signatures: "own-records" })(overTheWire(question)).pipe(
      Effect.provide(Layer.merge(store, currentSubjectLayer(alice))),
      Effect.map(overTheWire),
    );
  const signed = (spans: Array<Tracer.Span>, meaning: string, signerRole: string | undefined) =>
    askSignature(
      alice,
      leafOf("HasSignature", P.hasSignature(meaning, signerRole === undefined ? {} : { signerRole })),
      { id: "doc-1" },
    ).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.succeed(SignatureHistory, askRemotely(PORTS.SignatureHistory, send)),
          collectingTracer(spans),
        ),
      ),
    );
  const signatureSpans = (spans: ReadonlyArray<Tracer.Span>) =>
    spans
      .filter((s) => s.name === PORTS.SignatureHistory.span)
      .map((s) => Object.fromEntries(s.attributes));

  it.effect("leaves a local and a served span equal apart from the interpreter", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      const answer = yield* signed(spans, "approved", "manager");
      assert.isTrue(answer.matched);
      const found = signatureSpans(spans);
      assert.strictEqual(found.length, 2);
      const local = found.find((a) => a["qadi.interpreter"] === "evaluate");
      const served = found.find((a) => a["qadi.interpreter"] === "remote");
      assert.isDefined(local);
      assert.isDefined(served);
      const { "qadi.interpreter": _local, ...localRest } = local ?? {};
      const { "qadi.interpreter": _served, ...servedRest } = served ?? {};
      assert.deepStrictEqual(servedRest, localRest);
      assert.strictEqual(servedRest["qadi.meaning"], "approved");
      assert.strictEqual(servedRest["qadi.signer_role"], "manager");
      assert.strictEqual(servedRest["qadi.matched"], true);
    }));

  it.effect("says a requirement that matches nothing on file did not match, on both spans", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      const answer = yield* signed(spans, "approved", "director");
      assert.isFalse(answer.matched);
      const found = signatureSpans(spans);
      assert.strictEqual(found.length, 2);
      for (const attributes of found) assert.strictEqual(attributes["qadi.matched"], false);
    }));
});

/**
 * A store that answers something the signature span cannot read is a typed
 * failure on both sides of the wire, never a defect (WR-01, ADR-QD-109): the
 * span's `disclose` matches the list against the requirement, so it throws on a
 * malformed one, and `answerRemotely`'s "never fails" has to hold regardless.
 */
describe("a malformed signature answer from a store is never a defect (WR-01)", () => {
  const d = PORTS.SignatureHistory;
  // `JSON.parse` returns `any`, which is what an untyped adapter hands back.
  const malformed = PortReply.answer<AnswerOf<PortTypes["SignatureHistory"]>>(JSON.parse("[null]"));
  const store = scriptedPort(d, () => malformed).layer;
  const query = { subjectId: aliceId, resourceId: doc, meaning: "approved", signerRole: "manager" };

  it.effect("a served read fails with the port's typed error", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(servePortRead(d, query).pipe(Effect.provide(store)));
      assert.isTrue(Result.isFailure(result));
      if (Result.isFailure(result)) assert.strictEqual(result.failure._tag, "SignatureHistoryUnavailable");
    }));

  it.effect("a local read fails with the port's typed error", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        askSignature(
          alice,
          leafOf("HasSignature", P.hasSignature("approved", { signerRole: "manager" })),
          { id: "doc-1" },
        ).pipe(Effect.provide(store)),
      );
      assert.isTrue(Result.isFailure(result));
      if (Result.isFailure(result)) assert.strictEqual(result.failure._tag, "SignatureHistoryUnavailable");
    }));

  it.effect("answerRemotely replies Unavailable and does not die", () =>
    Effect.gen(function* () {
      const question = Result.getOrThrow(d.wire.encodeQuestion([query]));
      const reply = yield* answerRemotely(d, { signatures: "own-records" })(overTheWire(question)).pipe(
        Effect.provide(Layer.merge(store, currentSubjectLayer(alice))),
      );
      assert.deepStrictEqual(reply, { _tag: "Unavailable" });
    }));
});

describe("the signature question carries the asker's requirement (D-03)", () => {
  const d = PORTS.SignatureHistory;
  const roundTrip = (query: { subjectId: typeof aliceId; resourceId: typeof doc | undefined; meaning?: string; signerRole?: string }) => {
    const encoded = Result.getOrThrow(d.wire.encodeQuestion([query]));
    return Result.getOrThrow(d.wire.decodeQuestion(overTheWire(encoded))).args(alice);
  };

  it("meaning and signerRole survive encode, decode and args", () => {
    assert.deepStrictEqual(roundTrip({ subjectId: aliceId, resourceId: doc, meaning: "approved", signerRole: "manager" }), [
      { subjectId: aliceId, resourceId: doc, meaning: "approved", signerRole: "manager" },
    ]);
  });

  it("their absence survives the round trip, and an old question still decodes", () => {
    assert.deepStrictEqual(roundTrip({ subjectId: aliceId, resourceId: doc }), [{ subjectId: aliceId, resourceId: doc }]);
    const old = Result.getOrThrow(d.wire.decodeQuestion({ subjectId: "alice", resourceId: "doc-1" }));
    assert.deepStrictEqual(old.args(alice), [{ subjectId: aliceId, resourceId: doc }]);
  });

  it("an excess property is still refused", () => {
    const widened = { subjectId: "alice", resourceId: "doc-1", meaning: "approved", isAdmin: true };
    assert.isTrue(Result.isFailure(d.wire.decodeQuestion(widened)));
  });

  it("a requirement that is not a string is refused", () => {
    assert.isTrue(Result.isFailure(d.wire.decodeQuestion({ subjectId: "alice", meaning: 7 })));
    assert.isTrue(Result.isFailure(d.wire.decodeQuestion({ subjectId: "alice", signerRole: {} })));
  });
});

describe("an outage on the answering side fails the asker's evaluation", () => {
  const down = portsLayer({
    RelationshipResolver: scriptedPort(PORTS.RelationshipResolver, () => PortReply.fail("graph down")).layer,
    DecisionHistory: scriptedPort(PORTS.DecisionHistory, () => PortReply.fail("log down")).layer,
    AttributeResolver: scriptedPort(PORTS.AttributeResolver, () => PortReply.fail("idp down")).layer,
  });
  const serving = servingFor([
    P.allOf([P.hasRelationship("banned"), P.hasActed("legal-review"), P.hasAttribute("standing", { _tag: "Exists" })]),
  ]);
  const layer = remoteEvaluation(down, serving, ["RelationshipResolver", "DecisionHistory", "AttributeResolver"]);
  const failsWith = (policy: P.Policy, tag: string) =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(evaluate(policy, { resource: { id: "doc-1" } }).pipe(Effect.provide(layer)));
      assert.isTrue(Exit.isFailure(exit));
      const found = Exit.isFailure(exit) ? Cause.findErrorOption(exit.cause) : undefined;
      assert.strictEqual(found?._tag === "Some" ? Reflect.get(Object(found.value), "_tag") : undefined, tag);
    });

  it.effect("not(hasRelationship) is a failure, not a grant", () =>
    failsWith(P.not(P.hasRelationship("banned")), "RelationshipResolveError"));
  it.effect("hasRelationship is a failure, not a denial", () =>
    failsWith(P.hasRelationship("banned"), "RelationshipResolveError"));
  it.effect("hasNotActed is a failure, not a grant", () =>
    failsWith(P.hasNotActed("legal-review", { scope: "Resource" }), "DecisionHistoryUnavailable"));
  it.effect("hasActed is a failure, not a denial", () =>
    failsWith(P.hasActed("legal-review"), "DecisionHistoryUnavailable"));
  it.effect("an attribute read is a failure", () =>
    failsWith(P.hasAttribute("standing", { _tag: "Exists" }), "AttributeResolveError"));
});

describe("a genuine Unknown still crosses as an answer", () => {
  it.effect("hasRelationship under a serving RelationshipResolverNever is a denial", () =>
    Effect.gen(function* () {
      const layer = remoteEvaluation(
        portsLayer({ RelationshipResolver: RelationshipResolverNever }),
        servingFor([P.hasRelationship("banned")]),
        ["RelationshipResolver"],
      );
      const decision = yield* evaluate(P.hasRelationship("banned"), { resource: { id: "doc-1" } }).pipe(
        Effect.provide(layer),
      );
      assert.strictEqual(decision._tag, "Deny");
    }));
});

describe("servingFor", () => {
  it("collects exactly the names the policies ask about", () => {
    const serving = servingFor([
      P.allOf([
        P.hasAttribute("clearance", { _tag: "Exists" }),
        P.not(P.hasRelationship("owner")),
        P.hasActed("approved"),
        P.hasNotActed("rejected"),
        P.hasCustom("isOwner"),
      ]),
    ]);
    assert.deepStrictEqual(serving, {
      AttributeResolver: { attributes: ["clearance"] },
      RelationshipResolver: { relations: ["owner"] },
      DecisionHistory: { events: ["approved", "rejected"] },
      CustomPredicate: { names: ["isOwner"] },
    });
  });

  it("serves the signature port only when a policy asks it", () => {
    assert.isFalse("SignatureHistory" in servingFor([P.hasRole("a")]));
    assert.deepStrictEqual(servingFor([P.hasSignature("approved")]).SignatureHistory, {
      signatures: "own-records",
    });
  });

  it.effect("admits every question evaluate asks a port, for any generated policy", () =>
    Effect.gen(function* () {
      const policies = FastCheck.sample(policyArbitrary(), { numRuns: 150, seed: 20261008 });
      for (const policy of policies) {
        const attributes = recordingPort(PORTS.AttributeResolver, AttributeResolverNone);
        const relationships = recordingPort(PORTS.RelationshipResolver, RelationshipResolverNever);
        const history = recordingPort(PORTS.DecisionHistory, DecisionHistoryUnknown);
        const custom = recordingPort(PORTS.CustomPredicate, CustomPredicateNone);
        const signatures = recordingPort(PORTS.SignatureHistory, SignatureHistoryNone);
        yield* Effect.exit(
          evaluate(policy, { resource: { id: "doc-1" } }).pipe(
            Effect.provide(
              Layer.mergeAll(
                currentSubjectLayer(alice),
                evaluationIdSequential(),
                portsLayer({
                  AttributeResolver: attributes.layer,
                  RelationshipResolver: relationships.layer,
                  DecisionHistory: history.layer,
                  CustomPredicate: custom.layer,
                  SignatureHistory: signatures.layer,
                }),
              ),
            ),
          ),
        );
        const serving = servingFor([policy]);
        for (const [, attribute] of attributes.calls) {
          assert.include(serving.AttributeResolver?.attributes ?? [], attribute);
        }
        for (const [request] of relationships.calls) {
          assert.include(serving.RelationshipResolver?.relations ?? [], request.relation);
        }
        for (const [query] of history.calls) {
          assert.include(serving.DecisionHistory?.events ?? [], query.event);
        }
        for (const [name] of custom.calls) {
          assert.include(serving.CustomPredicate?.names ?? [], name);
        }
        if (signatures.calls.length > 0) assert.isDefined(serving.SignatureHistory);
      }
    }));
});

/**
 * The name `servingFor` serves for a leaf is `asked` of the request that leaf's
 * read builds, at any site (ARCH-70, ADR-QD-134): one statement of leaf to
 * request, read two ways. `servingFor` reads it at one site, an anonymous
 * subject asking about no resource, so a name that depended on the site would
 * make it wrong; this rules that out, per port and per tag its `asks` states.
 */
describe("a served name is what a leaf's request asks (ARCH-70)", () => {
  const name = FastCheck.string({ minLength: 1 });
  const scope = FastCheck.constantFrom("Resource" as const, "Any" as const);

  /** Where a read is made: any subject, and a resource that is absent, has a string id or another kind of id. */
  const sites: FastCheck.Arbitrary<ReadSite> = FastCheck.record({
    subject: name.map((id) => makeSubject({ id, roles: [], permissions: [], attributes: {} })),
    resource: FastCheck.oneof(
      FastCheck.constant(undefined),
      FastCheck.record({ id: FastCheck.string() }),
      FastCheck.record({ id: FastCheck.oneof(FastCheck.integer(), FastCheck.constant(undefined)) }),
    ),
  });

  const covered: Array<string> = [];

  /** The law for one tag, over every port whose `asks` states it. */
  const lawOf = <T extends P.Policy["_tag"]>(tag: T, leaves: FastCheck.Arbitrary<P.Policy>) => {
    covered.push(tag);
    forEveryPort((d) => {
      const ask = d.asks[tag];
      if (ask === undefined) return;
      it(`${d.port}: ${tag} asks the same name at every site, and servingFor serves it`, () => {
        FastCheck.assert(
          FastCheck.property(leaves, sites, sites, (policy, here, there) => {
            const leaf = leafOf(tag, policy);
            const asked = d.serving.asked(ask(leaf, here));
            assert.strictEqual(asked, d.serving.asked(ask(leaf, there)));
            const slot = servingFor([leaf])[d.port];
            assert.isDefined(slot);
            if (slot !== undefined && asked !== undefined) {
              assert.include(d.serving.admitted(slot) ?? [], asked);
            }
          }),
          { numRuns: 200 },
        );
      });
    });
  };

  lawOf("HasAttribute", name.map((attribute) => P.hasAttribute(attribute, M.exists())));
  lawOf("HasActed", FastCheck.tuple(name, scope).map(([event, scoped]) => P.hasActed(event, { scope: scoped })));
  lawOf("HasNotActed", FastCheck.tuple(name, scope).map(([event, scoped]) => P.hasNotActed(event, { scope: scoped })));
  lawOf(
    "HasRelationship",
    FastCheck.tuple(name, FastCheck.integer({ min: -3, max: 70 })).map(([relation, depth]) =>
      P.hasRelationship(relation, { depth }),
    ),
  );
  lawOf("HasCustom", FastCheck.tuple(name, FastCheck.jsonValue()).map(([custom, params]) => P.hasCustom(custom, params)));
  lawOf(
    "HasSignature",
    FastCheck.tuple(name, scope, name).map(([meaning, scoped, signerRole]) =>
      P.hasSignature(meaning, { scope: scoped, signerRole }),
    ),
  );

  it("is stated for every tag a port reads", () => {
    assert.deepStrictEqual(
      covered.toSorted(),
      forEveryPort((d) => Object.keys(d.asks)).flat().toSorted(),
    );
  });
});

describe("serving facets (SERV-02)", () => {
  /** The leaf tags that read a port; every other policy tag asks none. */
  const PORT_LEAVES: { readonly [K in PortName]: ReadonlyArray<P.Policy["_tag"]> } = {
    AttributeResolver: ["HasAttribute"],
    DecisionHistory: ["HasActed", "HasNotActed"],
    RelationshipResolver: ["HasRelationship"],
    CustomPredicate: ["HasCustom"],
    SignatureHistory: ["HasSignature"],
  };

  /** The word each port's `PortServing` slot earns, written out per port. */
  const WORDS: { readonly [K in PortName]: "required" | "open" | "opt-in" } = {
    AttributeResolver: "required",
    DecisionHistory: "open",
    RelationshipResolver: "open",
    CustomPredicate: "required",
    SignatureHistory: "opt-in",
  };

  it("names each port-reading leaf under exactly one port, and no other policy tag", () => {
    for (const d of Record.values(PORTS)) {
      assert.deepStrictEqual(Object.keys(d.asks).toSorted(), PORT_LEAVES[d.port].toSorted(), d.port);
    }
    const named = forEveryPort((d) => Object.keys(d.asks)).flat();
    assert.deepStrictEqual(
      named.toSorted(),
      ["HasActed", "HasAttribute", "HasCustom", "HasNotActed", "HasRelationship", "HasSignature"],
    );
    for (const tag of named) assert.include(P.POLICY_TAGS, tag);
  });

  it("states each port's allowlist word", () => {
    for (const d of Record.values(PORTS)) assert.strictEqual(d.serving.allowlist, WORDS[d.port], d.port);
  });

  it("declares what it admits: declare and admitted agree, per port", () => {
    forEveryPort((d) => {
      const optIn = WORDS[d.port] === "opt-in";
      const slot = d.serving.declare({ names: ["a", "b"], asked: true })[d.port];
      assert.isDefined(slot, d.port);
      if (slot !== undefined) {
        assert.deepStrictEqual(d.serving.admitted(slot), optIn ? undefined : ["a", "b"], d.port);
      }
      const nothing = d.serving.declare({ names: [], asked: false });
      if (optIn) {
        // An opt-in port has no names, so it is declared exactly when a leaf asked it.
        assert.notProperty(nothing, d.port);
        assert.property(d.serving.declare({ names: [], asked: true }), d.port);
        return;
      }
      const empty = nothing[d.port];
      assert.isDefined(empty, d.port);
      if (empty !== undefined) assert.deepStrictEqual(d.serving.admitted(empty), [], d.port);
    });
  });
});
