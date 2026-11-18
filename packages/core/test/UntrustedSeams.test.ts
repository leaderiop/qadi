/**
 * Refusal-precedence tables for core's untrusted seams (ADR-QD-143, BEH-QD-486,
 * BEH-QD-487): one `describe` per seam, each row the kind that seam refuses one
 * input as. The depth guard runs before anything else reads the input, and text
 * that does not parse is `NotJson`, never a schema failure.
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
  decodeSinkRecordWithJson,
  decodeStoredRecord,
  decodeStoredRecordString,
} from "../src/SinkCodec.ts";
import type { DecodeRefusal } from "../src/SinkWire.ts";
import { MAX_DECODE_DEPTH } from "../src/UntrustedDecode.ts";
import * as V2 from "./fixtures/sinkWireV2.ts";

const OVER = MAX_DECODE_DEPTH + 10;

/** What the strict decode says for an excess key `rloe`, as the strict decode prints it. */
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

/** The text of `nested(levels)`, built by concatenation: `JSON.stringify` recurses and cannot take 60,000 levels. */
const deepText = (levels: number): string =>
  '{"inner":'.repeat(levels) + '{"leaf":true}' + "}".repeat(levels);

/** The text of `validRecord()` with one more top-level member, written as JSON text so a deep or `__proto__` member never goes through `JSON.stringify`. */
const recordText = (extraJson: string): string => `${JSON.stringify(validRecord()).slice(0, -1)},${extraJson}}`;

/** The refusal a decode result carries, or `undefined` when it accepts. */
const refusalIn = (
  result: Result.Result<unknown, { readonly refusal: DecodeRefusal }>,
): DecodeRefusal | undefined =>
  Result.match(result, { onSuccess: () => undefined, onFailure: (error) => error.refusal });

/** What the three record-wire entry points say for one input, as value and as text; `undefined` text skips the text path. */
const wireRefusals = (value: unknown, text: string | undefined): ReadonlyArray<DecodeRefusal | undefined> => [
  refusalIn(decodeSinkRecord(value)),
  refusalIn(decodeSinkRecordWithJson(value)),
  ...(text === undefined ? [] : [refusalIn(decodeSinkRecordString(text))]),
];

/** What the two stored-envelope readers say for one input, as value and as text; `undefined` text skips the text path. */
const storedRefusals = (value: unknown, text: string | undefined): ReadonlyArray<DecodeRefusal | undefined> => [
  refusalIn(decodeStoredRecord(value)),
  ...(text === undefined ? [] : [refusalIn(decodeStoredRecordString(text))]),
];

/** The version an `UnsupportedVersion` refusal carries, or a marker when the refusal is another kind. */
const versionOf = (refusal: DecodeRefusal | undefined): unknown =>
  refusal?._tag === "UnsupportedVersion" ? refusal.version : "?";

/** The message a `Malformed` refusal carries, or a marker when the refusal is another kind. */
const messageOf = (refusal: DecodeRefusal | undefined): unknown =>
  refusal?._tag === "Malformed" ? refusal.message : "?";

/** What the record wire's union says for a value that is no record of any `_tag`, as the strict decode prints it. */
const WIRE_UNION_MESSAGE =
  'Expected { readonly "_tag": "Decision", readonly "version": 2, ... } | { readonly "_tag": "Obligations", readonly "version": 2, ... }';

describe("Policy.fromJson", () => {
  it.effect("valid text -> success", () =>
    Effect.gen(function* () {
      const policy = yield* P.fromJson('{"_tag":"HasRole","role":"admin"}');
      assert.strictEqual(policy._tag, "HasRole");
    }));

  it.effect("`}{` -> PolicyNotJson", () =>
    Effect.gen(function* () {
      const failure = yield* failureOf(P.fromJson("}{"));
      assert.strictEqual(failure?._tag, "PolicyNotJson");
    }));

  it.effect(
    "a 60,000-deep text missing its final brace -> PolicyNotJson, no throw on construction or run",
    () =>
      Effect.gen(function* () {
        const malformed = deeplyNestedNot(60_000).slice(0, -1);
        let effect: Effect.Effect<P.Policy, unknown> | undefined;
        assert.doesNotThrow(() => {
          effect = P.fromJson(malformed);
        });
        if (effect === undefined) return assert.fail("fromJson did not return an effect");
        const failure = yield* failureOf(effect);
        assert.strictEqual(Reflect.get(Object(failure), "_tag"), "PolicyNotJson");
      }),
    60_000,
  );

  it.effect("the deepest `Not` nesting the guard admits -> success", () =>
    Effect.gen(function* () {
      const text = deeplyNestedNot(MAX_DECODE_DEPTH - 1);
      assert.isFalse(exceedsJsonDepth(JSON.parse(text), MAX_DECODE_DEPTH));
      const policy = yield* P.fromJson(text);
      assert.strictEqual(policy._tag, "Not");
    }));

  it.effect("one level deeper than the guard admits -> PolicyDecodeTooDeep naming 256", () =>
    Effect.gen(function* () {
      const text = deeplyNestedNot(MAX_DECODE_DEPTH);
      assert.isTrue(exceedsJsonDepth(JSON.parse(text), MAX_DECODE_DEPTH));
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

  it("an unknown envelope key whose value is nested past the bound -> success, not walked (D-01)", () => {
    assert.isTrue(Result.isSuccess(decodeSinkRecord(recordWith({ addedLater: nested(OVER) }))));
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

describe("the record wire per policy: ignore (KEYP-05, D-11)", () => {
  it("R1 a valid version-2 record -> success on all three entry points", () => {
    for (const refusal of wireRefusals(validRecord(), JSON.stringify(validRecord()))) assert.isUndefined(refusal);
  });

  it("R2 a shallow unknown top-level key -> success on all three entry points", () => {
    const text = recordText('"addedLater":"x"');
    for (const refusal of wireRefusals(recordWith({ addedLater: "x" }), text)) assert.isUndefined(refusal);
  });

  it("R6 a declared resource nested past the bound and version 3 -> TooDeep naming 256 (the guard before the version, D-04)", () => {
    const value = recordWith({ version: 3, resource: nested(OVER) });
    const text = JSON.stringify(value);
    for (const refusal of wireRefusals(value, text)) {
      assert.deepStrictEqual(refusal, { _tag: "TooDeep", maxDepth: 256 });
    }
  });

  it("R7 an excess key inside the policy -> Malformed at policy.sneaky", () => {
    const policy = { _tag: "HasPermission", permission: { resource: "doc", action: "read" }, sneaky: 1 };
    for (const refusal of wireRefusals(recordWith({ policy }), JSON.stringify(recordWith({ policy })))) {
      assert.strictEqual(messageOf(refusal), "Expected no excess property\n  at [\"policy\"][\"sneaky\"]");
    }
  });

  it("R8 5, null and [] -> Malformed with the union's message", () => {
    for (const text of ["5", "null", "[]"]) {
      for (const refusal of wireRefusals(JSON.parse(text), text)) {
        assert.strictEqual(messageOf(refusal), WIRE_UNION_MESSAGE);
      }
    }
  });

  it("R9 {} -> UnsupportedVersion carrying undefined", () => {
    for (const refusal of wireRefusals({}, "{}")) {
      assert.strictEqual(refusal?._tag, "UnsupportedVersion");
      assert.isUndefined(versionOf(refusal));
    }
  });

  it("R10 an unknown _tag beside an unknown key -> Malformed with the union's message", () => {
    const value = recordWith({ _tag: "Nope", addedLater: 1 });
    for (const refusal of wireRefusals(value, JSON.stringify(value))) {
      assert.strictEqual(messageOf(refusal), WIRE_UNION_MESSAGE);
    }
  });

  it("R11 no _tag -> Malformed, missing _tag", () => {
    const { _tag: _omitted, ...untagged } = validRecord();
    for (const refusal of wireRefusals(untagged, JSON.stringify(untagged))) {
      assert.strictEqual(messageOf(refusal), 'Missing key\n  at ["_tag"]\nExpected no excess property\n  at ["policy"]');
    }
  });

  it("R12 an Obligations record carrying a Decision-only key -> success", () => {
    const value = { ...JSON.parse(V2.V2_OBLIGATIONS), policy: validRecord().policy };
    for (const refusal of wireRefusals(value, JSON.stringify(value))) assert.isUndefined(refusal);
  });

  it("R13 an inherited version -> UnsupportedVersion carrying undefined (value paths only)", () => {
    const { version: _version, ...unversioned } = validRecord();
    const inherited: object = Object.assign(Object.create({ version: 2 }), unversioned);
    for (const refusal of wireRefusals(inherited, undefined)) {
      assert.strictEqual(refusal?._tag, "UnsupportedVersion");
      assert.isUndefined(versionOf(refusal));
    }
  });

  it("R3 an unknown top-level key 266 deep -> success on all three entry points (D-01)", () => {
    const text = recordText(`"addedLater":${deepText(OVER)}`);
    for (const refusal of wireRefusals(recordWith({ addedLater: nested(OVER) }), text)) assert.isUndefined(refusal);
  });

  it("R4 an unknown top-level key 60,000 deep -> success, no throw (D-01)", () => {
    const text = recordText(`"addedLater":${deepText(60_000)}`);
    let refusals: ReadonlyArray<DecodeRefusal | undefined> = [];
    assert.doesNotThrow(() => {
      refusals = wireRefusals(recordWith({ addedLater: nested(60_000) }), text);
    });
    assert.strictEqual(refusals.length, 3);
    for (const refusal of refusals) assert.isUndefined(refusal);
  });

  it("R5 a deep unknown key and version 3 -> UnsupportedVersion carrying 3 (D-01)", () => {
    const text = recordText(`"version":3,"addedLater":${deepText(OVER)}`);
    for (const refusal of wireRefusals(recordWith({ version: 3, addedLater: nested(OVER) }), text)) {
      assert.strictEqual(refusal?._tag, "UnsupportedVersion");
      assert.strictEqual(versionOf(refusal), 3);
    }
  });

  it("R14 an own __proto__ key holding a value 266 deep -> success (D-01)", () => {
    const text = recordText(`"__proto__":${deepText(OVER)}`);
    for (const refusal of wireRefusals(JSON.parse(text), text)) assert.isUndefined(refusal);
  });
});

describe("the stored envelope per policy: ignore (KEYP-05, D-11)", () => {
  const stored = (extra: object = {}) => ({ environment: "prod", record: validRecord(), ...extra });

  it("S1 a valid envelope -> success", () => {
    for (const refusal of storedRefusals(stored(), JSON.stringify(stored()))) assert.isUndefined(refusal);
  });

  it("S2 a shallow unknown key -> success", () => {
    const value = stored({ addedLater: "x" });
    for (const refusal of storedRefusals(value, JSON.stringify(value))) assert.isUndefined(refusal);
  });

  it("S3 an unknown key 266 deep -> success", () => {
    const value = stored({ addedLater: nested(OVER) });
    for (const refusal of storedRefusals(value, JSON.stringify(value))) assert.isUndefined(refusal);
  });

  it("S4 an unknown key 60,000 deep -> success, no throw", () => {
    const text = `{"environment":"prod","record":${JSON.stringify(validRecord())},"addedLater":${deepText(60_000)}}`;
    let refusals: ReadonlyArray<DecodeRefusal | undefined> = [];
    assert.doesNotThrow(() => {
      refusals = storedRefusals(stored({ addedLater: nested(60_000) }), text);
    });
    assert.strictEqual(refusals.length, 2);
    for (const refusal of refusals) assert.isUndefined(refusal);
  });

  it("S5 an excess key in the record's policy -> Malformed at policy.sneaky", () => {
    const policy = { _tag: "HasPermission", permission: { resource: "doc", action: "read" }, sneaky: 1 };
    const value = { environment: "prod", record: recordWith({ policy }) };
    for (const refusal of storedRefusals(value, JSON.stringify(value))) {
      assert.strictEqual(messageOf(refusal), "Expected no excess property\n  at [\"policy\"][\"sneaky\"]");
    }
  });

  it("S6 the record's resource nested past the bound -> TooDeep naming 256", () => {
    const value = { environment: "prod", record: recordWith({ resource: nested(OVER) }) };
    for (const refusal of storedRefusals(value, JSON.stringify(value))) {
      assert.deepStrictEqual(refusal, { _tag: "TooDeep", maxDepth: 256 });
    }
  });

  it("S7 every envelope refusal is Malformed", () => {
    const record = validRecord();
    const texts = [
      "5",
      "null",
      "[]",
      '"text"',
      "{}",
      '{"cursor":"x"}',
      JSON.stringify(record),
      '{"environment":"E"}',
      JSON.stringify({ record }),
      JSON.stringify({ environment: 1, record }),
    ];
    for (const text of texts) {
      for (const refusal of storedRefusals(JSON.parse(text), text)) assert.strictEqual(refusal?._tag, "Malformed");
    }
    const inherited: object = Object.assign(Object.create({ environment: "E" }), { record });
    for (const refusal of storedRefusals(inherited, undefined)) assert.strictEqual(refusal?._tag, "Malformed");
  });

  it("S8 record null -> Malformed", () => {
    const value = { environment: "E", record: null };
    for (const refusal of storedRefusals(value, JSON.stringify(value))) {
      assert.strictEqual(messageOf(refusal), WIRE_UNION_MESSAGE);
    }
  });

  it("S9 text that is not JSON -> NotJson", () => {
    assert.strictEqual(refusalIn(decodeStoredRecordString("{not json"))?._tag, "NotJson");
  });

  it("S10 5, null, [] and a string -> Malformed, expected object (D-17)", () => {
    for (const text of ["5", "null", "[]", '"text"']) {
      for (const refusal of storedRefusals(JSON.parse(text), text)) assert.strictEqual(messageOf(refusal), "Expected object");
    }
  });

  it("S11 {}, { cursor } and a bare record -> Malformed, missing environment (D-17)", () => {
    for (const text of ["{}", '{"cursor":"x"}', JSON.stringify(validRecord())]) {
      for (const refusal of storedRefusals(JSON.parse(text), text)) {
        assert.strictEqual(messageOf(refusal), "Missing key\n  at [\"environment\"]");
      }
    }
  });

  it("S12 { environment } with no record -> Malformed, missing record (D-17)", () => {
    const text = '{"environment":"E"}';
    for (const refusal of storedRefusals(JSON.parse(text), text)) {
      assert.strictEqual(messageOf(refusal), "Missing key\n  at [\"record\"]");
    }
  });

  it("S13 { record } and an inherited environment -> Malformed, missing environment (D-17)", () => {
    const record = validRecord();
    const text = JSON.stringify({ record });
    for (const refusal of storedRefusals(JSON.parse(text), text)) {
      assert.strictEqual(messageOf(refusal), "Missing key\n  at [\"environment\"]");
    }
    const inherited: object = Object.assign(Object.create({ environment: "E" }), { record });
    for (const refusal of storedRefusals(inherited, undefined)) {
      assert.strictEqual(messageOf(refusal), "Missing key\n  at [\"environment\"]");
    }
  });

  it("S14 { environment: 1, record } -> Malformed, environment not a string (D-17)", () => {
    const value = { environment: 1, record: validRecord() };
    for (const refusal of storedRefusals(value, JSON.stringify(value))) {
      assert.strictEqual(messageOf(refusal), "Expected string\n  at [\"environment\"]");
    }
  });

  it("S15 an environment nested past the bound -> TooDeep naming 256 (D-18)", () => {
    const value = { environment: nested(OVER), record: validRecord() };
    for (const refusal of storedRefusals(value, JSON.stringify(value))) {
      assert.deepStrictEqual(refusal, { _tag: "TooDeep", maxDepth: 256 });
    }
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
