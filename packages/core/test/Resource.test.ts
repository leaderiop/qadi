import { assert, describe, it } from "@effect/vitest";
import { resourceIdOf } from "../src/Resource.ts";

describe("resourceIdOf — the writer's reading of the id rule", () => {
  it("a string id is the resource's id", () => {
    assert.strictEqual(resourceIdOf({ id: "a" }), "a");
  });

  it("an empty string id is still an id (the read side accepts it)", () => {
    assert.strictEqual(resourceIdOf({ id: "" }), "");
  });

  it("a non-string id is no id", () => {
    assert.isUndefined(resourceIdOf({ id: 1 }));
    assert.isUndefined(resourceIdOf({ id: { nested: "x" } }));
    assert.isUndefined(resourceIdOf({ id: null }));
  });

  it("an absent resource, or one without an id, has no id", () => {
    assert.isUndefined(resourceIdOf(undefined));
    assert.isUndefined(resourceIdOf({}));
  });
});
