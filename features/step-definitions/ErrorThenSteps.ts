import { defineSteps } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { readState, World, type WorldState } from "./SharedWorld.ts";

const describeOutcome = (s: WorldState): string =>
  JSON.stringify({
    allowed: s.outcome.allowed,
    denied: s.outcome.denied,
    errored: s.outcome.errored,
    reason: s.outcome.reason,
  });

export const errorThenSteps = defineSteps<World>(({ Then }) => {
  Then("evaluation fails with an error", function* () {
    const s = yield* readState();
    assert.equal(s.outcome.errored, true, `expected an error, got ${describeOutcome(s)}`);
  });
});
