/**
 * `answerRemotely` and `askRemotely` round-trip every port in memory, and a
 * remote outage fails where the store fails (ARCH-31 T5, INV-QD-NEXT).
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
import * as P from "../src/Policy.ts";
import { PortReply } from "../src/PortDescription.ts";
import { recordingPort, scriptedPort } from "../src/PortDoubles.ts";
import type { PortName } from "../src/PortMetrics.ts";
import { answerRemotely, askRemotely, remotePorts, servingFor } from "../src/PortRemote.ts";
import type { PortServing, PortServingOf } from "../src/PortRemote.ts";
import { RemotePortFailure } from "../src/PortWire.ts";
import type { PortWireReply } from "../src/PortWire.ts";
import { PORTS, portsLayer, tabulatePorts } from "../src/Ports.ts";
import type { AnswerOf, ArgsOf, DescriptionOf, PortServices, PortTypes, ServiceOf } from "../src/Ports.ts";
import { RelationshipResolverNever } from "../src/RelationshipResolver.ts";
import { SignatureHistoryNone } from "../src/SignatureHistory.ts";
import { policyArbitrary } from "./helpers.ts";

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
  /** A declaration that does not admit `args`, or `undefined` where a port has none to refuse. */
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

/**
 * What an error says, wherever it says it: a port with a `cause` field keeps
 * the remote failure there, and `CustomPredicateError` renders it into `reason`.
 */
const rendered = (error: unknown): string => `${String(Reflect.get(Object(error), "message"))} ${JSON.stringify(error)}`;

/** Through JSON text, the way a transport carries it. */
const overTheWire = (json: unknown): unknown => JSON.parse(JSON.stringify(json));

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

describe("a remote port (ADR-QD-NEXT)", () => {
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
