import { defineSteps } from "@effect-cucumber/vitest";
import { patch, World } from "./SharedWorld.ts";

/**
 * Turns on concurrent evaluation for whatever `When` step follows.
 *
 * Every scenario using this has a sequential twin elsewhere in the suite
 * asserting the identical outcome. That pairing *is* the evidence for
 * INV-QD-020 at acceptance level: the answer does not depend on the schedule.
 */
export const concurrencyGivenSteps = defineSteps<World>(({ Given }) => {
  Given("evaluation is concurrent", function* () {
    yield* patch(() => ({ concurrency: "unbounded" }));
  });

  Given("evaluation is concurrent, two at a time", function* () {
    yield* patch(() => ({ concurrency: 2 }));
  });
});
