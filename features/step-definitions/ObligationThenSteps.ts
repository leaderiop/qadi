import { defineSteps } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { readState, World } from "./SharedWorld.ts";

export const obligationThenSteps = defineSteps<World>(({ Then }) => {
  Then("the decision owes {string}", function* (expected: string) {
    const s = yield* readState();
    const want = expected
      .split(",")
      .map((v) => v.trim())
      .sort();
    assert.deepEqual([...s.outcome.obligations].sort(), want);
  });

  Then("the decision owes nothing", function* () {
    const s = yield* readState();
    assert.deepEqual(s.outcome.obligations, []);
  });

  Then("the guarded work runs", function* () {
    const s = yield* readState();
    assert.equal(s.workRan, true, "expected the guarded work to have run");
  });

  Then("the guarded work does not run", function* () {
    const s = yield* readState();
    // Not merely discarded — never started. That is the whole point of an aspect.
    assert.equal(s.workRan, false, "the guarded work ran when it should not have");
  });

  Then("enforcement fails with an undischarged obligation", function* () {
    const s = yield* readState();
    assert.equal(s.outcome.failure, "UndischargedObligation");
  });

  Then("the handler discharged {string}", function* (expected: string) {
    const s = yield* readState();
    const want = expected
      .split(",")
      .map((v) => v.trim())
      .sort();
    assert.deepEqual([...s.discharged].sort(), want);
  });
});
