import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import type * as Tracer from "effect/Tracer";
import { attributeResolverPort } from "../src/AttributeResolver.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import { customPredicatePort } from "../src/CustomPredicate.ts";
import { decisionHistoryPort } from "../src/DecisionHistory.ts";
import { AttributeResolveError } from "../src/Errors.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import {
  askActedAny,
  askCustom,
  askRelationship,
  askSignature,
  catchPortDefect,
  readAttribute,
  servePortRead,
} from "../src/PortAccess.ts";
import { PortReply } from "../src/PortDescription.ts";
import { scriptedPort } from "../src/PortDoubles.ts";
import { portsLayer } from "../src/Ports.ts";
import { relationshipResolverPort } from "../src/RelationshipResolver.ts";
import { signatureHistoryPort } from "../src/SignatureHistory.ts";
import { collectingTracer } from "./helpers.ts";

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
        readAttribute("evaluate", alice, "level").pipe(
          Effect.provide(portsLayer({ AttributeResolver: port.layer })),
        ),
      );
      assert.deepStrictEqual(error, attributeResolverPort.defect([alice.id, "level"], dying));
    }));

  it.effect("DecisionHistory", () =>
    Effect.gen(function* () {
      const port = scriptedPort(decisionHistoryPort, () => PortReply.throw("dead"));
      const error = yield* failureOf(
        askActedAny("toPredicate", alice, "approved").pipe(
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
        askRelationship(alice, "owner", "doc-1", 3).pipe(
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
        askCustom(alice, { id: "doc-1" }, "isOwner", { strict: true }).pipe(
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
        askSignature(alice, "approved", undefined, "Resource", "doc-1").pipe(
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
    yield* askSignature(alice, "approved", "manager", "Resource", "doc-1").pipe(
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
