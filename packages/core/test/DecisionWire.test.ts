import { assert, describe, it } from "@effect/vitest";
import * as Schema from "effect/Schema";
import { Allow, Deny } from "../src/Decision.ts";
import { decodeDecision, DecisionWire, encodeDecision } from "../src/DecisionWire.ts";
import { makeSubjectId } from "../src/Identity.ts";
import { UNTRUSTED_DECODE_OPTIONS } from "../src/Policy.ts";
import { obligation } from "../src/Obligation.ts";

const trace = (allowed: boolean) => ({
  policyTag: "HasRole" as const,
  allowed,
  children: [],
  obligations: [],
});

const allow = (visibleFields: ReadonlyArray<string> | undefined) =>
  new Allow({
    evaluationId: "e1",
    subjectId: makeSubjectId("u1"),
    durationMillis: 4,
    trace: trace(true),
    visibleFields,
    obligations: [obligation("audit.log")],
  });

const deny = new Deny({
  evaluationId: "e2",
  subjectId: makeSubjectId("u1"),
  durationMillis: 1,
  trace: { ...trace(false), reason: "no" },
  reason: "no",
});

describe("encodeDecision", () => {
  it("omits visibleFields when they are undefined (INV-QD-004: top)", () => {
    const wire = encodeDecision(allow(undefined));
    assert.isFalse(Object.hasOwn(wire, "visibleFields"));
    assert.strictEqual(wire._tag, "Allow");
  });

  it("keeps an empty visibleFields array (INV-QD-004: bottom is not top)", () => {
    const wire = encodeDecision(allow([]));
    assert.deepStrictEqual(wire._tag === "Allow" ? wire.visibleFields : undefined, []);
  });

  it("ships a Deny's reason and an empty obligations array", () => {
    const wire = encodeDecision(deny);
    assert.strictEqual(wire._tag, "Deny");
    assert.strictEqual(wire._tag === "Deny" ? wire.reason : undefined, "no");
    assert.deepStrictEqual(wire.obligations, []);
    assert.isFalse(Object.hasOwn(wire, "visibleFields"));
  });

  it("an Allow carries no reason", () => {
    assert.isFalse(Object.hasOwn(encodeDecision(allow(["id"])), "reason"));
  });
});

describe("decodeDecision(encodeDecision(d))", () => {
  it("round-trips an Allow with every field visible", () => {
    const d = allow(undefined);
    assert.deepStrictEqual(decodeDecision(encodeDecision(d)), d);
  });

  it("round-trips an Allow with no field visible", () => {
    const d = allow([]);
    assert.deepStrictEqual(decodeDecision(encodeDecision(d)), d);
  });

  it("round-trips an Allow with some fields visible", () => {
    const d = allow(["id", "title"]);
    assert.deepStrictEqual(decodeDecision(encodeDecision(d)), d);
  });

  it("round-trips a Deny", () => {
    assert.deepStrictEqual(decodeDecision(encodeDecision(deny)), deny);
  });

  it("survives JSON and the schema", () => {
    const wire = Schema.decodeUnknownSync(DecisionWire)(
      JSON.parse(JSON.stringify(encodeDecision(deny))),
    );
    assert.deepStrictEqual(decodeDecision(wire), deny);
  });
});

describe("DecisionWire is a tagged union", () => {
  const decode = Schema.decodeUnknownExit(DecisionWire, UNTRUSTED_DECODE_OPTIONS);
  const base = {
    evaluationId: "e",
    subjectId: "u1",
    durationMillis: 1,
    obligations: [],
  };

  it("refuses a Deny that has no reason", () => {
    assert.strictEqual(decode({ ...base, _tag: "Deny", trace: trace(false) })._tag, "Failure");
  });

  it("refuses an Allow that carries a reason", () => {
    assert.strictEqual(
      decode({ ...base, _tag: "Allow", trace: trace(true), reason: "no" })._tag,
      "Failure",
    );
  });

  it("accepts each verdict in its own shape", () => {
    assert.strictEqual(decode({ ...base, _tag: "Allow", trace: trace(true) })._tag, "Success");
    assert.strictEqual(
      decode({ ...base, _tag: "Deny", trace: trace(false), reason: "no" })._tag,
      "Success",
    );
  });
});
