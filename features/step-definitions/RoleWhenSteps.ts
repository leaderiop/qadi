import { defineSteps } from "@effect-cucumber/vitest";
import { hasRole, not } from "@qadi/core";
import { run } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

/** Plain role membership checks. */
export const roleWhenSteps = defineSteps<World>(({ When }) => {
  When("they must hold role {string}", function* (name: string) {
    yield* run(hasRole(name));
  });

  When("they must not hold role {string}", function* (name: string) {
    yield* run(not(hasRole(name)));
  });
});
