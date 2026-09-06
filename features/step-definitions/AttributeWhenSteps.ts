import { defineSteps } from "@effect-cucumber/vitest";
import { eq, gte, hasAttribute, hasResourceAttribute, literal } from "@qadi/core";
import { run } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

/** Subject- and resource-attribute comparisons. */
export const attributeWhenSteps = defineSteps<World>(({ When }) => {
  When(
    "they must have attribute {string} of at least {int}",
    function* (key: string, threshold: number) {
      yield* run(hasAttribute(key, gte(threshold)));
    },
  );

  When(
    "the resource attribute {string} must equal {string}",
    function* (key: string, value: string) {
      yield* run(hasResourceAttribute(key, eq(literal(value))));
    },
  );
});
