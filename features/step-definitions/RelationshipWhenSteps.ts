import { defineSteps } from "@effect-cucumber/vitest";
import { hasRelationship } from "@qadi/core";
import { run } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

/** ReBAC: a relationship-edge check against the resource. */
export const relationshipWhenSteps = defineSteps<World>(({ When }) => {
  When("they must be {string} of the resource", function* (relation: string) {
    yield* run(hasRelationship(relation));
  });
});
