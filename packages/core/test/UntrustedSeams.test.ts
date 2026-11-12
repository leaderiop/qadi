/**
 * Phase 30's refusal-precedence tables for core's untrusted seams, written green
 * on the phase base (D-13): one `describe` per seam, each row the kind that seam
 * reports for one input today. A row marked `flips in 30-0N` changes kind in that
 * plan's commit, which names it; every other row must stay green through the phase.
 *
 * Characterisation, not intent: where a row's first draft disagreed with the base,
 * the row says what the base returns (the plan's SUMMARY records each such row).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { AttributeResolveError } from "../src/Errors.ts";
import { attributeResolverPort } from "../src/AttributeResolver.ts";
import { exceedsJsonDepth } from "../src/DecodeDepthGuard.ts";
import { makeSubjectId } from "../src/Identity.ts";
import * as P from "../src/Policy.ts";
import { askRemotely } from "../src/PortRemote.ts";
import { RemotePortError, RemotePortFailure } from "../src/PortWire.ts";
import {
  decodeSinkRecord,
  decodeSinkRecordString,
  decodeStoredRecord,
} from "../src/SinkCodec.ts";
import * as V2 from "./fixtures/sinkWireV2.ts";

const OVER = P.MAX_DECODE_DEPTH + 10;

/** What the strict decode says for an excess key `rloe`, as the base prints it. */
const EXCESS_RLOE = 'Expected no excess property\n  at ["rloe"]';

/** `n` levels of `Not` around a leaf, as JSON text. */
const deeplyNestedNot = (n: number): string => {
  let json = "";
  for (let i = 0; i < n; i++) json += '{"_tag":"Not","policy":';
  json += '{"_tag":"HasRole","role":"x"}';
  json += "}".repeat(n);
  return json;
};

/** An object `levels` deep, built without recursion so 60,000 levels cannot overflow the test itself. */
const nested = (levels: number): unknown => {
  let value: unknown = { leaf: true };
  for (let i = 0; i < levels; i++) value = { inner: value };
  return value;
};

/** The failure an effect ends in, or `undefined` when it succeeds. */
const failureOf = <A, E>(effect: Effect.Effect<A, E>) =>
  Effect.map(Effect.result(effect), (result) => (result._tag === "Failure" ? result.failure : undefined));

/** The refusal `decodeSinkRecord` gives, or `undefined` when it accepts. */
const sinkRefusalOf = (input: unknown) =>
  Result.match(decodeSinkRecord(input), { onSuccess: () => undefined, onFailure: (error) => error.refusal });

/** The wire form of a valid version-2 record. */
const validRecord = (): Record<string, unknown> => JSON.parse(V2.V2_DECIDED_DENY);

/** The wire form with `extra` merged in. */
const recordWith = (extra: Record<string, unknown>): unknown => ({ ...validRecord(), ...extra });

describe("Policy.fromJson", () => {
  it.effect("valid text -> success", () =>
    Effect.gen(function* () {
      const policy = yield* P.fromJson('{"_tag":"HasRole","role":"admin"}');
      assert.strictEqual(policy._tag, "HasRole");
    }));

  it.effect("`}{` -> SchemaError (flips in 30-02: PolicyNotJson)", () =>
    Effect.gen(function* () {
      const failure = yield* failureOf(P.fromJson("}{"));
      assert.strictEqual(failure?._tag, "SchemaError");
    }));

  it.effect(
    "a 60,000-deep text missing its final brace -> SchemaError, no throw on construction or run (flips in 30-02: PolicyNotJson)",
    () =>
      Effect.gen(function* () {
        const malformed = deeplyNestedNot(60_000).slice(0, -1);
        let effect: Effect.Effect<P.Policy, unknown> | undefined;
        assert.doesNotThrow(() => {
          effect = P.fromJson(malformed);
        });
        if (effect === undefined) return assert.fail("fromJson did not return an effect");
        const failure = yield* failureOf(effect);
        assert.strictEqual(Reflect.get(Object(failure), "_tag"), "SchemaError");
      }),
    60_000,
  );

  it.effect("the deepest `Not` nesting the guard admits -> success", () =>
    Effect.gen(function* () {
      const text = deeplyNestedNot(P.MAX_DECODE_DEPTH - 1);
      assert.isFalse(exceedsJsonDepth(JSON.parse(text), P.MAX_DECODE_DEPTH));
      const policy = yield* P.fromJson(text);
      assert.strictEqual(policy._tag, "Not");
    }));

  it.effect("one level deeper than the guard admits -> PolicyDecodeTooDeep naming 256", () =>
    Effect.gen(function* () {
      const text = deeplyNestedNot(P.MAX_DECODE_DEPTH);
      assert.isTrue(exceedsJsonDepth(JSON.parse(text), P.MAX_DECODE_DEPTH));
      const failure = yield* failureOf(P.fromJson(text));
      assert.strictEqual(failure?._tag, "PolicyDecodeTooDeep");
      assert.strictEqual(failure instanceof P.PolicyDecodeTooDeep ? failure.maxDepth : undefined, 256);
    }));

  it.effect("an excess key -> SchemaError", () =>
    Effect.gen(function* () {
      const failure = yield* failureOf(
        P.fromJson('{"_tag":"HasRole","role":"admin","rloe":"admin"}'),
      );
      assert.strictEqual(failure?._tag, "SchemaError");
    }));

  it.effect("nested past the bound and an excess key at the root -> PolicyDecodeTooDeep (the guard runs first)", () =>
    Effect.gen(function* () {
      const root: Record<string, unknown> = JSON.parse(deeplyNestedNot(OVER));
      root["sneaky"] = 1;
      const failure = yield* failureOf(P.fromJson(JSON.stringify(root)));
      assert.strictEqual(failure?._tag, "PolicyDecodeTooDeep");
    }));

  it.effect('the text "null" -> SchemaError', () =>
    Effect.gen(function* () {
      const failure = yield* failureOf(P.fromJson("null"));
      assert.strictEqual(failure?._tag, "SchemaError");
    }));
});

describe("Policy.fromJsonValue", () => {
  it.effect("a valid value -> success", () =>
    Effect.gen(function* () {
      const policy = yield* P.fromJsonValue({ _tag: "HasRole", role: "admin" });
      assert.strictEqual(policy._tag, "HasRole");
    }));

  it.effect("nested past the bound -> PolicyDecodeTooDeep naming 256", () =>
    Effect.gen(function* () {
      const failure = yield* failureOf(P.fromJsonValue(JSON.parse(deeplyNestedNot(OVER))));
      assert.strictEqual(failure?._tag, "PolicyDecodeTooDeep");
      assert.strictEqual(failure instanceof P.PolicyDecodeTooDeep ? failure.maxDepth : undefined, 256);
    }));

  it.effect("an excess key -> SchemaError", () =>
    Effect.gen(function* () {
      const failure = yield* failureOf(
        P.fromJsonValue({ _tag: "HasRole", role: "admin", rloe: "admin" }),
      );
      assert.strictEqual(failure?._tag, "SchemaError");
    }));

  it.effect("null -> SchemaError", () =>
    Effect.gen(function* () {
      const failure = yield* failureOf(P.fromJsonValue(null));
      assert.strictEqual(failure?._tag, "SchemaError");
    }));

  it.effect("{} -> SchemaError", () =>
    Effect.gen(function* () {
      const failure = yield* failureOf(P.fromJsonValue({}));
      assert.strictEqual(failure?._tag, "SchemaError");
    }));
});

describe("decodeSinkRecord", () => {
  it("a valid version-2 record -> success", () => {
    assert.isTrue(Result.isSuccess(decodeSinkRecord(validRecord())));
  });

  it("a resource value nested past the bound -> TooDeep naming 256", () => {
    const refusal = sinkRefusalOf(recordWith({ resource: nested(OVER) }));
    assert.deepStrictEqual(refusal, { _tag: "TooDeep", maxDepth: 256 });
  });

  it("nested past the bound and version 3 -> TooDeep (the guard runs before the version)", () => {
    assert.strictEqual(sinkRefusalOf(recordWith({ version: 3, resource: nested(OVER) }))?._tag, "TooDeep");
  });

  it("version 3 -> UnsupportedVersion carrying 3", () => {
    const refusal = sinkRefusalOf(recordWith({ version: 3 }));
    assert.strictEqual(refusal?._tag, "UnsupportedVersion");
    assert.strictEqual(refusal?._tag === "UnsupportedVersion" ? refusal.version : "?", 3);
  });

  it("no version -> UnsupportedVersion carrying undefined", () => {
    const { version: _version, ...unversioned } = validRecord();
    const refusal = sinkRefusalOf(unversioned);
    assert.strictEqual(refusal?._tag, "UnsupportedVersion");
    assert.isUndefined(refusal?._tag === "UnsupportedVersion" ? refusal.version : "?");
  });

  it("a shallow unknown top-level envelope key -> success (ADR-QD-096 D-15-c)", () => {
    assert.isTrue(Result.isSuccess(decodeSinkRecord(recordWith({ addedLater: "x" }))));
  });

  it("an unknown envelope key whose value is nested past the bound -> TooDeep", () => {
    assert.strictEqual(sinkRefusalOf(recordWith({ addedLater: nested(OVER) }))?._tag, "TooDeep");
  });

  it("an excess key inside the embedded policy -> Malformed", () => {
    const policy = { _tag: "HasPermission", permission: { resource: "doc", action: "read" }, sneaky: 1 };
    assert.strictEqual(sinkRefusalOf(recordWith({ policy }))?._tag, "Malformed");
  });

  it("5 -> Malformed", () => {
    assert.strictEqual(sinkRefusalOf(5)?._tag, "Malformed");
  });

  it("null -> Malformed", () => {
    assert.strictEqual(sinkRefusalOf(null)?._tag, "Malformed");
  });

  it("[] -> Malformed", () => {
    assert.strictEqual(sinkRefusalOf([])?._tag, "Malformed");
  });

  it("{} -> UnsupportedVersion carrying undefined", () => {
    const refusal = sinkRefusalOf({});
    assert.strictEqual(refusal?._tag, "UnsupportedVersion");
    assert.isUndefined(refusal?._tag === "UnsupportedVersion" ? refusal.version : "?");
  });
});

describe("decodeSinkRecordString", () => {
  const refusalOfText = (text: string) =>
    Result.match(decodeSinkRecordString(text), { onSuccess: () => undefined, onFailure: (error) => error.refusal });

  it("`}{` -> NotJson", () => {
    assert.strictEqual(refusalOfText("}{")?._tag, "NotJson");
  });

  it("a valid record's text -> success", () => {
    assert.isTrue(Result.isSuccess(decodeSinkRecordString(V2.V2_DECIDED_DENY)));
  });

  it("the text of a record nested past the bound -> TooDeep", () => {
    assert.strictEqual(
      refusalOfText(JSON.stringify(recordWith({ resource: nested(OVER) })))?._tag,
      "TooDeep",
    );
  });
});

describe("decodeStoredRecord", () => {
  it("a stored envelope with a shallow unknown key -> success", () => {
    const stored = { environment: "prod", record: validRecord(), addedLater: "x" };
    assert.isTrue(Result.isSuccess(decodeStoredRecord(stored)));
  });

  it("a stored envelope whose unknown key holds a 60,000-deep value -> success, no throw (the envelope is not walked)", () => {
    const stored = { environment: "prod", record: validRecord(), addedLater: nested(60_000) };
    let result: ReturnType<typeof decodeStoredRecord> | undefined;
    assert.doesNotThrow(() => {
      result = decodeStoredRecord(stored);
    });
    assert.isTrue(result !== undefined && Result.isSuccess(result));
  });
});

describe("decodeQuestion", () => {
  const { decodeQuestion } = attributeResolverPort.wire;
  const sentence = "the question nests deeper than the decode bound";
  const message = (input: unknown): string | undefined => {
    const decoded = decodeQuestion(input);
    return Result.isFailure(decoded) ? decoded.failure : undefined;
  };
  const question = { subjectId: "alice", attribute: "dept" };

  it("a valid question -> success", () => {
    assert.isTrue(Result.isSuccess(decodeQuestion(question)));
  });

  it("nested past the bound -> exactly the too-deep sentence", () => {
    assert.strictEqual(message({ ...question, extra: nested(OVER) }), sentence);
  });

  it("an excess key -> the schema's own message", () => {
    assert.strictEqual(message({ ...question, rloe: 1 }), EXCESS_RLOE);
  });

  it("60,000 deep -> the too-deep sentence, no throw", () => {
    let said: string | undefined;
    assert.doesNotThrow(() => {
      said = message({ ...question, extra: nested(60_000) });
    });
    assert.strictEqual(said, sentence);
  });
});

describe("decodeAnswer", () => {
  const { decodeAnswer } = attributeResolverPort.wire;
  const sentence = "the answer nests deeper than the decode bound";
  const message = (input: unknown): string | undefined => {
    const decoded = decodeAnswer(input);
    return Result.isFailure(decoded) ? decoded.failure : undefined;
  };

  it("a valid answer -> success", () => {
    assert.isTrue(Result.isSuccess(decodeAnswer({ value: "eng" })));
  });

  it("nested past the bound -> exactly the too-deep sentence", () => {
    assert.strictEqual(message({ value: nested(OVER) }), sentence);
  });

  it("an excess key -> the schema's own message", () => {
    assert.strictEqual(message({ value: "eng", rloe: 1 }), EXCESS_RLOE);
  });

  it("60,000 deep -> the too-deep sentence, no throw", () => {
    let said: string | undefined;
    assert.doesNotThrow(() => {
      said = message({ value: nested(60_000) });
    });
    assert.strictEqual(said, sentence);
  });
});

describe("askRemotely reply", () => {
  const alice = makeSubjectId("alice");

  /** Asks the attribute port, through a `send` that returns `reply`, and reads back what it fails with. */
  const askWith = (reply: unknown) =>
    Effect.gen(function* () {
      const shape = askRemotely(attributeResolverPort, () => Effect.succeed(reply));
      const error = yield* Effect.flip(attributeResolverPort.invoke(shape)(alice, "dept"));
      assert.isTrue(error instanceof AttributeResolveError);
      const cause = error instanceof AttributeResolveError ? error.cause : undefined;
      assert.isTrue(cause instanceof RemotePortError);
      return cause instanceof RemotePortError ? cause.failure : undefined;
    });

  it.effect("a reply nested past the bound -> Undecodable with exactly the too-deep sentence", () =>
    Effect.gen(function* () {
      const failure = yield* askWith({ _tag: "Answered", answer: nested(OVER) });
      assert.deepStrictEqual(
        failure,
        RemotePortFailure.Undecodable({ message: "the reply nests deeper than the decode bound" }),
      );
    }));

  it.effect("a reply with an excess key -> Undecodable with the schema's own message", () =>
    Effect.gen(function* () {
      const failure = yield* askWith({ _tag: "Answered", answer: {}, rloe: 1 });
      assert.deepStrictEqual(failure, RemotePortFailure.Undecodable({ message: EXCESS_RLOE }));
    }));

  it.effect("a valid reply -> the answer", () =>
    Effect.gen(function* () {
      const shape = askRemotely(attributeResolverPort, () =>
        Effect.succeed({ _tag: "Answered", answer: { value: "eng" } }),
      );
      const answer = yield* attributeResolverPort.invoke(shape)(alice, "dept");
      assert.strictEqual(answer, "eng");
    }));
});
