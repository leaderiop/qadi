import { defineSteps } from "@effect-cucumber/vitest";
import type { Policy } from "@qadi/core";
import { eq, hasResourceAttribute, subjectId } from "@qadi/core";
import { roundTrip, run } from "./Bridge.ts";
import { readState, World } from "./SharedWorld.ts";

/** "the resource's owner is me" — the archetypal relational rule. */
export const ownership = (): Policy => hasResourceAttribute("owner", eq(subjectId()));

export const ownershipWhenSteps = defineSteps<World>(({ When }) => {
  When("the resource must be owned by the subject", function* () {
    yield* run(ownership());
  });

  When("the ownership policy is round-tripped and evaluated", function* () {
    yield* roundTrip(ownership());
    const s = yield* readState();
    if (s.restored === undefined) throw new Error("round trip produced nothing");
    yield* run(s.restored);
  });
});
