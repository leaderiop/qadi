import { assert, describe, it } from "@effect/vitest";
import { defaultTerm, fieldsClause } from "../src/Wording.ts";

describe("fieldsClause", () => {
  it("says nothing for `undefined`, the top of the lattice (INV-QD-004)", () => {
    assert.strictEqual(fieldsClause(undefined, defaultTerm), "");
  });

  it("says outright that an empty list exposes nothing", () => {
    assert.strictEqual(fieldsClause([], defaultTerm), ", exposing no fields");
  });

  it("lists each field through the term wrapper", () => {
    assert.strictEqual(fieldsClause(["a"], defaultTerm), ", exposing only `a`");
    assert.strictEqual(
      fieldsClause(["a", "b"], (t) => `<${t}>`),
      ", exposing only <a>, <b>",
    );
  });
});

describe("defaultTerm", () => {
  it("wraps a name in backticks", () => {
    assert.strictEqual(defaultTerm("owner"), "`owner`");
  });
});
