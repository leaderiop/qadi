import { defineSteps } from "@effect-cucumber/vitest";
import { allOf, anyOf, gte, hasAction, hasResourceAttribute, lt } from "@qadi/core";
import { run } from "./Bridge.ts";
import { World } from "./SharedWorld.ts";

export const actionWhenSteps = defineSteps<World>(({ When }) => {
  When("they must be performing {string}", function* (verb: string) {
    yield* run(hasAction(verb));
  });

  /**
   * Bell-LaPadula's two rules as one stored policy: read what is below you, write
   * only at or above you. Inexpressible until the action became an input, because
   * both arms have to sit in the same tree and disagree about the verb.
   */
  When("read-down and write-up are enforced", function* () {
    yield* run(
      anyOf([
        allOf([hasAction("read"), hasResourceAttribute("level", lt(3))]),
        allOf([hasAction("write"), hasResourceAttribute("level", gte(3))]),
      ]),
    );
  });
});
