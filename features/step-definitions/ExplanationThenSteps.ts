import { defineSteps } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { readState, World } from "./SharedWorld.ts";

export const explanationThenSteps = defineSteps<World>(({ Then }) => {
  Then("the description reads {string}", function* (expected: string) {
    const s = yield* readState();
    assert.equal(s.explanation, expected);
  });

  Then("the description mentions {string}", function* (expected: string) {
    const s = yield* readState();
    assert.ok(
      s.explanation !== undefined && s.explanation.includes(expected),
      `description ${JSON.stringify(s.explanation)} omits ${JSON.stringify(expected)}`,
    );
  });
});
