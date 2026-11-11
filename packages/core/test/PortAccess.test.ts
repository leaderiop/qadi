import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Record from "effect/Record";
import * as Result from "effect/Result";
import type * as Tracer from "effect/Tracer";
import { attributeResolverPort } from "../src/AttributeResolver.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import { customPredicatePort } from "../src/CustomPredicate.ts";
import { decisionHistoryPort } from "../src/DecisionHistory.ts";
import { AttributeResolveError, MissingResourceId } from "../src/Errors.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import {
  askActed,
  askCustom,
  askRelationship,
  askSignature,
  catchPortDefect,
  readAttribute,
  servePortRead,
} from "../src/PortAccess.ts";
import * as M from "../src/Matcher.ts";
import * as P from "../src/Policy.ts";
import { PortReply } from "../src/PortDescription.ts";
import { scriptedPort } from "../src/PortDoubles.ts";
import { portCallsTotal, predicatePortCallsTotal, servedPortCallsTotal } from "../src/PortMetrics.ts";
import type { PortName } from "../src/PortMetrics.ts";
import { PORTS, portsLayer } from "../src/Ports.ts";
import type {
  AnswerOf,
  ArgsOf,
  DescriptionOf,
  PortServices,
  PortTypes,
  ServiceOf,
} from "../src/Ports.ts";
import { relationshipResolverPort } from "../src/RelationshipResolver.ts";
import { signatureHistoryPort } from "../src/SignatureHistory.ts";
import { collectingTracer, isolatedMetrics, leafOf } from "./helpers.ts";

/** Each read takes the leaf it answers (ARCH-70); these build one, narrowed to its node type. */
const attributeLeaf = (attribute: string) => leafOf("HasAttribute", P.hasAttribute(attribute, M.exists()));
const actedLeaf = (event: string, scope: "Resource" | "Any") =>
  leafOf("HasActed", P.hasActed(event, { scope }));
const relationshipLeaf = (relation: string, depth: number) =>
  leafOf("HasRelationship", P.hasRelationship(relation, { depth }));
const customLeaf = (name: string, params: unknown) => leafOf("HasCustom", P.hasCustom(name, params));
const signatureLeaf = (meaning: string, signerRole: string | undefined, scope: "Resource" | "Any") =>
  leafOf(
    "HasSignature",
    P.hasSignature(meaning, signerRole === undefined ? { scope } : { scope, signerRole }),
  );
const DOC = { id: "doc-1" };

/** The words a frequency has actually counted; preregistered words sit at zero. */
const nonZero = (frequency: { readonly occurrences: ReadonlyMap<string, number> }) =>
  [...frequency.occurrences].filter(([, count]) => count !== 0);

/**
 * `catchPortDefect`'s whole contract is a cause matrix: which shapes of cause it
 * rewrites and which it leaves alone. Fail+Die and Die+Interrupt are awkward to
 * produce through a real port, so they are driven here directly (BEH-QD-261).
 */
describe("catchPortDefect", () => {
  const convert = catchPortDefect(
    (cause: Cause.Cause<AttributeResolveError>) =>
      new AttributeResolveError({ attribute: "x", cause: Cause.squash(cause) }),
  );
  const original = new AttributeResolveError({ attribute: "x", cause: "down" });
  const defect = new Error("boom");

  it.effect("a typed failure passes through as the same instance", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(convert(Effect.fail(original)));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure, original);
    }));

  it.effect("a defect becomes the typed error carrying it", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(convert(Effect.die(defect)));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.instanceOf(r.failure, AttributeResolveError);
      assert.strictEqual(r.failure.cause, defect);
    }));

  it.effect("a synchronous throw becomes the typed error", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(
        convert(
          Effect.sync(() => {
            throw defect;
          }),
        ),
      );
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.instanceOf(r.failure, AttributeResolveError);
      assert.strictEqual(r.failure.cause, defect);
    }));

  it.effect("an interruption is never converted", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(convert(Effect.interrupt));
      assert.isTrue(Exit.isFailure(exit));
      if (!Exit.isFailure(exit)) return;
      assert.isTrue(Cause.hasInterruptsOnly(exit.cause));
    }));

  it.effect("a cause with both a Fail and a Die passes through unchanged", () =>
    Effect.gen(function* () {
      const mixed = Effect.failCause(Cause.combine(Cause.fail(original), Cause.die(defect)));
      const exit = yield* Effect.exit(convert(mixed));
      assert.isTrue(Exit.isFailure(exit));
      if (!Exit.isFailure(exit)) return;
      // Not rewritten: the original Fail is still there, and so is the Die.
      assert.isTrue(Cause.hasFails(exit.cause));
      assert.isTrue(Cause.hasDies(exit.cause));
    }));

  it.effect("a cause with a Die and an Interrupt is converted", () =>
    Effect.gen(function* () {
      const mixed = Effect.failCause(Cause.combine(Cause.die(defect), Cause.interrupt()));
      const r = yield* Effect.result(convert(mixed));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.instanceOf(r.failure, AttributeResolveError);
    }));

  it.effect("a success is untouched", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* convert(Effect.succeed(1)), 1);
    }));
});

/**
 * Each read builds a dying port's typed error through the port's own
 * description (`defect`), with the request it actually sent — so these pin the
 * wiring of the arguments, not only the error's tag (ARCH-10 T6).
 */
describe("a read's defect error is its port description's", () => {
  const alice = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });
  const doc = makeResourceId("doc-1");
  const dying = Cause.die("dead");

  const failureOf = <A, E>(effect: Effect.Effect<A, E>) =>
    Effect.map(Effect.result(effect), (r) => (r._tag === "Failure" ? r.failure : undefined));

  it.effect("AttributeResolver", () =>
    Effect.gen(function* () {
      const port = scriptedPort(attributeResolverPort, () => PortReply.die("dead"));
      const error = yield* failureOf(
        readAttribute("evaluate", alice, attributeLeaf("level")).pipe(
          Effect.provide(portsLayer({ AttributeResolver: port.layer })),
        ),
      );
      assert.deepStrictEqual(error, attributeResolverPort.defect([alice.id, "level"], dying));
    }));

  it.effect("DecisionHistory", () =>
    Effect.gen(function* () {
      const port = scriptedPort(decisionHistoryPort, () => PortReply.throw("dead"));
      const error = yield* failureOf(
        askActed("toPredicate", alice, actedLeaf("approved", "Any"), undefined).pipe(
          Effect.provide(portsLayer({ DecisionHistory: port.layer })),
        ),
      );
      assert.deepStrictEqual(
        error,
        decisionHistoryPort.defect(
          [{ subjectId: alice.id, event: "approved", resourceId: undefined }],
          dying,
        ),
      );
    }));

  it.effect("RelationshipResolver", () =>
    Effect.gen(function* () {
      const port = scriptedPort(relationshipResolverPort, () => PortReply.die("dead"));
      const error = yield* failureOf(
        askRelationship(alice, relationshipLeaf("owner", 3), DOC).pipe(
          Effect.provide(portsLayer({ RelationshipResolver: port.layer })),
        ),
      );
      assert.deepStrictEqual(
        error,
        relationshipResolverPort.defect(
          [{ subjectId: alice.id, relation: "owner", resourceId: doc, depth: 3 }],
          dying,
        ),
      );
      assert.deepStrictEqual(port.calls, [
        [{ subjectId: alice.id, relation: "owner", resourceId: doc, depth: 3 }],
      ]);
    }));

  it.effect("CustomPredicate, whose reason is still the rendered cause", () =>
    Effect.gen(function* () {
      const port = scriptedPort(customPredicatePort, () => PortReply.die("dead"));
      const error = yield* failureOf(
        askCustom(alice, customLeaf("isOwner", { strict: true }), DOC).pipe(
          Effect.provide(portsLayer({ CustomPredicate: port.layer })),
        ),
      );
      assert.strictEqual(error?._tag, "CustomPredicateError");
      if (error === undefined) return;
      assert.strictEqual(error.name, "isOwner");
      // `Cause.pretty` of the cause the port actually died with — which carries
      // the read's span annotations — so it is compared by what it must say
      // rather than byte for byte against a cause rebuilt here.
      assert.include(error.reason, "dead");
      assert.strictEqual(
        customPredicatePort.defect(["isOwner", alice, undefined, undefined], dying).reason,
        Cause.pretty(dying),
      );
    }));

  it.effect("SignatureHistory", () =>
    Effect.gen(function* () {
      const port = scriptedPort(signatureHistoryPort, () => PortReply.die("dead"));
      const error = yield* failureOf(
        askSignature(alice, signatureLeaf("approved", undefined, "Resource"), DOC).pipe(
          Effect.provide(portsLayer({ SignatureHistory: port.layer })),
        ),
      );
      assert.deepStrictEqual(
        error,
        signatureHistoryPort.defect([{ subjectId: alice.id, resourceId: doc }], dying),
      );
    }));
});

/**
 * A port's span is projected once and every read is one body (ARCH-47,
 * ADR-QD-109): a local read and a served read of the same request leave the
 * same span, apart from `qadi.interpreter`, and a store that throws is the
 * port's typed error whichever way it was asked.
 */
describe("a read is one body, locally and served (ARCH-47)", () => {
  const alice = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });
  const aliceId = makeSubjectId("alice");
  const doc = makeResourceId("doc-1");
  const signed = [{ signerId: aliceId, meaning: "approved", signerRole: "manager", signedAt: 0 }];

  const attributesOf = (spans: ReadonlyArray<Tracer.Span>, name: string) => {
    const span = spans.find((s) => s.name === name);
    assert.isDefined(span);
    return Object.fromEntries(span?.attributes ?? []);
  };

  const without = (record: Readonly<Record<string, unknown>>, key: string) =>
    Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));

  const spansOfSignature = Effect.gen(function* () {
    const store = scriptedPort(signatureHistoryPort, () => PortReply.answer(signed)).layer;
    const localSpans: Array<Tracer.Span> = [];
    yield* askSignature(alice, signatureLeaf("approved", "manager", "Resource"), DOC).pipe(
      Effect.provide(Layer.mergeAll(portsLayer({ SignatureHistory: store }), collectingTracer(localSpans))),
    );
    const servedSpans: Array<Tracer.Span> = [];
    yield* servePortRead(signatureHistoryPort, {
      subjectId: aliceId,
      resourceId: doc,
      meaning: "approved",
      signerRole: "manager",
    }).pipe(Effect.provide(Layer.mergeAll(store, collectingTracer(servedSpans))));
    return {
      local: attributesOf(localSpans, signatureHistoryPort.span),
      served: attributesOf(servedSpans, signatureHistoryPort.span),
    };
  });

  it.effect("a signature question leaves equal local and served spans, apart from the interpreter", () =>
    Effect.gen(function* () {
      const { local, served } = yield* spansOfSignature;
      assert.strictEqual(local["qadi.interpreter"], "evaluate");
      assert.strictEqual(served["qadi.interpreter"], "remote");
      assert.deepStrictEqual(without(served, "qadi.interpreter"), without(local, "qadi.interpreter"));
      assert.strictEqual(served["qadi.meaning"], "approved");
      assert.strictEqual(served["qadi.signer_role"], "manager");
      assert.strictEqual(served["qadi.scope"], "Resource");
      assert.strictEqual(served["qadi.resource_id"], "doc-1");
      assert.strictEqual(served["qadi.matched"], true);
    }));

  it.effect("the signature answer keys are the struct's, and onFile is recorded on neither span", () =>
    Effect.gen(function* () {
      const { local, served } = yield* spansOfSignature;
      const { question, answer } = signatureHistoryPort.attributes;
      const answerKeys: ReadonlyArray<string> = Object.values(answer.keys);
      const known: ReadonlyArray<string> = [...Object.values(question.keys), ...answerKeys];
      for (const attributes of [local, served]) {
        assert.deepStrictEqual(
          Object.keys(attributes).filter((k) => answerKeys.includes(k)),
          ["qadi.matched"],
        );
        assert.deepStrictEqual(
          Object.keys(attributes).filter((k) => !known.includes(k)),
          [],
        );
      }
    }));

  it.effect("a served read whose store throws is the port's typed error, never a defect", () =>
    Effect.gen(function* () {
      const query = { subjectId: aliceId, event: "approved", resourceId: undefined };
      const result = yield* Effect.result(
        servePortRead(decisionHistoryPort, query).pipe(
          Effect.provide(scriptedPort(decisionHistoryPort, () => PortReply.throw("dead")).layer),
        ),
      );
      assert.strictEqual(result._tag, "Failure");
      if (result._tag !== "Failure") return;
      assert.deepStrictEqual(result.failure, decisionHistoryPort.defect([query], Cause.die("dead")));
    }));
});

/**
 * The per-port table (ARCH-47, D-08): for every port, a local read and a served
 * read of the same request leave equal spans apart from `qadi.interpreter`,
 * answer or fail, die or throw, and count in their own metric only. `ROWS` is a
 * mapped type over `PortName`, so a sixth port without a row is a compile
 * error, beside `PortServe.test.ts`'s loop.
 */
describe("a local read equals a served read, port by port (ARCH-47)", () => {
  const aliceId = makeSubjectId("alice");
  const alice = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });
  const doc = makeResourceId("doc-1");
  const SECRET = "the-secret-clearance-value";
  const signed = [{ signerId: aliceId, meaning: "approved", signerRole: "manager", signedAt: 0 }];

  interface Row<K extends PortName> {
    readonly name: string;
    /** Who asks locally; the series its call is counted in. */
    readonly interpreter: "evaluate" | "toPredicate";
    readonly local: Effect.Effect<unknown, unknown, ServiceOf<PortTypes[K]>>;
    /** The served read of the same request. */
    readonly served: ArgsOf<PortTypes[K]>;
    readonly answer: AnswerOf<PortTypes[K]>;
  }

  const ROWS: { readonly [K in PortName]: ReadonlyArray<Row<K>> } = {
    AttributeResolver: [
      {
        name: "readAttribute under evaluate",
        interpreter: "evaluate",
        local: readAttribute("evaluate", alice, attributeLeaf("clearance")),
        served: [aliceId, "clearance"],
        answer: SECRET,
      },
      {
        name: "readAttribute under toPredicate",
        interpreter: "toPredicate",
        local: readAttribute("toPredicate", alice, attributeLeaf("clearance")),
        served: [aliceId, "clearance"],
        answer: SECRET,
      },
    ],
    DecisionHistory: [
      {
        name: "askActed, scope Any, under evaluate",
        interpreter: "evaluate",
        local: askActed("evaluate", alice, actedLeaf("approved", "Any"), undefined),
        served: [{ subjectId: aliceId, event: "approved", resourceId: undefined }],
        answer: "Acted",
      },
      {
        name: "askActed, scope Any, under toPredicate",
        interpreter: "toPredicate",
        local: askActed("toPredicate", alice, actedLeaf("approved", "Any"), undefined),
        served: [{ subjectId: aliceId, event: "approved", resourceId: undefined }],
        answer: "Acted",
      },
      {
        name: "askActed, scope Resource",
        interpreter: "evaluate",
        local: askActed("evaluate", alice, actedLeaf("approved", "Resource"), DOC),
        served: [{ subjectId: aliceId, event: "approved", resourceId: doc }],
        answer: "Acted",
      },
    ],
    RelationshipResolver: [
      {
        name: "askRelationship",
        interpreter: "evaluate",
        local: askRelationship(alice, relationshipLeaf("owner", 2), DOC),
        served: [{ subjectId: aliceId, relation: "owner", resourceId: doc, depth: 2 }],
        answer: "Related",
      },
    ],
    CustomPredicate: [
      {
        name: "askCustom",
        interpreter: "evaluate",
        local: askCustom(alice, customLeaf("isOwner", { strict: true }), DOC),
        served: ["isOwner", alice, { id: "doc-1" }, { strict: true }],
        answer: true,
      },
    ],
    SignatureHistory: [
      {
        name: "askSignature, scope Any",
        interpreter: "evaluate",
        local: askSignature(alice, signatureLeaf("approved", "manager", "Any"), undefined),
        served: [
          { subjectId: aliceId, resourceId: undefined, meaning: "approved", signerRole: "manager" },
        ],
        answer: signed,
      },
      {
        name: "askSignature, scope Resource",
        interpreter: "evaluate",
        local: askSignature(alice, signatureLeaf("approved", "manager", "Resource"), DOC),
        served: [{ subjectId: aliceId, resourceId: doc, meaning: "approved", signerRole: "manager" }],
        answer: signed,
      },
    ],
  };

  const METRIC = {
    evaluate: portCallsTotal,
    toPredicate: predicatePortCallsTotal,
  } as const;

  const attributesIn = (spans: ReadonlyArray<Tracer.Span>, name: string) => {
    const span = spans.find((s) => s.name === name);
    assert.isDefined(span);
    return Object.fromEntries(span?.attributes ?? []);
  };

  const withoutInterpreter = (record: Readonly<Record<string, unknown>>) =>
    Object.fromEntries(Object.entries(record).filter(([k]) => k !== "qadi.interpreter"));

  /** Both reads of one row over one scripted store, each under its own tracer. */
  const readBoth = <K extends PortName>(
    d: DescriptionOf<K>,
    row: Row<K>,
    reply: PortReply<never>,
  ) =>
    Effect.gen(function* () {
      const store = scriptedPort(d, () => reply).layer;
      const localSpans: Array<Tracer.Span> = [];
      const servedSpans: Array<Tracer.Span> = [];
      const local = yield* Effect.result(
        row.local.pipe(Effect.provide(Layer.mergeAll(store, collectingTracer(localSpans)))),
      );
      const served = yield* Effect.result(
        servePortRead(d, ...row.served).pipe(
          Effect.provide(Layer.mergeAll(store, collectingTracer(servedSpans))),
        ),
      );
      return {
        local,
        served,
        localAttributes: attributesIn(localSpans, d.span),
        servedAttributes: attributesIn(servedSpans, d.span),
      };
    });

  const table = <K extends PortName>(d: DescriptionOf<K>, rows: ReadonlyArray<Row<K>>) => {
    describe(d.port, () => {
      for (const row of rows) {
        describe(row.name, () => {
          it.effect("leaves equal spans, apart from the interpreter, when answered", () =>
            Effect.gen(function* () {
              const store = scriptedPort(d, () => PortReply.answer(row.answer)).layer;
              const localSpans: Array<Tracer.Span> = [];
              const servedSpans: Array<Tracer.Span> = [];
              yield* row.local.pipe(Effect.provide(Layer.mergeAll(store, collectingTracer(localSpans))));
              yield* servePortRead(d, ...row.served).pipe(
                Effect.provide(Layer.mergeAll(store, collectingTracer(servedSpans))),
              );
              const local = attributesIn(localSpans, d.span);
              const served = attributesIn(servedSpans, d.span);
              assert.strictEqual(local["qadi.interpreter"], row.interpreter);
              assert.strictEqual(served["qadi.interpreter"], "remote");
              assert.deepStrictEqual(withoutInterpreter(served), withoutInterpreter(local));
              assert.notInclude(JSON.stringify(local), SECRET);
            }));

          it.effect("a store that fails is the port's typed error on both, with the same question", () =>
            Effect.gen(function* () {
              const both = yield* readBoth(d, row, PortReply.fail("down"));
              const expected = d.failure(row.served, "down");
              assert.isTrue(Result.isFailure(both.local));
              assert.isTrue(Result.isFailure(both.served));
              if (Result.isFailure(both.local)) assert.deepStrictEqual(both.local.failure, expected);
              if (Result.isFailure(both.served)) assert.deepStrictEqual(both.served.failure, expected);
              assert.deepStrictEqual(
                withoutInterpreter(both.servedAttributes),
                withoutInterpreter(both.localAttributes),
              );
            }));

          for (const [how, reply] of [
            ["dies", PortReply.die("dead")],
            ["throws", PortReply.throw("dead")],
          ] as const) {
            it.effect(`a store that ${how} is the port's typed error on both, never a defect`, () =>
              Effect.gen(function* () {
                const both = yield* readBoth(d, row, reply);
                const expected = d.defect(row.served, Cause.die("dead"));
                assert.isTrue(Result.isFailure(both.local));
                assert.isTrue(Result.isFailure(both.served));
                for (const result of [both.local, both.served]) {
                  if (!Result.isFailure(result)) continue;
                  // `CustomPredicateError.reason` is `Cause.pretty` of the cause the port
                  // actually died with, which carries span annotations, so it is compared
                  // by what it must say and not byte for byte.
                  if (d.port === "CustomPredicate") {
                    assert.strictEqual(Object.getOwnPropertyDescriptor(result.failure, "_tag")?.value, "CustomPredicateError");
                    assert.include(JSON.stringify(result.failure), "dead");
                  } else {
                    assert.deepStrictEqual(result.failure, expected);
                  }
                }
                assert.deepStrictEqual(
                  withoutInterpreter(both.servedAttributes),
                  withoutInterpreter(both.localAttributes),
                );
              }));
          }

          it.effect("counts once in the asker's own metric and never in the served one", () =>
            Effect.gen(function* () {
              const store = scriptedPort(d, () => PortReply.answer(row.answer)).layer;
              const other = row.interpreter === "evaluate" ? METRIC.toPredicate : METRIC.evaluate;
              const { own, others, served } = yield* isolatedMetrics(
                row.local.pipe(
                  Effect.provide(store),
                  Effect.flatMap(() =>
                    Effect.all({
                      own: Metric.value(METRIC[row.interpreter]),
                      others: Metric.value(other),
                      served: Metric.value(servedPortCallsTotal),
                    }),
                  ),
                ),
              );
              assert.deepStrictEqual(nonZero(own), [[d.port, 1]]);
              assert.deepStrictEqual(nonZero(others), []);
              assert.deepStrictEqual(nonZero(served), []);
            }));
        });
      }
    });
  };

  const RUN: { readonly [K in PortName]: () => void } = {
    AttributeResolver: () => table(PORTS.AttributeResolver, ROWS.AttributeResolver),
    DecisionHistory: () => table(PORTS.DecisionHistory, ROWS.DecisionHistory),
    RelationshipResolver: () => table(PORTS.RelationshipResolver, ROWS.RelationshipResolver),
    CustomPredicate: () => table(PORTS.CustomPredicate, ROWS.CustomPredicate),
    SignatureHistory: () => table(PORTS.SignatureHistory, ROWS.SignatureHistory),
  };
  for (const run of Record.values(RUN)) run();
});

/**
 * "Annotate the question, then validate" (D-07, ADR-QD-077): a resource-scoped
 * read with no usable resource id still leaves a span saying what it was asked,
 * fails with `MissingResourceId`, never reaches the port and counts no call.
 * A missing id leaves only the port span (ADR-QD-134): no nested helper span
 * joins it, on any of the three scoped ports.
 */
describe("a missing resource id still leaves its question on the span (D-07)", () => {
  const alice = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });

  /** The ports whose reads are resource-scoped; a fourth is a compile error in `MISSING`. */
  type ScopedPort = "DecisionHistory" | "RelationshipResolver" | "SignatureHistory";

  interface Missing {
    readonly name: string;
    readonly span: string;
    /** The leaf's own name (event, relation, meaning): what `MissingResourceId.relation` carries. */
    readonly asked: string;
    readonly read: Effect.Effect<unknown, unknown, PortServices>;
    readonly question: Readonly<Record<string, string | number | boolean>>;
  }

  const MISSING: { readonly [K in ScopedPort]: Missing } = {
    DecisionHistory: {
      name: "askActed",
      span: decisionHistoryPort.span,
      asked: "approved",
      read: askActed("evaluate", alice, actedLeaf("approved", "Resource"), undefined),
      question: {
        "qadi.subject_id": "alice",
        "qadi.event": "approved",
        "qadi.scope": "Resource",
        "qadi.interpreter": "evaluate",
      },
    },
    RelationshipResolver: {
      name: "askRelationship",
      span: relationshipResolverPort.span,
      asked: "owner",
      read: askRelationship(alice, relationshipLeaf("owner", 2), undefined),
      question: {
        "qadi.subject_id": "alice",
        "qadi.relation": "owner",
        "qadi.depth": 2,
        "qadi.interpreter": "evaluate",
      },
    },
    SignatureHistory: {
      name: "askSignature",
      span: signatureHistoryPort.span,
      asked: "approved",
      read: askSignature(alice, signatureLeaf("approved", "manager", "Resource"), undefined),
      question: {
        "qadi.subject_id": "alice",
        "qadi.meaning": "approved",
        "qadi.signer_role": "manager",
        "qadi.scope": "Resource",
        "qadi.interpreter": "evaluate",
      },
    },
  };

  for (const row of Record.values(MISSING)) {
    it.effect(row.name, () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        const calls: Array<unknown> = [];
        const portCalls = yield* isolatedMetrics(
          Effect.gen(function* () {
            const result = yield* Effect.result(
              row.read.pipe(
                Effect.provide(
                  Layer.mergeAll(
                    portsLayer({
                      DecisionHistory: scriptedPort(decisionHistoryPort, (query) => {
                        calls.push(query);
                        return undefined;
                      }).layer,
                      RelationshipResolver: scriptedPort(relationshipResolverPort, (request) => {
                        calls.push(request);
                        return undefined;
                      }).layer,
                      SignatureHistory: scriptedPort(signatureHistoryPort, (query) => {
                        calls.push(query);
                        return undefined;
                      }).layer,
                    }),
                    collectingTracer(spans),
                  ),
                ),
              ),
            );
            assert.isTrue(Result.isFailure(result));
            if (Result.isFailure(result)) {
              assert.strictEqual(Object.getOwnPropertyDescriptor(result.failure, "_tag")?.value, "MissingResourceId");
              if (result.failure instanceof MissingResourceId) {
                assert.strictEqual(result.failure.relation, row.asked);
              } else {
                assert.fail("the failure is not a MissingResourceId");
              }
            }
            return yield* Metric.value(portCallsTotal);
          }),
        );
        const attributes = Object.fromEntries(spans.find((s) => s.name === row.span)?.attributes ?? []);
        assert.deepStrictEqual(attributes, row.question);
        assert.deepStrictEqual(spans.map((s) => s.name).sort(), [row.span]);
        assert.deepStrictEqual(calls, []);
        assert.deepStrictEqual(nonZero(portCalls), []);
      }));
  }
});

/**
 * INV-QD-288 holds for the two ports whose request type cannot refuse a missing
 * id (`ActedQuery.resourceId` and `SignatureQuery.resourceId` are optional): a
 * `Resource`-scoped leaf reaches its port only with the id the site's resource
 * holds, and an `Any`-scoped one only without one. The leaf's `scope` decides
 * both what `asks` puts in the request and which read answers it, so this fails
 * if the two ever disagree (a `Resource` leaf asked subject-wide would allow on
 * any resource's history).
 */
describe("a scoped read reaches its port only with the id its leaf's scope calls for (INV-QD-288)", () => {
  const alice = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });

  /** Every shape a site's resource can take: absent, id-less, a non-string id, a usable id. */
  const SITES: ReadonlyArray<{ readonly resource: Record<string, unknown> | undefined; readonly id: string | undefined }> = [
    { resource: undefined, id: undefined },
    { resource: {}, id: undefined },
    { resource: { id: 7 }, id: undefined },
    { resource: { id: { nested: "doc-1" } }, id: undefined },
    { resource: { id: "doc-1" }, id: "doc-1" },
  ];

  for (const scope of ["Resource", "Any"] as const) {
    const reads: ReadonlyArray<
      readonly [string, (resource: Record<string, unknown> | undefined) => Effect.Effect<unknown, unknown, PortServices>]
    > = [
      ["askActed", (resource) => askActed("evaluate", alice, actedLeaf("approved", scope), resource)],
      ["askSignature", (resource) => askSignature(alice, signatureLeaf("approved", "manager", scope), resource)],
    ];
    for (const [name, ask] of reads) {
      it.effect(`${name} at ${scope} scope`, () =>
        Effect.gen(function* () {
          for (const site of SITES) {
            const history = scriptedPort(decisionHistoryPort, () => undefined);
            const signatures = scriptedPort(signatureHistoryPort, () => undefined);
            const result = yield* Effect.result(
              ask(site.resource).pipe(
                Effect.provide(
                  portsLayer({ DecisionHistory: history.layer, SignatureHistory: signatures.layer }),
                ),
              ),
            );
            const calls = [...history.calls, ...signatures.calls].map(([query]) => query.resourceId);
            if (scope === "Any") {
              assert.isTrue(Result.isSuccess(result));
              assert.deepStrictEqual(calls, [undefined]);
            } else if (site.id === undefined) {
              assert.isTrue(Result.isFailure(result));
              assert.deepStrictEqual(calls, []);
            } else {
              assert.isTrue(Result.isSuccess(result));
              assert.deepStrictEqual(calls, [makeResourceId(site.id)]);
            }
          }
        }));
    }
  }
});
