import { defineSteps } from "@effect-cucumber/vitest";
import { hasActed, hasNotActed, not } from "@qadi/core";
import { run } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

export const historyWhenSteps = defineSteps<World>(({ When }) => {
  When("they must not have raised the resource", function* () {
    yield* run(hasNotActed("raised"));
  });

  When("they must have raised the resource", function* () {
    yield* run(hasActed("raised"));
  });

  /**
   * The distinction ADR-QD-020 exists to hold: `not(hasActed(e))` is not
   * `hasNotActed(e)`. Under an unwired port the first ALLOWS and the second denies.
   */
  When("the negation of having raised the resource is evaluated", function* () {
    yield* run(not(hasActed("raised")));
  });
});
