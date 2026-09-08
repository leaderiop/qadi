import { defineSteps } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { describeOutcome, readState, World } from "./SharedWorld.ts";

export const errorThenSteps = defineSteps<World>(({ Then }) => {
  Then("evaluation fails with an error", function* () {
    const s = yield* readState();
    assert.equal(s.outcome.errored, true, `expected an error, got ${describeOutcome(s)}`);
  });
});
