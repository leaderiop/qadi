import { defineSteps } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { readState, World } from "./SharedWorld.ts";

export const fieldVisibilityThenSteps = defineSteps<World>(({ Then }) => {
  Then("the visible fields are {string}", function* (expected: string) {
    const s = yield* readState();
    const want = expected
      .split(",")
      .map((v) => v.trim())
      .sort();
    const got = [...(s.outcome.visibleFields ?? [])].sort();
    assert.deepEqual(got, want);
  });

  Then("all fields are visible", function* () {
    const s = yield* readState();
    // `undefined` is the top of the visibility lattice: no restriction.
    assert.equal(s.outcome.visibleFields, undefined);
  });
});
