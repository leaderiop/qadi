import { defineSteps } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { describeOutcome, readState, World } from "./SharedWorld.ts";

/** The two-value outcome every scenario ultimately checks. */
export const accessThenSteps = defineSteps<World>(({ Then }) => {
  Then("access is granted", function* () {
    const s = yield* readState();
    assert.equal(s.outcome.allowed, true, `expected grant, got ${describeOutcome(s)}`);
  });

  Then("access is denied", function* () {
    const s = yield* readState();
    assert.equal(s.outcome.denied, true, `expected denial, got ${describeOutcome(s)}`);
  });
});
