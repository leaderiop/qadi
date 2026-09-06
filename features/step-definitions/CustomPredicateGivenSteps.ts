import { defineSteps } from "@effect-cucumber/vitest";
import { patch, readState, World } from "./SharedWorld.ts";

/** Registers canned answers for `hasCustom` checks. */
export const customPredicateGivenSteps = defineSteps<World>(({ Given }) => {
  Given("a custom predicate {string} that allows", function* (name: string) {
    const s = yield* readState();
    yield* patch(() => ({ customPredicates: { ...(s.customPredicates ?? {}), [name]: true } }));
  });

  Given("a custom predicate {string} that denies", function* (name: string) {
    const s = yield* readState();
    yield* patch(() => ({ customPredicates: { ...(s.customPredicates ?? {}), [name]: false } }));
  });
});
