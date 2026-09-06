import { defineSteps } from "@effect-cucumber/vitest";
import assert from "node:assert/strict";
import { readState, World } from "./SharedWorld.ts";

export const reasonThenSteps = defineSteps<World>(({ Then }) => {
  Then("the denial reason mentions {string}", function* (text: string) {
    const s = yield* readState();
    assert.ok(
      s.outcome.reason?.includes(text) === true,
      `reason ${JSON.stringify(s.outcome.reason)} does not mention ${JSON.stringify(text)}`,
    );
  });
});
