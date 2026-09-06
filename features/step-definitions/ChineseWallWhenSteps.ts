import { defineSteps } from "@effect-cucumber/vitest";
import type { Policy } from "@qadi/core";
import { allOf, anyOf, eq, hasActed, hasNotActed, hasResourceAttribute, hasRole, labeled, literal } from "@qadi/core";
import { run } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

/**
 * Brewer–Nash as two questions the one-member port already answers.
 *
 * The conflict class names the *event* and the company in hand is the
 * *resource*, so there is one policy per class — which is what MOD-QD-030
 * forecast when it said the attribute path cannot be derived from the resource.
 */
const withinWall = (conflictClass: string): Policy =>
  anyOf([
    // Exempt material first: a field on the resource in hand, so an exempt read
    // costs no history lookup at all (INV-QD-005).
    labeled("wall.sanitised", hasResourceAttribute("sanitised", eq(literal(true)))),
    labeled("wall.first", hasNotActed(conflictClass, { scope: "Any" })),
    labeled("wall.same", hasActed(conflictClass, { scope: "Resource" })),
  ]);

const oilWall = (): Policy => allOf([labeled("wall.analyst", hasRole("analyst")), withinWall("oil")]);

export const chineseWallWhenSteps = defineSteps<World>(({ When }) => {
  When("the conflict-of-interest wall is enforced", function* () {
    yield* run(oilWall());
  });
});
