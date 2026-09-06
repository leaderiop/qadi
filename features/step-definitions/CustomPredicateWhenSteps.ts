import { defineSteps } from "@effect-cucumber/vitest";
import { hasCustom } from "@qadi/core";
import { run } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

export const customPredicateWhenSteps = defineSteps<World>(({ When }) => {
  When("they invoke the custom check {string}", function* (name: string) {
    yield* run(hasCustom(name));
  });
});
