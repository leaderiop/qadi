import { assert, describe, it } from "@effect/vitest";
import * as Schema from "effect/Schema";
import * as Result from "effect/Result";
import { Allow, Deny } from "../src/Decision.ts";
import type { AllowingTrace, DenyingTrace } from "../src/Decision.ts";
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

const allowingTrace = (
  visibleFields: ReadonlyArray<string> | undefined,
): AllowingTrace => ({
  policyTag: "HasRole",
  allowed: true,
  children: [],
  visibleFields,
  obligations: [obligation("audit.log")],
});

const denyingTrace: DenyingTrace = {
  policyTag: "HasRole",
  allowed: false,
  reason: "no",
  children: [],
  obligations: [],
};

const allow = (visibleFields: ReadonlyArray<string> | undefined) =>
  new Allow({
    evaluationId: "e1",
    subjectId: makeSubjectId("u1"),
    durationMillis: 4,
    trace: allowingTrace(visibleFields),
  });

const deny = new Deny({
  evaluationId: "e2",
  subjectId: makeSubjectId("u1"),
  durationMillis: 1,
  trace: denyingTrace,
});

/** A decode that must succeed, as the decision it built. */
const decoded = (...args: Parameters<typeof decodeDecision>) => {
  const result = decodeDecision(...args);
  assert.isTrue(Result.isSuccess(result));
  return Result.isSuccess(result) ? result.success : undefined;
};

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
    assert.deepStrictEqual(decoded(encodeDecision(d)), d);
  });

  it("round-trips an Allow with no field visible", () => {
    const d = allow([]);
    assert.deepStrictEqual(decoded(encodeDecision(d)), d);
  });

  it("round-trips an Allow with some fields visible", () => {
    const d = allow(["id", "title"]);
    assert.deepStrictEqual(decoded(encodeDecision(d)), d);
  });

  it("round-trips a Deny", () => {
    assert.deepStrictEqual(decoded(encodeDecision(deny)), deny);
  });

  it("survives JSON and the schema", () => {
    const wire = Schema.decodeUnknownSync(DecisionWire)(
      JSON.parse(JSON.stringify(encodeDecision(deny))),
    );
    assert.deepStrictEqual(decoded(wire), deny);
  });
});

describe("decodeDecision refuses a wire decision that contradicts its trace (ARCH-32)", () => {
  it("returns the disagreement, not a decision", () => {
    const wire = encodeDecision(allow(["id"]));
    assert.deepStrictEqual(
      decodeDecision({ ...wire, trace: { ...wire.trace, allowed: false } }),
      Result.fail("Verdict"),
    );
    const denyWire = encodeDecision(deny);
    assert.strictEqual(denyWire._tag, "Deny");
    if (denyWire._tag === "Deny") {
      assert.deepStrictEqual(
        decodeDecision({ ...denyWire, reason: "other" }),
        Result.fail("Reason"),
      );
    }
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
