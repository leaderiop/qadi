/**
 * The wire's totality (ARCH-31, INV-QD-NEXT): an attribute value with a JSON
 * form round-trips, one without is refused and never thrown, and the JSON a
 * wire emits is detached from what it was built from.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import fc from "fast-check";
import { attributeResolverPort } from "../src/AttributeResolver.ts";
import { customPredicatePort } from "../src/CustomPredicate.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import { toJson, toJsonRecord } from "../src/JsonHazard.ts";
import { PortWireReply, RemotePortFailure } from "../src/PortWire.ts";

const wire = attributeResolverPort.wire;

/** Any JSON value `Schema.Json` admits, as fast-check generates it. */
const jsonValue = fc.jsonValue().map((value) => JSON.parse(JSON.stringify(value)));

describe("an attribute answer", () => {
  it("round-trips any JSON value through text", () => {
    fc.assert(
      fc.property(jsonValue, (value) => {
        const encoded = wire.encodeAnswer(value);
        if (Result.isFailure(encoded)) return false;
        const decoded = wire.decodeAnswer(JSON.parse(JSON.stringify(encoded.success)));
        return Result.isSuccess(decoded) && JSON.stringify(decoded.success) === JSON.stringify(value);
      }),
    );
  });

  it("keeps null (a value a store returned) apart from absent (the fail-closed answer)", () => {
    const asNull = wire.encodeAnswer(null);
    const asAbsent = wire.encodeAnswer(undefined);
    assert.deepStrictEqual(Result.getOrUndefined(asNull), { value: null });
    assert.deepStrictEqual(Result.getOrUndefined(asAbsent), {});
    const readNull = wire.decodeAnswer({ value: null });
    const readAbsent = wire.decodeAnswer({});
    assert.deepStrictEqual(Result.getOrUndefined(readNull), null);
    assert.deepStrictEqual(Result.getOrUndefined(readAbsent), undefined);
  });
});

describe("a value with no JSON form is refused, never thrown", () => {
  const cyclic: Record<string, unknown> = {};
  cyclic["self"] = cyclic;
  const unencodable: ReadonlyArray<readonly [string, unknown]> = [
    ["a Set", new Set([1])],
    ["a Map", new Map([[1, 2]])],
    ["a bigint", 10n],
    ["NaN", Number.NaN],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["a cycle", cyclic],
    ["a class instance with toJSON", { toJSON: () => 1 }],
    ["a function", () => 1],
    ["a symbol", Symbol("s")],
    ["an undefined array element", [undefined]],
    ["a nested Set", { roles: new Set(["a"]) }],
    ["a getter that throws", Object.defineProperty({}, "boom", { enumerable: true, get: () => { throw new Error("no"); } })],
  ];

  for (const [name, value] of unencodable) {
    it(name, () => {
      assert.isTrue(Result.isFailure(wire.encodeAnswer(value)));
      assert.isTrue(Result.isFailure(toJson(value, 64)));
    });
  }

  it("a custom predicate's resource and params are refused the same way", () => {
    const subject = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });
    assert.isTrue(
      Result.isFailure(customPredicatePort.wire.encodeQuestion(["p", subject, { roles: new Set(["a"]) }, undefined])),
    );
    assert.isTrue(
      Result.isFailure(customPredicatePort.wire.encodeQuestion(["p", subject, undefined, new Set(["a"])])),
    );
  });

  it("a value nested past the bound is refused", () => {
    let deep: unknown = 1;
    for (let i = 0; i < 400; i += 1) deep = [deep];
    assert.isTrue(Result.isFailure(toJson(deep, 64)));
  });
});

describe("toJson", () => {
  it("detaches the result: mutating the input afterwards does not change it", () => {
    const input = { a: [1, { b: 2 }], c: "x" };
    const json = Result.getOrThrow(toJson(input, 64));
    input.a.push(3);
    input.c = "y";
    assert.deepStrictEqual(json, { a: [1, { b: 2 }], c: "x" });
  });

  it("drops an undefined property and writes a valid Date as its ISO string", () => {
    const json = Result.getOrThrow(toJson({ a: undefined, d: new Date(0) }, 64));
    assert.deepStrictEqual(json, { d: "1970-01-01T00:00:00.000Z" });
  });

  it("keeps a __proto__ key as a key and leaves the prototype alone", () => {
    const json = Result.getOrThrow(toJson(JSON.parse('{"__proto__": {"admin": true}}'), 64));
    assert.deepStrictEqual(Object.keys(Object(json)), ["__proto__"]);
    assert.strictEqual(Object.getPrototypeOf(Object(json)), Object.prototype);
    assert.isUndefined(Reflect.get(Object.prototype, "admin"));
  });

  it("toJsonRecord builds a record of JSON from a resource", () => {
    assert.deepStrictEqual(Result.getOrThrow(toJsonRecord({ id: "doc", tags: ["x"], none: undefined }, 64)), {
      id: "doc",
      tags: ["x"],
    });
  });
});

describe("the reply union", () => {
  const decode = Schema.decodeUnknownResult(PortWireReply);

  it("reads exactly the three replies", () => {
    assert.isTrue(Result.isSuccess(decode({ _tag: "Answered", answer: null })));
    assert.isTrue(Result.isSuccess(decode({ _tag: "Unavailable" })));
    assert.isTrue(Result.isSuccess(decode({ _tag: "Refused", reason: "NotServed" })));
  });

  it("refuses a reply of another shape, or a refusal it does not know", () => {
    assert.isTrue(Result.isFailure(decode({ _tag: "Refused", reason: "Because" })));
    assert.isTrue(Result.isFailure(decode({ related: "Related" })));
    assert.isTrue(Result.isFailure(decode(undefined)));
  });

  it("carries no cause: an Unavailable reply has nothing but its tag", () => {
    assert.deepStrictEqual(Object.keys(RemotePortFailure.Unavailable()), ["_tag"]);
  });
});
