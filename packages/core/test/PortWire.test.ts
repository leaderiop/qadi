/**
 * The wire's totality (ARCH-31, INV-QD-241): an attribute value with a JSON
 * form round-trips, one without is refused and never thrown, and the JSON a
 * wire emits is detached from what it was built from.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import fc from "fast-check";
import { attributeResolverPort } from "../src/AttributeResolver.ts";
import { customPredicatePort } from "../src/CustomPredicate.ts";
import { decisionHistoryPort } from "../src/DecisionHistory.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import { toJson, toJsonRecord } from "../src/JsonHazard.ts";
import { PortWireReply, RemotePortFailure } from "../src/PortWire.ts";
import { relationshipResolverPort } from "../src/RelationshipResolver.ts";
import { signatureHistoryPort } from "../src/SignatureHistory.ts";
import type { SignatureQuery } from "../src/SignatureHistory.ts";

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

/**
 * The exact JSON each port's question puts on a wire (ARCH-69, D-01): pinned so
 * that making `toQuestion` state every member changes no byte. An absent
 * optional member is absent from the JSON, never an `undefined` key.
 */
describe("the wire bytes of a question", () => {
  const alice = makeSubjectId("alice");
  const doc = makeResourceId("doc-1");
  const aliceSubject = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });
  const encoded = (result: Result.Result<unknown, string>) => Result.getOrThrow(result);

  it("an attribute question is its subject and attribute", () => {
    assert.deepStrictEqual(encoded(attributeResolverPort.wire.encodeQuestion([alice, "level"])), {
      subjectId: "alice",
      attribute: "level",
    });
  });

  it("a relationship question carries depth only when it has one", () => {
    const ask = (depth: number | undefined) =>
      encoded(
        relationshipResolverPort.wire.encodeQuestion([
          { subjectId: alice, relation: "owner", resourceId: doc, depth },
        ]),
      );
    assert.deepStrictEqual(ask(undefined), { subjectId: "alice", relation: "owner", resourceId: "doc-1" });
    assert.deepStrictEqual(ask(3), {
      subjectId: "alice",
      relation: "owner",
      resourceId: "doc-1",
      depth: 3,
    });
  });

  it("a history question carries its resource only when it has one", () => {
    const ask = (resourceId: typeof doc | undefined) =>
      encoded(
        decisionHistoryPort.wire.encodeQuestion([{ subjectId: alice, event: "approved", resourceId }]),
      );
    assert.deepStrictEqual(ask(undefined), { subjectId: "alice", event: "approved" });
    assert.deepStrictEqual(ask(doc), { subjectId: "alice", event: "approved", resourceId: "doc-1" });
  });

  it("a signature question carries each optional member only when present", () => {
    const ask = (query: SignatureQuery) =>
      encoded(signatureHistoryPort.wire.encodeQuestion([query]));
    assert.deepStrictEqual(ask({ subjectId: alice, resourceId: undefined }), { subjectId: "alice" });
    assert.deepStrictEqual(
      ask({ subjectId: alice, resourceId: undefined, meaning: undefined, signerRole: undefined }),
      { subjectId: "alice" },
    );
    assert.deepStrictEqual(
      ask({ subjectId: alice, resourceId: doc, meaning: "approved", signerRole: "manager" }),
      { subjectId: "alice", resourceId: "doc-1", meaning: "approved", signerRole: "manager" },
    );
  });

  it("a custom-predicate question carries its resource and params only when present", () => {
    const ask = (resource: { readonly id: string } | undefined, params: unknown) =>
      encoded(customPredicatePort.wire.encodeQuestion(["isOwner", aliceSubject, resource, params]));
    assert.deepStrictEqual(ask(undefined, undefined), { subjectId: "alice", name: "isOwner" });
    assert.deepStrictEqual(ask({ id: "doc-1" }, { strict: true }), {
      subjectId: "alice",
      name: "isOwner",
      resource: { id: "doc-1" },
      params: { strict: true },
    });
  });
});
