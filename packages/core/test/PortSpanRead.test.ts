/**
 * Rows that hold the span decoder's reads where the other span rows leave them open: a key the
 * struct names but has no field for, an attribute that is absent for a field that would accept
 * `undefined`, and every interpreter a port question can carry.
 *
 * Each is a property of `PortSpanEncode.ts`'s `decodeSpan`, held here because core's mutation
 * run executes core's tests only. The interpreter row writes the closed set out and checks it
 * against `portInterpreter`, so a fourth interpreter fails here until a row reads it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Schema from "effect/Schema";
import { portInterpreter } from "../src/PortSpan.ts";
import { decodeSpan, sharedQuestionFields, sharedQuestionKeys, spanStruct } from "../src/PortSpanEncode.ts";

const attributesOf = (...entries: ReadonlyArray<readonly [string, unknown]>): ReadonlyMap<string, unknown> =>
  new Map(entries);

describe("decodeSpan: what a key without an attribute or a field reads as", () => {
  it("skips a key the struct names but declares no field for, and keeps the other fields", () => {
    const keys = { name: "qadi.name", ghost: "qadi.ghost" } as const;
    const struct = spanStruct({ name: Schema.optionalKey(Schema.String) }, keys);
    const decoded = decodeSpan(struct, attributesOf(["qadi.ghost", "x"], ["qadi.name", "n"]));
    assert.deepStrictEqual(decoded, { name: "n" });
  });

  it("reads a key with no attribute as absent, even for a field that would accept undefined", () => {
    const struct = spanStruct({ loose: Schema.optionalKey(Schema.Any) }, { loose: "qadi.loose" });
    assert.deepStrictEqual(decodeSpan(struct, attributesOf()), {});
    assert.deepStrictEqual(decodeSpan(struct, attributesOf(["qadi.loose", 1])), { loose: 1 });
  });
});

describe("decodeSpan: a port question's interpreter", () => {
  const question = spanStruct(sharedQuestionFields, sharedQuestionKeys);

  it("reads each of the three interpreters as itself", () => {
    const interpreters = ["evaluate", "toPredicate", "remote"] as const;
    assert.deepStrictEqual(portInterpreter.literals, interpreters);
    for (const interpreter of interpreters) {
      assert.deepStrictEqual(decodeSpan(question, attributesOf(["qadi.interpreter", interpreter])), { interpreter });
    }
  });
});
