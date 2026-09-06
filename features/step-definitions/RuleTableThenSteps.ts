import { defineSteps } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { readState, World } from "./SharedWorld.ts";

export const ruleTableThenSteps = defineSteps<World>(({ Then }) => {
  Then("the deciding row is {string}", function* (expected: string) {
    const s = yield* readState();
    assert.equal(s.outcome.traceReason, expected);
  });
});
