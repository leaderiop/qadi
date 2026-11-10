/**
 * A served read goes through `PortAccess.ts` like any other (ARCH-31 T4,
 * ADR-QD-051, ADR-QD-077): it opens the port's own span with
 * `qadi.interpreter = "remote"`, counts in its own sibling metric, never
 * records an attribute's value (INV-QD-044) and turns a dying store into the
 * port's typed error.
 *
 * Run over every row of the registry: `CASES` is a mapped type over
 * `PortName`, so a port added without a case is a compile error.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Record from "effect/Record";
import * as Result from "effect/Result";
import type * as Tracer from "effect/Tracer";
import { makeSubject } from "../src/AuthSubject.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import { servePortRead } from "../src/PortAccess.ts";
import { PortReply } from "../src/PortDescription.ts";
import { scriptedPort } from "../src/PortDoubles.ts";
import { portCallsTotal, servedPortCallsTotal } from "../src/PortMetrics.ts";
import type { PortName } from "../src/PortMetrics.ts";
import { PORTS } from "../src/Ports.ts";
import type { AnswerOf, ArgsOf, DescriptionOf, PortTypes } from "../src/Ports.ts";
import { collectingTracer, isolatedMetrics } from "./helpers.ts";

const aliceId = makeSubjectId("alice");
const alice = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });
const doc = makeResourceId("doc-1");

interface Case<K extends PortName> {
  readonly args: ArgsOf<PortTypes[K]>;
  readonly answer: AnswerOf<PortTypes[K]>;
  /** The span attributes the read must leave, beyond the interpreter. */
  readonly question: Readonly<Record<string, string | number | boolean>>;
}

/** A value that must never reach a span. */
const SECRET = "the-secret-clearance-value";

const CASES: { readonly [K in PortName]: Case<K> } = {
  AttributeResolver: {
    args: [aliceId, "clearance"],
    answer: SECRET,
    question: { "qadi.subject_id": "alice", "qadi.attribute": "clearance" },
  },
  DecisionHistory: {
    args: [{ subjectId: aliceId, event: "approved", resourceId: doc }],
    answer: "Acted",
    question: {
      "qadi.subject_id": "alice",
      "qadi.event": "approved",
      "qadi.scope": "Resource",
      "qadi.resource_id": "doc-1",
    },
  },
  RelationshipResolver: {
    args: [{ subjectId: aliceId, relation: "owner", resourceId: doc, depth: 2 }],
    answer: "Related",
    question: {
      "qadi.subject_id": "alice",
      "qadi.relation": "owner",
      "qadi.resource_id": "doc-1",
      "qadi.depth": 2,
    },
  },
  CustomPredicate: {
    args: ["isOwner", alice, { id: "doc-1" }, { strict: true }],
    answer: true,
    question: { "qadi.subject_id": "alice", "qadi.custom_predicate": "isOwner" },
  },
  SignatureHistory: {
    args: [{ subjectId: aliceId, resourceId: doc, meaning: "approved", signerRole: "manager" }],
    answer: [{ signerId: aliceId, meaning: "approved", signerRole: "manager", signedAt: 0 }],
    question: {
      "qadi.subject_id": "alice",
      "qadi.scope": "Resource",
      "qadi.resource_id": "doc-1",
      "qadi.meaning": "approved",
      "qadi.signer_role": "manager",
      "qadi.matched": true,
    },
  },
};

const serve = <K extends PortName>(d: DescriptionOf<K>, c: Case<K>) => {
  const answering = scriptedPort(d, () => PortReply.answer(c.answer)).layer;
  const read = servePortRead(d, ...c.args);

  describe(d.port, () => {
    it.effect("opens the port's own span, interpreter remote, naming the question", () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        const answer = yield* read.pipe(
          Effect.provide(Layer.mergeAll(answering, collectingTracer(spans))),
        );
        assert.deepStrictEqual(answer, c.answer);
        const span = spans.find((s) => s.name === d.span);
        assert.isDefined(span);
        const attributes = Object.fromEntries(span?.attributes ?? []);
        assert.strictEqual(attributes["qadi.interpreter"], "remote");
        for (const [key, value] of Object.entries(c.question)) {
          assert.strictEqual(attributes[key], value, key);
        }
      }));

    it.effect("never writes the answer onto the span (INV-QD-044)", () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        yield* read.pipe(Effect.provide(Layer.mergeAll(answering, collectingTracer(spans))));
        const span = spans.find((s) => s.name === d.span);
        assert.notInclude(JSON.stringify(Object.fromEntries(span?.attributes ?? [])), SECRET);
      }));

    it.effect("counts once in the served metric and not in the evaluator's", () =>
      Effect.gen(function* () {
        const { served, evaluator } = yield* isolatedMetrics(
          read.pipe(
            Effect.provide(answering),
            Effect.flatMap(() =>
              Effect.all({
                served: Metric.value(servedPortCallsTotal),
                evaluator: Metric.value(portCallsTotal),
              }),
            ),
          ),
        );
        assert.strictEqual(served.occurrences.get(d.port), 1);
        assert.deepStrictEqual(
          [...evaluator.occurrences].filter(([, count]) => count !== 0),
          [],
        );
      }));

    it.effect("a store that fails surfaces as the port's typed error", () =>
      Effect.gen(function* () {
        const result = yield* Effect.result(
          read.pipe(Effect.provide(scriptedPort(d, () => PortReply.fail("down")).layer)),
        );
        assert.isTrue(Result.isFailure(result));
        if (Result.isFailure(result)) assert.deepStrictEqual(result.failure, d.failure(c.args, "down"));
      }));

    it.effect("a store that dies becomes the port's typed error, never a defect", () =>
      Effect.gen(function* () {
        const result = yield* Effect.result(
          read.pipe(Effect.provide(scriptedPort(d, () => PortReply.die(new Error("boom"))).layer)),
        );
        assert.isTrue(Result.isFailure(result));
        if (Result.isFailure(result)) assert.strictEqual(result.failure._tag, d.failure(c.args, "x")._tag);
      }));
  });
};

describe("a served read (ADR-QD-107)", () => {
  const RUN: { readonly [K in PortName]: () => void } = {
    AttributeResolver: () => serve(PORTS.AttributeResolver, CASES.AttributeResolver),
    DecisionHistory: () => serve(PORTS.DecisionHistory, CASES.DecisionHistory),
    RelationshipResolver: () => serve(PORTS.RelationshipResolver, CASES.RelationshipResolver),
    CustomPredicate: () => serve(PORTS.CustomPredicate, CASES.CustomPredicate),
    SignatureHistory: () => serve(PORTS.SignatureHistory, CASES.SignatureHistory),
  };
  for (const run of Record.values(RUN)) run();

  it("the attribute span says a value came back, never what it was", () => {
    const { attributes } = PORTS.AttributeResolver;
    const args = CASES.AttributeResolver.args;
    assert.deepStrictEqual(attributes.disclose(SECRET, args), { resolved: true });
    assert.deepStrictEqual(attributes.disclose(undefined, args), { resolved: false });
  });

  it("the signature span says whether the requirement matched, and nothing without one", () => {
    const { attributes } = PORTS.SignatureHistory;
    const { args, answer } = CASES.SignatureHistory;
    assert.deepStrictEqual(attributes.disclose(answer, args), { matched: true });
    const [query] = args;
    assert.deepStrictEqual(attributes.disclose(answer, [{ ...query, signerRole: "director" }]), {
      matched: false,
    });
    assert.deepStrictEqual(
      attributes.disclose(answer, [{ subjectId: query.subjectId, resourceId: query.resourceId }]),
      {},
    );
  });
});
