import { defineSteps } from "@effect-cucumber/vitest";
import { patch, World } from "./SharedWorld.ts";

/** The request being authorized: the verb, and whether a duty handler is wired. */
export const requestGivenSteps = defineSteps<World>(({ Given }) => {
  Given("the caller is performing {string}", function* (verb: string) {
    yield* patch(() => ({ action: verb }));
  });

  Given("an obligation handler is supplied", function* () {
    yield* patch(() => ({ handlesObligations: true }));
  });
});
